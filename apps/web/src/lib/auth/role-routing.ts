const roleHomePaths: Record<string, string> = {
  superadmin: "/superadmin/dashboard",
  platform_owner: "/superadmin/dashboard",
  principal: "/dashboard",
  "deputy-principal": "/dashboard",
  secretary: "/dashboard",
  owner: "/school/principal",
  admin: "/dashboard",
  school_admin: "/school/admin",
  school_owner: "/school/principal",
  tenant_owner: "/school/principal",
  bursar: "/finance/dashboard",
  teacher: "/dashboard",
  storekeeper: "/inventory/dashboard",
  librarian: "/library/dashboard",
  nurse: "/dashboard",
  boarding_master: "/dashboard",
  "boarding-master": "/dashboard",
  security_officer: "/dashboard",
  "security-officer": "/dashboard",
  parent: "/portal/dashboard",
  student: "/portal/dashboard",
};

export function getRoleHomePath(role: string | null | undefined) {
  if (!role) {
    return "/dashboard";
  }

  return roleHomePaths[role] ?? "/dashboard";
}
