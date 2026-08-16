import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const sw = read("client/public/sw-purgex-v20.js");
const adminHtml = read("client/public/admin.html");
const publicIndex = read("client/public/index.html");
const clientIndex = read("client/index.html");

describe("SW v20 purgex mechanism", () => {
  it("sw-purgex-v20.js wipes caches and redirects only the stale r19 bundle to r20 without caching", () => {
    expect(sw).toContain("v20-purgex");
    expect(sw).toContain("sw-kill-me");
    expect(sw).toContain("wp-purge-now");
    expect(sw).toContain("skipWaiting");
    expect(sw).toContain('requested.pathname !== "/assets/js/admin-downloads-manager-r19.js"');
    expect(sw).toContain('"/assets/js/admin-downloads-manager-r20.js"');
    expect(sw).toContain('cache: "no-store"');
    // لا reload داخل الـSW
    expect(sw).not.toMatch(/location\.reload|clients\.clearCacheNames/);
  });

  it("all three HTML pages run the mandatory inline purge (v20) unconditionally once per session", () => {
    for (const [name, html] of [
      ["admin.html", adminHtml],
      ["public/index.html", publicIndex],
      ["client/index.html", clientIndex],
    ] as const) {
      // بلوك v20 المباشر موجود: يمسح الكاشات ويلغي التسجيلات ويسجل purgex-v20
      expect(html).toContain("__wpV20Purge");
      expect(html).toContain("__wp_purge_v20");
      expect(html).toContain('navigator.serviceWorker.register("/sw-purgex-v20.js');
      expect(html).toContain("caches.keys()");
      expect(html).toContain("getRegistrations()");
      // لا حلقة reload: لا controllerchange ولا reload داخل بلوك التنظيف
      expect(html).not.toContain("controllerchange");
      expect(html).not.toMatch(/serviceWorker.*reload|reload.*serviceWorker/i);
      // لم يعد هناك كتل v17/v18 القديمة
      expect(html).not.toContain("__sw17");
      expect(html).not.toContain("__sw18");
      expect(html).not.toContain("sw-forced.js");
    }
  });

  it("no leftover kill-loop SW code anywhere in public HTML", () => {
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
      expect(html).not.toContain("SW نهائي v17");
      expect(html).not.toContain("SW نهائي v18");
    }
  });
});
