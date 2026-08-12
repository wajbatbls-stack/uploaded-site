import { spawn } from "node:child_process";
import { rmSync } from "node:fs";

const port = 9233;
const profile = "/tmp/wajbat-assignment-validation";
const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const cleanup = () => { try { rmSync(profile, { recursive: true, force: true }); } catch {} };

async function debuggerUrl() {
  for (let attempt = 0; attempt < 32; attempt += 1) {
    try {
      const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      if (pages[0]?.webSocketDebuggerUrl) return pages[0].webSocketDebuggerUrl;
    } catch {}
    await wait(250);
  }
  throw new Error("Could not start Chromium validation session");
}

async function connect(url) {
  const socket = new WebSocket(url);
  let sequence = 0;
  const waiting = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    const pending = waiting.get(message.id);
    if (!pending) return;
    waiting.delete(message.id);
    message.error ? pending.reject(new Error(message.error.message)) : pending.resolve(message.result);
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

cleanup();
const chrome = spawn("/usr/bin/chromium", ["--headless=new", "--no-sandbox", "--disable-gpu", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--window-size=1280,900", "about:blank"], { stdio: "ignore" });

try {
  const { socket, command } = await connect(await debuggerUrl());
  await command("Page.enable");
  await command("Page.navigate", { url: `${baseUrl}/#/assignment` });
  for (let attempt = 0; attempt < 80; attempt += 1) {
    await wait(250);
    if (await evaluate(command, "document.readyState !== 'loading' && Boolean(document.querySelector('form[data-form=assignment]'))")) break;
  }
  if (!(await evaluate(command, "Boolean(document.querySelector('form[data-form=assignment]'))"))) {
    const snapshot = await evaluate(command, "JSON.stringify({ url: location.href, ready: document.readyState, app: document.querySelector('#app')?.innerHTML.slice(0, 300) || '', body: document.body?.innerText.slice(0, 300) || '' })");
    throw new Error(`Assignment form did not load: ${snapshot}`);
  }

  const result = JSON.parse(await evaluate(command, `(() => {
    const form = document.querySelector('form[data-form=assignment]');
    const values = {
      studentName: 'اختبار', studentId: '1', university: 'جامعة الملك سعود', college: 'كلية الحاسب',
      course: 'برمجة 1', professor: 'د. اختبار', serviceType: 'حل الواجبات الدراسية', deadline: '2026-08-30', description: 'نني'
    };
    Object.entries(values).forEach(([name, value]) => { form.elements[name].value = value; });
    window.__assignmentRequests = [];
    const originalFetch = window.fetch.bind(window);
    window.fetch = (resource, options = {}) => {
      const url = typeof resource === 'string' ? resource : resource.url;
      if (String(url).includes('site.submitAssignment')) window.__assignmentRequests.push({ url, body: options.body || null });
      return originalFetch(resource, options);
    };
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    return new Promise(resolve => setTimeout(() => resolve(JSON.stringify({
      toast: document.querySelector('#toast-region')?.innerText || '',
      requestCount: window.__assignmentRequests.length,
      descriptionFocused: document.activeElement === form.elements.description,
    })), 120));
  })()`));
  if (!/أكمل وصف الواجب/.test(result.toast) || !/8 أحرف/.test(result.toast) || result.requestCount !== 0 || !result.descriptionFocused) {
    throw new Error(`Short description guard failed: ${JSON.stringify(result)}`);
  }
  console.log(JSON.stringify({ status: "ASSIGNMENT_SHORT_DESCRIPTION_BROWSER_TEST_PASSED", ...result }));
  socket.close();
} finally {
  chrome.kill("SIGTERM");
  await wait(300);
  cleanup();
}
