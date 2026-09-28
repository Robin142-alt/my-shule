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
