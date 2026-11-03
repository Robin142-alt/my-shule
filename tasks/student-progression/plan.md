# Automated student progression

## Repair continuation — 3 November 2026

The attached repair request extends this same workflow. Preserve the latest production main (fff7fd92), desktop restoration, financial/academic history and existing deployment topology. Work on `codex/progression-rollover-repair` in this clean existing worktree; leave the original dirty checkout and banking plan untouched.

1. Reproduce legacy enrollment/placement drift and establish evidence-based reconciliation. Only repair a uniquely supported current position, retain before/after snapshots, reject conflicting history, and synchronize every current projection within the school transaction. Verify isolated PostgreSQL tests including ambiguous records and tenant boundaries.
2. Prepare reusable year structure on year creation and safely backfill existing upcoming years. Copy missing classes/streams, subject mappings, continuing subject/class teachers and year-scoped appointments independently; preserve destination overrides, source identities/history and explicit expiry. Never copy operational records or timetables. Verify partial targets, repeat execution and school isolation.
3. Remove mandatory notes for the seven requested actions while retaining specialized policy/approval requirements. Use per-learner savepoints/results and durable command idempotency; keep version/membership guards. Verify 25 selected learners with isolated failure, retry, holds, repeat and terminal completion.
4. Repair dependent selectors and result presentation in the existing UI. Current placement is the default for correction; promotion resolves its destination automatically. Verify all actions, refresh/counts, desktop/mobile and existing timetable publication by year/term.
5. Run affected unit, database, UI, type/build and release checks. Deploy through the verified existing pipeline, apply only audited unambiguous backfills, and record production revision/health and non-destructive verification. Do not claim deployment or live behavior without evidence.

Reconciliation strategy: inspect current assignment, annual enrollment, student pointers, admission application and immutable transition evidence before updating anything. Missing legacy stream/year pointers may be filled from unique school-owned IDs/names. Contradictory IDs, duplicate annual records or conflicting transition evidence require review; do not pick the newest record merely because it is newest. All automatic repairs must emit audit/outbox evidence.

The user's implementation and deployment request is the approved product contract. Existing payment planning files remain untouched.

## Capabilities and build order

| Capability | Responsibility | Depends on |
|---|---|---|
| progression-policy | Calendar eligibility, configured pathways, final-stage boundaries | Existing calendar and curriculum |
| student-transitions | Atomic placements, exceptions, subjects, exits, reinstatement and reversal history | progression-policy; canonical student/enrollment/cohort contracts |
| annual-automation | Durable resumable school/year execution and preparation of destination structures | student-transitions |
| progression-workspace | Shared Dean, Deputy and Principal oversight with real APIs | student-transitions; annual-automation |

## Decisions

- Use existing NestJS/PostgreSQL tenant transactions, cohort advisory lock, schema bootstrap, periodic service convention and transactional event outbox. No additional runtime dependency.
- A configured active/closed academic year becomes due only after its end date has passed in the school's IANA timezone and its valid non-overlapping terms have ended. Never close a year, invent dates, or infer academic outcomes from marks.
- The next calendar must exist. Prepare classes/streams from existing offered grade configurations, keep curricula separate and reject gaps/ambiguous sequences. Final Form 4/Grade 12 and confirmed institution-stage endpoints complete only when the year ends.
- A hold prevents annual changes; a repeat decision creates next-year enrollment in the same grade. Completed annual work is idempotent; correction/reversal creates an audited compensating transition and a hold against automatic re-execution.
- Preserve student identity and old marks, report cards, attendance, financial and library records. Snapshot mutable current-placement projections in an immutable transition journal. Update all current enrollment, allocation and status projections atomically.
- Prefer existing destination teaching configuration. Carry forward only valid continuing assignments from the destination grade template, with active school staff and matching offered subjects. Expired appointments do not silently resume.
- Staff controls require school membership, explicit academic progression capabilities and reasons; consequential approval policies remain effective. Scheduler uses a clearly identified system actor with one school scope per transaction.
- Full database verification uses only the disposable localhost PostgreSQL harness. Production inspection is read-only except the authorized schema/application release and normal scheduled execution after release.

## Commands and structure

Backend implementation: apps/api/src/modules/student-progression/. Shared contract: shared/student-progression.ts. UI: apps/web/src/components/school/student-progression/. Tests: API node tests, disposable PostgreSQL integration and web Jest/browser tests.

- Backend build: `npm run build`
- Focused unit tests: `node --test dist/apps/api/src/modules/student-progression/*.test.js`
- Database tests: `node -r ts-node/register/transpile-only -r tsconfig-paths/register apps/api/test/support/run-integration-with-local-postgres.ts jest --config jest.integration.config.js --runInBand apps/api/test/student-progression.integration-spec.ts`
- Web tests: `npm --prefix apps/web run test:design -- --runTestsByPath tests/design/student-progression.test.tsx`
- Web types: `npm --prefix apps/web exec tsc -- --noEmit`
- Full regression and release checks follow existing CI and deployment workflows.

## Verification and release

Prove timezone boundaries, calendar defects, CBC/8-4-4 separation, terminal graduation, holds/repeats, reversals/reinstatement, subject/stream changes, missing records, capacity, retries, cross-school IDs and concurrency in tests. Verify actual canonical rows, immutable academic/financial history and transactional audits/events. Exercise desktop/mobile workspace and authorization denial. Deploy reviewed commits through existing GitHub/Railway/Cloudflare pipeline; verify runtime health, schema and release revision.
