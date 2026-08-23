import type { Express, Request, Response } from "express";
import { createCanvas } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { listDownloadFiles } from "./db";
import { storageGetSignedUrl } from "./storage";

const MAX_READER_PAGES = 24;
const READER_CACHE_TTL_MS = 10 * 60 * 1000;
const pdfCache = new Map<number, { bytes: Uint8Array; pageCount: number; expiresAt: number }>();
const pageCache = new Map<string, { png: Buffer; expiresAt: number }>();

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

async function getReaderPdf(fileId: number) {
  const existing = pdfCache.get(fileId);
  if (existing && existing.expiresAt > Date.now()) return existing;
  const file = (await listDownloadFiles(undefined, true)).find(item => Number(item.id) === fileId);
  if (!file || !String(file.mimeType || "").toLowerCase().includes("pdf")) {
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
  const bytes = new Uint8Array(await response.arrayBuffer());
  const loadingTask = getDocument({ data: new Uint8Array(bytes), verbosity: 0 });
  const document = await loadingTask.promise;
  const cached = { bytes, pageCount: Math.min(document.numPages, MAX_READER_PAGES), expiresAt: Date.now() + READER_CACHE_TTL_MS };
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
      const loadingTask = getDocument({ data: new Uint8Array(pdf.bytes), verbosity: 0 });
      const document = await loadingTask.promise;
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.45 });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const context = canvas.getContext("2d");
      await page.render({ canvasContext: context as any, viewport } as any).promise;
      const png = Buffer.from(await canvas.encode("png"));
      pageCache.set(key, { png, expiresAt: Date.now() + READER_CACHE_TTL_MS });
      return res.set({ "Content-Type": "image/png", "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff", "Content-Disposition": `inline; filename="read-page-${pageNumber}.png"` }).send(png);
    } catch (error) {
      return sendReaderError(res, error);
    }
  });
}
