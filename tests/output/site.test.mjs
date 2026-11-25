// Checks the production build of a blog (cowtent build): every post and
// page was prerendered with its content, and the feed exists.
//
// Runs at the end of cowtent build, against the blog it built.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { readAll } from '../../lib/content.mjs';
import { galleryOf } from '../../lib/gallery.mjs';
import { readSite } from '../../lib/site.mjs';

const root = resolve(process.env.BLOG_CONTENT ?? '.');
// Where `cowtent build` writes it (bin/cowtent.mjs): dist where it was run
const dist = resolve(process.env.BLOG_OUT ?? 'dist');
const site = readSite(root);

const escape = (text) =>
  String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function page(url) {
  const file = join(dist, url, 'index.html');

  assert.ok(existsSync(file), `${url} was not prerendered`);

  return readFileSync(file, 'utf8');
}

function titleOf(html) {
  return html.match(/<title>([^<]*)<\/title>/)?.[1];
}

const posts = readAll(root, 'posts');

test('the index lists every post', () => {
  const html = page('/');

  assert.equal(titleOf(html), escape(site.title));

  for (const post of posts) {
    assert.match(html, new RegExp(`data-test-post="${post.id}"`), post.id);
  }
});

for (const post of posts) {
  test(`post ${post.id}`, () => {
    const html = page(`/${post.id}`);

    assert.equal(titleOf(html), escape(`${post.title} - ${site.title}`));
    assert.match(html, /class="prose/);
    // Photos are resized (lib/vite-plugin-blog.mjs, app/content/photo.ts)
    assert.doesNotMatch(html, /<img[^>]*src="\.\//, 'unbundled photo');
    if (/<img[^>]*loading="lazy"/.test(html)) {
      assert.match(html, /srcset="[^"]*480w/, 'photos without srcset');
    }
    assert.match(html, /<meta property="og:title"/);

    // The facts: front matter, as a table before the story
    assert.equal(
      /data-test-facts/.test(html),
      post.facts !== undefined,
      'facts table',
    );

    // The gallery folder, each photo a link to its largest JPEG
    // (1440 px, or less for a smaller original)
    const gallery = galleryOf(dirname(post.path));
    const links = html.match(/<a [^>]*data-test-gallery-photo[^>]*>/g) ?? [];

    assert.equal(links.length, gallery.length, 'gallery photos');
    for (const link of links) {
      assert.match(
        link,
        new RegExp(`href="${site.base}assets/[^"]+-\\d+w-[^"]+\\.jpg"`),
      );
    }

    assert.doesNotMatch(html, /href="\/author\//, 'no author byline');
  });
}

test('drafts are left out', () => {
  const rss = readFileSync(join(dist, 'rss.xml'), 'utf8');

  for (const draft of readAll(root, 'posts', { drafts: true }).filter(
    (post) => post.published === false,
  )) {
    assert.ok(!existsSync(join(dist, draft.id)), `${draft.id} prerendered`);
    assert.ok(!rss.includes(`/${draft.id}<`), `${draft.id} in the feed`);
  }
});

for (const { id, title } of readAll(root, 'pages')) {
  test(`page ${id}`, () => {
    assert.equal(
      titleOf(page(`/page/${id}`)),
      escape(`${title} - ${site.title}`),
    );
  });
}

test('the RSS feed has every post, with absolute image URLs', () => {
  const rss = readFileSync(join(dist, 'rss.xml'), 'utf8');

  for (const post of posts)
    assert.ok(rss.includes(`/${post.id}</link>`), post.id);

  assert.doesNotMatch(rss, /src="\.\//, 'relative image URLs in the feed');
  assert.doesNotMatch(rss, /__(ASSET|PHOTO)_\d+__/);
  assert.match(rss, /<enclosure url="https?:\/\/[^"]+-960w-[^"]+\.jpg"/);
});

test('every link and file of the site is under its base path', () => {
  // On https://blog.example.com/trips the site is everything under /trips/
  for (const url of ['/', `/${posts[0].id}`, '/404']) {
    const html =
      url === '/404' ? readFileSync(join(dist, '404.html'), 'utf8') : page(url);
    const paths = [
      ...html.matchAll(/(?:href|src|srcset|content)="(\/[^"]*)"/g),
    ].map(([, path]) => path);

    assert.ok(paths.length > 5, `${url} has links`);
    for (const path of paths) {
      assert.ok(path.startsWith(site.base), `${url}: ${path}`);
    }
  }
});

test("the stylesheet has Frontile's classes, for the mobile menu", () => {
  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  const href = html.match(/href="[^"]*?(assets\/main-[^"]+\.css)"/)?.[1];
  assert.ok(href, 'the index links the stylesheet');

  // Without them the drawer opens unstyled, off screen and below the page
  const css = readFileSync(join(dist, href), 'utf8');
  for (const name of ['.fixed{', '.inset-0{', '.drawer--horizontal-sm']) {
    assert.ok(css.includes(name), `${name} is in the stylesheet`);
  }
});

test('every route map loads a GPX of the site, by its whole URL', () => {
  const origin = new URL(site.host).origin;
  const maps = posts.flatMap(({ id }) => [
    ...page(`/${id}`).matchAll(/layers=GPX%7C([^"&]+)/g),
  ]);

  for (const [, url] of maps) {
    assert.ok(url.startsWith(`${origin}${site.base}`), `${url} is on the site`);
    assert.ok(
      existsSync(join(dist, url.slice(`${origin}${site.base}`.length))),
      `${url} is in the build`,
    );
  }
});

test("a post's route.gpx is its map, and linked in the feed", () => {
  const rss = readFileSync(join(dist, 'rss.xml'), 'utf8');

  for (const post of posts) {
    const own = existsSync(join(dirname(post.path), 'route.gpx'));

    assert.equal(
      page(`/${post.id}`).includes('data-test-route'),
      own,
      `${post.id}: a map only with route.gpx`,
    );
  }

  const routes = posts.filter((post) =>
    existsSync(join(dirname(post.path), 'route.gpx')),
  );

  assert.equal(
    rss.match(/\/route-[\w-]+\.gpx" download/g)?.length ?? 0,
    routes.length,
    'every route.gpx in the feed',
  );
});

test('the site installs as an app, with icons that exist', () => {
  const manifest = JSON.parse(
    readFileSync(join(dist, 'manifest.webmanifest'), 'utf8'),
  );

  assert.equal(manifest.name, site.title);
  assert.equal(manifest.short_name, site.shortTitle);
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.icons.some((icon) => icon.purpose === 'maskable'));

  assert.equal(manifest.start_url, site.base);
  for (const icon of manifest.icons)
    assert.ok(existsSync(join(dist, icon.src)), icon.src);

  // Every page, not only the front page: a post can be the first one opened
  for (const html of [page('/'), page(`/${posts[0].id}`)]) {
    assert.ok(
      html.includes(
        `<link rel="manifest" href="${site.base}manifest.webmanifest">`,
      ),
    );
    assert.ok(
      html.includes(
        `<link rel="apple-touch-icon" href="${site.base}apple-touch-icon-180x180.png">`,
      ),
    );
    assert.ok(
      html.includes(
        `<script id="vite-plugin-pwa:register-sw" src="${site.base}registerSW.js">`,
      ),
    );
  }

  assert.ok(existsSync(join(dist, 'apple-touch-icon-180x180.png')));
});

test('the service worker precaches every prerendered page', () => {
  const sw = readFileSync(join(dist, 'sw.js'), 'utf8');

  for (const post of posts)
    assert.ok(sw.includes(`url:"${post.id}/index.html"`), post.id);

  assert.doesNotMatch(sw, /\.woff2"/, 'precaches fonts the site does not use');
  assert.doesNotMatch(sw, /url:"gpx\//);
});

test('GitHub Pages has a page for unknown URLs', () => {
  assert.ok(existsSync(join(dist, '404.html')));
  assert.ok(!existsSync(join(dist, '404')), 'a /404 page');
});

test('every page has its Content-Security-Policy, which allows its inline scripts', () => {
  const pages = readdirSync(dist, { recursive: true }).filter((file) =>
    file.endsWith('.html'),
  );

  assert.ok(pages.length > 1);

  for (const file of pages) {
    const html = readFileSync(join(dist, file), 'utf8');
    const policy = html.match(
      /<meta http-equiv="Content-Security-Policy" content="([^"]+)">/,
    )?.[1];

    assert.ok(policy, `${file} has no policy`);
    assert.ok(
      html.indexOf(policy) < html.indexOf('<script'),
      `${file}: the policy comes after a script`,
    );

    for (const [, code] of html.matchAll(
      /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g,
    )) {
      const hash = createHash('sha256').update(code).digest('base64');

      assert.ok(policy.includes(`'sha256-${hash}'`), `${file}: ${code}`);
    }
  }
});

test('Netlify and Cloudflare get the headers of the assets', () => {
  assert.match(
    readFileSync(join(dist, '_headers'), 'utf8'),
    /^\/assets\/\*\n(?: {2}.*\n)* {2}Access-Control-Allow-Origin: \*$/m,
  );
});
