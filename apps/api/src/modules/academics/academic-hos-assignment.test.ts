import 'reflect-metadata';
import test from 'node:test';
import assert from 'node:assert/strict';
import { ValidationPipe } from '@nestjs/common';
import { AcademicsService } from './academics.service';
import { AssignHeadOfSubjectDto } from './dto/academic.dto';
import { Reflector } from '@nestjs/core';
import { RbacGuard } from '../../guards/rbac.guard';
import { AcademicsController } from './academics.controller';

test('simple HOS assignment accepts only subject and staff, rejects hidden scope overrides', async () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true });
  const body = { subject_id: 'math', teacher_user_id: 'staff-a' };
  const validate = (input: unknown) => pipe.transform(input, { type: 'body', metatype: AssignHeadOfSubjectDto });
  assert.deepEqual({ ...await validate(body) }, body);
  for (const field of ['appointment_type', 'reason', 'department_id', 'academic_year_id', 'class_section_id', 'stream_id']) {
    await assert.rejects(() => validate({ ...body, [field]: 'override' }));
  }
  await assert.rejects(() => validate({ subject_id: '' }));
});

test('simple HOS assignment uses the governed school-wide appointment workflow', async () => {
  const service = new AcademicsService({} as never, {} as never, {} as never);
  let assigned: unknown;
  service.assignAcademicRole = async (input) => { assigned = input; return { appointment: { id: 'appointment' } } as never; };
  await service.assignHeadOfSubject({ subject_id: 'math', teacher_user_id: 'staff-a' });
  assert.deepEqual(assigned, {
    subject_id: 'math', teacher_user_id: 'staff-a', role_type: 'head_of_subject',
    appointment_type: 'permanent', reason: 'School-wide Head of Subject assigned from Academic Foundation',
  });
});

test('HOS mutation requires assignment permission, rejects foreign records and audits/notifies the actual school', async () => {
  let permissions: string[] = ['academics:read'];
  const guard = new RbacGuard(new Reflector(), { requireStore: () => ({ is_authenticated: true, role: 'librarian', permissions }) } as never);
  const context = { getHandler: () => AcademicsController.prototype.assignHeadOfSubject, getClass: () => AcademicsController } as never;
  assert.throws(() => guard.canActivate(context), /Permission-based access denied/);
  permissions = ['academics:assign-teachers'];
  assert.equal(guard.canActivate(context), true);
  const evidence: Array<{ kind: string; tenant?: string; tx: unknown }> = [];
  const tx = { transaction: true };
  const service = new AcademicsService(
    { getStore: () => ({ tenant_id: 'school-a', user_id: 'principal', role: 'principal' }) } as never,
    {
      findTeacherOptionByUserId: async (tenant: string, id: string, allStaff: boolean) => {
        assert.equal(tenant, 'school-a'); assert.equal(allStaff, true);
        return id === 'librarian' ? { user_id: id, role_code: 'librarian' } : null;
      },
      getSetupRecord: async (tenant: string, _type: string, id: string) => {
        assert.equal(tenant, 'school-a'); return id === 'math' ? { id, status: 'active' } : null;
      },
      assignAcademicRole: async (tenant: string, input: any, governance: any) => {
        const result = { appointment: { ...input, id: 'appointment' }, previous: null, changed_holder: false };
        await governance(tx, result); return result;
      },
      appendAuditLog: async (record: any, transaction: unknown) => { evidence.push({ kind: 'audit', tenant: record.tenant_id, tx: transaction }); },
    } as never, {} as never,
    { publish: async (event: any, transaction: unknown) => { evidence.push({ kind: 'event', tenant: event.payload.tenant_id, tx: transaction }); } } as never,
    { createNotification: async (notice: any, transaction: unknown) => { evidence.push({ kind: 'notification', tenant: notice.tenant_id, tx: transaction }); } } as never,
  );
  await assert.rejects(() => service.assignHeadOfSubject({ subject_id: 'math', teacher_user_id: 'foreign' }), /active staff member in this school/);
  await assert.rejects(() => service.assignHeadOfSubject({ subject_id: 'foreign', teacher_user_id: 'librarian' }), /not found in this school/);
  assert.equal(evidence.length, 0);
  await service.assignHeadOfSubject({ subject_id: 'math', teacher_user_id: 'librarian' });
  assert.deepEqual(evidence, ['audit', 'event', 'notification'].map(kind => ({ kind, tenant: 'school-a', tx })));
});


test('renewing the same HOD updates appointment terms and commits governance with the appointment', async () => {
  const evidence: unknown[] = [];
  const tx = { transaction: true };
  const service = new AcademicsService(
    { getStore: () => ({ tenant_id: 'school-a', user_id: 'principal', role: 'principal' }) } as never,
    {
      getSetupRecord: async () => ({ id: 'department', name: 'Science', head_of_department_user_id: 'staff-a' }),
      findTeacherOptionByUserId: async () => ({ user_id: 'staff-a' }),
      assignDepartmentHead: async (_tenant: string, id: string, holder: string, input: any, governance: any) => {
        assert.equal(input.appointment_type, 'temporary');
        assert.equal(input.effective_to, '2026-12-31');
        const result = { department: { id, name: 'Science', head_of_department_user_id: holder, version: 2 } };
        await governance(tx, result, { head_of_department_user_id: holder });
        return result;
      },
      appendAuditLog: async (_input: unknown, transaction: unknown) => { evidence.push(transaction); },
    } as never, {} as never,
    { publish: async (_input: unknown, transaction: unknown) => { evidence.push(transaction); } } as never,
    { createNotification: async (_input: unknown, transaction: unknown) => { evidence.push(transaction); } } as never,
  );
  await service.updateDepartment('department', { head_of_department_user_id: 'staff-a', appointment_type: 'temporary',
    effective_from: '2026-10-03', effective_to: '2026-12-31', reason: 'Renewed appointment' });
  assert.deepEqual(evidence, [tx, tx, tx]);
});
