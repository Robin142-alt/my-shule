# Handoff Report — R1 Index Gaps in Phase 7 & Legacy Modules

## 1. Observation
Within the designated line range of `prisma/schema.prisma` (lines 3718 to 6632), we observed that the following six models contain `tenant_id` and `school_id` fields but lack any `@@index` or `@@unique` constraints on either field:

1. **`DisciplineIncident`** (Lines 3756-3785)
   ```prisma
   model DisciplineIncident {
     id                         String    @id @default(uuid()) @db.Uuid
     tenant_id                  String
     school_id                  String    @db.Uuid
     ...
     @@map("discipline_incidents")
   }
   ```
2. **`LegacyDisciplineAction`** (Lines 3787-3807)
   ```prisma
   model LegacyDisciplineAction {
     id                 String    @id @default(uuid()) @db.Uuid
     tenant_id          String
     school_id          String    @db.Uuid
     ...
     @@map("discipline_actions")
   }
   ```
3. **`BehaviorPoint`** (Lines 3849-3868)
   ```prisma
   model BehaviorPoint {
     id                 String    @id @default(uuid()) @db.Uuid
     tenant_id          String
     school_id          String    @db.Uuid
     ...
     @@map("behavior_points")
   }
   ```
4. **`DisciplineNotification`** (Lines 3870-3885)
   ```prisma
   model DisciplineNotification {
     id                String   @id @default(uuid()) @db.Uuid
     tenant_id         String
     school_id         String   @db.Uuid
     ...
     @@map("discipline_notifications")
   }
   ```
5. **`ParentAcknowledgement`** (Lines 3887-3901)
   ```prisma
   model ParentAcknowledgement {
     id                   String   @id @default(uuid()) @db.Uuid
     tenant_id            String
     school_id            String   @db.Uuid
     ...
     @@map("parent_acknowledgements")
   }
   ```
6. **`DisciplineAuditLog`** (Lines 3903-3918)
   ```prisma
   model DisciplineAuditLog {
     id            String   @id @default(uuid()) @db.Uuid
     tenant_id     String
     school_id     String   @db.Uuid
     ...
     @@map("discipline_audit_logs")
   }
   ```

All other models containing `tenant_id` or `school_id` within the specified range correctly define matching `@@index` or `@@unique` configurations.

---

## 2. Logic Chain
1. Per the Tenant Isolation and Database Contract Rules in `AGENTS.md` (Sections 6 & 9), all tenant/school-scoped queries must be backed by appropriate indexes to prevent performance issues and ensure safe querying.
2. We analyzed the Prisma schema (`schema.prisma`) inside the target lines range (3718 to 6632).
3. We extracted every model block, cataloging its fields and indices (`@@index` and `@@unique`).
4. We verified if `tenant_id` or `school_id` fields were referenced inside any of the model's index blocks.
5. In the six models listed in Section 1, both fields exist, but no `@@index` or `@@unique` constraint lists either `tenant_id` or `school_id`.
6. Therefore, these models suffer from R1 index gaps.

---

## 3. Caveats
* **Scope Restriction**: The analysis was strictly bounded to lines 3718 to 6632 of `prisma/schema.prisma`. Models outside this line range were not examined.
* **Single vs. Composite Indexes**: We assume separate single-column indexes on `tenant_id` and `school_id` are preferred rather than composite index keys (e.g. `@@index([tenant_id, school_id])`), which aligns with standard patterns observed across other models in the same schema file.

---

## 4. Conclusion
To resolve the R1 index gaps in Phase 7 and Legacy Modules, we recommend adding individual indices for `tenant_id` and `school_id` to each of the six identified models. 

### Proposed Fix Strategy:
Apply the following lines to all six models right before their respective `@@map(...)` annotations:
```prisma
  @@index([tenant_id])
  @@index([school_id])
```

#### Example implementation for `DisciplineIncident`:
```prisma
model DisciplineIncident {
  id                         String    @id @default(uuid()) @db.Uuid
  tenant_id                  String
  school_id                  String    @db.Uuid
  student_id                 String    @db.Uuid
  class_id                   String    @db.Uuid
  academic_term_id           String    @db.Uuid
  academic_year_id           String    @db.Uuid
  offense_category_id        String    @db.Uuid
  reporting_staff_id         String    @db.Uuid
  assigned_staff_id          String?   @db.Uuid
  incident_number            String
  title                      String
  severity                   String
  status                     String
  occurred_at                DateTime
  location                   String?
  witnesses                  Json      @default("[]")
  description                String
  action_taken               String?
  recommendations            String?
  behavior_points_delta      Int       @default(0)
  parent_notification_status String
  metadata                   Json      @default("{}")
  created_at                 DateTime  @default(now())
  updated_at                 DateTime  @updatedAt
  deleted_at                 DateTime?

  @@index([tenant_id])
  @@index([school_id])
  @@map("discipline_incidents")
}
```

---

## 5. Verification Method
After applying the suggested schema modifications:
1. Run `npx prisma validate` or `npm run db:validate` to verify that the schema file remains syntactically valid and has no semantic validation errors.
2. Run `npm run typecheck` or `npm run build` to verify the generated Prisma Client compiles correctly and integrates with the backend code.
