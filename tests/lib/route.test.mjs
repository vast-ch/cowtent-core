import { test } from 'node:test';
import assert from 'node:assert/strict';

import { renderFeed, renderPage } from '../../lib/markdown.mjs';
import { lv95, mapUrl, trackOf } from '../../lib/route.mjs';

const gpx = `<gpx><trk><trkseg>
  <trkpt lat="46.6322" lon="7.9012"/><trkpt lon="7.9922" lat="46.6511"/>
</trkseg></trk></gpx>`;
const language = {
  language: 'en',
  t: (key) =>
    ({
      'post.route.map': 'The route',
      'post.route.download': 'Download the GPX',
    })[key],
};
const options = {
  resolveAsset: (url) => `/assets/${url.slice(2)}`,
  absolute: (url) => `https://blog.example.com/assets/${url.slice(2)}`,
  readAsset: () => gpx,
  link: (id) => id,
  language,
};

test('Swiss coordinates of a point', () => {
  assert.deepEqual(lv95(46.9466, 7.4442).map(Math.round), [2600424, 1199502]);
});

test('the map is centred on the track, as close as it fits', () => {
  const url = mapUrl(gpx, 'https://blog.example.com/route.gpx', 'de');

  assert.match(url, /^https:\/\/map\.geo\.admin\.ch\/#\/map\?lang=de&/);
  assert.match(url, /&center=2638\d{3},1165\d{3}&z=5&/);
  assert.match(url, /&layers=GPX%7Chttps:\/\/blog\.example\.com\/route\.gpx$/);
});

test('an embedded GPX is a map with a download link, a linked one a link', async () => {
  const page = await renderPage(
    '![Up the gully](./route.gpx)\n\nOr [only the file](./route.gpx).\n',
    options,
  );

  assert.match(
    page,
    /^<figure class="route"><div class="route-map not-prose" data-track="\[\[46\.6322,7\.9012\],\[46\.6511,7\.9922\]\]" role="region" aria-label="Up the gully"><a href="https:\/\/map\.geo\.admin\.ch\/#\/map\?[^"]+GPX%7Chttps:\/\/blog\.example\.com\/assets\/route\.gpx">Up the gully<\/a><\/div>/,
  );
  assert.match(
    page,
    /<figcaption>Up the gully · <a href="\/assets\/route\.gpx" download>Download the GPX<\/a> · <a href="https:\/\/map\.geo\.admin\.ch\/#\/map\?[^"]+">map\.geo\.admin\.ch<\/a><\/figcaption><\/figure>/,
  );
  assert.match(
    page,
    /<p>Or <a href="\/assets\/route\.gpx">only the file<\/a>\.<\/p>/,
  );
});

test('the track for the map has at most 500 points, the last one kept', () => {
  const long = `<gpx>${Array.from(
    { length: 1201 },
    (_, index) => `<trkpt lat="${46 + index / 1e4}" lon="7.123456789"/>`,
  ).join('')}<wpt lat="47" lon="8"/></gpx>`;
  const track = trackOf(long);

  assert.ok(track.length <= 501, `${track.length} points`);
  assert.deepEqual(track[0], [46, 7.12346]);
  assert.deepEqual(track.at(-1), [46.12, 7.12346], 'not the waypoint');
});

test('the track keeps the elevation of the points that have one', () => {
  assert.deepEqual(
    trackOf(`<gpx><trk><trkseg>
      <trkpt lat="46.1" lon="7.1"><ele>652.4</ele><time>2024</time></trkpt>
      <trkpt lat="46.2" lon="7.2"/>
      <trkpt lat="46.3" lon="7.3"><ele> 1790.6 </ele></trkpt>
    </trkseg></trk></gpx>`),
    [
      [46.1, 7.1, 652],
      [46.2, 7.2],
      [46.3, 7.3, 1791],
    ],
  );
});

test('without words in the brackets the map is "The route"', async () => {
  assert.match(
    await renderPage('![](./route.gpx)', options),
    /aria-label="The route"/,
  );
});

test('the feed links the map instead', async () => {
  const feed = await renderFeed('![Up the gully](./route.gpx)', {
    ...options,
    resolveAsset: options.absolute,
  });

  assert.match(
    feed,
    /^<p><a href="https:\/\/map\.geo\.admin\.ch\/#\/map\?[^"]+">Up the gully<\/a> · <a href="https:\/\/blog\.example\.com\/assets\/route\.gpx" download>/,
  );
});
