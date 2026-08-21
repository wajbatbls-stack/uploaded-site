import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const platformLogoHref = 'href="/manus-storage/wajibat-plus-site-logo_7728b19c.jpg?v=sv45"';

describe("مداخل الرابط تستخدم شعار المنصة فقط", () => {
  it("تربط جميع مداخل لوحة الإدارة بشعار واجبات بلس", () => {
    const adminEntries = [
      "client/public/admin.html",
      "client/public/admin-sv24.html",
      "client/public/admin-sv25.html",
      "client/public/admin-dashboard.html",
    ];

    for (const path of adminEntries) {
      const entry = projectFile(path);
      expect(entry).toContain(platformLogoHref);
      expect(entry).not.toContain("favicon.svg");
      expect(entry).not.toContain('href="/favicon.ico"');
      expect(entry).not.toContain("user_upload_by_module/web_dev_logo");
    }
  });

  it("يبقي ملف الأيقونة المحلي خاليًا من أي صورة شخصية كاحتياط", () => {
    const localIcon = projectFile("client/public/assets/images/favicon.svg");
    expect(localIcon).toContain("<svg");
    expect(localIcon).not.toContain("<image");
    expect(localIcon).not.toContain("<rect");
  });
});
