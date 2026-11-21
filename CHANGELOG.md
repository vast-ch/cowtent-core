# Changelog

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
