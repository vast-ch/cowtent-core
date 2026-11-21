# cowtent-core

**cowtent** = cow + tent = content, the platform of an outdoor blog. Markdown posts with photos, a gallery,
facts (distance, ascent, time), checklists, GPX routes on the swisstopo map, tags and filters, themes, an RSS feed,
prerendered to a static site. Ember 7 (compatless) on Vite, WarpDrive,
Tailwind CSS 4.

A blog is a separate repository with only the writing in it (see
`cowtent-starter`): it depends on this package and builds with it.

All of it, code and design, is MIT (LICENSE). The fonts, Inter, Fraunces,
Outfit and Figtree, are under the SIL Open Font License and installed from
npm.

Version 0.1.0, see [CHANGELOG.md](CHANGELOG.md).

## A blog's folder

```
site.yaml               title, owner, colour, menu, language (lib/site.mjs)
languages/<code>.yaml   tag names, and any of the core's words reworded
cover.jpg               the sidebar photo
favicon.svg             optional, the icon of the site and the app
posts/<slug>/index.md   a post at /<slug>, its photos next to it
posts/<slug>/gallery/   its gallery: "01 The view.jpg", the name the caption
pages/<slug>/index.md   a page at /page/<slug>
public/                 optional, copied as is (GPX files...)
```

Its `package.json`:

```json
{
  "scripts": {
    "build": "cowtent build",
    "start": "cowtent start"
  },
  "dependencies": {
    "cowtent-core": "github:vast-ch/cowtent-core"
  }
}
```

- `cowtent start` - dev server on http://localhost:4200
- `cowtent build` - the site in `dist/`, every page prerendered, plus
  `404.html`; then it checks every post and page made it in, with its
  photos, links and feed (`tests/output/site.test.mjs`), and fails if not

## Where it runs

A blog can live at the root of its host or under a path, like
`https://vast-ch.github.io/cowtent-starter`. The build takes the path from
the blog's address (`url:` in site.yaml, or `SITE_URL`, which the GitHub
Pages workflow passes) and uses it for the assets, the app's routes, the
links, the feed and the installed app (`site.base`, lib/site.mjs). The
production build of the test blog runs under `/trips/`, and
`tests/output/site.test.mjs` checks every link stays under it.

## Languages

Every word around the posts is in `languages/<code>.yaml` here (`en`,
`de`), grouped by where it shows up: `sidebar`, `post.facts`,
`post.gallery`, `filters`... A blog picks one with `language:` in its
site.yaml, and its own `languages/<code>.yaml` has the names of its tags
under `tags:` and can reword any of the core's words: its keys win, the rest
comes from here (lib/language.mjs). A new language is a new file here with
every key of en.yaml (`tests/lib/language.test.mjs` checks).

## Themes

`theme:` in site.yaml picks the look, `alps` when it has none:

- `alps` - the sidebar on the left with the big photo, the name and the
  tagline; the outline of the Alps over the page with where on the blog it is
- `basecamp` - the name across the top over a ridge, the posts as a
  showcase in three columns, the sidebar on the right in cards
- `night` - dark, with a menu bar under the stars: a small photo, the name
  and the links; one post a row with its photo on the right, the tags and
  filters in a column beside them

Every page carries all of them: `data-theme` on `<html>` picks one
(`app/styles/themes/`). With `theme-switcher: true` visitors can pick
another one at the end of the sidebar; their browser remembers it for that
blog, and a line in the page's head applies it before the page is drawn.

## Releasing

Blogs aren't pinned to a version: every build of every blog installs the
core from `main`, and the starter has no lockfile. A commit on `main` reaches
all of them on their next publish (after their next commit, or on Monday).
The people writing the blogs only edit Markdown and YAML; they never update
anything themselves. The version in package.json and CHANGELOG.md names
what `main` has; there are no tags.

## Working on it

`pnpm test` runs the acceptance tests against the dummy blog in
`tests/fixtures/content/`. `pnpm build` builds that one too (or any other
with `BLOG_CONTENT=../cowtent-starter pnpm build`).

To see a change on a real blog as you make it, serve the blog from this
folder: the core's own code, no install in the blog and nothing to publish.

```sh
BLOG_CONTENT=../cowtent-starter node bin/cowtent.mjs start
```
