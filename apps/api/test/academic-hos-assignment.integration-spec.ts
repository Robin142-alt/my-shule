import { STAFF_APPOINTMENT_CATALOG, MULTI_HOLDER_STAFF_APPOINTMENT_CODES } from '../src/auth/staff-appointment-catalog';
import { randomUUID } from 'node:crypto';
import { Pool, PoolClient } from 'pg';
import { AcademicsRepository } from '../src/modules/academics/repositories/academics.repository';
import { UserRoleAssignmentsRepository } from '../src/auth/repositories/user-role-assignments.repository';
import { DashboardRoleService } from '../src/auth/dashboard-role.service';
import { validate } from 'class-validator';
import { AcademicRoleAppointmentDto } from '../src/modules/academics/dto/academic.dto';
import { CLASS_TEACHER_APPOINTMENT_SCOPE_SQL } from '../src/modules/academics/class-teacher-appointment-scope';

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
        CREATE TABLE academics_departments(id uuid, tenant_id text, status text DEFAULT 'active', is_active boolean DEFAULT true, archived_at timestamptz,
          head_of_department_user_id uuid, name text DEFAULT 'Science', code text, description text, version int DEFAULT 1, updated_at timestamptz);
        CREATE TABLE class_sections(id text, tenant_id text, academic_year_id text, status text DEFAULT 'active');
        CREATE TABLE academics_class_teachers(id text DEFAULT gen_random_uuid()::text, tenant_id text, school_id text, teacher_user_id uuid, class_section_id text, academic_year_id text,
          is_active boolean DEFAULT true, status text DEFAULT 'active', effective_from date DEFAULT CURRENT_DATE, effective_to date,
          assignment_type text, reason text, created_by_user_id uuid, ended_by_user_id uuid, version int DEFAULT 1, updated_at timestamptz);
        CREATE UNIQUE INDEX active_class_teacher ON academics_class_teachers(tenant_id,academic_year_id,class_section_id) WHERE is_active=true;
        CREATE TABLE academics_department_hod_appointments(id text DEFAULT gen_random_uuid()::text, tenant_id text, school_id text, teacher_user_id uuid, department_id uuid,
          status text DEFAULT 'active', effective_from date DEFAULT CURRENT_DATE, effective_to date,
          appointment_type text, reason text, appointed_by_user_id uuid, ended_by_user_id uuid, version int DEFAULT 1, updated_at timestamptz);
        CREATE UNIQUE INDEX active_hod ON academics_department_hod_appointments(tenant_id,department_id) WHERE status='active';
        CREATE TABLE academics_role_appointments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id text, school_id text,
          role_type text, teacher_user_id uuid, department_id uuid, academic_year_id text, class_section_id text, stream_id text, subject_id text,
          appointment_type text, effective_from date, effective_to date, reason text, appointed_by_user_id uuid, approved_by_user_id uuid,
          ended_by_user_id uuid, status text DEFAULT 'active', version int DEFAULT 1, updated_at timestamptz DEFAULT NOW());
        CREATE UNIQUE INDEX active_subject_head ON academics_role_appointments(tenant_id, role_type, COALESCE(subject_id,''),
          COALESCE(department_id::text,''), COALESCE(academic_year_id,''), COALESCE(class_section_id,''), COALESCE(stream_id,''),
          (CASE WHEN role_type IN (${MULTI_HOLDER_STAFF_APPOINTMENT_CODES.map(code => `'${code}'`).join(', ')}) THEN teacher_user_id::text ELSE '' END)) WHERE status='active';
        CREATE TABLE evidence(tenant_id text, kind text, appointment_id uuid);
      `);
      for (const tenant of ['school-a', 'school-b']) {
        await client.query("INSERT INTO roles VALUES ($1,$2,'librarian','Librarian'),($3,$2,'head_of_subject','Head of Subject')", [ids.primary, tenant, ids.hos]);
        await client.query("INSERT INTO tenant_memberships VALUES ($1,$2,$4,'active'),($1,$3,$4,'active')", [tenant, ids.first, ids.second, ids.primary]);
        await client.query('INSERT INTO subjects(id,tenant_id) VALUES ($1,$3),($2,$3)', [ids.math, ids.science, tenant]);
        for (const code of [...new Set(STAFF_APPOINTMENT_CATALOG.map(role => role.dashboardRole))].filter(code => !['librarian', 'head_of_subject'].includes(code))) {
          await client.query('INSERT INTO roles VALUES ($1,$2,$3,$3)', [randomUUID(), tenant, code]);
        }
      }
      for (const table of ['roles', 'tenant_memberships', 'user_roles', 'subjects', 'academics_role_appointments', 'evidence',
        'academics_departments', 'class_sections', 'academics_class_teachers', 'academics_department_hod_appointments']) {
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
  beforeEach(async () => { await scoped('school-a', async client => { await client.query('DELETE FROM academics_role_appointments; DELETE FROM evidence; DELETE FROM academics_class_teachers; DELETE FROM academics_department_hod_appointments; DELETE FROM class_sections; DELETE FROM academics_departments'); }); });

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

  it('adds all appointed dashboards, preserves Teacher access, and revokes only the replaced responsibility', async () => {
    const appoint = (role: string, user = ids.first) => academics.assignAcademicRole('school-a', {
      role_type: role, teacher_user_id: user, effective_from: '2020-01-01', reason: 'Appointment', actor_user_id: ids.actor,
    });
    await appoint('dean_of_academics');
    const exam = await appoint('exams_manager');
    await appoint('form_master');
    const service = new DashboardRoleService({ findActiveMembership: async (user: string, tenant: string) => ({
      user_id: user, tenant_id: tenant, role_id: ids.primary, role_code: 'teacher', role_name: 'Teacher', status: 'active',
    }) } as never, roles('school-a'), {} as never);
    const context = () => service.getRoleContext({ user_id: ids.first, tenant_id: 'school-a' });
    expect((await context()).assigned_roles.sort()).toEqual(['teacher', 'dean_academics', 'exams_manager', 'grade_master'].sort());
    await appoint('dean_of_academics', ids.second);
    expect((await context()).assigned_roles).not.toContain('dean_academics');
    await expect(service.authorizeRole({ user_id: ids.first, tenant_id: 'school-a', requested_role: 'dean_academics' })).rejects.toThrow();
    await academics.endAcademicRole('school-a', String(exam.appointment.id), { reason: 'Duty ended', actor_user_id: ids.actor });
    expect((await context()).assigned_roles.sort()).toEqual(['teacher', 'grade_master'].sort());
  });

  it('adds every existing staff dashboard, supports several holders, and independently ends appointments', async () => {
    for (const role_type of MULTI_HOLDER_STAFF_APPOINTMENT_CODES) {
      const input = { role_type, teacher_user_id: ids.first, effective_from: '2020-01-01', reason: 'Additional staff duty', actor_user_id: ids.actor };
      const first = await academics.assignAcademicRole('school-a', input);
      const renewed = await academics.assignAcademicRole('school-a', input);
      expect(renewed.appointment.id).toBe(first.appointment.id);
      await academics.assignAcademicRole('school-a', { ...input, teacher_user_id: ids.second });
      for (const user of [ids.first, ids.second]) {
        expect((await roles('school-a').findActiveRolesForUser(user, 'school-a')).map(role => role.role_code)).toContain(role_type);
      }
      expect(await roles('school-a').findActiveRolesForUser(ids.first, 'school-b')).toEqual([]);
      await academics.endAcademicRole('school-a', String(first.appointment.id), { actor_user_id: ids.actor, reason: 'Duty ended' });
      expect((await roles('school-a').findActiveRolesForUser(ids.first, 'school-a')).map(role => role.role_code)).not.toContain(role_type);
      expect((await roles('school-a').findActiveRolesForUser(ids.second, 'school-a')).map(role => role.role_code)).toContain(role_type);
    }
  });

  it('rejects removed coordinator types and accepts existing academic dashboard appointments', async () => {
    for (const role_type of ['subject_coordinator', 'curriculum_coordinator', 'academic_year_coordinator', 'super_admin', 'platform_owner', 'support_agent', 'parent', 'student']) {
      expect((await validate(Object.assign(new AcademicRoleAppointmentDto(), { role_type, teacher_user_id: ids.first }))).length).toBeGreaterThan(0);
    }
    for (const role_type of STAFF_APPOINTMENT_CATALOG.map(role => role.code)) {
      expect(await validate(Object.assign(new AcademicRoleAppointmentDto(), { role_type, teacher_user_id: ids.first }))).toEqual([]);
    }
  });

  it('derives class teacher and HOD dashboards from their existing scope records', async () => {
    await scoped('school-a', async client => {
      await client.query("INSERT INTO class_sections(id,tenant_id,academic_year_id) VALUES ('class-a','school-a','year-a')");
      await client.query("INSERT INTO academics_departments(id,tenant_id) VALUES ($1,'school-a')", [ids.math]);
      await client.query("INSERT INTO academics_class_teachers(id,tenant_id,teacher_user_id,class_section_id,academic_year_id) VALUES ('class-duty','school-a',$1,'class-a','year-a')", [ids.first]);
      await client.query("INSERT INTO academics_department_hod_appointments(id,tenant_id,teacher_user_id,department_id) VALUES ('hod-duty','school-a',$1,$2)", [ids.first, ids.math]);
    });
    expect((await roles('school-a').findActiveRolesForUser(ids.first, 'school-a')).map(role => role.role_code).sort()).toEqual(['class_teacher', 'hod']);
    await scoped('school-a', client => client.query("UPDATE academics_class_teachers SET is_active=false,status='ended'; UPDATE academics_department_hod_appointments SET status='ended'"));
    expect(await roles('school-a').findActiveRolesForUser(ids.first, 'school-a')).toEqual([]);
  });

  it('gives timetable permissions without a coordinator dashboard and removes them when the appointment ends', async () => {
    const appointment = await academics.assignAcademicRole('school-a', { role_type: 'timetable_coordinator', teacher_user_id: ids.first,
      effective_from: '2020-01-01', actor_user_id: ids.actor });
    const repository = roles('school-a');
    expect(await repository.findAppointmentPermissions(ids.first, 'school-a')).toEqual(['timetable:read', 'timetable:write', 'academics:read']);
    expect((await repository.findActiveRolesForUser(ids.first, 'school-a')).map(role => role.role_code)).toEqual(['teacher']);
    expect(await repository.findAppointmentPermissions(ids.first, 'school-b')).toEqual([]);
    expect(await repository.findAppointmentPermissions(ids.second, 'school-a')).toEqual([]);
    await academics.endAcademicRole('school-a', String(appointment.appointment.id), { actor_user_id: ids.actor });
    expect(await repository.findAppointmentPermissions(ids.first, 'school-a')).toEqual([]);
  });

  it('makes the assistant class appointment usable by class workflows without granting another class', async () => {
    await academics.assignAcademicRole('school-a', { role_type: 'assistant_class_teacher', teacher_user_id: ids.first,
      class_section_id: 'class-a', academic_year_id: 'year-a', effective_from: '2020-01-01', actor_user_id: ids.actor });
    const classes = () => scoped('school-a', client => client.query(`SELECT class_section_id FROM ${CLASS_TEACHER_APPOINTMENT_SCOPE_SQL} appointment
      WHERE tenant_id=$1 AND teacher_user_id=$2 AND is_active=true AND effective_from<=CURRENT_DATE
        AND (effective_to IS NULL OR effective_to>=CURRENT_DATE)`, ['school-a', ids.first]));
    expect((await classes()).rows).toEqual([{ class_section_id: 'class-a' }]);
    expect((await roles('school-a').findActiveRolesForUser(ids.first, 'school-a')).map(role => role.role_code)).toEqual(['class_teacher']);
    await scoped('school-a', client => client.query("UPDATE academics_role_appointments SET status='ended'"));
    expect((await classes()).rows).toEqual([]);
  });

  it('rolls back an appointment ending if its event or audit cannot be written', async () => {
    const appointment = await assign();
    await expect(academics.endAcademicRole('school-a', String(appointment.appointment.id), { actor_user_id: ids.actor }, async () => {
      throw new Error('audit unavailable');
    })).rejects.toThrow('audit unavailable');
    expect(await roles('school-a').findActiveRolesForUser(ids.first, 'school-a')).toHaveLength(1);
  });
  it('commits canonical class and HOD appointments with governance and rolls failed changes back', async () => {
    await scoped('school-a', async client => {
      await client.query("INSERT INTO class_sections(id,tenant_id,academic_year_id) VALUES ('class-a','school-a','year-a')");
      await client.query("INSERT INTO academics_departments(id,tenant_id) VALUES ($1,'school-a')", [ids.math]);
    });
    const fail = async () => { throw new Error('governance unavailable'); };
    const options = { actor_user_id: ids.actor, effective_from: '2020-01-01', reason: 'Appointment' };
    await expect(academics.assignClassTeacher('school-a', 'year-a', 'class-a', ids.first, options, fail)).rejects.toThrow('governance unavailable');
    await expect(academics.assignDepartmentHead('school-a', ids.math, ids.first, options, fail)).rejects.toThrow('governance unavailable');
    expect(await roles('school-a').findActiveRolesForUser(ids.first, 'school-a')).toEqual([]);
    const assignment = await academics.assignClassTeacher('school-a', 'year-a', 'class-a', ids.first, options);
    await academics.assignDepartmentHead('school-a', ids.math, ids.first, options);
    expect((await roles('school-a').findActiveRolesForUser(ids.first, 'school-a')).map(role => role.role_code).sort()).toEqual(['class_teacher', 'hod']);
    await expect(academics.archiveClassTeacher('school-a', assignment.id, options, fail)).rejects.toThrow('governance unavailable');
    expect((await roles('school-a').findActiveRolesForUser(ids.first, 'school-a'))).toHaveLength(2);
    await academics.archiveClassTeacher('school-a', assignment.id, options);
    await academics.assignDepartmentHead('school-a', ids.math, null, options);
    expect(await roles('school-a').findActiveRolesForUser(ids.first, 'school-a')).toEqual([]);
  });

});
