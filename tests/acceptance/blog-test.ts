import { module, test } from 'qunit';
import {
  click,
  currentURL,
  find,
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
      ...document.querySelectorAll(
        '.prose img:not(.route-map img), [data-test-gallery] img',
      ),
    ].map((img) => img.getAttribute('src') ?? '');

    assert.strictEqual(sources.length, 5);
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

  test('a post on the front page has its tags, then its filters', async function (assert) {
    await visit('/');

    const card = '[data-test-post="2022-07-03-big-skyrace"]';
    const chips = [
      ...document.querySelectorAll(`${card} [data-test-post-tag]`),
    ];

    assert.deepEqual(
      chips.map((chip) => chip.getAttribute('data-test-post-tag')),
      [
        'race',
        'running',
        'trail-running',
        'country/norway',
        'rating/5-stars',
        'ascent/over-2000m',
      ],
    );
    assert
      .dom(`${card} [data-test-post-tag="ascent/over-2000m"]`)
      .hasText('> 2000 m');

    await click(`${card} [data-test-post-tag="ascent/over-2000m"]`);

    assert.strictEqual(currentURL(), '/?tags=ascent%2Fover-2000m');
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
    assert.dom('h1').hasText('Test Writer');
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

  test('the photo named cover is the cover, the rest of its name after " - " the alt text', async function (assert) {
    await visit(SCRAMBLE);
    assert.dom('img[data-test-cover]').hasAttribute('alt', 'Hands on the rock');

    await visit('/2020-05-01-first-munro');
    assert.dom('img[data-test-cover]').hasAttribute('alt', '');

    await visit('/2024-09-05-a-draft');
    assert.dom('img[data-test-cover]').doesNotExist('no photo, no cover');
  });

  test('the gallery: the cover first, then the gallery folder, its file names the captions, in the order of their numbers', async function (assert) {
    await visit(SCRAMBLE);

    const alts = [
      ...document.querySelectorAll('[data-test-gallery-photo] img'),
    ].map((img) => img.getAttribute('alt'));

    assert.deepEqual(alts, [
      'Hands on the rock',
      'The first photo',
      'A grey ridge under cloud',
      'The third photo',
    ]);
  });

  test('a photo from the gallery opens in a lightbox', async function (assert) {
    await visit(SCRAMBLE);

    assert.dom('[data-test-gallery-photo]').exists({ count: 4 });
    assert.dom('[data-test-lightbox]').doesNotExist();

    await click('[data-test-gallery-photo]');

    assert
      .dom('[data-test-lightbox]')
      .exists()
      .hasAttribute('aria-modal', 'true', 'opens as a modal dialog');
    assert.dom('[data-test-lightbox-label]').hasText('1 / 4');
    assert.dom('[data-test-lightbox-caption]').hasAnyText();
    assert.true(currentURL().includes('photo=1'), 'the photo in the address');
    assert.true(currentURL().includes('view=photo'), 'open');

    await click('[data-test-lightbox-next]');
    assert.dom('[data-test-lightbox-label]').hasText('2 / 4');

    await triggerKeyEvent('[data-test-lightbox]', 'keydown', 'ArrowLeft');
    await triggerKeyEvent('[data-test-lightbox]', 'keydown', 'ArrowLeft');
    assert.dom('[data-test-lightbox-label]').hasText('4 / 4', 'wraps around');

    await click('[data-test-lightbox-close]');
    assert.dom('[data-test-lightbox]').doesNotExist();
    assert.false(currentURL().includes('view='), 'and out of the address');
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
    assert
      .dom('[data-test-fact-route] a[download]')
      .hasText('Download the GPX', "route.gpx's download is the last fact")
      .hasAttribute('href', /\/route-[\w-]+\.gpx$/);
    assert
      .dom('[data-test-fact-route] a[href^="https://map.geo.admin.ch/#/map?"]')
      .hasText('map.geo.admin.ch');
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
    assert
      .dom('[data-test-section]')
      .hasText('About me', "a page's label in the menu, not its title");

    await visit('/no-such-post');
    assert
      .dom('[data-test-section]')
      .hasText('Not found', 'a post that isn’t there');
  });

  test('the alps theme keeps the title of a post or page under the band', async function (assert) {
    for (const url of [SCRAMBLE, '/page/about']) {
      await visit(url);

      assert.strictEqual(
        getComputedStyle(find('main > article > h1')!).position,
        'sticky',
        url,
      );
    }
  });

  test('the theme switcher changes the theme and remembers it', async function (assert) {
    try {
      await visit('/');
      assert
        .dom('[data-test-theme-switcher] [data-test-theme]')
        .exists({ count: 3 });
      assert.dom('[data-test-band]').exists('the alps layout');

      await click('[data-test-theme-switcher] [data-test-theme="night"]');

      assert.dom('[data-test-band]').doesNotExist();
      assert.dom('[data-test-topbar]').exists('swapped for the night layout');
      assert
        .dom('[data-test-theme-switcher] [data-test-theme="night"]')
        .hasAttribute('aria-pressed', 'true');
      assert.strictEqual(localStorage.getItem('cowtent-theme:/'), 'night');
      assert.strictEqual(
        getComputedStyle(document.documentElement).colorScheme,
        'dark',
        'its colours on <html>',
      );
    } finally {
      localStorage.removeItem('cowtent-theme:/');
    }
  });

  test("a post's route.gpx is a map above the gallery, with its points and photos", async function (assert) {
    await visit(SCRAMBLE);

    assert
      .dom('[data-test-route] .route-map')
      .hasClass('leaflet-container', 'the map is drawn');
    assert
      .dom('[data-test-route] + [data-test-gallery]')
      .exists('right above the gallery');
    assert
      .dom('[data-test-route] .route-point')
      .exists({ count: 1 }, 'the point with a latitude and longitude');
    assert
      .dom('[data-test-route] .route-photo')
      .exists({ count: 2 }, 'the cover and the photo with GPS')
      .hasAttribute('title', 'Hands on the rock', 'the cover first');
    assert
      .dom('[data-test-route] .leaflet-control-layers')
      .includesText('Route')
      .includesText('Photos')
      .includesText('Points');
    assert
      .dom('[data-test-route] figcaption')
      .doesNotExist('its links are in the facts');

    await click('[data-test-route] .route-photo');

    assert
      .dom('[data-test-lightbox] img')
      .hasAttribute('alt', 'Hands on the rock', "the photo's pin opens it");
  });

  test('a photo with GPS is shown on the map, one lightbox at a time', async function (assert) {
    await visit(SCRAMBLE);

    await click('[data-test-gallery-photo]');
    assert.dom('[data-test-lightbox-on-map]').hasText('Show on the map');

    await click('[data-test-lightbox-on-map]');
    assert.dom('[data-test-route-lightbox]').exists("the map's lightbox");
    assert
      .dom('[data-test-lightbox-caption]')
      .doesNotExist("in the photo's place");
    assert
      .dom('.route-map-lightbox .route-photo.is-shown')
      .hasAttribute('title', 'Hands on the rock', 'the photo stands out on it');
    assert
      .dom('[data-test-route] figure .route-photo.is-shown')
      .exists("and on the page's map");
    assert.true(
      ['view=map', 'photo=1', 'lat=', 'lng=', 'zoom=16'].every((part) =>
        currentURL().includes(part),
      ),
      'at the photo, in the address',
    );

    await click('.route-map-lightbox .route-photo');
    assert.dom('[data-test-route-lightbox]').doesNotExist();
    assert
      .dom('[data-test-lightbox] img')
      .hasAttribute(
        'alt',
        'Hands on the rock',
        'its pin opens the photo instead',
      );

    await click('[data-test-lightbox-next]');
    assert.dom('[data-test-lightbox-on-map]').exists('the next one has GPS');

    await click('[data-test-lightbox-next]');
    assert
      .dom('[data-test-lightbox-on-map]')
      .doesNotExist('a photo without GPS has no way to the map');
  });

  test("the address keeps the post's map, photo and switches", async function (assert) {
    await visit(
      `${SCRAMBLE}?lat=46.5&lng=8.0&zoom=15&photo=1&view=map&hide=points`,
    );

    assert.dom('[data-test-route-lightbox]').exists('the lightbox it says');
    assert
      .dom('.route-map-lightbox .route-photo.is-shown')
      .exists('the photo it says');
    assert
      .dom('[data-test-route] .route-point')
      .doesNotExist('without the points it switched off');

    await click('[data-test-lightbox-close]');
    assert.false(currentURL().includes('view='), 'closed');
    assert.true(currentURL().includes('zoom=15'), 'the map where it was');

    // A switch on one map is a switch on the other
    const points = [
      ...document.querySelectorAll<HTMLInputElement>(
        '[data-test-route] figure .leaflet-control-layers input',
      ),
    ].find((input) => input.parentElement?.textContent?.includes('Points'));

    await click(points!);
    assert.dom('[data-test-route] figure .route-point').exists();
    assert.false(currentURL().includes('hide='), 'all on again');

    await click('[data-test-route] figure .route-enlarge');
    assert.dom('[data-test-route-lightbox]').exists('the button opens it');
    assert.dom('.route-map-lightbox .route-point').exists('the same');
  });

  test('a GPX embedded in the text is a map of only its track', async function (assert) {
    await visit(SCRAMBLE);

    assert
      .dom('.prose figure.route .route-map')
      .hasClass('leaflet-container')
      .hasAttribute('aria-label', 'Up the gully');
    assert.dom('.prose .route-point').doesNotExist();
    assert.dom('.prose .route-photo').doesNotExist();
    assert
      .dom('.prose figure.route figcaption a[download]')
      .hasText('Download the GPX');
    assert
      .dom('.prose p > a[href$=".gpx"]')
      .hasText('the GPX file', 'a linked GPX stays a link');
  });

  test('a post without route.gpx has no map', async function (assert) {
    await visit('/2020-05-01-first-munro');

    assert.dom('[data-test-route]').doesNotExist();
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
