import { waitForPromise } from '@ember/test-waiters';

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

/** Asked of the post's gallery (app/components/gallery.gts) by a photo's pin */
export const SHOW_PHOTO = 'cowtent:show-photo';

export interface Pins {
  points?: Point[];
  photos?: GalleryPhoto[];
}

/**
 * The route of a post on swisstopo's map, in the place of the link to it
 * that lib/route.mjs leaves in a `.route-map`: the track, a dot for every
 * point of the facts that has a latitude and longitude, and every photo of the gallery
 * that knows where it was taken as a small round photo, which opens it in
 * the gallery. Leaflet only loads on a page with a route, in the browser.
 * Gives back what takes the map away again.
 */
export async function routeMap(
  container: HTMLElement,
  { points = [], photos = [] }: Pins,
): Promise<() => void> {
  const track = JSON.parse(container.dataset['track'] ?? '[]') as [
    number,
    number,
  ][];

  if (!track.length) return () => {};

  const [{ default: L }] = await waitForPromise(
    Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]),
  );

  // Gone from the page while Leaflet loaded
  if (!container.isConnected) return () => {};

  container.replaceChildren();

  // Not the wheel: the page scrolls past the map; a finger pans it. Half
  // zoom levels, so the route fits it closely.
  const map = L.map(container, {
    scrollWheelZoom: false,
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

  for (const { name, altitude, latitude, longitude } of points) {
    if (latitude === undefined || longitude === undefined) continue;

    L.circleMarker([latitude, longitude], {
      className: 'route-point',
      radius: 6,
    })
      .bindTooltip(altitude === undefined ? name : `${name}, ${altitude} m`)
      .addTo(map);
    bounds.extend([latitude, longitude]);
  }

  photos.forEach(({ photo, caption, position }, index) => {
    if (!position) return;

    const img = document.createElement('img');

    img.src = photo.imageUrlFor(480, 'webp') ?? '';
    img.alt = '';

    L.marker(position, {
      icon: L.divIcon({
        className: 'route-photo',
        html: img,
        iconSize: [44, 44],
      }),
      title: caption,
      alt: caption,
      riseOnHover: true,
    })
      .on('click', () =>
        window.dispatchEvent(new CustomEvent(SHOW_PHOTO, { detail: index })),
      )
      .addTo(map);
    bounds.extend(position);
  });

  map.fitBounds(bounds, { padding: [24, 24] });

  return () => map.remove();
}
