import { ResponsiveImage } from '@responsive-image/ember';
import { pageTitle } from 'ember-page-title';

import { Head } from '../components/head.gts';
import { NotFound } from '../components/not-found.gts';
import { Prose } from '../components/prose.gts';
import { pageCover } from '../content/covers.ts';
import { PROSE_SIZES, photoUrl } from '../content/photo.ts';

import type { TOC } from '@ember/component/template-only';
import type { Page } from '../content/schemas.ts';

const path = (id: string) => `/page/${id}`;

const previewImage = (id: string) => {
  const cover = pageCover(id);

  return cover ? photoUrl(cover) : undefined;
};

/**
 * A standalone page (About me…): title, photo, text.
 */
<template>
  {{#if @model}}
    {{#let @model.page as |page|}}
      {{pageTitle page.title}}
      <Head
        @title={{page.title}}
        @image={{previewImage page.id}}
        @path={{path page.id}}
      />

      <article class="mx-auto max-w-3xl">
        <h1
          class="font-display text-4xl font-semibold text-stone-900 sm:text-5xl"
        >
          {{page.title}}
        </h1>
        {{#let (pageCover page.id) as |cover|}}
          {{#if cover}}
            <ResponsiveImage
              @src={{cover}}
              @sizes={{PROSE_SIZES}}
              alt=""
              loading="eager"
              class="mt-8 max-h-[32rem] w-full rounded-3xl object-cover"
            />
          {{/if}}
        {{/let}}
        {{#if page.html}}
          <Prose @html={{page.html}} class="mt-10" />
        {{/if}}
      </article>
    {{/let}}
  {{else}}
    <NotFound />
  {{/if}}
</template> satisfies TOC<{ Args: { model: { page: Page } | null } }>;
