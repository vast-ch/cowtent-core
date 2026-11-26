/**
 * The colours of a post's routes: the first in the theme's colour-2, the
 * next in colour-3, … colour-7, then round again (app/themes/<theme>/colours.css).
 * colour-1 stays the accent: the play button, the spot, the photo shown.
 * The classes in full, for Tailwind to find.
 */
const CLASSES = [
  {
    fill: 'fill-colour-2-500',
    ring: 'ring-colour-2-400',
    bg: 'bg-colour-2-600',
  },
  {
    fill: 'fill-colour-3-500',
    ring: 'ring-colour-3-400',
    bg: 'bg-colour-3-600',
  },
  {
    fill: 'fill-colour-4-500',
    ring: 'ring-colour-4-400',
    bg: 'bg-colour-4-600',
  },
  {
    fill: 'fill-colour-5-500',
    ring: 'ring-colour-5-400',
    bg: 'bg-colour-5-600',
  },
  {
    fill: 'fill-colour-6-500',
    ring: 'ring-colour-6-400',
    bg: 'bg-colour-6-600',
  },
  {
    fill: 'fill-colour-7-500',
    ring: 'ring-colour-7-400',
    bg: 'bg-colour-7-600',
  },
];

export type RouteClasses = (typeof CLASSES)[number];

/** The classes of route `index` (0 the first) */
export function routeClasses(index: number): RouteClasses {
  return CLASSES[index % CLASSES.length]!;
}

/**
 * Route `index`'s colour as the map can draw it: the theme's colour as
 * the page has it, made rgb by the canvas (MapLibre reads no oklch)
 */
export function routeColour(index: number): string {
  const name = `--color-colour-${2 + (index % CLASSES.length)}-600`;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  const context = document.createElement('canvas').getContext('2d');

  if (!value || !context) return '#e11d48';

  context.fillStyle = value;
  context.fillRect(0, 0, 1, 1);

  const [r, g, b] = context.getImageData(0, 0, 1, 1).data;

  return `rgb(${r}, ${g}, ${b})`;
}
