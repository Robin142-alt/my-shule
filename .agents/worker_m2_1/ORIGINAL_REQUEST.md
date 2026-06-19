## 2026-06-19T10:51:21Z
Your identity is: Worker M2.1
Your working directory is: C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\worker_m2_1\
Your task is to:
1. Delete the duplicate fake auth controller: `apps/api/src/modules/auth/auth.controller.ts`.
2. Delete the duplicate fake parent portal controllers:
   - `apps/api/src/modules/parent-portal/parent-portal.controller.ts`
   - `apps/api/src/modules/parent-portal/parent-portal-children.controller.ts`
3. Refactor the active registered `ParentPortalController` at `apps/api/src/parent-portal/parent-portal.controller.ts` and `ParentPortalService` at `apps/api/src/parent-portal/parent-portal.service.ts` to implement the missing 6 endpoints:
   - `GET /parent/overview`
   - `GET /parent/academics`
   - `GET /parent/finance`
   - `GET /parent/communication`
   - `GET /parent/dashboard`
   - `GET /parent/children`
4. Wire these endpoints in `ParentPortalService` to query real student/parent data using Prisma. Ensure:
   - Active context contains `userId` (parent user ID) and `tenantId` (schoolId).
   - Linked children are retrieved by querying `StudentGuardian` where `guardianId: userId` and `schoolId: tenantId`.
   - Overview data returns a summary of the linked children, fee balances, and recent activities.
   - Academics data returns the academic records (classes, subjects, report cards, etc.) of the linked children.
   - Finance data returns invoice and payment records (fees) for the children.
   - Communication data returns announcements, broadcast logs, or parent notification messages.
   - Ensure tenant isolation by filtering all Prisma queries by `schoolId` / `tenant_id` and ensuring parents can only see data for their linked children.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Verify your changes:
- Run `npm run build` in `apps/api` to verify compilation.

Write your changes summary to `C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\worker_m2_1\changes.md` and deliver your handoff report to `C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\worker_m2_1\handoff.md`.
Report back via send_message to parent (conversation ID: 1a55cf31-e759-421f-aa18-3c89631aa3eb).
