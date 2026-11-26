import { htmlSafe } from '@ember/template';

import { modifier } from 'ember-modifier';

import { routeMap } from '../content/route-map.ts';

import type { TOC } from '@ember/component/template-only';

// The GPX embedded in the text on maps, only their tracks: the post's
// points and photos are on its own route's map (app/components/route.gts)
const routeMaps = modifier((element: HTMLElement) => {
  const maps = [...element.querySelectorAll<HTMLElement>('.route-map')].map(
    (container) => routeMap(container, {}),
  );

  return () => {
    for (const map of maps) void map.then((m) => m.remove());
  };
});

/**
 * Markdown rendered at build time (lib/markdown.mjs), styled by
 * @tailwindcss/typography with the blog's fonts and colour. A GPX embedded
 * in it becomes a map (app/content/route-map.ts).
 */
export const Prose: TOC<{
  Element: HTMLDivElement;
  Args: { html: string };
}> = <template>
  <div
    class="prose prose-lg max-w-none prose-stone prose-headings:scroll-mt-8 prose-headings:font-display prose-headings:font-semibold prose-a:text-colour-1-700 prose-a:decoration-colour-1-300 prose-a:underline-offset-4 hover:prose-a:decoration-colour-1-700 prose-table:text-base prose-img:rounded-2xl"
    {{routeMaps}}
    ...attributes
  >
    {{htmlSafe @html}}
  </div>
</template>;
