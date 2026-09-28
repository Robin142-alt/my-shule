# Dashboard loading and startup

The session gate, authorized-role handoff, installed-app entry and school route
boundaries share a data-free MyShule loader. The animation uses CSS, respects
reduced motion and adds no delay to a completed request. Failed verification
continues to show sign-in and retry controls. Backend authorization, tenant
binding, session timeouts, role-switch document replacement and cache isolation
are unchanged.

## Production bundle measurement

Measured on 2026-09-28 using consecutive production builds of the same checkout
with `node apps/web/scripts/measure-school-startup.mjs`:

| School entry JavaScript | Before | After |
| --- | ---: | ---: |
| Uncompressed bytes | 4,703,214 | 2,247,757 |
| Gzip bytes (sum per chunk) | 1,022,594 | 556,455 |
| Initial chunks | 13 | 16 |

Deferring 14 command-center bundles reduces initial compressed JavaScript by
45.6%. The selected dashboard loads when rendered; unrelated dashboards do not
block session verification. The operational-role predicate lives in a small
module so checking a role does not import all of its workspaces.

These are deterministic build-size measurements, not a claim about production
API latency or end-to-end load time. Actual timing still depends on the device,
connection, server and selected workspace. Do not substitute client-side role
or tenant hints for backend verification to reduce waiting.

## Reproduce

From `apps/web`:

```sh
npm run build
node scripts/measure-school-startup.mjs 600
npm run test:design -- --runTestsByPath tests/design/role-switch-consistency.test.tsx tests/design/sidebar-session-navigation.test.tsx tests/design/pwa-entry.test.tsx tests/design/school-command-center-routing.test.tsx tests/design/role-dashboard-structure.test.tsx tests/design/leadership-teacher-role-switch.test.tsx tests/design/active-role-cache-isolation.test.ts tests/design/school-tenant-scope.test.tsx
npx playwright test tests/design/workspace-loading.spec.ts tests/design/sidebar-session-navigation.spec.ts --workers=1
```

The size check fails above 600 KiB gzip. Browser tests use synthetic local
sessions and intercepted APIs, without accessing a real school's data. They
cover pending verification, retry after failure, reduced motion, mobile layout
and reuse of the verified session during sidebar navigation.

## Verification result

- Production build and TypeScript passed.
- All 92 targeted unit/component tests passed. The structure suite had one
  timeout while the build was running; all nine tests passed on an isolated
  rerun without changing their timeouts or assertions.
- Six Chromium checks passed: four loader/recovery widths (320, 768, 1024,
  1440 px) and two sidebar navigation widths (390, 1440 px).
- Loader screenshots were visually checked on mobile and desktop.
- Targeted ESLint completed with zero errors and 26 warnings in the existing
  school-pages file. The 600 KiB startup budget and `git diff --check` passed.
- Changes have been verified locally; no production deployment was performed.
