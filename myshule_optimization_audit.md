# MyShule Platform Optimization Audit Report

This report presents a comprehensive system audit of the MyShule codebase, covering both frontend (Next.js React app under `apps/web`) and backend (NestJS API app under `apps/api`), alongside database schema verification (`prisma/schema.prisma`). Gaps have been evaluated against the rules established in the **MyShule Agent Operating Constitution (AGENTS.md)**.

---

## 1. Tenant Isolation Gaps

Under **AGENTS.md Section 6 (Tenant Isolation Rules)** and **Section 9 (Database Contract Rules)**, every school-owned record must be strictly scoped to a tenant (`school_id` / `tenant_id`), queries must enforce scoping to prevent cross-school leaks, and queries must utilize tenant-aware database indexes.

### 1.1 Database Schema Missing Tenant-Scoping Fields
* **Model**: `RolePermission` (`role_permissions` table)
* **File Path**: `prisma/schema.prisma` (lines 1057–1069)
* **Rule Violated**: Section 9: *"No school-owned table without school/tenant scope."*
* **Gap**: While the parent `Role` table is scoped via `schoolId`, the join table `RolePermission` lacks a direct `schoolId` or `tenant_id` field. This prevents joining or querying role permissions directly by tenant context without joining the `Role` table first.

### 1.2 Database Index Gaps on Tenant Fields
* **File Path**: `prisma/schema.prisma`
* **Rule Violated**: Section 9: *"Use tenant-aware indexes for school-scoped queries."*
* **Gaps**: 
  * **Academics Module (Phase 5)**: The following tables lack an index on `schoolId`:
    * `StudentClassAssignment` (lines 3481–3503) — only has `@@unique([schoolId, id])`
    * `StudentNote` (lines 3530–3546) — only has `@@unique([schoolId, id])`
    * `ParentMeeting` (lines 3548–3569) — only has `@@unique([schoolId, id])`
    * `ClassRequest` (lines 3571–3588) — only has `@@unique([schoolId, id])`
    * `AcademicAuditLog` (lines 3590–3602) — lacks any index on `schoolId`
    * `AcademicAssignment` (lines 3632–3649) — lacks any index on `schoolId`
    * `AcademicResource` (lines 3651–3668) — lacks any index on `schoolId`
    * `LessonLog` (lines 3670–3686) — lacks any index on `schoolId`
    * `ClassTeacherAssignment` (lines 3688–3701) — lacks any index on `schoolId`
    * `ReportCardSetting` (lines 3703–3715) — lacks any index on `schoolId`
  * **Phase 7 and Legacy Modules**: Every table defined from line 3718 to 6632 (over 100 models, including `Student`, `DisciplineIncident`, `ExamSeries`, `ClinicVisit`, `InventoryItem`, `OutboxEvents`, etc.) that uses `tenant_id` or `school_id` **lacks** any `@@index` or `@@unique` on those fields. This results in database full-table scans when filtering by tenant, leading to performance degradation.

### 1.3 Service and Controller Cross-Tenant Data Leaks
* **Rule Violated**: Section 6: *"Agents must never allow: Cross-school reads, Cross-school writes, Global school-data queries without school_id filtering"*
* **Gaps**:
  * **Student Exit Clearance Bypass**:
    * **File Path**: `apps/api/src/modules/students/student-lifecycle.service.ts` (lines 192–197)
    * **Gap**: Fetches `StudentClearance` using `findUnique` solely on the `clearanceId` from the request. It fails to check if the retrieved clearance belongs to the caller's school context. An administrator in School A can exit a student using a `clearanceId` from School B.
  * **Medicine Dispensing Stock Depletion**:
    * **File Path**: `apps/api/src/modules/operations/consumers/dispense-medicine.consumer.ts` (lines 58–64)
    * **Gap**: Fetches and updates `MedicineInventory` stock using only `medicineInventoryId` from the event payload. A tenant can modify or deplete the stock of another school's medicines.
  * **Stock Issuing Isolation Bypass**:
    * **File Path**: `apps/api/src/modules/operations/consumers/issue-stock.consumer.ts` (lines 28–46)
    * **Gap**: Looks up `InventoryItem` by its `id` without verifying if the item's `schoolId` matches the transaction's `tenant_id`. Allows one tenant to view storage location details and adjust inventory levels of another tenant.
  * **Payment Posting on Foreign Invoices**:
    * **File Path**: `apps/api/src/modules/operations/consumers/record-payment.consumer.ts` (lines 46–60)
    * **Gap**: Fetches and modifies `Invoice` balances directly by `id` without asserting `invoice.schoolId === tenant_id`. A tenant can post payment notifications that mark foreign invoices as PAID.
  * **Secretary Queue Ticket Manipulation**:
    * **File Path**: `apps/api/src/modules/secretary/secretary.controller.ts` (lines 234–300)
    * **Gap**: Actions like `'mark_served'`, `'send_sms'`, and `'escalate'` retrieve and update `WorkflowTask` records solely using `id` from the body. A user from School A can manipulate reception tickets belonging to School B.
  * **Discipline Case Status Tampering**:
    * **File Path**: `apps/api/src/modules/support/support.controller.ts` (lines 389–412)
    * **Gap**: Under `'update_case'`, the controller updates the status and metadata of `DisciplineIncident` records solely by `id`. Any support user can edit incident reports and parent SMS statuses across other tenants.
  * **Counselling Session Status Modification**:
    * **File Path**: `apps/api/src/modules/support/support.controller.ts` (lines 538–550)
    * **Gap**: Employs raw SQL (`UPDATE counselling_sessions SET status = $1 WHERE id = $2::uuid`) to update sessions solely based on session `id`. A user can modify the status of counselling logs in any school.

### 1.4 RLS Session Context Bypasses
* **Rule Violated**: Section 5 (AGP) and Section 6.
* **Gap**: The NestJS services/controllers run standard database queries (`findUnique`, `findFirst`, etc.) directly on the Prisma instance. These query paths run outside the `executeWithTenant` transactions. Consequently:
  * If RLS is strictly enforced, these queries fail or return empty datasets since the session context `app.tenant_id` is unset.
  * If RLS is bypassed (e.g., using database owner credentials), these endpoints run entirely unguarded, causing the cross-school data leaks listed above.

---

## 2. Event Architecture Gaps

Under **AGENTS.md Section 8 (Event-Driven Architecture Rules)**, every state-changing mutation must emit a standardized event, and event payloads must contain required metadata.

### 2.1 Mechanism and Metadata Non-Compliance
* **Mechanism**: MyShule uses a custom **Transactional Outbox Pattern** bus (writing to `outbox_events` and claiming records via `app.claim_outbox_events` SQL procedures) rather than standard libraries.
* **Gaps**:
  * **Mixing Scoping IDs**: The event structure uses `tenant_id` instead of `school_id`, violating Section 6 rules against mixing these fields.
  * **Nested Metadata**: `actor_user_id` and `actor_role` are stored nested inside the `headers` JSON block rather than as top-level fields.
  * **Missing Fields**: The required metadata fields **`source_dashboard`** and **`correlation_id`** are entirely missing from the event structure.

### 2.2 Critical Mutations Lacking Event Emissions
* **Rule Violated**: Section 8: *"Every meaningful state-changing action must emit an event."*
* **Gaps**:
  * **Marks Submission (Exams Module)**:
    * **Files**: `apps/api/src/modules/exams/exams.service.ts` (`persistValidatedMark`, line 823) & `apps/api/src/modules/class-teacher/class-teacher.service.ts` (`saveMarks`, line 671)
    * **Gap**: Both methods modify marks tables but fail to call the event bus. The wrapper method `publishExamSubmitted` inside `EventPublisherService` is unused.
  * **Report Card Publishing**:
    * **File Path**: `apps/api/src/modules/exams/exams.service.ts` (`publishReportCard`, lines 357–388)
    * **Gap**: The publishing action records a local audit log but fails to emit the `report_card.published` event.
  * **Staff Management (HR Module)**:
    * **File Path**: `apps/api/src/modules/hr/hr.service.ts`
    * **Gap**: HR operations (inviting staff, activating profiles, updating roles) inject `EventPublisherService` but never call it. No events like `staff.invited`, `staff.activated`, or `staff.role_updated` are emitted.
  * **Counselling Referrals**:
    * **File Path**: `apps/api/src/modules/counselling/counselling.service.ts`
    * **Gap**: Session creations, referral acceptances, and improvement plan updates (`acceptReferral`, `declineReferral`, `createSession`, `createNote`) do not publish events. Only creating a referral publishes an event.
  * **Boarding & Assets CRUD**:
    * **File Path**: `apps/api/src/modules/implementation100/simple-operations.ts`
    * **Gap**: Modules inheriting from `SimpleOperationsService` (Boarding, Assets, LMS, CBT, Hostels) rely on generic CRUD handlers that do not emit outbox events. Thus, events like `boarding.request.submitted` are never emitted.
  * **Procurement Workflows**:
    * **File Path**: `apps/api/src/modules/procurement/procurement.service.ts`
    * **Gap**: Procurement mutations lack any references to the event bus, omitting `procurement.request.submitted` emissions.

---

## 3. UI Completeness and Workflow Gaps

Under **AGENTS.md Section 11 (Dashboard, Sidebar, and Workspace Rules)**, **Section 12 (Button and Action Rules)**, **Section 13 (Form and Import Rules)**, **Section 21 (Offline Sync Rules)**, and **Section 22 (Report and Print Rules)**, all workflows must be fully functional (no placeholders/mocks), buttons must trigger actual mutations, forms must have input validation, offline states must be handled honestly, and print documents must be download-ready.

### 3.1 Hardcoded Dashboard Data and Mocked Workflows
* **Rule Violated**: Section 2.1 (Never use demo data) and Section 11 (Dashboard/Workspace Rules).
* **Gaps**:
  * **Nurse Command Center**:
    * **File Path**: `apps/web/src/components/school/nurse-command-center.tsx` (lines 105–135)
    * **Gap**: The statistics cards and clinic visit tables (e.g. Brian Otieno) are completely hardcoded. Although the hook `useSchoolQuery` is imported, it is never called to pull dynamic clinic data.
  * **Discipline Master Workspaces**:
    * **File Paths**: `apps/web/src/components/school/discipline-master/actions-interventions-workspace.tsx` (and other workspaces in `discipline-master/`)
    * **Gap**: These workspaces are copy-pasted scaffolds (~2.5KB each) filled with mock labels, dead buttons, and unmapped database queries.
  * **Student Command Center Activity**:
    * **File Path**: `apps/web/src/components/school/student-command-center.tsx` (lines 121–125)
    * **Gap**: Displays static activity items and hardcoded grades rather than loading the logged-in student's live records.

### 3.2 Dead Buttons & Decorative Controls
* **Rule Violated**: Section 12: *"Buttons must never be decorative. Every button must have a click handler."*
* **Gaps**:
  * **Exam Setup Calendar**:
    * **File Path**: `apps/web/src/components/modules/exams-manager/workspaces/exam-calendar-workspace.tsx` (lines 20–23)
    * **Gap**: Buttons labeled "Sync Academic Calendar", "Print", "Export", and "Add Event" have no `onClick` handlers and perform no action.

### 3.3 Commented-out Backend API Requests (Fake Success States)
* **Rule Violated**: Section 2.1: *"Fake success messages when no real action happened."*
* **Gaps**:
  * **Principal Exam Cycles Creation**:
    * **File Path**: `apps/web/src/components/school/principal-dashboard/exams-reports-workspace.tsx` (lines 31–48)
    * **Gap**: The database POST request (`requestDashboardApi('/admin-command/exams/cycles', ...)`) is commented out. The form immediately triggers success indicators and closes the modal without submitting data to the server.

### 3.4 Raw Browser `prompt()` Input Validation Vulnerabilities
* **Rule Violated**: Section 13: *"Every form must include: Required field validation, Correct input types... Disabled double-submit"* and Section 2.1 (Never bypass validation).
* **Gaps**: Rather than deploying secure modal dialogs and form schemas, input is gathered using raw browser `prompt()` prompts, bypassing validation:
  * **Storekeeper Workspace** (`damaged-missing-workspace.tsx` lines 60–66, 80; `items-workspace.tsx` lines 60–76, 90–97; `requests-workspace.tsx` line 70; `stocktake-workspace.tsx` lines 51, 53) — prompts for quantities, item names, suppliers, and reasons.
  * **Admin Staff Records** (`admin/staff-records-workspace.tsx` lines 58, 100) — prompts for staff identification numbers and override justifications.
  * **Deputy Timetable Relief** (`timetable-relief-workspace.tsx` line 46) — prompts for teacher assignment.
  * **Exams Moderation** (`moderation-workspace.tsx` line 62) — prompts for moderation rejection reason.
  * **Medicine Stock Adjustment** (`medicine-inventory-workspace.tsx` line 61) — prompts for quantity changes.

### 3.5 Offline Sync Feedback Omissions & Fake Statuses
* **Rule Violated**: Section 21: *"Never pretend offline data has reached the server before it syncs."*
* **Gaps**:
  * **Class Teacher Custom Header**:
    * **File Path**: `apps/web/src/components/school/class-teacher-command-center.tsx` (lines 166–182)
    * **Gap**: The custom `Topbar` lacks the global Wi-Fi/Sync indicator, queue count, and retry widget. The teacher cannot monitor sync states for offline actions.
  * **Fake Success on Offline Writes**:
    * **File Path**: `apps/web/src/components/school/class-teacher/workspaces/discipline.tsx` (line 58)
    * **Gap**: Saving a discipline incident while offline immediately displays "Discipline incident reported successfully!", misrepresenting its status instead of stating it has been queued in the offline cache.

### 3.6 Fake Printing & PDF Downloads
* **Rule Violated**: Section 22: *"Reports and print documents must be previewable and downloadable... Never fake printing."*
* **Gaps**:
  * **Reports Center**:
    * **File Path**: `apps/web/src/components/school/admin/reports-workspace.tsx` (lines 24–27)
    * **Gap**: Clicking "Generate PDF" or "Export CSV" only triggers a `toast.info` message. No backend request is executed, and no file is served.
  * **Print Overlay Hijack**:
    * **File Path**: `apps/web/src/lib/dashboard/export.ts` (lines 166–168)
    * **Gap**: The print preview's "Download PDF" action triggers the browser's native print screen (`window.print()`) instead of downloading a PDF blob.
  * **Report Card Preview**:
    * **File Path**: `apps/web/src/components/modules/exams/exams-module-screen.tsx` (lines 1868–1871)
    * **Gap**: The download function relies on opening print preview and alerts the user to "choose Save as PDF in the print dialog".

### 3.7 Router Proxy Path Mismatches
* **Rule Violated**: Section 10: *"Every frontend workflow must map to a backend contract."*
* **Gaps**: Severe path mismatches exist between Next.js frontend proxy routes (`apps/web/src/app/api/[...path]/route.ts`) and NestJS backend controllers:
  * **Student Portal**: Frontend requests `/api/student/dashboard` which proxy to `/dashboard/student/dashboard` upstream, but the NestJS backend maps paths directly under `/student` (`student-portal.controller.ts`). Returns **404**.
  * **Parent Portal**: Frontend requests `/api/parent/dashboard` which proxy to `/dashboard/parent/dashboard`, but the NestJS controller maps directly under `/parent` (`parent-portal.controller.ts`). Returns **404**.
  * **Academics Route Pluralization**: The proxy routes forward requests to `/academics` (plural), but the backend controller is mapped to `/academic` (singular), breaking routes like `/academic/communications`. Returns **404**.
  * **Secretary Front-Office Commands**:
    * Frontend POSTs to `/api/admin-command/frontoffice/visitors` (plural) and `/api/admin-command/frontoffice/appointments` (plural), but the NestJS backend expects singular actions: `/admin-command/frontoffice/visitor` and `/admin-command/frontoffice/appointment`. Returns **404**.
    * Frontend POSTs dispatch items to `/api/admin-command/frontoffice/mail`, but the backend endpoint is mapped to `/admin-command/frontoffice/dispatch`. Returns **404**.

---

## 4. Summary Matrix of Gaps and Rule Compliance

| Gap Area | Impacted Component / File | AGENTS.md Section Reference | Risk / Severity |
| :--- | :--- | :--- | :--- |
| **Missing Tenant ID** | `RolePermission` Model (`prisma/schema.prisma`) | Section 9 (Database Scoping) | Medium |
| **Missing Database Indexes** | 100+ Tables (lines 3718–6632) | Section 9 (Index Performance) | High (Query scans) |
| **Cross-School Reads/Writes** | `StudentLifecycleService`, `DispenseMedicineConsumer`, `IssueStockConsumer`, `RecordPaymentConsumer`, `SecretaryController`, `SupportController` | Section 6 (Tenant Isolation) | Critical (Data Leakage / Tampering) |
| **Missing Metadata in Events** | `EventPublisherService` | Section 8 (Event Metadata) | Medium (Correlation/Audit trail) |
| **Missing Event Emissions** | `ExamsService`, `HRService`, `CounsellingService`, `SimpleOperationsService` | Section 8 (Mutation Events) | High (Event-driven sync break) |
| **Hardcoded Dashboards** | `nurse-command-center.tsx`, `student-command-center.tsx` | Section 11 (Workspace Rules) | Medium (Mocked screens) |
| **Unwired Decorative Buttons** | `exam-calendar-workspace.tsx` | Section 12 (Action Rules) | Low (Dead buttons) |
| **Commented Out API Form Call** | `exams-reports-workspace.tsx` | Section 13 (Form Rules) | High (Fake success state) |
| **Browser Prompts for Form Input**| Storekeeper, Admin, Deputy workspaces | Section 13 (Form Validation) | High (Bypassed inputs) |
| **WiFi Sync Indicator Missing** | `class-teacher-command-center.tsx` | Section 21 (Offline Sync) | Medium (No sync monitoring) |
| **Fake Success Message Offline** | `class-teacher/workspaces/discipline.tsx` | Section 21 (Offline Feedback) | High (Deceptive sync state) |
| **Fake PDF Downloads** | `admin/reports-workspace.tsx` | Section 22 (Report Accuracy) | High (Decorative downloads) |
| **Print Overlay Download Hijack** | `lib/dashboard/export.ts` | Section 22 (Report Formats) | Medium (Print dialog bypass) |
| **API Proxy Mismatches (404s)** | `/api/student`, `/api/parent`, `/api/academics`, `/api/admin-command/frontoffice/...` | Section 10 (Wiring Rules) | Critical (Entire portals offline) |

---

## 5. Recommended Optimization Roadmap

1. **Fix API Route Mismatches (Immediate)**: Update Next.js proxy rewrite paths and API endpoints to match the NestJS singular and singular-module path controllers (align student, parent, academics, and secretary routes).
2. **Apply Database Indexes (High Priority)**: Add `@@index([schoolId])` and `@@index([tenant_id])` annotations across the schema models and migrate.
3. **Enforce Tenant Constraints in Queries**: Refactor NestJS controllers and event consumer queries to always query database models using the contextual `school_id` / `tenant_id` from the request context or event headers (remediating exit clearance, clinic visits, stock movements, and invoice writes).
4. **Implement Missing Event Outbox Emissions**: Wire mutations in `exams.service.ts`, `hr.service.ts`, `counselling.service.ts`, and the base `SimpleOperationsService` to emit events via `EventPublisherService` using the Transactional Outbox.
5. **Replace Prompts with Validated Modals**: Refactor component handlers using native browser `prompt()` to use custom React Hook Forms with robust validation schemas.
