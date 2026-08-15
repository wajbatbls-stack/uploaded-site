// إزالة شعار الاختبار (ط) المرفوع لغرض التحقق من مسار الرفع
// يُشغَّل مرة واحدة: يحذف الملف من S3 ويصفّر logoUrl في قاعدة البيانات
import "dotenv/config";
import mysql from "mysql2/promise";

const relKey = "wajbat-plus/partners/1_eef5288b.png";

const forgeBaseUrl = (process.env.BUILT_IN_FORGE_API_URL || "").replace(/\/+$/, "");
const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;

if (!forgeBaseUrl || !forgeKey) {
  console.error("Forge env missing");
  process.exit(1);
}

// 1) محاولة حذف الملف من S3 عبر presign delete إن وُجد، وإلا نكتفي بمسح الإحالة من DB
let deleted = false;
try {
  const delUrl = new URL("v1/storage/presign/delete", forgeBaseUrl + "/");
  delUrl.searchParams.set("path", relKey);
  const resp = await fetch(delUrl, { headers: { Authorization: `Bearer ${forgeKey}` } });
  if (resp.ok) {
    const body = await resp.text();
    console.log("presign/delete response:", body.slice(0, 200));
    // إذا أعاد presigned URL ننفذ الحذف الفعلي
    try {
      const { url: signed } = JSON.parse(body);
      if (signed) {
        const r = await fetch(signed, { method: "DELETE" });
        deleted = r.ok || r.status === 204;
        console.log("actual delete:", r.status);
      }
    } catch {}
  } else {
    console.log("presign/delete not supported:", resp.status);
  }
} catch (e) {
  console.log("presign/delete error:", e.message);
}

// 2) تصفير logoUrl في DB (الشعار الاختباري لن يظهر للزائر)
const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [res] = await conn.execute("UPDATE partners SET logoUrl = NULL WHERE id = 1");
console.log("db update:", JSON.stringify(res));
await conn.end();
console.log("done, deleted:", deleted);
