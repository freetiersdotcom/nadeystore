#!/usr/bin/env node
// Moves the French pages under src/pages/fr/ and rewrites links to the new URLs.
//   node scripts/restructure-fr.mjs            (run from the frontstore repo root)
//   node scripts/restructure-fr.mjs --dry-run  (show what would change)
// Safe to run twice. Never overwrites a page that already exists under fr/ (the old copy is kept as .bak).
import fs from 'node:fs';
import path from 'node:path';

const DRY = process.argv.includes('--dry-run');
const ROOT = process.cwd();
const PAGES = path.join(ROOT, 'src', 'pages');
const NAMES = ['a-propos', 'contact', 'faq', 'conditions', 'confidentialite', 'remboursement'];
const log = (...a) => console.log(...a);

if (!fs.existsSync(PAGES)) {
  console.error('src/pages not found — run this from the frontstore repo root.');
  process.exit(1);
}

const isStub = (file) => fs.existsSync(file) && /Astro\.redirect\(/.test(fs.readFileSync(file, 'utf8'));
const write = (file, text) => {
  if (DRY) return log('  [dry] write', path.relative(ROOT, file));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
};
const move = (from, to) => {
  if (DRY) return log('  [dry] move', path.relative(ROOT, from), '->', path.relative(ROOT, to));
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.renameSync(from, to);
};

const stub = (target, status) => `---
// Old URL kept alive: permanent redirect to the new location.
export const prerender = false;
return Astro.redirect('${target}' + Astro.url.search, ${status});
---
`;

// 1. Move root pages -> fr/, leave redirect stubs at the old URLs
log('Moving pages');
for (const name of [...NAMES, 'index']) {
  const from = path.join(PAGES, `${name}.astro`);
  const to = path.join(PAGES, 'fr', `${name}.astro`);
  const target = name === 'index' ? '/fr/' : `/fr/${name}`;
  const status = name === 'index' ? 302 : 301; // '/' stays temporary: it may later pick a language
  if (fs.existsSync(from) && !isStub(from)) {
    if (!fs.existsSync(to)) {
      move(from, to);
      if (!DRY) log('  moved', `${name}.astro`, '-> fr/');
    } else {
      log(`  fr/${name}.astro already exists: keeping it, old root page saved as ${name}.astro.bak`);
      if (!DRY) fs.renameSync(from, from + '.bak');
    }
  }
  if (!fs.existsSync(from)) {
    write(from, stub(target, status));
    log('  redirect stub', `${name}.astro ->`, target);
  }
}

// 1b. Ad landing pages: src/pages/offre/ -> src/pages/fr/offre/, old URL redirects
{
  const fromDir = path.join(PAGES, 'offre');
  const toDir = path.join(PAGES, 'fr', 'offre');
  const stubFile = path.join(fromDir, '[slug].astro');
  const slugStub = `---
// Old ad URL kept alive: permanent redirect to /fr/offre/<slug>.
export const prerender = false;
const { slug } = Astro.params;
return Astro.redirect('/fr/offre/' + slug + Astro.url.search, 301);
---
`;
  if (fs.existsSync(fromDir) && !isStub(stubFile)) {
    if (!fs.existsSync(toDir)) {
      move(fromDir, toDir);
      log('  moved offre/ -> fr/offre/');
    } else {
      log('  fr/offre/ already exists: keeping it, old offre/ saved as offre.bak');
      if (!DRY) fs.renameSync(fromDir, fromDir + '.bak');
    }
    write(stubFile, slugStub);
    log('  redirect stub offre/[slug].astro -> /fr/offre/<slug>');
  }
}

// 2. Rewrite links
const EXT = new Set(['.astro', '.ts', '.tsx', '.js', '.mjs', '.md', '.mdx', '.yaml', '.yml', '.json']);
const SKIP_FILES = new Set(['middleware.ts']); // legacy maps live there
const OLD = new RegExp(`(["'\`(])/(${NAMES.join('|')})(?=[#?/"'\`)\\s])`, 'g');
const changed = [];
const warn = [];

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); continue; }
    if (!EXT.has(path.extname(e.name)) || SKIP_FILES.has(e.name)) continue;
    let text = fs.readFileSync(p, 'utf8');
    if (/Astro\.redirect\(/.test(text) && text.length < 400) continue; // our stubs
    const rel = path.relative(ROOT, p).replace(/\\/g, '/');
    let next = text;
    if (rel.startsWith('src/pages/en/')) {
      // English pages must link to /en/... — never auto-point them at French pages.
      if (OLD.test(text)) warn.push(`${rel}  (links to a French page — should be an /en/ link)`);
      OLD.lastIndex = 0;
    } else {
      next = text.replace(OLD, (_m, q, n) => `${q}/fr/${n}`);
    }
    if (rel.startsWith('src/pages/fr/')) {
      next = next.replace(/href=(["'])\/\1/g, 'href=$1/fr/$1').replace(/getPermalink\((["'])\/\1\)/g, 'getPermalink($1/fr/$1)');
    } else if (/href=(["'])\/\1/.test(next) && !rel.startsWith('src/pages/en/')) {
      warn.push(`${rel}  (links to "/")`);
    }
    if (next !== text) {
      changed.push(rel);
      if (!DRY) fs.writeFileSync(p, next);
    }
  }
}
log('Rewriting links');
walk(path.join(ROOT, 'src'));
if (fs.existsSync(path.join(ROOT, 'src', 'pages', 'fr'))) { /* already walked via src */ }
changed.forEach((f) => log('  updated', f));
if (!changed.length) log('  nothing to update');
if (warn.length) {
  log('\nCheck by hand:');
  warn.forEach((f) => log('  ', f));
}
log(DRY ? '\nDry run: nothing was written.' : '\nDone. Review with git diff, then build.');
