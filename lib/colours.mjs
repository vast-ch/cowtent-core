/**
 * A blog's own colours (colours: in site.yaml, lib/site.mjs): each in
 * Tailwind's shades 50 … 950 like a theme's (app/themes/<theme>/colours.css),
 * the colour itself as 600, the rest made from it in OKLCH. A stylesheet of
 * its own (virtual:blog-colours.css), over whatever theme is on; night's
 * run the other way round (50 the darkest), like its own.
 */

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

// How far each lighter shade goes to white, each darker one to black
const UP = { 50: 0.94, 100: 0.86, 200: 0.72, 300: 0.55, 400: 0.35, 500: 0.15 };
const DOWN = { 700: 0.85, 800: 0.72, 900: 0.6, 950: 0.45 };
// How much of the colour's chroma each shade keeps
const CHROMA = {
  50: 0.12,
  100: 0.25,
  200: 0.45,
  300: 0.7,
  400: 0.9,
  500: 1,
  700: 0.95,
  800: 0.85,
  900: 0.75,
  950: 0.6,
};

const linear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gamma = (c) =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;

function toOklch(hex) {
  const [r, g, b] = [1, 3, 5].map((i) =>
    linear(parseInt(hex.slice(i, i + 2), 16) / 255),
  );
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  return [L, Math.hypot(A, B), Math.atan2(B, A)];
}

function toRgb(L, C, H) {
  const A = C * Math.cos(H);
  const B = C * Math.sin(H);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

// Less chroma until it fits in sRGB
function toHex(L, C, H) {
  let rgb = toRgb(L, C, H);

  while (C > 0.001 && rgb.some((c) => c < -1e-4 || c > 1 + 1e-4)) {
    C *= 0.97;
    rgb = toRgb(L, C, H);
  }

  return `#${rgb
    .map((c) =>
      Math.round(Math.min(1, Math.max(0, gamma(Math.max(0, c)))) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

/**
 * The shades of one colour, { 50: '#…', …, 950: '#…' }
 */
export function shadesOf(hex) {
  const [L, C, H] = toOklch(hex);

  return Object.fromEntries(
    SHADES.map((shade) => {
      if (shade === 600) return [shade, hex.toLowerCase()];

      const lightness =
        shade < 600 ? L + (0.975 - L) * UP[shade] : L * DOWN[shade];

      return [shade, toHex(lightness, C * CHROMA[shade], H)];
    }),
  );
}

/**
 * The CSS of a blog's colours ([colour 1, colour 2, …], at most seven), or
 * '' without any
 */
export function coloursCss(colours) {
  if (colours.length === 0) return '';

  const block = (selector, flip) =>
    `${selector}{${colours
      .map((hex, index) => {
        const shades = shadesOf(hex);

        return SHADES.map(
          (shade) =>
            `--color-colour-${index + 1}-${shade}:${shades[flip ? 1000 - shade : shade]};`,
        ).join('');
      })
      .join('')}}`;

  // Over the themes' own (:root:has([data-theme=…]))
  return `${block('html:root:has([data-theme])', false)}${block(
    'html:root:root:has([data-theme="night"])',
    true,
  )}`;
}
