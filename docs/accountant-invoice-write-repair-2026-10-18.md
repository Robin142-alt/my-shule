# Accountant invoice-save repair — 18 October 2026

After the roster repair, **Review invoices → Issue invoices** still returned HTTP 500. Production errors at 14:57 UTC identify PostgreSQL `42703`, missing `subscriptions.last_invoice_at`. A school-scoped read confirmed that Kibabi had zero invoices: the failed requests had stopped before saving anything.

Schema inspection also found older Prisma invoice columns with required school, learner, academic-period and major-unit fields, plus missing SQL defaults for ID and updated time. The current billing repository writes canonical minor-unit amounts and learner/period metadata. Fixing only the missing subscription column would expose the next insert failure.

## Repair

`INVOICE_WRITE_SCHEMA_SQL` is a separately executable, repeatable expansion included in billing startup:

- Add the nullable subscription billing timestamp and invoice ID/update defaults.
- On installations with legacy invoice fields, synchronize school/learner identifiers, amounts, balance, due date and status in the same write transaction. Existing rows are not rewritten.
- Preserve foreign keys and forced row-level security. Reject disagreeing school/learner references, foreign learners or academic periods, and negative amounts.
- Permit absent academic-period relations when the fee plan supplies labels instead of database IDs; no placeholder years or terms are created. Student relations may be absent for platform subscription invoices. Student-fee services continue to require a school-owned learner.
- Align Prisma's read model with the existing text statuses and optional relations. Parent views can use the fee plan's academic-year and term labels when relations are absent.
- Use canonical text comparisons for invoice IDs on both UUID and text installations, preserving UUID validation and every tenant predicate. This covers retrieval, allocation and reversal after issuing an invoice.

The compatibility trigger is necessary because existing Prisma consumers and the Accountant billing repository use the same invoice table with different column contracts. It keeps the two representations connected without duplicating invoices or changing the accounting unit used by billing.

## Verification and rollout

The regression suite covers modern UUID, text identifiers and the production-style legacy invoice shape. Before repair, the legacy cases reproduced the missing-column error. After repair, 17 tests pass, including real invoice persistence, duplicate retry, event-failure rollback, tenant rejection, reads through Prisma and billing, allocation/reversal, and synchronized balances. Event behavior in this disposable suite uses a transactional test publisher; production rehearsal verifies the real outbox separately.

Apply the exact expansion in a transaction with bounded lock/statement timeouts after a verified database backup. Rehearse and roll back first. Compare foreign keys, RLS and policies before and after, then commit only the schema change. No production invoice batch should be committed by the deployment script.

Rollback before commit is a normal transaction rollback. After successful use, retain the compatible additive schema when rolling back application code; do not drop populated fields or restore NOT NULL constraints over legitimate subscription/label-only invoices. The pre-change backup is reserved for disaster recovery, not a routine application rollback.

Authenticated browser interaction remains dependent on browser access; server-side and database verification must be reported separately. This repair does not certify live M-Pesa or bank provider connections.
