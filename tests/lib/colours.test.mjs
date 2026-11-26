import { test } from 'node:test';
import assert from 'node:assert/strict';

import { coloursCss, shadesOf } from '../../lib/colours.mjs';

test('a colour in eleven shades, itself the 600, lighter above, darker below', () => {
  const shades = shadesOf('#FF1493');

  assert.deepEqual(
    Object.keys(shades).map(Number),
    [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950],
  );
  assert.equal(shades[600], '#ff1493');

  const lightness = (hex) =>
    [1, 3, 5].reduce((sum, i) => sum + parseInt(hex.slice(i, i + 2), 16), 0);
  const values = Object.values(shades).map(lightness);

  assert.deepEqual(
    values,
    [...values].sort((a, b) => b - a),
    'from light to dark',
  );
});

test("the blog's colours as one stylesheet, night's the other way round", () => {
  assert.equal(coloursCss([]), '');

  const style = coloursCss(['#ff1493', '#00e5ff']);
  const [light, night] = style.split('}');

  assert.match(light, /html:root:has\(\[data-theme\]\)\{/);
  assert.match(light, /--color-colour-1-600:#ff1493;/);
  assert.match(light, /--color-colour-2-600:#00e5ff;/);
  assert.doesNotMatch(light, /colour-3/);
  assert.match(night, /data-theme="night"/);
  assert.equal(
    night.match(/--color-colour-1-50:(#\w+)/)[1],
    light.match(/--color-colour-1-950:(#\w+)/)[1],
  );
});
