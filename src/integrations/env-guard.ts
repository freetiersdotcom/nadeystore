// src/integrations/env-guard.ts
// A storefront built without its API address silently talks to http://localhost:8787 (the shopper's own computer) and shows no products.
// PUBLIC_* values are read when the site is BUILT, so they must exist in the build environment (.env / .env.local on your computer,
// the build variables of Cloudflare, ...). This check stops the build, or warns, before such a site is published.
//   SKIP_ENV_GUARD=1  turns the check off
import type { AstroIntegration } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import { loadEnv } from 'vite';

export function envGuard(): AstroIntegration {
  return {
    name: 'env-guard',
    hooks: {
      'astro:config:setup': ({ command, logger, updateConfig }) => {
        if ((command !== 'build' && command !== 'dev') || process.env.SKIP_ENV_GUARD) return;
        // Values given by the build environment win over any .env / .env.local file that happens to be in the project.
        const forced: Record<string, string> = {};
        for (const [k, v] of Object.entries(process.env))
          if (/^PUBLIC_/.test(k) && v) forced[`import.meta.env.${k}`] = JSON.stringify(v);
        if (Object.keys(forced).length) updateConfig({ vite: { define: forced } });
        for (const name of ['.env', '.env.local', '.env.production', '.env.production.local']) {
          const f = path.join(process.cwd(), name);
          if (!fs.existsSync(f)) continue;
          for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
            const m = /^\s*(PUBLIC_[A-Z0-9_]+)\s*=\s*["']?([^"'#\s]*)/.exec(line);
            if (m && process.env[m[1]] && process.env[m[1]] !== m[2])
              logger.warn(
                `${name} sets ${m[1]} differently from the build environment; the build environment value is used. Remove it from ${name} (and from git) to avoid confusion.`
              );
          }
        }
        const file = loadEnv(command === 'build' ? 'production' : 'development', process.cwd(), 'PUBLIC_');
        const url = process.env.PUBLIC_MERCHANT_API_URL ?? file.PUBLIC_MERCHANT_API_URL;
        const key = process.env.PUBLIC_MERCHANT_PUBLIC_KEY ?? file.PUBLIC_MERCHANT_PUBLIC_KEY;
        // Shown in every build log (names and the API address only; the key is masked), to see what the build really received.
        const source = process.env.PUBLIC_MERCHANT_API_URL
          ? 'build environment'
          : file.PUBLIC_MERCHANT_API_URL
            ? '.env file'
            : 'nowhere';
        const seen = Object.keys(process.env).filter((k) => /^PUBLIC_|MERCHANT/i.test(k));
        logger.info(
          `API address: ${url || '(none)'} [from ${source}]; public key: ${key ? `${key.slice(0, 6)}…${key.slice(-4)}` : '(none)'}; PUBLIC_/MERCHANT variables in the build environment: ${seen.join(', ') || 'none'}`
        );
        const problems: string[] = [];
        if (!url)
          problems.push(
            'PUBLIC_MERCHANT_API_URL is not set (the shop would call http://localhost:8787 and show no products).'
          );
        if (!key || /your_public_key/.test(key))
          problems.push('PUBLIC_MERCHANT_PUBLIC_KEY is missing or still the placeholder (the API would answer 401).');
        const local = !!url && /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(url);
        const ci = !!(process.env.CI || process.env.CF_PAGES || process.env.WORKERS_CI);
        if (local) {
          const msg = `PUBLIC_MERCHANT_API_URL points to ${url}: shoppers' browsers would look for the API on their own computer.`;
          if (command === 'build' && ci) problems.push(msg);
          else if (command === 'build') logger.warn(`${msg} Fine for a local test, wrong for a published site.`);
        }
        if (!problems.length) return;
        const text = `${problems.join('\n  ')}\n  Set them in the environment that builds the site, then build again (SKIP_ENV_GUARD=1 skips this check).`;
        if (command === 'build') throw new Error(`env-guard: ${text}`);
        logger.warn(text);
      },
    },
  };
}
