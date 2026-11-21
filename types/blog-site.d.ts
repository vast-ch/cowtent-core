// The blog's site.yaml, read at build time (lib/site.mjs, lib/vite-plugin-blog.mjs)
declare module 'virtual:blog-site' {
  const site: {
    title: string;
    shortTitle: string;
    description: string;
    owner: string;
    host: string;
    base: string;
    email: string;
    colour: string;
    about?: string;
    navigation: { label: string; route: string; id?: string }[];
    language: string;
    theme: string;
    themes: string[];
    themeSwitcher: boolean;
  };
  export default site;

  // The core's languages/<language>.yaml, with the blog's own on top
  // (lib/language.mjs), flattened: post.facts.heading
  export const language: { locale: string; messages: Record<string, string> };
}

// The blog's cover.jpg, the sidebar photo
declare module 'virtual:blog-cover' {
  import type { ImageData } from '@responsive-image/core';

  const image: ImageData;
  export default image;
}
