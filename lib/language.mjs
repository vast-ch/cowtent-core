import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parse } from 'yaml';

import { tagWords } from './tag-name.mjs';

const CORE = join(import.meta.dirname, '../languages');

/**
 * The words of a blog in its language (`language:` in site.yaml). The core
 * has every one in languages/<language>.yaml; a blog's own
 * languages/<language>.yaml adds its tag names and can reword anything:
 * its keys win. A key neither has falls back to the core's English.
 *
 * Returns the messages flattened the way ember-intl looks them up
 * (`post.facts.heading`), the locale for dates and numbers, and `t()` for
 * the text the build writes itself (the facts table, the feed).
 */
export function readLanguage(contentDir, language = 'en') {
  const core = join(CORE, `${language}.yaml`);

  if (!existsSync(core)) {
    throw new Error(
      `site.yaml: there is no language "${language}", only ${available().join(', ')}`,
    );
  }

  const messages = {
    ...flatten(readYaml(join(CORE, 'en.yaml'))),
    ...flatten(readYaml(core)),
    ...flatten(readYaml(join(contentDir, 'languages', `${language}.yaml`))),
  };

  return {
    language,
    locale: messages.locale ?? language,
    messages,
    t(key, values = {}) {
      const message = messages[key];

      if (message === undefined) throw new Error(`No text for "${key}"`);

      return message.replace(/\{(\w+)\}/g, (_, name) => values[name] ?? '');
    },
  };
}

/**
 * The name of a tag: from `tags:` in the blog's language file, or else its
 * id in words (lib/tag-name.mjs).
 */
export function tagName(language, id) {
  return language.messages[`tags.${id}`] ?? tagWords(id);
}

// The languages the core has words for: en, de…
function available() {
  return readdirSync(CORE).map((file) => file.replace(/\.yaml$/, ''));
}

function readYaml(file) {
  return existsSync(file) ? (parse(readFileSync(file, 'utf8')) ?? {}) : {};
}

// { post: { facts: { heading: … } } } → { 'post.facts.heading': … }
function flatten(object, prefix = '') {
  return Object.fromEntries(
    Object.entries(object).flatMap(([key, value]) =>
      value !== null && typeof value === 'object'
        ? Object.entries(flatten(value, `${prefix}${key}.`))
        : [[`${prefix}${key}`, String(value)]],
    ),
  );
}
