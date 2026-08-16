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
    // إلغاء كل التسجيلات الأخرى (بما فيها الأنفس إن تكررت) ثم إلغاء الذات
    void self.registration.unregister().catch(() => {});
    void self.clients.matchAll().then(clients => {
      clients.forEach(c => { try { c.postMessage({ type: "wp-purged" }); } catch {} });
    }).catch(() => {});
  });
});

self.addEventListener("message", e => {
  if (e.data && (e.data.type === "sw-kill-me" || e.data.type === "wp-purge-now")) {
    void __purgeAll().then(() => void self.registration.unregister().catch(() => {}));
  }
});

/* لا نلتقط أي طلب نهائيًا — مرور فقط */
self.addEventListener("fetch", () => {});
