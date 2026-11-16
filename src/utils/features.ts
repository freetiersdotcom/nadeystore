// src/utils/features.ts
// Which URLs exist, according to src/site.config.ts. Used by the middleware (dev and on-demand pages), the sitemap filter and the
// build step that removes the pages of a switched-off area. Relative imports only: astro.config.ts loads this file outside Vite.
import { site, type FeatureName, type Locale } from '../site.config';

const AREAS: Record<FeatureName, string[]> = {
  shop: [
    '/fr/boutique', '/en/shop', '/fr/produits', '/en/products', '/fr/panier', '/en/cart', '/fr/paiement', '/en/payment',
    '/fr/confirmation', '/en/confirmation', '/fr/telechargements', '/en/downloads', '/fr/offre', '/en/offer',
  ],
  account: ['/fr/compte', '/en/account'],
  blog: ['/fr/blog', '/en/blog', '/fr/rss.xml', '/en/rss.xml'],
  faq: ['/fr/faq', '/en/faq'],
};
const ALL_LOCALES: Locale[] = ['fr', 'en'];

/** The page the visitor would see for this path exists in this project. */
export function isPathEnabled(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, '') || '/';
  for (const l of ALL_LOCALES) if (!site.locales.includes(l) && (p === `/${l}` || p.startsWith(`/${l}/`))) return false;
  for (const [feature, prefixes] of Object.entries(AREAS) as [FeatureName, string[]][]) {
    if (site.features[feature]) continue;
    if (prefixes.some((x) => p === x || p.startsWith(x + '/'))) return false;
  }
  return true;
}
