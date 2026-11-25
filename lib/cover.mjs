import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { SEPARATOR, galleryOf } from './gallery.mjs';

/**
 * A post's or page's cover is the photo in its folder named `cover`, in any
 * case, with its alt text after ` - `, like a gallery photo's caption after
 * its number (lib/gallery.mjs):
 *
 *   posts/a/cover.jpg                        → no alt text
 *   posts/a/Cover - The ridge at dawn.JPEG   → "The ridge at dawn"
 *   posts/a/cover The ridge at dawn.jpg      → the same, the older way
 *
 * Returns `{ src, alt }`, or undefined without one.
 */
const COVER = new RegExp(
  `^cover(?:(?:${SEPARATOR.source})(.*))?\\.(?:jpe?g|png|webp|avif)$`,
  'is',
);

export function coverOf(dir) {
  const covers = readdirSync(dir).filter((file) => COVER.test(file));

  if (covers.length > 1) {
    throw new Error(
      `${dir}: one cover photo per folder, found ${covers.join(', ')}`,
    );
  }

  const [file] = covers;

  if (file === undefined) return undefined;
  // The bundler reads ? and # in an import as the start of a query
  if (/[?#]/.test(file)) {
    throw new Error(
      `${join(dir, file)}: a cover photo's name can't have a ? or #, rename it`,
    );
  }

  return { src: `./${file}`, alt: (file.match(COVER)[1] ?? '').trim() };
}

/**
 * Whether a file is a cover photo, for the dev server, which reloads the
 * post or page when one is added, renamed or removed
 */
export function isCoverPhoto(path) {
  return COVER.test(path.split(/[\\/]/).at(-1));
}

/**
 * The photos a post's gallery shows: its cover first, its alt text the
 * caption, then the gallery folder's (lib/gallery.mjs). With GPS, the
 * cover is on the route's map too.
 */
export function photosOf(postDir) {
  const cover = coverOf(postDir);

  return [
    ...(cover ? [{ src: cover.src, caption: cover.alt }] : []),
    ...galleryOf(postDir),
  ];
}
