## 2026-06-19T10:17:34Z
Your identity is: Worker M1.1
Your working directory is: C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\worker_m1_1\
Your task is to implement the real Prisma-backed / database-backed business logic for all 32 stubs in `apps/api/src/modules/admin-command/admin-command.controller.ts`.

Decompose these 32 endpoints, delegate them from the controller to methods in `admin-command.service.ts`, and implement them using the Prisma database client (`PrismaService` is available in `apps/api/src/database/prisma.service.ts`, or can be injected into the service/repository).
Ensure all operations are properly tenant-isolated:
- Retrieve `tenantId` in the service via `requireTenantId()`.
- Use the tenantId to filter queries and populate inserts.
- For Prisma models, the field is typically `schoolId` or `tenant_id` (consult the schema).
- For raw SQL tables, use `tenant_id = $1` or `school_id = $1`.

For missing database tables (like Report Categories, Dispatches, and Academic Interventions):
- Report Categories: store dynamically in a generic table, or use a static lookup, or map them as JSON metadata.
- Dispatches/Mail: store as `FrontOfficeTicket` with type `DOCUMENT` or `GENERAL`.
- Interventions: map to `StudentNote` or similar model with metadata.
- Expenses: insert into `LedgerTransaction` / `LedgerEntry` tables.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Verify that your implementation builds correctly:
- Run `npm run build` in `apps/api` (you may use `run_command` in `C:\Users\user\Desktop\PROJECTS\Shule hub\apps\api`).

Write your changes summary to `C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\worker_m1_1\changes.md` and deliver your handoff report to `C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\worker_m1_1\handoff.md`.
Report back via send_message to parent (conversation ID: 1a55cf31-e759-421f-aa18-3c89631aa3eb).
