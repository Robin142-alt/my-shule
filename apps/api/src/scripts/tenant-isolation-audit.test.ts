import assert from 'node:assert/strict';
import test from 'node:test';

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
