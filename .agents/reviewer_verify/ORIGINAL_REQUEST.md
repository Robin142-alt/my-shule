## 2026-06-19T05:13:22Z
You are a reviewer agent. Your working directory is C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\reviewer_verify\.
Your task is to review all the 19 administrative controller and service files under `apps/api/src/modules/admin-command/` that the worker created (listed in handoff at C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\worker_implement\handoff.md).
Specifically:
1. Examine code correctness, completeness, robustness, and interface conformance.
2. Verify that they extract the tenantId/schoolId from RequestContextService and enforce strict tenant isolation on database access.
3. Verify that raw queries / prisma commands are wrapped in try-catch blocks to safely fallback to mocks if schemas are missing.
4. Run compilation checks: `npm run typecheck` and `npm run build` in the workspace root to confirm everything compiles successfully.
5. Confirm Next.js frontend builds cleanly via `npm run web:build`.
6. Document your findings and verification results in a handoff report at C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\reviewer_verify\handoff.md and report back via send_message.
