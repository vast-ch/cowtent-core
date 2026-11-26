import { existsSync, readdirSync } from 'node:fs';

import { visit } from 'unist-util-visit';

import { nameOf } from './gallery.mjs';

/**
 * A post's own routes: the files next to its index.md named `route.gpx`,
 * or numbered like the gallery's photos (lib/gallery.mjs), one a day:
 *
 *   posts/a/route.gpx
 *   posts/b/01 - route.gpx
 *   posts/b/02 - route.gpx
 *
 * The post shows them all on one map above the gallery, each in its own
 * colour, with the post's points and photos on it
 * (app/components/route.gts); the feed links to each.
 */
export const ROUTE = 'route';

/** The post's routes, their file names in order */
export function routesOf(postDir) {
  if (!existsSync(postDir)) return [];

  return readdirSync(postDir)
    .filter((file) => /\.gpx$/i.test(file) && !file.startsWith('.'))
    .map((file) => ({ file, ...nameOf(file.slice(0, -'.gpx'.length)) }))
    .filter(({ caption }) => caption.toLowerCase() === ROUTE)
    .sort((a, b) => a.order - b.order || a.file.localeCompare(b.file))
    .map(({ file }) => file);
}

/** When a GPX was recorded, [first, last] in ms, undefined without times */
export function timeSpanOf(gpx) {
  const times = [...gpx.matchAll(/<time>\s*([^<\s]+)\s*<\/time>/g)]
    .map(([, time]) => Date.parse(time))
    .filter(Number.isFinite);

  return times.length ? [Math.min(...times), Math.max(...times)] : undefined;
}

// A photo this long before or after every route belongs to none of them
const PHOTO_WHILE = 12 * 3600 * 1000;

/**
 * Which route a photo taken at `time` (ms) belongs to, by the routes'
 * times ([first, last] each, timeSpanOf): the one it was taken during,
 * or the closest in time (the camp after a day, the breakfast before);
 * null when none is close or the routes don't have times
 */
export function routeAtTime(spans, time) {
  let best;

  spans.forEach((span, index) => {
    if (!span) return;

    const [first, last] = span;
    const off = time < first ? first - time : time > last ? time - last : 0;

    if (!best || off < best.off) best = { off, index };
  });

  return best && best.off <= PHOTO_WHILE ? best.index : null;
}

/**
 * Where on a GPX's track it was at `time` (ms): [lat, lon] between the two
 * points around it, the first or last point before or after the track;
 * undefined without times. Where a photo goes on its route's profile.
 */
export function pointAtTime(gpx, time) {
  const points = [
    ...gpx.matchAll(/<trkpt\b([^>]*?)>([\s\S]*?)<\/trkpt>/g),
  ].flatMap(([, attributes, inside]) => {
    const at = Date.parse(inside.match(/<time>\s*([^<\s]+)/)?.[1] ?? '');

    return Number.isFinite(at)
      ? [
          {
            at,
            lat: attribute(attributes, 'lat'),
            lon: attribute(attributes, 'lon'),
          },
        ]
      : [];
  });

  if (!points.length) return undefined;

  const after = points.findIndex(({ at }) => at >= time);
  const round = (point) => [+point[0].toFixed(5), +point[1].toFixed(5)];

  if (after === -1) return round([points.at(-1).lat, points.at(-1).lon]);
  if (after === 0) return round([points[0].lat, points[0].lon]);

  const a = points[after - 1];
  const b = points[after];
  const part = b.at > a.at ? (time - a.at) / (b.at - a.at) : 0;

  return round([
    a.lat + (b.lat - a.lat) * part,
    a.lon + (b.lon - a.lon) * part,
  ]);
}

// A photo this far from every route belongs to none of them
const PHOTO_NEAR = 500;

/**
 * Which of the tracks ([[lat, lon], …] each, trackOf) a photo taken at
 * [lat, lon] belongs to: the closest, if it's within PHOTO_NEAR metres
 */
export function nearestRoute(tracks, position) {
  let best;

  tracks.forEach((track, index) => {
    for (const point of track) {
      const off = metres(point, position);

      if (!best || off < best.off) best = { off, index };
    }
  });

  return best && best.off <= PHOTO_NEAR ? best.index : null;
}

// Metres between two [lat, lon]
function metres([lat1, lon1], [lat2, lon2]) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const a =
    Math.sin(radians(lat2 - lat1) / 2) ** 2 +
    Math.cos(radians(lat1)) *
      Math.cos(radians(lat2)) *
      Math.sin(radians(lon2 - lon1) / 2) ** 2;

  return 2 * 6371008.8 * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Any other GPX embedded like a photo, on a line of its own, is a map in
 * the text with a link to download the file, without the post's points
 * and photos:
 *
 *   ![The way to the hut](./hut.gpx)
 *
 * Linked without the `!` it stays a plain link. The page draws the map
 * itself (app/content/route-map.ts) from the track in `data-track`, on
 * OpenStreetMap; until then, and without JavaScript, it is a link to where
 * the route is on openstreetmap.org, which also stays under it. In the
 * feed it is only the link.
 */
export function rehypeRoutes({ readAsset, language, feed = false }) {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      const image = node.tagName === 'p' && onlyChild(node);

      if (!image || image.tagName !== 'img' || !isRoute(image.properties.src))
        return;

      const { src, alt } = image.properties;
      const title = alt || language.t('post.route.map');
      const gpx = readAsset(src);
      const map = mapUrl(gpx);
      const download = element('a', { href: src, download: true }, [
        text(language.t('post.route.download')),
      ]);

      parent.children[index] = feed
        ? element('p', {}, [
            element('a', { href: map }, [text(title)]),
            text(' · '),
            download,
          ])
        : element('figure', { className: ['route'] }, [
            element(
              'div',
              {
                // isolate: MapLibre's own layers stay under the band and
                // the title (the same as a post's map, app/components/route.gts)
                className: [
                  'route-map',
                  'not-prose',
                  'isolate',
                  'flex',
                  'aspect-[16/15]',
                  'w-full',
                  'items-center',
                  'justify-center',
                  'overflow-hidden',
                  'rounded-2xl',
                  'bg-stone-100',
                  'font-sans',
                  'sm:aspect-[16/10]',
                ],
                dataTrack: JSON.stringify(trackOf(gpx)),
                role: 'region',
                ariaLabel: title,
              },
              [element('a', { href: map }, [text(title)])],
            ),
            element('figcaption', {}, [
              text(`${title} · `),
              download,
              text(' · '),
              element('a', { href: map }, [text('openstreetmap.org')]),
            ]),
          ]);
    });
  };
}

export function isRoute(url) {
  return typeof url === 'string' && /\.gpx$/i.test(url);
}

// The one element in a paragraph, but for white space around it
function onlyChild(paragraph) {
  const children = paragraph.children.filter(
    (child) => !(child.type === 'text' && !child.value.trim()),
  );

  return children.length === 1 && children[0].type === 'element'
    ? children[0]
    : undefined;
}

// The map is 16:10 and about 700 px wide: the track fits in less
const FRAME = { width: 600, height: 375 };

// Web Mercator, 0 to 1 across the world at zoom 0
const mercatorX = (lon) => (lon + 180) / 360;
const mercatorY = (lat) => {
  const phi = (lat * Math.PI) / 180;

  return (1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2;
};

/**
 * Where the route is on openstreetmap.org: centred on the track, at the
 * closest zoom that shows all of it
 */
export function mapUrl(gpx) {
  const points = trackPoints(gpx);
  const lats = points.map(([lat]) => lat);
  const lons = points.map(([, lon]) => lon);
  const [south, north, west, east] = [
    Math.min(...lats),
    Math.max(...lats),
    Math.min(...lons),
    Math.max(...lons),
  ];
  const across = Math.max(mercatorX(east) - mercatorX(west), 1e-9) * 256;
  const down = Math.max(mercatorY(south) - mercatorY(north), 1e-9) * 256;
  const zoom = Math.floor(
    Math.min(Math.log2(FRAME.width / across), Math.log2(FRAME.height / down)),
  );

  return (
    `https://www.openstreetmap.org/#map=${Math.max(0, Math.min(zoom, 18))}` +
    `/${((south + north) / 2).toFixed(4)}/${((west + east) / 2).toFixed(4)}`
  );
}

// At most this many points of a track go to the page's map
const TRACK_POINTS = 500;

/**
 * The track for the page's map: [lat, lon, elevation] of the points of the
 * tracks and routes (lat and lon to about 1 m, the elevation to the metre,
 * left out when the GPX has none), at most TRACK_POINTS of them (evenly
 * picked, the last kept)
 */
export function trackOf(gpx) {
  const points = [
    ...gpx.matchAll(/<(trkpt|rtept)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/g),
  ].map(([, , attributes, inside = '']) => {
    const ele = inside.match(/<ele>\s*([-\d.]+)\s*<\/ele>/);
    const point = [
      +attribute(attributes, 'lat').toFixed(5),
      +attribute(attributes, 'lon').toFixed(5),
    ];

    return ele ? [...point, Math.round(Number(ele[1]))] : point;
  });
  const step = Math.max(1, Math.ceil(points.length / TRACK_POINTS));

  return points.filter(
    (_, index) => index % step === 0 || index === points.length - 1,
  );
}

// [lat, lon] of every point of the tracks, routes and waypoints
function trackPoints(gpx) {
  const points = [...gpx.matchAll(/<(?:trkpt|rtept|wpt)\b[^>]*>/g)].map(
    ([tag]) => [attribute(tag, 'lat'), attribute(tag, 'lon')],
  );

  if (!points.length) throw new Error('A GPX without any points');

  return points;
}

function attribute(tag, name) {
  return Number(tag.match(new RegExp(`\\b${name}="([^"]+)"`))[1]);
}

function element(tagName, properties, children = []) {
  return { type: 'element', tagName, properties, children };
}

function text(value) {
  return { type: 'text', value };
}
