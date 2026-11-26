import { ratingOf, stars } from '../../lib/rating.mjs';
import { FILTER_GROUPS, factKey, factLimit, tagsOf } from './fact-tags.ts';

import type { PostMeta } from './fact-tags.ts';

// A draft's meta is null in a build (lib/vite-plugin-blog.mjs)
const POSTS = import.meta.glob<PostMeta | null>('@content/posts/*/index.md', {
  query: '?meta',
  import: 'default',
  eager: true,
});

// Smallest to biggest
const SIZES = ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl'];

// The accents of the section headings: dark enough to read as text in the
// sidebar, and as a chip on a post (the classes in full, for Tailwind)
const COLOURS = [
  {
    text: 'text-colour-1-600',
    chip: 'bg-colour-1-50 text-colour-1-800 has-[a:hover]:bg-colour-1-100',
  },
  {
    text: 'text-sky-600',
    chip: 'bg-sky-50 text-sky-800 has-[a:hover]:bg-sky-100',
  },
  {
    text: 'text-amber-600',
    chip: 'bg-amber-50 text-amber-800 has-[a:hover]:bg-amber-100',
  },
  {
    text: 'text-rose-600',
    chip: 'bg-rose-50 text-rose-800 has-[a:hover]:bg-rose-100',
  },
  {
    text: 'text-violet-600',
    chip: 'bg-violet-50 text-violet-800 has-[a:hover]:bg-violet-100',
  },
];

export interface CloudTag {
  id: string;
  count: number;
  size: string;
  colour: string;
  chip: string;
}

export interface TagGroup {
  id: string;
  tags: CloudTag[];
}

/**
 * The key of a tag's name in languages/*.yaml: the blog's own tags are under
 * tags:, the ones from the facts under filters:. A fact tag shares a key
 * with the others of its group, and gets its limit or its stars as `value`
 * (tagValue).
 */
export function tagKey(id: string) {
  if (FILTER_GROUPS.includes(id)) return `filters.${id}`;
  if (ratingOf(id) !== undefined) return 'filters.rating-stars';

  return factKey(id) ?? `tags.${id}`;
}

export function tagValue(id: string) {
  const rating = ratingOf(id);

  return rating === undefined ? factLimit(id)?.toString() : stars(rating);
}

const POST_TAGS = Object.values(POSTS)
  .filter((post) => post !== null)
  .map(tagsOf);

/**
 * Whether adding the tag to the filter would leave no posts: no post with
 * all the selected tags has it too.
 */
export const leadsNowhere = (selected: string[], id: string) =>
  !selected.includes(id) &&
  !POST_TAGS.some(
    (tags) => tags.includes(id) && selected.every((tag) => tags.includes(tag)),
  );

/**
 * How many posts have all the selected tags.
 */
export const matchingCount = (selected: string[]) =>
  POST_TAGS.filter((tags) => selected.every((tag) => tags.includes(tag)))
    .length;

const counts = new Map<string, number>();

for (const tags of POST_TAGS) {
  for (const tag of tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
}

// rating/4-stars is in the group rating
const parentOf = (id: string) =>
  id.includes('/') ? id.slice(0, id.indexOf('/')) : undefined;
const used = [...counts.keys()];
const topLevel = used.filter((id) => !parentOf(id));
const values = topLevel.map((id) => counts.get(id)!);
const min = Math.min(...values);
const max = Math.max(...values);

const sizeOf = (count: number) =>
  SIZES[
    max === min
      ? 2
      : Math.round(((count - min) / (max - min)) * (SIZES.length - 1))
  ]!;

/**
 * Every top-level tag used by a post, sized by how many posts use it, each
 * in the next colour. Like a word cloud, the biggest are in the middle and
 * the smaller ones fan out to both sides.
 */
export const TAG_CLOUD: CloudTag[] = topLevel
  .map((id) => ({ id, count: counts.get(id)!, size: sizeOf(counts.get(id)!) }))
  .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))
  .reduce<Omit<CloudTag, 'colour' | 'chip'>[]>(
    (cloud, tag, index) => (index % 2 ? [tag, ...cloud] : [...cloud, tag]),
    [],
  )
  .map((tag, index) => ({
    ...tag,
    colour: COLOURS[index % COLOURS.length]!.text,
    chip: COLOURS[index % COLOURS.length]!.chip,
  }));

// Intervals from the smallest limit up (< 5 km, < 15 km, … > 100 km),
// ratings from ★★★★★ down, anything else in alphabetical order
const isOpen = (id: string) => id.includes('/over-');
const byValue = (a: string, b: string) => {
  if (factLimit(a) !== undefined && factLimit(b) !== undefined) {
    return (
      factLimit(a)! - factLimit(b)! || Number(isOpen(a)) - Number(isOpen(b))
    );
  }
  if (parentOf(a) === 'rating') {
    return b.localeCompare(a, 'en', { numeric: true });
  }

  return a.localeCompare(b, 'en', { numeric: true });
};

const groupsOf = (parents: string[]): TagGroup[] =>
  parents.map((parent, index) => ({
    id: parent,
    tags: used
      .filter((id) => parentOf(id) === parent)
      .sort(byValue)
      .map((id) => ({
        id,
        count: counts.get(id)!,
        size: 'text-sm',
        colour: COLOURS[(index + 2) % COLOURS.length]!.text,
        chip: COLOURS[(index + 2) % COLOURS.length]!.chip,
      })),
  }));

const parents = new Set(used.map(parentOf).filter((id) => id !== undefined));

/**
 * The groups of the posts' own tags (`country/norway`), each under its
 * name: one colour and size a group, as they are values of one thing.
 */
export const TAG_GROUPS = groupsOf(
  [...parents].filter((id) => !FILTER_GROUPS.includes(id)).sort(),
);

/**
 * The groups that come from the facts: Rating, Altitude gain, Distance,
 * Time, Gradient (app/content/fact-tags.ts).
 */
export const FILTER_GROUPS_USED = groupsOf(
  FILTER_GROUPS.filter((id) => parents.has(id)),
);

const CHIPS = new Map(
  [
    TAG_CLOUD,
    ...[...TAG_GROUPS, ...FILTER_GROUPS_USED].map((group) => group.tags),
  ]
    .flat()
    .map((tag) => [tag.id, tag.chip]),
);

/**
 * The colours of a tag's chip on a post: the ones it has in the sidebar
 */
export const tagChip = (id: string) => CHIPS.get(id) ?? COLOURS[0]!.chip;
