import { t } from 'ember-intl';

import site, { language } from 'virtual:blog-site';

import type { TOC } from '@ember/component/template-only';
import type { Post } from '../content/schemas.ts';

// RFC 6068: line breaks in a mailto: body are CRLF
const BREAK = '\r\n';

// The email is plain text in a link, made outside a template
const text = (key: string, values: Record<string, string> = {}) =>
  language.messages[key]!.replace(
    /\{(\w+)\}/g,
    (_, name: string) => values[name] ?? '',
  );

/**
 * A mailto: link with the subject and a first line already written, so a
 * reader only has to fill in their note.
 */
export const mailto = (post: Pick<Post, 'id' | 'title'>) => {
  const body = [
    text('post.feedback.greeting', { name: site.owner.split(' ')[0]! }).replace(
      / ,$/,
      ',',
    ),
    '',
    text('post.feedback.intro', {
      title: post.title,
      url: `${site.host}/${post.id}`,
    }),
    '',
    text('post.feedback.placeholder'),
    '',
  ].join(BREAK);

  return `mailto:${site.email}?subject=${encodeURIComponent(post.title)}&body=${encodeURIComponent(body)}`;
};

/**
 * Instead of comments, which would need storing somewhere: a button that
 * opens the reader's email app with a note to me about the post.
 */
export const Feedback: TOC<{
  Element: HTMLElement;
  Args: { post: Post };
}> = <template>
  <aside
    class="flex flex-col items-center rounded-2xl bg-colour-1-50 px-6 py-8 text-center"
    data-test-feedback
    ...attributes
  >
    <a
      href={{mailto @post}}
      class="inline-flex items-center gap-2.5 rounded-full bg-colour-1-600 px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-colour-1-700"
      data-test-feedback-link
    >
      <svg
        class="size-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </svg>
      {{t "post.feedback.button"}}
    </a>
  </aside>
</template>;
