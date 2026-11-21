import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { LinkTo } from '@ember/routing';
import { on } from '@ember/modifier';
import { service } from '@ember/service';

import { ResponsiveImage } from '@responsive-image/ember';
import { Button } from 'frontile/buttons';
import { Drawer } from 'frontile/overlays';

import { t } from 'ember-intl';

import site from 'virtual:blog-site';
import cover from 'virtual:blog-cover';
import { matchingCount } from '../content/tag-cloud.ts';
import { currentTags } from '../content/tag-filter.ts';
import { Explore } from './explore.gts';
import { TagFilter } from './tag-filter.gts';
import { ThemeSwitcher } from './theme-switcher.gts';

import type RouterService from '@ember/routing/router-service';

/**
 * Below lg, the sidebar would push the posts a screen down: instead a bar
 * at the top, whose menu button opens the sidebar's links and tags in a
 * drawer from the left (Frontile's navigation drawer). Tags don't close
 * it, so several can be picked; the footer button shows the result.
 */
export class MobileNav extends Component<{ Element: HTMLDivElement }> {
  @service declare router: RouterService;

  @tracked isOpen = false;

  open = () => {
    this.isOpen = true;
  };

  close = () => {
    this.isOpen = false;
  };

  // From a post, the front page with what the tags picked
  showPosts = () => {
    this.close();

    if (this.router.currentRouteName !== 'index') {
      void this.router.transitionTo('index');
    }
  };

  get selected() {
    return currentTags(this.router);
  }

  get matching() {
    return matchingCount(this.selected);
  }

  <template>
    <div
      class="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:hidden"
      ...attributes
    >
      {{! Opens on click, not @onPress: a tap's click comes after pointerup,
          and would land on the backdrop of the just-opened drawer and close
          it again (Frontile 0.18.10 stops it too late) }}
      <Button
        @variant="plain"
        @size="sm"
        {{on "click" this.open}}
        aria-label={{t "sidebar.menu"}}
        aria-expanded={{if this.isOpen "true" "false"}}
        @class="relative -ml-2"
        data-test-menu-button
      >
        <svg
          class="size-6 text-slate-900"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        {{#if this.selected.length}}
          <span
            class="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-accent-600 text-[10px] font-bold text-white"
            aria-label={{t
              "sidebar.filters-selected"
              count=this.selected.length
            }}
          >{{this.selected.length}}</span>
        {{/if}}
      </Button>
      <LinkTo
        @route="index"
        class="flex min-w-0 items-center gap-2.5 font-bold text-slate-900"
      >
        <span
          class="relative size-8 shrink-0 overflow-hidden rounded-full ring-1 ring-black/10"
        >
          <ResponsiveImage
            @src={{cover}}
            @width={{32}}
            alt=""
            class="size-full object-cover"
          />
        </span>
        <span class="truncate">{{site.title}}</span>
      </LinkTo>
    </div>

    <Drawer
      @isOpen={{this.isOpen}}
      @onClose={{this.close}}
      @placement="left"
      @size="sm"
      @backdrop="faded"
      @variant="flat"
      as |d|
    >
      <d.Header @title={{site.title}} @description={{site.description}} />
      <d.Body>
        <div data-test-mobile-nav>
          <Explore @onNavigate={{this.close}} />
          <TagFilter class="mt-10" />
          {{#if site.themeSwitcher}}
            <ThemeSwitcher class="mt-10" />
          {{/if}}
        </div>
      </d.Body>
      <d.Footer>
        <Button
          @variant="custom"
          @onPress={{this.showPosts}}
          @class="w-full rounded-full bg-primary px-4 py-2.5 font-sans font-semibold text-on-primary hover:bg-primary-firm"
          data-test-show-posts
        >
          {{t "sidebar.show-posts" count=this.matching}}
        </Button>
      </d.Footer>
    </Drawer>
  </template>
}
