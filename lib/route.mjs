import { visit } from 'unist-util-visit';

/**
 * A GPX embedded like a photo, on a line of its own, is the route on the
 * swisstopo map with a link to download the file:
 *
 *   ![The route](./route.gpx)
 *
 * Linked without the `!` it stays a plain link. The map is centred and
 * zoomed on the track; swisstopo loads the file from the blog, so it needs
 * the file's whole URL and shows nothing on a blog that isn't online.
 * Feed readers drop iframes: there it is a link to the map instead.
 */
export function rehypeRoutes({ readAsset, absolute, language, feed = false }) {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      const image = node.tagName === 'p' && onlyChild(node);

      if (!image || image.tagName !== 'img' || !isRoute(image.properties.src))
        return;

      const { src, alt } = image.properties;
      const title = alt || language.t('post.route.map');
      const map = mapUrl(
        readAsset(src),
        absolute(src),
        language.language,
        feed,
      );
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
            element('iframe', {
              src: map,
              title,
              loading: 'lazy',
              allow: 'geolocation',
            }),
            element('figcaption', {}, [text(`${title} · `), download]),
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
export function mapUrl(gpx, url, language, feed = false) {
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
    `https://map.geo.admin.ch/#/${feed ? 'map' : 'embed'}?lang=${language}` +
    `&center=${center.join(',')}&z=${Math.max(zoom, 0)}` +
    `&bgLayer=ch.swisstopo.pixelkarte-farbe&layers=GPX%7C${url}`
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
