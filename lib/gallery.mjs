import { existsSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';

import exifr from 'exifr';

const PHOTO = /\.(jpe?g|png|webp|avif)$/i;

/**
 * A post's gallery is the photos in its `gallery` folder:
 *
 *   posts/a/gallery/01 - Through town.jpg
 *   posts/a/gallery/02 - The fog on the second morning.jpg
 *   posts/a/gallery/Digesting, with a view.jpg
 *
 * The file's name is the caption, also read out to people who can't see the
 * photo. A number at its start orders the photos and isn't part of the
 * caption; photos without one come after, by name. The number is followed
 * by ` - ` (SEPARATOR), or for older names by a space.
 */
export const GALLERY = 'gallery';

/**
 * Between a gallery photo's number, or a cover's `cover`, and the caption:
 * ` - ` is the one to write, a space alone works too
 */
export const SEPARATOR = /\s+-\s+|\s+/;

export function galleryOf(postDir) {
  const dir = join(postDir, GALLERY);

  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((file) => isPhotoFile(dir, file))
    .map((file) => ({
      src: `./${GALLERY}/${file}`,
      ...nameOf(file.slice(0, -extname(file).length)),
    }))
    .sort(
      (a, b) =>
        a.order - b.order ||
        a.caption.localeCompare(b.caption, undefined, { numeric: true }),
    )
    .map(({ src, caption }) => ({ src, caption }));
}

function isPhotoFile(dir, file) {
  if (!PHOTO.test(file) || file.startsWith('.')) return false;
  // The bundler reads ? and # in an import as the start of a query
  if (/[?#]/.test(file)) {
    throw new Error(
      `${join(dir, file)}: a gallery photo's name can't have a ? or #, rename it`,
    );
  }

  return true;
}

// "01 - The view", "01 The view" → 1, "The view"; "01" → 1, no caption;
// "The view" → last
function nameOf(name) {
  const [, number, caption = ''] =
    name.match(new RegExp(`^(\\d+)(?:(?:${SEPARATOR.source})(.*))?$`, 's')) ??
    [];

  return number === undefined
    ? { order: Infinity, caption: name.trim() }
    : { order: Number(number), caption: caption.trim() };
}

/**
 * Whether a file is a photo of a gallery folder, for the dev server, which
 * reloads the post when one is added or removed
 */
export function isGalleryPhoto(path) {
  const parts = path.split(/[\\/]/);

  return parts.at(-2) === GALLERY && PHOTO.test(parts.at(-1));
}

/**
 * Where a photo was taken, [lat, lon] to about 1 m, from the GPS in its
 * EXIF; undefined without it. The photos the blog serves are made anew
 * from it, without the EXIF (@responsive-image/vite-plugin).
 */
export async function positionOf(file) {
  const gps = await exifr.gps(file).catch(() => undefined);

  if (!Number.isFinite(gps?.latitude) || !Number.isFinite(gps?.longitude))
    return undefined;

  return [gps.latitude, gps.longitude].map((value) => +value.toFixed(5));
}
