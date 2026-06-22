# BRIEFING — 2026-06-22T00:04:00+03:00

## Mission
Investigate frontend tenant separation, session storage, cookies/localStorage/URL parameters, request blocking, and propose a detailed E2E test strategy.

## 🔒 My Identity
- Archetype: Teamwork explorer
- Roles: Read-only investigator, analyzer, synthesizer
- Working directory: c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\explorer_m4_1
- Original parent: 1f190169-5f97-4eee-b600-52d243ca71e2
- Milestone: Tenant Separation & Session Storage Investigation

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Operational code must not be modified
- Report only via handoff.md and send_message

## Current Parent
- Conversation ID: 1f190169-5f97-4eee-b600-52d243ca71e2
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `apps/web/src/lib/auth/session-cookies.ts` - cookie names definition
  - `apps/web/src/lib/auth/server-session.ts` - session cookies set/clear/read helpers
  - `apps/web/src/lib/auth/experience-routing.ts` - subdomain host resolution, routing logic, tenant mismatch redirects
  - `apps/web/src/proxy.ts` - Next.js rewrite/redirect proxy execution middleware
  - `apps/web/src/lib/auth/auth-context.tsx` - client-side auth state initialization and local storage wipe
  - `apps/web/src/lib/auth/auth-guards.tsx` - react client-side route guards and login redirects
  - `apps/web/src/lib/auth/school-api-proxy.ts` & `src/lib/dashboard/server-api-proxy.ts` - server-side backend API proxies injecting `x-tenant-id` header
  - `apps/web/tests/design/experience-routing.test.ts` & `experience-separation.spec.ts` - routing tests, Playwright subdomain cookie injection
- **Key findings**:
  - Subdomains determine the school context (`tenantSlug`).
  - Active session tokens and roles are stored in `httpOnly` secure cookies, NOT local/session storage.
  - Mismatching tenant subdomains are intercepted and redirected to `/login`.
  - Role-based restricted folders (inventory/library) redirect to `/forbidden` if unauthorized.
  - Downstream requests pass through server proxies that read `myshule_tenant` and inject `x-tenant-id`.
- **Unexplored areas**: None. Codebase paths have been exhaustively trace-verified.

## Key Decisions Made
- Confirmed that Playwright allows subdomain cookie injection (`*.localhost:3005`) which supports writing clean E2E tests for tenant isolation.
- Structured E2E test plan for `tenant-isolation.spec.ts`.

## Artifact Index
- c:\Users\user\Desktop\PROJECTS\Shule hub\.agents\explorer_m4_1\handoff.md — Final investigation report
