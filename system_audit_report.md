# MyShule System Audit and Endpoint Gap Analysis Report

## 1. Executive Summary

This report presents a comprehensive backend endpoint audit and database schema verification for the MyShule platform. The audit cross-references expected backend endpoints extracted from the React frontend workspace (`apps/web/src`) with implemented NestJS controller routes (`apps/api/src`), and inspects the database schema (`prisma/schema.prisma`) for tenant isolation compliance.

### Key Metrics
* **Total Unique Expected Frontend Endpoints**: 1464
* **Total Actual Backend Controller Endpoints**: 776
* **Fully Wired & Matching Endpoints**: 328
* **Expected Endpoints Missing from Backend**: 1136 (Reconciled to **552** unique clean missing endpoints)
* **Extra Backend Endpoints**: 444
* **Total Database Models**: 317
* **Models Without Tenant Scoping Fields**: 6
* **Models with Tenant Scoping but Lacking Database Indexes**: 187

---

## 2. Methodology

The audit was conducted programmatically using static analysis scripts:
1. **Frontend Extraction**: API request patterns (hooks like `useSchoolQuery`, `useSchoolMutation`, wrappers like `requestDashboardApi`, and standard `fetch`/`axios` calls) were scanned from the Next.js React frontend codebase.
2. **Backend Routing Mapping**: All NestJS controller classes decorated with `@Controller` and their corresponding routing methods decorated with HTTP decorators (`@Get`, `@Post`, `@Patch`, `@Delete`, `@Put`) were parsed.
3. **Route Reconciliation**: Paths were normalized (stripping prefixes like `/api` or `/api/v1`, removing query strings, and converting route parameters like `:id` or template literals `${studentId}` to a standardized `:param` placeholder) to allow exact matching.
4. **Schema Verification**: The Prisma schema was parsed to verify the presence of multi-tenant scoping fields (`schoolId`, `school_id`, `tenantId`, `tenant_id`) and corresponding database index declarations (`@@index`, `@@unique`).
5. **Service Verification**: Service files were scanned for Prisma client calls to detect references to non-existent models.

---

## 3. Major Architectural Findings

### 3.1 Route Prefix Mismatch Pattern (Critical)
A systematic routing mismatch exists across multiple core modules. The frontend UI is designed to target role-based command routes prefixed with `/admin-command/<role>/`. However, the backend exposes these domains under direct module prefixes (e.g., `/inventory/`, `/clinic/`, `/transport/`). This prefix discrepancy results in silent **404 Route Not Found** errors in the UI.

Specific prefix mismatches detected:
| Module | Frontend Expected Route Prefix | Backend Actual Route Prefix | Status |
| :--- | :--- | :--- | :--- |
| **Inventory / Store** | `/admin-command/storekeeper/...` | `/inventory/...` | **Broken** |
| **Nurse / Clinic** | `/admin-command/nurse/...` | `/clinic/...` | **Broken** |
| **Transport** | `/admin-command/transport-manager/...` | `/transport/...` | **Broken** |
| **Boarding** | `/admin-command/boarding-master/...` | `/boarding/...` | **Broken** |
| **Class Teacher** | `/admin-command/class-teacher/...` | `/class-teacher/...` | **Broken** |
| **Dean of Academics** | `/admin-command/dean-academics/...` | `/academics/...` | **Broken** |

### 3.2 Mismatched Route Names
Even where prefixes match or direct domain modules are targeted, several endpoints differ in shape:
* **Library Module**: Frontend requests `GET /library/books` and `GET /library/loans`, whereas the backend implements `GET /library/catalog` and `GET /library/circulation`.
* **Admissions Module**: Frontend requests `GET /admin-command/admissions/admissions`, but the backend only exposes `/admin-command/admissions/overview` and `/admin-command/admissions/dashboard`.

### 3.3 Unimplemented Workflow Mutations
Many POST/Patch/Delete operations expected by the frontend do not have corresponding controllers or service methods on the backend:
* **Admissions Command Center**: Only `POST /admin-command/admissions/applications/:param/approve` is implemented. All other onboarding mutation endpoints (like document verification, interview outcomes, parent invitations, and letter generation) are entirely missing.
* **Boarding Master**: The backend implements only a generic checklist `/boarding/records` endpoint, lacking specialized routes for bed allocation, roll call attendance, hostel setup, and exeat leave requests.

---

## 4. Database Schema & Tenant Isolation Audit

### 4.1 Global vs Tenant Scoped Models
Of the **317** database models defined in `schema.prisma`, **311** models correctly contain tenant scoping fields (`schoolId`, `school_id`, `tenantId`, or `tenant_id`).

The only models lacking tenant fields are global or system-level models:
* `User` (global users credentials)
* `School` (the school tenant definition itself)
* `Permission` / `RolePermission` / `ModulePermission` (global security schema)
* `SubscriptionPlan` (global SaaS package tiers)

### 4.2 Database Index Gaps (High Risk)
While tenant fields are present on **311** tables, **187** models **do not have a database index** on their tenant fields. 

Without indexes, queries filtering by `schoolId` or `tenant_id` will result in full-table scans. As the multi-tenant database grows, this will cause severe performance degradation and risk cross-tenant latency.

Key tables lacking tenant indices include:
* `Student`
* `LedgerAccount` / `LedgerTransaction` / `LedgerEntry`
* `DisciplineIncident` / `DisciplineCase` / `DisciplineAction`
* `AttendanceRecord`
* `ClinicVisit` / `ClinicMedicine`
* `LibraryBook` / `LibraryLoan`
* `InventoryItem` / `InventoryStockMovement`
* `TransportRoute` / `TransportVehicle`

### 4.3 Service Queries and Missing Models
The backend service files scanned contain commented-out queries targeting three models that are completely missing from the Prisma schema:
* `LibraryVisit` (referenced in `apps/api/src/modules/library/library.service.ts`)
* `LibraryRequest` (referenced in `apps/api/src/modules/library/library.service.ts`)
* `LibraryNotice` (referenced in `apps/api/src/modules/library/library.service.ts`)

Active service logic is currently clean and does not reference any non-existent models.

---

## 5. Detailed Endpoint Gap Registry

Below is a detailed list of clean expected endpoints from the frontend that are currently missing in the backend, grouped by module.

### Module: `inventory` (6 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **POST** | `/inventory/damaged-items` | `/inventory/damaged-items`<br>`/requestDashboardApi("/inventory/damaged-items", {       method: "POST",      ...` |
| **POST** | `/inventory/stock-requests` | `/inventory/stock-requests`<br>`/requestDashboardApi("/inventory/stock-requests", {       method: "POST",     ...` |
| **POST** | `/inventory/stock-returns` | `/inventory/stock-returns`<br>`/requestDashboardApi("/inventory/stock-returns", {       method: "POST",      ...` |
| **POST** | `/inventory/stocktake-sessions` | `/inventory/stocktake-sessions`<br>`/requestDashboardApi("/inventory/stocktake-sessions", {       method: "POST", ...` |
| **GET** | `/inventory/heatmap` | `/inventory/heatmap`<br>`/useSchoolQuery<InventoryHeatmap[]>("/api/inventory/heatmap")` |
| **GET** | `/inventory/insights` | `/inventory/insights`<br>`/useSchoolQuery<AiInsight[]>("/api/inventory/insights")` |

### Module: `notifications` (2 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **PATCH** | `/notifications/read-all` | `/notifications/read-all` |
| **GET** | `/notifications/badges` | `/notifications/badges`<br>`/fetch("/api/v1/notifications/badges", {           headers: { Authorization: \` |

### Module: `payments` (3 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **POST** | `/payments` | `/payments` |
| **GET** | `/payments/mpesa/c2b/payments` | `/payments/mpesa/c2b/payments`<br>`/buildPaymentsApiPath("/api/payments/mpesa/c2b/payments", tenantSlug)` |
| **POST** | `/payments/mpesa/c2b/payments/:param/reconcile` | `/payments/mpesa/c2b/payments/:param/reconcile` |

### Module: `exams` (3 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **POST** | `/exams/marks/enter` | `/exams/marks/enter` |
| **POST** | `/exams/series/publish` | `/exams/series/publish` |
| **GET** | `/exams/series/:param/readiness:param` | `/exams/series/:param/readiness:param` |

### Module: `iot:param` (1 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/iot:param` | `/iot:param` |

### Module: `procurement:param` (1 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/procurement:param` | `/procurement:param` |

### Module: `records` (2 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **POST** | `/records` | `/records` |
| **PATCH** | `/records/:param/status` | `/records/:param/status` |

### Module: `transport:param` (1 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/transport:param` | `/transport:param` |

### Module: `parent` (4 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/parent/overview` | `/parent/overview`<br>`/useSchoolQuery<any>("/api/parent/overview")` |
| **GET** | `/parent/academics` | `/parent/academics`<br>`/useSchoolQuery<any>("/api/parent/academics")` |
| **GET** | `/parent/finance` | `/parent/finance`<br>`/useSchoolQuery<any>("/api/parent/finance")` |
| **GET** | `/parent/communication` | `/parent/communication`<br>`/useSchoolQuery<any>("/api/parent/communication")` |

### Module: `platform` (10 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/platform/sms-settings` | `/platform/sms-settings`<br>`/fetch("/api/platform/sms-settings")` |
| **GET** | `/platform/security-policies` | `/platform/security-policies`<br>`/fetch("/api/platform/security-policies")` |
| **GET** | `/platform/templates` | `/platform/templates`<br>`/fetch("/api/platform/templates", { method: "GET", credentials: "same-origin",...` |
| **GET** | `/platform/broadcasts` | `/platform/broadcasts`<br>`/fetch("/api/platform/broadcasts", { method: "GET", credentials: "same-origin"...` |
| **GET** | `/platform/audit-logs` | `/platform/audit-logs`<br>`/fetch("/api/platform/audit-logs", { method: "GET", credentials: "same-origin"...` |
| **GET** | `/platform/backups` | `/platform/backups`<br>`/fetch("/api/platform/backups", { method: "GET", credentials: "same-origin", c...` |
| **GET** | `/platform/reports` | `/platform/reports`<br>`/fetch("/api/platform/reports", { method: "GET", credentials: "same-origin", c...` |
| **GET** | `/platform/users` | `/platform/users`<br>`/fetch("/api/platform/users", { method: "GET", credentials: "same-origin", cac...` |
| **GET** | `/platform/settings` | `/platform/settings`<br>`/fetch("/api/platform/settings", { method: "GET", credentials: "same-origin", ...` |
| **GET** | `/platform/gateways` | `/platform/gateways`<br>`/fetch("/api/platform/gateways", { method: "GET", credentials: "same-origin", ...` |

### Module: `admin-command` (375 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/admin-command/accountant/expenses` | `/admin-command/accountant/expenses`<br>`/useSchoolQuery<ExpensesData>("/admin-command/accountant/expenses")` |
| **GET** | `/admin-command/admin/imports` | `/admin-command/admin/imports`<br>`/useSchoolQuery<ImportsData>("/admin-command/admin/imports")` |
| **GET** | `/admin-command/admin/students` | `/admin-command/admin/students`<br>`/useSchoolQuery<StudentsData>("/admin-command/admin/students")` |
| **GET** | `/admin-command/admissions/admissions` | `/admin-command/admissions/admissions`<br>`/useSchoolQuery<AdmissionsData>('/admin-command/admissions/admissions')` |
| **POST** | `/admin-command/admissions/applications` | `/admin-command/admissions/applications` |
| **POST** | `/admin-command/admissions/applications/:param/status` | `/admin-command/admissions/applications/:param/status` |
| **POST** | `/admin-command/admissions/interviews` | `/admin-command/admissions/interviews` |
| **POST** | `/admin-command/admissions/interviews/:param/outcome` | `/admin-command/admissions/interviews/:param/outcome` |
| **POST** | `/admin-command/admissions/documents/:param/verify` | `/admin-command/admissions/documents/:param/verify` |
| **POST** | `/admin-command/admissions/documents/request` | `/admin-command/admissions/documents/request` |
| **POST** | `/admin-command/admissions/class-placement` | `/admin-command/admissions/class-placement` |
| **GET** | `/admin-command/admissions/parent-linking` | `/admin-command/admissions/parent-linking`<br>`/useSchoolQuery<ParentLinkingData>('/admin-command/admissions/parent-linking')` |
| **POST** | `/admin-command/admissions/parent-linking` | `/admin-command/admissions/parent-linking` |
| **POST** | `/admin-command/admissions/parent-linking/:param/invite` | `/admin-command/admissions/parent-linking/:param/invite` |
| **POST** | `/admin-command/admissions/admissions/:param/admit` | `/admin-command/admissions/admissions/:param/admit` |
| **POST** | `/admin-command/admissions/admissions/:param/letter` | `/admin-command/admissions/admissions/:param/letter` |
| **POST** | `/admin-command/admissions/reports/generate` | `/admin-command/admissions/reports/generate` |
| **GET** | `/admin-command/admissions/placement` | `/admin-command/admissions/placement`<br>`/useSchoolQuery<PlacementData>("/admin-command/admissions/placement")` |
| **GET** | `/admin-command/boarding-master/allocation` | `/admin-command/boarding-master/allocation`<br>`/useSchoolQuery<AllocationData>('/admin-command/boarding-master/allocation')` |
| **GET** | `/admin-command/boarding-master/overview` | `/admin-command/boarding-master/overview`<br>`/useSchoolQuery<OverviewData>('/admin-command/boarding-master/overview')` |
| **GET** | `/admin-command/boarding-master/hostels` | `/admin-command/boarding-master/hostels`<br>`/useSchoolQuery<HostelsData>('/admin-command/boarding-master/hostels')` |
| **POST** | `/admin-command/boarding-master/hostels` | `/admin-command/boarding-master/hostels` |
| **PUT** | `/admin-command/boarding-master/hostels/:param` | `/admin-command/boarding-master/hostels/:param` |
| **GET** | `/admin-command/boarding-master/rooms-beds` | `/admin-command/boarding-master/rooms-beds`<br>`/useSchoolQuery<RoomsBedsData>('/admin-command/boarding-master/rooms-beds')` |
| **POST** | `/admin-command/boarding-master/rooms-beds` | `/admin-command/boarding-master/rooms-beds` |
| **POST** | `/admin-command/boarding-master/rooms-beds/:param/status` | `/admin-command/boarding-master/rooms-beds/:param/status` |
| **POST** | `/admin-command/boarding-master/allocation` | `/admin-command/boarding-master/allocation` |
| **POST** | `/admin-command/boarding-master/allocation/:param/deallocate` | `/admin-command/boarding-master/allocation/:param/deallocate` |
| **GET** | `/admin-command/boarding-master/boarding-attendance` | `/admin-command/boarding-master/boarding-attendance` |
| **POST** | `/admin-command/boarding-master/boarding-attendance` | `/admin-command/boarding-master/boarding-attendance` |
| **GET** | `/admin-command/boarding-master/leave-exit` | `/admin-command/boarding-master/leave-exit`<br>`/useSchoolQuery<LeaveExitData>('/admin-command/boarding-master/leave-exit')` |
| **POST** | `/admin-command/boarding-master/leave-exit` | `/admin-command/boarding-master/leave-exit` |
| **POST** | `/admin-command/boarding-master/leave-exit/:param/approve` | `/admin-command/boarding-master/leave-exit/:param/approve` |
| **POST** | `/admin-command/boarding-master/leave-exit/:param/reject` | `/admin-command/boarding-master/leave-exit/:param/reject` |
| **GET** | `/admin-command/boarding-master/incidents` | `/admin-command/boarding-master/incidents`<br>`/useSchoolQuery<IncidentsData>('/admin-command/boarding-master/incidents')` |
| **POST** | `/admin-command/boarding-master/incidents` | `/admin-command/boarding-master/incidents` |
| **POST** | `/admin-command/boarding-master/incidents/:param/escalate` | `/admin-command/boarding-master/incidents/:param/escalate` |
| **POST** | `/admin-command/boarding-master/incidents/:param/resolve` | `/admin-command/boarding-master/incidents/:param/resolve` |
| **GET** | `/admin-command/boarding-master/reports` | `/admin-command/boarding-master/reports`<br>`/useSchoolQuery<ReportsData>('/admin-command/boarding-master/reports')` |
| **POST** | `/admin-command/boarding-master/reports/generate` | `/admin-command/boarding-master/reports/generate` |
| **POST** | `/admin-command/boarding/assign-bed` | `/admin-command/boarding/assign-bed`<br>`/requestDashboardApi("/api/admin-command/boarding/assign-bed", {         metho...` |
| **POST** | `/admin-command/boarding/roll-call` | `/admin-command/boarding/roll-call`<br>`/requestDashboardApi("/api/admin-command/boarding/roll-call", {         method...` |
| **POST** | `/admin-command/boarding/incidents` | `/admin-command/boarding/incidents`<br>`/requestDashboardApi("/api/admin-command/boarding/incidents", {         method...` |
| **GET** | `/admin-command/class-teacher/overview` | `/admin-command/class-teacher/overview`<br>`/useSchoolQuery<OverviewData>('/admin-command/class-teacher/overview')` |
| **GET** | `/admin-command/class-teacher/my-class` | `/admin-command/class-teacher/my-class`<br>`/useSchoolQuery<MyClassData>('/admin-command/class-teacher/my-class')` |
| **GET** | `/admin-command/class-teacher/attendance-follow-up` | `/admin-command/class-teacher/attendance-follow-up` |
| **GET** | `/admin-command/class-teacher/class-academics` | `/admin-command/class-teacher/class-academics` |
| **GET** | `/admin-command/class-teacher/discipline-follow-up` | `/admin-command/class-teacher/discipline-follow-up` |
| **GET** | `/admin-command/class-teacher/learner-profiles` | `/admin-command/class-teacher/learner-profiles` |
| **GET** | `/admin-command/class-teacher/parent-contacts` | `/admin-command/class-teacher/parent-contacts` |
| **GET** | `/admin-command/class-teacher/report-comments` | `/admin-command/class-teacher/report-comments` |
| **GET** | `/admin-command/class-teacher/reports` | `/admin-command/class-teacher/reports`<br>`/useSchoolQuery<ReportsData>('/admin-command/class-teacher/reports')` |
| **GET** | `/admin-command/class-teacher/welfare-notes` | `/admin-command/class-teacher/welfare-notes`<br>`/useSchoolQuery<WelfareNotesData>('/admin-command/class-teacher/welfare-notes')` |
| **POST** | `/admin-command/class-teacher/attendance-follow-up/:param/notify` | `/admin-command/class-teacher/attendance-follow-up/:param/notify` |
| **POST** | `/admin-command/class-teacher/attendance-follow-up/:param/resolve` | `/admin-command/class-teacher/attendance-follow-up/:param/resolve` |
| **POST** | `/admin-command/class-teacher/discipline-follow-up/:param/follow-up` | `/admin-command/class-teacher/discipline-follow-up/:param/follow-up` |
| **POST** | `/admin-command/class-teacher/discipline-follow-up/:param/escalate` | `/admin-command/class-teacher/discipline-follow-up/:param/escalate` |
| **POST** | `/admin-command/class-teacher/report-comments/:param` | `/admin-command/class-teacher/report-comments/:param` |
| **POST** | `/admin-command/class-teacher/report-comments/submit-all` | `/admin-command/class-teacher/report-comments/submit-all` |
| **POST** | `/admin-command/class-teacher/welfare-notes` | `/admin-command/class-teacher/welfare-notes` |
| **POST** | `/admin-command/class-teacher/welfare-notes/:param/escalate` | `/admin-command/class-teacher/welfare-notes/:param/escalate` |
| **POST** | `/admin-command/class-teacher/parent-contacts/:param/message` | `/admin-command/class-teacher/parent-contacts/:param/message` |
| **POST** | `/admin-command/class-teacher/reports/generate` | `/admin-command/class-teacher/reports/generate` |
| **POST** | `/admin-command/class-teacher/learner-profiles/:param/note` | `/admin-command/class-teacher/learner-profiles/:param/note` |
| **GET** | `/admin-command/dean-academics/academic-interventions` | `/admin-command/dean-academics/academic-interventions` |
| **GET** | `/admin-command/dean-academics/assessments` | `/admin-command/dean-academics/assessments`<br>`/useSchoolQuery<AssessmentsData>('/admin-command/dean-academics/assessments')` |
| **GET** | `/admin-command/dean-academics/curriculum-coverage` | `/admin-command/dean-academics/curriculum-coverage` |
| **GET** | `/admin-command/dean-academics/department-performance` | `/admin-command/dean-academics/department-performance` |
| **GET** | `/admin-command/dean-academics/lesson-logs` | `/admin-command/dean-academics/lesson-logs`<br>`/useSchoolQuery<LessonLogsData>('/admin-command/dean-academics/lesson-logs')` |
| **GET** | `/admin-command/dean-academics/lesson-plans` | `/admin-command/dean-academics/lesson-plans`<br>`/useSchoolQuery<LessonPlansData>('/admin-command/dean-academics/lesson-plans')` |
| **GET** | `/admin-command/dean-academics/overview` | `/admin-command/dean-academics/overview`<br>`/useSchoolQuery<OverviewData>('/admin-command/dean-academics/overview')` |
| **GET** | `/admin-command/dean-academics/reports` | `/admin-command/dean-academics/reports`<br>`/useSchoolQuery<ReportsData>('/admin-command/dean-academics/reports')` |
| **GET** | `/admin-command/dean-academics/teacher-workload` | `/admin-command/dean-academics/teacher-workload` |
| **GET** | `/admin-command/exams/academic-setup-approval` | `/admin-command/exams/academic-setup-approval` |
| **GET** | `/admin-command/exams/readiness` | `/admin-command/exams/readiness`<br>`/useSchoolQuery<ExamReadinessData>("/admin-command/exams/readiness")` |
| **GET** | `/admin-command/exams-manager/analysis` | `/admin-command/exams-manager/analysis`<br>`/useSchoolQuery<AnalysisData>('/admin-command/exams-manager/analysis')` |
| **GET** | `/admin-command/exams-manager/overview` | `/admin-command/exams-manager/overview`<br>`/useSchoolQuery<OverviewData>('/admin-command/exams-manager/overview')` |
| **GET** | `/admin-command/exams-manager/exam-setup` | `/admin-command/exams-manager/exam-setup`<br>`/useSchoolQuery<ExamSetupData>('/admin-command/exams-manager/exam-setup')` |
| **GET** | `/admin-command/exams-manager/exam-timetable` | `/admin-command/exams-manager/exam-timetable`<br>`/useSchoolQuery<TimetableData>('/admin-command/exams-manager/exam-timetable')` |
| **GET** | `/admin-command/exams-manager/marks-entry` | `/admin-command/exams-manager/marks-entry`<br>`/useSchoolQuery<MarksEntryData>('/admin-command/exams-manager/marks-entry')` |
| **GET** | `/admin-command/exams-manager/moderation` | `/admin-command/exams-manager/moderation`<br>`/useSchoolQuery<ModerationData>('/admin-command/exams-manager/moderation')` |
| **GET** | `/admin-command/exams-manager/report-cards` | `/admin-command/exams-manager/report-cards`<br>`/useSchoolQuery<ReportCardsData>('/admin-command/exams-manager/report-cards')` |
| **GET** | `/admin-command/exams-manager/publishing` | `/admin-command/exams-manager/publishing`<br>`/useSchoolQuery<PublishingData>('/admin-command/exams-manager/publishing')` |
| **GET** | `/admin-command/exams-manager/reports` | `/admin-command/exams-manager/reports`<br>`/useSchoolQuery<ReportsData>('/admin-command/exams-manager/reports')` |
| **POST** | `/admin-command/exams-manager/exam-setup` | `/admin-command/exams-manager/exam-setup` |
| **POST** | `/admin-command/exams-manager/exam-timetable` | `/admin-command/exams-manager/exam-timetable` |
| **POST** | `/admin-command/exams-manager/marks-entry` | `/admin-command/exams-manager/marks-entry` |
| **POST** | `/admin-command/exams-manager/marks-entry/:param/lock` | `/admin-command/exams-manager/marks-entry/:param/lock` |
| **POST** | `/admin-command/exams-manager/moderation/:param/approve` | `/admin-command/exams-manager/moderation/:param/approve` |
| **POST** | `/admin-command/exams-manager/moderation/:param/reject` | `/admin-command/exams-manager/moderation/:param/reject` |
| **POST** | `/admin-command/exams-manager/report-cards/:param/generate` | `/admin-command/exams-manager/report-cards/:param/generate` |
| **POST** | `/admin-command/exams-manager/publishing/:param/publish` | `/admin-command/exams-manager/publishing/:param/publish` |
| **POST** | `/admin-command/exams-manager/publishing/:param/unpublish` | `/admin-command/exams-manager/publishing/:param/unpublish` |
| **POST** | `/admin-command/exams-manager/reports/generate` | `/admin-command/exams-manager/reports/generate` |
| **GET** | `/admin-command/guidance-counselling/overview` | `/admin-command/guidance-counselling/overview`<br>`/useSchoolQuery<OverviewData>('/admin-command/guidance-counselling/overview')` |
| **GET** | `/admin-command/guidance-counselling/sessions` | `/admin-command/guidance-counselling/sessions`<br>`/useSchoolQuery<SessionsData>('/admin-command/guidance-counselling/sessions')` |
| **POST** | `/admin-command/guidance-counselling/sessions` | `/admin-command/guidance-counselling/sessions` |
| **POST** | `/admin-command/guidance-counselling/sessions/:param/complete` | `/admin-command/guidance-counselling/sessions/:param/complete` |
| **GET** | `/admin-command/guidance-counselling/follow-ups` | `/admin-command/guidance-counselling/follow-ups`<br>`/useSchoolQuery<FollowUpsData>('/admin-command/guidance-counselling/follow-ups')` |
| **POST** | `/admin-command/guidance-counselling/follow-ups` | `/admin-command/guidance-counselling/follow-ups` |
| **POST** | `/admin-command/guidance-counselling/follow-ups/:param/done` | `/admin-command/guidance-counselling/follow-ups/:param/done` |
| **GET** | `/admin-command/guidance-counselling/referrals` | `/admin-command/guidance-counselling/referrals`<br>`/useSchoolQuery<ReferralsData>('/admin-command/guidance-counselling/referrals')` |
| **POST** | `/admin-command/guidance-counselling/referrals` | `/admin-command/guidance-counselling/referrals` |
| **POST** | `/admin-command/guidance-counselling/referrals/:param/status` | `/admin-command/guidance-counselling/referrals/:param/status` |
| **GET** | `/admin-command/guidance-counselling/parent-engagement` | `/admin-command/guidance-counselling/parent-engagement` |
| **POST** | `/admin-command/guidance-counselling/parent-engagement` | `/admin-command/guidance-counselling/parent-engagement` |
| **POST** | `/admin-command/guidance-counselling/parent-engagement/:param/notify` | `/admin-command/guidance-counselling/parent-engagement/:param/notify` |
| **GET** | `/admin-command/guidance-counselling/welfare-notes` | `/admin-command/guidance-counselling/welfare-notes` |
| **POST** | `/admin-command/guidance-counselling/welfare-notes` | `/admin-command/guidance-counselling/welfare-notes` |
| **POST** | `/admin-command/guidance-counselling/welfare-notes/:param/flag` | `/admin-command/guidance-counselling/welfare-notes/:param/flag` |
| **GET** | `/admin-command/guidance-counselling/reports` | `/admin-command/guidance-counselling/reports`<br>`/useSchoolQuery<ReportsData>('/admin-command/guidance-counselling/reports')` |
| **POST** | `/admin-command/guidance-counselling/reports/generate` | `/admin-command/guidance-counselling/reports/generate` |
| **GET** | `/admin-command/hod/coverage-review` | `/admin-command/hod/coverage-review`<br>`/useSchoolQuery<CoverageReviewData>('/admin-command/hod/coverage-review')` |
| **GET** | `/admin-command/hod/department-teachers` | `/admin-command/hod/department-teachers`<br>`/useSchoolQuery<DepartmentTeachersData>('/admin-command/hod/department-teachers')` |
| **GET** | `/admin-command/hod/lesson-plans` | `/admin-command/hod/lesson-plans`<br>`/useSchoolQuery<LessonPlansData>('/admin-command/hod/lesson-plans')` |
| **GET** | `/admin-command/hod/marks-moderation` | `/admin-command/hod/marks-moderation`<br>`/useSchoolQuery<MarksModerationData>('/admin-command/hod/marks-moderation')` |
| **GET** | `/admin-command/hod/overview` | `/admin-command/hod/overview`<br>`/useSchoolQuery<OverviewData>('/admin-command/hod/overview')` |
| **GET** | `/admin-command/hod/reports` | `/admin-command/hod/reports`<br>`/useSchoolQuery<ReportsData>('/admin-command/hod/reports')` |
| **GET** | `/admin-command/hod/resource-requests` | `/admin-command/hod/resource-requests`<br>`/useSchoolQuery<ResourceRequestsData>('/admin-command/hod/resource-requests')` |
| **GET** | `/admin-command/hod/subject-allocation` | `/admin-command/hod/subject-allocation`<br>`/useSchoolQuery<SubjectAllocationData>('/admin-command/hod/subject-allocation')` |
| **GET** | `/admin-command/hod/department-overview` | `/admin-command/hod/department-overview`<br>`/useSchoolQuery<DepartmentOverviewData>("/admin-command/hod/department-overview")` |
| **GET** | `/admin-command/hod/review-queue` | `/admin-command/hod/review-queue`<br>`/useSchoolQuery<ReviewQueueData>("/admin-command/hod/review-queue")` |
| **GET** | `/admin-command/ict-manager/overview` | `/admin-command/ict-manager/overview`<br>`/useSchoolQuery<OverviewData>('/admin-command/ict-manager/overview')` |
| **GET** | `/admin-command/ict-manager/assets` | `/admin-command/ict-manager/assets`<br>`/useSchoolQuery<AssetsData>('/admin-command/ict-manager/assets')` |
| **GET** | `/admin-command/ict-manager/asset-assignment` | `/admin-command/ict-manager/asset-assignment` |
| **GET** | `/admin-command/ict-manager/loans-returns` | `/admin-command/ict-manager/loans-returns`<br>`/useSchoolQuery<LoansReturnsData>('/admin-command/ict-manager/loans-returns')` |
| **GET** | `/admin-command/ict-manager/maintenance` | `/admin-command/ict-manager/maintenance`<br>`/useSchoolQuery<MaintenanceData>('/admin-command/ict-manager/maintenance')` |
| **GET** | `/admin-command/ict-manager/facilities-issues` | `/admin-command/ict-manager/facilities-issues` |
| **GET** | `/admin-command/ict-manager/reports` | `/admin-command/ict-manager/reports`<br>`/useSchoolQuery<ReportsData>('/admin-command/ict-manager/reports')` |
| **POST** | `/admin-command/ict-manager/assets` | `/admin-command/ict-manager/assets` |
| **POST** | `/admin-command/ict-manager/asset-assignment` | `/admin-command/ict-manager/asset-assignment` |
| **POST** | `/admin-command/ict-manager/asset-assignment/:param/revoke` | `/admin-command/ict-manager/asset-assignment/:param/revoke` |
| **POST** | `/admin-command/ict-manager/loans-returns` | `/admin-command/ict-manager/loans-returns` |
| **POST** | `/admin-command/ict-manager/loans-returns/:param/return` | `/admin-command/ict-manager/loans-returns/:param/return` |
| **POST** | `/admin-command/ict-manager/maintenance` | `/admin-command/ict-manager/maintenance` |
| **POST** | `/admin-command/ict-manager/maintenance/:param/complete` | `/admin-command/ict-manager/maintenance/:param/complete` |
| **POST** | `/admin-command/ict-manager/facilities-issues` | `/admin-command/ict-manager/facilities-issues` |
| **POST** | `/admin-command/ict-manager/facilities-issues/:param/resolve` | `/admin-command/ict-manager/facilities-issues/:param/resolve` |
| **POST** | `/admin-command/ict-manager/reports/generate` | `/admin-command/ict-manager/reports/generate` |
| **GET** | `/admin-command/laboratory-technician/overview` | `/admin-command/laboratory-technician/overview`<br>`/useSchoolQuery<OverviewData>('/admin-command/laboratory-technician/overview')` |
| **GET** | `/admin-command/laboratory-technician/lab-inventory` | `/admin-command/laboratory-technician/lab-inventory` |
| **GET** | `/admin-command/laboratory-technician/chemicals` | `/admin-command/laboratory-technician/chemicals`<br>`/useSchoolQuery<ChemicalsData>('/admin-command/laboratory-technician/chemicals')` |
| **GET** | `/admin-command/laboratory-technician/apparatus-issue` | `/admin-command/laboratory-technician/apparatus-issue` |
| **GET** | `/admin-command/laboratory-technician/lab-timetable` | `/admin-command/laboratory-technician/lab-timetable` |
| **GET** | `/admin-command/laboratory-technician/safety-incidents` | `/admin-command/laboratory-technician/safety-incidents` |
| **GET** | `/admin-command/laboratory-technician/reports` | `/admin-command/laboratory-technician/reports`<br>`/useSchoolQuery<ReportsData>('/admin-command/laboratory-technician/reports')` |
| **POST** | `/admin-command/laboratory-technician/lab-inventory` | `/admin-command/laboratory-technician/lab-inventory` |
| **POST** | `/admin-command/laboratory-technician/chemicals` | `/admin-command/laboratory-technician/chemicals` |
| **POST** | `/admin-command/laboratory-technician/chemicals/:param/dispose` | `/admin-command/laboratory-technician/chemicals/:param/dispose` |
| **POST** | `/admin-command/laboratory-technician/apparatus-issue` | `/admin-command/laboratory-technician/apparatus-issue` |
| **POST** | `/admin-command/laboratory-technician/apparatus-issue/:param/return` | `/admin-command/laboratory-technician/apparatus-issue/:param/return` |
| **POST** | `/admin-command/laboratory-technician/lab-timetable` | `/admin-command/laboratory-technician/lab-timetable` |
| **POST** | `/admin-command/laboratory-technician/safety-incidents` | `/admin-command/laboratory-technician/safety-incidents` |
| **POST** | `/admin-command/laboratory-technician/safety-incidents/:param/resolve` | `/admin-command/laboratory-technician/safety-incidents/:param/resolve` |
| **POST** | `/admin-command/laboratory-technician/reports/generate` | `/admin-command/laboratory-technician/reports/generate` |
| **GET** | `/admin-command/librarian/overview` | `/admin-command/librarian/overview`<br>`/useSchoolQuery<LibrarianOverviewData>('/admin-command/librarian/overview')` |
| **GET** | `/admin-command/librarian/books` | `/admin-command/librarian/books`<br>`/useSchoolQuery<BooksData>('/admin-command/librarian/books')` |
| **GET** | `/admin-command/librarian/borrowers` | `/admin-command/librarian/borrowers`<br>`/useSchoolQuery<BorrowersData>('/admin-command/librarian/borrowers')` |
| **GET** | `/admin-command/librarian/issue-book` | `/admin-command/librarian/issue-book`<br>`/useSchoolQuery<IssueBookData>('/admin-command/librarian/issue-book')` |
| **GET** | `/admin-command/librarian/return-book` | `/admin-command/librarian/return-book`<br>`/useSchoolQuery<ReturnBookData>('/admin-command/librarian/return-book')` |
| **GET** | `/admin-command/librarian/overdue-books` | `/admin-command/librarian/overdue-books`<br>`/useSchoolQuery<OverdueBooksData>('/admin-command/librarian/overdue-books')` |
| **GET** | `/admin-command/librarian/fines-lost-damaged` | `/admin-command/librarian/fines-lost-damaged`<br>`/useSchoolQuery<FinesData>('/admin-command/librarian/fines-lost-damaged')` |
| **GET** | `/admin-command/librarian/reports` | `/admin-command/librarian/reports`<br>`/useSchoolQuery<ReportsData>('/admin-command/librarian/reports')` |
| **POST** | `/admin-command/librarian/books` | `/admin-command/librarian/books` |
| **DELETE** | `/admin-command/librarian/books/:param` | `/admin-command/librarian/books/:param` |
| **POST** | `/admin-command/librarian/issue-book` | `/admin-command/librarian/issue-book` |
| **POST** | `/admin-command/librarian/return-book` | `/admin-command/librarian/return-book` |
| **POST** | `/admin-command/librarian/overdue-books/:param/remind` | `/admin-command/librarian/overdue-books/:param/remind` |
| **POST** | `/admin-command/librarian/fines-lost-damaged` | `/admin-command/librarian/fines-lost-damaged` |
| **POST** | `/admin-command/librarian/fines-lost-damaged/:param/waive` | `/admin-command/librarian/fines-lost-damaged/:param/waive` |
| **POST** | `/admin-command/librarian/fines-lost-damaged/:param/mark-paid` | `/admin-command/librarian/fines-lost-damaged/:param/mark-paid` |
| **POST** | `/admin-command/librarian/reports/generate` | `/admin-command/librarian/reports/generate` |
| **POST** | `/admin-command/library/return` | `/admin-command/library/return`<br>`/requestDashboardApi("/api/admin-command/library/return", {         method: "P...` |
| **GET** | `/admin-command/nurse/overview` | `/admin-command/nurse/overview`<br>`/useSchoolQuery<NurseOverviewData>('/admin-command/nurse/overview')` |
| **GET** | `/admin-command/nurse/visits` | `/admin-command/nurse/visits`<br>`/useSchoolQuery<VisitsData>('/admin-command/nurse/visits')` |
| **GET** | `/admin-command/nurse/sick-bay-queue` | `/admin-command/nurse/sick-bay-queue`<br>`/useSchoolQuery<SickBayData>('/admin-command/nurse/sick-bay-queue')` |
| **GET** | `/admin-command/nurse/medicine-inventory` | `/admin-command/nurse/medicine-inventory`<br>`/useSchoolQuery<MedicineData>('/admin-command/nurse/medicine-inventory')` |
| **GET** | `/admin-command/nurse/dispensing-log` | `/admin-command/nurse/dispensing-log`<br>`/useSchoolQuery<DispensingData>('/admin-command/nurse/dispensing-log')` |
| **GET** | `/admin-command/nurse/parent-notifications` | `/admin-command/nurse/parent-notifications`<br>`/useSchoolQuery<NotificationsData>('/admin-command/nurse/parent-notifications')` |
| **GET** | `/admin-command/nurse/health-reports` | `/admin-command/nurse/health-reports`<br>`/useSchoolQuery<ReportsData>('/admin-command/nurse/health-reports')` |
| **POST** | `/admin-command/nurse/visits` | `/admin-command/nurse/visits` |
| **POST** | `/admin-command/nurse/visits/:param/close` | `/admin-command/nurse/visits/:param/close` |
| **POST** | `/admin-command/nurse/visits/:param/refer` | `/admin-command/nurse/visits/:param/refer` |
| **POST** | `/admin-command/nurse/sick-bay-queue` | `/admin-command/nurse/sick-bay-queue` |
| **POST** | `/admin-command/nurse/sick-bay-queue/:param/discharge` | `/admin-command/nurse/sick-bay-queue/:param/discharge` |
| **POST** | `/admin-command/nurse/medicine-inventory` | `/admin-command/nurse/medicine-inventory` |
| **POST** | `/admin-command/nurse/medicine-inventory/:param/adjust` | `/admin-command/nurse/medicine-inventory/:param/adjust` |
| **POST** | `/admin-command/nurse/dispensing-log` | `/admin-command/nurse/dispensing-log` |
| **POST** | `/admin-command/nurse/parent-notifications` | `/admin-command/nurse/parent-notifications` |
| **POST** | `/admin-command/nurse/parent-notifications/:param/resend` | `/admin-command/nurse/parent-notifications/:param/resend` |
| **POST** | `/admin-command/nurse/health-reports/generate` | `/admin-command/nurse/health-reports/generate` |
| **GET** | `/admin-command/school/operational-blueprint` | `/admin-command/school/operational-blueprint` |
| **GET** | `/admin-command/parent/dashboard` | `/admin-command/parent/dashboard`<br>`/useSchoolQuery<DashboardData>("/admin-command/parent/dashboard")` |
| **GET** | `/admin-command/parent/downloads` | `/admin-command/parent/downloads`<br>`/useSchoolQuery<DownloadsData>("/admin-command/parent/downloads")` |
| **GET** | `/admin-command/parent/health` | `/admin-command/parent/health`<br>`/useSchoolQuery<HealthData>("/admin-command/parent/health")` |
| **GET** | `/admin-command/parent/messages` | `/admin-command/parent/messages`<br>`/useSchoolQuery<MessagesData>("/admin-command/parent/messages")` |
| **GET** | `/admin-command/parent/notifications` | `/admin-command/parent/notifications`<br>`/useSchoolQuery<NotificationsData>("/admin-command/parent/notifications")` |
| **GET** | `/admin-command/principal/classes-streams` | `/admin-command/principal/classes-streams`<br>`/useSchoolQuery<ClassesStreamsData>('/admin-command/principal/classes-streams')` |
| **GET** | `/admin-command/principal/subjects-departments` | `/admin-command/principal/subjects-departments` |
| **GET** | `/admin-command/principal/staff-roles` | `/admin-command/principal/staff-roles`<br>`/useSchoolQuery<StaffRolesData>('/admin-command/principal/staff-roles')` |
| **GET** | `/admin-command/principal/attendance-monitoring` | `/admin-command/principal/attendance-monitoring`<br>`/useSchoolQuery<AttendanceData>('/admin-command/principal/attendance-monitoring')` |
| **GET** | `/admin-command/principal/exams-report-cards` | `/admin-command/principal/exams-report-cards` |
| **POST** | `/admin-command/principal/school-profile` | `/admin-command/principal/school-profile` |
| **POST** | `/admin-command/principal/academic-setup/year` | `/admin-command/principal/academic-setup/year` |
| **POST** | `/admin-command/principal/academic-setup/term` | `/admin-command/principal/academic-setup/term` |
| **POST** | `/admin-command/principal/classes-streams` | `/admin-command/principal/classes-streams` |
| **POST** | `/admin-command/principal/classes-streams/:param/streams` | `/admin-command/principal/classes-streams/:param/streams` |
| **POST** | `/admin-command/principal/subjects-departments/subject` | `/admin-command/principal/subjects-departments/subject` |
| **POST** | `/admin-command/principal/subjects-departments/department` | `/admin-command/principal/subjects-departments/department` |
| **POST** | `/admin-command/principal/staff-roles/invite` | `/admin-command/principal/staff-roles/invite` |
| **POST** | `/admin-command/principal/staff-roles/:param/role` | `/admin-command/principal/staff-roles/:param/role` |
| **POST** | `/admin-command/principal/students/admit` | `/admin-command/principal/students/admit` |
| **POST** | `/admin-command/principal/students/:param/transfer` | `/admin-command/principal/students/:param/transfer` |
| **POST** | `/admin-command/principal/attendance-monitoring/:param/alert` | `/admin-command/principal/attendance-monitoring/:param/alert` |
| **POST** | `/admin-command/principal/discipline/:param/escalate` | `/admin-command/principal/discipline/:param/escalate` |
| **POST** | `/admin-command/principal/discipline/:param/resolve` | `/admin-command/principal/discipline/:param/resolve` |
| **POST** | `/admin-command/principal/exams-report-cards/:param/publish` | `/admin-command/principal/exams-report-cards/:param/publish` |
| **POST** | `/admin-command/principal/exams-report-cards/:param/approve` | `/admin-command/principal/exams-report-cards/:param/approve` |
| **POST** | `/admin-command/principal/finance-overview/:param/approve` | `/admin-command/principal/finance-overview/:param/approve` |
| **POST** | `/admin-command/principal/approvals/:param/action` | `/admin-command/principal/approvals/:param/action` |
| **POST** | `/admin-command/principal/communication/announcement` | `/admin-command/principal/communication/announcement` |
| **POST** | `/admin-command/principal/communication/message` | `/admin-command/principal/communication/message` |
| **POST** | `/admin-command/principal/reports/generate` | `/admin-command/principal/reports/generate` |
| **POST** | `/admin-command/principal/setup-checklist/:param/complete` | `/admin-command/principal/setup-checklist/:param/complete` |
| **GET** | `/admin-command/procurement-officer/overview` | `/admin-command/procurement-officer/overview`<br>`/useSchoolQuery<OverviewData>('/admin-command/procurement-officer/overview')` |
| **GET** | `/admin-command/procurement-officer/suppliers` | `/admin-command/procurement-officer/suppliers`<br>`/useSchoolQuery<SuppliersData>('/admin-command/procurement-officer/suppliers')` |
| **GET** | `/admin-command/procurement-officer/purchase-requests` | `/admin-command/procurement-officer/purchase-requests` |
| **GET** | `/admin-command/procurement-officer/quotations` | `/admin-command/procurement-officer/quotations`<br>`/useSchoolQuery<QuotationsData>('/admin-command/procurement-officer/quotations')` |
| **GET** | `/admin-command/procurement-officer/purchase-orders` | `/admin-command/procurement-officer/purchase-orders` |
| **GET** | `/admin-command/procurement-officer/deliveries` | `/admin-command/procurement-officer/deliveries`<br>`/useSchoolQuery<DeliveriesData>('/admin-command/procurement-officer/deliveries')` |
| **GET** | `/admin-command/procurement-officer/reports` | `/admin-command/procurement-officer/reports`<br>`/useSchoolQuery<ReportsData>('/admin-command/procurement-officer/reports')` |
| **POST** | `/admin-command/procurement-officer/suppliers` | `/admin-command/procurement-officer/suppliers` |
| **PUT** | `/admin-command/procurement-officer/suppliers/:param` | `/admin-command/procurement-officer/suppliers/:param` |
| **POST** | `/admin-command/procurement-officer/purchase-requests` | `/admin-command/procurement-officer/purchase-requests` |
| **POST** | `/admin-command/procurement-officer/purchase-requests/:param/approve` | `/admin-command/procurement-officer/purchase-requests/:param/approve` |
| **POST** | `/admin-command/procurement-officer/purchase-requests/:param/reject` | `/admin-command/procurement-officer/purchase-requests/:param/reject` |
| **POST** | `/admin-command/procurement-officer/quotations` | `/admin-command/procurement-officer/quotations` |
| **POST** | `/admin-command/procurement-officer/quotations/:param/select` | `/admin-command/procurement-officer/quotations/:param/select` |
| **POST** | `/admin-command/procurement-officer/purchase-orders` | `/admin-command/procurement-officer/purchase-orders` |
| **POST** | `/admin-command/procurement-officer/purchase-orders/:param/approve` | `/admin-command/procurement-officer/purchase-orders/:param/approve` |
| **POST** | `/admin-command/procurement-officer/deliveries` | `/admin-command/procurement-officer/deliveries` |
| **POST** | `/admin-command/procurement-officer/deliveries/:param/confirm` | `/admin-command/procurement-officer/deliveries/:param/confirm` |
| **POST** | `/admin-command/procurement-officer/reports/generate` | `/admin-command/procurement-officer/reports/generate` |
| **GET** | `/admin-command/secretary/overview` | `/admin-command/secretary/overview`<br>`/useSchoolQuery<OverviewData>('/admin-command/secretary/overview')` |
| **GET** | `/admin-command/secretary/reception-queue` | `/admin-command/secretary/reception-queue`<br>`/useSchoolQuery<QueueData>('/admin-command/secretary/reception-queue')` |
| **POST** | `/admin-command/secretary/reception-queue` | `/admin-command/secretary/reception-queue` |
| **POST** | `/admin-command/secretary/reception-queue/:param/call` | `/admin-command/secretary/reception-queue/:param/call` |
| **POST** | `/admin-command/secretary/reception-queue/:param/complete` | `/admin-command/secretary/reception-queue/:param/complete` |
| **GET** | `/admin-command/secretary/visitors` | `/admin-command/secretary/visitors`<br>`/useSchoolQuery<VisitorsData>('/admin-command/secretary/visitors')` |
| **POST** | `/admin-command/secretary/visitors/check-in` | `/admin-command/secretary/visitors/check-in` |
| **POST** | `/admin-command/secretary/visitors/:param/check-out` | `/admin-command/secretary/visitors/:param/check-out` |
| **POST** | `/admin-command/secretary/visitors/:param/print-slip` | `/admin-command/secretary/visitors/:param/print-slip` |
| **GET** | `/admin-command/secretary/appointments` | `/admin-command/secretary/appointments`<br>`/useSchoolQuery<AppointmentsData>('/admin-command/secretary/appointments')` |
| **POST** | `/admin-command/secretary/appointments` | `/admin-command/secretary/appointments` |
| **POST** | `/admin-command/secretary/appointments/:param/cancel` | `/admin-command/secretary/appointments/:param/cancel` |
| **POST** | `/admin-command/secretary/appointments/:param/reschedule` | `/admin-command/secretary/appointments/:param/reschedule` |
| **POST** | `/admin-command/secretary/appointments/:param/confirm` | `/admin-command/secretary/appointments/:param/confirm` |
| **GET** | `/admin-command/secretary/calls-log` | `/admin-command/secretary/calls-log`<br>`/useSchoolQuery<CallsData>('/admin-command/secretary/calls-log')` |
| **POST** | `/admin-command/secretary/calls-log` | `/admin-command/secretary/calls-log` |
| **POST** | `/admin-command/secretary/calls-log/:param/follow-up` | `/admin-command/secretary/calls-log/:param/follow-up` |
| **GET** | `/admin-command/secretary/parent-messages` | `/admin-command/secretary/parent-messages`<br>`/useSchoolQuery<MessagesData>('/admin-command/secretary/parent-messages')` |
| **POST** | `/admin-command/secretary/parent-messages` | `/admin-command/secretary/parent-messages` |
| **POST** | `/admin-command/secretary/parent-messages/:param/read` | `/admin-command/secretary/parent-messages/:param/read` |
| **POST** | `/admin-command/secretary/parent-messages/:param/reply` | `/admin-command/secretary/parent-messages/:param/reply` |
| **GET** | `/admin-command/secretary/letters-documents` | `/admin-command/secretary/letters-documents`<br>`/useSchoolQuery<DocumentsData>('/admin-command/secretary/letters-documents')` |
| **POST** | `/admin-command/secretary/letters-documents` | `/admin-command/secretary/letters-documents` |
| **POST** | `/admin-command/secretary/letters-documents/:param/download` | `/admin-command/secretary/letters-documents/:param/download` |
| **POST** | `/admin-command/secretary/letters-documents/:param/print` | `/admin-command/secretary/letters-documents/:param/print` |
| **GET** | `/admin-command/secretary/student-clearance` | `/admin-command/secretary/student-clearance`<br>`/useSchoolQuery<ClearanceData>('/admin-command/secretary/student-clearance')` |
| **POST** | `/admin-command/secretary/student-clearance` | `/admin-command/secretary/student-clearance` |
| **POST** | `/admin-command/secretary/student-clearance/:param/approve` | `/admin-command/secretary/student-clearance/:param/approve` |
| **POST** | `/admin-command/secretary/student-clearance/:param/complete` | `/admin-command/secretary/student-clearance/:param/complete` |
| **POST** | `/admin-command/secretary/student-clearance/:param/print` | `/admin-command/secretary/student-clearance/:param/print` |
| **GET** | `/admin-command/secretary/reports` | `/admin-command/secretary/reports`<br>`/useSchoolQuery<ReportsData>('/admin-command/secretary/reports')` |
| **POST** | `/admin-command/secretary/reports/generate` | `/admin-command/secretary/reports/generate` |
| **POST** | `/admin-command/secretary/reports/:param/download` | `/admin-command/secretary/reports/:param/download` |
| **POST** | `/admin-command/frontoffice/visitors` | `/admin-command/frontoffice/visitors` |
| **POST** | `/admin-command/frontoffice/appointments` | `/admin-command/frontoffice/appointments` |
| **POST** | `/admin-command/frontoffice/mail` | `/admin-command/frontoffice/mail` |
| **GET** | `/admin-command/security-officer/overview` | `/admin-command/security-officer/overview`<br>`/useSchoolQuery<OverviewData>('/admin-command/security-officer/overview')` |
| **GET** | `/admin-command/security-officer/gate-register` | `/admin-command/security-officer/gate-register` |
| **POST** | `/admin-command/security-officer/gate-register` | `/admin-command/security-officer/gate-register` |
| **POST** | `/admin-command/security-officer/gate-register/:param/exit` | `/admin-command/security-officer/gate-register/:param/exit` |
| **GET** | `/admin-command/security-officer/visitors` | `/admin-command/security-officer/visitors`<br>`/useSchoolQuery<VisitorsData>('/admin-command/security-officer/visitors')` |
| **POST** | `/admin-command/security-officer/visitors/check-in` | `/admin-command/security-officer/visitors/check-in` |
| **POST** | `/admin-command/security-officer/visitors/:param/check-out` | `/admin-command/security-officer/visitors/:param/check-out` |
| **POST** | `/admin-command/security-officer/visitors/:param/flag` | `/admin-command/security-officer/visitors/:param/flag` |
| **POST** | `/admin-command/security-officer/visitors/:param/print-badge` | `/admin-command/security-officer/visitors/:param/print-badge` |
| **GET** | `/admin-command/security-officer/incidents` | `/admin-command/security-officer/incidents`<br>`/useSchoolQuery<IncidentsData>('/admin-command/security-officer/incidents')` |
| **POST** | `/admin-command/security-officer/incidents` | `/admin-command/security-officer/incidents` |
| **POST** | `/admin-command/security-officer/incidents/:param/escalate` | `/admin-command/security-officer/incidents/:param/escalate` |
| **POST** | `/admin-command/security-officer/incidents/:param/resolve` | `/admin-command/security-officer/incidents/:param/resolve` |
| **GET** | `/admin-command/security-officer/staff-movement` | `/admin-command/security-officer/staff-movement` |
| **POST** | `/admin-command/security-officer/staff-movement/departure` | `/admin-command/security-officer/staff-movement/departure` |
| **POST** | `/admin-command/security-officer/staff-movement/:param/return` | `/admin-command/security-officer/staff-movement/:param/return` |
| **GET** | `/admin-command/security-officer/student-exit-passes` | `/admin-command/security-officer/student-exit-passes` |
| **POST** | `/admin-command/security-officer/student-exit-passes/:param/verify` | `/admin-command/security-officer/student-exit-passes/:param/verify` |
| **POST** | `/admin-command/security-officer/student-exit-passes/:param/exit` | `/admin-command/security-officer/student-exit-passes/:param/exit` |
| **POST** | `/admin-command/security-officer/student-exit-passes/:param/return` | `/admin-command/security-officer/student-exit-passes/:param/return` |
| **POST** | `/admin-command/security-officer/student-exit-passes/flag-unauthorized` | `/admin-command/security-officer/student-exit-passes/flag-unauthorized` |
| **GET** | `/admin-command/security-officer/reports` | `/admin-command/security-officer/reports`<br>`/useSchoolQuery<ReportsData>('/admin-command/security-officer/reports')` |
| **POST** | `/admin-command/security-officer/reports/generate` | `/admin-command/security-officer/reports/generate` |
| **POST** | `/admin-command/security-officer/reports/:param/download` | `/admin-command/security-officer/reports/:param/download` |
| **GET** | `/admin-command/storekeeper/overview` | `/admin-command/storekeeper/overview`<br>`/useSchoolQuery<OverviewData>('/admin-command/storekeeper/overview')` |
| **GET** | `/admin-command/storekeeper/items` | `/admin-command/storekeeper/items`<br>`/useSchoolQuery<ItemsData>('/admin-command/storekeeper/items')` |
| **GET** | `/admin-command/storekeeper/low-stock` | `/admin-command/storekeeper/low-stock`<br>`/useSchoolQuery<LowStockData>('/admin-command/storekeeper/low-stock')` |
| **GET** | `/admin-command/storekeeper/damaged-missing` | `/admin-command/storekeeper/damaged-missing`<br>`/useSchoolQuery<DamagedMissingData>('/admin-command/storekeeper/damaged-missing')` |
| **GET** | `/admin-command/storekeeper/stocktake` | `/admin-command/storekeeper/stocktake`<br>`/useSchoolQuery<StocktakeData>('/admin-command/storekeeper/stocktake')` |
| **GET** | `/admin-command/storekeeper/requests` | `/admin-command/storekeeper/requests`<br>`/useSchoolQuery<RequestsData>('/admin-command/storekeeper/requests')` |
| **GET** | `/admin-command/storekeeper/reports` | `/admin-command/storekeeper/reports`<br>`/useSchoolQuery<ReportsData>('/admin-command/storekeeper/reports')` |
| **POST** | `/admin-command/storekeeper/items` | `/admin-command/storekeeper/items` |
| **PATCH** | `/admin-command/storekeeper/items/:param` | `/admin-command/storekeeper/items/:param` |
| **DELETE** | `/admin-command/storekeeper/items/:param` | `/admin-command/storekeeper/items/:param` |
| **POST** | `/admin-command/storekeeper/items/receive` | `/admin-command/storekeeper/items/receive` |
| **POST** | `/admin-command/storekeeper/items/issue` | `/admin-command/storekeeper/items/issue` |
| **POST** | `/admin-command/storekeeper/low-stock/:param/reorder` | `/admin-command/storekeeper/low-stock/:param/reorder` |
| **POST** | `/admin-command/storekeeper/damaged-missing` | `/admin-command/storekeeper/damaged-missing` |
| **POST** | `/admin-command/storekeeper/damaged-missing/:param/write-off` | `/admin-command/storekeeper/damaged-missing/:param/write-off` |
| **POST** | `/admin-command/storekeeper/stocktake` | `/admin-command/storekeeper/stocktake` |
| **POST** | `/admin-command/storekeeper/stocktake/:param/submit` | `/admin-command/storekeeper/stocktake/:param/submit` |
| **POST** | `/admin-command/storekeeper/stocktake/:param/finalize` | `/admin-command/storekeeper/stocktake/:param/finalize` |
| **POST** | `/admin-command/storekeeper/requests/:param/approve` | `/admin-command/storekeeper/requests/:param/approve` |
| **POST** | `/admin-command/storekeeper/requests/:param/reject` | `/admin-command/storekeeper/requests/:param/reject` |
| **POST** | `/admin-command/storekeeper/requests/:param/fulfill` | `/admin-command/storekeeper/requests/:param/fulfill` |
| **POST** | `/admin-command/storekeeper/reports/generate` | `/admin-command/storekeeper/reports/generate` |
| **GET** | `/admin-command/storekeeper/reports/:param/download` | `/admin-command/storekeeper/reports/:param/download` |
| **GET** | `/admin-command/storekeeper/stock-in` | `/admin-command/storekeeper/stock-in`<br>`/useSchoolQuery<StockInData>("/admin-command/storekeeper/stock-in")` |
| **GET** | `/admin-command/storekeeper/stock-issue` | `/admin-command/storekeeper/stock-issue`<br>`/useSchoolQuery<StockIssueData>("/admin-command/storekeeper/stock-issue")` |
| **GET** | `/admin-command/student/dashboard` | `/admin-command/student/dashboard`<br>`/useSchoolQuery<DashboardData>("/admin-command/student/dashboard")` |
| **GET** | `/admin-command/student/downloads` | `/admin-command/student/downloads`<br>`/useSchoolQuery<DownloadsData>("/admin-command/student/downloads")` |
| **GET** | `/admin-command/student/messages` | `/admin-command/student/messages`<br>`/useSchoolQuery<MessagesData>("/admin-command/student/messages")` |
| **GET** | `/admin-command/student/notifications` | `/admin-command/student/notifications`<br>`/useSchoolQuery<NotificationsData>("/admin-command/student/notifications")` |
| **GET** | `/admin-command/teacher/lesson-plans` | `/admin-command/teacher/lesson-plans`<br>`/useSchoolQuery<LessonPlansData>("/admin-command/teacher/lesson-plans")` |
| **GET** | `/admin-command/teacher/messages` | `/admin-command/teacher/messages`<br>`/useSchoolQuery<MessagesData>("/admin-command/teacher/messages")` |
| **GET** | `/admin-command/teacher/reports` | `/admin-command/teacher/reports`<br>`/requestDashboardApi<any>("/admin-command/teacher/reports", {       tenantId: ...` |
| **GET** | `/admin-command/teacher/resource-requests` | `/admin-command/teacher/resource-requests`<br>`/useSchoolQuery<ResourceRequestsData>("/admin-command/teacher/resource-requests")` |
| **GET** | `/admin-command/teacher/student-notes` | `/admin-command/teacher/student-notes`<br>`/useSchoolQuery<StudentNotesData>("/admin-command/teacher/student-notes")` |
| **GET** | `/admin-command/teacher/attendance` | `/admin-command/teacher/attendance`<br>`/useSchoolQuery<TeacherAttendanceData>("/admin-command/teacher/attendance")` |
| **GET** | `/admin-command/teacher/utilities` | `/admin-command/teacher/utilities`<br>`/useSchoolQuery<UtilitiesData>("/admin-command/teacher/utilities")` |
| **GET** | `/admin-command/teacher/academic-setup` | `/admin-command/teacher/academic-setup`<br>`/requestDashboardApi<any>("/admin-command/teacher/academic-setup", {       ten...` |
| **GET** | `/admin-command/teacher/cbc-assessments` | `/admin-command/teacher/cbc-assessments`<br>`/requestDashboardApi<any>("/admin-command/teacher/cbc-assessments", {       te...` |
| **GET** | `/admin-command/teacher/clubs` | `/admin-command/teacher/clubs`<br>`/requestDashboardApi<any>("/admin-command/teacher/clubs", {       tenantId: li...` |
| **GET** | `/admin-command/teacher/invigilation` | `/admin-command/teacher/invigilation`<br>`/requestDashboardApi<any>("/admin-command/teacher/invigilation", {       tenan...` |
| **GET** | `/admin-command/teacher/learner-progress` | `/admin-command/teacher/learner-progress`<br>`/requestDashboardApi<any>("/admin-command/teacher/learner-progress", {       t...` |
| **GET** | `/admin-command/teacher/mark-entry` | `/admin-command/teacher/mark-entry`<br>`/requestDashboardApi<any>("/admin-command/teacher/mark-entry", {       tenantI...` |
| **GET** | `/admin-command/teacher/profile` | `/admin-command/teacher/profile`<br>`/requestDashboardApi<any>("/admin-command/teacher/profile", {       tenantId: ...` |
| **GET** | `/admin-command/teacher/notifications` | `/admin-command/teacher/notifications`<br>`/requestDashboardApi<any>("/admin-command/teacher/notifications", {       tena...` |
| **GET** | `/admin-command/teacher/store-requests` | `/admin-command/teacher/store-requests`<br>`/requestDashboardApi<any>("/admin-command/teacher/store-requests", {       ten...` |
| **GET** | `/admin-command/teacher/subject-allocations` | `/admin-command/teacher/subject-allocations`<br>`/requestDashboardApi<any>("/admin-command/teacher/subject-allocations", {     ...` |
| **GET** | `/admin-command/teacher/syllabus-coverage` | `/admin-command/teacher/syllabus-coverage`<br>`/requestDashboardApi<any>("/admin-command/teacher/syllabus-coverage", {       ...` |
| **GET** | `/admin-command/teacher/resources` | `/admin-command/teacher/resources`<br>`/requestDashboardApi<any>("/admin-command/teacher/resources", {       tenantId...` |
| **GET** | `/admin-command/transport-manager/overview` | `/admin-command/transport-manager/overview`<br>`/useSchoolQuery<OverviewData>('/admin-command/transport-manager/overview')` |
| **GET** | `/admin-command/transport-manager/vehicles` | `/admin-command/transport-manager/vehicles`<br>`/useSchoolQuery<VehiclesData>('/admin-command/transport-manager/vehicles')` |
| **GET** | `/admin-command/transport-manager/drivers` | `/admin-command/transport-manager/drivers`<br>`/useSchoolQuery<DriversData>('/admin-command/transport-manager/drivers')` |
| **GET** | `/admin-command/transport-manager/routes` | `/admin-command/transport-manager/routes`<br>`/useSchoolQuery<RoutesData>('/admin-command/transport-manager/routes')` |
| **GET** | `/admin-command/transport-manager/trips` | `/admin-command/transport-manager/trips`<br>`/useSchoolQuery<TripsData>('/admin-command/transport-manager/trips')` |
| **GET** | `/admin-command/transport-manager/fuel-maintenance` | `/admin-command/transport-manager/fuel-maintenance` |
| **GET** | `/admin-command/transport-manager/student-transport-list` | `/admin-command/transport-manager/student-transport-list` |
| **GET** | `/admin-command/transport-manager/reports` | `/admin-command/transport-manager/reports`<br>`/useSchoolQuery<ReportsData>('/admin-command/transport-manager/reports')` |
| **POST** | `/admin-command/transport-manager/vehicles` | `/admin-command/transport-manager/vehicles` |
| **PATCH** | `/admin-command/transport-manager/vehicles/:param` | `/admin-command/transport-manager/vehicles/:param` |
| **POST** | `/admin-command/transport-manager/vehicles/:param/decommission` | `/admin-command/transport-manager/vehicles/:param/decommission` |
| **POST** | `/admin-command/transport-manager/drivers` | `/admin-command/transport-manager/drivers` |
| **PATCH** | `/admin-command/transport-manager/drivers/:param` | `/admin-command/transport-manager/drivers/:param` |
| **POST** | `/admin-command/transport-manager/drivers/:param/suspend` | `/admin-command/transport-manager/drivers/:param/suspend` |
| **POST** | `/admin-command/transport-manager/routes` | `/admin-command/transport-manager/routes` |
| **PATCH** | `/admin-command/transport-manager/routes/:param` | `/admin-command/transport-manager/routes/:param` |
| **POST** | `/admin-command/transport-manager/routes/:param/assign-vehicle` | `/admin-command/transport-manager/routes/:param/assign-vehicle` |
| **POST** | `/admin-command/transport-manager/trips` | `/admin-command/transport-manager/trips` |
| **POST** | `/admin-command/transport-manager/trips/:param/complete` | `/admin-command/transport-manager/trips/:param/complete` |
| **POST** | `/admin-command/transport-manager/fuel-maintenance/fuel` | `/admin-command/transport-manager/fuel-maintenance/fuel` |
| **POST** | `/admin-command/transport-manager/fuel-maintenance/maintenance` | `/admin-command/transport-manager/fuel-maintenance/maintenance` |
| **POST** | `/admin-command/transport-manager/student-transport-list` | `/admin-command/transport-manager/student-transport-list` |
| **DELETE** | `/admin-command/transport-manager/student-transport-list/:param` | `/admin-command/transport-manager/student-transport-list/:param` |
| **POST** | `/admin-command/transport-manager/reports/generate` | `/admin-command/transport-manager/reports/generate` |

### Module: `billing` (3 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **POST** | `/billing/manual-fee-payments/:param/:param` | `/billing/manual-fee-payments/:param/:param` |
| **GET** | `/billing/waivers` | `/billing/waivers` |
| **POST** | `/billing/waivers` | `/billing/waivers` |

### Module: `academic` (12 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **POST** | `/academic/communications` | `/academic/communications`<br>`/requestDashboardApi("/api/academic/communications", { method: "POST", body: J...` |
| **POST** | `/academic/dean/lock-batch` | `/academic/dean/lock-batch` |
| **POST** | `/academic/dean/action` | `/academic/dean/action` |
| **POST** | `/academic/exams-manager/import-marks` | `/academic/exams-manager/import-marks`<br>`/requestDashboardApi("/api/academic/exams-manager/import-marks", {            ...` |
| **POST** | `/academic/exams-manager/export-marks` | `/academic/exams-manager/export-marks`<br>`/requestDashboardApi("/api/academic/exams-manager/export-marks", {            ...` |
| **POST** | `/academic/exams-manager/zeraki-sync` | `/academic/exams-manager/zeraki-sync`<br>`/requestDashboardApi("/api/academic/exams-manager/zeraki-sync", {             ...` |
| **POST** | `/academic/grade-master/compile` | `/academic/grade-master/compile`<br>`/requestDashboardApi("/api/academic/grade-master/compile", { method: "POST", b...` |
| **POST** | `/academic/grade-master/comment` | `/academic/grade-master/comment`<br>`/requestDashboardApi("/api/academic/grade-master/comment", { method: "POST", b...` |
| **POST** | `/academic/hod/requests` | `/academic/hod/requests`<br>`/requestDashboardApi("/api/academic/hod/requests", {         method: "POST",  ...` |
| **POST** | `/academic/hod/subject-allocation` | `/academic/hod/subject-allocation`<br>`/requestDashboardApi("/api/academic/hod/subject-allocation", {         method:...` |
| **POST** | `/academic/hod/department-meetings` | `/academic/hod/department-meetings`<br>`/requestDashboardApi("/api/academic/hod/department-meetings", {         method...` |
| **POST** | `/academic/marks/enter` | `/academic/marks/enter` |

### Module: `discipline` (26 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/discipline/actions-interventions` | `/discipline/actions-interventions`<br>`/useSchoolQuery<any[]>("/discipline/actions-interventions")` |
| **GET** | `/discipline/actions-sanctions` | `/discipline/actions-sanctions`<br>`/useSchoolQuery<any[]>("/discipline/actions-sanctions")` |
| **GET** | `/discipline/audit-trail` | `/discipline/audit-trail`<br>`/useSchoolQuery<any[]>("/discipline/audit-trail")` |
| **GET** | `/discipline/cases` | `/discipline/cases`<br>`/useSchoolQuery<any[]>("/discipline/cases")` |
| **GET** | `/discipline/class-house-monitoring` | `/discipline/class-house-monitoring`<br>`/useSchoolQuery<any[]>("/discipline/class-house-monitoring")` |
| **GET** | `/discipline/counselling-referrals` | `/discipline/counselling-referrals`<br>`/useSchoolQuery<any[]>("/discipline/counselling-referrals")` |
| **GET** | `/discipline/detention-programs` | `/discipline/detention-programs`<br>`/useSchoolQuery<any[]>("/discipline/detention-programs")` |
| **GET** | `/discipline/incident-log` | `/discipline/incident-log`<br>`/useSchoolQuery<any[]>("/discipline/incident-log")` |
| **GET** | `/discipline/incident-register` | `/discipline/incident-register`<br>`/useSchoolQuery<any[]>("/discipline/incident-register")` |
| **GET** | `/discipline/investigations` | `/discipline/investigations`<br>`/useSchoolQuery<any[]>("/discipline/investigations")` |
| **GET** | `/discipline/log-incident` | `/discipline/log-incident`<br>`/useSchoolQuery<any[]>("/discipline/log-incident")` |
| **GET** | `/discipline/overview` | `/discipline/overview`<br>`/useSchoolQuery<any[]>("/discipline/overview")` |
| **GET** | `/discipline/parent-communication` | `/discipline/parent-communication`<br>`/useSchoolQuery<any[]>("/discipline/parent-communication")` |
| **GET** | `/discipline/parent-summons` | `/discipline/parent-summons`<br>`/useSchoolQuery<any[]>("/discipline/parent-summons")` |
| **GET** | `/discipline/report-intake` | `/discipline/report-intake`<br>`/useSchoolQuery<any[]>("/discipline/report-intake")` |
| **GET** | `/discipline/reports-downloads` | `/discipline/reports-downloads`<br>`/useSchoolQuery<any[]>("/discipline/reports-downloads")` |
| **GET** | `/discipline/reports` | `/discipline/reports`<br>`/useSchoolQuery<any[]>("/discipline/reports")` |
| **GET** | `/discipline/serious-cases-approvals` | `/discipline/serious-cases-approvals`<br>`/useSchoolQuery<any[]>("/discipline/serious-cases-approvals")` |
| **GET** | `/discipline/settings` | `/discipline/settings`<br>`/useSchoolQuery<any[]>("/discipline/settings")` |
| **GET** | `/discipline/student-conduct-profiles` | `/discipline/student-conduct-profiles`<br>`/useSchoolQuery<any[]>("/discipline/student-conduct-profiles")` |
| **GET** | `/discipline/templates-rules` | `/discipline/templates-rules`<br>`/useSchoolQuery<any[]>("/discipline/templates-rules")` |
| **GET** | `/discipline/triage-queue` | `/discipline/triage-queue`<br>`/useSchoolQuery<any[]>("/discipline/triage-queue")` |
| **GET** | `/discipline/students/me/behavior-score` | `/discipline/students/me/behavior-score`<br>`/useSchoolQuery('/api/discipline/students/me/behavior-score')` |
| **POST** | `/discipline/cases` | `/discipline/cases` |
| **PATCH** | `/discipline/cases/:param` | `/discipline/cases/:param` |
| **GET** | `/discipline/:param:param` | `/discipline/:param:param` |

### Module: `assets` (1 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/assets` | `/assets`<br>`/useSchoolQuery<any>("/api/assets")` |

### Module: `labs` (7 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/labs/dashboard` | `/labs/dashboard`<br>`/useSchoolQuery<any>("/api/labs/dashboard")` |
| **GET** | `/labs/inventory` | `/labs/inventory`<br>`/useSchoolQuery<LabInventoryRecord[]>("/api/labs/inventory")` |
| **GET** | `/labs/requests` | `/labs/requests`<br>`/useSchoolQuery<LabPracticalRequestRecord[]>("/api/labs/requests")` |
| **GET** | `/labs/issues` | `/labs/issues`<br>`/useSchoolQuery<LabIssueRecord[]>("/api/labs/issues")` |
| **POST** | `/labs/inventory` | `/labs/inventory`<br>`/useSchoolMutation("/api/labs/inventory")` |
| **POST** | `/labs/requests` | `/labs/requests`<br>`/useSchoolMutation("/api/labs/requests")` |
| **POST** | `/labs/issues` | `/labs/issues`<br>`/useSchoolMutation("/api/labs/issues")` |

### Module: `parent-portal` (2 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **POST** | `/parent-portal/behavior/acknowledge` | `/parent-portal/behavior/acknowledge` |
| **POST** | `/parent-portal/fees/pay` | `/parent-portal/fees/pay` |

### Module: `clinic` (5 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/clinic/parent/students/me/history` | `/clinic/parent/students/me/history` |
| **GET** | `/clinic/medicines/stock` | `/clinic/medicines/stock`<br>`/useSchoolQuery<MedicineStockRecord[]>("/api/clinic/medicines/stock")` |
| **POST** | `/clinic/medicines/stock` | `/clinic/medicines/stock`<br>`/useSchoolMutation("/api/clinic/medicines/stock")` |
| **GET** | `/clinic/analytics/principal:param` | `/clinic/analytics/principal:param` |
| **GET** | `/clinic/medicines:param` | `/clinic/medicines:param` |

### Module: `admissions` (5 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **POST** | `/admissions/applications/:param/approve` | `/admissions/applications/:param/approve` |
| **POST** | `/admissions/quick-actions` | `/admissions/quick-actions`<br>`/requestDashboardApi("/api/admissions/quick-actions", {         method: "POST"...` |
| **GET** | `/admissions/applicants` | `/admissions/applicants`<br>`/useSchoolQuery<AdmissionApplicantRecord[]>("/api/admissions/applicants")` |
| **POST** | `/admissions/applicants` | `/admissions/applicants`<br>`/useSchoolMutation("/api/admissions/applicants")` |
| **GET** | `/admissions` | `/admissions`<br>`/useSchoolQuery<any[]>("/api/admissions")` |

### Module: `library` (6 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/library/books` | `/library/books`<br>`/useSchoolQuery<LibraryBookRecord[]>("/api/library/books")` |
| **GET** | `/library/loans` | `/library/loans`<br>`/useSchoolQuery<LibraryLoanRecord[]>("/api/library/loans")` |
| **POST** | `/library/books` | `/library/books`<br>`/useSchoolMutation("/api/library/books")` |
| **GET** | `/library/loans:param` | `/library/loans:param` |
| **POST** | `/library/issue` | `/library/issue` |
| **PATCH** | `/library/loans/:param` | `/library/loans/:param` |

### Module: `boarding` (4 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/boarding/roll-calls` | `/boarding/roll-calls`<br>`/useSchoolQuery<BoardingRollCallRecord[]>("/api/boarding/roll-calls")` |
| **GET** | `/boarding/exeats` | `/boarding/exeats`<br>`/useSchoolQuery<ExeatRequestRecord[]>("/api/boarding/exeats")` |
| **POST** | `/boarding/roll-calls` | `/boarding/roll-calls`<br>`/useSchoolMutation("/api/boarding/roll-calls")` |
| **POST** | `/boarding/exeats` | `/boarding/exeats`<br>`/useSchoolMutation("/api/boarding/exeats")` |

### Module: `transport` (2 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/transport/vehicles` | `/transport/vehicles`<br>`/useSchoolQuery<TransportVehicleRecord[]>("/api/transport/vehicles")` |
| **GET** | `/transport/trips` | `/transport/trips`<br>`/useSchoolQuery<TransportTripRecord[]>("/api/transport/trips")` |

### Module: `finance` (4 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/finance/balances` | `/finance/balances`<br>`/useSchoolQuery<FeeBalanceRecord[]>("/api/finance/balances")` |
| **GET** | `/finance/payments` | `/finance/payments`<br>`/useSchoolQuery<FeePaymentRecord[]>("/api/finance/payments")` |
| **POST** | `/finance/balances` | `/finance/balances`<br>`/useSchoolMutation("/api/finance/balances")` |
| **POST** | `/finance/payments` | `/finance/payments`<br>`/useSchoolMutation("/api/finance/payments")` |

### Module: `secretary` (3 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/secretary/visitors` | `/secretary/visitors`<br>`/useSchoolQuery<SecretaryVisitorRecord[]>("/api/secretary/visitors")` |
| **GET** | `/secretary/inquiries` | `/secretary/inquiries`<br>`/useSchoolQuery<SecretaryInquiryRecord[]>("/api/secretary/inquiries")` |
| **POST** | `/secretary/inquiries` | `/secretary/inquiries`<br>`/useSchoolMutation("/api/secretary/inquiries")` |

### Module: `support` (5 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/support/discipline` | `/support/discipline`<br>`/useSchoolQuery<DisciplineCaseRecord[]>("/api/support/discipline")` |
| **GET** | `/support/counselling` | `/support/counselling`<br>`/useSchoolQuery<CounsellingSessionRecord[]>("/api/support/counselling")` |
| **POST** | `/support/discipline` | `/support/discipline`<br>`/useSchoolMutation("/api/support/discipline")` |
| **POST** | `/support/counselling` | `/support/counselling`<br>`/useSchoolMutation("/api/support/counselling")` |
| **POST** | `/support/admin/notifications/dead-letter/:param/retry` | `/support/admin/notifications/dead-letter/:param/retry` |

### Module: `school` (2 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/school/modules/me` | `/school/modules/me`<br>`/fetch("/api/school/modules/me", {           method: "GET",           credenti...` |
| **GET** | `/school/settings` | `/school/settings`<br>`/useSchoolQuery<any[]>("/api/school/settings")` |

### Module: `communication` (2 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/communication/summary` | `/communication/summary`<br>`/useSchoolQuery<any[]>("/api/communication/summary")` |
| **GET** | `/communication/messages` | `/communication/messages`<br>`/useSchoolQuery<any[]>("/api/communication/messages")` |

### Module: `operations` (1 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/operations/reports` | `/operations/reports`<br>`/useSchoolQuery<any[]>("/api/operations/reports")` |

### Module: `auth` (3 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/auth/sessions` | `/auth/sessions`<br>`/useSchoolQuery<SessionRow[]>("/api/auth/sessions")` |
| **POST** | `/auth/sessions/revoke` | `/auth/sessions/revoke`<br>`/useSchoolMutation("/api/auth/sessions/revoke")` |
| **GET** | `/auth/csrf` | `/auth/csrf`<br>`/fetch("/api/auth/csrf", {       method: "GET",       credentials: "same-origi...` |

### Module: `student-portal` (1 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **POST** | `/student-portal/assignments/mark-done` | `/student-portal/assignments/mark-done`<br>`/requestDashboardApi("/api/student-portal/assignments/mark-done", {         me...` |

### Module: `student` (4 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/student/dashboard` | `/student/dashboard`<br>`/useSchoolQuery<any>("/api/student/dashboard")` |
| **GET** | `/student/overview` | `/student/overview`<br>`/useSchoolQuery<any>("/api/student/overview")` |
| **GET** | `/student/academics` | `/student/academics`<br>`/useSchoolQuery<any>("/api/student/academics")` |
| **GET** | `/student/attendance` | `/student/attendance`<br>`/useSchoolQuery<any>("/api/student/attendance")` |

### Module: `students` (7 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/students/:param/attendance` | `/students/:param/attendance` |
| **GET** | `/students/:param/discipline` | `/students/:param/discipline` |
| **GET** | `/students/:param/fees` | `/students/:param/fees` |
| **GET** | `/students/:param/health` | `/students/:param/health` |
| **GET** | `/students/:param/library` | `/students/:param/library` |
| **GET** | `/students/:param/guardians` | `/students/:param/guardians` |
| **POST** | `/students/admit` | `/students/admit` |

### Module: `attendance:param` (1 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/attendance:param` | `/attendance:param` |

### Module: `attendance` (1 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **POST** | `/attendance/mark` | `/attendance/mark` |

### Module: `discipline:param` (1 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/discipline:param` | `/discipline:param` |

### Module: `fees:param` (1 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/fees:param` | `/fees:param` |

### Module: `fees` (2 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/fees/summary` | `/fees/summary` |
| **POST** | `/fees/payments` | `/fees/payments` |

### Module: `health:param` (1 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/health:param` | `/health:param` |

### Module: `health` (1 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **POST** | `/health/visits` | `/health/visits` |

### Module: `students:param` (1 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/students:param` | `/students:param` |

### Module: `approvals` (1 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **PATCH** | `/approvals/my-requests` | `/approvals/my-requests` |

### Module: `api:param` (1 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/api:param` | `/api:param` |

### Module: `test-route` (1 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/test-route` | `/test-route`<br>`/useSchoolQuery("/test-route")` |

### Module: `test-mutation` (1 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **POST** | `/test-mutation` | `/test-mutation`<br>`/useSchoolMutation("/test-mutation")` |

### Module: `counselling` (1 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/counselling/:param:param` | `/counselling/:param:param` |

### Module: `portals` (3 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/portals/parent/children` | `/portals/parent/children`<br>`/useSchoolQuery<LinkedChild[]>("/api/portals/parent/children")` |
| **GET** | `/portals/fees/history:param` | `/portals/fees/history:param` |
| **GET** | `/portals/reports:param` | `/portals/reports:param` |

### Module: `academics` (3 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/academics/dean-dataset` | `/academics/dean-dataset` |
| **GET** | `/academics/subjects:param` | `/academics/subjects:param` |
| **GET** | `/academics/terms:param` | `/academics/terms:param` |

### Module: `support:param` (1 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/support:param` | `/support:param` |

### Module: `:param` (3 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/:param/dashboard` | `/:param/dashboard` |
| **POST** | `/:param/records` | `/:param/records` |
| **PATCH** | `/:param/records/:param/status` | `/:param/records/:param/status` |

### Module: `buildBillingApiPath` (2 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/buildBillingApiPath` | `/buildBillingApiPath("/api/billing/finance-activity`<br>`/buildBillingApiPath(` |
| **POST** | `/buildBillingApiPath` | `/buildBillingApiPath(` |

### Module: `buildPaymentsApiPath` (2 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/buildPaymentsApiPath` | `/buildPaymentsApiPath("/api/payments/mpesa/c2b/payments` |
| **POST** | `/buildPaymentsApiPath` | `/buildPaymentsApiPath(` |

### Module: `endpoint` (2 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/endpoint` | `/endpoint` |
| **POST** | `/endpoint` | `/endpoint` |

### Module: `studentId` (1 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/studentId` | `/studentId ` |

### Module: `support:param:param:param` (1 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **GET** | `/support:param:param:param` | `/support:param:param:param` |

### Module: `useSchoolMutation` (2 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **POST** | `/useSchoolMutation` | `/useSchoolMutation((id: string) => \`<br>`/useSchoolMutation<{ id: string }, { id: string }>(     ({ id }) => \` |
| **PATCH** | `/useSchoolMutation` | `/useSchoolMutation<DisciplineCase, Partial<DisciplineCase>>(     \`<br>`/useSchoolMutation<Student, Partial<Student>>(     \` |

### Module: `requestDashboardApi` (4 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **POST** | `/requestDashboardApi` | `/requestDashboardApi(\`<br>`/requestDashboardApi<Student>(\` |
| **DELETE** | `/requestDashboardApi` | `/requestDashboardApi(\` |
| **PATCH** | `/requestDashboardApi` | `/requestDashboardApi<Student>(\` |
| **GET** | `/requestDashboardApi` | `/requestDashboardApi<Student[]>(\`<br>`/requestDashboardApi<Student>(\` |

### Module: `school_id` (1 gaps)

| Method | Clean Expected Path | Frontend Original References (Sample) |
| :--- | :--- | :--- |
| **POST** | `/school_id` | `/school_id` |


---

## 6. Recommendations & Action Plan

To transition the MyShule platform to production readiness and ensure all workflows are end-to-end operational, the following steps are recommended:

1. **Resolve Route Prefix Discrepancies**:
   * Align the frontend API base paths in `api-client.ts` to use the backend's direct modules (`/inventory`, `/clinic`, `/transport`, `/class-teacher`), OR
   * Implement route aliases/redirects in the NestJS routing registry or Next.js API proxy to forward `/admin-command/<role>/` requests to their corresponding domain controllers.
2. **Implement Missing Scaffolding**:
   * Generate missing mutation endpoints for admissions, boarding exeat, student exits, and library book/fine management.
3. **Database Indexing**:
   * Add `@@index([schoolId])` or `@@index([tenant_id])` declarations to all tenant-scoped tables in `prisma/schema.prisma` to enforce fast multi-tenant isolation lookups.
4. **Prisma Schema Alignment**:
   * Clean up or implement commented-out service code and ensure any newly introduced data structures (like library visits or student welfare concerns) have matching models in `schema.prisma`.
