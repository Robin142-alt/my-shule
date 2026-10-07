# Exam Analytics workspace

Exam Manager → **Exam Analytics** (`exam-analytics`) is a separate, Exams-module-gated workspace. Grade Processing retains its existing workflow. Hosted and public school routes use the same workspace.

## Data audit and interpretation

The implementation extends the existing Academic Intelligence read model; it does not introduce a second marks store, seeds, invented grades or predictions. The audit covered the persisted contracts and disposable PostgreSQL fixtures, not production student records.

| Evidence | Existing source and rule |
| --- | --- |
| Academic periods | `exam_series` → tenant-matched `academic_terms` → `academic_years` |
| Assessment results | `exam_marks` + `exam_assessments`; normalize by maximum score and assessment weight |
| Approved evidence | Locked/published marks with current approved/published report cards; absent/missing/invalid marks excluded from averages |
| Historical placement | `student_class_assignments` matched to the exam year, with stored streams and cohort IDs |
| Expected evidence | Mark-entry windows and effective student subject enrollments; missing results are not zeros |
| Grading | Report-card-linked policy/version, or historically effective policy; persisted boundaries determine grades and pass rates |
| Rankings | Enabled school ranking setting and traditional grading only; ties share position; student drill-down keeps peer positions; transfers suppress class-rank movement |
| Teaching relationships | Tenant-matched teacher/subject/class/stream/term allocations overlapping exam dates; these are associations, not teacher effectiveness scores |
| Authorization | Existing role/appointment scope, publication checks, module guard, request identity and PostgreSQL tenant boundary |

Learner averages give each available subject equal weight after assessment weighting. Population averages give each learner equal weight. Pass rates use graded learner-subject results. Period averages describe available evidence; they do not manufacture official weighted term grades. Partial coverage is visible. Matched progress requires the same learner, subject and grading policy in both exams; it does not establish equal exam difficulty.

## Library and navigation

The shared registry contains **93 analytics** across Performance, Trends, Comparisons, Subjects, Classes & Streams, Students, Rankings, Distributions and Deep Insights. Overview features four individual metrics, a trend and prioritized observations. The registry includes means/medians/grades, quartiles and dispersion, coverage, pass/failure, matched growth, all group comparisons and histories, subject/class/stream matrices, support priorities, period comparisons, momentum, learner profiles and histories, parent benchmarks, sustained/exceptional changes, consistency, rankings, movement matrices, score frequencies, outliers and transparent progress groups. It also exposes stored cohort progression, academic follow-up distributions and movement, recorded intervention summaries and outcomes, marking pipeline counts and report readiness. Intervention outcomes remain in their recorded scale and do not imply causation.

**Compare any two** supports learners, classes, streams, subjects, exams, terms and years. Parent-population benchmarks retain authorized school/class/stream averages while drilling into a child. Exact chart tables and further observations expand on demand. Search finds analytics by title or question. Filters and the selected analytic persist in the URL; a return action restores the preceding drill-down context. Mobile uses section selection, compact controls and record cards in place of wide tables.

Question-level scores are not recorded in the source. No academic target, causal difficulty claim or unsupported prediction is synthesized. Teacher allocation comparisons explicitly disclose their limits. Missing history and disabled rankings stay visible with explanations.

## Exports and printing

Every analytic definition supplies its own headers, values, context and methodology to both the UI and report model. Each card has Download and Print. Users can export one analytic, a complete view, a chosen collection or the whole library. Reports include all matching rows; UI pagination does not truncate exports.

`POST /exams/analytics/reports` accepts `section: library` with validated filters and selected analytic IDs. Authorization and evidence are recomputed; client totals and school identities are never accepted. Outputs are school-branded PDF, spreadsheet-safe UTF-8 CSV, and an escaped A4 print preview. Charts/matrices export as precise labelled evidence tables. Document number, school, actor, period, filters, comparison and history coverage travel with the report. PDF/CSV checksums have actor/tenant-bound report snapshots and the existing `exams.analytics_report.generated` event/audit path. CSV-only generation avoids PDF work for large data collections. Printing opens the preview's browser print dialog and never claims that a physical printer succeeded.

## Scale and freshness

- History defaults to 24 exam cycles, selectable up to 120 plus an explicit comparison. A separate tenant-scoped exam catalog keeps older years and empty/new exams selectable. Select an older anchor to move the bounded historical window.
- Only requested analytic tables are materialized and paginated to 25 rows. The catalog is metadata; figures use the entire authorized population.
- School-wide source reads may be reused for 30 seconds, keyed by tenant, actor, authenticated role and academic selection. Appointment-scoped reads and report requests bypass this cache. Every call still checks authorization. Exam SQL writes invalidate source snapshots. Manual Refresh changes the refresh key and forces fresh evidence.
- The read cache is bounded by six snapshots and 200,000 subject-result rows; larger windows bypass it. Computation reuse uses weak snapshot keys and at most three filter contexts. No cached response can cross actors or schools.
- PDF rendering yields between batches. Large CSV-only downloads avoid rendering large printable collections.

The local deterministic probe of 3,000 learners, eight subjects and six exams (144,000 learner-subject results) measured approximately **5.2 seconds cold calculation and 0.16 seconds for a subsequent view**, with a 622 KB JSON response before transport compression. This is a local calculation probe, not a production database/concurrency benchmark. Large first loads and very large PDF collections still require deployment-specific capacity checks.

## Verification

Focused verification covers calculations and empty evidence, all registry exports, CSV formula neutralization, grading/ranking restrictions, peer positions, full exports across pages, actor-bound PDF/CSV audit snapshots, RLS and appointment isolation, cache boundaries, routes and module locking, error recovery, mobile/desktop navigation, PDF/CSV downloads and print invocation. Browser fixtures stay in test output and never seed a school.

```powershell
node -r ts-node/register/transpile-only --test apps/api/src/modules/exams/analytics/analytics-library.test.ts apps/api/src/modules/exams/analytics/analytics-report.test.ts apps/api/src/modules/exams/analytics/analytics-depth.test.ts apps/api/src/modules/exams/analytics/analytics.test.ts apps/api/src/modules/exams/analytics/analytics-service.test.ts
node -r ts-node/register/transpile-only -r tsconfig-paths/register apps/api/test/support/run-integration-with-local-postgres.ts jest --config jest.integration.config.js --runInBand --testTimeout=30000 apps/api/test/academic-intelligence.integration-spec.ts
npm --prefix apps/web run test:design -- --runTestsByPath tests/design/exam-analytics-library.test.tsx tests/design/exams-manager-routing.test.tsx tests/design/academic-intelligence-print.test.tsx
node apps/web/tests/design/exam-analytics-library-browser.mjs
node -r ts-node/register/transpile-only scripts/benchmark-exam-analytics.ts 3000
```

No schema migration or production seed is required. Deploy through the existing GitHub checks, Railway Git integration and gated Cloudflare workflow. Deploying this code does not require modifying production school records.
