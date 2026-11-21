import { htmlSafe } from '@ember/template';

import { t } from 'ember-intl';

import type { TOC } from '@ember/component/template-only';
import type { Facts as FactsData } from '../content/schemas.ts';

/**
 * A post's `facts:` front matter as a table, before the story. The rows are
 * formatted at build time (lib/facts.mjs); values may hold links.
 */
export const Facts: TOC<{ Args: { facts: FactsData } }> = <template>
  <section class="mb-12" aria-labelledby="facts-title" data-test-facts>
    <h2 id="facts-title" class="section-heading">
      {{t "post.facts.heading"}}
    </h2>
    <table class="mt-6 w-full text-left text-sm/6 text-slate-700">
      <tbody class="divide-y divide-slate-200">
        {{#each @facts.rows as |row|}}
          <tr data-test-fact={{row.label}}>
            <th
              scope="row"
              class="w-1/3 py-2 pr-4 align-top font-medium text-slate-900"
            >{{row.label}}</th>
            <td
              class="py-2 align-top [&_a]:text-accent-700 [&_a]:underline hover:[&_a]:text-accent-900"
            >{{htmlSafe row.html}}</td>
          </tr>
        {{/each}}
      </tbody>
    </table>
  </section>
</template>;
