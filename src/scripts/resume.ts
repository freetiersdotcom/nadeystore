// Abandoned-cart recovery: the reminder e-mail links to /panier?resume=<token> (or /cart?resume=<token>).
// This puts the saved items back in the local cart, then removes the token from the address bar.
// Does nothing when the module is off or the token is unknown. A customer who already has items keeps them
// (we only add what is missing), so following an old e-mail never wipes a cart in progress.
import { apiUrl } from './api';
import type { CartLineItem } from './cart';

const CART_KEY = 'merchant_cart';

export async function applyResume(): Promise<boolean> {
  const url = new URL(window.location.href);
  const token = url.searchParams.get('resume');
  if (!token) return false;
  url.searchParams.delete('resume');
  window.history.replaceState({}, '', url.pathname + (url.search ? url.search : '') + url.hash);
  try {
    const res = await fetch(`${apiUrl()}/m/recovery/resume/${encodeURIComponent(token)}`);
    if (!res.ok) return false;
    const data = await res.json() as { items: CartLineItem[] };
    if (!Array.isArray(data.items) || data.items.length === 0) return false;
    let cart: CartLineItem[] = [];
    try { cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]') as CartLineItem[]; } catch { cart = []; }
    for (const it of data.items) if (!cart.some((c) => c.sku === it.sku)) cart.push(it);
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    return true;
  } catch { return false; }
}
