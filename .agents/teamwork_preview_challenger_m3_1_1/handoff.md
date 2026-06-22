# Challenge Handoff Report — IndexedDB Queue & Migrations

## 1. Observation
- **Target File**: `apps/web/src/lib/offline/sync-queue.ts`
- **Destructive Migration Code**: On lines 54-64, the `getDB` method configures the IndexedDB upgrade from Version 1 to 2 by dropping the entire object store if it exists:
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
- **Test File Created**: `apps/web/tests/design/offline-db-challenge.test.tsx`
- **Test Command**: `npm run web:test:design -- offline-db-challenge.test.tsx`
- **Verbatim Error Output**:
  ```
  FAIL tests/design/offline-db-challenge.test.tsx (7.607 s)
    IndexedDB Migration and Stress Tests
      1. Database Migration (Version 1 to 2)
        × should verify migration from DB version 1 to version 2 preserves data (94 ms)

    ● IndexedDB Migration and Stress Tests › 1. Database Migration (Version 1 to 2) › should verify migration from DB version 1 to version 2 preserves data

      expect(received).toBe(expected) // Object.is equality

      Expected: true
      Received: false

         98 |
         99 |       // We assert that the record must exist. If it was deleted, this will fail.
      > 100 |       expect(recordExists).toBe(true);
  ```

---

## 2. Logic Chain
- **Step 1**: In Version 1 of the application, the local IndexedDB database `myshule-offline-db` stores unsynced user operations (such as offline attendance records and fees) in the `sync_queue` object store.
- **Step 2**: The implementation bumped the database version to `2` to create the compound index `by-school-status` (supporting filtering by `['schoolId', 'status']`).
- **Step 3**: The upgrade handler on Version 2 executes `db.deleteObjectStore('sync_queue')` before creating the store and indexes.
- **Step 4**: Dropping the object store permanently deletes all stored records in the IndexedDB on the user's browser.
- **Step 5**: The test case simulates this behavior by seeding the database at Version 1, triggering the V2 migration, and checking for data preservation.
- **Step 6**: The failure of `expect(recordExists).toBe(true)` empirically confirms that the database upgrade destroys existing offline data.

---

## 3. Caveats
- The tests run in Jest using `fake-indexeddb` (an in-memory IndexedDB polyfill). While `fake-indexeddb` behaves exactly like real browser engines for schema modification and transactions, real browsers have specific storage limits (quota management) and transaction lifetime timeouts that could behave differently under extreme system memory/CPU pressure.

---

## 4. Conclusion
- The **database migration from V1 to V2 is destructive** and will cause complete data loss of unsynced offline records for users when the updated web app is loaded.
- The **stress test passes successfully**, demonstrating that the compound index `['schoolId', 'status']` and the `clearSyncedRecords` method function correctly and performantly (handling 300 enqueues, updates, index retrievals, and deletions in under 5 seconds) while strictly maintaining tenant isolation boundary constraints.

---

## 5. Verification Method
- Execute the command:
  `npm run web:test:design -- offline-db-challenge.test.tsx`
- **Success Criteria**: 
  - The stress test should pass.
  - The migration test currently fails (proving the bug). Once the migration logic is corrected (made non-destructive), both tests will pass.

---

## 6. Adversarial Challenge Report

### Overall Risk Assessment
**Overall risk assessment**: HIGH / CRITICAL (Deployment of destructive migration will delete active users' offline unsynced data, causing silent database mutations to fail and violating client-side tenant integrity).

### Challenges

#### [Critical] Challenge 1: Destructive Database Upgrade
- **Assumption challenged**: The implementation assumed dropping and recreating the object store is an acceptable way to introduce new indexes during a version bump.
- **Attack scenario**: A teacher goes offline, records attendance/marks for multiple classes, and leaves the page. The app is updated on the server. The next time the teacher opens the app, the version bump triggers, wiping all unsynced attendance and marks before they can be synced.
- **Blast radius**: Complete data loss of all offline edits across all tenants.
- **Mitigation**: Update `upgrade` in `sync-queue.ts` to be non-destructive. If the store already exists, obtain the transaction's store reference and only add missing indexes:
  ```typescript
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
  }
  ```

### Stress Test Results
- **Scenario**: Enqueuing 300 operations across two schools, updating status of a subset to `Synced`, filtering using `by-school-status` compound index, and clearing synced records for one school.
- **Expected behavior**: All actions complete performantly; querying returns exact counts matching isolation scopes; clearing one school's synced items leaves the other school completely unaffected.
- **Actual behavior**:
  - Enqueuing 300 records: 1917 ms
  - Updating statuses to Synced: 1803 ms
  - Retrieving using compound index: 70 ms
  - Clearing synced records: 897 ms
  - Total time: ~4.88 seconds
- **Pass/Fail**: PASS

### Unchallenged Areas
- Offline sync engine automatic background timers and network listener listeners were not stress tested as they rely on network mock state machines outside the database store layer scope.
