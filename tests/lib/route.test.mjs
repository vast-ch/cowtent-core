import { test } from 'node:test';
import assert from 'node:assert/strict';

import { renderFeed, renderPage } from '../../lib/markdown.mjs';
import { lv95, mapUrl } from '../../lib/route.mjs';

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

  assert.match(url, /^https:\/\/map\.geo\.admin\.ch\/#\/embed\?lang=de&/);
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
    /^<figure class="route"><iframe src="https:\/\/map\.geo\.admin\.ch\/#\/embed\?/,
  );
  assert.match(
    page,
    /GPX%7Chttps:\/\/blog\.example\.com\/assets\/route\.gpx" title="Up the gully"/,
  );
  assert.match(
    page,
    /<figcaption>Up the gully · <a href="\/assets\/route\.gpx" download>Download the GPX<\/a><\/figcaption><\/figure>/,
  );
  assert.match(
    page,
    /<p>Or <a href="\/assets\/route\.gpx">only the file<\/a>\.<\/p>/,
  );
});

test('without words in the brackets the map is "The route"', async () => {
  assert.match(
    await renderPage('![](./route.gpx)', options),
    /title="The route"/,
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
