import { spawn } from "node:child_process";
import { rmSync } from "node:fs";

const port = 9233;
const profile = "/tmp/wajbat-seo-persistence";
const baseUrl = process.env.TEST_BASE_URL || "https://uploadplus-47dkogbk.manus.space";
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be configured for this test");

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const cleanUp = () => { try { rmSync(profile, { recursive: true, force: true }); } catch {} };

async function debuggerUrl() {
  for (let attempt = 0; attempt < 32; attempt += 1) {
    try {
      const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      if (pages[0]?.webSocketDebuggerUrl) return pages[0].webSocketDebuggerUrl;
    } catch {}
    await wait(250);
  }
  throw new Error("Could not start Chromium verification session");
}

async function connect(url) {
  const socket = new WebSocket(url);
  const awaiting = new Map();
  let sequence = 0;
  socket.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    const deferred = awaiting.get(message.id);
    if (!deferred) return;
    awaiting.delete(message.id);
    message.error ? deferred.reject(new Error(message.error.message)) : deferred.resolve(message.result);
  });
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", () => reject(new Error("Could not connect to Chromium")), { once: true });
  });
  return {
    socket,
    command: (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence;
      awaiting.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    }),
  };
}

async function evaluate(command, expression) {
  const result = await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  return result.result.value;
}

cleanUp();
const chrome = spawn("/usr/bin/chromium", ["--headless=new", "--no-sandbox", "--disable-gpu", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--window-size=1280,900", "about:blank"], { stdio: "ignore" });

try {
  const { socket, command } = await connect(await debuggerUrl());
  await command("Page.enable");
  await command("Page.navigate", { url: `${baseUrl}/admin?release=20260812-r5` });
  for (let attempt = 0; attempt < 32; attempt += 1) {
    await wait(250);
    if (await evaluate(command, "Boolean(document.querySelector('#login-form'))")) break;
  }
  if (!(await evaluate(command, "Boolean(document.querySelector('#login-form'))"))) {
    const snapshot = await evaluate(command, "JSON.stringify({ ready: document.readyState, title: document.title, body: document.body.innerText.slice(0, 500) })");
    throw new Error(`Owner login form did not load: ${snapshot}`);
  }
  await evaluate(command, `(() => {
    const form = document.querySelector('#login-form');
    form.elements.email.value = ${JSON.stringify(email)};
    form.elements.password.value = ${JSON.stringify(password)};
    form.requestSubmit(form.querySelector('button[type="submit"]'));
  })()`);
  for (let attempt = 0; attempt < 48; attempt += 1) {
    await wait(250);
    if (await evaluate(command, "Boolean(document.querySelector('.admin-shell'))")) break;
  }
  if (!(await evaluate(command, "Boolean(document.querySelector('.admin-shell'))"))) {
    const snapshot = await evaluate(command, "JSON.stringify({ title: document.title, body: document.body.innerText.slice(0, 800) })");
    throw new Error(`Owner dashboard did not load: ${snapshot}`);
  }

  const saveStarted = await evaluate(command, `(() => {
    const originalFetch = window.fetch.bind(window);
    window.__seoSaveResults = [];
    window.fetch = async (resource, options = {}) => {
      const response = await originalFetch(resource, options);
      const url = typeof resource === 'string' ? resource : resource.url;
      if (String(url).includes('admin.saveCollection')) window.__seoSaveResults.push({ ok: response.ok, status: response.status });
      return response;
    };
    document.querySelector('button[data-select="siteSettings"]')?.click();
    const title = document.querySelector('[data-setting="metaTitle"]');
    const description = document.querySelector('[data-setting="metaDescription"]');
    if (!title || !description) return JSON.stringify({ ok: false });
    const values = { title: title.value, description: description.value };
    document.querySelector('[data-save-settings]')?.click();
    return JSON.stringify({ ok: true, values });
  })()`);
  const save = JSON.parse(saveStarted);
  if (!save.ok || !save.values.title || !save.values.description) throw new Error("SEO settings were not ready to save");
  for (let attempt = 0; attempt < 24; attempt += 1) {
    await wait(250);
    const complete = await evaluate(command, "window.__seoSaveResults?.length || 0");
    if (complete) break;
  }
  const saveResults = await evaluate(command, "JSON.stringify(window.__seoSaveResults || [])");
  if (!JSON.parse(saveResults).some(result => result.ok)) throw new Error(`SEO settings request did not succeed: ${saveResults}`);

  await command("Page.navigate", { url: `${baseUrl}/?release=20260812-r5#/` });
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await wait(250);
    const matches = await evaluate(command, `document.title === ${JSON.stringify(save.values.title)} && document.querySelector('meta[name="description"]')?.content === ${JSON.stringify(save.values.description)}`);
    if (matches) break;
  }
  const metadata = JSON.parse(await evaluate(command, "JSON.stringify({ title: document.title, description: document.querySelector('meta[name=description]')?.content || '', ogTitle: document.querySelector('meta[property=\"og:title\"]')?.content || '', ogDescription: document.querySelector('meta[property=\"og:description\"]')?.content || '' })"));
  if (metadata.title !== save.values.title || metadata.description !== save.values.description || metadata.ogTitle !== save.values.title || metadata.ogDescription !== save.values.description) {
    throw new Error(`SEO metadata did not match saved values: ${JSON.stringify({ saved: save.values, metadata })}`);
  }
  console.log(JSON.stringify({ status: "SEO_PERSISTENCE_VERIFIED", saved: save.values, metadata }));
  socket.close();
} finally {
  chrome.kill("SIGTERM");
  await wait(300);
  cleanUp();
}
