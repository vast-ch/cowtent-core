import { hash } from '@ember/helper';
import { LinkTo } from '@ember/routing';

import { ResponsiveImage } from '@responsive-image/ember';
import { t } from 'ember-intl';

import site from 'virtual:blog-site';
import cover from 'virtual:blog-cover';

import { Explore } from '../../components/explore.gts';
import { Footer } from '../../components/footer.gts';
import { MobileNav } from '../../components/mobile-nav.gts';
import { Owner } from '../../components/owner.gts';
import { TagFilter } from '../../components/tag-filter.gts';
import { ThemeSwitcher } from '../../components/theme-switcher.gts';
import { STICKERS } from './sticker.ts';

import type { TOC } from '@ember/component/template-only';

/*
 * On <html> while this layout is on the page: an old camping poster.
 * Rokkitt for the headings, Bitter for the text, on paper: cream, the
 * cards a warmer white. Its seven colours are colours.css; besides them
 * the poster's own mustard (sticker.ts).
 */
const ROOT = [
  "[:root:has(&)]:[--font-display:'Rokkitt_Variable',ui-serif,georgia,serif]",
  "[:root:has(&)]:[--font-sans:'Bitter_Variable',ui-serif,georgia,serif,'Apple_Color_Emoji','Segoe_UI_Emoji','Noto_Color_Emoji']",
  '[:root:has(&)]:[--color-stone-50:#f4ecd8]',
  '[:root:has(&)]:[--color-white:#fffaf0]',
  '[:root:has(&)]:[--color-mustard:#e5b443]',
].join(' ');

/**
 * basecamp: the name across the top on paper, over the stripes of a 70s
 * sunset; the sidebar on the right, each part of it a sticker like the
 * posts, in mustard where the posts are in colour-1 (sticker.ts). Below lg only
 * the page, MobileNav has the rest.
 */
export const Layout: TOC<{
  Element: HTMLDivElement;
  Blocks: { default: [] };
}> = <template>
  <div
    data-theme="basecamp"
    class="flex min-h-full w-full flex-col bg-stone-50 {{ROOT}}"
    ...attributes
  >
    <MobileNav />

    <header class="hidden lg:block">
      <div class="mx-auto flex max-w-6xl items-center gap-6 px-8 pt-10 pb-8">
        <LinkTo
          @route="index"
          @query={{hash tags=""}}
          class="shrink-0"
          aria-label={{t "layout.homepage"}}
        >
          <ResponsiveImage
            @src={{cover}}
            @width={{80}}
            alt=""
            loading="eager"
            class="size-20 rounded-full border-2 border-stone-900 object-cover shadow-[5px_5px_0_var(--color-mustard)]"
          />
        </LinkTo>
        <div class="min-w-0 flex-1">
          <p class="font-display text-5xl font-bold text-stone-900">
            <LinkTo
              @route="index"
              @query={{hash tags=""}}
            >{{site.title}}</LinkTo>
          </p>
          {{#if site.description}}
            <p class="mt-2 text-stone-700 italic">{{site.description}}</p>
          {{/if}}
        </div>
        {{#if site.owner}}
          <p class="shrink-0 text-sm text-stone-700">
            {{t "layout.by"}}
            <Owner />
          </p>
        {{/if}}
      </div>
    </header>
    {{! The sunset: mustard into colour-1, each stripe thinner }}
    <div class="hidden flex-col gap-1.5 lg:flex" aria-hidden="true">
      <div class="h-4 bg-(--color-mustard)"></div>
      <div class="h-3 bg-colour-1-300"></div>
      <div class="h-2 bg-colour-1-600"></div>
      <div class="h-1 bg-stone-900"></div>
    </div>

    <div
      class="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-12 lg:px-8"
    >
      <main class="min-w-0">
        {{yield}}
      </main>

      <aside class="hidden lg:block">
        <div class="sticky top-8 flex flex-col gap-7 *:m-0 {{STICKERS}}">
          <Explore />
          <TagFilter />
          {{#if site.themeSwitcher}}
            <ThemeSwitcher />
          {{/if}}
        </div>
      </aside>
    </div>

    <Footer />
  </div>
</template>;
