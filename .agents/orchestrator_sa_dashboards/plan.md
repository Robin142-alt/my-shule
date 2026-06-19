# Plan - Super Admin Dashboards Phase

This plan details the steps to fully operationalize the 16 platform-level workspaces in the Super Admin Dashboard.

## Identified Gaps & Remediation Strategy

We will address the workspaces by grouping them into milestones based on complexity and dependencies:

### Milestone 1: Database Schema & Core Tables Bootstrap
- **Gaps**: Missing tables/models for global backups, global broadcasts, templates, settings, and security policies. Inconsistent `User` model column casing (`display_name` vs `fullName` mappings).
- **Remediation**:
  - Update `prisma/schema.prisma` or create a database schema service (e.g. `PlatformSchemaService`) to boot the required platform-level tables programmatically:
    - `platform_broadcasts`: id, subject, target, message, status, scheduled_for, created_at, updated_at
    - `platform_templates`: id, name, type, status, html_content, css_content, created_at, updated_at
    - `platform_backups`: id, backup_name, size, status, last_backup, created_at, updated_at
    - `platform_security_policies`: id, require12Chars, requireSpecialChars, force90DayReset, created_at, updated_at
    - `platform_settings`: id, maintenanceMode, created_at, updated_at
  - Align database mappings for `User` to ensure `display_name` is correctly integrated.

### Milestone 2: API Endpoints & NestJS Controller Wiring
- **Gaps**: Missing POST, PUT, DELETE endpoints for templates, settings, security policies, broadcasts, backups. Service methods currently return empty arrays (`[]`) or mock tokens.
- **Remediation**:
  - Implement NestJS endpoints in `PlatformOnboardingController`:
    - POST `/api/platform/broadcasts` (create global broadcast)
    - DELETE `/api/platform/broadcasts/:id` (retract broadcast)
    - POST `/api/platform/templates` (create html template)
    - DELETE `/api/platform/templates/:id` (delete template)
    - POST `/api/platform/security-policies` (save global password/MFA rules)
    - PUT `/api/platform/settings` (save global system settings)
    - POST `/api/platform/backups` (trigger db backup)
  - Ensure all endpoints are protected with strict `@Roles(SUPERADMIN_ROLE_OWNER)` authorization guards.
  - Implement real Prisma-backed business logic in `PlatformOnboardingService` for:
    - `getSmsSettings`: Return object with shape `{ providers: [...], metrics: { activeSms, activeEmail, messagesSent, failedDeliveries } }`.
    - `getSecurityPolicies`: Fetch current row from `platform_security_policies`.
    - `getTemplates`: Fetch all from `platform_templates`.
    - `getBroadcasts`: Fetch all from `platform_broadcasts`.
    - `getAuditLogs`: Return logs with properties matched to UI (`timestamp`, `actor`, `action`, `target`, `details`).
    - `getBackups`: Fetch all from `platform_backups`.
    - `getReports`: Return reports mapped correctly to UI columns (`reportName`, `date`, `status`).
    - `getUsers`: Return user records mapped to UI columns (`name` mapped from `display_name` / `email`, `role`, `lastActive`).
    - `getSettings`: Return global settings object.
    - `getGateways`: Fetch all from `tenant_payment_channels`.

### Milestone 3: Frontend Workspaces Refactoring & API Integration
- **Gaps**: Many workspaces are disconnected from the API, contain dead buttons, or fail due to contract mismatches (e.g. mapping `school_name` vs `schoolName`, or expecting a `providers` field but receiving a raw array).
- **Remediation**:
  - Refactor components in `apps/web/src/components/platform/workspaces`:
    - **AuditLogsWorkspace**: Keep UI intact, verify table parses columns correctly.
    - **BroadcastsWorkspace**: Wire retract action, verify submit.
    - **DataToolsWorkspace**: Add click handler for "Trigger Backup" calling POST `/api/platform/backups`, render rows dynamically.
    - **DemoManagerWorkspace**: Correct data mapping for schools (mapping backend properties like `tenant_id` to `id` and `school_name` to `schoolName` so delete/reset actions work).
    - **ModuleAccessWorkspace**: Integrate actual module fetching (`fetchPlatformSchoolModules`) and saving (`updatePlatformSchoolModules`). Wire up the checklist toggles and the save button.
    - **OnboardingWorkspace**: Map school columns correctly.
    - **PaymentGatewaysWorkspace**: Wire the modal submission to save payment channels.
    - **PlatformReportsWorkspace**: Align reports mapping.
    - **PlatformSmsSettingsWorkspace**: Align table with the backend metric + provider response shape. Wire up provider addition/editing.
    - **PrincipalInvitationsWorkspace**: Map school columns correctly.
    - **SecurityPoliciesWorkspace**: Connect form settings checkboxes to save action calling POST `/api/platform/security-policies`.
    - **SettingsWorkspace**: Connect maintenance mode toggle to PUT `/api/platform/settings`.
    - **SetupProgressWorkspace**: Map school columns correctly.
    - **TemplatesCenterWorkspace**: Wire add/edit/delete template actions.
    - **TenantHealthWorkspace**: Align health metrics and alerts columns.
    - **UsersWorkspace**: Map user fields correctly.

### Milestone 4: Verification & E2E Validation
- **Gaps**: Ensure no TypeScript/Next.js/NestJS compile errors and check correctness of all Super Admin pages.
- **Remediation**:
  - Run `npm run build` in `apps/api` and `apps/web`.
  - Validate that the Super Admin dashboard functions perfectly without console errors.
