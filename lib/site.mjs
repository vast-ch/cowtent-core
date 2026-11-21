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
 *   colour: "#0e7490"           # links, buttons and highlights
 *   about: about                # the page "Written by" links to (pages/about)
 *   menu:                       # links under Explore, to pages
 *     - label: About me
 *       page: about
 *   language: en                # the words around the posts, and the
 *                               # tag names: languages/en.yaml
 *   theme: alps                 # the look: alps, basecamp or night
 *   theme-switcher: false       # true lets visitors pick a theme
 */
const DEFAULTS = {
  title: 'My outdoor blog',
  description: '',
  owner: '',
  url: '',
  email: '',
  colour: '#059669',
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

  if (!/^#[0-9a-f]{6}$/i.test(String(site.colour))) {
    throw new Error(
      `site.yaml: colour must be like "#0e7490", got ${JSON.stringify(site.colour)}`,
    );
  }

  // No slash at the end: paths start with one. Without url: in site.yaml,
  // the address GitHub Pages gave the site (the workflow passes it as
  // SITE_URL)
  const host = String(
    site.url || process.env.SITE_URL || 'http://localhost:4200',
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
    colour: site.colour,
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
  };
}
