import Route from '@ember/routing/route';
import { service } from '@ember/service';

import { galleryOf } from '../content/gallery.ts';
import { routeOf } from '../content/route.ts';
import { allPosts, findPost } from '../content/requests.ts';
import { orNotFound } from '../content/not-found.ts';

import type PostController from '../controllers/post.ts';
import type Store from '../services/store.ts';

export default class PostRoute extends Route {
  @service declare store: Store;

  // The next post starts with its whole route and no lightbox, not this one's
  resetController(controller: PostController, isExiting: boolean) {
    if (isExiting) {
      controller.lat =
        controller.lng =
        controller.zoom =
        controller.photo =
        controller.view =
        controller.hide =
          null;
    }
  }

  async model({ post_id }: { post_id: string }) {
    return orNotFound(async () => {
      const [{ content: post }, { content: posts }, gallery, route] =
        await Promise.all([
          this.store.request(findPost(post_id)),
          this.store.request(allPosts()),
          galleryOf(post_id),
          routeOf(post_id),
        ]);

      const index = posts.data.indexOf(post.data);

      return {
        post: post.data,
        newer: posts.data[index - 1],
        older: posts.data[index + 1],
        gallery,
        route,
      };
    });
  }
}
