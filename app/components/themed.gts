import Component from '@glimmer/component';
import { service } from '@ember/service';

import { modifier } from 'ember-modifier';

import type ThemeService from '../services/theme.ts';
import type { Post } from '../content/schemas.ts';

/**
 * The page in the theme's layout (app/themes/<theme>/layout.gts). Once the
 * prerendered page is taken over, a visitor's own theme replaces it.
 */
export class ThemeLayout extends Component<{ Blocks: { default: [] } }> {
  @service declare theme: ThemeService;

  // After the page is drawn, never in the prerender
  adopt = modifier(() => {
    this.theme.adopt();
  });

  <template>
    <this.theme.parts.Layout {{this.adopt}}>{{yield}}</this.theme.parts.Layout>
  </template>
}

/**
 * The posts on the front page as the theme lists them
 */
export class ThemePostList extends Component<{ Args: { posts: Post[] } }> {
  @service declare theme: ThemeService;

  <template><this.theme.parts.PostList @posts={{@posts}} /></template>
}
