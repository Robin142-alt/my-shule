import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { ComplianceController } from './compliance.controller';
import { ComplianceSchemaService } from './compliance-schema.service';
import { ComplianceService } from './compliance.service';

test('ComplianceSchemaService creates consent, data-subject, retention, DPIA, and breach evidence tables with tenant RLS', async () => {
  let schemaSql = '';
  const service = new ComplianceSchemaService({
    runSchemaBootstrap: async (sql: string) => {
      schemaSql += sql;
    },
  } as never);

  await service.onModuleInit();

  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS consent_records/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS data_subject_requests/);
  assert.match(schemaSql, /access_request/);
  assert.match(schemaSql, /correction_request/);
  assert.match(schemaSql, /deletion_anonymization_request/);
  assert.match(schemaSql, /export_request/);
  assert.match(schemaSql, /objection_request/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS data_retention_schedules/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS child_data_dpia_records/);
  assert.match(schemaSql, /students/);
  assert.match(schemaSql, /payments/);
  assert.match(schemaSql, /sync_offline/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS breach_response_reports/);
  assert.match(schemaSql, /ALTER TABLE data_subject_requests FORCE ROW LEVEL SECURITY/);
  assert.match(schemaSql, /ALTER TABLE child_data_dpia_records FORCE ROW LEVEL SECURITY/);
  assert.match(schemaSql, /ALTER TABLE breach_response_reports FORCE ROW LEVEL SECURITY/);
});

test('ComplianceService runs data subject request workflow with SLA countdown, audit trail, and anonymized completion', async () => {
  const requestContext = new RequestContextService();
  const queries: string[] = [];
  const auditActions: string[] = [];
  let currentStatus = 'submitted';
  const dueAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const createdAt = new Date('2026-05-20T00:00:00.000Z');
  const updatedAt = new Date('2026-05-20T00:00:00.000Z');

  const service = new ComplianceService(
    requestContext,
    {
      withRequestTransaction: async (callback: () => Promise<unknown>) => callback(),
          executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
query: async (sql: string) => {
        queries.push(sql);

        if (/INSERT INTO data_subject_requests/.test(sql)) {
          currentStatus = 'submitted';
          return {
            rows: [
              buildDataSubjectRequestRow({
                status: currentStatus,
                due_at: dueAt,
                created_at: createdAt,
                updated_at: updatedAt,
              }),
            ],
          };
        }

        if (/status = 'identity_verification'/.test(sql)) {
          currentStatus = 'identity_verification';
          return {
            rows: [
              buildDataSubjectRequestRow({
                status: currentStatus,
                due_at: dueAt,
                created_at: createdAt,
                updated_at: updatedAt,
              }),
            ],
          };
        }

        if (/status = 'in_review'/.test(sql)) {
          currentStatus = 'in_review';
          return {
            rows: [
              buildDataSubjectRequestRow({
                status: currentStatus,
                due_at: dueAt,
                created_at: createdAt,
                updated_at: updatedAt,
              }),
            ],
          };
        }

        if (/UPDATE users/.test(sql)) {
          return { rows: [{ id: '11111111-1111-4111-8111-111111111111' }] };
        }

        if (/status = 'completed'/.test(sql)) {
          currentStatus = 'completed';
          return {
            rows: [
              buildDataSubjectRequestRow({
                status: currentStatus,
                due_at: dueAt,
                completed_at: new Date('2026-05-21T00:00:00.000Z'),
                response_payload: { anonymization: 'subject_user_anonymized' },
                created_at: createdAt,
                updated_at: updatedAt,
              }),
            ],
          };
        }

        throw new Error(`Unexpected query: ${sql}`);
      },
    } as never,
    {
      invalidateUserSessions: async () => undefined,
    } as never,
    {
      record: async (input: { action: string }) => {
        auditActions.push(input.action);
      },
    } as never,
    { get: (key: string) => (key === 'compliance.dataSubjectRequestDueDays' ? 30 : undefined) } as never,
  );

  await requestContext.run(
    schoolContext({
      request_id: 'request-1',
      tenant_id: 'green-valley',
      user_id: '11111111-1111-4111-8111-111111111111',
      role: 'principal',
      permissions: ['compliance:write'],
      is_authenticated: true,
      session_id: 'session-1',
      audience: 'school',
    }),
    async () => {
      const submitted = await service.submitDataSubjectRequest({
        request_type: 'deletion_anonymization_request',
        subject_user_id: '11111111-1111-4111-8111-111111111111',
        legal_basis: 'guardian request',
        requested_payload: { reason: 'left school' },
      });
      const verified = await service.verifyDataSubjectRequestIdentity(submitted.id, {
        verification_method: 'guardian_id_check',
        verification_reference: 'ticket-123',
      });
      const approved = await service.reviewDataSubjectRequest(submitted.id, {
        decision: 'approved',
        reason: 'identity verified',
      });
      const completed = await service.completeDataSubjectRequest(submitted.id, {
        anonymize_subject: true,
        response_payload: { export_reference: 'redacted-export-1' },
      });

      assert.equal(submitted.status, 'submitted');
      assert.equal(verified.status, 'identity_verification');
      assert.equal(approved.status, 'in_review');
      assert.equal(completed.status, 'completed');
      assert.equal(submitted.sla.overdue, false);
      assert.equal(submitted.sla.days_remaining >= 29, true);
    },
  );

  assert.equal(queries.some((sql) => /UPDATE users/.test(sql) && /Anonymized user/.test(sql)), true);
  assert.deepEqual(auditActions, [
    'data_subject_request.submitted',
    'data_subject_request.identity_verified',
    'data_subject_request.approved',
    'data_subject_request.subject_anonymized',
    'data_subject_request.completed',
  ]);
});

test('ComplianceService exports breach response reports with redacted evidence and audit logging', async () => {
  const requestContext = new RequestContextService();
  const auditActions: string[] = [];
  const service = new ComplianceService(
    requestContext,
    {
          executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
query: async (sql: string) => {
        assert.match(sql, /FROM breach_response_reports/);
        return {
          rows: [
            {
              id: '22222222-2222-4222-8222-222222222222',
              tenant_id: 'green-valley',
              incident_number: 'BR-2026-001',
              severity: 'high',
              status: 'contained',
              detected_at: new Date('2026-05-20T06:00:00.000Z'),
              contained_at: new Date('2026-05-20T06:30:00.000Z'),
              reported_to_odpc_at: null,
              affected_categories: ['sensitive_child_data', 'payment_data'],
              evidence_export: {
                summary: 'exported from observability events',
                raw_phone: '254712345678',
                nested: { payer_name: 'Jane Parent' },
              },
              created_by_user_id: '11111111-1111-4111-8111-111111111111',
              created_at: new Date('2026-05-20T06:05:00.000Z'),
              updated_at: new Date('2026-05-20T06:40:00.000Z'),
            },
          ],
        };
      },
    } as never,
    {
      invalidateUserSessions: async () => undefined,
    } as never,
    {
      record: async (input: { action: string }) => {
        auditActions.push(input.action);
      },
    } as never,
  );

  const exported = await requestContext.run(
    schoolContext({
      request_id: 'request-2',
      tenant_id: 'green-valley',
      user_id: '11111111-1111-4111-8111-111111111111',
      role: 'principal',
      permissions: ['compliance:read'],
      is_authenticated: true,
      session_id: 'session-1',
      audience: 'school',
    }),
    async () => service.exportBreachResponseReport('22222222-2222-4222-8222-222222222222'),
  );

  assert.equal(exported.incident_number, 'BR-2026-001');
  assert.deepEqual(exported.affected_categories, ['sensitive_child_data', 'payment_data']);
  assert.equal(JSON.stringify(exported).includes('254712345678'), false);
  assert.equal(JSON.stringify(exported).includes('Jane Parent'), false);
  assert.deepEqual(auditActions, ['breach_response_report.exported']);
});

test('ComplianceController exposes data-subject workflow and breach export routes', () => {
  assert.equal(Reflect.getMetadata(PATH_METADATA, ComplianceController), 'compliance');

  const routeMethods = [
    'submitDataSubjectRequest',
    'verifyDataSubjectRequestIdentity',
    'reviewDataSubjectRequest',
    'completeDataSubjectRequest',
    'exportBreachResponseReport',
  ];

  for (const method of routeMethods) {
    const handler = ComplianceController.prototype[method as keyof ComplianceController] as Function;
    assert.equal(typeof handler, 'function');
    assert.notEqual(Reflect.getMetadata(METHOD_METADATA, handler), undefined);
  }
});

function buildDataSubjectRequestRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    tenant_id: 'green-valley',
    requester_user_id: '11111111-1111-4111-8111-111111111111',
    subject_user_id: '11111111-1111-4111-8111-111111111111',
    request_type: 'deletion_anonymization_request',
    status: 'submitted',
    legal_basis: 'guardian request',
    requested_payload: { reason: 'left school' },
    response_payload: {},
    due_at: new Date('2026-06-19T00:00:00.000Z'),
    completed_at: null,
    created_at: new Date('2026-05-20T00:00:00.000Z'),
    updated_at: new Date('2026-05-20T00:00:00.000Z'),
    ...overrides,
  };
}

function schoolContext(overrides: Record<string, unknown>): never {
  return {
    client_ip: '127.0.0.1',
    user_agent: 'test-suite',
    method: 'POST',
    path: '/compliance',
    started_at: '2026-05-20T00:00:00.000Z',
    ...overrides,
  } as never;
}
