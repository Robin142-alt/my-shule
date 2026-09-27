# Unified authentication validation

All authentication entry, verification, invitation, password recovery and error screens now share a compact responsive MyShule shell. Existing backend authentication, CSRF, role, tenant, audit and event contracts remain authoritative. Invited students now return to the student login instead of staff login.

Installed-app session failures offer both retry and a fresh sign-in path. Explicit reauthentication bypasses stale routing hints without granting access to protected data. Wrong-school routing hints no longer redirect login back to itself. Switching accounts unmounts the pending session check; successful authentication clears cached queries. Requests time out with retryable feedback rather than leaving the form indefinitely busy.

## Verification

- 142 assertions passed across 15 focused Jest suites: authentication, invitations, expiry/recovery, installed entry, role switching, session persistence/logout, routing, token containment and server/BFF contracts.
- 14 backend integration tests passed against disposable PostgreSQL: authentication security, tenant isolation and audience separation.
- 12 Playwright tests passed against the production build. Coverage includes 14 authentication routes at 360, 768 and 1440 pixels, installed session failure and account switching, MFA paste/resend/error recovery, first-time parent access, keyboard-sized viewports, and valid staff/parent dashboard redirects.
- Production build and TypeScript checks passed. Web lint completed with zero errors; existing repository warnings remain.
- Mobile login, invitation, first access, verification and session recovery screenshots were inspected. Device keyboard testing uses browser viewport emulation, not physical devices. SMS/email responses are mocked in browser tests; no real users received messages.
- CI's authentication gate now includes the recovery, invitation and installed-entry regressions.

## Dependency audit follow-up

No dependencies changed. The root production dependency audit reported zero vulnerabilities. The existing web lockfile reports five packages with advisories (Next.js, sharp, PostCSS, nanoid and baseline-browser-mapping). This release does not certify the dependency tree as vulnerability-free.

The reviewed Next.js proxy advisory requires a single configured i18n locale; this app has no i18n configuration and independently enforces backend access. The AVIF image advisory concerns optimized AVIF input; uploads currently validate PNG/JPEG/WebP signatures, no AVIF assets are present, and no remote image hosts are configured. Windows production hosting is not used. No application imports of nanoid/PostCSS/sharp or Server Actions were found. A separately validated framework/dependency update remains necessary maintenance.

References: [Next.js proxy advisory](https://github.com/advisories/GHSA-6gpp-xcg3-4w24), [Next.js AVIF advisory](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4).

Rollback: revert this authentication commit and redeploy. No database migrations are included.
