import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const sw = read("client/public/sw-forced.js");
const adminHtml = read("client/public/admin.html");
const publicIndex = read("client/public/index.html");
const clientIndex = read("client/index.html");

describe("SW v17+v18 mechanism", () => {
  it("sw-forced.js is v17 with single-run cleanup and self-unregister", () => {
    expect(sw).toContain("v18-force-purge");
    expect(sw).toContain("sw-kill-me");
    expect(sw).toContain("skipWaiting");
    // لا reload داخل الـSW
    expect(sw).not.toMatch(/location\.reload|clients\.clearCacheNames/);
  });

  it("all three HTML entries register the SW once per session with no reload loop", () => {
    for (const [name, html] of [
      ["admin.html", adminHtml],
      ["public/index.html", publicIndex],
      ["client/index.html", clientIndex],
    ] as const) {
      // بلوك v17 موجود
      expect(html).toContain("SW نهائي v17");
      expect(html).toContain('__sw17');
      expect(html).toContain('!sessionStorage.getItem("__sw17")');
      expect(html).toContain('navigator.serviceWorker.register("/sw-forced.js")');
      // لا حلقة reload: لا controllerchange ولا reload داخل بلوك التسجيل
      expect(html).not.toContain("controllerchange");
      expect(html).not.toMatch(/serviceWorker.*reload|reload.*serviceWorker/i);
    }
  });

  it("no leftover v15/v16 kill-loop SW code anywhere in public HTML", () => {
    for (const [name, html] of [
      ["admin.html", adminHtml],
      ["public/index.html", publicIndex],
      ["client/index.html", clientIndex],
    ] as const) {
      expect(html).not.toContain("v16-kill-old-sw");
      expect(html).not.toContain("v15-cache-bust");
      expect(html).not.toContain("sw-all-caches-cleared");
      expect(html).not.toContain("__killAllOldSW");
      expect(html).not.toContain("sw-unregistered");
    }
  });
});
