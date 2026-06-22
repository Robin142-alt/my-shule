# BRIEFING — 2026-06-21T23:59:09+03:00

## Mission
Analyze client-side IndexedDB sync_queue schema and propose a unified IndexedDB sync_queue schema in apps/web/src/lib/offline/sync-queue.ts.

## 🔒 My Identity
- Archetype: Explorer
- Roles: Schema Auditor
- Working directory: c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\explorer_m3_1_1
- Original parent: c6b3ecd2-0eb6-4a1b-97e8-88c69c5d2c0a
- Milestone: M3 Offline Sync Schema Design

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Multi-tenant school isolation: schema must enforce schoolId/tenant scoping.
- Do not write code changes outside of own agent folder.

## Current Parent
- Conversation ID: c6b3ecd2-0eb6-4a1b-97e8-88c69c5d2c0a
- Updated: 2026-06-21T23:59:09+03:00

## Investigation State
- **Explored paths**:
  - `apps/web/src/lib/offline/sync-queue.ts` (IndexedDB schema definition & API)
  - `apps/web/src/lib/offline/use-offline-mutation.ts` (React Query integration hook)
  - `apps/web/src/lib/modules/attendance-offline.ts` (Local storage attendance queue)
  - `apps/web/src/lib/workflows/offline-sync-engine.ts` (Workflow sync outbox engine)
  - `apps/api/src/modules/sync/offline-workflow-policy.ts` (Backend policy and sync rules)
  - `apps/web/tests/design/offline.test.tsx` (Test rules for offline behavior)
- **Key findings**:
  - Found 3 disparate offline queues: standard mutation queue (IndexedDB), workflow outbox (IndexedDB), and attendance queue (localStorage).
  - Identified tenant isolation vulnerability in the workflow outbox: it is missing the `schoolId` or `tenantId` field, creating cross-tenant data mix-ups on shared devices.
  - localStorage attendance queue is constrained by size limits and lacks unified status tracking.
- **Unexplored areas**:
  - Specific sync APIs in the backend (beyond offline-workflow-policy.ts).

## Key Decisions Made
- Consolidate all 3 offline queues into a single IndexedDB database (`myshule-offline-db`) and store (`sync_queue`).
- Design `OfflineSyncRecord` to include `type` field ('mutation' | 'workflow' | 'module_specific') and keep `schoolId` mandatory for AGP policy compliance.

## Artifact Index
- `.agents/explorer_m3_1_1/proposed_sync-queue.ts` — Proposal for unified IndexedDB sync_queue schema and API wrapper.
