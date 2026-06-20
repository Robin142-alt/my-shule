## 2026-06-20T11:55:29Z
You are teamwork_preview_explorer. Your working directory is c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\explorer_platform_settings.
Your mission is to perform a detailed read-only exploration of the codebase to prepare for implementing platform settings persistence and global maintenance mode.

Please investigate and report on:
1. The current database structure and Prisma schema for platform_settings.
2. The current backend routes and implementation in apps/api/src/modules/platform/platform-onboarding.controller.ts and platform-onboarding.service.ts. Note how they query/mutate settings, particularly if they use Prisma or raw SQL (executeSql).
3. The existing auth guards, controllers, and middleware in NestJS (apps/api) to understand where and how to integrate the global maintenance mode check.
   - Look for guards like TenantGuard, RolesGuard, AuthGuard, or a global middleware.
   - Verify how the "Super Admin" role is identified on a request (e.g. check request.user, req.headers, or auth decorator).
4. The exact state of apps/web/src/components/platform/workspaces/SettingsWorkspace.tsx and its alignment with the backend settings API. Are there any validation gaps or mismatching fields?
5. The build and test scripts. How can a worker compile and verify backend changes?

Write your findings to c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\explorer_platform_settings\handoff.md and notify me when you are done.
