import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readProject = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("مدير الخدمات الهرمي", () => {
  it("يحفظ الشجرة عبر إجراء الإدارة المحمي ويحافظ على مفاتيح الترتيب والإظهار", () => {
    const manager = readProject("client/public/assets/js/admin-services-manager-r1.js");
    expect(manager).toContain('api("admin.saveCollection", { collectionKey: "services", content: services })');
    expect(manager).toContain("service.sortOrder = index");
    expect(manager).toContain("sub.sortOrder = subIndex");
    expect(manager).toContain("isVisible");
  });

  it("يوفر الرفع المباشر والحذف المؤكد وترتيب السحب للخدمات والخدمات الفرعية", () => {
    const manager = readProject("client/public/assets/js/admin-services-manager-r1.js");
    expect(manager).toContain('api("admin.uploadMedia"');
    expect(manager).toContain("confirm(`سيُحذف");
    expect(manager).toContain("data-services-drag");
    expect(manager).toContain('document.addEventListener("drop"');
  });

  it("يطبق إعدادات القسم وبطاقات الخدمة على صفحة الخدمات العامة", () => {
    const app = readProject("client/public/assets/js/app.js");
    const css = readProject("client/public/assets/css/services-manager-r1.css");
    expect(app).toContain("managedServicesStyle");
    expect(app).toContain("services-page-managed");
    expect(app).toContain("servicesStyle.title");
    expect(css).toContain("--services-columns");
    expect(css).toContain("data-services-layout");
  });
});
