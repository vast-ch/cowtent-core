// The screenshots in the README (docs/screenshots/), made from the blog of
// the tests (tests/fixtures/content), overwriting the ones there:
//
//   pnpm screenshots
//
// A new view to show is a new line in SHOTS here, and in the README.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';

import { chromium } from 'playwright';

import { THEMES } from '../lib/themes.mjs';

const core = join(import.meta.dirname, '..');
const dist = join(core, 'dist');
const out = join(core, 'docs/screenshots');

const DESKTOP = { viewport: { width: 1440, height: 900 } };
const PHONE = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
};

// name, page, device, theme (a visitor's pick, the blog's own without)
const SHOTS = [
  ['list-desktop', '/', DESKTOP],
  ['post-desktop', '/2023-08-04-a-scramble', DESKTOP],
  ['list-phone', '/', PHONE],
  ['post-phone', '/2023-08-04-a-scramble', PHONE],
  ...THEMES.map((theme) => [`theme-${theme}`, '/', DESKTOP, theme]),
];

const built = spawnSync('pnpm', ['build'], { cwd: core, stdio: 'inherit' });

if (built.status !== 0) throw new Error('The build of the dummy blog failed');

// The test blog lives under a path (its url: in site.yaml)
const site = readFileSync(
  join(core, 'tests/fixtures/content/site.yaml'),
  'utf8',
);
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
  if (theme) {
    await page.addInitScript(
      `localStorage.setItem(${JSON.stringify(`cowtent-theme:${base}`)}, ${JSON.stringify(theme)})`,
    );
  }

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
