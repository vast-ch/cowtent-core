import { t } from 'ember-intl';

import site from 'virtual:blog-site';

import { Owner } from './owner.gts';

import type { TOC } from '@ember/component/template-only';

// From the site's base: /rss.xml, or /blog/rss.xml
const RSS = `${import.meta.env.BASE_URL}rss.xml`;

/**
 * The name of the blog, whose it is and its feed, at the bottom of a
 * theme without the sidebar's profile
 */
export const Footer: TOC<{ Element: HTMLElement }> = <template>
  <footer class="border-t border-stone-200 bg-white" ...attributes>
    <div
      class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-stone-600 sm:px-6 lg:px-8"
    >
      <p>
        {{site.title}}
        {{#if site.owner}}
          {{t "layout.by"}}
          <Owner />
        {{/if}}
      </p>
      <a href={{RSS}} class="hover:text-accent-700">{{t "layout.rss-feed"}}</a>
    </div>
  </footer>
</template>;
