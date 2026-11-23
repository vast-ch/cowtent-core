import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { readSite } from '../../lib/site.mjs';

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

function withEnv(env, run) {
  const saved = Object.fromEntries(
    Object.keys(env).map((name) => [name, process.env[name]]),
  );

  Object.assign(process.env, env);
  try {
    return run();
  } finally {
    for (const [name, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

test("the address is site.yaml's url:, else the one the host gave the site", () => {
  const none = { SITE_URL: '', NETLIFY: '', URL: '' };

  withEnv(none, () => {
    assert.equal(site('').host, 'http://localhost:4200');
    assert.equal(site('url: https://bella.ch/').host, 'https://bella.ch');
  });
  withEnv({ ...none, SITE_URL: 'https://bella.github.io/blog' }, () => {
    assert.equal(site('').host, 'https://bella.github.io/blog');
    assert.equal(site('').base, '/blog/');
  });
  withEnv(
    { ...none, NETLIFY: 'true', URL: 'https://bella.netlify.app' },
    () => {
      assert.equal(site('').host, 'https://bella.netlify.app');
      assert.equal(site('url: https://bella.ch').host, 'https://bella.ch');
    },
  );
  withEnv({ ...none, URL: 'https://elsewhere.example' }, () => {
    assert.equal(site('').host, 'http://localhost:4200', 'URL only on Netlify');
  });
});
