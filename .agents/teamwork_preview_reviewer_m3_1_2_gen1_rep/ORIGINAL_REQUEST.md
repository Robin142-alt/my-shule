## 2026-06-22T08:40:34Z
<USER_REQUEST>
Resume work as Reviewer 2 Gen 1 Replacement at c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\teamwork_preview_reviewer_m3_1_2_gen1_rep.
Your target file is: apps/web/src/lib/offline/sync-queue.ts
Your scope document is: c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\orchestrator_pillars\SCOPE_M3.md

Please review the code changes implemented by Worker Gen 2 Rep in `apps/web/src/lib/offline/sync-queue.ts`:
1. Check security constraints and tenant isolation:
   - Ensure `schoolId` validation is enforced on all operations where school data is read, updated, or deleted.
   - Verify that the migration path cleanses database records lacking a valid `schoolId`.
   - Verify that `removeRecord(id)` enforces `schoolId` check.
2. Run the tests via:
   `npm run web:test:design -- offline-db-challenge.test.tsx`
   to verify correctness of tenant safety.
3. Write your detailed review and findings to `handoff.md` in your working directory.
</USER_REQUEST>
