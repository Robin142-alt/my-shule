# Handoff Report — Explorer M2.1

## 1. Observation
- **Duplicate Auth Controller**: The mock controller is located at `apps/api/src/modules/auth/auth.controller.ts` (defining `@Controller('auth')` and mock endpoints returning `'mock-token'`, etc.). The real controller is at `apps/api/src/auth/auth.controller.ts`.
- **Module Registration**: Checked `apps/api/src/auth/auth.module.ts` and found:
  ```typescript
  import { AuthController } from './auth.controller';
  ...
  @Module({
    controllers: [AuthController],
  ```
  No modules in the codebase import or register `AuthController` from `apps/api/src/modules/auth/auth.controller.ts`.
- **6 Parent Portal Stubs**:
  - Stubs in `apps/api/src/modules/parent-portal/parent-portal.controller.ts` (`@Controller('parent')`):
    - `GET overview` (lines 12-16)
    - `GET academics` (lines 18-22)
    - `GET finance` (lines 24-28)
    - `GET communication` (lines 30-34)
    - `GET dashboard` (lines 36-40)
  - Stub in `apps/api/src/modules/parent-portal/parent-portal-children.controller.ts` (`@Controller('portals/parent')`):
    - `GET children` (lines 12-16)
- **Frontend Calls**: In `apps/web/src/components/parent/parent-command-center.tsx`, the web application queries endpoints like:
  - `const { data, isLoading } = useSchoolQuery<any>("/api/parent/overview");` (line 28)
  - `const { data, isLoading } = useSchoolQuery<any>("/api/parent/academics");` (line 48)
  - `const { data, isLoading } = useSchoolQuery<any>("/api/parent/finance");` (line 68)
  - `const { data, isLoading } = useSchoolQuery<any>("/api/parent/communication");` (line 88)
- **Parent Portal Auth Token**: In `apps/api/src/modules/integrations/parent-portal-auth.service.ts` (lines 152-158):
  ```typescript
  const tokenPair = await this.tokenService.issueTokenPair({
    user_id: subject.user_id,
    tenant_id: subject.tenant_id,
    role: subject.role_code,
    audience: 'portal',
    session_id: randomUUID(),
  });
  ```
- **Prisma & DB Mapping**:
  - `prisma/schema.prisma` mapping (lines 1539-1560):
    ```prisma
    model StudentGuardian {
      id                    String               @id @default(uuid())
      schoolId              String               @map("school_id")
      studentId             String               @map("student_id")
      guardianId            String               @map("guardian_id")
      guardian              ParentGuardian       @relation(fields: [guardianId], references: [id])
    ```
  - `apps/api/src/database/schema.sql` (lines 1186-1196):
    ```sql
    CREATE TABLE student_guardians (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id tenant_key NOT NULL,
      student_id uuid NOT NULL,
      user_id uuid,
      ...
    ```

## 2. Logic Chain
1. Since the duplicate auth controller `apps/api/src/modules/auth/auth.controller.ts` is not imported or registered in any module, NestJS does not expose its routes, and it is safe to delete. Deleting it will clean up the codebase without breaking routing.
2. The frontend calls `/api/parent/overview` etc., but the registered controller `ParentPortalController` (`apps/api/src/parent-portal/parent-portal.controller.ts`) does not define them, while the inactive stubs under `apps/api/src/modules/parent-portal/` do. Therefore, deleting these inactive stubs and implementing the actual endpoints in `ParentPortalController` will resolve the 404 routing errors.
3. The parent JWT payload contains `user_id` and `tenant_id` (schoolId context). Since `student_guardians` links the parent's `user_id` to the student's `id`, we can scope database queries by checking both the user context (as `guardianId` / `user_id`) and the tenant context (as `schoolId` / `tenant_id`).

## 3. Caveats
- No caveats.

## 4. Conclusion
- Deletion is the correct action for `apps/api/src/modules/auth/auth.controller.ts`.
- Deletion is the correct action for `apps/api/src/modules/parent-portal/parent-portal.controller.ts` and `apps/api/src/modules/parent-portal/parent-portal-children.controller.ts`.
- The real `ParentPortalController` (`apps/api/src/parent-portal/parent-portal.controller.ts`) must be updated to handle `/parent/overview`, `/parent/academics`, `/parent/finance`, and `/parent/communication`, delegating to `ParentPortalService` which queries `student_guardians` filtered by both the parent `userId` and the school `tenantId`.

## 5. Verification Method
- Execute the NestJS test command:
  ```powershell
  npm run test
  ```
- Inspect route registration in NestJS logs upon start, confirming no routing errors exist and `/parent/overview` etc. are registered.
