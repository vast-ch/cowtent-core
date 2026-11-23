import { PostCard } from '../../components/post-card.gts';
import { LIFT, STICKER } from './sticker.ts';

import type { TOC } from '@ember/component/template-only';
import type { Post } from '../../content/schemas.ts';

const SIZES = '(min-width: 1024px) 20rem, (min-width: 640px) 50vw, 100vw';
const WIDE_SIZES = '(min-width: 1024px) 40rem, 100vw';

// The 1st, 5th, 8th, 12th… two wide, in an uneven pattern
const CARD = `${STICKER} ${LIFT}`;

const isWide = (index: number) => index % 7 === 0 || index % 7 === 4;

/**
 * The posts as a showcase: cards in three columns, some of them two wide
 * with a wider photo. Cards are stickers, and a post without a photo needs
 * no stripe.
 */
export const PostList: TOC<{ Args: { posts: Post[] } }> = <template>
  <div class="grid grid-flow-dense gap-8 sm:grid-cols-2 lg:grid-cols-3">
    {{#each @posts as |post index|}}
      {{#if (isWide index)}}
        <PostCard
          @post={{post}}
          @sizes={{WIDE_SIZES}}
          @imageClass="aspect-[3/2] sm:aspect-[2/1]"
          @stripe={{false}}
          @frame={{CARD}}
          class="sm:col-span-2"
        />
      {{else}}
        <PostCard
          @post={{post}}
          @sizes={{SIZES}}
          @stripe={{false}}
          @frame={{CARD}}
        />
      {{/if}}
    {{/each}}
  </div>
</template>;
