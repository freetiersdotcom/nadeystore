// src/integrations/feature-gate.ts
// Static pages are plain files on the CDN, so the middleware never sees them. After the build, delete the files of any switched-off
// area (src/site.config.ts) so that they answer 404 like the on-demand pages do.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { isPathEnabled } from '../utils/features';

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f, out); else out.push(f);
  }
  return out;
}

export function featureGate(): AstroIntegration {
  return {
    name: 'feature-gate',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        let removed = 0;
        for (const file of walk(root)) {
          const rel = path.relative(root, file).split(path.sep).join('/');
          if (rel.startsWith('_astro/') || rel.startsWith('_worker.js')) continue;
          const url = '/' + rel.replace(/(^|\/)index\.html$/, '').replace(/\.html$/, '');
          if (isPathEnabled(url)) continue;
          fs.unlinkSync(file); removed++;
        }
        // drop folders left empty
        const prune = (d: string) => {
          for (const e of fs.readdirSync(d, { withFileTypes: true })) if (e.isDirectory()) prune(path.join(d, e.name));
          if (d !== root && fs.readdirSync(d).length === 0) fs.rmdirSync(d);
        };
        prune(root);
        if (removed) logger.info(`feature-gate: removed ${removed} file(s) of switched-off areas`);
      },
    },
  };
}
