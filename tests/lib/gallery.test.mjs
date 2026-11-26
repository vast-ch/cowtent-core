import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  exifOf,
  galleryOf,
  isGalleryPhoto,
  photosTimes,
} from '../../lib/gallery.mjs';

function post(...files) {
  const dir = mkdtempSync(join(tmpdir(), 'cowtent-gallery-'));

  mkdirSync(join(dir, 'gallery'));
  for (const file of files) writeFileSync(join(dir, 'gallery', file), '');

  return dir;
}

test('no gallery folder, no gallery', () => {
  assert.deepEqual(galleryOf(mkdtempSync(join(tmpdir(), 'cowtent-'))), []);
});

test('the file names are the captions, numbered ones first in their order', () => {
  const dir = post(
    'Lunch.jpg',
    '10 - The way down.JPG',
    '2 The top.png',
    '01 - The start.jpeg',
    'A notes.txt',
    '.DS_Store',
  );

  assert.deepEqual(galleryOf(dir), [
    { src: './gallery/01 - The start.jpeg', caption: 'The start' },
    { src: './gallery/2 The top.png', caption: 'The top' },
    { src: './gallery/10 - The way down.JPG', caption: 'The way down' },
    { src: './gallery/Lunch.jpg', caption: 'Lunch' },
  ]);
});

test('only the first " - " separates, a date is not a number', () => {
  assert.deepEqual(
    galleryOf(post('3 - Half-way - up.jpg', '2024-07-25 Summit.jpg')),
    [
      { src: './gallery/3 - Half-way - up.jpg', caption: 'Half-way - up' },
      { src: './gallery/2024-07-25 Summit.jpg', caption: '2024-07-25 Summit' },
    ],
  );
});

test('a photo named only by its number has no caption', () => {
  assert.deepEqual(galleryOf(post('3.jpg')), [
    { src: './gallery/3.jpg', caption: '' },
  ]);
});

test('a ? or # in a name is an error that names the file', () => {
  assert.throws(() => galleryOf(post('Is it far?.jpg')), /Is it far\?\.jpg/);
});

test('the dev server knows a gallery photo', () => {
  assert.equal(isGalleryPhoto('/blog/posts/a/gallery/01 Top.jpg'), true);
  assert.equal(isGalleryPhoto('/blog/posts/a/01.jpg'), false);
  assert.equal(isGalleryPhoto('/blog/posts/a/gallery/notes.txt'), false);
});

test("a photo's GPS is where it was taken, none without", async () => {
  const photos = join(
    import.meta.dirname,
    '../fixtures/content/posts/2023-08-04-a-scramble/gallery',
  );

  assert.deepEqual(
    (await exifOf(join(photos, '01 - The first photo.jpg'))).position,
    [46.63687, 7.9778],
  );
  assert.equal(
    (await exifOf(join(photos, 'The third photo.jpg'))).position,
    undefined,
  );
});

test("a photo's time: the GPS's, or the camera's set right by the others", () => {
  const hour = 3600000;

  assert.deepEqual(
    photosTimes([
      { utc: 10 * hour, local: 11 * hour },
      { utc: 12 * hour, local: 13 * hour },
      // No GPS: the camera's clock, an hour ahead like on the others
      { local: 15 * hour },
      {},
    ]),
    [10 * hour, 12 * hour, 14 * hour, undefined],
  );
  assert.deepEqual(
    photosTimes([{ local: 15 * hour }]),
    [undefined],
    'nothing to tell the time zone by',
  );
});
