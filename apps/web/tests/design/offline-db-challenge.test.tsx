import { syncQueue } from "@/lib/offline/sync-queue";
import { openDB } from "idb";

// Polyfill structuredClone for Node/jsdom test environment if not present
if (typeof global.structuredClone !== "function") {
  global.structuredClone = (val: any) => JSON.parse(JSON.stringify(val));
}

// Mock useAuth context to bypass auth check
jest.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({
    user: { id: "test-user-id" },
    isAuthenticated: true,
  }),
}));

describe("IndexedDB Migration and Stress Tests", () => {
  const DB_NAME = "myshule-offline-db";

  const closeAndResetDB = async () => {
    // If the syncQueue has an open database, close it
    if ((syncQueue as any).dbPromise) {
      try {
        const db = await (syncQueue as any).dbPromise;
        db.close();
      } catch (e) {
        console.error("Failed to close syncQueue DB connection", e);
      }
      (syncQueue as any).dbPromise = null;
    }

    // Delete the database via raw indexedDB to ensure clean slate
    await new Promise<void>((resolve, reject) => {
      const req = globalThis.indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => {
        console.warn("Delete database blocked by open connection");
        resolve(); // resolve anyway to avoid hanging
      };
    });
  };

  beforeEach(async () => {
    await closeAndResetDB();
  });

  afterEach(async () => {
    await closeAndResetDB();
  });

  describe("1. Database Migration (Version 1 to 2)", () => {
    it("should verify migration from DB version 1 to version 2 preserves data", async () => {
      // Create version 1 database matching the historical Version 1 schema
      const db1 = await openDB(DB_NAME, 1, {
        upgrade(db) {
          const store = db.createObjectStore("sync_queue", { keyPath: "id" });
          store.createIndex("by-school", "schoolId");
          store.createIndex("by-status", "status");
          store.createIndex("by-module", "module");
        },
      });

      // Seed dummy records in version 1
      const testRecord = {
        id: "uuid-1",
        operationId: "op-1",
        schoolId: "school-A",
        userId: "user-1",
        deviceId: "device-1",
        module: "attendance",
        action: "create",
        payload: { test: "data" },
        status: "Pending" as const,
        retryCount: 0,
        createdAtLocal: new Date().toISOString(),
        type: "mutation" as const,
      };
      await db1.put("sync_queue", testRecord);
      db1.close();

      // Now access the database via syncQueue service (which uses V2)
      // This will trigger the upgrade code path in getDB()
      const records = await syncQueue.getAllForSchool("school-A");

      // Verify that the record is preserved
      const recordExists = records.some(r => r.id === "uuid-1");
      
      // Open database directly to verify indexes are present
      const db2 = await openDB(DB_NAME, 2);
      const storeNames = Array.from(db2.objectStoreNames);
      expect(storeNames).toContain("sync_queue");
      
      const tx = db2.transaction("sync_queue", "readonly");
      const indexNames = Array.from(tx.store.indexNames);
      expect(indexNames).toContain("by-school-status");
      db2.close();

      // We assert that the record must exist. If it was deleted, this will fail.
      expect(recordExists).toBe(true);
    });

    it("should delete invalid records (missing/empty schoolId) and migrate missing type to 'mutation' during v2 upgrade", async () => {
      // Create version 1 database matching historical Version 1 schema
      const db1 = await openDB(DB_NAME, 1, {
        upgrade(db) {
          const store = db.createObjectStore("sync_queue", { keyPath: "id" });
          store.createIndex("by-school", "schoolId");
          store.createIndex("by-status", "status");
          store.createIndex("by-module", "module");
        },
      });

      // 1. Valid record, but missing 'type' field
      const validRecordNoType = {
        id: "uuid-valid-no-type",
        operationId: "op-1",
        schoolId: "school-A",
        userId: "user-1",
        deviceId: "device-1",
        module: "attendance",
        action: "create",
        payload: { test: "data" },
        status: "Pending" as const,
        retryCount: 0,
        createdAtLocal: new Date().toISOString(),
      };

      // 2. Invalid record: empty schoolId
      const invalidRecordEmptySchool = {
        id: "uuid-invalid-empty",
        operationId: "op-2",
        schoolId: "   ",
        userId: "user-1",
        deviceId: "device-1",
        module: "attendance",
        action: "create",
        payload: { test: "data" },
        status: "Pending" as const,
        retryCount: 0,
        createdAtLocal: new Date().toISOString(),
        type: "mutation" as const,
      };

      // 3. Invalid record: non-string schoolId
      const invalidRecordNonStringSchool = {
        id: "uuid-invalid-non-string",
        operationId: "op-3",
        schoolId: null as any,
        userId: "user-1",
        deviceId: "device-1",
        module: "attendance",
        action: "create",
        payload: { test: "data" },
        status: "Pending" as const,
        retryCount: 0,
        createdAtLocal: new Date().toISOString(),
        type: "mutation" as const,
      };

      await db1.put("sync_queue", validRecordNoType as any);
      await db1.put("sync_queue", invalidRecordEmptySchool);
      await db1.put("sync_queue", invalidRecordNonStringSchool);
      db1.close();

      // Trigger upgrade path
      const records = await syncQueue.getAllForSchool("school-A");

      // Verify valid record is kept and migrated
      const migratedRecord = records.find(r => r.id === "uuid-valid-no-type");
      expect(migratedRecord).toBeDefined();
      expect(migratedRecord?.type).toBe("mutation");

      // Verify invalid records are deleted. We open DB directly to inspect.
      const db2 = await openDB(DB_NAME, 2);
      const allRecords = await db2.getAll("sync_queue");
      db2.close();

      const hasInvalidEmpty = allRecords.some(r => r.id === "uuid-invalid-empty");
      const hasInvalidNonString = allRecords.some(r => r.id === "uuid-invalid-non-string");
      expect(hasInvalidEmpty).toBe(false);
      expect(hasInvalidNonString).toBe(false);
    });
  });

  describe("2. Database Stress Test", () => {
    it("should handle enqueuing, compound index retrieval, and clearing records under stress", async () => {
      const schoolA = "school-A";
      const schoolB = "school-B";
      
      const totalPendingA = 100;
      const totalSyncedA = 50;
      const totalPendingB = 100;
      const totalSyncedB = 50;
      const totalRecords = totalPendingA + totalSyncedA + totalPendingB + totalSyncedB; // 300 records

      const baseData = {
        userId: "user-123",
        deviceId: "device-xyz",
        module: "attendance",
        action: "create",
        payload: { dummy: "stress-test" },
      };

      console.time(`Enqueuing ${totalRecords} records`);
      const allRecordsA: string[] = [];
      const allRecordsB: string[] = [];

      // 1. Enqueue all school A records
      for (let i = 0; i < totalPendingA + totalSyncedA; i++) {
        const record = await syncQueue.enqueue({
          ...baseData,
          schoolId: schoolA,
        });
        allRecordsA.push(record.id);
      }

      // 2. Enqueue all school B records
      for (let i = 0; i < totalPendingB + totalSyncedB; i++) {
        const record = await syncQueue.enqueue({
          ...baseData,
          schoolId: schoolB,
        });
        allRecordsB.push(record.id);
      }
      console.timeEnd(`Enqueuing ${totalRecords} records`);

      // 3. Update status of the 'Synced' subset of records for both schools
      console.time("Updating statuses to Synced");
      for (let i = 0; i < totalSyncedA; i++) {
        await syncQueue.updateStatus(allRecordsA[i], "Synced");
      }
      for (let i = 0; i < totalSyncedB; i++) {
        await syncQueue.updateStatus(allRecordsB[i], "Synced");
      }
      console.timeEnd("Updating statuses to Synced");

      // 4. Retrieve and verify counts using the compound index ['schoolId', 'status']
      console.time("Retrieving using compound index");
      const pendingA = await syncQueue.getRecordsBySchoolAndStatus(schoolA, "Pending");
      const syncedA = await syncQueue.getRecordsBySchoolAndStatus(schoolA, "Synced");
      const pendingB = await syncQueue.getRecordsBySchoolAndStatus(schoolB, "Pending");
      const syncedB = await syncQueue.getRecordsBySchoolAndStatus(schoolB, "Synced");
      console.timeEnd("Retrieving using compound index");

      expect(pendingA.length).toBe(totalPendingA);
      expect(syncedA.length).toBe(totalSyncedA);
      expect(pendingB.length).toBe(totalPendingB);
      expect(syncedB.length).toBe(totalSyncedB);

      // Verify that every retrieved record corresponds to the requested school and status
      expect(pendingA.every(r => r.schoolId === schoolA && r.status === "Pending")).toBe(true);
      expect(syncedA.every(r => r.schoolId === schoolA && r.status === "Synced")).toBe(true);
      expect(pendingB.every(r => r.schoolId === schoolB && r.status === "Pending")).toBe(true);
      expect(syncedB.every(r => r.schoolId === schoolB && r.status === "Synced")).toBe(true);

      // 5. Clear synced records for School A only
      console.time("Clearing synced records for school A");
      await syncQueue.clearSyncedRecords(schoolA);
      console.timeEnd("Clearing synced records for school A");

      // 6. Verify that School A synced records are gone, but school A pending records are preserved
      const postClearSyncedA = await syncQueue.getRecordsBySchoolAndStatus(schoolA, "Synced");
      const postClearPendingA = await syncQueue.getRecordsBySchoolAndStatus(schoolA, "Pending");
      expect(postClearSyncedA.length).toBe(0);
      expect(postClearPendingA.length).toBe(totalPendingA);

      // 7. Verify that School B is completely unaffected (strict tenant isolation)
      const postClearSyncedB = await syncQueue.getRecordsBySchoolAndStatus(schoolB, "Synced");
      const postClearPendingB = await syncQueue.getRecordsBySchoolAndStatus(schoolB, "Pending");
      expect(postClearSyncedB.length).toBe(totalSyncedB);
      expect(postClearPendingB.length).toBe(totalPendingB);
    }, 30000); // 30 seconds timeout for stress test
  });

  describe("3. Tenant Safety on Deletion", () => {
    it("should enforce tenant safety check when removing a record", async () => {
      // Enqueue a valid record
      const record = await syncQueue.enqueue({
        schoolId: "school-A",
        userId: "user-123",
        deviceId: "device-xyz",
        module: "attendance",
        action: "create",
        payload: { dummy: "data" },
      });

      // Call removeRecord with record ID - should succeed because schoolId is valid "school-A"
      await expect(syncQueue.removeRecord(record.id)).resolves.not.toThrow();

      // Seed a record with an invalid/empty schoolId directly in DB to bypass enqueue check
      const db = await openDB(DB_NAME, 2);
      const badRecord = {
        id: "uuid-bad",
        operationId: "op-bad",
        schoolId: "   ", // invalid empty schoolId
        userId: "user-1",
        deviceId: "device-1",
        module: "attendance",
        action: "create",
        payload: { test: "data" },
        status: "Pending" as const,
        retryCount: 0,
        createdAtLocal: new Date().toISOString(),
        type: "mutation" as const,
      };
      await db.put("sync_queue", badRecord);
      db.close();

      // Trying to remove this record should trigger assertTenantSafety error
      await expect(syncQueue.removeRecord("uuid-bad")).rejects.toThrow(
        "Tenant Isolation Violation: A valid schoolId is required"
      );
    });
  });
});
