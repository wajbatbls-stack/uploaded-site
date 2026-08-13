const baseUrl = process.env.OWNER_LOGIN_TEST_URL || "http://127.0.0.1:3000";
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

const { payload: settings } = await rpc("adminAuth.ownerLoginSettings", { cookie });
const { payload: registration } = await rpc("adminAuth.passkeyRegistrationOptions", { cookie });
if (!registration?.challenge || registration?.rp?.id !== "uploadplus-47dkogbk.manus.space") {
  throw new Error("لم يعد خادم Passkey تحدياً متوافقاً مع نطاق الإنتاج");
}

const { payload: saved } = await rpc("adminAuth.saveOwnerLoginSettings", {
  method: "POST",
  cookie,
  input: settings,
});

if (!saved) throw new Error("لم يؤكد الخادم حفظ إعدادات شاشة الدخول");
console.log(JSON.stringify({
  ok: true,
  androidLikeOriginFallback: registration.rp.id,
  settingsSaved: true,
}, null, 2));
