// ============================================================
// CHECKOUT PREFILL FOR SIGNED-IN CUSTOMERS
// ============================================================
// Imported by the cart page. If the visitor has an account session, the email box and the
// delivery form are filled with their details. It never overwrites anything already typed,
// does nothing when signed out, and a failure leaves the form exactly as it was.

import { account, mayBeSignedIn, readHint } from './account';
import { COUNTRIES, dialOf } from './geo';

declare global {
  interface Window { promptEmail?: () => Promise<string | null> }
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;
const empty = (el: HTMLInputElement | HTMLSelectElement | null) => !!el && !el.value.trim();

function setValue(el: HTMLInputElement | HTMLSelectElement | null, value: string | null | undefined, fire = false) {
  if (!el || !value || !empty(el)) return;
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  if (fire) el.dispatchEvent(new Event('change', { bubbles: true }));
}

/** "+2290161000000" -> { iso: 'BJ', national: '0161000000' }, preferring the address's own country. */
function splitPhone(e164: string, preferIso: string): { iso: string; national: string } | null {
  const digits = e164.replace(/\D/g, '');
  if (!e164.startsWith('+') || digits.length < 6) return null;
  const hits = COUNTRIES.filter((c) => digits.startsWith(c.dial)).sort((a, b) => b.dial.length - a.dial.length);
  if (!hits.length) return null;
  const longest = hits[0].dial.length;
  const same = hits.filter((c) => c.dial.length === longest);
  const pick = same.find((c) => c.iso === preferIso) ?? same[0];
  return { iso: pick.iso, national: digits.slice(pick.dial.length) };
}

function untilReady<T>(find: () => T | null, ms = 4000): Promise<T | null> {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const tick = () => {
      const v = find();
      if (v) return resolve(v);
      if (Date.now() - t0 > ms) return resolve(null);
      setTimeout(tick, 100);
    };
    tick();
  });
}

async function run() {
  if (!mayBeSignedIn()) return;
  const hint = readHint();

  // The email box opens pre-filled with the account's address (still editable).
  // (The email modal is re-created on page changes, so wrap whichever copy is current, once.)
  const original = window.promptEmail as (Window['promptEmail'] & { __acct?: boolean }) | undefined;
  if (original && !original.__acct && hint?.email) {
    const wrapped = (() => {
      const p = original();
      const input = $<HTMLInputElement>('modal-email');
      if (input && empty(input)) input.value = hint.email;
      return p;
    }) as NonNullable<Window['promptEmail']> & { __acct?: boolean };
    wrapped.__acct = true;
    window.promptEmail = wrapped;
  }

  // Only the cart page has these fields; anywhere else there is nothing to fill.
  if (!$('ship-name') && !$('ship-line1')) return;

  try {
    const [me, addresses] = await Promise.all([account.me(), account.addresses()]);
    const a = addresses.find((x) => x.is_default) ?? addresses[0];
    // The country list is filled in by the cart script, so wait for it.
    const country = await untilReady(() => {
      const s = $<HTMLSelectElement>('ship-country');
      return s && s.options.length > 2 ? s : null;
    });
    setValue($<HTMLInputElement>('ship-name'), a?.name || me.name);
    if (!a) return;
    setValue($<HTMLInputElement>('ship-line1'), a.line1);
    setValue($<HTMLInputElement>('ship-line2'), a.line2);
    setValue($<HTMLInputElement>('ship-city'), a.city);
    setValue($<HTMLInputElement>('ship-state'), a.state);
    setValue($<HTMLInputElement>('ship-postal'), a.postal_code);
    if (country) setValue(country, a.country, true);
    const phone = a.phone || me.phone;
    const parts = phone ? splitPhone(phone, a.country) : null;
    if (parts && empty($<HTMLInputElement>('ship-phone'))) {
      const dial = $<HTMLSelectElement>('ship-dial');
      if (dial && dialOf(parts.iso)) { dial.value = parts.iso; dial.dataset.touched = '1'; dial.dispatchEvent(new Event('change', { bubbles: true })); }
      setValue($<HTMLInputElement>('ship-phone'), parts.national);
    }
  } catch {
    /* signed out, offline, or the API is down: the form simply stays as it was */
  }
}

if (typeof window !== 'undefined') {
  // The site uses Astro's ClientRouter: this module is only evaluated once, but the cart page
  // is swapped in on every visit. 'astro:page-load' fires on the first load and after every
  // navigation, so the form is filled however the visitor arrived.
  const start = () => { void run(); };
  document.addEventListener('astro:page-load', start);
  // Loaded after the first page-load event already fired? Fill now too (filling twice is harmless).
  if (document.readyState !== 'loading') start();
}
