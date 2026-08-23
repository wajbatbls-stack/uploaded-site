import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import path from "node:path";
import fs from "node:fs";
import formidable from "formidable";
import crypto from "node:crypto";

declare module "formidable";

import { storagePut } from "../storage";
import { registerMedia, recordAdminAudit } from "../db";
import { getVerifiedAdminSession } from "../adminSession";
import { registerPdfReaderRoutes } from "../pdfReader";

function guessExt(mimeType?: string): string {
  const map: Record<string, string> = { "application/pdf": ".pdf", "application/zip": ".zip", "audio/mpeg": ".mp3", "video/mp4": ".mp4", "image/png": ".png", "image/jpeg": ".jpg" };
  return map[mimeType || ""] ?? ".bin";
}

function registerDownloadsUpload(app: express.Express) {
  app.post("/api/downloads/upload", async (req, res) => {
    try {
      const cookieHeader = typeof req.headers.cookie === "string" ? req.headers.cookie : undefined;
      const session = await getVerifiedAdminSession(cookieHeader);
      if (!session) return res.status(403).json({ error: "جلسة المالك غير صالحة" });

      const form = formidable({
        maxFileSize: 50 * 1024 * 1024,
        maxFiles: 1,
        multiples: false,
        keepExtensions: true,
      });
      const [fields, files] = await form.parse(req);
      const file = files.file?.[0] ?? files.attachment?.[0];
      if (!file) return res.status(400).json({ error: "لم يتم رفع أي ملف" });

      const originalName = (fields.originalName?.[0] as string) || path.basename(file.originalFilename || "file");
      const bytes = fs.readFileSync(file.filepath);
      const safeName = originalName.replace(/[^a-zA-Z0-9_\-\.\u0600-\u06FF ]/g, "").trim().slice(0, 200) || "file";
      const ext = path.extname(safeName) || guessExt(file.mimetype ?? undefined);
      const relKey = `wajbat-plus/downloads/${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
      const stored = await storagePut(relKey, bytes, file.mimetype ?? "application/octet-stream");
      const media = await registerMedia({
        storageKey: stored.key, url: stored.url, originalName: safeName,
        mimeType: file.mimetype ?? "application/octet-stream", sizeBytes: bytes.length,
        category: "document", usage: "visitor_download",
      });
      void recordAdminAudit("download_file_uploaded", "media_file", String(media.id), { originalName: safeName });
      return res.json({
        success: true, mediaId: media.id, fileName: safeName, originalName: safeName,
        fileUrl: stored.url, fileKey: stored.key, mimeType: file.mimetype ?? "application/octet-stream", sizeBytes: bytes.length,
      });
    } catch (error: any) {
      console.error("[Downloads upload] failed:", error?.message ?? error);
      return res.status(400).json({ error: "فشل رفع الملف: " + (error?.message ?? "خطأ غير معروف") });
    }
  });
}
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerPdfReaderRoutes(app);
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerDownloadsUpload(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  app.get(["/admin", "/admin/"], (_req, res) => {
    const adminFile = process.env.NODE_ENV === "development"
      ? path.resolve(process.cwd(), "client/public/admin.html")
      : path.resolve(import.meta.dirname, "public/admin.html");
    // لا تُخزَّن صفحة الإدارة: فهي نقطة دخول محمية وتتغير مع كل إصدار لأصول المالك.
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    });
    return res.sendFile(adminFile);
  });
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
