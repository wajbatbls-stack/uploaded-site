const baseUrl = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000";
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

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
    },
    body: method === "POST" ? JSON.stringify({ json: input }) : undefined,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.json?.message || `HTTP ${response.status}`);
  return { payload: payload?.result?.data?.json ?? payload?.result?.data, response };
}

const login = await rpc("adminAuth.login", { method: "POST", input: { email, password } });
const cookie = (login.response.headers.getSetCookie?.()[0] || login.response.headers.get("set-cookie"))?.split(";")[0];
if (!cookie) throw new Error("لم ينشئ الخادم جلسة مالك لفحص استوديو التصميم");

const [{ payload: collections }, { payload: history }, { payload: publicContent }] = await Promise.all([
  rpc("admin.collections", { cookie }),
  rpc("admin.designHistory", { cookie, input: { limit: 20 } }),
  rpc("site.publicContent"),
]);

const settings = collections.find((item) => item.collectionKey === "siteSettings")?.content;
if (!settings || !publicContent?.siteSettings) throw new Error("إعدادات الموقع لا تصل بصورة صحيحة إلى لوحة المالك أو واجهة الزائر");
if (!Array.isArray(history)) throw new Error("لم يعُد سجل نسخ التصميم قائمة صالحة");

console.log(JSON.stringify({
  ok: true,
  adminSettingsAvailable: true,
  publicSettingsAvailable: true,
  designSnapshotsReadable: true,
  snapshotCount: history.length,
}, null, 2));
