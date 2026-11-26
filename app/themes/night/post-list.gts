import { LinkTo } from '@ember/routing';

import { DraftRibbon } from '../../components/draft-ribbon.gts';
import { FormattedDate } from '../../components/formatted-date.gts';
import { PostCover } from '../../components/post-cover.gts';
import { PostTags } from '../../components/post-tags.gts';

import type { TOC } from '@ember/component/template-only';
import type { Post } from '../../content/schemas.ts';

const SIZES = '(min-width: 1024px) 20rem, (min-width: 640px) 40vw, 100vw';

/**
 * One post a row: the date, the title, the excerpt, its tags and filters,
 * and its cover on the right. On a phone the cover is on top.
 */
export const PostList: TOC<{ Args: { posts: Post[] } }> = <template>
  <div class="flex flex-col gap-8">
    {{#each @posts as |post|}}
      <article
        class="relative flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-stone-200 transition hover:shadow-md sm:flex-row-reverse"
        data-test-post={{post.id}}
      >
        <DraftRibbon @post={{post}} />
        <PostCover
          @post={{post}}
          @sizes={{SIZES}}
          @imageClass="aspect-[3/2] sm:absolute sm:inset-0 sm:aspect-auto sm:h-full!"
          class="relative sm:w-2/5 sm:shrink-0"
        >
          <:else>
            <div class="h-2 w-full bg-colour-1-600 sm:h-auto sm:w-2"></div>
          </:else>
        </PostCover>
        <div class="flex flex-1 flex-col p-6">
          <FormattedDate
            @date={{post.date}}
            class="text-xs font-medium tracking-wide text-stone-500 uppercase"
          />
          <h2 class="mt-2 font-display text-2xl font-semibold text-stone-900">
            <LinkTo
              @route="post"
              @model={{post.id}}
              class="hover:text-colour-1-700"
            >{{post.title}}</LinkTo>
          </h2>
          <div class="flex-1">
            <p class="mt-3 line-clamp-3 text-stone-600">{{post.excerpt}}</p>
          </div>
          <PostTags @post={{post}} class="mt-5" />
        </div>
      </article>
    {{/each}}
  </div>
</template>;
