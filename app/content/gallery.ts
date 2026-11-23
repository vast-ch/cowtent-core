import { byFolder } from './by-folder.ts';

import type { ImageData } from '@responsive-image/core';

export interface GalleryPhoto {
  photo: ImageData;
  /** The photo's file name, also its alt text (lib/gallery.mjs) */
  caption: string;
  /** [lat, lon] from its GPS, for its pin on the route's map */
  position: [number, number] | null;
}

/**
 * The photos of a post's gallery folder, resized by @responsive-image/vite-plugin.
 * They are an export of the post's HTML module, so they load with it,
 * and stay out of the store like the covers (app/content/covers.ts).
 */
const GALLERIES = byFolder(
  import.meta.glob<GalleryPhoto[]>('@content/posts/*/index.md', {
    import: 'gallery',
  }),
);

export async function galleryOf(id: string): Promise<GalleryPhoto[]> {
  return (await GALLERIES.get(id)?.()) ?? [];
}
