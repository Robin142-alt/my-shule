# Project: MyShule System Audit and Endpoint Gap Analysis

## Architecture
- **Frontend**: React application under `apps/web`. Uses custom hooks like `useSchoolQuery`, `useQuery`, and standard `fetch` or queries in `apps/web/src/components` to communicate with the NestJS API backend.
- **Backend**: NestJS application under `apps/api`. Implements Controllers and Services to process frontend requests, enforce tenant scoping, and perform CRUD operations.
- **Database**: Prisma ORM with schema defined at `prisma/schema.prisma`.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Frontend Analysis | Programmatically extract all expected API endpoints from hooks/queries in `apps/web/src/components` | None | DONE |
| 2 | Backend Analysis | Identify all implemented API routes, controllers, and services in `apps/api` | None | DONE |
| 3 | Database Schema Audit | Identify missing database tables/columns required by backend services | M2 | DONE |
| 4 | Gap Reconciliation | Cross-reference expected vs actual endpoints and database requirements, identifying gaps | M1, M2, M3 | DONE |
| 5 | Audit Report Generation | Produce `system_audit_report.md` in the workspace root | M4 | DONE |
| 6 | Report Verification | Independently review accuracy and coverage of the audit report | M5 | IN_PROGRESS (f9c000a5, 56f5720c) |

## Code Layout
- Frontend components: `apps/web/src/components`
- Backend API codebase: `apps/api`
- Database schema: `prisma/schema.prisma`
- Audit report: `C:\Users\user\Desktop\PROJECTS\Shule hub\system_audit_report.md`
