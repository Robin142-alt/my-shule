# Project: MyShule Production-Readiness Feature Implementation

## Architecture
- **Frontend**: Next.js React application under `apps/web`. Interfaces with backend through `/api/admin-command/...` and other domain-specific API routes.
- **Backend**: NestJS application under `apps/api`. Emits domain events, validates permissions, scopes queries by `tenant_id`/`schoolId` context.
- **Database**: PostgreSQL database managed via Prisma ORM at `prisma/schema.prisma`.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Gap & System Build Audit | Verify compilation and extract exact routing gaps between React workspaces and NestJS backend | None | PLANNED |
| 2 | Role-Command Controllers | Implement and register NestJS controllers under `/admin-command/<role>` prefix for all active workspaces | M1 | PLANNED |
| 3 | Prisma Schema & Business Logic | Implement real Prisma-backed queries/mutations with event emissions and tenant isolation; add missing database indexes | M2 | PLANNED |
| 4 | Final Verification & Certification | Ensure build compiles without errors and passes all compliance/test checks | M3 | PLANNED |

## Interface Contracts
### Frontend React Workspaces ↔ Backend Role-Command Controllers
- Endpoint base: `/admin-command/<role>/...`
- Payload structure: JSON objects scoped by `x-tenant-id` header
- Audit log tracking and event emission for every mutating operation
