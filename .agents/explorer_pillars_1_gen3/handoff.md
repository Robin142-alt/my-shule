# Database Schema and Approvals System Audit Report

## 1. Observation
I have performed a read-only investigation and static analysis of the Prisma schema, the approvals module, the finance module, and the discipline module in the MyShule codebase.

### 1.1 Multi-Tenancy and School Separation in the Schema (`prisma/schema.prisma`)
* **School Identification**: Multi-tenancy boundaries are defined by the `School` model (`id` UUID).
* **CamelCase Prisma models**: Models such as `FeeWaiver`, `ApprovalRule`, `ApprovalRequest`, `ApprovalAuditLog`, `DisciplineCase`, and `DisciplineAction` (mapped to `v2_discipline_actions`) utilize `schoolId` as a foreign key pointing to `School.id` (e.g. `schoolId String @map("school_id")`).
* **Snake_case Legacy models**: Models such as `LegacyDisciplineAction` (mapped to `discipline_actions`), `TenantPendingWaivers` (mapped to `tenant_pending_waivers`), `FinanceApprovalRequests`, and `ProcurementApprovals` utilize a `tenant_id` or `school_id` string field directly without explicit relational bindings.
* **Indexes**: Most multi-tenant tables have a database index on the school/tenant column to ensure school isolation (e.g., `@@index([schoolId])` or `@@index([tenant_id])`).

### 1.2 Existing Approvals Structures
* **Enums**:
  * `enum ApprovalStatus` (lines 381-391): `DRAFT`, `SUBMITTED`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `CHANGES_REQUESTED`, `ESCALATED`, `CANCELLED`, `EXPIRED`.
  * `enum ApprovalLevel` (lines 393-399): `NONE`, `SINGLE`, `MULTI_LEVEL`, `AUTO_APPROVE`.
* **Approvals Engine Models**:
  * `ApprovalRule` (lines 1128-1153): Stores active rules determining which actions require approval, defining `requesterRoles` and `approverRoles` arrays, `approvalLevel`, `riskLevel`, `amountMin`/`amountMax`, and escalation parameters.
  * `ApprovalRequest` (lines 2112-2143): Stores pending and processed approval requests. Includes fields for polymorphic reference (`targetEntityType` and `targetEntityId`), requested/approver user details, status, reason, `oldValue`/`newValue` JSON payloads, attachments, and timestamps.
  * `ApprovalAuditLog` (lines 2145-2160): Audit trail of states on the approval request.
* **Schema Gaps & Discrepancies**:
  * In `ApprovalRequest`, the fields `ruleId`, `requestedByUserId`, and `assignedApproverId` are plain `String` columns without Prisma `@relation` properties.
  * In `LegacyDisciplineAction` (mapped to `"discipline_actions"`), the columns `completed_at`, `completion_notes`, `approved_by_user_id`, and `approved_at` are queried in SQL by `DisciplineRepository`, but they are **missing** from the Prisma model definition (lines 3790-3812), indicating a schema drift.

### 1.3 Role Permissions Modeling
* **Permission** (lines 1040-1056): Dictionary of granular permissions (e.g., `resource`, `action`, `scope`).
* **RolePermission** (lines 1058-1073): Junction table mapping a `Role` to a `Permission` for a specific `schoolId` (mapped to `"tenant_id"` column). Enforces a unique constraint: `@@unique([schoolId, roleId, permissionId])`.
* **Discrepancy**: While the database `permissions` table is queried in `AuthorizationRepository` via raw SQL filtering by `tenant_id`, the Prisma `Permission` model does not contain a `tenant_id`/`schoolId` field or map to a tenant-specific table. The authorization layer uses custom raw SQL, bypassing the Prisma permission models entirely.

### 1.4 Approvals Module (`apps/api/src/modules/approvals/`)
* **`approvals.service.ts`**: Contains `enforceApprovalRule` which checks if an action matches an active `ApprovalRule`. If so, it creates an `ApprovalRequest` with `PENDING_APPROVAL` status (or `APPROVED` if `AUTO_APPROVE`).
* **`approvals.controller.ts`**: Implements REST endpoints for managing rules and processing actions. The endpoint `PATCH :id/action` accepts actions (`APPROVE` / `REJECT` / etc.). When `APPROVE` is called, it triggers `this.approvalsExecutor.execute(request.module, request.action, executionContext)`.
* **`approvals.executor.ts`**: The execution registry that routes approved requests to modules who registered execution handlers using `registerHandler`.
* **`approvals.cron.ts`**: Background job scheduler (`ApprovalsCronService`) that expires and auto-rejects pending requests older than 7 days.

### 1.5 Fee Waiver Integration
* **API Endpoints**: `POST api/finance/waivers` (finance controller lines 415-472) calls `enforceApprovalRule`. If pending, it returns a 200 with `PENDING_APPROVAL` status. If direct application is permitted, it writes directly to `tenant_pending_waivers` and reduces the open invoice balance.
* **Approved Callback**: `FinanceApprovalsHandler` (in `finance-approvals.handler.ts`) registers the executor callback for `'FINANCE'`:`'FEE_WAIVER'`. When executed, it runs SQL queries to insert into `tenant_pending_waivers` and update `student_invoices`.
* **Mismatches**: 
  * The controller also exposes a `POST waivers/:id/approve` endpoint (lines 474-502) which bypasses the approvals engine entirely and directly changes the status of a waiver.
  * The codebase defines a `FeeWaiver` Prisma model mapped to `"fee_waivers"`, but the finance controller and approvals handler operate exclusively on the `tenant_pending_waivers` table via raw SQL. The `ApproveWaiverConsumer` listens for completion events and attempts to update `prisma.feeWaiver`, which fails silently because no such rows are created in `POST waivers`.

### 1.6 Discipline Integration
* **Status Quo**: Currently, the discipline module has **no approvals engine integration**.
* **Creation Flow**: `DisciplineController` calls `DisciplineService.createAction`. If the action type is `'suspension'` or `'expulsion'`, it hardcodes `requiresApproval = true` and creates the action in `discipline_actions` with a status of `'pending_approval'`. It does not call `ApprovalsService` or generate an `ApprovalRequest`.
* **Approval Flow**: `POST actions/:actionId/approve` calls `DisciplineService.approveAction` which directly sets the status of the action to `'approved'` and saves the approver, bypassing the approvals engine.

---

## 2. Logic Chain
1. **Siloed Approval Rules**: The hardcoded rule in `DisciplineService.createAction` (checking if `action_type` is suspension or expulsion) runs independently of the database `ApprovalRule` settings. Because it bypasses `ApprovalsService`, school admins cannot configure custom approval rules, escalation limits, or multi-level sign-offs for discipline actions.
2. **Disconnected Executor**: When a user goes through the approvals queue to approve a request, the engine calls the registered execution handler. Because no handler is registered for `DISCIPLINE`, any discipline action routed through the approvals UI would result in a crash ("No execution handler registered").
3. **Redundant Approval Endpoints**: The presence of `POST waivers/:id/approve` in `finance.controller.ts` and `POST actions/:actionId/approve` in `discipline.controller.ts` represents redundant and un-audited manual approval bypasses. These should either be integrated with the approvals executor or deprecated in favor of the global `PATCH api/approvals/:id/action`.
4. **Schema Drift/Discrepancy**: The custom SQL-based `AuthorizationRepository` and the SQL-based `DisciplineRepository` are using database columns (`permissions.tenant_id`, `discipline_actions.approved_by_user_id`, etc.) that are absent in `schema.prisma`. Running `prisma db pull` or generating client code from this schema would break typescript validation or fail on migrations.

---

## 3. Caveats
* This is a read-only investigation. No source code was modified, and no live database tests were performed to verify the physical presence of columns in the database.
* Our findings are based on the codebase's queries and configuration files.

---

## 4. Conclusion
The approvals engine is a well-designed core system, but it is currently underutilized and has discrepancies with existing database and module structures. The finance module is partially integrated but suffers from table duplication (`fee_waivers` vs `tenant_pending_waivers`), while the discipline module is completely unintegrated.

### 4.1 Recommended Prisma Model Schema Changes
1. **Resolve Schema Drift in `LegacyDisciplineAction`**:
   Add the missing audit and completion columns to the `LegacyDisciplineAction` model in `prisma/schema.prisma` to prevent client compilation errors:
   ```prisma
   model LegacyDisciplineAction {
     // ... existing fields ...
     completed_at         DateTime?
     completion_notes     String?
     approved_by_user_id  String?   @db.Uuid
     approved_at          DateTime?
     // ...
   }
   ```
2. **Resolve Schema Drift in `Permission`**:
   Ensure `Permission` aligns with database layout by adding `tenantId` (mapped as `tenant_id`):
   ```prisma
   model Permission {
     id          String   @id @default(uuid())
     schoolId    String   @map("tenant_id")
     school      School   @relation(fields: [schoolId], references: [id])
     resource    String
     action      String
     description String?
     createdAt   DateTime @default(now()) @map("created_at")
     updatedAt   DateTime @updatedAt @map("updated_at")

     @@unique([schoolId, resource, action])
     @@map("permissions")
   }
   ```
3. **Consolidate Fee Waivers**:
   Deprecate the duplicate `tenant_pending_waivers` raw SQL table and unify the schema into the Prisma `FeeWaiver` model with an index on `[schoolId, status]`.

---

## 5. NestJS Backend Implementation & Integration Plan

### Step 1: Create a `DisciplineApprovalsHandler`
Create `apps/api/src/modules/discipline/discipline-approvals.handler.ts` to register the handler with the executor on module initialization:
```typescript
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ApprovalsExecutor } from '../approvals/approvals.executor';
import { DisciplineRepository } from './repositories/discipline.repository';

@Injectable()
export class DisciplineApprovalsHandler implements OnModuleInit {
  private readonly logger = new Logger(DisciplineApprovalsHandler.name);

  constructor(
    private readonly approvalsExecutor: ApprovalsExecutor,
    private readonly disciplineRepository: DisciplineRepository,
  ) {}

  onModuleInit() {
    this.approvalsExecutor.registerHandler('DISCIPLINE', 'DISCIPLINE_ACTION', async (context) => {
      this.logger.log(`Executing approved discipline action: ${JSON.stringify(context)}`);
      const { schoolId, targetEntityId, approvedByUserId } = context;

      await this.disciplineRepository.approveAction({
        tenant_id: schoolId,
        action_id: targetEntityId,
        approved_by_user_id: approvedByUserId,
      });
      // Optionally trigger notification or emit event here
    });
  }
}
```

### Step 2: Inject `ApprovalsService` & Update `createAction` in `DisciplineService`
1. Update `DisciplineModule` to import `ApprovalsModule` and register `DisciplineApprovalsHandler` as a provider.
2. Inject `ApprovalsService` into `DisciplineService`.
3. Modify `createAction` in `discipline.service.ts`:
   * Retrieve the active rule for `'DISCIPLINE'`, `'DISCIPLINE_ACTION'`.
   * Create the legacy `discipline_actions` record first with status `'pending_approval'`.
   * If rule requires approval:
     * Call `approvalsService.enforceApprovalRule` with `targetEntityType: 'DisciplineAction'`, `targetEntityId: action.id`, and `newValue` containing details.
     * If request created, return the action (in `'pending_approval'` state).
   * If direct apply is allowed:
     * Update status immediately using `disciplineRepository.approveAction`.
     * Return the approved action.

### Step 3: Deprecate Direct Manual Approval Endpoints
* In `DisciplineController`, either redirect `@Post('actions/:actionId/approve')` to call the `ApprovalsService` manually or deprecate it in favor of the global `PATCH api/approvals/:id/action`.
* Do the same for `@Post('waivers/:id/approve')` in `FinanceController` to maintain audit trail integrity.

---

## 6. Verification Method
1. **Compile & Typecheck**:
   Run the project build tool (e.g. `npm run build` or `nest build`) to ensure there are no compilation errors after registering modules.
2. **Verify Registration**:
   Add a unit test in `discipline.test.ts` to assert that `DisciplineApprovalsHandler` correctly registers `'DISCIPLINE:DISCIPLINE_ACTION'` with `ApprovalsExecutor`.
3. **Verify API Flow**:
   Invoke `POST api/discipline/incidents/:incidentId/actions` and verify that when a rule is set up, it produces a row in the `approval_requests` table with status `PENDING_APPROVAL`.
