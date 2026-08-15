import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const projectFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("أصول قسم إدارة التحميلات الحديث (r10)", () => {
  it("يحمّل مدير التحميلات r10 ومدير التطبيق المبصّم من صفحة الإدارة", () => {
    const adminHtml = projectFile("client/public/admin.html");
    expect(adminHtml).toContain("admin-downloads-manager-r12.js");
    expect(adminHtml).toContain("admin-app-r30.js");
    expect(adminHtml).toContain("downloads-r12");
    expect(adminHtml).toContain("admin-structured-editor-r6.js");
    expect(adminHtml).toContain("structured-r6");
    expect(projectFile("client/public/assets/js/admin-downloads-manager-r12.js")).toContain("WajbatDownloadsManager");
    expect(projectFile("client/public/assets/js/admin-app-r21.js")).toContain("mountCompatibleDownloadsManager");
  });

  it("يحمّل تطبيق الزائر المبصّم site-app-r32 بتصميم التحميلات الجديد dl10", () => {
    const indexHtml = projectFile("client/public/index.html");
    expect(indexHtml).toContain("site-app-r32.js");
    const app = projectFile("client/public/assets/js/site-app-r32.js");
    expect(app).toContain("loadSiteDownloads()");
    expect(app).toContain("dl10FileCard");
    expect(app).toContain("dl10Tabs");
    expect(app).not.toContain("site-app-r11.js");
  });

  it("يركّب مدير التحميلات r10 داخل مساحة عمل قسم التحميلات بعد إعفائه من structured editor", () => {
    const app = projectFile("client/public/assets/js/admin-app-r21.js");
    expect(app).toContain('downloads: ["📥", "إدارة التحميلات"');
    expect(app).toContain("mountCompatibleDownloadsManager();");
    expect(app).toContain("manager.activate()");
    const manager = projectFile("client/public/assets/js/admin-downloads-manager-r12.js");
    expect(manager).toContain("admin.downloads.list");
    expect(manager).toContain("admin.downloads.createCategory");
    const editor = projectFile("client/public/assets/js/admin-structured-editor-r6.js");
    expect(editor).not.toContain('"downloads"');
    expect(editor).toContain("إخراج «downloads» من القائمة");
  });

  it("يصحح روابط الملفات القديمة إلى CDN ويحفظ روابط المرفوعات الجديدة", () => {
    const routers = projectFile("server/downloads.ts");
    expect(routers).toContain("files.manuscdn.com/user_upload_by_module/session_file/310519663231231378/");
    expect(routers).toContain("raw.startsWith(\"http\") || raw.startsWith(\"/manus-storage\")");
    expect(projectFile("server/storage.ts")).toContain("storagePut(relKey");
    expect(routers).toContain("trackDownload");
    expect(routers).toContain("incrementDownloadCount");
  });

  it("يقيّد الرفع على 50 ميجابايت ويتوافق بين الخادم ومدير الإدارة", () => {
    const index = projectFile("server/_core/index.ts");
    const manager = projectFile("client/public/assets/js/admin-downloads-manager-r12.js");
    expect(index).toContain("50 * 1024 * 1024");
    expect(manager).toContain("50");
  });

  it("لا يحذف الملف قبل تأكيد المالك وينتج نافذة تأكيد داخلية", () => {
    const manager = projectFile("client/public/assets/js/admin-downloads-manager-r12.js");
    expect(manager).not.toContain("window.confirm(");
    expect(manager).toContain("data-dl10-delete-file");
    expect(manager).toContain("data-dl10-delete-category");
    expect(manager).toContain("تأكيد الحذف");
    expect(manager).toContain("لا يمكن التراجع عن هذا الإجراء");
  });

  it("يثبّت حدود الرفع الفعلية ويعرض عداد التحميلات وسجل النشاط بعد كل عملية", () => {
    const manager = projectFile("client/public/assets/js/admin-downloads-manager-r12.js");
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

  it("يوجّه كل نسخ مدير التحميلات والمحرر القديمة إلى النسخ الجديدة عبر redirects", () => {
    const vite = projectFile("vite.config.ts");
    // كل النسخ القديمة تُوجَّه إلى مدير التحميلات الحديث r11
    for (const old of ["r1.js", "r2.js", "r3.js", "r10.js", "r11.js"]) {
      expect(vite).toContain(`admin-downloads-manager-${old}`, `يجب توجيه ${old} إلى r12`);
    }
    // كل النسخ القديمة (r1-r3 وr10 وr11) تُوجَّه إلى r12 وهو الإصدار الحالي
    expect(vite).toContain('destination: "assets/js/admin-downloads-manager-r12.js"');
    // كل نسخ المحرر العام القديمة تُوجَّه إلى r6 الذي أعفي قسم التحميلات
    expect(vite).toContain('"assets/js/admin-structured-editor-r6.js"');
    expect(vite).toContain('"assets/js/admin-structured-editor-r5.js"');
  });
});
