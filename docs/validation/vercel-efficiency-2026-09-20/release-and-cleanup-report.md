# MyShule production release and Vercel cleanup

Completed September 20, 2026. Final infrastructure verification: 08:51 UTC / 11:51 EAT; authenticated browser verification followed it.

The optimized API was released first, its runtime and SSE behavior verified, then the web app was built and promoted. Historical cleanup ran only after the release and authenticated application access were verified. Both public domains still serve the new production deployment. No school records were written during verification.

## ROOT CAUSE

**Function Storage growth was primarily accumulated deployments.** Before release the correct project held 129 successful deployments and three failed deployments. There were 52 successful builds on September 11–13 and 31 more on September 15–19. Across 128 resolvable successful releases there were only 62 distinct web source trees. Three shared function bundles remained three; their displayed combined size grew only about 3.7% between the August 25 and September 19 releases. No evidence justified removing application functionality or broad dependency exclusions.

This is expected Vercel retained-output behavior, amplified by repetitive builds. It is not evidence of school uploads accumulating inside functions. The build policy now prevents a conservative subset of unnecessary future web builds; deleting historical deployments addresses the output already retained. See the [initial investigation](./README.md) for detailed evidence.

**The strongest runtime waste was broken SSE transport.** About 8.2K of 9.1K sampled invocations in a 12-hour window hit the event proxy. Origin streams returned 200 with exactly 80 bytes in 26–42 ms, prompting browser reconnects roughly every 3.6–3.9 seconds. A real Nest HTTP reproduction produced the same 80-byte failure: the request-ID interceptor attempted to change headers after Nest flushed them. The JSON response envelope also removed the named SSE event metadata.

During the API canary, database transaction-start failures required a rollback before the final release. The precise cause of that transient failure was not conclusively established. Investigation did establish avoidable overlapping asynchronous polls and misleading health metrics, which were corrected and tested before the final API release. No database schema migration or tenant/RBAC relaxation was used.

## CHANGES MADE

- Preserve SSE headers and named frames while keeping normal JSON envelopes and request IDs working.
- Bound frontend reconnect attempts, display degraded realtime state, and propagate client cancellation to origin streams.
- Prevent overlapping asynchronous outbox polls using `exhaustMap`; preserve PostgreSQL microsecond cursor precision to avoid replay/skip errors from millisecond rounding.
- Use one explicit PostgreSQL connection pool, report its real state, and make readiness execute a real database query.
- Record successful stream lifetime separately from ordinary API latency/error SLOs. Normal five-minute stream completion no longer creates a false API incident.
- Skip web builds for independently scoped backend/documentation changes only when safe comparison history exists. Unknown/shared/web/config changes, intentional redeploys, and forced builds still build.
- Preserve restored Next build cache during normal builds; retain a scoped clean-build command for recovery.
- Delete obsolete deployment output from the correct Vercel project after the release passed verification.

Deployed source: `8ef44969a1aaf2a7ce77aecdbe98de05f337624d`, including earlier optimization commits `fdf02f1f` and `a32145a9`. These commits remain on the local `codex/vercel-efficiency` branch; no push or merge was performed.

## BEFORE → AFTER

| Measurement | Before | After |
| --- | ---: | ---: |
| Live Vercel deployment inventory immediately before/after cleanup | 133 | **4** |
| Successful / failed historical deployments deleted | — | **126 / 3** |
| Deletion failures | — | **0** |
| Sampled origin SSE duration | 26–42 ms, 80-byte error | **299,974 ms, HTTP 200, 996,415 bytes** |
| Vercel shared Node function bundles | 3 | **3** |
| Unique local traced function bytes | 26,689,264 | 26,690,830 (+0.006%) |
| Complete local Next output bytes | 85,470,850 | 85,479,517 (+0.010%) |
| Application routes / prerendered routes | 176 / 44 | 176 / 44 |
| Historical successful builds under skip-policy replay | 129 | 95, **34 avoided (26.4%)** |
| Project Function Storage displayed during investigation / after cleanup | 5.32 GB | **5.36 GB** |

The post-release SSE sample was recorded by Railway at `2026-09-20T08:49:03.040858918Z` on the final API deployment. An earlier final-release sample also lasted about 300 seconds. These replace the reproduced immediate-close behavior; they are not an estimate of account-wide CPU savings.

Function Storage was initially reported as about 5.23 GB and later observed at 5.32 GB. During and immediately after cleanup, the project usage page displayed 5.36 GB for August 21–September 20. This **does not measure immediately retained bytes reclaimed**. Vercel meters storage over time using each project's daily maximum, and its UI warns that usage can lag by up to one hour. Deletion cannot erase prior-day usage. Earlier transient UI readings of zero were inconsistent and were excluded from savings claims. No reliable immediate byte-reclamation figure was exposed. [Vercel storage accounting](https://vercel.com/docs/deployment-storage).

The 97.0% reduction is in deployment count, not a claimed 97.0% reduction in the displayed usage-period storage total. Aggregate invocation/CPU savings still need comparable traffic windows; the runtime sample establishes repaired transport, not a controlled cost experiment.

## VERCEL CLEANUP

Only project **`my-shule-erp-web-clean`**, ID **`prj_FZMmfzegTNibOQkpTJiLZqybAo1K`**, under team **`team_vEpOYHogWVyjvSjZAFn47DYI`**, was modified. The older `my-shule-erp-web` project was not modified.

Fresh inventory: **133 before → 129 deleted → 4 remaining**. All attempted deletions succeeded, including all three failed builds. Vercel returned `state: DELETED` for every deleted deployment; the final inventory independently confirms only four remain.

| Exact retained deployment ID | Reason |
| --- | --- |
| `dpl_589F9rdPj1Gz2PjXuM3MmqR4eKhX` | Current healthy production; both custom domains and the project domain resolve to this deployment |
| `dpl_G5kTwQP7r7WFN8byBF8E8gV86TpZ` | Previous known-good production, retained as rollback |
| `dpl_7shRdKkd1imM54Y4hAKBV35rkKW2` | Additional member of Vercel's latest-three-deployments retention exception |
| `dpl_AKE1rq8s2YRQfJQ5CR4z2QbQBQVm` | Additional member of Vercel's latest-three-ready-production retention exception |

The two additional deployments were deliberately retained under the user's instruction to preserve anything Vercel protects. Vercel's [September 16 Hobby retention announcement](https://vercel.com/changelog/hobby-projects-now-retain-fewer-deployments-to-free-up-storage) documents these exceptions. No attempt was made to override protection.

Safety checks included exact project/name assertions, current project target, current alias inventory, verified project domains, deployment terminal state, custom environment/protection data, existing Git branches, and PR state. All 31 inspected PRs were merged. Historical alias arrays in deployment details were not treated as current mappings. Every deletion rechecked the live production target and production aliases; rollback readiness was rechecked every ten candidates. Retained IDs were excluded by an immutable keep set.

## VERIFICATION

- Railway API deployment **`f1ef6ea4-0b1b-48f2-888d-6cf66ff33405`**: SUCCESS. Final code was verified in the running deployment during release.
- API readiness after cleanup: HTTP 200, PostgreSQL and Redis up, database pool 2 total / 2 idle / 0 waiting, SLO healthy with zero active or critical alerts.
- API canary monitoring: twenty readiness samples passed; database-backed regression exercised 16 concurrent streams alongside ordinary snapshot requests.
- Vercel production **`dpl_589F9rdPj1Gz2PjXuM3MmqR4eKhX`**: READY. Candidate and post-promotion checks passed before historical deletion.
- Production smoke suite after cleanup: **6/6 passed** (API readiness, school/parent login pages, web CSRF, auth proxy, public status). This public smoke suite is not itself a credentialed login test.
- Separately, the user's existing authenticated staff session loaded the teacher dashboard and timetable on the promoted deployment. After cleanup, a full reload revalidated authentication and reopened the timetable; navigation back to the dashboard succeeded. The timetable correctly showed its unpublished empty state, not fabricated data.
- `myshule.online`: DNS resolves, HTTPS returns the expected 308 redirect to `www.myshule.online`, final response 200.
- `www.myshule.online`: DNS resolves, HTTPS 200. Both Vercel aliases point to the current retained production ID; domains remain verified.
- Production SSE: fresh five-minute HTTP 200 stream, as measured above.
- Before release: baseline/optimized Next builds, API TypeScript, web event/proxy/auth/tenant tests, real HTTP SSE tests, database-backed stream tests, event repository/cursor tests, pool tests, request logging/SLO tests, ignored-build tests, targeted lint and whitespace checks passed. Detailed initial build/test measurements remain in the investigation evidence.

Verification used read-only application workflows. It did not repeat every school role, make financial mutations, publish reports, send notifications, or claim a complete production workflow certification.

## REMAINING ISSUES

1. **Source control needs follow-through before the next Git release.** The deployed optimization commits are local and not yet merged to the production branch. A later deployment from unchanged remote `main` would omit these fixes. Push/merge was not included in this execution.
2. **Dependency advisories require a separate tested patch release.** The existing web audit identified critical/high advisories; the remote build also reported dependency warnings. No unvalidated dependency upgrade was mixed into this release.
3. **Measure healthy realtime costs under normal traffic.** Persistent streams legitimately consume memory duration and database reads. Per-tenant shared subscriptions may be worthwhile at higher concurrency, but must preserve authentication, revocation, audience filtering and tenant isolation.
4. **Railway log volume remains worth reducing.** A provider log-rate warning was observed during release. It did not invalidate the final health/SSE checks, but excessive logging can obscure diagnostics.
5. **Storage reporting has not yet demonstrated reclaimed bytes.** The deployment count reduction is proven; usage-period storage and aggregate CPU figures must be assessed with their time windows and reporting delay.
6. **Temporary diagnostics:** the Railway SSH key was revoked and `railway ssh keys list` confirms no registered keys. Automatic approval review rejected deletion of the local temporary key files with a policy-block message; those now-revoked local files were left in place.

## DEPLOYMENT ASSESSMENT

**Released and healthy at the final checks.** API first, then Vercel web promotion, then historical cleanup. Production and rollback deployments remain ready. No database migration was required, no tenant/auth/RBAC safeguards were removed, and no unrelated Vercel project was changed.

The release passed focused regressions and live verification, with the validation limits and remaining maintenance items above. Source-control integration is the main operational follow-up before another automated release.

Evidence: [post-cleanup infrastructure verification](./release-verification.json), [deletion audit](./deployment-deletion-audit.json), [retention plan](./deployment-retention-summary.json), [post-cleanup smoke result](./post-cleanup-smoke.json), and the [initial investigation and build measurements](./README.md).
