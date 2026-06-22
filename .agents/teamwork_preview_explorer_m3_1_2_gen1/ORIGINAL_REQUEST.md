## 2026-06-22T07:11:40Z
Resume work as Explorer 2 Gen 1 at c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\teamwork_preview_explorer_m3_1_2_gen1.
Your target file is: apps/web/src/lib/offline/sync-queue.ts
Your scope document is: c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\orchestrator_pillars\SCOPE_M3.md

Challenger 1 has reported a critical issue in the IndexedDB upgrade path for Milestone 3.1:
The upgrade from version 1 to 2 is destructive. The openDB upgrade handler in `sync-queue.ts` calls db.deleteObjectStore('sync_queue') if it exists, wiping out all offline user records.

Please:
1. Examine the destructive migration code in `apps/web/src/lib/offline/sync-queue.ts`.
2. Review the schema constraints and Zod/TypeScript validations in `sync-queue.ts`. Propose validations or guardrails to ensure tenant safety (schoolId checks) during upgrade.
3. Propose a robust, non-destructive upgrade strategy that retains all existing data in the `sync_queue` store while adding the compound index `by-school-status` and other missing indexes.
4. Report your findings and proposed code changes in `handoff.md` inside your working directory.
Do not modify any source code files.
