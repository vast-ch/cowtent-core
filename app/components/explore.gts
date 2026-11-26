import { array, hash } from '@ember/helper';
import { on } from '@ember/modifier';
import { LinkTo } from '@ember/routing';

import { t } from 'ember-intl';

import site from 'virtual:blog-site';

import type { TOC } from '@ember/component/template-only';

// From the site's base: /rss.xml, or /blog/rss.xml
const RSS = `${import.meta.env.BASE_URL}rss.xml`;

const noop = () => {};

/**
 * The links of the sidebar, also in the mobile menu, which closes itself
 * with @onNavigate when one is followed.
 */
export const Explore: TOC<{
  Element: HTMLElement;
  Args: { onNavigate?: () => void };
}> = <template>
  <section data-test-explore ...attributes>
    <h2 class="font-display text-xl font-semibold text-stone-900">{{t
        "sidebar.explore"
      }}</h2>
    <ul
      role="list"
      class="mt-4 flex flex-col gap-3 text-base/7 font-semibold text-slate-900"
    >
      <li class="flex items-center gap-2">
        <span class="text-colour-1-600" aria-hidden="true">→</span>
        {{! Without the tags too: query params are sticky, a plain link to the
            front page would bring back the last filter }}
        <LinkTo
          @route="index"
          @query={{hash tags=""}}
          class="hover:text-colour-1-700"
          data-test-all-adventures
          {{on "click" (if @onNavigate @onNavigate noop)}}
        >{{t "sidebar.all-posts"}}</LinkTo>
      </li>
      {{#each site.navigation as |item|}}
        <li class="flex items-center gap-2">
          <span class="text-colour-1-600" aria-hidden="true">→</span>
          <LinkTo
            @route={{item.route}}
            @models={{if item.id (array item.id) (array)}}
            class="hover:text-colour-1-700"
            {{on "click" (if @onNavigate @onNavigate noop)}}
          >{{item.label}}</LinkTo>
        </li>
      {{/each}}
      <li class="flex items-center gap-2">
        <span class="text-colour-1-600" aria-hidden="true">→</span>
        <a href={{RSS}} class="hover:text-colour-1-700">{{t
            "sidebar.rss-feed"
          }}</a>
      </li>
    </ul>
  </section>
</template>;
