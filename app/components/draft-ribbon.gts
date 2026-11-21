import { t } from 'ember-intl';

import type { TOC } from '@ember/component/template-only';
import type { Post } from '../content/schemas.ts';

const isDraft = (post: Post) => post.published === false;

/**
 * A ribbon across the top-right corner of a draft (`published: false`), in
 * the list and on the post. Drafts only exist on the dev server
 * (lib/vite-plugin-blog.mjs). The parent has to be `relative`.
 */
export const DraftRibbon: TOC<{ Args: { post: Post } }> = <template>
  {{#if (isDraft @post)}}
    <div
      class="pointer-events-none absolute top-0 right-0 z-10 size-28 overflow-hidden"
      data-test-draft
    >
      <p
        class="absolute top-5 -right-12 w-40 rotate-45 bg-rose-600 py-1 text-center text-xs font-bold tracking-widest text-white uppercase shadow-md shadow-rose-900/30"
      >
        {{t "post.draft"}}
      </p>
    </div>
  {{/if}}
</template>;
