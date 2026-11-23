# Draft: more hosts, out of the box

Status: draft. Since v0.4.1 core reads the address on Vercel and Render,
and cowtent-starter's 03 explains a manual setup for Cloudflare Pages,
Vercel and Render; the ready-made files below are not built yet. Facts about the hosts are from
memory and marked **verify** where they decide the design: check each
against the host's current docs before building it.

## The goal

Whoever forks cowtent-starter picks a host, connects the repository and
clicks Deploy. No settings to type, nothing to change in the repository,
and every build gets the newest cowtent-core.

## What we have (v0.4.0)

Two kinds of host settings, by when the host reads them:

1. **Before the build** (from the repository or the host's dashboard): how
   to install and build, which folder to publish, the Node and pnpm
   versions. The build can't write these, they must be in the fork.
   - `package.json`: `"build": "pnpm update cowtent-core && cowtent build"`,
     `"packageManager": "pnpm@10.34.9"`. Every host runs `pnpm build`, and
     the update makes a host that keeps `node_modules` get the newest core.
   - `.node-version`: `24`.
   - One small file per host that can't be told the rest any other way.
2. **After the build** (from the output): headers, redirects, the 404
   page. cowtent-core writes these, so they change with core, never in a
   fork (`lib/host.mjs`):
   - the Content-Security-Policy as a `<meta>` in every page (any host)
   - `dist/_headers` (Netlify, Cloudflare)
   - `dist/404.html` (GitHub Pages, Netlify, Cloudflare)
   - the site's address from the host's environment (`SITE_URL` from the
     GitHub workflow, Netlify's `URL`)

The rule for a new host: the fork gets at most one file with the build
command and the folder; anything else goes into core's output.

## Per host

### GitHub Pages (done)

- Before: `.github/workflows/publish.yml` in the starter (install, build,
  upload `dist`). The user sets Pages' source to GitHub Actions and turns
  Actions on: two clicks, documented in 01 Getting started.
- After: no headers at all. The CSP works as the `<meta>`. GitHub Pages
  already sends `Access-Control-Allow-Origin: *` (**verify**), so swisstopo
  can load a GPX.
- Address: `SITE_URL` from `actions/configure-pages`.

### Netlify (done)

- Before: `netlify.toml`, `command = "pnpm build"`, `publish = "dist"`.
  Netlify finds pnpm from `packageManager`, Node from `.node-version`.
- After: reads `dist/_headers`, `dist/404.html`.
- Address: `URL`, the primary domain (`NETLIFY=true`).
- Later, if needed: Netlify's Frameworks API (`.netlify/v1/config.json`
  written by the build) can set headers, redirects and image settings from
  the output, more than `_headers` can.

### Cloudflare

Cloudflare has two products for a static site: **Pages** and **Workers
with static assets**, and is moving new projects to Workers (**verify**).

- Before:
  - Pages: the build command and output folder are typed in the dashboard
    on the first deploy (`pnpm build`, `dist`); a `wrangler.toml` with
    `pages_build_output_dir = "dist"` sets the folder, not the command
    (**verify**). So one dashboard field stays, unless Cloudflare's
    framework detection picks up `package.json`'s build script.
  - Workers: `wrangler.jsonc` in the fork with
    `"assets": { "directory": "./dist", "not_found_handling": "404-page" }`;
    the build command is set when connecting the repository (Workers
    Builds), **verify** whether it can live in the file.
  - Both read `.node-version`; pnpm from `packageManager` (**verify**,
    older build images needed a lockfile to pick pnpm).
- After: `_headers` and `_redirects` from the output folder, the same
  format as Netlify's (both products, **verify** for Workers), and
  `404.html`. Nothing new for core.
- Address: Pages sets `CF_PAGES_URL`, but that's the URL of the single
  deployment, not the production one (**verify**). Without a production
  URL in the environment, the user writes `url:` in site.yaml, as on any
  host with its own domain. Or core takes `CF_PAGES_BRANCH === 'main'` plus
  the project name to build `https://<project>.pages.dev` (**verify**).
- Plan: try Workers first. If `wrangler.jsonc` can carry everything, the
  starter gets that one file and 03 a Cloudflare section like Netlify's.

### Vercel

- Before: `vercel.json` in the fork can set `buildCommand`,
  `outputDirectory` and `installCommand`. Without a detected framework
  ("Other") Vercel would run `pnpm build` but publish `public` (**verify**),
  so the file is needed:
  ```json
  { "buildCommand": "pnpm build", "outputDirectory": "dist" }
  ```
  pnpm from `packageManager` (with Corepack, **verify**), Node from
  `engines` in `package.json` rather than `.node-version` (**verify**).
- After: Vercel ignores `_headers`, but already sends
  `Access-Control-Allow-Origin: *` on static files (checked on several
  vercel.app sites, 2026-11-23), so swisstopo's maps work without it; only
  the long caching of `/assets/*` is missing. Two ways to keep headers in
  core:
  - core writes the **Build Output API** (`.vercel/output/` with
    `config.json` routes carrying the headers, and `static/` with the
    site). Vercel uses it when the build produces it; then
    `outputDirectory` isn't needed either (**verify**). This is the clean
    one: the fork's file shrinks or disappears.
  - or the starter's `vercel.json` carries the headers: against the rule,
    they'd go stale in every fork.
- 404: Vercel serves `404.html` from the output for unknown URLs
  (**verify** with `cleanUrls`).
- Address: `VERCEL_PROJECT_PRODUCTION_URL`, the production domain without
  `https://`, set at build time (Vercel's docs): core reads it since
  v0.4.1.
- Plan: core writes `.vercel/output` when `VERCEL=1`; the starter carries
  the two-line `vercel.json` only if Vercel still needs it then.

### Render

- Before: `render.yaml` (a Blueprint) in the fork, or the dashboard.
  A static site:
  ```yaml
  services:
    - type: web
      runtime: static
      name: my-blog
      buildCommand: pnpm build
      staticPublishPath: dist
  ```
  Connecting it is "New → Blueprint", one more step than Netlify.
- After: Render reads neither `_headers` nor the output for config;
  headers and redirects live in `render.yaml` or the dashboard
  (**verify**). Only the CSP (`<meta>`) comes from core; the swisstopo
  CORS header would have to be in every fork's `render.yaml`.
- Address: `RENDER_EXTERNAL_URL`: core reads it since v0.4.1. Render
  documents it for web services; community reports say static site builds
  get it too (**verify** on a real build).
- Plan: lowest priority. If built, the CORS header is the one thing a
  fork carries, and 03 says Render's maps may need it.

### Anything else (a web server, S3, Bunny, a Raspberry Pi)

`dist/` is a plain static site: build anywhere with `pnpm build` (or in
the GitHub workflow) and copy `dist/` up. `404.html` and the `<meta>` CSP
work everywhere; `_headers` is ignored, so caching and the swisstopo CORS
header are up to that server. 03 could end with this paragraph.

## What core would change

- `lib/site.mjs`: the address from each host's environment, only when
  that host's own flag is set (`VERCEL=1`, `RENDER=true`, Cloudflare's),
  so an unrelated `URL` never leaks in.
- `lib/host.mjs`: `.vercel/output` when building on Vercel.
- `tests/output/site.test.mjs`: one check per host file core writes.

## What the starter would change

- One file per host, next to `netlify.toml`: `wrangler.jsonc`,
  `vercel.json` (if still needed), `render.yaml` (if ever).
- 03 gets a short section per host, with the same three steps: sign in
  with GitHub, pick the repository, Deploy.

## Order

1. Cloudflare (Workers): likely one file and no core change.
2. Vercel: the Build Output API in core, then maybe no file at all.
3. Render: only if someone asks.
