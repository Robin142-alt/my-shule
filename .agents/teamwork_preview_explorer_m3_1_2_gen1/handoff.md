# Handoff Report — IndexedDB Non-Destructive Migration & Tenant Safety Guardrails

This handoff report details the investigation of the destructive migration issue in the IndexedDB upgrade path for Milestone 3.1, along with the proposed robust, non-destructive upgrade strategy and tenant safety guardrails.

---

## 1. Observation

### A. Destructive Upgrade Code Path
In `apps/web/src/lib/offline/sync-queue.ts` (lines 53-66), the `getDB()` method instantiates the database connection with version `2`:
```typescript
53:     if (!this.dbPromise) {
54:       this.dbPromise = openDB<ShuleOfflineDB>('myshule-offline-db', 2, {
55:         upgrade(db) {
56:           if (db.objectStoreNames.contains('sync_queue')) {
57:             db.deleteObjectStore('sync_queue');
58:           }
59:           const store = db.createObjectStore('sync_queue', { keyPath: 'id' });
60:           store.createIndex('by-school', 'schoolId');
61:           store.createIndex('by-status', 'status');
62:           store.createIndex('by-module', 'module');
63:           store.createIndex('by-school-status', ['schoolId', 'status']);
64:         },
65:       });
66:     }
```
If a user already has a database with version `1`, the existence of the `sync_queue` object store triggers `db.deleteObjectStore('sync_queue')` (line 57). This completely deletes the store, wiping out all unsynced user records.

### B. Validation & Safety Checks
- In `sync-queue.ts`, the `assertTenantSafety(schoolId)` method is used to enforce `schoolId` presence on operations like `enqueue`, `getRecordsBySchoolAndStatus`, `getAllForSchool`, `updateStatus`, and `clearSyncedRecords`.
- However, `removeRecord(id)` at lines 176-179 does not perform a `schoolId` validation:
```typescript
176:   async removeRecord(id: string): Promise<void> {
177:     const db = await this.getDB();
178:     await db.delete('sync_queue', id);
179:   }
```
- During database upgrades, no data-level safety check is performed on legacy records to ensure they possess a valid `schoolId`.

### C. Test Failure
Running the test command:
```bash
npm run web:test:design -- offline-db-challenge.test.tsx
```
results in a failure:
```
FAIL tests/design/offline-db-challenge.test.tsx
  IndexedDB Migration and Stress Tests
    1. Database Migration (Version 1 to 2)
      × should verify migration from DB version 1 to version 2 preserves data (63 ms)
    2. Database Stress Test
      √ should handle enqueuing, compound index retrieval, and clearing records under stress (2982 ms)

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

1. **Root Cause**: The database migration from version 1 to version 2 is destructive because the upgrade hook explicitly drops and recreates the `sync_queue` object store.
2. **Impact**: Unsynced client operations (such as attendance, grades, and fee records) will be lost on application update.
3. **Index Addition**: To safely add the compound index `by-school-status` and ensure other indexes are present, we must reuse the existing store (`transaction.objectStore('sync_queue')`) and add indexes conditionally using `store.indexNames.contains()`.
4. **Data Integrity & Tenant Safety**:
   - Legitimate offline records must be associated with a valid `schoolId`. Any record in the legacy queue missing `schoolId` violates tenant isolation constraints.
   - During migration, we must run a cursor iteration over existing records. Invalid records (no `schoolId`) must be deleted.
   - For compliant records, new V2 fields (e.g. `type: 'mutation'`) should be initialized to avoid runtime schema errors.
5. **Reinforcing Deletion Safeguard**: `removeRecord` must be updated to retrieve the record and execute `assertTenantSafety(record.schoolId)` prior to performing `db.delete()`.

---

## 3. Caveats

- **Transaction Timeouts**: Performing data migration during upgrade via cursor iteration holds the upgrade transaction open. If there is a massive volume of legacy logs, the transaction could time out. However, since the offline queue is designed to be transient and regularly flushed upon sync, the payload size will remain small.
- **Offline Type Assumption**: All pre-existing records (which lack the `type` field) are migrated under the assumption of being standard `mutation` types.

---

## 4. Conclusion

The current IndexedDB upgrade path destroys all local user data. We must rewrite the `upgrade` hook to be non-destructive by using `transaction.objectStore('sync_queue')` and adding missing indexes conditionally. We should also enforce tenant safety by scrubbing records lacking `schoolId` and supplying default values for new version 2 schema fields.

### Proposed Code Changes

#### Before (Destructive `getDB` & Guardless `removeRecord`):
```typescript
  private getDB(): Promise<IDBPDatabase<ShuleOfflineDB>> {
    if (typeof window === 'undefined') {
      return Promise.reject(new Error('IndexedDB is not available on the server'));
    }
    if (!this.dbPromise) {
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
    }
    return this.dbPromise;
  }

  async removeRecord(id: string): Promise<void> {
    const db = await this.getDB();
    await db.delete('sync_queue', id);
  }
```

#### After (Non-destructive `getDB` & Guarded `removeRecord`):
```typescript
  private getDB(): Promise<IDBPDatabase<ShuleOfflineDB>> {
    if (typeof window === 'undefined') {
      return Promise.reject(new Error('IndexedDB is not available on the server'));
    }
    if (!this.dbPromise) {
      this.dbPromise = openDB<ShuleOfflineDB>('myshule-offline-db', 2, {
        async upgrade(db, oldVersion, newVersion, transaction) {
          let store;
          // 1. Establish the store safely without deleting it
          if (!db.objectStoreNames.contains('sync_queue')) {
            store = db.createObjectStore('sync_queue', { keyPath: 'id' });
          } else {
            store = transaction.objectStore('sync_queue');
          }

          // 2. Establish missing indexes non-destructively
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

          // 3. Tenant Safety & Schema Validation on Existing Records (V1 to V2)
          if (oldVersion < 2) {
            let cursor = await store.openCursor();
            while (cursor) {
              const record = cursor.value;

              // Tenant safety check: Ensure record contains a valid, non-empty schoolId
              if (!record.schoolId || typeof record.schoolId !== 'string' || record.schoolId.trim() === '') {
                console.warn(`Tenant Safety Violation: Record ${record.id} lacks a valid schoolId. Deleting from local store.`);
                await cursor.delete();
              } else {
                let updated = false;

                // Enforce schema compliance: set default values for new V2 fields
                if (!record.type) {
                  record.type = 'mutation';
                  updated = true;
                }

                if (updated) {
                  await cursor.update(record);
                }
              }
              cursor = await cursor.continue();
            }
          }
        },
      });
    }
    return this.dbPromise;
  }

  async removeRecord(id: string): Promise<void> {
    const db = await this.getDB();
    const record = await db.get('sync_queue', id);
    if (record) {
      this.assertTenantSafety(record.schoolId);
      await db.delete('sync_queue', id);
    }
  }
```

---

## 5. Verification Method

To verify the migration and stress tests:
1. Ensure the proposed modifications are implemented in `apps/web/src/lib/offline/sync-queue.ts`.
2. Run the offline test suite:
   ```bash
   npm run web:test:design -- offline-db-challenge.test.tsx
   ```
3. Check the output; both tests (`Database Migration (Version 1 to 2)` and `Database Stress Test`) should succeed.
