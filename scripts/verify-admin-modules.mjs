import { spawn } from "node:child_process";
import { rmSync } from "node:fs";

const port = 9231;
const profile = "/tmp/wajbat-admin-modules";
const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be configured for this test");

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const cleanup = () => { try { rmSync(profile, { recursive: true, force: true }); } catch {} };

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
  let sequence = 0;
  const waiting = new Map();
  socket.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    const request = waiting.get(message.id);
    if (!request) return;
    waiting.delete(message.id);
    message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
  });
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", () => reject(new Error("Could not connect to Chromium")), { once: true });
  });
  return { socket, command: (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    waiting.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  }) };
}

async function evaluate(command, expression) {
  const result = await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  return result.result.value;
}

async function selectAndAssert(command, key, selectors) {
  const outcome = await evaluate(command, `(() => {
    const button = document.querySelector('button[data-select="${key}"]');
    button?.click();
    return JSON.stringify({ clicked: !!button, title: document.querySelector('.workspace h2')?.textContent || '', selectors: ${JSON.stringify(selectors)}.map(selector => [selector, !!document.querySelector(selector)]) });
  })()`);
  const parsed = JSON.parse(outcome);
  if (!parsed.clicked || parsed.selectors.some(([, present]) => !present)) throw new Error(`Missing ${key} controls: ${outcome}`);
  return parsed;
}

cleanup();
const chrome = spawn("/usr/bin/chromium", ["--headless=new", "--no-sandbox", "--disable-gpu", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--window-size=1280,900", "about:blank"], { stdio: "ignore" });

try {
  const { socket, command } = await connect(await debuggerUrl());
  await command("Page.enable");
  await command("Page.navigate", { url: `${baseUrl}/admin` });
  await wait(800);
  await evaluate(command, `(() => {
    const originalFetch = window.fetch.bind(window);
    window.__adminModuleRequests = [];
    window.fetch = (resource, options = {}) => {
      const url = typeof resource === 'string' ? resource : resource.url;
      if (String(url).includes('adminAuth.login')) window.__adminModuleRequests.push({ url, body: options.body || null });
      return originalFetch(resource, options);
    };
    const form = document.querySelector('#login-form');
    form.elements.email.value = ${JSON.stringify(email)};
    form.elements.password.value = ${JSON.stringify(password)};
    form.requestSubmit(form.querySelector('button[type="submit"]'));
  })()`);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await wait(300);
    if (await evaluate(command, "Boolean(document.querySelector('.admin-shell'))")) break;
  }
  if (!(await evaluate(command, "Boolean(document.querySelector('.admin-shell'))"))) {
    const snapshot = await evaluate(command, "JSON.stringify({ text: document.body.innerText.slice(0, 1000), requests: window.__adminModuleRequests || [] })");
    throw new Error(`Owner dashboard did not load: ${snapshot}`);
  }

  const requests = await selectAndAssert(command, "requests", ["[data-request-search]", "[data-request-filter]", "[data-export-requests]"]);
  const requestEvents = JSON.parse(await evaluate(command, `(() => {
    const search = document.querySelector('[data-request-search]');
    search.value = 'التحقق'; search.dispatchEvent(new Event('input', { bubbles: true }));
    const afterSearch = document.querySelector('[data-request-search]')?.value;
    const filter = document.querySelector('[data-request-filter]');
    filter.value = 'new'; filter.dispatchEvent(new Event('change', { bubbles: true }));
    return JSON.stringify({ afterSearch, afterFilter: document.querySelector('[data-request-filter]')?.value, exportVisible: !!document.querySelector('[data-export-requests]') });
  })()`));
  if (requestEvents.afterSearch !== "التحقق" || requestEvents.afterFilter !== "new" || !requestEvents.exportVisible) throw new Error(`Request filters failed: ${JSON.stringify(requestEvents)}`);

  const messages = await selectAndAssert(command, "messages", ["[data-message-search]", "[data-message-filter]"]);
  const messageEvents = JSON.parse(await evaluate(command, `(() => {
    const search = document.querySelector('[data-message-search]');
    search.value = 'التحقق'; search.dispatchEvent(new Event('input', { bubbles: true }));
    const afterSearch = document.querySelector('[data-message-search]')?.value;
    const filter = document.querySelector('[data-message-filter]');
    filter.value = 'new'; filter.dispatchEvent(new Event('change', { bubbles: true }));
    return JSON.stringify({ afterSearch, afterFilter: document.querySelector('[data-message-filter]')?.value });
  })()`));
  if (messageEvents.afterSearch !== "التحقق" || messageEvents.afterFilter !== "new") throw new Error(`Message filters failed: ${JSON.stringify(messageEvents)}`);

  const reviews = await selectAndAssert(command, "submittedReviews", [".workspace-body .item-list"]);
  const reviewControls = JSON.parse(await evaluate(command, "JSON.stringify({ empty: /لا توجد تقييمات جديدة/.test(document.body.textContent), publishButtons: document.querySelectorAll('[data-review-status]').length, deleteButtons: document.querySelectorAll('[data-delete-review]').length })"));
  if (!reviewControls.empty && (!reviewControls.publishButtons || !reviewControls.deleteButtons)) throw new Error(`Review action controls are incomplete: ${JSON.stringify(reviewControls)}`);

  const settings = await selectAndAssert(command, "siteSettings", ['[data-setting="metaTitle"]', '[data-setting="metaDescription"]']);
  const seo = JSON.parse(await evaluate(command, "JSON.stringify({ titleField: !!document.querySelector('[data-setting=metaTitle]'), descriptionField: !!document.querySelector('[data-setting=metaDescription]') })"));
  if (!seo.titleField || !seo.descriptionField) throw new Error("SEO fields are not available in site settings");

  const dashboard = await selectAndAssert(command, "dashboard", [".stat-grid", ".workspace-body"]);
  const alerts = JSON.parse(await evaluate(command, "JSON.stringify({ hasAlertState: /تنبيهات اللوحة|لا توجد عناصر جديدة تحتاج إلى متابعة الآن/.test(document.body.textContent), backup: !!document.querySelector('[data-download-backup]') })"));
  if (!alerts.hasAlertState || !alerts.backup) throw new Error(`Dashboard alert state is incomplete: ${JSON.stringify(alerts)}`);

  console.log(JSON.stringify({ status: "ADMIN_MODULES_INTERACTIVE_BROWSER_TEST_PASSED", requests, requestEvents, messages, messageEvents, reviews, reviewControls, settings, seo, dashboard, alerts }));
  socket.close();
} finally {
  chrome.kill("SIGTERM");
  await wait(300);
  cleanup();
}
