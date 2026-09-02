import { Pool } from 'pg';

import { ADMISSION_INTERVIEW_STATUS_COMPATIBILITY_SQL } from '../src/modules/admissions/admissions-schema.service';
import { AdmissionsRepository } from '../src/modules/admissions/repositories/admissions.repository';

jest.setTimeout(120000);

describe('Admissions legacy database compatibility', () => {
  let pool: Pool;

  beforeAll(() => {
    if (process.env.MYSHULE_DISPOSABLE_POSTGRES !== '1') {
      throw new Error('Admissions compatibility tests require the disposable PostgreSQL harness');
    }
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  });

  afterAll(async () => {
    await pool?.end();
  });

  test('normalizes Prisma InterviewStatus rows without losing records', async () => {
    await pool.query(`
      CREATE TYPE "InterviewStatus" AS ENUM ('SCHEDULED', 'DONE', 'MISSED', 'CANCELLED');
      CREATE TABLE admission_interviews (
        id uuid PRIMARY KEY,
        tenant_id text NOT NULL,
        status "InterviewStatus" NOT NULL DEFAULT 'SCHEDULED'
      );
      INSERT INTO admission_interviews (id, tenant_id, status) VALUES
        ('11111111-1111-4111-8111-111111111111', 'tenant-a', 'SCHEDULED'),
        ('22222222-2222-4222-8222-222222222222', 'tenant-a', 'DONE');
    `);

    const enumSafeRead = await pool.query<{ count: string }>(`
      SELECT count(*)::text AS count
      FROM admission_interviews
      WHERE tenant_id = $1
        AND lower(status::text) = 'scheduled'
    `, ['tenant-a']);
    expect(enumSafeRead.rows[0]?.count).toBe('1');

    await pool.query(ADMISSION_INTERVIEW_STATUS_COMPATIBILITY_SQL);

    const column = await pool.query<{ data_type: string; column_default: string }>(`
      SELECT data_type, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'admission_interviews'
        AND column_name = 'status'
    `);
    expect(column.rows[0]?.data_type).toBe('text');
    expect(column.rows[0]?.column_default).toContain('scheduled');

    const statuses = await pool.query<{ status: string }>(`
      SELECT status FROM admission_interviews ORDER BY id
    `);
    expect(statuses.rows.map((row) => row.status)).toEqual(['scheduled', 'completed']);
  });

  test('accepts one student identifier as text and UUID fields in the admission audit', async () => {
    await pool.query(`
      CREATE TABLE audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        actor_user_id uuid,
        action text NOT NULL,
        module text NOT NULL,
        entity_type text NOT NULL,
        entity_id text NOT NULL,
        resource_type text NOT NULL,
        resource_id uuid,
        aggregate_id uuid,
        metadata jsonb NOT NULL
      )
    `);

    const studentId = '44444444-4444-4444-8444-444444444444';
    await pool.query(`
      INSERT INTO audit_logs (
        tenant_id, actor_user_id, action, module, entity_type, entity_id,
        resource_type, resource_id, aggregate_id, metadata
      ) VALUES (
        $1, $2::uuid, 'STUDENT_ADMITTED', 'admissions', 'student', $3::text,
        'student', $3::uuid, $3::uuid, $4::jsonb
      )
    `, [
      'tenant-a',
      '33333333-3333-4333-8333-333333333333',
      studentId,
      JSON.stringify({ status: 'SUCCESS' }),
    ]);

    const audit = await pool.query<{
      entity_id: string;
      resource_id: string;
      aggregate_id: string;
    }>(`
      SELECT entity_id, resource_id::text, aggregate_id::text
      FROM audit_logs
      WHERE tenant_id = $1
    `, ['tenant-a']);
    expect(audit.rows).toEqual([{
      entity_id: studentId,
      resource_id: studentId,
      aggregate_id: studentId,
    }]);
  });

  test('returns the latest tenant-scoped Deputy class, stream, and subject offering contract', async () => {
    await pool.query(`
      CREATE TABLE academic_years (
        id text NOT NULL,
        tenant_id text NOT NULL,
        name text NOT NULL,
        starts_on date NOT NULL,
        ends_on date NOT NULL,
        status text NOT NULL DEFAULT 'active',
        is_current boolean NOT NULL DEFAULT false,
        archived_at timestamptz,
        PRIMARY KEY (tenant_id, id)
      );
      CREATE TABLE class_sections (
        id text NOT NULL,
        tenant_id text NOT NULL,
        academic_year_id text NOT NULL,
        academic_level_id text,
        name text NOT NULL,
        grade_level text NOT NULL,
        curriculum_model text NOT NULL,
        capacity integer,
        enrolment_open boolean NOT NULL DEFAULT true,
        is_active boolean NOT NULL DEFAULT true,
        status text NOT NULL DEFAULT 'active',
        archived_at timestamptz,
        PRIMARY KEY (tenant_id, id)
      );
      CREATE TABLE class_streams (
        id text NOT NULL,
        tenant_id text NOT NULL,
        class_section_id text NOT NULL,
        name text NOT NULL,
        capacity integer,
        is_active boolean NOT NULL DEFAULT true,
        status text NOT NULL DEFAULT 'active',
        archived_at timestamptz,
        PRIMARY KEY (tenant_id, id)
      );
      CREATE TABLE student_class_assignments (
        tenant_id text NOT NULL,
        class_section_id text NOT NULL,
        stream_id text,
        status text NOT NULL DEFAULT 'active'
      );
      CREATE TABLE subjects (
        id text NOT NULL,
        tenant_id text NOT NULL,
        code text NOT NULL,
        name text NOT NULL,
        curriculum_model text NOT NULL,
        subject_type text NOT NULL,
        is_compulsory boolean NOT NULL,
        is_examinable boolean NOT NULL,
        status text NOT NULL DEFAULT 'active',
        deleted_at timestamptz,
        archived_at timestamptz,
        PRIMARY KEY (tenant_id, id)
      );
      CREATE TABLE academic_terms (
        id text NOT NULL,
        tenant_id text NOT NULL,
        academic_year_id text NOT NULL,
        name text NOT NULL,
        starts_on date NOT NULL,
        is_current boolean NOT NULL DEFAULT false,
        PRIMARY KEY (tenant_id, id)
      );
      CREATE TABLE class_subject_assignments (
        id text NOT NULL,
        tenant_id text NOT NULL,
        academic_term_id text NOT NULL,
        class_section_id text NOT NULL,
        subject_id text NOT NULL,
        is_compulsory boolean NOT NULL,
        is_examinable boolean NOT NULL,
        status text NOT NULL DEFAULT 'active',
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        PRIMARY KEY (tenant_id, id)
      );
      CREATE TABLE admission_settings (
        tenant_id text PRIMARY KEY,
        admission_number_mode text NOT NULL,
        admission_number_prefix text NOT NULL,
        admission_number_separator text NOT NULL,
        admission_number_padding integer NOT NULL,
        include_academic_year boolean NOT NULL,
        next_sequence integer NOT NULL,
        strict_capacity boolean NOT NULL,
        strict_age_rules boolean NOT NULL,
        minimum_age integer,
        maximum_age integer,
        minimum_subjects integer,
        maximum_subjects integer
      );

      INSERT INTO academic_years
        (id, tenant_id, name, starts_on, ends_on, status, is_current)
      VALUES
        ('year-a', 'tenant-a', '2026', '2026-01-01', '2026-12-31', 'active', true),
        ('year-b', 'tenant-b', '2026', '2026-01-01', '2026-12-31', 'active', true);
      INSERT INTO class_sections
        (id, tenant_id, academic_year_id, academic_level_id, name, grade_level, curriculum_model)
      VALUES
        ('class-a-7', 'tenant-a', 'year-a', 'level-a-7', 'Grade 7', 'Grade 7', 'CBC'),
        ('class-a-8', 'tenant-a', 'year-a', 'level-a-8', 'Grade 8', 'Grade 8', 'CBC'),
        ('class-b-7', 'tenant-b', 'year-b', 'level-b-7', 'Foreign Grade 7', 'Grade 7', 'CBC');
      INSERT INTO class_streams (id, tenant_id, class_section_id, name)
      VALUES
        ('stream-a-north', 'tenant-a', 'class-a-7', 'North'),
        ('stream-b-north', 'tenant-b', 'class-b-7', 'Foreign North');
      INSERT INTO subjects
        (id, tenant_id, code, name, curriculum_model, subject_type, is_compulsory, is_examinable)
      VALUES
        ('math-a', 'tenant-a', 'MAT', 'Mathematics', 'CBC', 'core', true, true),
        ('science-a', 'tenant-a', 'SCI', 'Integrated Science', 'CBC', 'optional', false, true),
        ('math-b', 'tenant-b', 'MAT', 'Foreign Mathematics', 'CBC', 'core', true, true);
      INSERT INTO academic_terms
        (id, tenant_id, academic_year_id, name, starts_on, is_current)
      VALUES
        ('term-a-old', 'tenant-a', 'year-a', 'Term 1', '2026-01-01', false),
        ('term-a-current', 'tenant-a', 'year-a', 'Term 2', '2026-05-01', true),
        ('term-b-current', 'tenant-b', 'year-b', 'Term 2', '2026-05-01', true);
      INSERT INTO class_subject_assignments
        (id, tenant_id, academic_term_id, class_section_id, subject_id, is_compulsory, is_examinable, updated_at)
      VALUES
        ('offer-a-math-old', 'tenant-a', 'term-a-old', 'class-a-7', 'math-a', true, true, '2026-01-01'),
        ('offer-a-math-current', 'tenant-a', 'term-a-current', 'class-a-7', 'math-a', false, true, '2026-05-01'),
        ('offer-a-science-current', 'tenant-a', 'term-a-current', 'class-a-7', 'science-a', false, true, '2026-05-01'),
        ('offer-b-math-current', 'tenant-b', 'term-b-current', 'class-b-7', 'math-b', true, true, '2026-05-01');
    `);

    const repository = new AdmissionsRepository({
      executeWithTenant: async (_tenantId: string, _actorUserId: string | null, callback: (tx: unknown) => unknown) => callback({
        $queryRawUnsafe: async (sql: string, ...params: unknown[]) => (await pool.query(sql, params)).rows,
      }),
    } as never);

    const foundation = await repository.getAdmissionFoundation('tenant-a') as any;

    expect(foundation.classes.map((item: any) => item.id)).toEqual(['class-a-7', 'class-a-8']);
    expect(foundation.streams.map((item: any) => item.id)).toEqual(['stream-a-north']);
    expect(foundation.subjects.map((item: any) => item.id)).toEqual(['science-a', 'math-a']);
    expect(foundation.class_subject_assignments).toEqual(expect.arrayContaining([
      expect.objectContaining({
        academic_term_id: 'term-a-current',
        academic_year_id: 'year-a',
        class_section_id: 'class-a-7',
        subject_id: 'math-a',
        is_compulsory: false,
      }),
    ]));
    expect(foundation.class_subject_assignments).toHaveLength(2);
    expect(JSON.stringify(foundation)).not.toContain('tenant-b');
    expect(JSON.stringify(foundation)).not.toContain('Foreign');
  });
});
