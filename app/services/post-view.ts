import Service, { service } from '@ember/service';

import type RouterService from '@ember/routing/router-service';
import type { LayerName, MapState } from '../content/route-map.ts';

const LAYERS: LayerName[] = ['track', 'photos', 'points'];

/** How close the map comes to a photo shown on it */
const PHOTO_ZOOM = 15;

// About a metre, and the map's half zoom levels
const round = (value: number) => Math.round(value * 1e5) / 1e5;

/** Where a map is, as the address writes it */
const at = ([lat, lng]: [number, number], zoom: number) => ({
  lat: String(round(lat)),
  lng: String(round(lng)),
  zoom: String(zoom),
});

type Params = Partial<
  Record<
    'lat' | 'lng' | 'zoom' | 'pitch' | 'bearing' | 'photo' | 'view' | 'hide',
    string | null
  >
>;

/**
 * What a post shows of its route's map and its photos, kept in the post's
 * address (app/controllers/post.ts), so a link or a reload shows the same:
 * where the map is and how close, the photo picked (ringed on the map),
 * which lightbox is open and which of the map's switches are off. The map
 * on the page and the one in its lightbox both read it and write it, so
 * they are always the same. Opening a lightbox is a step back can undo;
 * moving the map, paging through photos and closing aren't.
 */
export default class PostViewService extends Service {
  @service declare router: RouterService;

  get #params(): Params {
    return this.router.currentRoute?.queryParams ?? {};
  }

  /** The open lightbox, if any */
  get view(): 'photo' | 'map' | undefined {
    const { view } = this.#params;

    return view === 'photo' || view === 'map' ? view : undefined;
  }

  /** The photo picked, by its place in the gallery (from 0) */
  get photo(): number | undefined {
    const n = Number(this.#params.photo);

    return Number.isInteger(n) && n > 0 ? n - 1 : undefined;
  }

  /** What the maps of the post show */
  get mapState(): MapState {
    const { lat: latParam, lng: lngParam, zoom: zoomParam } = this.#params;
    const [lat, lon, zoom] = [latParam, lngParam, zoomParam].map((v) =>
      v ? Number(v) : NaN,
    );
    const hidden = (this.#params.hide ?? '')
      .split(',')
      .filter((name): name is LayerName => LAYERS.includes(name as LayerName));
    const view =
      Number.isFinite(lat) && Number.isFinite(lon) && Number.isFinite(zoom)
        ? { center: [lat!, lon!] as [number, number], zoom: zoom! }
        : undefined;

    const angle = (value: string | null | undefined) =>
      value && Number.isFinite(Number(value)) ? Number(value) : undefined;

    return {
      ...view,
      shown: this.photo,
      hidden,
      pitch: angle(this.#params.pitch),
      bearing: angle(this.#params.bearing),
    };
  }

  #replace(params: Params) {
    void this.router.replaceWith({ queryParams: params });
  }

  /** A lightbox opened is a step back can undo; one taking another's place isn't */
  #open(params: Params) {
    if (this.view) this.#replace(params);
    else void this.router.transitionTo({ queryParams: params });
  }

  /** A photo in the lightbox, picked on the map too */
  showPhoto = (index: number) => {
    this.#open({ view: 'photo', photo: String(index + 1) });
  };

  /**
   * The map in its lightbox; at a photo (where it was taken), that photo
   * picked, its photos switched on and the map close to it
   */
  showMap = (photo?: { index: number; position: [number, number] | null }) => {
    const { zoom = 0, hidden } = this.mapState;

    this.#open({
      view: 'map',
      ...(photo && { photo: String(photo.index + 1) }),
      ...(photo?.position && {
        ...at(photo.position, Math.max(zoom, PHOTO_ZOOM)),
        hide: hidden.filter((name) => name !== 'photos').join(',') || null,
      }),
    });
  };

  close = () => {
    this.#replace({ view: null });
  };

  /** Where a map was moved to */
  moved = (
    center: [number, number],
    zoom: number,
    angle: { pitch: number; bearing: number },
  ) => {
    const params: Params = {
      ...at(center, zoom),
      // Flat and north up, as without them
      pitch: angle.pitch ? String(angle.pitch) : null,
      bearing: angle.bearing ? String(angle.bearing) : null,
    };
    const now = this.#params;

    if (
      (Object.keys(params) as (keyof Params)[]).some(
        (key) => params[key] !== now[key],
      )
    ) {
      this.#replace(params);
    }
  };

  /** Which of a map's switches are off */
  switched = (hidden: LayerName[]) => {
    this.#replace({ hide: hidden.join(',') || null });
  };
}
