import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("adminAuth.login", () => {
  it("validates the stored owner secret through the login API and sets an HttpOnly session", async () => {
    expect(process.env.ADMIN_EMAIL).toBeTruthy();
    expect(process.env.ADMIN_PASSWORD).toBeTruthy();

    const cookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
    const ctx = {
      user: null,
      req: { headers: {} },
      res: {
        cookie: (name: string, value: string, options: Record<string, unknown>) => cookies.push({ name, value, options }),
        clearCookie: () => undefined,
      },
    } as unknown as TrpcContext;

    const result = await appRouter.createCaller(ctx).adminAuth.login({
      email: process.env.ADMIN_EMAIL!,
      password: process.env.ADMIN_PASSWORD!,
    });

    expect(result).toEqual({ success: true });
    expect(cookies).toHaveLength(1);
    expect(cookies[0]?.name).toBe("wajbat_admin_session");
    expect(cookies[0]?.value.length).toBeGreaterThan(30);
    expect(cookies[0]?.options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
  });
});
