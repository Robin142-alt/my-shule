# Report-card generation reliability

## Incident and repair

Production API logs for the 16 September 2026 class-generation failure identify PostgreSQL error `42703`: `staff.full_name` does not exist. The HR schema stores `staff_profiles.display_name`; account names belong to `users`. The report query also referenced nonexistent `staff.preferred_name` and `staff.email` fields. The corrected query uses the school-scoped staff profile and its appointed user account.

A read-only check against the production class then exposed an independent `AttendanceStatus` enum mismatch. Attendance comparisons now normalize `status::text` to lowercase, supporting both uppercase enum values and lowercase legacy text. After both corrections, all 11 learners in the affected class successfully loaded and rendered PDFs in memory. No production report, mark, approval, or publication was written during that diagnostic.

## Generation behavior

- Class generation runs in pages of 25 learners, with visible cumulative progress. It continues beyond 200 learners instead of silently stopping at the first page.
- Four concurrent generation tasks per API process share a limiter across batch requests. Each batch shares school, exam, principal and grading reads; the cache is discarded afterwards and keys include the school and query parameters.
- The learner roster comes from the same enrollment and finalized-mark calculation as readiness.
- Recognized temporary database failures receive at most three attempts, with exponential delay and jitter. Validation, approval conflicts, and schema incompatibility errors do not receive automatic retries.
- Retries preserve the generation identity. An advisory transaction lock serializes saves for the same school, exam and learner. Existing complete, unchanged cards are reused; a changed draft source is rebuilt, and submitted/approved/published reports remain protected during class retries.
- Snapshot, both artifact manifests, audit and generation outbox event commit in one transaction. Batch completion/failure status, batch audit and batch event also commit together. A failure rolls back the affected transaction rather than leaving a successful-looking partial report.
- Failure responses contain safe messages, learner names, error categories and attempt counts. Database details stay in server logs. The interface includes a batch reference and distinguishes completed, failed and unprocessed learners.
- Artifacts retain the existing architecture: metadata and the report snapshot are persisted, and download endpoints render the official PDF from that snapshot. This change does not introduce blob storage or change publication/guardian authorization.

## Verification

The PostgreSQL regression suite uses the repository's real exam and HR table definitions, a non-owner runtime role, and row-level security on report and core school tables. It exercises the original staff-schema failure, uppercase attendance, rollback on artifact/event failure, concurrent duplicate requests, protected report states, source changes and cross-school reads.

The rendering/batch benchmark uses 100 synthetic learners with seven subjects each, actual HTML and PDF rendering, and local PostgreSQL writes including artifact manifests, audits and outbox events. It is a local measurement, not a production capacity promise. The suite prints measured elapsed time and cards per second.

On 16 September 2026, the isolated benchmark generated and persisted 100 seven-subject cards in **5,839 ms (17.13 cards/second)**, with 1,612 SQL operations. A run alongside other local checks measured 3.32 cards/second, demonstrating why a local measurement is not a production service guarantee. Set `REPORT_GENERATION_BENCHMARK_OUTPUT` to an output JSON path when running the benchmark to retain the measured result.

Final verification passed: 151 backend unit/rendering tests, 15 PostgreSQL integration tests, and 28 report-card interface/curriculum/publication tests. Backend TypeScript checking and focused frontend ESLint checking passed. The final interrupted-request UI check also confirms that saved report cards refresh after a later page fails.

Run the focused checks:

```powershell
node -r ts-node/register/transpile-only -r tsconfig-paths/register --test apps/api/src/modules/exams/exams.test.ts apps/api/src/modules/exams/services/report-card-generation-resilience.test.ts apps/api/src/modules/exams/services/report-card-artifact-design.test.ts
node -r ts-node/register/transpile-only apps/api/test/support/run-integration-with-local-postgres.ts jest --config jest.integration.config.js --runInBand apps/api/test/report-card-generation.integration-spec.ts apps/api/test/report-card-readiness.integration-spec.ts
npm --prefix apps/web run test:design -- report-card-generation-readiness live-report-card-actions report-card-curriculum principal-report-card-release
npx tsc --noEmit
```

## Capacity and operation

Millions of complete, persisted PDFs per second has not been demonstrated. This patch keeps the existing synchronous API and adds bounded batch requests; it is not a durable background job system. Closing the browser stops dispatching subsequent pages, while the active API request may still finish. Retrying the class reuses committed cards. Large-scale unattended generation would require durable job ownership/resumption, worker sharding and production load/capacity testing before publishing any throughput or availability guarantee.

Deploy the API and web changes together. These changes require no new tables or destructive migration. After release, generate the affected class as the authorized Exams Manager, verify the counters and downloads, and follow the existing academic review and principal publication workflow. Monitor failure categories and generation duration; schema failures require a service repair rather than changes to student marks.
