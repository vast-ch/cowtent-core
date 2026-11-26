import { htmlSafe } from '@ember/template';

import { t } from 'ember-intl';

import type { TOC } from '@ember/component/template-only';

const TH = 'w-1/3 py-2 pr-4 align-top font-medium text-slate-900';
const TD =
  'py-2 align-top [&_a]:text-colour-1-700 [&_a]:underline hover:[&_a]:text-colour-1-900';
import type { PostRoute } from '../content/route.ts';
import type { Facts as FactsData } from '../content/schemas.ts';

/**
 * A post's `facts:` front matter as a table, before the story. The rows are
 * formatted at build time (lib/facts.mjs); values may hold links. With a
 * route.gpx, its last row is the route: the file to download and the
 * route on map.geo.admin.ch.
 */
export const Facts: TOC<{
  Args: { facts?: FactsData; route?: PostRoute };
}> = <template>
  <section class="mb-12" aria-labelledby="facts-title" data-test-facts>
    <h2 id="facts-title" class="section-heading">
      {{t "post.facts.heading"}}
    </h2>
    <table class="mt-6 w-full text-left text-sm/6 text-slate-700">
      <tbody class="divide-y divide-slate-200">
        {{#each @facts.rows as |row|}}
          <tr data-test-fact={{row.label}}>
            <th scope="row" class={{TH}}>{{row.label}}</th>
            <td class={{TD}}>{{htmlSafe row.html}}</td>
          </tr>
        {{/each}}
        {{#if @route}}
          <tr data-test-fact-route>
            <th scope="row" class={{TH}}>{{t "post.facts.route"}}</th>
            <td class={{TD}}>
              <a href={{@route.gpx}} download>{{t "post.route.download"}}</a>
              ·
              <a href={{@route.map}}>map.geo.admin.ch</a>
            </td>
          </tr>
        {{/if}}
      </tbody>
    </table>
  </section>
</template>;
