# Cloudflare migration: architecture and acceptance record

Status: Cloudflare production runtime and DNS are live; Vercel is retained only as domain registrar. This document is not a large-scale capacity certification.
Audit baseline: `d5ffb04197e38431baa7a7001b5bf20d95b8776c`, 2026-09-29 (Africa/Nairobi).

## Registrar-only cleanup (2026-09-30, Africa/Nairobi)

The owner explicitly cancelled the registrar transfer. Keep `myshule.online` registered with Vercel, automatic renewal enabled, and nameservers `julian.ns.cloudflare.com` / `shubhi.ns.cloudflare.com`. Cloudflare confirmed zero transfers in progress; no transfer checkout/payment was submitted. Registration renewal remains a legitimate domain expense, separate from application hosting.

PR #39 merged as `5b12318954a80bcb76b80cc823f5ec5151b91e01`. Main CI `36684874375` passed every applicable gate and automatically deployed Worker version `2ae7f6a3-c9c2-4520-a279-47a561d84a15`, preserving apex and wildcard routes. Production smoke passed again. Railway continues its existing Git integration; unchanged services correctly skip deployment. All seven Railway services reported running successfully, and the API and both report lanes contain no Vercel/Upstash environment references.

Six legacy Vercel projects were identified by repository/commit history and aliases, then retired: `my-shule-erp-web-clean`, `my-shule-erp-web`, `my-shule-erp-api`, `my-shule-erp`, `shule-hub`, and `web`. Removing these projects removes their retained deployments/functions, aliases, cron configuration and project Git deployment connection. The separately registered domain is retained. Other applications in the Vercel team are outside this cleanup.

The only attached marketplace resource was `upstash-kv-erin-pendant`, a Free-plan Redis resource already archived by Upstash for inactivity. It belonged only to the obsolete Vercel API, not the live Railway Redis service. Its connection and resource were retired. No Vercel Blob stores were present. Encrypted local configuration snapshots were retained for audit; these are configuration records, not database backups. The production PostgreSQL, Redis, R2 objects and background queues remain on their existing infrastructure.

Future main deployments verify both the Worker hostname and canonical production domain. The web README now describes Cloudflare/Railway deployment instead of the generated Vercel instructions. Recovery uses Cloudflare version rollback or redeployment from Git; it must not recreate Vercel hosting. Historical usage counters/invoices may still show usage accrued before retirement; retirement stops new application usage, not previously incurred charges.

## Staged rollout evidence (2026-09-29 UTC)

- PR #38 merged as `bdb901f0419b927a2f59d01603cc95e270f391e7`. Main CI run `36626905279` passed quality, security, Worker build/workerd, backend, database integration, container publication, automatic Cloudflare deployment and deployed smoke checks. Railway's existing Git integration deployed the API and both report lanes successfully.
- Worker version `cfab53fd-000b-487e-92f6-d91b99c55c56` includes the gateway secret. Live API probes accept the signed identity and reject forged metadata. API `/health/ready` reports PostgreSQL/Redis up, an empty pool wait queue and healthy API/queue SLO state.
- The existing Kibabi Exams Manager session survived the Worker update. A current draft report downloaded before and after deployment; both files are 808,686 bytes with identical SHA-256. Both signature images load. Older draft/published snapshots hit existing stale-report guards; those guards were preserved. A readiness request timed out during rollout and recovered after reload. No migration check edited comments, marks or publication status.
- The account owner signed into the retained Vercel production origin before cutover. That existing session opened the Exams Manager reports workspace on Cloudflare without another login. The production PDF downloaded successfully and has the same 808,686-byte length and SHA-256 as both candidate downloads.
- Registrar nameservers were changed to `julian.ns.cloudflare.com` and `shubhi.ns.cloudflare.com` at `20:38:48Z`. RDAP confirms both. Cloudflare activated the zone at `20:48:13Z`. Mail/SPF/DKIM/DMARC, verification and CAA records were compared with the previous provider. Universal TLS is active for apex and wildcard; minimum TLS is 1.2, TLS 1.3 and Always Use HTTPS are enabled.
- Apex, `www` and wildcard web records are now proxied originless AAAA `100::` records. Apex and wildcard routes run `myshule-web`; Wrangler declares these routes for subsequent deployments. There is no Vercel DNS/origin fallback. The Cloudflare Single Redirect preserves the existing apex-to-www 308, path, query and method (GET/HEAD and POST verified). The production Worker smoke passed pages, immutable assets, image optimization, PWA, CSRF and forged-tenant/unsigned API protection. The Kibabi wildcard host responds through Cloudflare. No shared cache rule overrides private response headers.
- An existing integration configuration gap was found: production M-Pesa consumer credentials, shortcode and passkey contain placeholders, and its callback URL uses a placeholder domain. Readiness reporting alone does not prove this provider works. Real provider configuration and a controlled transaction are required before claiming live payment parity; migration checks have not initiated payments or bypassed callback verification.

The sections below retain earlier audit evidence; the rollout and registrar-only records above supersede their pre-merge/deployment status. Registrar transfer was cancelled by the owner. Broader workflow validation and large-scale HA/capacity certification are separate from this hosting cleanup.

## Current release gates: authenticated parity and production cutover

The account owner approved Workers Paid after reviewing the measured Free CPU constraint. The owner supplied purchase-complete confirmation on 2026-09-29. The candidate at `https://myshule-web.ondurobinson.workers.dev` passes live public-page, image, PWA, CSRF and unsigned tenant/API protection checks. Authoritative DNS, production web traffic and the Vercel origin remain unchanged.

During Free-plan evaluation, custom `limits.cpu_ms` was removed because the Free API rejected it. Wrangler minification reduced compressed upload from 4,406.10 KiB to 4,007.36 KiB. Building Next with its supported Webpack option reduced it further to 3,164.04 KiB while retaining all routes. Both minified builds deployed successfully on Free: the old OpenNext 3 MiB troubleshooting guidance was not the applicable deployment limit.

The Free-plan blocker was execution CPU, not bundle acceptance. Live Wrangler tail measurements for uncached `/school/login` showed the optimized build at approximately 15 ms median, 10–17 ms warm samples and 94 ms for its first measured invocation. Free documents 10 ms CPU/request and 100,000 Worker requests/day. All probe requests returned 200, but occasional overrun tolerance is not a reliability guarantee. The route depends on hostname and invitation/query state; globally caching it would compromise parity and potentially isolation. The [sanitized measurements](cloudflare-free-plan-evidence.json) remain historical evidence of that decision.

The billing gate is resolved; production cutover still requires functional, security, DNS/TLS and deployment verification. Keep the optimized build and static-asset bypass. Workers Paid supplies execution headroom; it does not certify application capacity or cap total account spending.

Before merging Cloudflare-only gateway changes, the Vercel project's ignored-build command was set to `exit 0` (previously null). This freezes new Git builds while retaining production deployment `dpl_4KFmT8hZ3nuzko2arGmYDjyiVLg9`; a subsequent GET confirmed that deployment and the production login still returned 200. Do not deploy this source to Vercel. Rollback during migration uses the retained artifact; restoring Vercel build automation would also require restoring a compatible source revision.

The shared gateway identity key is staged on the Railway API with deploys skipped and stored in GitHub's encrypted `production-cloudflare` environment. CI probes `/health` with valid and invalid signatures before Worker deployment, blocking an old API or a mismatched key. The verified key is uploaded atomically with the new Worker version using Wrangler's `--secrets-file`; the temporary file is removed when the deployment step exits. Production API verification and signed Worker activation have not yet happened.

## Verification completed on the candidate source

- Next 16.3.6, OpenNext 1.20.6 and Wrangler 4.143.0; Node 22.20.0 locally. Both Next bundlers built all 96 static pages and the dynamic route inventory.
- Live Cloudflare smoke passed for public/login/offline pages, immutable assets, Open Graph/image optimization, PWA manifest/service worker, CSRF and unsigned/forged-tenant access rejection. This does not certify authenticated functional parity.
- Backend TypeScript/Prisma build passed, including the preserved `dist/apps/api/src` production entrypoint layout after deleting the Vercel adapter.
- All 1,537 root backend tests, 9 production-auth smoke unit tests and 120 posttest cases passed after the dependency updates. On Windows the existing npm test command exceeds cmd.exe's length limit; the exact same three test lists were executed with Node spawn arguments after the successful build.
- The report infrastructure's 17 disposable PostgreSQL integration tests passed, including forced RLS, tenant/actor ownership, retries and recovery. RLS statements are explicit per table so the source audit recognizes the existing protections. Regression tests ensure removing any table's protection still fails and checkout-directory names do not change the audit's scope.
- Backend dependency audit reports zero vulnerabilities after updating Multer, JS-YAML and brace-expansion. Tenant isolation, security, PII and maintainability scans pass. The security workflow is reused on PRs and main and is a required dependency of Cloudflare deployment.
- Disposable PostgreSQL auth/security/experience/tenant isolation integration suites passed (27 tests); database-backed concurrent tenant SSE test passed; SSE wire tests passed (3 tests).
- Migration frontend auth/session/routing/PWA suites passed (137 tests); realtime/tenant transport suites passed; report/role/offline checks passed after updating the assertion for stronger private cache headers.
- Migration cleanup/certification/provider tests passed (53 tests); build-skip tests passed (4 tests); ingress/cache/stream tests passed (3 tests). Frontend dependency audit reported zero vulnerabilities.
- Scoped deployment token stored in GitHub's `production-cloudflare` environment; main-only environment branch policy applied. Pipeline source is prepared but has not yet run from main.
- Gateway hardening: backend and OpenNext builds passed; compiled workerd public smoke passed; 13 disposable PostgreSQL auth-security tests passed, including signed client identity across changing origin proxy IPs, duplicate refresh continuity, and forgery/cross-tenant rejection. Five gateway unit cases, six Worker ingress/deployment-probe cases, 72 affected frontend contracts and 50 focused backend auth/support cases passed. Frontend lint completed with zero errors and existing warnings; tenant/security/PII/maintainability scans passed. Independent review found no remaining must-fix issue in the revised identity probe and deployment sequence.

The owner signed into the candidate with existing Kibabi teacher and Exams Manager accounts. The teacher overview, classes, attendance and reports workspaces loaded, including mobile sidebar navigation at 390x844. The teacher has no assigned classes or available reports. Exams Manager displayed existing saved report cards and a persisted preview; the first PDF request was rejected by existing stale-report validation. Signature images failed and a later session verification timed out; these remain under investigation, so download/authenticated parity is not certified. Concurrent probes returned 200 for candidate CSRF, Vercel login and Railway liveness/readiness, with PostgreSQL and Redis up. Further authenticated journeys, controlled report/notification/payment/offline workflows, final security review, DNS/TLS/registrar cutover and post-cutover CI/rollback evidence remain outstanding. No production academic/financial records were created or edited by the migration checks.

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
| Domain | `myshule.online`, registrar managed through Vercel/Name.com; originally Vercel nameservers and web aliases | Cloudflare authoritative DNS and runtime; retain Vercel registration/renewal by owner decision |

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
2. Railway ingress rewrites forwarding headers, so ordinary `x-forwarded-for` cannot reliably carry browser identity from Cloudflare. The web gateway signs platform-provided client IP, user agent and timestamp with a shared server-only HMAC secret. The API verifies the signature and 60-second freshness before using it for request context and refresh fingerprinting. Discard inbound signature/proxy/tenant metadata at the Worker. Signatures do not grant authentication, tenant membership or permissions; all existing guards remain mandatory. Direct API/provider callers retain Railway's existing ingress identity path. Configure the same `GATEWAY_IDENTITY_SECRET` on the API and Worker and verify the backend before enabling signed traffic.
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
7. Retain Vercel registration and automatic renewal with Cloudflare nameservers. Do not initiate a registrar transfer. Coordinate any DNSSEC DS records at the retained registrar with Cloudflare's signing keys.
8. Verify zero provider-specific runtime/env/callback/DNS/build dependencies and legacy-link usage, then retire Vercel production projects/integration. Do not delete the working origin before these gates pass.

Rollback after retirement: roll back to a verified Cloudflare version with its asset set, or redeploy a verified Git revision to Cloudflare. Preserve the database and queues. Restoring an old Vercel DNS target is no longer a valid rollback. No data-schema rollback is introduced by the frontend migration.

## Sources

- https://opennext.js.org/cloudflare and https://opennext.js.org/cloudflare/get-started
- https://opennext.js.org/cloudflare/caching and https://opennext.js.org/cloudflare/howtos/custom-worker
- https://developers.cloudflare.com/workers/best-practices/workers-best-practices/
- https://developers.cloudflare.com/workers/platform/limits/
- https://vercel.com/docs/domains/managing-nameservers
- https://vercel.com/docs/domains/working-with-domains/transfer-your-domain

The exact installed adapter/runtime versions and final verification results must be recorded with the release. Historical Vercel evidence in `docs/validation` is audit history, not a production dependency.
