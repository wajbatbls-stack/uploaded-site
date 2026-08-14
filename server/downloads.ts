import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ownerProcedure, publicProcedure, router } from "./_core/trpc";
import {
  listDownloadCategories, listDownloadCategoriesPublic, listDownloadFiles,
  createDownloadCategory, updateDownloadCategory, deleteDownloadCategory, setCategoryVisibility,
  createDownloadFile, updateDownloadFile, deleteDownloadFile, setFileVisibility,
  replaceDownloadFile, moveDownloadFile, moveDownloadCategory, incrementDownloadCount,
  getPublicSiteContent, recordAdminAudit,
} from "./db";

const categoryInput = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(2000).optional(),
  emoji: z.string().max(16).optional(),
  color: z.string().max(32).optional(),
  backgroundColor: z.string().max(32).optional(),
  imageKey: z.string().max(512).optional(),
  imageUrl: z.string().max(2000).optional(),
});

const fileInput = z.object({
  categoryId: z.number().int().positive(),
  fileName: z.string().min(1).max(255),
  originalName: z.string().min(1).max(255),
  description: z.string().max(4000).optional(),
  fileKey: z.string().min(1).max(512),
  fileUrl: z.string().min(1),
  mimeType: z.string().min(1).max(120),
  sizeBytes: z.number().int().nonnegative(),
  imageKey: z.string().max(512).optional(),
  imageUrl: z.string().max(2000).optional(),
});

/* مهاجرة التحميلات القديمة (siteSeed + content.downloads) إلى الجداول الجديدة مرة واحدة */
let migrationRunning: Promise<void> | null = null;
export function migrateDownloadsIfNeeded() {
  if (migrationRunning) return migrationRunning;
  migrationRunning = (async () => {
    try {
      const categories = await listDownloadCategories();
      if (categories.length > 0) return;
      const content = await getPublicSiteContent().catch(() => undefined);
      const downloads = (content as any)?.downloads;
      if (!Array.isArray(downloads) || downloads.length === 0) return;
      for (const category of downloads) {
        if (!category || typeof category !== "object") continue;
        const created = await createDownloadCategory({
          name: String(category.title ?? category.name ?? "قسم ملفات").slice(0, 160),
          description: typeof category.description === "string" ? category.description : null,
          emoji: typeof category.emoji === "string" ? category.emoji.slice(0, 16) : "📥",
          color: "#4966d6", backgroundColor: "#eef1fd",
          isVisible: category.isVisible === false ? false : true,
        });
        const items = Array.isArray(category.items) ? category.items : [];
        for (const item of items) {
          if (!item || typeof item !== "object") continue;
          const remoteFile = typeof item.remoteFile === "string" ? item.remoteFile.trim() : "";
          if (!remoteFile) continue;
          const lastSlash = remoteFile.lastIndexOf("/");
          const originalName = lastSlash === -1 ? remoteFile : remoteFile.slice(lastSlash + 1);
          await createDownloadFile({
            categoryId: created.id,
            fileName: originalName.slice(0, 255),
            originalName: originalName.slice(0, 255),
            fileKey: remoteFile,
            fileUrl: remoteFile,
            mimeType: guessMimeType(originalName),
            sizeBytes: 0,
            isVisible: item.isVisible === false ? false : true,
          });
        }
      }
      void recordAdminAudit("downloads_migrated", "download_category");
    } catch (error) {
      console.warn("[Downloads] Legacy migration failed, will retry:", error);
    } finally {
      migrationRunning = null;
    }
  })();
  return migrationRunning;
}

export function guessMimeType(fileName: string): string {
  const lower = fileName.toLowerCase();
  const map: Record<string, string> = {
    pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    zip: "application/zip", rar: "application/vnd.rar", "7z": "application/x-7z-compressed",
    txt: "text/plain", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
    webp: "image/webp", svg: "image/svg+xml", mp3: "audio/mpeg", mp4: "video/mp4", csv: "text/csv",
  };
  const ext = lower.split(".").pop() ?? "";
  return map[ext] ?? "application/octet-stream";
}

function withCategory(categoryId: number, action: () => Promise<void>) {
  return listDownloadCategories().then(categories => {
    if (!categories.find(c => c.id === categoryId)) throw new TRPCError({ code: "NOT_FOUND", message: "قسم التحميل غير موجود" });
    return action();
  });
}

export const downloadsRouter = router({
  list: ownerProcedure.query(async () => {
    void migrateDownloadsIfNeeded();
    const categories = await listDownloadCategories();
    const files = await listDownloadFiles();
    return { categories, files };
  }),

  publicList: publicProcedure.query(async () => {
    void migrateDownloadsIfNeeded();
    const categories = await listDownloadCategoriesPublic();
    const visibleCategoryIds = new Set(categories.map(c => c.id));
    const files = (await listDownloadFiles(undefined, true)).filter(f => visibleCategoryIds.has(f.categoryId));
    const byCategory = new Map<number, typeof files>();
    for (const file of files) {
      const list = byCategory.get(file.categoryId) ?? [];
      list.push(file);
      byCategory.set(file.categoryId, list);
    }
    return {
      categories: categories.map(category => ({
        ...category,
        files: (byCategory.get(category.id) ?? []).map(file => {
          const raw = String(file.fileUrl || "");
          const directUrl = raw.startsWith("http") || raw.startsWith("/manus-storage")
            ? raw
            : `https://files.manuscdn.com/user_upload_by_module/session_file/310519663231231378/${encodeURIComponent(file.fileKey || raw)}`;
          return { ...file, directUrl };
        }),
      })),
      files,
    };
  }),

  trackDownload: publicProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    const files = await listDownloadFiles(input.id === -1 ? undefined : undefined);
    const file = files.find(f => f.id === input.id);
    if (!file || !file.isVisible) throw new TRPCError({ code: "NOT_FOUND", message: "الملف غير متاح" });
    await incrementDownloadCount(input.id);
    return { fileUrl: file.fileUrl, fileName: file.fileName, mimeType: file.mimeType };
  }),

  createCategory: ownerProcedure.input(categoryInput).mutation(async ({ input }) => {
    const result = await createDownloadCategory(input);
    await recordAdminAudit("download_category_created", "download_category", String(result.id), { name: input.name });
    return result;
  }),
  updateCategory: ownerProcedure.input(z.object({ id: z.number().int().positive() }).merge(categoryInput.partial().extend({ sortOrder: z.number().int().optional() }))).mutation(async ({ input }) => {
    const { id, ...updates } = input;
    await withCategory(id, async () => {});
    const result = await updateDownloadCategory(id, updates);
    await recordAdminAudit("download_category_updated", "download_category", String(id), updates);
    return result;
  }),
  deleteCategory: ownerProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    const result = await deleteDownloadCategory(input.id);
    await recordAdminAudit("download_category_deleted", "download_category", String(input.id));
    return result;
  }),
  setCategoryVisibility: ownerProcedure.input(z.object({ id: z.number().int().positive(), isVisible: z.boolean() })).mutation(async ({ input }) => {
    const result = await setCategoryVisibility(input.id, input.isVisible);
    await recordAdminAudit("download_category_visibility_changed", "download_category", String(input.id), input);
    return result;
  }),
  moveCategory: ownerProcedure.input(z.object({ id: z.number().int().positive(), direction: z.enum(["up", "down"]) })).mutation(async ({ input }) => {
    const result = await moveDownloadCategory(input.id, input.direction === "up" ? 1 : -1);
    if (!result.success) throw new TRPCError({ code: "BAD_REQUEST", message: "تعذر تغيير ترتيب القسم" });
    await recordAdminAudit("download_category_reordered", "download_category", String(input.id), input);
    return result;
  }),

  createFile: ownerProcedure.input(fileInput).mutation(async ({ input }) => {
    await withCategory(input.categoryId, async () => {});
    const result = await createDownloadFile(input);
    await recordAdminAudit("download_file_created", "download_file", String(result.id), { categoryId: input.categoryId, originalName: input.originalName });
    return result;
  }),
  updateFile: ownerProcedure.input(z.object({ id: z.number().int().positive() }).merge(fileInput.partial().extend({ sortOrder: z.number().int().optional() }))).mutation(async ({ input }) => {
    const { id, ...updates } = input;
    const files = await listDownloadFiles();
    const existing = files.find(f => f.id === id);
    if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "الملف غير موجود" });
    const result = await updateDownloadFile(id, updates);
    await recordAdminAudit("download_file_updated", "download_file", String(id), updates);
    return result;
  }),
  deleteFile: ownerProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    const result = await deleteDownloadFile(input.id);
    await recordAdminAudit("download_file_deleted", "download_file", String(input.id));
    return result;
  }),
  setFileVisibility: ownerProcedure.input(z.object({ id: z.number().int().positive(), isVisible: z.boolean() })).mutation(async ({ input }) => {
    const result = await setFileVisibility(input.id, input.isVisible);
    await recordAdminAudit("download_file_visibility_changed", "download_file", String(input.id), input);
    return result;
  }),
  replaceFile: ownerProcedure.input(z.object({ id: z.number().int().positive() }).merge(z.object({
    fileKey: z.string().min(1).max(512), fileUrl: z.string().min(1), mimeType: z.string().min(1).max(120),
    sizeBytes: z.number().int().nonnegative(), originalName: z.string().min(1).max(255).optional(),
  }))).mutation(async ({ input }) => {
    const { id, ...updates } = input;
    const result = await replaceDownloadFile(id, updates);
    await recordAdminAudit("download_file_replaced", "download_file", String(id));
    return result;
  }),
  moveFile: ownerProcedure.input(z.object({ id: z.number().int().positive(), direction: z.enum(["up", "down"]) })).mutation(async ({ input }) => {
    const result = await moveDownloadFile(input.id, input.direction === "up" ? 1 : -1);
    if (!result.success) throw new TRPCError({ code: "BAD_REQUEST", message: "تعذر تغيير ترتيب الملف" });
    await recordAdminAudit("download_file_reordered", "download_file", String(input.id), input);
    return result;
  }),
});
