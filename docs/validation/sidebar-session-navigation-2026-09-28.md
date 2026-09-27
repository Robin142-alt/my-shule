# Sidebar session navigation

The school page mounted a new `useExperienceSession` instance after route changes. Each instance started with no identity and fetched `/api/auth/me` independently, temporarily replacing the workspace with the authentication screen.

The hook now uses the existing application QueryClient to share public session metadata in memory, keyed by audience and requested school. Fresh reads are reused for 60 seconds; stale reads revalidate on mount, focus and reconnect while the verified workspace remains visible. Inactive entries expire after five minutes. Concurrent consumers share one verification request. Nothing is persisted to browser storage, and HTTP authentication responses remain private/no-store.

Failed verification removes the cached identity. Login and logout clear school data caches; credential changes invalidate session aliases. Cancelled reads and obsolete refresh responses cannot restore an identity after logout or a role switch. The role provider starts with the verified role context, avoiding another transient loading state.

## Governance and scope

The CODEx Master Bootstrap and AGP Governance execution order was followed by inspecting the session gateway, school binding, permission context, role registry, workspace routes and tests before changing client session state. Backend AGP identity/capability checks, tenant guards, token validation, durable session revocation, module access checks, event emission and audit paths are unchanged. There are no database mutations, migrations, approval, notification, offline-sync or report changes in this release.

## Verification

- The navigation regression remounts six workspaces after the initial load: one authentication request total, with each workspace available immediately and no authentication screen between them.
- Additional cases cover concurrent reads, stale background verification, rejection, tenant/audience changes, retry, account replacement, logout during a read, logout during another consumer's refresh, and React Strict Mode.
- Existing role-switch tests continue to cover delayed responses, permission rejection, fresh-document verification and retry after outages.
- A production-browser regression checks sidebar navigation and browser Back at 1440px and 390px, using controlled local gateway responses without reading or modifying real school records.
- The navigation regression is included in the existing CI role-switch test selection.

Completed locally: 147 tests across 20 authentication/navigation suites; two Chromium navigation tests at desktop and phone widths; optimized Next.js build including TypeScript; full frontend lint (zero errors, existing warnings); and `git diff --check`. The browser checks retained one authentication request over three sidebar/Back round trips, detected no authentication-screen flashes, and detected no horizontal overflow at either width. An invitation test timed out during an earlier build-concurrent run; its focused rerun and the complete 147-test rerun both passed.

These are request-count and rendering checks; they do not claim a measured production latency improvement or substitute for live backend authorization checks.
