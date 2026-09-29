# Cloudflare migration: architecture and acceptance record

Status: migration in progress; this document is not a production certification.
Audit baseline: `d5ffb04197e38431baa7a7001b5bf20d95b8776c`, 2026-09-29 (Africa/Nairobi).

## Current release gate: Workers Free

The account owner requires Workers Free and an explanation before any paid feature is enabled. No upgrade has been enabled. The candidate at `https://myshule-web.ondurobinson.workers.dev` deployed on Free and passed live public-page, image, PWA, CSRF and unsigned tenant/API protection checks. Authoritative DNS, production web traffic and the Vercel origin remain unchanged.

Remove custom `limits.cpu_ms` because the Free API rejects it. Wrangler minification reduced compressed upload from 4,406.10 KiB to 4,007.36 KiB. Building Next with its supported Webpack option reduced it further to 3,164.04 KiB while retaining all routes. Both minified builds deployed successfully on this Free account: the old OpenNext 3 MiB troubleshooting guidance was not the applicable deployment limit.

The remaining problem is execution CPU, not bundle acceptance. Live Wrangler tail measurements for uncached `/school/login` show the optimized build at approximately 15 ms median, 10–17 ms warm samples and 94 ms for its first measured invocation. Free documents 10 ms CPU/request and 100,000 Worker requests/day. All probe requests returned 200, but the platform's occasional overrun tolerance is not a reliability guarantee. The route depends on hostname and invitation/query state; globally caching it would compromise parity and potentially isolation. See [sanitized measurements](cloudflare-free-plan-evidence.json).

Production cutover is held. Preserving request-time Next rendering requires more CPU headroom than these measurements support on Free. A runtime relocation or rendering rewrite would be a distinct architectural tradeoff, not a completed Cloudflare-runtime migration. The million-user target also exceeds the daily Free Worker quota independently of rendering optimization. Do not enable Paid or merge a production cutover without resolving this explicit user constraint.

## Verification completed on the candidate source

- Next 16.3.6, OpenNext 1.20.6 and Wrangler 4.143.0; Node 22.20.0 locally. Both Next bundlers built all 96 static pages and the dynamic route inventory.
- Live Cloudflare smoke passed for public/login/offline pages, immutable assets, Open Graph/image optimization, PWA manifest/service worker, CSRF and unsigned/forged-tenant access rejection. This does not certify authenticated functional parity.
- Backend TypeScript/Prisma build passed, including the preserved `dist/apps/api/src` production entrypoint layout after deleting the Vercel adapter.
- All 1,533 root backend tests, 9 production-auth smoke unit tests and 120 posttest cases passed. On Windows the existing npm test command exceeds cmd.exe's length limit; the exact same three test lists were executed with Node spawn arguments after the successful build.
- Disposable PostgreSQL auth/security/experience/tenant isolation integration suites passed (27 tests); database-backed concurrent tenant SSE test passed; SSE wire tests passed (3 tests).
- Migration frontend auth/session/routing/PWA suites passed (137 tests); realtime/tenant transport suites passed; report/role/offline checks passed after updating the assertion for stronger private cache headers.
- Migration cleanup/certification/provider tests passed (53 tests); build-skip tests passed (4 tests); ingress/cache/stream tests passed (3 tests). Frontend dependency audit reported zero vulnerabilities.
- Scoped deployment token stored in GitHub's `production-cloudflare` environment; main-only environment branch policy applied. Pipeline source is prepared but has not yet run from main.

Authenticated live school journeys, controlled report/notification/payment/offline workflows, mobile browser parity, final security review, DNS/TLS/registrar cutover and post-cutover CI/rollback evidence remain outstanding. Test account identification was requested; no production school data was created or changed.

## Existing system and production observations

| Boundary | Observed implementation | Migration decision |
| --- | --- | --- |
| Web and BFF | Next.js App Router, React 19; SSR, static pages, authenticated route handlers, Next proxy | Cloudflare Workers with OpenNext; retain Next/React and every route |
| Identity | NestJS JWT access/refresh; Redis durable sessions; HTTP-only same-origin cookies and CSRF in BFF | Preserve cookie names, domain, audience, rotation and backend identity |
| School isolation | Tenant middleware, request context, JWT/RBAC/ABAC/module guards, scoped SQL and PostgreSQL runtime role | No database or authorization rewrite; never cache private responses at the edge |
| Domain workflows | Nest modules for admissions, academics, exams, finance/payments, attendance, students/staff, parent portal, inventory, library, health, discipline, boarding, transport, security, communication, approvals and reporting | Preserve shared API contracts, events, audits, notifications and state transitions |
| Database | Railway PostgreSQL, single observed volume-backed instance | Retain durable data; independently capacity-plan HA, replica/pool and partitioning requirements |
| Queue/session/cache | Railway Redis 8.2.9, single observed volume-backed instance; BullMQ, retries and outbox | Retain semantics; do not substitute eventually consistent KV for sessions/locks/queues |
| API | Railway `my-shule-api`, one observed replica, us-west2; 5 configured database connections | Preserve main Git deployment and private network backing services |
| Background work | API currently enables event dispatch/consumers; separate `reports-interactive` and `reports-bulk` services | Preserve actual live topology; do not turn off embedded processing before replacement workers are verified |
| Reports/files | PDFKit/ExcelJS, BullMQ report lanes, private R2 `myshule-reports`; existing uploads and malware scanning | Retain signed delivery, ownership checks, jobs and object stores |
| Integrations | M-Pesa and payment callbacks, Resend/email DNS, SMS relay, malware scanner | Preserve provider endpoints/credentials; copy all mail verification and DNS records |
| Realtime | Authenticated SSE with database outbox polling and principal insights | Preserve streaming/cancellation; audit connection lifetime, replay cursor and fan-out capacity |
| PWA/offline | Same-origin service worker, public-asset cache, IndexedDB/offline queues, no authenticated response cache | Preserve origin and manifest identity; reproduce worker-specific headers on static assets |
| CI/CD | GitHub quality/build/integration/security workflows; Railway Git source on API and both report lanes | Add gated Cloudflare deployment on main; retain existing Railway Git source and checks |
| Domain | `myshule.online`, registrar managed through Vercel/Name.com; Vercel authoritative nameservers; apex and www aliases | Cloudflare authoritative DNS and runtime; registrar transfer is a separate tracked dependency |

Verified live baseline: website 200; CSRF route 200; Railway readiness 200. No production school records were changed for this audit. Railway API and both report lanes reported the baseline commit. SMS relay/malware scanner are separately deployed services. The legacy GitHub Railway matrix does not describe these live service names and is not enabled by a repository DEPLOY_TARGET variable.

## Governance and preserved contracts

CODEx Master Bootstrap; AGP Governance; Autonomous Runtime Execution; Agent Governance Protocol; Tenant Isolation Layer; Event Bus Initialization; Database Contract Layer; Widget Registry Initialization; Self-Healing Autonomous Agents; Cloud-Native Execution Layer; Global Execution Loop remain application contracts. Hosting adapters do not replace them.

The execution chain remains intent -> authentication -> capability -> school scope -> validation -> service -> durable write -> event -> notification/approval -> projection/widget refresh -> audit -> feedback -> verification. Cloudflare terminates TLS and runs the existing web gateway; the existing backend remains responsible for governed domain execution. No browser receives database, JWT signing, R2 signing or provider credentials.

## Destination architecture

Use an adapter rather than a framework rewrite. OpenNext preserves the existing Next server/component/route model. Supported edge middleware replaces the Node proxy entry-point convention without dropping routing/security logic. Workers Static Assets serve immutable bundles and public files globally; build-time prerendered pages use the adapter's static incremental cache. The source has no ISR, `revalidatePath`, `revalidateTag`, or mutable Next data-cache consumers. School data remains request-time `no-store`; a future ISR feature must add its own explicit tenant-safe cache contract.

Keep the API and persistent/background workloads in their existing Node environment. Native bcrypt, pg pools, Redis/BullMQ workers, startup schemas, Node PDF/Excel generation and the scanner are not suitable for a mechanical request-isolate port. Adding D1, Hyperdrive or a second queue to a web gateway that does not query SQL directly would add competing infrastructure rather than remove a bottleneck.

Cloudflare DNS covers apex, www and the existing wildcard routing contract. Maintain mail/SPF/DKIM/DMARC/verification records exactly. Keep private objects private. Cloudflare Images handles the existing Next image optimization path; do not silently switch to unoptimized images. Private HTML/API/RSC, CSRF and all Set-Cookie responses must bypass shared caches. No Cache Everything rule.

## Confirmed migration hazards and remedies

1. Node `proxy.ts` is unsupported by OpenNext: preserve it as supported edge middleware and run routing/host/header tests in workerd.
2. Only Vercel currently forwards client IP for refresh fingerprinting: normalize trusted Cloudflare ingress, discard user-supplied proxy/tenant metadata and test IP/UA continuity. Preserve backend validation.
3. Email/invitation defaults still point to Vercel: replace defaults with the canonical domain and retain generated-link integration tests.
4. `.workers.dev` is currently parsed as a school: explicitly support hosted preview routing, with production cookies remaining origin-bound.
5. Next headers do not apply to Cloudflare Static Assets: configure `_headers` for service-worker scope/type/CSP/no-store and immutable bundles.
6. Request/response buffering in the BFF is a Worker memory risk: bound actual incoming bytes and stream file/SSE responses without losing refresh/retry or response-envelope behavior.
7. SSE authorization is captured at connection open and history restarts on reconnect: verify bounded reconnect/revalidation and resume behavior before increasing connection lifetime or traffic.
8. Build-only tests do not prove runtime parity: test the compiled Worker, static assets, cookies, redirects, origin/tenant spoofing, binaries and stream cancellation.
9. Preserve origin during cutover so PWA storage, offline queues and cookies remain accessible. Users with old provider-owned bookmarks/links require a transition path before deleting legacy deployments.

## Capacity and reliability limits

No million-school/concurrent-user capacity is claimed from this migration. Cloudflare horizontal web execution does not eliminate single PostgreSQL/Redis instances, the API's finite pool, per-connection outbox polling, report CPU or third-party provider limits. A production capacity certificate requires measured concurrent tenants/users, realistic row counts, burst/soak/reconnect/report tests, error/latency budgets, failure injection and restore drills.

Scale in measured stages: dedicated event/payment consumers before API replicas; bounded per-process database pools whose total fits PostgreSQL; tenant-scoped shared realtime fan-out; queue-lane concurrency/backpressure; private object delivery; managed PostgreSQL/Redis failover with tested backups. At larger scale use tenant placement/sharding and independently scaled regional cells, preserving school scope and idempotency. Do not place all schools behind a single global Durable Object. HA data-service procurement/quotas and capacity evidence remain release gates, not properties inferred from configuration files.

## Cutover gates and rollback

1. Complete source/runtime inventory; record current DNS, deployments and non-secret configuration.
2. Build/test the Worker in isolation. Verify all existing relevant suites and actual workerd requests.
3. Deploy a Cloudflare candidate with the existing API and validate authentication, permissions, tenant isolation, report delivery, realtime and PWA.
4. Copy complete DNS; verify certificates, mail records and canonical/wildcard routing. Activate authoritative nameservers only after the zone can serve the existing site safely.
5. Switch production web routing to the verified Worker. Re-run synthetic and authenticated journeys; monitor errors/latency/queue lag.
6. Verify main-branch Cloudflare CI deployment and existing Railway deployment behavior.
7. Move registrar to Cloudflare; verify completion, renewal settings and DNSSEC. Domain transfer can require account-holder action and propagation time.
8. Verify zero provider-specific runtime/env/callback/DNS/build dependencies and legacy-link usage, then retire Vercel production projects/integration. Do not delete the working origin before these gates pass.

Rollback before final retirement: restore the recorded DNS/origin or prior Cloudflare version; preserve database and queues. After retirement: roll back to a verified Cloudflare version (retain its asset set). No data-schema rollback is introduced by the frontend migration.

## Sources

- https://opennext.js.org/cloudflare and https://opennext.js.org/cloudflare/get-started
- https://opennext.js.org/cloudflare/caching and https://opennext.js.org/cloudflare/howtos/custom-worker
- https://developers.cloudflare.com/workers/best-practices/workers-best-practices/
- https://developers.cloudflare.com/workers/platform/limits/
- https://vercel.com/docs/domains/managing-nameservers
- https://vercel.com/docs/domains/working-with-domains/transfer-your-domain

The exact installed adapter/runtime versions and final verification results must be recorded with the release. Historical Vercel evidence in `docs/validation` is audit history, not a production dependency.
