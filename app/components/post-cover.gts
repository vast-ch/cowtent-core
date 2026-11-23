import { LinkTo } from '@ember/routing';

import { ResponsiveImage } from '@responsive-image/ember';

import { postCover } from '../content/covers.ts';

import type { TOC } from '@ember/component/template-only';
import type { Post } from '../content/schemas.ts';

/**
 * A post's cover on the front page, a link to the post that screen readers
 * skip (the title is the same link). Without a cover, @else: a stripe in
 * the blog's colour, or nothing.
 */
export const PostCover: TOC<{
  Element: HTMLAnchorElement;
  Args: { post: Post; sizes: string; imageClass?: string };
  Blocks: { else: [] };
}> = <template>
  {{#let (postCover @post.id) as |cover|}}
    {{#if cover}}
      <LinkTo
        @route="post"
        @model={{@post.id}}
        tabindex="-1"
        aria-hidden="true"
        ...attributes
      >
        <ResponsiveImage
          @src={{cover.photo}}
          @sizes={{@sizes}}
          alt=""
          class="w-full object-cover {{@imageClass}}"
        />
      </LinkTo>
    {{else}}
      {{yield to="else"}}
    {{/if}}
  {{/let}}
</template>;
