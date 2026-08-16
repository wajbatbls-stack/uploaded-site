/* Service worker نهائي — v17-no-reload-loop
   مهمته: تفعيله مرة واحدة فقط يمحو كل الكاشات ثم يُلغي نفسه نهائيًا.
   لا أي إعادة تحميل — لا رسائل reload ولا حلقات. */
const SW_VERSION = "v17-no-reload-loop";

self.addEventListener("install", () => { self.skipWaiting(); });

/* التنفيذ مرة واحدة فقط لكل عملية تشغيل */
let __done = false;
const __doOnce = () => {
  if (__done) return;
  __done = true;
  void caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
    .then(() => self.clients.claim());
};

self.addEventListener("activate", () => { __doOnce(); });

self.addEventListener("message", e => {
  if (e.data && e.data.type === "sw-kill-me") {
    __doOnce();
    void self.registration.unregister();
  }
});

/* لا نخزن أي ملف نهائيًا — مرور فقط */
self.addEventListener("fetch", () => {});
