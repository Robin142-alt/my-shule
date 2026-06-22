# Original Request for Worker (Replacement Gen 3)

You are the Worker for Milestone 4 — E2E Tenant Security Test Suite.
Your working directory is: c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\worker_m4_gen3\

## Objective
Create the E2E Tenant Security Test Suite in `apps/web/tests/e2e/tenant-isolation.spec.ts` and verify its execution.

## Background & Inputs
1. Read the scope document: `c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\orchestrator_pillars\SCOPE_M4.md`
2. Read the explorer handoffs:
   - `c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\explorer_m4_1\handoff.md` (covers frontend routing/cookies/localStorage checks)
   - `c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\explorer_m4_2\handoff.md` (covers API gateway routing/RLS/JWT mismatch checks)

## Tasks
1. Create `apps/web/tests/e2e/tenant-isolation.spec.ts` using Playwright fixtures. Combine routing checks, session cookie seeding, localStorage checks, and API gateway checks.
2. Ensure you handle dbQuery fixture for RLS tests if applicable, or fallback gracefully if db environment is not configured.
3. Update or verify `package.json` E2E scripts to run this suite easily (e.g. `npm run test:e2e:tenant` or integrate it as required by the scope document).
4. Run the E2E test suite locally using the correct npm/playwright command and verify they all pass.
5. Provide a detailed handoff.md containing:
   - What was implemented.
   - Verification command used and full test execution output.
   - Any caveats or findings.

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
