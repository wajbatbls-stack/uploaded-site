import mysql from 'mysql2/promise';
const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.query("SELECT content FROM content_collections WHERE collectionKey='siteSettings'");
const c = JSON.parse(rows[0]?.content || '{}');
const keys = Object.keys(c);
for (const k of keys) if (/wa|phone|contact|tick/i.test(k)) console.log(k, '=', JSON.stringify(c[k]));
await conn.end();
process.exit(0);
