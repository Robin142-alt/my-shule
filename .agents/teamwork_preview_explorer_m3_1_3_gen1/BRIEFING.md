# BRIEFING — 2026-06-22T07:18:00Z

## Mission
Investigate destructive IndexedDB migration in sync-queue.ts and propose a non-destructive upgrade path.

## 🔒 My Identity
- Archetype: explorer
- Roles: Teamwork explorer, Read-only investigator
- Working directory: c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\teamwork_preview_explorer_m3_1_3_gen1
- Original parent: 3c7d36f2-0f68-4692-af15-78453d497df9
- Milestone: Milestone 3.1

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Analyze sync-queue.ts and proposed non-destructive IndexedDB migration.

## Current Parent
- Conversation ID: 3c7d36f2-0f68-4692-af15-78453d497df9
- Updated: 2026-06-22T07:18:00Z

## Investigation State
- **Explored paths**:
  - `apps/web/src/lib/offline/sync-queue.ts` (the target file)
  - `apps/web/src/lib/offline/use-offline-mutation.ts` (offline hook)
  - `apps/web/src/components/sync/SyncCenter.tsx` (sync center UI)
  - `apps/web/tests/design/offline-db-challenge.test.tsx` (database migration test)
  - `apps/web/tests/design/offline-validation.test.tsx` (offline validation test)
  - `apps/web/tests/design/offline.test.tsx` (offline UI test)
  - `apps/api/src/modules/sync/sync.controller.ts` (backend controller)
  - `apps/api/src/modules/sync/sync.service.ts` (backend service)
- **Key findings**:
  - Confirmed that the database migration upgrade handler in `sync-queue.ts` version 2 is destructive because it deletes the entire `sync_queue` object store.
  - Ran `npm run web:test:design tests/design/offline-db-challenge.test.tsx` and reproduced the exact test failure indicating data loss.
  - Formulated a non-destructive upgrade strategy checking for object store and index existence using `transaction.objectStore` and `store.indexNames.contains()`.
- **Unexplored areas**:
  - No unexplored areas needed for this scope.

## Key Decisions Made
- Propose a non-destructive database upgrade utilizing the `transaction.objectStore` and `store.indexNames.contains()` API from IndexedDB/`idb`.
- Created a patch file `sync-queue.patch` inside the agent folder.

## Artifact Index
- c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\teamwork_preview_explorer_m3_1_3_gen1\handoff.md — Handoff report and proposed changes
- c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\teamwork_preview_explorer_m3_1_3_gen1\sync-queue.patch — Precise git patch file for sync-queue.ts
