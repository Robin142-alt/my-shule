# Project: MyShule Backend Integrity Remediation

This project remediates the "facade" implementations discovered by the forensic audit in the MyShule NestJS backend. It replaces stubs in 9 controllers and restores the test integrity of the exams test suite.

## Architecture
- Framework: NestJS (TypeScript)
- Database ORM: Prisma
- Multi-tenancy Isolation:
  - Enforced via `schoolId` (native Prisma models) or `tenant_id` (raw SQL programmatically generated tables).
  - The `RequestContextService` is used to retrieve the current `tenant_id` (school boundary ID) for isolation.

## Code Layout
- Controllers: `apps/api/src/modules/<module>/<module>.controller.ts`
- Services: `apps/api/src/modules/<module>/<module>.service.ts`
- Repositories: `apps/api/src/modules/<module>/repositories/`
- Test: `apps/api/src/modules/exams/exams.test.ts`
- Prisma Schema: `prisma/schema.prisma`

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Academics & Secretary | Remediate stubs in `AcademicController`, `AcademicsController`, and `SecretaryController`. | None | DONE |
| 2 | Exams & Test Integrity | Remediate stubs in `ExamsController` and restore `exams.test.ts` assertions. | M1 | DONE |
| 3 | Billing & Clinic | Remediate stubs in `BillingController` and `ClinicController`. | None | DONE |
| 4 | Boarding & Transport | Remediate stubs in `BoardingController` and `TransportController`. | None | DONE |
| 5 | Timetable & Communication | Remediate stubs in `TimetableController` and `CommunicationController`. | None | DONE |
| 6 | Verification & Audit | E2E builds, integration testing, and forensic audit validation. | M1, M2, M3, M4, M5 | DONE |

## Interface Contracts

### RequestContext ↔ Prisma Queries
All queries MUST retrieve the tenant ID using requestContext:
```typescript
const tenantId = this.requestContext.requireStore().tenant_id;
```
For native Prisma models:
```typescript
where: { schoolId: tenantId }
```
For custom SQL tables:
```typescript
where: { tenant_id: tenantId }
```
