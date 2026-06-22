# BRIEFING — 2026-06-22T07:18:46Z

## Mission
Refactor sync-queue.ts to implement a non-destructive database upgrade, tenant safety validation, data migration, and tenant safety checks during removal.

## 🔒 My Identity
- Archetype: Worker Gen 2
- Roles: implementer, qa, specialist
- Working directory: c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\teamwork_preview_worker_m3_1_gen2
- Original parent: 17193dff-4fc6-473e-bbb0-4fbf5e1efe88
- Milestone: Milestone 3 (Offline Sync & Tenant Safety)

## 🔒 Key Constraints
- CODE_ONLY network mode.
- Strict tenant safety (never allow cross-school operations or unsafe records).
- All changes must be verified via testing and clean build.

## Current Parent
- Conversation ID: 17193dff-4fc6-473e-bbb0-4fbf5e1efe88
- Updated: 2026-06-22T07:18:46Z

## Task Summary
- **What to build**: Non-destructive upgrade in `apps/web/src/lib/offline/sync-queue.ts` including conditional index creation, validation, cursor-based data migration (deleting records missing valid `schoolId`, initializing missing `type` field to `'mutation'`), and tenant safety checks in `removeRecord`.
- **Success criteria**: All design tests pass (especially `offline-db-challenge.test.tsx`), build is clean.
- **Interface contracts**: c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\orchestrator_pillars\SCOPE_M3.md
- **Code layout**: apps/web/src/lib/offline/sync-queue.ts

## Key Decisions Made
- Use conditional checks for object store and index existence during DB upgrade.
- Perform cursor-based iteration of the store using indexedDB transaction in upgrade handler.

## Artifact Index
- c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\teamwork_preview_worker_m3_1_gen2\progress.md — Heartbeat progress tracking
- c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\teamwork_preview_worker_m3_1_gen2\ORIGINAL_REQUEST.md — Archive of the original request
- c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\teamwork_preview_worker_m3_1_gen2\handoff.md — Handoff report of completed task
