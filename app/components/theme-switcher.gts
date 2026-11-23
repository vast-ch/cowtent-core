import Component from '@glimmer/component';
import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import { service } from '@ember/service';

import { t } from 'ember-intl';

import site from 'virtual:blog-site';

import type ThemeService from '../services/theme.ts';

// What each theme looks like, small: its sky over its ground
const SWATCH: Record<string, string> = {
  alps: 'bg-linear-to-b from-sky-200 from-50% to-slate-500 to-50%',
  basecamp: 'bg-linear-to-b from-accent-100 from-50% to-stone-100 to-50%',
  night: 'bg-linear-to-b from-indigo-950 from-50% to-slate-800 to-50%',
};

/**
 * With `theme-switcher: true` in site.yaml, the themes to pick from: the
 * page changes on the spot (app/themes/), and the browser remembers
 * the choice for this blog.
 */
export class ThemeSwitcher extends Component<{ Element: HTMLElement }> {
  @service declare theme: ThemeService;

  pick = (theme: string) => this.theme.pick(theme);

  <template>
    <section data-test-theme-switcher ...attributes>
      <h2 class="font-display text-xl font-semibold text-stone-900">{{t
          "sidebar.theme"
        }}</h2>
      <div class="mt-4 flex flex-wrap gap-2">
        {{#each site.themes as |theme|}}
          <button
            type="button"
            class="flex items-center gap-2 rounded-full bg-white py-1 pr-3 pl-1 text-sm font-medium text-stone-700 ring-1 ring-stone-200 hover:ring-accent-600 aria-pressed:text-stone-900 aria-pressed:ring-2 aria-pressed:ring-accent-600"
            aria-pressed={{if (isSame theme this.theme.current) "true" "false"}}
            {{on "click" (fn this.pick theme)}}
            data-test-theme={{theme}}
          >
            <span
              class="size-6 rounded-full ring-1 ring-black/10 {{swatch theme}}"
              aria-hidden="true"
            ></span>
            {{t (concat "themes." theme)}}
          </button>
        {{/each}}
      </div>
    </section>
  </template>
}

function isSame(a: string, b: string) {
  return a === b;
}

function swatch(theme: string) {
  return SWATCH[theme] ?? '';
}

function concat(...parts: string[]) {
  return parts.join('');
}
