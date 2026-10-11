# Authenticated navigation architecture and verification

Date: 2026-10-11. Local Next.js production build, Chromium on Windows.

## Architectural changes

School, portal and platform workspaces now render beneath persistent App Router layouts. Workspace pages retain their server route/session validation; the layout owns the mounted client dashboard. Same-dashboard navigation uses Next's supported native History API integration, with browser history and search parameters preserved. Detail pages, authentication, external URLs and unknown destinations retain normal router navigation.

The shared legal gate no longer invalidates itself for every pathname. It verifies on entry, account changes, focus, visibility and a periodic background check. A failed check or required agreement closes the gate; backend legal enforcement remains unchanged.

Workspace state now follows the route before React commits, instead of resetting via a section-dependent component key or an after-paint effect. Server routes, hosted middleware and client navigation share the workspace contract. Dedicated Class Teacher, Grade Master, Procurement and Exams Manager IDs are included. Legacy library/inventory redirects retain the chosen section. Principal and System Monitor history now restores the selected workspace.

The live-role shell splits workspace JavaScript into lazy resources. Pointer/focus/touch intent preloads code; limited idle warming skips constrained connections. Role changes preload the destination code before rotating authorization, retaining the current dashboard and showing the existing switch progress while authorization is pending. Code caches contain no school records.

Login/logout clear the shared query cache. Confirmed role changes cancel and discard outgoing data and permission queries before publishing the new session. Identity boundaries reset role-specific state on tenant, user or authorization-role changes. School query and permission requests propagate cancellation signals. Existing backend authentication, capabilities, tenant filtering, mutation/event/audit contracts and service-worker restrictions on private data remain in force.

## Reproducible checks

From `apps/web`, build and start a production server, then run the browser scripts with `NAVIGATION_BASE_URL` pointing to that server:

```powershell
npm run build
npm run start -- --hostname 127.0.0.1 --port 3019
$env:NAVIGATION_BASE_URL='http://127.0.0.1:3019'
node tests/navigation-baseline.cjs ../../tmp/navigation-after.json
node tests/workspace-navigation-audit.cjs ../../tmp/navigation-final.json
node tests/role-navigation-audit.cjs ../../tmp/role-navigation-final.json
```

`NAVIGATION_ROLES` and `NAVIGATION_WIDTHS` select subsets. `NAVIGATION_SLOW=1` adds 120 ms network latency and 8 Mbps download throughput. `NAVIGATION_DATA_DELAY_MS` controls the data fixture delay. `NAVIGATION_STANDALONE=1` emulates standalone display mode; it is not a physical installed-device test. `NAVIGATION_TRACE=1` writes a Chromium performance trace under `tmp`. `NAVIGATION_SWITCH_ROLES` selects the role-switch sequence.

Browser fixtures use explicit test identities and unavailable-data responses, never real school records. Data APIs return delayed 503 errors so the audit verifies that unavailable services do not block navigation or invent successful data. Authentication and legal APIs are intercepted separately. This isolates browser architecture from backend variability; it is not a measurement of production database/API latency or a substitute for live workflow acceptance.

Feedback latency measures the click event to the next animation frame after the selected sidebar item appears. First document authentication/startup is measured separately. Tests track shell removal, splash insertion, selected workspace, direct URLs, back/forward, rapid click sequences, and repeat visits. Desktop uses 1440 px; mobile emulation uses 390 px with touch and service workers enabled. The script fails on correctness, shell persistence and history regressions.

## Baseline comparison

The same five roles and three sidebar transitions per role were exercised before and after the architectural changes, with a controlled 250 ms legal-status response.

| Observation | Before | After |
| --- | ---: | ---: |
| Dashboard shell removed | 15/15 | 0/15 |
| Full dashboard loader appeared | 15/15 | 0/15 |
| Wrong/default selected workspace | 12/15 | 0/15 |
| Legal checks per initial entry plus three clicks | 4 | 1 |
| Authentication reads per sequence | 1 | 1 |

This removes 75% of legal-status requests in that sequence and eliminates the repeated network gate. The baseline did not record click-to-paint timings, so no percentage latency improvement is claimed.

## Browser results

The complete matrix covers all 26 registered school role entries, both portal viewers, Super Admin and System Monitor at 1440 px and 390 px. Desktop exercises every rendered sidebar destination and submenu; mobile exercises the first four destinations per role. Both repeat three destinations and exercise back/forward. Desktop also sends three clicks in one burst. Direct entry is checked against the selected destination.

The broad run plus the corrected Super Admin mobile driver completed 623 sidebar transitions across 60 role/viewport combinations: zero wrong selections, zero shell removals, zero repeated splash screens, and zero page-level horizontal overflow. All 60 history checks and 30 rapid-click sequences passed. The original mobile Super Admin attempt failed because the driver tried to reopen an already-open modal; the corrected rerun passed. Its timing samples replace only that failed row; successful slower samples remain in the broad results.

| Click to next frame after selection | Samples | Median | p95 | Maximum |
| --- | ---: | ---: | ---: | ---: |
| Broad run, first visit | 443 | 20.3 ms | 188.0 ms | 519.7 ms |
| Broad run, repeat visit | 180 | 14.6 ms | 144.3 ms | 273.8 ms |
| Focused rerun, first visit | 83 | 34.3 ms | 76.6 ms | 112.7 ms |
| Focused rerun, repeat visit | 24 | 19.4 ms | 37.2 ms | 53.0 ms |

The focused rerun covers Principal, Deputy Principal, Nurse and Super Admin on both viewports. The selected DOM state updated within 46.7 ms in all of its samples. Three first-visit frames exceeded 100 ms and overlapped browser long tasks after selection. A separate Principal trace run completed all 32 transitions within 46.7 ms. These repeats show timing variability, not proof of a universal sub-100 ms guarantee. The original broad-run tails are retained above; production latency must still be measured with populated school data and representative devices.

Visual inspection confirmed that slow or failed data loads stay within the content area. It also identified an existing Medicine Inventory error path that incorrectly displayed empty stock; that screen now distinguishes unavailable stock from a successful empty response and provides Retry without removing its actions.

After the final build, 54 role switches spanning all 26 school roles passed across desktop and mobile. Each viewport made 27 governed role requests, one authentication read and one legal check, retained one document, and inserted no splash screen. The authorization fixture deliberately waits 500 ms; the switcher remains locked while confirmation is pending. The Principal's remembered Students destination is restored.

A separate slow-network/standalone run covers Teacher, Nurse, Parent Portal, Super Admin and System Monitor at both viewports. All 105 clicks passed selection, shell persistence, history and direct-entry checks, including System Monitor's query-string workspace. All five mobile contexts had an active service worker; none cached a private API or dashboard URL. Desktop service workers were blocked. Network throttling was 120 ms latency and 8 Mbps; data failures were delayed 1.5 seconds.

| Slow-network click feedback | Samples | Median | p95 | Maximum |
| --- | ---: | ---: | ---: | ---: |
| First visit | 75 | 13.7 ms | 41.3 ms | 80.4 ms |
| Repeat visit | 30 | 12.1 ms | 16.4 ms | 23.9 ms |

These runs use different role subsets and execution windows; the lower slow-network timings do not imply that throttling improves performance. They demonstrate that sidebar feedback no longer waits for data responses.

## Build and regression checks

- Production build passed compilation, TypeScript and generation of 102 static pages.
- Main regression run: 20 suites, 239 tests passed (routing, session/role races, tenant/cache isolation, mobile navigation, legal persistence and PWA contracts).
- Follow-up routing/remembered-destination run: 7 suites, 81 tests passed. These overlap the main run and are not added to its total.
- Medicine failure/empty-state tests: 2 passed; failed requests cannot appear as zero stock, and Retry/Add Medicine remain usable.
- ESLint passed for the new navigation/resource files and tests. `git diff --check` passed. The existing middleware deprecation notice remains.
- Hosted tenant/role routing is covered by contract tests; browser runs use the public role URLs.

Compact measured evidence is saved in [validation/navigation-performance-results.json](validation/navigation-performance-results.json). Browser audit scripts live in `apps/web/tests/navigation-baseline.cjs`, `workspace-navigation-audit.cjs`, and `role-navigation-audit.cjs`. Detailed local samples, screenshots and the Principal Chromium trace are under `tmp/navigation-*`.

## Verification limits

No production deployment or real-school mutation was performed. Production backend latency, populated-table rendering and physical mobile/PWA installation require deployment-environment verification with authorized accounts. Local browser evidence and measured tail latencies are reported separately; passing route tests does not establish every school's production latency.

## Release preparation

The deployment branch integrates these changes onto production commit `0b9731f9dca6ff39ad2ad3a6cfe3224bef906443`, preserving subsequent legal-access, agreement-review and report changes. The legal gate retains the compact `/legal/access` check and lazy agreement form. Confirmed denial closes the gate before waiting for the detailed form. Release regression verification covers 277 tests, including the newer legal-mode and delayed-response contracts; the maintainability scan passed. CI repeats the navigation and legal regression tests before deployment.

The previous Cloudflare Worker version is `6fc12316-89c3-45e5-8294-d51663142317` (successful production run `38121829457`). Rollback restores that Worker version and preserves API binaries, databases, agreement evidence and current school records. This release contains no backend or database migration.
