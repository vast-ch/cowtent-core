import { hash } from '@ember/helper';
import { LinkTo } from '@ember/routing';

import { ResponsiveImage } from '@responsive-image/ember';
import { t } from 'ember-intl';
import { Chip } from 'frontile';
import { pageTitle } from 'ember-page-title';
import site from 'virtual:blog-site';

import { DraftRibbon } from '../components/draft-ribbon.gts';
import { Facts } from '../components/facts.gts';
import { Feedback } from '../components/feedback.gts';
import { FormattedDate } from '../components/formatted-date.gts';
import { Gallery } from '../components/gallery.gts';
import { Head } from '../components/head.gts';
import { NotFound } from '../components/not-found.gts';
import { Prose } from '../components/prose.gts';
import { Route } from '../components/route.gts';
import { postCover } from '../content/covers.ts';
import { PROSE_SIZES, photoUrl } from '../content/photo.ts';
import { tagChip, tagKey } from '../content/tag-cloud.ts';

import type { TOC } from '@ember/component/template-only';
import type { GalleryPhoto } from '../content/gallery.ts';
import type { PostRoute } from '../content/route.ts';
import type { Post } from '../content/schemas.ts';

const path = (id: string) => `/${id}`;

const previewImage = (id: string) => {
  const cover = postCover(id);

  return cover ? photoUrl(cover.photo) : undefined;
};

// Newer or older: a card linking to the post next to this one
const Neighbour: TOC<{
  Element: HTMLAnchorElement;
  Args: { post: Post; label: string };
}> = <template>
  <LinkTo
    @route="post"
    @model={{@post.id}}
    ...attributes
    class="block rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200 hover:ring-accent-300"
  >
    <span class="text-xs font-medium tracking-wide text-stone-500 uppercase">
      {{@label}}
    </span>
    <span class="mt-1 block font-display text-lg font-semibold text-stone-900">
      {{@post.title}}
    </span>
  </LinkTo>
</template>;

/**
 * A post: date, title and tags, the cover, the facts, the story, the
 * route's map, the gallery, then the way to the next one.
 */
<template>
  {{#if @model}}
    {{#let @model.post as |post|}}
      {{pageTitle post.title}}
      <Head
        @title={{post.title}}
        @description={{post.excerpt}}
        @image={{previewImage post.id}}
        @path={{path post.id}}
        @type="article"
      />

      <article class="relative mx-auto max-w-3xl">
        <DraftRibbon @post={{post}} />

        <FormattedDate
          @date={{post.date}}
          class="text-sm font-medium tracking-wide text-stone-500 uppercase"
        />
        <h1
          class="mt-3 font-display text-4xl font-semibold text-stone-900 sm:text-5xl"
        >
          {{post.title}}
        </h1>
        {{#if post.tags.length}}
          <ul class="mt-5 flex flex-wrap gap-2">
            {{#each post.tags as |tag|}}
              <li>
                <Chip
                  @variant="soft"
                  @color="primary"
                  @class="relative px-2.5 {{tagChip
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

        {{#let (postCover post.id) as |cover|}}
          {{#if cover}}
            <ResponsiveImage
              @src={{cover.photo}}
              @sizes={{PROSE_SIZES}}
              alt={{cover.alt}}
              loading="eager"
              data-test-cover
              class="mt-8 aspect-[3/2] w-full rounded-3xl object-cover"
            />
          {{/if}}
        {{/let}}

        <div class="mt-10 space-y-12">
          {{#if post.facts}}
            <Facts @facts={{post.facts}} />
          {{/if}}

          {{#if post.html}}
            <Prose @html={{post.html}} />
          {{/if}}

          {{#if @model.route}}
            <Route
              @route={{@model.route}}
              @points={{post.facts.points}}
              @photos={{@model.gallery}}
            />
          {{/if}}

          {{#if @model.gallery.length}}
            <Gallery @photos={{@model.gallery}} />
          {{/if}}

          {{#if site.email}}
            <Feedback @post={{post}} />
          {{/if}}
        </div>

        {{#if (or @model.newer @model.older)}}
          <nav
            class="mt-16 grid gap-4 border-t border-stone-200 pt-8 sm:grid-cols-2"
            aria-label={{t "post.more"}}
          >
            {{#if @model.newer}}
              <Neighbour @post={{@model.newer}} @label={{t "post.newer"}} />
            {{/if}}
            {{#if @model.older}}
              <Neighbour
                @post={{@model.older}}
                @label={{t "post.older"}}
                class="sm:col-start-2"
              />
            {{/if}}
          </nav>
        {{/if}}
      </article>
    {{/let}}
  {{else}}
    <NotFound />
  {{/if}}
</template> satisfies TOC<{
  Args: {
    model: {
      post: Post;
      newer?: Post;
      older?: Post;
      gallery: GalleryPhoto[];
      route?: PostRoute;
    } | null;
  };
}>;

function or(...values: unknown[]) {
  return values.some(Boolean);
}
