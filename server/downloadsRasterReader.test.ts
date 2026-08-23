import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("قارئ صفحات النماذج المصوّرة", () => {
  it("لا يعيد رابط الملف الخام من قائمة الزوار ويعلن دعم القراءة لـPDF فقط", () => {
    const downloads = read("server/downloads.ts");
    expect(downloads).toContain("readerSupported: String(file.mimeType || \"\").toLowerCase().includes(\"pdf\")");
    expect(downloads).not.toContain("directUrl");
  });

  it("يحوّل صفحات PDF إلى PNG على الخادم ولا يمرر المصدر الخام إلى الواجهة", () => {
    const reader = read("server/pdfReader.ts");
    const app = read("client/public/assets/js/site-app-r49.js");
    expect(reader).toContain('app.get("/api/read-only/:fileId/page/:page"');
    expect(reader).toContain('"Content-Type": "image/png"');
    expect(reader).toContain("page.render");
    expect(app).toContain("/api/read-only/");
    expect(app).not.toContain("directUrl");
    expect(app).not.toContain("docs.google.com/gview");
  });
});
