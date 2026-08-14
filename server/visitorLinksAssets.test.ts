import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("أصول مدير روابط الزوار", () => {
  it("يحمّل القسم المستقل وأسلوبه من صفحة الإدارة", () => {
    const adminHtml = projectFile("client/public/admin.html");
    const vite = projectFile("vite.config.ts");
    expect(adminHtml).toContain("visitor-links-r1.css");
    expect(adminHtml).toContain("admin-visitor-links-manager-r4.js");
    expect(vite).toContain("assets/js/admin-visitor-links-manager-r4.js");
    expect(vite).toContain("assets/css/visitor-links-r1.css");
  });

  it("يوفّر عمليات الإنشاء والتعديل والنسخ والمعاينة والتفعيل والحذف الفعلية", () => {
    const manager = projectFile("client/public/assets/js/admin-visitor-links-manager-r4.js");
    expect(manager).toContain("admin.createVisitorLink");
    expect(manager).toContain("admin.updateVisitorLink");
    expect(manager).toContain("admin.deleteVisitorLink");
    expect(manager).toContain("navigator.clipboard.writeText");
    expect(manager).toContain("site.resolveVisitorLink");
    expect(manager).toContain("هل أنت متأكد من حذف رابط الزوار؟");
    expect(manager).toContain("إنشاء رابط زائر جديد");
  });

  it("يعرض زر نسخ الرابط فور إنشائه ويستخدم مسار النسخ الفعلي نفسه", () => {
    const manager = projectFile("client/public/assets/js/admin-visitor-links-manager-r4.js");
    const adminHtml = projectFile("client/public/admin.html");
    expect(manager).toContain("const createdNotice = () =>");
    expect(manager).toContain('data-vl-action="copy-created"');
    expect(manager).toContain("state.created = old.id ? null");
    expect(manager).toContain('action === "copy-created" && state.created');
    expect(manager).toContain("تم نسخ الرابط بنجاح.");
    expect(adminHtml).toContain("visitor-links-r4-load");
  });

  it("يوفّر مشاركة الرابط عبر واتساب من بطاقة الرابط ومن بطاقة النتيجة", () => {
    const manager = projectFile("client/public/assets/js/admin-visitor-links-manager-r4.js");
    const adminHtml = projectFile("client/public/admin.html");
    expect(manager).toContain("const shareWhatsApp = link =>");
    expect(manager).toContain("https://wa.me/?text=");
    expect(manager).toContain('data-vl-action="whatsapp"');
    expect(manager).toContain('data-vl-action="whatsapp-created"');
    expect(manager).toContain('action === "whatsapp" && link');
    expect(manager).toContain('action === "whatsapp-created" && state.created');
    expect(manager).toContain("مرحباً، هذا رابط الزائر:");
    expect(adminHtml).toContain("visitor-links-whatsapp-r1.css");
  });

  it("يوفّر مشاركة الرابط عبر تيليجرام من بطاقة الرابط ومن بطاقة النتيجة", () => {
    const manager = projectFile("client/public/assets/js/admin-visitor-links-manager-r4.js");
    const adminHtml = projectFile("client/public/admin.html");
    expect(manager).toContain("const shareTelegram = link =>");
    expect(manager).toContain("https://t.me/share/url?url=");
    expect(manager).toContain('data-vl-action="telegram"');
    expect(manager).toContain('data-vl-action="telegram-created"');
    expect(manager).toContain('action === "telegram" && link');
    expect(manager).toContain('action === "telegram-created" && state.created');
    expect(manager).toContain("مرحباً، هذا رابط الزائر:");
    expect(adminHtml).toContain("visitor-links-r4-load");
  });

  it("يثبت رابط الزوار قبل الصفحة الرئيسية في التنقل ويمنحه مسار فتح مباشر", () => {
    const app = projectFile("client/public/assets/js/admin-app-r21.js");
    const manager = projectFile("client/public/assets/js/admin-visitor-links-manager-r4.js");
    expect(app).toContain('visitorLinks: ["🔗", "إنشاء روابط الزوار"');
    expect(app).toContain('items: ["dashboard", "visitorLinks", "homePage", "design"]');
    expect(app).toContain('key === "visitorLinks" ? "data-visitor-links-nav"');
    expect(app).toContain('function openVisitorLinksWorkspace(event) { const button = event.currentTarget ?? event.target.closest?.("[data-visitor-links-nav]")');
    expect(app).toContain('state.selected = "visitorLinks"');
    expect(app).toContain('button.addEventListener("click", openVisitorLinksWorkspace)');
    expect(app).toContain('event.target.closest?.("button,[data-select],[data-visitor-links-nav],[data-downloads-nav],[data-contact-nav]")');
    expect(app).toContain('button.hasAttribute("data-visitor-links-nav")');
    expect(manager).toContain("admin.createVisitorLink");
    expect(manager).toContain("await verifyAvailability(token, input)");
    expect(projectFile("client/public/admin.html")).toContain("admin-app-r21.js?v=contact-r3");
  });

  it("يوفّر بحثاً وتصفية وفرزاً فعليين ولا يحذف الرابط قبل تأكيد المالك", () => {
    const manager = projectFile("client/public/assets/js/admin-visitor-links-manager-r4.js");
    expect(manager).toContain("data-vl-search");
    expect(manager).toContain("data-vl-filter");
    expect(manager).toContain("data-vl-sort");
    expect(manager).toContain("state.search");
    expect(manager).toContain("state.filter");
    expect(manager).toContain("state.sort");
    expect(manager).toContain('value="expired"');
    expect(manager).toContain('value="visits"');
    expect(manager).toContain("const isExpired = link");
    expect(manager).toContain('data-vl-delete-cancel');
    expect(manager).toContain('data-vl-delete-confirm');
    expect(manager).toContain("const confirmDelete = link");
    expect(manager).toContain("هل أنت متأكد من حذف رابط الزوار؟");
    expect(manager).not.toContain("window.confirm(");
  });

  it("يركّب مدير روابط الزوار داخل مساحة عمل القسم عند اختياره", () => {
    const app = projectFile("client/public/assets/js/admin-app-r21.js");
    const manager = projectFile("client/public/assets/js/admin-visitor-links-manager-r4.js");
    expect(app).toContain("function mountCompatibleVisitorLinksManager()");
    expect(app).toContain('key === "visitorLinks"');
    expect(app).toContain('[data-visitor-links-workspace]');
    expect(app).toContain("manager.activate()");
    expect(manager).toContain('shellState.selected = "visitorLinks"');
    expect(manager).toContain("await list()");
  });

  it("يتحقق من وجهة الرابط وحالته بعد الحفظ ويقيدها إلى صفحات الزائر العامة", () => {
    const manager = projectFile("client/public/assets/js/admin-visitor-links-manager-r4.js");
    const routers = projectFile("server/routers.ts");
    expect(manager).toContain("const verifyAvailability = async");
    expect(manager).toContain('recordVisit: false');
    expect(manager).toContain("await verifyAvailability(token, input)");
    expect(routers).toContain('z.enum(["/", "/services", "/assignment", "/downloads", "/blog", "/contact", "/about"])');
    expect(routers).toContain("targetPath: visitorTargetPath");
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
