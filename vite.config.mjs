import { responsiveImage } from '@responsive-image/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { existsSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import { extensions, ember } from '@embroider/vite';
import { babel } from '@rollup/plugin-babel';
import { emberSsg } from 'vite-ember-ssr/vite-plugin';
import { VitePWA } from 'vite-plugin-pwa';

import { listRoutes } from './lib/content.mjs';
import { readLanguage } from './lib/language.mjs';
import { readSite } from './lib/site.mjs';
import { prepareForHosts } from './lib/host.mjs';
import { blog, faviconOf } from './lib/vite-plugin-blog.mjs';

// The test build runs in the browser only, nothing to prerender
const isTest = process.env.EMBER_ENV === 'test';

// The blog: a folder with site.yaml, posts/ and pages/ (bin/blog.mjs passes
// the one it runs in). The tests run against a few dummy posts that only
// change with the tests. The app imports the Markdown as @content/…
const content = isTest
  ? join(import.meta.dirname, 'tests/fixtures/content')
  : resolve(process.env.BLOG_CONTENT ?? 'content');
const site = readSite(content);
const language = readLanguage(content, site.language);
// Where the site starts on its host, from its address (site.yaml's url:,
// or SITE_URL): /, or /cowtent-starter/ on GitHub Pages. The tests run at /.
const base = isTest ? '/' : site.base;
const outDir = resolve(process.env.BLOG_OUT ?? 'dist');
const publicDir = join(content, 'public');
let written = false;

// The app icons, from the blog's favicon.svg (on a white tile, so it
// doesn't disappear on a dark home screen or dock). The tile has its margin
// already: a little more keeps it in a maskable icon's safe circle.
const icons = {
  transparent: { sizes: [64, 192, 512], favicons: [[48, 'favicon.ico']] },
  maskable: { sizes: [512], padding: 0.1 },
  apple: { sizes: [180], padding: 0.1 },
};

export default defineConfig({
  root: import.meta.dirname,
  base,
  publicDir: existsSync(publicDir) ? publicDir : false,
  // Route files next to a post, copied as they are (lib/markdown.mjs)
  assetsInclude: ['**/*.gpx', '**/*.kml'],
  build: {
    outDir,
    emptyOutDir: true,
    // A route is a file to download (lib/route.mjs): never inline one
    assetsInlineLimit: (file) => (/\.gpx$/i.test(file) ? false : undefined),
    // No spaces in a file's address: "01 - route.gpx" is 01-route-Bx3k.gpx
    rolldownOptions: {
      output: {
        assetFileNames: ({ names }) =>
          `assets/${(names[0] ?? 'asset')
            .replace(/\.[^.]+$/, '')
            .replace(/[\s-]+/g, '-')}-[hash][extname]`,
      },
    },
  },
  server: { fs: { allow: [import.meta.dirname, content] } },
  resolve: {
    alias: { '@content': content },
    // The modules of the blog's photos import it, from the blog's folder,
    // which has no node_modules of its own
    dedupe: ['@responsive-image/core'],
  },
  plugins: [
    blog({ site, content, language, base }),
    // Every photo imported with ?responsive, in the widths app/content/photo.ts expects
    responsiveImage({ w: [480, 960, 1440], format: ['webp', 'jpeg'] }),
    ember(),
    babel({
      babelHelpers: 'runtime',
      extensions,
    }),
    packageSources(),
    tailwindcss(),
    // The Content-Security-Policy in every page and _headers (lib/host.mjs):
    // after emberSsg has prerendered the pages, before VitePWA precaches them
    !isTest && {
      name: 'host-files',
      apply: 'build',
      closeBundle: {
        order: 'post',
        sequential: true,
        handler() {
          if (written) prepareForHosts(outDir);
        },
      },
    },
    // Installable on a phone: the manifest, the icons with their <link>s in
    // the head, and a service worker that keeps the site readable offline
    !isTest &&
      VitePWA({
        registerType: 'autoUpdate',
        // app/service-worker.ts registers it, and keeps an installed app
        // up to date
        injectRegister: false,
        // After emberSsg's closeBundle, so that the prerendered pages are
        // there to precache
        integration: { closeBundleOrder: 'post' },
        pwaAssets: {
          image: faviconOf(content),
          // The icons go next to the pages, wherever favicon.svg is
          integration: { publicDir: dirname(faviconOf(content)), outDir },
          preset: icons,
          overrideManifestIcons: true,
        },
        manifest: {
          id: base,
          name: site.title,
          short_name: site.shortTitle,
          description: site.description,
          lang: language.locale,
          start_url: base,
          scope: base,
          display: 'standalone',
          background_color: '#ffffff',
          theme_color: '#ffffff',
        },
        workbox: {
          // A new deploy takes over the open pages at once, which
          // app/service-worker.ts then reloads
          skipWaiting: true,
          clientsClaim: true,
          // The app and the prerendered pages (not the fonts of Frontile's
          // theme, which the site doesn't use); the photos only once seen,
          // there are hundreds of them in three widths
          globPatterns: ['**/*.{js,css,html,svg,ico,png}'],
          globIgnores: ['gpx/**'],
          // Every page is prerendered: a page that isn't is a 404, not the app
          navigateFallback: null,
          runtimeCaching: [
            {
              urlPattern: ({ request, sameOrigin }) =>
                sameOrigin && request.destination === 'image',
              handler: 'CacheFirst',
              options: {
                cacheName: 'photos',
                expiration: { maxEntries: 300 },
              },
            },
          ],
        },
      }),
    // Only in `vite build`: its closeBundle also runs when a dev server
    // stops or restarts, and would then prerender over dist/
    !isTest &&
      emberSsg({
        routes: listRoutes(content),
        // Relative to the root, as the plugin expects
        outDir: relative(import.meta.dirname, outDir),
      }).map((plugin) => ({
        ...plugin,
        apply: 'build',
        // Only once the bundle is written: its closeBundle also runs after a
        // failed build, and its error (no index.html) would hide the real one
        writeBundle() {
          written = true;
        },
        closeBundle(...args) {
          if (written) return plugin.closeBundle?.apply(this, args);
        },
      })),
    // GitHub Pages serves 404.html for any URL without a file
    !isTest && {
      name: 'not-found-page',
      apply: 'build',
      closeBundle: {
        order: 'post',
        sequential: true,
        handler() {
          const page = join(outDir, '404/index.html');

          if (!existsSync(page)) return;
          renameSync(page, join(outDir, '404.html'));
          rmSync(join(outDir, '404'), { recursive: true });
        },
      },
    },
  ],
});

/**
 * `@source "package:frontile"` in a stylesheet: the folder Node resolves the
 * package to, so Tailwind finds its classes wherever the install put it. In
 * a blog, cowtent-core is itself a dependency and its packages sit next to
 * it, not in a node_modules of its own.
 */
function packageSources() {
  const SOURCE = /@source "package:([^"]+)"/g;

  return {
    name: 'package-sources',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('.css') || !code.includes('package:')) return;

      return code.replace(
        SOURCE,
        (_, name) => `@source ${JSON.stringify(packageDir(name))}`,
      );
    },
  };
}

// The folder of a package: up from its entry to its package.json
function packageDir(name) {
  let dir = dirname(fileURLToPath(import.meta.resolve(name)));

  while (
    !existsSync(join(dir, 'package.json')) ||
    JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).name !== name
  ) {
    if (dir === dirname(dir)) throw new Error(`No folder for ${name}`);
    dir = dirname(dir);
  }

  return dir;
}
