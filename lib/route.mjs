import { visit } from 'unist-util-visit';

/**
 * A post's own route: the file next to its index.md named exactly this. The
 * post shows it on a map above the gallery, with the post's points and
 * photos on it (app/components/route.gts), the feed links to it.
 */
export const ROUTE = 'route.gpx';

/**
 * Any other GPX embedded like a photo, on a line of its own, is a map in
 * the text with a link to download the file, without the post's points
 * and photos:
 *
 *   ![The way to the hut](./hut.gpx)
 *
 * Linked without the `!` it stays a plain link. The page draws the map
 * itself (app/content/route-map.ts) from the track in `data-track`, on
 * swisstopo's tiles; until then, and without JavaScript, it is a link to
 * the route on map.geo.admin.ch, which also stays under it. swisstopo
 * loads the file from the blog, so that link needs the file's whole URL.
 * In the feed it is only the link.
 */
export function rehypeRoutes({ readAsset, absolute, language, feed = false }) {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      const image = node.tagName === 'p' && onlyChild(node);

      if (!image || image.tagName !== 'img' || !isRoute(image.properties.src))
        return;

      const { src, alt } = image.properties;
      const title = alt || language.t('post.route.map');
      const gpx = readAsset(src);
      const map = mapUrl(gpx, absolute(src), language.language);
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
                className: ['route-map', 'not-prose'],
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
              element('a', { href: map }, [text('map.geo.admin.ch')]),
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

/**
 * Resolutions of the swisstopo map's zoom levels 0 to 14, in m per pixel
 * (LV95_RESOLUTIONS in github.com/geoadmin/web-mapviewer)
 */
const RESOLUTIONS = [
  650, 500, 250, 100, 50, 20, 10, 5, 2.5, 2, 1, 0.5, 0.25, 0.1,
];

// The map is 16:10 and about 700 px wide: the track fits in less
const FRAME = { width: 600, height: 375 };

/**
 * The swisstopo map with the GPX on it, centred on the track and at the
 * closest zoom that shows all of it
 */
export function mapUrl(gpx, url, language) {
  const points = trackPoints(gpx).map(([lat, lon]) => lv95(lat, lon));
  const east = points.map(([e]) => e);
  const north = points.map(([, n]) => n);
  const [minE, maxE, minN, maxN] = [
    Math.min(...east),
    Math.max(...east),
    Math.min(...north),
    Math.max(...north),
  ];
  const zoom = RESOLUTIONS.findLastIndex(
    (resolution) =>
      (maxE - minE) / resolution <= FRAME.width &&
      (maxN - minN) / resolution <= FRAME.height,
  );
  const center = [(minE + maxE) / 2, (minN + maxN) / 2].map(Math.round);

  return (
    `https://map.geo.admin.ch/#/map?lang=${language}` +
    `&center=${center.join(',')}&z=${Math.max(zoom, 0)}` +
    `&bgLayer=ch.swisstopo.pixelkarte-farbe&layers=GPX%7C${url}`
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

/**
 * WGS84 to the Swiss LV95 coordinates, swisstopo's approximate formulas
 * (about a metre off, plenty for a map's centre)
 */
export function lv95(lat, lon) {
  const p = (lat * 3600 - 169028.66) / 10000;
  const l = (lon * 3600 - 26782.5) / 10000;

  return [
    2600072.37 +
      211455.93 * l -
      10938.51 * l * p -
      0.36 * l * p ** 2 -
      44.54 * l ** 3,
    1200147.07 +
      308807.95 * p +
      3745.25 * l ** 2 +
      76.63 * p ** 2 -
      194.56 * l ** 2 * p +
      119.79 * p ** 3,
  ];
}

function element(tagName, properties, children = []) {
  return { type: 'element', tagName, properties, children };
}

function text(value) {
  return { type: 'text', value };
}
