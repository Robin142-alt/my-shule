# Plan - Phase 3: Deep Remediation

This plan outlines the steps to eliminate the remaining 88 backend stubs, fix 15 silent error fallbacks, and remediate the frontend dead button in the invoices workspace.

## Milestones

| Milestone | Target | Description | Status |
|---|---|---|---|
| **M1** | Admin-Command Controller | Remediate all 32 stubs in `admin-command.controller.ts` to execute real Prisma queries scoped by `schoolId`. | DONE |
| **M2** | Auth & Parent Portal | Remove/delegate fake auth controller (12 stubs) and remediate Parent Portal controllers (6 stubs). | PLANNED |
| **M3** | Clinic, Library, Labs & Others | Remediate 20 stubs across Clinic, Library, Labs, Dashboard, Discipline, Grade Master, Operational Workflow, Attendance Mark, SMS, and Parent Portal Actions. | PLANNED |
| **M4** | Error Fallbacks & Frontend | Remediate 15 silent error fallbacks in Academics controllers, and fix the "Bulk invoicing" dead button. | PLANNED |
| **M5** | E2E Compilation & Verification | Build and run verification checks on both `apps/api` and `apps/web`, run Forensic Audit. | PLANNED |

## Detailed Milestone Execution

### Milestone 1: Admin-Command Controller (32 stubs)
- Target: `apps/api/src/modules/admin-command/admin-command.controller.ts`
- Scope: Wire 32 endpoints (POST returns `{ success: true }` after db persistence, GET returns database queries, bulk import handles DB updates and real row counts).
- Verification: Grep search showing no unpersisted mocks or hardcoded return statements.

### Milestone 2: Auth & Parent Portal (18 stubs total)
- Target: `apps/api/src/modules/auth/auth.controller.ts`, `apps/api/src/modules/parent-portal/parent-portal.controller.ts`, `apps/api/src/modules/parent-portal/parent-portal-children.controller.ts`.
- Scope: 
  - Delete or delegate fake `auth.controller.ts` (redirect/delegate to real `auth.controller.ts` in `src/auth/`).
  - Wire parent portal controllers to query children and school data scoped to the authenticated parent's ID.
- Verification: Clean compile, check database connections.

### Milestone 3: Remaining Module Stubs (20 stubs)
- Target:
  - `clinic.service.ts` (6 stubs)
  - `library.controller.ts` + `library.service.ts` (6 stubs)
  - `labs.controller.ts` (4 stubs)
  - `dashboard.controller.ts` (1 stub)
  - `discipline.controller.ts` (1 stub)
  - `grade-master.controller.ts` (1 stub)
  - `operational-workflow-dispatcher.controller.ts` (1 stub)
  - `attendance-mark.controller.ts` (1 stub)
  - `sms.controller.ts` (1 stub)
  - `parent-portal-actions.controller.ts` (1 stub)
- Scope: Replace stubs with Prisma queries ensuring `schoolId`/`tenant_id` check.

### Milestone 4: Error Fallbacks & Frontend
- Target:
  - `academic.controller.ts` (12 fallbacks)
  - `academics.controller.ts` (1 fallback)
  - `apps/web/src/components/school/accountant/invoices-workspace.tsx`
- Scope: Replace silent catches with proper log statements and error throwing, and wire the Bulk Invoicing button.

### Milestone 5: E2E Compilation & Verification
- Scope: Run backend and frontend builds, execute forensic audits, verify zero pure stubs in controllers.
