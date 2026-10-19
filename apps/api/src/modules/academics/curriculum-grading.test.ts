import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { validate } from 'class-validator';
import { normalizeCurricula, normalizeCurriculum, validateGradingRules } from './curriculum-grading';
import { AcademicRoleAppointmentDto, CreateClassSectionDto } from './dto/academic.dto';
import { AcademicsService } from './academics.service';
import { ExamsRepository } from '../exams/repositories/exams.repository';
import { ExamsService } from '../exams/exams.service';

const rules = [
  { label: 'High', min: 60, max: 100, points: 8, remark: 'Meeting Expectation', is_pass: true },
  { label: 'Low', min: 0, max: 59, points: 1, remark: 'Below Expectation', is_pass: false },
];

test('curriculum and grade validation accepts custom systems and rejects incomplete or overlapping policies', () => {
  assert.equal(normalizeCurriculum(' 844 '), '8-4-4');
  assert.equal(normalizeCurriculum('cbc'), 'CBC');
  assert.equal(normalizeCurriculum('Cambridge'), 'Cambridge');
  assert.deepEqual(normalizeCurricula(['844', 'CBC', '8-4-4']), ['8-4-4', 'CBC']);
  assert.throws(() => normalizeCurricula([]), /one and ten curricula/);
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
  await service.createGradingSystem({
    name: 'Junior grading', curriculum_model: '844', curriculum_models: ['844', 'CBC', '8-4-4'], rules,
  });
  assert.equal(writes[0].tenant, 'school-a');
  assert.equal(writes[0].options.curriculum_model, '8-4-4');
  assert.deepEqual(writes[0].options.curriculum_models, ['8-4-4', 'CBC']);
  assert.deepEqual(writes[0].options.rules, rules);
  assert.equal(audits[0].tenant_id, 'school-a');
  assert.equal(events[0].event_name, 'academic.policy.updated');
  await assert.rejects(service.createGradingSystem({ name: 'Invalid', rules }), /Choose between one and ten curricula/);
  assert.equal(writes.length, 1);
});

function reportRepository(
  curriculum: string,
  options: {
    missing?: boolean;
    preferredSystemId?: string;
    gradingSystem?: Record<string, unknown>;
    gradingSystems?: Record<string, unknown>[];
  } = {},
) {
  const repository = new ExamsRepository({} as never);
  (repository as any).executeSql = async (sql: string, params: unknown[]) => {
    assert.equal(params[0], 'school-a');
    if (sql.includes('FROM students student')) return { rows: [{ id: 'student', curriculum_model: curriculum }] };
    if (sql.includes('FROM academics_grading_systems system')) {
      const gradingSystems = options.gradingSystems ?? [options.gradingSystem ?? {
        id: 'policy', name: curriculum, curriculum_model: curriculum, version: 1,
        rules: rules.map((band) => ({ ...band, label: curriculum === 'CBC' ? band.label : 'A', points: curriculum === 'CBC' ? band.points : 12 })),
      }];
      const classCurriculum = curriculum.toLowerCase().replace(/-/g, '');
      const preferredSystemId = options.preferredSystemId ?? 'policy';
      const includesLegacySystems = /OR\s+NULLIF\(btrim\(to_jsonb\(system\) ->> 'curriculum_model'\), ''\) IS NULL/i.test(sql);
      const eligibleSystems = options.missing ? [] : gradingSystems.filter((gradingSystem) => {
        const policyCurriculum = String(gradingSystem.curriculum_model ?? '').trim().toLowerCase().replace(/-/g, '');
        const supportedCurricula = Array.isArray(gradingSystem.curriculum_models)
          ? gradingSystem.curriculum_models.map((value) => String(value).trim().toLowerCase().replace(/-/g, ''))
          : [];
        const classMatch = policyCurriculum === classCurriculum || supportedCurricula.includes(classCurriculum);
        const legacyEligible = !policyCurriculum && includesLegacySystems;
        return !classCurriculum || classMatch || legacyEligible || gradingSystem.id === preferredSystemId;
      });
      assert.match(sql, /preferred_grading/);
      assert.match(sql, /system.tenant_id = \$1/);
      return { rows: eligibleSystems.map((gradingSystem) => ({
        ...gradingSystem, preferred_grading_system_id: preferredSystemId,
      })) };
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
  const cbc = await reportRepository('CBC', {
    preferredSystemId: 'traditional-policy',
    gradingSystem: { id: 'cbc-policy', name: 'CBC policy', curriculum_model: 'CBC', version: 1, rules: rules.map((band) => ({ ...band, label: band.label, points: band.points })) },
  }).loadReportCardData(input);
  const secondary = await reportRepository('8-4-4', {
    preferredSystemId: 'cbc-policy',
    gradingSystem: { id: 'traditional-policy', name: '8-4-4 policy', curriculum_model: '8-4-4', version: 1, rules: rules.map((band) => ({ ...band, label: 'A', points: 12 })) },
  }).loadReportCardData(input);
  assert.equal((cbc.subjects as any[])[0].grade_label, 'High');
  assert.equal((cbc.subjects as any[])[0].points, 8);
  assert.equal((secondary.subjects as any[])[0].points, 12);
  assert.equal((cbc.grading_policy as any).reporting_mode, 'competency');
  assert.equal((secondary.grading_policy as any).reporting_mode, 'traditional');
});

test('report generation fails truthfully when the class curriculum has no grading policy', async () => {
  await assert.rejects(reportRepository('CBC', { missing: true }).loadReportCardData({
    tenant_id: 'school-a', exam_series_id: 'exam', student_id: 'student',
  }), /Save a grading policy for the class curriculum/);
});

test('legacy selected 8-4-4 grade bands work when curriculum metadata was never saved', async () => {
  const data = await reportRepository('8-4-4', {
    gradingSystem: {
      id: 'kibabi-policy', name: '2026 Academic Year', curriculum_model: null, version: 1,
      rules: [
        { label: 'A', min: 80, max: 100, points: 12, remark: 'Very Good' },
        { label: 'E', min: 0, max: 79, points: 1, remark: 'Poor' },
      ],
    },
    preferredSystemId: 'kibabi-policy',
  }).loadReportCardData({ tenant_id: 'school-a', exam_series_id: 'exam', student_id: 'student' });

  assert.equal((data.grading_policy as any).reporting_mode, 'traditional');
  assert.equal((data.grading_policy as any).source_id, 'kibabi-policy');
});

test('an untagged saved 8-4-4 policy is selected over the exam preferred CBC policy', async () => {
  const data = await reportRepository('8-4-4', {
    preferredSystemId: 'cbc-policy',
    gradingSystems: [
      {
        id: 'cbc-policy', name: 'Kawino 2026', curriculum_model: null, version: 2,
        rules: [{ label: 'EE1', min: 90, max: 100, points: 8 }, { label: 'ME1', min: 0, max: 89, points: 6 }],
      },
      {
        id: 'legacy-844-policy', name: '8-4-4 Academic Year', curriculum_model: null, version: 1,
        rules: [{ label: 'A', min: 60, max: 100, points: 12 }, { label: 'E', min: 0, max: 59, points: 1 }],
      },
    ],
  }).loadReportCardData({ tenant_id: 'school-a', exam_series_id: 'exam', student_id: 'student' });

  assert.equal((data.subjects as any[])[0].points, 12);
  assert.equal((data.grading_policy as any).source_id, 'legacy-844-policy');
});

test('one grading policy uses independent saved bands for each selected class curriculum', async () => {
  const input = { tenant_id: 'school-a', exam_series_id: 'exam', student_id: 'student' };
  const gradingSystem = {
    id: 'shared-policy', name: 'Shared school policy', curriculum_model: '8-4-4',
    curriculum_models: ['8-4-4', 'CBC'], version: 3,
    rules_by_curriculum: {
      '8-4-4': [{ label: 'A', min: 60, max: 100, points: 12 }, { label: 'E', min: 0, max: 59, points: 1 }],
      CBC: [{ label: 'ME1', min: 60, max: 100, points: 6 }, { label: 'BE1', min: 0, max: 59, points: 1 }],
    },
    rules: [
      { label: 'A', min: 60, max: 100, points: 12 },
      { label: 'E', min: 0, max: 59, points: 1 },
    ],
  };
  const legacy = await reportRepository('8-4-4', {
    preferredSystemId: 'shared-policy', gradingSystem,
  }).loadReportCardData(input);
  const competency = await reportRepository('CBC', {
    preferredSystemId: 'shared-policy', gradingSystem,
  }).loadReportCardData(input);

  assert.equal((legacy.subjects as any[])[0].grade_label, 'A');
  assert.equal((competency.subjects as any[])[0].grade_label, 'ME1');
  assert.equal((competency.subjects as any[])[0].points, 6);
  assert.equal((legacy.grading_policy as any).source_id, 'shared-policy');
  assert.equal((competency.grading_policy as any).source_id, 'shared-policy');
  assert.equal((legacy.grading_policy as any).reporting_mode, 'traditional');
  assert.equal((competency.grading_policy as any).reporting_mode, 'competency');
});

test('a CBC grade scale selected for an 8-4-4 exam is rejected with a curriculum mismatch', async () => {
  await assert.rejects(reportRepository('8-4-4', {
    gradingSystem: {
      id: 'kawino-cbc-policy', name: 'Kawino 2026', curriculum_model: null, version: 1,
      rules: [
        { label: 'EE1', min: 90, max: 100, points: 8 },
        { label: 'ME1', min: 0, max: 89, points: 6 },
      ],
    },
    preferredSystemId: 'kawino-cbc-policy',
  }).loadReportCardData({ tenant_id: 'school-a', exam_series_id: 'exam', student_id: 'student' }), /CBC grading bands.*8-4-4/i);
});

test('mark validation passes the class and assessment maximum to curriculum grading', async () => {
  const scope = { exam_series_id: 'exam', assessment_id: 'assessment', academic_term_id: 'term', class_section_id: 'class', subject_id: 'math' };
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'school-a', user_id: 'teacher', role: 'teacher', permissions: ['exams:enter-marks'] }) } as never,
    {
      findTeacherAssignment: async () => ({ id: 'assignment' }),
      findSeriesState: async () => ({ status: 'draft', locked_at: null, published_at: null }),
      findOpenMarkEntryWindow: async () => ({ id: 'window', status: 'open' }),
      findAssessmentScope: async () => ({ ...scope, max_score: 50 }),
      findGradeBoundaryForScore: async (input: Record<string, unknown>) => {
        assert.deepEqual(input, { tenant_id: 'school-a', exam_series_id: 'exam', class_section_id: 'class', score: 32.5, max_score: 50 });
        return { configured_count: 2, match_count: 1, boundary: { label: 'ME1' } };
      },
    } as never,
  );
  const validated = await (service as any).validateMarkEntry({ ...scope, student_id: 'learner', score: 32.5 }, 'school-a', 'teacher');
  assert.equal(validated.grade_boundary.label, 'ME1');
});


test('independent curriculum bands are validated and persisted without mixing the compatibility rules', async () => {
  const writes: any[] = [];
  const service = new AcademicsService(
    { getStore: () => ({ tenant_id: 'school-a', user_id: 'actor', role: 'deputy_principal' }) } as never,
    { executeSql: async () => ({ rows: [] }),
      createGradingSystem: async (_tenant: string, _name: string, _description: string, options: any) => {
        writes.push(options); return { id: 'policy', ...options };
      }, appendAuditLog: async () => {},
    } as never, {} as never, { publish: async () => {} } as never, {} as never,
  );
  const independent = {
    '8-4-4': [{ label: 'A', min: 60, max: 100, points: 12 }, { label: 'E', min: 0, max: 59, points: 1 }],
    CBC: [{ label: 'ME1', min: 60, max: 100, points: 6 }, { label: 'BE1', min: 0, max: 59, points: 1 }],
  };
  await service.createGradingSystem({ name: 'Independent', curriculum_models: ['844', 'CBC'],
    rules, rules_by_curriculum: independent } as any);
  assert.deepEqual(writes[0].rules_by_curriculum, independent);
  assert.deepEqual(writes[0].rules, independent['8-4-4']);
  await assert.rejects(service.createGradingSystem({ name: 'Invalid', curriculum_models: ['844', 'CBC'],
    rules_by_curriculum: { '8-4-4': independent['8-4-4'] } } as any), /CBC.*grade bands/i);
  await assert.rejects(service.createGradingSystem({ name: 'Gap', curriculum_models: ['CBC'],
    rules_by_curriculum: { CBC: [{ label: 'ME1', min: 1, max: 100 }] } } as any), /gaps or overlaps/i);
  assert.equal(writes.length, 1);
});


test('explicit single-curriculum policies preserve school-defined labels regardless of their grade family', async () => {
  const data = await reportRepository('CBC', { gradingSystem: { id: 'custom-cbc', name: 'School CBC',
    curriculum_model: 'CBC', curriculum_models: ['CBC'], version: 1,
    rules: [{ label: 'A', min: 0, max: 100, points: 8, remark: 'School CBC label' }],
  }}).loadReportCardData({ tenant_id: 'school-a', exam_series_id: 'exam', student_id: 'student' });
  assert.equal((data.subjects as any[])[0].grade_label, 'A');
  assert.equal((data.grading_policy as any).reporting_mode, 'competency');
});


test('legacy shared competency bands cannot silently grade an 8-4-4 class', async () => {
  await assert.rejects(reportRepository('8-4-4', { preferredSystemId: 'legacy-shared', gradingSystem: {
    id: 'legacy-shared', name: 'Shared legacy', curriculum_model: '8-4-4', curriculum_models: ['8-4-4','CBC'], version: 1,
    rules: [{ label: 'EE1', min: 0, max: 100, points: 8 }],
  }}).loadReportCardData({tenant_id:'school-a',exam_series_id:'exam',student_id:'student'}), /CBC grading bands.*8-4-4/i);
});
