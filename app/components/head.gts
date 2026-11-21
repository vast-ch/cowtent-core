import site from 'virtual:blog-site';

import type { TOC } from '@ember/component/template-only';

const describe = (text?: string) => text || site.description;
// Photo URLs start with the site's base already (/blog/assets/…)
const absolute = (path?: string) =>
  path?.startsWith('/') ? new URL(path, site.host).href : path;
const head = () => document.head;

// These components exist to write <meta> tags
const OpenGraph: TOC<{ Args: { property: string; content?: string } }> =
  <template>
    {{! template-lint-disable no-forbidden-elements }}
    {{! @glint-expect-error RDFa's property attribute is not in the meta types }}
    <meta property={{@property}} content={{@content}} />
  </template>;

/**
 * Search engines and link previews read these from the prerendered HTML.
 */
export const Head: TOC<{
  Args: {
    title?: string;
    description?: string;
    image?: string;
    path: string;
    type?: string;
  };
}> = <template>
  {{! template-lint-disable no-forbidden-elements }}
  {{#in-element (head) insertBefore=null}}
    <meta name="description" content={{describe @description}} />
    <link rel="canonical" href="{{site.host}}{{@path}}" />
    <OpenGraph @property="og:site_name" @content={{site.title}} />
    <OpenGraph @property="og:title" @content={{if @title @title site.title}} />
    <OpenGraph @property="og:description" @content={{describe @description}} />
    <OpenGraph @property="og:url" @content="{{site.host}}{{@path}}" />
    <OpenGraph @property="og:type" @content={{if @type @type "website"}} />
    {{#if @image}}
      <OpenGraph @property="og:image" @content={{absolute @image}} />
      <meta name="twitter:card" content="summary_large_image" />
    {{else}}
      <meta name="twitter:card" content="summary" />
    {{/if}}
  {{/in-element}}
</template>;
