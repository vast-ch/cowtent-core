// Images imported with ?responsive, resized by @responsive-image/vite-plugin
declare module '*?responsive' {
  import type { ImageData } from '@responsive-image/core';

  const image: ImageData;
  export default image;
}
