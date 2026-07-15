# MyShule School Readiness Work Ledger

Generated: 2026-07-15

## Branch And Baseline

- Branch: `main`
- Working tree at start of this mandate slice: clean, aligned with `origin/main`
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

## Areas Not Yet Fully Inspected

- Full database migration history and seed data implications
- Every role command center and every sidebar item across all roles
- Every controller/service pair for all operational modules
- Full E2E browser/Gmail/manual provider flows
- Production hosted logs after the next Vercel/Railway deployments
- Mobile viewport screenshots for each critical workflow

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

## Tests Added Or Updated

- Updated `apps/web/tests/design/principal-production-readiness.test.tsx`
  - New test: Principal School Setup renders activation dependency guidance and routes to Academics.
  - New test: Principal Staff primary action opens Users & Invitations instead of doing nothing.

## Tests Executed In This Slice

| Command | Result | Notes |
| --- | --- | --- |
| `npm --prefix apps/web run test:design -- --runTestsByPath tests/design/principal-production-readiness.test.tsx` | PASS | 12 tests passed |
| `npm --prefix apps/web run test:design -- --runTestsByPath tests/design/dashboard-production-readiness.test.tsx tests/design/principal-production-readiness.test.tsx` | PASS | 15 tests passed |
| `npm run typecheck` | PASS | Prisma generated; TypeScript passed |
| `npm --prefix apps/web run build` | PASS | Next production build completed; 84 static pages generated |
| `npm run ci:full` | PASS | Full build, lint, web build, API tests, implementation gates, tenant isolation audit, security scans, dependency audit, certifications, production scorecard, and release readiness passed after this slice |

## Full-Suite Evidence From Immediately Before This Slice

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run ci:full` | PASS | Build, web lint, web build, API tests, implementation gates, tenant isolation audit, security scans, dependency audit, certification gates, production scorecard, release readiness |
| `npm run web:build` | PASS | Next production build completed |
| `npm run release:readiness` | PASS | Release gate returned `ok: true` |

## External Blockers And Manual Verification Required

- Manual Gmail verification remains `NOT_YET_MANUALLY_VERIFIED`.
- Real provider delivery states must be verified after deploy: Resend email, SMS relay/provider, M-Pesa sandbox/live callbacks if enabled.
- Do not mark SMS as delivered from a queued state.
- Do not mark invitation delivery accepted until the user confirms Gmail receipt and token acceptance in production.
- Hosted Vercel/Railway post-deploy browser smoke tests still need to be run after the latest push is deployed.

## Current P0/P1/P2/P3 Backlog

### P0

- None identified in this slice after focused verification.

### P1

- Complete capability inventory for every role/sidebar/API/model/event/report, not only Principal, Admissions, Exams Manager, and Super Admin slices.
- Run post-deployment browser smoke tests against production URLs for school creation, principal invite acceptance, staff invite acceptance, billing update, admissions first learner, and exams setup.
- Add an automated school-activation golden path test that crosses Super Admin -> Principal -> Staff -> Admissions -> Finance -> Exams with tenant isolation assertions.

### P2

- Add mobile viewport tests for Principal School Setup, Users & Invitations, Admissions, Finance, Exams Manager, Teacher marks, and Parent portal.
- Replace remaining generic empty-state copy in older role workspaces with dependency-specific next actions.
- Add downloadable readiness report from the Principal School Setup checklist.

### P3

- Expand this ledger into a machine-generated capability matrix after the route/component/API scanner is added.
- Add screenshot checkpoints for manual Gmail scripts.

## Decisions Made

- The actual production Principal route is `PrincipalCommandCenter`, so activation guidance was added there instead of only improving the unused `principal-dashboard/` setup component.
- Principal School Setup actions navigate to existing real workspaces instead of creating new disconnected setup pages.
- CSV export and print preview use existing shared dashboard helpers.

## Next Recommended Action

Run a repository-wide capability scanner and produce a complete matrix of role, sidebar item, component, route, API endpoint, permission/module requirement, status, and test coverage. Then fix the next P1 gap discovered by that matrix.
