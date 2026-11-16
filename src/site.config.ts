// src/site.config.ts
// What changes from one client to the next. Plain values only (no imports, no import.meta.env): astro.config.ts reads this file too.
//
//   features  switch whole areas of the site on or off. A switched-off area disappears everywhere: its pages answer 404 (and are not built
//             into the site), the menu and footer stop linking to it, and the sitemap leaves it out.
//   locales   the languages the site is published in. With a single language the language switcher is hidden and the other tree answers 404.
//
// Pages: shop = shop, product pages, cart, payment, confirmation, downloads and the /offer landing pages.
//        account = customer account.  blog = blog and RSS.  faq = FAQ page.  Home, about, contact and the legal pages are always on.

export type Locale = 'fr' | 'en';
export type FeatureName = 'shop' | 'account' | 'blog' | 'faq';

export const site = {
  brand: 'Santé Natur’',
  city: 'Cotonou',
  country: { fr: 'Bénin', en: 'Benin' },
  address: {
    fr: 'Fidjrossè Fiyegnon Jacquot, C/1755, Maison Alassane, Cotonou, Bénin',
    en: 'Fidjrossè Fiyegnon Jacquot, C/1755, Maison Alassane, Cotonou, Benin',
  },
  /** Digits only, with the country code: https://wa.me/<whatsapp> */
  whatsapp: '2290194458956',
  email: 'agroalafia@gmail.com',

  locales: ['fr', 'en'] as Locale[],
  features: { shop: true, account: true, blog: true, faq: true } as Record<FeatureName, boolean>,
};
