import path from 'path';
import { fileURLToPath } from 'url';

import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import partytown from '@astrojs/partytown';
import icon from 'astro-icon';
import compress from 'astro-compress';
import type { AstroIntegration } from 'astro';

import astrowind from './vendor/integration';

import { readingTimeRemarkPlugin, responsiveTablesRehypePlugin, lazyImagesRehypePlugin } from './src/utils/frontmatter';

import cloudflare from "@astrojs/cloudflare";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// How product pages (src/pages/fr/produits/[slug].astro and src/pages/en/products/[slug].astro) are built:
//   PRODUCT_PAGES_MODE=ssr     (default) rendered on demand, always fresh
//   PRODUCT_PAGES_MODE=static  prerendered at build; the API triggers rebuilds via a deploy hook
// Set it as a build variable in Cloudflare (Workers Builds > Settings > Build variables).
const productPagesStatic = (process.env.PRODUCT_PAGES_MODE ?? 'ssr').toLowerCase() === 'static';

const productPagesMode: AstroIntegration = {
  name: 'product-pages-mode',
  hooks: {
    'astro:route:setup': ({ route }) => {
      const comp = route.component.replace(/\\/g, '/');
      if (comp.endsWith('/fr/produits/[slug].astro') || comp.endsWith('/en/products/[slug].astro')) {
        route.prerender = productPagesStatic;
      }
    },
  },
};

const hasExternalScripts = false;
const whenExternalScripts = (items: (() => AstroIntegration) | (() => AstroIntegration)[] = []) =>
  hasExternalScripts ? (Array.isArray(items) ? items.map((item) => item()) : [items()]) : [];

export default defineConfig({
  output: 'static',

  integrations: [
    productPagesMode,
    sitemap(),
    mdx(),
    icon({
      include: {
        tabler: ['*'],
        'flat-color-icons': [
          'template',
          'gallery',
          'approval',
          'document',
          'advertising',
          'currency-exchange',
          'voice-presentation',
          'business-contact',
          'database',
        ],
      },
    }),

    ...whenExternalScripts(() =>
      partytown({
        config: { forward: ['dataLayer.push'] },
      })
    ),

    compress({
      CSS: true,
      HTML: {
        'html-minifier-terser': {
          removeAttributeQuotes: false,
        },
      },
      Image: false,
      JavaScript: true,
      SVG: false,
      Logger: 1,
    }),

    astrowind({
      config: './src/config.yaml',
    }),
  ],

  image: {
    domains: ['cdn.pixabay.com'],
  },

  markdown: {
    remarkPlugins: [readingTimeRemarkPlugin],
    rehypePlugins: [responsiveTablesRehypePlugin, lazyImagesRehypePlugin],
  },

  vite: {
    resolve: {
      alias: {
        '~': path.resolve(__dirname, './src'),
      },
    },
  },

  // Astro 7 / adapter v14: keep the previous behaviour.
  //  - imageService 'compile': images are compressed at build time and served as plain files (no Cloudflare Images billing,
  //    no runtime transform endpoint).
  //  - prerenderEnvironment 'node': static pages are rendered by Node at build time. In workerd the clock reads 1970 during
  //    the build (footer year, any new Date()).
  adapter: cloudflare({ imageService: 'compile', prerenderEnvironment: 'node' }),
  // No KV session store is created (the shop does not use Astro sessions).
  session: false,
  // Astro 7's own whitespace compression removes the space before inline links ("accept our<a>"); html-minifier-terser
  // (astro-compress) already minifies the HTML, so turn Astro's off.
  compressHTML: false,
});
