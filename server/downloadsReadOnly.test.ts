import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const app = readFileSync(resolve(process.cwd(), "client/public/assets/js/site-app-r47.js"), "utf8");

describe("مكتبة النماذج للقراءة فقط", () => {
  it("تستبدل التنزيل بزر قراءة وتبقي الملف داخل قارئ الموقع", () => {
    expect(app).toContain('class="dl10-read-btn"');
    expect(app).toContain('data-action="open-read-only"');
    expect(app).toContain('class="dl10-reader-overlay"');
    expect(app).toContain("function dl10Reader()");
    expect(app).toContain("#toolbar=0&navpanes=0&scrollbar=1");
  });

  it("لا يعرض زر أو إجراء تنزيل في بطاقات الزوار", () => {
    expect(app).not.toContain("dl10-dl-btn");
    expect(app).not.toContain('data-action="track-download"');
    expect(app).not.toContain("تحميل الملف");
    expect(app).not.toContain("trackPublicDownload");
  });
});
