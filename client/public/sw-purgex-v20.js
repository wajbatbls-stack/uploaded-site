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
  توافق انتقال r19 → r20:
  بعض الأجهزة قد تملك صفحة إدارة قديمة تشير إلى r19 رغم أن r20 منشور. لا نخزن
  أي استجابة ولا نغير أي مسار آخر؛ نستبدل طلب الحزمة القديمة مرة واحدة على الشبكة
  بالحزمة r20 التي تحتوي إصلاح ترتيب طبقات النافذة.
*/
self.addEventListener("fetch", event => {
  const requested = new URL(event.request.url);
  if (requested.pathname !== "/assets/js/admin-downloads-manager-r19.js") return;

  const current = new URL("/assets/js/admin-downloads-manager-r20.js", self.location.origin);
  current.searchParams.set("v", "downloads-r20");
  current.searchParams.set("compat", "r19-to-r20");
  event.respondWith(fetch(new Request(current.toString(), {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
  })));
});
