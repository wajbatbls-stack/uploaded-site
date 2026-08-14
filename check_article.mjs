import "dotenv/config";
import mysql2 from "mysql2/promise";

const c = await mysql2.createConnection(process.env.DATABASE_URL);
const [rows] = await c.execute("SELECT id, title, slug, categoryId, isVisible, sortOrder FROM blog_articles WHERE slug = ?", ["migrate-check-1"]);
console.log(JSON.stringify(rows, null, 2));
await c.end();
