// src/middleware.ts
// Edge-caches the rendered product pages (SSR mode) so most visits are served
// without re-fetching the catalog from the API.
//
// - Only GET /fr/produits/* and /en/products/* with a 200 HTML response is cached, for CACHE_SECONDS.
// - Uses the Cloudflare Cache API, which only works on a custom domain
//   (not on *.workers.dev) and in deployed Workers (not in `astro dev`).
//   Elsewhere it silently does nothing and pages are simply rendered each time.
// - Add ?nocache to a product URL to bypass the cache while debugging.
// - Cached pages are not used when PRODUCT_PAGES_MODE=static: those pages are
//   prerendered files and never reach this code at runtime.
import { defineMiddleware } from 'astro:middleware';

const CACHE_SECONDS = 60;

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, url } = context;

  const cache = (globalThis as { caches?: { default?: Cache } }).caches?.default;
  const cacheable =
    !!cache &&
    request.method === 'GET' &&
    (url.pathname.startsWith('/fr/produits/') || url.pathname.startsWith('/en/products/')) &&
    !url.searchParams.has('nocache');

  if (!cacheable || !cache) return next();

  // Ignore the query string (utm_*, fbclid…) so shared links hit the same entry.
  const key = new Request(`${url.origin}${url.pathname}`, { method: 'GET' });

  const hit = await cache.match(key);
  if (hit) {
    // A response from cache.match() has immutable headers, and Astro adds headers
    // to whatever the middleware returns -> "Can't modify immutable headers" (500).
    // Hand back a fresh, mutable copy instead.
    const fresh = new Response(hit.body, {
      status: hit.status,
      statusText: hit.statusText,
      headers: new Headers(hit.headers),
    });
    fresh.headers.set('X-Cache', 'HIT');
    return fresh;
  }

  const response = await next();
  const isHtml = (response.headers.get('content-type') ?? '').includes('text/html');
  if (response.status !== 200 || !isHtml) return response;

  const copy = response.clone();
  const cached = new Response(copy.body, {
    status: copy.status,
    statusText: copy.statusText,
    headers: new Headers(copy.headers),
  });
  cached.headers.set('Cache-Control', `public, s-maxage=${CACHE_SECONDS}`);

  const ctx = (context.locals as { runtime?: { ctx?: { waitUntil(p: Promise<unknown>): void } } }).runtime?.ctx;
  const putting = cache.put(key, cached);
  if (ctx?.waitUntil) ctx.waitUntil(putting);
  else await putting;

  return response;
});
