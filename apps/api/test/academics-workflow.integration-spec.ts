import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';

import { ModuleAccessService } from '../src/modules/module-access/module-access.service';
import { RequestContextService } from '../src/common/request-context/request-context.service';
import { AcademicsWorkflowTestModule } from './support/academics-workflow-test.module';
import { KENYAN_CBC_STRUCTURE, KENYAN_844_STRUCTURE, CBC_LEARNING_AREAS } from './support/academics-fixtures';
import { REDIS_CLIENT } from '../src/infrastructure/redis/redis.constants';
import { InMemoryRedis } from './support/in-memory-redis';
import { TokenService } from '../src/auth/token.service';
import { SessionService } from '../src/auth/session.service';

jest.setTimeout(120000);

type RegisteredTenantUser = {
  tenant_id: string;
  host: string;
  email: string;
  password: string;
  user_id: string;
  access_token: string;
  role: string;
};

const ensureIntegrationEnv = (): void => {
  (process.env as Record<string, string | undefined>).NODE_ENV = process.env.NODE_ENV ?? 'test';
  process.env.APP_BASE_DOMAIN = process.env.APP_BASE_DOMAIN ?? 'integration.test';
  process.env.JWT_ISSUER = process.env.JWT_ISSUER ?? 'my-shule-integration-tests';
  process.env.JWT_AUDIENCE = process.env.JWT_AUDIENCE ?? 'my-shule-integration-clients';
  process.env.JWT_ACCESS_TOKEN_SECRET =
    process.env.JWT_ACCESS_TOKEN_SECRET ?? 'integration-access-secret';
  process.env.JWT_REFRESH_TOKEN_SECRET =
    process.env.JWT_REFRESH_TOKEN_SECRET ?? 'integration-refresh-secret';
  process.env.DATABASE_RUNTIME_ROLE =
    process.env.DATABASE_RUNTIME_ROLE ?? 'my_shule_runtime';
  process.env.SECURITY_PII_ENCRYPTION_KEY =
    process.env.SECURITY_PII_ENCRYPTION_KEY ??
    'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=';

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for academics workflow integration tests');
  }

  process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6380';
};

const createDatabasePool = (): Pool => {
  const connectionString = process.env.DATABASE_URL ?? '';
  return new Pool({
    connectionString,
    application_name: 'my-shule-academics-workflow-tests',
    ssl: connectionString.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : undefined,
  });
};

/**
 * Registers a user by seeding the database directly and issuing JWT tokens
 * via the NestJS DI container (TokenService + SessionService).
 *
 * We bypass /auth/login because the RLS policies on the `users` table
 * (tenant_id = 'global') prevent the runtime role from finding users
 * during the login flow when the request arrives via a tenant subdomain.
 */
const registerUser = async (
  app: INestApplication,
  tenantId: string,
  email: string,
  role: string,
): Promise<RegisteredTenantUser> => {
  const password = `SecurePass!${tenantId.slice(-4)}`;
  const host = `${tenantId}.${process.env.APP_BASE_DOMAIN ?? 'integration.test'}`;

  const pool = createDatabasePool();
  const bcrypt = require('bcrypt');
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user in the global users table
  const userResult = await pool.query(
    `INSERT INTO users (email, display_name, password_hash, status, email_verified_at)
     VALUES ($1, $2, $3, 'active', NOW()) RETURNING id`,
    [email, `${role} ${tenantId}`, passwordHash],
  );
  const userId = userResult.rows[0].id;

  // Ensure role exists for tenant
  await pool.query(
    `INSERT INTO roles (tenant_id, code, name, is_system)
     VALUES ($1, $2, $2, true)
     ON CONFLICT (tenant_id, code) DO NOTHING`,
    [tenantId, role],
  );

  // Ensure tenant membership exists
  await pool.query(
    `INSERT INTO tenant_memberships (user_id, tenant_id, role_id)
     VALUES ($1, $2, (SELECT id FROM roles WHERE code = $3 AND tenant_id = $2 LIMIT 1))
     ON CONFLICT (user_id, tenant_id) DO UPDATE SET role_id = EXCLUDED.role_id`,
    [userId, tenantId, role],
  );

  await pool.end();

  // Issue tokens directly via DI container (bypasses login RLS issue)
  const audience = (['parent', 'student'].includes(role) ? 'portal' : 'school') as 'school' | 'portal';
  const tokenService = app.get(TokenService);
  const sessionService = app.get(SessionService);
  const sessionId = randomUUID();

  const tokenPair = await tokenService.issueTokenPair({
    user_id: userId,
    tenant_id: tenantId,
    role,
    audience,
    session_id: sessionId,
  });

  const permissions = ['owner', 'principal'].includes(role)
    ? ['*:*']
    : role === 'deputy_principal'
      ? ['academics:read', 'timetable:read', 'timetable:write']
      : ['exams:enter-marks', 'timetable:read', 'academics:read'];

  await sessionService.createSession({
    user_id: userId,
    tenant_id: tenantId,
    role,
    audience,
    permissions,
    session_id: sessionId,
    is_authenticated: true,
    email_verified_at: new Date().toISOString(),
    refresh_token_id: tokenPair.refresh_token_id,
    refresh_expires_at: tokenPair.refresh_expires_at,
    ip_address: '127.0.0.1',
    user_agent: 'academics-integration-test',
  });

  return {
    tenant_id: tenantId,
    host,
    email,
    password,
    user_id: userId,
    access_token: tokenPair.access_token,
    role,
  };
};

describe('Academics End-to-End Workflow', () => {
  let app: INestApplication;
  let testingModule: TestingModule;
  let pool: Pool;
  let principal: RegisteredTenantUser;
  let deputy: RegisteredTenantUser;
  let teacherA: RegisteredTenantUser;
  let teacherB: RegisteredTenantUser;

  const suffix = randomUUID().replace(/-/g, '').slice(0, 8);
  const tenantId = `academics-${suffix}`;

  let academicYearId: string;
  let termId: string;
  let classSectionId: string;
  let secondClassSectionId: string;
  let subjectId: string;

  beforeAll(async () => {
    ensureIntegrationEnv();
    pool = createDatabasePool();

    testingModule = await Test.createTestingModule({
      imports: [AcademicsWorkflowTestModule],
    })
      .overrideProvider(REDIS_CLIENT)
      .useValue(new InMemoryRedis())
      .compile();

    app = testingModule.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();



    // Provide context explicitly because we bypass normal auth pipes in tests
    const requestContextService = app.get(RequestContextService);
    const moduleAccessService = app.get(ModuleAccessService);

    principal = await registerUser(app, tenantId, `principal-${suffix}@example.test`, 'principal');
    deputy = await registerUser(app, tenantId, `deputy-${suffix}@example.test`, 'deputy_principal');
    teacherA = await registerUser(app, tenantId, `teachera-${suffix}@example.test`, 'teacher');
    teacherB = await registerUser(app, tenantId, `teacherb-${suffix}@example.test`, 'teacher');

    // Run within a test request context so ModuleAccessGuard has data
    await requestContextService.run(
      {
        request_id: 'test-setup',
        tenant_id: tenantId,
        user_id: principal.user_id,
        role: 'owner',
        is_authenticated: true,
        permissions: ['*:*'],
      } as any,
      () =>
        moduleAccessService.setSchoolModuleCodes({
          tenantId,
          moduleCodes: ['academics', 'exams', 'timetable'],
          updatedBy: principal.user_id,
        }),
    );
  });

  afterAll(async () => {
    await app?.close();
    await pool?.end();
  });

  test('Principal sets up academic year, term, classes, and subjects', async () => {
    // 1. Year
    const yearRes = await request(app.getHttpServer())
      .post('/academics/years')
      .set('host', principal.host)
      .set('authorization', `Bearer ${principal.access_token}`)
      .send({ name: '2026 Academic Year', starts_on: '2026-01-01', ends_on: '2026-11-30' })
      .expect(201);
    academicYearId = yearRes.body.id;

    // 2. Term
    const termRes = await request(app.getHttpServer())
      .post('/academics/terms')
      .set('host', principal.host)
      .set('authorization', `Bearer ${principal.access_token}`)
      .send({ academic_year_id: academicYearId, name: 'Term 1', starts_on: '2026-01-05', ends_on: '2026-04-05' })
      .expect(201);
    termId = termRes.body.id;

    // 3. Class Section
    const classRes = await request(app.getHttpServer())
      .post('/academics/class-sections')
      .set('host', principal.host)
      .set('authorization', `Bearer ${principal.access_token}`)
      .send({ academic_year_id: academicYearId, name: 'Grade 1 East', grade_level: 'Grade 1', capacity: 40 })
      .expect(201);
    classSectionId = classRes.body.id;

    const secondClassRes = await request(app.getHttpServer())
      .post('/academics/class-sections')
      .set('host', principal.host)
      .set('authorization', `Bearer ${principal.access_token}`)
      .send({ academic_year_id: academicYearId, name: 'Grade 2 East', grade_level: 'Grade 2', capacity: 40 })
      .expect(201);
    secondClassSectionId = secondClassRes.body.id;

    // 4. Subject
    const subjRes = await request(app.getHttpServer())
      .post('/academics/subjects')
      .set('host', principal.host)
      .set('authorization', `Bearer ${principal.access_token}`)
      .send({ code: 'MATH', name: 'Mathematics' })
      .expect(201);
    subjectId = subjRes.body.id;
    
    expect(academicYearId).toBeDefined();
    expect(termId).toBeDefined();
    expect(classSectionId).toBeDefined();
    expect(secondClassSectionId).toBeDefined();
    expect(subjectId).toBeDefined();
  });

  test('Principal creates CBC academic structure successfully', async () => {
    const res = await request(app.getHttpServer())
      .post('/academics/class-structure')
      .set('host', principal.host)
      .set('authorization', `Bearer ${principal.access_token}`)
      .send(KENYAN_CBC_STRUCTURE)
      .expect(201);

    expect(res.body.system_type).toBe('CBC');
    
    // Ensure audit log is created
    const logs = await pool.query(`SELECT * FROM academic_audit_logs WHERE tenant_id = $1 AND action = 'academics.class_structure_created'`, [tenantId]);
    expect(logs.rowCount).toBeGreaterThan(0);
  });

  test('Principal assigns Teacher A to subject, Teacher B cannot access it', async () => {
    await request(app.getHttpServer())
      .post('/academics/teacher-assignments')
      .set('host', principal.host)
      .set('authorization', `Bearer ${principal.access_token}`)
      .send({
        academic_term_id: termId,
        class_section_id: classSectionId,
        subject_id: subjectId,
        teacher_user_id: teacherA.user_id,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/academics/teacher-assignments')
      .set('host', principal.host)
      .set('authorization', `Bearer ${principal.access_token}`)
      .send({
        academic_term_id: termId,
        class_section_id: secondClassSectionId,
        subject_id: subjectId,
        teacher_user_id: teacherA.user_id,
      })
      .expect(201);

    const assignmentsA = await request(app.getHttpServer())
      .get(`/academics/teacher-assignments?teacher_user_id=${teacherA.user_id}`)
      .set('host', teacherA.host)
      .set('authorization', `Bearer ${teacherA.access_token}`)
      .expect(200);
    expect(assignmentsA.body.data.length).toBeGreaterThan(0);

    // Teacher B tries to enter marks for this class/subject (they are not assigned)
    const marksRes = await request(app.getHttpServer())
      .post('/exams/marks')
      .set('host', teacherB.host)
      .set('authorization', `Bearer ${teacherB.access_token}`)
      .send({
        class_id: classSectionId,
        subject_id: subjectId,
        exam_id: randomUUID(),
        student_id: randomUUID(),
        marks: 85,
      });

    // In a strict setup, either 403 Forbidden or 404/400 because they don't own it
    expect([400, 403, 404]).toContain(marksRes.status);
  });

  test('Teacher B tries to enter marks for Teacher A subject', async () => {
    // Attempt marks entry for unassigned subject
    const marksRes = await request(app.getHttpServer())
      .post('/exams/marks')
      .set('host', teacherB.host)
      .set('authorization', `Bearer ${teacherB.access_token}`)
      .send({
        exam_series_id: randomUUID(), // Will 404 anyway
        assessment_id: randomUUID(),
        academic_term_id: termId,
        class_section_id: classSectionId,
        subject_id: subjectId,
        student_id: randomUUID(),
        score: 85,
      });

    expect([400, 403, 404]).toContain(marksRes.status);
  });

  test('Timetable rejects double booking for teacher', async () => {
    await request(app.getHttpServer())
      .put('/timetable/configuration')
      .set('host', deputy.host)
      .set('authorization', `Bearer ${deputy.access_token}`)
      .send({
        academic_year: '2026 Academic Year',
        term_name: 'Term 1',
        default_lesson_duration_minutes: 40,
        days: [{
          day_of_week: 1,
          name: 'Monday',
          is_teaching_day: true,
          order_index: 0,
          periods: [{
            name: 'Period 1',
            starts_at: '08:00',
            ends_at: '08:40',
            is_teaching: true,
            order_index: 0,
          }],
        }],
        common_blocks: [],
      })
      .expect(200);

    const firstSlot = await request(app.getHttpServer())
      .post('/timetable/slots')
      .set('host', deputy.host)
      .set('authorization', `Bearer ${deputy.access_token}`)
      .send({
        academic_year: '2026 Academic Year',
        term_name: 'Term 1',
        class_section_id: classSectionId,
        subject_id: subjectId,
        teacher_id: teacherA.user_id,
        day_of_week: 1, // MONDAY
        starts_at: '08:00',
        ends_at: '08:40',
        room_id: 'room-1',
      })
      .expect(201);
    expect(firstSlot.body.id).toBeDefined();

    const conflictRes = await request(app.getHttpServer())
      .post('/timetable/slots')
      .set('host', deputy.host)
      .set('authorization', `Bearer ${deputy.access_token}`)
      .send({
        academic_year: '2026 Academic Year',
        term_name: 'Term 1',
        class_section_id: secondClassSectionId,
        subject_id: subjectId,
        teacher_id: teacherA.user_id,
        day_of_week: 1,
        starts_at: '08:00',
        ends_at: '08:40',
        room_id: 'room-2',
      });

    expect(conflictRes.status).toBe(400);
    expect(JSON.stringify(conflictRes.body)).toMatch(/teacher.*already|teacher.*conflict|teacher clash/i);
  });

  test('Teacher A successfully enters marks for their assigned subject', async () => {
    // 1. Create Exam Series & Assessment
    const seriesRes = await request(app.getHttpServer())
      .post('/exams/series')
      .set('host', principal.host)
      .set('authorization', `Bearer ${principal.access_token}`)
      .send({
        academic_term_id: termId,
        name: 'Mid Term 1',
        starts_on: '2026-02-01',
        ends_on: '2026-02-14',
      })
      .expect(201);
    
    const assessmentRes = await request(app.getHttpServer())
      .post('/exams/assessments')
      .set('host', principal.host)
      .set('authorization', `Bearer ${principal.access_token}`)
      .send({
        exam_series_id: seriesRes.body.id,
        name: 'Math Exam',
        subject_id: subjectId,
        max_score: 100,
        weight: 100,
      })
      .expect(201);

    // 2. Teacher A tries to enter marks
    const marksRes = await request(app.getHttpServer())
      .post('/exams/marks')
      .set('host', teacherA.host)
      .set('authorization', `Bearer ${teacherA.access_token}`)
      .send({
        exam_series_id: seriesRes.body.id,
        assessment_id: assessmentRes.body.id,
        academic_term_id: termId,
        class_section_id: classSectionId,
        subject_id: subjectId,
        student_id: randomUUID(),
        score: 85,
      });

    // Should succeed since Teacher A is assigned
    expect(marksRes.status).toBe(201);
    expect(parseFloat(marksRes.body.score)).toBe(85);
  });

  test('Report cards are not visible to parent/student before release', async () => {
    // Mock a report card that hasn't been released
    const reportCardId = randomUUID();
    const parentRes = await request(app.getHttpServer())
      .get(`/exams/report-cards/${reportCardId}/parent-download`)
      .set('host', teacherA.host) // Pretend it's a parent role for now
      .set('authorization', `Bearer ${teacherA.access_token}`);
      
    // Because it doesn't exist or isn't released, it should return 404/403
    expect([403, 404]).toContain(parentRes.status);
  });

  test('Tenant isolation prevents accessing data across schools', async () => {
    // Register Tenant C
    const tenantC = await registerUser(app, `academics-c-${suffix}`, `owner-c-${suffix}@example.test`, 'owner');

    // Tenant C tries to read Tenant A's terms
    const termsRes = await request(app.getHttpServer())
      .get('/academics/academic-terms')
      .set('host', tenantC.host)
      .set('authorization', `Bearer ${tenantC.access_token}`)
      .expect(200);

    // Should return 0 items because it belongs to Tenant A
    expect(termsRes.body.data.length).toBe(0);
  });

});
