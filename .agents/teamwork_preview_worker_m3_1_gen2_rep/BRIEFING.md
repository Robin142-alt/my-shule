# BRIEFING — 2026-06-22T08:17:00Z

## Mission
Refactor sync-queue offline DB code to ensure non-destructive upgrades, tenant safety validation during data migration, and tenant safety verification on record removal.

## 🔒 My Identity
- Archetype: Worker Gen 2 Replacement
- Roles: implementer, qa, specialist
- Working directory: c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\teamwork_preview_worker_m3_1_gen2_rep
- Original parent: 4ff5dea3-667f-4a4a-9259-c136317e6319
- Milestone: M3 (Offline Sync & Tenant Safety)

## 🔒 Key Constraints
- CODE_ONLY network mode: no external HTTP client/curl/wget calls.
- Follow minimum change principle, no unrelated refactoring.
- Multi-tenant boundary verification: strictly enforce schoolId isolation.
- Every state change or mutation must remain school-scoped.

## Current Parent
- Conversation ID: 4ff5dea3-667f-4a4a-9259-c136317e6319
- Updated: not yet

## Task Summary
- **What to build**: Non-destructive version 2 DB upgrade handler with conditionally created indexes in IndexedDB, tenant validation and data migration for oldVersion < 2 records, and a tenant safety check in `removeRecord(id)` before deletion.
- **Success criteria**: Pass `npm run web:test:design -- offline-db-challenge.test.tsx`, clean build, no typescript errors.
- **Interface contracts**: apps/web/src/lib/offline/sync-queue.ts
- **Code layout**: apps/web/src/lib/offline/

## Key Decisions Made
- Use transactions and cursors carefully within IDB upgrade context.
- Assert tenant safety on record removal by loading the record first.

## Artifact Index
- apps/web/src/lib/offline/sync-queue.ts — Main target file
- handoff.md — Final handoff report

## Change Tracker
- **Files modified**: apps/web/src/lib/offline/sync-queue.ts (Implemented IndexedDB V2 upgrade check, migration logic, and removeRecord tenant safety assertion)
- **Build status**: PASS (typescript typecheck and tests pass cleanly)
- **Pending issues**: None

## Quality Status
- **Build/test result**: PASS (4/4 tests passed successfully in offline-db-challenge.test.tsx)
- **Lint status**: 0 outstanding violations
- **Tests added/modified**: Covered by existing test suite in offline-db-challenge.test.tsx
