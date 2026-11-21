import { hash } from '@ember/helper';
import { LinkTo } from '@ember/routing';

import { ResponsiveImage } from '@responsive-image/ember';
import { t } from 'ember-intl';
import { Chip } from 'frontile';

import { postCover } from '../content/covers.ts';
import { tagChip, tagKey } from '../content/tag-cloud.ts';
import { DraftRibbon } from './draft-ribbon.gts';
import { FormattedDate } from './formatted-date.gts';

import type { TOC } from '@ember/component/template-only';
import type { Post } from '../content/schemas.ts';

const CARD_SIZES = '(min-width: 1024px) 24rem, (min-width: 640px) 50vw, 100vw';

/**
 * A post on the front page: its cover on top, then the date, the title,
 * the excerpt and the tags.
 */
export const PostCard: TOC<{ Element: HTMLElement; Args: { post: Post } }> =
  <template>
    <article
      class="post-card relative flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-stone-200 transition hover:shadow-md"
      data-test-post={{@post.id}}
      ...attributes
    >
      <DraftRibbon @post={{@post}} />
      <LinkTo
        @route="post"
        @model={{@post.id}}
        class="post-card-photo"
        tabindex="-1"
        aria-hidden="true"
      >
        {{#let (postCover @post.id) as |cover|}}
          {{#if cover}}
            <ResponsiveImage
              @src={{cover}}
              @sizes={{CARD_SIZES}}
              alt=""
              class="aspect-[3/2] w-full object-cover"
            />
          {{else}}
            <div class="h-2 w-full bg-accent-600"></div>
          {{/if}}
        {{/let}}
      </LinkTo>
      <div class="flex flex-1 flex-col p-6">
        <FormattedDate
          @date={{@post.date}}
          class="text-xs font-medium tracking-wide text-stone-500 uppercase"
        />
        <h2 class="mt-2 font-display text-2xl font-semibold text-stone-900">
          <LinkTo
            @route="post"
            @model={{@post.id}}
            class="hover:text-accent-700"
          >{{@post.title}}</LinkTo>
        </h2>
        <div class="flex-1">
          <p class="mt-3 line-clamp-3 text-stone-600">{{@post.excerpt}}</p>
        </div>
        {{#if @post.tags.length}}
          <ul class="mt-5 flex flex-wrap gap-2">
            {{#each @post.tags as |tag|}}
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
                  >{{t (tagKey tag)}}</LinkTo></Chip>
              </li>
            {{/each}}
          </ul>
        {{/if}}
      </div>
    </article>
  </template>;
