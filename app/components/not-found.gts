import { LinkTo } from '@ember/routing';

import { pageTitle } from 'ember-page-title';

import { t } from 'ember-intl';

import type { TOC } from '@ember/component/template-only';

/**
 * In place of a post or page that doesn't exist, keeping its URL.
 */
export const NotFound: TOC<{ Element: HTMLElement }> = <template>
  {{pageTitle (t "not-found.title")}}

  <section class="py-16 text-center" data-test-not-found ...attributes>
    <p class="font-display text-7xl font-semibold text-accent-300">404</p>
    <h1 class="mt-4 font-display text-3xl font-semibold text-stone-900">
      {{t "not-found.heading"}}
    </h1>
    <p class="mt-3 text-stone-600">There's nothing at this address.</p>
    <LinkTo
      @route="index"
      class="mt-8 inline-block rounded-full bg-accent-600 px-5 py-2 font-semibold text-white hover:bg-accent-700"
    >{{t "not-found.back"}}</LinkTo>
  </section>
</template>;
