import { test } from 'node:test';
import assert from 'node:assert/strict';

import { renderFeed, renderPage } from '../../lib/markdown.mjs';

const language = { t: (key) => key };
const options = { resolveAsset: (url) => url, link: (id) => id, language };

test('the site gets a badge, the feed an emoji', async () => {
  const markdown = '- [x] **Microspikes**\n  Grip.\n- [-] No ice axe\n';

  const page = await renderPage(markdown, options);
  assert.match(
    page,
    /<li class="check" data-check="done"><span class="check-mark" data-check="done" role="img" aria-label="post.checklist.done"><\/span><strong>Microspikes<\/strong><br>/,
  );
  assert.doesNotMatch(page, /<input/);

  const feed = await renderFeed(markdown, options);
  assert.match(
    feed,
    /<li class="check" data-check="done">✅ <strong>Microspikes<\/strong><br>\nGrip\.<\/li>/,
  );
  assert.match(feed, /➖ No ice axe/);
});

test('an unknown symbol and a link stay as they are', async () => {
  const page = await renderPage(
    '- [z] text\n- [a link](https://example.com)\n',
    options,
  );

  assert.doesNotMatch(page, /check/);
  assert.match(page, /\[z\] text/);
});
