# Security Lockdown Mode Runbook

Use this runbook when an active attack, suspected breach, verified cross-tenant attempt, payment callback spoofing, credential leak, or severe abuse pattern threatens production.

## Immediate Actions

1. Declare security lockdown mode and assign an incident owner.
2. Preserve audit logs, API logs, database logs, payment callback logs, and deployment evidence.
3. Rotate suspected secrets, starting with JWT, tenant header, payment callback, object storage, Redis, database, and provider credentials.
4. Disable provider callbacks that fail verification or show replay patterns.
5. Tighten WAF, NGINX, and Redis-backed rate limits for the abusive class.
6. Block risky admin/internal routes unless the on-call owner explicitly needs them.

## Lockdown Controls

- Keep safe read-only parent/school status available if tenant isolation and cached data are trustworthy.
- Disable non-essential writes, exports, bulk imports, and support raw PII retrieval.
- Require MFA for all privileged users before restoring admin workflows.
- Revoke suspicious sessions and trusted devices.
- Preserve all raw evidence before deleting, masking, or rotating anything.

## Tenant And Payment Safety

1. Run tenant isolation audit and inspect any cross-tenant access attempt.
2. Confirm PostgreSQL RLS is enabled and forced for affected tenant tables.
3. Verify payment callbacks through replay protection and provider reconciliation before ledger posting.
4. Hold suspicious payment events in manual review instead of posting irreversible ledger entries.

## Communications

- Notify internal engineering and support teams first.
- Prepare tenant communications only after scope is understood.
- Do not claim containment until logs, secrets, sessions, and provider callbacks have been verified.

## Recovery

1. Confirm the attack path is blocked.
2. Confirm rotated secrets are live and old secrets are revoked.
3. Confirm audit logs are intact.
4. Run `npm run security:scan`, `npm run security:pii-scan`, `npm run tenant:isolation:audit`, and `npm run test:auth-security`.
5. Restore writes gradually by module.
6. Keep enhanced monitoring active for at least 24 hours.
