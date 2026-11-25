import { hash } from '@ember/helper';
import { registerDestructor } from '@ember/destroyable';
import { service } from '@ember/service';
import Component from '@glimmer/component';

import { t } from 'ember-intl';
import { modifier } from 'ember-modifier';

import { nearView, routeMap } from '../content/route-map.ts';
import { Lightbox } from './lightbox.gts';

import type Owner from '@ember/owner';
import type { GalleryPhoto } from '../content/gallery.ts';
import type { PostRoute } from '../content/route.ts';
import type {
  LayerLabels,
  MapEvents,
  MapState,
  RouteMap,
} from '../content/route-map.ts';
import type { Point } from '../content/schemas.ts';
import type PostViewService from '../services/post-view.ts';

interface Args {
  route: PostRoute;
  points?: Point[];
  photos?: GalleryPhoto[];
}

/**
 * The post's route.gpx on swisstopo's map, above the gallery: the track,
 * the points of the facts with a latitude and longitude, and the gallery's
 * photos where they were taken (app/content/route-map.ts). The link to
 * the route on map.geo.admin.ch is the map until it's drawn; the file to
 * download and that link are in the facts (app/components/facts.gts).
 *
 * It's one map: drawn once it's about to scroll into view, or at once
 * when its lightbox opens first, and moved into the lightbox and back as
 * it is, so nothing loads twice. It shows, and changes, what the post's
 * address says (app/services/post-view.ts).
 */
export class Route extends Component<{ Args: Args }> {
  @service declare postView: PostViewService;

  map?: Promise<RouteMap>;
  page?: HTMLElement;

  constructor(owner: Owner, args: Args) {
    super(owner, args);
    registerDestructor(this, () => void this.map?.then((map) => map.remove()));
  }

  get on(): MapEvents {
    return {
      moved: this.postView.moved,
      switched: this.postView.switched,
      photo: this.postView.showPhoto,
      enlarge: () => this.postView.showMap(),
    };
  }

  get track() {
    return JSON.stringify(this.args.route.track);
  }

  get isOpen() {
    return this.postView.view === 'map';
  }

  /** The map, drawn in `place` if it isn't yet */
  draw(place: HTMLElement, labels: LayerLabels, inLightbox: boolean) {
    this.map ??= routeMap(place, {
      points: this.args.points,
      photos: this.args.photos,
      labels,
      inLightbox,
      eager: true,
      state: this.postView.mapState,
      on: this.on,
    });

    return this.map;
  }

  // Its place on the page, where it comes back to from the lightbox
  onPage = modifier((element: HTMLElement, [labels]: [LayerLabels]) => {
    this.page = element;
    void nearView(element).then(() => {
      if (element.isConnected) void this.draw(element, labels, false);
    });
  });

  // While the lightbox is open, the map is in it
  inLightbox = modifier((element: HTMLElement, [labels]: [LayerLabels]) => {
    // After this render: drawing reads the address, which this mustn't
    // follow, or every move would take the map out and back in
    void Promise.resolve()
      .then(() => this.draw(element, labels, true))
      .then((map) => {
        if (element.isConnected) map.moveTo(element, true);
      });

    return () => {
      const page = this.page;

      if (page?.isConnected)
        void this.map?.then((map) => map.moveTo(page, false));
    };
  });

  // What the address says, wherever the map is
  shows = modifier((_element: HTMLElement, [state]: [MapState]) => {
    void this.map?.then((map) => map.apply(state));
  });

  <template>
    {{#let
      (hash
        track=(t "post.route.layers.track")
        photos=(t "post.route.layers.photos")
        points=(t "post.route.layers.points")
        enlarge=(t "post.route.enlarge")
        threeD=(t "post.route.three-d")
        flat=(t "post.route.flat")
      )
      as |labels|
    }}
      <section
        class="mt-16"
        aria-labelledby="route-title"
        data-test-route
        {{this.shows this.postView.mapState}}
      >
        <h2 id="route-title" class="section-heading">
          {{t "post.route.map"}}
        </h2>

        <figure class="route mt-6">
          <div
            class="route-map"
            data-track={{this.track}}
            role="region"
            aria-labelledby="route-title"
            {{this.onPage labels}}
          >
            <a href={{@route.map}}>{{t "post.route.map"}}</a>
          </div>
        </figure>

        <Lightbox
          @isOpen={{this.isOpen}}
          @onClose={{this.postView.close}}
          @label={{t "post.route.map"}}
          @closeLabel={{t "post.route.close"}}
          data-test-route-lightbox
        >
          {{#if this.isOpen}}
            <div class="flex min-h-0 flex-1 px-4 pb-4 sm:px-16" data-beside>
              <div
                class="route-map route-map-lightbox"
                data-track={{this.track}}
                role="region"
                aria-label={{t "post.route.map"}}
                {{this.inLightbox labels}}
              ></div>
            </div>
          {{/if}}
        </Lightbox>
      </section>
    {{/let}}
  </template>
}
