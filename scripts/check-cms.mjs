#!/usr/bin/env node
// Checks that every content page can be opened and saved by the CMS: each key of src/content/pages/** must be described in
// public/admin/config.yml (collections pages_fr / pages_en), each section type must exist, and required fields must be filled.
// A key the CMS does not know would be silently dropped the next time an editor saves the page.
//   node scripts/check-cms.mjs [project-dir]
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const root = path.resolve(process.argv[2] ?? '.');
const cfgPath = path.join(root, 'public/admin/config.yml');
if (!fs.existsSync(cfgPath)) {
  console.error('public/admin/config.yml not found');
  process.exit(2);
}
const cfg = yaml.load(fs.readFileSync(cfgPath, 'utf8'));
const colls = (cfg.collections ?? []).filter((c) => /^pages_(fr|en)$/.test(c.name));
if (!colls.length) {
  console.error('No pages_fr / pages_en collection in config.yml: apply kit 58 first.');
  process.exit(2);
}

const errors = [];
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const kind = (v) => (v === null ? 'null' : Array.isArray(v) ? 'list' : typeof v);

function fieldsOf(f) {
  return f.fields ?? (f.field ? [f.field] : []);
}

function check(value, f, where) {
  const w = f.widget ?? 'string';
  if (value === undefined || value === null || value === '') {
    if (f.required !== false && !['hidden', 'boolean'].includes(w) && value === undefined)
      errors.push(`${where}: required field "${f.name}" is missing`);
    return;
  }
  switch (w) {
    case 'hidden':
      return;
    case 'string':
    case 'text':
    case 'image':
    case 'markdown':
      if (typeof value !== 'string') errors.push(`${where}: "${f.name}" should be text, found ${kind(value)}`);
      return;
    case 'number':
      if (typeof value !== 'number') errors.push(`${where}: "${f.name}" should be a number, found ${kind(value)}`);
      return;
    case 'boolean':
      if (typeof value !== 'boolean') errors.push(`${where}: "${f.name}" should be true/false, found ${kind(value)}`);
      return;
    case 'select': {
      const ok = (f.options ?? []).map((o) => (isObj(o) ? o.value : o));
      if (!ok.includes(value))
        errors.push(`${where}: "${f.name}" = ${JSON.stringify(value)} is not one of ${ok.join(', ')}`);
      return;
    }
    case 'object':
      return checkObject(value, fieldsOf(f), `${where}.${f.name}`);
    case 'list': {
      if (!Array.isArray(value)) {
        errors.push(`${where}: "${f.name}" should be a list, found ${kind(value)}`);
        return;
      }
      value.forEach((item, i) => {
        const at = `${where}.${f.name}[${i}]`;
        if (f.types) {
          if (!isObj(item)) {
            errors.push(`${at}: should be a block`);
            return;
          }
          const key = f.typeKey ?? 'type';
          const t = f.types.find((x) => x.name === item[key]);
          if (!t) {
            errors.push(`${at}: section type "${item[key]}" is not described in the CMS`);
            return;
          }
          const rest = { ...item };
          delete rest[key];
          checkObject(rest, t.fields ?? [], `${at}<${t.name}>`);
        } else if (f.field) check(item, f.field, at);
        else checkObject(item, f.fields ?? [], at);
      });
      return;
    }
    default:
      errors.push(`${where}: widget "${w}" is not handled by this check`);
  }
}

function checkObject(obj, fields, where) {
  if (!isObj(obj)) {
    errors.push(`${where}: should be a block, found ${kind(obj)}`);
    return;
  }
  const known = new Set(fields.map((f) => f.name));
  for (const k of Object.keys(obj))
    if (!known.has(k)) errors.push(`${where}: key "${k}" is not described in the CMS (it would be lost when saved)`);
  for (const f of fields) check(obj[f.name], f, where);
}

let n = 0;
for (const c of colls)
  for (const file of c.files ?? []) {
    const p = path.join(root, file.file);
    if (!fs.existsSync(p)) continue;
    n++;
    const src = fs.readFileSync(p, 'utf8');
    let data;
    if (file.file.endsWith('.md')) {
      const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(src);
      if (!m) {
        errors.push(`${file.file}: front matter (--- block) not found`);
        continue;
      }
      data = { ...yaml.load(m[1]), body: m[2].trim() };
    } else data = yaml.load(src);
    checkObject(data, file.fields, file.file);
  }
if (errors.length) {
  console.error(errors.map((e) => '  ' + e).join('\n') + `\n\n${errors.length} problem(s) in ${n} page file(s).`);
  process.exit(1);
}
console.log(`OK: ${n} page file(s) match the CMS description.`);
