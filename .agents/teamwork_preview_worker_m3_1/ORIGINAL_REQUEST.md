## 2026-06-22T00:02:25Z
You are Worker 1: Offline Database Implementer.
Your working directory is: c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\teamwork_preview_worker_m3_1
Your task is to implement Milestone 3.1: Unified IndexedDB Store.

Instructions:
1. Update `apps/web/src/lib/offline/sync-queue.ts`:
   - Define the new standardized `OfflineSyncRecord` structure supporting:
     - `type: 'mutation' | 'workflow' | 'module_specific'`
     - `workflowBinding?: string`
     - `aggregateId?: string`
     - `status: 'Draft' | 'Pending' | 'Syncing' | 'Synced' | 'Failed' | 'Needs review'` (ensure mapping from previous status states if needed, or simply standardizing).
   - Bump IndexedDB version of 'myshule-offline-db' to 2.
   - In `upgrade`, handle schema migration: if 'sync_queue' exists, delete it and recreate it with the correct indexes including a compound index 'by-school-status' on `['schoolId', 'status']`.
   - Implement strict client-side validation logic for `schoolId` inside the `enqueue` and any database write/put operations. The `schoolId` must be a non-empty, non-whitespace string, otherwise throw an Error with "Tenant Isolation Violation: A valid schoolId is required".
   - Use `zod` for parsing and validating the inputs in `enqueue` as proposed in Explorer 2's handoff.
2. Update `apps/web/src/lib/offline/use-offline-mutation.ts`:
   - Enforce that `schoolId` is valid during hook execution / mutation processing, throwing a Tenant Isolation Violation error if empty.
3. Create a unit/integration test file `apps/web/tests/design/offline-validation.test.tsx` (using Jest/RTL) or `apps/web/tests/offline-validation.test.ts` to verify that:
   - Enqueuing a record with missing, empty, or whitespace-only `schoolId` is rejected with a "Tenant Isolation Violation" error.
   - Enqueuing a record with a valid `schoolId` succeeds.
4. Run the test suite:
   - Run Jest tests for the offline queue using `npm run web:test:design`.
   - Ensure the new validation tests compile and pass.
5. Save your implementation details and test command outputs in `handoff.md` in your working directory.

MANDATORY INTEGRITY WARNING:
> DO NOT CHEAT. All implementations must be genuine. DO NOT
> hardcode test results, create dummy/facade implementations, or
> circumvent the intended task. A Forensic Auditor will independently
> verify your work. Integrity violations WILL be detected and your
> work WILL be rejected.

Your parent conversation ID is c6b3ecd2-0eb6-4a1b-97e8-88c69c5d2c0a. Report when completed.
