// WiFi vouchers: show the buyer's code(s) on the confirmation page.
// Does nothing when the module is off or the order holds no vouchers (the API answers 404 / "none").
import { apiUrl } from './api';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const T = {
  fr: { title: 'Votre accès WiFi', user: 'Identifiant', pass: 'Mot de passe', wait: 'Paiement reçu. Votre code est en cours de préparation : cette page se met à jour toute seule.', keep: 'Gardez ce code, il ne sera pas redonné.' },
  en: { title: 'Your WiFi access', user: 'Username', pass: 'Password', wait: 'Payment received. Your code is being prepared: this page updates by itself.', keep: 'Keep this code, it will not be given again.' },
};

export async function showVouchers(cartId: string, lang: 'fr' | 'en', attempt = 0, digitalLines = 0): Promise<void> {
  const box = document.getElementById('voucher-box');
  if (!box) return;
  try {
    const res = await fetch(`${apiUrl()}/m/vouchers/by-cart/${encodeURIComponent(cartId)}?lang=${lang}`);
    if (!res.ok) return;
    const v = await res.json() as { status: string; items: { title: string; qty: number; waiting: number; instructions: string | null; codes: { username: string; password: string }[] }[] };
    if (v.status === 'none' || v.status === 'unpaid' || v.status === 'withdrawn' || !v.items.length) return;
    const t = T[lang];
    let html = `<h2 class="text-base font-semibold mb-2">${esc(t.title)}</h2>`;
    for (const it of v.items) {
      html += `<p class="text-sm text-muted mt-3">${esc(it.title)}${it.qty > 1 ? ` × ${it.qty}` : ''}</p>`;
      for (const c of it.codes) html += `<div class="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 p-3 my-2 font-mono text-lg break-all" style="user-select:all"><div class="text-[11px] uppercase font-sans text-muted">${esc(t.user)}</div>${esc(c.username)}${c.password ? `<div class="text-[11px] uppercase font-sans text-muted mt-2">${esc(t.pass)}</div>${esc(c.password)}` : ''}</div>`;
      if (it.waiting > 0) html += `<p class="text-sm">${esc(t.wait)}</p>`;
      else if (it.instructions) html += `<p class="text-sm whitespace-pre-wrap border-l-4 border-emerald-600 pl-3 my-2">${esc(it.instructions)}</p>`;
    }
    if (v.status === 'ready') html += `<p class="text-xs text-muted">${esc(t.keep)}</p>`;
    box.innerHTML = html; box.style.display = 'block';
    // Vouchers are digital items with nothing to download: when they are all the digital items, hide the "download links sent" notice.
    if (v.items.length >= digitalLines) { const n = document.getElementById('digital-notice'); if (n) n.style.display = 'none'; }
    if (v.status === 'waiting' && attempt < 20) setTimeout(() => void showVouchers(cartId, lang, attempt + 1, digitalLines), 15000);
  } catch { /* the order page still works without it */ }
}
