# Accountant roster loading repair — 18 October 2026

Opening **Bill learners** for an existing fee structure returned HTTP 500 instead of its learner roster. Production logs at 13:56–14:00 UTC reported PostgreSQL `42883: operator does not exist: text = uuid`. A read-only check under the configured runtime database role reproduced that exact error in `FeeStructuresRepository.findById` for Kibabi's active plans.

Production's legacy `fee_structures.id` column is text, while new schema installations use UUID. The list query worked, but the selected-plan lookup compared text IDs with a parameter cast to UUID. Invoice generation and archiving shared the same incompatible comparison. The earlier roster integration test exercised students and allocations directly, without selecting a persisted fee plan, so it missed this failure.

The repair compares canonical text representations of both identifiers in the shared lookup and archive queries. UUID validation and normalization remain intact. Both queries retain their explicit school predicate and database RLS. There is no schema migration, data conversion, permission change or change to invoice calculations.

## Regression coverage

`apps/api/test/fee-structure-legacy-schema.integration-spec.ts` runs against disposable PostgreSQL using both current UUID identifiers and the production-style text identifiers for fee plans, students, allocations and invoices. It exercises the actual billing service and repositories under a restricted RLS role:

- Selecting a persisted plan loads only the correct school's learners, including when a valid UUID uses uppercase characters.
- Generating invoices uses the stored learner details and fee amount, skips an already invoiced learner on retry and rejects foreign learners/plans.
- Event failure rolls the invoice transaction back; retry can then succeed.
- Archiving affects only the school's plan and prevents further billing.

The event publisher is replaced with a transactional evidence table and injected failure; these checks do not claim external notification delivery. Before the fix, all four text-schema cases failed with the reported database error and all four UUID cases passed. The suite is included in the existing CI finance gate.

The repaired source was also checked against production in a READ ONLY transaction: Kibabi has two active plans, five roster groups and 13 eligible learners for **2026 ACADEMIC**. The archive query compiled with EXPLAIN without executing the mutation. No production invoices or financial records were created or altered during diagnosis.

The reported browser session could not be inspected because local browser access is disabled in Work settings. Production verification therefore uses the server-side evidence above; the user can reload the dialog after deployment to verify their session.

## Release and rollback

Ship this application-only repair through the existing deployment pipeline. Rollback is a normal application revision rollback, although it reintroduces the legacy-ID failure. Preserve all school records. Live M-Pesa/bank certification is unrelated to this repair and remains unchanged.
