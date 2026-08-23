import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isReadOnlySupported } from "./pdfReader";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("قارئ Word وPowerPoint للزوار", () => {
  it("يقبل PDF وWord وPowerPoint بالامتداد دون كشف مصدر الملف", () => {
    expect(isReadOnlySupported({ originalName: "نموذج.pdf", mimeType: "application/pdf" })).toBe(true);
    expect(isReadOnlySupported({ originalName: "نموذج.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })).toBe(true);
    expect(isReadOnlySupported({ originalName: "عرض.pptx", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation" })).toBe(true);
    expect(isReadOnlySupported({ originalName: "ملف.zip", mimeType: "application/zip" })).toBe(false);
  });

  it("يقبل صيغ Word وPowerPoint ويحوّلها داخل الخادم دون إرسال المصدر الخام", () => {
    const reader = read("server/pdfReader.ts");
    expect(reader).toContain('const OFFICE_EXTENSIONS = new Set([".doc", ".docx", ".ppt", ".pptx"])');
    expect(reader).toContain("async function officeToPdf");
    expect(reader).toContain('"--convert-to", "pdf"');
    expect(reader).toContain("return new Uint8Array(pdf)");
    expect(reader).toContain('"Content-Type": "image/png"');
  });

  it("يبني الإنتاج مع LibreOffice لدعم القراءة متعددة الصيغ", () => {
    const docker = read("Dockerfile");
    const downloads = read("server/downloads.ts");
    expect(docker).toContain("libreoffice-writer libreoffice-impress libreoffice-common");
    expect(docker).toContain('CMD ["node", "dist/index.js"]');
    expect(downloads).toContain("readerSupported: isReadOnlySupported(file)");
  });
});
