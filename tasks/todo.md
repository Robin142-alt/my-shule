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
- [ ] Obtain bank merchant contracts and implement/certify native bank adapters; current bank mode is reviewed statements.
- [ ] Migrate any school still using only legacy student_invoices with audited opening balances.
- [ ] Add governed automatic reallocation of existing credits to future invoices, if required for rollout.
- [ ] Certify real merchant onboarding/callback gateway, browser end-to-end flows and peak-volume deployment capacity before production activation.

## Universal banking implementation slices

- [ ] Assess all eleven banks against official sources; record method, credentials, access gaps and certification status independently.
- [ ] Extend catalog and capability contracts; prove registration of a test-only additional provider without financial engine/schema changes.
- [ ] Implement each accessible official native protocol and hostile-input/authentication contract tests; never register unimplemented capabilities.
- [ ] Connect native verified evidence to existing durable inbox, worker recovery and shared ledger/allocation path.
- [ ] Extend approved connection configuration, diagnostics and lifecycle with provider-specific dynamic inputs and genuine activation gates.
- [ ] Complete governed credit application, overpayment correction and reversals; verify conservation under concurrency.
- [ ] Complete audited, idempotent legacy invoice preview/adoption; preserve original records and avoid historical cash reposting.
- [ ] Complete Accountant bank setup/reconciliation/credit UI and related Principal/Super Admin workflows; test mobile and desktop.
- [ ] Run isolated provider/database/end-to-end and existing M-Pesa, finance, portal and progression regression checks.
- [ ] Run built-in review and release checks; publish per-bank implementation, sandbox/live evidence and remaining external dependencies.

Each slice requires focused tests and build/type checks before committing. Existing completed items above remain historical verification records and are rechecked where affected.
