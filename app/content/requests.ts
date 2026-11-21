import { withReactiveResponse } from '@warp-drive/core/request';

import type { Page, Post } from './schemas.ts';

/**
 * The requests the routes make. ContentHandler answers them.
 */

function get(url: string, type: string, op: 'findRecord' | 'query') {
  return { url, method: 'GET' as const, op, cacheOptions: { types: [type] } };
}

export const allPosts = () =>
  withReactiveResponse<Post[]>(get('/posts', 'post', 'query'));

// Posts with all of the tags
export const postsTagged = (...tags: string[]) =>
  withReactiveResponse<Post[]>(
    get(
      `/posts?${tags.map((tag) => `tag=${encodeURIComponent(tag)}`).join('&')}`,
      'post',
      'query',
    ),
  );

export const findPost = (id: string) =>
  withReactiveResponse<Post>(get(`/posts/${id}`, 'post', 'findRecord'));

export const findPage = (id: string) =>
  withReactiveResponse<Page>(get(`/pages/${id}`, 'page', 'findRecord'));
