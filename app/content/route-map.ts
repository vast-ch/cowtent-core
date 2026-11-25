import { waitForPromise } from '@ember/test-waiters';
import { isTesting } from '@embroider/macros';

import { terrainSource } from './route-map-3d.ts';
import {
  distanceAlong,
  profileChart,
  profileOf,
  photoPin,
  walkerPin,
} from './route-profile.ts';

import type {
  IControl,
  Map as MapLibreMap,
  MapLayerMouseEvent,
  Marker,
} from 'maplibre-gl';
import type { GalleryPhoto } from './gallery.ts';
import type { Point } from './schemas.ts';

/**
 * swisstopo's map in Web Mercator, free to use with its name on it
 * (https://www.geo.admin.ch/en/general-terms-of-use-fsdi); only Switzerland
 * and its borders
 */
export const TILES =
  'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg';
export const ATTRIBUTION =
  '<a href="https://www.swisstopo.admin.ch/" target="_blank" rel="noopener">© swisstopo</a>';

/** The names of the map's switches and buttons, in the blog's language */
export interface LayerLabels {
  track: string;
  photos: string;
  points: string;
  profile: string;
  enlarge: string;
  threeD: string;
  flat: string;
  /** The altitude profile's (app/content/route-profile.ts) */
  play: string;
  pause: string;
  fromStart: string;
  toEnd: string;
  climbed: string;
  toClimb: string;
}

export type LayerName = 'track' | 'photos' | 'points' | 'profile';

export const LAYER_NAMES: LayerName[] = [
  'track',
  'photos',
  'points',
  'profile',
];

/** What a map shows (app/services/post-view.ts), the whole route without a center */
export interface MapState {
  center?: [number, number];
  zoom?: number;
  /** The photo ringed, by its place in the gallery */
  shown?: number;
  hidden: LayerName[];
  /** Tilted is 3D, over swisstopo's terrain; flat without */
  pitch?: number;
  bearing?: number;
}

/** What a map tells when it's moved, switched or clicked */
export interface MapEvents {
  moved?: (
    center: [number, number],
    zoom: number,
    angle: { pitch: number; bearing: number },
  ) => void;
  switched?: (hidden: LayerName[]) => void;
  photo?: (index: number) => void;
  enlarge?: () => void;
}

export interface RouteMap {
  /** Shows what the address says it should */
  apply: (state: MapState) => void;
  /**
   * Moves the map, as it is, into another place: the post's map into its
   * lightbox and back, so it's one map that doesn't load anything again
   */
  moveTo: (place: HTMLElement, inLightbox: boolean) => void;
  remove: () => void;
}

export interface Pins {
  points?: Point[];
  photos?: GalleryPhoto[];
  labels?: LayerLabels;
  /** The map in its lightbox: the wheel zooms it, no button to enlarge it */
  inLightbox?: boolean;
  /** Drawn now, not once it's about to scroll into view */
  eager?: boolean;
  state?: MapState;
  on?: MapEvents;
}

/** How tilted the 3D button makes the map */
const PITCH = 60;

/** Around the route when the whole of it is shown */
const PADDING = 24;

// rose-600 and stone-900, as the rest of the blog
const TRACK_COLOUR = '#e11d48';
const POINT_RIM = '#1c1917';

const EXPAND =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const NONE: RouteMap = { apply: () => {}, moveTo: () => {}, remove: () => {} };

/** Marks the 3D button's tilt as a move by hand, like a drag's or the zoom's */
const BY_HAND = { byHand: true };

/**
 * Once the map is about to scroll into view: MapLibre is a big download
 * and more to start, so a post shows and scrolls first. Tests draw it
 * straight away.
 */
export function nearView(element: HTMLElement) {
  if (isTesting() || !('IntersectionObserver' in window))
    return Promise.resolve();

  return new Promise<void>((resolve) => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          resolve();
        }
      },
      { rootMargin: '600px' },
    );

    observer.observe(element);
  });
}

/** A group of buttons or switches in a corner of the map */
function control(build: (box: HTMLElement) => void, className = ''): IControl {
  let box: HTMLElement | undefined;

  return {
    onAdd: () => {
      box = document.createElement('div');
      box.className = `maplibregl-ctrl maplibregl-ctrl-group ${className}`;
      build(box);

      return box;
    },
    onRemove: () => box?.remove(),
  };
}

function button(className: string, html = '') {
  const element = document.createElement('button');

  element.type = 'button';
  element.className = className;
  element.innerHTML = html;

  return element;
}

const visibility = (hidden: LayerName[], name: LayerName) =>
  hidden.includes(name) ? 'none' : 'visible';

/**
 * The route of a post on swisstopo's map, in the place of the link to it
 * that lib/route.mjs leaves in a `.route-map`: the track and the points of
 * the facts with a latitude and longitude as layers of the map, every
 * photo of the gallery that knows where it was taken as a small round
 * photo (a marker, for its HTML). Tilted (the 3D button, or dragged), it
 * stands on swisstopo's terrain (app/content/route-map-3d.ts). It shows
 * the `state` it's given, and tells `on` what's done to it: moved,
 * turned, switched, a photo clicked, the button to enlarge it. MapLibre
 * only loads on a page with a route, in the browser, when the map is
 * about to be seen.
 */
export async function routeMap(
  container: HTMLElement,
  {
    points = [],
    photos = [],
    labels,
    inLightbox = false,
    eager = false,
    state = { hidden: [] },
    on = {},
  }: Pins,
): Promise<RouteMap> {
  // [lat, lng, elevation?] (lib/route.mjs)
  const track = JSON.parse(container.dataset['track'] ?? '[]') as [
    number,
    number,
    number?,
  ][];

  if (!track.length) return NONE;

  if (!eager) await nearView(container);

  const [maplibregl, { default: workerUrl }] = await waitForPromise(
    Promise.all([
      import('maplibre-gl'),
      // MapLibre looks for its worker next to its own file, which the
      // bundler moves: it's handed the worker's address instead
      import('maplibre-gl/dist/maplibre-gl-worker.mjs?url'),
      import('maplibre-gl/dist/maplibre-gl.css'),
    ]),
  );

  // Gone from the page while MapLibre loaded
  if (!container.isConnected) return NONE;

  maplibregl.setWorkerUrl(workerUrl);

  const lngLat = ([lat, lng]: [number, number, number?]): [number, number] => [
    lng,
    lat,
  ];
  const located = points.filter(
    (point): point is Point & { latitude: number; longitude: number } =>
      point.latitude !== undefined && point.longitude !== undefined,
  );
  const placed = photos.flatMap(({ photo, caption, position }, index) =>
    position ? [{ photo, caption, position: lngLat(position), index }] : [],
  );

  // The whole route: its track, its points and its photos
  const bounds = new maplibregl.LngLatBounds();

  for (const position of track) bounds.extend(lngLat(position));
  for (const { longitude, latitude } of located)
    bounds.extend([longitude, latitude]);
  for (const { position } of placed) bounds.extend(position);

  const { center, zoom, pitch = 0, bearing = 0, hidden } = state;
  const fallback = [...container.childNodes];
  // The map's own element, which moves with it (moveTo)
  const element = document.createElement('div');

  // As high as the map, the profile's height kept for it
  // (--profile-height), higher with room for the photos' pins on it
  element.className =
    'route-map-canvas size-full [--profile-height:5.5rem] sm:[--profile-height:7rem] has-[.with-photos]:[--profile-height:7.25rem] sm:has-[.with-photos]:[--profile-height:9rem]';
  element.dataset['terrain'] = 'off';
  container.replaceChildren(element);

  let map: MapLibreMap;

  try {
    map = new maplibregl.Map({
      container: element,
      style: {
        version: 8,
        sources: {
          swisstopo: {
            type: 'raster',
            tiles: [TILES],
            tileSize: 256,
            maxzoom: 18,
            attribution: ATTRIBUTION,
          },
          track: {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: track.map(lngLat),
              },
            },
          },
          points: {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: located.map(
                ({ name, altitude, latitude, longitude }) => ({
                  type: 'Feature',
                  properties: {
                    label:
                      altitude === undefined ? name : `${name}, ${altitude} m`,
                  },
                  geometry: {
                    type: 'Point',
                    coordinates: [longitude, latitude],
                  },
                }),
              ),
            },
          },
        },
        layers: [
          { id: 'swisstopo', type: 'raster', source: 'swisstopo' },
          {
            id: 'track',
            type: 'line',
            source: 'track',
            layout: {
              'line-cap': 'round',
              'line-join': 'round',
              visibility: visibility(hidden, 'track'),
            },
            paint: { 'line-color': TRACK_COLOUR, 'line-width': 4 },
          },
          {
            id: 'points',
            type: 'circle',
            source: 'points',
            layout: { visibility: visibility(hidden, 'points') },
            paint: {
              'circle-radius': 6,
              'circle-color': '#ffffff',
              'circle-stroke-color': POINT_RIM,
              'circle-stroke-width': 2.5,
            },
          },
        ],
        sky: {
          'sky-color': '#9cc8ec',
          'horizon-color': '#f5f5f4',
          'sky-horizon-blend': 0.6,
        },
      },
      // Where the address says, or the whole route
      ...(center && zoom !== undefined
        ? { center: lngLat(center), zoom }
        : {
            bounds,
            fitBoundsOptions: { padding: PADDING },
          }),
      pitch,
      bearing,
      maxPitch: 85,
      attributionControl: { compact: true },
    });
  } catch {
    // No WebGL: the link to the route on map.geo.admin.ch stays
    container.replaceChildren(...fallback);

    return NONE;
  }

  map.addControl(
    new maplibregl.NavigationControl({ visualizePitch: true }),
    'top-left',
  );

  // A point's name and altitude under the mouse
  const tooltip = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: false,
    offset: 10,
    className: 'route-tooltip',
  });

  map.on('mouseenter', 'points', (event: MapLayerMouseEvent) => {
    const [feature] = event.features ?? [];
    // A feature of the points' source: a Point, with its label
    const point = feature?.geometry as
      { type: 'Point'; coordinates: [number, number] } | undefined;

    if (!feature || point?.type !== 'Point') return;

    tooltip
      .setLngLat(point.coordinates)
      .setText(String(feature.properties['label']))
      .addTo(map);
  });
  map.on('mouseleave', 'points', () => tooltip.remove());

  // A photo in a bubble on a pin, the pin's tip where it was taken, so the
  // photo doesn't hide the place; smaller on a phone, ringed while it's
  // the one shown. Upright in 3D too, standing on the terrain.
  const size = window.matchMedia('(min-width: 640px)').matches ? 44 : 30;
  const pins = new Map<number, { pin: HTMLElement; marker: Marker }>();

  for (const { photo, caption, position, index } of placed) {
    const pin = photoPin(photo.imageUrlFor(480, 'webp') ?? '', caption, 'map');

    pin.style.width = `${size}px`;
    pin.addEventListener('click', (event) => {
      event.stopPropagation();
      on.photo?.(index);
    });
    pins.set(index, {
      pin,
      marker: new maplibregl.Marker({
        element: pin,
        anchor: 'bottom',
      }).setLngLat(position),
    });
  }

  let current = state;

  // On its own, top right where a map's full screen button is: enlarge,
  // only out of the lightbox
  let enlargeBox: HTMLElement | undefined;

  if (labels && on.enlarge) {
    map.addControl(
      control((box) => {
        // flex! over MapLibre's own button styles
        const enlarge = button(
          'route-enlarge flex! items-center justify-center text-stone-800 [&_svg]:size-4',
          EXPAND,
        );

        enlargeBox = box;

        enlarge.title = labels.enlarge;
        enlarge.setAttribute('aria-label', labels.enlarge);
        enlarge.addEventListener('click', () => on.enlarge?.());
        box.append(enlarge);
      }),
      'top-right',
    );
  }

  // Under the zoom and the compass: 3D, or flat again
  let threeD: HTMLButtonElement | undefined;

  if (labels) {
    map.addControl(
      control((box) => {
        threeD = button('route-3d text-xs font-bold text-stone-800');
        threeD.addEventListener('click', () => {
          map.easeTo(
            { pitch: map.getPitch() > 0 ? 0 : PITCH, bearing: 0 },
            BY_HAND,
          );
        });
        box.append(threeD);
      }),
      'top-left',
    );
  }

  // Along its bottom, the altitude profile, when the track has elevations;
  // a walker on the map where it's hovered, or walked along when played
  const profile = labels ? profileOf(track) : undefined;
  const locale = document.documentElement.lang || undefined;
  const walker = walkerPin();

  // Seen even behind a ridge in 3D, where MapLibre would fade it
  const walkerMarker = new maplibregl.Marker({
    element: walker,
    anchor: 'bottom',
    opacityWhenCovered: '1',
  });
  // While it walks, the map follows the walker: a glide to where it is
  // first, then centred on it all the way
  const follow = (at: [number, number]) => {
    const { x, y } = map.project(at);
    const { clientWidth: width, clientHeight: height } = map.getContainer();
    const far = Math.hypot(x - width / 2, y - height / 2) > 40;

    if (map.isMoving()) return;
    if (far) map.easeTo({ center: at, duration: 700 });
    else map.jumpTo({ center: at });
  };

  const chart =
    profile && labels
      ? profileChart(
          profile,
          placed.flatMap(({ photo, caption, position, index }) => {
            const distance = distanceAlong(profile, position);

            return distance === undefined
              ? []
              : [
                  {
                    index,
                    caption,
                    distance,
                    src: photo.imageUrlFor(160, 'webp') ?? '',
                  },
                ];
          }),
          labels,
          {
            at: (point, walking) => {
              if (!point) {
                walkerMarker.remove();

                return;
              }

              walkerMarker.setLngLat(point.lngLat).addTo(map);

              if (walking) follow(point.lngLat);
            },
            photo: (index) => on.photo?.(index),
          },
          locale,
        )
      : undefined;

  if (chart) {
    element.append(chart.element);
    element.classList.add('has-profile');
  }

  // A drag stops the walk
  map.on('movestart', (event) => {
    if ((event as { originalEvent?: Event }).originalEvent) chart?.pause();
  });

  // A switch for each of what's on the map, when there's more than the track
  const switches = new Map<LayerName, HTMLInputElement>();
  const names = LAYER_NAMES.filter((name) =>
    name === 'track'
      ? true
      : name === 'profile'
        ? chart !== undefined
        : (name === 'points' ? located.length : pins.size) > 0,
  );

  if (labels && names.length > 1) {
    map.addControl(
      control((box) => {
        for (const name of names) {
          const label = document.createElement('label');

          label.className = 'flex cursor-pointer items-center gap-1.5';
          const input = document.createElement('input');

          input.type = 'checkbox';
          input.checked = !hidden.includes(name);
          input.addEventListener('change', () => {
            const now = names.filter((n) => !switches.get(n)?.checked);

            apply({ ...current, hidden: now });
            on.switched?.(now);
          });
          label.append(input, ` ${labels[name]}`);
          box.append(label);
          switches.set(name, input);
        }
      }, 'route-layers flex flex-col gap-1 px-2.5 py-2 text-sm text-stone-800'),
      'top-right',
    );
  }

  // Once the style is there (its 'load'), layers and terrain can be changed,
  // whatever tiles are still coming in
  let ready = false;

  // Tilted, the map stands on swisstopo's terrain; flat, it doesn't need it
  let terrainOn = false;

  const terrain = async (wanted: boolean) => {
    if (wanted === terrainOn) return;

    terrainOn = wanted;

    if (!wanted) {
      map.setTerrain(null);
      element.dataset['terrain'] = 'off';

      return;
    }

    element.dataset['terrain'] = 'loading';

    // Without swisstopo's terrain (offline, or it's down) it stays flat
    const source = await waitForPromise(
      terrainSource(maplibregl).catch(() => undefined),
    );

    if (!source) {
      terrainOn = false;
      element.dataset['terrain'] = 'off';

      return;
    }
    if (!terrainOn) return;
    if (!map.getSource('terrain')) map.addSource('terrain', source as never);

    map.setTerrain({ source: 'terrain', exaggeration: 1 });
    element.dataset['terrain'] = 'on';
  };

  const showAngle = () => {
    const tilted = map.getPitch() > 0;

    if (threeD && labels) {
      threeD.textContent = tilted ? '2D' : '3D';
      threeD.title = tilted ? labels.flat : labels.threeD;
      threeD.setAttribute('aria-label', threeD.title);
      threeD.setAttribute('aria-pressed', String(tilted));
    }

    if (ready) void terrain(tilted);
  };

  const sameView = (next: MapState) => {
    const here = map.getCenter();
    const close = (a: number, b: number, by: number) => Math.abs(a - b) < by;

    return (
      close(here.lat, next.center![0], 2e-5) &&
      close(here.lng, next.center![1], 2e-5) &&
      close(map.getZoom(), next.zoom!, 0.01) &&
      close(map.getPitch(), next.pitch ?? 0, 0.5) &&
      close(map.getBearing(), next.bearing ?? 0, 0.5)
    );
  };

  // What's on it: the layers' visibility once the style is there, the
  // photos' markers, the switches, the ring
  const show = ({ hidden: off, shown }: MapState) => {
    if (ready) {
      for (const name of ['track', 'points'] as const) {
        map.setLayoutProperty(name, 'visibility', visibility(off, name));
      }
    }

    for (const [index, { pin, marker }] of pins) {
      if (off.includes('photos')) marker.remove();
      else marker.addTo(map);

      pin.classList.toggle('is-shown', index === shown);
      pin.style.zIndex = index === shown ? '1' : '';
    }

    chart?.show(!off.includes('profile'), !off.includes('photos'), shown);
    element.classList.toggle(
      'has-profile',
      chart !== undefined && !off.includes('profile'),
    );

    for (const [name, input] of switches) input.checked = !off.includes(name);
  };

  function apply(next: MapState) {
    current = next;

    if (next.center && next.zoom !== undefined) {
      if (!sameView(next)) {
        map.jumpTo({
          center: lngLat(next.center),
          zoom: next.zoom,
          pitch: next.pitch ?? 0,
          bearing: next.bearing ?? 0,
        });
      }
    } else {
      map.jumpTo({ pitch: next.pitch ?? 0, bearing: next.bearing ?? 0 });
      map.fitBounds(bounds, { padding: PADDING, animate: false });
    }

    show(next);
    showAngle();
  }

  show(current);
  showAngle();
  map.once('load', () => {
    ready = true;
    show(current);
    showAngle();
  });
  map.on('pitchend', showAngle);

  // Moved by hand (a drag, the wheel, the keys, the zoom or 3D buttons),
  // not resized or told what to show by the other map or the address
  map.on('moveend', (event) => {
    const { originalEvent, byHand } = event as {
      originalEvent?: Event;
      byHand?: boolean;
    };

    if (!originalEvent && !byHand) return;

    const { lat, lng } = map.getCenter();

    on.moved?.([lat, lng], +map.getZoom().toFixed(2), {
      pitch: Math.round(map.getPitch()),
      bearing: Math.round(map.getBearing()),
    });
  });

  // On the page, the wheel and one finger scroll past it; in its lightbox
  // they move it, and there's no button to enlarge it
  const place = (lightbox: boolean) => {
    if (lightbox) map.cooperativeGestures.disable();
    else map.cooperativeGestures.enable();

    if (enlargeBox) enlargeBox.style.display = lightbox ? 'none' : '';
  };

  place(inLightbox);

  return {
    apply,
    moveTo: (next, lightbox) => {
      if (element.parentElement !== next) next.replaceChildren(element);

      place(lightbox);
      map.resize();
    },
    remove: () => {
      chart?.remove();
      map.remove();
    },
  };
}
