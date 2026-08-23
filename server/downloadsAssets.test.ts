import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const projectFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("أصول قسم إدارة التحميلات الحديث (r20 — كسر كاش CDN)", () => {
  it("يحمّل مدير التحميلات r10 ومدير التطبيق المبصّم من صفحة الإدارة", () => {
    const adminHtml = projectFile("client/public/admin.html");
    expect(adminHtml).toContain("admin-downloads-manager-r20.js");
    expect(adminHtml).toContain("admin-app-r32.js");
    expect(adminHtml).toContain("downloads-r20");
    expect(adminHtml).toContain("admin-structured-editor-r6.js");
    expect(adminHtml).toContain("structured-r6");
    expect(projectFile("client/public/assets/js/admin-downloads-manager-r20.js")).toContain("WajbatDownloadsManager");
    expect(projectFile("client/public/assets/js/admin-app-r21.js")).toContain("mountCompatibleDownloadsManager");
  });

  it("يحمّل حزمة التحميلات الأساسية r42 وطبقتي sv33 وsv38 مع بقاء كل قسم منفصلًا", () => {
    const indexHtml = projectFile("client/public/index.html");
    expect(indexHtml).toContain("site-app-r43.js");
    const app = projectFile("client/public/assets/js/site-app-r42.js");
    const homeEnhancement = projectFile("client/public/assets/js/site-app-r43.js");
    const downloadsStyle = projectFile("client/public/assets/css/site-downloads-assignment-r1.css");
    const downloadsStyleSv38 = projectFile("client/public/assets/css/site-downloads-r2.css");
    expect(app).toContain("loadSiteDownloads()");
    expect(app).toContain("dl10FileCard");
    expect(app).toContain("dl10Tabs");
    expect(homeEnhancement).toContain("chooseDownloadCategory");
    expect(homeEnhancement).toContain("section.hidden = !isSelected");
    expect(homeEnhancement).toContain("tabs.querySelector(\"[data-dl10-filter='all']\")?.remove()");
    expect(homeEnhancement).toContain("focusHomeWelcome");
    expect(downloadsStyle).toContain(".dl11-library");
    expect(downloadsStyle).toContain(".dl11-library .dl10-section");
    expect(indexHtml).toContain("site-downloads-r2.css?v=sv38-downloads-library");
    expect(downloadsStyleSv38).toContain(".dl11-library .dl10-tabs");
    expect(downloadsStyleSv38).toContain(".dl11-library .dl10-file");
    expect(downloadsStyleSv38).toContain("body.dark .dl11-library");
    expect(app).not.toContain("site-app-r11.js");
  });

  it("يركّب مدير التحميلات r10 داخل مساحة عمل قسم التحميلات بعد إعفائه من structured editor", () => {
    const app = projectFile("client/public/assets/js/admin-app-r32.js");
    expect(app).toContain('downloads: ["📥", "إدارة التحميلات"');
    expect(app).toContain("mountCompatibleDownloadsManager();");
    expect(app).toContain("manager.activate()");
    const manager = projectFile("client/public/assets/js/admin-downloads-manager-r20.js");
    expect(manager).toContain("admin.downloads.list");
    expect(manager).toContain("admin.downloads.createCategory");
    const editor = projectFile("client/public/assets/js/admin-structured-editor-r6.js");
    expect(editor).not.toContain('"downloads"');
    expect(editor).toContain("إخراج «downloads» من القائمة");
  });

  it("يحفظ روابط المرفوعات للإدارة ولا يمرر الرابط الخام إلى واجهة الزوار", () => {
    const routers = projectFile("server/downloads.ts");
    expect(projectFile("server/storage.ts")).toContain("storagePut(relKey");
    expect(routers).toContain("trackDownload");
    expect(routers).toContain("incrementDownloadCount");
    expect(routers).toContain("readerSupported");
    expect(routers).toContain("return { success: true } as const");
    expect(routers).not.toContain("directUrl");
  });

  it("يقيّد الرفع على 50 ميجابايت ويتوافق بين الخادم ومدير الإدارة", () => {
    const index = projectFile("server/_core/index.ts");
    const manager = projectFile("client/public/assets/js/admin-downloads-manager-r20.js");
    expect(index).toContain("50 * 1024 * 1024");
    expect(manager).toContain("50");
  });

  it("لا يحذف الملف قبل تأكيد المالك وينتج نافذة تأكيد داخلية", () => {
    const manager = projectFile("client/public/assets/js/admin-downloads-manager-r20.js");
    expect(manager).not.toContain("window.confirm(");
    expect(manager).toContain("data-dl10-delete-file");
    expect(manager).toContain("data-dl10-delete-category");
    expect(manager).toContain("تأكيد الحذف");
    expect(manager).toContain("لا يمكن التراجع عن هذا الإجراء");
  });

  it("يثبّت حدود الرفع الفعلية ويعرض عداد التحميلات وسجل النشاط بعد كل عملية", () => {
    const manager = projectFile("client/public/assets/js/admin-downloads-manager-r20.js");
    expect(manager).toContain("downloadCount");
    expect(manager).toContain("s + Number(f.downloadCount || 0), 0");
    expect(manager).toContain("تحميل ·");
    expect(manager).toContain("data-dl10-upload-many");
    expect(manager).toContain("admin.downloads.trackDownload");
    expect(manager).toContain("admin.downloads.createCategory");
    expect(manager).toContain("admin.downloads.createFile");
    expect(manager).toContain("admin.downloads.deleteFile");
    expect(manager).toContain("admin.downloads.setFileVisibility");
    expect(manager).toContain("admin.downloads.moveFile");
  });

  it("النسخ القديمة من مدير التحميلات محذوفة نهائيًا والإصدار r20 هو المنشور (إصلاح طبقات sv24)" , () => {
    const vite = projectFile("vite.config.ts");
    // لا توجد أي إحالات للنسخ القديمة r1-r13 (حُذفت الملفات نهائيًا)
    for (let i = 1; i <= 13; i++) {
      expect(vite).not.toContain(`admin-downloads-manager-r${i}.js`, `يجب ألا توجد إحالة للنسخة القديمة r${i}`);
    }
    // لا يوجد سطر copyAdminAssets يرسل المحتوى إلى r14 — الوجهة المنشورة هي r20 فقط
    const r14DestCount = (vite.match(/destination: ["']assets\/js\/admin-downloads-manager-r14\.js["']/g) || []).length;
    expect(r14DestCount).toBe(0, "يجب ألا توجد وجهة منشورة باسم r14 (كسر كاش CDN)");
    // r20 هو الوجهة المنشورة
    const r20Count = (vite.match(/admin-downloads-manager-r20\.js/g) || []).length;
    expect(r20Count).toBeGreaterThanOrEqual(2);
    // صفحات الإدارة تشير إلى r20 حصريًا (HTML نفسه no-cache)
    for (const page of ["client/public/admin.html", "client/public/admin-dashboard.html"]) {
      const html = projectFile(page);
      expect(html).toContain("admin-downloads-manager-r20.js");
      expect(html).not.toContain("admin-downloads-manager-r14.js", `${page} يجب أن يشير إلى r20`);
      for (let i = 1; i <= 13; i++) {
        expect(html).not.toContain(`admin-downloads-manager-r${i}.js`);
      }
    }
    // نقطة دخول جديدة لا يملك أي جهاز نسخة مخزنة منها، وتستخدم الحزمة المصححة ذاتها.
    const freshAdminEntry = projectFile("client/public/admin-sv24.html");
    expect(freshAdminEntry).toContain("admin-downloads-manager-r20.js");
    expect(freshAdminEntry).toContain('content="no-store, no-cache, must-revalidate"');
    expect(vite).toContain('{ source: "admin-sv24.html", destination: "admin-sv24.html" }');
    // ملف المصدر r20 موجود فعليًا في المشروع ويحمله بمحتوى WajbatDownloadsManager
    const manager = projectFile("client/public/assets/js/admin-downloads-manager-r20.js");
    expect(manager).toContain("WajbatDownloadsManager");
    expect(manager).toContain(".dfa17-backdrop{position:fixed;inset:0;background:rgba(11,18,38,.18);backdrop-filter:none;-webkit-backdrop-filter:none;z-index:0");
    expect(manager).toContain(".dfa17-card{position:relative;z-index:1");
    expect(manager).toContain("dfa17-card-row ${e.status}");
    // كل نسخ المحرر العام القديمة تُوجَّه إلى r6 الذي أعفي قسم التحميلات
    expect(vite).toContain('"assets/js/admin-structured-editor-r6.js"');
    expect(vite).toContain('"assets/js/admin-structured-editor-r5.js"');
  });
});
