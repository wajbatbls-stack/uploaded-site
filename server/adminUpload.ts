const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);
const maxImageBytes = 3 * 1024 * 1024;
const allowedDocumentMimeTypes = new Set(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"]);
const maxDocumentBytes = 8 * 1024 * 1024;

export function decodeAdminImage(dataUrl: string, mimeType: string) {
  if (!allowedMimeTypes.has(mimeType)) throw new Error("صيغة الصورة غير مدعومة");
  const match = /^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match || match[1] !== mimeType) throw new Error("بيانات الصورة غير صالحة");
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > maxImageBytes) throw new Error("يجب ألا يتجاوز حجم الصورة 3 ميغابايت");
  const extension = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg" } as Record<string, string>)[mimeType];
  return { bytes, extension };
}

export function decodeUpload(dataUrl: string, mimeType: string) {
  const isImage = allowedMimeTypes.has(mimeType);
  if (!isImage && !allowedDocumentMimeTypes.has(mimeType)) throw new Error("نوع الملف غير مسموح");
  const match = /^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match || match[1] !== mimeType) throw new Error("بيانات الملف غير صالحة");
  const bytes = Buffer.from(match[2], "base64");
  const maxBytes = isImage ? maxImageBytes : maxDocumentBytes;
  if (!bytes.length || bytes.length > maxBytes) throw new Error(`يجب ألا يتجاوز حجم الملف ${isImage ? "3" : "8"} ميغابايت`);
  const extension = ({
    "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg",
    "application/pdf": "pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx", "application/msword": "doc",
  } as Record<string, string>)[mimeType];
  return { bytes, extension, category: isImage ? "image" as const : "document" as const };
}
