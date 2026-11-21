import { hash } from '@ember/helper';
import { LinkTo } from '@ember/routing';

import { ResponsiveImage } from '@responsive-image/ember';
import { PortalTarget } from 'frontile/overlays';
import { pageTitle } from 'ember-page-title';
import { t } from 'ember-intl';

import site from 'virtual:blog-site';
import cover from 'virtual:blog-cover';

import { Explore } from '../components/explore.gts';
import { MobileNav } from '../components/mobile-nav.gts';
import { Ridge } from '../components/ridge.gts';
import { SectionName } from '../components/section-name.gts';
import { TagFilter } from '../components/tag-filter.gts';
import { ThemeSwitcher } from '../components/theme-switcher.gts';

import type { TOC } from '@ember/component/template-only';

// From the site's base: /rss.xml, or /blog/rss.xml
const RSS = `${import.meta.env.BASE_URL}rss.xml`;

// The owner's name, a link to their page when site.yaml has `about:`
const Owner: TOC<{ Element: HTMLElement }> = <template>
  {{#if site.about}}
    <LinkTo
      @route="page"
      @model={{site.about}}
      class="font-semibold text-accent-800 underline decoration-accent-300 underline-offset-4 hover:decoration-accent-700"
      data-test-owner
      ...attributes
    >{{site.owner}}</LinkTo>
  {{else}}
    <span class="font-semibold text-stone-900" data-test-owner ...attributes>
      {{site.owner}}
    </span>
  {{/if}}
</template>;

/**
 * One page for every theme: each part is named (site-header, site-sidebar,
 * site-band…) and the theme's stylesheet (app/styles/themes/) shows it,
 * hides it and puts it in its place.
 *
 * - alps: the sidebar on the left with the big photo, the name and the
 *   tagline on top of it; the Alps over the page with where on the blog it
 *   is ("Adventures")
 * - basecamp: the name across the top over a ridge, the sidebar on the
 *   right in cards
 * - night: a menu bar across the top with a small photo, the name and the
 *   links of Explore; the tags and filters in a column on the right
 *
 * Below lg the sidebar moves into MobileNav's drawer.
 */
<template>
  {{pageTitle site.title separator=" - "}}

  <div class="site flex min-h-full w-full flex-col bg-stone-50">
    <MobileNav />

    <nav class="site-topbar" aria-label={{site.title}} data-test-topbar>
      <div class="mx-auto flex h-16 max-w-6xl items-center gap-8 px-8">
        <LinkTo
          @route="index"
          @query={{hash tags=""}}
          class="flex min-w-0 items-center gap-3 font-display text-xl font-semibold text-stone-900"
        >
          <ResponsiveImage
            @src={{cover}}
            @width={{36}}
            alt=""
            loading="eager"
            class="size-9 shrink-0 rounded-full object-cover ring-2 ring-white/20"
          />
          <span class="truncate">{{site.title}}</span>
        </LinkTo>
        <Explore class="site-topbar-explore ml-auto" />
      </div>
    </nav>

    <header class="site-header">
      <div class="mx-auto flex max-w-6xl items-center gap-6 px-8 pt-10 pb-6">
        <LinkTo
          @route="index"
          class="shrink-0"
          aria-label={{t "layout.homepage"}}
        >
          <ResponsiveImage
            @src={{cover}}
            @width={{80}}
            alt=""
            loading="eager"
            class="size-20 rounded-full object-cover ring-4 ring-white"
          />
        </LinkTo>
        <div class="min-w-0 flex-1">
          <p class="font-display text-4xl font-semibold text-stone-900">
            <LinkTo @route="index">{{site.title}}</LinkTo>
          </p>
          {{#if site.description}}
            <p class="mt-1 text-stone-600">{{site.description}}</p>
          {{/if}}
        </div>
        {{#if site.owner}}
          <p class="shrink-0 text-sm text-stone-600">
            {{t "layout.by"}}
            <Owner />
          </p>
        {{/if}}
      </div>
    </header>
    <Ridge class="site-ridge h-12 w-full" />

    <div class="site-body w-full flex-1">
      <aside class="site-sidebar">
        <div class="site-sidebar-inner space-y-10">
          <div class="site-profile" data-test-profile>
            <LinkTo @route="index" aria-label={{t "layout.homepage"}}>
              <ResponsiveImage
                @src={{cover}}
                @width={{320}}
                alt=""
                loading="eager"
                class="aspect-square w-full rounded-3xl object-cover shadow-lg ring-1 ring-black/5"
              />
            </LinkTo>
            <p class="mt-8 font-display text-3xl font-semibold text-stone-900">
              <LinkTo @route="index">{{site.title}}</LinkTo>
            </p>
            {{#if site.description}}
              <p class="mt-2 text-stone-600">{{site.description}}</p>
            {{/if}}
            {{#if site.owner}}
              <p class="mt-4 text-sm text-stone-600">
                {{t "layout.by"}}
                <Owner />
              </p>
            {{/if}}
          </div>
          <Explore />
          <TagFilter />
          {{#if site.themeSwitcher}}
            <ThemeSwitcher />
          {{/if}}
        </div>
      </aside>

      <div class="site-content min-w-0">
        <div class="site-band relative bg-stone-50" data-test-band>
          <div class="site-alps" aria-hidden="true"></div>
          <p
            class="absolute inset-x-0 bottom-0 px-4 pb-2 font-display text-2xl font-semibold text-stone-900 [text-shadow:0_0_8px_var(--color-stone-50),0_0_16px_var(--color-stone-50)] sm:px-6 lg:px-12 lg:pb-3 lg:text-3xl"
            data-test-section
          ><SectionName /></p>
        </div>
        <main class="site-main">
          {{outlet}}
        </main>
      </div>
    </div>

    <footer class="site-footer border-t border-stone-200 bg-white">
      <div
        class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-stone-600 sm:px-6 lg:px-8"
      >
        <p>
          {{site.title}}
          {{#if site.owner}}
            {{t "layout.by"}}
            <Owner />
          {{/if}}
        </p>
        <a href={{RSS}} class="hover:text-accent-700">{{t
            "layout.rss-feed"
          }}</a>
      </div>
    </footer>
  </div>

  <PortalTarget class="relative z-40" />
</template>
