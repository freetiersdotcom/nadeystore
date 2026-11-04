/* Service worker of the storefront: deliberately light.
 * - Pages, prices, stock and the cart are NEVER cached: a customer always sees the live shop (and the product
 *   pages keep their own freshness rules). Offline, a friendly page appears instead of the browser's error.
 * - Built files under /_astro/ never change once published (hashed names): cached for speed.
 * - Never touches the API, payment pages or any other site.
 */
const CACHE = 'store-v1';
const OFFLINE = '/offline.html';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable().catch(() => {});
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;           // API, payment providers, images on other hosts
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        return (await e.preloadResponse) || (await fetch(req));
      } catch {
        return (await caches.match(OFFLINE)) || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      }
    })());
    return;
  }
  if (url.pathname.startsWith('/_astro/')) {
    e.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
      return res;
    })());
  }
});
