# School collection platform

The [verified ingress contract and deployment runbook](verified-payment-ingress.md) supersedes the callback configuration and sandbox restrictions below. New school C2B channels use that provider-neutral inbox; the accounting and approval workflow in this document is preserved.

This change extends MyShule's existing NestJS/Next.js, PostgreSQL tenant policies, BullMQ workers, event outbox, encrypted finance configuration, double-entry ledger and fee receipts. MyShule records money collected by a school's provider; it does not hold, pool or transfer school funds.

## School workflow

1. The Accountant or Bursar opens **Payment setup**, selects a provider and enters the school account name, Paybill/account number and reason. A bank-linked Paybill stores both the bank Paybill and the school bank account. Multiple active channels are supported.
2. A different Principal explicitly approves or rejects the immutable request in **Fees**. Pending requests do not replace a working channel.
3. Super Admin opens **Payment integrations**, selects an approved request and supplies only the credentials required for its connection mode. Credentials are encrypted with school/revision-bound authenticated encryption and never returned in API responses.
4. Super Admin checks the connection and activates it. Activation requires Principal approval, a successful check less than 24 hours old and the production environment. Replacement activation and retirement of the previous channel are atomic. All previous revisions and decisions remain available.
5. Accountant **Collections** shows confirmed, unmatched and statement entries. Statement entries require a separate Principal's confirmation before posting. Matching an unmatched reference requires an explicit student and reason. Reversals require a separate Principal decision and append compensating ledger entries.

The existing manual cash/cheque receipts, fee structures, invoices, fee statements, reconciliation reports and receipt preview/download paths remain in use. Legacy configuration mutation routes reject requests that would bypass approval.

## Supported provider modes

| Provider/channel | Implemented collection mode | Activation check |
| --- | --- | --- |
| School-owned Safaricom Paybill | Existing STK/C2B paths, normalized into collections; asynchronous C2B transaction-status verification | OAuth accepted and C2B callback registration accepted |
| Safaricom Paybill using statement review | Accountant enters statement evidence; separate Principal confirms it | Statement workflow enabled; no automatic provider connectivity is claimed |
| Equity, KCB, Co-op, other bank accounts and bank-linked Paybills | Statement review with the same ledger, allocation, receipt and reversal workflow | Statement workflow enabled |

**Native bank callbacks, bank transaction lookup and automated bank statement ingestion are not implemented by this change.** Bank-specific merchant contracts, credentials and certified adapters are required before enabling these capabilities. Do not describe a statement-mode channel as an automatic connection. Provider registration acceptance is not proof that an end-to-end production transaction has succeeded.

Provider contracts are described by `payment-provider.catalog.ts`. Adapters must authenticate provider evidence, resolve the approved destination server-side and call `CollectionPaymentsService.recognizeVerified` within the school's request context. There is deliberately no HTTP endpoint that accepts an ordinary user's claim that a payment is verified. A future adapter must supply the normalized provider identity, destination, transaction identity, positive KES minor-unit amount, reference and occurrence time; it does not implement fee accounting.

Reference documentation: [Safaricom Transaction Status](https://developer.safaricom.co.ke/apis/TransactionStatus), [KCB Buni onboarding](https://buni.kcbgroup.com/getting-started), [Co-op developer portal](https://developer.co-opbank.co.ke), [Equity Jenga](https://developer.jengahq.io). Merchant-specific contracts must be checked against the account actually being onboarded.

## Authentication and operational prerequisites

- Keep database runtime users subject to RLS; never operate the API with a superuser or `BYPASSRLS` role. Tenant identities are existing school slugs, not necessarily UUIDs. Platform queries require the authenticated `platform_owner` role and `superadmin` audience; financial actions run under one explicitly selected school.
- Retain the existing PII encryption key and documented key-rotation procedure. Historical credentials are needed to verify delayed transactions; do not delete old keys or revisions.
- Configure the public HTTPS payment callback address, the existing callback secret and `edge_signed` callback trust mode. Callback endpoint infrastructure must authenticate Safaricom independently before signing requests. **`x-mpesa-signature` is a MyShule gateway convention, not a native Safaricom signature. Merely signing every incoming public request is insecure.** Protect the API origin from bypassing that gateway, and strip caller-supplied signature headers there.
- Transaction-status result URLs contain random bearer tokens. Application request logs redact these tokens; configure equivalent redaction at the reverse proxy, gateway, APM and provider support tooling. The result also requires the gateway signature, matching request conversation, receipt, destination and amount. Acceptance of an asynchronous query is never treated as settlement.
- Run the payments worker and existing event/notification workers. Redis is a dispatcher; PostgreSQL holds the durable inbox and financial state. Inbound acceptance must not depend on immediate queue availability.
- Configure each school's existing clearing and fee-control accounts. Unmatched collections use `2110-UNALLOCATED-COLLECTIONS` (a school-scoped liability), paired with the existing M-PESA/bank clearing account. Account configuration conflicts fail visibly rather than changing the chart silently.

## Financial and retry invariants

- Exact integer minor units are used at the ingestion/accounting boundary. The collection record, ledger posting, invoice allocation, receipt, events and audit records use the same database transaction.
- Provider identity is unique by provider/destination/transaction. Safaricom receipts additionally have a global unique receipt constraint. Conflicting amounts/destinations are rejected for reconciliation. Old M-PESA ledger receipts are checked before introducing a new collection record to avoid adoption duplicates.
- Unmatched verified money is recognized in the clearing account against an unallocated liability. Matching reverses that suspense posting and creates the existing fee receipt in one transaction; it does not double count cash.
- Collections snapshot the school's configured clearing and fee-control account codes. STK retains the original intent's account codes; later configuration changes cannot redirect a posted receipt or its suspense release. Reviewed matching checks the selected invoice's school and student and records the reason for correcting a reference.
- Posted identity, amount, destination, allocation links and suspense history cannot be silently rewritten or deleted. Approved reversals restore invoice balances through existing reversal logic and preserve the original receipt.
- Overpayments produce credit allocation records. Credit summaries use those records, not the full amount of receipts that already paid invoices. Parent/Student views read canonical invoices and actual credits; a matching canonical invoice takes precedence over a legacy invoice.
- Accountant summaries expose non-negative fees due and available credit separately; portal and statement running balances can be negative to represent credit. Statement receipts account for their actual invoice allocations exactly once. Invoice and credit summaries paginate over the same student set, so page boundaries cannot drop credits.
- Duplicate callbacks serialize through database locks and constraints. Allocation waits for the relevant invoice lock rather than incorrectly treating a temporarily locked invoice as absent. Replaying a credit-only payment does not consume that credit a second time.
- Queue IDs are hashed, include school scope, and distinguish different callback deliveries for the same checkout. A later success can therefore follow an earlier failed result. The ledger still prevents duplicate recognition.
- Every 15 seconds, worker recovery traverses schools in pages of 100 and leases up to 50 eligible callbacks and verification jobs per school using `FOR UPDATE SKIP LOCKED`. A five-minute lease permits recovery after crashes or Redis outages. Only authenticated/provider-verified callbacks are sent for posting. Recovery records no secrets in logs.
- Platform health shows delayed confirmations, provider exceptions, pending statement reviews, unmatched payments and the last collection. Existing reconciliation and System Monitor tooling remains available.

## Rollout and migration gates

Schema changes follow the repository's existing serialized `runSchemaBootstrap` convention. New tables are additive, use tenant indexes/RLS and preserve existing receipts. Deploy API and worker from the same revision. Take and verify a database backup before deployment; never test against a live school database. Roll back application code while retaining new financial records and credential keys; do not drop the new tables as a rollback step.

Existing active legacy channels continue processing while schools adopt approved revisions. Existing C2B channels without school-specific status-query credentials require statement reconciliation until onboarded. Legacy invoices remain visible in portals, but schools that still bill only in `student_invoices` need an audited migration into canonical `invoices` before enabling automatic allocation. This change does not invent opening balances or silently migrate historical accounting.

An approved reversal records a financial correction/refund that staff have verified; it does not send a refund to a provider. Automated refund disbursement is not implemented. Existing credit records reduce net balances, but automatic reallocation of old credits to newly issued invoices still needs a governed allocation workflow.

Before production rollout, complete each merchant's onboarding, test a real controlled payment and delayed/replayed results through the actual trusted callback gateway, confirm receipts and linked portal balances, exercise worker/Redis recovery, and certify expected peak traffic against the deployment's PostgreSQL/Redis capacity. This development change is **not** live-provider certification or a completed peak-load test. Do not activate unreviewed schools in bulk.

## Verification

### Payment setup dashboard readiness (30 September 2026)

- Accountant/Bursar: overview counts and a Payment Setup action, a follow-up badge, a notification inbox, and filtered/paginated setup history. Requests use school account information only. Rejected/suspended setups remain visible with the decision/error and a correction action.
- Principal: Payment Setup and Collection Reviews are dedicated sidebar destinations; Approvals includes pending payment destinations with the existing explicit review form. Overview and approval totals include pending payment setups. Decisions require `principal:write` plus the service's Principal role, tenant and separate-requester checks; Principals receive no general billing-write capability.
- Super Admin: overview and sidebar expose the connection queue; live queue notifications point to payment integrations. Search and filters run on the server across schools, with connection work prioritized. Connection/activation mutations refresh the list and counts. Existing provider testing and health actions are retained.
- New request notifications are action-required, include the exact revision link and a persisted priority, and resolve in the same transaction as the Principal decision. Existing notifications with `href` remain navigable through the canonical inbox. Path-based and school-host links retain the appropriate role route. An old notification opens the current revision state; it cannot reapprove an already decided request.
- Counts come from all revisions, independently of list pagination, with separate live and sandbox totals. Ready-to-activate is a subset of the Super Admin queue. Follow-up excludes revisions for which a replacement has already been submitted. School queries derive scope from the authenticated request; platform summaries are owner-only. No credential fields are added to dashboard summaries.
- Lists/counts poll every 30 seconds; school mutations also notify the existing dashboard refresh layer. Loading, failure and retry states remain visible. The existing System Monitor remains responsible for operational payment failures; setup approval and provider connection are not delegated to it. Parent/Student access to private setup data remains denied.

The revision replacement lookup index is additive and uses the existing schema bootstrap. No payment records or approval decisions are migrated or rewritten. API and web changes should ship together. Local verification covers fixture-based browser workflows and disposable PostgreSQL, not an authenticated production school or a live provider connection.

Dashboard verification: API and Next.js production builds pass, along with 76 API/security/notification tests, 8 disposable PostgreSQL workflow tests, 106 component/routing tests and all 8 desktop/mobile browser checks. The database checks include queues with more than 200 historical revisions, tenant isolation, notification persistence and resolution, and rejection/correction/approval count changes. Browser coverage exercises Principal approval and role-specific notification links, Accountant/Bursar access, and Super Admin connection/testing/activation at 1440px and 390px. Principal notification layering keeps mobile actions above dashboard cards.

Focused tests cover approval separation, encryption/redaction boundaries, destination/amount/conversation checks, school RLS, concurrent duplicate confirmations, rollback, immutable history, suspense accounting, reversals, allocation races, queue recovery, portal linkage and credits. PostgreSQL tests require the disposable local harness, which refuses nonlocal or non-disposable databases:

```text
node -r ts-node/register/transpile-only -r tsconfig-paths/register apps/api/test/support/run-integration-with-local-postgres.ts jest --config jest.integration.config.js --runInBand apps/api/test/collection-workflow.integration-spec.ts apps/api/test/payment-allocation-safety.integration-spec.ts apps/api/test/payment-portal-balances.integration-spec.ts
```

The older `billing-correctness.integration-spec.ts` cannot currently compile because its support module imports the absent `students/attendance.controller`. This is a separate existing harness issue; the dedicated payment PostgreSQL suites run independently. Component tests are not a substitute for browser end-to-end merchant onboarding tests.

Latest local verification (28 September 2026): API and Next.js production builds passed. Focused billing/collection/security checks passed 43 tests across their latest runs, and the existing M-PESA suite passed 53 tests. The collection workflow and portal PostgreSQL suites passed 7 and 5 tests respectively. Earlier allocation PostgreSQL checks passed 4 tests and the setup/navigation component run passed 7 tests. These results cover isolated local fixtures and component interactions, not live merchant or peak-load certification.
