export const SUPERADMIN_PUBLIC_SECTIONS = [
  "platform-overview",
  "schools",
  "school-onboarding",
  "principal-invites",
  "module-access-control",
  "tenant-health",
  "users-roles",
  "gateways",
  "communication-templates",
  "audit-logs",
  "support-desk",
  "system-settings",
  "support",
  "infrastructure",
  "dashboard",
  "onboarding",
  "invitations",
  "modules",
  "setup-progress",
  "demo-manager",
  "users",
  "health",
  "sms-email",
  "templates",
  "support-open",
  "support-in-progress",
  "support-escalated",
  "support-resolved",
  "support-sla",
  "support-analytics",
  "broadcasts",
  "data-tools",
  "security",
  "reports",
  "settings",
  "revenue",
  "subscriptions",
  "mpesa",
] as const;

export type SuperadminPublicSection = (typeof SUPERADMIN_PUBLIC_SECTIONS)[number];

export function isSuperadminPublicSection(
  section: string,
): section is SuperadminPublicSection {
  return SUPERADMIN_PUBLIC_SECTIONS.includes(section as SuperadminPublicSection);
}
