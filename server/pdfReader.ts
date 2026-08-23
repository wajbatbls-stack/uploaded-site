import type { Express, Request, Response } from "express";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { listDownloadFiles } from "./db";
import { storageGetSignedUrl } from "./storage";

const MAX_READER_PAGES = 24;
const READER_CACHE_TTL_MS = 10 * 60 * 1000;
const pdfCache = new Map<number, { bytes: Uint8Array; pageCount: number; expiresAt: number; kind: "pdf" | "image" }>();
const pageCache = new Map<string, { png: Buffer; expiresAt: number }>();
const OFFICE_EXTENSIONS = new Set([".doc", ".docx", ".ppt", ".pptx"]);
const RASTER_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const RASTER_IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const OFFICE_MIME_EXTENSIONS: Array<[string, string]> = [
  ["wordprocessingml", ".docx"],
  ["msword", ".doc"],
  ["presentationml", ".pptx"],
  ["ms-powerpoint", ".ppt"],
];

function extensionFor(file: { mimeType?: string | null; originalName?: string | null; fileName?: string | null; fileKey?: string | null }) {
  const name = String(file.originalName || file.fileName || file.fileKey || "").toLowerCase();
  const extension = path.extname(name);
  if (extension) return extension;
  const mimeType = String(file.mimeType || "").toLowerCase();
  return OFFICE_MIME_EXTENSIONS.find(([marker]) => mimeType.includes(marker))?.[1] || "";
}

export function isReadOnlySupported(file: { mimeType?: string | null; originalName?: string | null; fileName?: string | null; fileKey?: string | null }) {
  const mimeType = String(file.mimeType || "").toLowerCase();
  const extension = extensionFor(file);
  return mimeType.includes("pdf") || extension === ".pdf" || OFFICE_EXTENSIONS.has(extension) || OFFICE_MIME_EXTENSIONS.some(([marker]) => mimeType.includes(marker)) || RASTER_IMAGE_MIME_TYPES.has(mimeType) || RASTER_IMAGE_EXTENSIONS.has(extension);
}

function isRasterImage(file: { mimeType?: string | null; originalName?: string | null; fileName?: string | null; fileKey?: string | null }) {
  return RASTER_IMAGE_MIME_TYPES.has(String(file.mimeType || "").toLowerCase()) || RASTER_IMAGE_EXTENSIONS.has(extensionFor(file));
}

function storageKeyFromUrl(url: string) {
  return url.startsWith("/manus-storage/") ? url.slice("/manus-storage/".length) : "";
}

async function sourceUrlFor(file: { fileKey: string; fileUrl: string }) {
  const fromUrl = storageKeyFromUrl(String(file.fileUrl || ""));
  if (fromUrl) return storageGetSignedUrl(fromUrl);
  if (String(file.fileKey || "").startsWith("wajbat-plus/downloads/")) return storageGetSignedUrl(file.fileKey);
  const raw = String(file.fileUrl || "");
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `https://files.manuscdn.com/user_upload_by_module/session_file/310519663231231378/${encodeURIComponent(file.fileKey || raw)}`;
}

function runOffice(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn("libreoffice", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", chunk => { stderr = `${stderr}${String(chunk)}`.slice(-4000); });
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve() : reject(new Error(`LibreOffice failed (${code}): ${stderr || "تعذر التحويل"}`)));
  });
}

async function officeToPdf(bytes: Uint8Array, extension: string) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "wajbat-reader-"));
  try {
    const source = path.join(directory, `source${extension}`);
    const outputDirectory = path.join(directory, "out");
    const profileDirectory = path.join(directory, "profile");
    await fs.mkdir(outputDirectory);
    await fs.mkdir(profileDirectory);
    await fs.writeFile(source, bytes);
    await runOffice(["--headless", "--nologo", "--nodefault", "--nofirststartwizard", "--nolockcheck", `-env:UserInstallation=${pathToFileURL(profileDirectory).href}`, "--convert-to", "pdf", "--outdir", outputDirectory, source]);
    const output = path.join(outputDirectory, "source.pdf");
    const pdf = await fs.readFile(output);
    if (!pdf.length) throw new Error("LibreOffice returned an empty PDF");
    return new Uint8Array(pdf);
  } finally {
    await fs.rm(directory, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function getReaderPdf(fileId: number) {
  const existing = pdfCache.get(fileId);
  if (existing && existing.expiresAt > Date.now()) return existing;
  const file = (await listDownloadFiles(undefined, true)).find(item => Number(item.id) === fileId);
  if (!file || !isReadOnlySupported(file)) {
    const error = new Error("النموذج غير متاح للقراءة");
    (error as any).status = 404;
    throw error;
  }
  const response = await fetch(await sourceUrlFor(file));
  if (!response.ok) {
    const error = new Error("تعذر تجهيز النموذج للقراءة");
    (error as any).status = 502;
    throw error;
  }
  const sourceBytes = new Uint8Array(await response.arrayBuffer());
  if (isRasterImage(file)) {
    const cached = { bytes: sourceBytes, pageCount: 1, expiresAt: Date.now() + READER_CACHE_TTL_MS, kind: "image" as const };
    pdfCache.set(fileId, cached);
    return cached;
  }
  const extension = extensionFor(file);
  const bytes = extension === ".pdf" || String(file.mimeType || "").toLowerCase().includes("pdf")
    ? sourceBytes
    : await officeToPdf(sourceBytes, extension);
  const loadingTask = getDocument({ data: new Uint8Array(bytes), verbosity: 0 });
  const document = await loadingTask.promise;
  const cached = { bytes, pageCount: Math.min(document.numPages, MAX_READER_PAGES), expiresAt: Date.now() + READER_CACHE_TTL_MS, kind: "pdf" as const };
  pdfCache.set(fileId, cached);
  return cached;
}

function sendReaderError(res: Response, error: unknown) {
  console.error("[PDF Reader]", error);
  const status = Number((error as any)?.status) || 500;
  return res.status(status).json({ error: status === 404 ? "النموذج غير متاح للقراءة" : "تعذر تجهيز النموذج للقراءة الآن" });
}

export function registerPdfReaderRoutes(app: Express) {
  app.get("/api/read-only/:fileId", async (req: Request, res: Response) => {
    try {
      const fileId = Number(req.params.fileId);
      if (!Number.isInteger(fileId) || fileId < 1) return res.status(400).json({ error: "معرّف نموذج غير صالح" });
      const pdf = await getReaderPdf(fileId);
      return res.set({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }).json({ fileId, pageCount: pdf.pageCount });
    } catch (error) {
      return sendReaderError(res, error);
    }
  });

  app.get("/api/read-only/:fileId/page/:page", async (req: Request, res: Response) => {
    try {
      const fileId = Number(req.params.fileId);
      const pageNumber = Number(req.params.page);
      if (!Number.isInteger(fileId) || fileId < 1 || !Number.isInteger(pageNumber) || pageNumber < 1) return res.status(400).json({ error: "طلب صفحة غير صالح" });
      const pdf = await getReaderPdf(fileId);
      if (pageNumber > pdf.pageCount) return res.status(404).json({ error: "الصفحة غير متاحة" });
      const key = `${fileId}:${pageNumber}`;
      const cached = pageCache.get(key);
      if (cached && cached.expiresAt > Date.now()) return res.set({ "Content-Type": "image/png", "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" }).send(cached.png);
      let png: Buffer;
      if (pdf.kind === "image") {
        const image = await loadImage(Buffer.from(pdf.bytes));
        const maxDimension = 2200;
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const canvas = createCanvas(Math.max(1, Math.round(image.width * scale)), Math.max(1, Math.round(image.height * scale)));
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        png = Buffer.from(await canvas.encode("png"));
      } else {
        const loadingTask = getDocument({ data: new Uint8Array(pdf.bytes), verbosity: 0 });
        const document = await loadingTask.promise;
        const page = await document.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.45 });
        const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
        const context = canvas.getContext("2d");
        await page.render({ canvasContext: context as any, viewport } as any).promise;
        png = Buffer.from(await canvas.encode("png"));
      }
      pageCache.set(key, { png, expiresAt: Date.now() + READER_CACHE_TTL_MS });
      return res.set({ "Content-Type": "image/png", "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff", "Content-Disposition": `inline; filename="read-page-${pageNumber}.png"` }).send(png);
    } catch (error) {
      return sendReaderError(res, error);
    }
  });
}
