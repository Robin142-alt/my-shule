# Class-specific examination backend workstream

Status: implementation complete for the backend workstream; final consolidated regression verification is pending. No production database touched. Do not treat this note as deployment approval.

Contract: existing exam-setup create/configure accepts class_subjects [{class_section_id,subject_ids,stream_subjects?:[{stream_id,subject_ids}]}]. Configure requires configuration_version, and stale saves reject with 409. Options provide classes with grade_level, stream, subject_ids, streams plus subject_offerings with term and stream scope. Reads return configuration_version, class_subjects and requires_subject_review.

Implemented so far: normalized class defaults/stream exceptions; exact windows rather than Cartesian product; curriculum offering validation; transactional saves and record protection; version checks; existing window status preservation; additive configuration columns; legacy review flag and evidence-only suggested mappings; downstream stream eligibility in marks, teacher progress, report readiness, results and analytics.

Database changes are additive runtime schema changes in exam-setup-integrity-schema.ts: exam_series.configuration_version, exam_series.class_subjects, exam_mark_entry_windows.stream_scope, with existing integrity triggers extended. Existing marks are not deleted or reassigned. Historical configurations without confirmed class mapping require explicit review. The migration/bootstrap must run before the new frontend is used; its idempotency is covered by the exam setup integration suite.

Earlier evidence: 3 class-exam-configuration node tests passed after initially failing. The parent reports a later 56-test backend batch passed 55, with the sole permission assertion subsequently fixed. Those results precede the temporal refinements below and are not evidence for the final source state.

Final temporal audit (2026-10-28):
- Shared examMembershipScopeSql checks the specific joined placement against the exam year/dates and stream override, preventing historical Blue placement from authorizing or labeling current Red placement. Used by teacher ownership, progress, report readiness, mark writes/reads and analytics.
- Shared examEnrollmentScopeSql checks term, academic year, effective dates. Withdrawn enrollments remain excluded. Saved historical marks remain preserved in result and analytics evidence.
- Single-mark eligibility now requires the actual exam mapping and the same enrollment/placement criteria.
- Exam readiness shares report readiness evidence instead of subtracting unrelated saved marks. Window saved/submitted counters exclude learners outside the eligible roster.
- Submitted mark sheets remain visible if a newly eligible learner still lacks submitted evidence.

Added seven meaningful regressions across these PostgreSQL files:
- apps/api/test/teacher-mark-progress.integration-spec.ts: withdrawn/expired/future/wrong-year electives (including window counters), historical stream and teacher ownership, newly eligible learner on submitted sheet.
- apps/api/test/report-card-readiness.integration-spec.ts: term/year/date/withdrawn eligibility with direct mark eligibility and missing-count checks; historical stream filtering after transfer.
- apps/api/test/academic-intelligence.integration-spec.ts: invalid enrollment denominator exclusion while saved history survives; exam-time stream attribution after later transfer.

The focused run .codex-exam-temporal-red.log started a disposable PostgreSQL cluster, but was stopped before Jest results because simultaneous compilers exhausted available memory. It is neither a passing nor a failing regression result. Final validation is coordinated centrally by the parent: the above three suites plus teacher-exam-visibility.integration-spec.ts and exam-setup-integrity.integration-spec.ts; API TypeScript and unit checks follow serially. The exams.test.ts repository-contract assertion was updated for mandatory exam_series_id. No production connection or deployment was attempted.

Files changed in this final audit: class-exam-configuration.ts, teacher-mark-scope.ts, teacher-mark-progress.ts, report-card-readiness.ts, exam-result-query.ts, analytics/analytics-query.ts, repositories/exams.repository.ts, exams.service.ts, class-teacher.service.ts; the three integration files, exams.test.ts and this record. Earlier setup/persistence/schema files remain part of the overall workstream.

Outstanding: collect final centralized test/typecheck results and repair any failures, confirm actual frontend contract/UI verification from the parent, then assess deployment readiness. Do not mark these verification tasks complete without results.

## Consolidated completion evidence

- Central PostgreSQL batch passed 145 tests across eight suites, including all seven temporal regressions (`.codex-library-exams-integration-final.log`). API build and 208 unit tests also passed before final small corrections.
- Final read-only audit found historical report headers/comments selecting a later active placement. Coordinator corrected these reads to use exam-date overlap and historical placement states; class-teacher appointment dates now use exam dates.
- Final report-generation rerun passed 19/19 tests (`.codex-report-generation-verified-2.log`), including the new transfer regression. The real 100-learner, seven-subject PDF benchmark completed in 37.602 seconds, with 100 stored artifacts and audit/event evidence.
- Earlier report runs timed out at Jest's unit-test default and then at the 100-report benchmark's old one-minute ceiling on this memory-constrained machine. Timeout budgets are now 60 seconds per functional integration test and 180 seconds for the real 100-report benchmark; assertions and data volumes remain unchanged. Failed runs remain recorded as failures.
- Class configuration browser passed at 320/390/768/1440px, independent 9/7/6 choices and 9/6/6 persisted edit with version 4 and navigation cancellation; no overflow or console errors. Final compiler/unit/Prisma and web checks are recorded in the consolidated delivery report.
- Latest consolidated status: `docs/myshule-library-exams-delivery-2026-10-28.md`.
