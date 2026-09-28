# School payment platform

Preserve the existing PostgreSQL/RLS, encrypted tenant finance configuration, BullMQ, outbox, double-entry ledger, fee allocation and receipts. School money continues directly to school-owned collection accounts.

## Decisions

- Add immutable school payment channel revisions with mandatory separate Principal approval; technical connection and activation are Super Admin operations. Existing active channels keep working while replacements are reviewed.
- Reuse tenant_payment_channels and tenant_mpesa_configs rather than create a second channel registry. Bank collection configurations carry explicit capability/connection states; never claim an unsupported provider contract has been tested.
- Normalize verified provider receipts into a durable tenant-scoped inbox; unique provider transaction identity, atomic ledger/allocation, recovery and immutable history protect against retries and bursts.
- Reuse actual provider adapters and require authenticated server-side evidence. Frontend input cannot mark automated payments successful. Provider onboarding/production credentials remain external prerequisites.
- Legacy configuration mutation endpoints cannot bypass approval. Parent/student finance scope remains enforced.

## Verification

Regression/unit tests, isolated PostgreSQL integration tests (approval, RLS, races, duplicate delivery, recovery, money conservation), API/web builds and focused browser/component checks. No production changes or real provider transactions during development.

## Dependencies

Configuration schema/contracts precede endpoints and UI; normalized receipt contract precedes provider integration; complete financial paths before reporting readiness.
