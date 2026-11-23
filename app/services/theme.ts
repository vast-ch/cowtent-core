import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

import site from 'virtual:blog-site';

import { THEMES } from '../themes/index.ts';

// One key per blog: several can share a host, like username.github.io
const KEY = `cowtent-theme:${import.meta.env.BASE_URL}`;

/**
 * The theme the page is drawn in (app/themes/): its layout and its parts.
 * A page is prerendered in the blog's theme and the app takes it over in
 * that theme too; a visitor's own pick (theme-switcher: true) only follows
 * after that, with `adopt`.
 */
export default class ThemeService extends Service {
  @tracked current = site.theme;

  get parts() {
    return THEMES[this.current] ?? THEMES[site.theme]!;
  }

  /**
   * The theme the visitor picked on an earlier page
   */
  adopt() {
    if (!site.themeSwitcher) return;

    try {
      const picked = localStorage.getItem(KEY);

      if (picked && picked in THEMES) this.current = picked;
    } catch {
      // No storage: the blog's theme
    }
  }

  pick(theme: string) {
    this.current = theme;

    try {
      localStorage.setItem(KEY, theme);
    } catch {
      // Private browsing: it lasts until the next page load
    }
  }
}
