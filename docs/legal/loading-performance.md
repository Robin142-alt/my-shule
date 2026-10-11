# Agreement loading

The agreement gate, route fallback and successful-acceptance navigation use the existing data-free `WorkspaceLoading` component. The screen renders in the initial HTML, uses the existing MyShule mark, and respects reduced motion. No minimum display timer delays verified navigation.

Only overlapping verification requests in the same mounted gate and route share a promise. Completed decisions are not cached. The verification component is keyed to its route and removed on public pages, so returning through a sign-in page starts with fresh state, even when the pathname is the same as before. A route change, backend legal-required event or successful acceptance invalidates older results. A later focus/visibility check still contacts the backend. Errors remain closed with a retry action.

Protected pages and `/legal/accept` request the existing `/legal/access` check, which performs the full required individual, institutional and guardian access decision without loading review-only history, school labels or parent-management details. A pending decision loads `/legal/status` and the agreement interface. An already accepted user on `/legal/accept` immediately resolves their session's dashboard and navigates there, without rendering a confirmation screen or requiring another click. The optional `/legal/account` review page requests detailed status directly and retains acceptance history, school authority tools and guardian controls. Application agreement links open this optional page. Both API routes use the existing cookie-authenticated, tenant-scoped proxy and no-store responses; middleware and backend guards are unchanged.

The agreement interface and document viewer are dynamically imported only when needed; on review, their code loads alongside the status request. Successful acceptance retains the branded loader while the server resolves the dashboard and navigation completes. One `router.replace` starts that navigation; the redundant `router.refresh` is removed. Destination requests use the existing bounded authentication fetch with recoverable failures.

## Measurement and regression coverage

The same Strict Mode/focus/visibility overlap test produced four status requests before the change and one access request after it (75% fewer overlapping requests). A subsequent verification still makes a new request. Tests cover delayed approval after a route change, backend denial superseding an in-flight check, failure/retry, signed-out and cross-school requests, acceptance navigation and destination failure. This measures request reduction, not a production latency SLA.

Browser checks cover 320, 390, 768 and 1440 pixel widths, no horizontal overflow, reduced motion, initial HTML before JavaScript, unchecked agreements, one pending request and response-to-form transition timing. Their 1.5-second transition budget allows CI rendering variance while detecting artificial splash delays. CI also retains the legal workflow, authentication, permission, tenant-isolation and compiled Cloudflare checks.

No acceptance evidence, document version, DPA activation setting, authentication policy or role permission changes are part of this release.

## Automatic dashboard routing

The durable backend records determine access on every session. No browser storage or long-lived acceptance flag is introduced. Completed acceptance redirects automatically; renewed material document generations and guardian/institutional blockers still require the backend's approval. A failed dashboard lookup offers a retry without submitting acceptance again. Leaving the page invalidates pending navigation, and duplicate effect setup shares only the currently mounted destination lookup. The PWA continues to fetch navigation and APIs from the network; it does not cache legal decisions.

Regression checks cover automatic destinations for school leadership, staff, parent, student and platform sessions, subsequent mounts, updated requirements, guardian controls, failed destination recovery and stale navigation. Browser tests watch for any intermediate agreement/confirmation flash on repeated accepted entry and retain mobile acceptance/viewer coverage. Rollback is a revert of the frontend change and redeployment through the normal pipeline; no schema or acceptance record rollback is needed.
