# Scope: Milestone 4 — E2E Tenant Security Test Suite (E2E Test Track)

## Architecture
- **Framework**: Playwright (configured in `apps/web/playwright.config.ts`).
- **Isolation Verification**: Opaque-box tests verifying that a user authenticated in Tenant A (e.g. schoolId A) is blocked from:
  1. Accessing frontend routes for Tenant B (e.g., swapping schoolId parameters in the URL).
  2. Accessing or querying backend APIs for Tenant B (intercepting calls and asserting failure responses).
  3. Hijacking sessions by modifying cookies or tenant headers.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Playwright Isolation Specs | Write `apps/web/tests/e2e/tenant-isolation.spec.ts` incorporating login helpers and direct routing checks. | None | PLANNED |
| 2 | Session Hijack Protection | Add checks verifying token rejection or immediate logout when cookies or headers are maliciously swapped. | M4.1 | PLANNED |
| 3 | Package JSON Integration | Bind `npm run test:e2e` to execute this isolation suite along with other E2E tests, verifying that exit codes are correct. | M4.2 | PLANNED |

## Interface Contracts & Test Assertions
- **Command**: `npm run test:e2e`
- **Expected Assertions**:
  - `page.goto('/school/admin?school_id=foreign-id')` redirects to `/login` or shows an access-denied page.
  - API calls containing unauthorized headers return status `401`, `403`, or `404`.

## Code Layout
- `apps/web/tests/e2e/tenant-isolation.spec.ts`
- `package.json`

## References
- Audit handoff: `c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\explorer_pillars_3\handoff.md`
