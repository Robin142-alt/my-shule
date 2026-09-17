import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseReportCardScope,
  buildScopeSqlClause,
  REPORT_CARD_TRANSITION_SOURCE_STATUSES,
  REPORT_CARD_TRANSITION_TARGET_STATUS,
  type ReportCardScope,
} from './report-card-scope';

// ── parseReportCardScope ──

test('parseReportCardScope defaults to school scope when no narrowing params given', () => {
  const scope = parseReportCardScope('tenant-1', {});
  assert.deepStrictEqual(scope, {
    scopeType: 'school',
    schoolId: 'tenant-1',
    examSeriesId: undefined,
  });
});

test('parseReportCardScope resolves class scope from class_section_id', () => {
  const scope = parseReportCardScope('tenant-1', {
    class_section_id: 'cls-8a',
    exam_series_id: 'series-mid',
  });
  assert.equal(scope.scopeType, 'class');
  assert.equal(scope.classSectionId, 'cls-8a');
  assert.equal(scope.examSeriesId, 'series-mid');
  assert.equal(scope.schoolId, 'tenant-1');
});

test('parseReportCardScope resolves stream scope from stream_id + class_section_id', () => {
  const scope = parseReportCardScope('tenant-1', {
    class_section_id: 'cls-8a',
    stream_id: 'stream-blue',
  });
  assert.equal(scope.scopeType, 'stream');
  assert.equal(scope.streamId, 'stream-blue');
  assert.equal(scope.classSectionId, 'cls-8a');
});

test('parseReportCardScope resolves students scope from student_ids array', () => {
  const scope = parseReportCardScope('tenant-1', {
    student_ids: ['stu-1', 'stu-2', 'stu-1'],
  });
  assert.equal(scope.scopeType, 'students');
  assert.deepStrictEqual(scope.studentIds, ['stu-1', 'stu-2']);
});

test('parseReportCardScope resolves students scope from comma-separated string', () => {
  const scope = parseReportCardScope('tenant-1', {
    student_ids: 'stu-a, stu-b, stu-c' as any,
  });
  assert.equal(scope.scopeType, 'students');
  assert.deepStrictEqual(scope.studentIds, ['stu-a', 'stu-b', 'stu-c']);
});

test('parseReportCardScope students scope takes priority over class and stream', () => {
  const scope = parseReportCardScope('tenant-1', {
    class_section_id: 'cls-1',
    stream_id: 'strm-1',
    student_ids: ['stu-1'],
  });
  assert.equal(scope.scopeType, 'students');
  assert.equal(scope.classSectionId, 'cls-1');
  assert.equal(scope.streamId, 'strm-1');
});

test('parseReportCardScope trims stream_id for scope resolution', () => {
  const scope = parseReportCardScope('tenant-1', {
    class_section_id: 'cls-8a',
    stream_id: '  stream-blue  ',
  });
  assert.equal(scope.scopeType, 'stream');
  assert.equal(scope.streamId, 'stream-blue');
});

test('parseReportCardScope ignores empty string scope params', () => {
  const scope = parseReportCardScope('tenant-1', {
    class_section_id: '',
    stream_id: '   ',
    student_ids: [],
  });
  assert.equal(scope.scopeType, 'school');
});

// ── buildScopeSqlClause ──

test('buildScopeSqlClause builds tenant-only WHERE for school scope', () => {
  const scope: ReportCardScope = { scopeType: 'school', schoolId: 'tenant-1' };
  const clause = buildScopeSqlClause(scope);
  assert.match(clause.where, /card\.tenant_id = \$1/);
  assert.match(clause.where, /card\.is_current = TRUE/);
  assert.deepStrictEqual(clause.params, ['tenant-1']);
  assert.equal(clause.joins.trim(), '');
});

test('buildScopeSqlClause adds exam_series_id filter when present', () => {
  const scope: ReportCardScope = { scopeType: 'school', schoolId: 'tenant-1', examSeriesId: 'series-1' };
  const clause = buildScopeSqlClause(scope);
  assert.match(clause.where, /card\.exam_series_id = \$2::uuid/);
  assert.deepStrictEqual(clause.params, ['tenant-1', 'series-1']);
});

test('buildScopeSqlClause joins student_class_assignments for class scope', () => {
  const scope: ReportCardScope = { scopeType: 'class', schoolId: 'tenant-1', classSectionId: 'cls-8a' };
  const clause = buildScopeSqlClause(scope);
  assert.match(clause.joins, /student_class_assignments/);
  assert.match(clause.where, /sca\.class_section_id = \$2::text/);
  assert.deepStrictEqual(clause.params, ['tenant-1', 'cls-8a']);
});

test('buildScopeSqlClause joins student_class_assignments and adds stream filter for stream scope', () => {
  const scope: ReportCardScope = {
    scopeType: 'stream',
    schoolId: 'tenant-1',
    classSectionId: 'cls-8a',
    streamId: 'strm-blue',
  };
  const clause = buildScopeSqlClause(scope);
  assert.match(clause.joins, /student_class_assignments/);
  assert.match(clause.where, /sca\.class_section_id = \$2::text/);
  assert.match(clause.where, /sca\.stream_id = \$3::text/);
  assert.deepStrictEqual(clause.params, ['tenant-1', 'cls-8a', 'strm-blue']);
});

test('buildScopeSqlClause uses ANY for students scope', () => {
  const scope: ReportCardScope = {
    scopeType: 'students',
    schoolId: 'tenant-1',
    studentIds: ['stu-1', 'stu-2'],
  };
  const clause = buildScopeSqlClause(scope);
  assert.match(clause.where, /card\.student_id = ANY\(\$2::uuid\[\]\)/);
  assert.doesNotMatch(clause.joins, /student_class_assignments/);
  assert.deepStrictEqual(clause.params, ['tenant-1', ['stu-1', 'stu-2']]);
});

test('buildScopeSqlClause always includes is_current = TRUE', () => {
  const scopes: ReportCardScope[] = [
    { scopeType: 'school', schoolId: 't' },
    { scopeType: 'class', schoolId: 't', classSectionId: 'c' },
    { scopeType: 'stream', schoolId: 't', classSectionId: 'c', streamId: 's' },
    { scopeType: 'students', schoolId: 't', studentIds: ['x'] },
  ];
  for (const scope of scopes) {
    const clause = buildScopeSqlClause(scope);
    assert.match(clause.where, /card\.is_current = TRUE/, `Missing is_current for ${scope.scopeType}`);
  }
});

test('buildScopeSqlClause paramOffset tracks the next available placeholder index', () => {
  const scope: ReportCardScope = {
    scopeType: 'stream',
    schoolId: 'tenant-1',
    examSeriesId: 'series-1',
    classSectionId: 'cls-8a',
    streamId: 'strm-blue',
  };
  const clause = buildScopeSqlClause(scope);
  assert.equal(clause.paramOffset, 5);
  assert.equal(clause.params.length, 4);
});

// ── Transition maps ──

test('transition source statuses cover all valid actions', () => {
  const actions = ['submit', 'approve', 'recall', 'publish', 'unpublish'];
  for (const action of actions) {
    assert.ok(
      Array.isArray(REPORT_CARD_TRANSITION_SOURCE_STATUSES[action]),
      `Missing source statuses for action: ${action}`,
    );
    assert.ok(
      REPORT_CARD_TRANSITION_SOURCE_STATUSES[action].length > 0,
      `Empty source statuses for action: ${action}`,
    );
  }
});

test('transition target statuses map to expected workflow states', () => {
  assert.equal(REPORT_CARD_TRANSITION_TARGET_STATUS.submit, 'under_review');
  assert.equal(REPORT_CARD_TRANSITION_TARGET_STATUS.approve, 'approved');
  assert.equal(REPORT_CARD_TRANSITION_TARGET_STATUS.recall, 'draft_generated');
  assert.equal(REPORT_CARD_TRANSITION_TARGET_STATUS.publish, 'published');
  assert.equal(REPORT_CARD_TRANSITION_TARGET_STATUS.unpublish, 'withdrawn');
});

test('submit can transition from draft, draft_generated, and regeneration_required', () => {
  assert.deepStrictEqual(
    REPORT_CARD_TRANSITION_SOURCE_STATUSES.submit.sort(),
    ['draft', 'draft_generated', 'regeneration_required'].sort(),
  );
});

test('approve and recall only apply to under_review cards', () => {
  assert.deepStrictEqual(REPORT_CARD_TRANSITION_SOURCE_STATUSES.approve, ['under_review']);
  assert.deepStrictEqual(REPORT_CARD_TRANSITION_SOURCE_STATUSES.recall, ['under_review']);
});

test('publish only applies to approved cards', () => {
  assert.deepStrictEqual(REPORT_CARD_TRANSITION_SOURCE_STATUSES.publish, ['approved']);
});

test('unpublish only applies to published cards', () => {
  assert.deepStrictEqual(REPORT_CARD_TRANSITION_SOURCE_STATUSES.unpublish, ['published']);
});
