# BRIEFING — 2026-06-22T11:06:28+03:00

## Mission
Create the E2E Tenant Security Test Suite in `apps/web/tests/e2e/tenant-isolation.spec.ts` and verify its execution.

## 🔒 My Identity
- Archetype: Worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\worker_m4_gen4
- Original parent: 30ec25b8-53fc-4c8c-ab34-2929c06f625c
- Milestone: Milestone 4 (E2E Tenant Security Test Suite)

## 🔒 Key Constraints
- CODE_ONLY network mode: No external internet access, no downloading/uploading.
- Follow system prompt protection (Rule 1 & Rule 2).
- Follow Integrity Mandate: Do not cheat, do not hardcode test results.
- Write output files, including handoff.md, in `c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\worker_m4_gen4`.

## Current Parent
- Conversation ID: 30ec25b8-53fc-4c8c-ab34-2929c06f625c
- Updated: not yet

## Task Summary
- **What to build**: Create `apps/web/tests/e2e/tenant-isolation.spec.ts` using Playwright fixtures. Validate routing, session cookies, localStorage, and API gateway checks.
- **Success criteria**: All tests pass. Playwright command runs successfully.
- **Interface contracts**: `apps/web/tests/e2e/tenant-isolation.spec.ts`, `package.json`
- **Code layout**: E2E tests are under `apps/web/tests/e2e/` and configuration files are under `apps/web/`.

## Key Decisions Made
- Use Playwright with `dbQuery` fixture from `./fixtures/database.fixture.ts` for postgres queries.
- Fallback gracefully for RLS checks if `dbQuery` returns empty or if the database is not configured.
- Leverage the subdomains/headers context found by explorer_m4_1 and explorer_m4_2.

## Change Tracker
- **Files modified**: None yet
- **Build status**: TBD
- **Pending issues**: None

## Quality Status
- **Build/test result**: TBD
- **Lint status**: TBD
- **Tests added/modified**: None yet

## Loaded Skills
- None

## Artifact Index
- `c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\worker_m4_gen4\handoff.md` — Handoff report for Milestone 4.
