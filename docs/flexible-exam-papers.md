# Flexible examination papers

The existing teacher markbook now includes an optional **Papers and maximum marks** panel. Teachers retain the same roster, draft, submission, moderation and publishing workflows. Exams managers can use the same workspace through assisted marks entry. No additional configuration is required for an existing one-paper examination.

## Calculation contract

- Paper names and maxima belong to a school, examination, class and subject. Editing a legacy shared paper creates a class-specific configuration; other classes retain their existing paper and marks.
- By default, a subject percentage is `100 × sum(obtained marks) / sum(maximum marks)`. For example, 10/20 and 60/80 produce 70/100. Each paper displays its own percentage: 50% and 75%.
- Explicit paper weights instead calculate the weighted mean of paper percentages. Weights must be supplied for every paper or for none. Existing explicit weights are retained. Configured subject weights continue to apply to the overall mean.
- Optional categories replace direct paper entry with category entry. Their maxima must sum to the paper maximum. Category scores contribute once to the paper total; the total contributes once to the subject.
- Zero is a valid score. A missing required paper/category produces X; an irregularity produces Y. Y takes priority over X across the student's entire examination, including subjects outside a filtered analytics view. Exempt evidence is excluded from the denominator.
- X/Y overall results have no numerical overall mean, total or rank. Other valid subjects and papers remain visible. Resolving the evidence restores the configured numerical grade and ranking automatically.

## Permissions and persistence

`GET/POST /exams/markbooks/:windowId/papers` uses the existing exams module and `exams:enter-marks` guards. The service checks authentication, school ownership and the active teaching assignment. Authorized exams leadership with `exams:write` retains oversight. Leadership staff who have teaching assignments can configure their own assigned markbooks.

Configuration saves use an optimistic version and lock the examination and entry window. Marks entry uses the same examination lock, the configuration version, and exact database update timestamps. Bulk imports serialize with marks/configuration saves; import records, category evidence, audits and operation events commit together. Conflicting writes fail without silently overwriting a score.

Submitted marks must be returned through the existing moderation workflow before changing paper structure. Papers with marks cannot be deleted; maxima cannot be lowered below saved marks; category structures with saved evidence cannot be replaced. Locked or published examinations require the established reopening/correction process. Published report cards retain their controlled recall and regeneration workflow.

## Schema and release

The additive, repeatable migration runs through `ExamsSchemaService` using `FLEXIBLE_EXAM_PAPERS_SCHEMA` and `EXAM_RESULT_REFRESH_SCHEMA`. It adds class-specific paper uniqueness, category JSON evidence, configuration versions and nullable overall snapshot totals. It does not reseed schools or rewrite historical marks. Database triggers validate paper/class ownership and category totals, protect finalized configurations and refresh existing result snapshots after mark corrections.

Deploy the API/schema before the updated web client and use the same API version for report workers. Follow the existing database backup and staged release procedure. Verify one school with unequal paper maxima, category entry, X/Y correction, bulk rollback and report regeneration before broad rollout. Keep the additive schema on rollback; after schools have used categories, prefer a forward fix over restoring an older writer that does not understand category evidence.

Renderer version 8 includes normalized paper results in the existing report layout and a PDF paper-results supplement, preserving version 7's examination comparison charts. Source revision tracking invalidates stale artifacts. Older payloads that violate the X/Y overall rule cannot be served as current PDFs; regenerate them through the existing authorized workflow. Historical records are retained.

## Verification

Regression coverage is in:

- `apps/api/src/modules/exams/exam-result-policy.test.ts` and `flexible-exam-papers.test.ts`: weights, category totals, X/Y priority, valid zero, report percentages and filtered analytics.
- `apps/api/test/teacher-exam-visibility.integration-spec.ts`: isolated classes/schools, assignments, real concurrent saves, migration reruns, category import/rollback, event failure rollback and automatic grade restoration.
- `apps/api/test/report-card-readiness.integration-spec.ts`, `academic-intelligence.integration-spec.ts` and `report-card-generation.integration-spec.ts`: required papers, filtered analytics, persisted reports, PDF regeneration, publishing and existing generation performance checks.
- `apps/web/tests/design/teacher-exams-marks-workspace.test.tsx` and report/analytics tests: existing marks workflows, settings, category validation and report displays.
- `node apps/web/tests/design/teacher-marks-browser.mjs --papers`: browser checks at 320, 390, 768 and 1440 pixels. Run without the flag and with `--assisted` for existing teacher and exams-manager workflows.

All integration commands must use `apps/api/test/support/run-integration-with-local-postgres.ts`, which creates an isolated disposable database. QA PDFs and browser screenshots use synthetic local fixtures, never school data.

Local verification on 24 October 2026 passed 229 selected API unit tests and 85 frontend tests. The four database suites passed 83 tests; two added regressions subsequently passed with the affected suites (54 tests), and the final teacher/CSV suite passed all 36 tests. The final API changes were recompiled and their 157 affected unit tests passed. Teacher, assisted manager and flexible-paper browser checks passed at all four widths. Numeric, X and Y PDF pages were rendered and visually inspected. These are local verification results; production deployment has not been performed.
