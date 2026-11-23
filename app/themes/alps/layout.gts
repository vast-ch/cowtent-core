import { LinkTo } from '@ember/routing';

import { ResponsiveImage } from '@responsive-image/ember';
import { t } from 'ember-intl';

import site from 'virtual:blog-site';
import cover from 'virtual:blog-cover';

import { Explore } from '../../components/explore.gts';
import { MobileNav } from '../../components/mobile-nav.gts';
import { Owner } from '../../components/owner.gts';
import { SectionName } from '../../components/section-name.gts';
import { TagFilter } from '../../components/tag-filter.gts';
import { ThemeSwitcher } from '../../components/theme-switcher.gts';

import type { TOC } from '@ember/component/template-only';

/*
 * On <html> while this layout is on the page: rounded and friendly, Outfit
 * for the headings and Figtree for the text; a heading jumped to lands
 * below the band and the title under it (and the bar on a phone)
 */
const ROOT = [
  "[:root:has(&)]:[--font-display:'Outfit_Variable',ui-sans-serif,system-ui,sans-serif]",
  "[:root:has(&)]:[--font-sans:'Figtree_Variable',ui-sans-serif,system-ui,sans-serif,'Apple_Color_Emoji','Segoe_UI_Emoji','Noto_Color_Emoji']",
  '[:root:has(&)]:scroll-pt-49 lg:[:root:has(&)]:scroll-pt-45',
].join(' ');

/*
 * The title of a post or page sticks right under the band, which is 8rem
 * down on a phone (the bar and the band), 9rem from sm and 7rem on lg, and
 * shrinks on the way there, on the page's background as wide as the page
 * (shrink-on-scroll, app/styles/app.css)
 */
const TITLE = [
  '[&>article>h1]:sticky [&>article>h1]:z-10 [&>article>h1]:shrink-on-scroll [&>article>h1]:[--title-bg:var(--color-stone-50)]',
  '[&>article>h1]:top-32 sm:[&>article>h1]:top-36 lg:[&>article>h1]:top-28',
].join(' ');

/*
 * One outline of gentle peaks, as high at its end as at its start, in the
 * colours of the blog: lightest to light from left to right
 */
const PEAKS =
  'M0 220 L0 175 L200 61 L423 128 L690 25 L852 141 L1056 38 L1385 121 L1688 56 L1956 103 L2224 85 L2473 136 L2747 25 L3036 128 L3247 22 L3554 121 L3600 175 L3600 220Z';

/**
 * alps: the sidebar on the left, a bit wider, with the big photo, the name
 * and the tagline on top, and everything a footer would have. Over the
 * page the outline of the Alps with where on the blog it is, and the
 * title of the post or page under it, staying at the top while the page
 * scrolls. Below lg the sidebar is in MobileNav's drawer.
 */
export const Layout: TOC<{
  Element: HTMLDivElement;
  Blocks: { default: [] };
}> = <template>
  <div
    class="flex min-h-full w-full flex-col bg-stone-50 {{ROOT}}"
    ...attributes
  >
    <MobileNav />

    <div class="w-full flex-1 lg:grid lg:grid-cols-[24rem_minmax(0,1fr)]">
      <aside
        class="hidden lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto lg:border-r lg:border-stone-200 lg:bg-white"
      >
        <div class="space-y-10 px-10 py-12">
          <div data-test-profile>
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

      {{! overflow-x-clip: the title's background stops at the sidebar }}
      <div class="min-w-0 overflow-x-clip">
        <div
          class="sticky top-12 z-20 h-20 bg-stone-50 sm:h-24 lg:top-0 lg:h-28"
          data-test-band
        >
          <svg
            class="absolute inset-0 size-full"
            viewBox="0 0 3600 220"
            preserveAspectRatio="xMinYMax slice"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="alps-peaks">
                <stop offset="0" class="[stop-color:var(--color-accent-100)]" />
                <stop offset="1" class="[stop-color:var(--color-accent-200)]" />
              </linearGradient>
            </defs>
            <path d={{PEAKS}} fill="url(#alps-peaks)" />
          </svg>
          <p
            class="absolute inset-x-0 bottom-0 px-4 pb-2 font-display text-2xl font-semibold text-stone-900 [text-shadow:0_0_8px_var(--color-stone-50),0_0_16px_var(--color-stone-50)] sm:px-6 lg:px-12 lg:pb-3 lg:text-3xl"
            data-test-section
          ><SectionName /></p>
        </div>
        {{! A post or page starts where the section name above it does }}
        {{! The title of a post or page stays under the band too, smaller }}
        <main
          class="max-w-5xl px-4 pt-8 pb-12 sm:px-6 lg:px-12 lg:pt-10 [&_article]:ml-0
            {{TITLE}}"
        >
          {{yield}}
        </main>
      </div>
    </div>
  </div>
</template>;
