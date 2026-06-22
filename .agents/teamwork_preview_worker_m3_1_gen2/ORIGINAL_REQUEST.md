## 2026-06-22T07:18:46Z

Resume work as Worker Gen 2 at c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\teamwork_preview_worker_m3_1_gen2.
Your target file is: apps/web/src/lib/offline/sync-queue.ts
Your scope document is: c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\orchestrator_pillars\SCOPE_M3.md

Please implement the following changes in `apps/web/src/lib/offline/sync-queue.ts`:
1. Refactor the database upgrade handler for version 2 to be non-destructive:
   - If the store `sync_queue` already exists, retrieve it using `transaction.objectStore('sync_queue')` (do not call `db.deleteObjectStore('sync_queue')`).
   - Create missing indexes (`by-school`, `by-status`, `by-module`, `by-school-status`) conditionally by checking `store.indexNames.contains(...)`.
2. Implement tenant safety validation and data migration during the upgrade path from oldVersion < 2:
   - Use a cursor to iterate over all existing records in the store.
   - If any record lacks a valid, non-empty `schoolId` (e.g. not a string, or empty/whitespace), delete the record from the local store using `cursor.delete()`.
   - If a record is valid but lacks the `type` field, initialize `record.type = 'mutation'` and update it using `cursor.update(record)`.
3. Add a tenant safety check to `removeRecord(id)`:
   - Before calling `db.delete('sync_queue', id)`, fetch the record first using `db.get('sync_queue', id)`.
   - If the record exists, run `this.assertTenantSafety(record.schoolId)` on it before performing the delete operation.
4. Verify your work:
   - Run the design tests using:
     `npm run web:test:design -- offline-db-challenge.test.tsx`
   - Verify that all tests pass, especially the data migration test that previously failed.
   - Ensure the build is clean and doesn't introduce typescript compilation errors.
5. Write your handoff report to `handoff.md` in your working directory.
