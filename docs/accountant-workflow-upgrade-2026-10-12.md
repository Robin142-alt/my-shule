# Accountant daily workflow upgrade

Scope: simplify existing school finance workflows, keeping the accounting services, tenant guards, approvals, audit interceptor and invoice events authoritative. No production data or provider configuration is changed by this work.

## Acceptance checks

- Fee structures contain setup and a clear next action to bill learners. Cash entry, statements, reconciliation and subscription controls stay in their dedicated workspaces.
- School roster supplies grade/form choices. A fee plan can cover several grades; billing can select a whole grade, several classes/streams, or named learners. The server revalidates every selected learner.
- One shared invoice dialog is available from Fee structures and Invoices. It loads eligible learners automatically, searches names/admission numbers, previews selected count and total, prevents double submission, preserves failed attempts, and explains skipped duplicates.
- Existing single-grade/class plans continue to work. Archived plans cannot bill. No sandbox collection becomes a live fee credit.
- Reports support an explicit reconciliation period and payment method; preview/download use the same filters and truthful errors.
- Existing daily collections, provider review, expenses, cheque handling and reversals keep their governed accounting paths. Removed nested pagination in invoice/payment/M-Pesa lists and improved register recovery states.
- Current waivers enter the Principal inbox, require a separate authorized approver and reduce canonical invoices transactionally. The original charges and explicit waiver adjustments remain visible on statements. Waivers never create cash, payments or receipts. Older approval records stay visible with administrator-review guidance.

## Architecture checks

CODEx Master Bootstrap / AGP Governance / Agent Governance Protocol: billing read/write capabilities remain server enforced. Tenant Isolation Layer: authenticated school scope, scoped SQL and school query keys. Event Bus Initialization: existing invoice recording and mutation audit/event interceptor remain in place. Database Contract Layer: additive grade selection stored in existing fee structure metadata with an explicit validated DTO. Widget Registry Initialization: workspace loading/error/empty states remain visible. Autonomous Runtime Execution / Self-Healing Autonomous Agents / Cloud-Native Execution Layer / Global Execution Loop: preserve existing runtime architecture and retry paths; no new background system.

## Live payment limitation

Kibabi currently has only sandbox provider setup. Production certification still requires approved production credentials and genuine provider transactions, including duplicate and unmatched-reference checks. Local workflow tests cannot establish that certification.

## Waiver accounting and rollout

The previous waiver path could directly approve a request and alter legacy `student_invoices`, bypassing the invoice ledger used by the Accountant. Current requests use `dashboard_approval_requests`; Principal decisions lock the request and learner invoices, check the outstanding amount again, reduce oldest outstanding invoices, and persist adjustment history, audit, outbox event and requester notification in one transaction. Same-request retries reuse the decision without another adjustment. Client invoice metadata cannot forge waiver history. The portal invoice read model reads the same reduced balances.

Deploy the API before the new frontend. `BillingSchemaService` includes `FEE_WAIVER_INVOICE_SCHEMA_SQL`: it replaces the positive-total constraint with a non-negative-total constraint, allowing a fully approved waiver to leave zero due. The expansion does not rewrite existing amounts, remove records or change tenant policies; new invoice creation still requires a positive amount. The integration suite applies the expansion twice to verify restart safety. Once zero-total invoices exist, do not restore the older positive constraint during rollback. Keep the expanded database contract and fix forward if necessary.

Legacy `approval_requests` and `tenant_pending_waivers` are not automatically copied or applied: their relationship to current invoices needs administrator review. Both legacy decision entry points refuse financial execution before any new balance or approval mutation. Current Accountant requests have a working Principal decision action. Tax-bearing adjustments exceeding the invoice subtotal fail explicitly for administrator review.

This increment is prepared locally; it has not deployed the new waiver constraint or UI to production. The workspace contains substantial unrelated changes, which must remain outside a finance release.

## Verification evidence

- 75 backend billing, finance and governed workflow tests passed. They cover grade scope, duplicate invoices, forged adjustment metadata, payment/reversal controls, statement totals and permission checks.
- 24 disposable PostgreSQL tests passed across three suites. They cover finance controls and overview figures, plus concurrent waiver retries/decisions, separate approvers, tenant RLS, capability denial, full/partial waivers, changed balances, audit/outbox rollback, request notifications, and current multi-grade roster queries including deleted learners.
- 119 UI tests passed across ten suites. They cover shared billing review, multiple classes, individual search, unchanged retries and reviewed roster snapshots; fee setup loading/errors/permissions; report filters and API envelopes; waiver retry and Principal decisions; the actual authenticated-request/CSRF billing contract.
- `apps/web/tests/design/accountant-usability-browser.mjs` builds real components with application CSS and isolated local API/auth fixtures. It exercises fee creation, class selection, invoice review/issue, report preview/close, waiver forms and error recovery at widths 320, 390, 768, 1024 and 1440. All five passed with no browser errors or horizontal page overflow. This is component/runtime evidence, not a live authenticated school/provider test.
- Browser evidence is in `output/accountant-usability/` (local screenshots and `results.json`). The tablet check exposed overlapping report-preview Close/Cancel controls; one accessible Close action now works on all tested widths, supports Escape and restores focus.
- API and web TypeScript checks and the Next production build passed. Final focused regression results are recorded alongside the local browser artifacts.
