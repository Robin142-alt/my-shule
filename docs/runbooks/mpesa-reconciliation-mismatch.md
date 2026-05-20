# M-Pesa Reconciliation Mismatch

Use this when Safaricom/provider totals and platform ledger totals differ.

1. Open the reconciliation dashboard and identify `missing_provider_record`, `amount_mismatch`, `duplicate_provider_receipt`, and `verified_unmatched` counts.
2. Generate an on-demand date-range reconciliation for the affected tenant payment channel.
3. Compare provider records to redacted platform records; retrieve raw payloads only through approved support vault access.
4. Keep the finance period closed to direct edits until discrepancy classification is complete.
5. Resolve through accountant review and dual approval. Never post a ledger correction from an unverified callback.
6. Attach the reconciliation batch id, approval request id, and sanitized evidence to the incident.
