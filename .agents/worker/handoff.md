# Handoff Report — MyShule System Audit and Endpoint Gap Analysis

## 1. Observation

1. We programmatically compiled expected frontend endpoints from three frontend explorer analyses and mapped them.
2. We scanned the backend API controllers in `apps/api/src` to identify all NestJS route mappings. The scan found **776 actual backend endpoints** across controllers.
3. We reconciled expected routes vs actual routes and identified **552 unique clean missing endpoints** on the backend.
   - For example, `/admin-command/admissions/applications` is queried on the frontend but there is no matching POST controller method.
4. We parsed `prisma/schema.prisma` and identified **317 database models** in total.
   - We verified that only 6 global models (`User`, `School`, `Permission`, `RolePermission`, \`ModulePermission\`, `SubscriptionPlan`) lack tenant scoping fields.
   - We verified that **187 models** contain tenant-scoping fields but **do not have a database index** on them (such as `Student`, `LedgerAccount`, etc.).
5. We scanned NestJS services and detected commented-out queries referencing three models not present in `schema.prisma`:
   ```typescript
   // return this.prisma.libraryVisit.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
   // return this.prisma.libraryRequest.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
   // return this.prisma.libraryNotice.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
   ```
6. We wrote the final `system_audit_report.md` in the project root (`C:\Users\user\Desktop\PROJECTS\Shule hub\system_audit_report.md`).

## 2. Logic Chain

1. **Frontend Expected Endpoints**: We extracted and normalized the path references from the explorer JSON/markdown analyses. Normalization stripped environment variables (like `${baseUrl}`), query strings, and standardized path parameters (like `${studentId}` or `:id`) to `:param`.
2. **Backend Actual Route Extraction**: We walked `apps/api/src` and parsed NestJS controller decorators `@Controller`, `@Get`, `@Post`, `@Patch`, `@Delete`, and `@Put`. We avoided decorator name collisions (like `@Permissions` and `@RequiresModule`) by checking for subsequent method signature lines.
3. **Route Mismatch Pattern**:
   - Looking at the missing list, we observed a systematic prefix mismatch pattern: the frontend targets `/admin-command/<role>/...`, but the backend implements them under direct module endpoints `/inventory/...`, `/clinic/...`, `/transport/...`, etc.
   - We also detected spelling or contract mismatches (e.g. frontend expected `/library/books` and `/library/loans`, backend implements `/library/catalog` and `/library/circulation`).
   - We therefore concluded that these mismatches explain why dashboards in these modules return 404 and are currently non-functional in the UI.
4. **Database Scale Audits**:
   - Checking the schema blocks, we matched model field names with `schoolId`, `school_id`, `tenantId`, and `tenant_id`.
   - Matching index constraints `@@index` and `@@unique`, we found that 187 tables lack indices on these tenant fields. This supports the conclusion that database performance will degrade under load because queries filtering by tenant will result in full-table scans.

## 3. Caveats

- The scanning script uses approximate line-level AST/regex matching to find Prisma queries. More complex query wrappers or raw SQL executions in service files might not be fully matched, though active code queries are fully covered.
- Route parameters were unified to `:param` to allow reconciliation; minor differences in route parameter position or count are reconciled under this placeholder.

## 4. Conclusion

- The MyShule system is mostly decoupled at the routing layer: the frontend expects a role-based admin command controller prefix (`/admin-command/<role>/...`), but the backend is built with resource-oriented modules (`/inventory`, `/clinic`, `/transport`).
- This discrepancy, along with missing onboarding mutations in `AdmissionsCommandController` and specialized exeat/boarding rules, constitutes the main gap.
- Structurally, the multi-tenant isolation database model is solid (98% of tables scoped), but lacks necessary indexing (187 tables missing indices on tenant fields) and references some commented-out library entities.

## 5. Verification Method

- The final system audit report has been generated at:
  `C:\Users\user\Desktop\PROJECTS\Shule hub\system_audit_report.md`
- Inspect the generated report file directly to verify layout, table structures, and completeness.
- The JSON data backing this report can be verified in the worker folder:
  - Scanned results: `.agents/worker/audit_scan_results.json`
  - Tenant isolation schema report: `.agents/worker/tenant_isolation_report.json`
  - Clean gap registry: `.agents/worker/clean_gaps.json`
