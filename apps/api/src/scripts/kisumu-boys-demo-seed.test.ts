import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  DEMO_MODULE_CODES,
  buildKisumuBoysDemoAccessSummary,
  buildKisumuBoysDemoStudentRoster,
  KISUMU_BOYS_DEMO_SEED_KEY,
  assertKisumuBoysTenantSelection,
  buildKisumuBoysDemoSeedPlan,
} from './kisumu-boys-demo-seed';

test('Kisumu Boys demo seed refuses missing, wrong, or ambiguous tenants', () => {
  assert.throws(
    () => assertKisumuBoysTenantSelection([]),
    /ERROR: Existing demo school 'Kisumu Boys' not found. Seed aborted./,
  );
  assert.throws(
    () =>
      assertKisumuBoysTenantSelection([
        { tenant_id: 'kb-high', name: 'Kisumu Boys High School', subdomain: 'kb-high', id: 'tenant-1' },
      ]),
    /ERROR: Existing demo school 'Kisumu Boys' not found. Seed aborted./,
  );
  assert.throws(
    () =>
      assertKisumuBoysTenantSelection([
        { tenant_id: 'kb-high', name: 'kisumu boys', subdomain: 'kb-high', id: 'tenant-1' },
      ]),
    /ERROR: Existing demo school 'Kisumu Boys' not found. Seed aborted./,
  );
  assert.throws(
    () =>
      assertKisumuBoysTenantSelection([
        { tenant_id: 'kb-high', name: 'Kisumu Boys', subdomain: 'kb-high', id: 'tenant-1' },
        { tenant_id: 'kisumu-boys', name: 'Kisumu Boys', subdomain: 'kisumu-boys', id: 'tenant-2' },
      ]),
    /ERROR: Existing demo school 'Kisumu Boys' not found. Seed aborted./,
  );

  assert.equal(
    assertKisumuBoysTenantSelection([
      { tenant_id: 'kb-high', name: 'Kisumu Boys', subdomain: 'kb-high', id: 'tenant-1' },
    ]).tenant_id,
    'kb-high',
  );
});

test('Kisumu Boys demo seed plan covers every active product module with tenant-scoped writes', () => {
  const plan = buildKisumuBoysDemoSeedPlan();

  assert.equal(plan.seedKey, KISUMU_BOYS_DEMO_SEED_KEY);
  assert.deepEqual(plan.targetTenant, {
    tenant_id: 'kb-high',
    name: 'Kisumu Boys',
    subdomain: 'kb-high',
  });

  for (const moduleCode of DEMO_MODULE_CODES) {
    assert.ok(
      plan.operations.some((operation) => operation.moduleCode === moduleCode),
      `missing demo operation for ${moduleCode}`,
    );
  }

  assert.equal(
    plan.operations.every((operation) => operation.tenantScoped),
    true,
  );
  assert.equal(
    plan.operations.some((operation) => operation.table === 'school_module_access'),
    true,
  );
});

test('Kisumu Boys demo student roster contains 30 male learners with linked guardians', () => {
  const roster = buildKisumuBoysDemoStudentRoster();

  assert.equal(roster.length, 30);
  assert.equal(
    roster.every((learner) => learner.gender === 'male'),
    true,
  );
  assert.equal(new Set(roster.map((learner) => learner.admissionNumber)).size, 30);
  assert.equal(
    roster.every((learner) => learner.guardian.email.endsWith('@kisumuboys.demo')),
    true,
  );
  assert.deepEqual(
    [...new Set(roster.map((learner) => learner.className))].sort(),
    ['Form 3 West', 'Form 4 South', 'Grade 10 Blue'].sort(),
  );
});

test('package exposes a safe KB High demo seed command', () => {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
    scripts?: Record<string, string>;
  };

  assert.match(packageJson.scripts?.['seed:kb-high'] ?? '', /kisumu-boys-demo-seed\.ts/);
  assert.match(packageJson.scripts?.['seed:kb-high'] ?? '', /--confirm-kisumu-boys-only/);
});

test('Kisumu Boys demo access summary is truthful about invitation-only login', () => {
  const access = buildKisumuBoysDemoAccessSummary();

  assert.equal(access.common_password_supported, false);
  assert.match(access.note, /invitation/i);
  assert.match(access.school_login, /\/school\/login/);
});
