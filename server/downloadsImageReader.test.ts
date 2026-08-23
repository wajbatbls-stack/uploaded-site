import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("قارئ الصور للتحميلات", () => {
  it("يعلن دعم JPEG وPNG وWebP من دون اعتبار الأرشيفات قابلة للقراءة", () => {
    const reader = read("server/pdfReader.ts");
    expect(reader).toContain('RASTER_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"])');
    expect(reader).toContain('RASTER_IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"])');
    expect(reader).toContain("RASTER_IMAGE_EXTENSIONS.has(extension)");
    expect(reader).not.toContain('"image/svg+xml"');
  });

  it("يحوّل الصورة داخل الخادم إلى PNG للقارئ بدلاً من تمرير رابط الصورة الأصلية للزائر", () => {
    const reader = read("server/pdfReader.ts");
    const visitorBridge = read("client/public/assets/js/site-app-r51.js");
    expect(reader).toContain("loadImage(Buffer.from(pdf.bytes))");
    expect(reader).toContain('canvas.encode("png")');
    expect(reader).toContain('"Content-Disposition": `inline; filename="read-page-${pageNumber}.png"`');
    expect(visitorBridge).toContain('import "./site-app-r50.js"');
    expect(visitorBridge).not.toContain("directUrl");
  });
});
