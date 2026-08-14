import "dotenv/config";
import mysql from "mysql2/promise";
const u = new URL(process.env.DATABASE_URL);
const conn = await mysql.createConnection({ host: u.hostname, port: Number(u.port) || 4000, user: u.username, password: u.password, database: u.pathname.slice(1), ssl: { rejectUnauthorized: false } });
const [rows] = await conn.query("SELECT id, slug, isVisible FROM blog_articles ORDER BY id");
for (const r of rows) console.log(r.id, r.slug, r.isVisible ? "visible" : "hidden");
await conn.end();
process.exit(0);
