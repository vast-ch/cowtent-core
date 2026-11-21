import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { readSite } from '../../lib/site.mjs';
import { themeScript } from '../../lib/vite-plugin-blog.mjs';

function site(yaml) {
  const dir = mkdtempSync(join(tmpdir(), 'cowtent-site-'));
  writeFileSync(join(dir, 'site.yaml'), yaml);

  return readSite(dir);
}

test('the theme is alps unless site.yaml picks one it knows', () => {
  assert.equal(site('').theme, 'alps');
  assert.equal(site('theme: night').theme, 'night');
  assert.equal(site('theme: nightt').theme, 'alps');
});

test('the theme switcher is off unless site.yaml turns it on', () => {
  assert.equal(site('').themeSwitcher, false);
  assert.equal(site('theme-switcher: true').themeSwitcher, true);
});

test("a visitor's theme is only applied with the switcher on", () => {
  assert.equal(themeScript(site(''), '/'), '');
  assert.match(
    themeScript(site('theme-switcher: true'), '/blog/'),
    /localStorage\.getItem\("cowtent-theme:\/blog\/"\)/,
  );
});
