// The language files: the core's words, the blog's on top (lib/language.mjs)

import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { readLanguage, tagName } from '../../lib/language.mjs';

function blog(files) {
  const dir = mkdtempSync(join(tmpdir(), 'cowtent-'));

  mkdirSync(join(dir, 'languages'));
  for (const [name, text] of Object.entries(files)) {
    writeFileSync(join(dir, 'languages', name), text);
  }

  return dir;
}

test('a blog without a language file gets the core words', () => {
  const language = readLanguage(blog({}), 'de');

  assert.equal(language.t('post.facts.heading'), 'Die Fakten');
  assert.equal(language.locale, 'de');
});

test("the blog's own words win, key by key", () => {
  const language = readLanguage(
    blog({
      'de.yaml': 'post:\n  facts:\n    heading: Zahlen\ntags:\n  alp: Alp\n',
    }),
    'de',
  );

  assert.equal(language.t('post.facts.heading'), 'Zahlen');
  assert.equal(language.t('post.facts.distance'), 'Distanz');
  assert.equal(tagName(language, 'alp'), 'Alp');
});

test('a tag without a name is its id in words', () => {
  const language = readLanguage(blog({}), 'en');

  assert.equal(tagName(language, 'trail-running'), 'Trail Running');
  assert.equal(tagName(language, 'country/new-zealand'), 'New Zealand');
  assert.equal(tagName(language, 'country'), 'Country');
});

test('a text fills in its values', () => {
  const language = readLanguage(blog({}), 'en');

  assert.equal(
    language.t('post.facts.time', { hours: 5, minutes: 36 }),
    '5 h 36 min',
  );
});

test('every core language has every English key', async () => {
  const english = Object.keys(readLanguage(blog({}), 'en').messages);
  const { parse } = await import('yaml');
  const { readFileSync } = await import('node:fs');

  for (const code of ['de']) {
    const keys = new Set(
      Object.keys(
        flatten(
          parse(
            readFileSync(
              join(import.meta.dirname, `../../languages/${code}.yaml`),
              'utf8',
            ),
          ),
        ),
      ),
    );

    assert.deepEqual(
      english.filter((key) => !keys.has(key)),
      [],
      `${code}.yaml`,
    );
  }
});

test('an unknown language fails the build', () => {
  assert.throws(() => readLanguage(blog({}), 'xx'), /no language "xx"/);
});

function flatten(object, prefix = '') {
  return Object.fromEntries(
    Object.entries(object).flatMap(([key, value]) =>
      value !== null && typeof value === 'object'
        ? Object.entries(flatten(value, `${prefix}${key}.`))
        : [[`${prefix}${key}`, value]],
    ),
  );
}
