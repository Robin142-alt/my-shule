# Progress Tracking

## Current Status
Last visited: 2026-06-20T23:59:00+03:00

### Milestone 1: Database Schema and Indexing (R1)
- [x] Add `schoolId` or `tenant_id` to `RolePermission` model in schema.prisma (Done)
- [x] Add missing index annotations `@@index([schoolId])` / `@@index([tenant_id])` in schema.prisma (Done)
- [x] Run schema validation and database migrations (Done)

### Milestone 2: Backend Tenant Isolation (R2)
- [x] Implement ownership assertion checks on Student Exit Clearance (Done)
- [x] Implement ownership checks on Medicine Dispensing stock changes (Done)
- [x] Implement isolation checks on Stock Issuing item lookups (Done)
- [x] Implement isolation checks on Payment Posting invoice validations (Done)
- [x] Implement isolation checks on Secretary Queue tickets updates (Done)
- [x] Implement isolation checks on Discipline Case status updates (Done)
- [x] Implement isolation checks on Counselling Session raw SQL updates (Done)

### Milestone 3: API Routing Rewrite and Event Outbox (R3)
- [x] Resolve API proxy route mismatches in Next.js router (Done)
- [x] Align event schema fields (source_dashboard, correlation_id) (Done)
- [x] Implement outbox event emissions for Marks Submission (Done)
- [x] Implement outbox event emissions for Report Card Publishing (Done)
- [x] Implement outbox event emissions for HR / Staff operations (Done)
- [x] Implement outbox event emissions for Counselling sessions (Done)
- [x] Implement outbox event emissions for simple operations CRUD (Done)
- [x] Implement outbox event emissions for Procurement workflows (Done)

### Milestone 4: Frontend UI Completeness and Workflows (R4)
- [x] Replace raw `prompt()` calls with React modals across workspaces (Done)
- [x] Wire hardcoded dashboards (Nurse, Discipline, Student) to dynamic hooks (Done)
- [x] Wire dead buttons in Exams Manager workspace (Done)
- [x] Uncomment and enable Principal exam cycle setup api calls (Done)
- [x] Add WiFi / Sync indicator to Class Teacher Topbar (Done)
- [x] Correct offline discipline incident alerts (Done)
- [x] Implement actual PDF Blob downloads for Reports and Exam modules (Done)

### Milestone 5: E2E Verification & Victory Audit
- [x] Run compilation, build validation checks (Done)
- [x] Perform Forensic Audit check to confirm integrity and isolation (Done)

## Iteration Status
Current iteration: 3 / 32
Spawn count: 14 / 16
