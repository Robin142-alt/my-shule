## 2026-06-22T07:20:04Z
You are worker_m1_2. Your working directory is c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\worker_m1_2.
Your mission is to implement Milestones 1.2, 1.3, and 1.4 for the Core Approval Workflow Engine in MyShule.

Please complete the following tasks:
1. Create `apps/api/src/modules/discipline/discipline-approvals.handler.ts` containing the `DisciplineApprovalsHandler` class. Make sure it:
   - Registers `'DISCIPLINE'` and `'DISCIPLINE_ACTION'` with `ApprovalsExecutor` on module init.
   - On approval execution callback, calls `disciplineRepository.approveAction` with `schoolId`, `targetEntityId` (the action ID), and `approvedByUserId`.
2. Register `DisciplineApprovalsHandler` in `apps/api/src/modules/discipline/discipline.module.ts`:
   - Import `ApprovalsModule` in the `imports` array.
   - Register `DisciplineApprovalsHandler` in the `providers` array.
3. Update `DisciplineService.createAction` in `apps/api/src/modules/discipline/discipline.service.ts`:
   - Inject `ApprovalsService` in the constructor as `@Optional() private readonly approvalsService?: ApprovalsService`.
   - If the action requires approval (i.e. 'suspension' or 'expulsion') and `this.approvalsService` is defined, call `this.approvalsService.enforceApprovalRule`.
   - If it creates an approval request (mode is 'CREATE_APPROVAL_REQUEST'), return the action with the `approvalRequest` field appended.
   - If mode is 'DIRECT_APPLY', immediately approve the action in the database and return it.
4. Deprecate direct manual approval bypass endpoints in `apps/api/src/modules/discipline/discipline.controller.ts` and `apps/api/src/modules/finance/finance.controller.ts`:
   - In `DisciplineController.approveAction` (POST `actions/:actionId/approve`), look up if there is an active `ApprovalRequest` with `targetEntityType: 'DisciplineAction'`, `targetEntityId: actionId`, and status `PENDING_APPROVAL` or `ESCALATED`. If found, transition the request and execute the handler via ApprovalsController/Executor logic. If not, throw a `BadRequestException` stating: "Manual approval bypass is deprecated. Approvals must be processed via the centralized Approvals API."
   - In `FinanceController.approveWaiver` (POST `waivers/:id/approve`), look up the `ApprovalRequest` with id `id`. If found, transition the request and execute the handler. If not, throw a `BadRequestException` stating: "Manual bypass is deprecated. Approvals must be processed via the centralized Approvals API."
5. Run the build (`npm run build`) and validation tests to ensure compilation and existing module tests pass.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your changes, compile the codebase, run module tests, and write a detailed handoff.md in your directory. Report back when complete.
