import Route from '@ember/routing/route';
import { service } from '@ember/service';

import { findPage } from '../content/requests.ts';
import { orNotFound } from '../content/not-found.ts';

import type Store from '../services/store.ts';

export default class PageRoute extends Route {
  @service declare store: Store;

  async model({ page_id }: { page_id: string }) {
    return orNotFound(async () => {
      const { content } = await this.store.request(findPage(page_id));

      return { page: content.data };
    });
  }
}
