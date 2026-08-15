/* Service worker إجباري — يكسر كاش JS/CSS القديم نهائيًا
   يُنشَّط من admin.html/index.html عند كل تحميل، ويمسح كل كاش قديم ثم يعيد تحميل الصفحة مرة واحدة. */
const SW_VERSION = "v15-cache-bust";

self.addEventListener("install", e => { self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== SW_VERSION).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  const isCachedAsset = /\.(js|css|html|woff2?|png|jpe?g|webp|svg|ico)(\?|$)/i.test(url.pathname);
  if (!isCachedAsset) return;
  // شبكة أولًا دائمًا مع تحديث الكاش — لا يُخدم أي ملف قديم من الكاش
  e.respondWith(
    fetch(e.request)
      .then(netRes => {
        const keep = new Response(netRes.body, {
          headers: { "content-type": netRes.headers.get("content-type") || "text/plain" },
          status: netRes.status,
        });
        caches.open(SW_VERSION).then(cache => cache.put(url.href, keep).catch(() => {}));
        return netRes;
      })
      .catch(() => caches.match(url.href))
  );
});
