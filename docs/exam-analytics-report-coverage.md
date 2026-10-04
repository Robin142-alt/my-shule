# Exam analytics and report coverage

The shared Academic Intelligence workspace now includes:

- Learner score ranges, linearly interpolated quartiles and interquartile range.
- Complete, partial and missing approved result coverage. Complete requires an approved numeric result for every expected assessment.
- Matched progress using the same learner, subject and grading policy in both exams. Learners have equal weight, and changes within two percentage points are stable. This controls population and subject differences but does not establish equal assessment difficulty.
- Subject support priorities: failed results, failing results within five points of a configured pass boundary, missing assessments, absences and median scores. Missing/ungraded results are never assigned a pass threshold or converted to zero.

Use **Print / PDF** in any analytics view to prepare that view's report, or choose **Complete exam analytics** for all sections. Preview, PDF download and printing use the same server-built report model, including school identity, filters, document number, generator and Nairobi time. Charts are exported as readable evidence tables. Learner profiles also have their own report action.

Learner reports default to **All matching learners**, including all subject results, history, risk evidence and permitted positions. **Current page only** remains an explicit choice with its range and total printed. Search and recognition/risk filters narrow learner lists; summary figures retain the full academic selection. All comparison dimensions and available trend, intervention, target, readiness and advanced evidence are included. Unavailable question-level marks and unconfigured academic targets remain explicitly labelled.

Report generation uses the same authenticated school/appointment/publication resolver as the screen. The internal report flag removes pagination only after authorization and filtering; it is not accepted from the public analytics query. Generated PDFs retain the existing snapshot checksum, actor binding and `exams.analytics_report.generated` audit/event path. No schema or seed changes are required.

Verification covers the calculation edge cases, report section coverage, all-results exports, current-page exports, error recovery, role/tenant restrictions against disposable PostgreSQL, and desktop/mobile preview/download/print flows with test fixtures.

Focused checks:

```powershell
node -r ts-node/register/transpile-only --test apps/api/src/modules/exams/analytics/analytics-depth.test.ts apps/api/src/modules/exams/analytics/analytics.test.ts apps/api/src/modules/exams/analytics/analytics-report.test.ts apps/api/src/modules/exams/analytics/analytics-service.test.ts
node -r ts-node/register/transpile-only -r tsconfig-paths/register apps/api/test/support/run-integration-with-local-postgres.ts jest --config jest.integration.config.js --runInBand apps/api/test/academic-intelligence.integration-spec.ts
npm --prefix apps/web run test:design -- --runTestsByPath tests/design/academic-intelligence-print.test.tsx tests/design/academic-intelligence-upgrade.test.tsx tests/design/academic-intelligence-contract.test.tsx
node apps/web/tests/design/academic-intelligence-browser.mjs
```

The browser harness uses test-only data and requires an existing web build for its styles; it does not access production school records.
