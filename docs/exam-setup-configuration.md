Exam setup now reopens the saved term, type, subjects and classes. Saving reconciles unchecked selections, preserves custom papers and protects entered results against scope, grading, term and maximum-score changes.

The exams manager can delete an accidentally created exam before results are entered. Deletion checks all saved marks (including drafts, zero and absence), reports and report-generation jobs, attendance, student cases and interventions. Published and archived exams remain protected. The confirmation explains that the exam, papers, windows and timetable will be removed.

Creation, configuration and deletion use a school-scoped transaction. Audit records, operational events and notifications commit with the mutation. Database child-write guards serialize concurrent submissions against the exam row, reject references to a deleted exam and prevent removed subjects/classes receiving stale marks.

The additive schema bootstrap adds `exam_series.exam_type` and child-write triggers without changing historical records. Existing custom assessment names, weights and maxima are preserved when saving unrelated configuration.

Verification:

- PostgreSQL workflow tests: `apps/api/test/exam-setup-integrity.integration-spec.ts`.
- Teacher mark-entry regression: `apps/api/test/teacher-exam-visibility.integration-spec.ts`.
- UI interaction tests: `apps/web/tests/design/exam-setup-edit-delete.test.tsx`.
- Exam setup and teacher workflow database tests run in a disposable local database in CI.
