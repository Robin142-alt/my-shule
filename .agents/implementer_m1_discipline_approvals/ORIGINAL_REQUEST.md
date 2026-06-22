## 2026-06-22T13:06:56Z

Please implement Milestone 1 (Core Approval Workflow Engine Integration & Deprecation) based on the Explorer's handoff report at `c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\explorer_m1_discipline_approvals\handoff.md`.

Here are the specific implementation tasks:
1. Modify `apps/api/src/modules/discipline/discipline.controller.ts`:
   - Inject `ApprovalsService`.
   - Update `escalateIncident`, `resolveIncident`, `closeIncident`, and `approveAction` to enforce approval rules using `approvalsService.enforceApprovalRule`.
2. Modify `apps/api/src/modules/discipline/discipline.service.ts`:
   - Add internal execution methods `executeEscalateIncidentInternal`, `executeResolveIncidentInternal`, `executeCloseIncidentInternal`, and `executeApproveActionInternal`.
   - These methods must execute the DB mutations, create audit logs, and emit operational events without enforcing caller permissions.
3. Modify `apps/api/src/modules/discipline/discipline-approvals.handler.ts`:
   - Register handlers for `ESCALATE_INCIDENT`, `RESOLVE_INCIDENT`, `CLOSE_INCIDENT`, and `DISCIPLINE_ACTION` that call the new internal execution methods in `DisciplineService`.
4. Modify `apps/api/src/modules/finance/finance.controller.ts`:
   - Deprecate `@Post('waivers/:id/approve')` by modifying it to throw a `BadRequestException` directing users to use the Centralized Approvals API.
5. Create the Next.js API proxy route for Approvals:
   - Create `apps/web/src/app/api/approvals/[...path]/route.ts`. It must export GET, POST, PATCH, PUT, and DELETE methods that proxy requests to NestJS's `/api/approvals` prefix using the helper `proxySchoolApiRequest` from `@/lib/dashboard/server-api-proxy`.
6. Run `npm run build` and prisma validation checks to verify there are no TypeScript or schema errors.
7. Run automated tests (e.g. `npm run test` or specific discipline/finance tests) to ensure the changes compile and function correctly.

MANDATORY INTEGRITY WARNING:
> DO NOT CHEAT. All implementations must be genuine. DO NOT
> hardcode test results, create dummy/facade implementations, or
> circumvent the intended task. A Forensic Auditor will independently
> verify your work. Integrity violations WILL be detected and your
> work WILL be rejected.

Please write a handoff.md inside your folder detailing your changes, including test execution outputs and layout verification, then send a message when done.
