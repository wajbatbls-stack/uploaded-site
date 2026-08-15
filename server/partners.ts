import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ownerProcedure, publicProcedure, router } from "./_core/trpc";
import { decodeAdminImage } from "./adminUpload";
import { storagePut } from "./storage";
import { partners } from "../drizzle/schema";
import {
  createPartner,
  deletePartner,
  listPartners,
  movePartner,
  recordAdminAudit,
  updatePartner,
} from "./db";

async function withPartner(id: number, action: () => Promise<unknown>) {
  const db = await import("./db").then(m => m.getDb());
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
  const [partner] = await db.select().from(partners).where(eq(partners.id, id)).limit(1);
  if (!partner) throw new TRPCError({ code: "NOT_FOUND", message: "الشريك غير موجود" });
  return action();
}

const partnerInput = z.object({
  name: z.string().min(2).max(255),
  city: z.string().max(120).default(""),
  description: z.string().max(1200).default(""),
  kind: z.enum(["جامعة", "معهد", "جهة تعليمية"]).default("جامعة"),
  shape: z.enum(["circle", "square", "pill", "card", "badge", "banner"]).default("card"),
  accentColor: z.string().regex(/^#([0-9a-f]{3}){1,2}$/i).max(12).default("#4966d6"),
  textColor: z.string().regex(/^#([0-9a-f]{3}){1,2}$/i).max(12).default("#3f4254"),
  backgroundColor: z.string().regex(/^#([0-9a-f]{3}){1,2}$/i).max(12).default("#eef1f8"),
  borderColor: z.string().regex(/^#([0-9a-f]{3}){1,2}$/i).max(12).nullable().default(null),
  link: z.string().max(512).default(""),
  isVisible: z.boolean().default(true),
});

export const partnersRouter = router({
  listAll: ownerProcedure.query(async () => listPartners()),
  listPublic: publicProcedure.query(async () => {
    const rows = await listPartners();
    return rows.filter(r => r.isVisible);
  }),
  create: ownerProcedure.input(partnerInput).mutation(async ({ input }) => {
    const result = await createPartner(input);
    await recordAdminAudit("partner_created", "partner", String(result.id), input);
    return result;
  }),
  update: ownerProcedure.input(z.object({ id: z.number().int().positive(), data: partnerInput.partial() })).mutation(async ({ input }) => {
    await withPartner(input.id, async () => {});
    await updatePartner(input.id, input.data);
    await recordAdminAudit("partner_updated", "partner", String(input.id), input.data);
    return { success: true };
  }),
  delete: ownerProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    await withPartner(input.id, async () => {});
    await deletePartner(input.id);
    await recordAdminAudit("partner_deleted", "partner", String(input.id));
    return { success: true };
  }),
  uploadLogo: ownerProcedure.input(z.object({ id: z.number().int().positive(), mimeType: z.string().min(1).max(120), dataUrl: z.string().min(1).max(4_300_000) })).mutation(async ({ input }) => {
    await withPartner(input.id, async () => {});
    const image = decodeAdminImage(input.dataUrl, input.mimeType);
    const storageKey = `wajbat-plus/partners/${input.id}.${image.extension}`;
    const result = await storagePut(storageKey, image.bytes, input.mimeType);
    await updatePartner(input.id, { logoUrl: result.url });
    return result;
  }),
  setVisibility: ownerProcedure.input(z.object({ id: z.number().int().positive(), isVisible: z.boolean() })).mutation(async ({ input }) => {
    await withPartner(input.id, async () => {});
    await updatePartner(input.id, { isVisible: input.isVisible });
    await recordAdminAudit("partner_visibility_changed", "partner", String(input.id), input);
    return { success: true };
  }),
  move: ownerProcedure.input(z.object({ id: z.number().int().positive(), direction: z.enum(["up", "down"]) })).mutation(async ({ input }) => {
    await withPartner(input.id, async () => {});
    const result = await movePartner(input.id, input.direction === "up" ? -1 : 1);
    if (!result.success) throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن نقل العنصر أكثر من ذلك" });
    await recordAdminAudit("partner_reordered", "partner", String(input.id), input);
    return result;
  }),
});
