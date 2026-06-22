# BRIEFING — 2026-06-20T19:42:00Z

## Mission
Analyze prisma/schema.prisma, identify gaps in RolePermission join table regarding schoolId/tenant_id, and recommend a tenant-filtering fix strategy.

## 🔒 My Identity
- Archetype: Explorer
- Roles: Teamwork explorer, Investigator, Synthesizer
- Working directory: c:\Users\user\Desktop\PROJECTS\Shule hub\.\agents\explorer_m1_1
- Original parent: 88eb85f1-507f-4b4b-8e07-e7efec6653af
- Milestone: M1 (Database Schema Audit)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Multi-tenant tenant-isolation check (schoolId/tenant_id)
- Code-only network mode (no external internet access)

## Current Parent
- Conversation ID: 88eb85f1-507f-4b4b-8e07-e7efec6653af
- Updated: 2026-06-20T19:42:00Z

## Investigation State
- **Explored paths**:
  - `prisma/schema.prisma`
  - `apps/api/src/database/schema.sql`
  - `apps/api/src/auth/repositories/authorization.repository.ts`
  - `apps/api/src/auth/entities/role-permission.entity.ts`
  - `apps/api/src/database/entities/base.entity.ts`
- **Key findings**:
  - `RolePermission` in Prisma currently has a nullable `schoolId` field mapped to database column `school_id`, but the physical database table `role_permissions` uses a non-nullable `tenant_id` column.
  - The unique constraint `@@unique([roleId, permissionId])` in Prisma prevents tenant-specific overrides of system roles and conflicts with the database's composite unique constraint `uq_role_permissions_tenant_role_permission UNIQUE (tenant_id, role_id, permission_id)`.
  - NestJS `AuthorizationRepository` uses raw SQL queries expecting `tenant_id` and performing `ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING`, which will fail if Prisma's constraint mismatch is not resolved.
  - Some models in Phase 7/Legacy (like `DisciplineIncident` and `LegacyDisciplineAction`) lack indexes on `tenant_id` or `school_id`, causing full-table scans under tenant isolation filters, while others (like `DisciplineComment` and `ClinicVisits`) do have them.
- **Unexplored areas**: None. The investigation of R1 gaps is complete.

## Key Decisions Made
- Confirmed that the fix requires renaming the mapped column for `schoolId` to `"tenant_id"` on the `RolePermission` model, making it non-nullable to match the DB schema, and changing the uniqueness constraint to `@@unique([schoolId, roleId, permissionId])` to align Prisma with physical SQL constraints and allow tenant-specific overrides of system roles.

## Artifact Index
- c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\explorer_m1_1\ORIGINAL_REQUEST.md — Logging of user request
- c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\explorer_m1_1\progress.md — Heartbeat progress tracking
