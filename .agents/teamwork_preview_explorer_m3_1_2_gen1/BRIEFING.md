# BRIEFING — 2026-06-22T07:11:40Z

## Mission
Investigate destructive migration in IndexedDB, propose non-destructive upgrade, and ensure schoolId tenant safety guardrails.

## 🔒 My Identity
- Archetype: Explorer
- Roles: Teamwork Explorer
- Working directory: c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\teamwork_preview_explorer_m3_1_2_gen1
- Original parent: 3c7d36f2-0f68-4692-af15-78453d497df9
- Milestone: Milestone 3.1

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Analyze destructive migration code in apps/web/src/lib/offline/sync-queue.ts
- Review schema constraints and Zod/TypeScript validations
- Propose validations or guardrails for tenant safety (schoolId checks)
- Propose a robust, non-destructive upgrade strategy (compound index `by-school-status` and other missing indexes)
- Do not modify any source code files.

## Current Parent
- Conversation ID: 3c7d36f2-0f68-4692-af15-78453d497df9
- Updated: 2026-06-22T07:17:30Z

## Investigation State
- **Explored paths**:
  - `apps/web/src/lib/offline/sync-queue.ts` (Target File)
  - `apps/web/tests/design/offline-db-challenge.test.tsx` (IndexedDB Migration Tests)
  - `apps/web/src/lib/offline/use-offline-mutation.ts` (Mutations offline queue hook)
  - `.agents/orchestrator_pillars/SCOPE_M3.md` (Milestone 3 Scope Document)
  - `.agents/explorer_pillars_3/handoff.md` (Audit Handoff Reference)
- **Key findings**:
  - The IndexedDB database upgrade is destructive because it deletes the object store `sync_queue` if it exists.
  - Adding indexes conditionally using `store.indexNames.contains()` avoids dropping the store.
  - Deletion command `removeRecord` has no `schoolId` validation, exposing it to tenant isolation violations.
  - Records must be cursor-iterated during version upgrade to delete invalid records lacking a valid `schoolId` and initialize new schema fields.
- **Unexplored areas**:
  - Full E2E service worker synchronization integration (Milestone 3.2).

## Key Decisions Made
- Proposed utilizing an async upgrade handler that retrieves the existing store and adds indexes non-destructively.
- Proposed performing data validation / scrubbing inside the migration transaction to enforce tenant safety.
- Propose adding `schoolId` check in `removeRecord` by retrieving the record and performing the standard `assertTenantSafety` validation first.

## Artifact Index
- c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\teamwork_preview_explorer_m3_1_2_gen1\handoff.md — Analysis and Proposed Non-destructive Upgrade Strategy
- c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\teamwork_preview_explorer_m3_1_2_gen1\proposed_sync-queue.ts — Full replacement file draft containing the proposed changes
