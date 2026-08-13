import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSession,
  finishOwnerPasskeyAuthentication,
  finishOwnerPasskeyRegistration,
  getAdminAccount,
  getVerifiedAdminSession,
  hasConfiguredAdminCredentials,
  removeOwnerPasskey,
  revokeCurrentAdminSession,
  revokeOtherAdminSessions,
  startOwnerPasskeyAuthentication,
  startOwnerPasskeyRegistration,
  updateAdminCredentials,
  validateAdminCredentials,
  verifyAdminCurrentPassword,
} from "./adminSession";
import { getWebAuthnContext } from "./webAuthnContext";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { decodeAdminImage, decodeUpload } from "./adminUpload";
import { uploadAndRegisterAdminMedia } from "./adminMediaUpload";
import {
  createAssignmentRequest,
  createContactMessage,
  createSubmittedReview,
  deleteSubmittedReview,
  exportSiteBackup,
  getAdminCollections,
  getOwnerLoginSettings,
  getAdminStats,
  getPublicSiteContent,
  listOwnerPasskeys,
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
  restorePreviousOwnerLoginSettings,
  saveOwnerLoginSettings,
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
const hexColor = z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
const mediaUrl = z.string().max(2_000).refine(value => value.startsWith("/") || /^https?:\/\//i.test(value), "رابط الوسيط غير صالح").nullable();
const ownerLoginSettingsInput = z.object({
  template: z.enum(["professional", "glass", "minimal", "royal"]),
  backgroundStyle: z.enum(["gradient", "solid", "image"]),
  backgroundColor: hexColor,
  backgroundGradient: z.string().max(600).regex(/^(linear-gradient|radial-gradient)\(/).nullable(),
  backgroundImageUrl: mediaUrl,
  backgroundImageMediaId: z.number().int().positive().nullable(),
  logoUrl: mediaUrl,
  logoMediaId: z.number().int().positive().nullable(),
  logoSize: z.number().int().min(32).max(180),
  logoPosition: z.enum(["top", "inline", "side"]),
  logoShape: z.enum(["rounded", "circle", "square"]),
  logoBorderColor: hexColor,
  logoBorderWidth: z.number().int().min(0).max(12),
  logoGlow: z.number().int().min(0).max(60),
  logoAnimation: z.enum(["none", "pulse", "float"]),
  ownerPhotoUrl: mediaUrl,
  ownerPhotoMediaId: z.number().int().positive().nullable(),
  ownerPhotoSize: z.number().int().min(0).max(180),
  ownerPhotoShape: z.enum(["circle", "rounded", "square"]),
  cardStyle: z.enum(["standard", "glass", "outline", "soft", "dark"]),
  cardColor: hexColor,
  cardOpacity: z.number().int().min(20).max(100),
  cardBorderColor: hexColor,
  cardBorderWidth: z.number().int().min(0).max(8),
  cardRadius: z.number().int().min(0).max(56),
  cardBlur: z.number().int().min(0).max(40),
  cardWidth: z.number().int().min(320).max(640),
  fieldStyle: z.enum(["modern", "underline", "filled", "outline"]),
  fieldColor: hexColor,
  fieldTextColor: hexColor,
  fieldPlaceholderColor: hexColor,
  fieldBorderColor: hexColor,
  fieldBorderWidth: z.number().int().min(0).max(6),
  fieldRadius: z.number().int().min(0).max(32),
  fieldFontSize: z.number().int().min(12).max(24),
  fontFamily: z.enum(["Cairo", "Tajawal", "IBM Plex Sans Arabic", "Arial"]),
  contentOrder: z.string().min(20).max(300).regex(/^(?:logo|title|description|email|password|passkey|submit|footer)(?:,(?:logo|title|description|email|password|passkey|submit|footer)){7}$/),
  buttonStyle: z.enum(["solid", "gradient", "outline", "soft"]),
  buttonColor: hexColor,
  buttonTextColor: hexColor,
  buttonRadius: z.number().int().min(0).max(32),
  buttonGlow: z.number().int().min(0).max(60),
  buttonAnimation: z.enum(["none", "pulse", "lift"]),
  entranceAnimation: z.enum(["none", "fade", "slide", "scale"]),
  animationDuration: z.number().int().min(0).max(900),
  title: z.string().min(1).max(320),
  description: z.string().min(1).max(2_000),
  loginButtonText: z.string().min(1).max(120),
  passkeyButtonText: z.string().min(1).max(160),
  footerText: z.string().min(1).max(500),
  invalidCredentialsText: z.string().min(1).max(300),
  clockEnabled: z.boolean(),
  clockStyle: z.enum(["digital-clean", "digital-outline", "digital-glow", "digital-terminal", "digital-glass", "digital-neon", "digital-led", "digital-bold", "analog-classic", "analog-minimal", "analog-royal", "analog-modern", "analog-dark", "analog-soft", "analog-gold", "analog-blue", "flip-clean", "flip-dark", "flip-royal", "flip-neon", "pill", "badge", "ribbon", "compact"]),
  clockPosition: z.enum(["above_card", "inside_top", "inside_bottom", "below_card"]),
  clockFormat: z.enum(["12", "24"]),
  clockColor: hexColor,
  clockAccentColor: hexColor,
  clockSize: z.number().int().min(24).max(140),
  clockShowSeconds: z.boolean(),
});

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
    loginSettings: publicProcedure.query(async () => {
      const account = await getAdminAccount();
      if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "تعذر تحميل إعدادات الدخول" });
      return getOwnerLoginSettings(account.id);
    }),
    login: publicProcedure
      .input(z.object({ email: z.string().min(1).max(320), password: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const account = await validateAdminCredentials(input.email, input.password);
        if (!account) throw new TRPCError({ code: "UNAUTHORIZED", message: "بيانات الدخول غير صحيحة" });
        const userAgent = typeof ctx.req.headers["user-agent"] === "string" ? ctx.req.headers["user-agent"] : undefined;
        const forwarded = typeof ctx.req.headers["x-forwarded-for"] === "string" ? ctx.req.headers["x-forwarded-for"].split(",")[0]?.trim() : undefined;
        const token = await createAdminSession(account, { userAgent, ipAddress: forwarded });
        ctx.res.cookie(ADMIN_SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 12 * 60 * 60 * 1000 });
        return { success: true } as const;
      }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      await revokeCurrentAdminSession(ctx.req.headers.cookie);
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
    revokeOtherSessions: ownerProcedure
      .input(z.object({ currentPassword: z.string().min(8).max(256) }))
      .mutation(async ({ ctx, input }) => {
        const result = await revokeOtherAdminSessions(ctx.req.headers.cookie, input.currentPassword);
        if (!result) throw new TRPCError({ code: "UNAUTHORIZED", message: "تعذر إبطال الجلسات الأخرى" });
        await recordAdminAudit("other_sessions_revoked", "owner_account", String(result.accountId));
        return { success: true } as const;
      }),
    ownerLoginSettings: ownerProcedure.query(async () => {
      const account = await getAdminAccount();
      if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "تعذر تحميل حساب المالك" });
      return getOwnerLoginSettings(account.id);
    }),
    saveOwnerLoginSettings: ownerProcedure.input(ownerLoginSettingsInput).mutation(async ({ input }) => {
      const account = await getAdminAccount();
      if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "تعذر تحميل حساب المالك" });
      const result = await saveOwnerLoginSettings(account.id, input);
      await recordAdminAudit("owner_login_settings_saved", "owner_login_settings", String(account.id));
      return result;
    }),
    restoreDefaultOwnerLoginSettings: ownerProcedure.mutation(async () => {
      const account = await getAdminAccount();
      if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "تعذر تحميل حساب المالك" });
      const { DEFAULT_OWNER_LOGIN_SETTINGS } = await import("./db");
      const result = await saveOwnerLoginSettings(account.id, {
        ...DEFAULT_OWNER_LOGIN_SETTINGS,
        backgroundGradient: DEFAULT_OWNER_LOGIN_SETTINGS.backgroundGradient,
        backgroundImageUrl: null, backgroundImageMediaId: null, logoUrl: null, logoMediaId: null, ownerPhotoUrl: null, ownerPhotoMediaId: null,
      });
      await recordAdminAudit("owner_login_settings_restored", "owner_login_settings", String(account.id));
      return result;
    }),
    // Compatibility endpoint used by the owner-login editor. It intentionally
    // performs the same authenticated reset and keeps the audit trail intact.
    restoreOwnerLoginSettings: ownerProcedure.mutation(async () => {
      const account = await getAdminAccount();
      if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "تعذر تحميل حساب المالك" });
      const { DEFAULT_OWNER_LOGIN_SETTINGS } = await import("./db");
      const result = await saveOwnerLoginSettings(account.id, {
        ...DEFAULT_OWNER_LOGIN_SETTINGS,
        backgroundGradient: DEFAULT_OWNER_LOGIN_SETTINGS.backgroundGradient,
        backgroundImageUrl: null, backgroundImageMediaId: null, logoUrl: null, logoMediaId: null, ownerPhotoUrl: null, ownerPhotoMediaId: null,
      });
      await recordAdminAudit("owner_login_settings_restored", "owner_login_settings", String(account.id));
      return result;
    }),
    restorePreviousOwnerLoginSettings: ownerProcedure.mutation(async () => {
      const account = await getAdminAccount();
      if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "تعذر تحميل حساب المالك" });
      try {
        const result = await restorePreviousOwnerLoginSettings(account.id);
        await recordAdminAudit("owner_login_settings_previous_restored", "owner_login_settings", String(account.id));
        return result;
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "تعذر استعادة النسخة السابقة" });
      }
    }),
    passkeys: ownerProcedure.query(async () => {
      const account = await getAdminAccount();
      if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "تعذر تحميل حساب المالك" });
      return listOwnerPasskeys(account.id);
    }),
    passkeyRegistrationOptions: ownerProcedure.query(({ ctx }) => startOwnerPasskeyRegistration(getWebAuthnContext(ctx.req.headers))),
    verifyPasskeyRegistration: ownerProcedure.input(z.object({
      challenge: z.string().min(20).max(1_024), response: z.unknown(), label: z.string().max(120).optional(), currentPassword: z.string().min(8).max(256),
    })).mutation(async ({ ctx, input }) => {
      const session = await getVerifiedAdminSession(ctx.req.headers.cookie);
      if (!session) throw new TRPCError({ code: "FORBIDDEN", message: "انتهت جلسة المالك" });
      if (!(await verifyAdminCurrentPassword(input.currentPassword))) throw new TRPCError({ code: "UNAUTHORIZED", message: "تحقق من كلمة المرور الحالية قبل تسجيل Passkey" });
      const result = await finishOwnerPasskeyRegistration({ challenge: input.challenge, response: input.response, label: input.label || "Passkey المالك", ownerAccountId: session.accountId });
      await recordAdminAudit("owner_passkey_registered", "owner_passkey", String(session.accountId));
      return result;
    }),
    passkeyAuthenticationOptions: publicProcedure.query(({ ctx }) => startOwnerPasskeyAuthentication(getWebAuthnContext(ctx.req.headers))),
    verifyPasskeyAuthentication: publicProcedure.input(z.object({ challenge: z.string().min(20).max(1_024), response: z.unknown() })).mutation(async ({ ctx, input }) => {
      const userAgent = typeof ctx.req.headers["user-agent"] === "string" ? ctx.req.headers["user-agent"] : undefined;
      const forwarded = typeof ctx.req.headers["x-forwarded-for"] === "string" ? ctx.req.headers["x-forwarded-for"].split(",")[0]?.trim() : undefined;
      const token = await finishOwnerPasskeyAuthentication({ challenge: input.challenge, response: input.response, metadata: { userAgent, ipAddress: forwarded } });
      ctx.res.cookie(ADMIN_SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 12 * 60 * 60 * 1000 });
      return { success: true } as const;
    }),
    removePasskey: ownerProcedure.input(z.object({ id: z.number().int().positive(), currentPassword: z.string().min(8).max(256) })).mutation(async ({ ctx, input }) => {
      const session = await getVerifiedAdminSession(ctx.req.headers.cookie);
      if (!session) throw new TRPCError({ code: "FORBIDDEN", message: "انتهت جلسة المالك" });
      if (!(await removeOwnerPasskey(session.accountId, input.id, input.currentPassword))) throw new TRPCError({ code: "UNAUTHORIZED", message: "تعذر حذف Passkey: تحقق من كلمة المرور الحالية" });
      await recordAdminAudit("owner_passkey_removed", "owner_passkey", String(input.id));
      return { success: true } as const;
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
      return uploadAndRegisterAdminMedia(input, { storagePut, registerMedia, recordAdminAudit });
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
