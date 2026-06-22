# Execution Plan — Phase 5 Feature Pillars

## Step 1: Initial Investigation & Planning
- [ ] Set up the heartbeat cron.
- [ ] Create the `PROJECT.md` file at the project root outlining the architecture, milestones, and interface contracts.
- [ ] Spawn an Explorer to audit the codebase for:
  - Existing Prisma schema, DB setup, and where to inject approval rules.
  - Existing PDF printing or layout code in frontend & backend.
  - Existing offline sync structure or components.
  - Existing testing frameworks (Playwright, Cypress, Jest, etc.).

## Step 2: Milestone 1 — Core Approval Workflow Engine (Backend & Integration)
- [ ] Update `prisma/schema.prisma` with tables for approvals: `ApprovalRequest`, `ApprovalEscalation`, etc.
- [ ] Run Prisma migrations/generate client.
- [ ] Implement backend NestJS controller, services, validation rules, events, and audit logs.
- [ ] Wire backend approvals to sensitive workflows: fee waivers and discipline incidents.
- [ ] Verify that permissions and tenant scoping are strictly enforced.

## Step 3: Milestone 2 — Automated PDF Generation
- [ ] Set up a robust backend PDF generator (e.g. using Puppeteer, PDFKit, or an existing backend PDF engine in NestJS).
- [ ] Design and implement API endpoints returning PDF blobs for report cards, invoices, and receipts.
- [ ] Connect the frontend "Download PDF" buttons to fetch the backend PDF blobs instead of triggering `window.print()` or raw browser overlays.
- [ ] Verify formatting and layout correctness.

## Step 4: Milestone 3 — Offline Sync Engine
- [ ] Implement local-first database/synchronization engine on the frontend (IndexedDB / dexie / localforage / Service Workers).
- [ ] Add offline queue mechanics and UI indicators ("queued", "synced") in the workspace views.
- [ ] Integrate with the NestJS backend to automatically sync queued data on network restore without duplicates.
- [ ] Verify sync functionality under simulated offline scenarios.

## Step 5: Milestone 5 — E2E Tenant Security Test Suite (E2E Test Track)
- [ ] Setup Playwright/Cypress for E2E testing.
- [ ] Write robust test cases validating tenant isolation boundaries (e.g. cross-tenant API requests and UI access prevention).
- [ ] Wire up `npm run test:e2e` in `package.json`.
- [ ] Verify all E2E tests run and pass.

## Step 6: Global Quality Gate & Forensic Audit
- [ ] Run full project compilation checks (`npm run build`).
- [ ] Run the Forensic Auditor subagent to ensure clean code structure and no facades.
- [ ] Perform human reporting and handoff.
