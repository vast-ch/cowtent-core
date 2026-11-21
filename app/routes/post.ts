import Route from '@ember/routing/route';
import { service } from '@ember/service';

import { galleryOf } from '../content/gallery.ts';
import { allPosts, findPost } from '../content/requests.ts';
import { orNotFound } from '../content/not-found.ts';

import type Store from '../services/store.ts';

export default class PostRoute extends Route {
  @service declare store: Store;

  async model({ post_id }: { post_id: string }) {
    return orNotFound(async () => {
      const [{ content: post }, { content: posts }, gallery] =
        await Promise.all([
          this.store.request(findPost(post_id)),
          this.store.request(allPosts()),
          galleryOf(post_id),
        ]);

      const index = posts.data.indexOf(post.data);

      return {
        post: post.data,
        newer: posts.data[index - 1],
        older: posts.data[index + 1],
        gallery,
      };
    });
  }
}
