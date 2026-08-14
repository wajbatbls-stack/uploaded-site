import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const projectFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("أصول قسم إدارة التحميلات الحديث", () => {
  it("يحمّل مدير التحميلات الحديث ومدير التطبيق المبصّم من صفحة الإدارة", () => {
    const adminHtml = projectFile("client/public/admin.html");
    expect(adminHtml).toContain("admin-downloads-manager-r2.js");
    expect(adminHtml).toContain("admin-app-r20.js");
    expect(adminHtml).toContain("downloads-r2");
    expect(adminHtml).toContain("downloads-r11");
    expect(projectFile("client/public/assets/js/admin-downloads-manager-r2.js")).toContain("WajbatDownloadsManager");
    expect(projectFile("client/public/assets/js/admin-app-r20.js")).toContain("mountCompatibleDownloadsManager");
  });

  it("يحمل تطبيق الزائر المبصّم site-app-r11 ويعيد رسم صفحة التحميلات بعد التحميل الديناميكي", () => {
    const indexHtml = projectFile("client/public/index.html");
    expect(indexHtml).toContain("site-app-r11.js");
    expect(projectFile("client/public/assets/js/site-app-r11.js")).toContain("loadSiteDownloads().then(() => { if (location.hash.startsWith(\"#/downloads\")) render(); })");
    expect(projectFile("client/public/assets/js/site-app-r11.js")).not.toContain("site-app-r10.js");
  });

  it("يركّب مدير التحميلات الحديث داخل مساحة عمل قسم التحميلات بعد اعتراض structured editor", () => {
    const app = projectFile("client/public/assets/js/admin-app-r20.js");
    expect(app).toContain('downloads: ["📥", "إدارة التحميلات"');
    expect(app).toContain('openDownloadsWorkspace');
    expect(app).toContain('state.selected = "downloads"');
    expect(app).toContain("mountCompatibleDownloadsManager();");
    expect(app).toContain("manager.activate()");
    const manager = projectFile("client/public/assets/js/admin-downloads-manager-r2.js");
    expect(manager).toContain("admin.downloads.list");
    expect(manager).toContain("admin.downloads.createCategory");
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
    const manager = projectFile("client/public/assets/js/admin-downloads-manager-r2.js");
    expect(index).toContain("50 * 1024 * 1024");
    expect(manager).toContain("50");
  });

  it("لا يحذف الملف قبل تأكيد المالك وينتج نافذة تأكيد داخلية", () => {
    const manager = projectFile("client/public/assets/js/admin-downloads-manager-r2.js");
    expect(manager).not.toContain("window.confirm(");
    expect(manager).toContain("data-dl-delete-file");
    expect(manager).toContain("data-dl-delete-category");
    expect(manager).toContain("تأكيد الحذف");
    expect(manager).toContain("لا يمكن التراجع عن هذا الإجراء");
  });

  it("يثبّت حدود الرفع الفعلية ويعرض عداد التحميلات وسجل النشاط بعد كل عملية", () => {
    const manager = projectFile("client/public/assets/js/admin-downloads-manager-r2.js");
    expect(manager).toContain("downloadCount");
    expect(manager).toContain("totalDownloads");
    expect(manager).toContain("تحميل •");
    expect(manager).toContain("data-dl-upload-many");
    expect(manager).toContain("admin.downloads.trackDownload");
    expect(manager).toContain("admin.downloads.createCategory");
    expect(manager).toContain("admin.downloads.createFile");
    expect(manager).toContain("admin.downloads.deleteFile");
    expect(manager).toContain("admin.downloads.setFileVisibility");
    expect(manager).toContain("admin.downloads.moveFile");
  });
});
