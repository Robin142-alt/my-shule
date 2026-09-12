import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { validate } from 'class-validator';
import { normalizeCurriculum, validateGradingRules } from './curriculum-grading';
import { AcademicRoleAppointmentDto, CreateClassSectionDto } from './dto/academic.dto';
import { AcademicsService } from './academics.service';
import { ExamsRepository } from '../exams/repositories/exams.repository';

const rules = [
  { label: 'High', min: 60, max: 100, points: 8, remark: 'Meeting Expectation', is_pass: true },
  { label: 'Low', min: 0, max: 59, points: 1, remark: 'Below Expectation', is_pass: false },
];

test('curriculum and grade validation accepts custom systems and rejects incomplete or overlapping policies', () => {
  assert.equal(normalizeCurriculum(' 844 '), '8-4-4');
  assert.equal(normalizeCurriculum('cbc'), 'CBC');
  assert.equal(normalizeCurriculum('Cambridge'), 'Cambridge');
  assert.throws(() => normalizeCurriculum(''), /Choose a curriculum/);
  assert.deepEqual(validateGradingRules(rules), rules);
  assert.throws(() => validateGradingRules([{ ...rules[0], min: 61 }, rules[1]]), /gaps or overlaps/);
  assert.throws(() => validateGradingRules([{ ...rules[0], min: 59 }, rules[1]]), /gaps or overlaps/);
  assert.throws(() => validateGradingRules([{ ...rules[0], label: 'Low' }, rules[1]]), /unique grade/);
});

test('classes accept a named curriculum and appointments accept no manual note', async () => {
  assert.deepEqual(await validate(Object.assign(new CreateClassSectionDto(), {
    name: 'Year 7', academic_year_id: 'year', curriculum_model: 'Cambridge',
  })), []);
  assert.deepEqual(await validate(Object.assign(new AcademicRoleAppointmentDto(), {
    role_type: 'dean_of_academics', teacher_user_id: 'staff',
  })), []);
});

test('saving a curriculum policy persists the binding with tenant-scoped audit and events', async () => {
  const writes: any[] = [], audits: any[] = [], events: any[] = [];
  const service = new AcademicsService(
    { getStore: () => ({ tenant_id: 'school-a', user_id: 'actor', role: 'deputy_principal' }) } as never,
    {
      executeSql: async () => ({ rows: [] }),
      createGradingSystem: async (tenant: string, name: string, description: string, options: any) => {
        writes.push({ tenant, name, description, options });
        return { id: 'policy', name, ...options };
      },
      appendAuditLog: async (value: any) => { audits.push(value); },
    } as never, {} as never,
    { publish: async (value: any) => { events.push(value); } } as never, {} as never,
  );
  await service.createGradingSystem({ name: 'Junior grading', curriculum_model: 'CBC', rules });
  assert.equal(writes[0].tenant, 'school-a');
  assert.equal(writes[0].options.curriculum_model, 'CBC');
  assert.deepEqual(writes[0].options.rules, rules);
  assert.equal(audits[0].tenant_id, 'school-a');
  assert.equal(events[0].event_name, 'academic.policy.updated');
  await assert.rejects(service.createGradingSystem({ name: 'Invalid', rules }), /Choose a curriculum/);
  assert.equal(writes.length, 1);
});

function reportRepository(curriculum: string, missing = false) {
  const repository = new ExamsRepository({} as never);
  (repository as any).executeSql = async (sql: string, params: unknown[]) => {
    assert.equal(params[0], 'school-a');
    if (sql.includes('FROM students student')) return { rows: [{ id: 'student', curriculum_model: curriculum }] };
    if (sql.includes('FROM academics_grading_systems system')) {
      assert.equal(params[1], curriculum);
      assert.match(sql, /system.tenant_id = \$1/);
      return { rows: missing ? [] : [{
        id: 'policy', name: curriculum, curriculum_model: curriculum, version: 1,
        rules: rules.map((band) => ({ ...band, label: curriculum === 'CBC' ? band.label : 'A', points: curriculum === 'CBC' ? band.points : 12 })),
      }] };
    }
    if (sql.includes('FROM exam_marks mark')) return { rows: [{
      subject_id: 'shared-mathematics', subject_name: 'Mathematics',
      score: 65, max_score: 100, percentage: 65, score_status: 'entered', grade_label: 'OLD', points: 0,
    }] };
    return { rows: [] };
  };
  return repository;
}

test('a shared subject uses its class curriculum, overriding unrelated school or exam grades', async () => {
  const input = { tenant_id: 'school-a', exam_series_id: 'exam', student_id: 'student' };
  const cbc = await reportRepository('CBC').loadReportCardData(input);
  const secondary = await reportRepository('8-4-4').loadReportCardData(input);
  assert.equal((cbc.subjects as any[])[0].grade_label, 'High');
  assert.equal((cbc.subjects as any[])[0].points, 8);
  assert.equal((secondary.subjects as any[])[0].points, 12);
  assert.equal((cbc.grading_policy as any).reporting_mode, 'competency');
  assert.equal((secondary.grading_policy as any).reporting_mode, 'traditional');
});

test('report generation fails truthfully when the class curriculum has no grading policy', async () => {
  await assert.rejects(reportRepository('CBC', true).loadReportCardData({
    tenant_id: 'school-a', exam_series_id: 'exam', student_id: 'student',
  }), /Save a grading policy for the class curriculum/);
});
