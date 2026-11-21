/**
 * The id of a rating's filter: `rating: 4` in the facts is rating/4-stars.
 * Shared by the build (lib/facts.mjs) and the app (app/content/fact-tags.ts).
 */
export const ratingTag = (rating) =>
  `rating/${rating}-${rating === 1 ? 'star' : 'stars'}`;

// ★★★★☆
export const stars = (rating) => '★'.repeat(rating) + '☆'.repeat(5 - rating);

/**
 * The rating of a filter id: 4 for rating/4-stars, undefined for any other.
 */
export function ratingOf(id) {
  const match = /^rating\/([1-5])-stars?$/.exec(id);

  return match ? Number(match[1]) : undefined;
}
