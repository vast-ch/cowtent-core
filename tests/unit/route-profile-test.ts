import { module, test } from 'qunit';

import {
  distanceAlong,
  km,
  pointAt,
  profileOf,
} from '../../app/content/route-profile.ts';

// About 1.1 km between each, north
const track: [number, number, number?][] = [
  [46.6, 7.9, 1000],
  [46.61, 7.9, 1001],
  [46.62, 7.9, 1200],
  [46.63, 7.9],
  [46.64, 7.9, 1100],
];

module('Unit | route profile', function () {
  test('the climbs, without the GPS noise', function (assert) {
    const profile = profileOf(track)!;

    assert.strictEqual(profile.ascent, 200, 'up 1 m is noise, then 199 m');
    assert.strictEqual(profile.descent, 100);
    assert.strictEqual(profile.highest, 1200);
    assert.strictEqual(profile.lowest, 1000);
    assert.strictEqual(
      profile.points[3]!.elevation,
      1200,
      'a point without elevation keeps the last one',
    );
    assert.strictEqual(Math.round(profile.distance / 100), 44, 'about 4.4 km');
  });

  test('no profile without elevations', function (assert) {
    assert.strictEqual(
      profileOf([
        [46.6, 7.9],
        [46.61, 7.9],
      ]),
      undefined,
    );
  });

  test('a spot between two points is between them', function (assert) {
    const profile = profileOf(track)!;
    const second = profile.points[1]!;
    const third = profile.points[2]!;
    const half = pointAt(profile, (second.distance + third.distance) / 2);

    assert.strictEqual(Math.round(half.elevation), 1101);
    assert.strictEqual(+half.lngLat[1].toFixed(3), 46.615);
    assert.strictEqual(
      pointAt(profile, -5).distance,
      0,
      'not before the start',
    );
    assert.strictEqual(
      pointAt(profile, 1e9).distance,
      profile.distance,
      'nor after the end',
    );
  });

  test('a photo is on the profile only when taken close to the track', function (assert) {
    const profile = profileOf(track)!;

    assert.strictEqual(
      distanceAlong(profile, [7.9005, 46.62]),
      profile.points[2]!.distance,
      '40 m off, at its closest point',
    );
    assert.strictEqual(distanceAlong(profile, [7.95, 46.62]), undefined);
  });

  test('distances in m or km', function (assert) {
    assert.strictEqual(km(843, 'en'), '840 m');
    assert.strictEqual(km(4321, 'en'), '4.3 km');
  });
});
