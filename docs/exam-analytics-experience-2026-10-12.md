# Exam Analytics experience

The existing 93 analyses remain available through the shared Exam Analytics workspace. The overview emphasizes scores, coverage, progress and observations. Categories open a useful default analysis; bookmarked categories behave the same way. Search shows matching choices, mobile uses a compact analysis selector, and comparisons show the main measures first with advanced statistics and exact tables available on demand.

## Calculation repairs

- Automatic selection prefers the latest exam with approved numeric evidence in the authorized selection. It skips empty comparison cycles. Explicitly selected empty exams remain empty and are never silently replaced.
- A learner's historical average uses every available scored prior cycle. Two exams can show a direction; sustained consistency and variability still require three scored exams. The historical risk rule retains its original three-prior-result requirement.
- Learner drill-down clears class, stream and grade filters so promotion does not accidentally remove history. Backend appointment and tenant boundaries still apply. Returning restores the previous filters.
- Class, subject and other area histories include the selected exam, including a first recorded result. Stale pagination is clamped to available pages.
- Grading restores the Academic Setup scale stored in approved report metadata. It does not read a present-day default to regrade historical results. Numeric thresholds follow the existing report-card lower-bound contract, including fractional scores between integer grade labels. Missing pass/fail flags are excluded from pass-rate denominators.
- Mean grade resolves the grading scale from scored evidence, preventing an unscored learner's fallback scale from changing the result.
- Year comparisons use persisted academic-year identities and recorded chronology. Labels disclose “previous recorded year”; an identically named exam is matched only within the same term. No consecutive calendar year is inferred from a year name.
- Missing results remain null. Pattern searches distinguish no matching pattern, insufficient scored cycles, disabled rankings and unrecorded support/cohort information.

## Reports and interaction

PDF and browser print previews use the same report model, with metric panels, actual trend/bar charts, complete evidence tables, repeated PDF table headings, page numbers and school/actor/document context. Chart limits are labelled and never truncate the underlying table or CSV. Repeated calculation notes are grouped once in the report appendix. CSV retains empty-state explanations and formula-injection protection.

Bars show negative changes to the left of zero; a single trend value has a visible point. Charts offer all rows on the current page and exact tables. When a chart has no numeric data, its table remains visible. Empty selections and errors keep a real recovery path.

## Governance and rollout

The existing authenticated service, scope resolution, tenant-bound SQL/RLS, published-only HOD/HOS rules, ranking settings and report snapshot/audit/event path are retained. There is no migration, seed, new write endpoint or change to school records. The saved grading snapshot is read through the already tenant-scoped report-card join.

The repository contains unrelated work; this change is confined to analytics, its report renderer, tests and this note. Changes have not been deployed to a live school. Live-school acceptance should verify a known exam against approved report cards and download the same selection.

## Verification

Final results: 43 API tests, 105 web tests and 23 PostgreSQL integration tests passed. Both API and web TypeScript checks and focused ESLint passed. Browser workflows passed at all four viewport widths. The complete QA report contains 42 A4 pages; the rendered pages and extracted text bounds were checked, with no out-of-bounds text found. This is local verification with fixtures and disposable PostgreSQL, not a claim of a production deployment or live-school audit.

- API regression tests cover numeric zero, partial/missing evidence, automatic and explicit selections, restored grading, version-sensitive matches, year labels, history, report completeness, export audit failures and all role scopes.
- Disposable PostgreSQL integration covers tenant RLS, exact appointments, publication restrictions, cache identity, saved grading scales and pending-exam selection.
- Web tests cover routing, bookmarks, filters, drill-down/back, library search, responsive selectors, empty/error states, PDF/CSV download, print readiness and malformed report payloads.
- The browser harness exercises the real workspace and renderers with test-only fixtures at 320, 768, 1024 and 1440 pixels. It checks overflow, comparisons, learner pagination, drill-down/back, export/print and recovery.
- PDF QA renders the full 93-analysis collection and checks page bounds, headings, table continuation, charts and footers. Artifacts are under `output/pdf/` and `output/exam-analytics-browser/` and contain only QA fixtures.
- The deterministic 1,000-learner / 48,000-subject-result benchmark measured 2.44 seconds for the initial calculation and 66 ms for a cached view change on this workstation; these are local engine timings, not production network latency.

Run the focused API tests with `node -r ts-node/register/transpile-only --test apps/api/src/modules/exams/analytics/*.test.ts`. Run database tests with the repository disposable PostgreSQL runner and `apps/api/test/academic-intelligence.integration-spec.ts`. The existing `exam-analytics-library-browser.mjs` harness verifies browser behavior without accessing live school records.
