import { byFolder } from './by-folder.ts';

export interface PostRoute {
  /** [lat, lon] of the track, for the map (lib/route.mjs) */
  track: [number, number][];
  /** The file's URL, to download it */
  gpx: string;
  /** The route on map.geo.admin.ch */
  map: string;
}

/**
 * A post's route.gpx (lib/route.mjs), an export of its HTML module like
 * the gallery (app/content/gallery.ts)
 */
const ROUTES = byFolder(
  import.meta.glob<PostRoute | undefined>('@content/posts/*/index.md', {
    import: 'route',
  }),
);

export async function routeOf(id: string): Promise<PostRoute | undefined> {
  return await ROUTES.get(id)?.();
}
