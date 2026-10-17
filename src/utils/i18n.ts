// src/utils/i18n.ts
// Tiny path-based locale layer. French keeps its current URLs (/, /a-propos,
// /fr/boutique, ...) so nothing existing moves; English lives under /en/.

export type Locale = 'fr' | 'en';
export const LOCALES: Locale[] = ['fr', 'en'];
export const DEFAULT_LOCALE: Locale = 'fr';

// French path -> English path. Keep both sides without trailing slash
// (except the home page, which is '/' and '/en/').
const PAGE_MAP: Array<[fr: string, en: string]> = [
  ['/', '/en/'],
  ['/a-propos', '/en/about'],
  ['/contact', '/en/contact'],
  ['/faq', '/en/faq'],
  ['/conditions', '/en/terms'],
  ['/confidentialite', '/en/privacy'],
  ['/remboursement', '/en/refund-policy'],
  ['/fr/boutique', '/en/shop'],
  ['/fr/panier', '/en/cart'],
  ['/fr/confirmation', '/en/confirmation'],
  ['/fr/telechargements', '/en/downloads'],
];

const PRODUCT_FR = '/fr/produits/';
const PRODUCT_EN = '/en/products/';
const OFFER_FR = '/offre/';
const OFFER_EN = '/en/offer/';

function normalize(pathname: string): string {
  if (pathname === '/' || pathname === '/en' || pathname === '/en/') return pathname === '/' ? '/' : '/en/';
  return pathname.replace(/\/+$/, '');
}

export function getLocale(pathname: string): Locale {
  return pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'fr';
}

/** Path of the same page in another locale, or the target home page if unknown. */
export function alternatePath(pathname: string, target: Locale): string {
  const path = normalize(pathname);
  const from = getLocale(path);
  if (from === target) return path;

  if (path.startsWith(PRODUCT_FR) && target === 'en') return PRODUCT_EN + path.slice(PRODUCT_FR.length);
  if (path.startsWith(PRODUCT_EN) && target === 'fr') return PRODUCT_FR + path.slice(PRODUCT_EN.length);

  if (path.startsWith(OFFER_FR) && target === 'en') return OFFER_EN + path.slice(OFFER_FR.length);
  if (path.startsWith(OFFER_EN) && target === 'fr') return OFFER_FR + path.slice(OFFER_EN.length);

  for (const [fr, en] of PAGE_MAP) {
    if ((from === 'fr' ? fr : en) === path) return target === 'fr' ? fr : en;
  }
  return target === 'fr' ? '/' : '/en/';
}

/** Localised path for a named page, e.g. page('shop', 'en') -> '/en/shop'. */
const NAMED: Record<string, [string, string]> = {
  home: ['/', '/en/'],
  about: ['/a-propos', '/en/about'],
  contact: ['/contact', '/en/contact'],
  faq: ['/faq', '/en/faq'],
  terms: ['/conditions', '/en/terms'],
  privacy: ['/confidentialite', '/en/privacy'],
  refund: ['/remboursement', '/en/refund-policy'],
  shop: ['/fr/boutique', '/en/shop'],
  cart: ['/fr/panier', '/en/cart'],
  confirmation: ['/fr/confirmation', '/en/confirmation'],
  downloads: ['/fr/telechargements', '/en/downloads'],
};
export function page(name: keyof typeof NAMED, locale: Locale): string {
  return NAMED[name][locale === 'en' ? 1 : 0];
}
export function offerPath(slug: string, locale: Locale): string {
  return (locale === 'en' ? OFFER_EN : OFFER_FR) + slug;
}
export function productPath(slug: string, locale: Locale): string {
  return (locale === 'en' ? PRODUCT_EN : PRODUCT_FR) + slug;
}

export const HTML_LANG: Record<Locale, string> = { fr: 'fr', en: 'en' };
export const OG_LOCALE: Record<Locale, string> = { fr: 'fr_FR', en: 'en_US' };

// Small UI dictionary for shared chrome (header, footer, cart toast, modal).
export const UI = {
  fr: {
    cart: 'Panier',
    viewCart: 'Voir le panier',
    addedToCart: 'Ajouté au panier',
    viewShop: 'Voir la boutique',
    language: 'Langue',
    emailTitle: 'Presque là',
    emailIntro: 'Entrez votre adresse e-mail pour finaliser votre commande. Votre confirmation y sera envoyée.',
    emailPlaceholder: 'vous@exemple.com',
    emailError: 'Veuillez entrer une adresse e-mail valide.',
    cancel: 'Annuler',
    continue: 'Continuer',
    consentText: 'Nous utilisons des cookies de mesure publicitaire (Meta, TikTok) pour savoir quelles annonces fonctionnent. Vous pouvez les refuser : la boutique fonctionne pareil.',
    consentAccept: 'Accepter',
    consentRefuse: 'Refuser',
    consentMore: 'En savoir plus',
  },
  en: {
    cart: 'Cart',
    viewCart: 'View cart',
    addedToCart: 'Added to cart',
    viewShop: 'Visit the shop',
    language: 'Language',
    emailTitle: 'Almost there',
    emailIntro: 'Enter your email address to complete your order. Your confirmation will be sent there.',
    emailPlaceholder: 'you@example.com',
    emailError: 'Please enter a valid email address.',
    cancel: 'Cancel',
    continue: 'Continue',
    consentText: 'We use advertising measurement cookies (Meta, TikTok) to learn which ads work. You can decline them: the shop works the same.',
    consentAccept: 'Accept',
    consentRefuse: 'Decline',
    consentMore: 'Learn more',
  },
} as const;
