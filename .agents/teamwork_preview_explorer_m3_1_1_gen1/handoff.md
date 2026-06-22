# Handoff Report — IndexedDB Migration Strategy

## 1. Observation

In `apps/web/src/lib/offline/sync-queue.ts`, the database upgrade handler for version 2 is implemented as follows (lines 54-65):

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

Running the challenge test command:
`npm run web:test:design -- offline-db-challenge.test.tsx`

Produces the following failure output:
```
FAIL tests/design/offline-db-challenge.test.tsx (5.35 s)
  IndexedDB Migration and Stress Tests
    1. Database Migration (Version 1 to 2)
      × should verify migration from DB version 1 to version 2 preserves data (68 ms)
    2. Database Stress Test
      √ should handle enqueuing, compound index retrieval, and clearing records under stress (3458 ms)

  ● IndexedDB Migration and Stress Tests › 1. Database Migration (Version 1 to 2) › should verify migration from DB version 1 to version 2 preserves data

    expect(received).toBe(expected) // Object.is equality

    Expected: true
    Received: false

       98 |
       99 |       // We assert that the record must exist. If it was deleted, this will fail.
    > 100 |       expect(recordExists).toBe(true);
          |                            ^
      101 |     
```

## 2. Logic Chain

1. **Destructive Store Deletion**: During an upgrade (e.g., from version 1 to version 2), the database engine invokes the `upgrade(db)` callback. The current logic checks `if (db.objectStoreNames.contains('sync_queue'))` and calls `db.deleteObjectStore('sync_queue')`.
2. **Data Loss**: Deleting the object store wipes out all existing offline records stored in the IndexedDB from the previous database version.
3. **Test Failure**: The test `offline-db-challenge.test.tsx` creates a database of version 1, seeds records, closes it, and then opens it via `syncQueue` (which uses version 2). Because the store is deleted and recreated empty during the upgrade, the seeded record is lost, and `recordExists` evaluates to `false`, causing the test to fail.
4. **Resolution via Non-Destructive Modification**: Instead of deleting the store, the upgrade logic should retrieve the existing object store using the `transaction` argument provided by the `upgrade` hook when the store already exists.
5. **Incremental Index Creation**: Once the store reference is obtained, we can safely check if the indexes (`by-school`, `by-status`, `by-module`, and the new compound index `by-school-status`) exist on the object store using `store.indexNames.contains(indexName)`. If any index is missing, we create it dynamically.

## 3. Caveats

No caveats. The IndexedDB API behaves consistently in all standard browsers and `fake-indexeddb` Node environments. The check `store.indexNames.contains` is fully standardized and supported.

## 4. Conclusion

We propose changing the `getDB()` initialization to use a non-destructive upgrade handler that retains all data in the `sync_queue` store while dynamically adding the compound index and other missing indexes.

The proposed code changes have been packaged as a diff patch and a complete replacement file in the agent folder:
- **Patch file**: `proposed_sync-queue.patch`
- **Replacement file**: `proposed_sync-queue.ts`

### Code Comparison

**Before**:
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

**After**:
```typescript
      this.dbPromise = openDB<ShuleOfflineDB>('myshule-offline-db', 2, {
        upgrade(db, oldVersion, newVersion, transaction) {
          let store;
          if (!db.objectStoreNames.contains('sync_queue')) {
            store = db.createObjectStore('sync_queue', { keyPath: 'id' });
          } else {
            store = transaction.objectStore('sync_queue');
          }
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

## 5. Verification Method

To verify this solution:
1. Apply the patch `proposed_sync-queue.patch` to `apps/web/src/lib/offline/sync-queue.ts`.
2. Run the test command in the project directory:
   `npm run web:test:design -- offline-db-challenge.test.tsx`
3. Verify that all tests pass, confirming that migration from version 1 to 2 is fully non-destructive and retains existing records.
