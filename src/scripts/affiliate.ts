// Affiliate links: a visitor who arrives with ?ref=CODE is remembered for 30 days (localStorage), and the
// cart they later check out with is reported to the API, which credits the affiliate once the order is paid.
// Does nothing unless the shop has switched the Affiliates module on (the API then answers 404).
const KEY = 'affiliate_ref';
const DAYS = 30;

export function captureRef(): void {
  try {
    const code = new URLSearchParams(window.location.search).get('ref')?.trim().toUpperCase();
    if (!code || !/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(code)) return;
    localStorage.setItem(KEY, JSON.stringify({ code, at: Date.now() }));
  } catch { /* private mode: no tracking, nothing breaks */ }
}

export function storedRef(): string | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (v?.code && Date.now() - Number(v.at) < DAYS * 86_400_000) return String(v.code);
  } catch { /* ignore */ }
  return null;
}

/** Tell the API which affiliate sent this cart. Never blocks or breaks checkout. */
export async function attachAffiliate(apiUrl: string, cartId: string): Promise<void> {
  const ref = storedRef();
  if (!ref) return;
  try {
    await fetch(`${apiUrl}/m/affiliates/attach`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cart_id: cartId, ref }), keepalive: true,
    });
  } catch { /* ignore */ }
}
