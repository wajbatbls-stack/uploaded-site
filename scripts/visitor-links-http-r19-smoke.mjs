const baseUrl = process.env.VISITOR_LINKS_TEST_URL || "http://127.0.0.1:3000";
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) throw new Error("بيانات اختبار المالك غير متاحة في البيئة");

async function rpc(path, { method = "GET", input, cookie } = {}) {
  const suffix = method === "GET" && input !== undefined ? `?input=${encodeURIComponent(JSON.stringify({ json: input }))}` : "";
  const response = await fetch(`${baseUrl}/api/trpc/${path}${suffix}`, {
    method,
    headers: { ...(cookie ? { cookie } : {}), ...(method === "POST" ? { "content-type": "application/json" } : {}) },
    body: method === "POST" ? JSON.stringify({ json: input }) : undefined,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error?.json?.message || `HTTP ${response.status} على ${path}`);
  return { data: payload?.result?.data?.json ?? payload?.result?.data, response };
}

const login = await rpc("adminAuth.login", { method: "POST", input: { email, password } });
const cookie = (login.response.headers.getSetCookie?.()[0] || login.response.headers.get("set-cookie"))?.split(";")[0];
if (!cookie) throw new Error("لم ينشئ الخادم جلسة مالك لفحص روابط الزوار");

let id;
try {
  const name = `فحص رابط زائر ${Date.now()}`;
  const created = await rpc("admin.createVisitorLink", { method: "POST", cookie, input: { name, targetPath: "/services", isActive: true, expiresAt: null } });
  id = created.data?.id;
  const token = created.data?.token;
  if (!id || !token) throw new Error("لم يُنشأ رابط الزائر أو لم يُرجع رمزاً عاماً");

  const checked = await rpc("site.resolveVisitorLink", { input: { token, recordVisit: false } });
  if (!checked.data?.active || checked.data.targetPath !== "/services") throw new Error("فشل التحقق الآمن من الرابط الجديد");

  await rpc("admin.updateVisitorLink", { method: "POST", cookie, input: { id, name: `${name} المعدل`, targetPath: "/contact", isActive: false } });
  const disabled = await rpc("site.resolveVisitorLink", { input: { token } });
  if (disabled.data?.active || disabled.data?.reason !== "disabled") throw new Error("الرابط المعطل بقي متاحاً للزائر");

  await rpc("admin.updateVisitorLink", { method: "POST", cookie, input: { id, isActive: true } });
  const reenabled = await rpc("site.resolveVisitorLink", { input: { token } });
  if (!reenabled.data?.active || reenabled.data.targetPath !== "/contact") throw new Error("فشل حفظ التعديل أو إعادة التفعيل");

  const links = await rpc("admin.visitorLinks", { cookie });
  const finalLink = links.data?.find(link => Number(link.id) === Number(id));
  if (!finalLink || Number(finalLink.visitCount) < 1 || finalLink.name !== `${name} المعدل`) throw new Error("لم يظهر الرابط المعدل أو لم تُسجل الزيارة الفعلية");
  console.log(JSON.stringify({ ok: true, createdThenUpdatedThenDisabledThenEnabled: true, visitCount: finalLink.visitCount }, null, 2));
} finally {
  if (id) await rpc("admin.deleteVisitorLink", { method: "POST", cookie, input: { id } });
}
