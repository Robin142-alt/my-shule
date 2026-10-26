# Banking release evidence

Production release **`14f1847b177a993f9ddb3011d304aeef78875e95`** is deployed to Railway and Cloudflare. Banking implementation merged in PR #116 (`6e8376d6`), followed by the release verification fix in #117 and school recovery isolation in #118. All application changes are committed and pushed. This report distinguishes deployed software from authorized bank certification.

## Final deployment verification

[Release CI run 40383726347](https://github.com/Robin142-alt/my-shule/actions/runs/40383726347) completed successfully. Quality, security audit, Cloudflare build/runtime, backend, PostgreSQL/Redis integration and container publishing passed. CodeQL passed. Railway uses its existing Git deployment; the alternate workflow deployment job is intentionally skipped.

| Production component | Deployment/version | Verified state |
|---|---|---|
| Railway API | `096f3f80-e95d-4d79-b833-38ae7a0f295b` | SUCCESS at `14f1847b`; readiness, database/Redis and environment audit passed |
| Payments worker | `80158135-cb88-4ae1-b658-7109879337bf` | SUCCESS at `14f1847b`; BullMQ startup and one connected consumer verified |
| Interactive reports worker | `591d4036-10dc-4005-b1e8-045278cdf241` | SUCCESS at `14f1847b`; dispatcher, renderer and retention startup verified |
| Bulk reports worker | `4f7c246f-be6a-4350-bb69-8966abddb54b` | SUCCESS at `14f1847b` |
| Cloudflare `myshule-web` | `0630ff0d-5e38-45fd-a162-81340b276594` | Published 26 October 2026, 22:32 EAT, from the verified `14f1847b` artifact |

Both `https://www.myshule.online` and `https://myshule-web.ondurobinson.workers.dev` passed post-deployment runtime smoke tests: pages, immutable assets, images, PWA, legal documents/PDF, CSRF, unsigned tenant protection and protected API routes. The six production authentication/readiness smoke checks also passed after publication. These are production-safe public/unauthenticated checks, not real-bank transactions or authenticated financial postings.

Live Chromium checks also passed school, parent and Super Admin login pages at 390px and 1440px without horizontal overflow or page errors; the mobile school login screenshot was visually inspected. The final read-only database comparison after Cloudflare publication passed again at 22:34 EAT.

Redis inspection confirmed matching API/worker database, Redis and queue namespace, one connected payments consumer, and zero waiting/active/delayed/failed jobs. No job was inserted by the verification. API/worker error-log checks were empty; the earlier startup log burst warning did not recur.

Read-only production comparisons after deployment preserved all five schools, 125 students, inspected financial history counts and balances. All nine financial history/ingress tables enforce forced RLS. Existing canonical and legacy financial tables inspected were empty; no legacy invoice adoption or synthetic production financial posting was needed. Schema-only production migration rehearsal ran twice locally with real Prisma posting and retry checks.

Final CI evidence includes 1,596 passing base backend tests, 20 registry/provider protocol tests, 62 PostgreSQL banking/history tests, 56 payment-ingress/tenant tests and 52 Accountant/portal tests. These are separate passing groups and are not additive unique coverage. The separate PostgreSQL/Redis integration job also passed finance concurrency, authentication, school isolation and promotion contracts. Eight local production-build browser journeys passed across Accountant, Bursar, Principal and Super Admin at mobile/desktop widths, using controlled API fixtures; actual accounting was tested separately in PostgreSQL.

Concurrency evidence includes 25 simultaneous ledger payments plus duplicate, reversal, allocation and refund races. This is correctness coverage, not certification of production peak throughput for thousands of schools. No load-generating financial transactions were sent to production.

No authorized bank sandbox or live certification occurred. Equity and KCB protocol implementation is contract tested; Co-op native integration is sandbox-only; eight other banks require private technical contracts before native adapter implementation. All eleven retain reviewed manual/statement workflows. M-Pesa merchant activation requires genuine authorized credentials and callback verification. See the per-bank matrix in `docs/universal-banking.md`.

## Initial deployment and repaired release issues, 26 October 2026

- PR #116 merged. Railway API (`6b1616fe-f8bd-40e2-8086-b48c724153a4`), payments worker (`67822930-3e67-4b16-811c-593d54c03373`) and both report workers reached SUCCESS at the banking release commit.
- Actual worker logs confirm schema verification, PostgreSQL/Redis connections and BullMQ startup. API readiness and the runtime environment audit passed with no missing/invalid configuration or active alerts.
- Read-only comparison after deployment preserved all five schools, 125 students and every inspected financial count/total. All nine new financial history/ingress tables enforce forced tenant RLS. No financial fixtures were inserted in production.
- Six production authentication/CSRF/status smoke checks passed; four new protected financial endpoints rejected unauthenticated requests carrying forged school headers.
- Main CI run `40376937799` passed quality, security, backend tests, PostgreSQL integration, Cloudflare build/runtime tests and container build. Cloudflare publication failed because GitHub's combined status response omits `creator`. The corrected lookup uses the full newest-first status list and has also verified the actual deployed banking commit.
- Follow-up regression coverage checks trusted publisher identity, immutable commit lookup, newest pending/failed status, malformed responses and transport errors. Production route enumeration is suppressed to avoid Railway's observed startup log burst limit; operational, audit, warning and error records remain enabled.
- Recovery review reproduced a school-local inbox failure starving all later schools. The worker now records a scoped failure, advances the page and revisits durable failed work on later sweeps. Six recovery tests pass, including 101 schools across page boundaries and repeated failures; the suite is included in CI.

## Delivered behavior

- Eleven independently assessed banks in one capability-based registry; native Equity statements, KCB signed account notifications and Co-op sandbox statement/account-validation protocols use the shared verified inbox and accounting engine. Unsupported private protocols cannot activate.
- Governed connections, account ownership, encrypted credentials, independent Principal approval, Super Admin activation, diagnostic/retrieval state, retries and immutable provider provenance.
- Exact payment allocation, excess credit, subsequent credit application, historical invoice adoption, statement/portal visibility and receipt-preserving reversals.
- Partial credit reservations, Principal decisions and evidenced external payouts; no outgoing bank transaction is initiated by these workflows.
- Independently approved receipt moves, reviewed unmatched allocation and unpaid-invoice write-offs. Original histories, immutable correction proof and zero-net-cash move entries remain traceable.
- Production schema compatibility for legacy ledger, receipt, C2B/vault and reconciliation contracts; invalid money/evidence fails closed. Exact-commit Railway API/worker evidence gates the Cloudflare release.

## Verified before deployment

- 94 PostgreSQL tests across eight suites passed, including real Prisma inbox-to-ledger accounting, concurrency, authorization, tenant isolation, correction execution, credits/refunds, portal balances, invoice adoption and legacy database contracts.
- Schema-only production copy: two migration passes, forced RLS, real ledger/retry, receipt/credit/invoice posting, C2B duplicate delivery and reconciliation passed. Only local fixtures were inserted.
- Production baseline: five tenants, 125 students; inspected canonical invoices, receipts, ledger and legacy payment history tables are empty. Snapshot contains schema only, with no school row data.
- Final API and frontend production builds passed; 149 backend tests (finance, M-Pesa, all implemented bank protocols, registry and progression policy/store), 29 payment interface tests and 11 deployment/authentication/environment-check tests passed.
- Eight production-build browser journeys passed at 390px/1440px across Accountant, Bursar, Principal and Super Admin, including receipt-move requests, refund reservations, evidence and approvals. Browser API responses are controlled local fixtures; PostgreSQL verifies actual accounting separately. Production-safe authentication/CSRF/readiness smoke also passed against the existing deployment.

## External activation dependencies

No authorized bank sandbox or live certification is claimed. All banks require account mandates, credentials and approved onboarding. Co-op production and the remaining eight private native protocols additionally require their technical contracts. M-Pesa requires a genuine merchant Paybill/credentials and live callback verification. Reviewed statement/manual accounting remains operational independently of native connectivity. See the per-bank evidence table in `docs/universal-banking.md`.

## Deployment and recovery

Use the established GitHub main → Railway Git deployments and Cloudflare pipeline. Keep `DEPLOY_TARGET` unset: the existing Railway services use their Dockerfile configuration. Inspect API and worker startup/migration logs, trusted per-commit Railway statuses, `/health/ready`, frontend authentication/CSRF and the production database snapshot after release. Compare all baseline counts and totals.

All production verification is read-only; full financial lifecycle tests run on isolated local PostgreSQL. Do not seed a real school, create a fabricated payment, initiate an external payout, remove historical tables or run a destructive down migration. Once reservations/refunds/corrections are used, prefer a forward fix; older binaries that ignore that history are not a safe financial rollback.
