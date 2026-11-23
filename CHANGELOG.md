# Changelog

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
