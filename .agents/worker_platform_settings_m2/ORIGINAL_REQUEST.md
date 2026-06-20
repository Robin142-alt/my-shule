## 2026-06-20T12:20:12Z
You are teamwork_preview_worker. Your working directory is c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\worker_platform_settings_m2.
Your task is to implement global maintenance mode enforcement in the NestJS backend.

### R1. Implement MaintenanceModeGuard
1. Create `apps/api/src/guards/maintenance-mode.guard.ts`. It must implement `CanActivate` and perform the following checks:
   - Allow requests if they are public (checked using the `Reflector` for `IS_PUBLIC_KEY` = `'isPublic'`).
   - Allow requests if they use `OPTIONS` method.
   - Allow requests to platform management, onboarding, and health routes (e.g. if the path starts with `/api/platform`, `/platform`, or contains `/health`).
   - Query platform settings using `PlatformOnboardingService.getSettings()`.
   - If `maintenanceMode` is true:
     - Allow request if the user's role in request context is `'platform_owner'` (defined as `SUPERADMIN_ROLE_OWNER` in `apps/api/src/auth/auth.constants.ts`).
     - Otherwise, block request by throwing a `ServiceUnavailableException` (HTTP 503) containing the configured maintenance message (or a fallback message if it is empty/missing).

2. Register `MaintenanceModeGuard` globally in `apps/api/src/app.module.ts`:
   - Register the guard under providers:
     ```typescript
     {
       provide: APP_GUARD,
       useClass: JwtAuthGuard,
     },
     {
       provide: APP_GUARD,
       useClass: MaintenanceModeGuard,
     },
     ```
   - Make sure to import `MaintenanceModeGuard` at the top of `app.module.ts`.

### R2. Write Integration Test
Write a unit or integration test case to verify `MaintenanceModeGuard` works correctly.
- Add test coverage in `apps/api/src/modules/platform/platform-onboarding.service.test.ts` or create a new test file, OR add verification test assertions for the guard to verify:
  1. A request with `maintenanceMode = true` and role `'platform_owner'` is permitted.
  2. A request with `maintenanceMode = true` and role `'member'` or other role is blocked with `ServiceUnavailableException` (HTTP 503).
  3. A request with `maintenanceMode = false` is permitted.

### R3. Build and Verify
1. Run `npm run build` in the root workspace to compile the backend and frontend.
2. Run the platform tests (`node --test dist/apps/api/src/modules/platform/platform-onboarding.service.test.js`) to verify all tests pass.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your handoff report to `c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\worker_platform_settings_m2\handoff.md` and notify when you're done.
