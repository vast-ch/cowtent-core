import { waitForPromise } from '@ember/test-waiters';

import type { Layer } from 'leaflet';
import type { GalleryPhoto } from './gallery.ts';
import type { Point } from './schemas.ts';

/**
 * swisstopo's map in Web Mercator, free to use with its name on it
 * (https://www.geo.admin.ch/en/general-terms-of-use-fsdi); only Switzerland
 * and its borders
 */
const TILES =
  'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg';
const ATTRIBUTION =
  '<a href="https://www.swisstopo.admin.ch/" target="_blank" rel="noopener">© swisstopo</a>';

/** The names of the map's switches and buttons, in the blog's language */
export interface LayerLabels {
  track: string;
  photos: string;
  points: string;
  enlarge: string;
}

export type LayerName = 'track' | 'photos' | 'points';

const LAYER_NAMES: LayerName[] = ['track', 'photos', 'points'];

/** What a map shows (app/services/post-view.ts), the whole route without a center */
export interface MapState {
  center?: [number, number];
  zoom?: number;
  /** The photo ringed, by its place in the gallery */
  shown?: number;
  hidden: LayerName[];
}

/** What a map tells when it's moved, switched or clicked */
export interface MapEvents {
  moved?: (center: [number, number], zoom: number) => void;
  switched?: (hidden: LayerName[]) => void;
  photo?: (index: number) => void;
  enlarge?: () => void;
}

export interface RouteMap {
  /** Shows what another map, or the address, says it should */
  apply: (state: MapState) => void;
  remove: () => void;
}

export interface Pins {
  points?: Point[];
  photos?: GalleryPhoto[];
  labels?: LayerLabels;
  /** The map in its lightbox: the wheel zooms it, no button to enlarge it */
  inLightbox?: boolean;
  state?: MapState;
  on?: MapEvents;
}

const EXPAND =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const NONE: RouteMap = { apply: () => {}, remove: () => {} };

/**
 * The route of a post on swisstopo's map, in the place of the link to it
 * that lib/route.mjs leaves in a `.route-map`: the track, a dot for every
 * point of the facts that has a latitude and longitude, and every photo of
 * the gallery that knows where it was taken as a small round photo. It
 * shows the `state` it's given, and tells `on` what's done to it: moved,
 * switched, a photo clicked, the button under the zoom to enlarge it.
 * Leaflet only loads on a page with a route, in the browser.
 */
export async function routeMap(
  container: HTMLElement,
  {
    points = [],
    photos = [],
    labels,
    inLightbox = false,
    state,
    on = {},
  }: Pins,
): Promise<RouteMap> {
  const track = JSON.parse(container.dataset['track'] ?? '[]') as [
    number,
    number,
  ][];

  if (!track.length) return NONE;

  const [{ default: L }] = await waitForPromise(
    Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]),
  );

  // Gone from the page while Leaflet loaded
  if (!container.isConnected) return NONE;

  container.replaceChildren();

  // Not the wheel on the page, which scrolls past the map; a finger pans
  // it. Half zoom levels, so the route fits it closely.
  const map = L.map(container, {
    scrollWheelZoom: inLightbox,
    zoomSnap: 0.5,
    zoomDelta: 0.5,
  });

  map.attributionControl.setPrefix(false);
  L.tileLayer(TILES, {
    maxNativeZoom: 18,
    maxZoom: 19,
    attribution: ATTRIBUTION,
  }).addTo(map);

  const line = L.polyline(track, {
    className: 'route-line',
    interactive: false,
  }).addTo(map);
  const bounds = line.getBounds();
  const pointLayer = L.layerGroup().addTo(map);
  const photoLayer = L.layerGroup().addTo(map);
  const layers: Record<LayerName, Layer> = {
    track: line,
    photos: photoLayer,
    points: pointLayer,
  };

  for (const { name, altitude, latitude, longitude } of points) {
    if (latitude === undefined || longitude === undefined) continue;

    L.circleMarker([latitude, longitude], {
      className: 'route-point',
      radius: 6,
    })
      .bindTooltip(altitude === undefined ? name : `${name}, ${altitude} m`)
      .addTo(pointLayer);
    bounds.extend([latitude, longitude]);
  }

  const pins = new Map<number, ReturnType<typeof L.marker>>();

  // A photo's round pin, smaller on a phone, ringed while it's the one shown
  const size = window.matchMedia('(min-width: 640px)').matches ? 44 : 30;
  const photoIcon = (
    img: HTMLImageElement | null | undefined,
    shown: boolean,
  ) =>
    L.divIcon({
      className: shown ? 'route-photo is-shown' : 'route-photo',
      html: img ?? '',
      iconSize: [size, size],
    });

  photos.forEach(({ photo, caption, position }, index) => {
    if (!position) return;

    const img = document.createElement('img');

    img.src = photo.imageUrlFor(480, 'webp') ?? '';
    img.alt = '';

    const pin = L.marker(position, {
      icon: photoIcon(img, false),
      title: caption,
      alt: caption,
      riseOnHover: true,
    })
      .on('click', () => on.photo?.(index))
      .addTo(photoLayer);

    pins.set(index, pin);
    bounds.extend(position);
  });

  if (labels && on.enlarge && !inLightbox)
    enlargeButton(L, map, labels, on.enlarge);

  // A switch for each of what's on the map, when there's more than the track
  const pointCount = pointLayer.getLayers().length;

  if (labels && (pointCount || pins.size)) {
    const overlays: Record<string, Layer> = { [labels.track]: line };

    if (pins.size) overlays[labels.photos] = photoLayer;
    if (pointCount) overlays[labels.points] = pointLayer;

    L.control.layers(undefined, overlays, { collapsed: false }).addTo(map);
  }

  // While it shows what it's told, the map doesn't tell it back
  let applying = false;
  let ringed: number | undefined;

  const ring = (index: number | undefined) => {
    if (index === ringed) return;

    const before = ringed === undefined ? undefined : pins.get(ringed);
    const after = index === undefined ? undefined : pins.get(index);

    before?.setIcon(
      photoIcon(before.getElement()?.querySelector('img'), false),
    );
    before?.setZIndexOffset(0);
    after?.setIcon(photoIcon(after.getElement()?.querySelector('img'), true));
    after?.setZIndexOffset(1000);
    ringed = index;
  };

  const sameView = (center: [number, number], zoom: number) => {
    // A map without a view yet has no center to ask for
    if (!(map as unknown as { _loaded?: boolean })._loaded) return false;

    const here = map.getCenter();
    const close = (a: number, b: number) => Math.abs(a - b) < 2e-5;

    return (
      zoom === map.getZoom() &&
      close(here.lat, center[0]) &&
      close(here.lng, center[1])
    );
  };

  const apply = ({ center, zoom, shown, hidden }: MapState) => {
    applying = true;

    try {
      if (center && zoom !== undefined) {
        if (!sameView(center, zoom))
          map.setView(center, zoom, { animate: false });
      } else {
        map.fitBounds(bounds, { padding: [24, 24], animate: false });
      }

      for (const name of LAYER_NAMES) {
        if (hidden.includes(name)) map.removeLayer(layers[name]);
        else if (!map.hasLayer(layers[name])) layers[name].addTo(map);
      }

      ring(shown);
    } finally {
      applying = false;
    }
  };

  apply(state ?? { hidden: [] });

  const moved = () => {
    if (applying) return;

    const { lat, lng } = map.getCenter();

    on.moved?.([lat, lng], map.getZoom());
  };

  const switched = (event: { layer: Layer }) => {
    if (applying || !Object.values(layers).includes(event.layer)) return;

    on.switched?.(LAYER_NAMES.filter((name) => !map.hasLayer(layers[name])));
  };

  map.on('moveend', moved);
  map.on('layeradd layerremove', switched);

  return {
    apply,
    remove: () => {
      // Taking the map away takes its layers away: not a switch
      map.off('moveend', moved);
      map.off('layeradd layerremove', switched);
      map.remove();
    },
  };
}

/** A button under the zoom that opens the map in its lightbox */
function enlargeButton(
  L: typeof import('leaflet'),
  map: import('leaflet').Map,
  labels: LayerLabels,
  enlarge: () => void,
) {
  const Control = L.Control.extend({
    onAdd: () => {
      const bar = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
      const button = L.DomUtil.create('a', 'route-enlarge', bar);

      button.href = '#';
      button.setAttribute('role', 'button');
      button.title = labels.enlarge;
      button.setAttribute('aria-label', labels.enlarge);
      button.innerHTML = EXPAND;
      L.DomEvent.disableClickPropagation(button);
      L.DomEvent.on(button, 'click', (event) => {
        L.DomEvent.preventDefault(event);
        enlarge();
      });

      return bar;
    },
  });

  new Control({ position: 'topleft' }).addTo(map);
}
