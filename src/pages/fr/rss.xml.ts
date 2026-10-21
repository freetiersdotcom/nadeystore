import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE } from 'astrowind:config';
import { getPosts, postPath, BLOG_UI } from '~/utils/posts';

export const prerender = true;

const lang = 'fr';

export async function GET(context: APIContext) {
  const posts = await getPosts(lang);
  return rss({
    title: BLOG_UI[lang].rssTitle(SITE.name),
    description: BLOG_UI[lang].description,
    site: context.site ?? SITE.site ?? '',
    items: posts.map((p) => ({
      title: p.title,
      description: p.excerpt,
      pubDate: p.publishDate,
      link: postPath(lang, p.slug),
    })),
  });
}
