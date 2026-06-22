# plan.md — 2026-06-20T21:06:31+03:00

## Mission
Remediate all tenant isolation, event architecture, API routing, and UI completeness gaps identified in the MyShule optimization audit report (`myshule_optimization_audit.md`).

## Decomposition & Milestones

### Milestone 1: Database Schema & Indexing
- Update `prisma/schema.prisma` to add `schoolId`/`tenant_id` to the `RolePermission` join table.
- Add missing `@@index([schoolId])` and `@@index([tenant_id])` annotations across all tenant-scoped tables identified in the audit (Academics module, and legacy/phase 7 models lines 3718-6632).
- Run Prisma validation and run database migrations/generation.

### Milestone 2: Backend Tenant Isolation & Security
- Secure controller/service/consumer query paths to enforce `school_id`/`tenant_id` context filtering.
- Specific fixes:
  - `student-lifecycle.service.ts` exit clearance check.
  - `dispense-medicine.consumer.ts` medicine stock depletion.
  - `issue-stock.consumer.ts` stock issuing isolation.
  - `record-payment.consumer.ts` payment posting on foreign invoices.
  - `secretary.controller.ts` queue ticket manipulation.
  - `support.controller.ts` discipline case status tampering & counselling session status.
- Ensure proper RLS context execution boundaries where needed.

### Milestone 3: Proxy Routes Alignment & Event Architecture
- Align Next.js proxy route paths with NestJS backend controllers:
  - Resolve `/api/student/dashboard` 404 (proxy mapping to `/student`).
  - Resolve `/api/parent/dashboard` 404 (proxy mapping to `/parent`).
  - Resolve `/api/academics` singular vs plural routing paths.
  - Align Secretary front-office commands (singular vs plural actions for visitors/appointments, mail/dispatch route alignment).
- Refactor Event Outbox metadata schema & emissions:
  - Fix mixed scoping IDs (ensure consistent tenant/school context).
  - Move `actor_user_id` and `actor_role` to top-level fields.
  - Add `source_dashboard` and `correlation_id` fields.
  - Implement missing event outbox emissions in Exams (marks submission, report card publishing), HR (staff invitations/activations), Counselling (session/referrals), Boarding/Assets (CRUD/simple operations), and Procurement workflows.

### Milestone 4: UI Completeness, Forms, & Workflows
- Replace raw browser `prompt()` calls with validated React modals in:
  - Storekeeper workspace (`damaged-missing-workspace.tsx`, `items-workspace.tsx`, `requests-workspace.tsx`, `stocktake-workspace.tsx`).
  - Admin staff records (`admin/staff-records-workspace.tsx`).
  - Deputy timetable relief (`timetable-relief-workspace.tsx`).
  - Exams moderation (`moderation-workspace.tsx`).
  - Medicine stock adjustment (`medicine-inventory-workspace.tsx`).
- Connect hardcoded dashboards to live database queries: Nurse Command Center, Discipline Master workspace, Student activity dashboard.
- Wire up dead setup buttons (e.g. `exam-calendar-workspace.tsx`, bulk invoicing in `invoices-workspace.tsx`).
- Uncomment backend API request in `exams-reports-workspace.tsx` for exam cycle creation.
- Implement WiFi/Sync status indicator in Class Teacher dashboard and replace fake success messages with proper queued feedback.
- Replace fake print overlays and `window.print()` tricks with real backend PDF Blob downloads (Reports Center, Print overlay, Report Card preview).

### Milestone 5: Verification & Audit Gating
- Verify backend build (`npm run build` in `apps/api`).
- Verify frontend build (`npm run build` in `apps/web`).
- Verify all unit and integration tests.
- Run Forensic Audit check to confirm clean status and zero integrity violations.
- Document and report completion to the Sentinel.
