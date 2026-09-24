# Dashboard role switching and database connection contention

## Evidence

Production `/auth/active-role` returned HTTP 500 on 2026-09-24 at 06:45:12 UTC after approximately 10 seconds. The stack trace showed the maintenance guard waiting for the Prisma connection pool while reading platform settings. The event dispatcher reported concurrent transaction-acquisition failures. Read-only PostgreSQL diagnostics showed all five API Prisma connections idle inside transactions, immediately after setting tenant context, without database lock blockers.

The shared Prisma wrapper opened another transaction for repository queries inside `withRequestTransaction` / `executeWithTenant`. Concurrent workflows could hold the entire pool while waiting for additional connections. Those nested writes also committed independently of their parent workflow.

## Changes

- Reuse the active Prisma transaction through async-local scope for nested repository queries and transaction wrappers. Reject attempts to change its school scope or use a completed transaction.
- Let SQL repositories join the active Prisma workflow transaction, keeping related writes on the same connection and rollback boundary.
- Keep live role authorization, permission reads, MFA enforcement, token rotation, and audit recording. Remove catalogue reseeding from the role-switch request; onboarding/login continue to establish the catalogue.
- Reuse backend-verified roles already returned with the session during dashboard initialization. Keep explicit role-access refresh and late-response protection.
- Restore the full authenticated session when retrying role access after an initial authentication outage.

## Verification

- API compilation and web TypeScript checks passed.
- 109 authentication, event, platform/onboarding, and maintenance unit tests passed; 16 database unit tests passed.
- 25 authentication/security and tenant-isolation integration tests passed against disposable PostgreSQL.
- All 50 frontend role-switch, cookie, role-cache, role-context, and server-auth tests passed together in the final run. Targeted ESLint completed with no errors and four existing React effect/dependency warnings.
- `apps/api/test/prisma-transaction-pool.test.ts` runs two concurrent school workflows with a two-connection pool. It verifies shared connection IDs across nested Prisma and SQL calls, distinct tenant visibility, rejected cross-school nesting, rollback of both repositories, and connection release. The measured local run completed the workflows and rollback checks in 294 ms. This is a regression measurement, not an end-to-end production latency claim.

Run the database regression using:

```powershell
node -r ts-node/register/transpile-only -r tsconfig-paths/register apps/api/test/support/run-integration-with-local-postgres.ts node -r ts-node/register/transpile-only -r tsconfig-paths/register --test apps/api/test/prisma-transaction-pool.test.ts
```

No production school records were created or changed for verification.

## Production release verification

- Web release `dpl_82XiEDRraNKG85aRnTupfTF9mN8Z` is ready and aliased to `www.myshule.online`.
- API release `3f7a8316-72e4-4379-ba5d-31c00c0d24f9` reached `SUCCESS`; its first readiness health check passed. The public readiness endpoint returned HTTP 200.
- The authenticated Teacher overview loaded successfully in Chrome. Its session refreshed successfully after the earlier access token expired.
- Post-release API request samples: timetable 85–151 ms, event notifications 59–118 ms, tasks 56–94 ms, approvals 64–95 ms, module access 61–71 ms, and session refresh 153 ms. These are observed API request durations, not full-page timings or guarantees under every load.
- No connection timeout entries were returned for the new API deployment during the verification window.
- The available live account has a single Teacher role. Multi-role switching, permission changes, replay/late-response safety, and switching back were verified by automated tests rather than changing a production account's assignments.

## Follow-up: session loss after a successful switch

The later production report showed the destination stuck on “Verifying your dashboard access.” Logs at 12:20:06 and 12:23:44 UTC showed successful role changes (HTTP 201, 38–49 ms), immediately followed by rejected refresh requests (HTTP 401). Old dashboard requests were being treated as expired authentication and could revoke the switched session or delete its newly issued cookies. The client silently handled verification HTTP 401 without an error, leaving the access screen indefinitely.

- Reject access/refresh credentials for a previous role with HTTP 409 before attempting refresh rotation. Recheck role conflicts inside the Redis rotation path to cover refresh requests that started before switching. These requests receive no permissions or credentials; tenant, identity, audience, current-role authorization, MFA and audit enforcement remain intact.
- Background proxy and authentication failures cannot delete newer browser credentials. Explicit logout still revokes the session and deletes cookies.
- Cancel outgoing dashboard queries before switching. The new document still starts with fresh permission and school-data caches.
- Use the shared access gate for every school dashboard: failed verification has a retry action, stalled requests stop after 15 seconds, and successful retries restore the full authenticated identity. Explicit sign-in recovery remains reachable on school subdomains even with stale cookies.

Verification: 42 authentication/session tests passed, including real Redis concurrency and token-reuse rejection; 25 PostgreSQL authentication/security and tenant-isolation integration tests passed. The integration workflow switches Admissions Officer to Teacher and back, injects old-role refreshes from another gateway, then verifies both new sessions, exact permissions, unchanged membership and two audit entries. Frontend coverage totals 101 passing tests across role changes, fresh document initialization, cookie races, cache isolation, route recovery, service failures and logout. Web TypeScript and API compilation passed; targeted lint has no errors (four existing React warnings).

The multi-role verification uses disposable test accounts and databases. No live school assignments were changed for testing.

## Gateway identity follow-up

The live verification window at 12:52:21 UTC exposed eight concurrent refresh requests for one session, arriving through six gateway IPs. The auth gateway previously omitted browser user-agent and client IP, so the Redis replay protection fingerprinted the changing gateway addresses. One refresh succeeded, then another invalidated the session as token reuse.

The web auth client now forwards the browser user-agent on authentication calls and a validated client IP only when running on Vercel, where the platform overwrites `x-forwarded-for` ([Vercel request header contract](https://vercel.com/docs/headers/request-headers)). Login, role switching and concurrent refresh use the same browser identity. Tests cover IPv4, IPv6, invalid addresses and ignoring forwarded addresses outside the trusted runtime. Token replay detection remains enforced. The expiry contract now explicitly asserts HTTP 401 with no destructive cookie update; explicit logout still asserts backend revocation and cookie deletion.

API release `03c47ee9-95db-45a2-b974-073e8a8a7d93` passed production readiness after commit `fd00d6fd`. The browser smoke test reached the Teacher workspace, then exposed the gateway refresh issue above; it is not evidence of a completed live multi-role switch.
