# Handoff Report - Core Approval Workflow Engine & Discipline Module Integration (Milestone 1)

## 1. Observation

We performed a read-only investigation of the codebase to design the integration of the Core Approval Workflow Engine with the Discipline module. Below are the exact file paths, line numbers, and verbatim code segments observed:

### 1.1 Sensitive Discipline Endpoints
In `apps/api/src/modules/discipline/discipline.controller.ts`, the incident lifecycle transition endpoints currently bypass any approval rules and directly mutate database status:
* **Escalate Incident** (lines 151–158):
  ```typescript
  @Post('incidents/:incidentId/escalate')
  @Permissions('discipline:manage')
  escalateIncident(
    @Param('incidentId', new ParseUUIDPipe()) incidentId: string,
    @Body() dto: { reason?: string },
  ) {
    return this.disciplineService.escalateIncident(incidentId, dto.reason);
  }
  ```
* **Resolve Incident** (lines 160–167):
  ```typescript
  @Post('incidents/:incidentId/resolve')
  @Permissions('discipline:manage')
  resolveIncident(
    @Param('incidentId', new ParseUUIDPipe()) incidentId: string,
    @Body() dto: { reason?: string },
  ) {
    return this.disciplineService.resolveIncident(incidentId, dto.reason);
  }
  ```
* **Close Incident** (lines 169–176):
  ```typescript
  @Post('incidents/:incidentId/close')
  @Permissions('discipline:manage')
  closeIncident(
    @Param('incidentId', new ParseUUIDPipe()) incidentId: string,
    @Body() dto: { reason?: string },
  ) {
    return this.disciplineService.closeIncident(incidentId, dto.reason);
  }
  ```

### 1.2 Legacy Direct Approval Bypass Endpoints
Manual bypass endpoints exist that allow direct state changes without going through the approvals engine queue:
* **Discipline Action Manual Bypass** in `apps/api/src/modules/discipline/discipline.controller.ts` (lines 196–200):
  ```typescript
  @Post('actions/:actionId/approve')
  @Permissions('discipline:approve')
  approveAction(@Param('actionId', new ParseUUIDPipe()) actionId: string) {
    return this.disciplineService.approveAction(actionId);
  }
  ```
* **Fee Waiver Manual Bypass** in `apps/api/src/modules/finance/finance.controller.ts` (lines 474–502):
  ```typescript
  @Post('waivers/:id/approve')
  @Permissions('finance:write')
  async approveWaiver(@Param('id') id: string, @Body() dto: { approved: boolean }) {
    const tenantId = this.requestContext.requireStore().tenant_id;
    const result = await this.db.query(
      `UPDATE tenant_pending_waivers SET status = $1 WHERE id = $2 AND tenant_id = $3 RETURNING *`,
      [dto.approved ? 'approved' : 'rejected', id, tenantId]
    );
    // ... Direct balance updates ...
  ```

### 1.3 Core Approval Engine & Existing Handlers
* **`enforceApprovalRule`** in `apps/api/src/modules/approvals/approvals.service.ts` (lines 62–121):
  Takes an `EnforceApprovalContext` and returns `mode: 'DIRECT_APPLY'` or `mode: 'CREATE_APPROVAL_REQUEST'`.
* **`DisciplineApprovalsHandler`** in `apps/api/src/modules/discipline/discipline-approvals.handler.ts` (lines 1–26):
  Only registers `'DISCIPLINE'` and `'DISCIPLINE_ACTION'` with `ApprovalsExecutor` on module init to call `disciplineRepository.approveAction` directly. It does not handle incident transitions or enforce the request context.

---

## 2. Logic Chain

1. **Controller-Level Enforcement**: Intercepting the mutations in `DisciplineController` ensures that before any state transition (escalation, resolution, closure, or action approval) is executed, the approvals engine (`ApprovalsService`) is queried to verify if an approval rule is active for that action.
2. **Context Resolution**: The controller already accesses the `RequestContextService` (which holds tenant `tenant_id`, user `user_id`, and `role`). These variables can be extracted safely to populate the `EnforceApprovalContext` passed to `enforceApprovalRule`.
3. **Execution Context Handling in Handler**: Because the approvals handler runs outside the standard REST request lifecycle (invoked asynchronously by the approvals controller), the request context storage (`AsyncLocalStorage`) will lack user context or reference the approver.
4. **Seeding Request Context**: Wrapping the execution in `RequestContextService.run` seeds the active context thread-locally. This ensures that downstream checks (e.g. `requireTenantId`, `assertPermission`, `actorUserId`) and audit logging functions succeed without throwing `ForbiddenException` or `InternalServerErrorException`.
5. **Dynamic Service Resolution**: Since `DisciplineService` optionally injects `ApprovalsService`, which references `ApprovalsExecutor`, having `DisciplineApprovalsHandler` directly inject `DisciplineService` would introduce a dependency cycle. Injecting the NestJS `ModuleRef` and resolving `DisciplineService` dynamically via `this.moduleRef.get(DisciplineService)` avoids any circular dependency issues.
6. **Hard Deprecation**: Directly throwing `BadRequestException` on the legacy endpoints (`@Post('actions/:actionId/approve')` and `@Post('waivers/:id/approve')`) is the most robust way to ensure all approvals route exclusively through the centralized approvals API, adhering to the multi-tenant governance protocols in `AGENTS.md`.

---

## 3. Caveats

* **Assumptions on Approver Roles**: We assume that when the approvals handler executes, the `approvedByUserId` passed in the callback has enough authority or can be granted a wildcard permission (`['*:*']`) to run the transition.
* **Audit Actor Attribution**: The audit logs will record the approver's user ID as the actor because the mutation is being executed inside a request context seeded with the approver's credentials. This is the intended behavior since the approver is the one authorizing the change.

---

## 4. Conclusion

Integrating the Centralized Approval Workflow Engine with the Discipline module is fully actionable. We recommend:
1. Intercepting the four sensitive endpoints in `DisciplineController` and routing them through `ApprovalsService.enforceApprovalRule`.
2. Enhancing `DisciplineApprovalsHandler` to support `ESCALATE_INCIDENT`, `RESOLVE_INCIDENT`, and `CLOSE_INCIDENT` actions, wrapping executions in a seeded `RequestContextService.run()` scope.
3. Implementing a hard deprecation (throwing `BadRequestException`) for the legacy bypass endpoints in both `DisciplineController` and `FinanceController`.

---

## 5. Verification Method

### 5.1 Verification Command
* Run the NestJS build script to ensure no TypeScript compilation or circular dependency errors:
  ```powershell
  npm run build
  ```
* Run the test suite for the discipline module to ensure existing behaviors remain intact:
  ```powershell
  npx jest apps/api/src/modules/discipline/discipline.test.js
  ```

### 5.2 Files to Inspect
* Check `apps/api/src/modules/discipline/discipline.controller.ts` to ensure `ApprovalsService` is injected and the four endpoints invoke it.
* Check `apps/api/src/modules/discipline/discipline-approvals.handler.ts` to verify the new handlers are registered and wrapped in `RequestContextService.run()`.
* Check `apps/api/src/modules/finance/finance.controller.ts` and `apps/api/src/modules/discipline/discipline.controller.ts` to confirm deprecated endpoints throw the exact deprecation exceptions.

---

# Step-by-Step Implementation Strategy

### Phase 1: Controller Modifications
1. In `apps/api/src/modules/discipline/discipline.controller.ts`, import `ApprovalsService`:
   ```typescript
   import { ApprovalsService } from '../approvals/approvals.service';
   ```
2. Inject the service in the class:
   ```typescript
   @Inject(ApprovalsService)
   private readonly approvalsService!: ApprovalsService;
   ```
3. Update `escalateIncident`, `resolveIncident`, and `closeIncident` to check for active rules. For example, for `escalateIncident`:
   ```typescript
   @Post('incidents/:incidentId/escalate')
   @Permissions('discipline:manage')
   async escalateIncident(
     @Param('incidentId', new ParseUUIDPipe()) incidentId: string,
     @Body() dto: { reason?: string },
   ) {
     const store = this.requestContext.requireStore();
     const tenantId = store.tenant_id;
     const userId = store.user_id;
     const role = store.role || 'staff';

     const approvalResult = await this.approvalsService.enforceApprovalRule({
       schoolId: tenantId,
       userId,
       userRole: role,
       module: 'DISCIPLINE',
       action: 'ESCALATE_INCIDENT',
       targetEntityType: 'DISCIPLINE_INCIDENT',
       targetEntityId: incidentId,
       reason: dto.reason,
     });

     if (approvalResult.mode === 'CREATE_APPROVAL_REQUEST') {
       return {
         success: true,
         status: 'PENDING_APPROVAL',
         message: 'Escalation request submitted for approval.',
         request: approvalResult.request,
       };
     }

     return this.disciplineService.escalateIncident(incidentId, dto.reason);
   }
   ```
4. Repeat this wrapping pattern for `resolveIncident` (`action: 'RESOLVE_INCIDENT'`) and `closeIncident` (`action: 'CLOSE_INCIDENT'`).

### Phase 2: Execution Handler Implementation
1. In `apps/api/src/modules/discipline/discipline-approvals.handler.ts`, import `ModuleRef` and `RequestContextService`:
   ```typescript
   import { ModuleRef } from '@nestjs/core';
   import { RequestContextService } from '../../common/request-context/request-context.service';
   import { DisciplineService } from './discipline.service';
   ```
2. Modify the constructor to inject `RequestContextService` and `ModuleRef`:
   ```typescript
   constructor(
     private readonly approvalsExecutor: ApprovalsExecutor,
     private readonly disciplineRepository: DisciplineRepository,
     private readonly requestContext: RequestContextService,
     private readonly moduleRef: ModuleRef,
   ) {}
   ```
3. Register the execution handlers for the new actions inside `onModuleInit()`:
   ```typescript
   // Escalation Action Handler
   this.approvalsExecutor.registerHandler('DISCIPLINE', 'ESCALATE_INCIDENT', async (context) => {
     this.logger.log(`Executing approved discipline incident escalation: ${JSON.stringify(context)}`);
     const { schoolId, targetEntityId, approvedByUserId, newValue } = context;
     const disciplineService = this.moduleRef.get(DisciplineService, { strict: false });
     
     await this.requestContext.run({
       tenant_id: schoolId,
       user_id: approvedByUserId,
       role: 'principal',
       permissions: ['*:*'],
       is_authenticated: true,
       request_id: `approval-exec-escalate-${targetEntityId}`,
     }, async () => {
       await disciplineService.escalateIncident(targetEntityId, newValue?.reason);
     });
   });

   // Repeat similar registrations for 'RESOLVE_INCIDENT' and 'CLOSE_INCIDENT'
   ```

### Phase 3: Deprecation of Manual Bypasses
1. In `apps/api/src/modules/discipline/discipline.controller.ts`, modify `approveAction`:
   ```typescript
   @Post('actions/:actionId/approve')
   @Permissions('discipline:approve')
   approveAction(@Param('actionId', new ParseUUIDPipe()) actionId: string) {
     throw new BadRequestException(
       'This endpoint is deprecated. All approvals must route through the centralized approvals API (/api/approvals/:id/action).'
     );
   }
   ```
2. In `apps/api/src/modules/finance/finance.controller.ts`, modify `approveWaiver`:
   ```typescript
   @Post('waivers/:id/approve')
   @Permissions('finance:write')
   async approveWaiver(@Param('id') id: string) {
     throw new BadRequestException(
       'This endpoint is deprecated. All approvals must route through the centralized approvals API (/api/approvals/:id/action).'
     );
   }
   ```
