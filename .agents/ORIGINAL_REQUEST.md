# Original User Request

## Initial Request — 2026-06-17T20:55:07+03:00

Operationalize the remaining ~130 placeholder workspaces across the MyShule platform, replacing static mockups with fully functional React components wired to real NestJS backend APIs.

Working directory: `C:\Users\user\Desktop\PROJECTS\Shule hub`
Integrity mode: demo

## Requirements

### R1. Replace Frontend Placeholders
Convert all remaining `*workspace.tsx` files that currently render a `DocxOperationalWorkspace` placeholder into fully functional workspaces. Use existing UI components like `DataTable`, `MetricGrid`, `Modal`, and `StatusPill`.

### R2. Implement Full-Stack Workflows
If a workspace requires a backend API endpoint that doesn't exist yet, implement the corresponding NestJS controller, service, and database logic. Ensure data is persisted and queried correctly.

### R3. Adhere to the Agent Governance Protocol (AGP)
Ensure all workflows have valid permissions checks, respect tenant isolation (`tenantSlug`), and do not use fake success states. Mutations must trigger `queryClient.invalidateQueries` to synchronize UI.

## Acceptance Criteria

### Compilation & Build
- [ ] Running `npm run build` in `apps/web` completes without TypeScript errors.
- [ ] Running the NestJS build completes without errors.

### Workflow Verification
- [ ] Every modified workspace component successfully fetches data from a backend endpoint on mount without throwing a 404.
- [ ] Submitting a form or triggering an action in a modified workspace successfully executes a real backend mutation and updates the database.
- [ ] Tenant scoping (`tenantSlug`) is strictly enforced on every backend query and mutation created.

## Follow-up — 2026-06-18T08:32:47Z

Verify that the entire MyShule system (frontend React workspaces, backend NestJS API endpoints, and database models/schema) is 100% operational and fully wired end-to-end. Generate a detailed audit report identifying any missing backend controllers or database schema definitions required by the frontend workspaces.

Working directory: `C:\Users\user\Desktop\PROJECTS\Shule hub`
Integrity mode: development

## Requirements

### R1. Frontend-to-Backend Contract Audit
Analyze all `useSchoolQuery`, `useQuery`, and `fetch` hooks in the frontend (`apps/web/src/components`) to extract every expected backend API endpoint.

### R2. Backend Implementation Audit
Check the backend codebase (`apps/api` or equivalent) to verify whether a corresponding NestJS controller and service method exists for each endpoint extracted in R1. Do not write or implement missing backend code; only report the gaps.

### R3. Database Schema Audit
For all implemented backend services, verify that the required database tables and multi-tenant columns (e.g., `tenantId`, `school_id`) exist in the database schema (Prisma/TypeORM/SQL). Identify any missing schema definitions.

## Acceptance Criteria

### Verification Checks
- [ ] An objective, programmatic script or methodical agent sweep is used to extract the frontend endpoints.
- [ ] A final `system_audit_report.md` artifact is produced detailing:
    - Endpoints that exist and are fully wired.
    - Endpoints expected by the frontend but missing in the backend.
    - Missing database schema components required by existing backend services.
- [ ] The team uses an automated cross-referencing approach (static analysis, regex matching, or running test queries) rather than just making assumptions.

## Follow-up — 2026-06-18T20:01:22Z

The project goal is to identify all remaining incomplete or stubbed features across the MyShule system (frontend React workspaces, backend NestJS endpoints, and database schema) and fully implement them to make the system 100% production-ready.

Working directory: `C:\Users\user\Desktop\PROJECTS\Shule hub`
Integrity mode: development

## Requirements

### R1. System Gaps Audit
Audit the codebase to identify what is missing. This includes stubbed frontend components (e.g., buttons with no actions, unhandled APIs), missing backend controller implementations (e.g., endpoints returning empty arrays/objects), and database schema gaps for core entities.

### R2. Feature Implementation
Implement real Prisma-backed business logic for all missing backend endpoints and wire them correctly to the frontend components. Ensure proper tenant isolation (`school_id`), role-based permissions, and event emissions as per the AGP (Agent Governance Protocol).

### R3. E2E Build and Type Verification
Ensure that both the backend (`apps/api`) and frontend (`apps/web`) compile successfully with no TypeScript or Next.js build errors. 

## Acceptance Criteria

### Comprehensive Completion
- [ ] A final report is generated listing exactly which modules/features were identified as incomplete and successfully implemented.
- [ ] No remaining endpoints in the `apps/api` controllers are returning hardcoded `{ items: [], metrics: {} }` stubs where real data is expected.

### Programmatic Verification
- [ ] `npm run build` succeeds in the `apps/api` workspace without any compilation or TypeScript errors.
- [ ] `npm run build` succeeds in the `apps/web` workspace without any compilation or Next.js errors.

## Follow-up — 2026-06-19T08:14:35Z

# Teamwork Project Prompt — Phase 2: Integrity Remediation

> Status: Step 9 — Ready for launch — awaiting user approval
> Goal: Fix the remaining facade controllers discovered by the forensic audit.

The project goal is to remediate the "facade" implementations discovered by the forensic audit in the MyShule backend. The previous teamwork agents successfully wired the missing 16 administrative roles and passed all frontend/backend compile checks. However, 9 existing controllers were found to be returning hardcoded stubs (e.g., `{ items: [] }`), and the `exams.test.ts` file was rewritten to pass synthetically.

Working directory: `C:\Users\user\Desktop\PROJECTS\Shule hub`
Integrity mode: development

## Requirements

### R1. Facade Replacement
Locate the 9 backend controllers flagged by the audit for returning empty stubs (Exams, Academics, Billing, Boarding, Clinic, Communication, Timetable, Transport, and Secretary). Replace all `return { items: [] }` and `return []` stubs with real Prisma-backed business logic. All database queries must enforce tenant isolation (`schoolId`).

### R2. Test Integrity Restoration
Fix the "self-certifying" test inside `apps/api/src/modules/exams/exams.test.ts`. Restore the production service verification assertions so that the test runs actual production code for the HOD Marks Review workflow instead of pushing to a fake array.

## Acceptance Criteria

### Comprehensive Completion
- [ ] A final scan confirms that no endpoints in the 9 specified controllers return hardcoded `{ items: [] }` or `[]`.
- [ ] `exams.test.ts` executes actual production services and asserts on real database state or mock service responses, rather than a standalone string array.

### Programmatic Verification
- [ ] `npm run build` succeeds in the `apps/api` workspace without any compilation or TypeScript errors.
- [ ] (Note: The `apps/web` build has already succeeded in the previous phase).

## Follow-up — 2026-06-19T13:03:22+03:00

# Teamwork Project Prompt — Phase 3: Deep Remediation

> Status: Launched
> Goal: Eliminate ALL remaining 88 backend stubs and fix frontend gaps

The system audit uncovered 73 pure facade stubs and 15 silent error fallbacks that were missed by Phase 2. The worst offender is `admin-command.controller.ts` with 32 fake endpoints, followed by a completely fake `auth.controller.ts` duplicate (12 stubs), and a non-functional parent portal (6 stubs). This phase will permanently close every remaining gap.

Working directory: `C:\Users\user\Desktop\PROJECTS\Shule hub`
Integrity mode: development

## Requirements

### R1. Admin-Command Controller Remediation (32 stubs)
Replace all 32 facade stubs in `apps/api/src/modules/admin-command/admin-command.controller.ts` with real Prisma-backed business logic. This controller currently pretends to handle finance (fee categories, invoices, payments, expenses), front office (visitors, appointments, mail dispatch), inventory (receive stock, issue items), transport (routes, maintenance), library (issue, add, return books), clinic (visits), academics (teacher assignments, interventions, marks lock/return, department meetings), boarding (bed assignment, roll call, incidents), exams (cycles, marks lock/return), communication (announcements), reports (categories), and bulk import. Every POST endpoint currently returns `{ success: true }` without persisting anything. Every GET endpoint returns `{ items: [] }`. The bulk import returns fake `rowsProcessed: 10`. All must be wired to real database operations, tenant-scoped by `schoolId`.

### R2. Duplicate Auth Controller Removal or Wiring (12 stubs)
The file `apps/api/src/modules/auth/auth.controller.ts` is entirely fake — it returns mock tokens and empty arrays. A real auth controller exists at `apps/api/src/auth/auth.controller.ts` using Supabase. Either delete the duplicate and redirect routes to the real auth controller, or wire the duplicate to delegate to the real auth service. Do not leave fake login/logout/token endpoints in the codebase.

### R3. Parent Portal Remediation (6 stubs)
Replace all 6 facade stubs across `parent-portal.controller.ts` (5 stubs: overview, academics, finance, communication, dashboard) and `parent-portal-children.controller.ts` (1 stub: getChildren) with real Prisma queries that fetch actual parent/student data scoped to the authenticated parent's linked children and school.

### R4. Clinic, Library, Labs, and Remaining Module Stubs (20 stubs)
Replace all remaining stubs across:
- `clinic.service.ts` — 6 facade stubs (emergencies, referrals, sick bay queue) + fix 2 silent error fallbacks
- `library.controller.ts` + `library.service.ts` — 6 stubs (returns, departments, visits, requests, reports, notices)
- `labs.controller.ts` — 4 stubs (dashboard, inventory, requests, issues)
- `dashboard.controller.ts` — 1 stub (getSummary)
- `discipline.controller.ts` — 1 stub (getCases)
- `grade-master.controller.ts` — 1 stub (getOverview)
- `operational-workflow-dispatcher.controller.ts` — 1 stub (getOfflineSync)
- `attendance-mark.controller.ts` — 1 stub (markAttendance)
- `sms.controller.ts` — 1 stub (sendSms — at minimum queue the message in the database)
- `parent-portal-actions.controller.ts` — 1 stub (payFees)

### R5. Error Fallback Remediation (15 fallbacks)
Fix the 13 silent error fallbacks in `academic.controller.ts` (12) and `academics.controller.ts` (1) that swallow errors and return `{ items: [] }`. These methods already attempt real Prisma calls but catch errors silently. Replace silent catches with proper error logging and meaningful error responses.

### R6. Frontend Dead Button Fix
Fix the empty `onClick={() => {}}` on the "Bulk invoicing" button in `apps/web/src/components/school/accountant/invoices-workspace.tsx` (line 938). Wire it to a real bulk invoicing action or show a "not yet configured" modal.

## Acceptance Criteria

### Comprehensive Completion
- [ ] A grep for `return { items: [] }` in `apps/api/src/modules/` returns zero results that are pure facade stubs (error fallbacks with proper logging are acceptable).
- [ ] A grep for `return { success: true }` in `admin-command.controller.ts` returns zero results where no database persistence occurs.
- [ ] No endpoint in the codebase returns `'mock-token'`, `'mock-csrf'`, or `'mock-refresh'`.
- [ ] No endpoint returns fake `rowsProcessed` counts.

### Programmatic Verification
- [ ] `npm run build` succeeds in the `apps/api` workspace without any compilation or TypeScript errors.
- [ ] `npm run build` succeeds in the `apps/web` workspace without any compilation or Next.js errors.

## Follow-up — 2026-06-19T15:30:27Z

The goal is to implement real domain logic for the 930+ empty event consumers across the MyShule backend, ensuring all event-driven workflows complete successfully without silent failures.

Working directory: `C:\Users\user\Desktop\PROJECTS\Shule hub`
Integrity mode: development

## Requirements

### R1. Consumer Implementation
Audit all `.consumer.ts` files across `apps/api/src/modules/` that contain `TODO: Implement domain logic`. Replace the empty stubs with real Prisma database operations and domain logic based on the event payload. 

### R2. Prioritization and Safety
Because there are over 930 consumers, prioritize implementing the most critical workflows first (Admissions, Finance, Discipline, Exams, Boarding). For any low-priority consumers that cannot be fully implemented, log the event safely using the `StructuredLoggerService` instead of leaving a silent `TODO` comment, ensuring they don't crash or swallow context.

### R3. Tenant Isolation
Ensure every implemented consumer strictly enforces tenant isolation. All database writes must be scoped to the `schoolId` provided in the event payload.

## Acceptance Criteria

### Comprehensive Completion
- [ ] No `.consumer.ts` file is left with a silent `TODO: Implement domain logic` comment without at least proper logging.
- [ ] Critical workflows (Admissions, Finance, Discipline) have real database persistence in their consumers.

### Programmatic Verification
- [ ] `npm run build` succeeds in the `apps/api` workspace without any compilation or TypeScript errors after all consumers are modified.
