// Landing content = one JSON file per campaign in src/content/landing/.
// File name = URL slug:  decouverte.json -> /offre/decouverte and /en/offer/decouverte
// Campaign JSON files are free-form (every block is optional), so the content is typed loosely on purpose.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LandingData = Record<string, any>;

const files = import.meta.glob('/src/content/landing/*.json', { eager: true, import: 'default' }) as Record<string, LandingData>;

const bySlug: Record<string, LandingData> = {};
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
