import { byFolder } from './by-folder.ts';

import type { ImageData } from '@responsive-image/core';

export interface Cover {
  photo: ImageData;
  /** From the file's name, `cover <alt>.jpg` (lib/cover.mjs) */
  alt: string;
}

/**
 * The cover photos (`cover.jpg` next to index.md), resized by
 * @responsive-image/vite-plugin. They stay out of the store: an image is
 * a set of URLs plus functions, not data to cache.
 */
const COVERS = {
  posts: byFolder(
    import.meta.glob<Cover | undefined>('@content/posts/*/index.md', {
      query: '?meta',
      import: 'cover',
      eager: true,
    }),
  ),
  pages: byFolder(
    import.meta.glob<Cover | undefined>('@content/pages/*/index.md', {
      query: '?meta',
      import: 'cover',
      eager: true,
    }),
  ),
};

export const postCover = (id: string) => COVERS.posts.get(id);

export const pageCover = (id: string) => COVERS.pages.get(id);
