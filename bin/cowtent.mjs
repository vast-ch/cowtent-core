#!/usr/bin/env node
// Builds or serves the blog in the current folder (site.yaml, posts/,
// pages/) with this platform:
//
//   cowtent build   → dist/, then checks every post and page made it in
//   cowtent start   → http://localhost:4200, reloads on every edit
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';

const core = join(import.meta.dirname, '..');
const vite = join(
  dirname(
    createRequire(join(core, 'package.json')).resolve('vite/package.json'),
  ),
  'bin/vite.js',
);
const [command = 'build', ...args] = process.argv.slice(2);
const check = ['--test', join(core, 'tests/output/site.test.mjs')];
const commands = {
  build: [[vite, 'build', ...args], check],
  start: [[vite, 'serve', ...args]],
};

if (!commands[command]) {
  throw new Error(`Usage: cowtent build | cowtent start`);
}

// Vite, Babel and Embroider look for their config in the working folder:
// the platform's. The blog's folder goes in through the environment.
const env = {
  ...process.env,
  BLOG_CONTENT: resolve(process.env.BLOG_CONTENT ?? '.'),
  BLOG_OUT: resolve(process.env.BLOG_OUT ?? 'dist'),
};

function run(nodeArgs) {
  return new Promise((done) => {
    spawn(process.execPath, nodeArgs, { cwd: core, stdio: 'inherit', env }).on(
      'exit',
      (code) => done(code ?? 1),
    );
  });
}

for (const step of commands[command]) {
  const code = await run(step);

  if (code !== 0) {
    process.exitCode = code;
    break;
  }
}
