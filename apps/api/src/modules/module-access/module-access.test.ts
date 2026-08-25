import 'reflect-metadata';

import assert from 'node:assert/strict';
import test from 'node:test';
import { PATH_METADATA } from '@nestjs/common/constants';

import { SUPERADMIN_ROLE_OWNER, ROLES_KEY } from '../../auth/auth.constants';
import { AcademicsController } from '../academics/academics.controller';
import { ExamsController } from '../exams/exams.controller';
import { HrController } from '../hr/hr.controller';
import { InventoryController } from '../inventory/inventory.controller';
import { TimetableController } from '../timetable/timetable.controller';
import { ReportExportJobsController } from '../../common/reports/report-export-jobs.controller';
import { SchoolSmsController } from '../integrations/school-sms.controller';
import { MODULE_ACCESS_KEY } from './module-access.decorator';
import { ModuleAccessGuard } from './module-access.guard';
import { MODULE_REGISTRY_SEED } from './module-access.constants';
import { PlatformModuleAccessController } from './module-access.controller';
import { ModuleAccessRepository } from './module-access.repository';
import { ModuleAccessSchemaService } from './module-access-schema.service';

test('module registry seed contains required tenant allocation modules', () => {
  const codes = MODULE_REGISTRY_SEED.map((module) => module.code);

  const expectedCodes = [
    'students',
    'academics',
    'finance',
    'exams',
    'discipline',
    'timetable',
    'lab_management',
    'teacher_biometric_attendance',
    'parent_portal',
    'inventory',
    'transport',
    'communication_sms',
    'reports',
    'staff',
    'admin_command_centers',
  ] as const;

  for (const code of expectedCodes) {
    assert.ok(codes.includes(code), `missing module seed: ${code}`);
  }
});

test('module registry supports clinic, procurement, principal analytics, and arbitrary packages', () => {
  const codes = MODULE_REGISTRY_SEED.map((module) => module.code);

  for (const code of [
    'clinic_health',
    'procurement',
    'principal_dashboard',
    'hostel',
    'boarding',
    'cbt_exams',
    'lms',
    'ai_insights',
    'visitor_management',
    'asset_tracking',
    'iot',
  ] as const) {
    assert.ok(codes.includes(code), `${code} missing from module registry`);
  }
});

test('ModuleAccessSchemaService creates package, trial, billing, and usage metadata', async () => {
  let schemaSql = '';
  const service = new ModuleAccessSchemaService({
    runSchemaBootstrap: async (sql: string) => {
      schemaSql += sql;
    },
        executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
query: async () => ({ rows: [] }),
  } as never);

  await service.onModuleInit();

  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS module_packages/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS module_package_items/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS module_usage_events/);
  assert.match(schemaSql, /trial_ends_at/);
  assert.match(schemaSql, /expires_at/);
  assert.match(schemaSql, /billing_plan_code/);
  assert.match(schemaSql, /permission_scopes/);
  assert.match(schemaSql, /ALTER TABLE school_module_access ALTER COLUMN updated_at SET DEFAULT NOW\(\)/);
  assert.match(schemaSql, /ALTER TABLE module_usage_events FORCE ROW LEVEL SECURITY/);
  assert.match(schemaSql, /ranked_school_module_access/);
  assert.match(schemaSql, /duplicate_rank > 1/);
  assert.match(schemaSql, /CREATE UNIQUE INDEX IF NOT EXISTS ux_school_module_access_tenant_module/);
  assert.match(schemaSql, /ON school_module_access \(tenant_id, module_id\)/);
});

test('ModuleAccessSchemaService restores enabled modules hidden by stale trial or expiry gates', async () => {
  let schemaSql = '';
  const service = new ModuleAccessSchemaService({
    runSchemaBootstrap: async (sql: string) => {
      schemaSql += sql;
    },
        executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
query: async () => ({ rows: [] }),
  } as never);

  await service.onModuleInit();

  assert.match(schemaSql, /UPDATE school_module_access/);
  assert.match(schemaSql, /access_level = 'standard'/);
  assert.match(schemaSql, /trial_ends_at = NULL/);
  assert.match(schemaSql, /expires_at = NULL/);
  assert.match(schemaSql, /expires_at <= NOW\(\)/);
  assert.match(schemaSql, /access_level = 'trial' AND trial_ends_at <= NOW\(\)/);
});

test('platform module allocation routes require platform owner role', () => {
  assert.equal(Reflect.getMetadata(PATH_METADATA, PlatformModuleAccessController), 'platform');
  assert.deepEqual(
    Reflect.getMetadata(ROLES_KEY, PlatformModuleAccessController),
    [SUPERADMIN_ROLE_OWNER],
  );
});

test('module decorator records required module codes', () => {
  const descriptor = Object.getOwnPropertyDescriptor(
    PlatformModuleAccessController.prototype,
    'listSchoolModules',
  );

  assert.ok(descriptor?.value);
  assert.deepEqual(
    Reflect.getMetadata(MODULE_ACCESS_KEY, descriptor.value),
    undefined,
    'superadmin allocation routes should not be tenant-module gated',
  );
});

test('ModuleAccessGuard rejects disabled tenant modules gracefully', async () => {
  const reflector = {
    getAllAndOverride: () => ['lab_management'],
  };
  const requestContext = {
    requireStore: () => ({
      tenant_id: 'school-a',
      is_authenticated: true,
    }),
  };
  const moduleAccessService = {
    findFirstMissingModule: async () => 'lab_management',
  };
  const guard = new ModuleAccessGuard(
    reflector as never,
    requestContext as never,
    moduleAccessService as never,
  );

  await assert.rejects(
    () => guard.canActivate({ getHandler: () => undefined, getClass: () => undefined } as never),
    /Module not enabled for your school/i,
  );
});

test('ModuleAccessRepository clears stale expiry and trial gates when superadmin replaces school modules', async () => {
  const queries: Array<{ sql: string; values: unknown[] }> = [];
  let transactionScope: { tenantId: string; userId: string | null } | undefined;
  const query = async (sql: string, values: unknown[] = []) => {
    queries.push({ sql, values });

    if (sql.includes('SELECT code') && sql.includes('FROM module_registry')) {
      return { rows: [{ code: 'principal_dashboard' }] };
    }

    return { rows: [] };
  };
  const repository = new ModuleAccessRepository({
    query,
    executeWithTenant: async (
      tenantId: string,
      userId: string | null,
      callback: (tx: unknown) => Promise<unknown>,
    ) => {
      transactionScope = { tenantId, userId };
      return callback({
        $queryRawUnsafe: async (sql: string, ...values: unknown[]) => {
          const result = await query(sql, values);
          return result.rows;
        },
        $executeRawUnsafe: async (sql: string, ...values: unknown[]) => {
          await query(sql, values);
          if (sql.includes('INSERT INTO school_module_access')) {
            return 1;
          }
          if (sql.includes('INSERT INTO audit_logs')) {
            return 1;
          }
          return 0;
        },
      });
    },
  } as never);

  await repository.setSchoolModules({
    tenantId: 'school-a',
    moduleCodes: ['principal_dashboard'],
    updatedBy: '00000000-0000-0000-0000-000000000001',
  });

  const upsertQuery = queries.find((query) => query.sql.includes('INSERT INTO school_module_access'));

  assert.match(upsertQuery?.sql ?? '', /access_level/);
  assert.match(upsertQuery?.sql ?? '', /trial_ends_at/);
  assert.match(upsertQuery?.sql ?? '', /expires_at/);
  assert.match(upsertQuery?.sql ?? '', /access_level = EXCLUDED\.access_level/);
  assert.match(upsertQuery?.sql ?? '', /trial_ends_at = EXCLUDED\.trial_ends_at/);
  assert.match(upsertQuery?.sql ?? '', /expires_at = EXCLUDED\.expires_at/);
  assert.deepEqual(transactionScope, {
    tenantId: 'school-a',
    userId: '00000000-0000-0000-0000-000000000001',
  });
  assert.ok(
    queries.some((query) => query.sql.includes('INSERT INTO audit_logs')),
    'module replacement must append its audit record in the tenant transaction',
  );
});

test('ModuleAccessRepository rolls back a toggle when its mandatory audit insert fails', async () => {
  let committedEnabled = false;
  let listReads = 0;
  let transactionScope: { tenantId: string; userId: string | null } | undefined;
  const auditFailure = new Error('audit store unavailable');
  const repository = new ModuleAccessRepository({
    executeWithTenant: async (
      tenantId: string,
      userId: string | null,
      callback: (tx: unknown) => Promise<unknown>,
    ) => {
      transactionScope = { tenantId, userId };
      let pendingEnabled = committedEnabled;
      const result = await callback({
        $queryRawUnsafe: async (sql: string) => {
          if (sql.includes('SELECT code') && sql.includes('FROM module_registry')) {
            return [{ code: 'finance' }];
          }
          if (sql.includes('LEFT JOIN school_module_access')) {
            listReads += 1;
            return [];
          }
          return [];
        },
        $executeRawUnsafe: async (sql: string, ...values: unknown[]) => {
          if (sql.includes('INSERT INTO school_module_access')) {
            pendingEnabled = Boolean(values[2]);
            return 1;
          }
          if (sql.includes('INSERT INTO audit_logs')) {
            throw auditFailure;
          }
          return 0;
        },
      });
      committedEnabled = pendingEnabled;
      return result;
    },
  } as never);

  await assert.rejects(
    () =>
      repository.toggleSchoolModule({
        tenantId: 'school-a',
        moduleCode: 'finance',
        enabled: true,
        updatedBy: '00000000-0000-0000-0000-000000000001',
      }),
    auditFailure,
  );

  assert.equal(committedEnabled, false, 'failed audit must prevent the module toggle from committing');
  assert.equal(listReads, 0, 'a failed transaction must not build a success response');
  assert.deepEqual(transactionScope, {
    tenantId: 'school-a',
    userId: '00000000-0000-0000-0000-000000000001',
  });
});

test('ModuleAccessRepository rolls back a bulk replacement when its mandatory audit insert fails', async () => {
  let committedCodes = new Set(['legacy_module']);
  let listReads = 0;
  const auditFailure = new Error('audit store unavailable');
  const repository = new ModuleAccessRepository({
    query: async () => ({ rows: [] }),
    executeWithTenant: async (
      _tenantId: string,
      _userId: string | null,
      callback: (tx: unknown) => Promise<unknown>,
    ) => {
      const pendingCodes = new Set(committedCodes);
      const result = await callback({
        $queryRawUnsafe: async (sql: string, ...values: unknown[]) => {
          if (sql.includes('SELECT code') && sql.includes('FROM module_registry')) {
            return (values[0] as string[]).map((code) => ({ code }));
          }
          if (sql.includes('LEFT JOIN school_module_access')) {
            listReads += 1;
            return [];
          }
          return [];
        },
        $executeRawUnsafe: async (sql: string, ...values: unknown[]) => {
          if (sql.includes('UPDATE school_module_access')) {
            const selectedCodes = new Set(values[2] as string[]);
            for (const code of pendingCodes) {
              if (!selectedCodes.has(code)) {
                pendingCodes.delete(code);
              }
            }
            return 1;
          }
          if (sql.includes('INSERT INTO school_module_access')) {
            const selectedCodes = values[1] as string[];
            selectedCodes.forEach((code) => pendingCodes.add(code));
            return selectedCodes.length;
          }
          if (sql.includes('INSERT INTO audit_logs')) {
            throw auditFailure;
          }
          return 0;
        },
      });
      committedCodes = pendingCodes;
      return result;
    },
  } as never);

  await assert.rejects(
    () =>
      repository.setSchoolModules({
        tenantId: 'school-a',
        moduleCodes: ['principal_dashboard'],
        updatedBy: '00000000-0000-0000-0000-000000000001',
      }),
    auditFailure,
  );

  assert.deepEqual([...committedCodes], ['legacy_module']);
  assert.equal(listReads, 0, 'a failed transaction must not build a success response');
});

test('ModuleAccessRepository reads enabled modules inside the tenant transaction', async () => {
  let tenantScope: string | undefined;
  const repository = new ModuleAccessRepository({
    executeWithTenant: async (tenantId: string, _userId: string | null, callback: (tx: unknown) => Promise<unknown>) => {
      tenantScope = tenantId;
      return callback({
        $queryRawUnsafe: async () => [{ code: 'academics' }, { code: 'principal_dashboard' }],
      });
    },
  } as never);

  assert.deepEqual(await repository.listEnabledModuleCodes('kibabi-high'), [
    'academics',
    'principal_dashboard',
  ]);
  assert.equal(tenantScope, 'kibabi-high');
});

test('ModuleAccessRepository deduplicates concurrent enabled-module guard reads', async () => {
  let transactionCount = 0;
  const repository = new ModuleAccessRepository({
    executeWithTenant: async (_tenantId: string, _userId: string | null, callback: (tx: unknown) => Promise<unknown>) => {
      transactionCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return callback({
        $queryRawUnsafe: async () => [{ code: 'academics' }],
      });
    },
  } as never);

  const results = await Promise.all([
    repository.listEnabledModuleCodes('kibabi-high'),
    repository.listEnabledModuleCodes('kibabi-high'),
    repository.listEnabledModuleCodes('kibabi-high'),
  ]);
  const cached = await repository.listEnabledModuleCodes('kibabi-high');

  assert.equal(transactionCount, 1);
  assert.deepEqual(results, [['academics'], ['academics'], ['academics']]);
  assert.deepEqual(cached, ['academics']);
});

test('production school controllers declare module access metadata', () => {
  assert.deepEqual(Reflect.getMetadata(MODULE_ACCESS_KEY, AcademicsController), ['academics']);
  assert.deepEqual(Reflect.getMetadata(MODULE_ACCESS_KEY, ExamsController), ['exams']);
  assert.deepEqual(Reflect.getMetadata(MODULE_ACCESS_KEY, HrController), ['staff']);
  assert.deepEqual(Reflect.getMetadata(MODULE_ACCESS_KEY, InventoryController), ['inventory']);
  assert.deepEqual(Reflect.getMetadata(MODULE_ACCESS_KEY, TimetableController), ['timetable']);
  assert.deepEqual(Reflect.getMetadata(MODULE_ACCESS_KEY, SchoolSmsController), ['communication_sms']);
  assert.deepEqual(Reflect.getMetadata(MODULE_ACCESS_KEY, ReportExportJobsController), ['reports']);
});
