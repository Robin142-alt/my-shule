# progress.md

## Current Status
Last visited: 2026-06-20T22:10:00+03:00

## Iteration Status
Current iteration: 1 / 32

## Tasks Checklist
- [x] M1: Database Schema and Indexing
  - [x] Add `schoolId`/`tenant_id` to `RolePermission` model
  - [x] Add missing indexes across 100+ tables
  - [x] Run Prisma validation & database verification
- [/] M2: Backend Tenant Isolation & Security
  - [ ] Fix Student clearance exit context validation
  - [ ] Fix Medicine stock depletion context validation
  - [ ] Fix Stock issuing context validation
  - [ ] Fix Payment posting context validation
  - [ ] Fix Secretary queue tickets context validation
  - [ ] Fix Discipline case status context validation
  - [ ] Fix Counselling sessions context validation
- [/] M3: API Proxy Routing & Event Architecture
  - [ ] Fix student & parent portal proxy 404 paths
  - [ ] Align academics singular/plural controller paths
  - [ ] Align Secretary front-office plural/singular actions & mail paths
  - [ ] Refactor Event Outbox metadata structure (top-level actor details, source_dashboard, correlation_id)
  - [ ] Implement missing event outbox emissions (Exams, HR, Counselling, Simple CRUD, Procurement)
- [/] M4: UI Completeness, Forms, & Workflows
  - [ ] Replace `prompt()` with validated React modals
  - [ ] Connect hardcoded dashboards (Nurse, Discipline, Student) to dynamic API queries
  - [ ] Wire up dead dashboard/setup buttons & uncomment exam cycles API call
  - [ ] Add WiFi/Sync offline queue indicators to Class Teacher command center
  - [ ] Replace fake print overlays and print downloads with actual backend PDF downloads
- [ ] M5: E2E Verification & Audit Gate
  - [ ] Run backend and frontend builds
  - [ ] Run programmatic tests
  - [ ] Execute Forensic Auditor verification
  - [ ] Generate final handoff report
