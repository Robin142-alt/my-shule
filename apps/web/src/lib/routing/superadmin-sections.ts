export const SUPERADMIN_PUBLIC_SECTIONS = [
  "tenants",
  "schools",
  "revenue",
  "subscriptions",
  "mpesa-monitoring",
  "sms-settings",
  "users",
  "support",
  "support-open",
  "support-in-progress",
  "support-escalated",
  "support-resolved",
  "support-sla",
  "support-analytics",
  "audit-logs",
  "infrastructure",
  "notifications",
  "settings",
] as const;

export type SuperadminPublicSection = (typeof SUPERADMIN_PUBLIC_SECTIONS)[number];

export function isSuperadminPublicSection(
  section: string,
): section is SuperadminPublicSection {
  return SUPERADMIN_PUBLIC_SECTIONS.includes(section as SuperadminPublicSection);
}
