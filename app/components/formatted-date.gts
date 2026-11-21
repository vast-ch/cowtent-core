import { language } from 'virtual:blog-site';

import type { TOC } from '@ember/component/template-only';

// In the blog's language (locale: in languages/*.yaml), and in UTC: the prerender runs in UTC, and a browser elsewhere would
// otherwise show the day before or after
const DATE = new Intl.DateTimeFormat(language.locale, {
  dateStyle: 'long',
  timeZone: 'UTC',
});

const day = (date: string) => new Date(date).toISOString().slice(0, 10);
const long = (date: string) => DATE.format(new Date(date));

export const FormattedDate: TOC<{
  Element: HTMLTimeElement;
  Args: { date: string };
}> = <template>
  <time datetime={{day @date}} ...attributes>{{long @date}}</time>
</template>;
