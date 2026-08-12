import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import vm from "node:vm";

function mediaBinder() {
  const window: { WajbatAdminMediaBinding?: { bindUploadedMedia: (scope: string, target: string, item: Record<string, unknown>, url: string) => Record<string, unknown> } } = {};
  const source = readFileSync(new URL("../client/public/assets/js/admin-media-binding-core.js", import.meta.url), "utf8");
  vm.runInNewContext(source, { window });
  return window.WajbatAdminMediaBinding!.bindUploadedMedia;
}

describe("admin media binding", () => {
  const bind = mediaBinder();
  const uploadedUrl = "https://storage.example.test/media/new-upload.pdf";

  it("يحفظ نتيجة وسيط مرفوع في حقل شعار التصميم فقط", () => {
    expect(bind("design", "structured-logo-image", { tickerText: "القيمة الحالية" }, uploadedUrl)).toEqual({ tickerText: "القيمة الحالية", logoUrl: uploadedUrl });
    expect(bind("design", "team-photo-0", { tickerText: "القيمة الحالية" }, uploadedUrl)).toEqual({ tickerText: "القيمة الحالية" });
  });

  it("يحفظ نتيجة وسيط مرفوع في مسودة عضو الفريق الصحيحة", () => {
    expect(bind("team", "team-photo-0", { name: "عضو قائم", role: "إدارة" }, uploadedUrl)).toEqual({ name: "عضو قائم", role: "إدارة", photoUrl: uploadedUrl });
  });

  it("يحفظ نتيجة ملف مرفوع في عنصر التحميل الصحيح", () => {
    expect(bind("downloads", "downloadFile2", { name: "دليل الطالب", sortOrder: 2, isVisible: true }, uploadedUrl)).toEqual({ name: "دليل الطالب", sortOrder: 2, isVisible: true, remoteFile: uploadedUrl });
  });
});
