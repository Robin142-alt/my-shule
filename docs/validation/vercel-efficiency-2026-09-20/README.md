# MyShule Vercel efficiency investigation

Investigation: September 19–20, 2026. Baseline: `10e99201e84e70714e68fd2073f85b2949ccdabd`. Changes are isolated on `codex/vercel-efficiency`.

**Historical investigation snapshot:** the findings below describe the state before release approval. The subsequently authorized API/web release, production verification, additional runtime fixes, and deletion of 129 historical Vercel deployments are documented in [the release and cleanup report](./release-and-cleanup-report.md). Its production IDs, cleanup results, and deployment assessment supersede the pre-release status below. Nothing was pushed or merged.

## ROOT CAUSE

### Function Storage: deployment accumulation is the main driver

The `my-shule-erp-web-clean` project retained **129 READY deployments** (plus three failed deployments in the returned inventory). There were **52 successful deployments on September 11–13** and another **31 on September 15–19**, using UTC creation dates. The deployment burst explains the recent storage growth much better than an increase in application size. The final count of 52 corrects the earlier rough investigation tally.

The Vercel Resources view and deployment metadata show three shared Node function bundles in one region (`iad1`). The latest release has 171 function route rows; these rows are not 171 separate copies of the displayed bundles.

| Deployed output | August 25 release | September 19 release |
| --- | ---: | ---: |
| Shared page function | 20.5 MB | 21.3 MB |
| Shared API function | 17.8 MB | 18.4 MB |
| Middleware | 463 kB | 480 kB |
| Unique shared bundles | 3 | 3 |
| Displayed function route rows | 167 | 171 |

The sum of displayed bundle sizes increased only **about 3.7%**. No recent dependency addition, extra deployment region, or accidental inclusion of the Nest/Prisma/report-generation backend was found in the web traces. The largest baseline traced groups were application output (15.82 MB), Next (8.68 MB), React DOM (1.31 MB), and small image-processing dependencies. Those are reasonable for this application; broad dependency exclusion would risk breaking pages, images or reports for little measured benefit.

Git confirms substantial repetition: 128 of the 129 successful releases have resolvable web trees, with **62 distinct `apps/web` trees**, or 66 repeated known trees. A repeated tree alone does not justify skipping a release: environment changes, promotion and intentional redeployment can still matter. The implemented conservative rule identifies only 34 avoidable builds.

Vercel stores deployment-associated function bundles, including retained historical releases. Its usage accounting considers storage over time using daily project maxima. Consequently, a usage-period total is not an exact measurement of bytes that can be reclaimed immediately. Historical deletion reduces future retained usage; it does not undo prior days' usage. This is expected platform behavior, with avoidable build volume contributing to it. It is not evidence that functions are accumulating uploaded school files. See [Vercel Deployment Storage](https://vercel.com/docs/deployment-storage).

The initial project reading was **5.23 GB**; the later project Usage view showed **5.32 GB**, for August 21–September 20. These are two readings during the investigation, not before/after optimization results. Production remained unchanged. The account-wide initial 7.77 GB also included unrelated projects and must not be attributed entirely to MyShule. The available plan did not expose the daily function-storage series needed to reconcile every byte of the spike.

### Function Invocations: a broken SSE connection was repeatedly reconnecting

The September 19 production 12-hour function view showed approximately 9.1K invocations, of which **8.2K (~90%)** belonged to `/api/events/[...path]`. Vercel request samples repeatedly showed `/api/events/dashboard/stream` about every 3.6–3.9 seconds. Ten Railway HTTP samples all returned HTTP 200, **80 response bytes**, and completed in **26–42 milliseconds**. This establishes immediate origin termination, rather than Vercel's maximum stream duration, as the trigger for these retries.

A localhost Nest HTTP reproduction using the actual controller, event service, context middleware and production interceptors identified the failure:

1. Nest flushes SSE headers before subscribing to its deferred interceptor chain.
2. `RequestIdInterceptor` then calls `setHeader`, throwing `Cannot set headers after they are sent to the client`.
3. Nest writes an `event: error` frame and closes. The reproduced response is **exactly 80 bytes**, matching Railway's samples.
4. Native browser EventSource automatically reconnects after a short delay, creating repeated Vercel and origin requests. HTTP 200 obscures the failure in normal error-rate summaries.

This is a reproduced code-level cause that strongly matches production telemetry. Production stream payloads were not read, so a canary must still confirm the deployed fix resolves the sampled failure.

A second confirmed defect would prevent useful delivery even after fixing the close: the global JSON response envelope strips SSE frame metadata, including `event: dashboard.events`. The frontend listens specifically for this event. A real HTTP reproduction verified the missing event name before the fix and correct named frames afterwards.

### CPU and other metrics: no evidence for indiscriminate optimization

Project Usage, August 21–September 20, showed roughly **443K invocations (44.3% of allowance), 1h53m Fluid Active CPU (47.1%), 21.5 GB-hours memory (6.0%), 1.05 GB transfer (1.1%), and 1.42 GB origin transfer (14.2%)**. Build execution CPU was 15h8m. These are project totals, distinct from account totals and the 12-hour runtime sample.

In that runtime sample, CPU P75 was 29 ms, memory averaged 224 MB out of 2.05 GB, cold starts were 0.9%, and timeouts were zero. The event route itself had CPU P75 13 ms. Reducing redundant work is worthwhile; there is no measured justification for removing authentication middleware, shrinking function memory, caching private responses, changing regions, or replacing the architecture merely because CPU is visible on a dashboard.

## CHANGES MADE

| Priority | Change | Engineering value and safeguards |
| --- | --- | --- |
| 1 | Repair SSE headers and frame envelopes | Restores real cross-dashboard event delivery and removes the reproduced immediate-close cause. Request IDs remain set by context middleware; ordinary JSON envelopes and request IDs are verified. No guards or tenant filters change. |
| 1 | Conservative Vercel ignored-build command | Skips only changes confined to independent backend/services/Prisma/docs paths, compared with the last successful deployment SHA. First builds, manual same-SHA redeploys, web/shared/config changes, unknown paths, divergent or missing history all build. `MYSHULE_FORCE_WEB_BUILD=1` overrides skipping. |
| 2 | Bounded dashboard SSE reconnection | Closes native automatic retries and retries after 5, 10, 20, 40, then at most every 60 seconds during failure. Only a valid tenant snapshot resets the delay. A visible status message identifies degraded updates; cleanup cancels timers and connections on unmount/tenant changes. |
| 2 | Forward SSE client cancellation upstream | Allows an aborted incoming stream request to cancel origin work. JSON mutations retain existing behavior. Trusted cookie/session tenant and bearer transport remain unchanged. |
| 3 | Preserve build cache during normal builds | `build` now runs `next build`; `build:clean` remains available for explicit recovery. The old script deleted restored `.next` output on every build and could terminate unrelated local Next/TypeScript processes. The clean command now touches only this web app's `.next`. |
| 3 | Reproducible measurement scripts and evidence | Added read-only deployment replay and local build trace measurement scripts, with sanitized evidence beside this report. |

The ignored-build command lives in `apps/web/vercel.json`, matching the actual Vercel Root Directory. It runs using Node and Git before dependency installation. Its exit convention follows [Vercel's ignored-build documentation](https://vercel.com/kb/guide/how-do-i-use-the-ignored-build-step-field-on-vercel): zero skips, one builds. A shallow clone lacking the baseline safely builds; the full-history replay is an opportunity estimate, not a guarantee for every future deployment.

## BEFORE → AFTER

| Measurement | Before | After | Interpretation |
| --- | ---: | ---: | --- |
| Successful builds in historical replay | 129 | 95 | 34 fewer, **26.4%**; not actual deleted deployments |
| Recorded build interval for avoided releases | 5,063 seconds | Avoided in replay | **84m23s** of historical build wall intervals, not billed CPU savings |
| Attempts in ten minutes of immediate stream failures | ~167 at the observed 3.6s cadence | 13 in fake-clock regression test | About **92% fewer** attempts under continued failure; not a production forecast |
| Actual HTTP SSE reproduction | Immediate 80-byte error and close | Two concurrent tenant streams each deliver multiple named heartbeats | Local end-to-end transport verification |
| Unique traced local function files | 26,689,264 bytes | 26,690,830 bytes | +1,566 bytes (+0.006%); effectively unchanged |
| Complete local `.next` output | 85,470,850 bytes | 85,479,517 bytes | +8,667 bytes (+0.010%); no claimed bundle reduction |
| Server output | 72,468,515 bytes | 72,475,105 bytes | +6,590 bytes |
| Static output | 11,108,712 bytes | 11,110,252 bytes | +1,540 bytes |
| App routes / prerendered routes | 176 / 44 | 176 / 44 | Exact route sets unchanged |
| Trace manifests / missing traced files | 179 / 0 | 179 / 0 | No missing traced dependencies |
| Successful local build wall time | 282.6 seconds | 298.0 seconds | No demonstrated speedup; single runs on a memory-constrained Windows host |
| Existing Vercel stored deployments | 129 READY in inventory | Unchanged by this work | Requires separate approved cleanup |

Local measurements use the same checkout, Node 22.20.0 and Next 16.2.6, without production environment files. They are uncompressed Windows filesystem sizes, not Vercel's Linux package sizes or GB-month billing figures. The deployment-count reduction is the demonstrated storage prevention mechanism. No Vercel after-build size or production CPU reduction is claimed without deployment.

## VERCEL CLEANUP

No cleanup has been executed. The project API reports 30-day expiration settings and `deploymentsToKeep: 10`; almost all observed deployments are still within 30 days. Vercel also announced changed Hobby retention protection on September 16. Its published policy protects current/aliased deployments and active branch deployments, with additional latest-release protection. The live project's effective protection must be checked before selecting deletions; do not infer eligibility solely from the older API field. See [Vercel's retention announcement](https://vercel.com/changelog/hobby-projects-now-retain-fewer-deployments-to-free-up-storage).

`cleanup-review.json` lists 34 releases identified by the build replay for review, not as an approved deletion batch. For any proposed cleanup:

1. Re-read the deployment inventory and aliases immediately beforehand.
2. Preserve current production, agreed rollback releases, active previews/branch heads and externally shared URLs.
3. Check environment/configuration changes and promotions, even for identical web trees.
4. Present an exact deployment-ID deletion list and obtain approval.
5. Record retained storage afterwards and observe usage over subsequent days.

Observed production to preserve: `dpl_G5kTwQP7r7WFN8byBF8E8gV86TpZ`, serving `myshule.online` and `www.myshule.online`. Also preserve rollback options `dpl_AKE1rq8s2YRQfJQ5CR4z2QbQBQVm` and `dpl_76E3d3RJBCvaNDG57R7CSf8ckDXV` pending explicit review. These identifiers describe the investigation snapshot and must be refreshed before action.

The local `apps/web/.vercel/project.json` points to a different, older project (`my-shule-erp-web`), while the repository-root link points to the correct `my-shule-erp-web-clean` project. These ignored local links were left unchanged. Any later CLI deployment must explicitly confirm project identity to avoid targeting the wrong project.

## VERIFICATION

- Baseline and final optimized Next production builds: pass, including TypeScript and static generation. Exact route/prerender sets match; all 179 trace manifests resolve their dependencies.
- API TypeScript `tsc --noEmit -p tsconfig.json`: pass. Final API transport tests also run with type-checking `ts-node/register`.
- Initial focused web suite: 5 suites, 35 tests pass, covering event retry, tenant communication, experience routing, session refresh and cookie-backed dashboard requests.
- Final stream/proxy suite: 4 suites, 21 tests pass, including client cancellation, trusted tenant transport, rejecting tenant mismatch, bounded retries, visible degraded/recovered state and cleanup on tenant change. Some tests overlap the initial suite; counts are not additive.
- API interceptor and real HTTP stream suite: 3 tests pass, covering envelope preservation, normal JSON compatibility, preserved request IDs and concurrent tenant heartbeats. The old request-ID code fails this HTTP test with the exact 80-byte error described above.
- Existing `DashboardRealtimeService` tests: 11 pass, including permission/module filtering, audience targeting, cursor advancement and recovery after snapshot errors.
- Ignored-build tests: 4 pass using a temporary Git repository, including failed/pending frontend changes, unknown inputs and forced builds.
- Changed web files: targeted ESLint passes with zero errors and zero warnings.
- `git diff --check`: pass.

The HTTP stream test uses fixture identities and stub repositories; it does not claim to retest production login or the complete database workflow suite. No live school writes, notifications, report generation, or load tests were performed. Detailed Observability queries returned a plan restriction; demo tables shown in the dashboard were explicitly excluded as evidence.

To reproduce the new checks from the repository root:

```text
node --test apps/web/scripts/ignore-build.test.mjs
node -r ts-node/register --test apps/api/test/dashboard-sse-wire.test.ts apps/api/src/interceptors/response-envelope.interceptor.test.ts
node -r ts-node/register/transpile-only --test --test-name-pattern=DashboardRealtimeService apps/api/src/modules/events/events.test.ts
npm --prefix apps/web run build
node scripts/measure-web-build.mjs
node scripts/analyze-vercel-deployments.mjs <deployment-list-json-export>
```

## REMAINING ISSUES

1. **Dependency security maintenance has higher priority than further bundle trimming.** The unchanged production web dependency audit reports one critical, three high and one moderate package advisory. Next 16.2.6 is affected by several published advisories; the AVIF optimization advisory lists 16.3.3 as patched. Exposure varies by configuration and this audit is not evidence of exploitation. A tested framework/dependency patch release is needed; no speculative automatic upgrade was mixed into this measured optimization. See the [official Next.js advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4) and `dependency-audit-summary.json`.
2. **Observe healthy SSE costs after repair.** Persistent streams use function memory while open, and the existing service polls the tenant outbox every 15 seconds per connection. Restoring streams can increase legitimate memory duration and database reads while reducing invocations. Measure those together. At higher concurrency, shared tenant-aware event subscriptions or a dedicated realtime service may be worthwhile, but require explicit authentication, revocation, audience and isolation design; bypassing the BFF is not an acceptable shortcut.
3. **Other erroring routes warrant their own focused review.** The sampled timetable/admin routes had errors, but counts were small and the history contains recent fixes. These are reliability signals rather than evidence that their function sizes are excessive.
4. **Build configuration hygiene remains.** Vercel reports project Node 24 while `apps/web` engines select Node 22, and remote logs warn about tracing-root/Turbopack-root differences. Runtime traces do not show backend dependency contamination. Normalize these settings in a separate tested maintenance change rather than aggressively pruning traces.
5. **Historical retention and deployment cadence remain operational controls.** The skip rule does not eliminate useful web preview builds, environment redeploys or production rollback history. Evaluate preview retention and promotion practices after agreeing on rollback requirements.

## DEPLOYMENT ASSESSMENT

The optimization changes pass local build and focused regression checks and are ready for review and an **approved staging/canary release**. They are not an unconditional certification of the entire production application; dependency advisories and post-release transport behavior still require attention.

The SSE root fixes are in the Railway API; deploying only the Vercel frontend supplies retry containment but does not repair the origin. Coordinate API and web releases, preferably API first. The API repairs are compatible with the existing named-event frontend. No database migration is required.

After approval, verify authenticated named events for two separate schools, tenant switching and sign-out, request-ID headers, normal JSON responses, session refresh, real school mutations triggering the correct dashboard updates, and stream closure on client disconnect. Compare same-length, similar-traffic windows for event invocation rate, stream duration, errors, Active CPU, provisioned memory and origin/database load. Confirm the ignored-build behavior on an independent backend change and a real web change. Keep rollback releases available. Approve historical cleanup separately.

Evidence files: [production observations](./production-observations.json), [verification](./verification.json), [build comparison](./build-comparison.json), [baseline traces](./baseline-metrics.json), [optimized traces](./after-metrics.json), [deployment replay](./deployment-replay.json), [cleanup review](./cleanup-review.json), [dependency audit summary](./dependency-audit-summary.json).
