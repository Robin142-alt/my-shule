# Accountant daily finance readiness

## Scope and acceptance

Improve the existing Accountant/Bursar workspaces without changing accounting policy, tenant boundaries, provider trust checks or approval separation. Verified production collections must post once to the correct learner; exceptions stay visible and actionable. All amounts use integer minor units. Daily figures use Africa/Nairobi.

| Capability | Existing owner | Acceptance |
| --- | --- | --- |
| Payment setup | tenant-finance | Principal decisions and platform connection readiness remain visible; sandbox cannot credit fees |
| Automatic collections | payments / billing | Verification, matching, allocation, receipt, event and audit remain connected and idempotent |
| Daily finance | admin-command / accountant overview | Cleared collections only, consistent credits/balances, channel totals, all pending queues |
| Billing and statements | billing / accountant workspaces | Real invoices and statements, learner lookup, loading/error states, guarded submissions |
| Exceptions and controls | collections / finance | Unmatched money, provider review, cheque clearing, reversals, waivers and expenses have clear next steps |
| Documents | billing / reports | Existing preview, download and print use persisted values |
| Navigation and usability | accountant command center | Distinct workspaces, working history/deep links, mobile layout, concise labels and accessible controls |

Implementation order: accounting/read-model correctness → workflow repairs → daily desk and navigation → focused regression and browser checks.

## Boundaries

Keep existing NestJS services, PostgreSQL tenant execution/RLS, event outbox, payment verification and shared React components. No provider activation, live financial mutation, production deployment or demo seeding is part of local implementation. No additional dependencies are needed.

## Verification

- API: `npm run build`, focused Node tests and disposable PostgreSQL payment integration suites.
- Web: `npm --prefix apps/web run test:design -- --runTestsByPath ...`, TypeScript/build and targeted lint.
- Runtime: desktop/mobile navigation, empty/error states, collections, billing, receipt/report paths using isolated fixtures.
- Record findings, changes and precise limitations below as verification finishes; local fixtures do not certify a live bank or Safaricom connection.

## Initial findings

- The overview counts pending cheques as collected and computes balances without the canonical unapplied-credit read model.
- Fee follow-up uses an older credit calculation that can treat an allocated receipt as entirely unapplied.
- Billing and manual receipt screens duplicate unrelated code and label different tasks as the same collections desk.
- Overview omits bank collection exceptions, ingress verification problems and approval queues.
- Expense approval endpoint currently records a generic workflow action; its persistence path needs verification.

## Verification results

The local implementation is on `codex/accountant-daily-finance`. It has not been deployed or certified against a school's live payment providers.

### Implemented

- Today shows Nairobi-day cleared collections, receipt counts, method totals, net outstanding fees and actionable queues. Cheques count on clearing day. Draft, cancelled and written-off invoices do not inflate arrears.
- One read-only receipt projection includes older completed school STK payments in receipts, statements and reconciliation. A matching manual ledger receipt suppresses the STK projection, so money is never posted twice. School subscription payments and unposted intents are excluded. Provider references come from the verified M-Pesa transaction, not a user-entered reference.
- Statements retain cancelled/write-off history with explicit adjustments, omit draft charges and represent allocated receipts once. Integer minor-unit parsing and formatting avoid floating-point money errors. Spreadsheet exports escape formula-like references.
- Electronic money must enter through verified collection or approved statement workflows. The manual receipt endpoint accepts cash and cheques. Student and invoice ownership are checked before persistence, including pending cheques. Changed payloads cannot reuse a receipt submission key.
- Cash/cheque status changes emit durable events. Bounced cheques notify finance. Manual reversal requests require a different Principal; approved reversal, invoice restoration, receipt state, ledger work and events share a transaction. Legacy reversal routes cannot bypass that approval.
- Expenses persist a requester and stable submission key. Principal decisions update the actual record, reject self approval and retain notes/events. Approval is clearly separate from payment disbursement. The register has status filtering and pagination, including older approved records.
- Single and bulk learner invoices validate school ownership and roster eligibility, derive learner identities from persisted records, guard retries and emit events. Learner billing no longer changes the platform subscription invoice lifecycle.
- Provider queues show effective posting state, prioritize production exceptions, and support pagination. M-Pesa manual matching lists only provider-verified unmatched deposits; users select a learner and the backend allocates existing invoice balances. Verification errors remain visible in the collections workspace.
- Navigation has a daily desk, separate billing/controls/report workspaces, browser history updates and a mobile menu. Payment/receipt screens share one implementation. Main forms use searchable learners, meaningful errors, retry-safe submissions and usable phone layouts. Receipt previews distinguish pending acknowledgements from cleared receipts.
- Report previews use school identity and reveal activity-record failures rather than silently swallowing them. Full CSV exports preserve the existing backend reporting paths; preview truncation remains explicitly labelled. Document previews use one toolbar, download real HTML artifacts, and truthfully label the browser print-to-PDF action as “Save as PDF”. Opening a preview no longer depends on popups.
- The web build root now includes the repository's shared browser-safe contracts, fixing the pre-existing compiler failure resolving the academic report contract used by the shared dashboard.

### Verified locally

- API TypeScript: pass.
- Web TypeScript: pass, including the production build's type check.
- Billing, finance controls and admin command Node tests: 178 checks passed across the initial run and the repaired pagination-contract rerun.
- Disposable PostgreSQL: 47 checks passed across six suites and focused reruns (`accountant-overview`, `accountant-controls`, `collection-workflow`, `payment-ingress`, `payment-allocation-safety`, `payment-portal-balances`). Coverage includes RLS, unknown/foreign learners, duplicate provider confirmations, sandbox isolation, approval separation, event failure rollback, canonical credits, STK deduplication, Nairobi midnight and late cheque clearing.
- Finance design tests: 18 checks passed across amount precision, CSV export safety, downloadable document escaping, daily workflow interactions, command-center contracts, existing bulk billing and verified-only M-Pesa matching. The last document regression run passed 6 checks; the M-Pesa/daily-workflow rerun passed 5.
- Targeted lint: no errors; warnings remain in older shared dashboard code and existing effect-based loaders. No lint rule was disabled.
- Native browser: actual Accountant components rendered against an isolated read-only fixture at desktop 1440×1000 and phone 390×844. Verified mobile navigation, invoice form sizing, responsive receipt cards, cheque actions and real receipt preview/print/download controls. No horizontal overflow in the checked phone screens. The fixture uses fictional data and refuses financial writes; it is not a live end-to-end provider test.
- Initial concurrent test runs encountered machine-contention timeouts. Reruns used longer Jest timeouts without changing assertions, connection pool limits or financial invariants. The existing 8-way duplicate callback test passed unchanged. The test harness uses `--forceExit` for imported runtime handles and destroys only its disposable PostgreSQL cluster.

### Release requirements and known boundaries

1. Deploy with the existing schema/bootstrap process so expense reviewer/idempotency columns and the tenant-isolated manual reversal table exist before serving the new UI. These changes are additive; do not remove their audit records on rollback.
2. Confirm each school's Principal-approved production channel, provider credentials, callback trust configuration and worker/recovery configuration. Run controlled school-authorized M-Pesa and bank transactions, duplicate callback replay, unmatched-reference recovery and parent/student statement checks in staging before activating real collections.
3. Older STK receipts without collection records are now visible and labelled for administrator reversal review. They do not have a newly invented one-click refund path. Modern verified collections and manual cash/cheques use the governed reversal workflows. No refund or bank disbursement is executed by expense/reversal approval.
4. Conflicting provider evidence remains an exception requiring investigation; the UI does not let an accountant override provider verification or treat sandbox evidence as money.
5. No live-provider transaction, production migration, deployment, outbound SMS/email, or real-school data mutation was performed. Browser verification used isolated fixtures, and database checks used disposable databases. Full authenticated browser-to-provider certification is still a release requirement.
6. An independent reviewer agent was requested but could not run because of its usage limit. Do not interpret the checks above as an independent security review.

Production build: the final run passed after the document-toolbar changes, successfully compiling, type checking and generating all 96 static pages. The pre-existing Next middleware deprecation warning remains; no compiler check was disabled.
