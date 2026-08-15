// حذف شعار الاختبار من S3 مباشرة عبر DeleteObject (presign/delete غير مدعوم)
import "dotenv/config";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { storagePut } from "../server/storage.ts";

// استخراج bucket من storagePut: نحصل على endpoint من forge — الأبسط: استخدام envs مباشرة
const forgeBaseUrl = (process.env.BUILT_IN_FORGE_API_URL || "").replace(/\/+$/, "");
const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;

// جلب إعدادات الاتصال: presign put يعيد endpoint — نستخرج bucket من response put جديد؟ لا، نستخدم head
const getEndpoint = new URL("v1/storage/presign/head", forgeBaseUrl + "/");
getEndpoint.searchParams.set("path", "wajbat-plus/partners/1_eef5288b.png");
const resp = await fetch(getEndpoint, { headers: { Authorization: `Bearer ${forgeKey}` } });
const body = await resp.text();
console.log("head response:", resp.status, body.slice(0, 300));
