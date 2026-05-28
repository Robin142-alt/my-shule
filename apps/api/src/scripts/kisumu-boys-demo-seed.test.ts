import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEMO_MODULE_CODES,
  KISUMU_BOYS_DEMO_SEED_KEY,
  assertKisumuBoysTenantSelection,
  buildKisumuBoysDemoSeedPlan,
} from './kisumu-boys-demo-seed';

test('Kisumu Boys demo seed refuses missing, wrong, or ambiguous tenants', () => {
  assert.throws(
    () => assertKisumuBoysTenantSelection([]),
    /Expected exactly one Kisumu Boys tenant/,
  );
  assert.throws(
    () =>
      assertKisumuBoysTenantSelection([
        { tenant_id: 'other-school', name: 'Other School', subdomain: 'other-school', id: 'tenant-1' },
      ]),
    /refuses tenant/,
  );
  assert.throws(
    () =>
      assertKisumuBoysTenantSelection([
        { tenant_id: 'kb-high', name: 'Kisumu Boys', subdomain: 'kb-high', id: 'tenant-1' },
        { tenant_id: 'kisumu-boys', name: 'Kisumu Boys', subdomain: 'kisumu-boys', id: 'tenant-2' },
      ]),
    /Expected exactly one Kisumu Boys tenant/,
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
