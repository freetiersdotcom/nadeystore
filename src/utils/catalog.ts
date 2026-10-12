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

// Related: same tags, excluding self. Falls back to the first 3 other products.
export function getRelatedProducts(products: Product[], product: Product): Product[] {
  const tags = product.tags ?? [];
  const related = products.filter(
    (p) => p.id !== product.id && tags.length > 0 && (p.tags ?? []).some((t) => tags.includes(t))
  );
  if (related.length === 0) return products.filter((p) => p.id !== product.id).slice(0, 3);
  return related.slice(0, 4);
}
