import { LinkTo } from '@ember/routing';

import { DraftRibbon } from './draft-ribbon.gts';
import { FormattedDate } from './formatted-date.gts';
import { PostCover } from './post-cover.gts';
import { PostTags } from './post-tags.gts';

import type { TOC } from '@ember/component/template-only';
import type { Post } from '../content/schemas.ts';

const isFalse = (value: unknown) => value === false;

/**
 * A post on the front page as a card: its cover on top (@imageClass gives
 * it its shape), then the date, the title, the excerpt, the tags and the
 * filters. Without a cover, a stripe in colour-1, unless @stripe
 * is false. @frame is its corners, edge and shadow, instead of round ones
with a soft shadow.
 */
export const PostCard: TOC<{
  Element: HTMLElement;
  Args: {
    post: Post;
    sizes: string;
    imageClass?: string;
    frame?: string;
    stripe?: boolean;
  };
}> = <template>
  <article
    class="relative flex flex-col overflow-hidden bg-white transition
      {{if
        @frame
        @frame
        'rounded-3xl shadow-sm ring-1 ring-stone-200 hover:shadow-md'
      }}"
    data-test-post={{@post.id}}
    ...attributes
  >
    <DraftRibbon @post={{@post}} />
    <PostCover
      @post={{@post}}
      @sizes={{@sizes}}
      @imageClass={{if @imageClass @imageClass "aspect-[3/2]"}}
    >
      <:else>
        {{#unless (isFalse @stripe)}}
          <div class="h-2 w-full bg-colour-1-600"></div>
        {{/unless}}
      </:else>
    </PostCover>
    <div class="flex flex-1 flex-col p-6">
      <FormattedDate
        @date={{@post.date}}
        class="text-xs font-medium tracking-wide text-stone-500 uppercase"
      />
      <h2 class="mt-2 font-display text-2xl font-semibold text-stone-900">
        <LinkTo
          @route="post"
          @model={{@post.id}}
          class="hover:text-colour-1-700"
        >{{@post.title}}</LinkTo>
      </h2>
      <div class="flex-1">
        <p class="mt-3 line-clamp-3 text-stone-600">{{@post.excerpt}}</p>
      </div>
      <PostTags @post={{@post}} class="mt-5" />
    </div>
  </article>
</template>;
