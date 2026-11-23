import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import { action } from '@ember/object';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

import { ResponsiveImage } from '@responsive-image/ember';
import { modifier } from 'ember-modifier';

import { t } from 'ember-intl';

import { largestUrl, srcsetOf } from '../content/photo.ts';
import { SHOW_PHOTO } from '../content/route-map.ts';

import type { GalleryPhoto } from '../content/gallery.ts';

const showModal = modifier((dialog: HTMLDialogElement) => {
  dialog.showModal();

  return () => {
    if (dialog.open) dialog.close();
  };
});

// A photo's pin on the route's map asks for it (app/content/route-map.ts)
const onShowPhoto = modifier(
  (_: HTMLElement, [show]: [(index: number) => void]) => {
    const listener = (event: Event) =>
      show((event as CustomEvent<number>).detail);

    window.addEventListener(SHOW_PHOTO, listener);

    return () => window.removeEventListener(SHOW_PHOTO, listener);
  },
);

// How far a finger has to move to change the photo
const SWIPE = 50;

/**
 * The photos of a post's gallery folder at the end of the article: a masonry grid of
 * thumbnails, each a link to the full photo, which opens in a full-screen
 * <dialog> instead, as does a photo's pin on the route's map. ← → or a
 * swipe change the photo; Esc, the close button or a click beside the
 * photo closes it.
 */
export class Gallery extends Component<{
  Args: { photos: GalleryPhoto[] };
}> {
  @tracked current: number | null = null;

  touchX = 0;

  get item() {
    return this.current === null ? undefined : this.args.photos[this.current];
  }

  get position() {
    return (this.current ?? 0) + 1;
  }

  get hasMany() {
    return this.args.photos.length > 1;
  }

  @action open(index: number, event: MouseEvent) {
    // Let the browser open the photo in a new tab when asked to
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button) {
      return;
    }

    event.preventDefault();
    this.current = index;
  }

  @action show(index: number) {
    if (this.args.photos[index]) this.current = index;
  }

  @action close() {
    this.current = null;
  }

  @action step(by: number) {
    const count = this.args.photos.length;

    this.current = ((this.current ?? 0) + by + count) % count;
  }

  @action key(event: KeyboardEvent) {
    if (event.key === 'ArrowRight') this.step(1);
    if (event.key === 'ArrowLeft') this.step(-1);
  }

  @action closeBeside(event: MouseEvent) {
    if ((event.target as HTMLElement).hasAttribute('data-beside')) {
      this.close();
    }
  }

  @action touchStart(event: TouchEvent) {
    this.touchX = event.changedTouches[0]?.clientX ?? 0;
  }

  @action touchEnd(event: TouchEvent) {
    const moved = (event.changedTouches[0]?.clientX ?? 0) - this.touchX;

    if (Math.abs(moved) > SWIPE && this.hasMany) this.step(moved < 0 ? 1 : -1);
  }

  <template>
    <section
      class="mt-16"
      aria-labelledby="gallery-title"
      data-test-gallery
      {{onShowPhoto this.show}}
    >
      <h2 id="gallery-title" class="section-heading">
        {{t "post.gallery.heading"}}
      </h2>

      <ul class="mt-6 columns-2 gap-4 sm:columns-3" role="list">
        {{#each @photos as |item index|}}
          <li class="mb-4 break-inside-avoid">
            <a
              href={{largestUrl item.photo}}
              class="group block overflow-hidden rounded-xl shadow-md shadow-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
              title={{item.caption}}
              data-test-gallery-photo
              {{on "click" (fn this.open index)}}
            >
              <ResponsiveImage
                @src={{item.photo}}
                @sizes="(min-width: 768px) 14rem, 50vw"
                alt={{item.caption}}
                loading="lazy"
                decoding="async"
                class="transition duration-300 group-hover:scale-105"
              />
            </a>
          </li>
        {{/each}}
      </ul>

      {{#if this.item}}
        {{! Arrow keys page through the photos of the modal dialog }}
        {{! template-lint-disable no-invalid-interactive }}
        <dialog
          class="m-0 h-dvh max-h-none w-screen max-w-none bg-slate-950/95 p-0 text-white backdrop:bg-transparent"
          aria-label={{t "post.gallery.heading"}}
          data-test-lightbox
          {{showModal}}
          {{on "close" this.close}}
          {{on "keydown" this.key}}
          {{on "touchstart" this.touchStart passive=true}}
          {{on "touchend" this.touchEnd}}
        >
          {{! A mouse shortcut for Esc and the close button }}
          <div
            class="flex h-full flex-col"
            data-beside
            {{on "click" this.closeBeside}}
          >
            <div
              class="flex items-center justify-between px-4 py-3 font-mono text-sm text-slate-300"
              data-beside
            >
              <span data-test-lightbox-position>{{this.position}}
                /
                {{@photos.length}}</span>
              <button
                type="button"
                class="rounded-full p-2 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
                aria-label={{t "post.gallery.close"}}
                data-test-lightbox-close
                {{on "click" this.close}}
              >
                <svg viewBox="0 0 24 24" class="size-6" aria-hidden="true">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                </svg>
              </button>
            </div>

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
                class="absolute top-1/2 left-2 hidden -translate-y-1/2 rounded-full p-3 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white sm:block"
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
                class="absolute top-1/2 right-2 hidden -translate-y-1/2 rounded-full p-3 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white sm:block"
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
          </div>
        </dialog>
        {{! template-lint-enable no-invalid-interactive }}
      {{/if}}
    </section>
  </template>
}
