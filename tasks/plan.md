# School payment platform

Preserve the existing PostgreSQL/RLS, encrypted tenant finance configuration, BullMQ, outbox, double-entry ledger, fee allocation and receipts. School money continues directly to school-owned collection accounts.

## Decisions

- Add immutable school payment channel revisions with mandatory separate Principal approval. Accountants can configure and test supported native banks after approval; Super Admin retains technical oversight, activation and suspension. Existing active channels keep working while replacements are reviewed.
- Reuse tenant_payment_channels and tenant_mpesa_configs rather than create a second channel registry. Bank collection configurations carry explicit capability/connection states; never claim an unsupported provider contract has been tested.
- Normalize verified provider receipts into a durable tenant-scoped inbox; unique provider transaction identity, atomic ledger/allocation, recovery and immutable history protect against retries and bursts.
- Reuse actual provider adapters and require authenticated server-side evidence. Frontend input cannot mark automated payments successful. Provider onboarding/production credentials remain external prerequisites.
- Legacy configuration mutation endpoints cannot bypass approval. Parent/student finance scope remains enforced.

## Verification

Regression/unit tests, isolated PostgreSQL integration tests (approval, RLS, races, duplicate delivery, recovery, money conservation), API/web builds and focused browser/component checks. No production changes or real provider transactions during development.

## Dependencies

Configuration schema/contracts precede endpoints and UI; normalized receipt contract precedes provider integration; complete financial paths before reporting readiness.

## Universal banking continuation — 25 October 2026

User scope extends this existing payment plan to eleven Kenyan banks and future registered providers. Preserve the deployed student progression feature, historical finances, existing approvals and the original checkout. Work in `codex/universal-banking` from deployed main `8938d938`.

1. Audit official provider contracts separately: Equity/Jenga, KCB/Buni, Co-op Connect, NBK/Access, Family, Absa Kenya, NCBA, I&M, DTB/Astra, Stanbic Kenya and Standard Chartered Kenya. Record dated source links, supported operations, documentation gaps, credential/onboarding dependencies, costs only where published, and test evidence. No guessed endpoints or claims of certification.
2. Extend the existing provider catalog and adapter seam with capability-based contracts and one registration boundary. Remove provider-name database/DTO ceilings while retaining registered-code validation. A test-only twelfth adapter must work through the public contract without core engine edits.
3. Implement accessible native protocols in bounded slices: secure fixed provider hosts, authentication/signing, authorized receiving-account checks, retrieval/verification, normalized durable evidence and shared posting. Missing contracts remain unavailable capabilities with real statement reconciliation. Sandbox never posts live money.
4. Complete connection workflow using existing immutable revisions, encrypted credentials, Accountant → Principal approval and Super Admin technical oversight. Add clear capability/readiness/health status and dynamic forms; activation must reflect actual evidence rather than saved credentials.
5. Complete shared credit application and audited legacy invoice migration, including locking, reversals, reconciliation invariants and portal statement consistency. Migration must not recreate historical cash or lose legacy lineage.
6. Verify adapters with official specifications, contract fixtures and isolated simulators; use real sandbox only with legitimate access. Verify concurrent ingestion, duplicated/backfilled evidence, multiple schools/accounts, receipt/ledger consistency, mobile UX and unchanged M-Pesa/progression workflows.
7. Built-in adversarial review, full release checks and evidence-based report. No live financial transactions or destructive production migration. Any deployment must be independently verified.

Trust boundaries: provider transport → school/account-bound evidence → durable verified inbox → central financial posting. Credentials are encrypted per school/revision and never returned. A reference may identify a learner only after the receiving account identifies the school. Provider-specific code cannot mutate ledger/invoice tables.

Approval policy remains existing governance. External account registration, merchant contracts, paid products, account entitlement and real-money certification are outside autonomous software tests. Unavailable official sandbox access is an explicit dependency, not a simulated pass.
