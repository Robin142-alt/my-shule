# BRIEFING — 2026-06-21T23:59:11+03:00

## Mission
Analyze how components like attendance integrate with the standardized IndexedDB sync_queue, adapt attendance-offline to use it, and formulate consolidated payload structures.

## 🔒 My Identity
- Archetype: Queue Integration Designer
- Roles: Explorer 3
- Working directory: c:\Users\user\Desktop\PROJECTS\Shule hub\agents\explorer_m3_1_3
- Original parent: c6b3ecd2-0eb6-4a1b-97e8-88c69c5d2c0a
- Milestone: Queue Integration Design

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Standardized IndexedDB sync_queue integration focus

## Current Parent
- Conversation ID: c6b3ecd2-0eb6-4a1b-97e8-88c69c5d2c0a
- Updated: 2026-06-22T00:15:00+03:00

## Investigation State
- **Explored paths**:
  - `apps/web/src/lib/offline/sync-queue.ts` (Standardized IndexedDB sync queue)
  - `apps/web/src/lib/modules/attendance-offline.ts` (Current localStorage-based attendance sync)
  - `apps/web/src/lib/workflows/offline-sync-engine.ts` (Workflow outbox sync queue)
  - `apps/api/src/modules/sync/sync.service.ts` (Backend NestJS sync controller service)
  - `apps/api/src/modules/sync/conflict-resolvers/attendance-sync-conflict-resolver.service.ts` (Attendance resolver)
  - `apps/web/src/components/school/teacher-dashboard/attendance-workspace.tsx` (Component invoking local storage sync)
  - `apps/web/src/lib/data/class-teacher-hooks.ts` (Class teacher hooks utilizing offline mutations)
- **Key findings**:
  - `attendance-offline.ts` currently uses localStorage to store stream-level bulk attendance lists, bypassing the standard IndexedDB `sync_queue`.
  - The NestJS backend `SyncService` is designed to handle granular student-level operations (`AttendanceSyncPayload`) rather than bulk stream lists.
  - We can integrate attendance either via **Consolidated Bulk Operations** (matching current endpoints) or **Granular Operations** (fully aligned with backend sync schema and conflict resolution).
- **Unexplored areas**:
  - Detailed synchronization behavior of other offline modules like finance and library.

## Key Decisions Made
- Recommend Granular Operations as the primary integration model to ensure last-write-wins safety and zero cross-student data leakage.
- Detail full implementation details for adapting `attendance-offline.ts` to standard `syncQueue` (IndexedDB).

## Artifact Index
- c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\explorer_m3_1_3\handoff.md — Analysis and recommendations
