import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("إدارة الصفحة الرئيسية", () => {
  it("يحفظ تخصيص الصفحة الرئيسية داخل إعدادات الموقع عبر واجهة المالك المحمية", () => {
    const manager = projectFile("client/public/assets/js/admin-homepage-manager-r2.js");

    expect(manager).toContain('admin.saveCollection("siteSettings", { ...settings, homePageConfig: draft })');
    expect(manager).toContain('const current = () => normalizeLegacyConfig(getSettings().homePageConfig);');
    expect(manager).toContain('const restoredSections = new Set(["services", "features", "cta"])');
    expect(manager).toContain("تم الحفظ في قاعدة البيانات");
  });

  it("يربط الرفع المباشر بالصورة المخزنة ولا يحتاج إلى رابط يكتبه المالك", () => {
    const manager = projectFile("client/public/assets/js/admin-homepage-manager-r2.js");
    const router = projectFile("server/routers.ts");

    expect(manager).toContain("getAdmin().uploadImage(file)");
    expect(manager).toContain("pathSet(draft, input.dataset.hpFile, result.url)");
    expect(router).toContain("uploadImage: ownerProcedure");
  });

  it("يطبّق التخصيص المحفوظ على واجهة الزائر مع إبقاء الحالة الافتراضية عند غياب الإعداد", () => {
    const app = projectFile("client/public/assets/js/site-app-r36.js");
    const style = projectFile("client/public/assets/css/homepage-manager-r1.css");

    expect(app).toContain("const home = siteSettings.homePageConfig && typeof siteSettings.homePageConfig === \"object\" ? siteSettings.homePageConfig : null");
    expect(app).toContain('const isLegacyHomeConfig = Number(home.version || 1) < 2;');
    expect(app).toContain('const legacySectionVisible = id => isLegacyHomeConfig && ["services", "features"].includes(id);');
    expect(app).toContain('legacySectionVisible("services") || serviceConfig.visible !== false');
    expect(app).toContain('legacySectionVisible("features") || featureConfig.visible !== false');
    expect(app).toContain('return `<div class="home-managed-stack">');
    expect(style).toContain(".home-managed-hero");
  });
});
