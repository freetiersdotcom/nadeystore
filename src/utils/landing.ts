// Landing content = one JSON file per campaign in src/content/landing/.
// File name = URL slug:  decouverte.json -> /offre/decouverte and /en/offer/decouverte
const files = import.meta.glob('/src/content/landing/*.json', { eager: true, import: 'default' }) as Record<string, any>;

const bySlug: Record<string, any> = {};
for (const [path, data] of Object.entries(files)) {
  const slug = path.split('/').pop()!.replace(/\.json$/, '');
  bySlug[slug] = data;
}

export function landingSlugs(): string[] {
  return Object.keys(bySlug);
}

export function landingContent(slug: string, locale: 'fr' | 'en') {
  const d = bySlug[slug];
  // Fall back to French if an English version has not been written yet.
  return d?.[locale] ?? d?.fr;
}
