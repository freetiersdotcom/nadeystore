#!/usr/bin/env node
// Sets this copy of the storefront up for a new client, from what the client sells.
//   node scripts/new-client.mjs --sells physical,digital,service [--quote-only] --brand "Acme" --city Lomé --country-fr Togo --country-en Togo \
//        --whatsapp 22890000000 --phone "+228 90 00 00 00" --email hello@acme.tg --site-url https://acme.tg \
//        [--address-fr "..."] [--address-en "..."] [--tagline-fr "..."] [--tagline-en "..."] [--locales fr,en] [--theme "#0F6B4B"] [--background "#F8F6F0"]
//   --sells        any of: physical (delivered goods), digital (downloads), service (appointments / bookable services). Comma separated.
//   --quote-only   the services are not sold online: visitors ask for a quote (contact form / WhatsApp). Without it, services are paid in the shop.
//   --preset       shortcuts for --sells: shop (physical,digital) | physical | digital | services (service, quote-only) | booking (service, paid) | shop-services (physical,digital,service)
//   --theme        a look: emerald | ocean | terracotta (needs kit 60), or a #hex for the browser/app colour. Default emerald.
//   --worker-name  name of the storefront Worker (wrangler.jsonc "name"), e.g. acme-store
//   --repo         owner/name of the GitHub repo the CMS edits (public/admin/config.yml), and --branch (default: left as is)
// Run it on a fresh copy of the template: it REPLACES src/site.config.ts, the home/about (and services) content files and the names in src/config.yaml.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { starterContent } from './starter-content.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const a = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++)
  if (argv[i].startsWith('--')) {
    const k = argv[i].slice(2);
    a[k] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  }
const PRESETS = {
  shop: { sells: ['physical', 'digital'], quoteOnly: false },
  physical: { sells: ['physical'], quoteOnly: false },
  digital: { sells: ['digital'], quoteOnly: false },
  services: { sells: ['service'], quoteOnly: true },
  booking: { sells: ['service'], quoteOnly: false },
  'shop-services': { sells: ['physical', 'digital', 'service'], quoteOnly: false },
};
const KINDS = ['physical', 'digital', 'service'];
let sells, quoteOnly;
if (a.sells) {
  sells = String(a.sells)
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  quoteOnly = !!a['quote-only'];
} else if (PRESETS[a.preset]) ({ sells, quoteOnly } = PRESETS[a.preset]);
const need = ['brand', 'city', 'whatsapp', 'email', 'site-url'].filter((k) => !a[k]);
if (!sells || !sells.length || !sells.every((k) => KINDS.includes(k)))
  need.unshift('--sells physical,digital,service (any of them) or --preset ' + Object.keys(PRESETS).join('|'));
if (quoteOnly && !sells.includes('service')) need.push('--quote-only only makes sense when --sells includes service');
if (need.length) {
  console.error(`Missing or invalid: ${need.join(', ')}\nSee the header of scripts/new-client.mjs.`);
  process.exit(1);
}
if (!/^\d{8,15}$/.test(a.whatsapp)) {
  console.error('--whatsapp: digits only, with the country code (e.g. 22890000000)');
  process.exit(1);
}
const q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
const locales = (a.locales || 'fr,en').split(',').map((s) => s.trim());
if (!locales.every((l) => ['fr', 'en'].includes(l))) {
  console.error('--locales: fr, en or fr,en');
  process.exit(1);
}
const cfr = a['country-fr'] || a['country-en'] || '',
  cen = a['country-en'] || a['country-fr'] || '';
const addr = (l) => a['address-' + l] || `${a.city}, ${l === 'fr' ? cfr : cen}`;
// kit 61: look of the site (kit 60) and the names the template hard-codes
const hasThemes = fs.existsSync(path.join(root, 'src/themes.ts'));
const THEME_HEX = { emerald: '#0F6B4B', ocean: '#0E7490', terracotta: '#A6482A' };
const isHex = typeof a.theme === 'string' && /^#[0-9a-fA-F]{6}$/.test(a.theme);
const themeName = typeof a.theme === 'string' && THEME_HEX[a.theme] ? a.theme : 'emerald';
const bad = [];
if (a.theme && !isHex && !THEME_HEX[a.theme]) bad.push('--theme: emerald, ocean, terracotta or a #RRGGBB colour');
if (THEME_HEX[a.theme] && !hasThemes) bad.push('--theme ' + a.theme + ' needs kit 60 (src/themes.ts not found)');
if (a['worker-name'] && !/^[a-z0-9][a-z0-9-]{0,62}$/.test(a['worker-name']))
  bad.push('--worker-name: lowercase letters, digits and dashes');
if (a.repo && !/^[\w.-]+\/[\w.-]+$/.test(a.repo)) bad.push('--repo: owner/name');
if (a.branch && !/^[\w./-]+$/.test(a.branch)) bad.push('--branch: a branch name');
if (bad.length) {
  console.error(bad.join('\n'));
  process.exit(1);
}
const themeHex = isHex ? a.theme : THEME_HEX[themeName];
const goods = sells.includes('physical') || sells.includes('digital');
const paidServices = sells.includes('service') && !quoteOnly;
const shop = goods || paidServices;
const feats = {
  shop,
  account: shop,
  blog: shop,
  faq: goods,
  services: sells.includes('service'),
  downloads: sells.includes('digital'),
};
const cfg = `// src/site.config.ts
// What changes from one client to the next. Plain values only (no imports, no import.meta.env): astro.config.ts reads this file too.
//
//   features  switch whole areas of the site on or off. A switched-off area disappears everywhere: its pages answer 404 (and are not built
//             into the site), the menu and footer stop linking to it, and the sitemap leaves it out.
//   locales   the languages the site is published in. With a single language the language switcher is hidden and the other tree answers 404.
//
// Pages: shop = shop, product pages, cart, payment, confirmation, downloads and the /offer landing pages.
//        account = customer account.  blog = blog and RSS.  faq = FAQ page.  services = services page.
//        Home, about, contact and the legal pages are always on.
// Created by scripts/new-client.mjs (sells: ${sells.join(', ')}${quoteOnly ? '; services by quote only' : ''}).

export type Locale = 'fr' | 'en';
export type FeatureName = 'shop' | 'account' | 'blog' | 'faq' | 'services' | 'downloads';
export type SellType = 'physical' | 'digital' | 'service';${
  hasThemes
    ? "\n/** Colours and fonts of the site: see src/themes.ts. */\nexport type ThemeName = 'emerald' | 'ocean' | 'terracotta';"
    : ''
}

export const site = {
  brand: ${q(a.brand)},
  city: ${q(a.city)},
  country: { fr: ${q(cfr)}, en: ${q(cen)} },
  address: {
    fr: ${q(addr('fr'))},
    en: ${q(addr('en'))},
  },
  /** Digits only, with the country code: https://wa.me/<whatsapp> */
  whatsapp: ${q(a.whatsapp)},
  email: ${q(a.email)},
  /** Phone number as shown on the contact page (free format) */
  phone: ${q(a.phone || '+' + a.whatsapp)},
  /** One sentence, used as the app description (manifest). */
  tagline: { fr: ${q(a['tagline-fr'] || '')}, en: ${q(a['tagline-en'] || '')} },
${
  hasThemes
    ? `  /** Look of the site: 'emerald', 'ocean' or 'terracotta' (see src/themes.ts). */\n  theme: ${q(themeName)} as ThemeName,\n`
    : ''
}  /** Browser/app colours (manifest and offline page). */
  themeColor: ${q(themeHex)},
  backgroundColor: ${q(a.background || '#F8F6F0')},

  /** What this business sells. physical = delivered goods, digital = downloads, service = appointments / bookable services. */
  sells: [${sells.map(q).join(', ')}] as SellType[],
  /** Services answered by quote (contact form / WhatsApp) instead of being sold and paid online. */
  quoteOnly: ${quoteOnly},

  locales: [${locales.map(q).join(', ')}] as Locale[],
  features: { ${Object.entries(feats)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ')} } as Record<FeatureName, boolean>,
};
`;
fs.writeFileSync(path.join(root, 'src/site.config.ts'), cfg);
// src/config.yaml: names and URL
const cy = path.join(root, 'src/config.yaml');
let y = fs.readFileSync(cy, 'utf8');
const crlf = y.includes('\r\n');
y = y.replace(/\r\n/g, '\n');
const yq = (s) => "'" + s.replace(/'/g, "''") + "'";
y = y
  .replace(/^(\s{2}name: ).*$/m, `$1${yq(a.brand)}`)
  .replace(/^(\s{2}site: ).*$/m, `$1${yq(a['site-url'])}`)
  .replace(/^(\s{4}default: ).*$/m, `$1${yq(a.brand)}`)
  .replace(/^(\s{4}template: ).*$/m, `$1${yq('%s — ' + a.brand)}`)
  .replace(/^(\s{4}site_name: ).*$/m, `$1${yq(a.brand)}`);
const desc = a['tagline-' + locales[0]];
if (desc) y = y.replace(/^(\s{2}description: ).*$/m, `$1${JSON.stringify(desc)}`);
fs.writeFileSync(cy, crlf ? y.replace(/\n/g, '\r\n') : y);
// kit 61: names the template hard-codes (Worker, CMS repo, CMS page title)
const touchFile = (rel, fn) => {
  const f = path.join(root, rel);
  if (!fs.existsSync(f)) return false;
  const raw = fs.readFileSync(f, 'utf8');
  const eol = raw.includes('\r\n');
  const out = fn(raw.replace(/\r\n/g, '\n'));
  fs.writeFileSync(f, eol ? out.replace(/\n/g, '\r\n') : out);
  return true;
};
const renamed = [];
if (
  a['worker-name'] &&
  touchFile('wrangler.jsonc', (t) => t.replace(/^(\s*"name"\s*:\s*)"[^"]*"/m, `$1"${a['worker-name']}"`))
)
  renamed.push('wrangler.jsonc (Worker name)');
if (
  (a.repo || a.branch) &&
  touchFile('public/admin/config.yml', (t) => {
    if (a.repo) t = t.replace(/^(\s*repo:\s*).*$/m, `$1${a.repo}`);
    if (a.branch) t = t.replace(/^(\s*branch:\s*).*$/m, `$1${a.branch}`);
    return t;
  })
)
  renamed.push('public/admin/config.yml (repo/branch)');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
if (
  touchFile('public/admin/index.html', (t) =>
    t.replace(/<title>[^<]*<\/title>/, `<title>Contenu — ${esc(a.brand)}</title>`)
  )
)
  renamed.push('public/admin/index.html (title)');
// content
const content = starterContent(sells, quoteOnly);
const copied = [];
for (const l of ['fr', 'en'])
  for (const [slug, text] of Object.entries(content[l])) {
    const to = path.join(root, 'src/content/pages', l, slug + '.yaml');
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.writeFileSync(to, text);
    copied.push(`src/content/pages/${l}/${slug}.yaml`);
  }
spawnSync(process.execPath, [path.join(root, 'scripts/gen-pwa.mjs')], { stdio: 'inherit' });
console.log(
  `\nSite set up for ${a.brand} (sells: ${sells.join(', ')}${quoteOnly ? ', services by quote' : ''}).\nWritten: src/site.config.ts, src/config.yaml (name, URL, title template), ${copied.length} starter content files, manifest.\n`
);
console.log(
  'Still to do by hand:\n' +
    [
      'rewrite the starter texts: src/content/pages/<fr|en>/home.yaml, about.yaml' +
        (feats.services ? ', services.yaml' : ''),
      'rewrite contact.yaml, faq.yaml and the legal pages (privacy, terms, refund) for this client' +
        (feats.shop ? '' : ' (terms and refund still describe an online shop: have them reviewed)'),
      'icons in public/ (icon-192.png, icon-512.png, icon-maskable-512.png, favicon) and the colours in the Tailwind theme',
      'src/config.yaml: twitter handle, Google verification id; .env: PUBLIC_MERCHANT_API_URL and PUBLIC_MERCHANT_PUBLIC_KEY',
      feats.shop
        ? 'API: products, shipping, payment provider'
        : 'API: no shop needed (modules off); contact form and WhatsApp are the way in',
    ]
      .map((s) => '  - ' + s)
      .join('\n')
);
// kit 61: what was renamed, and what still mentions the first client
if (renamed.length) console.log('Also updated: ' + renamed.join(', '));
const LEFT = /nadeystore|freetiers|Santé Natur|2290194458956/i;
const SKIP_DIR = ['node_modules', 'dist', '.astro', '.git', '.wrangler'];
const SKIP_FILE = /\.(bak|png|jpe?g|webp|svg|ico|woff2?|zip)$|package-lock\.json$|\.created$/;
const found = [];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (SKIP_DIR.includes(e.name)) continue;
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f);
    else if (!SKIP_FILE.test(e.name) && e.name !== 'new-client.mjs') {
      const t = fs.readFileSync(f, 'utf8');
      const n = t.includes('\0') ? 0 : t.split('\n').filter((l) => LEFT.test(l)).length;
      if (n) found.push(`${path.relative(root, f)} (${n} line${n > 1 ? 's' : ''})`);
    }
  }
};
walk(root);
console.log(
  found.length
    ? '\nStill mention the first client (rewrite or remove):\n' + found.map((s) => '  - ' + s).join('\n')
    : '\nNo file mentions the first client any more.'
);
