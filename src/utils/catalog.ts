// src/utils/catalog.ts
// Server-side access to the public product catalog, used by SSR pages.
//
// The product list is cached in memory for a few seconds per Worker isolate so
// a burst of visitors doesn't turn into a burst of API calls. A product edit in
// the admin is therefore visible on the product page within TTL_MS.
import type { Product } from '~/scripts/api';

const TTL_MS = 30_000;

let cache: { at: number; items: Product[] } | null = null;

export async function getActiveProducts(): Promise<Product[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.items;

  const API_URL = import.meta.env.PUBLIC_MERCHANT_API_URL ?? 'http://localhost:8787';
  const API_KEY = import.meta.env.PUBLIC_MERCHANT_PUBLIC_KEY ?? 'pk_your_public_key_here';

  try {
    const res = await fetch(`${API_URL}/v1/products`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    if (!res.ok) throw new Error(`Catalog request failed: ${res.status}`);
    const data = (await res.json()) as { items: Product[] };
    const items = data.items.filter((p) => p.status === 'active' && p.variants?.length > 0);
    cache = { at: Date.now(), items };
    return items;
  } catch (e) {
    // Serve slightly stale data rather than an error page if the API blips.
    if (cache) return cache.items;
    throw e;
  }
}

export function findProductBySlug(products: Product[], slug: string | undefined): Product | undefined {
  if (!slug) return undefined;
  return products.find((p) => (p.slug || p.id) === slug);
}

// Related products, ranked for relevance (kit 38).
//  - only the same kind of product (a shop item never suggests a WiFi voucher or a coaching session, and vice versa);
//  - only products that can be bought now (at least one variant in stock);
//  - ranked by number of shared tags, then closest price, then newest;
//  - when few products share tags, the list is filled with the closest-priced products of the same kind.
type Kind = 'physical' | 'digital' | 'service';
function kindOf(p: Product): Kind {
  const t = new Set((p.variants ?? []).map((v) => v.product_type));
  if (t.size === 1) return [...t][0] as Kind;
  return t.has('physical') ? 'physical' : t.has('service') ? 'service' : 'digital';
}
const fromPrice = (p: Product) => Math.min(...(p.variants ?? []).map((v) => v.price_cents));
const buyable = (p: Product) => (p.variants ?? []).some((v) => v.in_stock !== false);

export function getRelatedProducts(products: Product[], product: Product, limit = 4): Product[] {
  const tags = new Set((product.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean));
  const kind = kindOf(product);
  const base = fromPrice(product);
  const scored = products
    .filter((p) => p.id !== product.id && kindOf(p) === kind && buyable(p))
    .map((p) => ({
      p,
      shared: (p.tags ?? []).filter((t) => tags.has(t.trim().toLowerCase())).length,
      gap: Number.isFinite(base) && Number.isFinite(fromPrice(p)) ? Math.abs(Math.log((fromPrice(p) + 1) / (base + 1))) : 0,
    }));
  scored.sort((a, b) => b.shared - a.shared || a.gap - b.gap || (b.p.created_at ?? '').localeCompare(a.p.created_at ?? '') || a.p.id.localeCompare(b.p.id));
  return scored.slice(0, limit).map((x) => x.p);
}
