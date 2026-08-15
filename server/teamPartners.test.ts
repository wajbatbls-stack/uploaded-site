import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const projectFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("أقسام الفريق الإداري وشركاء النجاح (إدارة + عرض الزائر)", () => {
  it("يسجّل روترات الفريق والشركاء العامة والإدارية", () => {
    const routers = projectFile("server/routers.ts");
    expect(routers).toContain("teamRouter");
    expect(routers).toContain("partnersRouter");
    expect(routers).toContain('team: teamRouter');
    expect(routers).toContain('partners: partnersRouter');
  });

  it("يعرّف روتر الفريق مع عمليات الإدارة العامة", () => {
    const router = projectFile("server/team.ts");
    expect(router).toContain("listAll");
    expect(router).toContain("create");
    expect(router).toContain("update");
    expect(router).toContain("delete");
    expect(router).toContain("move");
    expect(router).toContain("setVisibility");
    expect(router).toContain("listPublic");
    expect(router).toContain("uploadPhoto");
  });

  it("يعرّف روتر الشركاء مع عمليات الإدارة العامة", () => {
    const router = projectFile("server/partners.ts");
    expect(router).toContain("listAll");
    expect(router).toContain("create");
    expect(router).toContain("update");
    expect(router).toContain("delete");
    expect(router).toContain("move");
    expect(router).toContain("setVisibility");
    expect(router).toContain("listPublic");
    expect(router).toContain("uploadLogo");
  });

  it("يقدّم واجهات عامة لعرض الفريق والشركاء للزوار عبر التوجيهات العامة", () => {
    const routers = projectFile("server/routers.ts");
    expect(routers).toContain('team: teamRouter');
    expect(routers).toContain('partners: partnersRouter');
    expect(projectFile("server/team.ts")).toContain("publicProcedure");
    expect(projectFile("server/partners.ts")).toContain("publicProcedure");
  });

  it("يدمج الجداول الجديدة في محتوى الموقع العام", () => {
    const db = projectFile("server/db.ts");
    expect(db).toContain("listTeamMembers");
    expect(db).toContain("listPartners");
  });

  it("يشحن مديرَي الإدارة في صفحتي المالك ويتيح تركيبهما داخل مساحة العمل", () => {
    const adminHtml = projectFile("client/public/admin.html");
    const dashboard = projectFile("client/public/admin-dashboard.html");
    expect(adminHtml).toContain("admin-team-manager-r1.js");
    expect(adminHtml).toContain("admin-partners-manager-r7.js");
    expect(dashboard).toContain("admin-team-manager-r1.js");
    expect(dashboard).toContain("admin-partners-manager-r7.js");
    const app = projectFile("client/public/assets/js/admin-app-r30.js");
    expect(app).toContain("mountCompatibleTeamManager");
    expect(app).toContain("mountCompatiblePartnersManager");
    expect(app).toContain("[data-team-workspace]");
    expect(app).toContain("[data-partners-workspace]");
  });

  it("يدعم رفع الصور من الجهاز داخل مديرَي الفريق والشركاء", () => {
    const team = projectFile("client/public/assets/js/admin-team-manager-r1.js");
    const partners = projectFile("client/public/assets/js/admin-partners-manager-r7.js");
    expect(team).toContain("admin.team.uploadPhoto");
    expect(team).toContain("fileToDataUrl");
    expect(team).toContain("WajbatTeamManager");
    expect(partners).toContain("admin.partners.uploadLogo");
    expect(partners).toContain("WajbatPartnersManager");
  });

  it("يجلب الزائر فريق الإدارة وشركاء النجاح من الجداول الجديدة في الصفحتين", () => {
    const site = projectFile("client/public/assets/js/site-app-r15.js");
    expect(site).toContain("site.team.listPublic");
    expect(site).toContain("site.partners.listPublic");
    expect(site).toContain("loadSiteTeamPartners");
  });
});

describe("زر بطاقة الشريك ومعالجة القيم النصية NULL", () => {
  const file = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

  it("يفتح موقع الجامعة الرسمي في البطاقة ولا يسقط إلى واتساب إلا لرقم صالح", () => {
    const app = file("client/public/assets/js/site-app-r27.js");
    expect(app).toContain("isWebsiteUrl");
    expect(app).toContain("isWhatsAppNumber");
    expect(app).toContain("partner-pro-btn-site");
    expect(app).toContain("partner-pro-btn-wa");
    expect(app).toContain("partner-pro-actions");
    expect(app).not.toContain('hasLink ? esc(String(item.link).trim()) : wa("أريد الاستفسار عن " + item.name)');
  });

  it("يرفض القيم النصية NULL عند بناء قائمة الشركاء الظاهرة للزائر", () => {
    const app = file("client/public/assets/js/site-app-r27.js");
    expect(app).toContain('String(p.link || "") !== "NULL"');
    expect(app).toContain('String(p.logoUrl || "") !== "NULL"');
  });

  it("يتجاهل الشعارات النصية NULL في بطاقة الشريك ويعرض الأحرف الأولى", () => {
    const app = file("client/public/assets/js/site-app-r27.js");
    expect(app).toContain("logoUrlOk");
    expect(app).toContain('logoUrl && /^https?:\\/\\//i.test(String(item.logoUrl || ""))');
  });

  it("يعترض القيم النصية NULL في مدير الشركاء عند الحفظ", () => {
    const manager = file("client/public/assets/js/admin-partners-manager-r7.js");
    expect(manager).toContain('=== "NULL"');
    expect(manager).toContain("رابط موقع الجامعة (الموقع الرسمي)");
  });
});
