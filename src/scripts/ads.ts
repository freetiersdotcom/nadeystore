// Ad tracking (module "Ad tracking" on the API). The campaign a visitor came from is kept in this browser for 30 days,
// but ONLY after they accepted measurement cookies (see ConsentBanner / Tracking). When the cart is created it is reported
// to the API so the order carries its source. Never blocks or breaks checkout; does nothing while the module is off (404).
const KEY = 'sn_attr';

export const hasConsent = (): boolean => {
  try { return localStorage.getItem('sn_consent') === 'granted'; } catch { return false; }
};

const cookie = (name: string): string => {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : '';
};

export async function attachAds(apiUrl: string, cartId: string): Promise<void> {
  if (!hasConsent()) return;
  try {
    const a = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!a || Date.now() - Number(a.at) > 30 * 86_400_000) return;
    const body: Record<string, string> = { cart_id: cartId, fbp: cookie('_fbp'), ttp: cookie('_ttp') };
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'referrer', 'click_id_type', 'click_id']) if (a[k]) body[k] = String(a[k]);
    // Full address of the landing page (the server sends it to the ad platforms as the page where the sale started).
    if (a.landing) body.landing = window.location.origin + String(a.landing);
    await fetch(`${apiUrl}/m/ads/attach`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: true });
  } catch { /* ignore */ }
}
