import { rmSync } from "node:fs";
import { spawn } from "node:child_process";

const port = 9231;
const profile = "/tmp/wajbat-owner-login-smoke";
const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) throw new Error("ADMIN_EMAIL و ADMIN_PASSWORD مطلوبان لاختبار لوحة المالك");

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const within = (promise, label, ms = 15_000) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error(`انتهت مهلة: ${label}`)), ms)),
]);

async function debuggerUrl() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const pages = await within(fetch(`http://127.0.0.1:${port}/json/list`), "بدء Chromium", 1_000);
      const data = await pages.json();
      if (data[0]?.webSocketDebuggerUrl) return data[0].webSocketDebuggerUrl;
    } catch {}
    await wait(150);
  }
  throw new Error("تعذر فتح جلسة اختبار المتصفح");
}

async function run() {
  rmSync(profile, { recursive: true, force: true });
  const chrome = spawn("/usr/bin/chromium", [
    "--headless=new", "--no-sandbox", "--disable-gpu", `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`, "--window-size=1280,900", "about:blank",
  ], { stdio: "ignore" });
  let socket;
  try {
    const url = await debuggerUrl();
    socket = new WebSocket(url);
    await within(new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", () => reject(new Error("تعذر الاتصال بجلسة الاختبار")), { once: true });
    }), "اتصال جلسة Chromium");
    let serial = 0;
    const pending = new Map();
    socket.addEventListener("message", event => {
      const data = JSON.parse(event.data);
      const item = pending.get(data.id);
      if (!item) return;
      pending.delete(data.id);
      data.error ? item.reject(new Error(data.error.message)) : item.resolve(data.result);
    });
    const command = (method, params = {}) => within(new Promise((resolve, reject) => {
      const id = ++serial;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    }), method);
    const evaluate = async expression => {
      const result = await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      return result.result.value;
    };

    await command("Page.enable");
    await command("Network.clearBrowserCookies");
    await command("Page.navigate", { url: `${baseUrl}/admin` });
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await wait(250);
      if (await evaluate("Boolean(document.querySelector('#login-form'))")) break;
    }
    const loginReady = await evaluate(`JSON.stringify({
      form: Boolean(document.querySelector('#login-form')),
      root: document.querySelector('#admin-root')?.textContent?.trim().slice(0, 220) || '',
      page: location.href
    })`);
    const login = JSON.parse(loginReady);
    if (!login.form) throw new Error(`لم تظهر شاشة دخول المالك: ${loginReady}`);

    await evaluate(`(() => {
      const form = document.querySelector('#login-form');
      form.elements.email.value = ${JSON.stringify(email)};
      form.elements.password.value = ${JSON.stringify(password)};
      form.requestSubmit();
    })()`);
    for (let attempt = 0; attempt < 28; attempt += 1) {
      await wait(250);
      if (await evaluate("Boolean(document.querySelector('.admin-shell'))")) break;
    }
    if (!await evaluate("Boolean(document.querySelector('.admin-shell'))")) {
      throw new Error(`لم يكتمل دخول المالك: ${await evaluate("document.querySelector('#login-error')?.textContent || ''")}`);
    }

    await evaluate("document.querySelector('[data-select=\"ownerLogin\"]')?.click()");
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await wait(150);
      if (await evaluate("Boolean(document.querySelector('[data-owner-login-settings]'))")) break;
    }
    const ownerSettings = JSON.parse(await evaluate(`JSON.stringify({
      form: Boolean(document.querySelector('[data-owner-login-settings]')),
      upload: Boolean(document.querySelector('[data-owner-login-upload=\"logo\"]')),
      passkey: Boolean(document.querySelector('[data-owner-passkey-register]')),
      clock: document.querySelector('[name=clockStyle]')?.options.length || 0,
      numeric: document.querySelector('[name=logoBorderWidth]')?.value ?? null
    })`));
    if (!ownerSettings.form || !ownerSettings.upload || !ownerSettings.passkey || ownerSettings.clock < 24 || ownerSettings.numeric === null) {
      throw new Error(`قسم إعدادات الدخول غير مكتمل: ${JSON.stringify(ownerSettings)}`);
    }

    await evaluate(`(async () => {
      const form = document.querySelector('[data-owner-login-settings]');
      const original = window.fetch.bind(window);
      window.__ownerLoginSaveResult = null;
      window.fetch = async (...args) => {
        const response = await original(...args);
        if (String(args[0]).includes('adminAuth.saveOwnerLoginSettings')) {
          const payload = await response.clone().json().catch(() => null);
          window.__ownerLoginSaveResult = { status: response.status, ok: response.ok, message: payload?.error?.json?.message || '' };
        }
        return response;
      };
      form.requestSubmit();
    })()`);
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await wait(150);
      if (await evaluate("Boolean(window.__ownerLoginSaveResult)")) break;
    }
    const saved = JSON.parse(await evaluate("JSON.stringify(window.__ownerLoginSaveResult)"));
    if (!saved?.ok || saved.status !== 200) throw new Error(`فشل حفظ إعدادات شاشة الدخول: ${JSON.stringify(saved)}`);
    console.log(JSON.stringify({ ok: true, login, ownerSettings, saved }));
  } finally {
    socket?.close();
    chrome.kill("SIGTERM");
    await wait(300);
    if (!chrome.killed) chrome.kill("SIGKILL");
  }
}

await run();
