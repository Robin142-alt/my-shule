import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BLUEPRINT_CURRICULA,
  buildCurriculumPolicy,
  evaluateCurriculumSetup,
} from './curriculum-policy';

test('BLUEPRINT_CURRICULA covers Kenyan and international curriculum options', () => {
  assert.deepEqual(BLUEPRINT_CURRICULA, [
    'cbc',
    'cbe',
    '8_4_4',
    'cambridge',
    'igcse',
    'international',
  ]);
});

test('buildCurriculumPolicy creates a CBC primary school hierarchy', () => {
  const policy = buildCurriculumPolicy({
    tenantId: 'tenant-academic',
    curriculum: 'cbc',
    institutionCategory: 'primary_school',
    campuses: ['main'],
    academicYear: '2026',
  });

  assert.equal(policy.tenant_id, 'tenant-academic');
  assert.equal(policy.assessment_model, 'competency_based_assessment');
  assert.equal(policy.learning_unit_label, 'learning_area');
  assert.deepEqual(policy.terms, ['term_1', 'term_2', 'term_3']);
  assert.deepEqual(policy.levels.map((level) => level.code), [
    'grade_1',
    'grade_2',
    'grade_3',
    'grade_4',
    'grade_5',
    'grade_6',
  ]);
});

test('buildCurriculumPolicy creates Cambridge international stages', () => {
  const policy = buildCurriculumPolicy({
    tenantId: 'tenant-academic',
    curriculum: 'cambridge',
    institutionCategory: 'international_school',
    campuses: ['main', 'north'],
    academicYear: '2026-2027',
  });

  assert.equal(policy.assessment_model, 'external_exam_board');
  assert.equal(policy.learning_unit_label, 'subject');
  assert.equal(policy.campuses.length, 2);
  assert.deepEqual(policy.levels.map((level) => level.code), [
    'primary',
    'lower_secondary',
    'igcse',
    'as_a_level',
  ]);
});

test('evaluateCurriculumSetup flags missing structure before go-live', () => {
  const policy = buildCurriculumPolicy({
    tenantId: 'tenant-academic',
    curriculum: '8_4_4',
    institutionCategory: 'secondary_high_school',
    campuses: ['main'],
    academicYear: '2026',
  });

  const result = evaluateCurriculumSetup(policy, {
    classCount: 2,
    streamCount: 0,
    subjectCount: 6,
    teacherAllocationCount: 0,
    promotionRulesConfigured: false,
  });

  assert.equal(result.status, 'fail');
  assert.deepEqual(result.required_actions, [
    'Configure at least 4 academic levels for 8_4_4.',
    'Configure at least one stream per active school level.',
    'Configure teacher allocations before go-live.',
    'Configure promotion rules for the curriculum.',
  ]);
});

test('evaluateCurriculumSetup passes complete CBE junior school setup', () => {
  const policy = buildCurriculumPolicy({
    tenantId: 'tenant-academic',
    curriculum: 'cbe',
    institutionCategory: 'junior_school',
    campuses: ['main'],
    academicYear: '2026',
  });

  const result = evaluateCurriculumSetup(policy, {
    classCount: 3,
    streamCount: 3,
    subjectCount: 12,
    teacherAllocationCount: 12,
    promotionRulesConfigured: true,
  });

  assert.equal(result.status, 'pass');
  assert.deepEqual(result.required_actions, []);
});
