#!/usr/bin/env node
// Turns the HTML texts of the content pages into Markdown, so the CMS shows them with normal formatting (bold, lists, links)
// instead of tags. Covers the "text and image" body, the free text block and the legal pages.
// A text is converted only when the Markdown renders to exactly the same words, links, lists and headings; anything else
// (special classes, unusual tags) is left as HTML, which keeps working.
//   node scripts/pages-to-markdown.mjs            show what would change
//   node scripts/pages-to-markdown.mjs --write    do it (keep a Git commit before, it is your backup)
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';

const write = process.argv.includes('--write');
const root = path.resolve(process.argv.find((a, i) => i > 1 && !a.startsWith('--')) ?? '.');
const pagesDir = path.join(root, 'src/content/pages');
const HTML_START = /^\s*<(p|div|h[1-6]|ul|ol|section|table|blockquote|figure|details|a|span|strong|em|br)\b/i;

class Unsupported extends Error {}
const no = (why) => {
  throw new Unsupported(why);
};

// ── HTML subset → tree ──
const ENT = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  rsquo: '’',
  lsquo: '‘',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  laquo: '«',
  raquo: '»',
};
const decode = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#')
      return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENT[e] ?? no(`entity &${e};`);
  });
const VOID = new Set(['br']);
const OK = new Set(['p', 'h2', 'h3', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'a', 'br']);
function parse(html) {
  const re =
    /<(\/?)([a-zA-Z0-9]+)((?:\s+[a-zA-Z-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'))?)*)\s*(\/?)>|<!--[\s\S]*?-->|([^<]+)|(<)/g;
  const root = { tag: 'root', children: [] };
  const stack = [root];
  let m;
  while ((m = re.exec(html))) {
    if (m[6]) no('stray <');
    if (m[5] !== undefined) {
      stack.at(-1).children.push({ text: decode(m[5]) });
      continue;
    }
    if (!m[2]) continue; // comment
    const tag = m[2].toLowerCase();
    if (!OK.has(tag)) no(`tag <${tag}>`);
    if (m[1]) {
      const top = stack.pop();
      if (top.tag !== tag) no(`unbalanced </${tag}>`);
      continue;
    }
    const attrs = {};
    for (const a of m[3].matchAll(/([a-zA-Z-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g))
      attrs[a[1].toLowerCase()] = a[2] ?? a[3] ?? '';
    const node = { tag, attrs, children: [] };
    if (tag === 'p') {
      const bad = Object.entries(attrs).find(([k, v]) => !(k === 'class' && /^(mt-\d+)?$/.test(v)));
      if (bad) no(`<p ${bad[0]}="${bad[1]}">`);
    } else if (tag === 'a') {
      if (!attrs.href || Object.keys(attrs).some((k) => k !== 'href')) no('<a> with attributes other than href');
    } else if (Object.keys(attrs).length) no(`attributes on <${tag}>`);
    stack.at(-1).children.push(node);
    if (!VOID.has(tag) && !m[4]) stack.push(node);
  }
  if (stack.length !== 1) no('unclosed tag');
  return root;
}

// ── tree → Markdown ──
const esc = (s) => s.replace(/([\\`*_[\]<>])/g, '\\$1');
function inline(nodes) {
  let out = '';
  for (const n of nodes) {
    if (n.text !== undefined) out += esc(n.text.replace(/\s+/g, ' '));
    else if (n.tag === 'br') out += '  \n';
    else if (n.tag === 'strong' || n.tag === 'b') out += `**${inline(n.children).trim()}**`;
    else if (n.tag === 'em' || n.tag === 'i') out += `*${inline(n.children).trim()}*`;
    else if (n.tag === 'a')
      out += `[${inline(n.children).trim()}](${n.attrs.href.replace(/\)/g, '%29').replace(/ /g, '%20')})`;
    else no(`<${n.tag}> inside text`);
  }
  return out
    .replace(/ *\n */g, (s) => (s.startsWith(' ') && s.length > 2 ? '  \n' : s))
    .replace(/[ \t]+$/gm, (s, off, all) => (all.slice(off + s.length).startsWith('\n') && s.length >= 2 ? '  ' : ''));
}
const lead = (s) => s.replace(/^(#{1,6}\s|[-+]\s|\d+[.)]\s|>)/, '\\$1');
function blocks(nodes) {
  const out = [];
  for (const n of nodes) {
    if (n.text !== undefined) {
      if (n.text.trim()) no('loose text outside a paragraph');
      continue;
    }
    if (n.tag === 'p') out.push(lead(inline(n.children).trim()));
    else if (n.tag === 'h2' || n.tag === 'h3')
      out.push(`${n.tag === 'h2' ? '##' : '###'} ${inline(n.children).trim()}`);
    else if (n.tag === 'ul' || n.tag === 'ol') {
      const items = n.children.filter((c) => c.text === undefined || c.text.trim());
      if (items.some((c) => c.tag !== 'li')) no('list with something other than <li>');
      out.push(
        items
          .map((li, i) => {
            if (li.children.some((c) => c.tag && !['strong', 'b', 'em', 'i', 'a', 'br'].includes(c.tag)))
              no('block inside <li>');
            return `${n.tag === 'ul' ? '-' : `${i + 1}.`} ${inline(li.children).trim()}`;
          })
          .join('\n')
      );
    } else no(`<${n.tag}> at top level`);
  }
  return out.join('\n\n');
}
const toMarkdown = (html) => blocks(parse(html).children);

// ── proof: same words, links, items, headings ──
const processor = await createMarkdownProcessor({ syntaxHighlight: false, smartypants: false });
const safeUri = (u) => {
  try {
    return decodeURIComponent(u);
  } catch {
    return u;
  }
};
const fingerprint = (h) => ({
  text: decode(h.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim(),
  links: [...h.matchAll(/<a\s[^>]*href="([^"]*)"/g)].map((x) => safeUri(x[1].replace(/&amp;/g, '&'))).join('|'),
  li: (h.match(/<li\b/g) ?? []).length,
  ul: (h.match(/<ul\b/g) ?? []).length,
  ol: (h.match(/<ol\b/g) ?? []).length,
  h2: (h.match(/<h2\b/g) ?? []).length,
  h3: (h.match(/<h3\b/g) ?? []).length,
  strong: (h.match(/<(strong|b)\b/g) ?? []).length,
  em: (h.match(/<(em|i)\b/g) ?? []).length,
  br: (h.match(/<br\b/g) ?? []).length,
  p: (h.match(/<p\b/g) ?? []).length,
});
async function convert(html) {
  const md = toMarkdown(html);
  const a = fingerprint(html);
  const b = fingerprint((await processor.render(md)).code);
  for (const k of Object.keys(a)) if (a[k] !== b[k]) no(`check failed on ${k}`);
  return md;
}

// ── files ──
const report = { converted: 0, kept: 0, already: 0 };
const say = (file, what, why) =>
  console.log(`  ${what.padEnd(9)} ${path.relative(root, file)}${why ? ` — ${why}` : ''}`);
async function rich(file, label, value) {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  if (!HTML_START.test(value)) {
    report.already++;
    return undefined;
  }
  try {
    const md = await convert(value);
    report.converted++;
    say(file, 'convert', label);
    return md;
  } catch (e) {
    if (!(e instanceof Unsupported)) throw e;
    report.kept++;
    say(file, 'keep HTML', `${label}: ${e.message}`);
    return undefined;
  }
}
for (const loc of fs.readdirSync(pagesDir)) {
  const dir = path.join(pagesDir, loc);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const f of fs.readdirSync(dir).sort()) {
    const file = path.join(dir, f);
    const src = fs.readFileSync(file, 'utf8');
    const eol = src.includes('\r\n') ? '\r\n' : '\n';
    if (f.endsWith('.yaml')) {
      const doc = yaml.load(src);
      let touched = false;
      for (const [i, s] of (doc.sections ?? []).entries()) {
        const key = s.type === 'content' ? 'content' : s.type === 'prose' ? 'html' : null;
        const md = key ? await rich(file, `section ${i + 1} (${s.type})`, s[key]) : undefined;
        if (md !== undefined) {
          s[key] = md;
          touched = true;
        }
      }
      if (touched && write) fs.writeFileSync(file, yaml.dump(doc, { lineWidth: -1 }).replace(/\n/g, eol));
    } else if (f.endsWith('.md')) {
      const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(src);
      if (!m) continue;
      const md = await rich(file, 'text', m[2]);
      if (md !== undefined && write)
        fs.writeFileSync(
          file,
          `---${eol}${m[1].replace(/\r?\n/g, eol)}${eol}---${eol}${eol}${md.replace(/\n/g, eol)}${eol}`
        );
    }
  }
}
console.log(
  `\n${report.converted} converted, ${report.kept} kept as HTML, ${report.already} already Markdown.${write ? '' : '  (dry run: use --write to apply)'}`
);
