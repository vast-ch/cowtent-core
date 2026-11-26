/**
 * The altitude profile under a route's map (app/content/route-map.ts):
 * the track's elevation along its distance, like the relief under a
 * route on Strava. Hovered, it tells how far it is from the start and to
 * the end, how much is climbed and still to climb there, and the map
 * shows a walker on that spot; played, the walker walks the route. A
 * post's routes (01 - route.gpx, 02 - route.gpx, …) are one relief end to
 * end, each stretch in its route's colour (app/content/route-colours.ts);
 * a click on one zooms in on it, and a button back out.
 */

import { routeClasses } from './route-colours.ts';

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
  zoomIn: string;
  zoomOut: string;
}

/**
 * A photo on the profile, the gallery's `index`: on `route`, `distance`
 * metres from that route's start
 */
export interface ProfilePhoto {
  index: number;
  src: string;
  caption: string;
  route: number;
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
// The profile's ticks, in metres along the route: the shortest step that
// makes at most TICKS of them
const TICK_STEPS = [1000, 2000, 5000, 10000, 20000, 50000, 100000];
const TICKS = 8;

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

/**
 * Routes end to end, one after the other: the distances and climbs go on
 * from where the last one stopped. `starts` is where each begins along it.
 */
export function joinProfiles(profiles: Profile[]): {
  profile: Profile;
  starts: number[];
} {
  const points: ProfilePoint[] = [];
  const starts: number[] = [];
  let distance = 0;
  let ascent = 0;
  let descent = 0;

  for (const profile of profiles) {
    starts.push(distance);

    for (const point of profile.points) {
      points.push({
        ...point,
        distance: distance + point.distance,
        ascent: ascent + point.ascent,
        descent: descent + point.descent,
      });
    }

    distance += profile.distance;
    ascent += profile.ascent;
    descent += profile.descent;
  }

  return {
    profile: {
      points,
      distance,
      ascent,
      descent,
      lowest: Math.min(...profiles.map((profile) => profile.lowest)),
      highest: Math.max(...profiles.map((profile) => profile.highest)),
    },
    starts,
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

/** An element with its classes */
const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
) => {
  const element = document.createElement(tag);

  element.className = className;

  return element;
};

/**
 * A photo where it was taken: a round bubble on a pin, the pin's tip on the
 * place, so the photo doesn't hide it; nothing happens to it under the
 * mouse. Ringed in colour-1 while it's the one shown (`is-shown`).
 */
export function photoPin(
  src: string,
  caption: string,
  on: 'map' | 'profile',
): HTMLButtonElement {
  const pin = el(
    'button',
    on === 'map'
      ? 'route-photo group/pin block cursor-pointer'
      : 'route-profile-photo group/pin absolute z-[1] block w-5 -translate-x-1/2 -translate-y-full cursor-pointer sm:w-8',
  );
  const bubble = el(
    'span',
    'route-bubble flex flex-col items-center drop-shadow-md',
  );
  const img = el(
    'img',
    'aspect-square w-full rounded-full object-cover ring-2 ring-white group-[.is-shown]/pin:ring-4 group-[.is-shown]/pin:ring-colour-1-600',
  );
  const tip = el(
    'span',
    `route-tip -mt-px h-0 w-0 border-x-transparent border-t-white group-[.is-shown]/pin:border-t-colour-1-600 ${
      on === 'map'
        ? 'border-x-[4px] border-t-[6px]'
        : 'border-x-[4px] border-t-[6px] sm:border-x-[5px] sm:border-t-[8px]'
    }`,
  );

  pin.type = 'button';
  pin.title = caption;
  pin.setAttribute('aria-label', caption);
  img.src = src;
  img.alt = '';
  bubble.append(img, tip);
  pin.append(bubble);

  return pin;
}

/** The walker on the map at the profile's spot: a pin like the photos' */
export function walkerPin(): HTMLButtonElement {
  const pin = el('button', 'route-walker pointer-events-none block w-8');
  const bubble = el('span', 'flex flex-col items-center drop-shadow-md');

  pin.type = 'button';
  pin.tabIndex = -1;
  pin.setAttribute('aria-hidden', 'true');
  bubble.innerHTML = WALKER;
  bubble.firstElementChild!.setAttribute(
    'class',
    'aspect-square w-full rounded-full bg-colour-1-600 p-1 text-white ring-2 ring-white',
  );
  bubble.append(
    el(
      'span',
      '-mt-px h-0 w-0 border-x-[6px] border-t-[9px] border-x-transparent border-t-white',
    ),
  );
  pin.append(bubble);

  return pin;
}

/** What the profile tells the map */
export interface ProfileEvents {
  /** The spot hovered or walked to, nothing when it's left */
  at: (point: ProfilePoint | undefined, walking: boolean) => void;
  photo: (index: number) => void;
  /** Zoomed in on a route, by its place, or out to all of them */
  zoomed?: (route: number | undefined) => void;
}

export interface ProfileChart {
  element: HTMLElement;
  /** Whether it's shown, its photos too */
  show: (shown: boolean, withPhotos: boolean, ringed?: number) => void;
  /** Stops the walk, when the user moves the map */
  pause: () => void;
  remove: () => void;
}

const ZOOM_OUT = svg('<path d="M15 18l-6-6 6-6"/>');

/**
 * The profile as a strip of the map: a play button, the relief with the
 * photos taken on the way, and, at the spot hovered, its numbers. With
 * more than one route, all of them end to end, each in its colour; a
 * click on one shows only it, the button over the relief all again.
 */
export function profileChart(
  profiles: Profile[],
  photos: ProfilePhoto[],
  labels: ProfileLabels,
  on: ProfileEvents,
  locale?: string,
): ProfileChart {
  const joined = joinProfiles(profiles);
  const many = profiles.length > 1;

  // A strip along the map's bottom, as high as the map makes room for
  // (--profile-height, route-map.ts); `is-at` while a spot is hovered or
  // walked, `with-photos` while the photos' pins are on it, `is-zoomed`
  // while it shows one of several routes
  const element = el(
    'div',
    'route-profile group/profile absolute inset-x-2 bottom-2 z-[2] flex h-(--profile-height) items-stretch gap-2 rounded-xl bg-white/85 p-2 pl-1 font-sans text-stone-900 shadow-md backdrop-blur-sm',
  );

  const play = el(
    'button',
    'route-play flex size-9 shrink-0 cursor-pointer items-center justify-center self-center rounded-full text-colour-1-700 hover:bg-colour-1-50 focus-visible:outline-2 focus-visible:outline-colour-1-600 [&_svg]:size-6',
  );
  play.type = 'button';

  const chart = el(
    'div',
    `route-profile-chart relative min-w-0 flex-1 touch-pan-y ${many ? 'cursor-zoom-in group-[.is-zoomed]/profile:cursor-crosshair' : 'cursor-crosshair'}`,
  );

  // The relief and what's on it, under the room for the pins
  const plot = el(
    'div',
    'absolute inset-x-0 top-0 bottom-0 group-[.with-photos]/profile:top-7 sm:group-[.with-photos]/profile:top-10',
  );

  chart.append(plot);

  // Back to all the routes, over the relief's top right while zoomed in
  const zoomOut = el(
    'button',
    'route-zoom-out absolute top-0 right-0 z-[4] hidden cursor-pointer items-center gap-0.5 rounded-full bg-white/90 py-0.5 pr-2 pl-1 text-xs font-medium text-colour-1-700 shadow-sm ring-1 ring-stone-900/10 group-[.is-zoomed]/profile:flex hover:bg-colour-1-50 focus-visible:outline-2 focus-visible:outline-colour-1-600 [&_svg]:size-3.5',
  );

  zoomOut.type = 'button';
  zoomOut.innerHTML = ZOOM_OUT;
  zoomOut.append(labels.zoomOut);

  // The spot, while it's hovered or walked: a line down, and a dot on the
  // relief over everything else on the strip
  const cursor = el(
    'span',
    'pointer-events-none absolute inset-y-0 z-[2] hidden w-px -translate-x-1/2 bg-stone-900/60 group-[.is-at]/profile:block',
  );
  const dot = el(
    'span',
    'pointer-events-none absolute z-[3] hidden size-3.5 -translate-1/2 rounded-full bg-colour-1-600 ring-2 ring-white group-[.is-at]/profile:block',
  );

  // The numbers at the spot, above the strip over it: how high, how far from
  // the start and to the end, how much climbed and still to climb (the
  // dashed slope)
  const numbers = el(
    'div',
    'route-profile-numbers pointer-events-none invisible absolute bottom-full mb-2 grid w-max grid-cols-2 gap-x-3 gap-y-0.5 rounded-lg bg-stone-900/90 px-2.5 py-1.5 text-xs whitespace-nowrap text-white tabular-nums shadow-lg group-[.is-at]/profile:visible',
  );
  numbers.setAttribute('aria-live', 'polite');

  const number = (icon: keyof typeof ICONS, label: string, ahead = false) => {
    const item = el(
      'span',
      `route-number-${icon.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)} flex items-center gap-1 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-stone-300 ${ahead ? 'text-stone-300' : ''}`,
    );
    const value = el('span', 'route-number-value');

    item.title = label;
    item.innerHTML = ICONS[icon];
    item.append(value);

    return { item, value };
  };

  const height = el(
    'span',
    'route-number-height col-span-2 text-sm font-semibold',
  );
  const fromStart = number('fromStart', labels.fromStart);
  const toEnd = number('toEnd', labels.toEnd, true);
  const climbed = number('climbed', labels.climbed);
  const toClimb = number('toClimb', labels.toClimb, true);

  numbers.append(
    height,
    fromStart.item,
    toEnd.item,
    climbed.item,
    toClimb.item,
  );

  chart.append(cursor, zoomOut);
  element.append(play, chart, numbers);

  const kilometres = new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'kilometer',
    maximumFractionDigits: 0,
  });

  // What it shows: all the routes, or the one zoomed in on
  let zoomed: number | undefined;
  let profile = joined.profile;
  let total = profile.distance;
  let x = (distance: number) => (distance / total) * 100;
  let y = (elevation: number) => elevation;
  let walked!: SVGElement;
  let thumbs: { thumb: HTMLButtonElement; index: number }[] = [];
  // What show() was last told, for the pins drawn anew on a zoom
  let shownState = {
    withPhotos: true,
    ringed: undefined as number | undefined,
  };

  // The relief of what it shows, the ticks, the scale and the photos' pins
  const draw = () => {
    profile = zoomed === undefined ? joined.profile : profiles[zoomed]!;
    total = profile.distance;

    const { lowest, highest } = profile;
    // A little room above and below the relief, and never flatter than
    // 100 m; the photos' pins have their own room above it
    const span = Math.max(highest - lowest, 100);
    const bottom = lowest - span * 0.08;
    const top = bottom + span * 1.12;

    x = (distance: number) => (distance / total) * 100;
    y = (elevation: number) => ((top - elevation) / (top - bottom)) * 100;

    const path = (points: ProfilePoint[]) =>
      points
        .map(
          (point, index) =>
            `${index ? 'L' : 'M'}${x(point.distance).toFixed(2)} ${y(point.elevation).toFixed(2)}`,
        )
        .join('');
    const area = (points: ProfilePoint[]) =>
      `${path(points)}L${x(points.at(-1)!.distance).toFixed(2)} 100L${x(points[0]!.distance).toFixed(2)} 100Z`;
    // Each route's stretch in its colour
    const stretches =
      zoomed === undefined
        ? profiles.map((route, index) => {
            const first = profiles
              .slice(0, index)
              .reduce((sum, { points }) => sum + points.length, 0);

            return {
              index,
              points: profile.points.slice(first, first + route.points.length),
            };
          })
        : [{ index: zoomed, points: profile.points }];

    plot.innerHTML = `
      <svg class="route-relief absolute inset-0 size-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        ${stretches
          .map(
            ({ index, points }) =>
              `<path class="route-relief-stretch ${routeClasses(index).fill} [fill-opacity:0.45]" data-route="${index}" d="${area(points)}"/>`,
          )
          .join('')}
        <path class="route-relief-walked fill-colour-1-600 [fill-opacity:0.3]" style="clip-path: inset(0 100% 0 0)" d="${area(profile.points)}"/>
        <path class="fill-none stroke-stone-700 [stroke-width:1.5] [vector-effect:non-scaling-stroke]" d="${path(profile.points)}"/>
      </svg>`;
    walked = plot.querySelector<SVGElement>('.route-relief-walked')!;

    // A tick every so many km, under the pins and the spot: a faint line
    // down the relief, its distance at the foot
    const ticks = el(
      'div',
      'route-profile-ticks pointer-events-none absolute inset-0 text-[0.625rem] leading-none font-medium whitespace-nowrap text-stone-500 tabular-nums',
    );
    const step =
      TICK_STEPS.find((each) => total / each <= TICKS) ?? TICK_STEPS.at(-1)!;

    ticks.setAttribute('aria-hidden', 'true');

    for (let at = step; at < total; at += step) {
      const tick = el(
        'span',
        'absolute inset-y-0 flex items-end border-l border-stone-500/30 pl-0.5',
      );

      tick.style.left = `${x(at)}%`;
      tick.textContent = kilometres.format(at / 1000);
      ticks.append(tick);
    }

    plot.prepend(ticks);

    // The photos taken on the way, on pins like the map's, the tip on the
    // relief where it was
    thumbs = photos.flatMap(({ index, src, caption, route, distance }) => {
      if (zoomed !== undefined && route !== zoomed) return [];

      const along =
        distance + (zoomed === undefined ? joined.starts[route]! : 0);
      const thumb = photoPin(src, caption, 'profile');

      thumb.style.left = `${x(along)}%`;
      thumb.style.top = `${y(pointAt(profile, along).elevation)}%`;
      thumb.addEventListener('click', (event) => {
        event.stopPropagation();
        on.photo(index);
      });

      return [{ thumb, index }];
    });
    plot.append(...thumbs.map(({ thumb }) => thumb), dot);

    // The highest and the lowest, in the relief's top and bottom corners, a
    // little backing to be read over its line
    const scale = el(
      'div',
      'route-profile-scale pointer-events-none absolute inset-0 z-[2] text-[0.625rem] leading-none font-medium whitespace-nowrap text-stone-600 tabular-nums',
    );

    scale.setAttribute('aria-hidden', 'true');

    for (const [metres, corner] of [
      [highest, 'top-0'],
      [lowest, 'bottom-0'],
    ] as const) {
      const mark = el(
        'span',
        `absolute left-0 ${corner} rounded bg-white/75 px-1 py-0.5`,
      );

      mark.textContent = altitude(metres, locale);
      scale.append(mark);
    }

    plot.append(scale);

    element.classList.toggle('is-zoomed', zoomed !== undefined);
    chart.title = many && zoomed === undefined ? labels.zoomIn : '';
    pinsShown();
  };

  const pinsShown = () => {
    const { withPhotos, ringed } = shownState;

    element.classList.toggle('with-photos', withPhotos && thumbs.length > 0);

    for (const { thumb, index } of thumbs) {
      thumb.hidden = !withPhotos;
      thumb.classList.toggle('is-shown', index === ringed);
    }
  };

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
    // Over the spot, kept inside the strip
    numbers.style.left = `clamp(0%, calc(${left} - 5.25rem), calc(100% - 10.5rem))`;
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

  // Shows one route, or all of them again: the walk starts over
  const zoom = (route: number | undefined) => {
    if (route === zoomed) return;

    pause();
    zoomed = route;
    position = undefined;
    hovered = undefined;
    draw();
    showAt(undefined);
    on.zoomed?.(route);
  };

  zoomOut.setAttribute('aria-label', labels.zoomOut);
  zoomOut.addEventListener('click', (event) => {
    event.stopPropagation();
    zoom(undefined);
  });

  // Hovered (or touched and dragged along), the spot under the pointer
  const along = (event: PointerEvent | MouseEvent) => {
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

  // A click on a route's stretch zooms in on it
  chart.addEventListener('click', (event) => {
    if (!many || zoomed !== undefined) return;

    const at = along(event);
    const route = joined.starts.findLastIndex((start) => start <= at);

    zoom(Math.max(0, route));
  });

  draw();
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

      shownState = { withPhotos, ringed };
      pinsShown();
    },
    pause,
    remove: () => {
      pause();
      element.remove();
    },
  };
}
