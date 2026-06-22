# Project Context: MyShule Platform Optimization

This file tracks the detailed context for the optimizations required across Shule Hub based on `myshule_optimization_audit.md`.

## Relevant Files & Gaps Context

### R1. Database Schema and Indexing
* **Target File**: `prisma/schema.prisma`
* **Gaps**:
  * `RolePermission` model (lines 1057–1069) lacks direct `schoolId` or `tenant_id` field.
  * **Academics Module Index Gaps**:
    * `StudentClassAssignment` (lines 3481–3503) — add `@@index([schoolId])`
    * `StudentNote` (lines 3530–3546) — add `@@index([schoolId])`
    * `ParentMeeting` (lines 3548–3569) — add `@@index([schoolId])`
    * `ClassRequest` (lines 3571–3588) — add `@@index([schoolId])`
    * `AcademicAuditLog` (lines 3590–3602) — add `@@index([schoolId])`
    * `AcademicAssignment` (lines 3632–3649) — add `@@index([schoolId])`
    * `AcademicResource` (lines 3651–3668) — add `@@index([schoolId])`
    * `LessonLog` (lines 3670–3686) — add `@@index([schoolId])`
    * `ClassTeacherAssignment` (lines 3688–3701) — add `@@index([schoolId])`
    * `ReportCardSetting` (lines 3703–3715) — add `@@index([schoolId])`
  * **Phase 7 and Legacy Modules (lines 3718–6632)**:
    * Identify and add missing `@@index([schoolId])` or `@@index([tenant_id])` for tables using these fields (over 100 models, e.g. `Student`, `DisciplineIncident`, `ExamSeries`, `ClinicVisit`, `InventoryItem`, `OutboxEvents`).

### R2. Backend Tenant Isolation
* **Student Exit Clearance**: `apps/api/src/modules/students/student-lifecycle.service.ts` (lines 192–197). Enforce that retrieved clearance belongs to the caller's school context.
* **Medicine Dispensing**: `apps/api/src/modules/operations/consumers/dispense-medicine.consumer.ts` (lines 58–64). Verify `medicineInventoryId` scoping.
* **Stock Issuing**: `apps/api/src/modules/operations/consumers/issue-stock.consumer.ts` (lines 28–46). Assert item's `schoolId === tenant_id`.
* **Payment Posting**: `apps/api/src/modules/operations/consumers/record-payment.consumer.ts` (lines 46–60). Assert `invoice.schoolId === tenant_id`.
* **Secretary Queue Ticket Manipulation**: `apps/api/src/modules/secretary/secretary.controller.ts` (lines 234–300). Validate queue tickets against caller's school context.
* **Discipline Case Status Tampering**: `apps/api/src/modules/support/support.controller.ts` (lines 389–412). Check `school_id` / `tenant_id` on status updates.
* **Counselling Session Status Modification**: `apps/api/src/modules/support/support.controller.ts` (lines 538–550). Scopes raw SQL update to user's school context.

### R3. API Routing and Event Architecture
* **API Proxy Paths (404s)**:
  * `/api/student/dashboard` rewrite proxy mappings vs `apps/api/src/modules/students/student-portal.controller.ts` (requires aligned route prefixes).
  * `/api/parent/dashboard` rewrite proxy mappings vs `apps/api/src/modules/parents/parent-portal.controller.ts`.
  * `/api/academics` path pluralization vs backend singular `/academic` route.
  * Secretary front office paths plural vs NestJS singular backend actions (e.g. `/api/admin-command/frontoffice/visitors` -> `/visitor`, `/api/admin-command/frontoffice/appointments` -> `/appointment`).
  * Mail dispatch route: `/api/admin-command/frontoffice/mail` -> `/dispatch` backend.
* **Event Architecture**:
  * Event schema updates for `source_dashboard` and `correlation_id` top-level fields, aligning scoping field to avoid mixing.
  * Missing event emissions in:
    * Marks Submission: `apps/api/src/modules/exams/exams.service.ts` & `apps/api/src/modules/class-teacher/class-teacher.service.ts`.
    * Report Card Publishing: `apps/api/src/modules/exams/exams.service.ts` (`publishReportCard`).
    * HR Module: `apps/api/src/modules/hr/hr.service.ts` (inviting staff, activating profiles, updating roles).
    * Counselling Module: `apps/api/src/modules/counselling/counselling.service.ts`.
    * SimpleOperations (Boarding, Assets, Hostels, LMS, CBT): `apps/api/src/modules/implementation100/simple-operations.ts`.
    * Procurement workflows: `apps/api/src/modules/procurement/procurement.service.ts`.

### R4. Frontend UI and Workflow Completeness
* **Workspaces with raw browser `prompt()`**:
  * Storekeeper (`damaged-missing-workspace.tsx`, `items-workspace.tsx`, `requests-workspace.tsx`, `stocktake-workspace.tsx`).
  * Admin Staff Records (`admin/staff-records-workspace.tsx`).
  * Deputy Timetable Relief (`timetable-relief-workspace.tsx`).
  * Exams Moderation (`moderation-workspace.tsx`).
  * Medicine Stock Adjustment (`medicine-inventory-workspace.tsx`).
* **Hardcoded Dashboards**:
  * Nurse Command Center: `apps/web/src/components/school/nurse-command-center.tsx`.
  * Discipline Master Workspaces.
  * Student Command Center Activity: `apps/web/src/components/school/student-command-center.tsx`.
* **Dead Buttons**:
  * Exam Setup Calendar: `apps/web/src/components/modules/exams-manager/workspaces/exam-calendar-workspace.tsx` (Sync, Print, Export, Add Event).
* **Commented out API Requests**:
  * Principal Exam Cycles: `apps/web/src/components/school/principal-dashboard/exams-reports-workspace.tsx`.
* **Offline Sync & Deceptive Success States**:
  * Topbar WiFi/Sync indicator missing in `apps/web/src/components/school/class-teacher-command-center.tsx`.
  * Fake success on offline writes: `apps/web/src/components/school/class-teacher/workspaces/discipline.tsx`.
* **Print Overlay / PDF Downloads**:
  * Reports Center: `apps/web/src/components/school/admin/reports-workspace.tsx`.
  * Print Overlay Hijack: `apps/web/src/lib/dashboard/export.ts`.
  * Report Card Preview: `apps/web/src/components/modules/exams/exams-module-screen.tsx`.
