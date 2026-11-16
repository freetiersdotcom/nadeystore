#!/usr/bin/env node
// Writes public/manifest.webmanifest (and the title/colours of public/offline.html) from src/site.config.ts.
// Runs automatically before `npm run dev` and `npm run build` (see package.json), or by hand: node scripts/gen-pwa.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { transform } = await import('esbuild');
const src = fs.readFileSync(path.join(root, 'src/site.config.ts'), 'utf8');
const js = (await transform(src, { loader: 'ts', format: 'esm' })).code;
const { site } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
const l = site.locales[0];
const fr = l === 'fr';
const icon = [{ src: '/icon-192.png', sizes: '192x192' }];
const shortcuts = [];
if (site.features.shop)
  shortcuts.push(
    { name: fr ? 'Boutique' : 'Shop', url: fr ? '/fr/boutique' : '/en/shop', icons: icon },
    { name: fr ? 'Panier' : 'Cart', url: fr ? '/fr/panier' : '/en/cart', icons: icon }
  );
if (site.features.services) shortcuts.push({ name: 'Services', url: `/${l}/services`, icons: icon });
if (!site.features.shop) shortcuts.push({ name: 'Contact', url: fr ? '/fr/contact' : '/en/contact', icons: icon });
const manifest = {
  name: site.brand,
  short_name: site.brand,
  description: site.tagline?.[l] ?? '',
  lang: l,
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'portrait',
  background_color: site.backgroundColor ?? '#F8F6F0',
  theme_color: site.themeColor ?? '#0F6B4B',
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
  shortcuts,
};
// Same layout as before: one icon/shortcut object per line.
const line = (o) =>
  JSON.stringify(o)
    .replace(/":/g, '": ')
    .replace(/,"/g, ', "')
    .replace(/\{"/g, '{ "')
    .replace(/\}/g, ' }')
    .replace(/\[\{ /g, '[{ ')
    .replace(/ \}\]/g, ' }]');
const out = [
  '{',
  ...Object.entries(manifest)
    .filter(([k]) => !['icons', 'shortcuts'].includes(k))
    .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`),
  '  "icons": [',
  manifest.icons.map((i) => '    ' + line(i)).join(',\n'),
  '  ],',
  '  "shortcuts": [',
  shortcuts.map((s) => '    ' + line(s)).join(',\n'),
  '  ]',
  '}',
  '',
].join('\n');
const mf = path.join(root, 'public/manifest.webmanifest');
if (!fs.existsSync(mf) || fs.readFileSync(mf, 'utf8') !== out) {
  fs.writeFileSync(mf, out);
  console.log('gen-pwa: manifest.webmanifest updated');
}
const off = path.join(root, 'public/offline.html');
if (fs.existsSync(off)) {
  let h = fs.readFileSync(off, 'utf8');
  const prev = h;
  h = h.replace(/<title>[^<]*<\/title>/, `<title>${site.brand}</title>`);
  const t0 = /<meta name="theme-color" content="(#[0-9a-fA-F]{3,8})"/.exec(h)?.[1];
  const b0 = /background:(#[0-9a-fA-F]{3,8})/.exec(h)?.[1];
  if (t0 && site.themeColor) h = h.split(t0).join(site.themeColor);
  if (b0 && site.backgroundColor) h = h.split(b0).join(site.backgroundColor);
  if (h !== prev) {
    fs.writeFileSync(off, h);
    console.log('gen-pwa: offline.html updated');
  }
}
