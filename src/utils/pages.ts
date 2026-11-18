// src/utils/pages.ts
// Loads the text of the home, about, contact, FAQ and legal pages from src/content/pages/<locale>/<slug>.yaml|md
// and fills in the placeholders from src/site.config.ts:
//   {brand} {city} {country} {address} {whatsapp} {phone} {email}
import yaml from 'js-yaml';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
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

// Rich texts (text-and-image body, free text, legal pages) are written as Markdown in the CMS.
// A text that starts with an HTML tag is used as it is, so pages written in HTML keep working.
const HTML_START = /^\s*<(p|div|h[1-6]|ul|ol|section|table|blockquote|figure|details|a|span|strong|em|br)\b/i;
let processor: ReturnType<typeof createMarkdownProcessor> | undefined;
async function markdown(src: string): Promise<string> {
  processor ??= createMarkdownProcessor({ syntaxHighlight: false, smartypants: false });
  return (await (await processor).render(src)).code;
}
function dedent(s: string): string {
  const lines = s.replace(/\r\n/g, '\n').split('\n');
  const indents = lines.filter((l) => l.trim()).map((l) => (/^ */.exec(l) as RegExpExecArray)[0].length);
  const n = indents.length ? Math.min(...indents) : 0;
  return lines
    .map((l) => l.slice(n))
    .join('\n')
    .trim();
}
// The page styles reset spacing and bullets, so Markdown output inside the "text and image" block gets them back.
function spaced(html: string): string {
  let first = true;
  return html
    .replace(/<p>/g, () => (first ? ((first = false), '<p>') : '<p class="mt-4">'))
    .replace(/<ul>/g, '<ul class="mt-4 list-disc pl-6 space-y-1">')
    .replace(/<ol>/g, '<ol class="mt-4 list-decimal pl-6 space-y-1">')
    .replace(/<h([23]) id="[^"]*">/g, '<h$1 class="mt-6 text-xl font-bold font-heading">')
    .replace(/<a href=/g, '<a class="text-primary hover:underline" href=');
}
async function renderRich(sections: Section[]): Promise<Section[]> {
  return Promise.all(
    sections.map(async (s) => {
      if (s.type === 'content' && typeof s.content === 'string' && s.content.trim() && !HTML_START.test(s.content))
        return { ...s, content: spaced(await markdown(dedent(s.content))) };
      if (s.type === 'prose' && typeof s.html === 'string' && s.html.trim() && !HTML_START.test(s.html))
        return { ...s, html: await markdown(dedent(s.html)) };
      return s;
    })
  );
}

export async function loadPage(locale: Locale, slug: string): Promise<PageContent> {
  const page = loadPageRaw(locale, slug);
  return { ...page, sections: await renderRich(page.sections) };
}

function loadPageRaw(locale: Locale, slug: string): PageContent {
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
