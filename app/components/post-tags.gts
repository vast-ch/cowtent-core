import { hash } from '@ember/helper';
import { LinkTo } from '@ember/routing';

import { t } from 'ember-intl';
import { Chip } from 'frontile';

import { tagsOf } from '../content/fact-tags.ts';
import { tagChip, tagKey, tagValue } from '../content/tag-cloud.ts';

import type { TOC } from '@ember/component/template-only';
import type { Post } from '../content/schemas.ts';

/**
 * A post's tags, then the filters its facts put it in (★★★★☆, < 1500 m),
 * as chips in the colours they have in the sidebar: each a link to the
 * front page filtered by it.
 */
export const PostTags: TOC<{
  Element: HTMLUListElement;
  Args: { post: Post };
}> = <template>
  {{#let (tagsOf @post) as |tags|}}
    {{#if tags.length}}
      <ul class="flex flex-wrap gap-2" ...attributes>
        {{#each tags as |tag|}}
          <li>
            <Chip
              @variant="soft"
              @color="primary"
              @size="sm"
              @class="relative px-2 {{tagChip
                tag
              }} has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-primary"
            ><LinkTo
                @route="index"
                @query={{hash tags=tag}}
                class="after:absolute after:inset-0 focus-visible:outline-none"
                data-test-post-tag={{tag}}
              >{{t (tagKey tag) value=(tagValue tag)}}</LinkTo></Chip>
          </li>
        {{/each}}
      </ul>
    {{/if}}
  {{/let}}
</template>;
