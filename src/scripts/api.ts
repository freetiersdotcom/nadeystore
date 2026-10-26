// ============================================================
// MERCHANT API CLIENT
// ============================================================
// Config is read directly from import.meta.env (baked in at
// build time by Vite). No window globals needed or used.
// ============================================================

// ── Config ────────────────────────────────────────────────────

export function apiUrl(): string {
  return import.meta.env.PUBLIC_MERCHANT_API_URL || 'http://localhost:8787';
}

export function publicKey(): string {
  return import.meta.env.PUBLIC_MERCHANT_PUBLIC_KEY || '';
}

export function currency(): string {
  return (import.meta.env.PUBLIC_MERCHANT_CURRENCY || 'XOF').toUpperCase();
}

export function provider(): 'fedapay' | 'stripe' {
  return (import.meta.env.PUBLIC_MERCHANT_PROVIDER as 'fedapay' | 'stripe') || 'fedapay';
}

// ── Base request ──────────────────────────────────────────────

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${apiUrl()}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${publicKey()}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error((data as any)?.error?.message || `API error ${res.status}`);
  }

  return data as T;
}

// ── Products ──────────────────────────────────────────────────

export interface Variant {
  id: string;
  sku: string;
  title: string;
  price_cents: number;
  image_url: string | null;
  weight_g: number;
  product_type: 'physical' | 'digital' | 'service';
  digital_asset_key: string | null;
  in_stock: boolean;
}

export interface Product {
  id: string;
  title: string;
  description: string | null;
  description_fr: string | null;
  description_en: string | null;
  slug: string | null;
  status: 'active' | 'draft';
  image_url: string | null;
  tags: string[] | null;
  video_url: string | null;
  created_at: string;
  variants: Variant[];
}

export async function getProducts(): Promise<Product[]> {
  const data = await request<{ items: Product[] }>('/v1/products');
  return data.items.filter((p) => p.status === 'active' && p.variants?.length > 0);
}

export async function getProduct(id: string): Promise<Product> {
  return request<Product>(`/v1/products/${id}`);
}

// ── Cart / Checkout ───────────────────────────────────────────

export interface CartItem {
  sku: string;
  title: string;
  qty: number;
  unit_price_cents: number;
  product_type: 'physical' | 'digital' | 'service';
}

export interface Cart {
  id: string;
  status: string;
  currency: string;
  customer_email: string;
  items: CartItem[];
  totals?: {
    subtotal_cents: number;
    discount_cents: number;
    shipping_cents: number;
    tax_cents: number;
    total_cents: number;
  };
  expires_at: string;
}

export async function createCart(customerEmail: string): Promise<Cart> {
  return request<Cart>('/v1/carts', {
    method: 'POST',
    body: JSON.stringify({
      customer_email: customerEmail,
      locale: typeof window !== 'undefined' && window.location.pathname.startsWith('/en') ? 'en' : 'fr',
      currency: currency(),   // ← was missing; caused FedaPay currency mismatch
    }),
  });
}

export async function addCartItems(
  cartId: string,
  items: Array<{ sku: string; qty: number }>
): Promise<Cart> {
  return request<Cart>(`/v1/carts/${cartId}/items`, {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}

export async function setCartShipping(
  cartId: string,
  address: {
    name?: string;
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postal_code?: string;
    phone?: string;   // international format, e.g. +22901610000000
    country: string;
  }
): Promise<{ ok: true }> {
  return request<{ ok: true }>(`/v1/carts/${cartId}/shipping`, {
    method: 'PATCH',
    body: JSON.stringify({
      ...address,
      postal_code: address.postal_code ?? '',
    }),
  });
}

/** Services only (no delivery address): keeps a phone number on the cart for the appointment. */
export async function setCartContact(cartId: string, phone: string): Promise<{ ok: true }> {
  return request<{ ok: true }>(`/v1/carts/${cartId}/contact`, {
    method: 'PATCH',
    body: JSON.stringify({ phone }),
  });
}

export async function applyDiscount(
  cartId: string,
  code: string
): Promise<{ discount: { code: string; type: string; amount_cents: number }; totals: Cart['totals'] }> {
  return request(`/v1/carts/${cartId}/discount`, {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

// ── FedaPay checkout ──────────────────────────────────────────

export interface FedaPayCheckoutResult {
  checkout_url: string;
  transaction_id: number;
  cart_id: string;
}

export async function fedaPayCheckout(
  cartId: string,
  successUrl: string,
  cancelUrl: string
): Promise<FedaPayCheckoutResult> {
  return request<FedaPayCheckoutResult>(`/v1/carts/${cartId}/checkout/fedapay`, {
    method: 'POST',
    body: JSON.stringify({ success_url: successUrl, cancel_url: cancelUrl }),
  });
}

// ── Stripe checkout ───────────────────────────────────────────

export interface StripeCheckoutResult {
  checkout_url: string;
  stripe_checkout_session_id: string;
}

export async function stripeCheckout(
  cartId: string,
  successUrl: string,
  cancelUrl: string,
  options: { collectShipping?: boolean; shippingCountries?: string[] } = {}
): Promise<StripeCheckoutResult> {
  return request<StripeCheckoutResult>(`/v1/carts/${cartId}/checkout`, {
    method: 'POST',
    body: JSON.stringify({
      success_url: successUrl,
      cancel_url: cancelUrl,
      collect_shipping: options.collectShipping ?? false,
      shipping_countries: options.shippingCountries ?? ['BJ', 'FR', 'GB', 'BE', 'CA'],
    }),
  });
}

// ── Pay on delivery ───────────────────────────────────────────

/** ISO country codes where pay-on-delivery is offered (PUBLIC_COD_COUNTRIES, default "BJ"; empty = off). */
export function codCountries(): string[] {
  const raw = (import.meta.env.PUBLIC_COD_COUNTRIES as string | undefined) ?? 'BJ';
  return raw.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
}

export interface CodCheckoutResult {
  order_number: string;
  cart_id: string;
  status: 'pending';
  payment_method: 'cod';
}

export async function codCheckout(cartId: string): Promise<CodCheckoutResult> {
  return request<CodCheckoutResult>(`/v1/carts/${cartId}/checkout/cod`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

// ── Deposits & installments ───────────────────────────────────

export interface DepositQuote {
  eligible: boolean;
  reason?: string;
  total_cents: number;
  deposit_cents: number;
  balance_cents: number;
  currency: string;
  due_days: number;
}

/** What the customer would pay now for these items (cart is local until checkout). */
export async function depositPreview(items: { sku: string; qty: number }[], shippingCents = 0): Promise<DepositQuote> {
  return request<DepositQuote>('/v1/carts/deposit-preview', {
    method: 'POST',
    body: JSON.stringify({ items, currency: currency(), shipping_cents: shippingCents > 0 ? shippingCents : undefined }),
  });
}

export async function depositCheckout(
  cartId: string,
  successUrl: string,
  cancelUrl?: string,
  preferredProvider?: string
): Promise<{ checkout_url: string; provider: string; ref: string; cart_id: string; deposit_cents: number; balance_cents: number }> {
  return request(`/v1/carts/${cartId}/checkout/deposit`, {
    method: 'POST',
    body: JSON.stringify({ success_url: successUrl, cancel_url: cancelUrl, provider: preferredProvider }),
  });
}

export interface PayInfo {
  order_number: string;
  status: string;
  currency: string;
  minor_factor: number;
  total_cents: number;
  paid_cents: number;
  balance_cents: number;
  due_at: string | null;
  overdue: boolean;
  can_pay: boolean;
  min_payment_cents: number;
  items: { title: string; qty: number; unit_price_cents: number }[];
  payments: { amount_cents: number; method: string; created_at: string }[];
}

export async function getPayInfo(token: string): Promise<PayInfo> {
  return request<PayInfo>(`/v1/pay/${encodeURIComponent(token)}`);
}

export async function payBalance(
  token: string,
  successUrl: string,
  amountCents?: number,
  cancelUrl?: string,
  preferredProvider?: string
): Promise<{ checkout_url: string; provider: string; ref: string; amount_cents: number }> {
  return request(`/v1/pay/${encodeURIComponent(token)}/checkout`, {
    method: 'POST',
    body: JSON.stringify({ success_url: successUrl, amount_cents: amountCents, cancel_url: cancelUrl, provider: preferredProvider }),
  });
}

// ── Appointments (services with online booking) ───────────────

export interface BookingSlot { start: string; end: string; available: boolean }
export interface BookingSlots {
  bookable: boolean;
  duration_min?: number;
  tz?: string;
  slots: BookingSlot[];
}

/** Candidate time slots of a service, each flagged available or busy. Not bookable → { bookable: false }. */
export async function getBookingSlots(sku: string, days = 45): Promise<BookingSlots> {
  return request<BookingSlots>(`/v1/bookings/slots?sku=${encodeURIComponent(sku)}&days=${days}`);
}

/** Holds a slot for a cart (a few minutes, extended once payment starts). Errors carry `.code` ('slot_taken'…) and `.status`. */
export async function holdBookingSlot(cartId: string, sku: string, start: string, customerTz?: string): Promise<{ id: string; start: string; end: string }> {
  const res = await fetch(`${apiUrl()}/v1/bookings/hold`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${publicKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ cart_id: cartId, sku, start, customer_tz: customerTz }),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(data?.error?.message || `API error ${res.status}`);
    err.code = data?.error?.code;
    err.status = res.status;
    throw err;
  }
  return data;
}

// ── Shipping ──────────────────────────────────────────────────

export interface ShippingOption {
  id: string;
  kind: 'flat' | 'weight' | 'pickup';
  name_fr: string;
  name_en: string;
  cents: number;
  free: boolean;
  min_days: number | null;
  max_days: number | null;
  pickup_address: string | null;
}

export interface ShippingQuote {
  enabled: boolean;
  needed: boolean;
  deliverable: boolean;
  reason?: 'no_zone' | 'too_heavy' | 'currency' | 'no_address';
  currency: string;
  weight_g: number;
  estimated: boolean;
  options: ShippingOption[];
}

/** Delivery options and prices for these items and this destination (the cart is local until checkout). */
export async function shippingQuote(
  items: { sku: string; qty: number }[],
  dest: { country: string; city?: string; state?: string },
  discountCents = 0
): Promise<ShippingQuote> {
  return request<ShippingQuote>('/v1/carts/shipping-quote', {
    method: 'POST',
    body: JSON.stringify({ items, currency: currency(), ...dest, discount_cents: discountCents > 0 ? discountCents : undefined }),
  });
}

/** Chooses one of the quoted delivery options for the server-side cart (after the address is set). */
export async function setCartShippingMethod(cartId: string, rateId: string): Promise<{ rate_id: string | null; label: string | null; shipping_cents: number }> {
  return request(`/v1/carts/${cartId}/shipping-method`, {
    method: 'PATCH',
    body: JSON.stringify({ rate_id: rateId }),
  });
}
