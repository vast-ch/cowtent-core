import type { ImageData } from '@responsive-image/core';

/**
 * The widths and formats @responsive-image/vite-plugin makes of every photo
 * (vite.config.mjs).
 */
export const PHOTO_WIDTHS = [480, 960, 1440];

/**
 * Photos in a post are as wide as the text column, 42rem at most.
 */
export const PROSE_SIZES = '(min-width: 768px) 42rem, 100vw';

/**
 * The attributes of a photo in a post's HTML, which comes from Markdown and
 * so can't use <ResponsiveImage>: WebP in every width for the browser to
 * pick from, a JPEG fallback, and the size, so the page doesn't jump.
 */
export function photoAttributes(photo: ImageData) {
  const widths = photo.availableWidths ?? PHOTO_WIDTHS;
  const fallback = widths.find((width) => width >= 960) ?? widths.at(-1) ?? 960;
  const height = photo.aspectRatio
    ? Math.round(fallback / photo.aspectRatio)
    : undefined;
  const srcset = srcsetOf(photo);

  return [
    `src="${photo.imageUrlFor(fallback, 'jpeg')}"`,
    `srcset="${srcset}"`,
    `sizes="${PROSE_SIZES}"`,
    `width="${fallback}"`,
    height ? `height="${height}"` : '',
  ].join(' ');
}

/**
 * Every width of a photo, for the browser to pick from.
 */
export function srcsetOf(photo: ImageData, format: 'webp' | 'jpeg' = 'webp') {
  return (photo.availableWidths ?? PHOTO_WIDTHS)
    .map((width) => `${photo.imageUrlFor(width, format)} ${width}w`)
    .join(', ');
}

/**
 * The largest JPEG, for links to a photo.
 */
export function largestUrl(photo: ImageData) {
  return photo.imageUrlFor(
    (photo.availableWidths ?? PHOTO_WIDTHS).at(-1) ?? 1440,
    'jpeg',
  );
}

/**
 * A full URL of a mid-size JPEG, for link previews.
 */
export function photoUrl(photo: ImageData) {
  return photo.imageUrlFor(960, 'jpeg');
}
