// Offers (module "Offers" on the API): suggestion cards in the cart, "with this, add that", with an optional discount.
// The browser only shows and remembers the choice. At checkout the shop confirms each offer (attach) and sets the price itself.
// With the module off, or no offer fitting, nothing is shown.
import { apiUrl, currency } from './api';
import { addOfferToCart, dropOffers, formatPrice, getCart } from './cart';

export interface OfferItem {
  id: string; headline: string | null; sku: string; title: string; product_title: string; image_url: string | null; slug: string | null;
  product_type: 'physical' | 'digital' | 'service'; price_cents: number; discounted_cents: number; discount_pct: number; max_qty: number; currency: string;
}

const L = {
  fr: { title: 'Complétez votre commande', add: 'Ajouter', off: (n: number) => `-${n} %` },
  en: { title: 'Complete your order', add: 'Add', off: (n: number) => `${n}% off` },
};

export async function fetchOffers(skus: string[], locale: 'fr' | 'en'): Promise<OfferItem[]> {
  if (!skus.length) return [];
  try {
    const r = await fetch(`${apiUrl()}/m/offers/match?skus=${encodeURIComponent(skus.join(','))}&lang=${locale}&limit=3`);
    if (!r.ok) return [];
    return ((await r.json()) as { items?: OfferItem[] }).items ?? [];
  } catch { return []; }
}

/** Ask the shop to confirm the offers in this cart (it prices those lines). Returns the offer ids it refused; on any failure, all of them. */
export async function attachOffers(cartId: string, offerIds: string[]): Promise<string[]> {
  if (!offerIds.length) return [];
  try {
    const r = await fetch(`${apiUrl()}/m/offers/attach`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cart_id: cartId, offer_ids: offerIds }) });
    if (!r.ok) return offerIds;
    const d = (await r.json()) as { refused?: string[] };
    return d.refused ?? [];
  } catch { return offerIds; }
}

function markSeen(items: OfferItem[]): void {
  try {
    const key = 'merchant_offers_seen'; const done: string[] = JSON.parse(sessionStorage.getItem(key) ?? '[]');
    const fresh = items.map((i) => i.id).filter((id) => !done.includes(id));
    if (!fresh.length) return;
    sessionStorage.setItem(key, JSON.stringify([...done, ...fresh]));
    void fetch(`${apiUrl()}/m/offers/seen`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ offer_ids: fresh }) }).catch(() => {});
  } catch { /* the cart works without it */ }
}

/** Fill `box` with the offers that fit the cart; `onAdd` is called after the visitor adds one (re-render the cart there). */
export async function showOffers(box: HTMLElement, locale: 'fr' | 'en', onAdd: () => void): Promise<void> {
  const cart = getCart();
  const items = (await fetchOffers(cart.map((i) => i.sku), locale)).filter((o) => !cart.some((i) => i.sku === o.sku));
  box.textContent = '';
  if (!items.length) return;
  const t = L[locale];
  const h = document.createElement('h2'); h.className = 'text-sm font-semibold text-default mb-3'; h.textContent = t.title; box.appendChild(h);
  const list = document.createElement('div'); list.className = 'space-y-3'; box.appendChild(list);
  for (const o of items) {
    const row = document.createElement('div'); row.className = 'flex items-center gap-3 border border-gray-200 dark:border-slate-700 rounded-xl p-3'; row.setAttribute('data-testid', 'offer-card');
    if (o.image_url) { const img = document.createElement('img'); img.src = o.image_url; img.alt = ''; img.loading = 'lazy'; img.className = 'w-14 h-14 rounded-lg object-cover bg-gray-100 dark:bg-slate-800 shrink-0'; row.appendChild(img); }
    const txt = document.createElement('div'); txt.className = 'min-w-0 flex-1';
    const name = document.createElement('p'); name.className = 'text-sm font-medium text-default truncate'; name.textContent = o.headline || o.product_title; txt.appendChild(name);
    const price = document.createElement('p'); price.className = 'text-xs text-muted';
    if (o.discount_pct > 0) {
      const old = document.createElement('s'); old.textContent = formatPrice(o.price_cents, currency()); price.appendChild(old);
      price.appendChild(document.createTextNode(' '));
      const now = document.createElement('span'); now.className = 'font-semibold text-default'; now.textContent = `${formatPrice(o.discounted_cents, currency())} · ${t.off(o.discount_pct)}`; price.appendChild(now);
    } else price.textContent = formatPrice(o.price_cents, currency());
    txt.appendChild(price); row.appendChild(txt);
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn-primary px-4 py-2 text-sm rounded-lg shrink-0'; b.textContent = t.add; b.setAttribute('data-testid', 'offer-add');
    b.addEventListener('click', () => {
      addOfferToCart({ sku: o.sku, title: o.product_title, price_cents: o.discounted_cents, product_type: o.product_type, image_url: o.image_url, variant_title: o.title }, { id: o.id, pct: o.discount_pct }, o.price_cents);
      onAdd();
    });
    row.appendChild(b); list.appendChild(row);
  }
  markSeen(items);
}

export { dropOffers };
