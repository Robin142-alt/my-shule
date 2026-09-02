import { Pool } from 'pg';

import { ADMISSION_INTERVIEW_STATUS_COMPATIBILITY_SQL } from '../src/modules/admissions/admissions-schema.service';

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
});
