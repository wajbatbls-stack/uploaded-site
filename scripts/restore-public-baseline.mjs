import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import mysql from "mysql2/promise";

const projectRoot = resolve(import.meta.dirname, "..");
const source = readFileSync(resolve(projectRoot, "server/siteSeed.ts"), "utf8");
const prefix = "export const SITE_SEED = ";
const start = source.indexOf(prefix);
const end = source.lastIndexOf(" as const;");

if (start === -1 || end === -1 || !process.env.DATABASE_URL) {
  throw new Error("تعذر تجهيز بيانات الاستعادة أو الاتصال بقاعدة البيانات.");
}

const seed = JSON.parse(source.slice(start + prefix.length, end));
const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  for (const collectionKey of ["services", "siteSettings"]) {
    const [result] = await connection.execute(
      "UPDATE content_collections SET content = ?, updatedAt = CURRENT_TIMESTAMP WHERE collectionKey = ?",
      [JSON.stringify(seed[collectionKey]), collectionKey],
    );
    if (result.affectedRows !== 1) throw new Error(`تعذر استعادة مجموعة ${collectionKey}.`);
  }
  console.log("تمت استعادة الخدمات وإعدادات الموقع إلى المرجع الأصلي.");
} finally {
  await connection.end();
}
