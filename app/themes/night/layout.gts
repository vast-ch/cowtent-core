import { hash } from '@ember/helper';
import { LinkTo } from '@ember/routing';

import { ResponsiveImage } from '@responsive-image/ember';

import site from 'virtual:blog-site';
import cover from 'virtual:blog-cover';

import { Explore } from '../../components/explore.gts';
import { Footer } from '../../components/footer.gts';
import { MobileNav } from '../../components/mobile-nav.gts';
import { TagFilter } from '../../components/tag-filter.gts';
import { ThemeSwitcher } from '../../components/theme-switcher.gts';

import type { TOC } from '@ember/component/template-only';

/*
 * After dark, on <html> while this layout is on the page: the greys turned
 * around (light text on dark ground), and its own colour, moonlight, rather
 * than the blog's (a warm colour mixed into the dark turns brown), with
 * dark text on it. Amber is the moon's pale yellow, the stars of a rating
 * too; the tags' chips (app/content/tag-cloud.ts) a hint of their colour.
 */
const DARK = [
  '[:root:has(&)]:scheme-dark',
  '[:root:has(&)]:[--color-white:#1a2233]',
  '[:root:has(&)]:[--color-stone-50:#0b1120]',
  '[:root:has(&)]:[--color-stone-100:#1e293b]',
  '[:root:has(&)]:[--color-stone-200:#2b3648]',
  '[:root:has(&)]:[--color-stone-300:#3d4a5f]',
  '[:root:has(&)]:[--color-stone-400:#64748b]',
  '[:root:has(&)]:[--color-stone-500:#8b97aa]',
  '[:root:has(&)]:[--color-stone-600:#a7b1c2]',
  '[:root:has(&)]:[--color-stone-700:#c7cfdb]',
  '[:root:has(&)]:[--color-stone-800:#e0e5ec]',
  '[:root:has(&)]:[--color-stone-900:#f1f4f8]',
  '[:root:has(&)]:[--color-slate-700:#c7cfdb]',
  '[:root:has(&)]:[--color-slate-900:#f1f4f8]',
  '[:root:has(&)]:[--color-accent-50:color-mix(in_oklab,#818cf8_14%,#0b1120)]',
  '[:root:has(&)]:[--color-accent-100:color-mix(in_oklab,#818cf8_24%,#0b1120)]',
  '[:root:has(&)]:[--color-accent-200:color-mix(in_oklab,#818cf8_40%,#0b1120)]',
  '[:root:has(&)]:[--color-accent-300:color-mix(in_oklab,#818cf8_60%,#0b1120)]',
  '[:root:has(&)]:[--color-accent-600:#818cf8]',
  '[:root:has(&)]:[--color-accent-700:color-mix(in_oklab,#818cf8_70%,white)]',
  '[:root:has(&)]:[--color-accent-800:color-mix(in_oklab,#818cf8_55%,white)]',
  '[:root:has(&)]:[--color-accent-900:color-mix(in_oklab,#818cf8_40%,white)]',
  '[:root:has(&)]:[--color-on-accent:#0b1120]',
  '[:root:has(&)]:[--color-amber-600:#fcd34d]',
  '[:root:has(&)]:[--color-sky-50:color-mix(in_oklab,var(--color-sky-600)_8%,#1a2233)]',
  '[:root:has(&)]:[--color-sky-100:color-mix(in_oklab,var(--color-sky-600)_16%,#1a2233)]',
  '[:root:has(&)]:[--color-sky-800:color-mix(in_oklab,var(--color-sky-600)_55%,white)]',
  '[:root:has(&)]:[--color-amber-50:color-mix(in_oklab,var(--color-amber-600)_8%,#1a2233)]',
  '[:root:has(&)]:[--color-amber-100:color-mix(in_oklab,var(--color-amber-600)_16%,#1a2233)]',
  '[:root:has(&)]:[--color-amber-800:#fde68a]',
  '[:root:has(&)]:[--color-rose-50:color-mix(in_oklab,var(--color-rose-600)_8%,#1a2233)]',
  '[:root:has(&)]:[--color-rose-100:color-mix(in_oklab,var(--color-rose-600)_16%,#1a2233)]',
  '[:root:has(&)]:[--color-rose-800:color-mix(in_oklab,var(--color-rose-600)_55%,white)]',
  '[:root:has(&)]:[--color-violet-50:color-mix(in_oklab,var(--color-violet-600)_8%,#1a2233)]',
  '[:root:has(&)]:[--color-violet-100:color-mix(in_oklab,var(--color-violet-600)_16%,#1a2233)]',
  '[:root:has(&)]:[--color-violet-800:color-mix(in_oklab,var(--color-violet-600)_55%,white)]',
].join(' ');

// The text of a post in the same greys
const PROSE = [
  '[&_.prose]:[--tw-prose-body:var(--color-stone-700)]',
  '[&_.prose]:[--tw-prose-headings:var(--color-stone-900)]',
  '[&_.prose]:[--tw-prose-lead:var(--color-stone-600)]',
  '[&_.prose]:[--tw-prose-bold:var(--color-stone-900)]',
  '[&_.prose]:[--tw-prose-counters:var(--color-stone-500)]',
  '[&_.prose]:[--tw-prose-bullets:var(--color-stone-400)]',
  '[&_.prose]:[--tw-prose-hr:var(--color-stone-200)]',
  '[&_.prose]:[--tw-prose-quotes:var(--color-stone-900)]',
  '[&_.prose]:[--tw-prose-quote-borders:var(--color-stone-300)]',
  '[&_.prose]:[--tw-prose-captions:var(--color-stone-500)]',
  '[&_.prose]:[--tw-prose-code:var(--color-stone-900)]',
  '[&_.prose]:[--tw-prose-th-borders:var(--color-stone-300)]',
  '[&_.prose]:[--tw-prose-td-borders:var(--color-stone-200)]',
].join(' ');

// The menu bar's sky: the moon and its glow, and stars repeating across
// (one class, whole, for Tailwind to find)
const SKY =
  '[background:radial-gradient(circle_at_52%_50%,#fef9c3_0_9px,transparent_10px),radial-gradient(circle_at_52%_50%,rgb(254_249_195/15%)_0_22px,transparent_23px),radial-gradient(1px_1px_at_23px_31px,#fff_99%,transparent)_0_0/340px_160px,radial-gradient(1px_1px_at_97px_112px,#cbd5e1_99%,transparent)_0_0/340px_160px,radial-gradient(1.5px_1.5px_at_151px_54px,#fff_99%,transparent)_0_0/340px_160px,radial-gradient(1px_1px_at_211px_140px,#e2e8f0_99%,transparent)_0_0/340px_160px,radial-gradient(1px_1px_at_268px_18px,#fff_99%,transparent)_0_0/340px_160px,radial-gradient(1.5px_1.5px_at_322px_98px,#e2e8f0_99%,transparent)_0_0/340px_160px,#0f172a]';

/**
 * night: after dark (DARK). A menu bar under the stars across the top: a
 * small photo, the name and the links of Explore; the tags and filters in
 * an open column on the right. Below lg only the page, MobileNav has the
 * rest.
 */
export const Layout: TOC<{
  Element: HTMLDivElement;
  Blocks: { default: [] };
}> = <template>
  <div
    class="flex min-h-full w-full flex-col bg-stone-50 {{DARK}} {{PROSE}}"
    ...attributes
  >
    <MobileNav />

    <nav
      class="{{SKY}}
        sticky top-0 z-30 hidden border-b border-stone-200 lg:block"
      aria-label={{site.title}}
      data-test-topbar
    >
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
        {{! Explore's links in a row, without its heading and arrows }}
        <Explore
          class="ml-auto [&_[aria-hidden=true]]:sr-only [&_h2]:sr-only [&_ul]:mt-0 [&_ul]:flex-row [&_ul]:gap-7 [&_ul]:text-sm"
        />
      </div>
    </nav>

    <div
      class="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-16 lg:px-8"
    >
      <main class="min-w-0">
        {{yield}}
      </main>

      <aside class="hidden border-l border-stone-200 pl-8 lg:block">
        <div
          class="sticky top-26 divide-y divide-stone-200 *:m-0 *:py-6 *:first:pt-0 [&_h2]:font-sans [&_h2]:text-xs [&_h2]:font-semibold [&_h2]:tracking-widest [&_h2]:text-stone-500 [&_h2]:uppercase"
        >
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
