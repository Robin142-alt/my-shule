# Payment platform implementation

- [x] Inspect existing finance/AGP/tenant/event/database/routing contracts and identify gaps.
- [x] Add provider catalog and immutable, approved channel revisions with encrypted credentials and real Safaricom registration checks.
- [x] Wire Accountant setup, Principal decisions and Super Admin technical connection/health screens.
- [x] Normalize confirmed STK/C2B and approved statements into existing ledger, allocations and receipts with database recovery and duplicate protection.
- [x] Add unmatched-payment suspense entries, explicit matching, approval-controlled reversals and credit read models.
- [x] Close legacy configuration approval bypasses; bind asynchronous evidence to the request/receipt/amount/destination; authorize Parent/Student payment targets before provider requests.
- [x] Add isolated PostgreSQL approval/RLS/concurrency and shared portal balance tests; focused callback/recovery/accounting and UI regressions.
- [x] Document supported modes and rollout gates in docs/payment-platform.md.
- [x] Finish final post-change compiler and regression checks: API/web production builds, API typecheck, billing/security/M-PESA regressions and isolated PostgreSQL workflow/portal checks.
- [ ] Obtain bank merchant contracts and certify implemented native adapters; Equity retrieval and KCB signed account notifications now have local contract coverage. Other bank modes remain reviewed statements until their adapters are implemented.
- [ ] Migrate any school still using only legacy student_invoices with audited opening balances.
- [x] Add governed automatic application of existing credits to future invoices; audited manual reconciliation and receipt reversal preserve invoice/credit history.
- [ ] Certify real merchant onboarding/callback gateway, browser end-to-end flows and peak-volume deployment capacity before production activation.

## Universal banking implementation slices

- [ ] Assess all eleven banks against official sources; record method, credentials, access gaps and certification status independently.
- [x] Extend catalog and capability contracts; prove registration of a test-only additional provider without financial engine/schema changes.
- [ ] Implement each accessible official native protocol and hostile-input/authentication contract tests; never register unimplemented capabilities.
- [ ] Connect native verified evidence to existing durable inbox, worker recovery and shared ledger/allocation path.
- [ ] Extend approved connection configuration, diagnostics and lifecycle with provider-specific dynamic inputs and genuine activation gates.
- [ ] Complete governed credit application, overpayment correction and reversals; verify conservation under concurrency.
- [ ] Complete audited, idempotent legacy invoice preview/adoption; preserve original records and avoid historical cash reposting.
- [ ] Complete Accountant bank setup/reconciliation/credit UI and related Principal/Super Admin workflows; test mobile and desktop.
- [ ] Run isolated provider/database/end-to-end and existing M-Pesa, finance, portal and progression regression checks.
- [ ] Run built-in review and release checks; publish per-bank implementation, sandbox/live evidence and remaining external dependencies.

Each slice requires focused tests and build/type checks before committing. Existing completed items above remain historical verification records and are rechecked where affected.

### Verified progress and remaining accounting audit findings

- Eleven independently documented bank targets are registered; unimplemented native capabilities remain disabled. Catalog/M-Pesa credential regressions: 19 passed, API build passed.
- Invoice-only manual receipts now resolve and validate the same-school learner before posting, preserving overpayment ownership. Focused billing/control regressions: 47 passed.
- Credit application covers automatic new-invoice application, an audited Accountant action, immutable application/reversal history, manual/online credits and remaining-credit reads. Forty PostgreSQL regression tests pass across credit application, portal balances, Accountant approvals/reversals and UUID/text/legacy invoice schemas. Six UI tests pass; web typecheck and API build pass. Cash and STK statements preserve one receipt after credit application.
- Inspect the legacy M-Pesa finance-approval resolver: it currently marks a reconciliation discrepancy resolved without executing a reversal. Complete actual approved financial corrections before claiming the reversal requirement complete.
- Legacy `student_invoices` adoption and the old `/finance/invoices/generate` writer remain to be replaced through canonical billing with audited lineage.
- Equity Jenga authenticated, RSA-signed account statements and diagnostic transaction query are implemented against official specifications. Native retrieval is wired through the existing BullMQ worker, tenant-scoped durable cursors, verified inbox and shared posting; no bank sandbox/live certification is claimed.
- Accountant bank credential configuration and connection testing follow Principal approval; Super Admin retains activation. Dynamic inputs and retrieval/retry controls pass 17 UI tests; web typecheck passes. Provider/inbox/worker focused tests pass (21 tests); 42 PostgreSQL ingress, workflow and Accountant regressions pass, including same-account credential rotation and historical manual bank receipt protection.
- Additional official public specifications discovered on 26 October: KCB account IPN (RSA-SHA256 signature, receiving account) and Co-op full statement/account validation. KCB is implemented below; Co-op remains next. Official schema snapshots are in ignored `output/bank-research/` for development, and source URLs are recorded in `docs/universal-banking.md`.
- Final native retrieval slice checks: API build passed; 63 focused billing/provider/recovery/worker tests passed; 42 PostgreSQL regressions and 17 UI tests passed; web typecheck passed. No live bank account or production financial record was modified.
- KCB Buni account-credit notifications now verify raw-body RSA signatures, receiving account, exact amount and timestamp through the real HTTP ingress. Platform-managed bank signing keys and recent signed delivery gate activation; stale credential versions and conflicting proof fail closed. Callback-only providers are excluded from polling and Daraja simulation. Checks: 15 focused provider tests, 44 PostgreSQL regressions and 19 UI tests pass; API build and web typecheck pass. Official sandbox/live tests remain unavailable/pending.
- Pre-activation bank notifications can now close against the exact same Principal-approved statement receipt. Pending statements and amount mismatches remain blocked; inbox placements come from the actual collection. Reproduced RED, then 38 PostgreSQL ingress/workflow tests passed plus the focused mismatched-amount check; API build passed. No second cash posting is made.
