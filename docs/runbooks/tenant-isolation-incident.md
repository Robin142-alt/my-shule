# Tenant Isolation Incident

Use this for suspected cross-tenant access, failed RLS settings, signed-tenant-header issues, or dashboard/report leakage.

1. Freeze affected tenant sessions and capture request ids, tenant ids, user ids, and signed header evidence.
2. Check `security.cross_tenant_attempts`, `security.rls_setting_failures`, and audit logs.
3. Verify request context, membership lookup, tenant domain binding, and forced RLS on affected tables.
4. Revoke suspicious sessions and rotate trusted tenant-header secrets if a proxy/header path is exposed.
5. Run tenant isolation audit and PII leak scan before reopening access.
6. Escalate as a data breach if child, payment, health, discipline, biometric, or report-card data may have leaked.
