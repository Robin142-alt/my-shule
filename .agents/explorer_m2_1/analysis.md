# Parent Portal & Authentication Integration Analysis

## 1. Duplicate Auth Controller Analysis

### 1.1 Comparison of Controllers
- **Mock/Duplicate Controller**: `apps/api/src/modules/auth/auth.controller.ts`
  - Decorator: `@Controller('auth')`
  - Routes: Mock implementations of `login`, `logout`, `sessions`, `revokeSessions`, `invitations`, `csrf`, `email-verification/request`, `email-verification/verify`, `invitations/accept`, `password-recovery/request`, `password-recovery/reset`, `refresh`.
- **Real Controller**: `apps/api/src/auth/auth.controller.ts`
  - Decorator: `@Controller('auth')`
  - Routes: Full production implementations (with Supabase, JWTs, permissions check, audits, etc.) for `register`, `login`, `refresh`, `password-recovery/request`, `password-recovery/reset`, `email-verification/request`, `email-verification/verify`, `invitations/accept`, `invitations` (create/list/resend/revoke), `tenant-users` (status/role update), `logout`, `me`, `sessions` (get/revoke/revoke-all).

### 1.2 Module Registration & Routing Impact
- NestJS compiles routing based on controllers declared in Nest modules.
- The duplicate/fake `AuthController` in `apps/api/src/modules/auth/auth.controller.ts` is **not registered in any NestJS module**. No files import it or register it.
- The real `AuthController` in `apps/api/src/auth/auth.controller.ts` is imported and registered globally in `apps/api/src/auth/auth.module.ts`.
- Thus, the routes of the duplicate controller are inactive and not exposed by the API server.
- The csrf route (`/auth/csrf`) exists in the duplicate controller but is handled locally in Next.js (`apps/web/src/app/api/auth/csrf/route.ts`) using local cookie verification, so the backend route is not called.
- **Conclusion**: Deleting `apps/api/src/modules/auth/auth.controller.ts` will **not break any module registration or routing**. Deletion is safe and recommended over delegation to avoid dead code and security confusion.

---

## 2. Parent Portal Controller Stubs Analysis

There are exactly **6 stubs** defined in the inactive parent portal controllers under `apps/api/src/modules/parent-portal/`:

### 2.1 Stubs in `ParentController` (`apps/api/src/modules/parent-portal/parent-portal.controller.ts`)
1. **`GET parent/overview`** (mock returns `{ items: [] }`)
2. **`GET parent/academics`** (mock returns `{ items: [] }`)
3. **`GET parent/finance`** (mock returns `{ items: [] }`)
4. **`GET parent/communication`** (mock returns `{ items: [] }`)
5. **`GET parent/dashboard`** (mock returns `{ items: [] }`)

### 2.2 Stubs in `PortalsParentController` (`apps/api/src/modules/parent-portal/parent-portal-children.controller.ts`)
6. **`GET portals/parent/children`** (mock returns `{ items: [] }`)

### 2.3 Integration Route Mismatch
- The Next.js frontend calls `/api/parent/overview`, `/api/parent/academics`, `/api/parent/finance`, and `/api/parent/communication` (in `parent-command-center.tsx`).
- However, since these controllers are inactive, the API currently returns 404 for these endpoints.
- The active, registered `ParentPortalController` (in `apps/api/src/parent-portal/parent-portal.controller.ts`) only exposes:
  - `GET /parent/dashboard`
  - `GET /parent/children`
  - `GET /parent/:module/:studentId`
- **Resolution Strategy**:
  - Delete `apps/api/src/modules/parent-portal/parent-portal.controller.ts` and `apps/api/src/modules/parent-portal/parent-portal-children.controller.ts`.
  - Add the missing overview, academics, finance, and communication methods to the registered `ParentPortalController` in `apps/api/src/parent-portal/parent-portal.controller.ts` and delegate to `ParentPortalService`.

---

## 3. Parent Authentication Token Structure

The token generated during parent OTP verification in `ParentPortalAuthService.verifyOtp` is structured as follows:
- **Issuer/Audience**: Audience is explicitly set to `'portal'` (differentiating it from standard school/admin logins).
- **Claims**:
  - `user_id`: UUID of the parent's `User` record.
  - `tenant_id`: The ID of the school the parent is accessing.
  - `role`: `'parent'`.
  - `session_id`: Unique UUID representing the current active session.
- **Metadata**: Stores the user agent and IP address of the parent.

---

## 4. Parent to Student Mapping & Database Schema

### 4.1 Relationship Overview
- **Authentication Subject (`User`)**: Represents the parent account in the `users` table. The `User.id` represents the unique authenticated user.
- **Tenant Context (`tenant_memberships`)**: Links the parent `User` to a specific school (`tenant_id`) with the role `'parent'`.
- **Learner Link (`student_guardians`)**: A join table mapping the parent `User` (`user_id` / `guardian_id`) to the `Student` (`student_id`).

### 4.2 Schema Definitions Mismatch
There is a slight mismatch between the SQL schema and the Prisma model mapping:
- **SQL Schema (`student_guardians` table)**:
  - `user_id` (foreign key to `users.id`) links the parent user directly to the student.
  - No `guardian_id` or `parent_guardians` table is defined in the initial `schema.sql`.
- **Prisma Schema (`schema.prisma` models)**:
  - `ParentGuardian` (table `parent_guardians`) stores guardian profiles.
  - `StudentGuardian` (table `student_guardians`) links `Student` to `ParentGuardian` via `guardianId` (maps to `guardian_id` column).
- **Prisma Query Resolution**:
  In `ParentPortalService`, the application maps parent users to students by executing:
  ```typescript
  const result = await this.prisma.studentGuardian.findMany({
    where: {
      guardianId: userId, // guardianId acts as parent's User.id
      schoolId: tenantId,
    },
    include: {
      student: true
    }
  });
  ```
  This means `ParentGuardian.id` is expected to correspond directly to the parent's `User.id` (meaning the parent user profile and guardian profile share the same UUID or are mapped 1-to-1).

### 4.3 Scoped Queries
To ensure proper multi-tenant isolation and data protection (so parents only see their own children), all queries must be scoped by:
1. `parentId` (mapped to `guardianId` / `user_id` in `student_guardians`)
2. `schoolId` / `tenant_id` (representing the specific school tenant)

---

## 5. Proposed Fix Strategy

1. **Auth Controller Cleanup**:
   - Delete the fake controller file: `apps/api/src/modules/auth/auth.controller.ts`.
   - Ensure the directory `apps/api/src/modules/auth/` is removed.

2. **Parent Portal Controllers Alignment**:
   - Delete the inactive controller files:
     - `apps/api/src/modules/parent-portal/parent-portal.controller.ts`
     - `apps/api/src/modules/parent-portal/parent-portal-children.controller.ts`
   - Wire the active controller `apps/api/src/parent-portal/parent-portal.controller.ts` to implement the missing routes `/parent/overview`, `/parent/academics`, `/parent/finance`, and `/parent/communication`.
   - Update `ParentPortalService` to fetch and return real school data (scoped by both `parentId` and `schoolId` / `tenant_id`) for these routes instead of returning stub empty arrays.
