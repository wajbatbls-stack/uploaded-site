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
    },
    body: method === "POST" ? JSON.stringify({ json: input }) : undefined,
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) throw new Error(json?.error?.json?.message || `HTTP ${response.status}`);
  return { data: json?.result?.data?.json ?? json?.result?.data, response };
}

const login = await rpc("adminAuth.login", { method: "POST", input: { email, password } });
const cookie = (login.response.headers.getSetCookie?.()[0] || login.response.headers.get("set-cookie"))?.split(";")[0];
if (!cookie) throw new Error("لم ينشئ الخادم جلسة مالك للاختبار");

const [{ data: collections }, { data: publicContent }, adminPage] = await Promise.all([
  rpc("admin.collections", { cookie }),
  rpc("site.publicContent"),
  fetch(`${baseUrl}/admin`, { headers: { cookie } }),
]);

const settings = collections.find(item => item.collectionKey === "siteSettings");
if (!settings || !publicContent?.siteSettings) throw new Error("إعدادات الموقع غير متاحة للمحرر أو للزائر");
if (!adminPage.ok || !(await adminPage.text()).includes("admin-homepage-manager-r1.js")) throw new Error("محرر الصفحة الرئيسية غير محمّل في لوحة المالك");

console.log(JSON.stringify({
  ok: true,
  protectedSettingsAvailable: true,
  publicSettingsAvailable: true,
  homepageManagerLoaded: true,
}, null, 2));
