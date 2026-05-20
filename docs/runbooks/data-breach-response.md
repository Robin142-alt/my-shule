# Data Breach Response Runbook

Use this runbook for suspected or confirmed exposure of student, guardian, staff, payment, health, discipline, biometric, report-card, or M-Pesa data.

## Triage

1. Open a breach response report in `breach_response_reports` and assign an incident number.
2. Classify severity as `low`, `medium`, `high`, or `critical` based on the affected data categories, number of learners, payment impact, and whether raw M-Pesa payloads or health/biometric records were exposed.
3. Review observability alerts, audit logs, M-Pesa callback logs, report exports, support tickets, and recent deployment changes.
4. Preserve evidence in `evidence_export` with raw PII redacted or stored only in approved encrypted stores.

## Containment

1. Disable affected credentials, sessions, webhooks, exports, or module jobs.
2. Rotate secrets with `docs/runbooks/secret-rotation.md` if callback, database, object-storage, or provider credentials may be exposed.
3. Run `npm run security:pii-scan`, `npm run security:scan`, and `npm run tenant:isolation:audit`.
4. Record every containment step through audit logging and update the breach report status to `contained`.

## Notification

1. Confirm whether ODPC, school leadership, affected guardians, provider contacts, or law enforcement notification is required by counsel and school policy.
2. Record `reported_to_odpc_at` when regulatory notification is made.
3. Keep guardian communications factual, minimal, and free of raw exposed data.

## Evidence Export

1. Export the report through `GET /compliance/breach-response-reports/:reportId/export`.
2. Confirm the export redacts phone numbers, payer names, raw callback bodies, admission numbers, and identity document fields.
3. Attach the sanitized export to the incident ticket and preserve the generated PII scan artifact at `docs/security/pii-leak-ci-scan.md`.

## Closure

1. Confirm the root cause is fixed, tests and scans pass, and affected access tokens or credentials are invalidated.
2. Record corrective actions, preventive controls, and owner signoff in `evidence_export`.
3. Update status to `closed` only after containment, notification, and evidence export review are complete.
