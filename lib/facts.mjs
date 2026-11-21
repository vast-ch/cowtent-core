import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

import { ratingTag, stars } from './rating.mjs';

/**
 * The `facts:` front matter of a post: the numbers worth filtering and
 * sorting by, plus anything else as free-form rows.
 *
 *   facts:
 *     date: 2024-06-25        # when it happened, if not the post's date
 *     location: "[Stechelberg](https://…)"
 *     grade: T6
 *     rating: 4               # 1 to 5 stars, a filter of its own
 *     points:                 # places on the way, in order
 *       - name: Stechelberg
 *         altitude: 910       # m, optional
 *         link: https://…     # optional
 *     distance: 13.8          # km
 *     ascent: 1820            # m
 *     duration: "5:36"        # h:mm or h:mm:ss; or movingTime
 *     more:                   # label: Markdown, in this order
 *       Destination: Silberhornhütte, 2663 m
 *     links:                  # label: URL
 *       Strava: https://…
 *
 * Becomes the typed values plus `rows`, the table rendered before the post
 * (app/components/facts.gts) and in the feed, so both read the same, in
 * the blog's language (lib/language.mjs).
 */
export function readFacts(facts, path, language, link) {
  if (facts === undefined) return undefined;

  const fail = (message) => {
    throw new Error(`${path}: facts.${message}`);
  };

  if (typeof facts !== 'object' || facts === null || Array.isArray(facts)) {
    fail(' must be a map');
  }

  const known = new Set([...Object.keys(LABELS), 'more', 'links']);
  const label = (key) => language.t(`post.facts.${LABELS[key]}`);
  const number = (value) => value.toLocaleString(language.locale);

  for (const key of Object.keys(facts)) {
    if (!known.has(key)) fail(`${key} is not a known fact, put it under more:`);
  }

  for (const key of ['distance', 'ascent']) {
    if (facts[key] !== undefined && typeof facts[key] !== 'number') {
      fail(`${key} must be a plain number, got ${JSON.stringify(facts[key])}`);
    }
  }

  for (const key of ['duration', 'movingTime']) {
    if (facts[key] !== undefined && !TIME.test(String(facts[key]))) {
      fail(`${key} must be h:mm or h:mm:ss, got ${JSON.stringify(facts[key])}`);
    }
  }

  const date = facts.date === undefined ? undefined : String(facts.date);

  if (date !== undefined && Number.isNaN(Date.parse(date))) {
    fail(`date must be YYYY-MM-DD, got ${JSON.stringify(facts.date)}`);
  }

  const points = readPoints(facts.points, fail);

  if (
    facts.rating !== undefined &&
    !(Number.isInteger(facts.rating) && facts.rating >= 1 && facts.rating <= 5)
  ) {
    fail(`rating must be 1, 2, 3, 4 or 5, got ${JSON.stringify(facts.rating)}`);
  }

  const values = {
    date,
    points,
    grade: facts.grade === undefined ? undefined : String(facts.grade),
    rating: facts.rating,
    distance: facts.distance,
    ascent: facts.ascent,
    duration: facts.duration === undefined ? undefined : String(facts.duration),
    movingTime:
      facts.movingTime === undefined ? undefined : String(facts.movingTime),
  };

  const rows = [
    values.date && [
      label('date'),
      escape(formatDate(values.date, language.locale)),
    ],
    facts.location !== undefined && [
      label('location'),
      inline(String(facts.location)),
    ],
    values.grade && [label('grade'), formatGrade(values.grade)],
    values.rating && [label('rating'), formatRating(values.rating, link)],
    points && [label('points'), formatPoints(points, number)],
    values.distance !== undefined && [
      label('distance'),
      `${number(values.distance)} km`,
    ],
    values.ascent !== undefined && [
      label('ascent'),
      `${number(values.ascent)} m`,
    ],
    values.duration && [
      label('duration'),
      formatTime(values.duration, language),
    ],
    values.movingTime && [
      label('movingTime'),
      formatTime(values.movingTime, language),
    ],
    ...Object.entries(facts.more ?? {}).map(([label, value]) => [
      escape(label),
      inline(String(value)),
    ]),
    Object.keys(facts.links ?? {}).length && [
      language.t('post.facts.links'),
      Object.entries(facts.links)
        .map(([label, url]) => `<a href="${escape(url)}">${escape(label)}</a>`)
        .join(' · '),
    ],
  ]
    .filter(Boolean)
    .map(([label, html]) => ({ label, html }));

  return Object.fromEntries(
    Object.entries({ ...values, rows }).filter(
      ([, value]) => value !== undefined,
    ),
  );
}

/**
 * The facts as an HTML table, for the feed.
 */
export function factsTable(facts) {
  if (!facts?.rows.length) return '';

  const rows = facts.rows
    .map(({ label, html }) => `<tr><th>${label}</th><td>${html}</td></tr>`)
    .join('');

  return `<table>${rows}</table>`;
}

// The known facts, and their labels under post.facts in languages/*.yaml
const LABELS = {
  date: 'date',
  location: 'location',
  grade: 'grade',
  rating: 'rating',
  points: 'points',
  distance: 'distance',
  ascent: 'ascent',
  duration: 'duration',
  movingTime: 'moving-time',
};

const TIME = /^\d+:\d{2}(:\d{2})?$/;

function readPoints(points, fail) {
  if (points === undefined) return undefined;
  if (!Array.isArray(points)) fail('points must be a list');

  return points.map((point, index) => {
    if (typeof point?.name !== 'string' || !point.name.trim()) {
      fail(`points[${index}].name must be a name`);
    }
    if (point.altitude !== undefined && typeof point.altitude !== 'number') {
      fail(`points[${index}].altitude must be a plain number (${point.name})`);
    }
    if (point.link !== undefined && !/^https?:\/\//.test(point.link)) {
      fail(`points[${index}].link must be a URL (${point.name})`);
    }

    const unknown = Object.keys(point).filter(
      (key) => !['name', 'altitude', 'link'].includes(key),
    );

    if (unknown.length) fail(`points[${index}] has unknown ${unknown}`);

    return point;
  });
}

// Stechelberg (910 m) → Silberhornhütte (2,663 m)
function formatPoints(points, number) {
  return points
    .map(({ name, altitude, link }) => {
      const label = link
        ? `<a href="${escape(link)}">${escape(name)}</a>`
        : escape(name);

      return altitude === undefined
        ? label
        : `${label} (${number(altitude)} m)`;
    })
    .join(' → ');
}

function formatDate(date, locale) {
  return new Date(date).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// ★★★★☆, a link to the posts with the same rating
function formatRating(rating, link) {
  return `<a href="${link(`?tags=${encodeURIComponent(ratingTag(rating))}`)}">${stars(rating)}</a>`;
}

// SAC hiking grades link to the scale
function formatGrade(grade) {
  return /^T[1-6][+-]?$/.test(grade)
    ? `<a href="${SAC_SCALE}">${grade}</a>`
    : inline(grade);
}

const SAC_SCALE = 'https://de.wikipedia.org/wiki/SAC-Wanderskala';

// 5:36 → 5 h 36 min; race times keep their seconds: 1:17:31
function formatTime(time, language) {
  const [hours, minutes, seconds] = time.split(':');

  return seconds === undefined
    ? language.t('post.facts.time', {
        hours: Number(hours),
        minutes: Number(minutes),
      })
    : time;
}

function escape(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const inlineProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeStringify)
  .freeze();

// Markdown of a table cell: links and emphasis, without the paragraph
export function inline(markdown) {
  return String(inlineProcessor.processSync(markdown))
    .trim()
    .replace(/^<p>([\s\S]*)<\/p>$/, '$1');
}
