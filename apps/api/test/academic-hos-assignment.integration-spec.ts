import { randomUUID } from 'node:crypto';
import { Pool, PoolClient } from 'pg';
import { AcademicsRepository } from '../src/modules/academics/repositories/academics.repository';
import { UserRoleAssignmentsRepository } from '../src/auth/repositories/user-role-assignments.repository';
import { DashboardRoleService } from '../src/auth/dashboard-role.service';

describe('School-wide HOS appointments and derived dashboard access', () => {
  let pool: Pool;
  let academics: AcademicsRepository;
  const schema = `hos_${randomUUID().replaceAll('-', '')}`;
  const reader = `${schema}_reader`;
  const ids = Object.fromEntries(['first', 'second', 'math', 'science', 'primary', 'hos', 'actor'].map(key => [key, randomUUID()]));
  const scoped = async <T>(tenant: string, callback: (client: PoolClient) => Promise<T>) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL search_path TO ${schema}; SET LOCAL ROLE ${reader}`);
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenant]);
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  };
  const roles = (tenant: string) => new UserRoleAssignmentsRepository({
    query: (sql: string, values: unknown[]) => scoped(tenant, client => client.query(sql, values)),
  } as never);
  const assign = (user = ids.first, subject = ids.math, governance?: (tx: any, result: any) => Promise<void>) => academics.assignAcademicRole('school-a', {
    role_type: 'head_of_subject', teacher_user_id: user, subject_id: subject,
    effective_from: '2020-01-01', actor_user_id: ids.actor, reason: 'School-wide assignment',
  }, governance);

  beforeAll(async () => {
    if (process.env.MYSHULE_DISPOSABLE_POSTGRES !== '1') throw new Error('Use the disposable PostgreSQL runner.');
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
    const client = await pool.connect();
    try {
      await client.query(`CREATE SCHEMA ${schema}; SET search_path TO ${schema}; CREATE ROLE ${reader} NOLOGIN;
        CREATE TABLE roles(id uuid, tenant_id text, code text, name text);
        CREATE TABLE tenant_memberships(tenant_id text, user_id uuid, role_id uuid, status text);
        CREATE TABLE user_roles(id uuid, tenant_id text, user_id uuid, role_id uuid, scope_type text, scope_id text, status text, deleted_at timestamptz, created_at timestamptz);
        CREATE TABLE subjects(id text, tenant_id text, status text DEFAULT 'active', archived_at timestamptz);
        CREATE TABLE academics_role_appointments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id text, school_id text,
          role_type text, teacher_user_id uuid, department_id uuid, academic_year_id text, class_section_id text, stream_id text, subject_id text,
          appointment_type text, effective_from date, effective_to date, reason text, appointed_by_user_id uuid, approved_by_user_id uuid,
          ended_by_user_id uuid, status text DEFAULT 'active', version int DEFAULT 1, updated_at timestamptz DEFAULT NOW());
        CREATE UNIQUE INDEX active_hos ON academics_role_appointments(tenant_id, role_type, subject_id,
          COALESCE(department_id::text,''), COALESCE(academic_year_id,''), COALESCE(class_section_id,''), COALESCE(stream_id,'')) WHERE status='active';
        CREATE TABLE evidence(tenant_id text, kind text, appointment_id uuid);
      `);
      for (const tenant of ['school-a', 'school-b']) {
        await client.query("INSERT INTO roles VALUES ($1,$2,'librarian','Librarian'),($3,$2,'head_of_subject','Head of Subject')", [ids.primary, tenant, ids.hos]);
        await client.query("INSERT INTO tenant_memberships VALUES ($1,$2,$4,'active'),($1,$3,$4,'active')", [tenant, ids.first, ids.second, ids.primary]);
        await client.query('INSERT INTO subjects(id,tenant_id) VALUES ($1,$3),($2,$3)', [ids.math, ids.science, tenant]);
      }
      for (const table of ['roles', 'tenant_memberships', 'user_roles', 'subjects', 'academics_role_appointments', 'evidence']) {
        await client.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY; ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;
          CREATE POLICY school_scope ON ${table} USING (tenant_id = current_setting('app.tenant_id', true));`);
      }
      await client.query(`GRANT USAGE ON SCHEMA ${schema} TO ${reader}; GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ${schema} TO ${reader};`);
    } finally { client.release(); }
    academics = new AcademicsRepository({ executeWithTenant: (tenant: string, _: unknown, callback: (tx: any) => Promise<unknown>) => scoped(tenant, client => callback({
      $queryRawUnsafe: async (sql: string, ...values: unknown[]) => (await client.query(sql, values)).rows,
    })) } as never);
  }, 60000);
  afterAll(async () => { await pool?.end(); });
  beforeEach(async () => { await scoped('school-a', async client => { await client.query('DELETE FROM academics_role_appointments; DELETE FROM evidence'); }); });

  it('gives a non-teaching primary role HOS access without replacing primary membership', async () => {
    await assign();
    const service = new DashboardRoleService({ findActiveMembership: async () => ({
      user_id: ids.first, tenant_id: 'school-a', role_id: ids.primary, role_code: 'librarian', role_name: 'Librarian', status: 'active',
    }) } as never, roles('school-a'), {} as never);
    const authorized = await service.authorizeRole({ user_id: ids.first, tenant_id: 'school-a', requested_role: 'head_of_subject' });
    expect(authorized.role_id).toBe(ids.hos);
    expect(authorized.context.primary_role).toBe('librarian');
    expect(authorized.context.assigned_roles).toEqual(['librarian', 'head_of_subject']);
    const membership = await scoped('school-a', client => client.query('SELECT role_id FROM tenant_memberships WHERE user_id=$1', [ids.first]));
    expect(membership.rows[0].role_id).toBe(ids.primary);
    expect(await roles('school-a').findActiveRolesForUser(ids.first, 'school-b')).toEqual([]);
    expect(await roles('school-b').findActiveRolesForUser(ids.first, 'school-b')).toEqual([]);
  });

  it('retains history on replacement and revokes only appointment-derived access', async () => {
    await assign();
    await assign(ids.first, ids.science);
    await assign(ids.second);
    expect(await roles('school-a').findActiveRolesForUser(ids.first, 'school-a')).toHaveLength(1);
    expect(await roles('school-a').findActiveRolesForUser(ids.second, 'school-a')).toHaveLength(1);
    await scoped('school-a', client => client.query("UPDATE academics_role_appointments SET status='ended' WHERE teacher_user_id=$1", [ids.first]));
    expect(await roles('school-a').findActiveRolesForUser(ids.first, 'school-a')).toEqual([]);
    const history = await scoped('school-a', client => client.query('SELECT status FROM academics_role_appointments WHERE subject_id=$1 ORDER BY status', [ids.math]));
    expect(history.rows.map(row => row.status)).toEqual(['active', 'ended']);
  });

  it('serializes concurrent replacements and rolls back assignment with failed governance', async () => {
    await Promise.all([assign(), assign(ids.second)]);
    const active = await scoped('school-a', client => client.query("SELECT * FROM academics_role_appointments WHERE status='active'"));
    expect(active.rows).toHaveLength(1);
    await expect(assign(ids.first, ids.science, async (tx, result) => {
      await tx.$queryRawUnsafe('INSERT INTO evidence VALUES ($1,$2,$3)', 'school-a', 'audit', result.appointment.id);
      throw new Error('outbox unavailable');
    })).rejects.toThrow('outbox unavailable');
    expect((await scoped('school-a', client => client.query('SELECT * FROM evidence'))).rows).toEqual([]);
    expect((await scoped('school-a', client => client.query('SELECT * FROM academics_role_appointments WHERE subject_id=$1', [ids.science]))).rows).toEqual([]);
  });

  it('does not grant access for future, ended or expired appointments or inactive subjects/memberships', async () => {
    await assign();
    for (const change of ["effective_from=CURRENT_DATE+1", "effective_to=CURRENT_DATE-1", "status='ended'"]) {
      await scoped('school-a', client => client.query(`UPDATE academics_role_appointments SET ${change}`));
      expect(await roles('school-a').findActiveRolesForUser(ids.first, 'school-a')).toEqual([]);
      await scoped('school-a', client => client.query("UPDATE academics_role_appointments SET effective_from='2020-01-01',effective_to=NULL,status='active'"));
    }
    await scoped('school-a', client => client.query("UPDATE subjects SET status='inactive'"));
    expect(await roles('school-a').findActiveRolesForUser(ids.first, 'school-a')).toEqual([]);
    await scoped('school-a', client => client.query("UPDATE subjects SET status='active'; UPDATE tenant_memberships SET status='suspended'"));
    expect(await roles('school-a').findActiveRolesForUser(ids.first, 'school-a')).toEqual([]);
    await scoped('school-a', client => client.query("UPDATE tenant_memberships SET status='active'"));
  });
});
