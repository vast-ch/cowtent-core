import Component from '@glimmer/component';
import { service } from '@ember/service';

import { t } from 'ember-intl';

import type RouterService from '@ember/routing/router-service';
import type { Page } from '../content/schemas.ts';

/**
 * Where on the blog the page is, for the top of the page in the alps
 * theme: "Adventures" for the posts, a page's own title, "Not found".
 */
export class SectionName extends Component {
  @service declare router: RouterService;

  // The model of the post or page route (app/routes/), null for one
  // that doesn't exist
  get model() {
    const route = this.router.currentRoute;

    return route && 'attributes' in route
      ? (route.attributes as { post?: unknown; page?: Page } | null)
      : undefined;
  }

  get isPosts() {
    const name = this.router.currentRouteName;

    return name === 'index' || (name === 'post' && !!this.model?.post);
  }

  <template>
    {{#if this.model.page}}
      {{this.model.page.title}}
    {{else if this.isPosts}}
      {{t "layout.section-posts"}}
    {{else}}
      {{t "not-found.title"}}
    {{/if}}
  </template>
}
