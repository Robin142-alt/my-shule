# Soft Handoff - Phase 5 Feature Pillars Orchestration

## Milestone State
- [x] Initial Investigation & Planning (Codebase audit completed)
- [ ] Milestone 1: Centralized Approvals Integration & Deprecation [not started]
- [ ] Milestone 2: Automated PDF Generation & Frontend Buttons [not started]
- [ ] Milestone 3: Offline Sync Service Worker & Schema Drift Alignment [not started]
- [ ] Milestone 4: Playwright E2E Tenant Isolation Tests [not started]
- [ ] Step 6: Global Quality Gate & Forensic Audit [not started]

## Active Subagents
- None (All subagents completed or failed/retired).

## Pending Decisions
- **Model Choice**: Do NOT spawn sub-orchestrators using the `self` archetype because they encounter platform-level `RESOURCE_EXHAUSTED` (429) quota limits and model key errors (`MODEL_PLACEHOLDER_M132`). Instead, spawn specialized `teamwork_preview_worker`, `teamwork_preview_explorer`, and `teamwork_preview_reviewer` agents directly from this orchestrator context.

## Remaining Work
The successor must coordinate the implementation of the four feature pillars. Use the findings in `c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\explorer_pillars_audit\analysis.md` as the blueprint.
1. **Milestone 1**: Dispatch a worker to:
   - Integrate `ApprovalsService.enforceApprovalRule` in `discipline.service.ts`.
   - Deprecate manual bypass endpoints (`Post('waivers/:id/approve')` in `finance.controller.ts` and `Post('actions/:actionId/approve')` in `discipline.controller.ts`).
2. **Milestone 2**: Dispatch a worker to:
   - Expose backend `PdfGeneratorService`.
   - Create raw PDF blob streaming controllers (`GET /api/print/report-card/:studentId/:termId`, `GET /api/print/invoice/:invoiceId`, `GET /api/print/receipt/:receiptId`).
   - Wire frontend download buttons in `report-cards-workspace.tsx`, `portal-pages.tsx`, `fees-workspace.tsx`.
3. **Milestone 3**: Dispatch a worker to:
   - Implement service worker background sync in `apps/web`.
   - Align Prisma models with PostgreSQL raw tables (UUID/text types, primary keys, `version` columns) to resolve critical schema drift.
4. **Milestone 4**: Dispatch a worker to create `apps/web/tests/e2e/tenant-isolation.spec.ts` using Playwright, verifying cookie/header hijacking blocks.
5. **Step 6**: Run builds, tests, and a `teamwork_preview_auditor` verification check.

## Key Artifacts
- **PROJECT.md**: `c:\Users\user\Desktop\PROJECTS\Shule hub\PROJECT.md`
- **Audit Analysis**: `c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\explorer_pillars_audit\analysis.md`
- **Audit Handoff**: `c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\explorer_pillars_audit\handoff.md`
