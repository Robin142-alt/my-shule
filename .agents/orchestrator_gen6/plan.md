# Plan - Phase 2: Integrity Remediation

This plan coordinates the Swarm/Team to replace 9 facade controllers and restore the test integrity of `exams.test.ts`.

## Step 1: Exploration and Gap Analysis
- Spawn `teamwork_preview_explorer` to:
  1. Find the 9 controllers (Exams, Academics, Billing, Boarding, Clinic, Communication, Timetable, Transport, and Secretary) under `apps/api/src`.
  2. Locate `apps/api/src/modules/exams/exams.test.ts`.
  3. Extract current code from these files, identifying the exact stub patterns (e.g. `return { items: [] }` or `return []`).
  4. Examine the Prisma schema (`prisma/schema.prisma`) to determine what tables and relations exist for these domains.
  5. Detail the correct query structure (enforcing `schoolId`) and expected behavior.
  6. Deliver a handoff report at `.agents/explorer_1/handoff.md`.

## Step 2: Milestone Decomposition and PROJECT.md Creation
- Based on Explorer's findings, decompose the work into milestones (grouped by controller domains to balance dependencies and complexity).
- Write `PROJECT.md` specifying:
  - Architecture and layout
  - Milestones with dependency mapping
  - Interface contracts (Prisma fields, DTO models)
  - Code layout

## Step 3: Implement Facade Replacement
- Spawn `teamwork_preview_worker` agents to implement Prisma-backed business logic for each controller domain.
- Enforce strict tenant isolation (`schoolId`).
- Trigger event emissions or updates as required.

## Step 4: Restore Test Integrity
- Spawn a `teamwork_preview_worker` to refactor `apps/api/src/modules/exams/exams.test.ts`.
- Ensure it uses actual production NestJS services or real database mock services rather than synthetic arrays.

## Step 5: Verification & Audit
- Run Reviewers, Challengers, and Forensic Auditor to ensure:
  - Build succeeds.
  - No stubs remain.
  - Tests pass with integrity.
  - All database queries enforce `schoolId`.
