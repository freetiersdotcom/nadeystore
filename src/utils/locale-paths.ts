// src/utils/locale-paths.ts
// Blog-aware version of alternatePath(): used by Layout.astro (hreflang) and
// LanguageSwitcher.astro. For a blog article it points to the translation when one
// exists (same file name in the other language), otherwise to the other language's blog index.
import { getCollection } from 'astro:content';
import { alternatePath, type Locale } from './i18n';

export async function alternatePathFor(pathname: string, target: Locale): Promise<string> {
  const clean = pathname.replace(/\/+$/, '');
  const m = clean.match(/^\/(fr|en)\/blog(?:\/(.+))?$/);
  if (!m) return alternatePath(pathname, target);

  const from = m[1] as Locale;
  if (from === target) return clean;

  const rest = m[2];
  if (!rest || rest.startsWith('page/')) return `/${target}/blog`;

  const posts = await getCollection('post', ({ data }) => !data.draft);
  const exists = posts.some((p) => p.id === `${target}/${rest}`);
  return exists ? `/${target}/blog/${rest}` : `/${target}/blog`;
}
