// Starter texts for a new client, built from what the client sells. Used by scripts/new-client.mjs.
// Every text is a placeholder to be rewritten; {brand}, {city}, {country}, {whatsapp} are filled from src/site.config.ts at build time.
import yaml from 'js-yaml';

const HEAD =
  '# STARTER CONTENT: rewrite every text for this client (placeholders such as {brand} come from src/site.config.ts).\n';
const WA = {
  text: 'WhatsApp',
  href: 'https://wa.me/{whatsapp}',
  icon: 'tabler:brand-whatsapp',
};

const T = {
  fr: {
    p: { shop: '/fr/boutique', svc: '/fr/services', contact: '/fr/contact' },
    order: 'Commander',
    book: 'Réserver',
    quote: 'Demander un devis',
    services: 'Nos services',
    contact: 'Nous contacter',
    wa: 'Écrire sur WhatsApp',
    sub: {
      goods: 'Décrivez en une phrase ce que vous vendez et à qui.',
      services: 'Décrivez en une phrase les services que vous proposez et à qui.',
      both: 'Décrivez en une phrase ce que vous vendez et les services que vous proposez.',
    },
    title: {
      goods: 'Votre boutique en ligne',
      services: 'Vos services, simplement',
      both: 'Produits et services au même endroit',
    },
    why: 'Pourquoi nous choisir',
    whySub: 'Trois raisons de nous faire confiance.',
    f: {
      select: ['Sélection soignée', 'Des produits choisis avec attention.', 'tabler:leaf'],
      pay: ['Paiement sécurisé', 'Mobile Money ou carte bancaire, via des prestataires sécurisés.', 'tabler:lock'],
      ship: ['Livraison suivie', 'Les frais de livraison sont calculés avant le paiement.', 'tabler:truck-delivery'],
      dl: [
        'Téléchargement immédiat',
        'Votre lien de téléchargement arrive dès le paiement confirmé.',
        'tabler:download',
      ],
      expert: ['Expertise', 'Une équipe qui connaît son métier.', 'tabler:award'],
      react: ['Réactivité', 'Réponse rapide sur WhatsApp ou par email.', 'tabler:message-circle'],
      follow: ['Suivi', 'Nous restons disponibles jusqu’à votre satisfaction.', 'tabler:heart-handshake'],
      slot: [
        'Réservation en ligne',
        'Choisissez votre créneau et payez en ligne, avec un acompte si nécessaire.',
        'tabler:calendar-event',
      ],
    },
    cta: {
      goods: 'Découvrez la boutique',
      services: 'Parlons de votre projet',
      both: 'Une question ? Écrivez-nous',
    },
    ctaS: 'Nous répondons rapidement sur WhatsApp et par email.',
    aboutTag: 'Qui sommes-nous',
    aboutTitle: 'À propos de {brand}',
    aboutSub: '{brand} est basé à {city}, {country}. Décrivez ici l’activité et l’histoire de l’entreprise.',
    block: 'Notre activité',
    blockHtml:
      '<p>Présentez ici vos produits ou services.</p><p class="mt-4">Expliquez à qui vous vous adressez et ce qui vous distingue.</p>',
    svcTag: 'Nos services',
    svcTitle: 'Ce que nous faisons pour vous',
    svcSub: 'Décrivez chaque service, avec si possible un prix ou une fourchette de prix.',
    svcItems: [
      [
        'Service 1',
        'Décrivez ce service et ce qu’il apporte au client.<br/><span class="text-muted text-xs">À partir de … F CFA</span>',
        'tabler:briefcase',
      ],
      ['Service 2', 'Décrivez ce service et ce qu’il apporte au client.', 'tabler:tools'],
      ['Service 3', 'Décrivez ce service et ce qu’il apporte au client.', 'tabler:calendar-event'],
    ],
    stepsTag: 'Comment ça marche',
    stepsTitle: 'Travailler avec nous en 3 étapes',
    stepsQuote: [
      ['Vous nous contactez', 'Par WhatsApp, email ou le formulaire de contact.', 'tabler:message-circle'],
      ['Nous convenons des détails', 'Besoin, délai et prix, par écrit.', 'tabler:list-details'],
      ['Nous réalisons le travail', 'Avec un suivi jusqu’à votre satisfaction.', 'tabler:circle-check'],
    ],
    stepsPaid: [
      ['Vous choisissez un service', 'Dans la boutique, avec son prix affiché.', 'tabler:list-details'],
      ['Vous réservez et payez', 'Créneau au choix, paiement en ligne ou acompte.', 'tabler:calendar-event'],
      ['Nous confirmons', 'Par téléphone ou WhatsApp, puis nous réalisons le service.', 'tabler:circle-check'],
    ],
    svcCta: {
      quote: ['Un projet ? Un devis ?', 'Écrivez-nous : nous répondons en général sous 24 à 48 heures ouvrées.'],
      paid: [
        'Prêt à réserver ?',
        'Choisissez votre service dans la boutique : le prix et les créneaux y sont affichés.',
      ],
    },
    desc: '{brand}, {city}',
    aboutName: 'À propos',
  },
  en: {
    p: { shop: '/en/shop', svc: '/en/services', contact: '/en/contact' },
    order: 'Order now',
    book: 'Book now',
    quote: 'Request a quote',
    services: 'Our services',
    contact: 'Contact us',
    wa: 'Message us on WhatsApp',
    sub: {
      goods: 'Describe in one sentence what you sell and to whom.',
      services: 'Describe in one sentence the services you offer and to whom.',
      both: 'Describe in one sentence what you sell and the services you offer.',
    },
    title: {
      goods: 'Your online shop',
      services: 'Your services, made simple',
      both: 'Products and services in one place',
    },
    why: 'Why choose us',
    whySub: 'Three reasons to trust us.',
    f: {
      select: ['Careful selection', 'Products chosen with care.', 'tabler:leaf'],
      pay: ['Secure payment', 'Mobile Money or bank card, through secure payment providers.', 'tabler:lock'],
      ship: ['Tracked delivery', 'Delivery fees are calculated before you pay.', 'tabler:truck-delivery'],
      dl: ['Instant download', 'Your download link arrives as soon as the payment is confirmed.', 'tabler:download'],
      expert: ['Expertise', 'A team that knows its trade.', 'tabler:award'],
      react: ['Responsiveness', 'Quick answers on WhatsApp or by email.', 'tabler:message-circle'],
      follow: ['Follow-up', 'We stay available until you are satisfied.', 'tabler:heart-handshake'],
      slot: [
        'Online booking',
        'Pick your time slot and pay online, with a deposit if needed.',
        'tabler:calendar-event',
      ],
    },
    cta: {
      goods: 'Discover the shop',
      services: 'Let’s talk about your project',
      both: 'A question? Write to us',
    },
    ctaS: 'We reply quickly on WhatsApp and by email.',
    aboutTag: 'Who we are',
    aboutTitle: 'About {brand}',
    aboutSub: '{brand} is based in {city}, {country}. Describe the business and its story here.',
    block: 'What we do',
    blockHtml:
      '<p>Present your products or services here.</p><p class="mt-4">Explain who you serve and what makes you different.</p>',
    svcTag: 'Our services',
    svcTitle: 'What we do for you',
    svcSub: 'Describe each service, with a price or price range if possible.',
    svcItems: [
      [
        'Service 1',
        'Describe this service and what it brings the customer.<br/><span class="text-muted text-xs">From … F CFA</span>',
        'tabler:briefcase',
      ],
      ['Service 2', 'Describe this service and what it brings the customer.', 'tabler:tools'],
      ['Service 3', 'Describe this service and what it brings the customer.', 'tabler:calendar-event'],
    ],
    stepsTag: 'How it works',
    stepsTitle: 'Working with us in 3 steps',
    stepsQuote: [
      ['You contact us', 'By WhatsApp, email or the contact form.', 'tabler:message-circle'],
      ['We agree on the details', 'Need, timing and price, in writing.', 'tabler:list-details'],
      ['We do the work', 'With follow-up until you are satisfied.', 'tabler:circle-check'],
    ],
    stepsPaid: [
      ['You pick a service', 'In the shop, with its price shown.', 'tabler:list-details'],
      ['You book and pay', 'Choose a time slot, pay online or with a deposit.', 'tabler:calendar-event'],
      ['We confirm', 'By phone or WhatsApp, then we deliver the service.', 'tabler:circle-check'],
    ],
    svcCta: {
      quote: ['A project? A quote?', 'Write to us: we usually reply within 24 to 48 business hours.'],
      paid: ['Ready to book?', 'Pick your service in the shop: the price and the time slots are shown there.'],
    },
    desc: '{brand}, {city}',
    aboutName: 'About',
  },
};

const items = (a) => a.map(([title, description, icon]) => ({ title, description, icon }));
const dump = (o) => HEAD + yaml.dump(o, { lineWidth: -1 });

/** sells: any of 'physical' | 'digital' | 'service'. quoteOnly: services are answered by quote, not sold online. */
export function starterContent(sells, quoteOnly) {
  const physical = sells.includes('physical'),
    digital = sells.includes('digital'),
    service = sells.includes('service');
  const goods = physical || digital;
  const paid = service && !quoteOnly;

  const kind = goods && service ? 'both' : goods ? 'goods' : 'services';
  const out = {};
  for (const l of ['fr', 'en']) {
    const t = T[l];
    const toShop = t.p.shop,
      toContact = t.p.contact;
    const actions = [];
    if (goods)
      actions.push({
        variant: 'primary',
        text: t.order,
        href: toShop,
        icon: 'tabler:shopping-cart',
      });
    if (service)
      actions.push({
        ...(goods ? {} : { variant: 'primary' }),
        text: paid ? t.book : t.quote,
        href: paid ? toShop : toContact,
        icon: 'tabler:briefcase',
      });
    if (service && goods)
      actions[1] = {
        text: t.services,
        href: t.p.svc,
        icon: 'tabler:briefcase',
      };
    actions.push({
      text: t.wa,
      href: 'https://wa.me/{whatsapp}',
      icon: 'tabler:brand-whatsapp',
    });
    const feats = goods
      ? [t.f.select, t.f.pay, digital && !physical ? t.f.dl : t.f.ship]
      : paid
        ? [t.f.expert, t.f.slot, t.f.follow]
        : [t.f.expert, t.f.react, t.f.follow];
    const ctaActions =
      goods && !service
        ? [
            {
              variant: 'primary',
              text: t.order,
              href: toShop,
              icon: 'tabler:shopping-cart',
            },
            WA,
          ]
        : [
            {
              variant: 'primary',
              text: paid && !goods ? t.book : t.contact,
              href: paid && !goods ? toShop : toContact,
              icon: paid && !goods ? 'tabler:calendar-event' : 'tabler:message',
            },
            WA,
          ];
    const cta = {
      type: 'cta',
      title: t.cta[kind],
      subtitle: t.ctaS,
      actions: ctaActions,
    };
    out[l] = {
      home: dump({
        metadata: { title: t.title[kind], description: t.desc },
        sections: [
          {
            type: 'hero',
            tagline: '{city}, {country}',
            title: t.title[kind],
            subtitle: t.sub[kind],
            actions,
          },
          {
            type: 'features',
            title: t.why,
            subtitle: t.whySub,
            columns: 3,
            items: items(feats),
          },
          cta,
        ],
      }),
      about: dump({
        metadata: { title: t.aboutName, description: t.aboutSub },
        sections: [
          {
            type: 'hero-text',
            tagline: t.aboutTag,
            title: t.aboutTitle,
            subtitle: t.aboutSub,
          },
          {
            type: 'content',
            tagline: t.block,
            title: t.block,
            content: t.blockHtml,
          },
          cta,
        ],
      }),
    };
    if (service) {
      const [ct, cs] = t.svcCta[paid ? 'paid' : 'quote'];
      out[l].services = dump({
        metadata: { title: t.svcTag, description: t.svcSub },
        sections: [
          {
            type: 'hero-text',
            tagline: t.svcTag,
            title: t.svcTitle,
            subtitle: t.svcSub,
          },
          { type: 'features-grid', columns: 3, items: items(t.svcItems) },
          {
            type: 'steps',
            tagline: t.stepsTag,
            title: t.stepsTitle,
            items: items(paid ? t.stepsPaid : t.stepsQuote),
          },
          {
            type: 'cta',
            title: ct,
            subtitle: cs,
            actions: [
              paid
                ? {
                    variant: 'primary',
                    text: t.book,
                    href: toShop,
                    icon: 'tabler:calendar-event',
                  }
                : {
                    variant: 'primary',
                    text: t.quote,
                    href: toContact,
                    icon: 'tabler:message',
                  },
              WA,
            ],
          },
        ],
      });
    }
  }
  return out;
}
