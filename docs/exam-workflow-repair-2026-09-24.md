# Exam workflow and report generation repair

The Dean submission denominator now counts distinct active students enrolled in that subject and class, within the authenticated school. The assessment maximum score remains a separate API field; it no longer appears beneath the number of submitted students. Moderation, locking and report approval refresh the shared workflow query.

The workflow repository now returns expected, ready, missing and unresolved learner-subject totals from the same readiness SQL used by report generation. Previously the service consumed fields the repository never selected, converted them to zero, and sent fully locked exams back to mark entry. Genuine missing marks still block generation.

Read-only production diagnosis confirmed that Kibabi's Term 3 MOCK has 67 locked learner-subject results for 11 learners. No marks or approvals were lost. Worker logs for the failed batch show PostgreSQL error `42703: record "new" has no field "exam_series_id"` while saving `report_card_artifacts`.

The installed `exam_setup_parent_guard` also exists on three indirect child tables left by an earlier installation: report artifacts, mark versions and mark import items. Its function only handled tables with a direct exam ID. The repaired function resolves the exam through the school-owned report card or mark and keeps the parent lock and foreign-school rejection. Schema bootstrap now consistently installs all three guards on new and existing databases.

The report-generation integration suite previously extracted table definitions without installing these guards. It now runs the integrity schema and explicitly recreates the legacy artifact attachment. The new regression reproduced the exact production error before the fix. Tests exercise real PDF generation, atomic snapshot/artifact/audit/outbox persistence, foreign-school and missing-parent rejection, mark-history/import links, and workflow readiness using the actual repository query.

The API schema bootstrap replaces the trigger function; no school records need rewriting. Retry the failed Term 3 MOCK generation task, then use the existing Exams Manager handoff, Dean approval and Principal release workflow. Do not unlock or re-enter the already locked marks to work around this failure.

Released to `main` in commit `13515df73a63aee19248f51995ba9d1dc48fffd6` on 24 September 2026. All production deployments report success for that commit:

- Railway API: `92abbca2-f087-4129-8fa9-eb939517a9dc`.
- Interactive report worker: `ae7cfc94-490b-40a9-8dd3-8d5b2e9e5e51`.
- Bulk report worker: `147a058d-ebb2-4320-b134-b0bfc8bb8a30`.
- Vercel: `dpl_9fzXJ15KVduhQPL9F3MMDs8qeupL`, serving both `myshule.online` and `www.myshule.online`.

Post-release verification returned HTTP 200 for API readiness and the public website, and HTTP 401 for unauthenticated report-job access. Both workers started successfully with PostgreSQL and Redis connections. The production trigger definition contains the repaired indirect parent lookups. Read-only school-scoped queries confirm that Term 3 MOCK still has 67/67 final marks, 11 learners and no missing marks. Generation source data loads successfully. No production report generation, review, approval or publication was performed during verification; the failed batch still needs retry through the normal Exams Manager workflow.

[CI/CD](https://github.com/Robin142-alt/my-shule/actions/runs/36007858681) completed successfully, including quality, build/unit tests, report generation and recovery, PostgreSQL integration and container build. The separate security scan also passed. Production diagnostics performed reads only.

Validation: backend build, frontend TypeScript check and targeted ESLint passed; 176 exam/report unit tests, 44 PostgreSQL integration tests across generation/readiness/setup integrity/report scope, and 33 frontend workflow tests passed. Generation checks include all 11 cards and a 100-learner batch with real PDF bytes. The baseline regression failed with the same `42703` error before the trigger repair.
