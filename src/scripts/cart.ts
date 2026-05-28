// ============================================================
// CART STORE
// ============================================================
// Cart lives entirely in localStorage until checkout.
// No backend cart is created until the user submits an email
// and initiates payment.
//
// Shape stored in localStorage:
//   merchant_cart: CartLineItem[]
//
// The backend is never touched during browsing or cart edits.
// ============================================================

export interface CartLineItem {
  sku: string;
  title: string;
  price_cents: number;
  product_type: 'physical' | 'digital';
  qty: number;
  image_url: string | null;
  /** The product variant title shown in the cart (e.g. "100ml / Lavender") */
  variant_title: string;
}

const CART_KEY = 'merchant_cart';

// ── Persistence ───────────────────────────────────────────────

export function getCart(): CartLineItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartLineItem[]) : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartLineItem[]): void {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function clearCart(): void {
  localStorage.removeItem(CART_KEY);
  updateCartBadge(0);
}

// ── Mutations ─────────────────────────────────────────────────

export function addToCart(item: Omit<CartLineItem, 'qty'>): CartLineItem[] {
  const cart = getCart();
  const existing = cart.find((i) => i.sku === item.sku);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...item, qty: 1 });
  }
  saveCart(cart);
  updateCartBadge(cartItemCount(cart));
  return cart;
}

export function updateQty(sku: string, qty: number): CartLineItem[] {
  let cart = getCart();
  if (qty <= 0) {
    cart = cart.filter((i) => i.sku !== sku);
  } else {
    const item = cart.find((i) => i.sku === sku);
    if (item) item.qty = qty;
  }
  saveCart(cart);
  updateCartBadge(cartItemCount(cart));
  return cart;
}

export function removeFromCart(sku: string): CartLineItem[] {
  const cart = getCart().filter((i) => i.sku !== sku);
  saveCart(cart);
  updateCartBadge(cartItemCount(cart));
  return cart;
}

// ── Computed ──────────────────────────────────────────────────

export function cartItemCount(cart: CartLineItem[] = getCart()): number {
  return cart.reduce((sum, i) => sum + i.qty, 0);
}

export function cartSubtotal(cart: CartLineItem[] = getCart()): number {
  return cart.reduce((sum, i) => sum + i.price_cents * i.qty, 0);
}

export function cartHasPhysical(cart: CartLineItem[] = getCart()): boolean {
  return cart.some((i) => i.product_type === 'physical');
}

// ── Badge ─────────────────────────────────────────────────────

export function updateCartBadge(count?: number): void {
  const badge = document.getElementById('cart-count');
  if (!badge) return;
  const n = count ?? cartItemCount();
  badge.textContent = String(n);
  badge.style.display = n > 0 ? 'flex' : 'none';
}

// ── Currency formatting ───────────────────────────────────────

const ZERO_DECIMAL_CURRENCIES = new Set(['XOF', 'GNF', 'JPY', 'KRW', 'VND']);

export function formatPrice(amount: number, currency = 'XOF'): string {
  const cur = (currency || 'XOF').toUpperCase();
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(cur);
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: cur,
    minimumFractionDigits: isZeroDecimal ? 0 : 2,
    maximumFractionDigits: isZeroDecimal ? 0 : 2,
  }).format(isZeroDecimal ? amount : amount / 100);
}
