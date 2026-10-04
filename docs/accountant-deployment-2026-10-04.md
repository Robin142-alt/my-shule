# Accountant release — 4 October 2026

## Release intent

Deploy the locally verified Accountant changes through the existing GitHub, Railway and Cloudflare integrations. Software deployment is separate from live-provider certification. The owner selected Kibabi and KES 10, with the owner making the payment. No payment instructions should be issued until a production channel and valid existing fee balance are confirmed.

## Preflight and rollback

- Repository baseline: production `2a3071007553d308cef6ed1f6abb9138a4c54e28`; local baseline has the same tree.
- Railway project `striking-energy`, production environment `fd0e5b42-1ae9-41db-88ab-78183e02a5ce`.
- Previous API deployment: `7ca3616b-6151-4e06-96b8-f26d38ae8e19`.
- Previous payments worker deployment: `0bcb2af7-13bc-471c-b26c-f838e4ee1e8f`.
- Cloudflare serves the production website through the gated GitHub deployment job. The last successful production workflow was `37194951861`.
- API and worker use the same database, Redis and encryption key. Callback base is configured. Existing event consumption remains on the API; payment processing has a dedicated worker.
- A private logical backup of the actual application database `myshule_final` completed before rollout at 16:02:59 UTC. Archive inspection succeeded: 3,379,428 bytes, 4,692 entries, SHA-256 `aacf9f744d9dafa6d931d8a608175ee29f437baccfed9355f550e8c0813bba28`. Stored under the operator's private local application-data deployment-backups directory; never commit the database archive.
- Roll back the matching API/worker/web release if health fails or new financial integrity errors appear. Preserve additive schema and all financial/audit records; do not restore the database over newer school activity. Use exact previous deployment images rather than triggering an unknown Git revision. Capture the new deployment IDs and health evidence below.

## Additive schema

Existing transactional startup bootstrap adds requester, idempotency and decision fields to `school_expenses`, its tenant-aware unique key, and `manual_fee_reversal_requests` with approval separation, tenant foreign key, pending uniqueness and forced RLS. Verify these in the deployed database before considering the new UI operational. No financial history is rewritten by this release.

## Controlled live verification

The corrected Kibabi lookup uses tenant key `kibabi-high`, not the separate tenant-record UUID. It found 57 students, zero active learner invoices, one active Safaricom sandbox revision, and no production or bank revisions. An earlier diagnostic used the wrong tenant identifier and incorrectly reported no students; that conclusion is withdrawn. These diagnostics did not change records.

The installed bank providers support statement entry and separate Principal confirmation. Automatic bank collection requires an actual bank adapter/onboarding; the current implementation cannot certify an automatic bank callback flow.

| Check | Status |
| --- | --- |
| Production code and schema | Pending deployment verification |
| Kibabi production provider onboarding | Not configured at preflight |
| Existing student with active fee balance | No eligible invoice found at preflight |
| KES 10 provider-confirmed collection | Not attempted |
| Correct student allocation, receipt, statement, balance and daily collection | Locally verified; live evidence pending |
| Duplicate callback replay without second credit | Locally verified; real callback pending |
| Unmatched/conflicting provider evidence routed to review | Locally verified; live evidence pending |
| Parent/student authenticated statement | Live evidence pending |
| Bank collection | Statement-review flow supported; live evidence pending |

Certification remains **not live-ready** until the real-provider checks have evidence. Never fabricate provider callbacks, invent students/invoices, activate sandbox as production, or bypass approval to complete this checklist.
