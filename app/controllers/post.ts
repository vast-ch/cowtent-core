import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';

/**
 * What a post shows of its map and photos, in its address
 * (app/services/post-view.ts): `lat`, `lng` and `zoom`, `photo=7` (from 1),
 * `view=photo|map` for the open lightbox, `hide=points,photos,track`.
 */
export default class PostController extends Controller {
  queryParams = ['lat', 'lng', 'zoom', 'photo', 'view', 'hide'];

  @tracked lat: string | null = null;
  @tracked lng: string | null = null;
  @tracked zoom: string | null = null;
  @tracked photo: string | null = null;
  @tracked view: string | null = null;
  @tracked hide: string | null = null;
}
