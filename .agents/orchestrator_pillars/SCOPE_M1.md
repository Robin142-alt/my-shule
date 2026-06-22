# Scope: Milestone 1 — Core Approval Workflow Engine

## Architecture
- **Backend Module**: Centralized approval module under `apps/api/src/modules/approvals/`.
- **Integrations**: Integrate with the Finance module (`apps/api/src/modules/billing/` for fee waivers) and Discipline module (`apps/api/src/modules/discipline/` for suspensions/expulsions).
- **Execution Engine**: Employs `ApprovalsExecutor` to route approved requests back to respective modules via registered callbacks.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | DB Schema Adjustments | Resolve schema drift in `LegacyDisciplineAction` and `Permission`. Map `ApprovalRequest` relationship fields correctly. Perform Prisma validations. | None | PLANNED |
| 2 | Discipline Executor | Create `DisciplineApprovalsHandler` registering `'DISCIPLINE'` and `'DISCIPLINE_ACTION'` with `ApprovalsExecutor`. | M1.1 | PLANNED |
| 3 | Service & Controller Wiring | Inject `ApprovalsService` in `DisciplineService.createAction` and enforce approval check. Wire up controller endpoints. | M1.2 | PLANNED |
| 4 | Manual Bypass Deprecation | Redefine direct manual approval endpoints in both Finance and Discipline controllers to route through the centralized approvals engine. | M1.3 | PLANNED |

## Interface Contracts
- **Prisma Schema Updates**:
  - Add missing completion/approval audit fields to `LegacyDisciplineAction` model to align with database.
  - Map relationship properties in `ApprovalRequest` correctly.
- **REST Endpoints**:
  - `POST /api/approvals/request` — Create an approval request.
  - `GET /api/approvals/pending` — List pending requests for logged-in user.
  - `PATCH /api/approvals/:id/action` — Approve, reject, or escalate request.

## Code Layout
- `apps/api/src/modules/approvals/approvals.service.ts`
- `apps/api/src/modules/approvals/approvals.controller.ts`
- `apps/api/src/modules/approvals/approvals.executor.ts`
- `apps/api/src/modules/discipline/discipline-approvals.handler.ts`
- `apps/api/src/modules/discipline/services/discipline.service.ts`
- `apps/api/src/modules/discipline/repositories/discipline.repository.ts`

## References
- Audit handoff: `c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\explorer_pillars_1_gen3\handoff.md`
