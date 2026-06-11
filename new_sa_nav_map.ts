export const superadminNavMap: Record<string, ExperienceNavItem[]> = {
  superadmin: [
    { id: "platform-overview", label: "Platform Overview", href: toSuperadminPath("platform-overview"), icon: LayoutGrid },
    { id: "schools", label: "Schools", href: toSuperadminPath("schools"), icon: Building2 },
    { id: "school-onboarding", label: "School Onboarding", href: toSuperadminPath("school-onboarding"), icon: Building2 },
    { id: "principal-invites", label: "Principal Invites", href: toSuperadminPath("principal-invites"), icon: ClipboardList },
    { id: "module-access-control", label: "Module Access Control", href: toSuperadminPath("module-access-control"), icon: ClipboardList },
    { id: "tenant-health", label: "Tenant Health", href: toSuperadminPath("tenant-health"), icon: Stethoscope },
    { id: "users-roles", label: "Users & Roles", href: toSuperadminPath("users-roles"), icon: Users },
    { id: "gateways", label: "Gateways", href: toSuperadminPath("gateways"), icon: ClipboardList },
    { id: "communication-templates", label: "Communication Templates", href: toSuperadminPath("communication-templates"), icon: MessageSquareText },
    { id: "audit-logs", label: "Audit Logs", href: toSuperadminPath("audit-logs"), icon: FileSpreadsheet },
    { id: "support-desk", label: "Support Desk", href: toSuperadminPath("support-desk"), icon: ClipboardList },
    { id: "system-settings", label: "System Settings", href: toSuperadminPath("system-settings"), icon: Settings },
  ],
};