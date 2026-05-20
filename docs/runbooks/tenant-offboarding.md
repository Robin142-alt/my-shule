# Tenant Offboarding And Data Lifecycle

Use this when a school contract ends or a legal deletion/anonymization request is approved.

1. Generate the tenant offboarding export manifest through `GET /platform/schools/:tenantId/offboarding/export`.
2. Confirm the requester is the verified school owner or legal delegate and record approval evidence.
3. Export contract data by category: school profile, memberships, students, finance, M-Pesa settlement evidence, report cards, and audit logs.
4. Apply retention policy: keep finance records and audit logs as required, minimize raw provider payloads, and preserve immutable report-card artifacts.
5. For legal anonymization, call `POST /platform/schools/:tenantId/offboarding/anonymize` with slug confirmation and reason.
6. Confirm invites are disabled, tenant status is inactive, and lifecycle audit events were written.
