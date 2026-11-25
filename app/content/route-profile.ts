/**
 * The altitude profile under a route's map (app/content/route-map.ts):
 * the track's elevation along its distance, like the relief under a
 * route on Strava. Hovered, it tells how far it is from the start and to
 * the end, how much is climbed and still to climb there, and the map
 * shows a walker on that spot; played, the walker walks the route.
 */

/** A spot of the track, `distance` and the climbs in metres from the start */
export interface ProfilePoint {
  lngLat: [number, number];
  elevation: number;
  distance: number;
  ascent: number;
  descent: number;
}

export interface Profile {
  points: ProfilePoint[];
  distance: number;
  ascent: number;
  descent: number;
  lowest: number;
  highest: number;
}

/** The words of the profile, in the blog's language */
export interface ProfileLabels {
  play: string;
  pause: string;
  fromStart: string;
  toEnd: string;
  climbed: string;
  toClimb: string;
}

/** A photo on the profile, the gallery's `index`, where it's closest */
export interface ProfilePhoto {
  index: number;
  src: string;
  caption: string;
  distance: number;
}

// Up or down by less than this, from the last turn, is the GPS's noise
const NOISE = 3;
// A photo taken this close to the track is on its profile
export const NEAR = 150;
// The walk from start to end, in seconds: longer for a longer route
const SECONDS_PER_KM = 1.5;
const SHORTEST_WALK = 12;
const LONGEST_WALK = 45;

const EARTH = 6371008.8;
const radians = (degrees: number) => (degrees * Math.PI) / 180;

/** Metres between two [lng, lat] */
export function metres(
  [lng1, lat1]: [number, number],
  [lng2, lat2]: [number, number],
) {
  const a =
    Math.sin(radians(lat2 - lat1) / 2) ** 2 +
    Math.cos(radians(lat1)) *
      Math.cos(radians(lat2)) *
      Math.sin(radians(lng2 - lng1) / 2) ** 2;

  return 2 * EARTH * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * The profile of a track of [lat, lng, elevation?] (lib/route.mjs), or
 * nothing when it has no elevation; a point without one takes the last
 * one before it (or the first one after it)
 */
export function profileOf(
  track: [number, number, number?][],
): Profile | undefined {
  const first = track.find((point) => point[2] !== undefined)?.[2];

  if (track.length < 2 || first === undefined) return undefined;

  const points: ProfilePoint[] = [];
  let elevation = first;
  let distance = 0;
  let ascent = 0;
  let descent = 0;
  // The last turn up or down, to leave out the noise
  let turn = first;

  for (const [lat, lng, ele] of track) {
    const lngLat: [number, number] = [lng, lat];
    const last = points.at(-1);

    if (ele !== undefined) elevation = ele;
    if (last) distance += metres(last.lngLat, lngLat);

    if (elevation - turn >= NOISE) {
      ascent += elevation - turn;
      turn = elevation;
    } else if (turn - elevation >= NOISE) {
      descent += turn - elevation;
      turn = elevation;
    }

    points.push({ lngLat, elevation, distance, ascent, descent });
  }

  const elevations = points.map((point) => point.elevation);

  return {
    points,
    distance,
    ascent,
    descent,
    lowest: Math.min(...elevations),
    highest: Math.max(...elevations),
  };
}

/** The spot `distance` metres from the start, between the track's points */
export function pointAt(profile: Profile, distance: number): ProfilePoint {
  const { points } = profile;
  const at = Math.max(0, Math.min(distance, profile.distance));
  let low = 0;
  let high = points.length - 1;

  while (high - low > 1) {
    const middle = (low + high) >> 1;

    if (points[middle]!.distance <= at) low = middle;
    else high = middle;
  }

  const a = points[low]!;
  const b = points[high]!;
  const part =
    b.distance > a.distance ? (at - a.distance) / (b.distance - a.distance) : 0;
  const mix = (x: number, y: number) => x + (y - x) * part;

  return {
    lngLat: [mix(a.lngLat[0], b.lngLat[0]), mix(a.lngLat[1], b.lngLat[1])],
    elevation: mix(a.elevation, b.elevation),
    distance: at,
    ascent: mix(a.ascent, b.ascent),
    descent: mix(a.descent, b.descent),
  };
}

/** How far along the track `lngLat` is, if it's within NEAR of it */
export function distanceAlong(
  profile: Profile,
  lngLat: [number, number],
): number | undefined {
  let best: { off: number; distance: number } | undefined;

  for (const point of profile.points) {
    const off = metres(point.lngLat, lngLat);

    if (!best || off < best.off) best = { off, distance: point.distance };
  }

  return best && best.off <= NEAR ? best.distance : undefined;
}

/** 1.2 km, 850 m */
export function km(metres: number, locale?: string) {
  return metres < 1000
    ? `${Math.round(metres / 10) * 10} m`
    : `${(metres / 1000).toLocaleString(locale, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })} km`;
}

/** 1 234 m */
export const altitude = (metres: number, locale?: string) =>
  `${Math.round(metres).toLocaleString(locale)} m`;

const svg = (paths: string) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

/** The little pictures of the profile's numbers */
export const ICONS = {
  // A dot where it started, the way behind it
  fromStart: svg(
    '<circle cx="5" cy="12" r="3" fill="currentColor"/><path d="M8 12h12M16 8l4 4-4 4"/>',
  ),
  // The way ahead to a flag
  toEnd: svg(
    '<path d="M3 12h9M8 8l4 4-4 4"/><path d="M16 21V4l5 2.5-5 2.5" fill="currentColor"/>',
  ),
  // A slope behind, climbed
  climbed: svg('<path d="M3 20l7-9 4 4 7-9" /><path d="M15 6h6v6"/>'),
  // A slope ahead, dashed: still to climb
  toClimb: svg(
    '<path d="M3 20l7-9 4 4 7-9" stroke-dasharray="2.5 3"/><path d="M15 6h6v6"/>',
  ),
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>',
  pause:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/></svg>',
};

/** A walker, for the pin on the map at the profile's spot */
export const WALKER =
  '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="13" cy="4" r="2"/><path d="M10.5 7.5l-3 1.5-1.5 4 1.8.6 1.1-2.9 1.2-.6-1.6 8.4L5 21.2l1.4 1.3 4.2-3.4.9-3.6 2 2V22h1.9v-5.7l-2.1-2.1.7-3.5 1.2 1.5H19v-1.9h-2.9l-1.9-3.1c-.5-.8-1.2-1.2-2-1.2-.3 0-.6.1-.9.2z"/><path d="M17.3 9.3l1.4 13h-1l-1.3-12.4z"/></svg>';

/** What the profile tells the map */
export interface ProfileEvents {
  /** The spot hovered or walked to, nothing when it's left */
  at: (point: ProfilePoint | undefined, walking: boolean) => void;
  photo: (index: number) => void;
}

export interface ProfileChart {
  element: HTMLElement;
  /** Whether it's shown, its photos too */
  show: (shown: boolean, withPhotos: boolean, ringed?: number) => void;
  /** Stops the walk, when the user moves the map */
  pause: () => void;
  remove: () => void;
}

/**
 * The profile as a strip of the map: a play button, the relief with the
 * photos taken close to the track, and, at the spot hovered, its numbers
 */
export function profileChart(
  profile: Profile,
  photos: ProfilePhoto[],
  labels: ProfileLabels,
  on: ProfileEvents,
  locale?: string,
): ProfileChart {
  const { points, distance: total, lowest, highest } = profile;
  // A little room above and below the relief, and never flatter than 100 m
  const span = Math.max(highest - lowest, 100);
  const bottom = lowest - span * 0.08;
  const top = bottom + span * 1.25;
  const x = (distance: number) => (distance / total) * 100;
  const y = (elevation: number) => ((top - elevation) / (top - bottom)) * 100;

  const element = document.createElement('div');
  element.className = 'route-profile';

  // ▶ and the whole route's numbers
  const play = document.createElement('button');
  play.type = 'button';
  play.className = 'route-play';

  const chart = document.createElement('div');
  chart.className = 'route-profile-chart';

  const line = points
    .map(
      (point, index) =>
        `${index ? 'L' : 'M'}${x(point.distance).toFixed(2)} ${y(point.elevation).toFixed(2)}`,
    )
    .join('');

  chart.innerHTML = `
    <svg class="route-relief" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path class="route-relief-area" d="${line}L100 100L0 100Z"/>
      <path class="route-relief-walked" d="${line}L100 100L0 100Z"/>
      <path class="route-relief-line" d="${line}"/>
    </svg>`;

  const walked = chart.querySelector<SVGPathElement>('.route-relief-walked')!;
  const cursor = document.createElement('span');
  cursor.className = 'route-profile-cursor';
  const dot = document.createElement('span');
  dot.className = 'route-profile-dot';

  // The numbers at the spot: how high, how far from the start and to the
  // end, how much climbed and still to climb
  const numbers = document.createElement('div');
  numbers.className = 'route-profile-numbers';
  numbers.setAttribute('aria-live', 'polite');

  const number = (icon: keyof typeof ICONS, label: string) => {
    const item = document.createElement('span');
    const value = document.createElement('span');

    item.className = `route-number route-number-${icon.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
    item.title = label;
    item.innerHTML = ICONS[icon];
    value.className = 'route-number-value';
    item.append(value);

    return { item, value };
  };

  const height = document.createElement('span');
  height.className = 'route-number-height';
  const fromStart = number('fromStart', labels.fromStart);
  const toEnd = number('toEnd', labels.toEnd);
  const climbed = number('climbed', labels.climbed);
  const toClimb = number('toClimb', labels.toClimb);

  numbers.append(
    height,
    fromStart.item,
    toEnd.item,
    climbed.item,
    toClimb.item,
  );

  // The photos taken close to the track, standing on the relief
  const thumbs = photos.map(({ index, src, caption, distance }) => {
    const thumb = document.createElement('button');
    const img = document.createElement('img');
    const elevation = pointAt(profile, distance).elevation;

    thumb.type = 'button';
    thumb.className = 'route-profile-photo';
    thumb.title = caption;
    thumb.setAttribute('aria-label', caption);
    thumb.style.left = `${x(distance)}%`;
    // On the relief, but inside the strip
    thumb.style.top = `max(${y(elevation)}%, 1.75rem)`;
    img.src = src;
    img.alt = '';
    thumb.append(img);
    thumb.addEventListener('click', (event) => {
      event.stopPropagation();
      on.photo(index);
    });

    return { thumb, index };
  });

  chart.append(cursor, dot, ...thumbs.map(({ thumb }) => thumb));

  // The highest and the lowest, at their height, beside the relief
  const scale = document.createElement('div');

  scale.className = 'route-profile-scale';
  scale.setAttribute('aria-hidden', 'true');

  for (const metres of [highest, lowest]) {
    const mark = document.createElement('span');

    mark.textContent = altitude(metres, locale);
    mark.style.top = `${y(metres)}%`;
    scale.append(mark);
  }

  element.append(play, scale, chart, numbers);

  // Where the walk is (or was paused), and the spot hovered
  let position: number | undefined;
  let hovered: number | undefined;
  let frame: number | undefined;

  const showAt = (distance: number | undefined) => {
    const walking = frame !== undefined;

    element.classList.toggle('is-at', distance !== undefined);
    walked.style.clipPath = `inset(0 ${100 - x(position ?? 0)}% 0 0)`;

    if (distance === undefined) {
      on.at(undefined, walking);

      return;
    }

    const point = pointAt(profile, distance);
    const left = `${x(distance)}%`;

    cursor.style.left = left;
    dot.style.left = left;
    dot.style.top = `${y(point.elevation)}%`;
    numbers.style.setProperty('--at', `${x(distance)}`);
    height.textContent = altitude(point.elevation, locale);
    fromStart.value.textContent = km(point.distance, locale);
    toEnd.value.textContent = km(total - point.distance, locale);
    climbed.value.textContent = altitude(point.ascent, locale);
    toClimb.value.textContent = altitude(profile.ascent - point.ascent, locale);
    on.at(point, walking);
  };

  const playing = (yes: boolean) => {
    play.innerHTML = yes ? ICONS.pause : ICONS.play;
    play.title = yes ? labels.pause : labels.play;
    play.setAttribute('aria-label', play.title);
    element.classList.toggle('is-walking', yes);
  };

  const pause = () => {
    if (frame !== undefined) cancelAnimationFrame(frame);

    frame = undefined;
    playing(false);
  };

  const walk = () => {
    const seconds = Math.min(
      LONGEST_WALK,
      Math.max(SHORTEST_WALK, (total / 1000) * SECONDS_PER_KM),
    );
    let last: number | undefined;

    if (position === undefined || position >= total) position = 0;

    const step = (time: number) => {
      position = Math.min(
        total,
        position! +
          (last === undefined ? 0 : ((time - last) / 1000 / seconds) * total),
      );
      last = time;
      frame = position < total ? requestAnimationFrame(step) : undefined;
      showAt(hovered ?? position);

      if (frame === undefined) playing(false);
    };

    playing(true);
    frame = requestAnimationFrame(step);
  };

  play.addEventListener('click', () =>
    frame === undefined ? walk() : pause(),
  );

  // Hovered (or touched and dragged along), the spot under the pointer
  const along = (event: PointerEvent) => {
    const box = chart.getBoundingClientRect();

    return (
      (Math.max(0, Math.min(event.clientX - box.left, box.width)) / box.width) *
      total
    );
  };

  chart.addEventListener('pointermove', (event) => {
    hovered = along(event);
    showAt(hovered);
  });
  chart.addEventListener('pointerleave', () => {
    hovered = undefined;
    showAt(position);
  });
  // A click there is where the walk goes on from
  chart.addEventListener('click', (event) => {
    position = along(event);
    showAt(position);
  });

  playing(false);

  return {
    element,
    show: (shown, withPhotos, ringed) => {
      element.hidden = !shown;

      if (!shown) {
        pause();
        position = undefined;
        hovered = undefined;
        showAt(undefined);
      }

      for (const { thumb, index } of thumbs) {
        thumb.hidden = !withPhotos;
        thumb.classList.toggle('is-shown', index === ringed);
      }
    },
    pause,
    remove: () => {
      pause();
      element.remove();
    },
  };
}
