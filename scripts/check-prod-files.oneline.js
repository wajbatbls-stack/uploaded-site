(async()=>{
// فحص ترحيل قائمة ملفات التحميل عبر tRPC على الإنتاج
const input = { 0: { json: {}, meta: { values: ["undefined"] } } };
const url = "/api/trpc/downloads.listFiles?batch=1&input=" + encodeURIComponent(JSON.stringify(input));
const res = await fetch(url, { credentials: "include" });
const j = await res.json();
const root = j[0] && j[0].result && j[0].result.data && j[0].result.data.json;
if (!root) {
  console.log("ROOT:", JSON.stringify(j).slice(0, 400));
  return; // kept inside async IIFE, valid

}
const arr = Array.isArray(root) ? root : (root.files || root.rows || Object.values(root));
const list = Array.isArray(arr) ? arr : [];
console.log("COUNT:", list.length);
list.slice(-8).forEach((f) => console.log(f.id, "|", f.originalName || f.name, "|", f.categoryId !== undefined ? "cat:" + f.categoryId : ""));

})()