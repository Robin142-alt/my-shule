import 'reflect-metadata';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DEFAULT_ROLE_CATALOG } from './auth.constants';
import { CreateTenantInvitationDto } from './dto/tenant-invitation.dto';
import { normalizeBlueprintRole } from './identity-blueprint';
import { RbacGuard } from '../guards/rbac.guard';
import { ExamsController } from '../modules/exams/exams.controller';
import { AnalyticsReportController } from '../modules/exams/analytics/analytics-report.controller';
import { AcademicsService } from '../modules/academics/academics.service';

test('Head of Subject is invitable and has scoped report access without whole-school exam authority', async () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true });
  const dto = await pipe.transform({ display_name: 'Subject Head', email: 'hos@example.test', role_code: 'head_of_subject' }, { type: 'body', metatype: CreateTenantInvitationDto });
  assert.equal(dto.role_code, 'head_of_subject');
  for (const alias of ['hos', 'Head of Subject', 'head-of-subject']) assert.equal(normalizeBlueprintRole(alias), 'head_of_subject');
  const role = DEFAULT_ROLE_CATALOG.find(item => item.code === 'head_of_subject')!;
  const guard = new RbacGuard(new Reflector(), { requireStore: () => ({ is_authenticated: true, role: role.code, permissions: role.permissions }) } as never);
  const check = (controller: any, method: string) => guard.canActivate({ getHandler: () => controller.prototype[method], getClass: () => controller } as never);
  assert.equal(check(ExamsController, 'getSubjectAnalytics'), true);
  assert.equal(check(AnalyticsReportController, 'generateSubject'), true);
  for (const method of ['getAnalytics', 'listReportCards', 'getResultBroadsheet', 'enterMark', 'publishReportCard', 'createSeries']) {
    assert.throws(() => check(ExamsController, method), /Permission-based access denied/, method);
  }
  assert.throws(() => check(AnalyticsReportController, 'generate'), /Permission-based access denied/);
});

test('subject analytics endpoint forces subject scope when a caller requests another scope', async () => {
  let query: unknown;
  const controller = new ExamsController({ getAnalytics: async (input: unknown) => { query = input; return {}; } } as never);
  await controller.getSubjectAnalytics({ scope: 'school', subject_id: 'math', school_id: 'foreign' });
  assert.deepEqual(query, { scope: 'subject', subject_id: 'math', school_id: 'foreign' });
});

test('my subject appointments use authenticated tenant/user and reject anonymous callers', async () => {
  let userId: string | null = 'staff-a';
  const calls: unknown[] = [];
  const service = new AcademicsService({ getStore: () => ({ tenant_id: 'school-a', user_id: userId }) } as never,
    { getSubjectAppointmentsForUser: async (...args: unknown[]) => { calls.push(args); return [{ subject_name: 'Math' }]; } } as never, {} as never);
  assert.deepEqual(await service.getMySubjectAppointments(), [{ subject_name: 'Math' }]);
  assert.deepEqual(calls, [['school-a', 'staff-a']]);
  userId = 'anonymous';
  await assert.rejects(() => service.getMySubjectAppointments(), /Sign in/);
  userId = null;
  await assert.rejects(() => service.getMySubjectAppointments(), /Sign in/);
  assert.equal(calls.length, 1);
});
