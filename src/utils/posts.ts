// src/utils/posts.ts — blog data layer (replaces AstroWind's src/utils/blog.ts for our site).
// Posts live in src/data/post/<lang>/<key>.md ; the file name <key> is the URL slug.
// A French and an English post with the SAME file name are treated as translations of each other.
import { getCollection, type CollectionEntry } from 'astro:content';
import type { Locale } from './i18n';

export const POSTS_PER_PAGE = 9;

export type BlogPost = {
  entry: CollectionEntry<'post'>;
  lang: Locale;
  slug: string;
  path: string;
  title: string;
  excerpt?: string;
  image?: string;
  category?: string;
  tags: string[];
  author?: string;
  publishDate: Date;
  updateDate?: Date;
  metadata: Record<string, any>;
};

export const blogIndexPath = (lang: Locale) => `/${lang}/blog`;
export const blogPagePath = (lang: Locale, page: number) => (page <= 1 ? blogIndexPath(lang) : `${blogIndexPath(lang)}/page/${page}`);
export const postPath = (lang: Locale, slug: string) => `${blogIndexPath(lang)}/${slug}`;

function split(id: string): { lang: Locale; slug: string } | null {
  const [folder, ...rest] = id.split('/');
  if ((folder !== 'fr' && folder !== 'en') || rest.length === 0) return null;
  return { lang: folder, slug: rest.join('/') };
}

function normalize(entry: CollectionEntry<'post'>): BlogPost | null {
  const parts = split(entry.id);
  if (!parts) return null;
  const d = entry.data;
  return {
    entry,
    lang: parts.lang,
    slug: parts.slug,
    path: postPath(parts.lang, parts.slug),
    title: d.title,
    excerpt: d.excerpt,
    image: d.image,
    category: d.category,
    tags: d.tags ?? [],
    author: d.author,
    publishDate: d.publishDate ?? new Date(0),
    updateDate: d.updateDate,
    metadata: (d.metadata ?? {}) as Record<string, any>,
  };
}

/** Published posts of one language, newest first. Drafts and future-dated posts are left out. */
export async function getPosts(lang: Locale): Promise<BlogPost[]> {
  const now = Date.now();
  const all = await getCollection('post', ({ data }) => !data.draft);
  return all
    .map(normalize)
    .filter((p): p is BlogPost => !!p && p.lang === lang && p.publishDate.getTime() <= now)
    .sort((a, b) => b.publishDate.getTime() - a.publishDate.getTime());
}

export function paginate(posts: BlogPost[], page: number) {
  const totalPages = Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE));
  const items = posts.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE);
  return { items, page, totalPages };
}

// ── UI strings ──────────────────────────────────────────────────────────────
export const BLOG_UI = {
  fr: {
    nav: 'Blog',
    title: 'Le blog',
    description: 'Conseils d’utilisation, conservation des produits et nouvelles de la boutique.',
    empty: 'Aucun article pour le moment. Revenez bientôt !',
    readMore: 'Lire l’article',
    back: '← Retour au blog',
    newer: '← Plus récents',
    older: 'Plus anciens →',
    pageOf: (p: number, n: number) => `Page ${p} sur ${n}`,
    minRead: 'min de lecture',
    updated: 'Mis à jour le',
    ctaTitle: 'Envie de découvrir nos produits ?',
    ctaButton: 'Voir la boutique',
    rssTitle: (site: string) => `${site} — Blog`,
    pageTitle: (p: number) => (p > 1 ? `Le blog — page ${p}` : 'Le blog'),
    dateLocale: 'fr-FR',
  },
  en: {
    nav: 'Blog',
    title: 'The blog',
    description: 'Usage tips, product storage advice and news from the shop.',
    empty: 'No articles yet. Please check back soon!',
    readMore: 'Read the article',
    back: '← Back to the blog',
    newer: '← Newer',
    older: 'Older →',
    pageOf: (p: number, n: number) => `Page ${p} of ${n}`,
    minRead: 'min read',
    updated: 'Updated',
    ctaTitle: 'Want to discover our products?',
    ctaButton: 'Visit the shop',
    rssTitle: (site: string) => `${site} — Blog`,
    pageTitle: (p: number) => (p > 1 ? `The blog — page ${p}` : 'The blog'),
    dateLocale: 'en-US',
  },
} as const;

export function formatDate(date: Date, lang: Locale): string {
  return new Intl.DateTimeFormat(BLOG_UI[lang].dateLocale, { dateStyle: 'long' }).format(date);
}
