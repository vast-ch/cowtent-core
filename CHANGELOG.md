# Changelog

## v0.7.0 - 2026-11-24

- **A post's `route.gpx` is its map**, by itself: the file named exactly
  that next to `index.md` is drawn above the gallery, with the post's
  points and the gallery's photos on it, the download and
  map.geo.admin.ch under it. The feed links to both.
- **A GPX in the text** (`![The way to the hut](./hut.gpx)`) is still a
  map where it stands, of only its track.

## v0.6.1 - 2026-11-23

- **The build doesn't stop on a photo's GPS** on Node 24: the photos are
  read before their GPS is, so no file is left open.

## v0.6.0 - 2026-11-23

- **A route is on the blog's own map** of swisstopo's tiles, no longer
  swisstopo's viewer in a frame: the track in red, the scroll wheel
  scrolling the page. Under it the download and a link to the route on
  map.geo.admin.ch, which is also what a reader without JavaScript and
  the feed get.
- **The points of the facts on the map**: a point with `latitude` and
  `longitude` is a dot with its name and altitude.
- **The gallery's photos on the map**: every photo with GPS in its EXIF is
  a small round photo where it was taken, and opens in the gallery. The
  photos the blog serves don't keep the GPS.

## v0.5.0 - 2026-11-23

- **alps: the title of a post or page stays at the top** under the band
  while the page scrolls, smaller once it's there, on the page's
  background across the whole width with a thin line under it. Where the
  browser can't tie an animation to the scroll, it stays full size.
- **alps: a page's band says what the menu calls it**, "About me" over a
  page titled with a name; a page that isn't in the menu has its title
  there, as before.

## v0.4.1 - 2026-11-23

- **On Vercel and Render too, the blog knows its address** without `url:`
  in site.yaml: Vercel's production domain (its own domain once it has
  one), Render's onrender.com address. Cloudflare Pages doesn't give a
  build its production address, so a blog there writes `url:`.

## v0.4.0 - 2026-11-23

- **The host settings come with the build**: every page has its
  Content-Security-Policy as a `<meta>`, with the hashes of its own inline
  scripts, which every host applies, GitHub Pages too; and `dist/_headers`
  caches the assets forever and lets the swisstopo map load a GPX, for
  Netlify and Cloudflare. A blog's `netlify.toml` is down to
  `command = "pnpm build"` and `publish = "dist"`.
- **On Netlify, the blog knows its address** without `url:` in
  site.yaml: Netlify's primary one, its own domain once it has one, for
  the feed and the links that get shared
- A blog builds with `pnpm update cowtent-core && cowtent build`, so a
  host that keeps `node_modules` between builds still gets the newest
  cowtent-core.

## v0.3.1 - 2026-11-23

- **`-` after a gallery photo's number and a cover's `cover`**, easier
  to read than a space: `gallery/01 - The view.jpg`,
  `cover - The ridge at dawn.jpg`. Only the first `-` counts, so a
  caption can have its own. A space alone still works, so older names
  keep their order and captions.

## v0.3.0 - 2026-11-23

- **The cover is a file name**: the photo named `cover` next to a post's or
  page's `index.md`, in any case and any photo format (`.jpg`, `.jpeg`,
  `.png`, `.webp`, `.avif`), is its cover. The rest of the name is its alt
  text, like a gallery photo's caption: `cover The ridge at dawn.jpg`.
  `image:` in the front matter is gone, and a build that still has it
  fails with a note to rename the photo.

## v0.2.0 - 2026-11-23

- **Themes are templates**: each theme is a folder in `app/themes/` with
  its own layout and front-page list as `.gts`, built from shared
  components, without any CSS: its fonts and colours are classes of its
  layout too. A visitor's own theme (`theme-switcher: true`) takes over
  the page as soon as the app has started.
- **basecamp** is an old camping poster: Rokkitt and Bitter on cream
  paper, 70s sunset stripes under the name, cards as stickers with a dark
  edge and a hard shadow set further off: the posts' in the blog's colour,
  the sidebar's in mustard
- **alps** lists the posts one a row, the photo on the left, the tags at
  the bottom
- **Filters on the front page**: after a post's tags, the filters its facts
  put it in (rating, altitude gain, distance, time, gradient) as chips in
  their sidebar colours, each a link to the front page filtered by it
- **Screenshots** in the README, of the dummy blog of the tests: the front
  page in each theme. `pnpm screenshots` makes them anew.

## v0.1.0 - 2026-11-23

The first version of cowtent-core: a blog's folder of Markdown and YAML
built into a prerendered static site.

- **Posts and pages** in Markdown, with a cover photo, inline photos and a
  gallery from the post's `gallery` folder (file names as captions, a
  leading number for the order) with a full-screen viewer; photos resized
  and encoded at build time; links to other posts and pages written as
  their files (`../<id>/index.md`), so they work in Obsidian too; drafts
  with `published: false`
- **Facts** of a trip (date, location, grade, points, distance, ascent,
  time, rating) as a table at the start of a post
- **Checklists** written like Obsidian's (`- [+]`, `- [-]`, `- [?]`...),
  shown with badges
- **GPX routes** embedded on the swisstopo map with a download link
- **Tags** in groups and **filters** made from the facts (rating, altitude
  gain, distance, time, gradient) narrowing the front page
- **Themes**: `alps`, `basecamp` and `night`, each with its own layout,
  and an optional theme switcher for visitors
- **Languages**: English and German, any word reworded by the blog
- An **RSS feed**, an installable app with offline pages, a menu for
  phones
- Runs at the root of a host or under a path; `cowtent start` and
  `cowtent build`
