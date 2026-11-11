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
  product_type: 'physical' | 'digital' | 'service';
  qty: number;
  image_url: string | null;
  /** The product variant title shown in the cart (e.g. "100ml / Lavender") */
  variant_title: string;
  /** Set when the visitor chose "Subscribe": the plan (see the Subscriptions module). The line is then priced at the plan price. */
  sub_plan?: SubPlanRef;
  /** The normal price of the variant, kept so a line can go back to it if the subscription is dropped. */
  base_price_cents?: number;
}

export interface SubPlanRef { id: string; name: string; price_cents: number; every_n: number; unit: 'week' | 'month' }

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
  if (item.sub_plan) {
    // One subscription per order: any other subscription line goes back to a normal purchase.
    for (const i of cart) if (i.sub_plan && i.sku !== item.sku) dropPlan(i);
    const line: CartLineItem = existing ?? { ...item, sub_plan: undefined, qty: 0 };
    if (!existing) cart.push(line);
    line.base_price_cents = line.sub_plan ? line.base_price_cents : item.price_cents;
    line.sub_plan = item.sub_plan; line.price_cents = item.sub_plan.price_cents; line.qty = Math.max(1, line.qty);
  } else if (existing) {
    if (existing.sub_plan) dropPlan(existing);
    existing.qty += 1;
  } else {
    cart.push({ ...item, qty: 1 });
  }
  saveCart(cart);
  updateCartBadge(cartItemCount(cart));
  return cart;
}

function dropPlan(i: CartLineItem): void {
  if (i.base_price_cents != null) i.price_cents = i.base_price_cents;
  delete i.sub_plan; delete i.base_price_cents;
}

/** Turn every subscription line back into a normal purchase (used when the shop no longer accepts the plan). */
export function dropSubPlans(): CartLineItem[] {
  const cart = getCart(); cart.forEach(dropPlan); saveCart(cart); return cart;
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
