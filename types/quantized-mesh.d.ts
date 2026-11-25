// The 3D map's terrain (app/content/route-map-3d.ts): two packages without types

declare module '@here/quantized-mesh-decoder' {
  const decode: (buffer: ArrayBuffer) => unknown;

  export default decode;
}

declare module 'maplibre-gl-3dtiles-terrain' {
  interface Bounds {
    west: number;
    south: number;
    east: number;
    north: number;
  }

  export function loadQuantizedMeshDataset(
    layerJsonUrl: string,
    options?: {
      boundsOverride?: Bounds;
      maxZoom?: number;
      attribution?: string;
    },
  ): Promise<unknown>;

  export function registerQuantizedMeshTerrain(
    maplibregl: unknown,
    options: { dataset: unknown; decode: (buffer: ArrayBuffer) => unknown },
  ): { protocol: string; sourceSpec: unknown; unregister: () => void };
}
