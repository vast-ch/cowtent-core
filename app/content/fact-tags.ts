import { ratingTag } from '../../lib/rating.mjs';

import type { Facts } from './schemas.ts';

export type PostMeta = { id: string; tags?: string[]; facts?: Facts };

// A draft's meta is null in a build (lib/vite-plugin-blog.mjs)
const POSTS = Object.values(
  import.meta.glob<PostMeta | null>('@content/posts/*/index.md', {
    query: '?meta',
    import: 'default',
    eager: true,
  }),
).filter((post) => post !== null);

const hours = (time: string) => {
  const [h = 0, m = 0, s = 0] = time.split(':').map(Number);

  return h + m / 60 + s / 3600;
};

/**
 * The numbers in `facts:` that the front page can be filtered by, as tags
 * that aren't in the front matter. They are intervals named by their upper
 * limit: `distance/under-20km` is every post with 15 to 20 km, when the
 * limit below is 15 km. The last one is open: `distance/over-100km`.
 */
const DIMENSIONS: {
  group: string;
  unit: string;
  of: (facts: Facts) => number | undefined;
  round?: (value: number) => number;
}[] = [
  { group: 'ascent', unit: 'm', of: (facts: Facts) => facts.ascent },
  { group: 'distance', unit: 'km', of: (facts: Facts) => facts.distance },
  {
    group: 'time',
    unit: 'h',
    of: (facts: Facts) => {
      const time = facts.duration ?? facts.movingTime;

      return time === undefined ? undefined : hours(time);
    },
  },
  {
    // Ascent over distance, in % (pct in the id, as % is no good in a URL)
    group: 'gradient',
    unit: 'pct',
    of: ({ ascent, distance }: Facts) =>
      ascent === undefined || !distance ? undefined : ascent / distance / 10,
    // Steps of 5 %: a hill doesn't get twice as steep a step
    round: (value: number) => Math.floor(value / 5) * 5 + 5,
  },
];

// Round numbers: 1, 1.5, 2, 3, 5, 10, 15, 20, 30, 50, 100, …
const STEPS = [1, 1.5, 2, 3, 5];

/**
 * The smallest round number above the value.
 */
function roundAbove(value: number) {
  for (let scale = 10 ** Math.floor(Math.log10(value)); ; scale *= 10) {
    for (const step of STEPS) {
      const limit = Number((step * scale).toPrecision(6));

      if (limit > value) return limit;
    }
  }
}

const MAX_LIMITS = 5;

// The interval a value is in: the first limit above it
const intervalOf = (limits: number[], value: number) =>
  limits.find((limit) => value < limit)!;

/**
 * The limits of a group come from the posts: for every post the round
 * number just above its value, so each limit is close to a real post.
 * While there are too many, the interval with the fewest posts merges into
 * its neighbour with fewer posts.
 */
function limitsOf(values: number[], round = roundAbove) {
  let limits = [...new Set(values.map(round))].sort((a, b) => a - b);

  const postsIn = (index: number) =>
    values.filter((value) => intervalOf(limits, value) === limits[index])
      .length;

  while (limits.length > MAX_LIMITS) {
    let fewest = 0;

    for (let index = 1; index < limits.length; index++) {
      if (postsIn(index) < postsIn(fewest)) fewest = index;
    }

    // Without its limit, an interval joins the one above; without the
    // limit below it, the one below
    const below = fewest - 1;
    const joinBelow =
      fewest === limits.length - 1 ||
      (below >= 0 && postsIn(below) < postsIn(fewest + 1));

    limits = limits.filter(
      (_, index) => index !== (joinBelow ? below : fewest),
    );
  }

  return limits;
}

const LIMITS = new Map(
  DIMENSIONS.map(({ group, of, round }) => [
    group,
    limitsOf(
      POSTS.map((post) => post.facts && of(post.facts)).filter(
        (value): value is number => value !== undefined && value > 0,
      ),
      round,
    ),
  ]),
);

const FACT_TAG =
  /^(ascent|distance|time|gradient)\/(under|over)-([\d.]+)(?:m|km|h|pct)$/;

/**
 * The interval a post is in, one a group. Above the last limit but one is
 * the open interval at the top.
 */
function factTags(facts: Facts | undefined): string[] {
  if (!facts) return [];

  return [
    ...(facts.rating ? [ratingTag(facts.rating)] : []),
    ...intervalTags(facts),
  ];
}

function intervalTags(facts: Facts): string[] {
  return DIMENSIONS.flatMap(({ group, unit, of }) => {
    const value = of(facts);

    if (value === undefined || value <= 0) return [];

    const limits = LIMITS.get(group)!;
    const top = limits.at(-2);

    return [
      top !== undefined && value > top
        ? `${group}/over-${top}${unit}`
        : `${group}/under-${intervalOf(limits, value)}${unit}`,
    ];
  });
}

/**
 * The groups of the tags that come from the facts, as the sidebar lists
 * them under Filters.
 */
export const FILTER_GROUPS = [
  'rating',
  'ascent',
  'distance',
  'time',
  'gradient',
];

/**
 * A post's tags from the front matter, and the ones from its facts.
 */
export const tagsOf = (post: PostMeta) => [
  ...(post.tags ?? []),
  ...factTags(post.facts),
];

/**
 * The limit of a fact tag (1500 for ascent/under-1500m), for its name and
 * its order; undefined for any other tag. The open interval goes after the
 * one that ends at its limit.
 */
export function factLimit(id: string): number | undefined {
  const match = FACT_TAG.exec(id);

  return match ? Number(match[3]) : undefined;
}

/**
 * The key of a fact tag's name under filters: in languages/*.yaml: one for
 * the intervals of a group, which takes the limit (`filters.ascent-under`:
 * "< {value} m"), and one for its open interval (`filters.ascent-over`).
 */
export function factKey(id: string): string | undefined {
  const match = FACT_TAG.exec(id);

  return match ? `filters.${match[1]}-${match[2]}` : undefined;
}
