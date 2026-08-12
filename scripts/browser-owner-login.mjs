import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";

const chromePort = 9227;
const chromeProfile = "/tmp/wajbat-owner-login-browser";
const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const evidenceDir = "/tmp/wajbat-admin-redesign-evidence";

if (!email || !password) throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be configured for this test");

function removeProfile() {
  try {
    rmSync(chromeProfile, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 });
  } catch {}
}

removeProfile();
rmSync(evidenceDir, { recursive: true, force: true });
mkdirSync(evidenceDir, { recursive: true });
const chrome = spawn("/usr/bin/chromium", [
  "--headless=new", "--no-sandbox", "--disable-gpu", `--remote-debugging-port=${chromePort}`,
  `--user-data-dir=${chromeProfile}`, "--window-size=1280,900", "about:blank",
], { stdio: "ignore" });

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function getDebuggerUrl() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const pages = await (await fetch(`http://127.0.0.1:${chromePort}/json/list`)).json();
      if (pages[0]?.webSocketDebuggerUrl) return pages[0].webSocketDebuggerUrl;
    } catch {}
    await wait(250);
  }
  throw new Error("Could not start Chromium test session");
}

function createCdp(url) {
  const socket = new WebSocket(url);
  let sequence = 0;
  const pending = new Map();
  socket.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
  });
  const command = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  return new Promise((resolve, reject) => {
    socket.addEventListener("open", () => resolve({ socket, command }), { once: true });
    socket.addEventListener("error", () => reject(new Error("Could not connect to Chromium")), { once: true });
  });
}

async function runInteractiveLogin(command, viewport) {
  await command("Network.clearBrowserCookies");
  await command("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: viewport.scale, mobile: viewport.mobile });
  await command("Page.navigate", { url: `${baseUrl}/admin` });
  await wait(900);
  const inputCheck = await command("Runtime.evaluate", { expression: `(() => {
    window.__ownerLoginRequests = [];
    const nativeFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const response = await nativeFetch(...args);
      window.__ownerLoginRequests.push({ url: String(args[0]), status: response.status });
      return response;
    };
    const form = document.querySelector('#login-form');
    const field = form?.elements.email;
    return JSON.stringify({ form: !!form, type: field?.type, inputMode: field?.inputMode, noValidate: form?.noValidate });
  })()`, returnByValue: true });
  const values = JSON.parse(inputCheck.result.value);
  if (!values.form || values.type !== "text" || values.inputMode !== "email" || !values.noValidate) throw new Error(`Mobile-safe login field checks failed: ${JSON.stringify(values)}`);
  const formReady = await command("Runtime.evaluate", { expression: `(() => {
    const form = document.querySelector('#login-form');
    const emailField = form.elements.email;
    const passwordField = form.elements.password;
    emailField.focus();
    return JSON.stringify({ valid: form.noValidate, emailField: !!emailField, passwordField: !!passwordField });
  })()`, returnByValue: true });
  const fields = JSON.parse(formReady.result.value);
  if (!fields.valid || !fields.emailField || !fields.passwordField) throw new Error("The login form is not ready for browser input");
  await command("Input.insertText", { text: email });
  await command("Runtime.evaluate", { expression: "document.querySelector('#login-form').elements.password.focus()" });
  await command("Input.insertText", { text: password });
  const submit = await command("Runtime.evaluate", { expression: `(() => {
    const form = document.querySelector('#login-form');
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.focus();
    form.requestSubmit(submitButton);
    return JSON.stringify({ valid: form.checkValidity(), emailValue: form.elements.email.value });
  })()`, returnByValue: true });
  const submitted = JSON.parse(submit.result.value);
  if (!submitted.valid || submitted.emailValue !== email) throw new Error("The browser did not accept the configured owner email for submission");
  let result = { dashboard: false, browserValidation: false, error: "" };
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await wait(350);
    const outcome = await command("Runtime.evaluate", { expression: `(() => JSON.stringify({ dashboard: !!document.querySelector('.admin-shell'), browserValidation: document.querySelector('#login-form')?.matches(':invalid') ?? false, error: document.querySelector('#login-error')?.textContent?.trim() || '', requests: window.__ownerLoginRequests || [] }))()`, returnByValue: true });
    result = JSON.parse(outcome.result.value);
    if (result.dashboard || result.browserValidation || result.error) break;
  }
  if (!result.dashboard || result.browserValidation || result.error) throw new Error(`Interactive login failed: ${JSON.stringify(result)}`);

  const capture = async name => {
    const screenshot = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
    writeFileSync(`${evidenceDir}/${name}.png`, Buffer.from(screenshot.data, "base64"));
  };
  const navigation = await command("Runtime.evaluate", { expression: `(() => JSON.stringify({
    shell: !!document.querySelector('.admin-shell'),
    sidebar: !!document.querySelector('.admin-sidebar, .admin-nav, aside'),
    links: [...document.querySelectorAll('[data-select]')].map(el => el.dataset.select).filter(Boolean)
  }))()`, returnByValue: true });
  const navState = JSON.parse(navigation.result.value);
  if (!navState.shell || !navState.sidebar || !navState.links.includes("requests") || !navState.links.includes("siteSettings")) {
    throw new Error(`Redesigned dashboard navigation is incomplete: ${JSON.stringify(navState)}`);
  }
  const suffix = viewport.mobile ? "mobile" : "desktop";
  await capture(`${suffix}-dashboard`);
  if (viewport.mobile) {
    const menuState = await command("Runtime.evaluate", { expression: `(() => {
      document.querySelector('[data-sidebar-toggle]')?.click();
      return JSON.stringify({ open: document.querySelector('.admin-shell')?.classList.contains('nav-open') || false });
    })()`, returnByValue: true });
    if (!JSON.parse(menuState.result.value).open) throw new Error("Mobile navigation did not open");
    await capture(`${suffix}-navigation`);
  } else {
    const alertsView = await command("Runtime.evaluate", { expression: `(() => JSON.stringify({
      hasAlerts: !!document.querySelector('.alert-panel, .alert-action'),
      alertActions: document.querySelectorAll('.alert-action').length
    }))()`, returnByValue: true });
    const alertsState = JSON.parse(alertsView.result.value);
    if (!alertsState.hasAlerts) throw new Error(`Dashboard alert panel did not render: ${JSON.stringify(alertsState)}`);
    await capture(`${suffix}-alerts`);
    await command("Runtime.evaluate", { expression: `document.querySelector('[data-select="messages"]')?.click()` });
    await wait(300);
    const emptyView = await command("Runtime.evaluate", { expression: `(() => JSON.stringify({
      hasMessagesView: !!document.querySelector('.workspace, .admin-content, .admin-main'),
      hasEmptyState: !!document.querySelector('.empty'),
      emptyText: document.querySelector('.empty')?.textContent?.trim() || ''
    }))()`, returnByValue: true });
    const emptyState = JSON.parse(emptyView.result.value);
    if (!emptyState.hasMessagesView || !emptyState.hasEmptyState) throw new Error(`Messages empty state did not render: ${JSON.stringify(emptyState)}`);
    await capture(`${suffix}-empty-messages`);
    await command("Runtime.evaluate", { expression: `document.querySelector('[data-select="requests"]')?.click()` });
    await wait(300);
    const requestsView = await command("Runtime.evaluate", { expression: `(() => JSON.stringify({
      title: document.querySelector('.admin-content h1, .admin-main h1, main h1')?.textContent?.trim() || '',
      hasRequestControls: !!document.querySelector('[data-request-status], [data-save-request], select')
    }))()`, returnByValue: true });
    const requestsState = JSON.parse(requestsView.result.value);
    if (!requestsState.hasRequestControls) throw new Error(`Requests module did not render after navigation: ${JSON.stringify(requestsState)}`);
    await capture(`${suffix}-requests`);
    await command("Runtime.evaluate", { expression: `document.querySelector('[data-select="siteSettings"]')?.click()` });
    await wait(300);
    const settingsView = await command("Runtime.evaluate", { expression: `(() => JSON.stringify({
      hasSettings: !!document.querySelector('[data-setting], #seo-title, input[name*="seo"], textarea')
    }))()`, returnByValue: true });
    if (!JSON.parse(settingsView.result.value).hasSettings) throw new Error("Settings module did not render after navigation");
    await capture(`${suffix}-settings`);
  }
  result.redesign = { navigation: navState, screenshots: suffix };
  return result;
}

try {
  const cdp = await createCdp(await getDebuggerUrl());
  await cdp.command("Page.enable");
  const desktop = await runInteractiveLogin(cdp.command, { width: 1280, height: 900, scale: 1, mobile: false });
  const android = await runInteractiveLogin(cdp.command, { width: 375, height: 812, scale: 3, mobile: true });
  console.log(JSON.stringify({ desktop, android, status: "OWNER_LOGIN_INTERACTIVE_BROWSER_TEST_PASSED" }));
  cdp.socket.close();
} finally {
  chrome.kill("SIGTERM");
  await wait(500);
  removeProfile();
}
