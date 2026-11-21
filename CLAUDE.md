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
- The blog's `colour:` is `--blog-colour` on :root (index.html); Tailwind's
  `accent-*` shades are mixed from it (`app/styles/app.css`). Use `accent-*`,
  never a fixed colour, for anything that should follow the blog's colour.
- Tag names come from the blog's site.yaml; `translations/en-us.json` has only
  the app's own (the fact filters).
- `pnpm test` (QUnit, fixtures), `pnpm build && pnpm test:output`, `pnpm lint`.

- The design ("Basecamp": header band, ridge, card grid, right column) is our own, written from a spec. Never copy markup or classes from Tailwind Plus, Tailwind UI or any other paid template: the whole repo is MIT.
- Fonts: Fraunces (`font-display`, headings) and Inter (`font-sans`), self-hosted via @fontsource-variable (OFL).

Never use an em dash or en dash: write a plain minus `-` instead.
