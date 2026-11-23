// The screenshots in the README (docs/screenshots/), made from a copy of
// the blog of the tests (tests/fixtures/content) with real photos in place
// of its tiny ones, overwriting the ones there:
//
//   pnpm screenshots
//
// A new theme (lib/themes.mjs) gets its screenshot by itself, and needs its
// heading and image in the README.
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';

import { chromium } from 'playwright';

import { THEMES } from '../lib/themes.mjs';

const core = join(import.meta.dirname, '..');
const dist = join(core, 'dist');
const out = join(core, 'docs/screenshots');

const DESKTOP = { viewport: { width: 1440, height: 900 } };

// name, page, device, theme (a visitor's pick)
const SHOTS = THEMES.map((theme) => [`theme-${theme}`, '/', DESKTOP, theme]);

/*
 * Each photo of the blog of the tests and the one of Lorem Picsum
 * (https://picsum.photos, free photos from Unsplash) in its place, by id:
 * the same photos every time. The posts the tests keep without a cover get
 * one here too.
 */
const PHOTOS = {
  'cover.jpg': [54, 800, 800],
  'posts/2020-05-01-first-munro/cover.jpg': [287, 1600, 1067],
  'posts/2021-06-02-second-munro/cover.jpg': [1044, 1600, 1067],
  'posts/2022-07-03-big-skyrace/cover.jpg': [1043, 1600, 1067],
  'posts/2023-08-04-a-scramble/cover.jpg': [29, 1600, 1067],
  'posts/2023-08-04-a-scramble/inline.jpg': [1018, 1600, 1067],
  'posts/2023-08-04-a-scramble/gallery/01 The first photo.jpg': [
    1036, 1600, 1067,
  ],
  'posts/2023-08-04-a-scramble/gallery/2 A grey ridge under cloud.jpg': [
    1015, 1600, 1067,
  ],
  'posts/2023-08-04-a-scramble/gallery/The third photo.jpg': [1039, 1600, 1067],
};

// Its real path: on macOS the temporary folder is behind a symlink
const content = realpathSync(
  mkdtempSync(join(tmpdir(), 'cowtent-screenshots-')),
);

cpSync(join(core, 'tests/fixtures/content'), content, { recursive: true });

for (const [path, [id, width, height]] of Object.entries(PHOTOS)) {
  // eslint-disable-next-line warp-drive/no-external-request-patterns -- Node, not the app
  const photo = await fetch(
    `https://picsum.photos/id/${id}/${width}/${height}.jpg`,
  );

  if (!photo.ok) throw new Error(`Picsum photo ${id}: ${photo.status}`);

  writeFileSync(join(content, path), Buffer.from(await photo.arrayBuffer()));

  const post = /^posts\/([^/]+)\/cover\.jpg$/.exec(path);
  const index = post && join(content, 'posts', post[1], 'index.md');

  if (index && !/^image:/m.test(readFileSync(index, 'utf8'))) {
    writeFileSync(
      index,
      readFileSync(index, 'utf8').replace(
        /^---\n/,
        '---\nimage: ./cover.jpg\n',
      ),
    );
  }
}

const built = spawnSync('node', ['bin/cowtent.mjs', 'build'], {
  cwd: core,
  env: { ...process.env, BLOG_CONTENT: content },
  stdio: 'inherit',
});

if (built.status !== 0) throw new Error('The build of the dummy blog failed');

// The test blog lives under a path (its url: in site.yaml)
const site = readFileSync(join(content, 'site.yaml'), 'utf8');
const base = `${new URL(/^url: (.+)$/m.exec(site)[1]).pathname.replace(/\/+$/, '')}/`;

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
};

const server = createServer((request, response) => {
  let path = decodeURIComponent(new URL(request.url, 'http://x').pathname);

  path = path.startsWith(base) ? path.slice(base.length - 1) : path;
  if (!extname(path)) path = join(path, 'index.html');

  try {
    const body = readFileSync(join(dist, path));

    response.writeHead(200, {
      'content-type': TYPES[extname(path)] ?? 'application/octet-stream',
    });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end();
  }
}).listen(0);

const origin = `http://localhost:${server.address().port}`;

mkdirSync(out, { recursive: true });

// The Chrome that's installed, as for the tests: nothing to download
const browser = await chromium.launch({ channel: 'chrome' });

for (const [name, path, device, theme] of SHOTS) {
  const page = await browser.newPage({ ...device, serviceWorkers: 'block' });
  const errors = [];

  page.on('pageerror', (error) => errors.push(error.message));

  // In the page: the theme a visitor picked on an earlier page
  await page.addInitScript(
    `localStorage.setItem(${JSON.stringify(`cowtent-theme:${base}`)}, ${JSON.stringify(theme)})`,
  );

  await page.goto(`${origin}${base}${path.slice(1)}`, {
    waitUntil: 'networkidle',
  });
  await page.evaluate('document.fonts.ready');
  await page.screenshot({ path: join(out, `${name}.png`) });
  await page.close();

  if (errors.length) {
    console.error(`${name}: ${errors.join('\n')}`);
    process.exitCode = 1;
  } else {
    console.log(`docs/screenshots/${name}.png`);
  }
}

await browser.close();
server.close();
rmSync(content, { recursive: true });
