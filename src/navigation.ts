import type { Locale } from './utils/i18n';
import { page } from './utils/i18n';
import { site } from './site.config';

const ADDRESS = site.address.fr;
const ADDRESS_EN = site.address.en;

const copy = {
  fr: {
    nav: { shop: 'Boutique', about: 'À propos', contact: 'Contact' },
    blog: 'Blog',
    cta: 'Voir la boutique',
    ctaContact: 'Nous contacter',
    services: 'Services',
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
    blog: 'Blog',
    cta: 'Visit the shop',
    ctaContact: 'Contact us',
    services: 'Services',
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
      ...(site.features.shop ? [{ text: c.nav.shop, href: page('shop', locale) }] : []),
      ...(site.features.services ? [{ text: c.services, href: page('services', locale) }] : []),
      { text: c.nav.about, href: page('about', locale) },
      ...(site.features.blog ? [{ text: c.blog, href: `/${locale}/blog` }] : []),
      { text: c.nav.contact, href: page('contact', locale) },
    ],
    actions: site.features.shop
      ? [{ text: c.cta, href: page('shop', locale), variant: 'primary' as const }]
      : [{ text: c.ctaContact, href: page('contact', locale), variant: 'primary' as const }],
  };
}

export function getFooterData(locale: Locale = 'fr') {
  // Evaluated on each render, not at module load: at module load the Workers clock can still read 1970.
  const year = new Date().getFullYear();
  const c = copy[locale];
  return {
    links: [
      ...(site.features.shop
        ? [
            {
              title: c.shopTitle,
              links: [
                { text: c.allProducts, href: page('shop', locale) },
                { text: c.cart, href: page('cart', locale) },
                ...(site.features.blog ? [{ text: c.blog, href: `/${locale}/blog` }] : []),
              ],
            },
          ]
        : []),
      {
        title: c.aboutTitle,
        links: [
          { text: c.story, href: page('about', locale) },
          ...(site.features.services ? [{ text: c.services, href: page('services', locale) }] : []),
          ...(site.features.faq ? [{ text: c.faq, href: page('faq', locale) }] : []),
          { text: c.nav.contact, href: page('contact', locale) },
          ...(!site.features.shop && site.features.blog ? [{ text: c.blog, href: `/${locale}/blog` }] : []),
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
      { ariaLabel: 'WhatsApp', icon: 'tabler:brand-whatsapp', href: `https://wa.me/${site.whatsapp}` },
    ],
    footNote: `
    <span class="text-sm text-muted">© ${year} ${site.brand} · ${c.rights}</span>
    <span class="block text-xs text-muted mt-1">${c.address}</span>
  `,
  };
}

// Backwards-compatible exports (French).
export const headerData = getHeaderData('fr');
export const footerData = getFooterData('fr');
