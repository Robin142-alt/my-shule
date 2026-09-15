Exam setup now reopens the saved term, type, subjects and classes. Saving reconciles unchecked selections, preserves custom papers and protects entered results against scope, grading, term and maximum-score changes.

An authorized Exams Manager can permanently delete an exam in any state, including locked, published and archived exams with saved marks. The dialog shows the saved-record counts and requires typing the exact exam name. `DELETE /admin-command/exams-manager/exam-setup/:id` requires a `confirmation_name` body field, an exam-management role and exam write permission. The server locks the school-owned exam and compares its current name exactly before deleting anything; missing, case-mismatched or stale names are rejected.

Deletion removes marks, correction versions, this exam's import items, all report-card revisions and artifact metadata, result snapshots, generation batches, timetable and attendance, linked cases and interventions, and exam configuration. Import batches shared with another exam retain the other exam's items. School-level grading configuration, staff signatures and unrelated exams remain separate. Audit records, operational history and immutable export manifests are retained as evidence; removed report cards are no longer available through their download or verification routes.

Creation, configuration and deletion use a school-scoped transaction. Audit records, operational events and notifications commit with the mutation. Database child-write guards serialize concurrent submissions against the exam row, reject references to a deleted exam and prevent removed subjects/classes receiving stale marks.

The additive schema bootstrap adds `exam_series.exam_type` and child-write triggers without changing historical records. Guards also protect late report artifacts, mark corrections and import items from recreating orphan records after deletion. Concurrent marks committed before the deletion obtains its exam lock are included in the confirmed deletion. Existing custom assessment names, weights and maxima are preserved when saving unrelated configuration.

Verification:

- PostgreSQL workflow tests: `apps/api/test/exam-setup-integrity.integration-spec.ts`.
- Teacher mark-entry regression: `apps/api/test/teacher-exam-visibility.integration-spec.ts`.
- UI interaction tests: `apps/web/tests/design/exam-setup-edit-delete.test.tsx`.
- Exam setup and teacher workflow database tests run in a disposable local database in CI.
