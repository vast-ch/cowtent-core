import { withDefaults } from '@warp-drive/core/reactive';

import type { Type } from '@warp-drive/core/types/symbols';

/**
 * The front matter of the Markdown files, as WarpDrive resources.
 *
 * Any front-matter key not listed here is still in the cache,
 * it just needs a field to be read.
 */

export const PostSchema = withDefaults({
  type: 'post',
  fields: [
    { kind: 'field', name: 'title' },
    { kind: 'field', name: 'date' },
    { kind: 'field', name: 'excerpt' },
    { kind: 'field', name: 'featured' },
    // false for a draft, which only the dev server has (lib/content.mjs)
    { kind: 'field', name: 'published' },
    // Typed for filtering, plus the rows to show (lib/facts.mjs)
    { kind: 'field', name: 'facts' },
    // Only loaded with the single post, the list pages don't need it
    { kind: 'field', name: 'html' },
    // Ids like munro or rating/4-stars, named in translations/
    { kind: 'field', name: 'tags' },
  ],
});

export const PageSchema = withDefaults({
  type: 'page',
  fields: [
    { kind: 'field', name: 'title' },
    { kind: 'field', name: 'html' },
  ],
});

export const schemas = [PostSchema, PageSchema];

/** A place on the way (facts.points); latitude and longitude put a pin on the map */
export interface Point {
  name: string;
  /** m */
  altitude?: number;
  link?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * The `facts:` front matter, read at build time by lib/facts.mjs.
 */
export interface Facts {
  date?: string;
  grade?: string;
  /** 1 to 5 stars */
  rating?: number;
  /** Places on the way, in order; altitude in m; latitude and longitude for a pin */
  points?: Point[];
  /** km */
  distance?: number;
  /** m */
  ascent?: number;
  /** h:mm or h:mm:ss */
  duration?: string;
  movingTime?: string;
  /** The table to show: labels are text, values HTML */
  rows: { label: string; html: string }[];
}

export interface Post {
  [Type]: 'post';
  id: string;
  title: string;
  date: string;
  excerpt: string;
  featured?: boolean;
  published?: boolean;
  facts?: Facts;
  html?: string;
  tags?: string[];
}

export interface Page {
  [Type]: 'page';
  id: string;
  title: string;
  html?: string;
}
