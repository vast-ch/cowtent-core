# CLAUDE.md

The platform of an outdoor blog (proof of concept), extracted from
adventuring-misa. A blog is a separate repo (`../cowtent-starter`) with
`site.yaml`, `cover.jpg`, `posts/`, `pages/` that depends on this package and
runs `cowtent build` (`bin/cowtent.mjs`).

- `bin/cowtent.mjs` runs Vite in this package's folder (Babel, Embroider and Vite
  read their config from the working folder) and passes the blog's folder as
  `BLOG_CONTENT`, the output as `BLOG_OUT`.
- `vite.config.mjs`: `@content` is the blog's folder (the fixtures in
  `EMBER_ENV=test`), `lib/site.mjs` reads its site.yaml.
- `lib/vite-plugin-blog.mjs`: Markdown modules, `virtual:blog-site` (settings
  and translations with the blog's tag names), `virtual:blog-cover`, rss.xml,
  robots.txt, favicon.svg.
- `lib/host.mjs`: after prerendering, the CSP as a `<meta>` in every page
  (hashes of its inline scripts) and `dist/_headers`, so a blog's host
  config is only `pnpm build` and `dist`.
- The blog's `colour:` is `--blog-colour` on :root (index.html); Tailwind's
  `accent-*` shades are mixed from it (`app/styles/app.css`). Use `accent-*`,
  never a fixed colour, for anything that should follow the blog's colour.
- A post's map and its lightboxes (`app/components/lightbox.gts`, on
  Frontile's Overlay) show what the post's query params say
  (`app/services/post-view.ts`); the maps only show state and report
  what's done to them by hand (`app/content/route-map.ts`, MapLibre, loaded
  when the map is about to be seen). Tilted is 3D, on swisstopo's terrain
  (`app/content/route-map-3d.ts`). The altitude profile along the map's
  bottom, its walker and the walk are `app/content/route-profile.ts`. Write maps the MapLibre way: layers of
  the style for the track and points, markers only for HTML like photos.
- Style with Tailwind classes on the elements, in templates and in the
  TS that builds the map and the profile (`el(tag, classes)`), states
  through `group-[.is-at]/name:` and the like. `app/styles/app.css` is only
  the theme, prose (Markdown we don't write markup for), keyframes and
  `@utility`s, and other libraries' elements (MapLibre's). No `@apply`
  blocks for our own elements; a class name like `route-play` stays as a
  hook for the tests.
- Tag names come from the blog's site.yaml; `translations/en-us.json` has only
  the app's own (the fact filters).
- `pnpm test` (QUnit, fixtures), `pnpm build && pnpm test:output`, `pnpm lint`.
- Test locally, not in prod: every push runs CI here, and a blog's push
  builds it on GitHub Pages or Netlify. Check a change in a blog with a
  production build against this folder (in the blog,
  `node <this folder>/bin/cowtent.mjs build`), its `dist` served locally
  (`python3 -m http.server`) and looked at in a browser (Playwright). Push
  only to release, everything pending at once: core, then the blogs.

- The design ("Basecamp": header band, ridge, card grid, right column) is our own, written from a spec. Never copy markup or classes from Tailwind Plus, Tailwind UI or any other paid template: the whole repo is MIT.
- Fonts: Fraunces (`font-display`, headings) and Inter (`font-sans`), self-hosted via @fontsource-variable (OFL).

Never use an em dash or en dash: write a plain minus `-` instead.
