# Banking release evidence

Banking backend release `6e8376d60e92d55c81fd49a6303c48117057bd99` is deployed in production. Cloudflare publication was stopped by a release-check defect; the follow-up corrects the GitHub status endpoint while preserving publisher, service and commit verification.

## Production evidence, 26 October 2026

- PR #116 merged. Railway API (`6b1616fe-f8bd-40e2-8086-b48c724153a4`), payments worker (`67822930-3e67-4b16-811c-593d54c03373`) and both report workers reached SUCCESS at the banking release commit.
- Actual worker logs confirm schema verification, PostgreSQL/Redis connections and BullMQ startup. API readiness and the runtime environment audit passed with no missing/invalid configuration or active alerts.
- Read-only comparison after deployment preserved all five schools, 125 students and every inspected financial count/total. All nine new financial history/ingress tables enforce forced tenant RLS. No financial fixtures were inserted in production.
- Six production authentication/CSRF/status smoke checks passed; four new protected financial endpoints rejected unauthenticated requests carrying forged school headers.
- Main CI run `40376937799` passed quality, security, backend tests, PostgreSQL integration, Cloudflare build/runtime tests and container build. Cloudflare publication failed because GitHub's combined status response omits `creator`. The corrected lookup uses the full newest-first status list and has also verified the actual deployed banking commit.
- Follow-up regression coverage checks trusted publisher identity, immutable commit lookup, newest pending/failed status, malformed responses and transport errors. Production route enumeration is suppressed to avoid Railway's observed startup log burst limit; operational, audit, warning and error records remain enabled.

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
