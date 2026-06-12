import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_PERMISSION_CATALOG,
  DEFAULT_ROLE_CATALOG,
} from '../../auth/auth.constants';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { CounsellingNoteEncryptionService } from './counselling-note-encryption.service';
import { CounsellingService } from './counselling.service';
import { DisciplineSchemaService } from './discipline-schema.service';
import { DisciplineService } from './discipline.service';
import { CounsellingRepository } from './repositories/counselling.repository';
import { DisciplineRepository } from './repositories/discipline.repository';

const uuid = (suffix: string) => `00000000-0000-0000-0000-${suffix.padStart(12, '0')}`;

test('DisciplineSchemaService creates tenant-scoped discipline and counselling tables with RLS', async () => {
  let bootstrapSql = '';
  const service = new DisciplineSchemaService({
    runSchemaBootstrap: async (sql: string): Promise<void> => {
      bootstrapSql = sql;
    },
  } as never);

  await service.onModuleInit();

  for (const tableName of [
    'discipline_incidents',
    'offense_categories',
    'discipline_actions',
    'counselling_sessions',
    'counselling_notes',
    'behavior_points',
    'commendations',
    'parent_acknowledgements',
    'discipline_attachments',
    'discipline_comments',
    'discipline_audit_logs',
    'discipline_notifications',
    'behavior_improvement_plans',
  ]) {
    assert.match(bootstrapSql, new RegExp(`CREATE TABLE IF NOT EXISTS ${tableName}`));
    assert.match(bootstrapSql, new RegExp(`ALTER TABLE ${tableName} FORCE ROW LEVEL SECURITY`));
  }

  assert.match(bootstrapSql, /tenant_id text NOT NULL/);
  assert.match(bootstrapSql, /school_id uuid NOT NULL/);
  assert.match(bootstrapSql, /CREATE INDEX IF NOT EXISTS ix_discipline_incidents_student_term/);
  assert.match(bootstrapSql, /CREATE INDEX IF NOT EXISTS ix_counselling_sessions_counsellor_schedule/);
  assert.match(bootstrapSql, /visibility IN \('internal_only', 'discipline_office', 'parent_visible'\)/);
  assert.match(bootstrapSql, /source_type IN \('incident', 'commendation', 'correction', 'lab_attendance'\)/);
});

test('default auth catalog exposes discipline and counselling permissions to operational roles', () => {
  const permissionKeys = DEFAULT_PERMISSION_CATALOG.map(
    (permission) => `${permission.resource}:${permission.action}`,
  );

  for (const permission of [
    'discipline:read',
    'discipline:write',
    'discipline:manage',
    'discipline:approve',
    'discipline:reports',
    'counselling:read',
    'counselling:write',
    'counselling:manage',
  ]) {
    assert.ok(permissionKeys.includes(permission), `${permission} missing from catalog`);
  }

  const teacher = DEFAULT_ROLE_CATALOG.find((role) => role.code === 'teacher');
  const admin = DEFAULT_ROLE_CATALOG.find((role) => role.code === 'admin');
  const counsellor = DEFAULT_ROLE_CATALOG.find((role) => role.code === 'school_counsellor');
  const dean = DEFAULT_ROLE_CATALOG.find((role) => role.code === 'discipline_master');

  assert.ok(teacher?.permissions.includes('discipline:write'));
  assert.ok(admin?.permissions.includes('discipline:manage'));
  assert.ok(admin?.permissions.includes('discipline:approve'));
  assert.ok(counsellor?.permissions.includes('counselling:manage'));
  assert.ok(dean?.permissions.includes('discipline:manage'));
});

test('CounsellingNoteEncryptionService encrypts private notes without exposing raw text', () => {
  const service = new CounsellingNoteEncryptionService({
    get: (key: string) =>
      key === 'security.piiEncryptionKey'
        ? '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
        : undefined,
  } as never);

  const encrypted = service.encrypt('Student disclosed sensitive family context.');

  assert.notEqual(encrypted.encrypted_note, 'Student disclosed sensitive family context.');
  assert.ok(encrypted.note_nonce.length > 0);
  assert.ok(encrypted.note_auth_tag.length > 0);
  assert.equal(service.decrypt(encrypted), 'Student disclosed sensitive family context.');
});

test('DisciplineService creates an incident with audit log and behavior points', async () => {
  const requestContext = new RequestContextService();
  const createdIncident = {
    id: uuid('101'),
    tenant_id: 'tenant-a',
    school_id: uuid('201'),
    student_id: uuid('301'),
    class_id: uuid('401'),
    academic_term_id: uuid('501'),
    academic_year_id: uuid('601'),
    offense_category_id: uuid('701'),
    reporting_staff_id: uuid('801'),
    assigned_staff_id: null,
    incident_number: 'DIS-2026-000001',
    title: 'Fighting',
    severity: 'high',
    status: 'reported',
    occurred_at: '2026-05-16T09:00:00.000Z',
    reported_at: '2026-05-16T09:15:00.000Z',
    location: 'Playground',
    witnesses: [],
    description: 'Student was involved in a fight during break.',
    action_taken: null,
    recommendations: 'Review by discipline office.',
    linked_counselling_referral_id: null,
    behavior_points_delta: -15,
    parent_notification_status: 'queued',
    metadata: {},
    deleted_at: null,
    created_at: '2026-05-16T09:15:00.000Z',
    updated_at: '2026-05-16T09:15:00.000Z',
  };
  const calls: string[] = [];
  const repository = {
    findTenantSchoolId: async () => uuid('201'),
    findOffenseCategoryById: async () => ({
      id: uuid('701'),
      name: 'Fighting',
      default_severity: 'high',
      default_points: -15,
      notify_parent_by_default: true,
    }),
    generateIncidentNumber: async () => 'DIS-2026-000001',
    createIncident: async (input: Record<string, unknown>) => {
      calls.push(`incident:${input.incident_number}`);
      assert.equal(input.tenant_id, 'tenant-a');
      assert.equal(input.school_id, uuid('201'));
      assert.equal(input.behavior_points_delta, -15);
      return createdIncident;
    },
    createAuditLog: async (input: Record<string, unknown>) => {
      calls.push(`audit:${input.action}`);
    },
    createBehaviorPoint: async (input: Record<string, unknown>) => {
      calls.push(`points:${input.points_delta}`);
    },
    createNotification: async (input: Record<string, unknown>) => {
      calls.push(`notification:${input.notification_type}`);
    },
  };
  const service = new DisciplineService(
    requestContext,
    { withRequestTransaction: async <T>(callback: () => Promise<T>) => callback() } as never,
    repository as never,
    undefined as never,
  );

  const result = await requestContext.run(
    {
      tenant_id: 'tenant-a',
      user_id: uuid('801'),
      role: 'teacher',
      permissions: ['discipline:write'],
      request_id: 'request-1',
      session_id: null,
      client_ip: '127.0.0.1',
      user_agent: 'node-test',
      method: 'POST',
      path: '/discipline/incidents',
      started_at: '2026-05-16T09:15:00.000Z',
      is_authenticated: true,
    },
    () =>
      service.createIncident({
        student_id: uuid('301'),
        class_id: uuid('401'),
        academic_term_id: uuid('501'),
        academic_year_id: uuid('601'),
        offense_category_id: uuid('701'),
        title: ' Fighting ',
        severity: 'high',
        occurred_at: '2026-05-16T09:00:00.000Z',
        location: ' Playground ',
        description: ' Student was involved in a fight during break. ',
        recommendations: ' Review by discipline office. ',
      }),
  );

  assert.equal(result.incident.incident_number, 'DIS-2026-000001');
  assert.deepEqual(calls, [
    'incident:DIS-2026-000001',
    'audit:incident.created',
    'points:-15',
    'notification:incident_alert',
  ]);
});

test('DisciplineService normalizes incident list pagination and avoids broad one-letter searches', async () => {
  const requestContext = new RequestContextService();
  const observed: Record<string, unknown> = {};
  const repository = {
    listIncidents: async (input: Record<string, unknown>) => {
      observed.incidents = input;
      return [];
    },
    listParentIncidents: async (input: Record<string, unknown>) => {
      observed.parentIncidents = input;
      return [];
    },
  };
  const service = new DisciplineService(
    requestContext,
    { withRequestTransaction: async <T>(callback: () => Promise<T>) => callback() } as never,
    repository as never,
  );
  const context = {
    tenant_id: 'tenant-a',
    user_id: uuid('804'),
    role: 'discipline_master',
    permissions: ['discipline:read', 'portal:read_own_children'],
    request_id: 'request-discipline-lists',
    session_id: null,
    client_ip: '127.0.0.1',
    user_agent: 'node-test',
    method: 'GET',
    path: '/discipline/incidents',
    started_at: '2026-05-16T10:00:00.000Z',
    is_authenticated: true,
  };

  await requestContext.run(context, () =>
    service.listIncidents({ q: 'a', limit: 500, offset: -20 } as never),
  );
  await requestContext.run(context, () =>
    service.listParentIncidents({ limit: 500, offset: Number.NaN } as never),
  );

  const incidentQuery = (observed.incidents as { query: Record<string, unknown> }).query;
  assert.equal(incidentQuery.q, undefined);
  assert.equal(incidentQuery.limit, 50);
  assert.equal(incidentQuery.offset, 0);
  assert.equal((observed.parentIncidents as { limit: unknown }).limit, 50);
  assert.equal((observed.parentIncidents as { offset: unknown }).offset, 0);
});

test('DisciplineService does not upsert default offense categories when configured categories exist', async () => {
  const requestContext = new RequestContextService();
  const calls: string[] = [];
  const repository = {
    findTenantSchoolId: async () => uuid('201'),
    listOffenseCategories: async () => [
      {
        id: uuid('701'),
        tenant_id: 'tenant-a',
        school_id: uuid('201'),
        code: 'lateness',
        name: 'Lateness',
        description: null,
        default_severity: 'low',
        default_points: -2,
        default_action_type: null,
        notify_parent_by_default: false,
        escalation_rules: {},
        is_positive: false,
        is_active: true,
        created_by_user_id: null,
        created_at: '2026-05-16T10:00:00.000Z',
        updated_at: '2026-05-16T10:00:00.000Z',
      },
    ],
    ensureDefaultOffenseCategories: async () => {
      calls.push('ensureDefaultOffenseCategories');
    },
  };
  const service = new DisciplineService(
    requestContext,
    { withRequestTransaction: async <T>(callback: () => Promise<T>) => callback() } as never,
    repository as never,
  );

  const categories = await requestContext.run(
    {
      tenant_id: 'tenant-a',
      user_id: uuid('804'),
      role: 'discipline_master',
      permissions: ['discipline:read'],
      request_id: 'request-offense-categories',
      session_id: null,
      client_ip: '127.0.0.1',
      user_agent: 'node-test',
      method: 'GET',
      path: '/discipline/offense-categories',
      started_at: '2026-05-16T10:00:00.000Z',
      is_authenticated: true,
    },
    () => service.listOffenseCategories(),
  );

  assert.equal(categories.length, 1);
  assert.deepEqual(calls, []);
});

test('DisciplineRepository bounds incident lists and avoids broad category selects', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new DisciplineRepository({
    query: async (sql: string, params: unknown[]) => {
      calls.push({ sql, params });
      return { rows: [] };
    },
  } as never);

  await repository.listIncidents({
    tenant_id: 'tenant-a',
    query: { q: 'a', limit: 500, offset: -10 } as never,
    actor_user_id: uuid('804'),
    can_read_all: true,
  });
  await repository.listParentIncidents({
    tenant_id: 'tenant-a',
    parent_user_id: uuid('901'),
    limit: 500,
    offset: -10,
  });
  await repository.listOffenseCategories('tenant-a');
  await repository.findOffenseCategoryById('tenant-a', uuid('701'));

  assert.match(calls[0]!.sql, /LIMIT \$14::integer\s+OFFSET \$15::integer/);
  assert.equal(calls[0]!.params[13], 50);
  assert.equal(calls[0]!.params[14], 0);
  assert.match(calls[1]!.sql, /LIMIT \$3::integer\s+OFFSET \$4::integer/);
  assert.equal(calls[1]!.params[2], 50);
  assert.equal(calls[1]!.params[3], 0);
  assert.doesNotMatch(calls[2]!.sql, /SELECT\s+\*/i);
  assert.doesNotMatch(calls[3]!.sql, /SELECT\s+\*/i);
});

test('DisciplineRepository returns explicit columns for action workflow mutations', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new DisciplineRepository({
    query: async (sql: string, params: unknown[]) => {
      calls.push({ sql, params });
      return { rows: [] };
    },
  } as never);

  await repository.updateIncidentStatus({
    tenant_id: 'tenant-a',
    incident_id: uuid('101'),
    status: 'under_review',
  });
  await repository.assignIncident({
    tenant_id: 'tenant-a',
    incident_id: uuid('101'),
    assigned_staff_id: uuid('804'),
  });
  await repository.createAction({
    tenant_id: 'tenant-a',
    school_id: uuid('201'),
    incident_id: uuid('101'),
    student_id: uuid('301'),
    action_type: 'detention',
    title: 'Lunch break detention',
    description: undefined,
    assigned_staff_id: uuid('804'),
    due_at: undefined,
    remarks: undefined,
    metadata: {},
    created_by_user_id: uuid('804'),
    requires_approval: false,
  });
  await repository.listActions('tenant-a', uuid('101'));
  await repository.completeAction({
    tenant_id: 'tenant-a',
    action_id: uuid('901'),
    completion_notes: 'Completed',
  });
  await repository.approveAction({
    tenant_id: 'tenant-a',
    action_id: uuid('901'),
    approved_by_user_id: uuid('805'),
  });

  for (const call of calls) {
    assert.doesNotMatch(call.sql, /\b(?:SELECT|RETURNING)\s+\*/i);
  }

  assert.match(calls[0]!.sql, /id::text/);
  assert.match(calls[3]!.sql, /FROM discipline_actions/);
  assert.match(calls[3]!.sql, /ORDER BY created_at ASC/);
});

test('DisciplineService blocks parent acknowledgement for unlinked students', async () => {
  const requestContext = new RequestContextService();
  const repository = {
    findIncidentById: async () => ({
      id: uuid('101'),
      tenant_id: 'tenant-a',
      school_id: uuid('201'),
      student_id: uuid('301'),
      class_id: uuid('401'),
      academic_term_id: uuid('501'),
      academic_year_id: uuid('601'),
      offense_category_id: uuid('701'),
      reporting_staff_id: uuid('801'),
      assigned_staff_id: null,
      incident_number: 'DIS-2026-000001',
      title: 'Fighting',
      severity: 'high',
      status: 'awaiting_parent_response',
      occurred_at: '2026-05-16T09:00:00.000Z',
      reported_at: '2026-05-16T09:15:00.000Z',
      location: 'Playground',
      witnesses: [],
      description: 'Student was involved in a fight during break.',
      action_taken: null,
      recommendations: null,
      linked_counselling_referral_id: null,
      behavior_points_delta: -15,
      parent_notification_status: 'sent',
      metadata: {},
      deleted_at: null,
      created_at: '2026-05-16T09:15:00.000Z',
      updated_at: '2026-05-16T09:15:00.000Z',
    }),
    isParentLinkedToStudent: async () => false,
  };
  const service = new DisciplineService(
    requestContext,
    { withRequestTransaction: async <T>(callback: () => Promise<T>) => callback() } as never,
    repository as never,
    undefined as never,
  );

  await assert.rejects(
    requestContext.run(
      {
        tenant_id: 'tenant-a',
        user_id: uuid('901'),
        role: 'parent',
        permissions: ['portal:read_own_children'],
        request_id: 'request-2',
        session_id: null,
        client_ip: '127.0.0.1',
        user_agent: 'node-test',
        method: 'POST',
        path: '/discipline/parent/incidents/00000000-0000-0000-0000-000000000101/acknowledge',
        started_at: '2026-05-16T10:00:00.000Z',
        is_authenticated: true,
      },
      () =>
        service.acknowledgeIncident(uuid('101'), {
          acknowledgement_note: 'I have seen this notice.',
        }),
    ),
    /linked child/,
  );
});

test('DisciplineService updates incident fields through the repository before auditing', async () => {
  const requestContext = new RequestContextService();
  const calls: string[] = [];
  const repository = {
    findIncidentById: async () => ({
      id: uuid('101'),
      tenant_id: 'tenant-a',
      school_id: uuid('201'),
      student_id: uuid('301'),
      class_id: uuid('401'),
      academic_term_id: uuid('501'),
      academic_year_id: uuid('601'),
      offense_category_id: uuid('701'),
      reporting_staff_id: uuid('801'),
      assigned_staff_id: null,
      incident_number: 'DIS-2026-000001',
      title: 'Original title',
      severity: 'medium',
      status: 'under_review',
      occurred_at: '2026-05-16T09:00:00.000Z',
      reported_at: '2026-05-16T09:15:00.000Z',
      location: 'Dormitory',
      witnesses: [],
      description: 'Original description',
      action_taken: null,
      recommendations: null,
      linked_counselling_referral_id: null,
      behavior_points_delta: -8,
      parent_notification_status: 'not_required',
      metadata: {},
      deleted_at: null,
      created_at: '2026-05-16T09:15:00.000Z',
      updated_at: '2026-05-16T09:15:00.000Z',
    }),
    updateIncident: async (input: Record<string, unknown>) => {
      calls.push(`update:${input.incident_id}`);
      assert.equal(input.tenant_id, 'tenant-a');
      assert.equal(input.title, 'Updated title');
      return { id: uuid('101'), title: 'Updated title', severity: 'high' };
    },
    createAuditLog: async (input: Record<string, unknown>) => {
      calls.push(`audit:${input.action}`);
    },
  };
  const service = new DisciplineService(
    requestContext,
    { withRequestTransaction: async <T>(callback: () => Promise<T>) => callback() } as never,
    repository as never,
  );

  const result = await requestContext.run(
    {
      tenant_id: 'tenant-a',
      user_id: uuid('802'),
      role: 'discipline_master',
      permissions: ['discipline:manage'],
      request_id: 'request-3',
      session_id: null,
      client_ip: '127.0.0.1',
      user_agent: 'node-test',
      method: 'PATCH',
      path: '/discipline/incidents/00000000-0000-0000-0000-000000000101',
      started_at: '2026-05-16T10:00:00.000Z',
      is_authenticated: true,
    },
    () =>
      service.updateIncident(uuid('101'), {
        title: ' Updated title ',
        severity: 'high',
      }),
  );

  assert.deepEqual(result, { id: uuid('101'), title: 'Updated title', severity: 'high' });
  assert.deepEqual(calls, [
    `update:${uuid('101')}`,
    'audit:incident.updated',
  ]);
});

test('DisciplineService returns operational analytics from the repository', async () => {
  const requestContext = new RequestContextService();
  const repository = {
    getDisciplineAnalytics: async (tenantId: string) => {
      assert.equal(tenantId, 'tenant-a');
      return {
        open_cases: 12,
        severe_incidents: 3,
        pending_approvals: 2,
        repeat_offender_alerts: 4,
        top_offenses: [{ offense: 'Fighting', count: 5 }],
        incidents_by_severity: [{ severity: 'high', count: 3 }],
        incidents_by_status: [{ status: 'under_review', count: 8 }],
      };
    },
  };
  const service = new DisciplineService(
    requestContext,
    { withRequestTransaction: async <T>(callback: () => Promise<T>) => callback() } as never,
    repository as never,
  );

  const analytics = await requestContext.run(
    {
      tenant_id: 'tenant-a',
      user_id: uuid('803'),
      role: 'principal',
      permissions: ['discipline:reports'],
      request_id: 'request-4',
      session_id: null,
      client_ip: '127.0.0.1',
      user_agent: 'node-test',
      method: 'GET',
      path: '/discipline/analytics',
      started_at: '2026-05-16T10:00:00.000Z',
      is_authenticated: true,
    },
    () => service.getAnalytics(),
  );

  assert.equal(analytics.open_cases, 12);
  assert.deepEqual(analytics.top_offenses, [{ offense: 'Fighting', count: 5 }]);
  assert.ok(analytics.generated_at);
});

test('CounsellingService dashboard is backed by counselling repository aggregates', async () => {
  const requestContext = new RequestContextService();
  const counsellingRepository = {
    getCounsellingDashboard: async (tenantId: string) => {
      assert.equal(tenantId, 'tenant-a');
      return {
        active_referrals: 7,
        upcoming_sessions: 4,
        improvement_cases: 3,
        repeat_referrals: 2,
        high_risk_students: 1,
        followups_due: 5,
      };
    },
  };
  const service = new CounsellingService(
    requestContext,
    { withRequestTransaction: async <T>(callback: () => Promise<T>) => callback() } as never,
    {} as never,
    counsellingRepository as never,
    {} as never,
    { publish: async () => {} } as never,
  );

  const dashboard = await requestContext.run(
    {
      tenant_id: 'tenant-a',
      user_id: uuid('804'),
      role: 'school_counsellor',
      permissions: ['counselling:read'],
      request_id: 'request-5',
      session_id: null,
      client_ip: '127.0.0.1',
      user_agent: 'node-test',
      method: 'GET',
      path: '/counselling/dashboard',
      started_at: '2026-05-16T10:00:00.000Z',
      is_authenticated: true,
    },
    () => service.getDashboard(),
  );

  assert.equal(dashboard.active_referrals, 7);
  assert.equal(dashboard.followups_due, 5);
  assert.ok(dashboard.generated_at);
});

test('CounsellingService bounds counselling list pagination before repository calls', async () => {
  const requestContext = new RequestContextService();
  const observed: Record<string, unknown> = {};
  const counsellingRepository = {
    listReferrals: async (input: Record<string, unknown>) => {
      observed.referrals = input;
      return [];
    },
    listSessions: async (input: Record<string, unknown>) => {
      observed.sessions = input;
      return [];
    },
  };
  const service = new CounsellingService(
    requestContext,
    { withRequestTransaction: async <T>(callback: () => Promise<T>) => callback() } as never,
    {} as never,
    counsellingRepository as never,
    {} as never,
    { publish: async () => {} } as never,
  );
  const context = {
    tenant_id: 'tenant-a',
    user_id: uuid('804'),
    role: 'school_counsellor',
    permissions: ['counselling:read'],
    request_id: 'request-counselling-lists',
    session_id: null,
    client_ip: '127.0.0.1',
    user_agent: 'node-test',
    method: 'GET',
    path: '/counselling/referrals',
    started_at: '2026-05-16T10:00:00.000Z',
    is_authenticated: true,
  };

  await requestContext.run(context, () =>
    service.listReferrals({ limit: 500, offset: -20 } as never),
  );
  await requestContext.run(context, () =>
    service.listSessions({ limit: 0, offset: Number.NaN } as never),
  );

  assert.deepEqual((observed.referrals as { query: Record<string, unknown> }).query, {
    limit: 50,
    offset: 0,
  });
  assert.deepEqual((observed.sessions as { query: Record<string, unknown> }).query, {
    limit: 25,
    offset: 0,
  });
});

test('CounsellingRepository paginates tenant-scoped counselling lists without broad selects', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new CounsellingRepository({
    query: async (sql: string, params: unknown[]) => {
      calls.push({ sql, params });
      return { rows: [] };
    },
  } as never);

  await repository.listReferrals({
    tenant_id: 'tenant-a',
    query: { limit: 500, offset: -10 } as never,
  });
  await repository.listSessions({
    tenant_id: 'tenant-a',
    query: { limit: 500, offset: -10 } as never,
    can_read_all: true,
    actor_user_id: uuid('804'),
  });
  await repository.findSessionById('tenant-a', uuid('701'));
  await repository.listNotes({ tenant_id: 'tenant-a', session_id: uuid('701') });

  for (const call of calls) {
    assert.doesNotMatch(call.sql, /SELECT\s+\*/i);
    assert.match(call.sql, /tenant_id = \$1/);
  }

  assert.match(calls[0]!.sql, /LIMIT \$5::integer\s+OFFSET \$6::integer/);
  assert.equal(calls[0]!.params[4], 50);
  assert.equal(calls[0]!.params[5], 0);
  assert.match(calls[1]!.sql, /LIMIT \$7::integer\s+OFFSET \$8::integer/);
  assert.equal(calls[1]!.params[6], 50);
  assert.equal(calls[1]!.params[7], 0);
});

test('DisciplineService does not let report-only users read raw incident cases', async () => {
  const requestContext = new RequestContextService();
  const repository = {
    findIncidentById: async () => ({
      id: uuid('101'),
      tenant_id: 'tenant-a',
      school_id: uuid('201'),
      student_id: uuid('301'),
      class_id: uuid('401'),
      academic_term_id: uuid('501'),
      academic_year_id: uuid('601'),
      offense_category_id: uuid('701'),
      reporting_staff_id: uuid('801'),
      assigned_staff_id: null,
      incident_number: 'DIS-2026-000001',
      title: 'Fighting',
      severity: 'high',
      status: 'under_review',
      occurred_at: '2026-05-16T09:00:00.000Z',
      reported_at: '2026-05-16T09:15:00.000Z',
      location: 'Playground',
      witnesses: [],
      description: 'Internal incident details',
      action_taken: null,
      recommendations: null,
      linked_counselling_referral_id: null,
      behavior_points_delta: -15,
      parent_notification_status: 'sent',
      metadata: {},
      deleted_at: null,
      created_at: '2026-05-16T09:15:00.000Z',
      updated_at: '2026-05-16T09:15:00.000Z',
    }),
  };
  const service = new DisciplineService(
    requestContext,
    { withRequestTransaction: async <T>(callback: () => Promise<T>) => callback() } as never,
    repository as never,
  );

  await assert.rejects(
    () =>
      requestContext.run(
        {
          tenant_id: 'tenant-a',
          user_id: uuid('900'),
          role: 'teacher',
          permissions: ['discipline:reports'],
          request_id: 'request-6',
          session_id: null,
          client_ip: '127.0.0.1',
          user_agent: 'node-test',
          method: 'GET',
          path: '/discipline/incidents/00000000-0000-0000-0000-000000000101',
          started_at: '2026-05-16T10:00:00.000Z',
          is_authenticated: true,
        },
        () => service.getIncident(uuid('101')),
      ),
    /cannot access this discipline incident/i,
  );
});

test('CounsellingService only exposes parent-visible notes to linked guardians', async () => {
  const requestContext = new RequestContextService();
  const noteEncryption = new CounsellingNoteEncryptionService({
    get: (key: string) =>
      key === 'security.piiEncryptionKey'
        ? '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
        : undefined,
  } as never);
  const encrypted = noteEncryption.encrypt('Follow-up plan discussed with parent.');
  let linked = false;
  const disciplineRepository = {
    isParentLinkedToStudent: async (input: Record<string, unknown>) => {
      assert.equal(input.tenant_id, 'tenant-a');
      assert.equal(input.parent_user_id, uuid('901'));
      assert.equal(input.student_id, uuid('301'));
      return linked;
    },
  };
  const counsellingRepository = {
    findSessionById: async () => ({
      id: uuid('701'),
      tenant_id: 'tenant-a',
      school_id: uuid('201'),
      student_id: uuid('301'),
      referral_id: null,
      counsellor_user_id: uuid('804'),
      status: 'scheduled',
      scheduled_for: '2026-05-16T10:00:00.000Z',
      completed_at: null,
      location: 'Counselling office',
      agenda: 'Follow-up',
      outcome_summary: null,
      created_at: '2026-05-16T09:00:00.000Z',
      updated_at: '2026-05-16T09:00:00.000Z',
    }),
    listNotes: async () => [
      {
        id: uuid('801'),
        tenant_id: 'tenant-a',
        school_id: uuid('201'),
        student_id: uuid('301'),
        counselling_session_id: uuid('701'),
        counsellor_user_id: uuid('804'),
        visibility: 'parent_visible',
        ...encrypted,
        safe_summary: 'Follow-up plan shared',
        risk_indicators: [],
        created_at: '2026-05-16T10:10:00.000Z',
        updated_at: '2026-05-16T10:10:00.000Z',
      },
    ],
  };
  const service = new CounsellingService(
    requestContext,
    { withRequestTransaction: async <T>(callback: () => Promise<T>) => callback() } as never,
    disciplineRepository as never,
    counsellingRepository as never,
    noteEncryption as never,
    { publish: async () => {} } as never,
  );
  const parentContext = {
    tenant_id: 'tenant-a',
    user_id: uuid('901'),
    role: 'parent',
    permissions: ['portal:read_own_children'],
    request_id: 'request-7',
    session_id: null,
    client_ip: '127.0.0.1',
    user_agent: 'node-test',
    method: 'GET',
    path: '/counselling/sessions/00000000-0000-0000-0000-000000000701/notes',
    started_at: '2026-05-16T10:00:00.000Z',
    is_authenticated: true,
  };

  await assert.rejects(
    () => requestContext.run(parentContext, () => service.listNotes(uuid('701'))),
    /cannot access this counselling session/i,
  );

  linked = true;
  const notes = await requestContext.run(parentContext, () => service.listNotes(uuid('701')));

  assert.equal(notes[0]?.redacted, false);
  assert.equal(notes[0]?.note, 'Follow-up plan discussed with parent.');
});
