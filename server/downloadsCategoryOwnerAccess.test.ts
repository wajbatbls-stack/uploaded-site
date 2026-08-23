import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("تعديل أقسام التحميلات بجلسة المالك", () => {
  it("يجدد جلسة المالك لفترة مناسبة ويعرض إعادة دخول واضحة عند انتهاء الجلسة", () => {
    const session = source("server/adminSession.ts");
    const router = source("server/routers.ts");
    const trpc = source("server/_core/trpc.ts");
    expect(session).toContain("ADMIN_SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000");
    expect(session).toContain('.setExpirationTime("7d")');
    expect(router).toContain("maxAge: ADMIN_SESSION_MAX_AGE_MS");
    expect(trpc).toContain("انتهت جلسة المالك. سجّل الدخول مرة أخرى (10002)");
  });

  it("يرفع شعار القسم فعليًا إلى التخزين قبل حفظ بيانات القسم ولا يحفظ صورة معاينة فقط", () => {
    const manager = source("client/public/assets/js/admin-downloads-manager-r20.js");
    expect(manager).toContain("let pendingLogoFile = null");
    expect(manager).toContain("pendingLogoFile = f");
    expect(manager).toContain("await uploadFileLegacy(pendingLogoFile)");
    expect(manager).toContain("imageKey: uploadedLogo.fileKey, imageUrl: uploadedLogo.fileUrl");
    expect(source("client/public/admin-sv25.html")).toContain("downloads-r20-sv60");
  });
});
