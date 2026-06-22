# Challenge Report - R1 Database Schema Validation & Compile-Safety

## Challenge Summary

**Overall risk assessment**: MEDIUM

While the database index optimization is extensive and correct in terms of performance enhancement, there are underlying design assumptions that introduce potential runtime risks and database write overheads.

---

## Challenges

### [Medium] Challenge 1: OutboxEvents school_id non-nullability constraint
- **Assumption challenged**: Every outbox event must always be scoped to a specific school (have a valid `school_id`).
- **Attack scenario**: If a global platform event is emitted (e.g., system-level background cleanup, global email provider status changes, superadmin system notifications), it does not belong to a specific tenant school. Since `school_id` is defined as non-nullable `Uuid` on `OutboxEvents`, attempting to save such an event will fail with a database foreign key constraint violation.
- **Blast radius**: Failure of system-wide operations, global workflows, and telemetry logging.
- **Mitigation**: Make `school_id` optional (`Uuid?`) in the `OutboxEvents` model in `schema.prisma`, or assign a standard system-reserved default UUID (e.g. `00000000-0000-0000-0000-000000000000`) for global/tenant-agnostic events.

### [Low] Challenge 2: Index redundancy and write performance amplification
- **Assumption challenged**: Adding dual indexes `@@index([tenant_id])` and `@@index([school_id])` on the same legacy model table is optimal.
- **Attack scenario**: On write-heavy tables (like `DisciplineIncident`, `DisciplineComment`, or `OutboxEvents`), maintaining multiple indexes on columns that represent the exact same tenant boundary (often containing the same UUID values) increases database write amplification. This slows down insertion/update operations and consumes unnecessary disk space.
- **Blast radius**: Database write throughput degradation and increased storage overhead.
- **Mitigation**: Standardize legacy models on a single tenant identifier column (e.g., standardizing on `school_id` or `tenant_id` and dropping the other duplicate column/index), or verify whether both indexes are strictly necessary.

---

## Stress Test Results

- **Prisma Schema validation under strict flags** → `npx prisma validate` executes correctly. → **PASS**
- **Prisma Client type generation and TS build check** → `npm run typecheck` fails due to strict null check and missing fields. → **FAIL**

---

## Unchallenged Areas

- **Unique index combination on RolePermission** (`@@unique([schoolId, roleId, permissionId])`): This is a correct security enhancement to prevent cross-tenant permission mappings, and is robust against adversarial bypasses.
