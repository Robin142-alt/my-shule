# MyShule School Operational Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move MyShule from source-discovered dashboards/workspaces to verified, tenant-safe, daily-operational school workflows from school creation through portals, finance, exams, reports, and operational departments.

**Architecture:** Keep the existing monorepo and modular API architecture. Use the current source-derived inventory (`scripts/generate-school-readiness-inventory.mjs`) as the control plane, then tighten each workflow through backend contracts, tenant/permission guards, events/audit logs, frontend actions, and tests. Do not add disconnected UI or fake success states.

**Tech Stack:** Next.js web app in `apps/web`, Nest-style TypeScript API in `apps/api`, Prisma schema in `prisma/schema.prisma`, Node test runner/Jest/Playwright where already present, generated readiness docs in `docs/`.

---

## Checklist Status

This file is a full implementation roadmap, not a claim that every milestone is complete.

- Checked boxes (`- [x]`) are items completed with evidence in this branch or previous verified readiness work.
- Unchecked boxes (`- [ ]`) are intentionally left open because the work still requires implementation, hosted smoke evidence, manual provider verification, or broader end-to-end tests.
- Do not mark unchecked boxes complete unless the relevant code, tests, tenant isolation, permissions, persistence, audit/event behavior, and verification evidence exist.
- Current automated evidence after the latest main push includes: API build pass, web production build pass, typecheck pass, focused school dashboard design suite pass, platform onboarding suite pass, readiness inventory generation pass, and targeted changed-file ESLint pass.
- Current remaining go-live evidence is mainly deployed production smoke, real Gmail/provider invitation acceptance, mobile/browser proof for critical workflows, and deeper end-to-end operational chains such as admissions-to-active-student, fee-to-receipt, and exams-to-published-report-card.

---

## Current Evidence Baseline

- Current source inventory: `docs/SCHOOL_CAPABILITY_MATRIX.md`
- Current readiness ledger: `docs/SCHOOL_READINESS_WORK_LEDGER.md`
- Manual scripts: `docs/MANUAL_GMAIL_VERIFICATION_SCRIPTS.md`
- Last pushed evidence: `npm run ci:full` passed before the scanner expansion; scanner expansion verified with:
  - `npm run readiness:school-inventory`
  - `node --test scripts/generate-school-readiness-inventory.test.mjs`
  - `npm run typecheck`
- Current major remaining status: discovered workspaces are still mostly `DISCOVERED_NOT_MANUALLY_VERIFIED`, not proven operational.
- Current manual status: Gmail/provider flows remain `NOT_YET_MANUALLY_VERIFIED`.

## Expanded Inspection Findings From Previously Uninspected Areas

These findings were collected after reviewing the ledger section `Areas Not Yet Fully Inspected`.

- Database migration and seed surface:
  - `prisma/schema.prisma` exists and is large enough to require controlled migration review.
  - `prisma/migrations` is not present in this checkout, so production schema drift cannot be proven from migration files alone.
  - `prisma/seed.ts`, `apps/api/src/scripts/base-onboarding-seed.ts`, and related scripts contain school, role, tenant, Kisumu Boys, and demo seed logic.
  - Plan impact: add a migration/seed audit gate before any activation claim. New schools must be tested for zero demo-owned records, and demo seed scripts must require explicit demo-tenant targeting.
- Role command centers and sidebars:
  - Current generated matrix has 317 table rows across 20 discovered role buckets.
  - Source contains 26 `*-command-center.tsx` files under `apps/web/src/components/school`.
  - Plan impact: the inventory must become action-level, not just route-level. Every sidebar item needs a unique workspace, primary task, backend contract, empty state, and test status.
- Backend controller/service pairings:
  - Current suffix-based API module scan found 98 controllers, 185 services, and 72 module test files under `apps/api/src/modules`.
  - Some module folders have tests but no controllers or services, and some user-facing modules have controllers without full service parity.
  - Plan impact: each workflow milestone must map frontend actions to exact controller, service, persistence, audit/event, and tests before being marked complete.
- E2E, Gmail, and provider verification:
  - `docs/MANUAL_GMAIL_VERIFICATION_SCRIPTS.md` exists but remains manual evidence, not executed proof.
  - `package.json` exposes `smoke:providers`, `smoke:production-auth`, `monitor:synthetic`, and `ci:full`.
  - `docs/validation/go-live-blockers.md` records prior live blockers around provider smoke, hosted auth smoke, and production environment readiness.
  - Plan impact: no final `GOOD TO GO` rating before real Gmail invite acceptance, provider smoke, hosted auth smoke, and synthetic monitor evidence pass.
- Production hosted logs:
  - Railway deployment descriptors exist under `deploy/railway/*`, and deployment scripts exist in `package.json`.
  - Hosted Vercel/Railway logs were not inspected in this planning pass.
  - Plan impact: final production verification must collect sanitized Vercel deployment status and Railway service logs after deployment.
- Mobile viewport coverage:
  - Design tests mention mobile drawers, low-bandwidth behavior, and sidebar routing, including `mobile-low-bandwidth.test.tsx` and role-dashboard structure tests.
  - The ledger still calls out missing mobile viewport screenshots for critical workflows.
  - Plan impact: mobile tests must be paired with screenshot/browser evidence for Principal setup, Users & Invitations, Admissions, Finance, Exams Manager, Teacher marks, and Parent/Student portal flows.

## Implementation Rules For This Plan

- Use TDD for every behavior change.
- Do not push or deploy unless the user explicitly authorizes that action in the current execution run.
- Commit after each independently verified milestone if committing is authorized.
- Run `npm run readiness:school-inventory` after each workflow slice.
- Never mark a discovered workspace as complete unless route, UI, backend, tenant guard, permission guard, persistence, audit/event, refresh, and tests are verified.
- Preserve generated docs as evidence when commands regenerate them.

---

## File Map

### Control Plane And Evidence

- Modify: `scripts/generate-school-readiness-inventory.mjs`
  - Add button/action extraction, API/service/model/event/test coverage columns, and workflow status rollups.
- Modify: `scripts/generate-school-readiness-inventory.test.mjs`
  - Lock every new matrix requirement with failing tests first.
- Modify: `docs/SCHOOL_CAPABILITY_MATRIX.md`
  - Generated output; never hand-edit except to validate generator output.
- Modify: `docs/SCHOOL_READINESS_WORK_LEDGER.md`
  - Human-readable running ledger for defects, fixes, commands, status, and remaining risk.
- Modify: `docs/MANUAL_GMAIL_VERIFICATION_SCRIPTS.md`
  - Generated manual test scripts; expand when new manual journeys are added.

### Core Routing And Dashboards

- Modify: `apps/web/src/components/school/school-pages.tsx`
  - Role route selection, section aliases, disabled-module behavior.
- Modify: `apps/web/src/components/school/principal-command-center.tsx`
  - School activation, dependency guidance, leadership workspaces.
- Modify: `apps/web/src/components/school/admissions-dashboard/admissions-dashboard-command-center.tsx`
  - Admissions route/workspace shell.
- Modify: `apps/web/src/components/school/teacher-command-center.tsx`
  - Teacher landing, sidebar workspace rendering.
- Modify: `apps/web/src/components/school/teacher-dashboard/*`
  - Teacher daily workflows, marks, assignments, lesson logs.
- Modify: `apps/web/src/components/school/exams-manager-command-center.tsx`
  - Exam setup, marks, moderation, report cards, publishing.
- Modify role command centers under `apps/web/src/components/school/*-command-center.tsx`
  - Operational modules: library, nurse, storekeeper, security, discipline, counsellor, boarding, transport, lab.

### API, Data, Events, And Reports

- Inspect/modify controllers under `apps/api/src/modules/**`
  - Admissions, platform onboarding, admin command, academics, exams, billing, library, clinic/health, inventory, visitors/security, discipline, counselling, boarding, transport, labs, notifications, reports.
- Inspect/modify services/repositories under `apps/api/src/modules/**`
  - Enforce tenant/permission guards and transactions.
- Inspect/modify `prisma/schema.prisma`
  - Only add constraints/indexes after data-impact review.
- Inspect/modify report helpers under `apps/api/src/common/reports/**`
  - Ensure preview/download/queued artifact truth.
- Inspect/modify event/outbox code under `apps/api/src/modules/events/**` and workflow/notification modules.

### Tests

- Add/update web tests under `apps/web/tests/design/**`
- Add/update API tests under `apps/api/src/modules/**/*.test.ts`
- Add/update script tests under `scripts/*.test.mjs`
- Add E2E or production-readiness tests under `tests/production-readiness/**` or existing Playwright locations when browser verification is required.

---

## Milestone 0: Baseline Inspection Hardening

**Purpose:** Close the ledger's uninspected buckets before feature implementation starts, so later milestones operate from current evidence instead of assumptions.

**Files:**
- Modify: `docs/SCHOOL_READINESS_WORK_LEDGER.md`
- Modify: `docs/superpowers/plans/2026-07-15-school-operational-readiness.md`
- Inspect: `prisma/schema.prisma`
- Inspect: `prisma/seed.ts`
- Inspect: `apps/api/src/scripts/base-onboarding-seed.ts`
- Inspect: `apps/web/src/components/school/**/*command-center.tsx`
- Inspect: `apps/api/src/modules/**`
- Inspect: `docs/validation/go-live-blockers.md`

- [x] Step 1: Record migration and seed inventory.

Run:

```powershell
Get-ChildItem -LiteralPath prisma -Force | Select-Object Name,Mode,Length
if (Test-Path -LiteralPath prisma\migrations) {
  Get-ChildItem -LiteralPath prisma\migrations -Directory | Measure-Object
} else {
  "MIGRATION_COUNT=0"
}
rg -n "kisumu|demo|seed|tenant_id|school_id" prisma apps/api/src/scripts scripts -g "*.ts" -g "*.js" -g "*.mjs"
```

Expected current evidence:
- `prisma/schema.prisma` exists.
- `prisma/migrations` is absent in this checkout.
- Demo seed code is present and must remain explicitly scoped to demo tenants.

- [x] Step 2: Record role command-center and generated matrix counts.

Run:

```powershell
Get-ChildItem -LiteralPath apps/web/src/components/school -Recurse -Filter '*command-center.tsx' | Select-Object FullName
node -e "const fs=require('fs');const s=fs.readFileSync('docs/SCHOOL_CAPABILITY_MATRIX.md','utf8');const rows=s.split('\n').filter(l=>l.startsWith('| ')&&!l.startsWith('| ---')&&!l.startsWith('| Role |'));console.log(rows.length);console.log([...new Set(rows.map(l=>l.split('|')[1].trim()))].sort().join('\n'));"
```

Expected current evidence:
- 26 command-center files discovered.
- 317 generated matrix rows discovered.
- Role bucket list is copied into the ledger.

- [x] Step 3: Record backend controller/service/test counts by module.

Run:

```powershell
$rows = @()
$modules = Get-ChildItem -LiteralPath apps/api/src/modules -Directory
foreach ($m in $modules) {
  $controllers = (Get-ChildItem -LiteralPath $m.FullName -Recurse -Filter '*.controller.ts' -ErrorAction SilentlyContinue | Measure-Object).Count
  $services = (Get-ChildItem -LiteralPath $m.FullName -Recurse -Filter '*.service.ts' -ErrorAction SilentlyContinue | Measure-Object).Count
  $tests = (Get-ChildItem -LiteralPath $m.FullName -Recurse -Include '*.test.ts','*.spec.ts' -File -ErrorAction SilentlyContinue | Measure-Object).Count
  $rows += [pscustomobject]@{ Module=$m.Name; Controllers=$controllers; Services=$services; Tests=$tests }
}
$rows | Sort-Object Module | Format-Table -AutoSize
```

Expected current evidence:
- Totals are 98 controllers, 185 services, and 72 suffix-matched module test files.
- Modules with user-facing workflows but missing service/controller/test parity are recorded as plan inputs.

- [x] Step 4: Record production and mobile evidence gaps.

Run:

```powershell
rg -n "Gmail|Resend|provider|SMS|M-Pesa|mpesa|manual|production-auth|synthetic|smoke" docs apps scripts -g "*.md" -g "*.ts" -g "*.mjs"
rg -n "viewport|mobile|iPhone|Pixel|setViewportSize|drawer|sidebar" apps/web/tests apps/web/src/components/school -g "*.ts" -g "*.tsx"
```

Expected current evidence:
- Manual Gmail scripts exist but remain manual.
- Provider and hosted auth smoke commands exist.
- Mobile design tests exist, but screenshot/browser evidence remains required for critical workflows.

- [x] Step 5: Update the ledger with exact findings.

Record:
- Migration count and seed risk.
- Command-center count and matrix role buckets.
- Controller/service/test totals.
- Current production blockers from `docs/validation/go-live-blockers.md`.
- Mobile screenshot workflows that still need evidence.

---

## Milestone 1: Make The Inventory A Real Work Queue

**Purpose:** Convert discovery into an execution queue with enough data to decide exactly what to fix next.

**Files:**
- Modify: `scripts/generate-school-readiness-inventory.mjs`
- Modify: `scripts/generate-school-readiness-inventory.test.mjs`
- Generated: `docs/SCHOOL_CAPABILITY_MATRIX.md`
- Modify: `docs/SCHOOL_READINESS_WORK_LEDGER.md`

- [x] Step 1: Add a failing test for action/button inventory.

Run:

```powershell
node --test scripts/generate-school-readiness-inventory.test.mjs
```

Expected failure before implementation: matrix lacks `## Button And Action Inventory`.

- [x] Step 2: Extend scanner to extract button/action candidates.

Implementation target:
- Detect `ActionRow`, `<button`, `onClick`, `handle*`, `onSubmit`, `downloadCsvFile`, `openPrintDocument`, `fetch(`, and known action helper usage.
- Output columns: role, workspace, label, source file, handler, backend call hint, status.
- Include the 26 command-center files and 317 current matrix rows as the starting baseline.

- [x] Step 3: Add a failing test for API/service/model/test coverage mapping.

Expected sections:
- `## Workflow Backend Contract Inventory`
- `## Automated Test Coverage Inventory`
- `## Report And Print Inventory`

- [x] Step 4: Implement coverage mapping.

Implementation target:
- Map controller routes from decorators.
- Map service/repository file names by module.
- Map test files by matching module/workspace keywords.
- Mark unknown rows `DISCOVERED_NOT_VERIFIED`, not pass.

- [x] Step 5: Run verification.

```powershell
npm run readiness:school-inventory
node --test scripts/generate-school-readiness-inventory.test.mjs
npm run typecheck
```

- [x] Step 6: Update ledger.

Record:
- Newly discovered P0/P1 items.
- Inventory limitations.
- Commands and pass/fail.

---

## Milestone 2: Golden Path Test Harness

**Purpose:** Prove school activation can be tested repeatedly without production data or real provider side effects.

**Files:**
- Create: `apps/api/src/modules/platform/school-activation-golden-path.test.ts`
- Create/modify helpers in `apps/api/src/test-support/` if an equivalent folder exists; otherwise use existing module test fixture patterns.
- Modify: `apps/api/src/modules/platform/platform-onboarding.service.ts`
- Modify: `apps/api/src/auth/tenant-invitations.service.ts`
- Modify: `docs/SCHOOL_READINESS_WORK_LEDGER.md`

- [x] Step 1: Write failing API test for clean school creation.

Acceptance:
- Creating a school creates only required school/platform records.
- No Kisumu/demo students, parents, invoices, exams, library, health, or staff leak into the new school.
- First principal invitation is school-scoped.
- Demo seed scripts cannot run against a non-demo tenant or a tenant whose metadata is not explicitly marked for demo seeding.
- The test records the current absence of `prisma/migrations` as a schema-drift risk unless production migration evidence is supplied elsewhere.

- [x] Step 2: Run targeted test and confirm failure or missing coverage.

```powershell
npm run build
node --test dist/apps/api/src/modules/platform/school-activation-golden-path.test.js
```

- [ ] Step 3: Implement or repair service behavior.

Acceptance:
- Tenant/school IDs are generated and bound once.
- Initial principal membership is pending until invite acceptance.
- Demo data seeding is impossible unless the explicit demo seed command is used.

- [ ] Step 4: Add duplicate-invite and wrong-email tests.

Acceptance:
- Duplicate principal/staff invite updates/resends safely or rejects cleanly.
- Acceptance validates token, email, school, role, status, and expiry.

- [ ] Step 5: Verify.

```powershell
npm run typecheck
npm run test
```

---

## Milestone 3: Principal School Setup Becomes The Operational Gate

**Purpose:** Principal should know what to do next and every setup action should open a real workspace.

**Files:**
- Modify: `apps/web/src/components/school/principal-command-center.tsx`
- Modify: `apps/web/src/components/school/school-pages.tsx`
- Modify/add: `apps/web/tests/design/principal-production-readiness.test.tsx`
- Inspect/modify: `apps/api/src/modules/admin-command/principal-insights.service.ts`

- [x] Step 1: Add tests for every activation checklist action.

Acceptance:
- `Confirm enabled modules` opens module/status guidance.
- `Create academic foundation` opens academics.
- `Invite staff` opens users/invitations.
- `Admit learners` opens admissions/parents-visitors.
- `Configure fees` opens fees.
- `Start registers` opens attendance.
- `Configure exams` opens exams/report cards.
- `Generate reports` opens reports.

- [x] Step 2: Implement missing route/action handlers.

Acceptance:
- No toast-only action.
- Every activation action changes workspace or opens a real export/print/report path.

- [x] Step 3: Add dependency-specific empty states.

Acceptance:
- Fresh school shows “what is missing, why it matters, next action”.
- No generic “No records found” without a next action.

- [x] Step 4: Verify.

```powershell
npm --prefix apps/web run test:design -- --runTestsByPath tests/design/principal-production-readiness.test.tsx
npm --prefix apps/web run build
```

---

## Milestone 4: Academic Foundation And Teacher Allocation

**Purpose:** Admissions, timetable, attendance, exams, and teacher dashboards depend on real classes, streams, subjects, terms, and allocations.

**Files:**
- Inspect/modify: `apps/api/src/modules/academics/academics.controller.ts`
- Inspect/modify: `apps/api/src/modules/academics/academics.service.ts`
- Inspect/modify: `apps/api/src/modules/admin-command/deputy-command.controller.ts`
- Inspect/modify: `apps/web/src/components/school/deputy-principal-command-center.tsx`
- Inspect/modify: `apps/web/src/components/school/hod-command-center.tsx`
- Inspect/modify: `apps/web/src/components/school/teacher-command-center.tsx`
- Tests: `apps/api/src/modules/academics/academics.test.ts`, web design tests for deputy/HOD/teacher.

- [ ] Step 1: Write failing tests for school-specific academic setup.

Acceptance:
- Create academic year.
- Create term.
- Create class/grade/form.
- Create stream.
- Create subject/learning area.
- Create department.
- Assign HOD/class teacher/subject teacher.
- All records are school-scoped.

- [ ] Step 2: Repair backend validations.

Acceptance:
- Subject dropdowns in admissions/exams/teacher screens come from current school setup.
- No hardcoded Kisumu/demo classes or subjects in real schools.
- Disabled module routes are blocked in frontend and API.

- [ ] Step 3: Repair UI flows.

Acceptance:
- Deputy/Principal can create the academic foundation.
- HOD can review department teacher allocations.
- Teacher sees only assigned classes/subjects unless leadership teaching duty grants teacher capability.

- [ ] Step 4: Verify.

```powershell
npm run typecheck
npm run test -- --grep academics
npm --prefix apps/web run test:design -- teacher
```

If grep-style filtering is unsupported, run the exact matching test files discovered in the repo.

---

## Milestone 5: Invitations, Roles, Memberships, And Correct Redirects

**Purpose:** Fix the flows that previously produced invalid/expired token, wrong school dashboard, and demo school leakage symptoms.

**Files:**
- Inspect/modify: `apps/api/src/auth/tenant-invitations.service.ts`
- Inspect/modify: `apps/api/src/auth/auth.controller.ts`
- Inspect/modify: `apps/api/src/modules/platform/platform-onboarding.service.ts`
- Inspect/modify: `apps/web/src/app/invite/accept/*` or equivalent invite route files.
- Inspect/modify: `apps/web/src/components/school/principal-command-center.tsx`
- Tests: auth invitation tests, platform onboarding tests, invite accept web tests.

- [x] Step 1: Add failing tests for invite lifecycle.

Acceptance:
- Fresh token works once.
- Expired token fails with clear message.
- Wrong email fails.
- Already accepted token fails truthfully.
- Resend generates/uses a valid latest token and email link.
- User lands on correct school and role dashboard.

- [x] Step 2: Repair backend and frontend state alignment.

Acceptance:
- UI does not show email failure if provider accepted the email.
- Email queued/sent/delivered states are not conflated.
- Resend invite performs a real resend or returns a truthful blocked reason.

- [x] Step 3: Verify.

```powershell
npm run typecheck
npm run test
```

Manual follow-up:
- Execute MGV-01 and MGV-02 after deployment with real Gmail accounts.

---

## Milestone 6: Admissions To Active Student

**Purpose:** Replace empty admissions workspaces with a guided flow from enquiry to active student and parent link.

**Files:**
- Modify: `apps/web/src/components/school/admissions-dashboard/*`
- Inspect/modify: `apps/api/src/modules/admissions/admissions.controller.ts`
- Inspect/modify: `apps/api/src/modules/admissions/admissions.service.ts`
- Inspect/modify: `apps/api/src/modules/students/student-lifecycle.controller.ts`
- Inspect/modify: `apps/api/src/modules/students/**`
- Tests: `apps/api/src/modules/admissions/*.test.ts`, web admissions design tests.

- [ ] Step 1: Add tests for the stage sequence.

Acceptance:
- Enquiry -> application -> document check -> interview/selection -> fee clearance -> class placement -> enrolment -> parent link -> active student.
- Each stage blocks missing dependencies with a clear error.
- Class applying dropdown is school-specific from academic setup.

- [ ] Step 2: Implement missing first-action empty states.

Acceptance:
- Each empty workspace has a primary action.
- No “No records found” without start action.

- [ ] Step 3: Wire persistence and refresh.

Acceptance:
- Submitting each stage persists and refreshes the next workspace.
- Parent linking creates only school-scoped guardian relationships.

- [ ] Step 4: Verify.

```powershell
npm run typecheck
npm --prefix apps/web run test:design -- admissions
npm run test
```

Manual follow-up:
- Execute MGV-03 after deployment.

---

## Milestone 7: Finance Billing, Receipts, Statements, And Parent Visibility

**Purpose:** Make the superadmin/principal/accountant billing and fee workflows operational and visible after changes.

**Files:**
- Inspect/modify: `apps/api/src/modules/billing/billing.controller.ts`
- Inspect/modify: `apps/api/src/modules/billing/**`
- Inspect/modify: `apps/api/src/modules/tenant-finance/**`
- Inspect/modify: `apps/web/src/components/school/accountant-command-center.tsx`
- Inspect/modify: Super Admin schools UI files under `apps/web/src/components/**superadmin**` or discovered routes.
- Tests: billing API tests, finance integrity tests, web finance design tests.

- [x] Step 1: Add failing tests for billing status update.

Acceptance:
- Super Admin set billing status persists.
- UI reflects the changed billing status after mutation.
- Mutation is tenant/school-scoped and audited.

- [ ] Step 2: Add failing tests for fee setup to receipt.

Acceptance:
- Fee structure exists before invoice.
- Invoice produces balance.
- Payment allocates to invoice.
- Receipt preview/download exists.
- Parent balance sees only linked child.

- [ ] Step 3: Repair UI and API.

Acceptance:
- No internal server error on billing status changes.
- No fake success if provider/payment state is only queued.

- [ ] Step 4: Verify.

```powershell
npm run typecheck
npm run test:billing-correctness
npm run test:finance-integrity
npm --prefix apps/web run test:design -- finance
```

Manual follow-up:
- Execute MGV-05 after deployment.

---

## Milestone 8: Teacher Daily Workflows And Better Marks UX

**Purpose:** Teacher dashboard must render the new dashboard and provide useful daily workflows, especially marks/exams.

**Files:**
- Modify: `apps/web/src/components/school/teacher-command-center.tsx`
- Modify: `apps/web/src/components/school/teacher-dashboard/exams-marks-workspace.tsx`
- Modify: `apps/web/src/components/school/teacher-dashboard/*`
- Inspect/modify: `apps/api/src/modules/admin-command/teacher-command.controller.ts`
- Inspect/modify: `apps/api/src/modules/exams/**`
- Tests: teacher dashboard design tests, exams API tests.

- [ ] Step 1: Add failing tests for teacher dashboard route rendering.

Acceptance:
- `/school/teacher` renders the new teacher command center.
- Sidebar items open unique workable workspaces.

- [ ] Step 2: Add failing tests for teacher marks workflow.

Acceptance:
- Teacher sees assigned exam/subject/class only.
- Missing setup gives dependency guidance.
- Marks entry validates score range, absent status, comments, and duplicate submit.
- Save draft and submit are distinct.

- [ ] Step 3: Improve marks UI.

Acceptance:
- Dense mark grid.
- Keyboard-friendly entry.
- Missing marks filter.
- Import/template path where supported.
- Submission summary and errors per learner.

- [ ] Step 4: Verify.

```powershell
npm --prefix apps/web run test:design -- teacher
npm run test -- --grep exams
npm run typecheck
```

---

## Milestone 9: Exams, Moderation, Report Cards, And Publication

**Purpose:** Complete the critical academic reporting chain.

**Files:**
- Modify: `apps/web/src/components/school/exams-manager-command-center.tsx`
- Modify: exams manager workspace files under `apps/web/src/components/school/exams-manager*` if present.
- Inspect/modify: `apps/api/src/modules/exams/**`
- Inspect/modify: report-card modules under `apps/api/src/modules/**report**`
- Tests: exams API tests, report artifact tests, web exams manager tests.

- [ ] Step 1: Add failing tests for fresh-school empty exams.

Acceptance:
- Fresh school has no fake exam data.
- Exam setup workspace gives first action.

- [ ] Step 2: Add failing tests for exam lifecycle.

Acceptance:
- Create exam cycle.
- Add subjects/components/grading.
- Schedule timetable.
- Open mark entry window.
- Teacher submits marks.
- HOD/Dean moderates.
- Exams Manager validates.
- Principal approves/publishes where required.
- Parent/student portal sees only published results.

- [ ] Step 3: Repair buttons/forms/actions.

Acceptance:
- Publish, generate report cards, export, print, import template, rollback import all have real behavior or truthful blocked state.

- [ ] Step 4: Verify.

```powershell
npm run test8_exam_cycle
npm run test -- --grep exams
npm --prefix apps/web run test:design -- exams
npm run typecheck
```

Manual follow-up:
- Execute MGV-07 after deployment.

---

## Milestone 10: Operational Modules First Complete Workflow

**Purpose:** Every enabled operational module must have one usable first workflow, not just a dashboard shell.

**Modules and owners:**
- Library: Librarian
- Health/Sick Bay: Nurse
- Inventory/Stores: Storekeeper
- Security/Visitors: Security Officer/Secretary
- Discipline: Discipline Master
- Counselling: Counsellor
- Boarding: Boarding Master
- Transport: Transport Manager
- Laboratory: Laboratory Technician

**Files:**
- Modify corresponding `apps/web/src/components/school/*-command-center.tsx`
- Inspect/modify corresponding `apps/api/src/modules/{library,clinic,inventory,visitors,discipline,boarding,transport,labs,counselling}/**`
- Tests under matching module test files.

- [ ] Step 1: For each module, write one failing “first workflow” test.

Acceptance examples:
- Library: add book/copy -> issue -> return -> slip/report.
- Health: add medicine batch -> visit -> dispense -> stock movement -> alert if urgent.
- Inventory: receive stock -> request -> approve -> issue -> stock ledger.
- Security: check in visitor -> pass -> leadership/secretary visibility -> checkout.
- Discipline: log incident -> action/referral -> parent contact/report -> close.
- Counselling: referral -> appointment -> session -> confidential note -> safe status.
- Boarding: dorm/bed -> assignment -> roll call -> exeat -> return.
- Transport: route/vehicle/driver -> student assignment -> trip -> parent visibility.
- Lab: add apparatus/chemical -> issue/return -> damage/safety report.

- [ ] Step 2: Implement missing backend contracts.

Acceptance:
- Tenant and permission guards.
- Validation.
- Transaction.
- Audit/event.
- Notification where required.
- Report/print path where required.

- [ ] Step 3: Implement missing UI states.

Acceptance:
- Search/filter/list/table.
- Primary action.
- Row action.
- Empty/loading/error/success.
- Mobile usable layout.

- [ ] Step 4: Verify each module.

```powershell
npm run typecheck
npm run test
npm --prefix apps/web run test:design -- library
npm --prefix apps/web run test:design -- transport
```

Add exact module-specific commands as discovered.

---

## Milestone 11: Parent And Student Portal Confidentiality

**Purpose:** Portals must expose only linked, authorized, published information.

**Files:**
- Inspect/modify: `apps/api/src/modules/parent-portal/**`
- Inspect/modify: `apps/api/src/modules/students/student-portal*.ts`
- Inspect/modify: `apps/web/src/app/portal/**`, `apps/web/src/app/parent/**`, `apps/web/src/app/student/**` or discovered portal routes.
- Tests: parent/student portal API tests and web tests.

- [ ] Step 1: Add failing confidentiality tests.

Acceptance:
- Parent sees only linked children.
- Student sees only self.
- Unpublished marks are hidden.
- Confidential counselling/medical/internal discipline/finance controls are hidden.
- Cross-tenant IDs are denied.

- [ ] Step 2: Repair API queries and frontend rendering.

Acceptance:
- No route/query/body ID bypass.
- Published-only filters are server-side.

- [ ] Step 3: Verify.

```powershell
npm run typecheck
npm run test
npm --prefix apps/web run test:design -- portal
```

Manual follow-up:
- Execute MGV-14.

---

## Milestone 12: Reports, Documents, Downloads, And Print Truth

**Purpose:** Replace toast-only “printed/generated” behavior with real preview/download/print/queued artifact paths.

**Files:**
- Inspect/modify: `apps/api/src/common/reports/**`
- Inspect/modify: `apps/web/src/lib/**report**`, `apps/web/src/components/**report**`, command centers using report/print actions.
- Tests: report artifact tests already listed in root `npm test`.

- [x] Step 1: Add inventory test for report/print actions.

Acceptance:
- Matrix lists report/print action candidates and whether they call preview/download/print/queue.

- [ ] Step 2: Add workflow tests for required documents.

Documents:
- Fee receipt, fee statement, invoice, report card, admission letter, student list, attendance report, library slip, visitor pass, stock issue slip, stocktake report, boarding roll call, exeat, discipline letter, transport report, health report, academic analytics, management report, audit report.

- [ ] Step 3: Repair missing output paths.

Acceptance:
- Each action produces preview, download, browser print, generated file, or observable queued job.
- No success toast without output.

- [ ] Step 4: Verify.

```powershell
npm run test
npm run release:readiness
```

---

## Milestone 13: External Providers, Background Jobs, And Observability

**Purpose:** Email/SMS/M-Pesa/job states must be truthful, retryable, and observable.

**Files:**
- Inspect/modify email/auth delivery services.
- Inspect/modify SMS integration modules.
- Inspect/modify M-Pesa/payment callback modules.
- Inspect/modify workflow/queue/event modules.
- Inspect/modify System Monitor dashboard files.

- [ ] Step 1: Add provider-state tests.

Acceptance:
- Queued is not delivered.
- Provider accepted is not user clicked.
- Failed has retry path.
- Duplicate callback is idempotent.
- Secrets are redacted.
- Tenant association is preserved.

- [ ] Step 2: Repair System Monitor visibility.

Acceptance:
- Failed jobs, provider failures, retry queues, event processing, and callback failures are visible and actionable.

- [ ] Step 3: Verify.

```powershell
npm run smoke:providers
npm run test:mpesa-adversarial
npm run test:mpesa-network-conditions
npm run ops:incident-drill
```

Only run real-provider paths when credentials and sandbox/live safety are confirmed.

---

## Milestone 14: Mobile And Accessibility Gate

**Purpose:** Critical office workflows must work at common mobile widths.

**Files:**
- Add/modify Playwright tests under existing E2E/design E2E locations.
- Modify affected dashboard CSS/layouts in role command centers.

- [ ] Step 1: Add mobile viewport tests.

Critical routes:
- Principal School Setup
- Users & Invitations
- Admissions first learner
- Finance billing/receipt
- Teacher marks
- Exams Manager publish/report cards
- Parent portal child view

- [ ] Step 2: Fix layout blockers.

Acceptance:
- No overlapping controls.
- Tables convert to cards or scroll intentionally.
- Modals fit.
- Buttons are touch-sized.
- Validation errors are visible.

- [ ] Step 3: Add accessibility checks where current stack supports them.

Acceptance:
- Labels on form fields.
- Focus order.
- Keyboard operation.
- Usable contrast.

- [ ] Step 4: Verify.

```powershell
npm run web:test:design:e2e
npm run web:build
```

---

## Milestone 15: Production Smoke And Manual Gmail Verification

**Purpose:** Convert manual scripts from `NOT_YET_MANUALLY_VERIFIED` to evidence-backed statuses without exposing secrets or real student data.

**Files:**
- Update: `docs/MANUAL_GMAIL_VERIFICATION_SCRIPTS.md`
- Update: `docs/SCHOOL_READINESS_WORK_LEDGER.md`
- Add screenshots only if repository policy allows storing sanitized screenshots; otherwise record external evidence references.

- [ ] Step 1: Run deployed smoke checks after latest deployment.

Minimum routes:
- `/superadmin/login`
- `/superadmin/schools`
- `/invite/accept`
- `/school/principal`
- `/school/principal/setup-checklist`
- `/school/admissions`
- `/school/teacher`
- `/school/exams-manager`
- parent/student portal login and published result route.

- [ ] Step 2: Collect sanitized hosted deployment evidence.

Acceptance:
- Vercel deployment URL, status, commit, and route smoke result are recorded without secrets.
- Railway API, SMS relay, malware scanner, and worker logs are checked for boot errors after deploy.
- Any provider failure includes status code, provider request id if safe, and retry state, not raw credentials or full tokens.

Suggested commands:

```powershell
npm run smoke:providers
npm run smoke:production-auth
npm run monitor:synthetic
```

- [ ] Step 3: Execute manual Gmail scripts MGV-01 through MGV-16.

Acceptance:
- Mark only human-executed scripts `VERIFIED_MANUALLY`.
- Keep blocked ones `BLOCKED_BY_CONFIGURATION`.
- Log defects with screenshots/provider IDs where safe.

- [ ] Step 4: Verify no secrets/tokens are committed.

```powershell
npm run security:pii-scan
npm run security:scan
```

---

## Milestone 16: Final Release Gate And Readiness Rating

**Purpose:** Produce an honest final readiness rating.

**Files:**
- Update: `docs/SCHOOL_READINESS_WORK_LEDGER.md`
- Update/generated: scorecards/security/validation docs
- Optional create: `docs/GO_LIVE_READINESS_REPORT.md`

- [x] Step 1: Run full automated gate.

```powershell
npm run ci:full
```

- [ ] Step 2: Run production smoke after deployment if authorized.

```powershell
npm run smoke:production-auth
npm run monitor:synthetic
```

- [ ] Step 3: Assign final rating.

Allowed ratings:
- `GOOD TO GO`
- `GOOD TO GO WITH WARNINGS`
- `NOT READY`

Current expected rating before manual/provider verification: `NOT READY` for final go-live claim, despite strong automated CI evidence, because manual Gmail/provider and end-to-end deployed school activation remain unverified.

- [ ] Step 4: Final response evidence checklist.

Report:
- Branch/worktree.
- Commands and results.
- Fixed defects.
- Remaining P0/P1/P2/P3.
- Manual Gmail/provider status.
- Deployment status.
- Final rating.

---

## Priority Order

1. Milestone 0: baseline inspection hardening.
2. Milestone 1: inventory work queue.
3. Milestone 5: invitations, tokens, redirects, no wrong-school landing.
4. Milestone 4: academic foundation and teacher allocation.
5. Milestone 6: admissions to active student and guardians.
6. Milestone 7: finance billing to receipt.
7. Milestone 9: exams to published report card.
8. Milestone 11: parent/student portal confidentiality.
9. Milestone 10: operational modules first workflows.
10. Milestone 12: reports and print truth.
11. Milestone 13: providers/jobs/observability.
12. Milestone 14: mobile/accessibility.
13. Milestone 15 and 16: production/manual verification and rating.

## Commit Strategy

- Commit after each milestone when its tests pass and the ledger is updated.
- Suggested messages:
  - `Expand readiness action inventory`
  - `Harden school invitation golden path`
  - `Complete academic setup dependencies`
  - `Wire admissions activation flow`
  - `Harden finance billing workflow`
  - `Complete exam publication workflow`
  - `Protect portal publication visibility`
  - `Complete operational module first workflows`
  - `Verify report and print outputs`
  - `Add production smoke evidence`

## Verification Matrix

Run before final go-live claim:

```powershell
npm run readiness:school-inventory
node --test scripts/generate-school-readiness-inventory.test.mjs
npm run typecheck
npm run web:build
npm run test
npm run ci:full
```

Run when external credentials and deployment access are available:

```powershell
npm run smoke:providers
npm run smoke:production-auth
npm run monitor:synthetic
```

Run before final manual readiness signoff:

```powershell
SUPPORT_PROVIDER_SMOKE_LIVE=true npm run smoke:providers
npm run scorecard:production
```

Manual:
- Execute all scripts in `docs/MANUAL_GMAIL_VERIFICATION_SCRIPTS.md`.
- Record only verified facts.
- Keep unexecuted scripts `NOT_YET_MANUALLY_VERIFIED`.
