import Component from '@glimmer/component';
import { hash } from '@ember/helper';
import { LinkTo } from '@ember/routing';
import { service } from '@ember/service';

import { t } from 'ember-intl';

import {
  FILTER_GROUPS_USED,
  leadsNowhere,
  TAG_CLOUD,
  TAG_GROUPS,
  tagKey,
  tagValue,
} from '../content/tag-cloud.ts';
import { currentTags, toggleTag } from '../content/tag-filter.ts';

import type { TOC } from '@ember/component/template-only';
import type RouterService from '@ember/routing/router-service';
import type { CloudTag, TagGroup } from '../content/tag-cloud.ts';

const eq = (a: unknown, b: unknown) => a === b;

const Groups: TOC<{ Args: { groups: TagGroup[]; selected: string[] } }> =
  <template>
    {{#each @groups as |group|}}
      <h3
        class="mt-6 text-xs/6 font-semibold tracking-wide text-stone-500 uppercase"
        data-test-tag-group={{group.id}}
      >{{t (tagKey group.id)}}</h3>
      <ul
        role="list"
        class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 leading-none font-medium"
      >
        {{#each group.tags as |tag|}}
          <li><TagLink @tag={{tag}} @selected={{@selected}} /></li>
        {{/each}}
      </ul>
    {{/each}}
  </template>;
const includes = (list: string[], item: string) => list.includes(item);

const TagLink: TOC<{
  Args: { tag: CloudTag; selected: string[] };
}> = <template>
  <LinkTo
    @route="index"
    @query={{hash tags=(toggleTag @selected @tag.id)}}
    class="{{@tag.size}}
      {{@tag.colour}}
      {{if
        (includes @selected @tag.id)
        'rounded-md bg-current/10 px-1.5 py-0.5 ring-1 ring-current'
        'hover:underline'
      }}
      {{if (leadsNowhere @selected @tag.id) 'line-through opacity-50'}}"
    title="{{@tag.count}} {{if (eq @tag.count 1) 'post' 'posts'}}"
    data-test-selected={{includes @selected @tag.id}}
    data-test-leads-nowhere={{leadsNowhere @selected @tag.id}}
    data-test-cloud-tag={{@tag.id}}
  >{{t (tagKey @tag.id) value=(tagValue @tag.id)}}</LinkTo>
</template>;

/**
 * The tags in the sidebar, as a filter of the front page: each one adds
 * itself to the `tags` query parameter, or takes itself out, and the
 * front page lists the posts that have all of them. Tags in a group
 * (country/norway) are under its name, after the cloud. Under Filters,
 * the ones from the facts: Rating, Altitude gain, Distance, Time, Gradient.
 */
export class TagFilter extends Component<{ Element: HTMLElement }> {
  @service declare router: RouterService;

  get selected() {
    return currentTags(this.router);
  }

  <template>
    <section ...attributes>
      <h2 class="font-display text-xl font-semibold text-stone-900">{{t
          "sidebar.tags"
        }}</h2>
      <ul
        role="list"
        class="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 leading-none font-medium"
        data-test-tag-cloud
      >
        {{#each TAG_CLOUD as |tag|}}
          <li><TagLink @tag={{tag}} @selected={{this.selected}} /></li>
        {{/each}}
      </ul>

      <Groups @groups={{TAG_GROUPS}} @selected={{this.selected}} />
    </section>

    {{#if FILTER_GROUPS_USED.length}}
      <section class="mt-10" data-test-filters>
        <h2 class="font-display text-xl font-semibold text-stone-900">
          {{t "sidebar.filters"}}
        </h2>
        <Groups @groups={{FILTER_GROUPS_USED}} @selected={{this.selected}} />
      </section>
    {{/if}}
  </template>
}
