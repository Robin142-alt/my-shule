import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { COHORT_SCHEMA_SQL } from '../modules/academics/cohort-schema';
import { REPORT_INFRASTRUCTURE_SCHEMA } from '../modules/exams/services/report-infrastructure-schema';

import {
  findTenantTablesWithoutForcedRls,
  renderTenantIsolationAuditMarkdown,
  runTenantIsolationAudit,
} from './tenant-isolation-audit';

test('runTenantIsolationAudit passes when tenant security evidence is present', () => {
  const result = runTenantIsolationAudit({
    generatedAt: '2026-05-16T00:00:00.000Z',
    sourceOverrides: buildPassingSources(),
  });

  assert.equal(result.ok, true);
  assert.equal(result.checks.some((check) => check.id === 'support-ticket-rls'), true);
  assert.equal(result.checks.every((check) => check.status === 'pass'), true);
});

test('runTenantIsolationAudit fails when critical support RLS evidence is missing', () => {
  const sources = buildPassingSources();
  sources['apps/api/src/modules/support/support-schema.service.ts'] = '';
  const result = runTenantIsolationAudit({
    generatedAt: '2026-05-16T00:00:00.000Z',
    sourceOverrides: sources,
  });

  assert.equal(result.ok, false);
  assert.equal(result.checks.find((check) => check.id === 'support-ticket-rls')?.status, 'fail');
});

test('renderTenantIsolationAuditMarkdown produces audit artifact content', () => {
  const result = runTenantIsolationAudit({
    generatedAt: '2026-05-16T00:00:00.000Z',
    sourceOverrides: buildPassingSources(),
  });
  const markdown = renderTenantIsolationAuditMarkdown(result);

  assert.match(markdown, /Security And Tenant Isolation Audit/);
  assert.match(markdown, /Support tickets enforce row level security/);
  assert.equal(markdown.includes('raw-secret'), false);
});

test('findTenantTablesWithoutForcedRls flags tenant tables missing forced RLS', () => {
  const missing = findTenantTablesWithoutForcedRls([
    {
      file: 'apps/api/src/modules/example/example-schema.service.ts',
      source: `
        CREATE TABLE IF NOT EXISTS safe_records (
          id uuid PRIMARY KEY,
          tenant_id uuid NOT NULL
        );
        ALTER TABLE safe_records FORCE ROW LEVEL SECURITY;

        CREATE TABLE IF NOT EXISTS leaky_records (
          id uuid PRIMARY KEY,
          tenant_id uuid NOT NULL
        );
      `,
    },
  ]);

  assert.deepEqual(missing, [
    {
      file: 'apps/api/src/modules/example/example-schema.service.ts',
      table: 'leaky_records',
    },
  ]);
});

test('findTenantTablesWithoutForcedRls recognizes simple operations schema table lists', () => {
  const missing = findTenantTablesWithoutForcedRls([
    {
      file: 'apps/api/src/modules/example/example-schema.service.ts',
      source: `
        import { buildSimpleOperationsSchema } from '../implementation100/simple-operations';

        const EXAMPLE_TABLES = [
          'example_records',
          'example_child_records',
        ] as const;

        buildSimpleOperationsSchema({
          tables: EXAMPLE_TABLES,
          mainTable: 'example_records',
          auditTable: 'example_audit_logs',
          relatedTablesSql: \`
            CREATE TABLE IF NOT EXISTS example_child_records (
              id uuid PRIMARY KEY,
              tenant_id text NOT NULL
            );

            CREATE TABLE IF NOT EXISTS omitted_child_records (
              id uuid PRIMARY KEY,
              tenant_id text NOT NULL
            );
          \`,
        });
      `,
    },
  ]);

  assert.deepEqual(missing, [
    {
      file: 'apps/api/src/modules/example/example-schema.service.ts',
      table: 'omitted_child_records',
    },
  ]);
});

test('cohort schema exposes forced RLS for every tenant table to the release audit', () => {
  assert.deepEqual(findTenantTablesWithoutForcedRls([
    { file: 'apps/api/src/modules/academics/cohort-schema.ts', source: COHORT_SCHEMA_SQL },
  ]), []);
});

test('report infrastructure exposes forced RLS for every tenant table to the release audit', () => {
  const file = 'apps/api/src/modules/exams/services/report-infrastructure-schema.ts';
  assert.deepEqual(findTenantTablesWithoutForcedRls([
    { file, source: REPORT_INFRASTRUCTURE_SCHEMA },
  ]), []);

  for (const table of ['report_source_versions', 'report_work', 'report_pdf_cache', 'report_object_uploads']) {
    const source = REPORT_INFRASTRUCTURE_SCHEMA.replace(
      `ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;`, '',
    );
    assert.deepEqual(findTenantTablesWithoutForcedRls([{ file, source }]), [{ file, table }]);
  }
});

test('runTenantIsolationAudit includes a forced-RLS source audit in workspace mode', () => {
  const result = runTenantIsolationAudit({
    generatedAt: '2026-05-16T00:00:00.000Z',
    workspaceRoot: process.cwd(),
  });

  assert.equal(
    result.checks.some((check) => check.id === 'all-tenant-tables-forced-rls'),
    true,
  );
});

test('schema audit scope is independent of the checkout directory name', () => {
  const root = mkdtempSync(join(tmpdir(), 'tenant-migration-audit-'));
  const sourceDirectory = join(root, 'apps', 'api', 'src');
  mkdirSync(sourceDirectory, { recursive: true });
  const schemaFile = join(sourceDirectory, 'school-schema.ts');
  const tableSql = 'CREATE TABLE school_records (tenant_id text);';
  try {
    writeFileSync(join(sourceDirectory, 'local-fixture.ts'), 'CREATE TABLE fixture_records (tenant_id text);');
    writeFileSync(schemaFile, `${tableSql} ALTER TABLE school_records FORCE ROW LEVEL SECURITY;`);
    const status = () => runTenantIsolationAudit({ workspaceRoot: root }).checks
      .find((check) => check.id === 'all-tenant-tables-forced-rls')?.status;
    assert.equal(status(), 'pass');
    writeFileSync(schemaFile, tableSql);
    assert.equal(status(), 'fail');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

export function buildPassingSources(): Record<string, string> {
  return {
    'apps/api/src/modules/support/support-schema.service.ts': [
      'ALTER TABLE support_tickets FORCE ROW LEVEL SECURITY',
      'ALTER TABLE support_internal_notes FORCE ROW LEVEL SECURITY',
      'ALTER TABLE support_notifications FORCE ROW LEVEL SECURITY',
    ].join('\n'),
    'apps/api/src/modules/support/repositories/support.repository.ts': 'WHERE tenant_id = $1 tenantId',
    'apps/api/src/modules/support/support.service.ts': 'ticket.tenant_id !== targetTicket.tenant_id listInternalNotes supportOperator',
    'apps/api/src/modules/integrations/integrations-schema.service.ts': [
      'ALTER TABLE school_sms_wallets FORCE ROW LEVEL SECURITY',
      'ALTER TABLE school_integrations FORCE ROW LEVEL SECURITY',
      'ALTER TABLE sms_logs FORCE ROW LEVEL SECURITY',
    ].join('\n'),
    'apps/api/src/modules/integrations/platform-sms.service.ts': 'piiEncryptionService.encrypt api_key',
    'apps/api/src/modules/integrations/daraja-integration.service.ts': 'piiEncryptionService.encrypt',
    'apps/api/src/modules/discipline/discipline-schema.service.ts': 'FORCE ROW LEVEL SECURITY tenant_id = current_setting(\'app.tenant_id\'',
    'apps/api/src/modules/discipline/counselling.service.ts': 'requireTenantId() confidential visibility counsellor role',
    'apps/api/src/auth/auth.service.ts': 'membership.tenant_id expectedTenantId',
    'apps/api/src/modules/integrations/parent-portal-auth.service.ts': 'tenant_id requireStore setTenantId',
    'apps/api/src/common/reports/report-export-queue.ts': 'attendance',
    'apps/api/src/common/uploads/upload-policy.ts': 'max file size mime contentType',
    'apps/api/src/common/uploads/upload-malware-scan.service.ts': 'malware scan',
    'apps/api/src/common/uploads/database-file-storage.service.ts': 'tenant signed object',
    'apps/api/src/modules/integrations/sms-dispatch.service.ts': 'class SmsDispatchService {}',
  };
}
