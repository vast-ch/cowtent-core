import { globSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

import { readMeta } from './markdown.mjs';

/**
 * Everything the site shows is Markdown under content/ (tests/fixtures/content/
 * in the test build, vite.config.mjs):
 *
 *   content/posts/<id>/index.md    a post, with its photos next to it
 *   content/pages/<id>/index.md    a standalone page (about me…)
 *
 * The id is the folder name (or the file name), and is the URL slug.
 *
 * A file with `published: false` is a draft: the dev server shows it while
 * I write it, the build leaves it out (lib/vite-plugin-blog.mjs).
 */
export const COLLECTIONS = {
  posts: 'posts/*/index.md',
  pages: 'pages/*/index.md',
};

export function idOf(path) {
  const name = basename(path, '.md');

  return name === 'index' ? basename(dirname(path)) : name;
}

export function isPublished(meta, path) {
  if (meta.published === undefined) return true;
  if (typeof meta.published !== 'boolean') {
    throw new Error(`${path}: published must be true or false`);
  }

  return meta.published;
}

/**
 * The published files of a collection, or all of them with `drafts`.
 */
export function readAll(dir, collection, { drafts = false } = {}) {
  return globSync(COLLECTIONS[collection], { cwd: dir })
    .map((path) => {
      const source = readFileSync(join(dir, path), 'utf8');

      return {
        id: idOf(path),
        path: join(dir, path),
        source,
        ...readMeta(source),
      };
    })
    .filter((entry) => drafts || isPublished(entry, entry.path));
}

/**
 * Every URL that gets a prerendered HTML file, without the leading slash
 * (the format vite-ember-ssr expects).
 */
export function listRoutes(content) {
  const posts = readAll(content, 'posts');

  return [
    'index',
    ...posts.map((post) => post.id),
    ...readAll(content, 'pages').map((page) => `page/${page.id}`),
    // Any other URL (app/router.ts), dist/404.html for GitHub Pages
    '404',
  ];
}
