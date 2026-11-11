// Milestone payments (module "Milestone payments" on the API). On the payment page the customer sees the whole
// schedule; the amount to pay now is the stage the merchant has requested. Without a schedule (or with the module
// off) nothing changes on the page.
import { apiUrl } from './api';
import { formatPrice } from './cart';

type Stage = { pos: number; label: string; amount_cents: number; expected_on: string | null; status: 'paid' | 'due' | 'upcoming'; paid_cents: number };
type Sched = { currency: string; total_cents: number; paid_cents: number; due_now_cents: number; note: string | null; stages: Stage[] };

const L = {
  fr: { title: 'Calendrier de paiement', paid: 'Payée', due: 'À régler', upcoming: 'À venir', expected: 'prévue le', later: 'Vous recevrez un lien de paiement à chaque étape atteinte.', nothing: 'Aucun paiement n’est demandé pour le moment. Vous recevrez un lien quand la prochaine étape sera atteinte.', hint: (a: string) => `Étape à régler : ${a}. Vous pouvez modifier le montant.` },
  en: { title: 'Payment schedule', paid: 'Paid', due: 'Due now', upcoming: 'Upcoming', expected: 'expected', later: 'You will receive a payment link when each stage is reached.', nothing: 'No payment is requested right now. You will get a link when the next stage is reached.', hint: (a: string) => `Stage due now: ${a}. You can change the amount.` },
};
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export async function showMilestones(token: string, factor: number, amount: HTMLInputElement, hint: HTMLElement, form: HTMLElement, locale: 'fr' | 'en'): Promise<void> {
  document.getElementById('ms-box')?.remove();
  let s: Sched | null = null;
  try {
    const r = await fetch(`${apiUrl()}/m/milestones/pay/${encodeURIComponent(token)}`);
    if (r.ok) { const d = (await r.json()) as Sched; if (d.stages?.length) s = d; }
  } catch { /* the page works without it */ }
  if (!s) return;
  const t = L[locale];
  const date = (iso: string) => new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'fr-FR', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(iso + 'T00:00:00Z'));
  const box = document.createElement('div');
  box.id = 'ms-box'; box.className = 'mb-6'; box.setAttribute('data-testid', 'ms-box');
  box.innerHTML = `<h2 class="text-sm font-semibold text-default mb-2">${t.title}</h2><ul class="space-y-1 text-sm">` + s.stages.map((x) => {
    const c = x.status === 'paid' ? 'text-green-700' : x.status === 'due' ? 'text-amber-700 font-medium' : 'text-muted';
    return `<li class="flex justify-between gap-3 border-b border-gray-100 dark:border-slate-800 py-1.5"><span class="text-default">${x.pos}. ${esc(x.label)}${x.expected_on && x.status !== 'paid' ? `<br><span class="text-xs text-muted">${t.expected} ${date(x.expected_on)}</span>` : ''}</span><span class="text-right whitespace-nowrap">${formatPrice(x.amount_cents, s!.currency)}<br><span class="text-xs ${c}">${t[x.status]}</span></span></li>`;
  }).join('') + `</ul><p class="text-xs text-muted mt-2">${t.later}</p>`;
  form.parentElement?.insertBefore(box, form);
  if (s.due_now_cents > 0) {
    amount.value = String(s.due_now_cents / factor);
    hint.textContent = t.hint(formatPrice(s.due_now_cents, s.currency));
    form.style.display = '';
  } else {
    // Nothing requested yet: no payment form, only the schedule and a note.
    form.style.display = 'none';
    const note = document.createElement('p'); note.className = 'text-sm text-muted'; note.textContent = t.nothing; box.appendChild(note);
  }
}
