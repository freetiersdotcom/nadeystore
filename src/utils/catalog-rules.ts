// src/utils/catalog-rules.ts
// What the storefront shows of the catalog, decided in ONE place (kit 59).
//
//  - site.sells   which kinds of product this site sells (physical / digital / service). A product variant of another kind is
//                 hidden everywhere (shop, product pages, related products, landing pages); a product left without any variant
//                 disappears and its page answers 404. The data stays in the API untouched.
//  - site.quoteOnly  services are answered by quote: no price, no cart, no booking; a "Request a quote" button leads to the contact form
//                 (message pre-filled with the service name) or to WhatsApp.
import { site } from '~/site.config';
import { page, type Locale } from '~/utils/i18n';

type KindHolder = { product_type?: string | null };

/** Keeps only the variants whose kind is sold, and only the products that still have a variant. */
export function applySells<T extends { variants: KindHolder[] }>(
  products: T[],
  sells: readonly string[] = site.sells
): T[] {
  const out: T[] = [];
  for (const p of products) {
    const all = p.variants ?? [];
    const variants = all.filter((v) => sells.includes(v.product_type || 'physical'));
    if (variants.length) out.push(variants.length === all.length ? p : { ...p, variants });
  }
  return out;
}

/** True when this variant is a service that is answered by quote. */
export function isQuote(v?: KindHolder | null, quoteOnly: boolean = site.quoteOnly): boolean {
  return !!v && quoteOnly && v.product_type === 'service';
}

/** Contact page with the form message pre-filled ("I would like a quote for: <title>"). */
export function quoteUrl(locale: Locale, title: string): string {
  return `${page('contact', locale)}?quote=${encodeURIComponent(title.slice(0, 200))}#form`;
}

/** The same request as a WhatsApp message. */
export function whatsappQuoteUrl(locale: Locale, title: string): string {
  const text =
    locale === 'fr' ? `Bonjour, je souhaite un devis pour : ${title}` : `Hello, I would like a quote for: ${title}`;
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;
}
