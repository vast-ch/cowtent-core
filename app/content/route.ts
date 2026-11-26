import { byFolder } from './by-folder.ts';

export interface PostRoute {
  /** [lat, lon, elevation?] of the track, for the map (lib/route.mjs) */
  track: [number, number, number?][];
  /** The file's URL, to download it */
  gpx: string;
  /** Where the route is on openstreetmap.org */
  map: string;
}

/**
 * A post's routes, route.gpx or 01 - route.gpx, 02 - route.gpx, …
 * (lib/route.mjs), an export of its HTML module like the gallery
 * (app/content/gallery.ts)
 */
const ROUTES = byFolder(
  import.meta.glob<PostRoute[]>('@content/posts/*/index.md', {
    import: 'routes',
  }),
);

export async function routesOf(id: string): Promise<PostRoute[]> {
  return (await ROUTES.get(id)?.()) ?? [];
}
