import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const source = readFileSync(resolve(projectRoot, "server/siteSeed.ts"), "utf8");
const prefix = "export const SITE_SEED = ";
const start = source.indexOf(prefix);
const end = source.lastIndexOf(" as const;");

if (start === -1 || end === -1) {
  throw new Error("تعذر قراءة المرجع الافتراضي لمحتوى واجهة الزائر.");
}

const seed = JSON.parse(source.slice(start + prefix.length, end));
const statements = ["services", "siteSettings"].map((collectionKey) => {
  const encoded = Buffer.from(JSON.stringify(seed[collectionKey]), "utf8").toString("base64");
  return `UPDATE content_collections SET content = CONVERT(FROM_BASE64('${encoded}') USING utf8mb4), updatedAt = CURRENT_TIMESTAMP WHERE collectionKey = '${collectionKey}';`;
});

const outputPath = resolve(projectRoot, "scripts", "public-baseline-restore.sql");
writeFileSync(outputPath, `${statements.join("\n")}\n`, "utf8");
console.log(outputPath);
