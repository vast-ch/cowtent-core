import Component from '@glimmer/component';
import { service } from '@ember/service';

import { t } from 'ember-intl';

import site from 'virtual:blog-site';

import type RouterService from '@ember/routing/router-service';
import type { Page } from '../content/schemas.ts';

/**
 * Where on the blog the page is, for the top of the page in the alps
 * theme: "Adventures" for the posts, a page's label in the menu (or its
 * own title when the menu doesn't have it), "Not found".
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

  // As the menu names the page: "About me" over a page titled with a name
  get pageName() {
    const page = this.model?.page;

    if (!page) return undefined;

    return (
      site.navigation.find((item) => item.id === page.id)?.label ?? page.title
    );
  }

  get isPosts() {
    const name = this.router.currentRouteName;

    return name === 'index' || (name === 'post' && !!this.model?.post);
  }

  <template>
    {{#if this.model.page}}
      {{this.pageName}}
    {{else if this.isPosts}}
      {{t "layout.section-posts"}}
    {{else}}
      {{t "not-found.title"}}
    {{/if}}
  </template>
}
