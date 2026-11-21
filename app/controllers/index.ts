import Controller from '@ember/controller';

// The tags the posts are filtered by (app/content/tag-filter.ts)
export default class IndexController extends Controller {
  queryParams = ['tags'];
  tags = '';
}
