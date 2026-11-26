import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import { action } from '@ember/object';
import { htmlSafe } from '@ember/template';
import { service } from '@ember/service';
import Component from '@glimmer/component';

import { ResponsiveImage } from '@responsive-image/ember';

import { t } from 'ember-intl';

import { largestUrl, srcsetOf } from '../content/photo.ts';
import { routeClasses } from '../content/route-colours.ts';
import { LIGHTBOX_BUTTON, Lightbox } from './lightbox.gts';

import type { GalleryPhoto } from '../content/gallery.ts';
import type PostViewService from '../services/post-view.ts';

// The pin on a photo that the route's map has too
const PIN_PATH =
  'M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z';

/*
 * The arrows to the previous and next photo, halfway down its sides: on a
 * phone over the photo's edges, on a dark round of their own so they show
 * on any photo; from sm beside it, where there's room
 */
const ARROW = `${LIGHTBOX_BUTTON} absolute top-1/2 -translate-y-1/2 bg-slate-950/55 p-2.5 backdrop-blur-sm sm:bg-transparent sm:p-3 sm:backdrop-blur-none`;

/*
 * Justified rows, read left to right in the gallery's order: each photo
 * as wide as its shape makes it at the row's height (--row), then all of
 * a row grown alike to its full width, so a row is one height. The last
 * row stays as it is (the filler after it takes what's left).
 */
const ratioOf = (photo: GalleryPhoto['photo']) =>
  htmlSafe(`--ratio: ${(photo.aspectRatio ?? 1.5).toFixed(3)}`);

// With several routes, a ring in the colour of the route it was taken on
const ringOf = (route: number | null, byRoute?: boolean) =>
  byRoute && route !== null ? `ring-2 ${routeClasses(route).ring}` : '';

/**
 * The photos of a post at the end of the article, its cover first, then
 * its gallery folder's (lib/cover.mjs): rows of thumbnails in their order, each
 * a link to the full photo, which opens in a full-screen lightbox instead, as does a photo's pin on the route's map. The arrows or
 * ← → change the photo; Esc, the close button or a click beside the
 * photo closes it. With a route map (`@onMap`), a photo that knows where
 * it was taken has a button in the full-screen view that shows it there,
 * in the map's lightbox (app/content/route-map.ts). With several routes
 * (`@byRoute`), each photo has a ring in the colour of the one it was
 * taken on.
 */
export class Gallery extends Component<{
  Args: { photos: GalleryPhoto[]; onMap?: boolean; byRoute?: boolean };
}> {
  @service declare postView: PostViewService;

  get current() {
    return this.postView.view === 'photo'
      ? (this.postView.photo ?? null)
      : null;
  }

  get item() {
    return this.current === null ? undefined : this.args.photos[this.current];
  }

  get position() {
    return `${(this.current ?? 0) + 1} / ${this.args.photos.length}`;
  }

  get hasMany() {
    return this.args.photos.length > 1;
  }

  /** Where it was taken, or else where on its route it was then */
  get itemPlace() {
    return this.item?.position ?? this.item?.along ?? null;
  }

  get itemOnMap() {
    return Boolean(this.args.onMap && this.itemPlace);
  }

  @action open(index: number, event: MouseEvent) {
    // Let the browser open the photo in a new tab when asked to
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button) {
      return;
    }

    event.preventDefault();
    this.postView.showPhoto(index);
  }

  @action close() {
    this.postView.close();
  }

  /** The map's lightbox in the photo's place, zoomed in on it */
  @action showOnMap() {
    if (this.current !== null && this.item) {
      this.postView.showMap({
        index: this.current,
        position: this.itemPlace,
      });
    }
  }

  @action step(by: number) {
    const count = this.args.photos.length;

    this.postView.showPhoto(((this.current ?? 0) + by + count) % count);
  }

  @action key(event: KeyboardEvent) {
    if (event.key === 'ArrowRight') this.step(1);
    if (event.key === 'ArrowLeft') this.step(-1);
  }

  <template>
    <section class="mt-16" aria-labelledby="gallery-title" data-test-gallery>
      <h2 id="gallery-title" class="section-heading">
        {{t "post.gallery.heading"}}
      </h2>

      <ul
        class="mt-6 flex flex-wrap gap-2 [--row:7rem] after:flex-[999_1_0%] after:content-[''] sm:gap-3 sm:[--row:10rem]"
        role="list"
      >
        {{#each @photos as |item index|}}
          <li
            class="[flex:var(--ratio)_1_calc(var(--ratio)*var(--row))]"
            style={{ratioOf item.photo}}
          >
            <a
              href={{largestUrl item.photo}}
              class="group block overflow-hidden rounded-xl shadow-md shadow-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-colour-1-600
                {{ringOf item.route @byRoute}}"
              title={{item.caption}}
              data-test-gallery-photo
              {{on "click" (fn this.open index)}}
            >
              <ResponsiveImage
                @src={{item.photo}}
                @sizes="(min-width: 768px) 24rem, 60vw"
                alt={{item.caption}}
                loading="lazy"
                decoding="async"
                class="block h-auto w-full transition duration-300 group-hover:scale-105"
              />
            </a>
          </li>
        {{/each}}
      </ul>

      <Lightbox
        @isOpen={{if this.item true false}}
        @onClose={{this.close}}
        @label={{this.position}}
        @closeLabel={{t "post.gallery.close"}}
        {{on "keydown" this.key}}
      >
        <:bar>
          {{#if this.itemOnMap}}
            <button
              type="button"
              class="{{LIGHTBOX_BUTTON}}
                flex items-center gap-1.5 px-3 py-2 font-sans"
              data-test-lightbox-on-map
              {{on "click" this.showOnMap}}
            >
              <svg viewBox="0 0 24 24" class="size-5" aria-hidden="true">
                <path d={{PIN_PATH}} fill="currentColor" fill-rule="evenodd" />
              </svg>
              {{t "post.gallery.onMap"}}
            </button>
          {{/if}}
        </:bar>
        <:default>
          {{#if this.item}}
            <figure
              class="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-4 pb-4 sm:px-16"
              data-beside
            >
              <img
                src={{largestUrl this.item.photo}}
                srcset={{srcsetOf this.item.photo}}
                sizes="100vw"
                alt={{this.item.caption}}
                class="min-h-0 max-w-full flex-1 object-contain"
              />
              {{#if this.item.caption}}
                <figcaption
                  class="max-w-prose text-center text-sm/6 text-slate-300"
                  data-test-lightbox-caption
                >
                  {{this.item.caption}}
                </figcaption>
              {{/if}}
            </figure>

            {{#if this.hasMany}}
              <button
                type="button"
                class="{{ARROW}} left-2"
                aria-label={{t "post.gallery.previous"}}
                {{on "click" (fn this.step -1)}}
              >
                <svg viewBox="0 0 24 24" class="size-6" aria-hidden="true">
                  <path
                    d="M15 5l-7 7 7 7"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                class="{{ARROW}} right-2"
                aria-label={{t "post.gallery.next"}}
                data-test-lightbox-next
                {{on "click" (fn this.step 1)}}
              >
                <svg viewBox="0 0 24 24" class="size-6" aria-hidden="true">
                  <path
                    d="M9 5l7 7-7 7"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                </svg>
              </button>
            {{/if}}
          {{/if}}
        </:default>
      </Lightbox>
    </section>
  </template>
}
