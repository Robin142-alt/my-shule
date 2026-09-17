import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { validate } from 'class-validator';
import { CreateClassSubjectAssignmentDto, CreateBulkClassSubjectAssignmentsDto } from './dto/academic.dto';

test('a continuing subject offering accepts an exact stream without an academic term', async () => {
  const dto = Object.assign(new CreateClassSubjectAssignmentDto(), {
    class_section_id: 'class-6', stream_id: 'blue', subject_id: 'mathematics',
  });
  assert.deepEqual(await validate(dto, { whitelist: true, forbidNonWhitelisted: true }), []);
});

test('several continuing cohort subjects can be configured before a term is created', async () => {
  const dto = Object.assign(new CreateBulkClassSubjectAssignmentsDto(), {
    class_section_id: 'class-6', stream_id: 'blue', subject_ids: ['mathematics', 'english'],
  });
  assert.deepEqual(await validate(dto, { whitelist: true, forbidNonWhitelisted: true }), []);
});
