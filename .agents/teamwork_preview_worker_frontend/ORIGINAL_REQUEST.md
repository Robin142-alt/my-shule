## 2026-06-19T19:12:50Z
Please create your own briefing.md and progress.md inside that directory to track your work.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task is to refactor the React frontend files to fully operationalize all platform-level workspaces in the Super Admin dashboard, connect them to real NestJS backend APIs, and verify that the system compiles successfully.

Please perform the following operations:

1. Update `apps/web/src/lib/platform/school-onboarding-client.ts`:
   - Verify existing exports: `fetchPlatformTemplates`, `fetchPlatformBroadcasts`, `fetchPlatformAuditLogs`, `fetchPlatformBackups`, `fetchPlatformSecurityPolicies`, `fetchPlatformReports`, `fetchPlatformUsers`, `fetchPlatformSettings`, `fetchPlatformPaymentGateways`, `createPlatformTemplate`, `createPlatformBroadcast`, `createPlatformSecurityPolicy`, `requestPlatformReport`, `updatePlatformSettings`.
   - Add and export these missing client wrapper functions:
     * `deletePlatformBroadcast(id: string)`: DELETE `/api/platform/broadcasts/${encodeURIComponent(id)}`
     * `deletePlatformTemplate(id: string)`: DELETE `/api/platform/templates/${encodeURIComponent(id)}`
     * `triggerPlatformBackup()`: POST `/api/platform/backups` with body `{}`
     * `updatePlatformSchoolModules(tenantId: string, moduleCodes: string[])`: PUT `/api/platform/schools/${encodeURIComponent(tenantId)}/modules` with JSON body `{ module_codes: moduleCodes }`

2. Refactor React workspace files in `apps/web/src/components/platform/workspaces/`:
   - AuditLogsWorkspace.tsx: The backend `getAuditLogs()` returns columns with keys `timestamp`, `actor`, `action`, `target`, and `details` correctly. Verify the table binds and renders them properly.
   - BroadcastsWorkspace.tsx: Bind "Create Broadcast" dialog form inputs (subject, target, message) to React state. Wire the "Save" mutation to call `createPlatformBroadcast` and call `mutate` / query invalidation. Wire the row "Retract" button to call `deletePlatformBroadcast(id)` and invalidate the workspace query to refresh the list.
   - DataToolsWorkspace.tsx: Bind "Trigger Backup" header button to call `triggerPlatformBackup()` and refresh/invalidate the backups query. Render table rows dynamically using fetched backup rows mapping `{ backupName, size, status, lastBackup }`.
   - DemoManagerWorkspace.tsx: Fix mapping of school data properties (backend returns `tenant_id` which must map to `id`, and `school_name` to `schoolName` so table rows and reset/purge actions resolve correctly instead of undefined). Ensure the delete action calls the actual `hardDeletePlatformSchool` API function.
   - ModuleAccessWorkspace.tsx: Integrate actual module fetching (`fetchPlatformSchoolModules(tenant.id)`) and saving (`updatePlatformSchoolModules(tenant.id, moduleCodes)`). Bind checklist checkbox inputs to React state, and save changes upon clicking "Save Modules" (invalidating the workspace data).
   - OnboardingWorkspace.tsx: Map school columns correctly (`tenant_id` to `id`, `school_name` to `schoolName`).
   - PaymentGatewaysWorkspace.tsx: Align columns. Wire modal submission (if any) or edit/add actions correctly if endpoints exist, or verify default payment channel display.
   - PlatformReportsWorkspace.tsx: Ensure table columns `reportName` (maps to `row.reportName`), `date` (maps to `row.date`), and `status` (maps to `row.status`) render backend data correctly. Wire "Request Report" to call `requestPlatformReport`.
   - PlatformSmsSettingsWorkspace.tsx: Ensure it handles response shape `{ providers: [...], metrics: { activeSms, activeEmail, messagesSent, failedDeliveries } }` returned by backend `getSmsSettings()`. Populate metric cards dynamically and render providers in the table correctly.
   - PrincipalInvitationsWorkspace.tsx: Map school columns correctly (`tenant_id` to `id`, `school_name` to `schoolName`). Ensure the "Resend Invite" row action calls `resendPlatformSchoolAdminInvite(id)`.
   - SecurityPoliciesWorkspace.tsx: Bind checkboxes to React state. Ensure `Save Policies` calls `createPlatformSecurityPolicy` with selected toggles and shows a success toast.
   - SettingsWorkspace.tsx: Bind maintenance mode checkbox/toggle to React state. Connect maintenance mode change to call `updatePlatformSettings` and show toast.
   - SetupProgressWorkspace.tsx: Map school columns correctly.
   - TemplatesCenterWorkspace.tsx: Wire the row "Trash" action to call `deletePlatformTemplate(id)`. Wire the "Create Template" dialog form inputs (name, type, htmlContent, cssContent) to React state and call `createPlatformTemplate` on submit. Invalidate queries to refresh templates list.
   - TenantHealthWorkspace.tsx: Update columns to match backend alert structure (`row.timestamp` -> `row.triggered_at || row.last_evaluated_at`, `row.service` -> `row.subsystem`, `row.error_type` -> `row.severity`). If needed, fetch `/api/observability/metrics` (or add a fetch helper) to map live metrics card totals (like failed background jobs or api errors count) dynamically.
   - UsersWorkspace.tsx: Resolve property mismatches (the backend returns mapped fields: `id`, `name`, `role`, `status`, `lastActive`). Verify DataTable renders columns `name`, `role`, `status`, `lastActive` dynamically.

3. Run compilation check:
   - Run `npm run build` in the workspace root or `npm run build` in `apps/web` to verify everything compiles cleanly with no typescript errors.
