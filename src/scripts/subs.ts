// Subscriptions (module "Subscriptions" on the API). When a product variant has plans, the product page offers
// "One-time purchase" or "Subscribe". Nothing shows up while the module is off or the variant has no plan:
// the plans request just returns nothing (or 404) and the page stays exactly as it was.
import { apiUrl, currency } from './api';
import { formatPrice, type SubPlanRef } from './cart';

type Plan = SubPlanRef & { max_cycles: number | null };
const isEn = () => typeof window !== 'undefined' && (window.location.pathname === '/en' || window.location.pathname.startsWith('/en/'));
const cache = new Map<string, Plan[]>();

export function everyLabel(p: { every_n: number; unit: 'week' | 'month' }, en = isEn()): string {
  const n = p.every_n;
  if (en) return p.unit === 'week' ? (n === 1 ? 'every week' : `every ${n} weeks`) : n === 1 ? 'every month' : `every ${n} months`;
  return p.unit === 'week' ? (n === 1 ? 'chaque semaine' : `toutes les ${n} semaines`) : n === 1 ? 'chaque mois' : `tous les ${n} mois`;
}

async function plansFor(sku: string): Promise<Plan[]> {
  if (cache.has(sku)) return cache.get(sku)!;
  let items: Plan[] = [];
  try {
    const r = await fetch(`${apiUrl()}/m/subs/plans?sku=${encodeURIComponent(sku)}`);
    if (r.ok) items = ((await r.json()) as { items: Plan[] }).items ?? [];
  } catch { /* ignore: the page works without plans */ }
  cache.set(sku, items);
  return items;
}

/** The plan the visitor chose on the product page, or undefined for a one-time purchase. */
export function readPlan(btn: HTMLElement | null): SubPlanRef | undefined {
  try { return btn?.dataset.plan ? (JSON.parse(btn.dataset.plan) as SubPlanRef) : undefined; } catch { return undefined; }
}

function showPrice(btn: HTMLElement, cents: number) {
  const el = document.getElementById('product-price');
  if (el) el.textContent = formatPrice(cents, currency());
}

async function render(btn: HTMLElement) {
  document.getElementById('sub-box')?.remove();
  delete btn.dataset.plan;
  const sku = btn.dataset.sku; if (!sku) return;
  const plans = await plansFor(sku);
  if (btn.dataset.sku !== sku || plans.length === 0) return; // the variant changed meanwhile, or nothing to offer
  const en = isEn(); const cur = currency();
  const box = document.createElement('fieldset');
  box.id = 'sub-box'; box.className = 'mb-5 space-y-2'; box.setAttribute('data-testid', 'sub-box');
  box.innerHTML = `<legend class="block text-sm font-medium text-default mb-2">${en ? 'How would you like to buy?' : 'Comment souhaitez-vous acheter ?'}</legend>` +
    [{ id: '', label: en ? 'One-time purchase' : 'Achat unique', sub: formatPrice(Number(btn.dataset.price), cur) }, ...plans.map((p) => ({
      id: p.id, label: `${en ? 'Subscribe' : 'S’abonner'} — ${p.name}`,
      sub: `${formatPrice(p.price_cents, cur)} ${everyLabel(p, en)}${p.max_cycles ? (en ? `, ${p.max_cycles} deliveries` : `, ${p.max_cycles} livraisons`) : ''}`,
    }))].map((o, i) => `<label class="flex items-start gap-3 border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-3 cursor-pointer text-sm"><input type="radio" name="sub-choice" value="${o.id}" ${i === 0 ? 'checked' : ''} class="mt-1"><span class="text-default"><span class="font-medium">${o.label.replace(/</g, '&lt;')}</span><br><span class="text-muted">${o.sub}</span></span></label>`).join('') +
    `<p class="text-xs text-muted">${en ? 'Before each delivery we e-mail you a payment link. You can pause, skip or stop at any time from that e-mail.' : 'Avant chaque livraison, nous vous envoyons un lien de paiement par e-mail. Vous pouvez mettre en pause, sauter ou arrêter à tout moment depuis cet e-mail.'}</p>`;
  btn.parentElement?.insertBefore(box, btn);
  box.addEventListener('change', () => {
    const id = (box.querySelector('input[name="sub-choice"]:checked') as HTMLInputElement | null)?.value;
    const p = plans.find((x) => x.id === id);
    if (p) { btn.dataset.plan = JSON.stringify({ id: p.id, name: p.name, price_cents: p.price_cents, every_n: p.every_n, unit: p.unit }); showPrice(btn, p.price_cents); }
    else { delete btn.dataset.plan; showPrice(btn, Number(btn.dataset.price)); }
  });
}

/** Call on every product page load (and after each Astro page swap). */
export function initSubs(): void {
  const btn = document.getElementById('add-to-cart');
  if (!btn) return;
  void render(btn);
  // The page's own variant handler runs first and changes the sku; then we look up that variant's plans.
  document.getElementById('variant-select')?.addEventListener('change', () => setTimeout(() => void render(btn), 0));
}
