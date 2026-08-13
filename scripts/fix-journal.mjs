import fs from "fs";
const path = "drizzle/meta/_journal.json";
const j = JSON.parse(fs.readFileSync(path, "utf8"));
const before = j.entries.length;
j.entries = j.entries.filter(e => !e.tag.startsWith("0004_black_nova"));
console.log("removed", before - j.entries.length, "entries");
j.entries.forEach((e, i) => (e.idx = i));
fs.writeFileSync(path, JSON.stringify(j, null, 2) + "\n");
console.log(JSON.stringify(j.entries.map(e => `${e.idx}:${e.tag}`)));
