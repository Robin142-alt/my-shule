# Project Plan - MyShule Platform Optimization

This plan addresses all requirements in `ORIGINAL_REQUEST.md` (R1, R2, R3, R4) by remediating the vulnerabilities and workflow gaps identified in `myshule_optimization_audit.md`.

## Milestones

### Milestone 1: Database Schema and Indexing (R1)
* Add `schoolId` or `tenant_id` to the `RolePermission` model in `prisma/schema.prisma`.
* Scan the database schema for all tenant-scoped tables that are queried or filtered by `schoolId` or `tenant_id`.
* Add missing `@@index([schoolId])` and `@@index([tenant_id])` annotations across the schema, especially the Academics module (Phase 5) and the 100+ tables in Phase 7 and legacy modules.
* Run schema validation and database migrations.
* **Verification**: `npx prisma validate` passes successfully.

### Milestone 2: Backend Tenant Isolation (R2)
* Refactor NestJS controllers, services, and consumers to assert that all queries and mutations verify ownership using the context's `school_id`/`tenant_id`.
* Remediate target endpoints:
  * Student Exit Clearance validation in `student-lifecycle.service.ts`.
  * Medicine Dispensing inventory check in `dispense-medicine.consumer.ts`.
  * Stock Issuing verification in `issue-stock.consumer.ts`.
  * Payment Posting on foreign invoices verification in `record-payment.consumer.ts`.
  * Reception ticket manipulation verification in `secretary.controller.ts`.
  * Discipline incident reports check in `support.controller.ts`.
  * Counselling sessions raw SQL scope modification in `support.controller.ts`.
* Ensure that any request using a mismatched/foreign tenant ID fails with a forbidden or unauthorized error.
* **Verification**: API tests verify mismatched/foreign school_id updates are strictly rejected.

### Milestone 3: API Routing Rewrite and Event Outbox (R3)
* Fix routing path mismatches between Next.js front-end proxy (`apps/web/src/app/api/[...path]/route.ts`) and NestJS backend controllers:
  * Align `/api/student/dashboard` rewrite target path.
  * Align `/api/parent/dashboard` rewrite target path.
  * Correct the academics pluralization `/academics` to `/academic`.
  * Align front-office paths `/visitor` -> `/visitors`, `/appointment` -> `/appointments`, `/mail` -> `/dispatch` or matching mappings.
* Align custom outbox event schema fields (`source_dashboard`, `correlation_id` top-level integration).
* Wire up missing transactional outbox event emissions via `EventPublisherService`:
  * Marks submission in Exams & Class Teacher services.
  * Report card publishing in `exams.service.ts`.
  * Staff invitation/roles actions in `hr.service.ts`.
  * Counselling referrals actions in `counselling.service.ts`.
  * CRUD operations inheriting from `SimpleOperationsService` (Boarding, Assets, etc.).
  * Procurement workflows in `procurement.service.ts`.
* **Verification**: Next.js proxy routes respond with standard 200/401 codes instead of 404. Event Outbox records are generated for all mutations.

### Milestone 4: Frontend UI Completeness and Workflows (R4)
* Replace raw browser `prompt()` windows with structured custom React modals (using validation logic) in Storekeeper, Admin, Deputy, Exams, and Medicine Inventory workspaces.
* Wire hardcoded dashboards to live database hook calls:
  * Nurse Command Center (pull from clinic visit hooks).
  * Discipline Master workspaces.
  * Student Command Center (pull from student detail/marks hooks).
* Wire up dead buttons (Exams calendar setup sync/export/add).
* Enable live submission for commented out POST requests (Principal exam setup).
* Add topbar sync/connectivity indicators in Class Teacher command center.
* Update offline discipline workspace alerts to indicate queued status instead of premature success.
* Replace fake PDF print overrides and alerts with actual backend PDF Blob file downloads in reports-workspace and exam-module-screen.
* **Verification**: Code review verifies zero occurrences of `window.prompt()`. PDF download buttons perform actual blob downloads.

### Milestone 5: E2E Verification & Victory Audit
* Build the application packages successfully.
* Run full verification tests.
* Execute Forensic Auditor (`teamwork_preview_auditor`) checks to verify strict tenant isolation and platform integrity.
* **Verification**: 100% clean audit verdict and passing builds/tests.
