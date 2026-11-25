import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { coverOf, isCoverPhoto, photosOf } from '../../lib/cover.mjs';

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

test('the rest of the name after " - " is the alt text, in any case and photo format', () => {
  assert.deepEqual(coverOf(post('COVER - The ridge - at dawn .WebP')), {
    src: './COVER - The ridge - at dawn .WebP',
    alt: 'The ridge - at dawn',
  });
  assert.equal(coverOf(post('Cover.jpeg')).src, './Cover.jpeg');
  assert.equal(coverOf(post('cover.avif')).src, './cover.avif');
  assert.equal(coverOf(post('cover.png')).src, './cover.png');
  assert.equal(coverOf(post('cover.txt')), undefined);
});

test('a space alone works too, the older way', () => {
  assert.deepEqual(coverOf(post('cover The ridge.jpg')), {
    src: './cover The ridge.jpg',
    alt: 'The ridge',
  });
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
  assert.equal(isCoverPhoto('/blog/posts/a/Cover - The top.jpg'), true);
  assert.equal(isCoverPhoto('/blog/posts/a/cover.png'), true);
  assert.equal(isCoverPhoto('/blog/posts/a/01.jpg'), false);
  assert.equal(isCoverPhoto('/blog/posts/a/cover.md'), false);
});

test("the gallery is the cover, then the gallery folder's photos", () => {
  const dir = post('index.md', 'Cover - The ridge.jpg');

  mkdirSync(join(dir, 'gallery'));
  writeFileSync(join(dir, 'gallery', '01 - The start.jpg'), '');

  assert.deepEqual(photosOf(dir), [
    { src: './Cover - The ridge.jpg', caption: 'The ridge' },
    { src: './gallery/01 - The start.jpg', caption: 'The start' },
  ]);
  assert.deepEqual(photosOf(post('index.md', 'cover.jpg')), [
    { src: './cover.jpg', caption: '' },
  ]);
  assert.deepEqual(photosOf(post('index.md')), [], 'none without either');
});
