# Project: MyShule Administrative Command Centers

## Architecture
- **Frontend Workspaces**: React components located in `apps/web/src/components/school/` querying `/api/admin-command/<role>/...`.
- **API Gateway**: Next.js api route proxies `/api/admin-command/[...path]` to backend `/admin-command/[...path]`.
- **Backend Service Layer**: NestJS module `admin-command` containing controllers, services, and repositories.
- **Tenant Isolation**: Extracted `tenant_id` (representing `school_id`) from RequestContextService for database queries.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Decompose Roles | Group the 16 missing roles into logical implementation batches | None | DONE |
| 2 | Implementation Batch A | Implement controllers/services for Storekeeper, Nurse, Transport, Boarding, Class Teacher | M1 | DONE |
| 3 | Implementation Batch B | Implement controllers/services for Dean Academics, Exams, HOD, Guidance/Counselling | M2 | DONE |
| 4 | Implementation Batch C | Implement controllers/services for ICT, Lab Tech, Librarian, Procurement, Secretary | M3 | DONE |
| 5 | Implementation Batch D | Implement controllers/services for Security, Teacher, Student, Parent, Accountant | M4 | DONE |
| 6 | Integration & Register | Register all new controllers and services in `AdminCommandModule` | M5 | DONE |
| 7 | Remediate Integrity Violations | Fix the pre-existing facade controllers and self-certifying tests reported by the Forensic Auditor | M6 | IN_PROGRESS |
| 8 | Compile & Verify | Run builds/tests and verify both web and api projects compile cleanly | M7 | PLANNED |

## Interface Contracts
### NestJS controllers ↔ Prisma Database
- Controllers use `@Controller('admin-command/<role>')` prefix.
- Controllers use `@Permissions('<permission>')` matching the user roles.
- Services query the database via raw SQL or Prisma client using the tenant_id scoped via `RequestContextService`.
