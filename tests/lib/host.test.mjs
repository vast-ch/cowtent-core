import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { policyOf, prepareForHosts, withPolicy } from '../../lib/host.mjs';

const sha = (code) =>
  `'sha256-${createHash('sha256').update(code).digest('base64')}'`;

const PAGE = [
  '<html><head><meta charset="utf-8"></head><body><header></header>',
  '<script>window.flag=true</script>',
  '<script glmr="%cursor:0%"></script><script glmr="%cursor:1%"></script>',
  '<script type="module" src="/assets/main.js"></script>',
  '</body></html>',
].join('');

test('the policy allows the inline scripts of the page by their hashes, each once', () => {
  const scriptSrc = policyOf(PAGE)
    .split('; ')
    .find((directive) => directive.startsWith('script-src'));

  assert.equal(
    scriptSrc,
    `script-src 'self' ${sha('window.flag=true')} ${sha('')}`,
  );
});

test('the policy comes right after <meta charset>, or first in <head>', () => {
  assert.match(
    withPolicy(PAGE),
    /^<html><head><meta charset="utf-8">\n {4}<meta http-equiv="Content-Security-Policy" content="default-src 'none'; [^"]+"><\/head>/,
  );
  assert.match(
    withPolicy('<html><head lang="en"><title>A</title></head></html>'),
    /^<html><head lang="en">\n {4}<meta http-equiv="Content-Security-Policy" [^>]+><title>/,
  );
});

test('every page of the build gets its policy, and the build its _headers', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cowtent-host-'));

  mkdirSync(join(dir, 'a-post'));
  writeFileSync(join(dir, 'index.html'), PAGE);
  writeFileSync(join(dir, 'a-post/index.html'), PAGE);
  prepareForHosts(dir);

  for (const page of ['index.html', 'a-post/index.html']) {
    assert.match(
      readFileSync(join(dir, page), 'utf8'),
      /Content-Security-Policy/,
    );
  }
  assert.match(
    readFileSync(join(dir, '_headers'), 'utf8'),
    /^\/assets\/\*\n {2}Cache-Control: public, max-age=31536000, immutable\n {2}Access-Control-Allow-Origin: \*$/m,
  );
});
