import { htmlSafe } from '@ember/template';

import { modifier } from 'ember-modifier';

import { routeMap } from '../content/route-map.ts';

import type { TOC } from '@ember/component/template-only';
import type { Pins } from '../content/route-map.ts';

// The routes of the text on maps, with the post's points and photos
const routeMaps = modifier((element: HTMLElement, [pins]: [Pins]) => {
  const maps = [...element.querySelectorAll<HTMLElement>('.route-map')].map(
    (container) => routeMap(container, pins),
  );

  return () => {
    for (const map of maps) void map.then((remove) => remove());
  };
});

/**
 * Markdown rendered at build time (lib/markdown.mjs), styled by
 * @tailwindcss/typography with the blog's fonts and colour. A route in it
 * becomes a map (app/content/route-map.ts) with @points and @photos on it.
 */
export const Prose: TOC<{
  Element: HTMLDivElement;
  Args: { html: string; points?: Pins['points']; photos?: Pins['photos'] };
}> = <template>
  <div
    class="prose prose-lg max-w-none prose-stone prose-headings:scroll-mt-8 prose-headings:font-display prose-headings:font-semibold prose-a:text-accent-700 prose-a:decoration-accent-300 prose-a:underline-offset-4 hover:prose-a:decoration-accent-700 prose-table:text-base prose-img:rounded-2xl"
    {{routeMaps (pins @points @photos)}}
    ...attributes
  >
    {{htmlSafe @html}}
  </div>
</template>;

function pins(points: Pins['points'], photos: Pins['photos']): Pins {
  return { points, photos };
}
