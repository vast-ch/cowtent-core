import { test } from 'node:test';
import assert from 'node:assert/strict';

import { readFacts } from '../../lib/facts.mjs';

const language = { locale: 'en', t: (key) => key };
const read = (points) =>
  readFacts({ points }, 'posts/a/index.md', language, (id) => id);

test('a point can have a latitude and longitude, for its pin on the map', () => {
  const [point] = read([
    { name: 'Top', latitude: 46.5188, longitude: 7.82 },
  ]).points;

  assert.deepEqual(point, { name: 'Top', latitude: 46.5188, longitude: 7.82 });
});

test('a point needs both latitude and longitude, as degrees', () => {
  assert.throws(
    () => read([{ name: 'Top', latitude: 46.5 }]),
    /posts\/a\/index\.md: facts\.points\[0\] needs both latitude and longitude, or neither \(Top\)/,
  );
  assert.throws(
    () => read([{ name: 'Top', latitude: '46.5', longitude: 7.8 }]),
    /points\[0\]\.latitude and longitude must be degrees/,
  );
  assert.throws(
    () => read([{ name: 'Top', latitude: 146.5, longitude: 7.8 }]),
    /points\[0\]\.latitude and longitude must be degrees/,
  );
});
