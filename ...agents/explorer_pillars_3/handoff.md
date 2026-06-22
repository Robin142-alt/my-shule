# Handoff Report — Offline Sync Engine and E2E Tenant Security Test Suite Audit

This handoff report summarizes the architectural audit of the Offline Sync Engine and E2E Tenant Security Test Suite in the MyShule codebase, outlining direct observations, logical inferences, caveats, conclusions, and verification methods.

---

## 1. Observation

### A. Offline Sync Status in the Codebase

#### 1. Backend Controller Methods
- **`operational-workflow-dispatcher.controller.ts`**:
  - Located at `apps/api/src/modules/events/operational-workflow-dispatcher.controller.ts`.
  - It exposes a `GET` endpoint for retrieving operational sync metrics at line 97:
    ```typescript
    @Get('offline-sync')
    @Permissions('platform:operational-execute')
    async getOfflineSync() {
      const store = this.requestContext.requireStore();
      const tenantId = store.tenant_id;
      if (!tenantId) {
        return { pending: 0, synced: 0, failed: 0, conflicts: 0, status: 'operational' };
      }

      try {
        const result = await this.prisma.$queryRawUnsafe<any[]>(
          `SELECT COUNT(*)::int as count FROM sync_operation_logs WHERE tenant_id = $1::uuid`,
          tenantId
        );
        const syncedCount = result[0]?.count ?? 0;
        return {
          pending: 0,
          synced: syncedCount,
          failed: 0,
          conflicts: 0,
          status: 'operational',
        };
      } catch (e: any) {
        console.error('getOfflineSync error:', e);
        throw new InternalServerErrorException(e.message || 'Database error occurred');
      }
    }
    ```
  - It also exposes a `POST` endpoint for syncing individual offline actions at line 71:
    ```typescript
    @Post('offline-sync')
    @Permissions('platform:operational-execute')
    async syncOfflineAction(
      @Body() body: { action_id: string; workflow_binding: string; aggregate_id: string; payload: any }
    ) {
      const store = this.requestContext.requireStore();
      return this.operationalWorkflowDispatcher.dispatchRuntimeRoleAction(
        store.role || 'UNKNOWN',
        body.action_id,
        {
          aggregateId: body.aggregate_id,
          payload: {
            ...body.payload,
            runtimeActionContract: {
              workflowBinding: body.workflow_binding,
              executionHandler: 'default',
              auditEvent: 'offline.sync.action.dispatched',
              eventContract: ['workflow.action.dispatched'],
              retryPolicy: 'RETRY',
              fallbackHandler: 'default'
            }
          },
        }
      );
    }
    ```

- **Dedicated Sync Module**:
  - Located at `apps/api/src/modules/sync/`.
  - Exposes endpoints under `@Controller('sync')` in `sync.controller.ts`:
    - `POST /sync/devices/register`
    - `POST /sync/push` (pushed records processing)
    - `POST /sync/pull` (fetching updates)
    - `GET /sync/status`
    - `POST /sync/retry`
    - `POST /sync/resolve-conflict`
  - In `sync.service.ts`, `getStatus()` currently returns a mock response (lines 448-459):
    ```typescript
    async getStatus() {
      const tenantId = this.requireTenantId();
      return {
        tenantId,
        status: 'online',
        pendingCount: 0,
        failedCount: 0,
        lastSyncedAt: new Date().toISOString(),
      };
    }
    ```
  - Conflict resolution:
    - `AttendanceSyncConflictResolverService` (in `conflict-resolvers/attendance-sync-conflict-resolver.service.ts`) implements Last-Write-Wins (LWW) conflict resolution logic based on timestamps/versions.
    - `FinanceSyncConflictResolverService` (in `conflict-resolvers/finance-sync-conflict-resolver.service.ts`) enforces that finance is server-authoritative by always rejecting offline pushes:
      ```typescript
      reason: 'Finance is server authoritative and cannot be mutated from offline devices'
      ```

#### 2. Frontend Offline status and UI Mockups
On the client side (`apps/web`), three separate offline queue mechanisms exist:
- **LocalStorage Attendance Queue**:
  - File: `apps/web/src/lib/modules/attendance-offline.ts`
  - Key: `const STORAGE_KEY = "myshule_offline_attendance_queue";` (line 17).
  - Uses a hook `useOfflineAttendanceSync` that listens to `online`/`offline` window events and retries sending unsynced attendance lists via the `withSession` post wrapper when network is restored.
- **Workflow Outbox Engine (IndexedDB)**:
  - File: `apps/web/src/lib/workflows/offline-sync-engine.ts`
  - Open DB: `openDB<WorkflowSyncDB>('myshule-workflow-sync', 1, ...)` (line 27).
  - Defines an `outbox` store containing: `id`, `actionId`, `workflowBinding`, `aggregateId`, `payload`, `timestamp`, `status: 'pending' | 'syncing' | 'failed'`, `retryCount`.
  - Calls `POST /api/operational-workflows/offline-sync` to sync each action.
  - *Observation*: This file is exported but not imported or activated in any page layout.
- **Standard Offline Mutation Queue (IndexedDB)**:
  - File: `apps/web/src/lib/offline/sync-queue.ts`
  - Open DB: `openDB<ShuleOfflineDB>('myshule-offline-db', 1, ...)` (line 47).
  - Store: `sync_queue` containing: `id`, `operationId`, `schoolId` (tenant isolation), `userId`, `deviceId`, `module`, `action`, `payload`, `status: 'Draft' | 'Saved offline' | 'Syncing' | 'Synced' | 'Failed' | 'Needs review'`, `retryCount`, `errorMessage`, `createdAtLocal`, `syncedAt`.
  - Active via the hook `useOfflineMutation` in `apps/web/src/lib/offline/use-offline-mutation.ts` which intercepts network/5xx errors on TanStack mutations, enqueues actions locally, and provides optimistic UI updates.
  - Manual retry UI: `apps/web/src/components/sync/SyncCenter.tsx` displays the records list and offers a "Retry Failed Syncs" button pointing to `POST /api/sync/retry`.
- **System Monitor Diagnostic Panel**:
  - File: `apps/web/src/components/platform/system-monitor-dashboard.tsx`
  - *Observation*: The `OfflineSyncWorkspace` component at line 424 returns a static mockup HTML table and does not query any dynamic API status endpoint:
    ```tsx
    function OfflineSyncWorkspace() {
      return (
        <Panel title="Offline Sync Monitor" ...>
          ...
          <tbody className="divide-y divide-[#D8E0EC]">
            <tr className="hover:bg-[#F8FAFC]">
              <td className="px-4 py-3 font-semibold text-[#071D49]">Kisumu Boys</td>
              <td className="px-4 py-3 text-[#64748B]">Attendance</td>
              <td className="px-4 py-3 text-[#64748B]">Teacher</td>
              <td className="px-4 py-3 text-[#071D49]">Submit Register</td>
              <td className="px-4 py-3"><StatusChip label="Conflict" tone="warning" /></td>
              ...
            </tr>
          </tbody>
        </Panel>
      );
    }
    ```

---

### B. Testing Framework Setups

#### 1. Package.json Audit
- Root `package.json` scripts:
  - `"test": "npm run build && node --test ..."` (runs Jest compiled outputs using node's test runner, mapping multiple integration tests).
  - `"test:tenant-isolation": "jest --config jest.integration.config.js --runInBand apps/api/test/tenant-isolation.integration-spec.ts"` (runs Jest backend RLS spec).
  - `"test:e2e": "playwright test"` (runs root-level Playwright tests).
  - `"web:test:design:e2e": "npm --prefix apps/web run test:design:e2e"` (triggers frontend Playwright suite).
- Root devDependencies:
  - `"jest": "^30.3.0"`, `"ts-jest": "^29.4.9"`, `"typescript": "^5.7.2"`.
- `apps/web/package.json` scripts:
  - `"test:design": "jest --config jest.config.ts --runInBand"` (runs frontend React testing library tests).
  - `"test:design:e2e": "playwright test -c playwright.config.ts"` (runs design spec playwright tests).
  - `"test:e2e:production-pilot": "playwright test -c tests/e2e/production-pilot.config.ts"` (runs production pilot e2e tests).

#### 2. Playwright Configurations & Tests
- Playwright is configured in `apps/web/playwright.config.ts` matching `./tests/design` folders.
- Playwright tests are stored in two folders under `apps/web/tests/`:
  1. `apps/web/tests/design/`: Includes frontend-mocked specs like `dashboard.spec.ts` and `experience-separation.spec.ts`.
  2. `apps/web/tests/e2e/`: Includes full E2E suites: `auth/login.spec.ts`, `finance/fee-structures.spec.ts`, `finance/invoices.spec.ts`, `finance/payments.spec.ts`, and `production-pilot.spec.ts`.
- Playwright E2E fixtures:
  - `fixtures/database.fixture.ts` establishes a `dbPool` / `dbQuery` for direct test setup/cleanup database queries.
  - `fixtures/auth.fixture.ts` defines `RoleCredentials` (Principal, Teacher, Librarian, Accountant, Secretary, SuperAdmin) and helper functions `loginAs(page, role)` / `logout(page)` for automated session authentication.

---

## 2. Logic Chain

1. **Disconnected Queues**: Since `localStorage` (for attendance), `myshule-workflow-sync` (outbox, unused), and `myshule-offline-db` (active, standard mutations) exist as three independent client databases/queues, local-first writes do not follow a unified synchronization process. Synchronizing offline states requires consolidating or standardizing these structures.
2. **Missing Service Worker**: No service worker script (`sw.js` or `service-worker.ts`) is currently registered or present in `apps/web/src/` or `apps/web/public/`. Background sync triggers currently run on the main thread via standard polling (`setInterval`) or React event bindings (`window.addEventListener('online')`). This makes syncing vulnerable to browser tab closure.
3. **No Playwright E2E Isolation Tests**: Although backend RLS policies and tenant boundaries are heavily covered in `apps/api/test/tenant-isolation.integration-spec.ts` using Supertest, no E2E tenant isolation check exists in Playwright's `apps/web/tests/e2e/`. E2E tests should be added to verify that tenant users are blocked from navigating directly to pages or accessing APIs belonging to other schools (such as swapping school IDs in dashboard paths).

---

## 3. Caveats

- **Network offline simulation**: The offline state transitions rely on standard `navigator.onLine` checks. In realistic low-connectivity environments (such as remote schools in Kenya), latency may cause requests to hang without raising immediate offline exceptions, requiring robust timeout interceptors.
- **Service Worker lifecycle**: Nesting a Service Worker inside Next.js (`apps/web`) requires handling hydration mismatches when server-side rendered pages expect data that is locally cached or queued.
- **No live DB migrations verified**: The schema presence of `sync_operation_logs` was verified via `schema.sql` and `schema.prisma`, but live migration runs were not performed.

---

## 4. Conclusion

The Offline Sync Engine has a functional PostgreSQL/Prisma log repository and conflict resolvers (Last-Write-Wins for attendance, Server-Authoritative rejection for finance) on the backend, but is not fully integrated with a background Service Worker on the frontend. The system monitor UI relies on static mockups.

For E2E tenant isolation testing, a robust Jest integration suite exists on the backend, but a Playwright-based frontend E2E isolation test suite is missing from the E2E folder.

---

## 5. Recommended Implementation Strategy

### A. Local-First Synchronization utilizing IndexedDB and Service Workers

```
[ Frontend App ]
   │
   ├─► mutate ──► (Online?) ──YES──► [ POST API ] ──► [ DB ]
   │                 │
   │                NO
   │                 ▼
   ├─► [ useOfflineMutation ]
   │         │
   │      (Enqueue with schoolId)
   │         ▼
   ├─► [ IndexedDB (myshule-offline-db / sync_queue) ]
   │
   ├─► [ Service Worker ] (Listen: 'sync' event / 'online')
   │         │
   │         ├─► Read IndexedDB for 'Saved offline'/'Failed' records
   │         ├─► Send POST to /api/sync/push or /api/sync/retry
   │         └─► Update status to 'Synced' or 'Failed' (with error message)
   ▼
[ UI Components (Topbar, Sync Center) ] ◄── (Subscribe to IndexedDB)
```

1. **Unified IndexedDB Store**:
   - Standardize all offline writes on the `myshule-offline-db` database's `sync_queue` store.
   - Enforce the inclusion of `schoolId` on every enqueued object to ensure client-side tenant isolation (prevents staff members from seeing or mixing cached data of other schools on shared devices).

2. **Service Worker Background Sync**:
   - Create a service worker file: `apps/web/public/sw.js`.
   - Register it at application startup (`apps/web/src/app/providers.tsx` or similar):
     ```javascript
     if ('serviceWorker' in navigator && 'SyncManager' in window) {
       navigator.serviceWorker.register('/sw.js').then((reg) => {
         window.addEventListener('online', () => reg.sync.register('sync-offline-queue'));
       });
     }
     ```
   - Inside the Service Worker (`sw.js`), implement the `sync` event handler using `idb` to fetch operations and push them in batches:
     ```javascript
     self.addEventListener('sync', (event) => {
       if (event.tag === 'sync-offline-queue') {
         event.waitUntil(syncOfflineQueue());
       }
     });
     ```
   - In `syncOfflineQueue()`, make a POST request to `/api/sync/push` (which corresponds to the NestJS `SyncService.push(dto)`).
   - If the backend applies the transaction, delete or mark the item as `'Synced'` in IndexedDB. If the backend returns a conflict or rejects (such as offline finance edits), mark the item as `'Needs review'` or `'Failed'`.

3. **Status Indicators**:
   - Expose the counts of `sync_queue` records directly to `Topbar.tsx` by using a custom hook `useSyncQueueMetrics()` that queries the `sync_queue` IndexedDB store.
   - Update `OfflineSyncWorkspace` in `apps/web/src/components/platform/system-monitor-dashboard.tsx` to pull actual records from the backend `GET /api/sync/status` and render genuine counts and conflict states.

---

### B. E2E Tenant Isolation Test Suite Placement

Add Playwright E2E tests under `apps/web/tests/e2e/tenant-isolation.spec.ts` using the existing fixtures.

#### Proposed Test Structure:
```typescript
import { expect } from '@playwright/test';
import { test } from '../fixtures/database.fixture';
import { loginAs, logout } from '../fixtures/auth.fixture';

test.describe('E2E Tenant Isolation Verification', () => {

  test('Tenant A cannot access Tenant B dashboard routes or records', async ({ page }) => {
    // 1. Log in as Principal of Tenant A (Kisumu Boys)
    await loginAs(page, 'Principal');
    
    // 2. Attempt to navigate directly to a dashboard path belonging to another tenant
    // E.g. Alliance High or custom tenant ID
    const allianceHighDashboardUrl = '/school/admin?school_id=alliance-high-id';
    await page.goto(allianceHighDashboardUrl);
    
    // 3. Assert redirect or secure error page is shown
    await expect(page).toHaveURL(/.*(\/login|\/error|unauthorized).*/);
    
    // 4. Confirm no cross-tenant student data is accessible
    const tenantBStudentId = 'some-uuid-from-tenant-b';
    await page.goto(`/school/admin/students/${tenantBStudentId}`);
    
    // Expect 404 or Secure Access Error
    await expect(page.locator('text=Not Found').or(page.locator('text=Access Denied'))).toBeVisible();
    
    await logout(page);
  });

  test('Logged-in user token rejection on session hijack', async ({ page, context }) => {
    await loginAs(page, 'Teacher');
    
    // Attempt to hijack and set cookies/headers belonging to another school
    await context.addCookies([{
      name: 'tenant_id',
      value: 'malicious-tenant-uuid',
      domain: '127.0.0.1',
      path: '/'
    }]);
    
    await page.reload();
    // Verify system logs the user out or redirects to safe dashboard
    await expect(page).toHaveURL(/.*\/login/);
  });
});
```

---

## 6. Verification Method

1. **Verify offline mock indicators**:
   Run the Jest design suite for the offline dashboard:
   ```bash
   npm run web:test:design -- offline
   ```
   Inspect `apps/web/tests/design/offline.test.tsx` to verify the UI assertions.

2. **Verify Playwright E2E suites**:
   Run E2E tests:
   ```bash
   npm run test:e2e
   ```
   Or run the specific pilot tests:
   ```bash
   npm run test:prod-ready
   ```

3. **Verify Backend Tenant Isolation Rules**:
   Run the backend integration RLS test:
   ```bash
   npm run test:tenant-isolation
   ```
