## 2026-06-19T18:58:22Z
Implement the database schema adjustments and backend controller/service logic for the Super Admin dashboard platform-level features.

1. DB Schema & Bootstrap (Milestone 1):
   - Update `C:\Users\user\Desktop\PROJECTS\Shule hub\prisma\schema.prisma` to include the following mapped models at the end of the file:
     * `PlatformBroadcasts` (table: `platform_broadcasts`) with columns: id (uuid, pk), subject (String), target (String), message (String), status (String, default "Sent"), scheduled_for (String, default "Immediate"), created_at (DateTime), updated_at (DateTime).
     * `PlatformTemplates` (table: `platform_templates`) with columns: id (uuid, pk), name (String), type (String), status (String, default "Active"), html_content (String?), css_content (String?), created_at (DateTime), updated_at (DateTime).
     * `PlatformBackups` (table: `platform_backups`) with columns: id (uuid, pk), backup_name (String), size (String), status (String, default "Pending"), last_backup (DateTime), created_at (DateTime), updated_at (DateTime).
     * `PlatformSecurityPolicies` (table: `platform_security_policies`) with columns: id (uuid, pk), require_12_chars (Boolean), require_special_chars (Boolean), force_90_day_reset (Boolean), created_at (DateTime), updated_at (DateTime).
     * `PlatformSettings` (table: `platform_settings`) with columns: id (uuid, pk), maintenance_mode (Boolean), created_at (DateTime), updated_at (DateTime).
   - In `C:\Users\user\Desktop\PROJECTS\Shule hub\apps\api\src\modules\platform\platform-onboarding.schema.ts`, add the corresponding SQL tables creation statements, default record inserts (for settings and security policies), RLS policies (checking for 'platform_owner' role), triggers for updated_at, and indices.

2. NestJS Controller and Service Implementation (Milestone 2):
   - In `C:\Users\user\Desktop\PROJECTS\Shule hub\apps\api\src\modules\platform\platform-onboarding.controller.ts`, implement the missing routes:
     * `@Post('broadcasts')` -> `createBroadcast(@Body() body: any)`
     * `@Delete('broadcasts/:id')` -> `deleteBroadcast(@Param('id') id: string)`
     * `@Post('templates')` -> `createTemplate(@Body() body: any)`
     * `@Delete('templates/:id')` -> `deleteTemplate(@Param('id') id: string)`
     * `@Post('security-policies')` -> `createSecurityPolicy(@Body() body: any)`
     * `@Put('settings')` -> `updateSettings(@Body() body: any)`
     * `@Post('backups')` -> `triggerBackup(@Body() body: any)`
   - In `C:\Users\user\Desktop\PROJECTS\Shule hub\apps\api\src\modules\platform\platform-onboarding.service.ts`, implement the Prisma-backed service methods:
     * `getSmsSettings()`: Return the shape expected by the frontend: `{ providers: PlatformSmsProvider[], metrics: { activeSms, activeEmail, messagesSent, failedDeliveries } }`. Active/inactive providers should map their status from `is_active`.
     * `getSecurityPolicies()`: Select the latest policy from `platform_security_policies`. If none exists, insert and return a default one.
     * `getTemplates()`: Fetch all templates from `platform_templates`.
     * `createTemplate(body)`: Save a new template.
     * `deleteTemplate(id)`: Delete template by ID.
     * `getBroadcasts()`: Fetch all broadcasts from `platform_broadcasts`.
     * `createBroadcast(body)`: Save a new broadcast (emit event/log for audibility).
     * `deleteBroadcast(id)`: Delete/retract broadcast by ID.
     * `getAuditLogs()`: Join `users` table to return `{ timestamp, actor, action, target, details }` matching what the frontend DataTable expects.
     * `getBackups()`: Fetch all backups from `platform_backups`.
     * `triggerBackup(body)`: Create a new backup log entry (e.g. `backup_name: "Backup-" + timestamp`, `size: "45.2 MB"`, `status: "Success"`).
     * `getReports()`: Map table columns to match DataTable fields: `reportName` (from `title`), `date` (from `created_at`), and `status` (from a default or dynamic value).
     * `getUsers()`: Map raw query users to DataTable columns: `name` (from `display_name`), `role` (virtual/resolved from memberships or default 'Staff'), `lastActive`.
     * `getSettings()`: Get global settings.
     * `updateSettings(body)`: Save global platform settings.
     * `getGateways()`: Select from `tenant_payment_channels`.

3. Compilation and Build:
   - Run `npm run prisma:generate` to verify typings.
   - Run `npm run build` in `apps/api` to verify backend compiles correctly with zero errors.
