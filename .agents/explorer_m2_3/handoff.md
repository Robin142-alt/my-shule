# Tenant Isolation Analysis and Handoff Report: Support Controller Gaps

## 1. Observation

Direct observations within `apps/api/src/modules/support/support.controller.ts`:

### A. Discipline Incident Case Status Update Tampering (`update_case`)
In `apps/api/src/modules/support/support.controller.ts` (lines 387-416):
```typescript
        } else if (action === 'update_case') {
          const { id, updates } = body;
          const existing = await tx.disciplineIncident.findUnique({ where: { id } });
          if (existing) {
            if (existing.school_id !== tenantId && existing.tenant_id !== tenantId) {
              throw new BadRequestException('Discipline incident does not belong to the caller\'s school context');
            }
            let metaObj = typeof existing.metadata === 'string' ? JSON.parse(existing.metadata) : (existing.metadata || {});
            if (updates.parentSmsSent !== undefined) {
              metaObj.parentSmsSent = updates.parentSmsSent;
            }
            if (updates.counsellorReferred !== undefined) {
              metaObj.counsellorReferred = updates.counsellorReferred;
            }

            let dbStatus = existing.status;
            if (updates.status) {
              dbStatus = updates.status.toLowerCase().replace(' ', '_');
            }

            await tx.disciplineIncident.update({
              where: { id },
              data: {
                status: dbStatus,
                parent_notification_status: updates.parentSmsSent ? 'SENT' : existing.parent_notification_status,
                metadata: metaObj
              }
            });
          }
        }
```

### B. Counselling Session Status Modification Raw SQL Query (`update_session`)
In `apps/api/src/modules/support/support.controller.ts` (lines 536-559):
```typescript
        } else if (action === 'update_session') {
          const { id, updates } = body;
          let dbStatus = 'scheduled';
          if (updates.status) {
            dbStatus = updates.status === 'Open' ? 'scheduled' : 'completed';
          }
          
          // Verify that the counselling session exists and belongs to the caller's school context
          const sessions = (await tx.$queryRawUnsafe(
            `SELECT id FROM counselling_sessions WHERE id = $1::uuid AND school_id = $2::uuid`,
            id,
            tenantId
          )) as any[];
          if (!sessions || sessions.length === 0) {
            throw new BadRequestException('Counselling session not found or access denied');
          }
 
          await tx.$executeRawUnsafe(
            `UPDATE counselling_sessions SET status = $1, updated_at = NOW() WHERE id = $2::uuid AND school_id = $3::uuid`,
            dbStatus,
            id,
            tenantId
          );
        }
```

---

## 2. Logic Chain

From the observations above, the following vulnerabilities/gaps are inferred:

### Gap 1: Silent Success / Verification Bypass for Missing Incident Cases (`update_case`)
1. **Fact**: In `update_case`, the database lookup `tx.disciplineIncident.findUnique({ where: { id } })` returns `null` if the incident is not found in the database.
2. **Fact**: The check `if (existing) { ... }` encapsulates the validation and database update block.
3. **Inference**: If `id` does not exist, the code skips the `if (existing)` block entirely and returns `{ success: true }` (lines 415-417).
4. **Conclusion**: A non-existent record ID silently returns success, violating the Constitutional rule of "no fake success states" and misleading clients/integrations.

### Gap 2: Cross-Tenant Information Disclosure / ID Enumeration (`update_case`)
1. **Fact**: If `existing` exists but belongs to a different school, the API throws `BadRequestException('Discipline incident does not belong to the caller\'s school context')` (lines 391-393).
2. **Fact**: If `existing` does not exist (e.g. is a random UUID), the API returns `{ success: true }`.
3. **Inference**: The difference in HTTP status codes and responses allows an attacker to perform ID enumeration. They can send a list of candidate incident IDs:
   - A 200 response means the ID is invalid (does not exist in the DB).
   - A 400 response with "does not belong" means the ID is valid and exists in another school context.
4. **Conclusion**: This is a direct leak of cross-tenant data existence. To protect tenant isolation, both cases must return the same generic error (e.g., "Discipline incident not found or access denied").

### Gap 3: Missing Request Body Type Validation (`update_case` and `update_session`)
1. **Fact**: Both `@Post('discipline')` and `@Post('counselling')` map to `@Body() body: any` without NestJS class validation pipes.
2. **Fact**: The parameter `id` is extracted directly from the body and passed into Prisma's where filters or raw SQL cast constraints (`$1::uuid`).
3. **Inference**: If a client provides a malformed string or missing value for `id` (e.g., `""` or `"invalid"`), PostgreSQL will crash the transaction with `invalid input syntax for type uuid`, resulting in an unhandled 500 error instead of a validated 400 error.
4. **Conclusion**: Input validation must verify `id` conforms to a standard UUID format before sending it to the database query engines.

### Gap 4: Raw SQL Bypass and Incomplete Scope Check (`update_session`)
1. **Fact**: The `update_session` block uses `$queryRawUnsafe` and `$executeRawUnsafe` on the `counselling_sessions` table (lines 544-558).
2. **Fact**: The table `counselling_sessions` maps to the Prisma model `LegacyCounsellingSession` and defines both `school_id` and `tenant_id`.
3. **Inference**: Bypassing the Prisma ORM for raw SQL eliminates type safety, model validations, and hook/middleware integrations. Additionally, checking only `school_id` without confirming `tenant_id` consistency (as done during creation/insertion) represents a potential gap in isolation consistency, though `school_id` is the primary isolation boundary.
4. **Conclusion**: Rewriting the raw SQL query to use the Prisma ORM (`tx.legacyCounsellingSession`) makes the codebase cleaner, safer, type-safe, and aligns with NestJS/Prisma standards.

---

## 3. Caveats

- We assume that `LegacyCounsellingSession` is fully synchronized with the `counselling_sessions` table in all environments, and the Prisma client generated files include this model.
- We assume that `tenantId` (derived from `requestContext.requireStore().tenant_id`) is a trusted value populated by authentication middleware.
- We did not investigate whether the frontend actually uses these endpoints or if they are legacy dashboards, but in either case, the backend must be hardened.

---

## 4. Conclusion and Recommendations

To resolve the R2 backend tenant isolation gaps, we recommend the following precise code-level changes:

### Recommendation A: Harden `update_case` (Discipline Incidents)
Modify `apps/api/src/modules/support/support.controller.ts` (lines 387-416) to validate the UUID format, enforce tenant scope at the query level using `findFirst`, and throw a uniform "not found or access denied" error.

**Code-level Fix:**
```typescript
        } else if (action === 'update_case') {
          const { id, updates } = body;

          // 1. Validate UUID format to prevent database casting crashes
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!id || typeof id !== 'string' || !uuidRegex.test(id)) {
            throw new BadRequestException('Invalid or missing incident ID format');
          }

          // 2. Fetch the record ensuring it belongs to the current school/tenant context
          const existing = await tx.disciplineIncident.findFirst({
            where: {
              id,
              OR: [
                { school_id: tenantId },
                { tenant_id: tenantId }
              ]
            }
          });

          // 3. Prevent silent success and ID enumeration / information leak
          if (!existing) {
            throw new BadRequestException('Discipline incident not found or access denied');
          }

          let metaObj = typeof existing.metadata === 'string' ? JSON.parse(existing.metadata) : (existing.metadata || {});
          if (updates.parentSmsSent !== undefined) {
            metaObj.parentSmsSent = updates.parentSmsSent;
          }
          if (updates.counsellorReferred !== undefined) {
            metaObj.counsellorReferred = updates.counsellorReferred;
          }

          let dbStatus = existing.status;
          if (updates.status) {
            dbStatus = updates.status.toLowerCase().replace(' ', '_');
          }

          await tx.disciplineIncident.update({
            where: { id },
            data: {
              status: dbStatus,
              parent_notification_status: updates.parentSmsSent ? 'SENT' : existing.parent_notification_status,
              metadata: metaObj
            }
          });
        }
```

### Recommendation B: Hardening `update_session` (Counselling Sessions)
Rewrite `update_session` to use Prisma ORM instead of Raw SQL, adding UUID validation and consistent tenant boundary checks.

**Code-level Fix (ORM version - Preferred):**
```typescript
        } else if (action === 'update_session') {
          const { id, updates } = body;

          // 1. Validate UUID format to prevent database casting crashes
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!id || typeof id !== 'string' || !uuidRegex.test(id)) {
            throw new BadRequestException('Invalid or missing session ID format');
          }

          let dbStatus = 'scheduled';
          if (updates.status) {
            dbStatus = updates.status === 'Open' ? 'scheduled' : 'completed';
          }

          // 2. Query legacy counselling session using ORM and enforce school/tenant context
          const existing = await tx.legacyCounsellingSession.findFirst({
            where: {
              id,
              OR: [
                { school_id: tenantId },
                { tenant_id: tenantId }
              ]
            }
          });

          if (!existing) {
            throw new BadRequestException('Counselling session not found or access denied');
          }

          // 3. Update status using ORM
          await tx.legacyCounsellingSession.update({
            where: { id },
            data: {
              status: dbStatus
            }
          });
        }
```

**Alternative Code-level Fix (Raw SQL version - if ORM mapping is restricted):**
```typescript
        } else if (action === 'update_session') {
          const { id, updates } = body;

          // 1. Validate UUID format
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!id || typeof id !== 'string' || !uuidRegex.test(id)) {
            throw new BadRequestException('Invalid or missing session ID format');
          }

          let dbStatus = 'scheduled';
          if (updates.status) {
            dbStatus = updates.status === 'Open' ? 'scheduled' : 'completed';
          }
          
          // 2. Verify existence and context (checking both school_id and tenant_id)
          const sessions = (await tx.$queryRawUnsafe(
            `SELECT id FROM counselling_sessions WHERE id = $1::uuid AND (school_id = $2::uuid OR tenant_id = $3)`,
            id,
            tenantId,
            tenantId
          )) as any[];
          if (!sessions || sessions.length === 0) {
            throw new BadRequestException('Counselling session not found or access denied');
          }
 
          // 3. Execute update status
          await tx.$executeRawUnsafe(
            `UPDATE counselling_sessions SET status = $1, updated_at = NOW() WHERE id = $2::uuid AND (school_id = $3::uuid OR tenant_id = $4)`,
            dbStatus,
            id,
            tenantId,
            tenantId
          );
        }
```

---

## 5. Verification Method

To verify these isolation fixes, implement integration tests in `apps/api/src/modules/support/support.test.ts` or run the NestJS API tests:

### Verification Test Cases
1. **Invalid ID Validation**:
   - Send `update_case` or `update_session` action with `id: "invalid-uuid"`.
   - Expect HTTP status 400 Bad Request with a clear message ("Invalid or missing...").
2. **Missing ID / Silent Success prevention**:
   - Send `update_case` with a non-existent UUID (e.g. `11111111-1111-1111-1111-111111111111`).
   - Expect HTTP status 400 Bad Request / "Discipline incident not found or access denied" (no silent 200 success).
3. **Cross-Tenant Isolation check**:
   - Create a Discipline Incident / Counselling Session for School A.
   - Try to call `update_case` / `update_session` using the credentials / token of School B.
   - Expect HTTP status 400 Bad Request / "...not found or access denied". The response must be identical to the "Missing ID" case to prevent ID enumeration.

### Run tests:
Execute API tests using npm/yarn:
```powershell
# Run support module tests
npm run test -- apps/api/src/modules/support/support.test.ts
```
