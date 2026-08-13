const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const userAgent = process.env.TEST_USER_AGENT;

if (!email || !password) throw new Error("ADMIN_EMAIL و ADMIN_PASSWORD مطلوبان لاختبار إعدادات دخول المالك");

function unwrap(payload) {
  return payload?.result?.data?.json ?? payload?.result?.data;
}

async function request(procedure, input, cookie, method = "POST") {
  const isQuery = method === "GET";
  const suffix = isQuery ? `?input=${encodeURIComponent(JSON.stringify({ json: input }))}` : "";
  const response = await fetch(`${baseUrl}/api/trpc/${procedure}${suffix}`, {
    method,
    headers: {
      ...(isQuery ? {} : { "content-type": "application/json" }),
      origin: baseUrl,
      ...(userAgent ? { "user-agent": userAgent } : {}),
      ...(cookie ? { cookie } : {}),
    },
    body: isQuery ? undefined : JSON.stringify({ json: input }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error?.json?.message || `فشل ${procedure} (${response.status})`);
  return { payload: unwrap(payload), response };
}

const login = await request("adminAuth.login", { email, password });
const setCookies = typeof login.response.headers.getSetCookie === "function"
  ? login.response.headers.getSetCookie()
  : [login.response.headers.get("set-cookie")].filter(Boolean);
const cookie = setCookies.map(value => value.split(";")[0]).join("; ");
if (!cookie.includes("wajbat_admin_session=")) throw new Error("لم ينشئ الخادم جلسة مالك للاختبار");

const current = await request("adminAuth.ownerLoginSettings", undefined, cookie, "GET");
const settings = current.payload;
const requiredNumbers = [
  "logoSize", "ownerPhotoSize", "cardOpacity", "cardRadius", "cardBlur", "cardWidth", "fieldFontSize", "buttonRadius",
  "logoBorderWidth", "logoGlow", "cardBorderWidth", "fieldBorderWidth", "fieldRadius", "buttonGlow", "animationDuration", "clockSize",
];
for (const field of requiredNumbers) {
  if (typeof settings[field] !== "number") throw new Error(`الحقل الرقمي ${field} غير محفوظ كرقم`);
}
if (typeof settings.clockEnabled !== "boolean" || typeof settings.clockShowSeconds !== "boolean") {
  throw new Error("إعدادات الساعة المنطقية غير محفوظة بصورة صحيحة");
}

const saved = await request("adminAuth.saveOwnerLoginSettings", settings, cookie);
if (saved.payload?.clockStyle !== settings.clockStyle || saved.payload?.logoBorderWidth !== settings.logoBorderWidth) {
  throw new Error("لم يرجع الخادم قيم إعدادات الدخول المحفوظة كما هي");
}

const registration = await request("adminAuth.passkeyRegistrationOptions", undefined, cookie, "GET");
const selection = registration.payload?.authenticatorSelection;
if (selection?.authenticatorAttachment !== "platform" || selection?.userVerification !== "required") {
  throw new Error("إعداد Passkeys لا يطلب وسيلة تحقق محلية للمالك بصورة صحيحة");
}

console.log(JSON.stringify({
  ok: true,
  numericFieldsVerified: requiredNumbers.length,
  clockStyle: saved.payload.clockStyle,
  clockEnabled: saved.payload.clockEnabled,
  passkeyUserVerification: selection.userVerification,
}));
