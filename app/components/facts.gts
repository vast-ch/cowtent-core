import { htmlSafe } from '@ember/template';

import { t } from 'ember-intl';

import { routeClasses } from '../content/route-colours.ts';

import type { TOC } from '@ember/component/template-only';

import type { PostRoute } from '../content/route.ts';
import type { Facts as FactsData } from '../content/schemas.ts';

const TH = 'w-1/3 py-2 pr-4 align-top font-medium text-slate-900';
const TD =
  'py-2 align-top [&_a]:text-colour-1-700 [&_a]:underline hover:[&_a]:text-colour-1-900';

const isMany = (routes?: PostRoute[]) => (routes?.length ?? 0) > 1;
const plusOne = (index: number) => index + 1;
// The colour of its line on the map (app/content/route-colours.ts)
const dot = (index: number) =>
  `mr-1 inline-block size-2.5 rounded-full ${routeClasses(index).bg}`;

/**
 * A post's `facts:` front matter as a table, before the story. The rows are
 * formatted at build time (lib/facts.mjs); values may hold links. With
 * routes, the last row is theirs: each GPX to download, with a dot of its
 * colour on the map, "Route 1 · Route 2 · …" when there are more.
 */
export const Facts: TOC<{
  Args: { facts?: FactsData; routes?: PostRoute[] };
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
        {{#if @routes.length}}
          <tr data-test-fact-route>
            <th scope="row" class={{TH}}>{{t "post.facts.route"}}</th>
            <td class={{TD}}>
              {{#each @routes as |route index|}}
                {{if index " · "}}<a
                  href={{route.gpx}}
                  download
                  title={{t "post.route.download"}}
                  class="whitespace-nowrap"
                  data-test-route-download
                ><span class={{dot index}} aria-hidden="true"></span>{{#if
                    (isMany @routes)
                  }}{{t "post.facts.route"}}
                    {{plusOne index}}{{else}}{{t
                      "post.route.download"
                    }}{{/if}}</a>
              {{/each}}
            </td>
          </tr>
        {{/if}}
      </tbody>
    </table>
  </section>
</template>;
