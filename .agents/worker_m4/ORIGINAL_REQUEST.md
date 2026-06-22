## 2026-06-20T18:18:19Z

Your task is to implement Milestone 4: UI Completeness, Forms, & Workflows.
Read `myshule_optimization_audit.md` Section 3 for details.

Specifically:
1. Replace raw browser `prompt()` calls with validated React modals using React Hook Form and existing modal components in:
   - Storekeeper workspace (`damaged-missing-workspace.tsx`, `items-workspace.tsx`, `requests-workspace.tsx`, `stocktake-workspace.tsx`).
   - Admin staff records (`admin/staff-records-workspace.tsx`).
   - Deputy timetable relief (`timetable-relief-workspace.tsx`).
   - Exams moderation (`moderation-workspace.tsx`).
   - Medicine stock adjustment (`medicine-inventory-workspace.tsx`).
2. Connect hardcoded dashboard components to dynamic API/database queries:
   - Nurse Command Center (`apps/web/src/components/school/nurse-command-center.tsx`).
   - Discipline Master workspaces (`apps/web/src/components/school/discipline-master/...`).
   - Student activity dashboard (`apps/web/src/components/school/student-command-center.tsx`).
3. Wire up dead UI buttons and uncomment backend API calls:
   - Setup/Sync/Print buttons in `exam-calendar-workspace.tsx`.
   - Bulk Invoicing button in `apps/web/src/components/school/accountant/invoices-workspace.tsx`.
   - Uncomment the backend API call to `/admin-command/exams/cycles` in `exams-reports-workspace.tsx`.
4. Offline sync indicators & messages:
   - Add WiFi/Sync offline queue indicators to the Topbar of Class Teacher dashboard (`class-teacher-command-center.tsx`).
   - Fix immediate fake success alerts on saving discipline cases while offline in `class-teacher/workspaces/discipline.tsx` to indicate it is queued.
5. Replace fake printing / window.print() bypasses with actual backend PDF/CSV blob downloads:
   - Reports Center (`apps/web/src/components/school/admin/reports-workspace.tsx`).
   - Print Overlay (`apps/web/src/lib/dashboard/export.ts`).
   - Report Card Preview (`apps/web/src/components/modules/exams/exams-module-screen.tsx`).

Your working directory is `.agents/worker_m4/`. You must write all coordination/progress updates to `.agents/worker_m4/progress.md`.
Document your changes in `.agents/worker_m4/handoff.md` when done.

MANDATORY INTEGRITY WARNING — DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## 2026-06-22T06:22:55Z

You are a Worker subagent under Milestone 4 — E2E Tenant Security Test Suite.
Your task is to:
1. Create `apps/web/tests/e2e/tenant-isolation.spec.ts`.
2. Write a comprehensive Playwright test suite verifying:
   - Unauthenticated access to dashboard redirects to login.
   - Unauthenticated access to school subdomain root routes to public tenant page (e.g. `/school/barakaacademy` or similar page.tsx rendering).
   - Authorized principal session successfully accesses dashboard on the matching subdomain.
   - Mismatched subdomain access forces redirect to login (cross-tenant prevention).
   - Role-locked school routes enforce redirect to forbidden (e.g., principal accessing `/inventory/dashboard`).
   - Authorized role-locked routes load successfully (e.g., storekeeper accessing `/inventory/dashboard`).
   - Sensitive session keys are not stored or leaked in localStorage.
   - Direct API isolation: GET `/api/students`, `/api/finance/summary`, and `/api/attendance` return 401 Unauthorized when no session is present.
   - Logged-in Accountant cannot access another school via tenantSlug swap (e.g., GET `/api/finance/summary?tenantSlug=another-school` returns 401).
   - Logged-in Accountant requesting a foreign student ID receives a 404 (RLS protection, query DB using dbQuery to find a student with a different tenant_id).
3. If necessary, check if we need to configure or add anything to package.json scripts (e.g., E2E script bindings).
4. Run playwright tests to verify that the newly created test suite runs and passes. Note: the app port is 3005, and tests can run with `npx playwright test tests/e2e/tenant-isolation.spec.ts -c playwright.config.ts`.
5. Report your work, modified files, and test results back to the sub-orchestrator.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

