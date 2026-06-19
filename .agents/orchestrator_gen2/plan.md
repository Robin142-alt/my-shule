# Plan - Operationalizing MyShule Placeholders

This plan details the steps required to operationalize the remaining placeholder workspaces rendering `DocxOperationalWorkspace` across the MyShule platform.

## Milestones

### Milestone 1: Exploration and Analysis
- [ ] Scan `apps/web/src/components/school` recursively to catalog all workspace files rendering `DocxOperationalWorkspace`.
- [ ] Reconcile the inventory with the system's generated workspace definitions (`generated-workspace-definitions.ts`) and blueprints.
- [ ] Inspect existing backend endpoints and identify missing NestJS controllers, services, or DB queries for these modules.
- [ ] Verify permission rules, audit events, and tenant isolation requirements.
- **Verification**: Complete analysis report saved to `.agents/explorer_analysis/handoff.md`.

### Milestone 2: Backend API & Service Implementation
- [ ] Group the missing endpoints by module/domain.
- [ ] Implement required NestJS controllers, services, DTOs, and DB queries.
- [ ] Enforce permission guards, audit logging, and tenant isolation filtering on all new routes.
- **Verification**: NestJS backend compiles without errors; unit tests for new services pass.

### Milestone 3: Frontend Workspace Implementation
- [ ] Convert the `DocxOperationalWorkspace` placeholder components in each file to fully operational React components.
- [ ] Use `DataTable`, `MetricGrid`, `Modal`, `StatusPill`, and form inputs.
- [ ] Wire them to the NestJS APIs using TanStack Query, ensuring mutations invalidate queries via `queryClient.invalidateQueries`.
- **Verification**: Frontend builds with `npm run build` in `apps/web` without TypeScript or linting errors.

### Milestone 4: E2E Verification & Forensic Audit
- [ ] Run full E2E verify checks ensuring no 404s on mount and successful mutation persistence.
- [ ] Perform forensic audit checks via Forensic Auditor (`teamwork_preview_auditor`) to guarantee integrity and strict tenant isolation.
- **Verification**: 100% clean audit verdict and passing builds.
