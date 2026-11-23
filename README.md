# Boutik storefront

The public website of a Boutik shop: home, about, contact, legal pages, shop, product pages, cart, payment, customer account, blog, FAQ, services, downloads and campaign landing pages. French and English.
Built with [Astro](https://astro.build) and Tailwind CSS, deployed as a Cloudflare Worker (static pages plus server-rendered product pages). It talks to `boutik-api` and is edited by the shop owner through a Git-based CMS at `/admin`.

> This repository is a **template**. Do not put a real client's names, addresses or content in it. Create a client's copy as described in the Deployment guide
> (clone the template, keep it as the `upstream` remote, then run `scripts/new-client.mjs`).

Started from the [AstroWind](https://github.com/onwidget/astrowind) template (MIT) and has since diverged a lot; see `LICENSE.md`.

## What a client changes

Everything that differs between clients is in a few places, so that updates from the template stay easy to merge:

| Where | What |
| --- | --- |
| `src/site.config.ts` | brand, city, contact details, WhatsApp, what the shop sells (`sells`, `quoteOnly`), languages, which areas are switched on (`features`), the look (`theme`) |
| `src/config.yaml` | site name, URL, title template, social metadata |
| `src/content/pages/<fr|en>/` | home, about, contact, FAQ, services and legal pages (YAML and Markdown, editable in the CMS) |
| `src/content/landing/` | campaign landing pages (`/offer/...`) |
| `src/data/post/` | blog posts |
| `public/` | icons, favicon, logo, images; `public/admin/` is the CMS |
| `wrangler.jsonc` | Worker name |
| build variables | `PUBLIC_*` (API address and key, currency, WhatsApp, pixels) |

## Set up a new client

On a fresh copy of the template:

```bash
npm install
node scripts/new-client.mjs --preset shop --brand "Acme" --city Lomé --country-fr Togo --country-en Togo \
  --whatsapp 22890000000 --email hello@acme.tg --site-url https://acme.tg \
  --theme ocean --worker-name acme-store --repo acme/acme-store --branch main
```

The script writes `site.config.ts`, the names in `config.yaml`, starter content, the Worker name and the CMS repository, then lists the files that still need a human (texts, legal pages, icons).
Run `node scripts/new-client.mjs` without options to see all flags (`--sells`, `--quote-only`, presets, locales, colours). The Deployment guide has the full checklist.

## Run it locally

Requires Node.js 22 or later.

```bash
npm install
npm run dev        # http://localhost:4321
```

Without `PUBLIC_MERCHANT_API_URL` the shop talks to `http://localhost:8787` (the API's `npm run dev`). Variables for a real API go in `.env` (never `.env.local`: it can silently override the build's values).

| Command | Purpose |
| --- | --- |
| `npm run dev` | development server |
| `npm run build` | production build into `dist/` (also prints `[env-guard]` checks) |
| `npm run preview` | build and run it in the Workers runtime |
| `npm run check` | `astro check`, ESLint and Prettier |
| `node scripts/check-cms.mjs` | checks that every content page matches the CMS definition |

## Configuration

Browser-visible values are **build variables** (set them in Cloudflare Workers Builds, not only in `wrangler.jsonc`):
`PUBLIC_MERCHANT_API_URL`, `PUBLIC_MERCHANT_PUBLIC_KEY`, `PUBLIC_MERCHANT_CURRENCY`, `PUBLIC_WHATSAPP_NUMBER` (optional override of `site.whatsapp`), `PUBLIC_MERCHANT_PROVIDER`, `PUBLIC_COD_COUNTRIES`,
`PUBLIC_ACCOUNT_AUTH_MODE`, `PUBLIC_TURNSTILE_SITEKEY`, `PUBLIC_META_PIXEL_ID`, `PUBLIC_TIKTOK_PIXEL_ID`. The Deployment guide lists them with their meaning.
At build time the storefront also checks the shop's plan against `site.config.ts` (`PLAN_CHECK=strict` makes a mismatch fail the build, `SKIP_PLAN_CHECK=1` skips it).

## The content editor (CMS)

`/admin` on the deployed site is [Sveltia CMS](https://github.com/sveltia/sveltia-cms). It edits the files in this repository through GitHub, so each change is a commit that triggers a rebuild.
`public/admin/config.yml` names the repository and branch; the part between the `k58 content pages` markers is generated from `src/content/pages` by `scripts/gen-cms-pages.mjs`.

## Deploy

Deployed by Cloudflare Workers Builds from git: build command `npm run build`, deploy command `npx wrangler deploy`. Add `wrangler` to this project's `devDependencies` so the version is pinned.

## Updating a client

Merge the template into the client's repository (`git fetch upstream && git merge upstream/main`), build, push. Read `CHANGELOG.md` first.

## Licence

MIT, see `LICENSE.md`. Contains code from AstroWind (MIT).
