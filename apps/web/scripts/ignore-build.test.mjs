import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { onlyIndependentChanges, shouldSkipBuild } from './ignore-build.mjs';

const repository = fs.mkdtempSync(path.join(os.tmpdir(), 'myshule-build-skip-'));
after(() => fs.rmSync(repository, { recursive: true, force: true }));
const git = (...args) => execFileSync('git', args, { cwd: repository, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
git('init');
git('config', 'user.name', 'Build regression test');
git('config', 'user.email', 'build-test@example.invalid');
function commit(file, value) {
  fs.mkdirSync(path.dirname(path.join(repository, file)), { recursive: true });
  fs.writeFileSync(path.join(repository, file), value);
  git('add', '.');
  git('-c', 'commit.gpgsign=false', 'commit', '-m', value);
  return git('rev-parse', 'HEAD');
}
const baseline = commit('apps/web/src/app/page.tsx', 'initial');
const apiOnly = commit('apps/api/src/main.ts', 'backend fix');
const webChange = commit('apps/web/src/app/page.tsx', 'pending web fix');
const laterApi = commit('apps/api/src/main.ts', 'another backend fix');
const options = (base, head, extra = {}) => ({
  cwd: repository,
  env: { VERCEL_GIT_PREVIOUS_SHA: base, VERCEL_GIT_COMMIT_SHA: head, ...extra },
});

test('skips independent backend changes from a successful deployed baseline', () => {
  assert.equal(shouldSkipBuild(options(baseline, apiOnly)), true);
});
test('keeps pending frontend changes after a failed deployment or multiple-commit push', () => {
  assert.equal(shouldSkipBuild(options(apiOnly, laterApi)), false);
  assert.equal(shouldSkipBuild(options(webChange, laterApi)), true);
});
test('builds on first deploy, manual redeploy, missing history, invalid SHA and force override', () => {
  for (const [base, head] of [[undefined, apiOnly], [apiOnly, apiOnly], ['0'.repeat(40), apiOnly], ['--all', apiOnly], [laterApi, baseline]]) {
    assert.equal(shouldSkipBuild(options(base, head)), false);
  }
  assert.equal(shouldSkipBuild(options(baseline, apiOnly, { MYSHULE_FORCE_WEB_BUILD: '1' })), false);
});
test('builds for web/shared/deployment/lockfile changes; never treats unknown files as independent', () => {
  for (const file of ['apps/web/src/app/page.tsx', 'packages/shared/types.ts', 'package-lock.json', 'vercel.json', '.npmrc', 'scripts/build.mjs', 'apps/api-shared/index.ts']) {
    assert.equal(onlyIndependentChanges(['docs/readme.md', file]), false, file);
  }
  assert.equal(onlyIndependentChanges([]), false);
  assert.equal(onlyIndependentChanges(['apps/api/src/main.ts', 'prisma/schema.prisma', 'docs/readme.md']), true);
});
