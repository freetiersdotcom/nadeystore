import type { Locale } from './utils/i18n';
import { page } from './utils/i18n';

const year = new Date().getFullYear();
const ADDRESS = 'Fidjrossè Fiyegnon Jacquot, C/1755, Maison Alassane, Cotonou, Bénin';
const ADDRESS_EN = 'Fidjrossè Fiyegnon Jacquot, C/1755, Maison Alassane, Cotonou, Benin';

const copy = {
  fr: {
    nav: { shop: 'Boutique', about: 'À propos', contact: 'Contact' },
    cta: 'Voir la boutique',
    shopTitle: 'Boutique',
    allProducts: 'Tous les produits',
    cart: 'Panier',
    aboutTitle: 'À propos',
    story: 'Notre histoire',
    faq: 'Questions fréquentes',
    legal: 'Légal',
    privacy: 'Politique de confidentialité',
    terms: 'Conditions générales de vente',
    refund: 'Politique de remboursement',
    termsShort: 'Conditions générales',
    privacyShort: 'Confidentialité',
    rights: 'Tous droits réservés.',
    address: ADDRESS,
  },
  en: {
    nav: { shop: 'Shop', about: 'About', contact: 'Contact' },
    cta: 'Visit the shop',
    shopTitle: 'Shop',
    allProducts: 'All products',
    cart: 'Cart',
    aboutTitle: 'About',
    story: 'About us',
    faq: 'FAQ',
    legal: 'Legal',
    privacy: 'Privacy policy',
    terms: 'Terms and conditions of sale',
    refund: 'Refund policy',
    termsShort: 'Terms',
    privacyShort: 'Privacy',
    rights: 'All rights reserved.',
    address: ADDRESS_EN,
  },
} as const;

export function getHeaderData(locale: Locale = 'fr') {
  const c = copy[locale];
  return {
    links: [
      { text: c.nav.shop, href: page('shop', locale) },
      { text: c.nav.about, href: page('about', locale) },
      { text: c.nav.contact, href: page('contact', locale) },
      (locale === 'fr' ? [{ text: 'Blog', href: '/fr/blog' }] : []),
    ],
    actions: [{ text: c.cta, href: page('shop', locale), variant: 'primary' }],
  };
}

export function getFooterData(locale: Locale = 'fr') {
  const c = copy[locale];
  return {
    links: [
      {
        title: c.shopTitle,
        links: [
          { text: c.allProducts, href: page('shop', locale) },
          { text: c.cart, href: page('cart', locale) },
          (locale === 'fr' ? [{ text: 'Blog', href: '/fr/blog' }] : []),
        ],
      },
      {
        title: c.aboutTitle,
        links: [
          { text: c.story, href: page('about', locale) },
          { text: c.faq, href: page('faq', locale) },
          { text: c.nav.contact, href: page('contact', locale) },
        ],
      },
      {
        title: c.legal,
        links: [
          { text: c.privacy, href: page('privacy', locale) },
          { text: c.terms, href: page('terms', locale) },
          { text: c.refund, href: page('refund', locale) },
        ],
      },
    ],
    secondaryLinks: [
      { text: c.termsShort, href: page('terms', locale) },
      { text: c.privacyShort, href: page('privacy', locale) },
    ],
    socialLinks: [
      // Add the client's actual social handles here
      { ariaLabel: 'WhatsApp', icon: 'tabler:brand-whatsapp', href: 'https://wa.me/2290194458956' },
    ],
    footNote: `
    <span class="text-sm text-muted">© ${year} Santé Natur’ · ${c.rights}</span>
    <span class="block text-xs text-muted mt-1">${c.address}</span>
  `,
  };
}

// Backwards-compatible exports (French).
export const headerData = getHeaderData('fr');
export const footerData = getFooterData('fr');
