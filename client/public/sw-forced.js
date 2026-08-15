/* Service worker نهائي — v16-kill-old-sw
   مهمته الوحيدة: تفعيله يمحو كل الكاشات ثم يُلغي نفسه نهائيًا،
   فلا يبقى أي Service Worker قديم يتحكم بأي صفحة بعد هذه الزيارة. */
const SW_VERSION = "v16-kill-old-sw";

self.addEventListener("install", () => { self.skipWaiting(); });

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() =>
        self.clients.matchAll({ type: "window" }).then(clients => {
          clients.forEach(c => c.postMessage({ type: "sw-all-caches-cleared" }));
        })
      )
  );
});

self.addEventListener("message", e => {
  if (e.data && e.data.type === "sw-kill-me") {
    void self.registration.unregister().then(() => {
      void caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
        .then(() =>
          self.clients.matchAll({ type: "window" }).then(clients => {
            clients.forEach(c => c.postMessage({ type: "sw-unregistered" }));
          })
        );
    });
  }
});

/* لا نخزن أي ملف نهائيًا — مرور فقط */
self.addEventListener("fetch", () => {});
