# Handoff Report: Adapting Attendance Offline Sync to Standardized IndexedDB sync_queue

**Explorer**: Explorer 3: Queue Integration Designer  
**Working Directory**: `c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\explorer_m3_1_3`  
**Parent Conversation ID**: `c6b3ecd2-0eb6-4a1b-97e8-88c69c5d2c0a`  

---

## 1. Observation

Direct inspection of the codebase reveals the following structures:

### A. Standardized IndexedDB `sync_queue`
Located in `apps/web/src/lib/offline/sync-queue.ts`. It manages the `myshule-offline-db` database and its `sync_queue` object store.
```typescript
// lines 6-23 in apps/web/src/lib/offline/sync-queue.ts
export interface OfflineSyncRecord {
  id: string;             // Client-side unique ID
  operationId: string;    // Idempotency key
  schoolId: string;       // Tenant Isolation
  academicYearId?: string;
  termId?: string;
  userId: string;
  roleId?: string;
  deviceId: string;
  module: string;         // 'attendance', 'finance', 'discipline', etc.
  action: string;         // 'create', 'update', 'delete'
  payload: any;
  status: SyncStatus;
  retryCount: number;
  errorMessage?: string;
  createdAtLocal: string;
  syncedAt?: string;
}
```
It exports a global `syncQueue` instance of `SyncQueueService` which provides async methods:
* `enqueue(recordData, isDraft)`
* `getRecordsBySchoolAndStatus(schoolId, status)`
* `getAllForSchool(schoolId)`
* `updateStatus(id, status, errorMessage?)`
* `removeRecord(id)`

### B. Current Offline Attendance Implementation
Located in `apps/web/src/lib/modules/attendance-offline.ts`. It relies on a local storage-backed queue:
```typescript
// lines 9-17 in apps/web/src/lib/modules/attendance-offline.ts
export interface OfflineAttendanceTask {
  id: string; // queue ID
  streamId: string;
  tenantId: string;
  records: OfflineAttendanceRecord[];
  timestamp: number;
}

const STORAGE_KEY = "myshule_offline_attendance_queue";
```
It manages saves synchronously using `localStorage.getItem`/`setItem` (lines 19-39) and filters out matching `streamId` tasks to perform overwrites (line 25).
The sync hook `useOfflineAttendanceSync` (lines 41-132) listens to browser network state changes. On connection restore, it iterates over the localStorage list, sending a bulk POST request containing the `streamId` and `records` to `/class-teacher/attendance` (line 75).

### C. Backend Sync Architecture and Expectations
Located in `apps/api/src/modules/sync/`.
* `sync.controller.ts` exposes a unified push endpoint `/sync/push` which takes a list of operations (mapped via `SyncPushOperationDto`).
* `sync.service.ts` processes pushed operations. When `operation.entity === 'attendance'`, it routes to the `AttendanceSyncConflictResolverService` (lines 141-148).
* `attendance-sync-conflict-resolver.service.ts` expects **granular, student-level** attendance operations matching `AttendanceSyncPayload`:
```typescript
// lines 5-14 in apps/api/src/modules/sync/sync.types.ts
export interface AttendanceSyncPayload extends Record<string, unknown> {
  action: 'upsert';
  record_id: string;
  student_id: string;
  attendance_date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  last_modified_at: string;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}
```
The resolver applies a `last-write-wins` policy matching `student_id` and `attendance_date` based on the client's `last_modified_at` (lines 110-127 in `attendance-sync-conflict-resolver.service.ts`).

---

## 2. Logic Chain

1. **Isolation / Integration Deficit**: The current localStorage queue in `attendance-offline.ts` operates as a silo. Storing attendance data separately from the standardized IndexedDB `sync_queue` violates the constitution's requirement for unified school data projections and centralized offline monitoring (e.g., the `SyncCenter`).
2. **Asynchronous Interface Shift**: Since the standard `syncQueue` interacts with IndexedDB asynchronously via the `idb` library, all methods in `attendance-offline.ts` that query, update, or save data (such as `saveAttendanceOffline` and the hook's initialization check) must be converted from synchronous operations to Promise-based asynchronous operations.
3. **Queue Deduplication (Overwrite Behavior)**: The existing localStorage queue implements stream-level overwriting: if a teacher re-submits attendance for the same stream before syncing, it overwrites the older submission. When adapting to `syncQueue`, we must query the pending records in IndexedDB for the same stream and remove them before enqueuing the new record.
4. **Architectural Payload Dilemma**: We must choose between two strategies for the payload structure:
   * **Strategy 1: Consolidated Bulk Operation (Bulk Payload)**: Enqueue the whole stream list as a single operation with `action: 'bulk_save'` and payload `{ streamId, records }`.
   * **Strategy 2: Granular Operations (Student-Level Payload)**: Break down the bulk UI submission into individual operations (one per student) matching `AttendanceSyncPayload`.
5. **Comparison and Recommendation**:
   * *Strategy 1* matches the existing REST API endpoint `/class-teacher/attendance` directly. However, it cannot be synced using the unified NestJS `/sync/push` endpoint because the backend resolver expects singular student operations. If there is a conflict, the entire class attendance has to be resolved at once, potentially overwriting independent edits.
   * *Strategy 2* is fully aligned with the production-ready `SyncPushOperationDto` and `AttendanceSyncConflictResolverService`. It allows granular `last-write-wins` conflict resolution on the server at the student level, which is much more resilient and robust.
   * Therefore, we recommend **Strategy 2 (Granular Operations)** for the production implementation but provide details for both to give a complete design landscape.

---

## 3. Caveats

1. **Backend `/api/sync/retry` Endpoint Status**: The `retry` method in the backend `SyncService` is currently a stub returning a success response. For retries to function effectively in production, the standard `/sync/push` channel must be utilized or the `retry` endpoint must be implemented to delegate to resolvers.
2. **Device Registration Dependency**: Pushing records to `/sync/push` requires a valid registered `deviceId` (stored in client localStorage) and authenticated `userId`.
3. **Draft States**: If attendance is saved as a "Draft" instead of "Saved offline", it should not be automatically synced until the teacher explicitly submits it.

---

## 4. Conclusion & Recommendations

### Option 1: Adaptation using Consolidated Bulk Operations (Strategy 1)
Enqueues the bulk list of stream records under a single task and routes it to the custom `/class-teacher/attendance` REST API.

#### Payload Structure:
* **module**: `"attendance"`
* **action**: `"bulk_save"`
* **payload**:
  ```json
  {
    "streamId": "stream_123",
    "records": [
      { "studentId": "student_a", "status": "present" },
      { "studentId": "student_b", "status": "absent" }
    ],
    "timestamp": 1782086400000
  }
  ```

#### Adapted Code Sketch (`apps/web/src/lib/modules/attendance-offline.ts`):
```typescript
import { syncQueue, OfflineSyncRecord } from "@/lib/offline/sync-queue";
import { withSession, type LiveAuthSession } from "@/lib/dashboard/api-client";
import { useState, useCallback, useEffect } from "react";

export interface OfflineAttendanceRecord {
  studentId: string;
  status: "present" | "absent" | "late" | "excused";
}

// Deduplicate stream-level enqueued records and save
export async function saveAttendanceOffline(
  tenantId: string,
  userId: string,
  deviceId: string,
  streamId: string,
  records: OfflineAttendanceRecord[]
): Promise<OfflineSyncRecord> {
  const allForSchool = await syncQueue.getAllForSchool(tenantId);
  
  // Find pending bulk attendance operations for this stream to overwrite
  const pendingDuplicates = allForSchool.filter(
    r => r.module === 'attendance' &&
         r.action === 'bulk_save' &&
         ['Saved offline', 'Draft', 'Failed'].includes(r.status) &&
         r.payload.streamId === streamId
  );
  
  for (const record of pendingDuplicates) {
    await syncQueue.removeRecord(record.id);
  }
  
  return await syncQueue.enqueue({
    schoolId: tenantId,
    userId,
    deviceId,
    module: 'attendance',
    action: 'bulk_save',
    payload: {
      streamId,
      records,
      timestamp: Date.now(),
    }
  });
}

export function useOfflineAttendanceSync(session: LiveAuthSession | null) {
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [queueCount, setQueueCount] = useState(0);

  const checkQueue = useCallback(async () => {
    if (!session) {
      setQueueCount(0);
      return [];
    }
    try {
      const allForSchool = await syncQueue.getAllForSchool(session.tenantId);
      const attendanceQueue = allForSchool.filter(
        r => r.module === 'attendance' && 
             r.action === 'bulk_save' &&
             ['Saved offline', 'Draft', 'Failed'].includes(r.status)
      );
      setQueueCount(attendanceQueue.length);
      return attendanceQueue;
    } catch {
      setQueueCount(0);
      return [];
    }
  }, [session]);

  const syncQueueCallback = useCallback(async () => {
    if (!session || !isOnline || syncing) return;
    
    const queue = await checkQueue();
    if (queue.length === 0) return;

    setSyncing(true);
    let successCount = 0;
    
    for (const record of queue) {
      try {
        await syncQueue.updateStatus(record.id, 'Syncing');
        
        await withSession(session, "/class-teacher/attendance", {
          method: "POST",
          body: { 
            streamId: record.payload.streamId, 
            records: record.payload.records 
          }
        });
        
        // Remove on successful sync
        await syncQueue.removeRecord(record.id);
        successCount++;
      } catch (err: any) {
        console.error("Sync failed for record", record.id, err);
        await syncQueue.updateStatus(record.id, 'Failed', err.message);
      }
    }

    if (successCount > 0) {
      await checkQueue();
    }
    setSyncing(false);
  }, [session, isOnline, syncing, checkQueue]);

  // Hook useEffect wireup (similar to current implementation but async-aware)...
}
```

---

### Option 2: Adaptation using Granular Operations (Strategy 2 - Recommended)
Decomposes the bulk stream roll-call into individual student operations enqueued to the standard `syncQueue` and pushed via `/api/sync/push`.

#### Payload Structure (Individual student operation):
* **module**: `"attendance"`
* **action**: `"upsert"`
* **payload** (matching `AttendanceSyncPayload` type):
  ```json
  {
    "action": "upsert",
    "record_id": "attn_student_123_2026-06-22",
    "student_id": "student_123",
    "attendance_date": "2026-06-22",
    "status": "present",
    "last_modified_at": "2026-06-21T23:59:11.000Z",
    "notes": null,
    "metadata": {}
  }
  ```

#### Adapted Code Sketch (`apps/web/src/lib/modules/attendance-offline.ts`):
```typescript
import { syncQueue, OfflineSyncRecord } from "@/lib/offline/sync-queue";
import { withSession, type LiveAuthSession } from "@/lib/dashboard/api-client";
import { useState, useCallback, useEffect } from "react";

export interface OfflineAttendanceRecord {
  studentId: string;
  status: "present" | "absent" | "late" | "excused";
}

// Save each student's attendance as a separate granular operation
export async function saveAttendanceOffline(
  tenantId: string,
  userId: string,
  deviceId: string,
  streamId: string,
  records: OfflineAttendanceRecord[]
): Promise<OfflineSyncRecord[]> {
  const attendanceDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const allForSchool = await syncQueue.getAllForSchool(tenantId);
  const results: OfflineSyncRecord[] = [];

  for (const record of records) {
    const recordId = `attn_${record.studentId}_${attendanceDate}`;
    
    // Deduplicate: check for existing unsynced record for the same student and date
    const pendingDuplicate = allForSchool.find(
      r => r.module === 'attendance' &&
           r.action === 'upsert' &&
           ['Saved offline', 'Draft', 'Failed'].includes(r.status) &&
           r.payload.student_id === record.studentId &&
           r.payload.attendance_date === attendanceDate
    );

    if (pendingDuplicate) {
      await syncQueue.removeRecord(pendingDuplicate.id);
    }

    const enqueued = await syncQueue.enqueue({
      schoolId: tenantId,
      userId,
      deviceId,
      module: 'attendance',
      action: 'upsert',
      payload: {
        action: 'upsert',
        record_id: recordId,
        student_id: record.studentId,
        attendance_date: attendanceDate,
        status: record.status,
        last_modified_at: new Date().toISOString(),
        notes: null,
        metadata: { streamId } // Keep streamId in metadata for client queries
      }
    });
    results.push(enqueued);
  }
  
  return results;
}

export function useOfflineAttendanceSync(session: LiveAuthSession | null) {
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [queueCount, setQueueCount] = useState(0);

  const checkQueue = useCallback(async () => {
    if (!session) {
      setQueueCount(0);
      return [];
    }
    try {
      const allForSchool = await syncQueue.getAllForSchool(session.tenantId);
      const attendanceQueue = allForSchool.filter(
        r => r.module === 'attendance' && 
             r.action === 'upsert' &&
             ['Saved offline', 'Draft', 'Failed'].includes(r.status)
      );
      setQueueCount(attendanceQueue.length);
      return attendanceQueue;
    } catch {
      setQueueCount(0);
      return [];
    }
  }, [session]);

  const syncQueueCallback = useCallback(async () => {
    if (!session || !isOnline || syncing) return;
    
    const queue = await checkQueue();
    if (queue.length === 0) return;

    setSyncing(true);
    
    // Construct the payload for the standard /sync/push NestJS endpoint
    const deviceId = typeof localStorage !== 'undefined' ? localStorage.getItem('device_id') || 'unknown-device' : 'unknown-device';
    const operations = queue.map((record, index) => ({
      op_id: record.operationId,
      entity: 'attendance',
      action: record.action,
      createdAtLocal: record.createdAtLocal,
      version: index + 1, // Client local version incrementor
      payload: record.payload
    }));

    try {
      // Sync all granular operations in one HTTP batch push
      const response = await fetch('/api/sync/push', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-myshule-csrf': typeof document !== 'undefined' ? (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '' : ''
        },
        body: JSON.stringify({
          device_id: deviceId,
          platform: 'web',
          app_version: '1.0.0',
          metadata: {},
          operations
        })
      });

      if (!response.ok) {
        throw new Error(`Sync push failed with status ${response.status}`);
      }

      const result = await response.json();
      
      // Update each record's status in IndexedDB based on push results
      for (const opResult of result.results) {
        const matchingRecord = queue.find(r => r.operationId === opResult.op_id);
        if (matchingRecord) {
          if (opResult.status === 'applied' || opResult.status === 'duplicate') {
            await syncQueue.removeRecord(matchingRecord.id);
          } else {
            await syncQueue.updateStatus(matchingRecord.id, 'Failed', opResult.reason || 'Server rejected');
          }
        }
      }
    } catch (err: any) {
      console.error("Batch sync push failed:", err);
      for (const record of queue) {
        await syncQueue.updateStatus(record.id, 'Failed', err.message);
      }
    } finally {
      await checkQueue();
      setSyncing(false);
    }
  }, [session, isOnline, syncing, checkQueue]);

  // Hook useEffect wireup...
}
```

---

## 5. Verification Method

To verify the integration independently:

1. **Compilation Check**:
   Compile the web application using:
   ```powershell
   npm run web:build
   ```
2. **Backend Resolver Integrity**:
   Verify that NestJS backend sync tests run and pass:
   ```powershell
   npm run build
   node --test dist/apps/api/src/modules/sync/offline-workflow-policy.test.js dist/apps/api/src/modules/sync/sync.test.js
   ```
3. **Module Readiness Auditing**:
   Verify offline UI design tests:
   ```powershell
   npm run web:test:design
   ```
   Or run the specific module certification suite:
   ```powershell
   npm run readiness:modules
   ```
