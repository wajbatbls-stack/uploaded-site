import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(conn);

const [rows] = await conn.execute(
  "SELECT id, content FROM content_collections WHERE collectionKey = 'partners'"
);
if (rows.length === 0) {
  console.log("no partners collection");
  process.exit(0);
}
const row = rows[0];
let value = row.content;
let before = JSON.stringify(value);
try {
  const data = typeof value === "string" ? JSON.parse(value) : value;
  let changed = 0;
  if (Array.isArray(data)) {
    for (const item of data) {
      if (item && typeof item === "object") {
        for (const k of ["link", "logoUrl", "logo_url", "description", "desc"]) {
          if (item[k] === "NULL") {
            item[k] = "";
            changed++;
          }
        }
      }
    }
  }
  value = JSON.stringify(data);
  if (changed > 0) {
    await conn.execute("UPDATE content_collections SET content = ? WHERE id = ?", [
      value,
      row.id,
    ]);
    console.log(`cleaned ${changed} NULL values in partners (id=${row.id})`);
  } else {
    console.log("no NULL string placeholders found");
  }
} catch (e) {
  console.error("parse error:", e.message);
  console.log("raw head:", String(value).slice(0, 300));
}
process.exit(0);
