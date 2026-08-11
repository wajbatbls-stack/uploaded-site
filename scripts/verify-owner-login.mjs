const baseUrl = process.env.WAJBAT_TEST_BASE_URL || "http://localhost:3000";
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) throw new Error("Owner credentials are not configured");

const login = await fetch(`${baseUrl}/api/trpc/adminAuth.login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ json: { email, password } }),
});
if (!login.ok) throw new Error(`Owner login returned HTTP ${login.status}`);

const setCookie = login.headers.get("set-cookie");
if (!setCookie?.includes("wajbat_admin_session")) throw new Error("Owner session cookie was not issued");
const cookie = setCookie.split(";")[0];

const content = await fetch(`${baseUrl}/api/trpc/admin.collections?input=${encodeURIComponent(JSON.stringify({ json: null }))}`, {
  headers: { cookie },
});
if (!content.ok) throw new Error(`Protected content request returned HTTP ${content.status}`);

console.log("Owner login and protected dashboard access verified.");
