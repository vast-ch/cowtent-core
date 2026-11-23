import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { coverOf, isCoverPhoto } from '../../lib/cover.mjs';

function post(...files) {
  const dir = mkdtempSync(join(tmpdir(), 'cowtent-cover-'));

  for (const file of files) writeFileSync(join(dir, file), '');

  return dir;
}

test('no photo named cover, no cover', () => {
  assert.equal(
    coverOf(post('index.md', '01.jpg', 'covered bridge.jpg')),
    undefined,
  );
});

test('cover.jpg is the cover, without alt text', () => {
  assert.deepEqual(coverOf(post('index.md', 'cover.jpg')), {
    src: './cover.jpg',
    alt: '',
  });
});

test('the rest of the name is the alt text, in any case and photo format', () => {
  assert.deepEqual(coverOf(post('COVER  The ridge at dawn .WebP')), {
    src: './COVER  The ridge at dawn .WebP',
    alt: 'The ridge at dawn',
  });
  assert.equal(coverOf(post('Cover.jpeg')).src, './Cover.jpeg');
  assert.equal(coverOf(post('cover.avif')).src, './cover.avif');
  assert.equal(coverOf(post('cover.png')).src, './cover.png');
  assert.equal(coverOf(post('cover.txt')), undefined);
});

test('two covers are an error that names them', () => {
  assert.throws(
    () => coverOf(post('cover.jpg', 'Cover The top.png')),
    /cover\.jpg, Cover The top\.png|Cover The top\.png, cover\.jpg/,
  );
});

test('a ? or # in its name is an error', () => {
  assert.throws(() => coverOf(post('cover Is it far?.jpg')), /Is it far\?/);
});

test('the dev server knows a cover photo', () => {
  assert.equal(isCoverPhoto('/blog/posts/a/Cover The top.jpg'), true);
  assert.equal(isCoverPhoto('/blog/posts/a/cover.png'), true);
  assert.equal(isCoverPhoto('/blog/posts/a/01.jpg'), false);
  assert.equal(isCoverPhoto('/blog/posts/a/cover.md'), false);
});
