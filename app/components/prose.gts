import { htmlSafe } from '@ember/template';

import type { TOC } from '@ember/component/template-only';

/**
 * Markdown rendered at build time (lib/markdown.mjs), styled by
 * @tailwindcss/typography with the blog's fonts and colour.
 */
export const Prose: TOC<{ Element: HTMLDivElement; Args: { html: string } }> =
  <template>
    <div
      class="prose prose-lg max-w-none prose-stone prose-headings:scroll-mt-8 prose-headings:font-display prose-headings:font-semibold prose-a:text-accent-700 prose-a:decoration-accent-300 prose-a:underline-offset-4 hover:prose-a:decoration-accent-700 prose-table:text-base prose-img:rounded-2xl"
      ...attributes
    >
      {{htmlSafe @html}}
    </div>
  </template>;
