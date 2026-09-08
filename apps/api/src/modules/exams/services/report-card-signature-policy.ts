// Keep signature ownership aligned with the Principal dashboard's legacy
// school-owner aliases. Platform owners and general school admins are excluded.
export const PRINCIPAL_SIGNATURE_ROLES = [
  'principal',
  'school_principal',
  'owner',
  'school_owner',
  'school-owner',
  'tenant_owner',
  'tenant-owner',
] as const;
