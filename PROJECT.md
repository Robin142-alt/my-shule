# Project: MyShule Phase 5 Feature Pillars

This project builds out the four major feature pillars for MyShule: a robust Offline Sync engine, a centralized Approval workflow engine, automated PDF generation for reports, and a comprehensive E2E test suite to safeguard tenant isolation.

## Architecture
- **Frontend**: Next.js React app under `apps/web`
- **Backend**: NestJS API app under `apps/api`
- **Database ORM**: Prisma (`prisma/schema.prisma`)
- **Multi-tenancy Isolation**: Enforced via `schoolId` (native Prisma models) or `tenant_id` (raw SQL programmatically generated tables).

## Code Layout
- Frontend Workspaces: `apps/web/src/components/school/`
- Frontend Proxy Routes: `apps/web/src/app/api/[...path]/route.ts`
- Backend Controllers: `apps/api/src/modules/<module>/<module>.controller.ts`
- Backend Services: `apps/api/src/modules/<module>/<module>.service.ts`
- Backend Consumers: `apps/api/src/modules/<module>/consumers/`
- Event Publisher: `apps/api/src/modules/events/event-publisher.service.ts`
- Prisma Schema: `prisma/schema.prisma`

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Core Approval Workflow Engine | Backend schema updates, Approval engine controller and service, integration with sensitive actions (fee waivers, discipline cases), audit log and event emission. | None | IN_PROGRESS (Sub-orch ID: `0816a235-d9ec-4629-b149-c1610ab58135`) |
| 2 | Automated PDF Generation | Backend service (e.g. Puppeteer, PDFKit), controller endpoints returning PDF Blobs, frontend "Download PDF" connection. | None | IN_PROGRESS (Sub-orch ID: `ce426969-d404-41c5-ac6a-c053593b0c16`) |
| 3 | Offline Sync Engine | Frontend local-first sync via IndexedDB, sync status UI queue and indicator, automatic sync on restore, backend sync handlers. | None | IN_PROGRESS (Sub-orch ID: `c6b3ecd2-0eb6-4a1b-97e8-88c69c5d2c0a`) |
| 4 | E2E Tenant Security Test Suite | E2E test suite (Playwright or Cypress) validating strict isolation boundaries, run via `npm run test:e2e` script. | M1, M2, M3 | IN_PROGRESS (Sub-orch ID: `1f190169-5f97-4eee-b600-52d243ca71e2`) |


## Interface Contracts

### 1. Centralized Approval Workflow Engine
- **Models**:
  - `ApprovalRequest`: `id`, `schoolId`, `requesterId`, `approverId`, `status` (PENDING, APPROVED, REJECTED, ESCALATED), `entityType`, `entityId`, `details` (JSON), `createdAt`, `updatedAt`
  - `ApprovalEscalation`: `id`, `requestId`, `escalatedToId`, `reason`, `createdAt`
- **Endpoints**:
  - `POST /api/approvals/request` — Create an approval request
  - `GET /api/approvals/pending` — List pending requests for logged-in user (role-aware)
  - `POST /api/approvals/:id/approve` — Approve a request (with audit logs & event emission)
  - `POST /api/approvals/:id/reject` — Reject a request
  - `POST /api/approvals/:id/escalate` — Escalate a request

### 2. Automated PDF Generation
- **Endpoints**:
  - `GET /api/print/report-card/:studentId/:termId` — Generates and downloads report card PDF.
  - `GET /api/print/invoice/:invoiceId` — Generates and downloads invoice PDF.
  - `GET /api/print/receipt/:receiptId` — Generates and downloads fee receipt PDF.
- Response header: `Content-Type: application/pdf`, `Content-Disposition: attachment; filename=...`

### 3. Offline Sync Engine
- **Frontend Sync**:
  - Store offline actions (e.g. attendance marking, stock issue, discipline reports) in IndexedDB.
  - Synchronize automatically on network recovery or via a "Sync Now" button.
  - Indicators: "Queued" count and "Synced" status.
- **Backend Sync Endpoint**:
  - `POST /api/offline-sync/sync` — Bulk batch processing of queued actions.

### 4. E2E Tenant Security Test Suite
- Standard execution command: `npm run test:e2e`
- Validate that:
  - User of School A attempting to access `/api/student/dashboard` with School B's headers gets blocked (403/401/404).
  - User of School A attempting to modify/read records of School B gets unauthorized.
