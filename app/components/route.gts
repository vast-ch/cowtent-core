import { t } from 'ember-intl';
import { modifier } from 'ember-modifier';

import { routeMap } from '../content/route-map.ts';

import type { TOC } from '@ember/component/template-only';
import type { GalleryPhoto } from '../content/gallery.ts';
import type { PostRoute } from '../content/route.ts';
import type { Point } from '../content/schemas.ts';

const drawMap = modifier(
  (
    element: HTMLElement,
    [points, photos]: [Point[] | undefined, GalleryPhoto[] | undefined],
  ) => {
    const map = routeMap(element, { points, photos });

    return () => void map.then((remove) => remove());
  },
);

const json = (value: unknown) => JSON.stringify(value);

/**
 * The post's route.gpx on swisstopo's map, above the gallery: the track,
 * the points of the facts with a latitude and longitude, and the gallery's
 * photos where they were taken (app/content/route-map.ts). Under it the
 * file to download and the route on map.geo.admin.ch, which is also the
 * map until it's drawn.
 */
export const Route: TOC<{
  Args: { route: PostRoute; points?: Point[]; photos?: GalleryPhoto[] };
}> = <template>
  <section class="mt-16" aria-labelledby="route-title" data-test-route>
    <h2 id="route-title" class="section-heading">
      {{t "post.route.map"}}
    </h2>

    <figure class="route mt-6">
      <div
        class="route-map"
        data-track={{json @route.track}}
        role="region"
        aria-labelledby="route-title"
        {{drawMap @points @photos}}
      >
        <a href={{@route.map}}>{{t "post.route.map"}}</a>
      </div>
      <figcaption class="mt-3 text-sm text-stone-500">
        <a
          href={{@route.gpx}}
          download
          class="text-accent-700 underline decoration-accent-300 underline-offset-4 hover:decoration-accent-700"
        >{{t "post.route.download"}}</a>
        ·
        <a
          href={{@route.map}}
          class="text-accent-700 underline decoration-accent-300 underline-offset-4 hover:decoration-accent-700"
        >map.geo.admin.ch</a>
      </figcaption>
    </figure>
  </section>
</template>;
