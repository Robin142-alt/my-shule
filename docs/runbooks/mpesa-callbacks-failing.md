# M-Pesa Callbacks Failing

Use this when STK or C2B callbacks drop, fail signature/provider verification, or stop posting verified payments.

1. Check `observability/dashboard` for `mpesa.callback.failure_rate`, `mpesa.verification.queue_lag`, and queue dead letters.
2. Confirm Daraja callback registration, callback channel secret version, and `MPESA_CALLBACK_TRUST_MODE`.
3. Inspect only redacted callback evidence first. Raw payload vault access requires ticket id, reason, expiry, and elevated permission.
4. Run provider transaction-status verification for affected receipts before any manual ledger posting.
5. Move unmatched C2B receipts to accountant review and require dual approval for reversal, write-off, move, or mismatch posting.
6. Communicate impact to schools, including affected Paybill/Till, time window, and expected reconciliation time.
