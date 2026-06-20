## 2026-06-20T11:59:03Z
You are teamwork_preview_worker. Your working directory is c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\worker_platform_settings_m1.
Your task is to implement database settings persistence and update the platform settings backend.

### R1. Database Schema Update
1. Modify `prisma/schema.prisma` (around line 6961) to add the following fields to the `PlatformSettings` model:
   - `maintenanceMessage` (String?, map: `maintenance_message`)
   - `platformName` (String?, map: `platform_name`)
   - `platformTagline` (String?, map: `platform_tagline`)
   - `platformLogoUrl` (String?, map: `platform_logo_url`)
   - `supportEmail` (String?, map: `support_email`)
   - `supportPhone` (String?, map: `support_phone`)
   - `defaultAcademicYear` (String?, map: `default_academic_year`)
   - `defaultCountry` (String?, map: `default_country`)
   - `defaultTimezone` (String?, map: `default_timezone`)
   - `defaultGradingSystem` (String?, map: `default_grading_system`)
   - `defaultTermStructure` (String?, map: `default_term_structure`)
   - `allowSelfRegistration` (Boolean?, map: `allow_self_registration`)
   - `requireEmailVerification` (Boolean?, map: `require_email_verification`)
   - `autoAssignCoreModules` (Boolean?, map: `auto_assign_core_modules`)
   - `defaultTrialDays` (Int?, map: `default_trial_days`)
   - `sessionTimeoutMinutes` (Int?, map: `session_timeout_minutes`)
   - `maxLoginAttempts` (Int?, map: `max_login_attempts`)
   - `enforce2fa` (Boolean?, map: `enforce_2fa`)
   - `passwordMinLength` (Int?, map: `password_min_length`)
   - `passwordRequireSpecialChar` (Boolean?, map: `password_require_special_char`)
   - `emailSenderName` (String?, map: `email_sender_name`)
   - `emailSenderAddress` (String?, map: `email_sender_address`)
   - `emailProvider` (String?, map: `email_provider`)
   - `maxSchools` (Int?, map: `max_schools`)
   - `maxStudentsPerSchool` (Int?, map: `max_students_per_school`)
   - `maxStorageMbPerSchool` (Int?, map: `max_storage_mb_per_school`)

2. Run `npm run prisma:generate` to update the Prisma client.
3. Run `npx prisma db push --accept-data-loss` (or appropriate prisma db push / migrate command) to update the local database schema.

### R2. Backend Service Implementation
Update `apps/api/src/modules/platform/platform-onboarding.service.ts`:
1. Rewrite `getSettings()` to retrieve all platform settings fields using Prisma Client (e.g. `this.prisma.platformSettings.findFirst({ orderBy: { createdAt: 'desc' } })`). If no settings record exists, create one with `maintenanceMode: false` and return it. Ensure properties are returned in camelCase matching the frontend's needs.
2. Rewrite `updateSettings(body)` to update all settings fields using Prisma Client. If no record exists, create a new one.

### R3. Build and Verification
1. Run `npm run build` in the backend workspace to ensure everything compiles correctly.
2. Run the platform onboarding tests: `node --test dist/apps/api/src/modules/platform/platform-onboarding.service.test.js` to verify no regressions.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your handoff report to `c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\worker_platform_settings_m1\handoff.md` and notify when you're done.
