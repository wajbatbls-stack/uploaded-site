import { describe, expect, it } from "vitest";
import { ADMIN_SESSION_COOKIE, createAdminSession } from "./adminSession";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function contextWithCookie(cookie?: string) {
  return {
    user: null,
    req: { headers: cookie ? { cookie } : {} },
    res: { cookie: () => undefined, clearCookie: () => undefined },
  } as unknown as TrpcContext;
}

describe("admin content access", () => {
  it("blocks an unauthenticated visitor from content administration", async () => {
    await expect(appRouter.createCaller(contextWithCookie()).admin.collections()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("allows a correctly signed owner session to load the content collections", async () => {
    const token = await createAdminSession();
    const collections = await appRouter
      .createCaller(contextWithCookie(`${ADMIN_SESSION_COOKIE}=${token}`))
      .admin.collections();
    expect(collections.length).toBeGreaterThan(0);
  });
});
