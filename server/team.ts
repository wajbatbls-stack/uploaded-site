import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ownerProcedure, publicProcedure, router } from "./_core/trpc";
import { decodeAdminImage } from "./adminUpload";
import { storagePut } from "./storage";
import { teamMembers } from "../drizzle/schema";
import {
  createTeamMember,
  deleteTeamMember,
  listTeamMembers,
  moveTeamMember,
  recordAdminAudit,
  updateTeamMember,
} from "./db";

async function withMember(id: number, action: () => Promise<unknown>) {
  const db = await import("./db").then(m => m.getDb());
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
  const [member] = await db.select().from(teamMembers).where(eq(teamMembers.id, id)).limit(1);
  if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "العضو غير موجود" });
  return action();
}

const teamMemberInput = z.object({
  name: z.string().min(2).max(180),
  role: z.string().max(120).default(""),
  description: z.string().max(1200).default(""),
  isVisible: z.boolean().default(true),
});

export const teamRouter = router({
  listAll: ownerProcedure.query(async () => listTeamMembers()),
  listPublic: publicProcedure.query(async () => {
    const rows = await listTeamMembers();
    return rows.filter(r => r.isVisible);
  }),
  create: ownerProcedure.input(teamMemberInput).mutation(async ({ input }) => {
    const result = await createTeamMember(input);
    await recordAdminAudit("team_member_created", "team_member", String(result.id), input);
    return result;
  }),
  update: ownerProcedure.input(z.object({ id: z.number().int().positive(), data: teamMemberInput.partial() })).mutation(async ({ input }) => {
    await withMember(input.id, async () => {});
    await updateTeamMember(input.id, input.data);
    await recordAdminAudit("team_member_updated", "team_member", String(input.id), input.data);
    return { success: true };
  }),
  delete: ownerProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    await withMember(input.id, async () => {});
    await deleteTeamMember(input.id);
    await recordAdminAudit("team_member_deleted", "team_member", String(input.id));
    return { success: true };
  }),
  uploadPhoto: ownerProcedure.input(z.object({ id: z.number().int().positive(), mimeType: z.string().min(1).max(120), dataUrl: z.string().min(1).max(4_300_000) })).mutation(async ({ input }) => {
    await withMember(input.id, async () => {});
    const image = decodeAdminImage(input.dataUrl, input.mimeType);
    const storageKey = `wajbat-plus/team/${input.id}.${image.extension}`;
    const result = await storagePut(storageKey, image.bytes, input.mimeType);
    await updateTeamMember(input.id, { photoUrl: result.url });
    return result;
  }),
  setVisibility: ownerProcedure.input(z.object({ id: z.number().int().positive(), isVisible: z.boolean() })).mutation(async ({ input }) => {
    await withMember(input.id, async () => {});
    await updateTeamMember(input.id, { isVisible: input.isVisible });
    await recordAdminAudit("team_member_visibility_changed", "team_member", String(input.id), input);
    return { success: true };
  }),
  move: ownerProcedure.input(z.object({ id: z.number().int().positive(), direction: z.enum(["up", "down"]) })).mutation(async ({ input }) => {
    await withMember(input.id, async () => {});
    const result = await moveTeamMember(input.id, input.direction === "up" ? -1 : 1);
    if (!result.success) throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن نقل العنصر أكثر من ذلك" });
    await recordAdminAudit("team_member_reordered", "team_member", String(input.id), input);
    return result;
  }),
});
