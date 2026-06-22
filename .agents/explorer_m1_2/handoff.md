# Handoff Report: Academics Module Index Gaps Review

## 1. Observation
I audited the target file `prisma/schema.prisma` for the 10 models specified in the Academics Module index gap review request. Direct inspection of their definitions in `prisma/schema.prisma` yields:

1. **`StudentClassAssignment`** (Lines 3485-3508): Already has `@@index([schoolId])` on line 3506.
2. **`StudentNote`** (Lines 3535-3552): Already has `@@index([schoolId])` on line 3550.
3. **`ParentMeeting`** (Lines 3554-3576): Already has `@@index([schoolId])` on line 3574.
4. **`ClassRequest`** (Lines 3578-3596): Already has `@@index([schoolId])` on line 3594.
5. **`AcademicAuditLog`** (Lines 3598-3610): **MISSING** `@@index([schoolId])`.
6. **`AcademicAssignment`** (Lines 3640-3658): Already has `@@index([schoolId])` on line 3656.
7. **`AcademicResource`** (Lines 3660-3678): Already has `@@index([schoolId])` on line 3676.
8. **`LessonLog`** (Lines 3680-3697): Already has `@@index([schoolId])` on line 3695.
9. **`ClassTeacherAssignment`** (Lines 3699-3713): Already has `@@index([schoolId])` on line 3711.
10. **`ReportCardSetting`** (Lines 3715-3728): Already has `@@index([schoolId])` on line 3726.

Verbatim definition of the deficient model (`AcademicAuditLog` from lines 3598-3610):
```prisma
model AcademicAuditLog {
  id          String   @id @default(uuid())
  schoolId    String   @map("school_id")
  school      School   @relation("SchoolToAcademicAuditLog", fields: [schoolId], references: [id], onDelete: Cascade)
  entityType  String   @map("entity_type")
  entityId    String?  @map("entity_id") @db.Uuid
  action      String
  actorUserId String?  @map("actor_user_id") @db.Uuid
  metadata    Json     @default("{}")
  createdAt   DateTime @default(now()) @map("created_at")

  @@map("academic_audit_logs")
}
```

## 2. Logic Chain
1. Multi-tenant database performance and data isolation rely on filtering queries by tenant scope (`schoolId`).
2. Without a database index on the tenant column, the database performs full-table scans to serve tenant-filtered queries. This degrades query performance linearly with database growth.
3. Nine out of the ten targeted Academics Module tables define either `@@index([schoolId])` or a multi-column index starting with `schoolId`.
4. `AcademicAuditLog` contains the `schoolId` field and references the `School` relation but completely lacks any corresponding database index.
5. Therefore, `AcademicAuditLog` represents the sole database index gap in this module's audit list.

## 3. Caveats
- Investigation was read-only and restricted to the codebase representation in `schema.prisma`. It assumes no external schema-drift or custom PostgreSQL indexes exist out-of-sync with Prisma.
- Assumes PostgreSQL is the active database engine (as configured on line 7).

## 4. Conclusion
Out of the 10 requested models in the Academics Module, **`AcademicAuditLog`** is the only table missing `@@index([schoolId])`.

### Recommended Fix Strategy
Apply the following contiguous code diff to `prisma/schema.prisma` in `AcademicAuditLog` model:

```diff
  model AcademicAuditLog {
    id          String   @id @default(uuid())
    schoolId    String   @map("school_id")
    school      School   @relation("SchoolToAcademicAuditLog", fields: [schoolId], references: [id], onDelete: Cascade)
    entityType  String   @map("entity_type")
    entityId    String?  @map("entity_id") @db.Uuid
    action      String
    actorUserId String?  @map("actor_user_id") @db.Uuid
    metadata    Json     @default("{}")
    createdAt   DateTime @default(now()) @map("created_at")
  
+   @@index([schoolId])
    @@map("academic_audit_logs")
  }
```

Once the schema is updated:
1. Run `npx prisma validate` to confirm the schema is valid.
2. Run database migration generator:
   ```powershell
   npx prisma migrate dev --name add_school_id_index_to_academic_audit_log
   ```
3. Run Prisma Client generation:
   ```powershell
   npx prisma generate
   ```

## 5. Verification Method
- **Static Schema Inspection**: Verify `prisma/schema.prisma` contains `@@index([schoolId])` inside the `model AcademicAuditLog` block.
- **Migration Generation Verification**: Run `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script` to verify that Prisma generates the correct `CREATE INDEX "academic_audit_logs_school_id_idx"` DDL.
