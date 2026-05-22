import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TENANT_DATABASE_BLUEPRINT,
  buildTenantDatabasePolicy,
  evaluateTenantSchemaSnapshot,
  extractSqlSchemaTables,
} from './tenant-database-policy';

test('TENANT_DATABASE_BLUEPRINT models the shared tenant-aware SaaS database strategy', () => {
  assert.equal(TENANT_DATABASE_BLUEPRINT.model, 'shared_database_tenant_aware');
  assert.equal(TENANT_DATABASE_BLUEPRINT.requiredTenantColumn, 'tenant_id');
  assert.equal(TENANT_DATABASE_BLUEPRINT.isolationControls.includes('tenant_context_session_settings'), true);
  assert.equal(TENANT_DATABASE_BLUEPRINT.encryption.requiredKeyScope, 'per_tenant');
  assert.equal(TENANT_DATABASE_BLUEPRINT.coreTables.includes('tenants'), true);
  assert.equal(TENANT_DATABASE_BLUEPRINT.coreTables.includes('users'), true);
  assert.equal(TENANT_DATABASE_BLUEPRINT.coreTables.includes('roles'), true);
  assert.equal(TENANT_DATABASE_BLUEPRINT.coreTables.includes('permissions'), true);
  assert.equal(TENANT_DATABASE_BLUEPRINT.coreTables.includes('subscriptions'), true);
  assert.equal(TENANT_DATABASE_BLUEPRINT.coreTables.includes('audit_logs'), true);
  assert.equal(
    TENANT_DATABASE_BLUEPRINT.platformCatalogTables.some(
      (table) => table.name === 'module_registry' && table.tenantActivationTable === 'school_module_access',
    ),
    true,
  );
});

test('buildTenantDatabasePolicy requires tenant tables only for active school modules', () => {
  const policy = buildTenantDatabasePolicy({
    activeModules: ['students', 'finance', 'communication_sms'],
  });

  assert.equal(policy.requiredTables.some((table) => table.name === 'students'), true);
  assert.equal(policy.requiredTables.some((table) => table.name === 'student_guardians'), true);
  assert.equal(policy.requiredTables.some((table) => table.name === 'fee_structures'), true);
  assert.equal(policy.requiredTables.some((table) => table.name === 'invoices'), true);
  assert.equal(policy.requiredTables.some((table) => table.name === 'sms_logs'), true);
  assert.equal(policy.requiredTables.some((table) => table.name === 'lab_inventory'), false);
  assert.equal(policy.requiredTables.every((table) => table.requiresTenantId), true);
});

test('evaluateTenantSchemaSnapshot flags missing tenant ids, missing RLS, and weak encryption', () => {
  const policy = buildTenantDatabasePolicy({
    activeModules: ['students', 'finance'],
  });
  const result = evaluateTenantSchemaSnapshot(
    {
      tables: [
        table('users', ['id', 'tenant_id'], true),
        table('roles', ['id', 'tenant_id'], true),
        table('permissions', ['id', 'tenant_id'], true),
        table('audit_logs', ['id', 'tenant_id'], true),
        table('subscriptions', ['id', 'tenant_id'], true),
        table('module_registry', ['id', 'code'], false),
        table('students', ['id', 'admission_number'], true),
        table('invoices', ['id', 'tenant_id'], false),
      ],
      encryption: {
        atRest: true,
        inTransit: true,
        backupEncrypted: false,
        keyScope: 'shared',
      },
      runtimeControls: {
        tenantContextSessionSettings: true,
        tenantBoundGuard: true,
        auditLogTenantScope: true,
      },
    },
    policy,
  );

  assert.equal(result.ok, false);
  assert.equal(result.issues.some((issue) => issue.id === 'missing-table:tenants'), true);
  assert.equal(result.issues.some((issue) => issue.id === 'missing-table:school_module_access'), true);
  assert.equal(result.issues.some((issue) => issue.id === 'missing-tenant-id:students'), true);
  assert.equal(result.issues.some((issue) => issue.id === 'missing-forced-rls:invoices'), true);
  assert.equal(result.issues.some((issue) => issue.id === 'backup-encryption-required'), true);
  assert.equal(result.issues.some((issue) => issue.id === 'tenant-key-scope-required'), true);
});

test('evaluateTenantSchemaSnapshot passes a complete tenant-isolated schema snapshot', () => {
  const policy = buildTenantDatabasePolicy({
    activeModules: ['students', 'finance', 'communication_sms'],
  });
  const requiredTables = policy.requiredTables.map((required) =>
    table(required.name, ['id', 'tenant_id', 'created_at'], true),
  );

  const result = evaluateTenantSchemaSnapshot(
    {
      tables: [
        ...requiredTables,
        table('module_registry', ['id', 'code', 'status'], false),
      ],
      encryption: {
        atRest: true,
        inTransit: true,
        backupEncrypted: true,
        keyScope: 'per_tenant',
      },
      runtimeControls: {
        tenantContextSessionSettings: true,
        tenantBoundGuard: true,
        auditLogTenantScope: true,
      },
    },
    policy,
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.issues, []);
});

test('extractSqlSchemaTables parses tenant columns and forced row-level security from SQL', () => {
  const tables = extractSqlSchemaTables(`
    CREATE TABLE IF NOT EXISTS students (
      id uuid PRIMARY KEY,
      tenant_id text NOT NULL,
      admission_number text NOT NULL
    );

    ALTER TABLE students ENABLE ROW LEVEL SECURITY;
    ALTER TABLE students FORCE ROW LEVEL SECURITY;

    CREATE TABLE module_registry (
      id uuid PRIMARY KEY,
      code text NOT NULL
    );
  `);

  assert.deepEqual(tables, [
    {
      name: 'students',
      columns: ['id', 'tenant_id', 'admission_number'],
      rowLevelSecurity: true,
      forcedRowLevelSecurity: true,
    },
    {
      name: 'module_registry',
      columns: ['id', 'code'],
      rowLevelSecurity: false,
      forcedRowLevelSecurity: false,
    },
  ]);
});

function table(
  name: string,
  columns: string[],
  forcedRowLevelSecurity: boolean,
) {
  return {
    name,
    columns,
    rowLevelSecurity: forcedRowLevelSecurity,
    forcedRowLevelSecurity,
  };
}
