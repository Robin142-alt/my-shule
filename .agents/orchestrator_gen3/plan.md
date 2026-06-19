# Execution Plan: MyShule System Audit

## Objectives
1. Perform programmatic scan of frontend query/mutation hooks to list expected backend endpoints.
2. Scan backend NestJS codebase to list actual endpoints, controllers, and services.
3. Check Prisma database schema to identify missing tables/fields/multitenant columns required by existing backend services.
4. Compare expected vs actual backend routes and database schemas.
5. Generate a comprehensive `system_audit_report.md` in the project root.
6. Verify report content and format via Reviewer.

## Milestones & Steps

### Milestone 1: Frontend Scanning
- **Goal**: Find all API routes referenced in the frontend workspace files.
- **Steps**:
  - Spawn Explorer to sweep `apps/web/src/components` (and other directories if needed).
  - Extract endpoints used in `useSchoolQuery`, `useQuery`, `fetch`, `axios`, etc.
  - Produce a consolidated list of expected routes (e.g., `api/v1/...`) along with their HTTP methods.
- **Verification**: Verify that the explorer uses a programmatic script to scan/parse React files.

### Milestone 2: Backend & Database Scanning
- **Goal**: Scan NestJS routes and database schemas.
- **Steps**:
  - Spawn Explorer to identify all controllers, methods, and routes in `apps/api`.
  - Scan `prisma/schema.prisma` for existing tables and check for tenant scoping (e.g., `school_id`, `tenantId`).
- **Verification**: Review controller routes list against the schema.

### Milestone 3: Reconciliation and Synthesis
- **Goal**: Cross-reference frontend requests with backend availability and database support.
- **Steps**:
  - Reconcile actual backend routes against frontend expectations.
  - Identify missing controllers, endpoints, database columns, or tables.
  - Produce the draft report.
- **Verification**: Cross-check list manually or script-wise.

### Milestone 4: Report Generation & Verification
- **Goal**: Finalize and verify `system_audit_report.md`.
- **Steps**:
  - Spawn Worker to write the finalized `system_audit_report.md` in the workspace root.
  - Spawn Reviewer to check consistency, completeness, layout, and verify that there are no empty screens/placeholders/dead ends.
- **Verification**: Audit check should be clean.
