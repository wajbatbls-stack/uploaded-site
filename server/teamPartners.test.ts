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
    expect(adminHtml).toContain("admin-partners-manager-r17.js");
    expect(dashboard).toContain("admin-team-manager-r1.js");
    expect(dashboard).toContain("admin-partners-manager-r17.js");
    const app = projectFile("client/public/assets/js/admin-app-r30.js");
    expect(app).toContain("mountCompatibleTeamManager");
    expect(app).toContain("mountCompatiblePartnersManager");
    expect(app).toContain("[data-team-workspace]");
    expect(app).toContain("[data-partners-workspace]");
  });

  it("يدعم رفع الصور من الجهاز داخل مديرَي الفريق والشركاء", () => {
    const team = projectFile("client/public/assets/js/admin-team-manager-r1.js");
    const partners = projectFile("client/public/assets/js/admin-partners-manager-r17.js");
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

  it("يفتح موقع الجامعة الرسمي في البطاقة ولا يفتح واتساب إطلاقًا", () => {
    const app = file("client/public/assets/js/site-app-r33.js");
    const cardStart = app.lastIndexOf("partnerCard = (item) =>");
    const fn = app.slice(cardStart, app.indexOf("\n  };\n  const dynamicPartners", cardStart));
    expect(app).toContain("isWebsiteUrl");
    expect(fn).toContain("javascript:void(0)");
    expect(fn).toContain("partner-pro-btn-site");
    expect(fn).toContain("partner-pro-actions");
    expect(fn).toContain("🌐 زيارة موقع الجامعة");
    expect(fn).toContain("partner-pro-card-nolink");
    expect(fn).toContain("partner-pro-nolink");
    // لا واتساب إطلاقًا من بطاقة الجامعة
    expect(fn).not.toContain("partner-pro-btn-wa");
    expect(fn).not.toContain('wa("أريد الاستفسار عن " + item.name)');
    // الموقع الرسمي فقط عبر rawLink
    expect(fn).toContain('href="${esc(rawLink)}"');
  });

  it("يُظهر سطرًا توضيحيًا عند غياب رابط الموقع، والوصف عند وجوده", () => {
    const app = file("client/public/assets/js/site-app-r33.js");
    expect(app).toContain("لم يتوفر رابط الموقع بعد");
    expect(app).toContain("hasDescription");
    expect(app).toContain("partner-pro-desc");
  });

  it("يرفض القيم النصية NULL عند بناء قائمة الشركاء الظاهرة للزائر", () => {
    const app = file("client/public/assets/js/site-app-r33.js");
    expect(app).toContain('String(p.link || "") !== "NULL"');
    expect(app).toContain('String(p.logoUrl || "") !== "NULL"');
  });

  it("يتجاهل الشعارات النصية NULL في بطاقة الشريك ويعرض الأحرف الأولى", () => {
    const app = file("client/public/assets/js/site-app-r33.js");
    expect(app).toContain("logoUrlOk");
    expect(app).toContain("/^https?:\\/\\//i.test(logoUrlStr)");
    expect(app).toContain("/^\\/manus-storage\\//.test(logoUrlStr)");
  });

  it("يعترض القيم النصية NULL في مدير الشركاء عند الحفظ", () => {
    const manager = file("client/public/assets/js/admin-partners-manager-r17.js");
    expect(manager).toContain('=== "NULL"');
    expect(manager).toContain("رابط الموقع الرسمي");
    expect(manager).toContain("logoPreviewUrl");
    expect(manager).toContain("تم اختيار الشعار");
    expect(manager).toContain("pm-card-signals");
  });

  it("waNumber في النسخة المنشورة يفصل الأرقام الملتصقة ويعيد رقمًا واحدًا صالحًا", () => {
    const app = file("client/public/assets/js/site-app-r33.js");
    expect(app).toContain("raw.split(/[^0-9]+/)");
    const evalJs = (src, custom) => {
      const m = src.match(/const waNumber = \([\s\S]*?\};/);
      return new Function("cfg", `const SITE_CONFIG={};${m[0]}\nSITE_CONFIG.whatsapp = ${JSON.stringify(custom)};\nreturn waNumber();`)(undefined);
    };
    expect(evalJs(app, "  966542699518        /     966567680470")).toBe("966542699518");
    expect(evalJs(app, "966567680470")).toBe("966567680470");
    expect(evalJs(app, "0542699518")).toBe("966542699518");
    expect(evalJs(app, "966542699518,966567680470")).toBe("966542699518");
  });
  it("رابط wa.me في waNumber المنشورة لا يجمع رقمين ملتصقين", () => {
    const app = file("client/public/assets/js/site-app-r33.js");
    const m = app.match(/const waNumber = \([\s\S]*?\};/);
    const fn = new Function(`const SITE_CONFIG={};${m[0]}\nreturn waNumber();`);
    const n = fn(undefined, { whatsapp: "966542699518966567680470" });
    expect(n.length).toBeLessThanOrEqual(12);
    expect(/^966\d{9,12}$/.test(n)).toBe(true);
  });
});
