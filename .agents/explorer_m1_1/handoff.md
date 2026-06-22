# Handoff Report - R1 Database Schema Gaps & Fix Strategy

## 1. Observation

Direct observations of file paths, line numbers, and contents within the workspace:

### 1.1 `prisma/schema.prisma` (lines 1058–1073)
The current definition of `RolePermission` in the Prisma schema is:
```prisma
model RolePermission {
  id           String     @id @default(uuid())
  roleId       String     @map("role_id")
  role         Role       @relation(fields: [roleId], references: [id])
  permissionId String     @map("permission_id")
  permission   Permission @relation(fields: [permissionId], references: [id])
  schoolId     String?    @map("school_id")
  school       School?    @relation(fields: [schoolId], references: [id])
  allowed      Boolean    @default(true)
  createdAt    DateTime   @default(now()) @map("created_at")
  updatedAt    DateTime   @updatedAt @map("updated_at")

  @@unique([roleId, permissionId])
  @@index([schoolId])
  @@map("role_permissions")
}
```

### 1.2 `apps/api/src/database/schema.sql` (lines 466–483)
The physical database table `role_permissions` is defined in SQL as follows:
```sql
CREATE TABLE role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id tenant_key NOT NULL,
  role_id uuid NOT NULL,
  permission_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_role_permissions_tenant_id_non_global CHECK (tenant_id <> 'global'),
  CONSTRAINT uq_role_permissions_tenant_role_permission UNIQUE (tenant_id, role_id, permission_id),
  CONSTRAINT fk_role_permissions_role
    FOREIGN KEY (tenant_id, role_id)
    REFERENCES roles (tenant_id, id)
    ON DELETE CASCADE,
  CONSTRAINT fk_role_permissions_permission
    FOREIGN KEY (tenant_id, permission_id)
    REFERENCES permissions (tenant_id, id)
    ON DELETE CASCADE
);
```

### 1.3 `apps/api/src/auth/repositories/authorization.repository.ts` (lines 109–114)
The backend repository executes the following raw SQL insertion block:
```sql
        INSERT INTO role_permissions (tenant_id, role_id, permission_id)
        SELECT tenant_id, role_id, permission_id
        FROM resolved
        ON CONFLICT (tenant_id, role_id, permission_id)
        DO NOTHING
```

### 1.4 Missing Tenant Indexes on Legacy Models
* `DisciplineIncident` model (`prisma/schema.prisma` lines 3756–3785) lacks any index on `tenant_id` or `school_id`:
  ```prisma
  model DisciplineIncident {
    id                         String    @id @default(uuid()) @db.Uuid
    tenant_id                  String
    school_id                  String    @db.Uuid
    ...
    @@map("discipline_incidents")
  }
  ```
* `LegacyDisciplineAction` model (`prisma/schema.prisma` lines 3787–3807) lacks any index on `tenant_id` or `school_id`:
  ```prisma
  model LegacyDisciplineAction {
    id                 String    @id @default(uuid()) @db.Uuid
    tenant_id          String
    school_id          String    @db.Uuid
    ...
    @@map("discipline_actions")
  }
  ```

---

## 2. Logic Chain

1. **Uniqueness Gap**: In **Observation 1.1**, the uniqueness constraint on `RolePermission` is `@@unique([roleId, permissionId])`. This means that only one permission mapping per role can exist globally across the entire system.
2. **Override Constraint**: If a school/tenant wants to customize or override a system role (which is shared, e.g., role `Teacher` has `schoolId = null`), it cannot insert a new `RolePermission` entry with its specific `schoolId` (e.g. `(schoolId: "school-1", roleId: "teacher-id", permissionId: "view-grades-id")`) because it would violate the global `(role_id, permission_id)` uniqueness.
3. **Database Conflict**: In **Observation 1.2**, the physical database enforces uniqueness on `(tenant_id, role_id, permission_id)` via `uq_role_permissions_tenant_role_permission`. Additionally, **Observation 1.3** shows that raw SQL inserts rely on `ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING`. If Prisma synchronization generates constraints matching `@@unique([roleId, permissionId])` instead of the composite database key, database migrations or raw query executions will fail with a constraint mismatch error.
4. **Column Mapping Error**: The `RolePermission` model in **Observation 1.1** maps `schoolId` to column `"school_id"` (`@map("school_id")`). However, the physical database schema in **Observation 1.2** defines this column as `tenant_id` (`tenant_id tenant_key NOT NULL`). This mismatch causes any Prisma query on `RolePermission` that references `schoolId` to crash, as column `school_id` does not exist in `role_permissions`.
5. **Nullability Mismatch**: In **Observation 1.1**, `schoolId` is defined as optional (`String?`), whereas the database in **Observation 1.2** defines `tenant_id` as `NOT NULL` and restricts it from being `'global'`. Any Prisma insertion omitting the tenant identifier will cause database constraint violations.
6. **Missing Indexes**: Tenant-scoped queries on tables without tenant-aware indexes (such as `discipline_incidents` and `discipline_actions` in **Observation 1.4**) result in full-table scans. This violates **AGENTS.md Section 9** which mandates tenant-aware indexes for performance and strict school isolation.

---

## 3. Caveats

* This investigation assumes that the physical database column naming (`tenant_id`) and the check constraint (`tenant_id <> 'global'`) in `schema.sql` are the source of truth for the production database topology, and that Prisma's mapping must be updated to align with the SQL structure.
* Standard Prisma unique constraints do not natively support database-specific index-level features like `NULLS NOT DISTINCT` (PostgreSQL 15+). However, because `tenant_id` is defined as `NOT NULL` in the database, a standard composite uniqueness constraint `@@unique([schoolId, roleId, permissionId])` on the non-nullable field behaves identically in both Prisma and Postgres.
* Making `schoolId` non-nullable in Prisma requires ensuring that all seed scripts and controllers supply a valid `schoolId` (tenant key) during creation of `RolePermission` instances.

---

## 4. Conclusion

To fix the R1 database schema gaps, align the Prisma schema with the physical database structure, and enable correct tenant filtering:
1. **Enforce Tenant-Scoping column mapping**: Change `@map("school_id")` to `@map("tenant_id")` on `RolePermission.schoolId` to match the database column.
2. **Enforce Nullability**: Make `schoolId` (and the `school` relation) non-nullable (`String` and `School`) to match `NOT NULL` constraints.
3. **Align Uniqueness**: Replace `@@unique([roleId, permissionId])` with `@@unique([schoolId, roleId, permissionId])` to support tenant-specific overrides and match the `uq_role_permissions_tenant_role_permission` database index.
4. **Resolve Index Gaps**: Add missing `@@index([tenant_id])` or `@@index([school_id])` to models that currently lack them, such as `DisciplineIncident` and `LegacyDisciplineAction`.

### Proposed Prisma Schema Code Modifications

#### RolePermission Change
```prisma
// Before
model RolePermission {
  id           String     @id @default(uuid())
  roleId       String     @map("role_id")
  role         Role       @relation(fields: [roleId], references: [id])
  permissionId String     @map("permission_id")
  permission   Permission @relation(fields: [permissionId], references: [id])
  schoolId     String?    @map("school_id")
  school       School?    @relation(fields: [schoolId], references: [id])
  allowed      Boolean    @default(true)
  createdAt    DateTime   @default(now()) @map("created_at")
  updatedAt    DateTime   @updatedAt @map("updated_at")

  @@unique([roleId, permissionId])
  @@index([schoolId])
  @@map("role_permissions")
}

// After
model RolePermission {
  id           String     @id @default(uuid())
  roleId       String     @map("role_id")
  role         Role       @relation(fields: [roleId], references: [id])
  permissionId String     @map("permission_id")
  permission   Permission @relation(fields: [permissionId], references: [id])
  schoolId     String     @map("tenant_id")
  school       School     @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  allowed      Boolean    @default(true)
  createdAt    DateTime   @default(now()) @map("created_at")
  updatedAt    DateTime   @updatedAt @map("updated_at")

  @@unique([schoolId, roleId, permissionId])
  @@index([schoolId])
  @@map("role_permissions")
}
```

#### Legacy Table Index Additions (Example: DisciplineIncident & LegacyDisciplineAction)
```prisma
// DisciplineIncident Index Addition
model DisciplineIncident {
  ...
  tenant_id                  String
  school_id                  String    @db.Uuid
  ...
  @@index([tenant_id])
  @@index([school_id])
  @@map("discipline_incidents")
}

// LegacyDisciplineAction Index Addition
model LegacyDisciplineAction {
  ...
  tenant_id          String
  school_id          String    @db.Uuid
  ...
  @@index([tenant_id])
  @@index([school_id])
  @@map("discipline_actions")
}
```

---

## 5. Verification Method

To verify the changes and ensure they do not introduce errors:
1. **Prisma Schema Validation**: Run the Prisma validation CLI command in the root folder:
   ```bash
   npx prisma validate
   ```
   *Pass Condition*: Output should confirm that the schema is syntactically valid and all relations are resolved correctly.
2. **Database Client Compilation**: Run typescript check or project build to ensure generated Prisma types align with models:
   ```bash
   npm run typecheck
   ```
   *Pass Condition*: Compilation should complete successfully without any type mismatches or unresolved type references in the codebase.
3. **Integration Test Suite**: Run the auth and tenant-isolation integration tests:
   ```bash
   npm run test:auth-security
   npm run test:tenant-isolation
   ```
   *Pass Condition*: Tests should execute successfully, proving that database insertion/queries on role permissions correctly map and filter using the non-nullable `tenant_id` field.
