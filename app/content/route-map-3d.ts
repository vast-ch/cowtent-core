import { ATTRIBUTION } from './route-map.ts';

/**
 * swisstopo's terrain (swissALTI3D and the like) as Cesium's quantized
 * mesh, open and without a key; maplibre-gl-3dtiles-terrain makes it the
 * elevation MapLibre stands a tilted map on (app/content/route-map.ts)
 */
const TERRAIN = 'https://3d.geo.admin.ch/ch.swisstopo.terrain.3d/v1/layer.json';
// Switzerland and its borders, where the terrain has tiles
const SWITZERLAND = { west: 5.6, south: 45.5, east: 11.0, north: 48.2 };
// Deeper levels are finer than the 256 px tiles MapLibre is given
const TERRAIN_ZOOM = 16;

let source: Promise<Record<string, unknown>> | undefined;

/**
 * The terrain as a MapLibre source, loaded the first time a map is
 * tilted, its protocol registered once for every map of the page
 */
export function terrainSource(
  maplibregl: typeof import('maplibre-gl'),
): Promise<Record<string, unknown>> {
  source ??= (async () => {
    const [plugin, { default: decode }] = await Promise.all([
      import('maplibre-gl-3dtiles-terrain'),
      import('@here/quantized-mesh-decoder'),
    ]);
    const dataset = await plugin.loadQuantizedMeshDataset(TERRAIN, {
      attribution: ATTRIBUTION,
      boundsOverride: SWITZERLAND,
      maxZoom: TERRAIN_ZOOM,
    });

    return plugin.registerQuantizedMeshTerrain(maplibregl, { dataset, decode })
      .sourceSpec as Record<string, unknown>;
  })();

  return source;
}
