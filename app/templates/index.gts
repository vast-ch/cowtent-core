import { hash } from '@ember/helper';
import { LinkTo } from '@ember/routing';

import { t } from 'ember-intl';
import { Chip } from 'frontile';
import site from 'virtual:blog-site';

import { Head } from '../components/head.gts';
import { ThemePostList } from '../components/themed.gts';
import { tagKey, tagValue } from '../content/tag-cloud.ts';

import type { TOC } from '@ember/component/template-only';
import type { Post } from '../content/schemas.ts';

interface Filter {
  id: string;
  without: string;
}

/**
 * Every post, newest first, as the theme lists them, or the ones with all the tags of the
 * filter (?tags=…): each one can be dropped, or all at once.
 */
<template>
  <Head @path="/" />

  <h1 class="sr-only">{{site.title}}</h1>

  {{#if @model.filter.length}}
    <section
      class="mb-8 flex flex-wrap items-center gap-2 rounded-2xl bg-accent-50 px-4 py-3"
      aria-label={{t "front-page.filter"}}
      data-test-filter
    >
      <span class="mr-1 text-sm font-medium text-stone-600">{{t
          "front-page.only"
        }}</span>
      {{#each @model.filter as |tag|}}
        <Chip
          @variant="outline"
          @color="primary"
          @class="relative bg-white px-2.5 font-medium has-[a:hover]:bg-primary-subtle has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-primary"
        ><LinkTo
            @route="index"
            @query={{hash tags=tag.without}}
            class="after:absolute after:inset-0 focus-visible:outline-none"
            aria-label={{t "front-page.remove-filter"}}
            data-test-filter-tag
          >{{t (tagKey tag.id) value=(tagValue tag.id)}}<span
              aria-hidden="true"
              class="ml-1.5 text-primary"
            >×</span></LinkTo></Chip>
      {{/each}}
      <LinkTo
        @route="index"
        @query={{hash tags=""}}
        class="ml-auto text-sm text-stone-600 underline underline-offset-4 hover:text-accent-700"
        data-test-filter-clear
      >{{t "front-page.show-all"}}</LinkTo>
    </section>
  {{/if}}

  {{#if @model.posts.length}}
    <ThemePostList @posts={{@model.posts}} />
  {{else}}
    <p
      class="rounded-3xl bg-white p-10 text-center text-stone-600 shadow-sm"
      data-test-no-posts
    >
      {{t "front-page.no-posts"}}
    </p>
  {{/if}}
</template> satisfies TOC<{
  Args: { model: { posts: Post[]; filter: Filter[] } };
}>;
