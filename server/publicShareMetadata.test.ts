import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("ميتا مشاركة رابط الزوار", () => {
  it("لا يستخدم صورة المعاينة الشخصية القديمة في مدخلي الزوار", () => {
    const sourceEntry = projectFile("client/index.html");
    const publicEntry = projectFile("client/public/index.html");

    for (const entry of [sourceEntry, publicEntry]) {
      expect(entry).not.toContain("opengraph.jpg");
      expect(entry).not.toContain("favicon.svg");
      expect(entry).not.toContain("user_upload_by_module/web_dev_logo");
      expect(entry).toContain('href="/manus-storage/wajibat-plus-site-logo_7728b19c.jpg?v=sv45"');
      expect(entry).toContain('property="og:title"');
      expect(entry).toContain('property="og:description"');
      expect(entry).toContain('property="og:type" content="website"');
      expect(entry).toContain('property="og:locale" content="ar_SA"');
    }
  });
});
