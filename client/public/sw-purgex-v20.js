/* Service worker — v20-purgex (اسم ملف جديد كليًا لا يوجد في كاش أي جهاز قديم)
   مهمته الوحيدة: تفتعل أول مرة ثم تلتهم كل الكاشات و كل التسجيلات القديمة ثم تُلغي نفسها نهائيًا بلا إعادة تحميل.
   لا تخزن أي ملف نهائيًا — مرور فقط (fetch handler لا يستجيب). */
const SW_VERSION = "v20-purgex";

self.addEventListener("install", () => { void self.skipWaiting(); });

const __purgeAll = () =>
  caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).catch(() => {})
    .then(() => self.clients.claim().catch(() => {}));

let __done = false;
self.addEventListener("activate", () => {
  if (__done) return;
  __done = true;
  void __purgeAll().then(() => {
    // نحافظ على هذا التسجيل فقط كتوافق شبكي مؤقت لـ r19 → r20. لا توجد أي
    // استجابة مخزنة؛ أما التسجيلات القديمة الأخرى فتزول عند أول تنظيف.
    void self.clients.matchAll().then(clients => {
      clients.forEach(c => { try { c.postMessage({ type: "wp-purged" }); } catch {} });
    }).catch(() => {});
  });
});

self.addEventListener("message", e => {
  if (e.data && (e.data.type === "sw-kill-me" || e.data.type === "wp-purge-now")) {
    void __purgeAll();
  }
});

/*
  توافق انتقال r19 → r20 وحزم الواجهة الرئيسية القديمة → r38:
  قد تملك بعض الأجهزة صفحة مخزنة تشير إلى الحزمة القديمة. لا نخزن أي استجابة ولا
  نغير أي مسار آخر؛ نستبدل الطلب فقط بحزمة الإصلاح الحديثة عبر الشبكة.
*/
self.addEventListener("fetch", event => {
  const requested = new URL(event.request.url);
  const replacements = {
    "/assets/js/admin-downloads-manager-r19.js": { path: "/assets/js/admin-downloads-manager-r20.js", version: "downloads-r20", compat: "r19-to-r20" },
    "/assets/js/site-app-r33.js": { path: "/assets/js/site-app-r38.js", version: "home-r38", compat: "r33-to-r38" },
    "/assets/js/site-app-r35.js": { path: "/assets/js/site-app-r38.js", version: "home-r38", compat: "r35-to-r38" },
    "/assets/js/site-app-r36.js": { path: "/assets/js/site-app-r38.js", version: "home-r38", compat: "r36-to-r38" },
    "/assets/js/site-app-r37.js": { path: "/assets/js/site-app-r38.js", version: "home-r38", compat: "r37-to-r38" },
  };
  const replacement = replacements[requested.pathname];
  if (!replacement) return;

  const current = new URL(replacement.path, self.location.origin);
  current.searchParams.set("v", replacement.version);
  current.searchParams.set("compat", replacement.compat);
  event.respondWith(fetch(new Request(current.toString(), {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
  })));
});
