import assert from 'node:assert/strict';
import test from 'node:test';

import { AdmissionsSchemaService } from './admissions-schema.service';
import { AdmissionsRepository } from './repositories/admissions.repository';

test('AdmissionsRepository summary treats three uploads as the complete admissions document set', async () => {
  const queries: string[] = [];
  const repository = new AdmissionsRepository({
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

      if (sql.includes('COUNT(*)::text AS total')) {
        return { rows: [{ total: '0' }] };
      }

      return { rows: [] };
    },
  } as never);

  await repository.buildSummary('tenant-a');

  const missingDocumentsQuery = queries.find((sql) => sql.includes('COUNT(document.id)::int AS uploaded_documents'));
  assert.ok(missingDocumentsQuery);
  assert.match(missingDocumentsQuery, /HAVING COUNT\(document\.id\) < 3/);
});

test('AdmissionsRepository uses the supported subject lifecycle contract', async () => {
  const queries: string[] = [];
  const repository = new AdmissionsRepository({
    executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        },
      });
    },
    query: async (sql: string) => {
      queries.push(sql);

      if (sql.includes('AS foundation')) {
        return {
          rows: [{
            foundation: {
              academic_years: [],
              classes: [],
              streams: [],
              subjects: [],
              class_subject_assignments: [],
            },
          }],
        };
      }

      return { rows: [] };
    },
  } as never);

  await repository.getAdmissionFoundation('tenant-a');

  const foundationQuery = queries.find((sql) => sql.includes('FROM subjects subject'));
  assert.ok(foundationQuery);
  assert.doesNotMatch(foundationQuery, /subject\.is_active/);
  assert.match(foundationQuery, /lower\(COALESCE\(subject\.status, 'active'\)\) = 'active'/);
  assert.match(foundationQuery, /subject\.deleted_at IS NULL/);
  assert.match(foundationQuery, /subject\.archived_at IS NULL/);
  assert.match(foundationQuery, /academic_cohort_placements placement/);
  assert.match(foundationQuery, /placement.status='active'/);
  assert.match(foundationQuery, /'academic_term_id',NULL/);

  const registrationMethod = String(repository.admitCanonicalStudent);
  assert.doesNotMatch(registrationMethod, /subject\.is_active/);
  assert.match(registrationMethod, /subject\.deleted_at IS NULL/);
});

test('AdmissionsRepository direct admission writes the complete application lifecycle contract', () => {
  const registrationMethod = String(AdmissionsRepository.prototype.admitCanonicalStudent);

  assert.match(registrationMethod, /id,\s*tenant_id,\s*school_id,\s*application_number/);
  assert.match(registrationMethod, /gen_random_uuid\(\)::text,\s*\$1,\s*\$1/);
  assert.match(registrationMethod, /application_status,\s*submitted_at,\s*approved_at,\s*updated_at/);
  assert.match(registrationMethod, /'approved',\s*'ACCEPTED',\s*NOW\(\),\s*NOW\(\),\s*NOW\(\)/);
  assert.match(registrationMethod, /application_status = 'ADMITTED'/);
  assert.match(registrationMethod, /INSERT INTO students \(\s*id,\s*tenant_id,\s*school_id/);
  assert.match(registrationMethod, /pg_advisory_xact_lock/);
  assert.match(registrationMethod, /tx\.\$executeRawUnsafe\(\s*'SELECT pg_advisory_xact_lock/);
  assert.doesNotMatch(
    registrationMethod,
    /await query\(\s*'SELECT pg_advisory_xact_lock/,
  );
  assert.match(registrationMethod, /INSERT INTO academic_levels/);
  assert.match(registrationMethod, /UPDATE class_sections\s+SET academic_level_id = \$3/);
  assert.match(registrationMethod, /ADMISSION_ACADEMIC_LEVEL_NOT_CONFIGURED/);
  assert.match(
    registrationMethod,
    /'class_section_id',\s*\$9::text,\s*'stream_id',\s*\$10::text/,
  );
  assert.match(registrationMethod, /INSERT INTO student_class_assignments \(\s*tenant_id,\s*school_id/);
  assert.match(registrationMethod, /INSERT INTO parent_guardians/);
  assert.match(registrationMethod, /guardian_id,\s*relationship_type/);
  assert.match(
    registrationMethod,
    /INSERT INTO student_portal_access[\s\S]*VALUES \(\$1,\s*\$2,\s*\$3::uuid,\s*\$4,\s*\$5/,
  );
  assert.match(registrationMethod, /INSERT INTO student_fee_assignments/);
  assert.match(registrationMethod, /INSERT INTO student_fee_invoices/);
  assert.match(registrationMethod, /FROM student_fee_structures/);
  assert.doesNotMatch(registrationMethod, /FROM fee_structures/);
  assert.doesNotMatch(registrationMethod, /INSERT INTO student_invoices/);
  assert.doesNotMatch(registrationMethod, /VALUES \(\$1,\s*\$2,\s*\$2::uuid/);
  assert.doesNotMatch(registrationMethod, /application_status = 'registered'/);
  assert.match(registrationMethod, /SET status = 'completed'/);
  assert.match(registrationMethod, /INSERT INTO audit_logs/);
  assert.match(
    registrationMethod,
    /'student',\s*\$3::text,\s*'student',\s*\$3::uuid,\s*\$3::uuid/,
  );
  assert.match(registrationMethod, /await persistGovernance\?\.\(\{ tx, result \}\)/);
});

test('AdmissionsSchemaService creates tenant-scoped student fee assignment and invoice tables', async () => {
  let bootstrapSql = '';
  const service = new AdmissionsSchemaService(
    {
      runSchemaBootstrap: async (sql: string) => {
        bootstrapSql = sql;
      },
    } as never,
    {
      onModuleInit: async () => undefined,
    } as never,
  );

  await service.onModuleInit();

  assert.match(bootstrapSql, /CREATE TABLE IF NOT EXISTS student_fee_structures/);
  assert.match(bootstrapSql, /CREATE TABLE IF NOT EXISTS student_fee_assignments/);
  assert.match(bootstrapSql, /CREATE TABLE IF NOT EXISTS student_fee_invoices/);
  assert.match(bootstrapSql, /ALTER TABLE student_fee_invoices FORCE ROW LEVEL SECURITY/);
  assert.match(bootstrapSql, /CREATE POLICY student_fee_assignments_rls_policy/);
  assert.match(bootstrapSql, /CREATE TRIGGER trg_student_fee_invoices_set_updated_at/);
  assert.match(bootstrapSql, /admission_applications_school_id_fkey/);
  assert.match(bootstrapSql, /admission_applications_applying_for_class_id_fkey/);
  assert.match(bootstrapSql, /ALTER TABLE admission_applications ALTER COLUMN id SET DEFAULT gen_random_uuid\(\)::text/);
  assert.match(bootstrapSql, /ALTER TABLE admission_applications ALTER COLUMN updated_at SET DEFAULT NOW\(\)/);
});

test('AdmissionsSchemaService converts legacy InterviewStatus values to the text workflow contract', async () => {
  let bootstrapSql = '';
  const service = new AdmissionsSchemaService(
    {
      runSchemaBootstrap: async (sql: string) => {
        bootstrapSql = sql;
      },
    } as never,
    {
      onModuleInit: async () => undefined,
    } as never,
  );

  await service.onModuleInit();

  assert.match(
    bootstrapSql,
    /ALTER TABLE admission_interviews\s+ALTER COLUMN status TYPE text USING status::text/,
  );
  assert.match(bootstrapSql, /WHEN upper\(status\) = 'DONE' THEN 'completed'/);
  assert.match(bootstrapSql, /ALTER TABLE admission_interviews ALTER COLUMN status SET DEFAULT 'scheduled'/);
});

test('AdmissionsSchemaService repairs the admission draft owner upsert contract', async () => {
  let bootstrapSql = '';
  const service = new AdmissionsSchemaService(
    {
      runSchemaBootstrap: async (sql: string) => {
        bootstrapSql = sql;
      },
    } as never,
    {
      onModuleInit: async () => undefined,
    } as never,
  );

  await service.onModuleInit();

  assert.match(bootstrapSql, /PARTITION BY tenant_id, created_by_user_id/);
  assert.match(
    bootstrapSql,
    /CREATE UNIQUE INDEX IF NOT EXISTS ux_admission_drafts_owner\s+ON admission_drafts \(tenant_id, created_by_user_id\)/,
  );
});

test('AdmissionsSchemaService creates academic enrollment and capacity tables', async () => {
  let bootstrapSql = '';
  const service = new AdmissionsSchemaService(
    {
      runSchemaBootstrap: async (sql: string) => {
        bootstrapSql = sql;
      },
    } as never,
    {
      onModuleInit: async () => undefined,
    } as never,
  );

  await service.onModuleInit();

  assert.match(bootstrapSql, /CREATE TABLE IF NOT EXISTS academic_class_sections/);
  assert.match(bootstrapSql, /CREATE TABLE IF NOT EXISTS student_academic_enrollments/);
  assert.match(bootstrapSql, /CREATE TABLE IF NOT EXISTS student_academic_lifecycle_events/);
  assert.match(bootstrapSql, /ALTER TABLE student_academic_enrollments FORCE ROW LEVEL SECURITY/);
  assert.match(bootstrapSql, /ALTER TABLE student_academic_lifecycle_events FORCE ROW LEVEL SECURITY/);
  assert.match(bootstrapSql, /CREATE POLICY student_academic_enrollments_rls_policy/);
  assert.match(bootstrapSql, /CREATE POLICY student_academic_lifecycle_events_rls_policy/);
  assert.match(bootstrapSql, /CREATE TRIGGER trg_student_academic_enrollments_set_updated_at/);
  assert.match(bootstrapSql, /DROP CONSTRAINT IF EXISTS fk_student_academic_enrollments_section/);
  assert.match(bootstrapSql, /CREATE OR REPLACE FUNCTION validate_admissions_class_section_reference/);
  assert.match(bootstrapSql, /to_regclass\('public\.class_sections'\)/);
  assert.match(bootstrapSql, /FROM public\.class_sections section/);
  assert.match(bootstrapSql, /FROM academic_class_sections legacy_section/);
  assert.match(bootstrapSql, /CREATE TRIGGER trg_student_academic_enrollments_validate_section/);

  const enrollmentTriggerDrop = bootstrapSql.indexOf(
    'DROP TRIGGER IF EXISTS trg_student_academic_enrollments_validate_section',
  );
  const lifecycleTriggerDrop = bootstrapSql.indexOf(
    'DROP TRIGGER IF EXISTS trg_student_academic_lifecycle_validate_section',
  );
  const legacyTypeNormalizer = bootstrapSql.indexOf(
    "EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id TYPE text USING tenant_id::text', target_table)",
  );
  const enrollmentTriggerCreate = bootstrapSql.indexOf(
    'CREATE TRIGGER trg_student_academic_enrollments_validate_section',
  );
  const lifecycleTriggerCreate = bootstrapSql.indexOf(
    'CREATE TRIGGER trg_student_academic_lifecycle_validate_section',
  );

  assert.ok(enrollmentTriggerDrop >= 0);
  assert.ok(lifecycleTriggerDrop >= 0);
  assert.ok(legacyTypeNormalizer >= 0);
  assert.ok(enrollmentTriggerDrop < legacyTypeNormalizer);
  assert.ok(lifecycleTriggerDrop < legacyTypeNormalizer);
  assert.ok(legacyTypeNormalizer < enrollmentTriggerCreate);
  assert.ok(legacyTypeNormalizer < lifecycleTriggerCreate);
});

test('AdmissionsRepository resolves registration capacity from the canonical tenant class registry', async () => {
  const calls: Array<{ tenantId: string; sql: string; params: unknown[] }> = [];
  const canonicalSections = [
    {
      tenant_id: 'tenant-a',
      name: 'Grade 7',
      stream: 'Hope',
      is_active: true,
      result: {
        id: 'class-a',
        class_name: 'Grade 7',
        stream_name: 'Hope',
        academic_year: '2026',
        capacity: 45,
        current_enrollments: 12,
      },
    },
    {
      tenant_id: 'tenant-a',
      name: 'Grade 8',
      stream: 'Dormant',
      is_active: false,
      result: { id: 'inactive-a' },
    },
    {
      tenant_id: 'tenant-b',
      name: 'Grade 9',
      stream: 'Foreign',
      is_active: true,
      result: { id: 'foreign-b' },
    },
  ];
  const repository = new AdmissionsRepository({
    executeWithTenant: async (tenantId: string, _userId: string | null, cb: any) => cb({
      $queryRawUnsafe: async (sql: string, ...params: any[]) => {
        calls.push({ tenantId, sql, params });
        const section = canonicalSections.find((candidate) =>
          candidate.tenant_id === tenantId
          && candidate.name.toLowerCase() === String(params[1]).toLowerCase()
          && candidate.stream.toLowerCase() === String(params[2]).toLowerCase()
          && candidate.is_active,
        );
        return section ? [section.result] : [];
      },
    }),
  } as never);

  const active = await repository.findAcademicClassSectionForUpdate(
    'tenant-a',
    'Grade 7',
    'Hope',
  );
  const inactive = await repository.findAcademicClassSectionForUpdate(
    'tenant-a',
    'Grade 8',
    'Dormant',
  );
  const foreign = await repository.findAcademicClassSectionForUpdate(
    'tenant-a',
    'Grade 9',
    'Foreign',
  );

  assert.equal(active?.id, 'class-a');
  assert.equal(inactive, null);
  assert.equal(foreign, null);
  assert.match(calls[0]!.sql, /FROM class_sections section/);
  assert.doesNotMatch(calls[0]!.sql, /FROM academic_class_sections/);
  assert.match(calls[0]!.sql, /section\.tenant_id = \$1/);
  assert.match(calls[0]!.sql, /section\.is_active = TRUE/);
  assert.match(calls[0]!.sql, /section\.enrolment_open = TRUE/);
  assert.match(calls[0]!.sql, /student_class_assignments/);
  assert.match(calls[0]!.sql, /student_academic_enrollments/);
});

test('AdmissionsSchemaService creates subject and timetable enrollment tables', async () => {
  let bootstrapSql = '';
  const service = new AdmissionsSchemaService(
    {
      runSchemaBootstrap: async (sql: string) => {
        bootstrapSql = sql;
      },
    } as never,
    {
      onModuleInit: async () => undefined,
    } as never,
  );

  await service.onModuleInit();

  assert.match(bootstrapSql, /CREATE TABLE IF NOT EXISTS academic_subject_offerings/);
  assert.match(bootstrapSql, /CREATE TABLE IF NOT EXISTS student_subject_enrollments/);
  assert.match(bootstrapSql, /CREATE TABLE IF NOT EXISTS academic_timetable_slots/);
  assert.match(bootstrapSql, /CREATE TABLE IF NOT EXISTS student_timetable_enrollments/);
  assert.match(bootstrapSql, /ALTER TABLE student_subject_enrollments FORCE ROW LEVEL SECURITY/);
  assert.match(bootstrapSql, /ALTER TABLE student_timetable_enrollments FORCE ROW LEVEL SECURITY/);
  assert.match(bootstrapSql, /CREATE POLICY academic_subject_offerings_rls_policy/);
  assert.match(bootstrapSql, /CREATE POLICY academic_timetable_slots_rls_policy/);
  assert.match(bootstrapSql, /CREATE TRIGGER trg_student_subject_enrollments_set_updated_at/);
  assert.match(bootstrapSql, /CREATE TRIGGER trg_student_timetable_enrollments_set_updated_at/);
});

test('AdmissionsRepository student profile includes academic downstream status records', async () => {
  const queries: string[] = [];
  const repository = new AdmissionsRepository({
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

      if (sql.includes('FROM students')) {
        return {
          rows: [
            {
              id: '00000000-0000-0000-0000-000000000801',
              admission_number: 'ADM-G8-801',
              first_name: 'Lifecycle',
              last_name: 'Ready',
              metadata: {},
            },
          ],
        };
      }

      if (sql.includes('FROM student_academic_enrollments')) {
        return {
          rows: [
            {
              id: '00000000-0000-0000-0000-000000000802',
              class_name: 'Grade 8',
              stream_name: 'South',
              academic_year: '2026',
              status: 'active',
            },
          ],
        };
      }

      if (sql.includes('FROM student_subject_enrollments')) {
        return {
          rows: [{ id: 'sub-1', subject_name: 'Mathematics', status: 'active' }],
        };
      }

      if (sql.includes('FROM student_timetable_enrollments')) {
        return {
          rows: [{ id: 'slot-1', day_of_week: 'Monday', starts_at: '08:00', status: 'active' }],
        };
      }

      if (sql.includes('FROM student_academic_lifecycle_events')) {
        return {
          rows: [{ id: 'evt-1', event_type: 'promotion', to_class_name: 'Grade 8' }],
        };
      }

      if (sql.includes('FROM student_guardians')) {
        return {
          rows: [
            {
              id: 'guardian-1',
              display_name: 'Parent Ready',
              email: 'parent@example.test',
              status: 'active',
              user_id: '00000000-0000-0000-0000-000000000803',
            },
          ],
        };
      }

      if (sql.includes('FROM student_fee_assignments assignment')) {
        return {
          rows: [
            {
              id: 'assignment-1',
              status: 'assigned',
              amount_minor: '250000',
              currency_code: 'KES',
            },
          ],
        };
      }

      if (sql.includes('FROM student_fee_invoices invoice')) {
        return {
          rows: [
            {
              id: 'invoice-1',
              invoice_number: 'SF-20260513-001',
              status: 'open',
              amount_due_minor: '250000',
              amount_paid_minor: '0',
              currency_code: 'KES',
              due_date: '2026-05-27',
            },
          ],
        };
      }

      return { rows: [] };
    },
  } as never);

  const profile = await repository.getStudentProfile(
    'tenant-a',
    '00000000-0000-0000-0000-000000000801',
  );

  assert.ok(queries.some((sql) => sql.includes('FROM student_academic_enrollments')));
  assert.ok(queries.some((sql) => sql.includes('FROM student_subject_enrollments')));
  assert.ok(queries.some((sql) => sql.includes('FROM student_timetable_enrollments')));
  assert.ok(queries.some((sql) => sql.includes('FROM student_academic_lifecycle_events')));
  assert.ok(queries.some((sql) => sql.includes('FROM student_guardians')));
  assert.ok(queries.some((sql) => sql.includes('FROM student_fee_assignments assignment')));
  assert.ok(queries.some((sql) => sql.includes('FROM student_fee_invoices invoice')));
  assert.equal(profile?.academic_enrollment.status, 'active');
  assert.equal(profile?.subject_enrollments.length, 1);
  assert.equal(profile?.timetable_enrollments.length, 1);
  assert.equal(profile?.lifecycle_events.length, 1);
  assert.equal(profile?.guardian_links.length, 1);
  assert.equal(profile?.fee_assignment.status, 'assigned');
  assert.equal(profile?.fee_invoice.status, 'open');
});
