# Handoff Report — Explorer M1.1

## 1. Observation

- **Controller File**: `apps/api/src/modules/admin-command/admin-command.controller.ts` contains exactly 32 endpoints that return inline mocks directly instead of delegating to a service or database.
  Example from lines 193-197:
  ```typescript
  @Post('finance/fee-categories')
  @Permissions('finance:write')
  async createFeeCategory(@Body() dto: any) {
    return { success: true, message: 'Fee category created' };
  }
  ```
- **Service & Repository Files**:
  - `apps/api/src/modules/admin-command/admin-command.service.ts`
  - `apps/api/src/modules/admin-command/repositories/admin-command.repository.ts`
- **Database Schema**: `prisma/schema.prisma` contains the data models for the application.
- **Request Context**:
  - `apps/api/src/common/request-context/request-context.types.ts` defines `RequestContextState` with `tenant_id: string | null`.
  - `apps/api/src/middleware/tenant.middleware.ts` sets this `tenant_id` on the context.
  - `apps/api/src/modules/admin-command/admin-command.service.ts` uses `this.requestContext.getStore()?.tenant_id` via `requireTenantId()`.
- **Database Column Mismatches**:
  - `prisma/schema.prisma` lines 1445-1448:
    ```prisma
    model Student {
      id                          String                       @id @default(uuid())
      schoolId                    String                       @map("school_id")
      school                      School                       @relation(fields: [schoolId], references: [id])
    ```
    This shows `Student` (table `students`) utilizes `school_id` instead of `tenant_id`.
  - `AdminCommandRepository` lines 940-942:
    ```typescript
    const classesQuery = await this.executeSql(
      `SELECT count(*)::int as count FROM class_sections WHERE tenant_id = $1`,
      [tenantId]
    ).catch(() => ({ rows: [{ count: 0 }] }));
    ```
    This queries non-existent table `class_sections` and column `tenant_id`.
  - `SecretaryCommandService` lines 52-57:
    ```typescript
    async getVisitors() {
      const tenantId = this.requireTenantId();
      const res = await this.executeSql(
        `SELECT * FROM frontoffice_visitors WHERE tenant_id = $1 ORDER BY checked_in_at DESC`,
        [tenantId]
      );
      return res.rows;
    }
    ```
    This queries non-existent table `frontoffice_visitors`.

---

## 2. Logic Chain

1. **Stub Discovery**: By scanning `admin-command.controller.ts`, we counted 32 endpoints containing inline stub returns (`return { success: true ... }` or `return { items: [] }`).
2. **Context Verification**: Examining `RequestContextMiddleware` and `TenantMiddleware` shows that `tenant_id` is successfully parsed from the request headers and bound to a request-scoped AsyncLocalStorage context. Therefore, calling `this.requireTenantId()` in any backend service will fetch the correct isolation scope.
3. **Database Alignment**: Tracing the models in `schema.prisma` reveals that:
   - Some models are named differently than expected by the repository (e.g. `Class` mapped to table `classes` instead of `class_sections`).
   - Tenant isolation columns vary: older tables use `school_id` while newer tables use `tenant_id`. However, because `school_id` and `tenant_id` share the same UUID format and store the same school-level value, filtering on either column using the retrieved request context `tenant_id` achieves correct tenant isolation.
   - Three endpoints (Report Categories, Dispatches, and Academic Interventions) do not have corresponding models in the current schema. They must either be added to `schema.prisma` or simulated using existing entities like `StudentNote` or `FrontOfficeTicket` with JSON metadata.

---

## 3. Caveats

- We assumed that `school_id` and `tenant_id` contain the identical UUID values representing the school tenant boundary. This is supported by `getStudentsOverview` using `school_id = $1` with `tenantId` parameter.
- We did not write code changes since this is a read-only investigation.

---

## 4. Conclusion

- All 32 stubs can be properly wired by:
  1. Delegating the controller routes to service methods in `AdminCommandService`.
  2. Resolving context-based `tenant_id` via `requireTenantId()`.
  3. Reconciling database table and column discrepancies in raw SQL queries (using `school_id` vs `tenant_id` accurately and correcting table names like `class_sections` to `classes`).
  4. Mapping missing endpoints to suitable existing generic models (like `StudentNote`) or expanding the database schema.

---

## 5. Verification Method

- **Files to Inspect**:
  - `apps/api/src/modules/admin-command/admin-command.controller.ts`
  - `apps/api/src/modules/admin-command/repositories/admin-command.repository.ts`
  - `prisma/schema.prisma`
- **Verification Commands**:
  - Run the integration tests for tenant isolation:
    `npm run test:integration -- apps/api/test/tenant-isolation.integration-spec.ts`
  - Verify compile-time type safety:
    `npm run build` or `npx tsc --noEmit`
