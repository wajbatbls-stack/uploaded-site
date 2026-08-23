import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const app = readFileSync(resolve(process.cwd(), "client/public/assets/js/site-app-r49.js"), "utf8");

describe("قارئ PDF داخل الموقع", () => {
  it("يوجه ملفات PDF إلى قارئ الويب بدلاً من فتح ملف PDF الأصلي داخل الهاتف", () => {
    expect(app).toContain("async function openReadOnlyModel(fileId, name)");
    expect(app).toContain("/api/read-only/${encodeURIComponent(String(fileId))}");
    expect(app).toContain("/api/read-only/${encodeURIComponent(String(downloadReader.id))}/page/${page}");
    expect(app).not.toContain("docs.google.com/gview");
  });
});
