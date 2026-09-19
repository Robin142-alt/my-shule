import assert from 'node:assert/strict';
import test from 'node:test';
import { ForbiddenException } from '@nestjs/common';
import { parseReportCardScope, buildScopeSqlClause, REPORT_CARD_TRANSITION_SOURCE_STATUSES } from './report-card-scope';
import { ExamsService } from './exams.service';
for (const [query, type] of [[{}, 'school'], [{ class_section_id: 'grade8' }, 'class'],
  [{ class_section_id: 'grade8', stream_id: 'north' }, 'stream'], [{ student_ids: ['s1'] }, 'students']] as const) {
  test(`scope resolver represents ${type} within the authenticated school`, () => {
    const scope = parseReportCardScope('school-a', query as any);
    assert.equal(scope.scopeType, type);
    assert.equal(scope.schoolId, 'school-a');
    assert.match(buildScopeSqlClause(scope).where, /card.tenant_id = \$1/);
  });
}
test('selections intersect exam, class and stream instead of replacing them', () => {
  const scope = parseReportCardScope('school-a', { exam_series_id: 'exam', class_section_id: 'grade8', stream_id: 'north',
    student_ids: ['s1', 's1'], report_card_ids: ['card1'] });
  assert.deepEqual(scope.studentIds, ['s1']);
  const clause = buildScopeSqlClause(scope);
  assert.deepEqual(clause.params, ['school-a', 'exam', 'grade8', 'north', ['s1'], ['card1']]);
  assert.match(clause.where, /card.student_id::text = ANY/);
  assert.match(clause.where, /sca.class_section_id/);
  assert.match(clause.where, /sca.stream_id/);
  assert.match(clause.where, /card.id::text = ANY/);
});
test('empty or inconsistent selection never widens to whole school', () => {
  for (const query of [{ student_ids: [] }, { student_ids: '' }, { report_card_ids: [] }, { scope_type: 'students' },
    { scope_type: 'class' }, { scope_type: 'school', class_section_id: 'grade8' }, { stream_id: 'north' }, { student_ids: [23] }]) {
    assert.throws(() => parseReportCardScope('school-a', query as any));
  }
});
test('correction-required cards must be regenerated before submission', () => {
  assert.ok(!REPORT_CARD_TRANSITION_SOURCE_STATUSES.submit.includes('regeneration_required'));
});
for (const role of ['teacher', 'parent', 'student', 'head_of_department']) {
  test(`${role} cannot query or export the school-wide report-card desk`, () => {
    const service = new ExamsService({ getStore: () => ({ tenant_id: 'school-a', user_id: 'actor', role, permissions: ['exams:read'] }) } as never, {} as never);
    assert.throws(() => service.listScopedReportCards({}), ForbiddenException);
    assert.throws(() => service.getReportCardScopeSummary({ target_action: 'export' }), ForbiddenException);
  });
}
test('bulk submit enforces the individual role and capability and requires server confirmation', async () => {
  const store = { tenant_id: 'school-a', user_id: 'actor', role: 'dean_academics', permissions: ['exams:approve', 'exams:read'] };
  const service = new ExamsService({ getStore: () => store } as never, {} as never);
  await assert.rejects(() => service.bulkTransitionReportCards({ action: 'submit', preview_token: 'fake' }), ForbiddenException);
  store.role = 'exams_manager';
  store.permissions = ['exams:read'];
  await assert.rejects(() => service.bulkTransitionReportCards({ action: 'submit', preview_token: 'fake' }), ForbiddenException);
  store.permissions.push('exams:write');
  await assert.rejects(() => service.bulkTransitionReportCards({ action: 'submit' }), /Preview the affected/);
  await assert.rejects(() => service.bulkTransitionReportCards({ action: 'approve', preview_token: 'fake' }), ForbiddenException);
});
test('scope reads and exports enforce capability even for a school desk role', () => {
  const service = new ExamsService({ getStore: () => ({ tenant_id: 'school-a', user_id: 'actor', role: 'exams_manager', permissions: [] }) } as never, {} as never);
  assert.throws(() => service.getReportCardScopeSummary({ target_action: 'export' }), ForbiddenException);
});
