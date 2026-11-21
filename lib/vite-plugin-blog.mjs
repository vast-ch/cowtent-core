import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join, relative, sep } from 'node:path';

import { Feed } from 'feed';

import { idOf, isPublished, readAll } from './content.mjs';
import { factsTable, readFacts } from './facts.mjs';
import { galleryOf, isGalleryPhoto } from './gallery.mjs';
import { tagName } from './language.mjs';
import {
  isAsset,
  isPhoto,
  readMeta,
  renderFeed,
  renderPage,
} from './markdown.mjs';

/**
 * Lets the app import the Markdown under content/:
 *
 *   content/posts/a/index.md?meta → the front matter and the excerpt
 *   content/posts/a/index.md      → the rendered HTML
 *
 * The two are separate so that the front page does not download every post.
 *
 * Files the Markdown points to with a relative path become imports, so Vite
 * fingerprints and copies them. Photos (`![](./01.jpg)`, `image: ./cover.jpg`)
 * are imported with `?responsive`: @responsive-image/vite-plugin resizes them,
 * `<img>`s in the HTML get a srcset (app/content/photo.ts), and the cover is
 * the module's `cover` export, for <ResponsiveImage>. The photos in a post's
 * gallery folder (lib/gallery.mjs) are the `gallery` export of its HTML
 * module, so they load with it.
 *
 * Drafts (`published: false`) are empty modules in a build, so neither their
 * text nor their photos end up in dist/.
 *
 * Also writes /rss.xml.
 */
export const SITE_MODULE = 'virtual:blog-site';
const RESOLVED_SITE_MODULE = '\0' + SITE_MODULE;
export const COVER_MODULE = 'virtual:blog-cover';

/**
 * `content` is the folder of the blog (absolute), `site` its settings
 * (lib/site.mjs), `language` its words (lib/language.mjs), `base` where it
 * starts on its host (/ or /blog/). The app imports the settings and the
 * words from `virtual:blog-site`.
 */
export function blog({ site, content, language, base }) {
  // A page of the site from its path in the app: /blog/<id> on the site,
  // the whole URL in the feed
  const pageLink = (path) => `${base}${path}`;
  const feedLink = (path) => `${site.host}/${path}`;

  let root;
  let command;
  // content/posts/a/01.jpg → the reference of its 960px JPEG, for the feed
  const feedPhotos = new Map();

  function inContent(path) {
    return (
      path.startsWith(content + sep) &&
      !path.slice(content.length).includes(`${sep}node_modules${sep}`)
    );
  }

  function isContent(path) {
    return path.endsWith('.md') && inContent(path);
  }

  return {
    name: 'blog',
    enforce: 'pre',

    configResolved(config) {
      root = config.root;
      command = config.command;
    },

    // A photo added to or taken out of a gallery folder changes the post
    configureServer(server) {
      server.watcher.add(content);
      server.watcher.on('all', (event, file) => {
        if (!['add', 'unlink'].includes(event) || !isGalleryPhoto(file)) return;

        const post = join(dirname(dirname(file)), 'index.md');

        for (const module of server.moduleGraph.getModulesByFile(post) ?? [])
          server.moduleGraph.invalidateModule(module);

        server.ws.send({ type: 'full-reload' });
      });
    },

    resolveId(id) {
      if (id === SITE_MODULE) return RESOLVED_SITE_MODULE;
      // The sidebar photo, resized like any other
      if (id === COVER_MODULE)
        return `${join(content, 'cover.jpg')}?responsive`;
    },

    // The blog's colour and name in every page, before the app boots
    transformIndexHtml(html) {
      return html
        .replace('__BLOG_TITLE__', escapeHtml(site.title))
        .replace('__BLOG_COLOUR__', site.colour)
        .replace('__BLOG_BASE__', base)
        .replace('__BLOG_THEME__', site.theme)
        .replace('<!-- BLOG_THEME_SWITCHER -->', themeScript(site, base));
    },

    async load(id) {
      if (id === RESOLVED_SITE_MODULE) {
        return {
          code: [
            `export default ${JSON.stringify(site)};`,
            `export const language = ${JSON.stringify({ locale: language.locale, messages: language.messages })};`,
          ].join('\n'),
          moduleType: 'js',
        };
      }

      const [path, query] = id.split('?');

      if (!isContent(path)) return;

      this.addWatchFile(path);

      const source = await readFile(path, 'utf8');

      if (command === 'build' && !isPublished(readMeta(source), path)) {
        return {
          code:
            query === 'meta'
              ? 'export default null;\nexport const cover = undefined;'
              : "export default '';\nexport const gallery = [];",
          moduleType: 'js',
        };
      }

      const assets = [];
      const photos = [];
      const imports = () => [
        ...assets.map(
          (url, index) => `import asset${index} from ${JSON.stringify(url)};`,
        ),
        ...photos.map(
          (url, index) =>
            `import photo${index} from ${JSON.stringify(`${url}?responsive`)};`,
        ),
      ];

      if (query === 'meta') {
        const meta = { id: idOf(path), ...readMeta(source) };

        if (meta.facts !== undefined)
          meta.facts = readFacts(meta.facts, path, language, pageLink);

        if (isPhoto(meta.image)) photos.push(meta.image);

        return {
          code: [
            ...imports(),
            `export default ${JSON.stringify(meta)};`,
            `export const cover = ${photos.length ? 'photo0' : 'undefined'};`,
          ].join('\n'),
          moduleType: 'js',
        };
      }

      // URLs are only known once Vite has bundled the files,
      // so the module swaps placeholders for the imports at runtime.
      const resolveAsset = (url) => `__ASSET_${assets.push(url) - 1}__`;
      const html = await renderPage(source, {
        resolveAsset,
        resolveImage: (url) => `__PHOTO_${photos.push(url) - 1}__`,
        link: pageLink,
        language,
        readAsset: (url) => readFileSync(join(dirname(path), url), 'utf8'),
        // For swisstopo, which loads a route from the blog (lib/route.mjs)
        absolute: (url) => new URL(site.host).origin + resolveAsset(url),
      });
      const gallery = galleryOf(dirname(path)).map(
        ({ src, caption }) =>
          `{ photo: photo${photos.push(src) - 1}, caption: ${JSON.stringify(caption)} }`,
      );

      return {
        code: [
          `import { photoAttributes } from '/app/content/photo.ts';`,
          ...imports(),
          `const assets = [${assets.map((_, index) => `asset${index}`).join(', ')}];`,
          `const photos = [${photos.map((_, index) => `photo${index}`).join(', ')}];`,
          `export default ${JSON.stringify(html)}`,
          `  .replace(/src="__PHOTO_(\\d+)__"/g, (_, index) => photoAttributes(photos[index]))`,
          `  .replace(/__ASSET_(\\d+)__/g, (_, index) => assets[index]);`,
          `export const gallery = [${gallery.join(', ')}];`,
        ].join('\n'),
        moduleType: 'js',
      };
    },

    // @responsive-image/vite-plugin emits the resized files; remember which
    // one the feed should use. Its URLs are only known in generateBundle.
    transform: {
      order: 'post',
      handler(code, id) {
        const [path, query] = id.split('?');

        if (query !== 'responsive' || !inContent(path)) return;

        const match = code.match(
          /"?url"?:\s*"__VITE_ASSET__([\w$-]+)__"\s*,\s*"?width"?:\s*960\s*,\s*"?format"?:\s*["']jpeg["']/,
        );

        if (match)
          feedPhotos.set(relative(root, path).split(sep).join('/'), match[1]);
      },
    },

    async generateBundle(_options, bundle) {
      if (this.environment.name !== 'client') return;

      // content/posts/a/route.gpx → assets/route-Bx3k.gpx
      // content/posts/a/01.jpg → assets/01-960w-Bx3k.jpg
      const emitted = new Map();

      for (const output of Object.values(bundle)) {
        for (const original of output.originalFileNames ?? []) {
          emitted.set(original, output.fileName);
        }
      }

      for (const [original, reference] of feedPhotos) {
        emitted.set(original, this.getFileName(reference));
      }

      this.emitFile({
        type: 'asset',
        fileName: 'rss.xml',
        source: await renderRss(
          root,
          content,
          site,
          language,
          emitted,
          feedLink,
        ),
      });

      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: 'User-agent: *\nDisallow:\n',
      });
      this.emitFile({
        type: 'asset',
        fileName: 'favicon.svg',
        source: readFileSync(faviconOf(content)),
      });
    },
  };
}

/**
 * The blog's own favicon.svg, or the default one.
 */
export function faviconOf(content) {
  const own = join(content, 'favicon.svg');

  return existsSync(own) ? own : join(import.meta.dirname, 'favicon.svg');
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function renderRss(root, content, site, language, emitted, link) {
  const posts = readAll(content, 'posts').sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );

  const absolute = (post, url) => {
    const original = relative(root, join(dirname(post.path), url));
    const fileName = emitted.get(original.split(sep).join('/'));

    return fileName ? `${site.host}/${fileName}` : undefined;
  };

  const feed = new Feed({
    title: site.title,
    description: site.description,
    id: site.host,
    link: site.host,
    copyright: site.title,
    updated: new Date(posts.at(0).date),
    feedLinks: { rss: `${site.host}/rss.xml` },
  });

  for (const post of posts) {
    feed.addItem({
      title: post.title,
      link: `${site.host}/${post.id}`,
      date: new Date(post.date),
      description: post.excerpt,
      content:
        factsTable(readFacts(post.facts, post.path, language, link)) +
        (await renderFeed(post.source, {
          resolveAsset: (url) => absolute(post, url),
          link,
          language,
          readAsset: (url) =>
            readFileSync(join(dirname(post.path), url), 'utf8'),
        })) +
        feedGallery(
          galleryOf(dirname(post.path)),
          (url) => absolute(post, url),
          language,
        ),
      category: (post.tags ?? []).map((tag) => ({
        name: tagName(language, tag),
      })),
      image: isAsset(post.image) ? absolute(post, post.image) : undefined,
    });
  }

  return feed.rss2();
}

function feedGallery(gallery, absolute, language) {
  const escape = (text) =>
    text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const photos = gallery.flatMap(({ src, caption }) => {
    const url = absolute(src);

    return url ? [`<p><img src="${url}" alt="${escape(caption)}"></p>`] : [];
  });

  return photos.length
    ? `<h2>${language.t('post.gallery.heading')}</h2>${photos.join('')}`
    : '';
}

/**
 * With the theme switcher on, the theme a visitor picked
 * (app/components/theme-switcher.gts), set before the page is drawn so that
 * it doesn't flash in the blog's own theme first
 */
export function themeScript(site, base) {
  if (!site.themeSwitcher) return '';

  const themes = JSON.stringify(site.themes);
  const key = JSON.stringify(themeKey(base));

  return `<script>try{var t=localStorage.getItem(${key});if(${themes}.indexOf(t)>-1)document.documentElement.dataset.theme=t}catch(e){}</script>`;
}

// One key per blog: several can share a host, like username.github.io
export function themeKey(base) {
  return `cowtent-theme:${base}`;
}
