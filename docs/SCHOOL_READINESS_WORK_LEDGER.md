# MyShule School Readiness Work Ledger

Generated: 2026-07-15

## Branch And Baseline

- Branch: `codex/school-operational-readiness`
- Working tree at start of this execution slice: `main` was aligned with `origin/main`; implementation moved to `codex/school-operational-readiness` before file changes.
- Last full-suite baseline before this slice: `npm run ci:full` passed on 2026-07-15 after commit `351c204b`
- Baseline production scorecard: `docs/scorecards/production-readiness-scorecard.md`, overall `97/95`
- Release gate: `npm run release:readiness` returned `ok: true`

## Applications And Packages Identified

- Root API/service workspace: `apps/api`
- Web application: `apps/web`
- SMS relay: `apps/sms-relay`
- Malware scanner: `apps/malware-scanner`
- Deployment targets/scripts: root `package.json`, `deploy/railway/*`, Vercel scripts, Railway prepare scripts
- Prisma database contract: `prisma/schema.prisma`

## Repository Areas Inspected In This Slice

- Repository instructions: `AGENTS.md`, attached activation mandate
- Web role router: `apps/web/src/components/school/school-pages.tsx`
- Actual Principal production route: `apps/web/src/components/school/principal-command-center.tsx`
- Duplicate/newer Principal dashboard workspace family: `apps/web/src/components/school/principal-dashboard/*`
- Principal readiness tests: `apps/web/tests/design/principal-production-readiness.test.tsx`
- Existing readiness/security artifacts: `docs/scorecards/*`, `docs/security/*`, `docs/validation/*`
- Build/test scripts: root `package.json`, `apps/web/package.json`
- School readiness inventory generator: `scripts/generate-school-readiness-inventory.mjs`
- Generated capability matrix and Gmail manual verification scripts: `docs/SCHOOL_CAPABILITY_MATRIX.md`, `docs/MANUAL_GMAIL_VERIFICATION_SCRIPTS.md`

## Areas Not Yet Fully Inspected

- Full database migration history and seed data implications. Partial update 2026-07-15: `prisma/schema.prisma` and `prisma/seed.ts` exist, `prisma/migrations` is absent in this checkout, and demo seed scripts exist under `apps/api/src/scripts`.
- Every role command center and every sidebar item across all roles. Partial update 2026-07-15: 26 command-center files and 317 generated matrix rows were counted, but per-button/backend/audit status is still the next scanner gap.
- Every controller/service pair for all operational modules. Partial update 2026-07-15: suffix-based module scan found 98 controllers, 185 services, and 72 module test files; module-level parity still needs generated matrix review against user-facing workflows.
- Full E2E browser/Gmail/manual provider flows
- Production hosted logs after the next Vercel/Railway deployments
- Mobile viewport screenshots for each critical workflow

## Expanded Inspection Findings 2026-07-15

### Migration And Seed Surface

- Prisma files present: `exams_schema.prisma`, `schema.prisma`, `seed.ts`.
- Migration count from this checkout: `0`; `prisma/migrations` is absent.
- Demo/onboarding seed code exists in `apps/api/src/scripts/base-onboarding-seed.ts`, `apps/api/src/scripts/kisumu-boys-demo-seed.ts`, and `apps/api/src/scripts/ensure-contract-demo-users.ts`.
- Demo seed safeguards found:
  - `ensure-contract-demo-users.ts` requires `--confirm-contract-demo-users`.
  - `kisumu-boys-demo-seed.ts` requires the safe package script flag `--confirm-kisumu-boys-only`.
  - `kisumu-boys-demo-seed.test.ts` verifies the safe seed command and tenant selection behavior.
- Remaining risk: schema drift cannot be proven from repository migrations alone; production migration evidence must come from deployment/database migration logs or a committed migration history.

### Role Command Centers And Sidebar Inventory

- Command-center files counted: 26.
- Generated capability matrix rows counted: 317.
- Generated matrix role buckets: Admissions Dashboard, Boarding Master, Class Teacher, Counsellor, Dean Academics, Deputy Principal, Discipline Master, Exams Manager, Grade Master, Guidance Counselling, Hod, Laboratory Technician, Librarian, Nurse, Principal, Role Operational, Security, Storekeeper, Teacher, Transport Manager.
- Source command-center files include additional direct role surfaces not yet represented as separate generated buckets: Accountant, ICT Manager, Procurement Officer, Registrar, Secretary, Student.
- Remaining risk: current inventory proves discovery, not daily-operational completeness; next scanner expansion must add action/button, backend route, event/audit, report/print, and test coverage status.

### Backend Controller, Service, And Test Counts

- API modules scanned under `apps/api/src/modules`.
- Totals from suffix-based scan: 98 controllers, 185 services, 72 module test files.
- Modules with tests but no controllers/services include `analytics`, `automation`, `implementation100`, `implementation300`, and `mobile`; these may be policy/certification modules but must be classified explicitly.
- Modules with controllers but no service file include `health` and `parent-portal`; these require manual contract review before claiming workflow completeness.

### Provider, Hosted Smoke, And Mobile Evidence

- Manual Gmail scripts exist in `docs/MANUAL_GMAIL_VERIFICATION_SCRIPTS.md`, but remain `NOT_YET_MANUALLY_VERIFIED`.
- Provider and production commands exist in `package.json`: `smoke:providers`, `smoke:production-auth`, `monitor:synthetic`, `scorecard:production`, and `ci:full`.
- `docs/validation/go-live-blockers.md` previously recorded live/provider blockers and must be refreshed after deployment before a final go-live claim.
- Railway descriptors exist under `deploy/railway/*`; hosted Vercel/Railway logs were not collected in this local execution slice.
- Mobile design coverage exists in `mobile-low-bandwidth.test.tsx`, role-dashboard structure tests, and sidebar drawer assertions; screenshot/browser evidence is still needed for Principal setup, Users & Invitations, Admissions, Finance, Exams Manager, Teacher marks, and Parent/Student portal flows.

## Roles Discovered

Core roles confirmed from routing/tests and `AGENTS.md`: Super Admin, System Monitor, Principal, Deputy Principal, Secretary, Accountant/Bursar, Teacher, Class Teacher, Grade/Form Master, HOD, Dean of Academics, Exams Manager, Admissions Officer, Nurse, Counsellor, Discipline Master, Librarian, Storekeeper, Boarding Master, Security Officer, Transport Manager, Laboratory Technician, Parent, Student.

## Dashboards And Workspaces Inspected

- Principal production dashboard: `PrincipalCommandCenter`
- Principal sidebar workspaces inspected: Overview, School Setup, Fees, Attendance, Discipline, Parents & Visitors, Sick Bay, Boarding, Academics, Staff, Transport, Library, Exams & Report Cards, Communication, Users & Invitations, Approvals, Reports, Audit Logs
- Admissions dashboard route previously inspected and routed to `AdmissionsDashboardCommandCenter`
- Exams Manager dashboard previously inspected and route/publishing/export issues repaired
- Super Admin school onboarding/billing previously inspected and repaired

## Startup Dependency Graph

| Order | Dependency | Responsible role | Required before | User-facing action |
| --- | --- | --- | --- | --- |
| 1 | School tenant exists and modules are enabled | Super Admin | Any school operation | Super Admin schools/modules workspaces |
| 2 | Principal invitation accepted | Principal | School setup ownership | Invitation acceptance and Principal login |
| 3 | Academic foundation: classes, streams, subjects, departments, year, term | Principal/Deputy | Admissions placement, timetable, exams, marks | Principal School Setup -> Academics |
| 4 | Staff invited and assigned roles | Principal | Teacher allocation and departmental workflows | Principal School Setup -> Users & Invitations |
| 5 | Teacher allocations | Principal/Deputy/HOD | Timetable, attendance, marks entry | Academic/staff setup workspaces |
| 6 | Learners admitted and placed | Admissions/Secretary | Parent/student portals, attendance, finance, exams | Admissions and Parents & Visitors workflows |
| 7 | Guardians linked | Admissions/Secretary | Parent portal and parent notifications | Admissions/guardian linking flow |
| 8 | Fee structure configured | Accountant/Bursar | Invoices, receipts, balances, statements | Fees/Finance workspaces |
| 9 | Attendance/timetable started | Teachers/Class Teachers | Principal daily attendance visibility and parent absence notification | Attendance workspace |
| 10 | Exams configured with grading and subjects | Exams Manager/Dean/HOD | Mark entry, moderation, report cards | Exams & Report Cards workspace |
| 11 | Reports generated from source records | Principal/Department leads | Board reports, downloadable evidence | Reports workspace |

## Defects Repaired In This Slice

| ID | Priority | Status | Defect | Evidence | Fix |
| --- | --- | --- | --- | --- | --- |
| SR-001 | P1 | VERIFIED_AUTOMATICALLY | Principal had no direct school-activation checklist in the actual production route; setup dependencies were not surfaced where a new Principal lands. | `PrincipalCommandCenter` was the live route from `school-pages.tsx`; newer setup component existed under `principal-dashboard/` but was not used by production Principal routing. | Added `setup-checklist` section, activation progress, dependency steps, and real navigation actions in `apps/web/src/components/school/principal-command-center.tsx`. |
| SR-002 | P1 | VERIFIED_AUTOMATICALLY | `/school/principal/setup-checklist` fell through to the generic shell instead of the Principal command center. | Focused test initially rendered generic `enterprise-shell` and could not find `principal-practical-command-center`. | Added Principal setup/user/sick-bay/exams-report route sections to `roleOperationalWorkspaceSectionIds` in `apps/web/src/components/school/school-pages.tsx`. |
| SR-003 | P2 | VERIFIED_AUTOMATICALLY | Reusable Principal list workspace actions included no-op buttons for primary action, export, and print. | `PrincipalListWorkspace` rendered `ActionRow` without `onAction`. | Wired primary navigation, CSV export via `downloadCsvFile`, and print preview via `openPrintDocument`. |
| SR-004 | P1 | VERIFIED_AUTOMATICALLY | Remaining production-readiness gaps were being tracked manually in chat/ledger instead of a repeatable source-derived inventory. | No generated role/route/controller/model capability matrix or Gmail verification scripts existed. | Added `readiness:school-inventory`, a source scanner, generated capability matrix, and manual Gmail verification scripts. |
| SR-005 | P1 | VERIFIED_AUTOMATICALLY | The generated capability matrix did not yet list discovered sidebar/workspace items per role, and manual Gmail scripts did not include every required evidence field from the mandate. | `docs/SCHOOL_CAPABILITY_MATRIX.md` only listed route sets; `docs/MANUAL_GMAIL_VERIFICATION_SCRIPTS.md` lacked explicit account, expected subject/link, receiving role, audit event, screenshot checkpoint, pass/fail, notes, and defect fields. | Expanded `scripts/generate-school-readiness-inventory.mjs` to parse role dashboard nav items and generate complete Gmail verification fields. |

## Tests Added Or Updated

- Updated `apps/web/tests/design/principal-production-readiness.test.tsx`
  - New test: Principal School Setup renders activation dependency guidance and routes to Academics.
  - New test: Principal Staff primary action opens Users & Invitations instead of doing nothing.
- Added `scripts/generate-school-readiness-inventory.test.mjs`
  - Verifies the inventory generator creates the capability matrix and Gmail verification scripts with required role, route, API, model, dependency, and manual-verification sections.
  - Verifies sidebar/workspace rows for Principal, Teacher, Exams Manager, and Admissions dashboards.
  - Verifies manual Gmail scripts include account, invitation sender, expected subject/link, login route, dashboard, receiving role, notification/report/audit expectations, screenshot checkpoints, pass/fail, notes, and defect fields.

## Tests Executed In This Slice

| Command | Result | Notes |
| --- | --- | --- |
| `npm --prefix apps/web run test:design -- --runTestsByPath tests/design/principal-production-readiness.test.tsx` | PASS | 12 tests passed |
| `npm --prefix apps/web run test:design -- --runTestsByPath tests/design/dashboard-production-readiness.test.tsx tests/design/principal-production-readiness.test.tsx` | PASS | 15 tests passed |
| `npm run typecheck` | PASS | Prisma generated; TypeScript passed |
| `node --test scripts/generate-school-readiness-inventory.test.mjs` | PASS | Scanner generated both readiness docs and passed assertions |
| `npm run readiness:school-inventory` | PASS | Generated `docs/SCHOOL_CAPABILITY_MATRIX.md` and `docs/MANUAL_GMAIL_VERIFICATION_SCRIPTS.md` |
| `node --test scripts/generate-school-readiness-inventory.test.mjs` | PASS | Re-run after sidebar/manual-field scanner expansion |
| `npm --prefix apps/web run build` | PASS | Next production build completed; 84 static pages generated |
| `npm run ci:full` | PASS | Full build, lint, web build, API tests, implementation gates, tenant isolation audit, security scans, dependency audit, certifications, production scorecard, and release readiness passed after this slice |
| `node --test scripts/generate-school-readiness-inventory.test.mjs` | FAIL then PASS | First failed because `## Button And Action Inventory` did not exist; after TDD scanner work it passed |
| `npm run readiness:school-inventory` | PASS | Regenerated capability matrix and manual Gmail scripts with action/backend/test/report inventories |
| `npm run typecheck` | PASS | Prisma generated; TypeScript completed with no emit |
| `npm --prefix apps/web run test:design -- --runTestsByPath tests/design/principal-production-readiness.test.tsx tests/design/admissions-dashboard-routing.test.tsx tests/design/admissions-empty-state-workflows.test.ts tests/design/admissions-live-api.test.ts tests/design/teacher-dashboard-routing.test.tsx tests/design/dean-hod-command-center-contract.test.ts tests/design/academic-office-production-readiness.test.tsx tests/design/exams-manager-routing.test.tsx tests/design/exams-manager-command-center.test.ts tests/design/exams-manager-human-workflows.test.ts tests/design/experience-actions.test.tsx tests/design/user-management-invitations.test.tsx tests/design/user-management-panel.test.tsx` | PASS | 13 suites, 85 tests passed for the touched school dashboards, admissions, exams, user management, and billing UI surfaces |
| `node --test dist/apps/api/src/modules/platform/platform-onboarding.service.test.js` | PASS | 31 tests passed after adding the real-school clean onboarding regression |
| `npm run ci:full` | PASS | Full build, web lint, web build, API tests, implementation gates, tenant isolation audit, security scans, dependency audit, certifications, production scorecard, and release readiness passed |
| `npm --prefix apps/web run test:design -- --runTestsByPath tests/design/exams-manager-human-workflows.test.ts` | PASS | 6 tests passed after replacing generic exams class/subject empty-state copy with real next actions |
| `npm run build` | PASS | Current-source API build passed after the clean-school onboarding regression |
| `npm run typecheck` | PASS | Current-source no-emit TypeScript passed |
| `npm --prefix apps/web run test:design -- --runTestsByPath tests/design/principal-production-readiness.test.tsx tests/design/admissions-dashboard-routing.test.tsx tests/design/admissions-empty-state-workflows.test.ts tests/design/admissions-live-api.test.ts tests/design/teacher-dashboard-routing.test.tsx tests/design/dean-hod-command-center-contract.test.ts tests/design/academic-office-production-readiness.test.tsx tests/design/exams-manager-routing.test.tsx tests/design/exams-manager-command-center.test.ts tests/design/exams-manager-human-workflows.test.ts tests/design/experience-actions.test.tsx tests/design/user-management-invitations.test.tsx tests/design/user-management-panel.test.tsx` | PASS | Current-source focused school dashboard suite passed: 13 suites, 86 tests |
| `npm exec eslint -- <changed web files>` from `apps/web` | PASS | Current-source targeted lint on changed web files exited 0 with existing warnings |
| `npm run web:build` | PASS | Current-source Next production build completed; 84 static pages generated |
| `npm run ci:full` | TIMEOUT on rerun | Earlier current-slice `ci:full` passed; rerun after later small patches exceeded the 30-minute tool timeout, so current-source evidence is recorded through smaller gates above |
| `npm run build` | PASS | Current-source API build passed after adding `school-activation-golden-path.test.ts` |
| `node --test dist/apps/api/src/modules/platform/school-activation-golden-path.test.js` | PASS | 3 golden-path tests passed: clean school with pending principal invite, duplicate pending principal invite rejection, and wrong-tenant invitation acceptance rejection |
| `npm run build` | PASS | Current-source API build passed after wiring school-configured grading systems into exams-manager setup options |
| `node --test dist/apps/api/src/modules/admin-command/admin-command.test.js` | PASS | 71 admin-command tests passed, including tenant-scoped exam setup options with `academics_grading_systems` |
| `npm --prefix apps/web run test:design -- exams-manager-human-workflows.test.ts` | PASS | 7 exams-manager workflow contract tests passed, including dynamic school grading-system selection in active exam setup |
| `npm --prefix apps/web run test:design -- admissions-empty-state-workflows.test.ts admissions-dashboard-routing.test.tsx` | PASS | 13 admissions dashboard tests passed, including no generic empty states and school-scoped class-section dropdown wiring |
| `npm run build` | PASS | Current-source API build passed after adding the admissions approved-application enrolment chain regression |
| `node --test dist/apps/api/src/modules/admissions/admissions.test.js` | PASS | 27 admissions API tests passed, including approved application registration into student, guardian, fee invoice, academic enrollment, parent invite, notifications, SMS, audit, and event handoffs |
| `npm --prefix apps/web run test:design -- experience-actions.test.tsx` | PASS | 14 Super Admin and finance action tests passed, including visible school billing status update after manual billing PATCH |
| `node --test dist/apps/api/src/modules/platform/platform-onboarding.service.test.js` | PASS | 31 platform onboarding tests passed, including manual billing update, audit logging, tenant-scoped transaction, and expired billing handling |
| `npm --prefix apps/web run test:design -- school-finance-bulk-billing.test.tsx experience-actions.test.tsx` | PASS | 15 finance UI tests passed, including billable roster loading, selected learner bulk invoice generation, manual payment action contracts, and visible status refresh |
| `node --test dist/apps/api/src/modules/billing/billing.test.js` | PASS | 32 billing API tests passed, including fee structure creation, invoice generation, manual receipt clearing/reversal, student balances, statements, reconciliation, exports, lifecycle guard, and manual active billing |
| `npm --prefix apps/web run test:design -- teacher-dashboard-routing.test.tsx teacher-dashboard-human-workflows.test.ts teacher-exams-marks-workspace.test.tsx exams-manager-routing.test.tsx exams-manager-command-center.test.ts exams-manager-human-workflows.test.ts exams-workspace.test.tsx report-card-curriculum.test.tsx academic-parent-portal-upgrade.test.tsx` | PASS | 9 teacher/exams/report-card suites and 51 tests passed, including new teacher dashboard routing, teacher markbook controls, exams-manager setup/marks/publishing flows, curriculum-aware report cards, and parent portal visibility |
| `node --test dist/apps/api/src/modules/admin-command/admin-command.test.js` | PASS | 71 admin-command tests passed, including teacher mark entry isolation, fresh-school exams data, exam setup, moderation, report-card generation, publication, and refusal of fake publication |
| `node --test dist/apps/api/src/modules/academics/academics.test.js` | PASS | 14 academics API tests passed, including teacher assignment, tenant-scoped teacher options, class/student assignment, lesson logs, and marks delegation to ExamsService |
| `npm --prefix apps/web run test:design -- operational-modules-production-readiness.test.tsx` | PASS | 8 route-level operational module tests passed for nurse visits, librarian issue, storekeeper inventory, boarding roll-call, transport routes, lab requests, discipline incident logging, and counselling cases |
| `npm --prefix apps/web run test:design -- operational-modules-production-readiness.test.tsx operational-action-contract.test.tsx frontend-operationalization.test.tsx school-operational-store.test.ts discipline-human-workflows.test.tsx deputy-discipline-workspace.test.tsx library-workspace.test.tsx inventory-workflow.test.ts inventory-live-api.test.ts transport-module.test.tsx transport-human-workflows.test.ts storekeeper-human-workflows.test.ts role-dashboard-empty-states.test.ts` | PASS | 13 operational frontend suites and 77 tests passed; direct sidebar URLs now resolve to role-specific workable dashboards instead of the generic overview shell |
| `node --test dist/apps/api/src/modules/boarding/boarding.test.js dist/apps/api/src/modules/clinic/clinic.test.js dist/apps/api/src/modules/visitors/visitors.test.js dist/apps/api/src/modules/transport/transport.test.js dist/apps/api/src/modules/inventory/inventory.test.js dist/apps/api/src/modules/security/security.test.js dist/apps/api/src/modules/discipline/discipline.test.js dist/apps/api/src/modules/counselling/counselling.service.test.js dist/apps/api/src/modules/library/library.test.js dist/apps/api/src/modules/health/health.controller.test.js` | PASS | 109 operational backend tests passed for boarding, clinic/health, visitors/security, transport, inventory, discipline, counselling, and library first-workflow contracts |
| `node --test dist/apps/api/src/modules/students/students.test.js` | FAIL then PASS | First exposed that parent/student portal academics queries did not enforce published-only report-card visibility; after service repair, 7 tests passed including parent linked-child publication scope and student self-only released report cards |
| `npm --prefix apps/web run test:design -- academic-parent-portal-upgrade.test.tsx report-card-curriculum.test.tsx mobile-low-bandwidth.test.tsx production-hardening.test.tsx dashboard-production-readiness.test.tsx` | PASS | 5 web suites and 26 tests passed for parent report viewers, curriculum-aware report cards, mobile/low-bandwidth operational behavior, production hardening, and dashboard readiness copy/actions |
| `node --test dist/apps/api/src/scripts/provider-credential-smoke.test.js dist/apps/api/src/common/reports/report-csv-artifact.test.js dist/apps/api/src/common/reports/report-excel-artifact.test.js dist/apps/api/src/common/reports/report-pdf-artifact.test.js dist/apps/api/src/common/reports/report-artifact-storage.service.test.js dist/apps/api/src/common/reports/report-export.worker.test.js dist/apps/api/src/common/reports/report-export-queue.test.js dist/apps/api/src/common/reports/report-snapshot-manifest.test.js dist/apps/api/src/common/reports/report-snapshot.repository.test.js` | PASS | 37 API tests passed for provider smoke validation, secret redaction, live-provider failure semantics, tenant-scoped report artifacts, snapshots, exports, queueing, and disabled-module guards |
| `npm run typecheck` | PASS | Current-source TypeScript no-emit gate passed after the portal confidentiality repair |
| `npm run web:build` | PASS | Current-source Next production build completed; 84 static pages generated |
| `npm run test` | PASS | Root API gate passed: 1,096 API tests plus 9 production-auth smoke tests |
| `npm run ci:full` | PASS | Full gate passed: build, web lint, web build, API tests, implementation gates, tenant isolation audit, security/PII/dependency scans, certifications, production scorecard, and release readiness |
| `npm run smoke:providers` | PASS | Provider smoke passed: 8 checks, 6 passed, 0 failed, 2 optional checks skipped; Resend, support email, Redis, retry worker, and object storage settings were validated without exposing secrets |
| `npm run smoke:production-auth` | PASS | Production auth smoke passed against `https://www.myshule.online` and `https://my-shule-erp-api.vercel.app`: 6 checks passed, 0 failed |
| `SYNTHETIC_API_BASE_URL=https://my-shule-erp-api.vercel.app SYNTHETIC_WEB_BASE_URL=https://www.myshule.online SYNTHETIC_ALLOW_REMOTE=true npm run monitor:synthetic` | PASS | Remote synthetic monitor passed: 5 journeys, 7 steps, 0 failed; checked public readiness, support status, login, teacher exams route, principal discipline route, and parent discipline route |

## New Inventory Evidence Added 2026-07-15

- `docs/SCHOOL_CAPABILITY_MATRIX.md` now includes `## Button And Action Inventory`.
- Discovered action rows: 429.
- Explicit missing-handler/degraded-control matches in scanned surfaces: 0 for `NEEDS_HANDLER`, `DISABLED_REVIEW`, `DISCOVERED_NEEDS_HANDLER_REVIEW`, `COMING_SOON`, and `No records found`.
- Backend contract rows: 54.
- Automated test coverage rows: 183.
- Report and print inventory rows: 1,273.
- The scanner marks discovered items as review or manual-verification states; it does not claim the actions are production-complete.

## Full-Suite Evidence From Immediately Before This Slice

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run ci:full` | PASS | Build, web lint, web build, API tests, implementation gates, tenant isolation audit, security scans, dependency audit, certification gates, production scorecard, release readiness |
| `npm run web:build` | PASS | Next production build completed |
| `npm run release:readiness` | PASS | Release gate returned `ok: true` |

## External Blockers And Manual Verification Required

- Manual Gmail verification remains `NOT_YET_MANUALLY_VERIFIED`.
- Generated manual scripts now exist in `docs/MANUAL_GMAIL_VERIFICATION_SCRIPTS.md`; they still need real Gmail/provider execution.
- Real provider delivery states must be verified after deploy: Resend email, SMS relay/provider, M-Pesa sandbox/live callbacks if enabled.
- Do not mark SMS as delivered from a queued state.
- Do not mark invitation delivery accepted until the user confirms Gmail receipt and token acceptance in production.
- Hosted Vercel/Railway post-deploy browser smoke tests still need to be run after the latest push is deployed.

## Current P0/P1/P2/P3 Backlog

### P0

- None identified in this slice after focused verification.

### P1

- Continue converting discovered-but-not-manually-verified inventory rows into end-to-end workflow evidence, starting with hosted browser smoke and provider-backed invite acceptance.
- Run post-deployment browser smoke tests against production URLs for school creation, principal invite acceptance, staff invite acceptance, billing update, admissions first learner, and exams setup.
- Extend the automated school-activation golden path from the current clean-school/invite isolation test into a full Super Admin -> Principal -> Staff -> Admissions -> Finance -> Exams tenant-isolation journey.
- Convert the latest operational module route/backend evidence into deeper cross-dashboard workflow proof where parent/student visibility, reports, and notifications are involved.
- Add deeper portal confidentiality tests for medical, counselling, discipline, and finance views; current repair covers linked-child academic publication visibility and student released report-card visibility.

### P2

- Add mobile viewport tests for Principal School Setup, Users & Invitations, Admissions, Finance, Exams Manager, Teacher marks, and Parent portal.
- Replace remaining generic empty-state copy in older role workspaces with dependency-specific next actions.
- Add downloadable readiness report from the Principal School Setup checklist.

### P3

- Add screenshot checkpoints and evidence attachment fields to the manual Gmail scripts after live verification starts.

## Decisions Made

- The actual production Principal route is `PrincipalCommandCenter`, so activation guidance was added there instead of only improving the unused `principal-dashboard/` setup component.
- Principal School Setup actions navigate to existing real workspaces instead of creating new disconnected setup pages.
- CSV export and print preview use existing shared dashboard helpers.
- The capability matrix is an inventory, not a production-ready claim; it explicitly marks manual flows as `NOT_YET_MANUALLY_VERIFIED`.

## Next Recommended Action

Use `npm run readiness:school-inventory` after each dashboard/workflow slice, then fix the next P1 gap discovered by `docs/SCHOOL_CAPABILITY_MATRIX.md` and the manual Gmail scripts.
