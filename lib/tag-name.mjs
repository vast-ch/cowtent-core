/**
 * The name of a tag that has none in the blog's languages/*.yaml: its id in
 * words, the part after the group for a tag in one. trail-running is
 * "Trail Running", country/new-zealand "New Zealand".
 * Shared by the build (the feed) and the app (app/routes/application.ts).
 */
export const tagWords = (id) =>
  id
    .split('/')
    .at(-1)
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
