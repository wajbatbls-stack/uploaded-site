import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSession,
  getAdminAccount,
  hasConfiguredAdminCredentials,
  updateAdminCredentials,
  validateAdminCredentials,
} from "./adminSession";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { decodeAdminImage, decodeUpload } from "./adminUpload";
import {
  createAssignmentRequest,
  createContactMessage,
  createSubmittedReview,
  deleteSubmittedReview,
  exportSiteBackup,
  getAdminCollections,
  getAdminStats,
  getPublicSiteContent,
  listAssignmentRequests,
  listContactMessages,
  listMedia,
  listSubmittedReviews,
  recordAdminAudit,
  recordSiteOrder,
  recordSiteVisit,
  registerMedia,
  removeMedia,
  restoreContentBackup,
  saveCollection,
  updateAssignmentRequest,
  updateContactMessage,
  updateSubmittedReview,
} from "./db";
import { ownerProcedure, publicProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";

const assignmentStatus = z.enum(["new", "reviewing", "in_progress", "completed", "cancelled"]);
const messageStatus = z.enum(["new", "read", "replied", "archived"]);
const reviewStatus = z.enum(["pending", "published", "hidden"]);

function classifyVisitSource(referrer?: string) {
  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (host.includes("google.")) return "google";
    if (host.includes("bing.")) return "bing";
    if (host.includes("instagram.")) return "instagram";
    if (host.includes("facebook.")) return "facebook";
    if (host.includes("twitter.") || host.includes("x.com")) return "x";
    if (host.includes("tiktok.")) return "tiktok";
    if (host.includes("whatsapp.")) return "whatsapp";
    return "referral";
  } catch {
    return "direct";
  }
}

function classifyDevice(userAgent?: string) {
  const ua = (userAgent || "").toLowerCase();
  if (/ipad|tablet|kindle|playbook/.test(ua)) return "tablet";
  if (/mobi|android|iphone|ipod/.test(ua)) return "mobile";
  return "desktop";
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  adminAuth: router({
    configured: publicProcedure.query(() => ({ configured: hasConfiguredAdminCredentials() })),
    login: publicProcedure
      .input(z.object({ email: z.string().min(1).max(320), password: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const account = await validateAdminCredentials(input.email, input.password);
        if (!account) throw new TRPCError({ code: "UNAUTHORIZED", message: "بيانات الدخول غير صحيحة" });
        const token = await createAdminSession(account.sessionVersion);
        ctx.res.cookie(ADMIN_SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 12 * 60 * 60 * 1000 });
        return { success: true } as const;
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(ADMIN_SESSION_COOKIE, { path: "/" });
      return { success: true } as const;
    }),
    account: ownerProcedure.query(async () => {
      const account = await getAdminAccount();
      if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "تعذر تحميل حساب المالك" });
      return account;
    }),
    updateCredentials: ownerProcedure
      .input(z.object({
        currentPassword: z.string().min(8).max(256),
        email: z.string().email().max(320).optional(),
        newPassword: z.string().min(8).max(256).optional(),
      }).refine(value => Boolean(value.email || value.newPassword), { message: "أدخل بريداً جديداً أو كلمة مرور جديدة" }))
      .mutation(async ({ ctx, input }) => {
        const account = await updateAdminCredentials(input);
        if (!account) throw new TRPCError({ code: "UNAUTHORIZED", message: "كلمة المرور الحالية غير صحيحة" });
        ctx.res.clearCookie(ADMIN_SESSION_COOKIE, { path: "/" });
        await recordAdminAudit("credentials_updated", "owner_account", String(account.id));
        return { success: true, email: account.email, forceRelogin: true } as const;
      }),
  }),

  site: router({
    publicContent: publicProcedure.query(() => getPublicSiteContent()),
    trackVisit: publicProcedure.input(z.object({ path: z.string().min(1).max(255) })).mutation(({ ctx, input }) => {
      const referrer = typeof ctx.req.headers.referer === "string" ? ctx.req.headers.referer : undefined;
      const userAgent = typeof ctx.req.headers["user-agent"] === "string" ? ctx.req.headers["user-agent"] : undefined;
      void recordSiteVisit(input.path, { source: classifyVisitSource(referrer), deviceType: classifyDevice(userAgent) });
      return { success: true } as const;
    }),
    trackOrder: publicProcedure.input(z.object({ studentName: z.string().min(1).max(180), service: z.string().min(1).max(255) })).mutation(({ input }) => {
      void recordSiteOrder(input.studentName, input.service);
      return { success: true } as const;
    }),
    uploadRequestAttachment: publicProcedure.input(z.object({ mimeType: z.string().min(1).max(120), dataUrl: z.string().min(1).max(11_200_000), originalName: z.string().min(1).max(255) })).mutation(async ({ input }) => {
      const upload = decodeUpload(input.dataUrl, input.mimeType);
      const storage = await storagePut(`wajbat-plus/request-attachments/${Date.now()}.${upload.extension}`, upload.bytes, input.mimeType);
      const media = await registerMedia({ storageKey: storage.key, url: storage.url, originalName: input.originalName, mimeType: input.mimeType, sizeBytes: upload.bytes.length, category: upload.category, usage: "assignment_attachment" });
      return { id: media.id, originalName: media.originalName };
    }),
    submitAssignment: publicProcedure.input(z.object({
      studentName: z.string().min(2).max(180), studentId: z.string().min(2).max(100), university: z.string().min(2).max(200), college: z.string().min(2).max(200),
      department: z.string().max(200).optional(), course: z.string().min(2).max(200), professor: z.string().min(2).max(180), serviceType: z.string().min(2).max(255),
      deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), description: z.string().min(8).max(12000), email: z.string().email().max(320).optional(), phone: z.string().min(7).max(32).optional(), attachmentMediaId: z.number().int().positive().optional(),
    })).mutation(async ({ input }) => {
      const request = await createAssignmentRequest(input);
      void recordSiteOrder(input.studentName, input.serviceType);
      return { success: true, requestId: request.id } as const;
    }),
    submitContact: publicProcedure.input(z.object({
      name: z.string().min(2).max(180), phone: z.string().min(7).max(32), email: z.string().email().max(320).optional(), subject: z.string().min(2).max(255), message: z.string().min(5).max(10000),
    })).mutation(async ({ input }) => ({ success: true, ...(await createContactMessage(input)) })),
    submitReview: publicProcedure.input(z.object({ name: z.string().min(2).max(180), university: z.string().min(2).max(200), review: z.string().min(10).max(2000), rating: z.number().int().min(1).max(5) }))
      .mutation(async ({ input }) => ({ success: true, ...(await createSubmittedReview(input)) })),
  }),

  admin: router({
    collections: ownerProcedure.query(() => getAdminCollections()),
    saveCollection: ownerProcedure.input(z.object({ collectionKey: z.string().min(1).max(80), content: z.unknown() })).mutation(async ({ input }) => {
      const result = await saveCollection(input.collectionKey, input.content);
      await recordAdminAudit("collection_saved", "content_collection", input.collectionKey);
      return result;
    }),
    uploadImage: ownerProcedure.input(z.object({ mimeType: z.string().min(1).max(120), dataUrl: z.string().min(1).max(4_300_000) })).mutation(async ({ input }) => {
      const image = decodeAdminImage(input.dataUrl, input.mimeType);
      return storagePut("wajbat-plus/admin-images/logo." + image.extension, image.bytes, input.mimeType);
    }),
    uploadMedia: ownerProcedure.input(z.object({ mimeType: z.string().min(1).max(120), dataUrl: z.string().min(1).max(11_200_000), originalName: z.string().min(1).max(255), usage: z.string().max(80).optional() })).mutation(async ({ input }) => {
      const upload = decodeUpload(input.dataUrl, input.mimeType);
      const storage = await storagePut(`wajbat-plus/media/${upload.category}/${Date.now()}.${upload.extension}`, upload.bytes, input.mimeType);
      const media = await registerMedia({ storageKey: storage.key, url: storage.url, originalName: input.originalName, mimeType: input.mimeType, sizeBytes: upload.bytes.length, category: upload.category, usage: input.usage });
      await recordAdminAudit("media_uploaded", "media_file", String(media.id), { name: input.originalName });
      return media;
    }),
    media: ownerProcedure.input(z.object({ category: z.enum(["image", "document", "other"]).optional() }).optional()).query(({ input }) => listMedia(input?.category)),
    removeMedia: ownerProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
      const result = await removeMedia(input.id);
      await recordAdminAudit("media_removed", "media_file", String(input.id));
      return result;
    }),
    requests: ownerProcedure.input(z.object({ search: z.string().max(200).optional(), status: assignmentStatus.optional(), limit: z.number().int().min(1).max(500).optional() }).optional()).query(({ input }) => listAssignmentRequests(input)),
    updateRequest: ownerProcedure.input(z.object({ id: z.number().int().positive(), status: assignmentStatus.optional(), adminNotes: z.string().max(12000).optional() })).mutation(async ({ input }) => {
      const result = await updateAssignmentRequest(input.id, input);
      await recordAdminAudit("request_updated", "assignment_request", String(input.id), input);
      return result;
    }),
    messages: ownerProcedure.input(z.object({ search: z.string().max(200).optional(), status: messageStatus.optional(), limit: z.number().int().min(1).max(500).optional() }).optional()).query(({ input }) => listContactMessages(input)),
    updateMessage: ownerProcedure.input(z.object({ id: z.number().int().positive(), status: messageStatus.optional(), adminNotes: z.string().max(12000).optional() })).mutation(async ({ input }) => {
      const result = await updateContactMessage(input.id, input);
      await recordAdminAudit("message_updated", "contact_message", String(input.id), input);
      return result;
    }),
    submittedReviews: ownerProcedure.input(z.object({ status: reviewStatus.optional() }).optional()).query(({ input }) => listSubmittedReviews(input?.status)),
    updateSubmittedReview: ownerProcedure.input(z.object({ id: z.number().int().positive(), status: reviewStatus })).mutation(async ({ input }) => {
      const result = await updateSubmittedReview(input.id, input.status);
      await recordAdminAudit("review_moderated", "submitted_review", String(input.id), input);
      return result;
    }),
    deleteSubmittedReview: ownerProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
      const result = await deleteSubmittedReview(input.id);
      await recordAdminAudit("review_deleted", "submitted_review", String(input.id));
      return result;
    }),
    stats: ownerProcedure.query(() => getAdminStats()),
    backup: ownerProcedure.query(() => exportSiteBackup()),
    restoreContentBackup: ownerProcedure.input(z.object({ backup: z.unknown() })).mutation(async ({ input }) => {
      const result = await restoreContentBackup(input.backup);
      await recordAdminAudit("content_backup_restored", "content_backup", undefined, { restoredCollections: result.restoredCollections });
      return result;
    }),
  }),
});

export type AppRouter = typeof appRouter;
