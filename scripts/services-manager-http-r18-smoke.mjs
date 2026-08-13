const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3000";

if (!email || !password) throw new Error("بيانات اختبار المالك غير متاحة في البيئة");

async function rpc(path, { method = "GET", input, cookie } = {}) {
  const suffix = method === "GET" && input !== undefined
    ? `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`
    : "";
  const response = await fetch(`${baseUrl}/api/trpc/${path}${suffix}`, {
    method,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(method === "POST" ? { "content-type": "application/json" } : {}),
      "user-agent": "Mozilla/5.0 (Linux; Android 14) Chrome/128 Mobile Safari/537.36",
      "x-forwarded-proto": "https",
      "x-forwarded-host": "uploadplus-47dkogbk.manus.space",
    },
    body: method === "POST" ? JSON.stringify({ json: input }) : undefined,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.json?.message || `HTTP ${response.status}`);
  return { payload: payload?.result?.data?.json ?? payload?.result?.data, response };
}

const login = await rpc("adminAuth.login", { method: "POST", input: { email, password } });
const setCookie = login.response.headers.getSetCookie?.()[0] || login.response.headers.get("set-cookie");
const cookie = setCookie?.split(";")[0];
if (!cookie) throw new Error("لم ينشئ الخادم جلسة اختبار للمالك");

const { payload: collections } = await rpc("admin.collections", { cookie });
const servicesRow = Array.isArray(collections) ? collections.find(row => row.collectionKey === "services") : null;
if (!servicesRow) throw new Error("لم يُرجع الخادم مجموعة الخدمات");
const services = typeof servicesRow.content === "string" ? JSON.parse(servicesRow.content) : servicesRow.content;
if (!Array.isArray(services)) throw new Error("صيغة مجموعة الخدمات غير صالحة");

console.log(JSON.stringify({
  ok: true,
  operation: "read-only",
  servicesCount: services.length,
  supportsNestedItems: services.every(service => Array.isArray(service.items)),
}, null, 2));
