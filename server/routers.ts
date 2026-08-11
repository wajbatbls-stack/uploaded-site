import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSession,
  hasConfiguredAdminCredentials,
  validateAdminCredentials,
} from "./adminSession";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { decodeAdminImage } from "./adminUpload";
import { getAdminCollections, getAdminStats, getPublicSiteContent, recordSiteOrder, recordSiteVisit, saveCollection } from "./db";
import { ownerProcedure, publicProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  adminAuth: router({
    configured: publicProcedure.query(() => ({ configured: hasConfiguredAdminCredentials() })),
    login: publicProcedure
      .input(z.object({ email: z.string().min(1).max(320), password: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        if (!validateAdminCredentials(input.email, input.password)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "بيانات الدخول غير صحيحة" });
        }
        const token = await createAdminSession();
        ctx.res.cookie(ADMIN_SESSION_COOKIE, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 12 * 60 * 60 * 1000,
        });
        return { success: true } as const;
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(ADMIN_SESSION_COOKIE, { path: "/" });
      return { success: true } as const;
    }),
  }),

  site: router({
    publicContent: publicProcedure.query(() => getPublicSiteContent()),
    trackVisit: publicProcedure.input(z.object({ path: z.string().min(1).max(255) })).mutation(({ input }) => {
      void recordSiteVisit(input.path);
      return { success: true } as const;
    }),
    trackOrder: publicProcedure.input(z.object({ studentName: z.string().min(1).max(180), service: z.string().min(1).max(255) })).mutation(({ input }) => {
      void recordSiteOrder(input.studentName, input.service);
      return { success: true } as const;
    }),
  }),

  admin: router({
    collections: ownerProcedure.query(() => getAdminCollections()),
    saveCollection: ownerProcedure
      .input(z.object({ collectionKey: z.string().min(1).max(80), content: z.unknown() }))
      .mutation(({ input }) => saveCollection(input.collectionKey, input.content)),
    uploadImage: ownerProcedure
      .input(z.object({ mimeType: z.string().min(1).max(40), dataUrl: z.string().min(1).max(4_300_000) }))
      .mutation(async ({ input }) => {
        const image = decodeAdminImage(input.dataUrl, input.mimeType);
        return storagePut(`wajbat-plus/admin-images/logo.${image.extension}`, image.bytes, input.mimeType);
      }),
    stats: ownerProcedure.query(() => getAdminStats()),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
