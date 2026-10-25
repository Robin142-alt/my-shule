import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { Reflector } from '@nestjs/core';
import { validateSync } from 'class-validator';
import { RbacGuard } from '../../guards/rbac.guard';
import { MODULE_ACCESS_KEY } from '../module-access/module-access.decorator';
import { ExamsManagerMarksController, SaveAssistedMarksDto } from '../class-teacher/exams-manager-marks.controller';
import { requireAssistedMarkEntryScope } from './assisted-mark-entry-policy';

const context = { is_authenticated: true, tenant_id: 'school-a', user_id: 'manager-a', role: 'exams_manager',
  permissions: ['exams:write', 'exams:enter-marks'] };

test('assisted routes enforce the exams module, manager role and both entry permissions', () => {
  assert.deepEqual(Reflect.getMetadata(MODULE_ACCESS_KEY, ExamsManagerMarksController), ['exams']);
  let store = { ...context };
  const guard = new RbacGuard(new Reflector(), { requireStore: () => store } as never);
  for (const action of ['assignments', 'markbooks', 'save'] as const) {
    const route = { getHandler: () => ExamsManagerMarksController.prototype[action], getClass: () => ExamsManagerMarksController } as never;
    store = { ...context };
    assert.equal(guard.canActivate(route), true);
    for (const role of ['teacher', 'class_teacher', 'dean_of_academics', 'parent', 'bursar', 'accountant']) {
      store = { ...context, role };
      assert.throws(() => guard.canActivate(route), /Role-based/);
      assert.throws(() => requireAssistedMarkEntryScope(store as never), /permission/);
    }
    for (const permissions of [[], ['exams:write'], ['exams:enter-marks']]) {
      store = { ...context, permissions };
      assert.throws(() => guard.canActivate(route), /Permission-based/);
      assert.throws(() => requireAssistedMarkEntryScope(store as never), /permission/);
    }
  }
  assert.throws(() => requireAssistedMarkEntryScope({ ...context, is_authenticated: false } as never));
  assert.throws(() => requireAssistedMarkEntryScope({ ...context, tenant_id: null } as never));
});

test('assisted writes validate IDs, actions and reject actor or tenant overrides', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const body = { examId: id, classSectionId: id, assessmentId: id, teacherUserId: id, action: 'draft', marks: {} };
  const validate = (values: object) => validateSync(Object.assign(new SaveAssistedMarksDto(), values), { whitelist: true, forbidNonWhitelisted: true });
  assert.equal(validate(body).length, 0);
  assert.equal(validate({ ...body, teacherUserId: undefined }).length, 0);
  assert.equal(validate({ ...body, teacherUserId: null }).length, 0);
  for (const field of ['examId', 'classSectionId', 'assessmentId', 'teacherUserId']) {
    assert.ok(validate({ ...body, [field]: 'invalid' }).length);
  }
  assert.ok(validate({ ...body, action: 'publish' }).length);
  assert.ok(validate({ ...body, actor_user_id: id, tenant_id: 'school-b' }).length);
});
