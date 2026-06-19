# Shule Hub Platform Workspaces Audit Report

This report presents a comprehensive static analysis and security/functional audit of the 16 React workspaces located in `apps/web/src/components/platform/workspaces` cross-referenced with the NestJS backend and the database schema in `prisma/schema.prisma`.

---

## Executive Summary
An audit of the 16 platform workspaces reveals a significant amount of "mock UI" scaffolding that is not wired to the backend, API endpoints defined in the client and components that are missing in NestJS controllers, backend service methods returning empty stubs, and database schema gaps for key platform-level features. Additionally, there are severe backend-frontend contract mismatches where the database query shapes or API responses do not match the fields rendered by frontend components, leading to empty or broken data displays in production.

---

## Workspace-by-Workspace Audit Findings

### 1. AuditLogsWorkspace
* **API Route(s) Called:** 
  * `fetchPlatformAuditLogs()`: GET `/api/platform/audit-logs`
* **Backend Cross-Reference:**
  * Maps to `PlatformOnboardingController.getAuditLogs()` -> `PlatformOnboardingService.getAuditLogs()`
* **Backend Service / Controller Status:**
  * Implemented. Runs raw SQL: `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100`.
* **Contract / Data Model Mismatch:**
  * **Severe Mismatch:** The frontend DataTable expects columns `timestamp` (renders `row.timestamp`), `actor` (renders `row.actor`), `target` (renders `row.target`), and `details` (renders `row.details`).
  * However, the database table `audit_logs` has fields: `created_at` (not `timestamp`), `actor_user_id` (not `actor`), `entity_type`/`entity_id` (not `target`), and `reason`/`new_values_json` (not `details`). In production, all columns in the table (except "Action") will render as blank or fallback values.
* **UI Gaps (Dead Buttons / Mock Controls):**
  * None.
* **Database Schema Gaps:**
  * The `audit_logs` table (`AuditLog` model in Prisma) exists, but the query fields are not aligned with the frontend structure.

---

### 2. BroadcastsWorkspace
* **API Route(s) Called:**
  * `fetchPlatformBroadcasts()`: GET `/api/platform/broadcasts`
  * `createPlatformBroadcast(input)`: POST `/api/platform/broadcasts`
* **Backend Cross-Reference:**
  * GET maps to `PlatformOnboardingController.getBroadcasts()` -> `PlatformOnboardingService.getBroadcasts()`
  * POST `/api/platform/broadcasts` is **MISSING** from `PlatformOnboardingController`.
* **Backend Service / Controller Status:**
  * `PlatformOnboardingService.getBroadcasts()` returns a stub: `[]`.
  * POST handler is missing in the controller and service.
* **UI Gaps (Dead Buttons / Mock Controls):**
  * Row action buttons `View`, `Edit`, and `Retract` are dead buttons with no click handlers.
* **Database Schema Gaps:**
  * While `communication_broadcasts` exists in `prisma/schema.prisma`, it is strictly scoped to individual schools via `school_id`. No table exists for platform-wide/global broadcasts shown to all tenants, meaning the feature lacks a schema backing.

---

### 3. DataToolsWorkspace
* **API Route(s) Called:**
  * `fetchPlatformBackups()`: GET `/api/platform/backups`
* **Backend Cross-Reference:**
  * GET maps to `PlatformOnboardingController.getBackups()` -> `PlatformOnboardingService.getBackups()`
* **Backend Service / Controller Status:**
  * `PlatformOnboardingService.getBackups()` is a stub returning `[]`.
* **UI Gaps (Dead Buttons / Mock Controls):**
  * Table row actions `Trigger Backup`, `Download Snapshot`, and `Restore` are dead buttons with no click handlers.
  * Columns `lastBackup` (always renders `"Not backed up"`), `size` (always renders `"N/A"`), and `status` (always renders `"Pending"` status pill) are hardcoded mocks.
* **Database Schema Gaps:**
  * No backups table or backup history model exists in `prisma/schema.prisma`.

---

### 4. DemoManagerWorkspace
* **API Route(s) Called:**
  * `fetchPlatformSchools()`: GET `/api/platform/schools`
  * `hardDeletePlatformSchool(...)`: DELETE `/api/platform/schools/:tenantId/hard-delete`
* **Backend Cross-Reference:**
  * GET maps to `PlatformOnboardingController.listSchools()` -> `PlatformOnboardingService.listSchools()`
  * DELETE maps to `PlatformOnboardingController.hardDeleteSchool(...)` -> `PlatformOnboardingService.hardDeleteSchool(...)`
* **Backend Service / Controller Status:**
  * Fully implemented. Deletes all tenant-linked rows transactionally.
* **UI Gaps (Dead Buttons / Mock Controls):**
  * Header buttons `Run Leakage Scanner` and `Create Demo Tenant` are dead buttons (no click handlers).
  * Table row action `Purge Data` is disabled.
  * Metric cards `Active Demo Schools` (hardcoded to `1`) and `Demo Leakages Detected` (hardcoded to `0`) are hardcoded.
  * The "Demo Leakage Scanner" DataTable columns are mocked: `leakedRecords` (always `"0"`), `module` (always `"None"`), and `status` (always `"Clean"`).
* **Database Schema Gaps:**
  * `isDemoSchool` exists on `School` model. No database gaps.

---

### 5. ModuleAccessWorkspace
* **API Route(s) Called:**
  * `fetchPlatformSchools()`: GET `/api/platform/schools`
  * *(Missing Integration)*: Does not call the client functions `fetchPlatformSchoolModules(tenantId)` or `updatePlatformSchoolModules(input)`.
* **Backend Cross-Reference:**
  * GET `/api/platform/schools` maps to `PlatformOnboardingController.listSchools()`.
  * The actual module management endpoints exist in `PlatformModuleAccessController` (`module-access.controller.ts`), specifically GET `/api/platform/schools/:tenantId/modules` and PUT `/api/platform/schools/:tenantId/modules`.
* **Backend Service / Controller Status:**
  * Fully implemented in the backend, but the frontend workspace does not wire up these calls.
* **UI Gaps (Dead Buttons / Mock Controls):**
  * Metric cards: `Total Available Modules` (hardcoded to `24`), `Schools Using Finance` (hardcoded to `0`), and `Schools Using CBC` (hardcoded to `0`).
  * Table column `activeModules` is hardcoded to `"5 / 24"`, and `status` is hardcoded to `"Active"`.
  * Inside the "Manage Access" modal: `Enable Starter Set`, `Enable Finance Set`, and `Enable Full Suite` are dead buttons.
  * The checklist inputs are stateless checkboxes rendering a hardcoded module list: `"Admissions"`, `"Attendance"`, `"Exams"`, `"Finance"`, `"Library"`, `"CBC"`, `"Transport"`, `"Hostel"`, `"Discipline"`, `"Inventory"`.
  * The `Save Modules` button simply closes the modal without submitting changes to the backend.
* **Database Schema Gaps:**
  * `school_module_access` and `module_registry` tables exist in `prisma/schema.prisma`. No database gaps.

---

### 6. OnboardingWorkspace
* **API Route(s) Called:**
  * `fetchPlatformSchools()`: GET `/api/platform/schools`
* **Backend Cross-Reference:**
  * GET maps to `PlatformOnboardingController.listSchools()`.
* **Backend Service / Controller Status:**
  * Fully implemented.
* **UI Gaps (Dead Buttons / Mock Controls):**
  * Header actions `View Blocked`, `Export Report`, and `Create School` are dead buttons.
  * Table row actions `View` and `Resend Invite` are dead buttons.
  * The 4 onboarding status cards at the top are static, non-interactive mock controls.
* **Database Schema Gaps:**
  * None.

---

### 7. PaymentGatewaysWorkspace
* **API Route(s) Called:**
  * `fetchPlatformPaymentGateways()`: GET `/api/platform/gateways`
* **Backend Cross-Reference:**
  * GET maps to `PlatformOnboardingController.getGateways()` -> `PlatformOnboardingService.getGateways()`
* **Backend Service / Controller Status:**
  * `PlatformOnboardingService.getGateways()` runs a global query: `SELECT * FROM tenant_payment_channels`.
* **UI Gaps (Dead Buttons / Mock Controls):**
  * Inside `providerColumns`: `type` (hardcoded `"M-Pesa Paybill"`), `environment` (hardcoded `"Production"`), and `status` (always `"Active"`).
  * Table row `Edit` action is a dead button.
  * Tab views "School Mappings" and "Callback Logs" render empty tables with no schema or data integration.
  * "Add Gateway" modal form submission calls `preventDefault()` and closes without backend integration.
* **Database Schema Gaps:**
  * `tenant_payment_channels` table exists. However, there is no platform-wide/global payment gateways table in the schema, forcing the platform to read from tenant-scoped configurations directly.

---

### 8. PlatformReportsWorkspace
* **API Route(s) Called:**
  * `fetchPlatformReports()`: GET `/api/platform/reports`
  * `requestPlatformReport(input)`: POST `/api/platform/reports/request`
* **Backend Cross-Reference:**
  * GET maps to `PlatformOnboardingController.getReports()` -> `PlatformOnboardingService.getReports()`
  * POST maps to `PlatformOnboardingController.requestReport()` -> `PlatformOnboardingService.requestReport()`
* **Backend Service / Controller Status:**
  * `PlatformOnboardingService.requestReport(body)` is a stub that returns: `{ success: true, message: 'Report requested successfully' }` without processing or generating any actual report.
  * `PlatformOnboardingService.getReports()` queries `SELECT * FROM operations_reports`.
* **Contract / Data Model Mismatch:**
  * **Severe Mismatch:** The DataTable expects columns `reportName` (renders `row.reportName`), `date` (renders `row.date`), and `status` (renders `row.status`).
  * However, the database model `OperationsReports` has fields: `title` (not `reportName`), `created_at` (not `date`), and no `status` column exists. All table columns will render blank in production.
* **UI Gaps (Dead Buttons / Mock Controls):**
  * Table row action `Download` button is a dead button.
  * Metric cards `Total Revenue` (KSH 0), `Total SMS Sent` (0), `Active Tenants` (0), and `Total Users` (0) are hardcoded.
* **Database Schema Gaps:**
  * `operations_reports` exists in `schema.prisma`. It has a `tenant_id` field, indicating it is scoped to a tenant, which makes its global use as a platform-wide report database table questionable.

---

### 9. PlatformSmsSettingsWorkspace
* **API Route(s) Called:**
  * GET `/api/platform/sms-settings` (via `useQuery`)
* **Backend Cross-Reference:**
  * GET maps to `PlatformOnboardingController.getSmsSettings()` -> `PlatformOnboardingService.getSmsSettings()`
* **Backend Service / Controller Status:**
  * **Critical Contract Mismatch:** The component expects a JSON payload structured as `{ providers: [...], metrics: { activeSms, activeEmail, messagesSent, failedDeliveries } }`.
  * However, `PlatformOnboardingService.getSmsSettings()` returns a raw array of database rows from `platform_sms_providers` directly. Because the returned shape is an array and not an object containing a `providers` key, `data?.providers` evaluates to undefined. In production, this causes the table to display "No SMS providers configured." and all metric cards to display fallback zeroes.
* **UI Gaps (Dead Buttons / Mock Controls):**
  * `Add SMS Provider` button is a dead button.
  * Table row action `Edit` button is a dead button.
  * `Email Providers` and `Delivery Logs` tabs display static texts (`"No email providers configured."`, `"No recent delivery logs."`) with no API calls or actions.
* **Database Schema Gaps:**
  * `PlatformSmsProviders` table exists, but it lacks a `balance` column (rendered by the UI) and has a `status` field expectation when the database has `is_active` boolean.

---

### 10. PrincipalInvitationsWorkspace
* **API Route(s) Called:**
  * `fetchPlatformSchools()`: GET `/api/platform/schools`
  * `resendPlatformSchoolAdminInvite(tenantId)`: POST `/api/platform/schools/:tenantId/admin-invite/resend`
* **Backend Cross-Reference:**
  * GET maps to `PlatformOnboardingController.listSchools()`.
  * POST maps to `PlatformOnboardingController.resendSchoolAdminInvite()`.
* **Backend Service / Controller Status:**
  * Fully implemented.
* **UI Gaps (Dead Buttons / Mock Controls):**
  * Table row action `Revoke` button is a dead button.
  * "Invite Principal" modal form submission calls `preventDefault()` and closes without backend integration.
* **Database Schema Gaps:**
  * None.

---

### 11. SecurityPoliciesWorkspace
* **API Route(s) Called:**
  * GET `/api/platform/security-policies` (via `useQuery`)
  * `createPlatformSecurityPolicy(input)`: POST `/api/platform/security-policies`
* **Backend Cross-Reference:**
  * GET maps to `PlatformOnboardingController.getSecurityPolicies()` -> `PlatformOnboardingService.getSecurityPolicies()`
  * POST `/api/platform/security-policies` is **MISSING** from `PlatformOnboardingController`.
* **Backend Service / Controller Status:**
  * `PlatformOnboardingService.getSecurityPolicies()` is a stub that returns `[]`.
  * POST endpoint is missing.
* **UI Gaps (Dead Buttons / Mock Controls):**
  * Login Security tab: `Save Policies` button is a dead button.
  * MFA Status tab: `Enforce MFA Globally` button and table row action `Reset MFA` button are dead buttons.
  * Checkboxes for password policies are stateless inputs, not connected to any saving state or submit.
  * Tabs "Active Sessions" and "Support Access" display static mock texts with no actions or data fetching.
* **Database Schema Gaps:**
  * There is no model or table in `prisma/schema.prisma` for global password policies or security configurations.

---

### 12. SettingsWorkspace
* **API Route(s) Called:**
  * `fetchPlatformSettings()`: GET `/api/platform/settings`
  * `updatePlatformSettings(input)`: PUT `/api/platform/settings`
* **Backend Cross-Reference:**
  * GET maps to `PlatformOnboardingController.getSettings()` -> `PlatformOnboardingService.getSettings()`
  * PUT `/api/platform/settings` is **MISSING** from `PlatformOnboardingController`.
* **Backend Service / Controller Status:**
  * `PlatformOnboardingService.getSettings()` is a stub that returns `[]`.
  * PUT endpoint is missing.
* **UI Gaps (Dead Buttons / Mock Controls):**
  * Setting `maintenanceMode` via prompt only sets local state and does not trigger an immediate backend save.
* **Database Schema Gaps:**
  * There is no model or table for global platform settings in `prisma/schema.prisma`.

---

### 13. SetupProgressWorkspace
* **API Route(s) Called:**
  * `fetchPlatformSchools()`: GET `/api/platform/schools`
* **Backend Cross-Reference:**
  * GET maps to `PlatformOnboardingController.listSchools()`.
* **Backend Service / Controller Status:**
  * Fully implemented.
* **UI Gaps (Dead Buttons / Mock Controls):**
  * Table row actions `View Checklist` and `Send Reminder` are dead buttons.
  * Metrics cards (Setup Complete, Setup Incomplete, No Academic Year, No Staff Invited, No Students, No Fee Structure) are hardcoded using static numbers or school array length.
  * Table columns (`principal`, `schoolProfile`, `academicSetup`, `staffSetup`, `studentSetup`, `financeSetup`, `overallProgress`) are hardcoded to `"Pending"`, `"Complete"`, `"10%"`, etc.
* **Database Schema Gaps:**
  * None.

---

### 14. TemplatesCenterWorkspace
* **API Route(s) Called:**
  * `fetchPlatformTemplates()`: GET `/api/platform/templates`
  * `createPlatformTemplate(input)`: POST `/api/platform/templates`
* **Backend Cross-Reference:**
  * GET maps to `PlatformOnboardingController.getTemplates()` -> `PlatformOnboardingService.getTemplates()`
  * POST `/api/platform/templates` is **MISSING** from `PlatformOnboardingController`.
* **Backend Service / Controller Status:**
  * `PlatformOnboardingService.getTemplates()` is a stub that returns `[]`.
  * POST endpoint is missing.
* **UI Gaps (Dead Buttons / Mock Controls):**
  * Table row actions `Edit HTML/CSS`, `Duplicate`, and `Trash` are dead buttons.
* **Database Schema Gaps:**
  * No template table/model exists in `prisma/schema.prisma` for platform-wide report/invoice HTML templates.

---

### 15. TenantHealthWorkspace
* **API Route(s) Called:**
  * `fetchApiObservabilityHealth()`: GET `/observability/health` -> resolves to `/api/observability/health`
  * `fetchApiObservabilityAlerts()`: GET `/observability/alerts` -> resolves to `/api/observability/alerts`
* **Backend Cross-Reference:**
  * GET `/observability/health` maps to `ObservabilityController.getHealth()` -> `SloMonitoringService.getRealtimeHealth()`
  * GET `/observability/alerts` maps to `ObservabilityController.getAlerts()` -> `SloMonitoringService.getAlerts()`
* **Backend Service / Controller Status:**
  * Fully implemented, returning real-time SLO metrics.
* **Contract / Data Model Mismatch:**
  * **Severe Mismatch in Metric Cards:** The UI displays `health?.failed_jobs`, `health?.sync_queue`, `health?.pending_emails`, `health?.pending_sms`, and `health?.api_errors_1h`.
  * However, `getRealtimeHealth()` returns `generated_at`, `overall_status`, `active_alert_count`, `critical_alert_count`, and `subsystem_statuses`. It does not contain any of the queue/job count properties. In production, these health metric cards will display `0`.
  * **Severe Mismatch in Alerts Log Table:** The table columns expect `timestamp` (renders `row.timestamp`), `tenant_id` (renders `row.tenant_id`), `service` (renders `row.service`), `error_type` (renders `row.error_type`), and `count` (renders `row.count`).
  * However, `ObservabilityAlert` only has properties `id`, `subsystem`, `severity`, `title`, `message`, and `triggered_at`. The missing properties cause columns to render static fallback values: "Platform", "Background Jobs", "Timeout", "1", and the current time.
* **UI Gaps (Dead Buttons / Mock Controls):**
  * Table row action `View Log` button is a dead button.
* **Database Schema Gaps:**
  * System health logs and SLO records are managed by memory/service layers. No specific database gaps, but structural contract issues are present.

---

### 16. UsersWorkspace
* **API Route(s) Called:**
  * `fetchPlatformUsers()`: GET `/api/platform/users`
* **Backend Cross-Reference:**
  * GET maps to `PlatformOnboardingController.getUsers()` -> `PlatformOnboardingService.getUsers()`
* **Backend Service / Controller Status:**
  * Implemented. Runs: `SELECT id, email, display_name, status, created_at FROM users ORDER BY created_at DESC LIMIT 100`.
* **Contract / Data Model Mismatch:**
  * **Severe Mismatch:** The table columns render `row.name` (expects database `name` field, but DB returns `display_name`), `row.role` (expects database `role` field, which is not queried in the SELECT statement), and `row.lastActive` (expects database `lastActive` field, which is not queried in the SELECT statement). This renders username and role columns as empty/blank in the table.
* **UI Gaps (Dead Buttons / Mock Controls):**
  * Header button `Invite Platform User` is a dead button.
  * Table row actions `Edit Roles`, `Suspend`, and `View Activity` are dead buttons.
* **Database Schema Gaps:**
  * **Out-of-Sync Prisma Model:** The `User` model in `prisma/schema.prisma` defines `fullName String @map("full_name")`, but the NestJS service runs raw SQL querying `display_name`. The actual database schema uses `display_name` (as defined in `auth-schema.service.ts`), meaning the Prisma schema file is out-of-sync with the real database table.

---

## Database Schema Gaps & Inconsistencies Summary

1. **Prisma Schema Out of Sync:** The `User` model in `schema.prisma` is out of sync with the actual database columns (e.g. mapping `fullName` to `full_name` when the raw SQL queries and DB schemas rely on `display_name`).
2. **Missing Platform Settings Table:** No global table exists for platform-level configurations like system name, support email, maintenance mode, or default country settings.
3. **Missing Platform Templates Table:** No database schema backing exists for storing platform-wide report card, receipt, and certificate HTML/CSS templates.
4. **Missing Platform Broadcasts Table:** No global broadcast table exists; the current `communication_broadcasts` table is school-scoped, leaving system-wide notifications unpersisted.
5. **Missing Platform Backup History Table:** No model exists for tracking database backup logs, sizes, or statuses.
6. **Missing Security Policies Table:** No model exists to persist global password strength rules or MFA configurations.
7. **Missing Global Payment Gateway Table:** Configured gateways are queried from tenant-scoped `tenant_payment_channels` table rather than a dedicated global gateway register.
