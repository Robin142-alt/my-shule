## 2026-06-20T20:06:17Z
You are a Worker agent. Implement R2 Backend Tenant Isolation checks in the following files:

1. **Student Exit Clearance**:
   - File: `apps/api/src/modules/students/student-lifecycle.service.ts`
   - Fix: Inside `exitStudent` method (around line 192), when checking `clearanceId`, verify that `clearance` exists, belongs to the caller's school context (`schoolId`), AND that `clearance.studentId === studentId`. Throw `BadRequestException('Student must be fully cleared before exiting')` if validation fails.

2. **Medicine Dispensing Stock updates**:
   - File: `apps/api/src/modules/operations/consumers/dispense-medicine.consumer.ts`
   - Fix: Inside event handler `handle`, assert that the student exists and belongs to the current tenant (`tenant_id`). If `data.medicalVisitId` is provided, assert it belongs to `tenant_id` and the specified `studentId`. Verify that the medicine inventory item exists and belongs to `tenant_id` before updating quantity.

3. **Stock Issuing isolation**:
   - File: `apps/api/src/modules/operations/consumers/issue-stock.consumer.ts`
   - Fix: Inside `handle` event handler, if `data.issuedToDepartmentId` is provided, verify that the department exists and belongs to `tenant_id`.

4. **Payment Posting**:
   - File: `apps/api/src/modules/operations/consumers/record-payment.consumer.ts`
   - Fix: Inside `handle` event handler, verify that the student exists and belongs to `tenant_id`. If `data.invoiceId` is provided, assert it belongs to `tenant_id` AND the invoice's `studentId` matches the requested `data.studentId`.

5. **Secretary Queue ticket & Visitor logs**:
   - File: `apps/api/src/modules/secretary/secretary.controller.ts`
   - Fix: Inside `handleInquiries`, replace `findUnique` calls on `WorkflowTask` with `findFirst` checking `id` and `schoolId: tenantId`. Throw `BadRequestException('Task not found')` if the task is not found.
   - Inside `handleVisitors` (actions `print_slip` and `check_out`), replace `findUnique` calls on `VisitorLog` with `findFirst` checking `id` and `schoolId: tenantId`. Throw `BadRequestException('Visitor log not found')` if not found.

6. **Support Controller (Discipline & Counselling)**:
   - File: `apps/api/src/modules/support/support.controller.ts`
   - Fix: Inside `update_case`, validate that `id` conforms to UUID format (via regex `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`) to prevent Postgres casting crashes. Query `DisciplineIncident` using `findFirst` checking `id` and `school_id: tenantId` or `tenant_id: tenantId`. If not found, throw `BadRequestException('Discipline incident not found or access denied')`.
   - Inside `update_session`, validate `id` is a valid UUID. Query and update `LegacyCounsellingSession` using Prisma ORM (e.g. `tx.legacyCounsellingSession.findFirst` and `tx.legacyCounsellingSession.update`) enforcing `school_id` or `tenant_id` context. If not found, throw `BadRequestException('Counselling session not found or access denied')`.

Run typescript checks and tests to verify compile-safety and that tenant boundaries are intact. Save your handoff report in c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\worker_m2\handoff.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
