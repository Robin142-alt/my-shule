# Handoff Report — Tenant Isolation Exploration

## 1. Observation

### Observation 1.1: Missing Index annotations in Prisma Schema
In `prisma/schema.prisma`, multiple models lack a dedicated index on their tenant-scoping fields (`schoolId`, `school_id`, `tenantId`, or `tenant_id`). Examples include:
* **AcademicAssignment** (lines 3632–3649):
  ```prisma
  model AcademicAssignment {
    id          String    @id @default(uuid())
    schoolId    String    @map("school_id")
    ...
    // Lacks @@index([schoolId]) or @@unique
  }
  ```
* **AcademicAuditLog** (lines 3590–3602), **AcademicResource** (lines 3651–3668), **LessonLog** (lines 3670–3686), **ClassTeacherAssignment** (lines 3688–3701), and **ReportCardSetting** (lines 3703–3715) all lack index definitions.
* **Bulk and Legacy tables** (lines 3721–6488) such as `OffenseCategory`, `DisciplineIncident`, `ExamSeries`, `ExamMarks`, `ClinicVisits`, `TimetableSlots`, etc., have `tenant_id` or `school_id` fields but **no index annotations** in Prisma schema.

### Observation 1.2: Student Clearance Tenant-Scope Bypass
In `apps/api/src/modules/students/student-lifecycle.service.ts` (lines 192–197):
```typescript
if (clearanceId) {
  const clearance = await this.prisma.studentClearance.findUnique({ where: { id: clearanceId } });
  if (!clearance || clearance.status !== 'CLEARED') {
    throw new BadRequestException('Student must be fully cleared before exiting');
  }
}
```

### Observation 1.3: SQL Mismatch in Workflow Notification Controller
In `apps/api/src/modules/workflow/controllers/notification.controller.ts` (lines 45–48 and 63–66):
```typescript
const result = await this.db.query(
  `SELECT * FROM notifications WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50`,
  [tenantId]
);
...
const result = await this.db.query(
  `UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING *`,
  [id, tenantId]
);
```
Whereas in `prisma/schema.prisma` (lines 6659–6689):
```prisma
model Notification {
  id           String                 @id @default(uuid())
  schoolId     String                 @map("school_id")
  ...
  status       NotificationStatus     @default(UNREAD)
```

### Observation 1.4: AcademicsRepository RLS Context Logic Bug
In `apps/api/src/modules/academics/repositories/academics.repository.ts` (lines 43–48):
```typescript
private getTenantId(params: any[]): string {
  for (const p of params) {
    if (typeof p === 'string' && p.length > 20) return p;
  }
  throw new Error('Tenant ID missing for raw query');
}
```
And its invocation on line 841:
```typescript
const result = await this.executeSql(this.getTenantId([`SELECT id, name, starts_on, ends_on FROM academic_years WHERE tenant_id = $1 ORDER BY starts_on DESC`,
  [tenantId]]), `SELECT id, name, starts_on, ends_on FROM academic_years WHERE tenant_id = $1 ORDER BY starts_on DESC`,
  [tenantId]);
```

---

## 2. Logic Chain

1. **Prisma Index Gaps**: Under AGENTS.md Section 9, school-scoped queries must use tenant-aware indexes. The lack of `@@index([schoolId])` or `@@index([tenant_id])` annotations for over 150 tables in `prisma/schema.prisma` forces PostgreSQL to perform full table scans whenever queries filter on school/tenant scope, causing severe database performance bottlenecks.
2. **Student Clearance Bypass**: In `student-lifecycle.service.ts`, `findUnique` looks up a clearance using only the primary key `{ id: clearanceId }`. It fails to verify `clearance.schoolId === schoolId` (the active tenant context). A cross-school vulnerability is created where a valid `'CLEARED'` clearance ID from School B can be passed to exit a student in School A, bypassing the clearance requirements of School A.
3. **Notification Controller Mismatch**: The raw SQL query references columns `tenant_id` and `is_read`. However, the `notifications` table structure mapped in `schema.prisma` has columns named `school_id` and `status`. Consequently, these database queries will crash with Postgres column exceptions, completely breaking the notification view and read actions.
4. **Academics RLS Context Bug**: In `AcademicsRepository`, methods call `this.getTenantId([sql_query, [tenantId]])` where the first element is the SQL string. `getTenantId` scans the array and returns the first string > 20 characters, which is the SQL string itself. The Prisma Service then executes `SET LOCAL app.tenant_id = 'SELECT...'`. Since the local session tenant ID variable is set to the SQL query instead of the actual UUID, all RLS policy evaluations fail (`tenant_id = current_setting(...)`), returning zero records and breaking data retrieval.

---

## 3. Caveats

* **Database Connection Privileges**: We did not verify if the production database user has `BYPASSRLS` or is the owner (superuser) of the tables. If it runs as the owner/superuser, RLS policies are bypassed, which mitigates the zero-record bug in `AcademicsRepository` but represents a total failure of tenant isolation.
* **Network Restrictions**: Due to CODE_ONLY network mode and offline user environment, dynamic verification using terminal scripts or database execution could not be verified in real time.

---

## 4. Conclusion

There are major gaps in Tenant Isolation in the MyShule platform:
1. **Schema Indexes**: Over 150 tables lack database index coverage on their tenant-scoping fields.
2. **Clearance Flow Bypass**: The exit flow fails to scope student clearance lookup to the current school, creating a cross-school validation bypass.
3. **Broken raw SQL queries**: The workflow notification controller attempts to query and update non-existent columns.
4. **RLS Context Extraction logic bug**: Academics repository passes the SQL query string to PostgreSQL's session context instead of the tenant UUID, breaking RLS policy enforcement.

---

## 5. Verification Method

To verify these findings:
1. **Clearance Bypass**: Inspect `apps/api/src/modules/students/student-lifecycle.service.ts` around line 192. Observe that there is no check verifying that `clearance.schoolId` is equal to the input `schoolId`.
2. **Workflow Notification SQL**: Inspect `apps/api/src/modules/workflow/controllers/notification.controller.ts` line 46 and 64. Observe that it attempts to query `tenant_id` and update `is_read`, but check `prisma/schema.prisma` line 6659 where the table uses `school_id` and `status`.
3. **Academics getTenantId Bug**: Inspect `apps/api/src/modules/academics/repositories/academics.repository.ts` around line 841. Observe that `this.getTenantId` is called with the SQL string as the first element of the array. Trace `getTenantId` at line 43 to confirm it returns this SQL string.
