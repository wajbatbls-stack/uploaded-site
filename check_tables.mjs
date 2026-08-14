import "dotenv/config";
import mysql2 from "mysql2/promise";
const c = await mysql2.createConnection(process.env.DATABASE_URL);
const [tables] = await c.execute("SHOW TABLES LIKE 'blog%'");
console.log("tables:", tables.map(r => Object.values(r)[0]));
for (const t of tables) {
  const name = Object.values(t)[0];
  const [rows] = await c.execute(`SELECT * FROM \`${name}\` ORDER BY id LIMIT 3`);
  console.log(name, "rows:", JSON.stringify(rows));
}
await c.end();
