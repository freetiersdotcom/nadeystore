#!/usr/bin/env node
// Writes public/admin/collections-pages.yml: the Sveltia CMS description of the content pages
// (src/content/pages/<fr|en>/*.yaml|md) so the owner can edit them in /admin.
// Run it again after adding a section type to src/components/pages/SectionRenderer.astro, then re-apply kit 58 (apply-cms.mjs).
//   node scripts/gen-cms-pages.mjs
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

const T = {
  fr: {
    coll: 'Pages du site (français)',
    metadata: 'Référencement (Google)',
    mTitle: 'Titre',
    mDesc: 'Description',
    sections: 'Sections de la page',
    section: 'section',
    tagline: 'Sur-titre',
    title: 'Titre',
    subtitle: 'Sous-titre',
    anchor: 'Ancre (id, facultatif)',
    columns: 'Colonnes',
    items: 'Éléments',
    item: 'élément',
    itemTitle: 'Titre',
    itemText: 'Texte',
    icon: 'Icône',
    iconHint: 'Nom d’icône, par exemple tabler:truck-delivery ou tabler:brand-whatsapp (liste : tabler.io/icons).',
    actions: 'Boutons',
    action: 'bouton',
    variant: 'Style',
    text: 'Texte du bouton',
    href: 'Lien',
    hrefHint: 'Une adresse (https://…), un chemin (/fr/boutique) ou un lien WhatsApp.',
    image: 'Image',
    src: 'Image (fichier ou adresse)',
    alt: 'Description de l’image (accessibilité)',
    htmlHint: 'HTML autorisé : <p>…</p>, <strong>…</strong>, <a href="…">…</a>.',
    content: 'Texte',
    reversed: 'Image à gauche',
    cta: 'Bouton',
    groups: 'Groupes de questions',
    group: 'groupe',
    q: 'Question',
    a: 'Réponse',
    link: 'Lien (facultatif)',
    linkLabel: 'Texte du lien',
    body: 'Texte de la page (HTML)',
    robots: 'Moteurs de recherche',
    index: 'Indexer cette page',
    follow: 'Suivre les liens',
    after: 'Sections après le texte',
    placeholders:
      'Mots entre accolades remplacés automatiquement : {brand} {city} {country} {address} {whatsapp} {phone} {email}.',
    types: {
      hero: 'En-tête avec image',
      'hero-text': 'En-tête texte',
      features: 'Atouts (liste avec icônes)',
      'features-grid': 'Grille d’atouts',
      content: 'Texte et image',
      steps: 'Étapes',
      cta: 'Appel à l’action (boutons)',
      'contact-form': 'Formulaire de contact',
      faq: 'Questions fréquentes',
      prose: 'Texte libre (HTML)',
    },
    files: {
      home: 'Accueil',
      about: 'À propos',
      contact: 'Contact',
      faq: 'FAQ',
      services: 'Services',
      privacy: 'Confidentialité',
      terms: 'Conditions',
      refund: 'Remboursement',
    },
    variants: { primary: 'Principal', secondary: 'Secondaire', tertiary: 'Discret', link: 'Lien' },
  },
  en: {
    coll: 'Site pages (English)',
    metadata: 'Search results (Google)',
    mTitle: 'Title',
    mDesc: 'Description',
    sections: 'Page sections',
    section: 'section',
    tagline: 'Small heading above',
    title: 'Title',
    subtitle: 'Subtitle',
    anchor: 'Anchor (id, optional)',
    columns: 'Columns',
    items: 'Items',
    item: 'item',
    itemTitle: 'Title',
    itemText: 'Text',
    icon: 'Icon',
    iconHint: 'Icon name, for example tabler:truck-delivery or tabler:brand-whatsapp (list: tabler.io/icons).',
    actions: 'Buttons',
    action: 'button',
    variant: 'Style',
    text: 'Button text',
    href: 'Link',
    hrefHint: 'An address (https://…), a path (/en/shop) or a WhatsApp link.',
    image: 'Image',
    src: 'Image (file or address)',
    alt: 'Image description (accessibility)',
    htmlHint: 'HTML allowed: <p>…</p>, <strong>…</strong>, <a href="…">…</a>.',
    content: 'Text',
    reversed: 'Image on the left',
    cta: 'Button',
    groups: 'Question groups',
    group: 'group',
    q: 'Question',
    a: 'Answer',
    link: 'Link (optional)',
    linkLabel: 'Link text',
    body: 'Page text (HTML)',
    robots: 'Search engines',
    index: 'Index this page',
    follow: 'Follow links',
    after: 'Sections after the text',
    placeholders:
      'Words in braces are replaced automatically: {brand} {city} {country} {address} {whatsapp} {phone} {email}.',
    types: {
      hero: 'Header with image',
      'hero-text': 'Text header',
      features: 'Strengths (list with icons)',
      'features-grid': 'Strengths grid',
      content: 'Text and image',
      steps: 'Steps',
      cta: 'Call to action (buttons)',
      'contact-form': 'Contact form',
      faq: 'Frequently asked questions',
      prose: 'Free text (HTML)',
    },
    files: {
      home: 'Home',
      about: 'About',
      contact: 'Contact',
      faq: 'FAQ',
      services: 'Services',
      privacy: 'Privacy',
      terms: 'Terms',
      refund: 'Refund policy',
    },
    variants: { primary: 'Primary', secondary: 'Secondary', tertiary: 'Quiet', link: 'Link' },
  },
};

const opt = { required: false };
const str = (name, label, extra = {}) => ({ name, label, widget: 'string', ...opt, ...extra });
const txt = (name, label, extra = {}) => ({ name, label, widget: 'text', ...opt, ...extra });

function build(loc) {
  const t = T[loc];
  const icon = str('icon', t.icon, { hint: t.iconHint });
  const itemFields = [str('title', t.itemTitle, { required: true }), txt('description', t.itemText), icon];
  const items = {
    name: 'items',
    label: t.items,
    label_singular: t.item,
    widget: 'list',
    summary: '{{fields.title}}',
    ...opt,
    fields: itemFields,
  };
  const action = {
    name: 'actions',
    label: t.actions,
    label_singular: t.action,
    widget: 'list',
    summary: '{{fields.text}}',
    ...opt,
    fields: [
      {
        name: 'variant',
        label: t.variant,
        widget: 'select',
        required: false,
        options: Object.entries(t.variants).map(([value, label]) => ({ label, value })),
      },
      str('text', t.text, { required: true }),
      str('href', t.href, { hint: t.hrefHint, required: true }),
      icon,
    ],
  };
  const image = {
    name: 'image',
    label: t.image,
    widget: 'object',
    ...opt,
    fields: [{ name: 'src', label: t.src, widget: 'image', choose_url: true }, str('alt', t.alt)],
  };
  const head = [
    str('tagline', t.tagline),
    str('title', t.title, { hint: t.placeholders }),
    txt('subtitle', t.subtitle),
  ];
  const columns = { name: 'columns', label: t.columns, widget: 'number', value_type: 'int', min: 1, max: 4, ...opt };
  const anchor = str('id', t.anchor);
  const types = [
    { name: 'hero', label: t.types.hero, summary: '{{fields.title}}', fields: [...head, action, image] },
    { name: 'hero-text', label: t.types['hero-text'], summary: '{{fields.title}}', fields: head },
    {
      name: 'features',
      label: t.types.features,
      summary: '{{fields.title}}',
      fields: [anchor, ...head, columns, items],
    },
    {
      name: 'features-grid',
      label: t.types['features-grid'],
      summary: '{{fields.title}}',
      fields: [...head, columns, items],
    },
    {
      name: 'content',
      label: t.types.content,
      summary: '{{fields.title}}',
      fields: [
        anchor,
        ...head,
        txt('content', t.content, { hint: t.htmlHint }),
        image,
        { name: 'isReversed', label: t.reversed, widget: 'boolean', default: false },
        items,
        {
          name: 'callToAction',
          label: t.cta,
          widget: 'object',
          ...opt,
          fields: [
            str('text', t.text, { required: true }),
            str('href', t.href, { required: true, hint: t.hrefHint }),
            icon,
          ],
        },
      ],
    },
    {
      name: 'steps',
      label: t.types.steps,
      summary: '{{fields.title}}',
      fields: [anchor, str('tagline', t.tagline), str('title', t.title, { required: true }), items, image],
    },
    { name: 'cta', label: t.types.cta, summary: '{{fields.title}}', fields: [...head, action] },
    {
      name: 'contact-form',
      label: t.types['contact-form'],
      fields: [{ name: 'locale', widget: 'hidden', default: loc }],
    },
    {
      name: 'faq',
      label: t.types.faq,
      summary: '{{fields.groups.0.title}}',
      fields: [
        {
          name: 'groups',
          label: t.groups,
          label_singular: t.group,
          widget: 'list',
          summary: '{{fields.title}}',
          fields: [
            str('title', t.title, { required: true }),
            {
              name: 'items',
              label: t.items,
              label_singular: t.item,
              widget: 'list',
              summary: '{{fields.q}}',
              fields: [
                str('q', t.q, { required: true }),
                txt('a', t.a, { required: true }),
                {
                  name: 'link',
                  label: t.link,
                  widget: 'object',
                  ...opt,
                  fields: [
                    str('href', t.href, { required: true, hint: t.hrefHint }),
                    str('label', t.linkLabel, { required: true }),
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'prose',
      label: t.types.prose,
      fields: [{ name: 'html', label: t.content, widget: 'text', hint: t.htmlHint }],
    },
  ];
  const sections = {
    name: 'sections',
    label: t.sections,
    label_singular: t.section,
    widget: 'list',
    collapsed: true,
    types,
  };
  const metadata = {
    name: 'metadata',
    label: t.metadata,
    widget: 'object',
    fields: [str('title', t.mTitle, { required: true, hint: t.placeholders }), txt('description', t.mDesc)],
  };
  const legalMeta = {
    ...metadata,
    fields: [
      ...metadata.fields,
      {
        name: 'robots',
        label: t.robots,
        widget: 'object',
        ...opt,
        fields: [
          { name: 'index', label: t.index, widget: 'boolean', default: true },
          { name: 'follow', label: t.follow, widget: 'boolean', default: true },
        ],
      },
    ],
  };
  // After the legal text only a call to action makes sense.
  const after = {
    ...sections,
    name: 'after',
    label: t.after,
    required: false,
    types: types.filter((x) => x.name === 'cta'),
  };
  const file = (slug, ext, fields, extra = {}) => ({
    name: slug,
    label: t.files[slug],
    file: `src/content/pages/${loc}/${slug}.${ext}`,
    fields,
    ...extra,
  });
  const legal = (slug) =>
    file(
      slug,
      'md',
      [
        legalMeta,
        str('tagline', t.tagline),
        str('title', t.title, { required: true }),
        txt('subtitle', t.subtitle),
        { name: 'body', label: t.body, widget: 'text', hint: t.htmlHint + ' ' + t.placeholders },
        after,
      ],
      { format: 'yaml-frontmatter' }
    );
  return {
    name: `pages_${loc}`,
    label: t.coll,
    files: [
      ...['home', 'about', 'contact', 'faq', 'services'].map((s) => file(s, 'yaml', [metadata, sections])),
      ...['privacy', 'terms', 'refund'].map(legal),
    ],
  };
}

const list = [build('fr'), build('en')];
// No YAML anchors: some readers refuse many aliases ("excessive alias count"), and the file is generated anyway.
const out = yaml.dump(list, { lineWidth: -1, noRefs: true, quotingType: '"' });
const indented = out
  .split('\n')
  .map((l) => (l ? '  ' + l : l))
  .join('\n');
const header = `# Content pages (generated by scripts/gen-cms-pages.mjs, do not edit by hand: change the generator and run it again).\n# Appended to the "collections:" list of public/admin/config.yml by kit 58 (apply-cms.mjs).\n`;
const dest = path.join(root, 'public/admin/collections-pages.yml');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, header + indented);
console.log(`wrote ${path.relative(root, dest)}`);
