import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");
const editorSource = fs.readFileSync(
  path.join(projectRoot, "client/public/assets/js/admin-structured-editor-r3.js"),
  "utf8",
);
const seedSource = fs.readFileSync(path.join(projectRoot, "server/siteSeed.ts"), "utf8");

describe("تغطية محررات الوسائط", () => {
  it("يوفر منتقي صورة للشعار والفريق ومنتقي ملف للتحميلات فقط", () => {
    expect(seedSource).toContain('"logoUrl"');
    expect(seedSource).toContain('"photoUrl"');
    expect(seedSource).toContain('"remoteFile"');

    expect(editorSource).toContain('imagePicker(settings.logoUrl, "structured-logo-image")');
    expect(editorSource).toContain('imagePicker(item.photoUrl, `team-photo-${index}`)');
    expect(editorSource).toContain('filePicker(file.remoteFile, `downloadFile${fileIndex}`)');
  });

  it("يوفر نموذج شركاء كامل بالشعار والألوان والرابط", () => {
    expect(editorSource).not.toContain('label>رابط الصورة');
    expect(editorSource).not.toContain('label>رابط الملف');
  });

  it("يوصل نتيجة الرفع إلى الحقل الهدف قبل حفظ كل نموذج", () => {
    expect(editorSource).toContain('select.value = result.url');
    expect(editorSource).toContain('bindMedia("design", "structured-logo-image", next, selectedMediaValue(form, "structured-logo-image"))');
    expect(editorSource).toContain('bindMedia("team", `team-photo-${index}`');
    expect(editorSource).toContain('bindMedia("downloads", `downloadFile${row.dataset.downloadRow}`');
  });
});
