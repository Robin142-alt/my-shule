# Secret Rotation Runbook

Use this runbook for scheduled rotation, suspected exposure, staff offboarding, or provider credential replacement. Never print secrets in tickets, logs, screenshots, terminal transcripts, pull requests, or support exports.

## Scope

M-Pesa secret rotation covers:

- `MPESA_CONSUMER_SECRET`
- `MPESA_PASSKEY`
- `MPESA_CALLBACK_SECRET`
- `MPESA_TRANSACTION_STATUS_SECURITY_CREDENTIAL`
- tenant-owned consumer secrets, passkeys, callback secrets, initiator credentials, and callback channel secrets

Platform secret rotation covers:

- `JWT_SECRET`, `JWT_ACCESS_TOKEN_SECRET`, and `JWT_REFRESH_TOKEN_SECRET`
- `APP_TRUSTED_TENANT_HEADER_SECRET`
- `REPORT_CARD_DOWNLOAD_SIGNING_SECRET`
- `SECURITY_PII_ENCRYPTION_KEY` or KMS-backed encryption material
- provider API tokens for email, SMS, malware scanning, object storage, Redis, Postgres, CI, Railway, and Vercel

## M-Pesa Secret Rotation

1. Open a restricted ticket with the tenant, shortcode, environment, reason, owner, approver, and rollback owner.
2. Confirm the active M-Pesa channel is not in an incident or finance close window.
3. Generate new Safaricom/Daraja credentials outside the application and store them only in the approved secret manager.
4. Rotate tenant-owned credentials through `POST /tenant-finance/mpesa-config/:configId/rotate-credentials` using a billing updater account.
5. Confirm the response shows masked values only, increments the credential version, and writes a masked audit log.
6. Rotate callback channel secrets and keep the overlap window active for in-flight callbacks.
7. Update `MPESA_TRANSACTION_STATUS_SECURITY_CREDENTIAL` anywhere a platform-level transaction-status credential is used.
8. Run go-live validation and the Implementation 30 certification gate.
9. Process a low-value sandbox or production-approved test transaction, then verify provider status before ledger posting.
10. Revoke old Daraja credentials only after callbacks, verification jobs, and reconciliation remain healthy through the overlap window.

## Platform Secret Rotation

1. Open a restricted platform ticket with impact, owner, approver, rollback owner, and planned maintenance window.
2. Generate new material in the approved secret manager; never print secrets.
3. For JWT secrets, rotate access and refresh token secrets separately when possible, keep a short overlap for active sessions, and force re-authentication for high-risk incidents.
4. For `APP_TRUSTED_TENANT_HEADER_SECRET`, deploy the new edge signer and API verifier together, then confirm unsigned tenant headers are rejected.
5. For `REPORT_CARD_DOWNLOAD_SIGNING_SECRET`, set a short expiry window, rotate, and verify old published snapshots remain immutable while stale download links expire.
6. For encryption material, follow the KMS or `SECURITY_PII_ENCRYPTION_KEY` re-encryption procedure before revoking old keys.
7. For Redis/Postgres/provider tokens, update the managed service secret, deploy, and verify TLS/SSL enforcement and smoke checks.
8. Run `npm run release:readiness`, `npm run security:scan`, `npm run security:deps`, and `npm run implementation30:certify`.
9. Store only evidence links, masked values, timestamps, and command exit status in the ticket.
10. Revoke old material after validation and record the revocation time.

## Emergency Rotation

1. Freeze affected writes if the secret could allow payment, report-card, tenant, or child-data changes.
2. Rotate exposed credentials immediately, then invalidate sessions, callback channels, queues, and provider tokens in that order.
3. Search logs and support exports for accidental disclosure without copying the secret into new systems.
4. Run the payment, report-card, and tenant-isolation smoke checks before restoring normal operations.
5. Complete an incident review with root cause, affected tenants, data exposure assessment, and follow-up controls.
