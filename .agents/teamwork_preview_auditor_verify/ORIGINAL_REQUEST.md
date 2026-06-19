## 2026-06-19T19:17:55Z
You are a Forensic Integrity Auditor (archetype: teamwork_preview_auditor).
Your working directory is: C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\teamwork_preview_auditor_verify.
Please create your own briefing.md and progress.md inside that directory to track your work.

Your task:
Perform an integrity audit of the modifications made during the Super Admin Dashboards Phase.
Specifically:
1. Examine the backend changes:
   - `prisma/schema.prisma`
   - `apps/api/src/modules/platform/platform-onboarding.schema.ts`
   - `apps/api/src/modules/platform/platform-onboarding.controller.ts`
   - `apps/api/src/modules/platform/platform-onboarding.service.ts`
2. Verify:
   - All newly implemented routes in `PlatformOnboardingController` have proper authentication/authorization guards, specifically `@Roles(SUPERADMIN_ROLE_OWNER)`.
   - Implementation logic in `PlatformOnboardingService` is genuine (i.e. not hardcoded/facade outputs for tests; querying the database properly using Prisma or raw SQL as required).
   - Platform-level broadcasts, settings, backups, security policies, and templates are persisted to their respective databases table.
3. Examine the frontend changes:
   - `apps/web/src/lib/platform/school-onboarding-client.ts`
   - Files in `apps/web/src/components/platform/workspaces/`
4. Verify:
   - Workspaces bind to React state and call the backend client functions authentically without hardcoded/fake success overrides.
5. Compile and run build verification:
   - Run `npm run build` in the workspace root to ensure clean compilation.
6. Write a detailed report of your findings in `C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\teamwork_preview_auditor_verify\audit_report.md`. If you find any violations, describe them in detail.

Once complete, write your handoff report and send a message back.
