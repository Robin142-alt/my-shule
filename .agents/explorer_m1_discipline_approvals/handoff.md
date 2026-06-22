# Centralized Approvals & Discipline Integration Design Report

This report outlines the technical design for integrating the centralized **Core Approval Workflow Engine** with the **Discipline** module (Milestone 1), deprecating manual bypass endpoints, and ensuring strict compliance with multi-tenancy, auditing, and event guidelines.

---

## 1. Observation

Direct code observations from the codebase:

### A. Sensitive Endpoints in `DisciplineController`
Located in `apps/api/src/modules/discipline/discipline.controller.ts`:
- **Escalate incident** (lines 151-158):
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
- **Resolve incident** (lines 160-167):
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
- **Close incident** (lines 169-176):
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
- **Approve action** (lines 196-200):
  ```typescript
  @Post('actions/:actionId/approve')
  @Permissions('discipline:approve')
  approveAction(@Param('actionId', new ParseUUIDPipe()) actionId: string) {
    return this.disciplineService.approveAction(actionId);
  }
  ```

### B. Central Approvals Execution Flow
Located in `apps/api/src/modules/approvals/approvals.controller.ts` (lines 110-123):
```typescript
      const executionContext = {
        schoolId: request.schoolId,
        targetEntityType: request.targetEntityType,
        targetEntityId: request.targetEntityId,
        oldValue: request.oldValue,
        newValue: request.newValue,
        requestedByUserId: request.requestedByUserId,
        approvedByUserId: userId,
      };

      await this.approvalsExecutor.execute(request.module, request.action, executionContext);
```

### C. Old Manual Bypass Endpoints
- **Discipline action bypass** in `DisciplineController` (lines 196-200) directly performs status mutations.
- **Waiver bypass** in `apps/api/src/modules/finance/finance.controller.ts` (lines 474-502):
  ```typescript
  @Post('waivers/:id/approve')
  @Permissions('finance:write')
  async approveWaiver(@Param('id') id: string, @Body() dto: { approved: boolean }) {
    const tenantId = this.requestContext.requireStore().tenant_id;
    const result = await this.db.query(
      `UPDATE tenant_pending_waivers SET status = $1 WHERE id = $2 AND tenant_id = $3 RETURNING *`,
      [dto.approved ? 'approved' : 'rejected', id, tenantId]
    );
    ...
  ```

---

## 2. Logic Chain

The step-by-step logic detailing the design from observations to the conclusion:

### Step 2.1: Enforcing Approvals in the Controller
To transition the sensitive endpoints from immediate mutations to governed approvals, the `DisciplineController` must inject `ApprovalsService` and wrap the service calls with `enforceApprovalRule`.

The context mapping for each endpoint will look like this:

| Endpoint | Action String | Target Entity Type | Target Entity ID | Payload (`newValue`) |
|---|---|---|---|---|
| `escalateIncident` | `'ESCALATE_INCIDENT'` | `'DISCIPLINE_INCIDENT'` | `incidentId` | `{ reason: dto.reason }` |
| `resolveIncident` | `'RESOLVE_INCIDENT'` | `'DISCIPLINE_INCIDENT'` | `incidentId` | `{ reason: dto.reason }` |
| `closeIncident` | `'CLOSE_INCIDENT'` | `'DISCIPLINE_INCIDENT'` | `incidentId` | `{ reason: dto.reason }` |
| `approveAction` | `'DISCIPLINE_ACTION'` | `'DISCIPLINE_ACTION'` | `actionId` | `{ actionId }` |

*Reasoning*:
- `enforceApprovalRule` takes `EnforceApprovalContext`, parses rules for the tenant, and determines if approval is required.
- If it returns `{ mode: 'CREATE_APPROVAL_REQUEST', request }`, the controller immediately returns a `PENDING_APPROVAL` status to the frontend.
- If it returns `{ mode: 'DIRECT_APPLY' }` (meaning approval rules are set to `NONE` or `AUTO_APPROVE`), it directly executes the mutation.

### Step 2.2: Structuring the Approvals Handlers (DisciplineApprovalsHandler)
Once approved via `/api/approvals/:id/action`, the engine executes `ApprovalsExecutor.execute()`.
- The execution context passed to handlers does not contain the root `reason` field as a top-level property (Observation B). Therefore, any payload parameters (like the reason) must be packed into `newValue` during `enforceApprovalRule` call and accessed in the handler via `context.newValue.reason`.
- Currently, `DisciplineApprovalsHandler` only handles `'DISCIPLINE_ACTION'` and modifies the database directly via `DisciplineRepository`.
- To comply with **AGENTS.md**, bypassing `DisciplineService` is risky because it skips crucial event publication (`recordSchoolOperation`), audit logging (`createAuditLog`), and notification queues (e.g. alerts to Deputy/Principal on escalation).
- *Solution*: We must introduce internal, bypassed service methods in `DisciplineService` (e.g., `executeEscalation`, `executeResolution`, `executeClosure`, and `executeActionApproval`). These methods skip client-level permission assertions (since permissions were checked at request time and approval time) but execute the full business logic, transaction, audits, notifications, and events.

### Step 2.3: Deprecation of Bypass Endpoints
The manual bypass endpoints (`actions/:actionId/approve` and `waivers/:id/approve`) allow users to bypass the rules configured in the approvals engine.
- To prevent this, these endpoints must be deprecated.
- **Phase 1 (Soft Deprecation)**: Mark endpoints with JSDoc `@deprecated`, add a `Warning` HTTP response header, and log a warning while still keeping them functional.
- **Phase 2 (Hard Deprecation)**: Throw a `410 Gone` or `BadRequestException` forcing clients to use the `/api/approvals/:id/action` endpoint.

---

## 3. Caveats

- **Database Schemas**: Assumed that the `approvalRule` and `approvalRequest` tables exist and are properly populated in the database.
- **Permission Mapping**: Assumes the user approving the request has `approvals:*` capability, which executes the action. The bypassed service methods should run under the context of the approving user (or a system fallback context) for proper audit attribution.

---

## 4. Conclusion & Action Plan

To implement this design:

### Step 1: Add internal bypassed execution methods in `DisciplineService`
Introduce these methods to safely execute approved changes:
```typescript
  async executeEscalation(incidentId: string, schoolId: string, reason: string, actorUserId: string) {
    // Run status update, transactional events, audits, and notifications without permission assertion
    return this.prisma.withRequestTransaction(async () => {
      const incident = await this.disciplineRepository.findIncidentById(schoolId, incidentId);
      if (!incident) throw new NotFoundException('Incident not found');
      
      const next = await this.disciplineRepository.updateIncidentStatus({
        tenant_id: schoolId,
        incident_id: incidentId,
        status: 'escalated',
      });

      await this.disciplineRepository.createAuditLog({
        tenant_id: schoolId,
        school_id: schoolId,
        actor_user_id: actorUserId,
        actor_role: 'system',
        action: 'incident.status_changed',
        entity_type: 'discipline_incident',
        entity_id: incidentId,
        metadata: { from_status: incident.status, to_status: 'escalated', reason },
      });

      await this.schoolEvents?.recordSchoolOperation({
        event: {
          id: incidentId,
          type: 'discipline.incident_escalated',
          module: 'discipline',
          actorRole: 'system',
          title: 'Discipline Incident Escalated',
          body: `Incident ${incidentId} has been escalated via approvals`,
          entityId: incidentId,
          severity: 'high',
          payload: { student_id: incident.student_id },
        },
        notifications: [
          {
            id: `discipline-escalate-${incidentId}`,
            schoolId,
            title: 'Discipline Incident Escalated',
            body: `Incident ${incidentId} has been escalated`,
            audienceRoles: ['deputy-principal', 'principal'],
            priority: 'urgent',
            sourceModule: 'discipline',
            relatedModule: 'discipline',
            relatedRecordId: incidentId,
            read: false,
            createdAt: new Date().toISOString(),
          }
        ]
      });
      return next;
    });
  }

  // Repeat similar execution logic for executeResolution, executeClosure, and executeActionApproval
```

### Step 2: Register execution handlers in `DisciplineApprovalsHandler`
Update `onModuleInit` in `apps/api/src/modules/discipline/discipline-approvals.handler.ts`:
```typescript
  onModuleInit() {
    // Register ESCALATE_INCIDENT
    this.approvalsExecutor.registerHandler('DISCIPLINE', 'ESCALATE_INCIDENT', async (context) => {
      const { schoolId, targetEntityId, newValue, approvedByUserId } = context;
      await this.disciplineService.executeEscalation(targetEntityId, schoolId, newValue.reason, approvedByUserId);
    });

    // Register RESOLVE_INCIDENT
    this.approvalsExecutor.registerHandler('DISCIPLINE', 'RESOLVE_INCIDENT', async (context) => {
      const { schoolId, targetEntityId, newValue, approvedByUserId } = context;
      await this.disciplineService.executeResolution(targetEntityId, schoolId, newValue.reason, approvedByUserId);
    });

    // Register CLOSE_INCIDENT
    this.approvalsExecutor.registerHandler('DISCIPLINE', 'CLOSE_INCIDENT', async (context) => {
      const { schoolId, targetEntityId, newValue, approvedByUserId } = context;
      await this.disciplineService.executeClosure(targetEntityId, schoolId, newValue.reason, approvedByUserId);
    });

    // Register DISCIPLINE_ACTION
    this.approvalsExecutor.registerHandler('DISCIPLINE', 'DISCIPLINE_ACTION', async (context) => {
      const { schoolId, targetEntityId, approvedByUserId } = context;
      await this.disciplineService.executeActionApproval(targetEntityId, schoolId, approvedByUserId);
    });
  }
```

### Step 3: Enforce Approvals in `DisciplineController`
Inject `ApprovalsService` into `DisciplineController` and wrap sensitive endpoints:
```typescript
  @Post('incidents/:incidentId/escalate')
  @Permissions('discipline:manage')
  async escalateIncident(
    @Param('incidentId', new ParseUUIDPipe()) incidentId: string,
    @Body() dto: { reason?: string },
  ) {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) throw new UnauthorizedException('Tenant context is required');

    const approvalResult = await this.approvals.enforceApprovalRule({
      schoolId: tenantId,
      userId: store.user_id,
      userRole: store.role || 'staff',
      module: 'DISCIPLINE',
      action: 'ESCALATE_INCIDENT',
      targetEntityType: 'DISCIPLINE_INCIDENT',
      targetEntityId: incidentId,
      newValue: { reason: dto.reason },
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

    const result = await this.disciplineService.escalateIncident(incidentId, dto.reason);
    return { success: true, status: 'APPROVED', data: result };
  }
```

### Step 4: Deprecate old manual bypass endpoints
- Modify `@Post('actions/:actionId/approve')` in `DisciplineController` and `@Post('waivers/:id/approve')` in `FinanceController` to log deprecation warnings and return a soft HTTP warning header:
```typescript
  res.setHeader('Warning', '299 - "This endpoint is deprecated. Use processApprovalAction via /api/approvals/:id/action instead."');
```

---

## 5. Verification Method

To verify these changes independently:

### A. Run Compiled Tests
Execute the compiled test suite using:
```powershell
npm run test
```
Verify that `dist/apps/api/src/modules/discipline/discipline.test.js` passes.

### B. Inspect Files
Confirm the following files match the design:
- `apps/api/src/modules/discipline/discipline.controller.ts` (sensitive endpoints now query `ApprovalsService` and check rule mode)
- `apps/api/src/modules/discipline/discipline-approvals.handler.ts` (all 4 action handlers registered and calling bypassed service methods)
- `apps/api/src/modules/discipline/discipline.service.ts` (internal execute/bypass methods exist and properly record operational events and audits)
- `apps/api/src/modules/finance/finance.controller.ts` (soft/hard deprecation warnings configured for manual waiver approval endpoint)

### C. Invalidation Conditions
The design is considered invalid if:
- Database status mutations are made on incidents/actions without producing an event outbox/operational event entry or audit log entry.
- Direct repository queries are used in approvals handlers that bypass notifications or event pipelines.
