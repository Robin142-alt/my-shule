# Scope: Exams & Analytics Module Upgrade

## Architecture
- Framework: NestJS (Backend), React/Next.js (Frontend)
- Database ORM: Prisma + Custom SQL (via `ExamsRepository.executeSql`)
- Multi-tenancy Isolation:
  - Scoped by `tenant_id` using `RequestContextService`.
  - Database calls in the Exams module use raw SQL with parameter binding (e.g. `$1` for `tenant_id`).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | Investigation & Plan | Analyze the existing exams backend schema and frontend components. Define analytics query payloads and chart layouts. | None | DONE |
| 2 | Backend Endpoints | Build NestJS controller endpoints, service methods, and repository queries for exam analytics aggregations. | M1 | DONE |
| 3 | Frontend Dashboard | Upgrade the Analytics tab in `exams-module-screen.tsx` to display interactive charts, trends, distributions, and progress. | M2 | IN_PROGRESS |
| 4 | Programmatic Verification | Write unit/integration tests in `exams.test.ts` (or a separate test file) for aggregation logic. | M2 | PLANNED |
| 5 | Validation & Cleanup | Verify build, type correctness, tenant isolation, and run the Forensic Auditor. | M2, M3, M4 | PLANNED |

## Interface Contracts
- `GET /exams/analytics/summary` -> Returns high-level KPI stats.
- `GET /exams/analytics/trends` -> Returns historical mean score trends.
- `GET /exams/analytics/subject-performance` -> Returns subject-by-subject averages, pass rates, and distributions.
- `GET /exams/analytics/student-progress` -> Returns top-improving, top-performing, and at-risk students.
