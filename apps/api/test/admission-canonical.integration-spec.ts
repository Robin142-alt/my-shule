import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { AuthSchemaService } from '../src/auth/auth-schema.service';
import { AuthorizationRepository } from '../src/auth/repositories/authorization.repository';
import { StudentsSchemaService } from '../src/modules/students/students-schema.service';
import { AdmissionsSchemaService } from '../src/modules/admissions/admissions-schema.service';
import { AcademicsSchemaService } from '../src/modules/academics/academics-schema.service';
import { EventsSchemaService } from '../src/modules/events/events-schema.service';
import { AdmissionsRepository } from '../src/modules/admissions/repositories/admissions.repository';
import { AdmissionsService } from '../src/modules/admissions/admissions.service';
import { EventPublisherService } from '../src/modules/events/event-publisher.service';
import { OutboxEventsRepository } from '../src/modules/events/repositories/outbox-events.repository';
import { ensureCohortContexts, ensureCohortMigration } from '../src/modules/academics/cohort-configuration';
import { AgpExecutionService } from '../src/common/platform-governance/agp-execution.service';
import { SelfHealingAgentService } from '../src/common/platform-governance/agents/self-healing-agent.service';
import { AuditTrailService } from '../src/modules/events/audit-trail.service';

jest.setTimeout(120000);

describe('Complete admission on the upgraded legacy database', () => {
  let pool: Pool;
  let service: AdmissionsService;
  let publisher: EventPublisherService;
  let schema: AdmissionsSchemaService;
  const school = 'admission-regression-school';
  const actor = randomUUID();
  const classId = randomUUID();
  const foreignClassId = randomUUID();
  const year = randomUUID();
  const term = randomUUID();
  let queryCount = 0;
  const timings: number[] = [];
  const dto = (number: string, phone?: string) => ({ admission_number: number, first_name: 'Test',
    last_name: 'Learner', gender: 'female' as const, admission_date: '2026-10-04',
    class_section_id: classId, guardian_name: 'Test Guardian', guardian_relationship: 'Father', guardian_phone: phone });

  beforeAll(async () => {
    if (process.env.MYSHULE_DISPOSABLE_POSTGRES !== '1') throw new Error('Use the disposable PostgreSQL harness');
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query(readFileSync('apps/api/test/fixtures/sidebar-legacy-schema.sql', 'utf8').replace(/^\\.*$/gm, ''));
    await pool.query('SET search_path TO public');
    const query = async (sql: string, params: any[] = []) => { queryCount++; return pool.query(sql, params); };
    const db: any = { query, runSchemaBootstrap: (sql: string) => pool.query(sql),
      executeWithTenant: async (tenant: string, user: string | null, callback: (tx: any) => Promise<any>) => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query("SELECT set_config('app.tenant_id',$1,true),set_config('app.user_id',$2,true)", [tenant, user ?? '']);
          const tx = { $queryRawUnsafe: async (sql: string, ...params: any[]) => { queryCount++; return (await client.query(sql, params)).rows; },
            $executeRawUnsafe: async (sql: string, ...params: any[]) => { queryCount++; return (await client.query(sql, params)).rowCount; } };
          const result = await callback(tx);
          await client.query('COMMIT');
          return result;
        } catch (error) { await client.query('ROLLBACK'); throw error; }
        finally { client.release(); }
      } };
    const auth = new AuthSchemaService(db);
    const students = new StudentsSchemaService(db, auth);
    schema = new AdmissionsSchemaService(db, students);
    await schema.onModuleInit();
    await new AcademicsSchemaService(db).onModuleInit();
    await new EventsSchemaService(db, auth).onModuleInit();
    const authorization = new AuthorizationRepository(db);
    await pool.query('INSERT INTO tenants (tenant_id,subdomain,name) VALUES ($1,$1,$1)', [school]);
    await pool.query(`INSERT INTO users (id,tenant_id,email,password_hash,full_name,display_name)
      VALUES ($1,$2,'admission-officer@example.invalid','test-only','Officer','Officer')`, [actor, school]);
    await authorization.ensureTenantAuthorizationBaseline(school);
    await pool.query(`INSERT INTO academic_years (id,tenant_id,name,start_date,end_date,starts_on,ends_on,status)
      VALUES ($1,$2,'2026','2026-01-01','2026-12-31','2026-01-01','2026-12-31','active')`, [year, school]);
    await pool.query(`INSERT INTO academic_terms (id,tenant_id,academic_year_id,name,starts_on,ends_on,status)
      VALUES ($1,$2,$3,'Term 3','2026-09-01','2026-12-31','active')`, [term, school, year]);
    await pool.query(`INSERT INTO class_sections (id,tenant_id,academic_year_id,name,grade_level,curriculum_model)
      VALUES ($1,$2,$3,'Grade 7','Grade 7','CBC')`, [classId, school, year]);
    await pool.query('INSERT INTO tenants (tenant_id,subdomain,name) VALUES ($1,$1,$1)', [`${school}-foreign`]);
    await pool.query(`INSERT INTO academic_years (id,tenant_id,name,start_date,end_date,starts_on,ends_on,status)
      VALUES ('foreign-year',$1,'2026','2026-01-01','2026-12-31','2026-01-01','2026-12-31','active')`, [`${school}-foreign`]);
    await pool.query(`INSERT INTO class_sections (id,tenant_id,academic_year_id,name,grade_level,curriculum_model)
      VALUES ($1,$2,'foreign-year','Grade 7','Grade 7','CBC')`, [foreignClassId, `${school}-foreign`]);
    await db.executeWithTenant(school, actor, async (tx: any) => {
      await ensureCohortMigration(tx, school);
      const [placement] = await ensureCohortContexts(tx, school, classId);
      for (let n = 0; n < 10; n++) {
        const subject = randomUUID();
        await tx.$queryRawUnsafe(`INSERT INTO subjects (id,tenant_id,code,name,curriculum_model,subject_type)
          VALUES ($1,$2,$3,$3,'CBC','core')`, subject, school, `SUB${n}`);
        await tx.$queryRawUnsafe(`INSERT INTO class_subject_assignments
          (tenant_id,academic_term_id,class_section_id,subject_id,cohort_id,cohort_placement_id)
          VALUES ($1,$2,$3,$4,$5,$6)`, school, null, classId, subject, placement.cohort_id, placement.id);
      }
    });
    await pool.query(`INSERT INTO student_fee_structures
      (tenant_id,class_name,academic_year,term_name,description,amount_minor)
      VALUES ($1,'Grade 7','2026','Term 3','Tuition',100000)`, [school]);
    const context: any = { requireStore: () => ({ tenant_id: school, user_id: actor, role: 'admissions_officer',
      permissions: ['admissions:write'], is_authenticated: true, request_id: randomUUID() }) };
    context.getStore = context.requireStore;
    publisher = new EventPublisherService(context, new OutboxEventsRepository(db));
    const agp = new AgpExecutionService(context, publisher, new AuditTrailService(db), new SelfHealingAgentService(publisher));
    service = new AdmissionsService(context, db, new AdmissionsRepository(db), {} as any, {} as any, undefined,
      publisher, agp, undefined, undefined, authorization);
  });

  afterAll(async () => { await pool?.end(); });

  test('admits without phone, persists all school workflows, and keeps unknown guardians separate', async () => {
    const results: any[] = [];
    for (const number of ['TEST-001', 'TEST-002', 'TEST-003']) {
      queryCount = 0;
      const started = performance.now();
      const result = await service.createManualAdmission(dto(number));
      timings.push(performance.now() - started);
      results.push(result);
      console.log(JSON.stringify({ admission: number, milliseconds: Math.round(timings.at(-1)!), queries: queryCount }));
      expect(queryCount).toBeLessThanOrEqual(49); // Ten subject enrolments require one database round trip.
      expect(result.guardian.portal_access).toBe('pending_contact');
      expect(result.subjects).toHaveLength(10);
      expect((await pool.query('SELECT * FROM student_fee_invoices WHERE tenant_id=$1 AND student_id=$2', [school, result.student.id])).rowCount).toBe(1);
      expect((await pool.query('SELECT * FROM student_subject_enrollments WHERE tenant_id=$1 AND student_id=$2', [school, result.student.id])).rowCount).toBe(10);
      expect((await pool.query('SELECT * FROM audit_logs WHERE tenant_id=$1 AND entity_id=$2', [school, result.student.id])).rowCount).toBeGreaterThan(0);
      expect((await pool.query('SELECT * FROM outbox_events WHERE tenant_id=$1 AND aggregate_id=$2::uuid', [school, result.student.id])).rowCount).toBeGreaterThan(0);
    }
    expect(new Set(results.map(result => result.guardian.profile_id)).size).toBe(3);
    expect((await pool.query('SELECT guardian_phone,parent_phone FROM admission_applications WHERE tenant_id=$1', [school])).rows)
      .toEqual(Array(3).fill({ guardian_phone: null, parent_phone: null }));
  });

  test('admits with no guardian details without creating a fake parent or guardian event', async () => {
    const result = await service.createManualAdmission({ ...dto('NO-GUARDIAN'), guardian_name: undefined, guardian_relationship: undefined });
    expect(result.guardian).toMatchObject({ profile_id: null, portal_access: 'pending_details' });
    expect(result.subjects).toHaveLength(10);
    expect((await pool.query('SELECT guardian_name,parent_name,guardian_relationship,relationship FROM admission_applications WHERE tenant_id=$1 AND id=$2',
      [school, result.application_id])).rows[0]).toEqual({ guardian_name: null, parent_name: null, guardian_relationship: null, relationship: null });
    expect((await pool.query('SELECT * FROM student_guardians WHERE tenant_id=$1 AND student_id=$2', [school, result.student.id])).rowCount).toBe(0);
    expect((await pool.query("SELECT * FROM outbox_events WHERE tenant_id=$1 AND event_name='student.guardian.linked' AND payload->>'student_id'=$2",
      [school, result.student.id])).rowCount).toBe(0);
    expect((await pool.query("SELECT * FROM audit_logs WHERE tenant_id=$1 AND entity_id=$2 AND action='STUDENT_ADMITTED'",
      [school, result.student.id])).rowCount).toBe(1);
    expect((await pool.query('SELECT * FROM student_fee_invoices WHERE tenant_id=$1 AND student_id=$2', [school, result.student.id])).rowCount).toBe(1);
  });

  test('keeps an omitted relationship null for a named guardian', async () => {
    const result = await service.createManualAdmission({ ...dto('NAME-ONLY'), guardian_relationship: '' });
    expect(result.guardian.profile_id).toBeTruthy();
    const links = await pool.query(`SELECT link.relationship,link.relationship_type,parent.relationship_type AS parent_relationship
      FROM student_guardians link JOIN parent_guardians parent ON parent.id=link.guardian_id AND parent.school_id=link.tenant_id
      WHERE link.tenant_id=$1 AND link.student_id=$2`, [school, result.student.id]);
    expect(links.rows).toEqual([{ relationship: null, relationship_type: null, parent_relationship: null }]);
  });

  test('preserves a phone and relationship without inventing a guardian name', async () => {
    const input = { ...dto('PHONE-ONLY', '0712345678'), guardian_name: '' };
    await expect(service.preflightManualAdmission(input)).resolves.toHaveProperty('valid', true);
    const result = await service.createManualAdmission(input);
    expect(result.guardian.profile_id).toBeNull();
    expect((await pool.query('SELECT guardian_name,guardian_phone,guardian_relationship FROM admission_applications WHERE tenant_id=$1 AND id=$2',
      [school, result.application_id])).rows[0]).toEqual({ guardian_name: null, guardian_phone: '+254712345678', guardian_relationship: 'Father' });
  });

  test('rejects a repeated admission without partially creating another learner', async () => {
    await expect(service.createManualAdmission(dto('TEST-001'))).rejects.toThrow(/already/i);
    expect((await pool.query('SELECT * FROM students WHERE tenant_id=$1 AND admission_number=$2', [school, 'TEST-001'])).rowCount).toBe(1);
  });

  test('preserves sibling links for supplied phones and rejects a foreign class', async () => {
    const first = await service.createManualAdmission(dto('CONTACT-001', '0712345678'));
    const second = await service.createManualAdmission(dto('CONTACT-002', '0712345678'));
    expect(first.guardian.profile_id).toBe(second.guardian.profile_id);
    expect(second.guardian.existing_sibling_guardian).toBe(true);
    const preview = await service.preflightManualAdmission({ ...dto('CONTACT-003', '0712345678'), guardian_name: undefined });
    expect(preview.guardian).toBeTruthy();
    expect(preview.warnings.some(warning => warning.code === 'GUARDIAN_NAME_MISMATCH')).toBe(false);
    await expect(service.createManualAdmission({ ...dto('FOREIGN'), class_section_id: foreignClassId })).rejects.toThrow();
    expect((await pool.query("SELECT * FROM students WHERE admission_number='FOREIGN'")).rowCount).toBe(0);
  });

  test('rolls the whole admission back if events fail, and records failure with a valid UUID', async () => {
    jest.spyOn(publisher, 'publish').mockRejectedValueOnce(new Error('Event storage unavailable'));
    await expect(service.createManualAdmission(dto('ROLLBACK-001'))).rejects.toThrow('Event storage unavailable');
    expect((await pool.query("SELECT * FROM students WHERE admission_number='ROLLBACK-001'")).rowCount).toBe(0);
    expect((await pool.query("SELECT * FROM admission_applications WHERE application_number='DIRECT-ROLLBACK-001'")).rowCount).toBe(0);
    const failures = await pool.query("SELECT aggregate_id FROM outbox_events WHERE tenant_id=$1 AND event_name='system.repair.triggered'", [school]);
    expect(failures.rowCount).toBeGreaterThan(0);
    expect(failures.rows.every(row => /^[0-9a-f-]{36}$/.test(row.aggregate_id))).toBe(true);
  });

  test('schema startup preserves deliberately omitted relationships', async () => {
    await schema.onModuleInit();
    expect((await pool.query("SELECT relationship,guardian_relationship FROM admission_applications WHERE tenant_id=$1 AND application_number='DIRECT-NO-GUARDIAN'",
      [school])).rows).toEqual([{ relationship: null, guardian_relationship: null }]);
    expect((await pool.query(`SELECT link.relationship,link.relationship_type FROM student_guardians link
      JOIN students student ON student.id=link.student_id AND student.tenant_id=link.tenant_id
      WHERE link.tenant_id=$1 AND student.admission_number='NAME-ONLY'`, [school])).rows)
      .toEqual([{ relationship: null, relationship_type: null }]);
  });
});
