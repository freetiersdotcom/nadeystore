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
  product_type: 'physical' | 'digital';
  digital_asset_key: string | null;
}

export interface Product {
  id: string;
  title: string;
  description: string | null;
  slug: string | null;
  status: 'active' | 'draft';
  image_url: string | null;
  tags: string[] | null;
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
  product_type: 'physical' | 'digital';
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