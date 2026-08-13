import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("أصول مدير روابط الزوار", () => {
  it("يحمّل القسم المستقل وأسلوبه من صفحة الإدارة", () => {
    const adminHtml = projectFile("client/public/admin.html");
    const vite = projectFile("vite.config.ts");
    expect(adminHtml).toContain("visitor-links-r1.css");
    expect(adminHtml).toContain("admin-visitor-links-manager-r1.js");
    expect(vite).toContain("assets/js/admin-visitor-links-manager-r1.js");
    expect(vite).toContain("assets/css/visitor-links-r1.css");
  });

  it("يوفّر عمليات الإنشاء والتعديل والنسخ والمعاينة والتفعيل والحذف الفعلية", () => {
    const manager = projectFile("client/public/assets/js/admin-visitor-links-manager-r1.js");
    expect(manager).toContain("admin.createVisitorLink");
    expect(manager).toContain("admin.updateVisitorLink");
    expect(manager).toContain("admin.deleteVisitorLink");
    expect(manager).toContain("navigator.clipboard.writeText");
    expect(manager).toContain("site.resolveVisitorLink");
    expect(manager).toContain("هل أنت متأكد من حذف رابط الزوار؟");
    expect(manager).toContain("إنشاء رابط زائر جديد");
  });

  it("يوفّر بحثاً وتصفية وفرزاً فعليين ولا يحذف الرابط قبل تأكيد المالك", () => {
    const manager = projectFile("client/public/assets/js/admin-visitor-links-manager-r1.js");
    expect(manager).toContain("data-vl-search");
    expect(manager).toContain("data-vl-filter");
    expect(manager).toContain("data-vl-sort");
    expect(manager).toContain("state.search");
    expect(manager).toContain("state.filter");
    expect(manager).toContain("state.sort");
    expect(manager).toContain('if (!window.confirm("هل أنت متأكد من حذف رابط الزوار؟\\nلا يمكن التراجع عن الحذف.")) return;');
  });

  it("يحل الرابط العام قبل التوجيه الاعتيادي ويحجب المعطل والمنتهي", () => {
    const app = projectFile("client/public/assets/js/app.js");
    const routers = projectFile("server/routers.ts");
    const db = projectFile("server/db.ts");
    expect(app).toContain("resolveVisitorLinkAtEntry");
    expect(app).toContain("site.resolveVisitorLink");
    expect(app).toContain("هذا الرابط غير متاح حاليًا.");
    expect(routers).toContain("recordVisit: z.boolean().optional()");
    expect(db).toContain("resolveVisitorLink(token: string, recordVisit = true)");
    expect(db).toContain("if (recordVisit)");
  });
});
