import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("مداخل الرابط بلا أيقونة مرئية", () => {
  it("تعطّل الأيقونة في جميع مداخل لوحة الإدارة", () => {
    const adminEntries = [
      "client/public/admin.html",
      "client/public/admin-sv24.html",
      "client/public/admin-sv25.html",
      "client/public/admin-dashboard.html",
    ];

    for (const path of adminEntries) {
      const entry = projectFile(path);
      expect(entry).toContain('<link rel="icon" href="data:," />');
      expect(entry).not.toContain("favicon.svg");
      expect(entry).not.toContain('href="/favicon.ico"');
    }
  });

  it("يبقي ملف الأيقونة المحلي شفافًا كاحتياط", () => {
    const localIcon = projectFile("client/public/assets/images/favicon.svg");
    expect(localIcon).toContain("<svg");
    expect(localIcon).not.toContain("<image");
    expect(localIcon).not.toContain("<rect");
  });
});
