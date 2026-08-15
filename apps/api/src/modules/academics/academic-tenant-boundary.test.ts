import assert from 'node:assert/strict';
import test from 'node:test';

import { BadRequestException } from '@nestjs/common';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { FeesController } from '../finance/fees.controller';
import { AcademicController } from './academic.controller';
import { AttendanceController } from './attendance-mark.controller';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const TERM_ID = '22222222-2222-4222-8222-222222222222';
const ASSESSMENT_ID = '33333333-3333-4333-8333-333333333333';
const CLASS_ID = '44444444-4444-4444-8444-444444444444';
const SERIES_ID = '55555555-5555-4555-8555-555555555555';
const STUDENT_ID = '66666666-6666-4666-8666-666666666666';
const FOREIGN_STUDENT_ID = '77777777-7777-4777-8777-777777777777';
const SUBJECT_ID = '88888888-8888-4888-8888-888888888888';
const SESSION_ID = '99999999-9999-4999-8999-999999999999';

function contextState(path: string, role = 'teacher') {
  return {
    request_id: `request-${path}`,
    tenant_id: 'tenant-a',
    user_id: USER_ID,
    role,
    session_id: 'session-tenant-a',
    permissions: ['academics:read', 'academics:write', 'finance:read'],
    is_authenticated: true,
    client_ip: '127.0.0.1',
    user_agent: 'test-suite',
    method: 'POST',
    path,
    started_at: '2026-08-15T00:00:00.000Z',
  };
}

function markInput(studentId: string) {
  return {
    academicTermId: TERM_ID,
    assessmentId: ASSESSMENT_ID,
    classSectionId: CLASS_ID,
    examSeriesId: SERIES_ID,
    studentId,
    subjectId: SUBJECT_ID,
    score: 72,
    remarks: 'Verified import',
  };
}

function validMarkReferences(overrides: Record<string, unknown> = {}) {
  return {
    student_exists: true,
    class_exists: true,
    term_exists: true,
    series_exists: true,
    subject_exists: true,
    class_assignment_exists: true,
    max_score: '100',
    ...overrides,
  };
}

test('AcademicController validates a complete import before writes and rejects a foreign student', async () => {
  const requestContext = new RequestContextService();
  const validations: Array<{ sql: string; params: unknown[] }> = [];
  const writes: unknown[] = [];
  const tenantTransactions: Array<{ tenantId: string; userId: string }> = [];
  const controller = new AcademicController(
    {
      executeWithTenant: async (tenantId: string, userId: string, callback: (tx: any) => Promise<unknown>) => {
        tenantTransactions.push({ tenantId, userId });
        let validationIndex = 0;
        return callback({
          $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
            validations.push({ sql, params });
            validationIndex += 1;
            return [validationIndex === 1
              ? validMarkReferences()
              : validMarkReferences({ student_exists: false, class_assignment_exists: false })];
          },
          examMarks: {
            create: async (args: unknown) => {
              writes.push(args);
              return args;
            },
          },
        });
      },
      examMarks: {
        create: async () => {
          throw new Error('direct exam mark access must not be used');
        },
      },
    } as never,
    requestContext,
  );

  await assert.rejects(
    requestContext.run(
      contextState('/academic/exams-manager/import-marks'),
      () => controller.importMarks({
        marks: [markInput(STUDENT_ID), markInput(FOREIGN_STUDENT_ID)],
      }),
    ),
    (error: unknown) => error instanceof BadRequestException
      && /not active records in this school/i.test(error.message),
  );

  assert.equal(writes.length, 0);
  assert.deepEqual(tenantTransactions, [{ tenantId: 'tenant-a', userId: USER_ID }]);
  assert.equal(validations.length, 2);
  assert.match(validations[0]!.sql, /FROM students student/);
  assert.match(validations[0]!.sql, /FROM class_sections section/);
  assert.match(validations[0]!.sql, /FROM student_class_assignments assignment/);
  assert.match(validations[0]!.sql, /FROM exam_assessments assessment/);
  assert.equal(validations.every((validation) => validation.params[0] === 'tenant-a'), true);
});

test('AcademicController enters a tenant-valid mark with the authenticated actor', async () => {
  const requestContext = new RequestContextService();
  let created: any = null;
  const controller = new AcademicController(
    {
      executeWithTenant: async (_tenantId: string, _userId: string, callback: (tx: any) => Promise<unknown>) => callback({
        $queryRawUnsafe: async () => [validMarkReferences()],
        examMarks: {
          create: async (args: any) => {
            created = args;
            return { id: 'mark-a', ...args.data };
          },
        },
      }),
    } as never,
    requestContext,
  );

  const result = await requestContext.run(
    contextState('/academic/marks/enter'),
    () => controller.enterMarks({
      ...markInput(STUDENT_ID),
      enteredByUserId: FOREIGN_STUDENT_ID,
    }),
  );

  assert.equal(result.success, true);
  assert.equal(created.data.tenant_id, 'tenant-a');
  assert.equal(created.data.entered_by_user_id, USER_ID);
  assert.equal(created.data.updated_by_user_id, USER_ID);
});

test('AcademicController reads communications inside the authenticated tenant session', async () => {
  const requestContext = new RequestContextService();
  const transactions: Array<{ tenantId: string; userId: string }> = [];
  const controller = new AcademicController(
    {
      executeWithTenant: async (tenantId: string, userId: string, callback: (tx: any) => Promise<unknown>) => {
        transactions.push({ tenantId, userId });
        return callback({
          communicationBroadcast: {
            findMany: async (args: any) => {
              assert.deepEqual(args.where, { schoolId: 'tenant-a' });
              return [{ id: 'broadcast-a' }];
            },
          },
        });
      },
      communicationBroadcast: {
        findMany: async () => {
          throw new Error('direct communication access must not be used');
        },
      },
    } as never,
    requestContext,
  );

  const result = await requestContext.run(
    contextState('/academic/communications'),
    () => controller.getCommunications(),
  );

  assert.deepEqual(result.items, [{ id: 'broadcast-a' }]);
  assert.deepEqual(transactions, [{ tenantId: 'tenant-a', userId: USER_ID }]);
});

test('AcademicController does not report success for a foreign report-card batch', async () => {
  const requestContext = new RequestContextService();
  const controller = new AcademicController(
    {
      executeWithTenant: async (tenantId: string, userId: string, callback: (tx: any) => Promise<unknown>) => {
        assert.equal(tenantId, 'tenant-a');
        assert.equal(userId, USER_ID);
        return callback({
          reportCardGenerationBatches: {
            updateMany: async (args: any) => {
              assert.equal(args.where.tenant_id, 'tenant-a');
              return { count: 0 };
            },
          },
        });
      },
    } as never,
    requestContext,
  );

  await assert.rejects(
    requestContext.run(
      contextState('/academic/dean/lock-batch', 'dean-academics'),
      () => controller.lockBatch({ batchId: 'foreign-batch' }),
    ),
    (error: unknown) => error instanceof BadRequestException
      && /not found in this school/i.test(error.message),
  );
});

test('AttendanceController rejects a foreign student before attendance or event writes', async () => {
  const requestContext = new RequestContextService();
  let attendanceWrites = 0;
  const controller = new AttendanceController(
    {
      executeWithTenant: async (tenantId: string, userId: string, callback: (tx: any) => Promise<unknown>) => {
        assert.equal(tenantId, 'tenant-a');
        assert.equal(userId, USER_ID);
        return callback({
          student: { findFirst: async () => null },
          attendanceSession: {
            findFirst: async () => ({
              id: SESSION_ID,
              classId: CLASS_ID,
              streamId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
              status: 'DRAFT',
            }),
          },
          attendanceRecord: {
            upsert: async () => {
              attendanceWrites += 1;
            },
          },
        });
      },
    } as never,
    requestContext,
  );

  await assert.rejects(
    requestContext.run(
      contextState('/attendance/mark'),
      () => controller.markAttendance({
        studentId: FOREIGN_STUDENT_ID,
        attendanceSessionId: SESSION_ID,
        status: 'PRESENT',
      }),
    ),
    (error: unknown) => error instanceof BadRequestException,
  );

  assert.equal(attendanceWrites, 0);
});

test('FeesController runs fee summary and payment reads in the active tenant session', async () => {
  const requestContext = new RequestContextService();
  const transactions: Array<{ tenantId: string; userId: string }> = [];
  const controller = new FeesController(
    {
      executeWithTenant: async (tenantId: string, userId: string, callback: (tx: any) => Promise<unknown>) => {
        transactions.push({ tenantId, userId });
        return callback({
          feeStructure: {
            findMany: async (args: any) => {
              assert.deepEqual(args.where, { schoolId: 'tenant-a' });
              return [{ id: 'fee-a' }];
            },
          },
          payment: {
            findMany: async (args: any) => {
              assert.deepEqual(args.where, { schoolId: 'tenant-a' });
              return [{ id: 'payment-a' }];
            },
          },
        });
      },
      feeStructure: {
        findMany: async () => {
          throw new Error('direct fee summary access must not be used');
        },
      },
      payment: {
        findMany: async () => {
          throw new Error('direct payment access must not be used');
        },
      },
    } as never,
    requestContext,
  );

  const [summary, payments] = await requestContext.run(
    contextState('/fees/summary', 'accountant'),
    () => Promise.all([controller.getFeeSummary(), controller.getFeePayments()]),
  );

  assert.deepEqual(summary.items, [{ id: 'fee-a' }]);
  assert.deepEqual(payments.items, [{ id: 'payment-a' }]);
  assert.deepEqual(transactions, [
    { tenantId: 'tenant-a', userId: USER_ID },
    { tenantId: 'tenant-a', userId: USER_ID },
  ]);
});
