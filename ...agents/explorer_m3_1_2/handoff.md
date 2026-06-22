# Handoff Report: Client-Side Offline Queue Validation and Tenant Isolation

## 1. Observation
After a thorough investigation of the client-side offline queue and mutation handling codebase, the following was observed:

1. **IndexedDB Sync Queue Definition (`apps/web/src/lib/offline/sync-queue.ts`):**
   The `OfflineSyncRecord` structure includes `schoolId` specifically for tenant isolation:
   ```typescript
   // apps/web/src/lib/offline/sync-queue.ts (Lines 6-23)
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
   However, inside the `enqueue` function, there is **no runtime validation** of `schoolId`:
   ```typescript
   // apps/web/src/lib/offline/sync-queue.ts (Lines 64-83)
   async enqueue(
     recordData: Omit<OfflineSyncRecord, 'id' | 'operationId' | 'status' | 'retryCount' | 'createdAtLocal'>,
     isDraft = false
   ): Promise<OfflineSyncRecord> {
     const db = await this.getDB();
     const id = uuidv4();
     const operationId = uuidv4();

     const record: OfflineSyncRecord = {
       ...recordData,
       id,
       operationId,
       status: isDraft ? 'Draft' : 'Saved offline',
       retryCount: 0,
       createdAtLocal: new Date().toISOString(),
     };

     await db.put('sync_queue', record);
     return record;
   }
   ```
   Similarly, other write operations (such as `updateStatus`) lack runtime checks to verify that modified or rewritten records retain a valid, non-empty `schoolId`.

2. **React Mutation Hook (`apps/web/src/lib/offline/use-offline-mutation.ts`):**
   The custom React Query hook `useOfflineMutation` takes `schoolId` as an option and passes it directly to `syncQueue.enqueue` inside its error catch block:
   ```typescript
   // apps/web/src/lib/offline/use-offline-mutation.ts (Lines 41-53)
   if (isNetworkError) {
     const userId = auth?.user?.id || 'unknown-user';
     const deviceId = typeof localStorage !== 'undefined' ? localStorage.getItem('device_id') || 'unknown-device' : 'unknown-device';
     
     await syncQueue.enqueue({
       schoolId,
       userId,
       deviceId,
       module,
       action,
       payload: variables,
     });
     // ...
   ```
   No runtime assertion or check exists in this hook to ensure `schoolId` is populated. If `schoolId` is an empty string, null, or undefined, the enqueue promise resolves and the invalid record is successfully written to the local store.

3. **Isolated Local Storage Mechanism:**
   We also observed a separate offline queue handled inside `apps/web/src/lib/modules/attendance-offline.ts` that uses `tenantId` and `localStorage` (`myshule_offline_attendance_queue`), which bypasses the IndexedDB queue completely.

---

## 2. Logic Chain
The lack of validation poses a direct threat to tenant isolation:
- **Orphaned Records:** If a mutation is queued offline with a missing/empty `schoolId`, the record is persisted to IndexedDB.
- **Tenant Isolation Bypass:** When fetching items using `syncQueue.getAllForSchool(schoolId)` or `syncQueue.getRecordsBySchoolAndStatus(schoolId, status)`, those records with empty/invalid `schoolId` will not be retrieved. They will remain orphaned in the database, wasting space.
- **Cross-Tenant Leaks:** If a user logs out and another user representing a different tenant logs in on the same device, any queued write operation missing a `schoolId` (or having an invalid one) risks being executed under the wrong authentication session or synced to the wrong backend tenant, violating the strict `school_id` isolation boundary defined in `AGENTS.md`.
- **Database Consistency:** An empty or invalid string for `schoolId` results in inconsistent index keys for `by-school`.
- **Conclusion:** We must prevent any local database write to the `sync_queue` table if the `schoolId` is invalid or empty. This validation should be enforced at multiple layers: Hook layer (application level), Enqueue function (service level), and Database put/add operations (data access level).

---

## 3. Caveats
- **Active Local Storage Queue:** `attendance-offline.ts` manages its own offline queue using `localStorage` instead of IndexedDB `sync_queue`. The recommendations in this report target the IndexedDB `sync_queue`, but we advise refactoring or applying similar validation policies to the `localStorage` queues.
- **Format of `schoolId`:** We assume `schoolId` is a non-empty string. If `schoolId` must follow a specific pattern (e.g., UUIDv4 or CUID), the validation schema should be updated to enforce that format (e.g., `.uuid()`).

---

## 4. Conclusion & Recommendation

### 4.1 Client-Side Validation Logic
To guarantee that every operation has a valid, non-empty `schoolId`, we should combine a custom assertion check with a declarative **Zod schema**. Since `zod` is already a project dependency in `apps/web/package.json`, we can define a schema to validate queue records.

#### Custom Assertion Function:
```typescript
/**
 * Asserts that the schoolId is a valid, non-empty string.
 * Throws a TenantIsolationViolation if invalid.
 */
export function validateSchoolId(schoolId: unknown): asserts schoolId is string {
  if (schoolId === undefined || schoolId === null) {
    throw new Error("Tenant Isolation Violation: schoolId is required for all offline queue operations.");
  }
  if (typeof schoolId !== "string") {
    throw new Error(`Tenant Isolation Violation: schoolId must be a string, received ${typeof schoolId}.`);
  }
  if (schoolId.trim() === "") {
    throw new Error("Tenant Isolation Violation: schoolId cannot be empty or whitespace only.");
  }
}
```

#### Zod Validation Schema:
```typescript
import { z } from "zod";

export const OfflineSyncRecordSchema = z.object({
  id: z.string().uuid(),
  operationId: z.string().uuid(),
  schoolId: z.string().min(1, "schoolId is required and cannot be empty"),
  userId: z.string().min(1, "userId is required"),
  deviceId: z.string().min(1, "deviceId is required"),
  module: z.string().min(1, "module is required"),
  action: z.string().min(1, "action is required"),
  payload: z.any(),
  status: z.enum(["Draft", "Saved offline", "Syncing", "Synced", "Failed", "Needs review"]),
  retryCount: z.number().nonnegative(),
  errorMessage: z.string().optional(),
  createdAtLocal: z.string().datetime(),
  syncedAt: z.string().datetime().optional(),
  academicYearId: z.string().optional(),
  termId: z.string().optional(),
  roleId: z.string().optional(),
});

export const EnqueueRecordInputSchema = OfflineSyncRecordSchema.omit({
  id: true,
  operationId: true,
  status: true,
  retryCount: true,
  createdAtLocal: true,
});
```

---

### 4.2 Preventing Writes Without `schoolId` at Local Store Level
To guarantee tenant isolation at the local database level, we can intercept all direct IndexedDB writes. This prevents writes even if a developer bypasses the standard `enqueue()` API.

We can achieve this by implementing a **Secure Database Proxy Wrapper** or a private validation assertion inside `SyncQueueService` prior to executing `db.put`:

```typescript
// Proposed interceptor method inside SyncQueueService
class SyncQueueService {
  // ...
  
  private validateWrite(record: any): void {
    if (!record || typeof record !== 'object') {
      throw new Error("Tenant Isolation Violation: Invalid offline queue record structure.");
    }
    // Enforce non-empty schoolId validation
    validateSchoolId(record.schoolId);
  }

  // Wrap db.put in a safe internal method
  private async safePut(record: OfflineSyncRecord): Promise<void> {
    this.validateWrite(record);
    const db = await this.getDB();
    await db.put('sync_queue', record);
  }
}
```

---

### 4.3 Proposed Insertion Points

We suggest a **Defense-in-Depth** validation strategy across three points:

| Layer | Location | Purpose | Implementation details |
|---|---|---|---|
| **1. Hook Layer** | `use-offline-mutation.ts` | Early warning / UI layer protection | Assert `schoolId` is valid before starting the mutation or on initialization. |
| **2. Service Layer** | `sync-queue.ts` → `enqueue` | Business logic validation | Run Zod validation schema parsing on input data inside `enqueue()`. |
| **3. Store Layer** | `sync-queue.ts` → `db.put` / `safePut` | Bulletproof local storage safety | Enforce assertion on every IndexedDB write (both creations and status updates). |

#### Proposed Implementation Diffs:

#### 1. In `use-offline-mutation.ts`:
```typescript
export function useOfflineMutation<TData = unknown, TError = Error, TVariables = void, TContext = unknown>({
  module,
  action,
  schoolId,
  // ...
}: OfflineMutationOptions<TData, TError, TVariables, TContext>) {
  // Enforce validation during Hook instantiation/rendering to catch configuration errors early:
  if (!schoolId || schoolId.trim() === "") {
    console.error(`useOfflineMutation misconfigured for module: ${module}, action: ${action}. schoolId is empty.`);
  }

  return useMutation<TData, TError, TVariables, TContext>({
    mutationFn: async (variables: TVariables) => {
      // Prior to invoking the network/offline flow, assert schoolId is present:
      if (!schoolId || schoolId.trim() === "") {
        throw new Error("Tenant Isolation Violation: Cannot perform mutation without a valid schoolId.");
      }
      
      try {
        if (!mutationFn) throw new Error("mutationFn is required");
        return await (mutationFn as any)(variables);
      } catch (error: any) {
        // ... queue offline
      }
    }
  });
}
```

#### 2. In `sync-queue.ts`:
```typescript
import { z } from 'zod';
// Import or define EnqueueRecordInputSchema here...

class SyncQueueService {
  // ...
  
  private assertTenantSafety(record: any) {
    if (!record.schoolId || typeof record.schoolId !== 'string' || record.schoolId.trim() === '') {
      throw new Error("Tenant Isolation Violation: A valid schoolId is required for offline storage.");
    }
  }

  async enqueue(
    recordData: Omit<OfflineSyncRecord, 'id' | 'operationId' | 'status' | 'retryCount' | 'createdAtLocal'>,
    isDraft = false
  ): Promise<OfflineSyncRecord> {
    // 1. Parse and validate input data structure
    const parsedData = EnqueueRecordInputSchema.parse(recordData);
    
    const db = await this.getDB();
    const id = uuidv4();
    const operationId = uuidv4();

    const record: OfflineSyncRecord = {
      ...parsedData,
      id,
      operationId,
      status: isDraft ? 'Draft' : 'Saved offline',
      retryCount: 0,
      createdAtLocal: new Date().toISOString(),
    };

    // 2. Double-check tenant safety before writing to the database
    this.assertTenantSafety(record);

    await db.put('sync_queue', record);
    return record;
  }

  async updateStatus(id: string, status: SyncStatus, errorMessage?: string): Promise<void> {
    const db = await this.getDB();
    const record = await db.get('sync_queue', id);
    if (record) {
      record.status = status;
      if (errorMessage) record.errorMessage = errorMessage;
      if (status === 'Failed') record.retryCount += 1;
      if (status === 'Synced') record.syncedAt = new Date().toISOString();
      
      // Enforce tenant safety on updates
      this.assertTenantSafety(record);
      
      await db.put('sync_queue', record);
    }
  }
}
```

---

## 5. Verification Method
To verify that this validation logic successfully protects IndexedDB from unsafe writes:

1. **Unit Tests (`apps/web/tests/offline-validation.test.ts`):**
   Add a test file to verify that invalid inputs are correctly blocked.
   
   ```typescript
   import { syncQueue } from '../src/lib/offline/sync-queue';
   
   describe('Offline Sync Queue Tenant Isolation', () => {
     it('should throw an error and reject enqueuing when schoolId is empty', async () => {
       const invalidRecord = {
         schoolId: '',
         userId: 'user-123',
         deviceId: 'device-456',
         module: 'attendance',
         action: 'create',
         payload: { studentId: 'student-999', status: 'present' }
       };
       
       await expect(syncQueue.enqueue(invalidRecord)).rejects.toThrow(
         /Tenant Isolation Violation/
       );
     });
     
     it('should throw an error and reject enqueuing when schoolId is missing', async () => {
       const invalidRecord = {
         userId: 'user-123',
         deviceId: 'device-456',
         module: 'attendance',
         action: 'create',
         payload: { studentId: 'student-999', status: 'present' }
       } as any;
       
       await expect(syncQueue.enqueue(invalidRecord)).rejects.toThrow(
         /Tenant Isolation Violation/
       );
     });
     
     it('should successfully write when schoolId is valid', async () => {
       const validRecord = {
         schoolId: 'school-789',
         userId: 'user-123',
         deviceId: 'device-456',
         module: 'attendance',
         action: 'create',
         payload: { studentId: 'student-999', status: 'present' }
       };
       
       const record = await syncQueue.enqueue(validRecord);
       expect(record.id).toBeDefined();
       expect(record.schoolId).toBe('school-789');
       
       // Clean up
       await syncQueue.removeRecord(record.id);
     });
   });
   ```

2. **Integration Verification via Jest:**
   Run the newly added test suite:
   ```bash
   npm run test:design -- apps/web/tests/offline-validation.test.ts
   ```
