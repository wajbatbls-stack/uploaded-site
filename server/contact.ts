import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ownerProcedure, publicProcedure, router } from "./_core/trpc";
import {
  listContactChannels, listContactChannelsPublic,
  createContactChannel, updateContactChannel, deleteContactChannel,
  setContactChannelVisibility, moveContactChannel,
  migrateLegacyContactChannels,
  recordAdminAudit,
} from "./db";

export type ContactChannelType = "whatsapp" | "mobile" | "email" | "address" | "social";

/** أسماء القنوات الخمسة المدعومة في نظام «إدارة اتصل بنا». */
export const CONTACT_CHANNEL_TYPES: ContactChannelType[] = ["whatsapp", "mobile", "email", "address", "social"];

export const channelTypeSchema = z.enum(CONTACT_CHANNEL_TYPES);

const baseChannelInput = z.object({
  type: channelTypeSchema,
  label: z.string().min(1).max(160),
  description: z.string().max(2000).optional(),
  imageKey: z.string().max(512).optional(),
  imageUrl: z.string().max(2000).optional(),
});

const unionVariants = [
  z.object({ type: z.literal("whatsapp"), number: z.string().min(7).max(40) }),
  z.object({ type: z.literal("mobile"), number: z.string().min(7).max(40) }),
  z.object({ type: z.literal("email"), email: z.string().email().max(320) }),
  z.object({ type: z.literal("address"), address: z.string().min(1).max(500) }),
  z.object({
    type: z.literal("social"),
    platform: z.string().min(1).max(80),
    platformName: z.string().min(1).max(120),
    link: z.string().url().min(1).max(2000),
    username: z.string().max(160).optional(),
    displayMode: z.enum(["icon", "card", "banner"]).default("icon"),
    shape: z.enum(["circle", "square", "rectangle", "card", "icon-only", "large-card"]).default("circle"),
    accentColor: z.string().max(32).optional(),
    textColor: z.string().max(32).optional(),
    backgroundColor: z.string().max(32).optional(),
    borderColor: z.string().max(32).optional(),
    icon: z.string().max(16),
  }),
] as const;

export const contactChannelInput = z.union(unionVariants).and(baseChannelInput);

const contactChannelUpdateInput = z.object({
  id: z.number().int().positive(),
  type: channelTypeSchema,
  label: z.string().min(1).max(160).optional(),
  description: z.string().max(2000).optional(),
  imageKey: z.string().max(512).nullable().optional(),
  imageUrl: z.string().max(2000).nullable().optional(),
  number: z.string().min(7).max(40).optional(),
  email: z.string().email().max(320).optional(),
  address: z.string().min(1).max(500).optional(),
  platform: z.string().min(1).max(80).optional(),
  platformName: z.string().min(1).max(120).optional(),
  link: z.string().url().max(2000).optional(),
  username: z.string().max(160).nullable().optional(),
  displayMode: z.enum(["icon", "card", "banner"]).optional(),
  shape: z.enum(["circle", "square", "rectangle", "card", "icon-only", "large-card"]).optional(),
  accentColor: z.string().max(32).optional(),
  textColor: z.string().max(32).optional(),
  backgroundColor: z.string().max(32).optional(),
  borderColor: z.string().max(32).optional(),
  icon: z.string().max(16).optional(),
});

function withChannel(channelType: ContactChannelType, id: number, action: () => Promise<unknown>) {
  return listContactChannels().then(channels => {
    const channel = channels.find(c => c.type === channelType && c.id === id);
    if (!channel) throw new TRPCError({ code: "NOT_FOUND", message: "قناة الاتصال غير موجودة" });
    return action();
  });
}

export const contactRouter = router({
  /** القناة العامة الظاهرة لموقع الزائر: كل القنوات المفعلة فقط دون fileKey. */
  publicList: publicProcedure.query(async () => {
    void migrateLegacyContactChannels().catch(() => {});
    const channels = await listContactChannelsPublic();
    return {
      channels: channels.map(({ imageKey, ...rest }) => rest),
    };
  }),
  list: ownerProcedure.query(async () => {
    const channels = await listContactChannels();
    return { channels };
  }),
  createChannel: ownerProcedure.input(contactChannelInput).mutation(async ({ input }) => {
    const result = await createContactChannel(input as any);
    await recordAdminAudit("contact_channel_created", "contact_channel", String(result.id), {
      type: input.type, label: input.label,
    });
    return result;
  }),
  updateChannel: ownerProcedure.input(contactChannelUpdateInput).mutation(async ({ input }) => {
    const { id, ...updates } = input;
    const type = input.type ?? inferChannelType(updates);
    await withChannel(type as ContactChannelType, id, async () => {});
    const result = await updateContactChannel(id, updates);
    await recordAdminAudit("contact_channel_updated", "contact_channel", String(id), updates);
    return result;
  }),
  deleteChannel: ownerProcedure.input(z.object({ id: z.number().int().positive(), type: channelTypeSchema })).mutation(async ({ input }) => {
    await withChannel(input.type, input.id, async () => {});
    const result = await deleteContactChannel(input.id);
    await recordAdminAudit("contact_channel_deleted", "contact_channel", String(input.id));
    return result;
  }),
  setVisibility: ownerProcedure.input(z.object({ id: z.number().int().positive(), type: channelTypeSchema, isVisible: z.boolean() })).mutation(async ({ input }) => {
    await withChannel(input.type, input.id, async () => {});
    const result = await setContactChannelVisibility(input.id, input.isVisible);
    await recordAdminAudit("contact_channel_visibility_changed", "contact_channel", String(input.id), input);
    return result;
  }),
  move: ownerProcedure.input(z.object({ id: z.number().int().positive(), type: channelTypeSchema, direction: z.enum(["up", "down"]) })).mutation(async ({ input }) => {
    await withChannel(input.type, input.id, async () => {});
    const result = await moveContactChannel(input.id, input.direction === "up" ? 1 : -1);
    if (!result.success) throw new TRPCError({ code: "BAD_REQUEST", message: "تعذر تغيير ترتيب القناة" });
    await recordAdminAudit("contact_channel_reordered", "contact_channel", String(input.id), input);
    return result;
  }),
});

/** عندما لا يُمرَّر type في التحديث، استنتجه من الحقول المرسلة. */
function inferChannelType(updates: Partial<z.infer<typeof contactChannelUpdateInput>>): ContactChannelType {
  if (updates.number) return (updates.platform || updates.platformName || updates.link) ? "social" : "mobile";
  if (updates.email) return "email";
  if (updates.address) return "address";
  if (updates.platform || updates.platformName || updates.link) return "social";
  return "whatsapp";
}
