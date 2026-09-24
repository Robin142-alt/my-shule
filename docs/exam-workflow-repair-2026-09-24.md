# Exam workflow and report generation repair

The Dean submission denominator now counts distinct active students enrolled in that subject and class, within the authenticated school. The assessment maximum score remains a separate API field; it no longer appears beneath the number of submitted students. Moderation, locking and report approval refresh the shared workflow query.

The workflow repository now returns expected, ready, missing and unresolved learner-subject totals from the same readiness SQL used by report generation. Previously the service consumed fields the repository never selected, converted them to zero, and sent fully locked exams back to mark entry. Genuine missing marks still block generation.

Read-only production diagnosis confirmed that Kibabi's Term 3 MOCK has 67 locked learner-subject results for 11 learners. No marks or approvals were lost. Worker logs for the failed batch show PostgreSQL error `42703: record "new" has no field "exam_series_id"` while saving `report_card_artifacts`.

The installed `exam_setup_parent_guard` also exists on three indirect child tables left by an earlier installation: report artifacts, mark versions and mark import items. Its function only handled tables with a direct exam ID. The repaired function resolves the exam through the school-owned report card or mark and keeps the parent lock and foreign-school rejection. Schema bootstrap now consistently installs all three guards on new and existing databases.

The report-generation integration suite previously extracted table definitions without installing these guards. It now runs the integrity schema and explicitly recreates the legacy artifact attachment. The new regression reproduced the exact production error before the fix. Tests exercise real PDF generation, atomic snapshot/artifact/audit/outbox persistence, foreign-school and missing-parent rejection, mark-history/import links, and workflow readiness using the actual repository query.

Release requires the API and report workers to run the repaired backend, plus the updated frontend. The API schema bootstrap replaces the trigger function; no school records need rewriting. Retry the failed Term 3 MOCK generation task after the release, then use the existing Exams Manager handoff, Dean approval and Principal release workflow. Do not unlock or re-enter the already locked marks to work around this failure.

This change has not been deployed, and the production diagnostic performed reads only.

Validation: backend build, frontend TypeScript check and targeted ESLint passed; 176 exam/report unit tests, 44 PostgreSQL integration tests across generation/readiness/setup integrity/report scope, and 33 frontend workflow tests passed. Generation checks include all 11 cards and a 100-learner batch with real PDF bytes. The baseline regression failed with the same `42703` error before the trigger repair.
