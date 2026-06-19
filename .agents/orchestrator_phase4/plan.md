# Detailed Implementation Plan - Phase 4: Event Consumers Remediation

## Objective
Implement real domain logic for empty event consumers, ensuring all event-driven workflows complete successfully without silent failures, scoped correctly to `schoolId` (tenant isolation), and using proper logging.

## Milestones & Execution Strategy

### Milestone 1: Audit and Prioritize
- **Goal**: Scan the entire codebase to list all event consumer files, identify which ones contain the stub `TODO: Implement domain logic`, and categorize them by module.
- **Role**: `teamwork_preview_explorer` (investigation and mapping).
- **Output**: An audit report documenting the number of empty consumers, a list of critical modules, and event types.

### Milestone 2: Implementation Strategy & Script Design
- **Goal**: Design a Node.js automation script that can systematically update the ~930 event consumers.
- **Rule**:
  - For **Critical Modules** (Admissions, Finance, Discipline, Exams, Boarding): Implement real database persistence/logic using Prisma based on event payload.
  - For **Non-Critical Modules**: Inject `StructuredLoggerService` and write safe logging calls to record the event instead of a silent TODO comment.
  - Strict tenant isolation: Scope all database operations to `schoolId` (or `tenant_id` if using raw SQL/custom tables).
  - No compilation errors: Ensure all imports, constructor injections, and method calls are syntactically valid and compile successfully.
- **Role**: `teamwork_preview_worker`.
- **Output**: Node script `remediate-consumers.js` and partial test runs.

### Milestone 3: Execute Remediation Script
- **Goal**: Run the remediation script to update all ~930 event consumer files.
- **Role**: `teamwork_preview_worker`.
- **Output**: Remediated files checked by git status.

### Milestone 4: Verification and E2E Build
- **Goal**: Run the NestJS Nest compiler (`npm run build` in `apps/api`) to ensure the entire backend compiles without any errors.
- **Role**: `teamwork_preview_worker`.
- **Output**: Verified build logs.

### Milestone 5: Forensic Integrity Audit
- **Goal**: Audit the changes to ensure there are no remaining silent TODO comments, no hardcoded cheating, and no broken imports.
- **Role**: `teamwork_preview_auditor`.
- **Output**: CLEAN audit report.
