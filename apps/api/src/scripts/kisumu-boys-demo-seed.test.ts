import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  DEMO_MODULE_CODES,
  buildKisumuBoysDemoAccessSummary,
  buildKisumuBoysDemoInventoryCatalog,
  buildKisumuBoysDemoLibraryCatalog,
  buildKisumuBoysDemoMedicineCatalog,
  buildKisumuBoysDemoStudentRoster,
  buildKisumuBoysDemoTransportRoutes,
  KISUMU_BOYS_DEMO_SEED_KEY,
  assertKisumuBoysTenantSelection,
  buildKisumuBoysDemoSeedPlan,
  summarizeExistingSchoolUsersByRole,
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
  assert.equal(
    plan.operations.some((operation) => ['users', 'tenant_memberships', 'roles'].includes(operation.table)),
    false,
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
  assert.equal(packageJson.scripts?.['seed:kb-high-data'], packageJson.scripts?.['seed:kb-high']);
});

test('Kisumu Boys demo access summary is truthful about invitation-only login', () => {
  const access = buildKisumuBoysDemoAccessSummary();

  assert.equal(access.common_password_supported, false);
  assert.match(access.note, /invitation/i);
  assert.match(access.school_login, /\/school\/login/);
});

test('Kisumu Boys library blueprint seeds 40 titles and 80 barcode copies', () => {
  const catalog = buildKisumuBoysDemoLibraryCatalog();

  assert.equal(catalog.length, 40);
  assert.equal(catalog.reduce((total, item) => total + item.copies.length, 0), 80);
  assert.equal(new Set(catalog.flatMap((item) => item.copies.map((copy) => copy.barcode))).size, 80);
  assert.equal(
    ['Literature', 'Science', 'Mathematics', 'Revision', 'History', 'Computer Studies'].every((category) =>
      catalog.some((item) => item.category === category),
    ),
    true,
  );
});

test('Kisumu Boys demo role summary groups existing school users without creating users', () => {
  const summary = summarizeExistingSchoolUsersByRole([
    { user_id: 'principal-1', role_code: 'principal' },
    { user_id: 'teacher-1', role_code: 'teacher' },
    { user_id: 'teacher-2', role_code: 'teacher' },
    { user_id: 'nurse-1', role_code: 'nurse' },
  ]);

  assert.deepEqual(summary, {
    principal: 1,
    teacher: 2,
    nurse: 1,
  });
});

test('Kisumu Boys operational blueprints cover clinic, store, assets, and transport', () => {
  const medicines = buildKisumuBoysDemoMedicineCatalog();
  const inventory = buildKisumuBoysDemoInventoryCatalog();
  const routes = buildKisumuBoysDemoTransportRoutes();

  assert.deepEqual(
    medicines.map((medicine) => medicine.name),
    ['Paracetamol', 'ORS', 'Antacid', 'Bandages', 'Antiseptic', 'Thermometer covers', 'Gloves'],
  );
  assert.equal(inventory.length, 20);
  assert.equal(inventory.filter((item) => item.kind === 'asset').length, 5);
  assert.equal(routes.length, 6);
  assert.equal(routes.some((route) => route.name === 'Milimani Route'), true);
});
