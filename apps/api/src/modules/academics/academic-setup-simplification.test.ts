import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { validate } from 'class-validator';
import { AcademicsService } from './academics.service';
import {
  AcademicRoleAppointmentDto, CreateAcademicCurriculumConfigurationDto,
  CreateAcademicTermDto, CreateAcademicYearDto, CreateSubjectDto, ReassignTeacherDto,
} from './dto/academic.dto';

test('simplified DTOs accept missing assignment dates and codes while calendar dates remain required', async () => {
  for (const dto of [
    Object.assign(new CreateSubjectDto(), { name: 'Mathematics' }),
    Object.assign(new AcademicRoleAppointmentDto(), { role_type: 'dean_of_academics', teacher_user_id: 'teacher', reason: 'Appointment' }),
    Object.assign(new CreateAcademicCurriculumConfigurationDto(), { name: 'CBC', curriculum_model: 'CBC' }),
    Object.assign(new ReassignTeacherDto(), { teacher_user_id: 'teacher', reason: 'Transfer duties' }),
  ]) assert.deepEqual(await validate(dto), []);
  for (const dto of [
    Object.assign(new CreateAcademicYearDto(), { name: '2026' }),
    Object.assign(new CreateAcademicTermDto(), { name: 'Term 1', academic_year_id: 'year' }),
  ]) {
    assert.deepEqual((await validate(dto)).map(error => error.property).sort(), ['ends_on', 'starts_on']);
  }
});

function fixture() {
  const audit: any[] = [], events: any[] = [], notices: any[] = [], writes: any[] = [];
  let duplicate = false;
  const repository = {
    executeSql: async (tenant: string, sql: string) => {
      assert.equal(tenant, 'school-a');
      return { rows: duplicate && sql.includes('lower(name)') ? [{ id: 'existing' }] : [] };
    },
    findTeacherOptionByUserId: async () => ({ id: 'staff', user_id: 'teacher' }),
    createSubject: async (input: any) => { writes.push(input); return { id: 'subject', ...input }; },
    assignAcademicRole: async (tenant: string, input: any) => {
      assert.equal(tenant, 'school-a');
      writes.push(input);
      return { appointment: { id: 'role', ...input }, previous: null, changed_holder: false };
    },
    createCurriculumConfiguration: async (tenant: string, input: any) => {
      assert.equal(tenant, 'school-a');
      writes.push(input);
      return { id: 'curriculum', ...input };
    },
    reassignTeacherAssignment: async (_tenant: string, _id: string, input: any, persist: (change: any) => Promise<void>) => {
      writes.push(input);
      const assignment = { id: 'replacement', ...input };
      await persist({ tx: {}, assignment, previous: { id: 'old' }, transferred: {}, manual_review: [] });
      return { assignment, manual_review: [] };
    },
    appendAuditLog: async (input: any) => { audit.push(input); },
  };
  const service = new AcademicsService(
    { getStore: () => ({ tenant_id: 'school-a', user_id: 'actor', role: 'deputy_principal' }) } as never,
    repository as never, {} as never,
    { publish: async (event: any) => { events.push(event); } } as never,
    { createNotification: async (notice: any) => { notices.push(notice); } } as never,
  );
  return { service, writes, audit, events, notices, setDuplicate: () => { duplicate = true; } };
}

test('subject creation generates internal identifiers, keeps school ownership, and rejects duplicate names', async () => {
  const { service, writes, audit, events, setDuplicate } = fixture();
  await service.createSubject({ name: 'Mathematics' });
  await service.createSubject({ name: 'English' });
  assert.equal(writes[0].tenant_id, 'school-a');
  assert.match(writes[0].code, /^SUB-[0-9a-f-]{36}$/);
  assert.notEqual(writes[0].code, writes[1].code);
  assert.equal(writes[0].abbreviation, null);
  assert.equal(audit.length, 2);
  assert.equal(events[0].event_name, 'academic.subject.updated');
  setDuplicate();
  await assert.rejects(service.createSubject({ name: 'Mathematics' }), /already exists/);
  assert.equal(writes.length, 2);
});

test('role, curriculum, and teacher reassignment default their history dates on the server', async () => {
  const { service, writes, audit, events, notices } = fixture();
  const today = new Date().toISOString().slice(0, 10);
  await service.assignAcademicRole({ role_type: 'dean_of_academics', teacher_user_id: 'teacher', reason: 'Appointment' });
  await service.createCurriculumConfiguration({ name: 'CBC', curriculum_model: 'CBC' });
  await service.reassignTeacher('old', { teacher_user_id: 'teacher', reason: 'Transfer duties' });
  for (const write of writes) {
    assert.equal(write.effective_from, today);
    assert.equal(write.effective_to, undefined);
    assert.equal(write.actor_user_id, 'actor');
  }
  assert.equal(audit.length, 3);
  assert.equal(events.length, 3);
  assert.equal(notices.length, 2);
  assert.ok(notices.every(notice => notice.tenant_id === 'school-a' && !notice.body.includes('undefined')));
});
