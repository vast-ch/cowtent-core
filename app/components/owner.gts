import { LinkTo } from '@ember/routing';

import site from 'virtual:blog-site';

import type { TOC } from '@ember/component/template-only';

/**
 * The owner's name, a link to their page when site.yaml has `about:`
 */
export const Owner: TOC<{ Element: HTMLElement }> = <template>
  {{#if site.about}}
    <LinkTo
      @route="page"
      @model={{site.about}}
      class="font-semibold text-colour-1-800 underline decoration-colour-1-300 underline-offset-4 hover:decoration-colour-1-700"
      data-test-owner
      ...attributes
    >{{site.owner}}</LinkTo>
  {{else}}
    <span class="font-semibold text-stone-900" data-test-owner ...attributes>
      {{site.owner}}
    </span>
  {{/if}}
</template>;
