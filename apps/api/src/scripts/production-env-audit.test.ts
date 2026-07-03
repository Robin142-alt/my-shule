import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  loadProductionEnvForAudit,
  runProductionEnvAudit,
} from './production-env-audit';

test('loadProductionEnvForAudit matches production startup env-file precedence', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'myshule-production-env-audit-'));

  try {
    writeFileSync(join(workspace, '.env'), [
      'APP_CORS_ORIGINS=*',
      'REDIS_URL=redis://base:secret@localhost:6379',
    ].join('\n'));
    writeFileSync(join(workspace, '.env.production'), [
      'APP_CORS_ORIGINS=https://production.example.test',
      'REDIS_URL=rediss://production:secret@redis.example.test:6379',
    ].join('\n'));
    writeFileSync(join(workspace, '.env.production.local'), [
      'APP_CORS_ORIGINS=https://local-production.example.test',
    ].join('\n'));

    const { env, loadedFiles } = loadProductionEnvForAudit(workspace, {
      NODE_ENV: 'production',
    });

    assert.deepEqual(loadedFiles, ['.env.production.local', '.env.production', '.env']);
    assert.equal(env.APP_CORS_ORIGINS, 'https://local-production.example.test');
    assert.equal(env.REDIS_URL, 'rediss://production:secret@redis.example.test:6379');
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test('runProductionEnvAudit writes a non-secret structured production env report', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'myshule-production-env-audit-'));
  const fakeSecret = 're_fake_secret_key_that_must_not_be_written';

  try {
    writeFileSync(join(workspace, '.env.production.local'), [
      'NODE_ENV=production',
      'APP_CORS_ORIGINS=*',
      `RESEND_API_KEY=${fakeSecret}`,
      'EMAIL_FROM=MyShule <support@myshule.test>',
      'PUBLIC_APP_URL=https://app.myshule.test',
      'SUPPORT_NOTIFICATION_EMAILS=support@myshule.test',
    ].join('\n'));

    const result = runProductionEnvAudit({
      workspaceRoot: workspace,
      env: {},
      artifactPath: 'docs/validation/production-env-audit.json',
    });
    const artifact = readFileSync(
      join(workspace, 'docs/validation/production-env-audit.json'),
      'utf8',
    );

    assert.equal(result.ok, false);
    assert.equal(result.summary.total > 0, true);
    assert.equal(result.loaded_files.includes('.env.production.local'), true);
    assert.match(artifact, /APP_CORS_ORIGINS must not include wildcard origins in production/);
    assert.equal(artifact.includes(fakeSecret), false);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});
