import { test } from "vitest";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve(import.meta.dirname, "..", "client", "public", "assets", "js", "admin-downloads-manager-r19.js");
const DIST = path.resolve(import.meta.dirname, "..", "dist", "public", "assets", "js", "admin-downloads-manager-r19.js");

test("r17: نموذج إضافة النموذج بتصميم فاخر ورفع فعلي بشريط تقدم موجود في المصدر", () => {
  const src = fs.readFileSync(SRC, "utf8");
  // عناصر التصميم الجديد
  const checks = [
    { token: "dfa17-drop", desc: "dropzone الرافع" },
    { token: "dfa17-card-row", desc: "بطاقة المعاينة" },
    { token: "dfa17-track", desc: "شريط التقدم" },
    { token: "dl15-head-badge", desc: "شارة الترويسة المتدرجة" },
    { token: "dl15-primary", desc: "زر الإضافة الفاخر" },
    { token: "uploadFileWithProgress", desc: "دالة الرفع الفعلي مع تقدم XHR" },
    { token: "إضافة النموذج", desc: "نص زر إضافة النموذج" },
    { token: "يظهر الآن للزوار", desc: "رسالة نجاح الظهور للزوار" },
    { token: "بقيت النافذة مفتوحة حتى لا تضيع بياناتك", desc: "منع الإغلاق الصامت عند فشل الحفظ" },
    { token: "const modelName", desc: "استخدام الاسم الذي يكتبه المالك للنموذج الواحد" },
  ];
  for (const { token } of checks) {
    if (!src.includes(token)) throw new Error(`النص المطلوب مفقود في المصدر: ${token}`);
  }
  // الرفع الفعلي يجب أن يتبعه تسجيل الملف في قاعدة البيانات
  if (!src.includes("admin.downloads.createFile")) throw new Error("استدعاء createFile مفقود");
});

test("r18: نسخة الإنتاج dist تطابق المصدر وتحمل حماية فشل الرفع", () => {
  const src = fs.readFileSync(SRC, "utf8");
  const dist = fs.readFileSync(DIST, "utf8");
  if (src !== dist) throw new Error("dist لا يطابق المصدر — تم نسخ نسخة قديمة!");
  if (!dist.includes("dfa17-drop") || !dist.includes("uploadFileWithProgress") || !dist.includes("تعذر حفظ")) {
    throw new Error("dist لا يحمل تصميم r16 أو دالة الرفع الفعلي أو معالجة الفشل");
  }
});
