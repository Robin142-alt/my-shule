import assert from 'node:assert/strict';
import test from 'node:test';
import { createHmac } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';

import { PlatformOnboardingSchemaService } from '../modules/platform/platform-onboarding.schema';
import { TenantService } from './tenant.service';
import { TenantTrustBoundaryService } from './tenant-trust-boundary.service';

function createTenantService(defaultTenantId = 'default-school') {
  return new TenantService({
    get: (key: string) => {
      if (key === 'app.baseDomain') return 'myshule.test';
      if (key === 'app.defaultTenantId') return defaultTenantId;
      if (key === 'app.trustedTenantHeaderSecret') return 'tenant-header-secret';
      return undefined;
    },
  } as never);
}

test('TenantService ignores unsigned forwarded tenant ids from browser-controlled requests', () => {
  const service = createTenantService();

  assert.equal(
    service.resolveTenantId('myshule-production.up.railway.app', 'barakaacademy'),
    'default-school',
  );
});

test('TenantService accepts signed forwarded tenant ids from trusted internal proxy', () => {
  const service = createTenantService();
  const signature = createHmac('sha256', 'tenant-header-secret')
    .update('barakaacademy')
    .digest('hex');

  assert.equal(
    service.resolveTenantId('myshule-production.up.railway.app', 'barakaacademy', signature),
    'barakaacademy',
  );
});

test('TenantService rejects malformed forwarded tenant ids', () => {
  const service = createTenantService();

  assert.throws(
    () => service.resolveTenantId('myshule-production.up.railway.app', '../admin'),
    BadRequestException,
  );
});

test('TenantTrustBoundaryService resolves verified custom domains and ignores unsigned tenant overrides', async () => {
  const service = new TenantTrustBoundaryService(
    {
      get: (key: string) => {
        if (key === 'app.baseDomain') return 'myshule.test';
        if (key === 'app.defaultTenantId') return 'default-school';
        if (key === 'app.trustedTenantHeaderSecret') return 'tenant-header-secret';
        return undefined;
      },
    } as never,
    {
      query: async (sql: string, params: unknown[]) => {
        if (/FROM tenant_domains/.test(sql) && params[0] === 'school.greenvalley.ac.ke') {
          return {
            rows: [
              {
                tenant_id: 'green-valley',
              },
            ],
          };
        }

        return { rows: [] };
      },
    } as never,
  );

  assert.deepEqual(
    await service.resolveTenantContext({
      host_header: 'school.greenvalley.ac.ke',
      forwarded_tenant_id: 'attacker-school',
    }),
    {
      tenant_id: 'green-valley',
      source: 'custom_domain',
    },
  );
});

test('TenantService can use the trust-boundary service for async request tenant resolution', async () => {
  const trustBoundary = {
    resolveTenantContext: async () => ({
      tenant_id: 'green-valley',
      source: 'custom_domain',
    }),
  };
  const service = new TenantService(
    {
      get: () => undefined,
    } as never,
    trustBoundary as never,
  );

  assert.equal(await service.resolveTenantIdForRequest('school.greenvalley.ac.ke'), 'green-valley');
});

test('PlatformOnboardingSchemaService creates tenant domain bindings with forced RLS', async () => {
  let schemaSql = '';
  const service = new PlatformOnboardingSchemaService({
    runSchemaBootstrap: async (sql: string) => {
      schemaSql = sql;
    },
  } as never);

  await service.onModuleInit();

  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS tenant_domains/);
  assert.match(schemaSql, /domain text NOT NULL/);
  assert.match(schemaSql, /verified_at timestamptz/);
  assert.match(schemaSql, /uq_tenant_domains_domain/);
  assert.match(schemaSql, /ALTER TABLE tenant_domains FORCE ROW LEVEL SECURITY/);
});
