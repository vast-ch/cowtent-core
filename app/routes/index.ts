import Route from '@ember/routing/route';
import { service } from '@ember/service';

import { allPosts, postsTagged } from '../content/requests.ts';
import { selectedTags, toggleTag } from '../content/tag-filter.ts';

import type Store from '../services/store.ts';

export default class IndexRoute extends Route {
  @service declare store: Store;

  queryParams = { tags: { refreshModel: true } };

  async model({ tags }: { tags?: string }) {
    const selected = selectedTags(tags);
    const { content } = await this.store.request(
      selected.length ? postsTagged(...selected) : allPosts(),
    );

    return {
      posts: content.data,
      // Each with the filter it leaves when removed
      filter: selected.map((id) => ({
        id,
        without: toggleTag(selected, id),
      })),
    };
  }
}
