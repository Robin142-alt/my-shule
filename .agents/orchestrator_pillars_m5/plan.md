# Execution Plan — Phase 5 Feature Pillars

## Step 1: Centralized Heartbeat Cron Setup
- [ ] Set up the heartbeat cron.
- [ ] Align `PROJECT.md` at the project root outlining the current plan and details.

## Step 2: Milestone 1 — Core Approval Workflow Engine (Backend & Integration)
- [ ] Delegate task to a specialized worker to:
  - Integrate `ApprovalsService.enforceApprovalRule` in `discipline.service.ts` or `discipline.controller.ts` (sensitive actions: `escalateIncident`, `resolveIncident`, `closeIncident`, `approveAction`).
  - Deprecate old manual bypass endpoints in `discipline.controller.ts` and `finance.controller.ts`.
  - Verify permission checks, tenant scoping, and event publishing/audit logging.
- [ ] Run reviewer verification for approvals.
- [ ] Run challenger / audit checks on approvals.

## Step 3: Milestone 2 — Automated PDF Generation & Frontend Buttons
- [ ] Delegate task to a specialized worker to:
  - Implement NestJS controller `ReportCardDownloadController` in `report-card-download.controller.ts` and register in `exams.module.ts`.
  - Stream PDF blob with `Content-Type: application/pdf`.
  - Wire frontend "Download PDF" buttons in `export.ts` to call backend PDF download endpoint.
- [ ] Run reviewer verification.

## Step 4: Milestone 3 — Offline Sync
- [ ] Delegate task to a specialized worker to:
  - Implement NestJS controller endpoint `@Post('sync/flush')` in `sync.controller.ts` and register in `sync.module.ts`.
  - Implement client-side `sync-flush.ts` loop on reconnect and wire event listeners in `sync-queue.ts`.
- [ ] Run reviewer verification.

## Step 5: Milestone 4 — E2E Tenant Security Test Suite (Playwright)
- [ ] Delegate task to a specialized worker to:
  - Create `playwright.config.ts`.
  - Create Playwright E2E isolation test cases (`tests/e2e/tenant-isolation.spec.ts`).
- [ ] Run E2E test execution and verify all tests pass.

## Step 6: Global Quality Gate & Forensic Audit
- [ ] Run full project compilation checks (`npm run build`).
- [ ] Run the Forensic Auditor subagent to ensure clean code structure and no facades.
- [ ] Perform human reporting and handoff.
