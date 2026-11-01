# Marks corrections and report recovery

## November 2026 incident

The supplied report batch reference contained a transcription error: the persisted
reference is `c04f5300-7ba4-474c-9192-a3a3d080dc1e`. It recorded 13 failures,
zero completed cards and 3,801 ms processing time. Worker traces locate the shared
failure in loading report branding/signature images, before PDF generation.

The upload provider is the existing Railway S3-compatible bucket. Dedicated PDF
storage uses the separately configured report provider. The stored image records
existed and were not expired. Signed reads returned HTTP 403
`SignatureDoesNotMatch`. The configured upload secret did not match the current
bucket credential; endpoint, bucket and access key did match. Using the current
credential read all three images with checksum validation and rendered all 13
reports from a read-only production transaction. No results or reports were
modified by that diagnostic check.

Synchronize `UPLOAD_OBJECT_STORAGE_SECRET_ACCESS_KEY` with the existing bucket on
the API and both report lanes, then deploy those services. Do not rotate keys,
replace storage, reset academic records or publish reports as part of recovery.
Never include secret values, object paths or learner details in incident output.

## Workflow guarantees

- Reopening teacher access changes access and its audit record only. It does not
  change submission, moderation, release state or report freshness.
- Exams Managers can correct eligible school markbooks even after deadlines and
  publication. An identical save does not rewrite marks. Real changes become
  drafts, retain submission history, and flag affected reports for correction.
- Direct submission loads the complete persisted roster and validates it using
  the normal mark validation. Its revision includes roster and saved versions;
  transaction locks reject stale or duplicate submissions.
- Regeneration creates a separate draft. Released report snapshots and PDFs
  remain official until the Principal releases a current, reviewed/locked revision.
  Parent/student results read the released snapshot. Withdrawal covers released
  revisions, including a release preceding a pending draft.
- Retry Failed targets the original durable job. Valid current completed cards
  are reused; stale or failed cards are regenerated. Bounded transient retries,
  durable leases, tenant authorization and worker crash recovery remain in place.
- Storage failures preserve the operation and HTTP status for secure structured
  logs. Credential/permission failures are permanent until repaired, while
  network failures, HTTP 408/429 and server failures remain retryable. Rendering
  and invalid image configuration have distinct safe public error categories.

## Deployment and rollback

No schema migration or dependency upgrade is required. Use the existing Git/main
Railway integrations and gated Cloudflare workflow. After deployment verify API
readiness, both report lanes, the failed job retry, stored PDF retrieval, and
unchanged publication counts. Do not edit real marks to perform a smoke test.

For a code regression, revert this release through the same deployment workflow
to the preceding main revision (`fff7fd922b88d4953fa47e53b7d763d1dbc5e4b3` at
implementation start). Keep the repaired storage credential. No academic data
reset or database rollback is necessary. If reports remain failed, inspect their
classified error and batch reference before retrying again.
