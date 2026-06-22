# Handoff Report — Non-Destructive IndexedDB Upgrade Analysis (Milestone 3.1)

This report details the read-only investigation of a critical issue where the database upgrade from version 1 to version 2 in `apps/web/src/lib/offline/sync-queue.ts` is destructive, wiping out all offline user records.

---

## 1. Observation

### A. Destructive Upgrade Code
In `apps/web/src/lib/offline/sync-queue.ts` (lines 54-64), the `upgrade` handler for IndexedDB initialization is defined as follows:
```typescript
      this.dbPromise = openDB<ShuleOfflineDB>('myshule-offline-db', 2, {
        upgrade(db) {
          if (db.objectStoreNames.contains('sync_queue')) {
            db.deleteObjectStore('sync_queue');
          }
          const store = db.createObjectStore('sync_queue', { keyPath: 'id' });
          store.createIndex('by-school', 'schoolId');
          store.createIndex('by-status', 'status');
          store.createIndex('by-module', 'module');
          store.createIndex('by-school-status', ['schoolId', 'status']);
        },
      });
```
Directly calling `db.deleteObjectStore('sync_queue')` deletes the entire object store along with all data contained within it.

### B. Test Failure Verification
Running the command `npm run web:test:design tests/design/offline-db-challenge.test.tsx` yields the following failure:
```
FAIL tests/design/offline-db-challenge.test.tsx
  IndexedDB Migration and Stress Tests
    1. Database Migration (Version 1 to 2)
      × should verify migration from DB version 1 to version 2 preserves data (67 ms)
    2. Database Stress Test
      √ should handle enqueuing, compound index retrieval, and clearing records under stress (2014 ms)

  ● IndexedDB Migration and Stress Tests › 1. Database Migration (Version 1 to 2) › should verify migration from DB version 1 to version 2 preserves data

    expect(received).toBe(expected) // Object.is equality

    Expected: true
    Received: false

       98 |
       99 |       // We assert that the record must exist. If it was deleted, this will fail.
    > 100 |       expect(recordExists).toBe(true);
          |                            ^
```
This confirms that the version 1 dummy record was deleted during the upgrade callback.

---

## 2. Logic Chain

1. **Version 1 Setup**: Initially, version 1 of `myshule-offline-db` exists with the `sync_queue` object store containing keys/values and 3 indexes (`by-school`, `by-status`, `by-module`).
2. **Version Upgrade Trigger**: When version 2 of the database is opened via `openDB`, the browser detects that the local schema is version 1. It initiates the `upgradeneeded` lifecycle step, executing the `upgrade` callback.
3. **Destructive Execution**: Inside the `upgrade` callback, the condition `db.objectStoreNames.contains('sync_queue')` evaluates to `true`.
4. **Data Erasure**: The code calls `db.deleteObjectStore('sync_queue')`. This immediately drops the underlying database table/store, permanently deleting any unsynced offline records from device storage.
5. **Recreation**: A new, empty `sync_queue` is created with the new indexes.
6. **Loss of Integration**: Any hooks (like `useOfflineMutation`) or views (like `SyncCenter.tsx`) relying on existing offline queues will find them empty, preventing the synchronization of prior offline mutations or actions.
7. **Resolution**: By retrieving the existing store using the upgrade `transaction` and performing fine-grained checks via `store.indexNames.contains()`, we can safely add new indexes (like the compound index `by-school-status`) without deleting the store.

---

## 3. Caveats

- **Read-only Investigation**: The source files were not modified, in accordance with the project instructions. Therefore, the fix has not been committed to the codebase.
- **Environment**: Tested using the `fake-indexeddb` library, which accurately mocks IndexedDB behavior for Jest. Actual browser behavior matches this mock.

---

## 4. Conclusion

The current database upgrade structure is destructive. To fix this, the upgrade callback in `apps/web/src/lib/offline/sync-queue.ts` must be refactored to obtain the transaction's existing object store and non-destructively add the new indexes.

### Proposed Code Changes
Modify `apps/web/src/lib/offline/sync-queue.ts` as described below.

#### Before (Lines 54-64)
```typescript
      this.dbPromise = openDB<ShuleOfflineDB>('myshule-offline-db', 2, {
        upgrade(db) {
          if (db.objectStoreNames.contains('sync_queue')) {
            db.deleteObjectStore('sync_queue');
          }
          const store = db.createObjectStore('sync_queue', { keyPath: 'id' });
          store.createIndex('by-school', 'schoolId');
          store.createIndex('by-status', 'status');
          store.createIndex('by-module', 'module');
          store.createIndex('by-school-status', ['schoolId', 'status']);
        },
      });
```

#### After
```typescript
      this.dbPromise = openDB<ShuleOfflineDB>('myshule-offline-db', 2, {
        upgrade(db, oldVersion, newVersion, transaction) {
          let store;
          if (!db.objectStoreNames.contains('sync_queue')) {
            store = db.createObjectStore('sync_queue', { keyPath: 'id' });
          } else {
            store = transaction.objectStore('sync_queue');
          }

          // Non-destructively add missing indexes
          if (!store.indexNames.contains('by-school')) {
            store.createIndex('by-school', 'schoolId');
          }
          if (!store.indexNames.contains('by-status')) {
            store.createIndex('by-status', 'status');
          }
          if (!store.indexNames.contains('by-module')) {
            store.createIndex('by-module', 'module');
          }
          if (!store.indexNames.contains('by-school-status')) {
            store.createIndex('by-school-status', ['schoolId', 'status']);
          }
        },
      });
```

A patch file containing these precise changes is located at:
`.agents/teamwork_preview_explorer_m3_1_3_gen1/sync-queue.patch`

---

## 5. Verification Method

To verify the non-destructive upgrade strategy:

1. **Apply the patch** to the workspace:
   ```bash
   git apply .agents/teamwork_preview_explorer_m3_1_3_gen1/sync-queue.patch
   ```
2. **Run the migration test**:
   ```bash
   npm run web:test:design tests/design/offline-db-challenge.test.tsx
   ```
3. **Verify results**: The test suite should pass completely (2 tests passed), confirming that version 1 data is preserved after upgrading to version 2 and that the compound index works as expected.
