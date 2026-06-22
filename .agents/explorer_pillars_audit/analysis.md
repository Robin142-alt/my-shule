# Phase 5 Feature Pillars Codebase Audit & Investigation Report

**Date**: 2026-06-22  
**Author**: Teamwork Explorer (explorer_pillars_audit)  

This report provides a detailed codebase audit and analysis of the four feature pillars of Phase 5 of the MyShule platform.

---

## 1. Centralized Approval Workflow

### Schema Modifications in `prisma/schema.prisma`
The database schema for approvals is defined in `prisma/schema.prisma` and includes the following models:
*   **`ApprovalRule`** (lines 1134–1160): Scoped to a school (`schoolId`) and defines requester/approver roles, risk levels, and conditions (e.g. self-approval, escalation, reasons, and attachments required).
*   **`ApprovalRequest`** (lines 2119–2153): Scoped to a school (`schoolId`) and captures approval workflow details including the module, action, target entity type/ID, requester, assigned approver, status, and timeline fields (submitted, approved, rejected, escalated, cancelled).
*   **`ApprovalAuditLog`** (lines 2155–2170): Records every action taken on an approval request (submitted, approved, rejected, escalated) for audit trailing.

### Approvals NestJS Module Wiring (`apps/api/src/modules/approvals`)
The approvals NestJS module is present, fully wired internally, and exported:
*   **`ApprovalsModule`** (`approvals.module.ts`): Registers `ApprovalsService`, `ApprovalsExecutor`, and `ApprovalsCronService`.
*   **`ApprovalsController`** (`approvals.controller.ts`): Exposes API endpoints for managing rules (`GET /rules`, `POST /rules`, `PATCH /rules/:id`) and processing requests (`GET /pending`, `GET /my-requests`, `PATCH /:id/action`). When a request is approved, it calls `this.approvalsExecutor.execute(request.module, request.action, executionContext)` to trigger business logic execution.
*   **`ApprovalsService`** (`approvals.service.ts`): Exposes `enforceApprovalRule(context)` which evaluates whether a request needs an approval flow (`CREATE_APPROVAL_REQUEST`) or can bypass it (`DIRECT_APPLY`).
*   **`ApprovalsExecutor`** (`approvals.executor.ts`): Registers modules and actions (via `registerHandler`) and executes them upon approval.

### Integration with Core Workflows
1.  **Fee Waivers (Wired)**:
    *   `finance.controller.ts` (lines 423–437) imports `ApprovalsService` and invokes `enforceApprovalRule` in `requestWaiver` with module `FINANCE` and action `FEE_WAIVER`.
    *   `finance-approvals.handler.ts` (lines 15–43) registers the handler `FINANCE:FEE_WAIVER`, which executes upon approval by updating the student invoice balances and creating a waiver record in `tenant_pending_waivers`.
2.  **Discipline Cases (Incomplete/Unwired)**:
    *   `discipline-approvals.handler.ts` (lines 15–23) registers a handler for `DISCIPLINE:DISCIPLINE_ACTION` which updates the action status.
    *   **However**, `DisciplineService` and `DisciplineController` do NOT call the approvals service or invoke `enforceApprovalRule`. Discipline actions bypass the centralized approval engine entirely, going straight to `disciplineRepository.approveAction` via manual/old endpoints.

### Deprecation of Manual Bypass Endpoints (Not Deprecated)
Centralized validation is bypassed in several endpoints which remain active and are NOT marked as deprecated:
*   **Fee Waivers**: `@Post('waivers/:id/approve')` in `finance.controller.ts` (lines 474–502) allows direct approval updates in `tenant_pending_waivers` and balance adjustments without routing through `ApprovalsService`.
*   **Discipline**: `@Post('actions/:actionId/approve')` in `discipline.controller.ts` (lines 196–200) allows direct approval of discipline actions, bypassing the approvals engine entirely.

---

## 2. Automated PDF Generation

### PDF Generator Service (Missing)
*   There is **no centralized NestJS service** (e.g. `PdfService` or `PdfGenerator`) registered in the backend providers.
*   Instead, standalone utilities using `pdfkit` are implemented for specific reports:
    *   `apps/api/src/common/reports/report-pdf-artifact.ts` exports `createPdfReportArtifact` to render basic tabular PDFs.
    *   `apps/api/src/modules/exams/services/report-card-pdf-artifact.ts` exports `createReportCardPdfArtifact` to render student report cards.

### Controllers Returning PDF Blobs (Missing)
*   There are **no API controllers or endpoints** implementing raw PDF blob transmission (e.g. returning stream responses with `Content-Type: application/pdf`).
*   The endpoints returning report card downloads (e.g. `/exams/report-cards/download/:token` in `exams.controller.ts`) return JSON metadata/status objects instead of PDF streams.
*   The receipt endpoint (`GET /receipts/:id` in `finance.controller.ts`) only returns JSON data representing the database record.

### Frontend Buttons Connection (Incomplete/Mocked)
*   **Report Cards Workspace** (`report-cards-workspace.tsx`): The "Download All PDFs" button (line 26) and row action "Download PDF" (line 91) do not have `onClick` handlers and are completely dead.
*   **Exams Module Screen** (`exams-module-screen.tsx`): The "Download PDF" button (line 1945) calls `downloadPdf()` which opens a browser-native print preview window using raw HTML and displays a notice instructing the user to "choose 'Save as PDF' in the print dialog."
*   **Parent Portal Workspace** (`portal-pages.tsx`): The "Download PDF" button (line 693) calls `downloadReportCard()` which generates a client-side plain text file (`.txt`) with a list of subjects and marks, rather than downloading a PDF from the server.
*   **Parent Fees Workspace** (`fees-workspace.tsx`): The "Download PDF" button for statements (line 88) does not have any click handler wired.

---

## 3. Offline Sync

### Client-Side Implementation (Wired)
*   **IndexedDB**: Fully implemented in `apps/web/src/lib/offline/sync-queue.ts` via the `idb` package. The class `SyncQueueService` enforces tenant safety (`assertTenantSafety`), validates data via Zod, and registers compound indexes (`by-school-status`).
*   **Service Worker**: **Missing**. No service worker registration code or worker files (e.g., `sw.js`, `service-worker.ts`) exist in the frontend project (`apps/web`).
*   **Sync Center UI**: Implemented in `SyncCenter.tsx` showing counts of pending/failed operations with polling and a "Retry Failed Syncs" action triggering `/api/sync/retry`.

### Backend Implementation (Wired)
*   The sync controller (`sync.controller.ts`) and service (`sync.service.ts`) are fully implemented and expose `/sync/push`, `/sync/pull`, `/sync/devices/register`, `/sync/status`, `/sync/retry`, and `/sync/resolve-conflict`.

### Schema and Database Migration Issues (Critical Drift)
There is a major inconsistency between the tables declared in `prisma/schema.prisma` and the actual SQL tables initialized dynamically by `SyncSchemaService` (in `sync-schema.service.ts`):
1.  **UUID vs Text Type Drift**:
    *   `device_id` and `tenant_id` are defined as `@db.Uuid` (Postgres UUIDs) in the Prisma schema but created as `text` types in raw SQL.
2.  **Primary Key & Column Drift in SyncOperationLogs**:
    *   In Prisma: Primary key is `id` (`@db.Uuid` auto-generated) and there is no `version` column.
    *   In Raw SQL: Primary key is `op_id` (representing the client-side operation UUID) and there is no `id` column. A `version bigint GENERATED ALWAYS AS IDENTITY` column exists.
3.  **Cursor Version Drift**:
    *   `SyncCursors.last_version` is defined as a `String` in Prisma but created as a `bigint` in raw SQL.

**Architectural impact**: Because of this schema drift, the Prisma Client cannot be used to query these tables directly. The repositories (`SyncDevicesRepository`, etc.) must use `$queryRawUnsafe` (via a helper `executeSql`). Furthermore, running a prisma migration (`prisma db push` or `prisma migrate`) will fail, throw errors, or try to drop the custom database configurations, causing severe data loss.

---

## 4. E2E Tenant Security Test

### Playwright E2E Isolation Tests (Missing)
*   There are **no Playwright E2E security tests** designed to verify multi-tenant isolation.
*   The closest Playwright spec is `apps/web/tests/design/experience-separation.spec.ts`. However, this only validates subdomain routing (e.g. checking that a subdomain directs to the correct dashboard template) and asserts that the UI displays a "tenant isolated" badge. It does not attempt to breach boundaries, test auth bypasses, or verify cross-tenant data containment.

### Backend Integration Security Tests (Wired)
*   A robust backend-level tenant isolation test suite is implemented in NestJS at `apps/api/test/tenant-isolation.integration-spec.ts`.
*   It tests that Row Level Security (RLS) is active at the database level, that a tenant cannot read/write/delete another tenant's records, and verifies database-level protection against SQL injection attacks attempting to cross school scopes.
*   This integration test suite is runnable via the project command `npm run test:tenant-isolation`.
