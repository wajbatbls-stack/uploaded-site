/* Service worker — v18-force-purge
   مهمته: أي زيارة تستلم v18 — ولو لمرة واحدة في جلسة جديدة — تُمحو
   كل الكاشات القديمة (حتى من SWs سابقة) ثم تُلغي نفسها نهائيًا بلا إعادة تحميل.
   مفتاح الجلسة مختلف عن v17 حتى لو كانت v17 قد نفّذت على الجهاز سابقًا. */
const SW_VERSION = "v18-force-purge";

self.addEventListener("install", () => { self.skipWaiting(); });

const __purgeAll = () =>
  caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
    .catch(() => {})
    .then(() => self.clients.claim().catch(() => {}));

let __done = false;
self.addEventListener("activate", () => { if (!__done) { __done = true; __purgeAll(); } });

self.addEventListener("message", e => {
  if (e.data && e.data.type === "sw-kill-me") { __purgeAll(); void self.registration.unregister(); }
});

/* لا نخزن أي ملف نهائيًا — مرور فقط */
self.addEventListener("fetch", () => {});
