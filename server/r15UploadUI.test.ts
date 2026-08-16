import { test } from "vitest";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve(import.meta.dirname, "..", "client", "public", "assets", "js", "admin-downloads-manager-r14.js");
const DIST = path.resolve(import.meta.dirname, "..", "dist", "public", "assets", "js", "admin-downloads-manager-r14.js");

test("r15: نموذج إضافة النموذج بتصميم فاخر ورفع فعلي بشريط تقدم موجود في المصدر", () => {
  const src = fs.readFileSync(SRC, "utf8");
  // عناصر التصميم الجديد
  const checks = [
    { token: "dl15-drop", desc: "dropzone الرافع" },
    { token: "dl15-card", desc: "بطاقة المعاينة" },
    { token: "dl15-track", desc: "شريط التقدم" },
    { token: "dl15-head-badge", desc: "شارة الترويسة المتدرجة" },
    { token: "dl15-primary", desc: "زر الإضافة الفاخر" },
    { token: "uploadFileWithProgress", desc: "دالة الرفع الفعلي مع تقدم XHR" },
    { token: "إضافة النموذج", desc: "نص زر إضافة النموذج" },
    { token: "يظهر الآن للزوار", desc: "رسالة نجاح الظهور للزوار" },
  ];
  for (const { token } of checks) {
    if (!src.includes(token)) throw new Error(`النص المطلوب مفقود في المصدر: ${token}`);
  }
  // الرفع الفعلي يجب أن يتبعه تسجيل الملف في قاعدة البيانات
  if (!src.includes("admin.downloads.createFile")) throw new Error("استدعاء createFile مفقود");
});

test("r15: نسخة الإنتاج dist تطابق المصدر (md5) وتحمل عناصر r15", () => {
  const src = fs.readFileSync(SRC, "utf8");
  const dist = fs.readFileSync(DIST, "utf8");
  if (src !== dist) throw new Error("dist لا يطابق المصدر — تم نسخ نسخة قديمة!");
  if (!dist.includes("dl15-drop") || !dist.includes("uploadFileWithProgress")) {
    throw new Error("dist لا يحمل تصميم r15 أو دالة الرفع الفعلي");
  }
});
