import assert from 'node:assert/strict';
import test from 'node:test';
import { hydrateReportComparison, subjectComparison, termComparison, REPORT_COMPARISON_SQL } from './report-card-comparison';
import { ReportCardTemplateService } from './report-card-template.service';

function payload() {
  return new ReportCardTemplateService().buildPayload({
    exam_series: { id: 'current', name: 'End Term 3', academic_term_name: 'Term 3' },
    subjects: [{ subject_id: 'math', subject_name: 'Mathematics', score: 78, max_score: 100 }],
    analytics: { comparison_exams: [{ exam_series_id: 'previous', label: 'Mid Term 3' }, { exam_series_id: 'current', label: 'End Term 3' }],
      subject_history: [
        { exam_series_id: 'older', label: 'CAT 1', subject_id: 'math', subject_name: 'Mathematics', percentage: 20 },
        { exam_series_id: 'previous', label: 'Mid Term 3', subject_id: 'math', subject_name: 'Mathematics', percentage: 62 },
        { exam_series_id: 'current', label: 'End Term 3', subject_id: 'math', subject_name: 'Mathematics', percentage: 99 },
      ] },
  }, '2026-10-08T09:00:00Z');
}

test('subject graph uses exactly the predecessor and authoritative current marks with actual exam names', () => {
  const report = payload();
  const before = structuredClone(report);
  const graph = subjectComparison(report);
  assert.deepEqual(graph.exams.map(exam => exam.label), ['Mid Term 3', 'End Term 3']);
  assert.deepEqual(graph.subjects[0].percentages, [62, 78]);
  assert.deepEqual(report, before);
});

test('first exam has only current points; missing prior subject marks are not zero', () => {
  const report = payload();
  report.analytics.comparison_exams = [];
  report.analytics.subject_history = [];
  assert.deepEqual(subjectComparison(report).subjects[0].percentages, [78]);
  report.analytics.comparison_exams = [{ exam_series_id: 'previous', label: 'Mid Term 3' }];
  assert.deepEqual(subjectComparison(report).subjects[0].percentages, [null, 78]);
});

test('term trend holds three exams while subject performance holds two, with authoritative current totals', () => {
  const report = payload();
  report.analytics.term_history = [
    { exam_series_id: 'current', label: 'End Term 3', percentage: 99 },
    { exam_series_id: 'previous', label: 'Mid Term 3', percentage: 62 },
    { exam_series_id: 'older', label: 'CAT 1', percentage: 55 },
    { exam_series_id: 'oldest', label: 'Last Term', percentage: 20 },
  ];
  assert.deepEqual(termComparison(report).map(exam => [exam.label, exam.percentage]), [['CAT 1', 55], ['Mid Term 3', 62], ['End Term 3', 78]]);
  assert.equal(subjectComparison(report).exams.length, 2);
  report.analytics.term_history = [];
  assert.deepEqual(termComparison(report).map(exam => [exam.label, exam.percentage]), [['End Term 3', 78]]);
});

test('comparison query anchors to this exam, school and learner, not mark edit timestamps', () => {
  assert.match(REPORT_COMPARISON_SQL, /series\.id = \$2::uuid/);
  assert.match(REPORT_COMPARISON_SQL, /mark\.student_id = \$3::uuid/);
  assert.match(REPORT_COMPARISON_SQL, /series\.tenant_id = \$1/);
  assert.match(REPORT_COMPARISON_SQL, /LIMIT 1/);
  assert.match(REPORT_COMPARISON_SQL, /series\.name AS label/);
  assert.doesNotMatch(REPORT_COMPARISON_SQL, /updated_at|LIMIT 3|COALESCE\(term\.name/);
});

test('legacy artifacts hydrate comparison metadata without changing approved academic data', async () => {
  const report = payload();
  delete report.analytics.comparison_exams;
  const before = structuredClone(report);
  let reads = 0;
  const hydrated = await hydrateReportComparison(report, async () => {
    reads++;
    return [{ exam_series_id: 'previous', label: 'Mid Term 3', subject_id: 'math', subject_name: 'Mathematics', percentage: 62 }];
  });
  assert.deepEqual(subjectComparison(hydrated).subjects[0].percentages, [62, 78]);
  assert.deepEqual(report, before);
  assert.deepEqual(hydrated.subjects, report.subjects);
  assert.deepEqual(hydrated.totals, report.totals);
  assert.equal(await hydrateReportComparison(hydrated, async () => { reads++; return []; }), hydrated);
  assert.equal(reads, 1);
});
