import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const app = readFileSync(resolve(process.cwd(), "client/public/assets/js/site-app-r48.js"), "utf8");

describe("قارئ PDF داخل الموقع", () => {
  it("يوجه ملفات PDF إلى قارئ الويب بدلاً من فتح ملف PDF الأصلي داخل الهاتف", () => {
    expect(app).toContain("function dl10PdfViewerUrl(url)");
    expect(app).toContain("new URL(String(url || \"\"), window.location.origin)");
    expect(app).toContain("https://docs.google.com/gview?embedded=1&url=");
    expect(app).toContain('kind === "pdf" && pdfViewerUrl');
    expect(app).not.toContain('src="${url}#toolbar=0&navpanes=0&scrollbar=1"');
  });
});
