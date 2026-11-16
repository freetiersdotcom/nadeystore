// src/utils/pages.ts
// Loads the text of the home, about, contact, FAQ and legal pages from src/content/pages/<locale>/<slug>.yaml|md
// and fills in the placeholders from src/site.config.ts:
//   {brand} {city} {country} {address} {whatsapp} {phone} {email}
import yaml from 'js-yaml';
import { site, type Locale } from '~/site.config';

export type Section = { type: string; [key: string]: unknown };
export type FaqItem = { q: string; a: string; link?: { href: string; label: string } };
export type FaqGroup = { title: string; items: FaqItem[] };
export type PageContent = {
  metadata: { title: string; description?: string; robots?: { index?: boolean; follow?: boolean } };
  sections: Section[];
};

const files = import.meta.glob('/src/content/pages/*/*.{yaml,md}', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>;

const phone = (site as { phone?: string }).phone ?? `+${site.whatsapp}`;

function tokens(locale: Locale): Record<string, string> {
  return {
    brand: site.brand,
    city: site.city,
    country: site.country[locale],
    address: site.address[locale],
    whatsapp: site.whatsapp,
    phone,
    email: site.email,
  };
}

function fill<T>(value: T, t: Record<string, string>): T {
  if (typeof value === 'string') return value.replace(/\{(brand|city|country|address|whatsapp|phone|email)\}/g, (_, k) => t[k]) as T;
  if (Array.isArray(value)) return value.map((v) => fill(v, t)) as T;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fill(v, t)])) as T;
  return value;
}

export function loadPage(locale: Locale, slug: string): PageContent {
  const base = `/src/content/pages/${locale}/${slug}`;
  const t = tokens(locale);
  const yamlSrc = files[`${base}.yaml`];
  if (yamlSrc !== undefined) {
    const doc = yaml.load(yamlSrc) as PageContent;
    return fill(doc, t);
  }
  const mdSrc = files[`${base}.md`];
  if (mdSrc === undefined) throw new Error(`Page content not found: src/content/pages/${locale}/${slug}.yaml or .md`);
  // Legal page: YAML front matter (metadata, tagline, title, subtitle, optional "after" sections) + an HTML body.
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(mdSrc);
  if (!m) throw new Error(`${base}.md must start with a --- front matter block`);
  const front = yaml.load(m[1]) as {
    metadata: PageContent['metadata'];
    tagline?: string;
    title: string;
    subtitle?: string;
    after?: Section[];
  };
  const { metadata, after = [], ...hero } = front;
  return fill(
    {
      metadata,
      sections: [{ type: 'hero-text', ...hero }, { type: 'prose', html: m[2].trim() }, ...after],
    },
    t
  );
}
