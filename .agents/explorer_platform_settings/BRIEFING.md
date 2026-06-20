# BRIEFING — 2026-06-20T14:55:29+03:00

## Mission
Perform a detailed read-only exploration of the codebase to prepare for implementing platform settings persistence and global maintenance mode.

## 🔒 My Identity
- Archetype: explorer
- Roles: read-only investigation, analysis, synthesis
- Working directory: c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\explorer_platform_settings
- Original parent: 614bfe0c-363f-4a2b-a432-15b2be397f65
- Milestone: platform settings & maintenance mode analysis

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Multi-tenant event-driven rules as per AGENTS.md

## Current Parent
- Conversation ID: 614bfe0c-363f-4a2b-a432-15b2be397f65
- Updated: 2026-06-20T15:00:00+03:00

## Investigation State
- **Explored paths**:
  - `prisma/schema.prisma`
  - `apps/api/src/modules/platform/platform-onboarding.controller.ts`
  - `apps/api/src/modules/platform/platform-onboarding.service.ts`
  - `apps/api/src/modules/platform/platform-onboarding.service.test.ts`
  - `apps/api/src/guards/jwt-auth.guard.ts`
  - `apps/api/src/guards/rbac.guard.ts`
  - `apps/api/src/guards/tenant-bound.guard.ts`
  - `apps/api/src/middleware/tenant.middleware.ts`
  - `apps/api/src/middleware/auth-context.middleware.ts`
  - `apps/api/src/app.module.ts`
  - `apps/web/src/components/platform/workspaces/SettingsWorkspace.tsx`
  - `apps/web/src/lib/platform/school-onboarding-client.ts`
- **Key findings**:
  - The database schema `PlatformSettings` only stores `id` and `maintenanceMode`.
  - The backend endpoints `GET /platform/settings` and `PUT /platform/settings` only read/write `maintenanceMode` using raw SQL.
  - The frontend `SettingsWorkspace.tsx` manages 27 configuration fields. Since the backend does not persist them, these values revert to defaults on reload.
  - NestJS Middlewares run before Guards, and `TenantMiddleware` runs before `AuthContextMiddleware`. Therefore, NestJS global Guards are the correct integration point for maintenance mode checks where role context is fully resolved.
  - The Super Admin role is identified by `'platform_owner'` (constant `SUPERADMIN_ROLE_OWNER`).
- **Unexplored areas**:
  - None within the scope of this investigation.

## Key Decisions Made
- Confirmed that global NestJS Guard is the safest and most robust location to integrate maintenance mode checks.
- Mapped all 27 settings fields that must be added to the Prisma schema and service database serialization.

## Artifact Index
- c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\explorer_platform_settings\handoff.md — Analysis and findings report.
