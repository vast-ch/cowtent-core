import { module, test } from 'qunit';
import {
  click,
  currentURL,
  triggerEvent,
  triggerKeyEvent,
  visit,
} from '@ember/test-helpers';

import { setupApplicationTest } from '../helpers/index.ts';

import { allPosts } from '../../app/content/requests.ts';

import type Store from '../../app/services/store.ts';

// These run the real app against the dummy posts in tests/fixtures/content/
// (vite.config.mjs): four published ones and a draft
const SCRAMBLE = '/2023-08-04-a-scramble';

module('Acceptance | blog', function (hooks) {
  setupApplicationTest(hooks);

  test('the index lists the posts, newest first', async function (assert) {
    await visit('/');

    const ids = [...document.querySelectorAll('[data-test-post]')].map(
      (element) => element.getAttribute('data-test-post') ?? '',
    );

    assert.deepEqual(ids, [
      '2023-08-04-a-scramble',
      '2022-07-03-big-skyrace',
      '2021-06-02-second-munro',
      '2020-05-01-first-munro',
    ]);
  });

  test('a post renders its content and tags', async function (assert) {
    await visit(SCRAMBLE);

    assert.dom('h1').hasText('T6: A scramble');
    assert.dom('.prose p').exists();
    assert
      .dom('.prose a[href="/2020-05-01-first-munro"]')
      .exists('a link to ../<id>/index.md is the post URL');
    assert.dom('a[href="/?tags=rating%2F4-stars"]').hasText('★★★★☆');
    assert.dom('a[href^="/author/"]').doesNotExist('no author byline');
    assert.dom('[data-test-owner]').hasAttribute('href', '/page/about');
  });

  test('the sidebar has a tag cloud sized by use', async function (assert) {
    await visit('/');

    const size = (id: string) =>
      parseFloat(
        getComputedStyle(
          document.querySelector(`[data-test-cloud-tag="${id}"]`)!,
        ).fontSize,
      );

    assert
      .dom('[data-test-cloud-tag="munro"]')
      .hasText('Munro')
      .hasAttribute('href', '/?tags=munro');
    assert
      .dom('[data-test-tag-cloud] [data-test-cloud-tag="country/norway"]')
      .doesNotExist('a group has its own heading');
    assert.dom('[data-test-tag-group="country"]').hasText('Country');
    assert.deepEqual(
      [
        ...document.querySelectorAll(
          '[data-test-tag-group="country"] + ul [data-test-cloud-tag]',
        ),
      ].map((tag) => tag.textContent?.trim()),
      ['Norway', 'Scotland', 'Switzerland'],
      'in alphabetical order',
    );
    assert.true(size('munro') > size('shoes'), 'more posts, bigger tag');
  });

  test('a tag without a name shows its id in words', async function (assert) {
    await visit('/');

    assert
      .dom('[data-test-cloud-tag="trail-running"]')
      .hasText('Trail Running');
    assert.dom('[data-test-tag-group="season"]').hasText('Season');
    assert.dom('[data-test-cloud-tag="season/winter"]').hasText('Winter');

    await visit('/2022-07-03-big-skyrace');

    assert.dom('a[href="/?tags=trail-running"]').hasText('Trail Running');
  });

  test('a code block shows the name of its file', async function (assert) {
    await visit('/2023-08-04-a-scramble');

    assert.dom('figure.code-file figcaption').hasText('gear.yaml');
    assert.dom('figure.code-file pre code').hasText('spikes: true');
  });

  test('the rating in the facts is a filter, best first', async function (assert) {
    await visit('/');

    assert
      .dom('[data-test-filters] [data-test-tag-group="rating"]')
      .hasText('Rating');
    assert
      .dom('[data-test-tag-cloud] [data-test-cloud-tag="rating/4-stars"]')
      .doesNotExist('not a tag');
    assert.deepEqual(
      [
        ...document.querySelectorAll(
          '[data-test-tag-group="rating"] + ul [data-test-cloud-tag]',
        ),
      ].map((tag) => tag.textContent?.trim()),
      ['★★★★★', '★★★★☆', '★★☆☆☆'],
    );

    await click('[data-test-cloud-tag="rating/4-stars"]');

    assert.dom('[data-test-post]').exists({ count: 2 });

    await visit('/2023-08-04-a-scramble');

    assert
      .dom('[data-test-fact="Rating"] a')
      .hasText('★★★★☆')
      .hasAttribute('href', '/?tags=rating%2F4-stars');
  });

  test('photos next to the Markdown get bundled URLs', async function (assert) {
    // A photo in the text, and the gallery
    await visit(SCRAMBLE);

    const sources = [
      ...document.querySelectorAll('.prose img, [data-test-gallery] img'),
    ].map((img) => img.getAttribute('src') ?? '');

    assert.strictEqual(sources.length, 4);
    assert.true(
      sources.every((src) => !src.startsWith('./') && !src.includes('__ASSET')),
      sources.join(', '),
    );
  });

  test('the sidebar tags filter the posts, all of them at once', async function (assert) {
    await visit('/');
    await click('[data-test-cloud-tag="munro"]');

    assert.strictEqual(currentURL(), '/?tags=munro');
    assert.dom('[data-test-post]').exists({ count: 3 });
    assert
      .dom('[data-test-cloud-tag="rating/5-stars"]')
      .hasAttribute('data-test-leads-nowhere', '', 'no ★★★★★ Munro yet');
    assert
      .dom('[data-test-cloud-tag="rating/2-stars"]')
      .doesNotHaveAttribute('data-test-leads-nowhere', 'but ★★☆☆☆ ones');

    await click('[data-test-cloud-tag="rating/4-stars"]');

    assert.strictEqual(currentURL(), '/?tags=munro%2Crating%2F4-stars');
    assert.dom('[data-test-post]').exists({ count: 2 }, 'Munros AND ★★★★☆');
    assert.dom('[data-test-filter-tag]').exists({ count: 2 });
    assert
      .dom('[data-test-cloud-tag="munro"]')
      .hasAttribute('data-test-selected');

    await click('[data-test-cloud-tag="munro"]');

    assert.strictEqual(
      currentURL(),
      '/?tags=rating%2F4-stars',
      'a selected tag toggles off',
    );

    await click('[data-test-filter-clear]');

    assert.strictEqual(currentURL(), '/');
    assert.dom('[data-test-filter]').doesNotExist();
  });

  test('the facts filter the posts too, in intervals', async function (assert) {
    // The dummy posts have 1100 m, 1750 m and 2500 m of ascent
    await visit('/');

    assert.dom('[data-test-tag-group="ascent"]').hasText('Altitude gain');
    assert
      .dom('[data-test-cloud-tag="ascent/under-1500m"]')
      .hasText('< 1500 m');
    assert
      .dom('[data-test-cloud-tag="ascent/under-2000m"]')
      .hasText('< 2000 m');
    assert
      .dom('[data-test-cloud-tag="ascent/over-2000m"]')
      .hasText('> 2000 m', 'the last interval is open');

    await click('[data-test-cloud-tag="ascent/under-2000m"]');

    assert.strictEqual(currentURL(), '/?tags=ascent%2Funder-2000m');
    assert
      .dom('[data-test-post]')
      .exists({ count: 1 }, 'only 1500 to 2000 m, not the one under 1500 m');
    assert.dom('[data-test-filter-tag]').hasText('< 2000 m×');

    await visit('/?tags=ascent/over-2000m');

    assert.dom('[data-test-post]').exists({ count: 1 });

    // 1750 m over 12.5 km
    assert
      .dom('[data-test-cloud-tag="gradient/under-15pct"]')
      .hasText('< 15 %', 'the gradient is ascent over distance');
  });

  test('the mobile menu opens the sidebar in a drawer', async function (assert) {
    await visit('/');
    await click('[data-test-menu-button]');

    assert.dom('[data-test-mobile-nav]').exists();
    assert.dom('[data-test-show-posts]').hasText('Show 4 adventures');

    await click('[data-test-mobile-nav] [data-test-cloud-tag="munro"]');

    assert.strictEqual(currentURL(), '/?tags=munro');
    assert
      .dom('[data-test-mobile-nav]')
      .exists('picking a tag keeps the drawer open');
    assert.dom('[data-test-show-posts]').hasText('Show 3 adventures');

    await click('[data-test-show-posts]');

    assert.dom('[data-test-mobile-nav]').doesNotExist();
    assert.dom('[data-test-post]').exists({ count: 3 });
  });

  test('a tap opens the mobile menu and leaves it open', async function (assert) {
    await visit('/');

    // A finger: pointerdown and pointerup, then the click the browser sends
    // after them, which must not close the drawer it just opened
    const touch = { pointerType: 'touch', isPrimary: true };

    await triggerEvent('[data-test-menu-button]', 'pointerdown', touch);
    await triggerEvent('[data-test-menu-button]', 'pointerup', touch);
    await click('[data-test-menu-button]');

    assert.dom('[data-test-mobile-nav]').exists();
  });

  test('a filter nothing matches says so', async function (assert) {
    await visit('/?tags=munro,rating/5-stars');

    assert.dom('[data-test-post]').doesNotExist();
    assert.dom('[data-test-no-posts]').exists();
  });

  test('the menu links to the pages of site.yaml', async function (assert) {
    await visit('/');
    await click('[data-test-explore] a[href="/page/about"]');

    assert.strictEqual(currentURL(), '/page/about');
    assert.dom('h1').hasText('About me');
  });

  test('All adventures in Explore lists every post, without the filter', async function (assert) {
    await visit('/?tags=munro');
    await click('[data-test-explore] [data-test-all-adventures]');

    assert.strictEqual(currentURL(), '/');
    assert.dom('[data-test-filter]').doesNotExist();
    assert.dom('[data-test-post]').exists({ count: 4 });
  });

  test('a post asks for a note by email instead of comments', async function (assert) {
    await visit(SCRAMBLE);

    const href = document
      .querySelector('[data-test-feedback-link]')!
      .getAttribute('href')!;
    const url = new URL(href);

    assert.strictEqual(url.protocol, 'mailto:');
    assert.strictEqual(url.pathname, 'writer@example.com');
    assert.strictEqual(url.searchParams.get('subject'), 'T6: A scramble');
    assert.strictEqual(
      url.searchParams.get('body'),
      'Hi Test,\r\n\r\nI read your article "T6: A scramble" (https://blog.example.com/trips/2023-08-04-a-scramble) and I wanted to say:\r\n\r\n[fill in your text here]\r\n',
    );
  });

  test('an unknown post is a 404', async function (assert) {
    await visit('/no-such-post');

    assert.dom('[data-test-not-found]').exists();
    assert
      .dom('[data-test-not-found] h1')
      .hasText('Lost in the fog', "the blog's languages/en.yaml wins");
    assert
      .dom('[data-test-not-found] a')
      .hasText('Back to all adventures', 'the rest is the core');
  });

  test('navigating from the index to a post', async function (assert) {
    await visit('/');
    await click('[data-test-post="2020-05-01-first-munro"] h2 a');

    assert.strictEqual(currentURL(), '/2020-05-01-first-munro');
    assert.dom('h1').hasText('The first Munro');
  });

  test('the gallery folder: file names are the captions, in the order of their numbers', async function (assert) {
    await visit(SCRAMBLE);

    const alts = [
      ...document.querySelectorAll('[data-test-gallery-photo] img'),
    ].map((img) => img.getAttribute('alt'));

    assert.deepEqual(alts, [
      'The first photo',
      'A grey ridge under cloud',
      'The third photo',
    ]);
  });

  test('a photo from the gallery opens in a lightbox', async function (assert) {
    await visit(SCRAMBLE);

    assert.dom('[data-test-gallery-photo]').exists({ count: 3 });
    assert.dom('[data-test-lightbox]').doesNotExist();

    await click('[data-test-gallery-photo]');

    assert.dom('[data-test-lightbox]').exists();
    assert.true(
      (document.querySelector('[data-test-lightbox]') as HTMLDialogElement)
        .open,
      'opens as a modal dialog',
    );
    assert.dom('[data-test-lightbox-position]').hasText('1 / 3');
    assert.dom('[data-test-lightbox-caption]').hasAnyText();

    await click('[data-test-lightbox-next]');
    assert.dom('[data-test-lightbox-position]').hasText('2 / 3');

    await triggerKeyEvent('[data-test-lightbox]', 'keydown', 'ArrowLeft');
    await triggerKeyEvent('[data-test-lightbox]', 'keydown', 'ArrowLeft');
    assert
      .dom('[data-test-lightbox-position]')
      .hasText('3 / 3', 'wraps around');

    await click('[data-test-lightbox-close]');
    assert.dom('[data-test-lightbox]').doesNotExist();
  });

  test('a post shows its facts before the story', async function (assert) {
    await visit(SCRAMBLE);

    assert.dom('[data-test-facts]').exists();
    assert.dom('[data-test-fact="Ascent"] td').hasText('1,750 m');
    assert.dom('[data-test-fact="Duration"] td').hasText('5 h 36 min');
    assert
      .dom('[data-test-fact="Points"] td')
      .hasText('The bottom (900 m) → The top (2,650 m)');
    assert
      .dom('[data-test-fact="Grade"] a')
      .hasText('T6')
      .hasAttribute('href', /SAC-Wanderskala/);
    assert.dom('[data-test-fact="Links"] td').hasText('Route · Strava');
  });

  test('posts can be filtered by their facts', async function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { content } = await store.request(allPosts());

    const bigClimbs = content.data
      .filter((post) => (post.facts?.ascent ?? 0) > 2000)
      .map((post) => post.id);

    assert.deepEqual(bigClimbs, ['2022-07-03-big-skyrace']);
  });

  test('the alps theme names the section over the mountains', async function (assert) {
    await visit('/');
    assert.dom('[data-test-section]').hasText('Adventures');

    await visit(SCRAMBLE);
    assert.dom('[data-test-section]').hasText('Adventures', 'a post');

    await visit('/page/about');
    assert.dom('[data-test-section]').hasText('About me', "a page's title");

    await visit('/no-such-post');
    assert
      .dom('[data-test-section]')
      .hasText('Not found', 'a post that isn’t there');
  });

  test('the theme switcher changes the theme and remembers it', async function (assert) {
    const html = document.documentElement;
    const theme = html.dataset['theme'];

    try {
      await visit('/');
      assert
        .dom('[data-test-theme-switcher] [data-test-theme]')
        .exists({ count: 3 });

      await click('[data-test-theme-switcher] [data-test-theme="night"]');

      assert.strictEqual(html.dataset['theme'], 'night');
      assert
        .dom('[data-test-theme-switcher] [data-test-theme="night"]')
        .hasAttribute('aria-pressed', 'true');
      assert.strictEqual(localStorage.getItem('cowtent-theme:/'), 'night');
    } finally {
      if (theme) html.dataset['theme'] = theme;
      localStorage.removeItem('cowtent-theme:/');
    }
  });

  test('an embedded GPX is the route on the swisstopo map', async function (assert) {
    await visit(SCRAMBLE);

    assert
      .dom('figure.route iframe')
      .hasAttribute('title', 'Up the gully')
      .hasAttribute(
        'src',
        /^https:\/\/map\.geo\.admin\.ch\/#\/embed\?lang=en&/,
      );
    assert
      .dom('figure.route figcaption a[download]')
      .hasText('Download the GPX');
    assert
      .dom('.prose a:not([download])[href$=".gpx"]')
      .hasText('the GPX file', 'a linked GPX stays a link');
  });

  test('a list item with a symbol in brackets gets its badge', async function (assert) {
    await visit(SCRAMBLE);

    const checks = [...document.querySelectorAll('.prose li.check')].map(
      (item) => item.getAttribute('data-check'),
    );

    assert.deepEqual(checks, [
      'done',
      'minus',
      'plus',
      'todo',
      'question',
      'important',
      'information',
      'star',
    ]);
    assert.dom('li.check input').doesNotExist('no checkbox of its own');
    assert
      .dom('li[data-check="done"] .check-mark')
      .hasAttribute('aria-label', 'Done');
    assert
      .dom('li[data-check="minus"]')
      .hasText('No ice axe', 'the symbol is taken off the text');
    assert
      .dom('li[data-check="done"] br')
      .exists('a new line in an item stays a new line');
    assert.deepEqual(
      [...document.querySelectorAll('.prose li:not(.check)')].map((item) =>
        item.textContent.trim(),
      ),
      ['[z] An unknown symbol stays text', 'A plain bullet'],
      'an unknown symbol and a plain bullet stay as they are',
    );
  });

  test('a draft is left out of a build', async function (assert) {
    await visit('/');

    assert.dom('[data-test-post="2024-09-05-a-draft"]').doesNotExist();
    assert.dom('[data-test-draft]').doesNotExist();
    assert
      .dom('[data-test-cloud-tag="tip"]')
      .doesNotExist('its tags are not in the cloud');

    await visit('/2024-09-05-a-draft');

    assert.dom('[data-test-not-found]').exists();
  });
});
