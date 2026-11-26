import type { RasterDEMSourceSpecification } from 'maplibre-gl';

/**
 * The relief a tilted map stands on (app/content/route-map.ts): the AWS
 * Terrain Tiles (Mapzen's, in their "terrarium" encoding), the whole world,
 * open and without a key; the same as winds.mobi's 3D. MapLibre reads them
 * itself.
 */
export const TERRAIN_SOURCE: RasterDEMSourceSpecification = {
  type: 'raster-dem',
  attribution: '© Mapzen terrain tiles',
  encoding: 'terrarium',
  maxzoom: 15,
  tiles: [
    'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
  ],
  tileSize: 256,
};
