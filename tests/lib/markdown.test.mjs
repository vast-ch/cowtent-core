import { test } from 'node:test';
import assert from 'node:assert/strict';

import { renderPage } from '../../lib/markdown.mjs';

const render = (markdown) =>
  renderPage(markdown, {
    resolveAsset: (url) => url,
    link: (path) => `/blog/${path}`,
    language: { t: (key) => key },
    readAsset: () => '',
    absolute: (url) => url,
  });

test('links to posts and pages written as files are their URLs', async () => {
  const html = await render(
    [
      '[a](../2020-05-01-first-munro/index.md)',
      '[b](../../posts/2020-05-01-first-munro/index.md#the-top)',
      '[c](../../pages/about-me/index.md)',
    ].join(' '),
  );

  assert.match(html, /href="\/blog\/2020-05-01-first-munro"/);
  assert.match(html, /href="\/blog\/2020-05-01-first-munro#the-top"/);
  assert.match(html, /href="\/blog\/page\/about-me"/);
});
