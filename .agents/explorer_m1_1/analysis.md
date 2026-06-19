# Analysis Report: Admin Command Endpoint Wiring & Tenant Isolation

This report analyzes the stubs in `apps/api/src/modules/admin-command/admin-command.controller.ts`, maps them to the Prisma schema (`prisma/schema.prisma`), checks tenant-isolation mechanics, and proposes a comprehensive fix strategy.

---

## 1. Summary of Findings
- **32 Stubs Identified**: Exactly 32 endpoints in `admin-command.controller.ts` return hardcoded mock data directly (e.g. `{ success: true }` or `{ items: [] }`) instead of invoking service methods or executing database operations.
- **Tenant Context Isolation**: A robust request-scoped AsyncLocalStorage system (`RequestContextService` / `TenantMiddleware`) is already active. This sets `tenant_id` on the context. If wired correctly, endpoints can retrieve the isolation scope using `this.requireTenantId()`.
- **Database Schema Gaps**: There are no database tables in `schema.prisma` for **Report Categories**, **Dispatches/Mail**, or **Academic Interventions**.
- **Model Duplications**: The schema contains duplicate/competing sets of tables for Front Office, Clinic, and Marks:
  - *Front Office*: `Visitor` / `VisitorLog` / `Appointment` (CamelCase, `school_id` bound) vs `VisitorsLogs` / `VisitorsAppointments` (Snake_case, `tenant_id` bound).
  - *Clinic*: `MedicalVisit` (`school_id` bound) vs `ClinicVisits` (`tenant_id` bound).
  - *Academics/Exams*: `MarksEntry` (`school_id` bound) vs `ExamMarks` (`tenant_id` bound).
- **Column Name Discrepancies**: Across the schema, the isolation column is called `school_id` on some tables (e.g. `students`, `classes`, `subjects`, `boarding_allocations`) and `tenant_id` on others (e.g. `meeting_minutes`, `announcements`, `vehicle_service_logs`).
- **Silent Failures in Existing Code**: Role services like `SecretaryCommandService` query non-existent tables (like `frontoffice_visitors`) inside a try-catch block, silently swallowing exceptions and presenting fake empty states.

---

## 2. Mapping of all 32 Endpoints to Database Tables

| # | Endpoint Method / Path | Mapped Prisma Model | Database Table | Isolation Column | Notes / Gaps |
|---|---|---|---|---|---|
| 1 | `POST /bulk-import-:type` | `ImportBatch` / `ImportRow` | `import_batches` / `import_rows` | `school_id` | Mapped to bulk importing jobs. |
| 2 | `POST /finance/fee-categories` | `FinanceFeeCategories` | `finance_fee_categories` | `tenant_id` | Mapped to fee categories. |
| 3 | `POST /reports/categories` | *None* | *None* | *None* | **Gap**: No report categories table exists. Proposed fix: store dynamically on report metadata or create a static enum/table. |
| 4 | `POST /exams/cycles` | `ExamCycle` | `exam_cycles` | `school_id` | Mapped to exam cycles. |
| 5 | `POST /academics/department-meetings` | `MeetingMinutes` | `meeting_minutes` | `tenant_id` | Mapped to general meeting minutes. |
| 6 | `POST /communication/announcement` | `Announcements` | `announcements` | `tenant_id` | Mapped to announcements. |
| 7 | `POST /finance/invoice` | `Invoice` | `invoices` | `school_id` | Mapped to fee invoices. |
| 8 | `POST /finance/payment` | `Payment` | `payments` | `school_id` | Mapped to payments. |
| 9 | `POST /finance/expense` | `LedgerTransaction` / `LedgerEntry` | `ledger_transactions` / `ledger_entries` | `tenant_id` | **Gap**: No separate `Expense` table. Expense entries must be posted as debits to a ledger account with `AccountCategory.EXPENSE`. |
| 10 | `POST /frontoffice/visitor` | `VisitorsLogs` or `VisitorLog` | `visitors_logs` or `visitor_logs` | `tenant_id` or `school_id` | **Duplicate**: Select one table (preferably `visitors_logs` for `tenant_id` alignment). |
| 11 | `POST /frontoffice/appointment` | `VisitorsAppointments` or `Appointment` | `visitors_appointments` or `appointments` | `tenant_id` or `school_id` | **Duplicate**: Reconcile duplicate models. |
| 12 | `POST /frontoffice/dispatch` | *None* | *None* | *None* | **Gap**: No dispatch table. Store as `FrontOfficeTicket` (type `DOCUMENT` or `GENERAL`) or create `PostalDispatch` model. |
| 13 | `POST /inventory/receive` | `InventoryStockMovement` / `InventoryItem` | `inventory_stock_movements` / `inventory_items` | `school_id` | Movement type: `STOCK_IN`. |
| 14 | `POST /inventory/issue` | `InventoryStockMovement` / `InventoryItem` | `inventory_stock_movements` / `inventory_items` | `school_id` | Movement type: `ISSUE`. |
| 15 | `POST /transport/route` | `StudentTransportAssignment` / `TransportRoute` | `student_transport_assignments` / `transport_routes` | `school_id` | Assigns student/vehicle/route. |
| 16 | `POST /transport/maintenance` | `VehicleServiceLogs` | `vehicle_service_logs` | `tenant_id` | Maintenance logs for school fleet. |
| 17 | `POST /library/issue` | `LibraryLoan` | `library_loans` | `school_id` | Status: `ACTIVE`. |
| 18 | `POST /library/add` | `LibraryBook` / `LibraryBookCopy` | `library_books` / `library_book_copies` | `school_id` | Adds new catalog item. |
| 19 | `POST /clinic/visit` | `ClinicVisits` or `MedicalVisit` | `clinic_visits` or `medical_visits` | `tenant_id` or `school_id` | **Duplicate**: Reconcile medical/clinic visit tables. |
| 20 | `POST /academics/teacher-assignments` | `TeacherSubjectAssignment` / `ClassTeacherAssignment` | `teacher_subject_assignments` / `class_teacher_assignments` | `school_id` | Assigns teacher duties. |
| 21 | `POST /exams/marks/lock` | `MarksEntry` or `ExamMarks` | `marks_entries` or `exam_marks` | `school_id` or `tenant_id` | Sets marks batch status to `LOCKED`. |
| 22 | `POST /exams/marks/return` | `MarksEntry` or `ExamMarks` | `marks_entries` or `exam_marks` | `school_id` or `tenant_id` | Sets marks batch status to `RETURNED`. |
| 23 | `POST /academics/interventions` | *None* | *None* | *None* | **Gap**: No Intervention table. Suggest mapping to `StudentNote` or `BehaviorImprovementPlan`. |
| 24 | `POST /boarding/assign-bed` | `BoardingAllocation` | `boarding_allocations` | `school_id` | Assigns student to `Bed`. |
| 25 | `POST /boarding/roll-call` | `BoardingAttendance` | `boarding_attendance` | `school_id` | Records boarding roll call. |
| 26 | `GET /boarding/incidents` | `DisciplineIncident` | `discipline_incidents` | `school_id` | Fetches boarding/dorm discipline cases. |
| 27 | `POST /library/return` | `LibraryLoan` | `library_loans` | `school_id` | Sets status to `RETURNED` & returns copy to `AVAILABLE`. |
| 28 | `GET /frontoffice/visitors` | `VisitorsLogs` or `VisitorLog` | `visitors_logs` or `visitor_logs` | `tenant_id` or `school_id` | Fetches checked-in visitors. |
| 29 | `GET /frontoffice/appointments` | `VisitorsAppointments` or `Appointment` | `visitors_appointments` or `appointments` | `tenant_id` or `school_id` | Fetches appointments. |
| 30 | `GET /frontoffice/mail` | *None* | *None* | *None* | **Gap**: No mail/dispatch table. |
| 31 | `GET /transport/route` | `TransportRoute` | `transport_routes` | `school_id` | Fetches transport routes. |
| 32 | `GET /transport/maintenance` | `VehicleServiceLogs` | `vehicle_service_logs` | `tenant_id` | Fetches maintenance records. |

---

## 3. Analysis of `admin-command.service.ts` & Other Modules

- **RequestContext Integration**: The service injects `RequestContextService` and defines helper methods `requireTenantId()` and `requireUserId()`. Since all controller requests pass through the global `TenantMiddleware`, `this.requireTenantId()` will always supply the correct, validated `tenant_id` of the school making the request.
- **SQL Execution Layer**: The repository `AdminCommandRepository` contains an `executeSql` wrapper which runs queries in the tenant's transaction context via `prisma.executeWithTenant`.
- **Database Mismatch Errors**: There are multiple existing SQL statements in `AdminCommandRepository` that check the wrong columns:
  - `getClassesOverview()` queries `class_sections` and `class_streams` (does not exist, must query `classes` and `streams` with `school_id = $1`).
  - `getSetupChecklist()` queries `subjects` table using `tenant_id = $1` (must query `school_id = $1`).
  - `getAcademicSetupOverview()` queries `subjects` using `tenant_id = $1` (must query `school_id = $1`).

---

## 4. Proposed Fix Strategy

1. **Service Delegation**:
   Modify `AdminCommandController` to delegate all 32 stubs to `AdminCommandService` or their corresponding dedicated module services:
   ```typescript
   // Example refactored endpoint in admin-command.controller.ts
   @Post('finance/fee-categories')
   @Permissions('finance:write')
   async createFeeCategory(@Body() dto: CreateFeeCategoryDto) {
     return this.adminCommandService.createFeeCategory(dto);
   }
   ```

2. **Standardize Mapped Models**:
   Resolve the model duplication by standardizing on the newer tables that support UUID and `tenant_id` explicitly, or by providing dual-mapping safety (e.g. querying `visitors_logs` and fallback to `visitor_logs`).

3. **Bridge Missing Models (Gaps)**:
   - For **Dispatches/Mail**, use `FrontOfficeTicket` with `issueType: TicketIssueType.DOCUMENT` or create a new `PostalMail` model in `schema.prisma`.
   - For **Report Categories**, store the category name directly as metadata in `OperationsReports` or create a static lookup array.
   - For **Academic Interventions**, map them to `StudentNote` with a custom `metadata` field.

4. **Correct SQL Queries in Repository**:
   Rewrite all raw queries inside `AdminCommandRepository` to strictly match the tables and columns declared in `prisma/schema.prisma` (e.g. replacing `tenant_id` with `school_id` where applicable, and `class_sections` with `classes`).

5. **Emit Audit Events**:
   Ensure every command mutator in the service executes `this.audit(...)` to emit event logs for operations (e.g. `admin_command.payment_recorded`, `admin_command.stock_issued`) keeping with the Constitutions Event-Driven principles.
