import alps from './alps/index.ts';
import basecamp from './basecamp/index.ts';
import night from './night/index.ts';

import type { ComponentLike } from '@glint/template';
import type { Post } from '../content/schemas.ts';

/**
 * A theme is a folder here: the parts of the page it draws its own way, in
 * Tailwind classes only. Its fonts and colours too: its layout sets them on
 * <html> while it is on the page (`[:root:has(&)]:`). Everything else, the
 * posts, pages and the sidebar's sections, is the same in every theme
 * (app/templates/, app/components/).
 */
export interface Theme {
  /** The frame of every page: header, sidebar, footer, the page in it */
  Layout: ComponentLike<{ Element: HTMLElement; Blocks: { default: [] } }>;
  /** The posts on the front page */
  PostList: ComponentLike<{ Args: { posts: Post[] } }>;
}

// The names are lib/themes.mjs's, which site.yaml's `theme:` is checked against
export const THEMES: Record<string, Theme> = { alps, basecamp, night };
