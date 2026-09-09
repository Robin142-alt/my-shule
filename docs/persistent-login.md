# Regular-user persistent login

The NestJS API remains the authentication authority. Next.js acts as the same-origin browser gateway. Desktop/mobile browsers and installed Android, iOS and desktop PWAs use the same HttpOnly cookies and restoration endpoints. This repository has mobile access policies but no separate native client implementation.

## Policy

- School and portal users receive an access token lasting at most 15 minutes and a refresh session lasting at most **14 days from the original login**. Refresh and dashboard-role switching cannot extend this deadline. Older sessions are bounded by their original creation time as well.
- School login defaults to persistent cookies, with an explicit shared-device opt-out. Parent/student password and OTP login also default to persistence. Opting out removes persistent cookie lifetime; it does not override browser session-restore settings. Sign out when finished on a shared device.
- Super Admin continues to use its existing configured token lifetime, rolling renewal, MFA, login, cookie persistence choice and browser logout behavior. Regular-user self-service session endpoints reject Super Admin sessions. The legacy device-revocation endpoint now checks session ownership, closing a security flaw without changing Super Admin login or expiry.
- Passwords are submitted for verification only. They are never persisted by the client. The browser gateway strips access/refresh tokens from JSON responses; cookies are host-only, HttpOnly, SameSite=Lax, and Secure in production. Regular session responses use `Cache-Control: private, no-store`.

## Restoration and revocation

`GET /api/auth/me` restores the current session, refreshing when the access cookie is missing or expired. Existing API proxies retry once after refreshing. A 401 after restoration clears the session; transient network/server failures preserve cookies so the user can retry. Server-side rendering uses routing hints only; backend APIs still enforce authentication, permissions and school scope.

Refresh tokens rotate with each renewal. The regular-user Redis compare-and-set operation is atomic across requests and API replicas. Concurrent requests from the same client receive the same winning pair during the existing short grace window. Reuse outside that window or from another client revokes the family. The grace record cannot restore a deleted session.

Regular browser logout calls `POST /auth/logout/refresh` before clearing cookies. A valid refresh credential can revoke only its own signed session family, including after access expiry. Access-only cookies use the existing authenticated logout endpoint. If revocation cannot reach the backend, the UI shows an error and allows retry. Expired credentials can be cleared. Revocations are audited and emit `auth.session.revoked` through the existing event publisher when present.

The device panel now reads `GET /auth/my-sessions`, revokes a device with `POST /auth/my-sessions/revoke`, and revokes other devices with `POST /auth/my-sessions/revoke-others`. These operations use the authenticated request context and check user, school and audience. Revocation is never queued offline or reported successful without a server response. Regular password recovery also invalidates regular sessions; Super Admin recovery behavior remains unchanged.

Regular cookie mutations require the existing CSRF token plus same-origin checks when the browser supplies Origin/Fetch Metadata headers. Signed-token tenant checks, account status, active membership, current role permissions and MFA assurance remain enforced on refresh.

The database password-change timestamp is checked during regular refresh as a second revocation boundary if the password reset completed while Redis was unavailable.

## Operations and verification

Keep the existing access/refresh signing secrets and issuer/audience settings. `JWT_REFRESH_TOKEN_TTL_SECONDS` retains its existing meaning for Super Admin; regular users have the fixed 14-day maximum. No database migration or client credential migration is required.

Production regular sessions require shared Redis. Configure durable Redis persistence, protected network access, TLS where supported, backups and a non-evicting policy for auth keys; losing the session store signs users out. Production regular login/restoration returns service-unavailable when Redis is degraded instead of creating process-local sessions. In-memory fallback remains available for local tests/development and existing Super Admin behavior.

Tests:

```powershell
node -r ts-node/register/transpile-only -r tsconfig-paths/register --test apps/api/src/auth/persistent-session.test.ts
npm --prefix apps/web run test:design -- persistent-login auth-route-contract auth-token-containment server-auth-client session-refreshing-fetch session-logout dashboard-api-cookie-session
node -r ts-node/register/transpile-only -r tsconfig-paths/register apps/api/test/support/run-integration-with-local-postgres.ts jest --config jest.integration.config.js --runInBand apps/api/test/auth-security.integration-spec.ts apps/api/test/auth-experience-separation.integration-spec.ts
```

The Redis test starts an isolated local `redis-server` with persistence disabled and shuts it down afterward. Integration tests use a disposable PostgreSQL database. No production school data is needed.

Design references: [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) and [RFC 9700 refresh-token protection](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.14).
