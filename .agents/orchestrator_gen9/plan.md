# Plan - Phase 3: Deep Remediation

This plan details the steps to complete Phase 3, eliminating all remaining stubs, fixing silent catches in academics controllers, wiring the parent actions controller, and resolving the bulk invoicing dead button.

## Milestones

| Milestone | Target | Description | Status |
|---|---|---|---|
| **M1** | Admin-Command Controller | Remediate 32 stubs in `admin-command.controller.ts` to execute real Prisma queries. | DONE |
| **M2** | Auth & Parent Portal | Remove/delegate fake auth controller (12 stubs), wire parent portal controllers (6 stubs), register and wire `ParentPortalActionsController.payFees`. | IN_PROGRESS |
| **M3** | Remaining Module Stubs | Wire stubs in Clinic, Library, Labs, Dashboard, Discipline, Grade Master, Operational Workflow, Attendance Mark, SMS, and Support controllers. | PLANNED |
| **M4** | Error Fallbacks & Frontend | Remediate silent error fallbacks in Academics controllers, and wire the Bulk Invoicing button on frontend. | PLANNED |
| **M5** | Verification & Audit | E2E compilation verification for both backend and frontend, and Forensic Auditor execution. | PLANNED |

## Detailed Milestone Execution

### Milestone 1: Admin-Command Controller Remediation (32 stubs)
- **Status**: Completed by Orchestrator Gen 8.
- **Verification**: Verified persistence and tenant isolation.

### Milestone 2: Auth & Parent Portal
- **Status**: In-Progress.
- **Tasks**:
  - Delete or delegate fake `auth.controller.ts` (previously done or staged).
  - Wire parent portal controllers to query real database data.
  - Register `ParentPortalActionsController` in `ParentPortalModule` and wire `payFees` (POST) to record a real payment.
- **Verification**: Clean compilation, correct tenant-isolation filtering.

### Milestone 3: Remaining Module Stubs (20 stubs total)
- **Clinic Service** (`clinic.service.ts`): Wire 6 stubs (emergencies, referrals, sick bay queue) + fix 2 silent error catches.
- **Library Module** (`library.controller.ts` + `library.service.ts`): Wire 6 stubs (returns, departments, visits, requests, reports, notices).
- **Labs Controller** (`labs.controller.ts`): Wire 4 stubs (dashboard, inventory, requests, issues).
- **Other Controllers**:
  - `dashboard.controller.ts` (`getSummary`)
  - `discipline.controller.ts` (`getCases`)
  - `grade-master.controller.ts` (`getOverview`)
  - `operational-workflow-dispatcher.controller.ts` (`getOfflineSync`)
  - `attendance-mark.controller.ts` (`markAttendance`)
  - `sms.controller.ts` (`sendSms`)
- **Verification**: Proper DB model mappings and query execution with tenant isolation checks.

### Milestone 4: Error Fallbacks & Frontend Gaps
- **Silent Catches**: Remediate 13 silent catches in `academic.controller.ts` and `academics.controller.ts` to log errors properly and throw `InternalServerErrorException` instead of catching silently and returning empty arrays.
- **Bulk Invoicing Button**: Wire the empty `onClick` handler in `apps/web/src/components/school/accountant/invoices-workspace.tsx` to open a toast/modal or trigger the bulk generation endpoint.

### Milestone 5: Verification & E2E Validation
- **Compilation**: Successfully compile frontend (`npm run build` in `apps/web`) and backend (`npm run build` in `apps/api`).
- **Forensic Audit**: Run the Forensic Auditor subagent to verify no hardcoded stubs or bypasses remain.
