## 2026-06-22T12:55:14Z

Please perform a read-only exploration of the codebase to design the integration of the Core Approval Workflow Engine with the Discipline module (Milestone 1).
Analyze the following files:
- apps/api/src/modules/discipline/discipline.controller.ts
- apps/api/src/modules/discipline/discipline.module.ts
- apps/api/src/modules/discipline/discipline.service.ts
- apps/api/src/modules/finance/finance.controller.ts
- apps/api/src/modules/approvals/approvals.service.ts
- apps/api/src/modules/approvals/approvals.controller.ts
- apps/api/src/modules/approvals/approvals.executor.ts

Your objective is to:
1. Identify how to modify the sensitive endpoints in discipline.controller.ts (escalateIncident, resolveIncident, closeIncident, and approveAction) to enforce approvals using ApprovalsService.enforceApprovalRule, passing correct details (tenant_id/schoolId, actor user_id, action, aggregate/entity types and IDs, and reason).
2. Detail how to handle the execution context in the discipline approvals handler (DisciplineApprovalsHandler) when the approval is granted.
3. Recommend how to deprecate old manual bypass endpoints in discipline.controller.ts (@Post('actions/:actionId/approve')) and finance.controller.ts (@Post('waivers/:id/approve')).
4. Ensure compliance with AGENTS.md (tenant isolation, event publication, proper validation).

Write your findings and a step-by-step implementation strategy to a handoff/report file inside your working directory. Do NOT modify any source code files.
