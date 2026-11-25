import { hash } from '@ember/helper';
import { registerDestructor } from '@ember/destroyable';
import { service } from '@ember/service';
import Component from '@glimmer/component';

import { t } from 'ember-intl';
import Modifier from 'ember-modifier';

import type { ArgsFor } from 'ember-modifier';

import { routeMap } from '../content/route-map.ts';
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

interface DrawMapSignature {
  Element: HTMLElement;
  Args: {
    Positional: [Point[] | undefined, GalleryPhoto[] | undefined, LayerLabels];
    Named: { state: MapState; on: MapEvents; inLightbox?: boolean };
  };
}

/**
 * Draws the map once, then only shows the state it's given again: moving
 * one map moves the other, not draws it anew
 */
class DrawMap extends Modifier<DrawMapSignature> {
  map?: Promise<RouteMap>;

  constructor(owner: Owner, args: ArgsFor<DrawMapSignature>) {
    super(owner, args);
    registerDestructor(this, () => void this.map?.then((map) => map.remove()));
  }

  modify(
    element: HTMLElement,
    [points, photos, labels]: DrawMapSignature['Args']['Positional'],
    { state, on, inLightbox }: DrawMapSignature['Args']['Named'],
  ) {
    if (this.map) {
      void this.map.then((map) => map.apply(state));
    } else {
      this.map = routeMap(element, {
        points,
        photos,
        labels,
        inLightbox,
        state,
        on,
      });
    }
  }
}

/**
 * The post's route.gpx on swisstopo's map, above the gallery: the track,
 * the points of the facts with a latitude and longitude, and the gallery's
 * photos where they were taken (app/content/route-map.ts). The link to
 * the route on map.geo.admin.ch is the map until it's drawn; the file to
 * download and that link are in the facts (app/components/facts.gts). The
 * same map fills its lightbox; both show, and change, what the post's
 * address says (app/services/post-view.ts).
 */
export class Route extends Component<{
  Args: { route: PostRoute; points?: Point[]; photos?: GalleryPhoto[] };
}> {
  @service declare postView: PostViewService;

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

  <template>
    {{#let
      (hash
        track=(t "post.route.layers.track")
        photos=(t "post.route.layers.photos")
        points=(t "post.route.layers.points")
        enlarge=(t "post.route.enlarge")
      )
      as |labels|
    }}
      <section class="mt-16" aria-labelledby="route-title" data-test-route>
        <h2 id="route-title" class="section-heading">
          {{t "post.route.map"}}
        </h2>

        <figure class="route mt-6">
          <div
            class="route-map"
            data-track={{this.track}}
            role="region"
            aria-labelledby="route-title"
            {{DrawMap
              @points
              @photos
              labels
              state=this.postView.mapState
              on=this.on
            }}
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
                {{DrawMap
                  @points
                  @photos
                  labels
                  state=this.postView.mapState
                  on=this.on
                  inLightbox=true
                }}
              ></div>
            </div>
          {{/if}}
        </Lightbox>
      </section>
    {{/let}}
  </template>
}
