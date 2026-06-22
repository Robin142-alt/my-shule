# Original User Request

## Initial Request — 2026-06-20T22:36:56+03:00

Implement comprehensive fixes for all the critical vulnerabilities and workflow gaps identified in the MyShule `myshule_optimization_audit.md` report.

Working directory: c:\Users\user\Desktop\PROJECTS\Shule hub
Integrity mode: development

## Requirements

### R1. Database Schema and Indexing
Update `prisma/schema.prisma` to add `school_id` / `tenant_id` to the `RolePermission` join table. Add missing `@@index([schoolId])` and `@@index([tenant_id])` annotations across all tenant-scoped tables identified in the audit.

### R2. Backend Tenant Isolation
Secure all NestJS controllers, services, and consumers (e.g., `StudentLifecycleService`, `SupportController`, `IssueStockConsumer`) to strictly enforce `school_id` / `tenant_id` checks during queries and mutations, preventing cross-tenant data leaks.

### R3. API Routing and Event Architecture
Fix the proxy route mismatches between the Next.js API routes and the NestJS backend (e.g., fixing `404` errors for student, parent, and secretary portals). Implement missing event outbox emissions in Exams, HR, Counselling, and operations services using `EventPublisherService`.

### R4. Frontend UI and Workflow Completeness
Replace all raw browser `prompt()` calls in workspaces with validated React modals. Connect hardcoded dashboards (Nurse, Discipline) to live database queries. Wire up dead buttons, fix deceptive offline sync messages, and replace the fake "Print overlay" downloads with actual backend PDF Blob downloads.

## Acceptance Criteria

### Backend Verification
- [ ] Running `npx prisma validate` passes successfully without errors.
- [ ] A programmatic test or independent agent verifies that a request using a foreign `school_id` to modify data (like stock or discipline cases) fails with an authorization error.
- [ ] Next.js proxy API routes (like `/api/student/dashboard` and `/api/academics`) return valid responses (200 OK or 401 Unauthorized) instead of 404 Not Found.

### Frontend Verification
- [ ] An independent Agent-as-Judge verifies that `window.prompt` is no longer used in any of the identified workspace files (Storekeeper, Admin, Exams).
- [ ] An independent Agent-as-Judge verifies that "Download PDF" buttons trigger a backend file download rather than `window.print()`.

## Follow-up — 2026-06-21T20:33:09Z

Build out the four major feature pillars for MyShule: a robust Offline Sync engine, a centralized Approval workflow engine, automated PDF generation for reports, and a comprehensive E2E test suite to safeguard tenant isolation.

Working directory: c:\Users\user\Desktop\PROJECTS\Shule hub
Integrity mode: development

## Requirements

### R1. Offline Sync Engine
Implement local-first offline synchronization logic on the frontend (utilizing IndexedDB or service workers). Ensure proper UI indicators display truthful "queued" and "synced" statuses, and that data syncs accurately without duplication when connectivity is restored.

### R2. Core Approval Workflow Engine
Build a centralized backend approval engine to handle requests, escalations, and status tracking (e.g., PENDING, APPROVED, REJECTED) for sensitive actions like fee waivers and discipline cases.

### R3. Automated PDF Generation
Replace frontend browser print dialogs by implementing a robust backend PDF generator (e.g., using Puppeteer, PDFKit, or an equivalent tool) capable of producing branded report cards, invoices, and fee receipts dynamically.

### R4. E2E Tenant Security Test Suite
Write a comprehensive End-to-End (E2E) test suite (e.g., using Cypress or Playwright) that automatically validates the strict tenant isolation boundaries, ensuring a user in School A can never read or modify School B's data.

## Acceptance Criteria

### Verification
- [ ] Offline actions show a truthful queued UI state, and an independent Agent-as-Judge verifies that records sync successfully on network restore without duplication.
- [ ] Programmatic API tests confirm that the Approval Engine correctly handles state transitions (PENDING -> APPROVED/REJECTED) and logs the approver's details.
- [ ] Clicking "Download PDF" for a Report Card or Receipt triggers a backend API call that returns a valid `application/pdf` Blob.
- [ ] The new E2E test suite executes successfully via a standard `package.json` script (e.g., `npm run test:e2e`) with zero failures.
