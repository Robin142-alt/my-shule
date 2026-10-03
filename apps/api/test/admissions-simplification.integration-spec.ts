import { Pool, PoolClient } from 'pg';
import { randomUUID } from 'node:crypto';
import { AdmissionsCommandRepository } from '../src/modules/admin-command/repositories/admissions-command.repository';
import { OPTIONAL_GUARDIAN_CONTACT_SQL } from '../src/modules/students/students-schema.service';
import { AdmissionsRepository } from '../src/modules/admissions/repositories/admissions.repository';

jest.setTimeout(120000);

describe('Consolidated admissions database workflows', () => {
  let pool: Pool;
  let client: PoolClient;
  let commands: AdmissionsCommandRepository;
  let admissions: AdmissionsRepository;
  let reads = 0;
  const studentId = randomUUID();
  const foreignStudentId = randomUUID();
  const actor = randomUUID();

  beforeAll(async () => {
    if (process.env.MYSHULE_DISPOSABLE_POSTGRES !== '1') throw new Error('Use the disposable PostgreSQL harness');
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    client = await pool.connect();
    const schema = `admissions_${randomUUID().replace(/-/g, '')}`;
    await client.query(`CREATE SCHEMA ${schema}; SET search_path TO ${schema}`);
    await client.query(`
      CREATE TABLE admission_applications (id text PRIMARY KEY, tenant_id text, admitted_student_id text,
        full_name text, class_applying text, parent_name text, parent_phone text, application_number text,
        status text, created_at timestamptz DEFAULT NOW());
      INSERT INTO admission_applications
        SELECT 'application-' || n, 'school-a', NULL, 'Learner ' || n, 'Grade 7', 'Guardian ' || n,
          NULL, 'ADM-' || n, CASE WHEN n<=4 THEN 'pending' ELSE 'registered' END, NOW() - n * interval '1 minute'
        FROM generate_series(1,64) n;
      INSERT INTO admission_applications VALUES ('foreign', 'school-b', NULL, 'Private Learner', 'Grade 7', 'Private Guardian', NULL, 'SECRET', 'registered', NOW());
      CREATE TABLE admission_enquiries (id text, tenant_id text, parent_name text, parent_phone text, class_applying text, created_at timestamptz, enquiry_source text, status text);
      CREATE TABLE admission_documents (id text, tenant_id text, verification_status text);
      CREATE TABLE admission_interviews (tenant_id text, status text);
      CREATE TABLE admission_offers (id text, tenant_id text, application_id text, required_deposit bigint, deposit_paid bigint, finance_cleared boolean, offer_status text, created_at timestamptz);
      CREATE TABLE admission_appointments (id text, tenant_id text, application_id text, visitor_name text, appointment_date date, start_time text, purpose text, status text);
      CREATE TABLE admission_tasks (id text, tenant_id text, task_title text, assigned_user_id uuid, due_date date, priority text, status text, created_at timestamptz);
      CREATE TABLE admission_templates (id text, tenant_id text, template_name text, template_type text, content text, updated_at timestamptz, is_active boolean);
      CREATE TABLE users (id uuid, tenant_id text, display_name text, full_name text);
      CREATE TABLE students (id uuid PRIMARY KEY, tenant_id text, admission_number text);
      CREATE TABLE student_transfer_records (id text PRIMARY KEY DEFAULT gen_random_uuid()::text, tenant_id text, student_id text, application_id text, transfer_type text, school_name text, reason text, requested_on date, status text, notes text, created_at timestamptz DEFAULT NOW());
      CREATE TABLE audit_logs (tenant_id text, actor_user_id uuid, action text, module text, entity_type text, entity_id text, resource_type text NOT NULL, resource_id uuid, aggregate_id uuid, metadata jsonb);
      CREATE TABLE test_events (id text, tenant_id text);
    `);
    await client.query('INSERT INTO students (id,tenant_id) VALUES ($1,$2),($3,$4)', [studentId, 'school-a', foreignStudentId, 'school-b']);
    const database = { executeWithTenant: async (tenant: string, _actor: string | null, callback: (tx: unknown) => Promise<unknown>) => {
      expect(tenant).toBe('school-a');
      await client.query('BEGIN');
      try {
        const result = await callback({
          $queryRawUnsafe: async (sql: string, ...params: unknown[]) => { reads++; return (await client.query(sql, params)).rows; },
          $executeRawUnsafe: async (sql: string, ...params: unknown[]) => (await client.query(sql, params)).rowCount,
        });
        await client.query('COMMIT');
        return result;
      } catch (error) { await client.query('ROLLBACK'); throw error; }
    } };
    commands = new AdmissionsCommandRepository(database as never);
    admissions = new AdmissionsRepository(database as never);
  });

  afterAll(async () => { client?.release(); await pool?.end(); });

  test('migrates existing phone constraints and keeps unknown guardians separate', async () => {
    await client.query(`CREATE TABLE guardian_profiles (id uuid DEFAULT gen_random_uuid(), tenant_id text, normalized_phone text NOT NULL CHECK (btrim(normalized_phone) <> ''), UNIQUE(tenant_id, normalized_phone));
      CREATE TABLE parent_guardians (id uuid DEFAULT gen_random_uuid(), school_id text, phone text NOT NULL, UNIQUE(school_id, phone));
      CREATE TABLE student_portal_access (guardian_phone_hash text NOT NULL CHECK (btrim(guardian_phone_hash) <> ''));`);
    await client.query(OPTIONAL_GUARDIAN_CONTACT_SQL);
    await client.query(`INSERT INTO guardian_profiles (tenant_id, normalized_phone) VALUES ('school-a',NULL),('school-a',NULL);
      INSERT INTO parent_guardians (school_id,phone) VALUES ('school-a',NULL),('school-a',NULL);
      INSERT INTO student_portal_access VALUES (NULL);`);
    expect((await client.query('SELECT DISTINCT id FROM guardian_profiles')).rowCount).toBe(2);
    expect((await client.query('SELECT DISTINCT id FROM parent_guardians')).rowCount).toBe(2);
    await expect(client.query("INSERT INTO guardian_profiles (tenant_id,normalized_phone) VALUES ('school-a','')")).rejects.toThrow();
  });

  test('loads overview and each register page in one request without exposing another school', async () => {
    await client.query("UPDATE students SET admission_number='REAL-123' WHERE id=$1;", [studentId]);
    await client.query("UPDATE admission_applications SET admitted_student_id=$1 WHERE id='application-5'", [studentId]);
    expect((await commands.getApplications('school-a', { search: 'REAL-123' })).applicationsList[0]?.admission_number).toBe('REAL-123');
    reads = 0;
    const overview = await commands.getOverview('school-a');
    expect(reads).toBe(1);
    expect(overview.admitted).toBe(60);
    expect(overview.applicationsPending).toBe(4);
    reads = 0;
    const first = await commands.getApplications('school-a', { limit: 30, offset: 0 });
    expect(reads).toBe(1);
    const second = await commands.getApplications('school-a', { limit: 30, offset: 30 });
    expect(first.metrics.total).toBe(64);
    expect(first.applicationsList).toHaveLength(30);
    expect(new Set([...first.applicationsList, ...second.applicationsList].map(row => row.id)).size).toBe(60);
    expect(JSON.stringify(first)).not.toContain('Private');
    expect((await commands.getApplications('school-a', { search: 'SECRET' })).metrics.total).toBe(0);
    expect((await commands.getApplications('school-a', { status: 'pending' })).metrics.total).toBe(4);
  });

  test('returns compatible empty collections for the embedded tools', async () => {
    for (const read of [() => commands.getEnquiries('school-a'), () => commands.getAppointments('school-a'), () => commands.getTasks('school-a'), () => commands.getTemplates('school-a'), () => commands.getFeeClearance('school-a')]) {
      const result = await read();
      expect(result.items).toEqual([]);
      expect(result.metrics).toBeDefined();
    }
  });

  test('rejects foreign learners and rolls transfers back if the event cannot persist', async () => {
    const input = { school_id: 'school-a', actor_user_id: actor, student_id: studentId, transfer_type: 'outgoing', school_name: 'New school', reason: 'Family moved', requested_on: '2026-10-03', status: 'pending' };
    await expect(admissions.createTransferRecord({ ...input, student_id: foreignStudentId })).rejects.toThrow('not found in this school');
    await expect(admissions.createTransferRecord(input, async () => { throw new Error('Event unavailable'); })).rejects.toThrow('Event unavailable');
    expect((await client.query('SELECT * FROM student_transfer_records')).rowCount).toBe(0);
    expect((await client.query('SELECT * FROM audit_logs')).rowCount).toBe(0);
    await admissions.createTransferRecord(input, async (tx, record) => { await tx.$executeRawUnsafe('INSERT INTO test_events VALUES ($1,$2)', record.id, 'school-a'); });
    expect((await admissions.listTransfers('school-a'))).toHaveLength(1);
    expect((await client.query('SELECT * FROM audit_logs')).rowCount).toBe(1);
    expect((await client.query('SELECT * FROM test_events')).rowCount).toBe(1);
  });
});
