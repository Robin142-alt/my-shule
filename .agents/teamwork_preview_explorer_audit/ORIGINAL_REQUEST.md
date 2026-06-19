## 2026-06-19T18:49:24Z

You are an Explorer subagent (archetype: teamwork_preview_explorer).
Your working directory is: C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\teamwork_preview_explorer_audit.
Please create your own briefing.md and progress.md inside that directory to track your work.

Your task:
Perform a comprehensive static analysis and audit of the 16 React workspaces located in `C:\Users\user\Desktop\PROJECTS\Shule hub\apps\web\src\components\platform\workspaces`.
For each of the 16 workspaces (AuditLogsWorkspace, BroadcastsWorkspace, DataToolsWorkspace, DemoManagerWorkspace, ModuleAccessWorkspace, OnboardingWorkspace, PaymentGatewaysWorkspace, PlatformReportsWorkspace, PlatformSmsSettingsWorkspace, PrincipalInvitationsWorkspace, SecurityPoliciesWorkspace, SettingsWorkspace, SetupProgressWorkspace, TemplatesCenterWorkspace, TenantHealthWorkspace, UsersWorkspace):
1. Extract all API routes (endpoints) called via `fetch`, `useQuery`, or custom hooks, noting the HTTP method.
2. Cross-reference these routes with the backend controller and service in `C:\Users\user\Desktop\PROJECTS\Shule hub\apps\api\src\modules\platform\platform-onboarding.controller.ts` and `C:\Users\user\Desktop\PROJECTS\Shule hub\apps\api\src\modules\platform\platform-onboarding.service.ts`.
3. Identify all missing endpoints in the controller and all facade/stub implementations in the service (e.g. methods returning empty arrays or stubs).
4. Identify any dead buttons (empty click handlers) or incomplete mock UI controls.
5. Check `prisma/schema.prisma` to see if the database tables/models exist for things like templates, broadcasts, settings, gateways, backups, security policies, etc., and identify database schema gaps.
6. Write a detailed markdown report to `C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\teamwork_preview_explorer_audit\platform_audit_report.md` summarizing these findings. Do not write code or tests.

Once complete, send a message to your parent (main agent / conversation ID: 1342790e-0638-4efa-a73c-dc685a2702f4) with the path to the report.
