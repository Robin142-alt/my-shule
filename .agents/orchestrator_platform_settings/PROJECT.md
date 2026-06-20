# Project: Platform Settings Persistence & Maintenance Mode Enforcement

## Architecture
- **Prisma Schema**: Update `PlatformSettings` model in `prisma/schema.prisma` to include all platform configurations from the frontend settings workspace.
- **Backend API**: Map the updated settings fields to NestJS controller/service under `apps/api/src/modules/platform/platform-onboarding.controller.ts` and `platform-onboarding.service.ts` using SQL or Prisma client.
- **Maintenance Mode Guard**: Implement a global guard, interceptor, or middleware in `apps/api` to check if maintenance mode is enabled and reject requests from non-superadmin users if true.
- **Frontend Alignment**: Update `apps/web/src/components/platform/workspaces/SettingsWorkspace.tsx` and ensure settings fields match backend.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | DB Schema & API | Update Prisma schema, run migration, update platform-onboarding controller/service | none | DONE |
| 2 | Maintenance Guard | Implement global NestJS middleware/guard/interceptor for maintenance mode | M1 | DONE |
| 3 | Frontend Alignment | Align SettingsWorkspace frontend component settings with backend persistence | M1, M2 | DONE |
| 4 | E2E Testing & Audit | Run tests and execute verification checklist | M1, M2, M3 | DONE |

## Interface Contracts
- `GET /api/platform/settings`: returns a JSON object with all platform settings.
- `PUT /api/platform/settings`: accepts a JSON object with updated platform settings, saves it, and returns success.
- `GET/POST/PUT/DELETE /api/...` (tenant routes): returns `503 Service Unavailable` if maintenance mode is active, unless authenticated user is a Super Admin.
