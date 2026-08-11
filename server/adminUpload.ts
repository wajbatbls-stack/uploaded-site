const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);
const maxImageBytes = 3 * 1024 * 1024;

export function decodeAdminImage(dataUrl: string, mimeType: string) {
  if (!allowedMimeTypes.has(mimeType)) throw new Error("صيغة الصورة غير مدعومة");
  const match = /^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match || match[1] !== mimeType) throw new Error("بيانات الصورة غير صالحة");
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > maxImageBytes) throw new Error("يجب ألا يتجاوز حجم الصورة 3 ميغابايت");
  const extension = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg" } as Record<string, string>)[mimeType];
  return { bytes, extension };
}
