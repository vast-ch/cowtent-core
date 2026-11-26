import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parse } from 'yaml';

import { THEMES } from './themes.mjs';

/**
 * The settings of a blog, from `site.yaml` in its content folder. Everything
 * has a default, so a blog with an empty site.yaml still builds.
 *
 *   title: Bella's Cowtent
 *   short-title: Cowtent      # optional, under the app's icon; the title
 *                             # when there is none
 *   description: A cow on summer holidays in the Alps
 *   owner: Bella                # "Written by"
 *   url: https://bella.github.io  # optional, where the site lives: the feed,
 *                                 # and a path in it is the site's base
 *   email: bella@example.com      # optional, "Send me a note" under posts
 *   about: about                # the page "Written by" links to (pages/about)
 *   menu:                       # links under Explore, to pages
 *     - label: About me
 *       page: about
 *   language: en                # the words around the posts, and the
 *                               # tag names: languages/en.yaml
 *   theme: alps                 # the look: alps, basecamp or night
 *   theme-switcher: false       # true lets visitors pick a theme
 *   colours:                    # optional, the blog's own over the
 *     - "#ff1493"               # theme's: colour-1 (links, buttons), …
 */
const DEFAULTS = {
  title: 'My outdoor blog',
  description: '',
  owner: '',
  url: '',
  email: '',
  about: undefined,
  menu: [],
  language: 'en',
  theme: THEMES[0],
  'theme-switcher': false,
};

export function readSite(contentDir) {
  const file = join(contentDir, 'site.yaml');
  const settings = existsSync(file)
    ? (parse(readFileSync(file, 'utf8')) ?? {})
    : {};

  const site = { ...DEFAULTS, ...settings };

  if (settings.colour !== undefined) {
    throw new Error(
      'site.yaml: colour: is now colours:, a list, the first of it the old colour',
    );
  }

  const colours = settings.colours ?? [];

  if (
    !Array.isArray(colours) ||
    colours.length > 7 ||
    !colours.every((hex) => /^#[0-9a-f]{6}$/i.test(String(hex)))
  ) {
    throw new Error(
      `site.yaml: colours must be a list of at most seven like "#0e7490", got ${JSON.stringify(colours)}`,
    );
  }

  // No slash at the end: paths start with one. Without url: in site.yaml,
  // the address the host gave the site (hostAddress)
  const host = String(
    site.url || hostAddress(process.env) || 'http://localhost:4200',
  ).replace(/\/+$/, '');

  return {
    title: String(site.title),
    shortTitle: String(site['short-title'] ?? site.title),
    description: String(site.description),
    owner: String(site.owner),
    host,
    // Where the site starts on its host, with a slash at both ends:
    // /cowtent-starter/ on https://vast-ch.github.io/cowtent-starter
    base: `${new URL(host).pathname.replace(/\/+$/, '')}/`,
    email: String(site.email),
    about: site.about === undefined ? undefined : String(site.about),
    navigation: (site.menu ?? []).map(({ label, page }) => ({
      label: String(label),
      route: 'page',
      id: String(page),
    })),
    language: String(site.language),
    // A theme it doesn't know is the default one
    theme: THEMES.includes(site.theme) ? site.theme : THEMES[0],
    themes: THEMES,
    themeSwitcher: site['theme-switcher'] === true,
    colours: colours.map(String),
  };
}

/**
 * The address the host gave the site, from its build environment, each
 * only where that host's own flag is set, so that an unrelated URL never
 * leaks in. Cloudflare Pages has no production address in it: a blog
 * there writes url: in site.yaml.
 */
function hostAddress(env) {
  // GitHub Pages: the workflow passes the address actions/configure-pages
  // gives
  if (env.SITE_URL) return env.SITE_URL;
  // Netlify: the primary domain, its own once it has one
  if (env.NETLIFY === 'true' && env.URL) return env.URL;
  // Vercel: the production domain, without https://
  if (env.VERCEL === '1' && env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  // Render: the onrender.com address
  if (env.RENDER === 'true' && env.RENDER_EXTERNAL_URL) {
    return env.RENDER_EXTERNAL_URL;
  }

  return undefined;
}
