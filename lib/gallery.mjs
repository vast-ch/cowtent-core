import { existsSync, readdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
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

/**
 * "01 - The view", "01 The view" → 1, "The view"; "01" → 1, no caption;
 * "The view" → last. A post's routes are named the same way
 * (lib/route.mjs).
 */
export function nameOf(name) {
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
 * Where and when a photo was taken, from its EXIF; the photos the blog
 * serves are made anew without it (@responsive-image/vite-plugin):
 *
 * - `position`: [lat, lon] to about 1 m, from the GPS
 * - `utc`: the GPS's time, in ms
 * - `local`: the camera's clock, in ms as if it were UTC (a camera often
 *   doesn't say its time zone; photosTimes works it out)
 *
 * Each undefined without it.
 */
export async function exifOf(file) {
  // The bytes, not the path: exifr leaves the file it opens to the garbage
  // collector, which Node 24 makes an error
  const bytes = await readFile(file);
  const gps = await exifr.gps(bytes).catch(() => undefined);
  const tags = await exifr
    .parse(bytes, {
      pick: [
        'DateTimeOriginal',
        'OffsetTimeOriginal',
        'GPSDateStamp',
        'GPSTimeStamp',
      ],
      reviveValues: false,
    })
    .catch(() => undefined);
  const position =
    Number.isFinite(gps?.latitude) && Number.isFinite(gps?.longitude)
      ? [gps.latitude, gps.longitude].map((value) => +value.toFixed(5))
      : undefined;

  return { position, ...timesOf(tags ?? {}) };
}

// "2019:04:20 12:42:50" → ms, as if UTC
const clock = (date, time) => {
  const value = Date.parse(`${date.replace(/:/g, '-')}T${time}Z`);

  return Number.isFinite(value) ? value : undefined;
};

function timesOf({
  DateTimeOriginal: original,
  OffsetTimeOriginal: offset,
  GPSDateStamp: gpsDate,
  GPSTimeStamp: gpsTime,
}) {
  let utc;
  let local;

  if (typeof gpsDate === 'string' && Array.isArray(gpsTime)) {
    const [h, m, s] = gpsTime.map((n) =>
      String(Math.floor(n)).padStart(2, '0'),
    );

    utc = clock(gpsDate, `${h}:${m}:${s}`);
  }

  if (typeof original === 'string') {
    const [date, time] = original.split(' ');

    local = date && time ? clock(date, time) : undefined;

    // The camera said its time zone: that's the time
    const zone =
      typeof offset === 'string' && offset.match(/^([+-])(\d\d):(\d\d)$/);

    if (local !== undefined && zone && utc === undefined) {
      const sign = zone[1] === '-' ? -1 : 1;

      utc = local - sign * (Number(zone[2]) * 60 + Number(zone[3])) * 60000;
    }
  }

  return { utc, local };
}

/**
 * When each of a gallery's photos was taken (exifOf), in ms UTC: the GPS's
 * time, or the camera's clock set right by how far off it is on the
 * photos that have both (the time zone it was set to); undefined without
 */
export function photosTimes(photos) {
  const offsets = photos
    .filter(({ utc, local }) => utc !== undefined && local !== undefined)
    .map(({ utc, local }) => Math.round((local - utc) / 900000) * 900000)
    .sort((a, b) => a - b);
  const offset = offsets[Math.floor(offsets.length / 2)];

  return photos.map(
    ({ utc, local }) =>
      utc ??
      (local !== undefined && offset !== undefined
        ? local - offset
        : undefined),
  );
}
