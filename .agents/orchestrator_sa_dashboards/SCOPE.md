# Scope: Super Admin Dashboards Phase

## Architecture
- **Frontend Layer**: 16 React workspaces located under `apps/web/src/components/platform/workspaces/`.
- **Backend API Layer**: `PlatformOnboardingController` located at `apps/api/src/modules/platform/platform-onboarding.controller.ts`.
- **Backend Service Layer**: `PlatformOnboardingService` located at `apps/api/src/modules/platform/platform-onboarding.service.ts`.
- **Database Layer**: PostgreSQL via Prisma (`prisma/schema.prisma`) and raw SQL executors.
- **Permissions check**: All platform endpoints are guarded by `@Roles(SUPERADMIN_ROLE_OWNER)` (Super Admin).

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Database Schema Bootstrap | Create tables `platform_broadcasts`, `platform_templates`, `platform_backups`, `platform_security_policies`, and `platform_settings` programmatically. | None | DONE |
| M2 | Backend API Implementation | Implement NestJS GET, POST, PUT, DELETE endpoints in `PlatformOnboardingController` and `PlatformOnboardingService`. | M1 | DONE |
| M3 | Frontend Workspace Refactoring | Wire frontend components to real endpoints and align response schemas. | M2 | DONE |
| M4 | Verification & Build checks | Run compilations (`npm run build`) and test verification. | M3 | DONE |

## Interface Contracts

### Super Admin Controller Guard
Every controller route in the platform module must be decorated with:
```typescript
@Roles(SUPERADMIN_ROLE_OWNER)
```

### SMS Settings Payload Contract
The GET `/api/platform/sms-settings` response structure:
```typescript
{
  providers: PlatformSmsProvider[];
  metrics: {
    activeSms: number;
    activeEmail: number;
    messagesSent: number;
    failedDeliveries: number;
  };
}
```
