# Handoff Report: Client-Side Unified IndexedDB Sync Queue Schema

This report analyzes the existing offline queue structures in the MyShule web application and proposes a unified, production-ready client-side IndexedDB `sync_queue` schema that guarantees multi-tenant isolation (AGP governance) and standardizes status tracking and retry mechanisms.

---

## 1. Observation

A detailed audit of the client-side codebase revealed three disparate offline queue structures in the frontend:

### 1.1. Standard Offline Mutation Queue
- **File Path**: `apps/web/src/lib/offline/sync-queue.ts`
- **Storage Target**: IndexedDB database `'myshule-offline-db'`, store `'sync_queue'`.
- **Implementation**:
```typescript
export type SyncStatus = 'Draft' | 'Saved offline' | 'Syncing' | 'Synced' | 'Failed' | 'Needs review';

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

### 1.2. Workflow Sync Outbox
- **File Path**: `apps/web/src/lib/workflows/offline-sync-engine.ts`
- **Storage Target**: IndexedDB database `'myshule-workflow-sync'`, store `'outbox'`.
- **Implementation**:
```typescript
interface WorkflowSyncDB extends DBSchema {
  outbox: {
    key: string;
    value: {
      id: string;
      actionId: string;
      workflowBinding: string;
      aggregateId: string;
      payload: Record<string, unknown>;
      timestamp: number;
      status: 'pending' | 'syncing' | 'failed';
      retryCount: number;
    };
    indexes: { 'by-status': string };
  };
}
```

### 1.3. Attendance Queue
- **File Path**: `apps/web/src/lib/modules/attendance-offline.ts`
- **Storage Target**: LocalStorage under key `"myshule_offline_attendance_queue"`.
- **Implementation**:
```typescript
export interface OfflineAttendanceRecord {
  studentId: string;
  status: "present" | "absent" | "late" | "excused";
}

export interface OfflineAttendanceTask {
  id: string; // queue ID
  streamId: string;
  tenantId: string;
  records: OfflineAttendanceRecord[];
  timestamp: number;
}
```

---

## 2. Logic Chain

The observations above yield several issues that necessitate a unified schema:

1. **Vulnerability to Tenant Data Leakage (AGP Violation)**:
   - In `WorkflowSyncDB` (Section 1.2), there is no `schoolId` or `tenantId` field stored in the database.
   - If multiple users from different schools share a device, their queued workflow actions will be retrieved, evaluated, and synced without tenant filtering, violating **Section 6 (Tenant Isolation Rules)** of the constitution.
   - In the unified schema, `schoolId` must be a mandatory indexable field for all record types.

2. **Storage Constraints & Unreliability**:
   - The attendance queue (Section 1.3) uses `localStorage`, which is capped at ~5MB, synchronous, and blockable by the main thread.
   - Large school stream attendances (or batch files) can easily exceed these storage limits or degrade performance. Moving this to IndexedDB provides safe, asynchronous, and virtually unlimited storage capacity.

3. **Inconsistent Status & State Engines**:
   - The outbox uses `pending`, `syncing`, `failed`.
   - The standard queue uses `Draft`, `Saved offline`, `Syncing`, `Synced`, `Failed`, `Needs review`.
   - The attendance queue handles retries manually inside JS logic without recording specific error messages or preserving historical metadata.
   - Unifying statuses to `Draft | Pending | Syncing | Synced | Failed | Needs review` simplifies state management, enables generic status reporting, and allows UI components (like the topbar Sync Panel) to display accurate consolidated metrics.

4. **Performance & Query Optimization**:
   - Currently, querying items by school and status requires retrieving all school items and filtering in memory.
   - Adding a compound index `['schoolId', 'status']` inside IndexedDB allows instant retrieval of pending/failed items per tenant.

---

## 3. Caveats

1. **Database Migration Plan**:
   - Since we are proposing modifying the schema of `myshule-offline-db`, the database version must be bumped (e.g., from `1` to `2`).
   - The database upgrade hook must handle version checks and safely recreate the store with updated indices, preventing schema mismatch crashes on client browsers.

2. **Refactoring Scope**:
   - Downstream code in `attendance-offline.ts` and `offline-sync-engine.ts` must be refactored to call `syncQueue` instead of directly writing to `localStorage` or `myshule-workflow-sync`.

---

## 4. Conclusion

Consolidating all client-side offline queues into a single IndexedDB table (`sync_queue`) is the only way to satisfy multi-tenant isolation, consistency, and scalability requirements. 

A unified schema has been written to:
`.agents/explorer_m3_1_1/proposed_sync-queue.ts`

### Unified Schema Details
```typescript
export type SyncStatus = 'Draft' | 'Pending' | 'Syncing' | 'Synced' | 'Failed' | 'Needs review';
export type OfflineSyncType = 'mutation' | 'workflow' | 'module_specific';

export interface OfflineSyncRecord {
  id: string;               // Client-side unique ID
  operationId: string;      // Idempotency key (actionId in workflows)
  schoolId: string;         // Tenant Isolation (tenantId)
  academicYearId?: string;  // Context info
  termId?: string;          // Context info
  userId: string;           // Operator ID
  roleId?: string;          // User role context
  deviceId: string;         // Device tracking
  type: OfflineSyncType;    // To differentiate mutations vs workflows vs module-specific actions
  module: string;           // 'attendance', 'finance', 'exams', 'workflows', etc.
  action: string;           // 'create', 'update', 'delete', or custom action name
  payload: any;             // Arbitrary payload
  status: SyncStatus;       // Sync state tracker
  retryCount: number;       // Fail retry count
  errorMessage?: string;    // Failure reason
  createdAtLocal: string;   // Local creation timestamp (ISO string)
  syncedAt?: string;        // Server sync completion timestamp
  
  // Extensions
  workflowBinding?: string; // Specific backend workflow binding name
  aggregateId?: string;     // Resource context (e.g. streamId, marksheetId, studentId)
}
```

---

## 5. Verification Method

### 5.1. File Inspection
Inspect the proposed unified schema file:
- `c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\explorer_m3_1_1\proposed_sync-queue.ts`

### 5.2. Run Tests
Verify the baseline tests pass by running:
```powershell
npm run web:test:design
```
This ensures the baseline application structure is healthy and design tests function as expected.
