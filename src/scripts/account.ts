// ============================================================
// CUSTOMER ACCOUNT CLIENT
// ============================================================
// Talks to /v1/account on the Merchant API.
//
// Two ways to stay signed in, chosen at build time:
//   PUBLIC_ACCOUNT_AUTH_MODE=cookie   production, on your own domain: the API sets an
//                                     HttpOnly cookie, nothing is kept in the page.
//   (unset / "bearer")                workers.dev, local dev: the session token is kept in
//                                     localStorage and sent as Authorization: Bearer.
// In cookie mode the storefront and the API must share a registrable domain
// (shop.com + api.shop.com) and the API needs STORE_ORIGINS / STORE_URL set.
// ============================================================

import { apiUrl } from './api';

const TOKEN_KEY = 'merchant_customer_session';
const HINT_KEY = 'merchant_customer_hint';

export const AUTH_MODE: 'cookie' | 'bearer' =
  import.meta.env.PUBLIC_ACCOUNT_AUTH_MODE === 'cookie' ? 'cookie' : 'bearer';

export type Customer = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  locale: 'fr' | 'en';
  accepts_marketing: boolean;
  email_verified: boolean;
  order_count: number;
  created_at: string;
};

export type OrderSummary = {
  number: string;
  status: string;
  created_at: string;
  currency: string;
  total_cents: number;
  amount_paid_cents: number;
  balance_cents: number;
  items: { title: string; qty: number }[];
};

export type OrderDetail = Omit<OrderSummary, 'items'> & {
  payment_method: string;
  due_at: string | null;
  service_status: string | null;
  items: { sku: string; title: string; qty: number; unit_price_cents: number; digital: boolean; can_download: boolean }[];
  amounts: { subtotal_cents: number; shipping_cents: number; tax_cents: number; discount_cents: number; total_cents: number; currency: string };
  shipping: { name: string | null; phone: string | null; address: Record<string, string> | null; label: string | null };
  tracking: { number: string; url: string | null; shipped_at: string | null } | null;
  pay_url: string | null;
};

export type Address = {
  id: string;
  label: string | null;
  is_default: boolean;
  name: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postal_code: string;
  country: string;
  phone: string | null;
};

export class AccountError extends Error {
  constructor(message: string, public status: number, public retryAfter?: number) {
    super(message);
  }
}

// ── Session ───────────────────────────────────────────────────

function readToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function writeToken(token: string | null) {
  try { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ }
}

/** Remembered only so the page can skip the sign-in form flash; the server is the source of truth. */
export function saveHint(c: Customer | null) {
  try {
    if (!c) localStorage.removeItem(HINT_KEY);
    else localStorage.setItem(HINT_KEY, JSON.stringify({ email: c.email, name: c.name, phone: c.phone }));
  } catch { /* ignore */ }
}
export function readHint(): { email: string; name: string | null; phone: string | null } | null {
  try { return JSON.parse(localStorage.getItem(HINT_KEY) || 'null'); } catch { return null; }
}

/** Could there be a session? (cookie mode cannot know until it asks the API) */
export function mayBeSignedIn(): boolean {
  return AUTH_MODE === 'cookie' ? readHint() !== null : readToken() !== null;
}

// ── Requests ──────────────────────────────────────────────────

async function req<T>(path: string, init: RequestInit = {}, signedIn = true): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init.headers as Record<string, string>) };
  if (signedIn && AUTH_MODE === 'bearer') {
    const t = readToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  let res: Response;
  try {
    res = await fetch(`${apiUrl()}/v1/account${path}`, {
      ...init,
      headers,
      credentials: AUTH_MODE === 'cookie' ? 'include' : 'omit',
    });
  } catch {
    throw new AccountError('network', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const retry = Number(res.headers.get('Retry-After')) || undefined;
    if (res.status === 401 && signedIn) { writeToken(null); saveHint(null); }
    throw new AccountError((data as any)?.error?.message || `error ${res.status}`, res.status, retry);
  }
  return data as T;
}

export const account = {
  requestLink(email: string, locale: 'fr' | 'en', turnstile_token?: string) {
    return req<{ ok: true; expires_in: number }>('/login-link', { method: 'POST', body: JSON.stringify({ email, locale, turnstile_token }) }, false);
  },
  async verify(body: { token: string } | { email: string; code: string }, locale: 'fr' | 'en') {
    const r = await req<{ ok: true; customer: Customer; session_token?: string }>(
      '/verify', { method: 'POST', body: JSON.stringify({ ...body, mode: AUTH_MODE, locale }) }, false
    );
    if (AUTH_MODE === 'bearer' && r.session_token) writeToken(r.session_token);
    saveHint(r.customer);
    return r.customer;
  },
  async me() {
    const r = await req<{ customer: Customer }>('/me');
    saveHint(r.customer);
    return r.customer;
  },
  async updateMe(patch: Partial<Pick<Customer, 'name' | 'phone' | 'locale' | 'accepts_marketing'>>) {
    const r = await req<{ customer: Customer }>('/me', { method: 'PATCH', body: JSON.stringify(patch) });
    saveHint(r.customer);
    return r.customer;
  },
  async logout() {
    try { await req('/logout', { method: 'POST' }); } catch { /* already gone */ }
    writeToken(null); saveHint(null);
  },
  async logoutAll() {
    try { await req('/logout-all', { method: 'POST' }); } finally { writeToken(null); saveHint(null); }
  },
  orders(cursor?: string) {
    return req<{ items: OrderSummary[]; pagination: { has_more: boolean; next_cursor: string | null } }>(
      `/orders?limit=10${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`
    );
  },
  order(number: string) {
    return req<{ order: OrderDetail }>(`/orders/${encodeURIComponent(number)}`).then((r) => r.order);
  },
  downloadLink(number: string, sku: string) {
    return req<{ download_url: string }>(`/orders/${encodeURIComponent(number)}/downloads`, { method: 'POST', body: JSON.stringify({ sku }) });
  },
  addresses() {
    return req<{ items: Address[] }>('/addresses').then((r) => r.items);
  },
  addAddress(a: Partial<Address> & { line1: string; city: string; country: string }) {
    return req<{ address: Address }>('/addresses', { method: 'POST', body: JSON.stringify(a) }).then((r) => r.address);
  },
  updateAddress(id: string, a: Partial<Address>) {
    return req<{ address: Address }>(`/addresses/${id}`, { method: 'PATCH', body: JSON.stringify(a) }).then((r) => r.address);
  },
  deleteAddress(id: string) {
    return req<{ ok: true }>(`/addresses/${id}`, { method: 'DELETE' });
  },
};
