import { getPermalink } from './utils/permalinks';

export const headerData = {
  links: [
    { text: 'Boutique', href: '/fr/boutique' },
    { text: 'À propos', href: '/a-propos' },
    { text: 'Contact', href: '/contact' },
  ],
  actions: [
    {
      text: 'Commander',
      href: '/fr/boutique',
      variant: 'primary',
    },
  ],
};

export const footerData = {
  links: [
    {
      title: 'Boutique',
      links: [
        { text: 'Tous les produits', href: '/fr/boutique' },
        { text: 'Panier', href: '/fr/panier' },
      ],
    },
    {
      title: 'À propos',
      links: [
        { text: 'Notre histoire', href: '/a-propos' },
        { text: 'Contact', href: '/contact' },
      ],
    },
    {
      title: 'Légal',
      links: [
        { text: 'Politique de confidentialité', href: '/confidentialite' },
        { text: 'Conditions générales de vente', href: '/conditions' },
        { text: 'Politique de remboursement', href: '/remboursement' },
      ],
    },
  ],
  secondaryLinks: [
    { text: 'Conditions générales', href: '/conditions' },
    { text: 'Confidentialité', href: '/confidentialite' },
  ],
  socialLinks: [
    // Add your client's actual social handles here
    // { ariaLabel: 'Facebook', icon: 'tabler:brand-facebook', href: 'https://facebook.com/nadeynaturel' },
    // { ariaLabel: 'Instagram', icon: 'tabler:brand-instagram', href: 'https://instagram.com/nadeynaturel' },
    // { ariaLabel: 'WhatsApp', icon: 'tabler:brand-whatsapp', href: 'https://wa.me/22900000000' },
  ],
  footNote: `
    <span class="text-sm text-muted">© ${new Date().getFullYear()} Nadey Naturel · Cotonou, Bénin · Tous droits réservés.</span>
  `,
};
