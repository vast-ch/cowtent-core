import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * What a host needs to serve the built blog safely, written into dist/ so
 * that a blog's own host settings stay down to its build command and
 * folder:
 *
 * - The Content-Security-Policy as a <meta> in every page, which every host
 *   honours, GitHub Pages too. Its script hashes are those of the page's own
 *   inline scripts (vite-ember-ssr's rehydration flag, Glimmer's markers),
 *   so they follow whatever the build put there.
 * - `_headers`, read by Netlify and Cloudflare: the fingerprinted assets
 *   are cached forever, and the swisstopo map viewer may load a post's GPX
 *   from another origin. Hosts without it ignore it.
 */
const POLICY = {
  'default-src': ["'none'"],
  'script-src': ["'self'"],
  // The blog's colour is an inline <style>, Tailwind sets style attributes
  'style-src': ["'self'", "'unsafe-inline'"],
  'font-src': ["'self'"],
  // data: are the CSS's SVG masks and badges
  'img-src': ["'self'", 'data:'],
  'connect-src': ["'self'"],
  // Posts embed YouTube and the swisstopo map (lib/route.mjs)
  'frame-src': [
    'https://www.youtube.com/embed/',
    'https://www.youtube-nocookie.com/embed/',
    'https://map.geo.admin.ch/',
  ],
  'manifest-src': ["'self'"],
  'worker-src': ["'self'"],
  'base-uri': ["'self'"],
  'form-action': ["'none'"],
};

const INLINE_SCRIPT = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g;

export function policyOf(html) {
  const hashes = [...html.matchAll(INLINE_SCRIPT)].map(
    ([, code]) =>
      `'sha256-${createHash('sha256').update(code).digest('base64')}'`,
  );
  const policy = {
    ...POLICY,
    'script-src': [...POLICY['script-src'], ...new Set(hashes)],
  };

  return Object.entries(policy)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
}

/**
 * The page with its policy at the start of <head>, before anything it
 * governs: right after <meta charset>, which has to be in the first 1024
 * bytes
 */
export function withPolicy(html) {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${policyOf(html)}">`;
  const charset = /<meta charset=[^>]*>/i;
  const start = charset.test(html) ? charset : /<head(\s[^>]*)?>/;

  return html.replace(start, (tag) => `${tag}\n    ${meta}`);
}

export const HEADERS = `# Netlify and Cloudflare read this, other hosts ignore it (lib/host.mjs)

# Fingerprinted by Vite: never change, cache forever. The swisstopo map
# viewer (map.geo.admin.ch) loads a post's GPX from here cross-origin.
/assets/*
  Cache-Control: public, max-age=31536000, immutable
  Access-Control-Allow-Origin: *
`;

/**
 * Adds the policy to every page in `dir` and writes `_headers`
 */
export function prepareForHosts(dir) {
  for (const file of htmlFiles(dir)) {
    writeFileSync(file, withPolicy(readFileSync(file, 'utf8')));
  }

  writeFileSync(join(dir, '_headers'), HEADERS);
}

function htmlFiles(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => join(entry.parentPath, entry.name));
}
