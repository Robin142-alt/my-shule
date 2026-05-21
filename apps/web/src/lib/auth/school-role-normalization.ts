import type { SchoolExperienceRole } from "@/lib/experiences/types";

const schoolExperienceRoles = new Set<string>([
  "principal",
  "deputy-principal",
  "secretary",
  "bursar",
  "teacher",
  "admin",
  "storekeeper",
  "librarian",
  "admissions",
]);

const schoolRoleAliases: Record<string, SchoolExperienceRole> = {
  owner: "admin",
  "school-admin": "admin",
  "school-owner": "admin",
  "tenant-owner": "admin",
};

function normalizeSchoolRoleKey(role: string | null | undefined) {
  return role?.trim().toLowerCase().replace(/[_\s]+/g, "-") ?? "";
}

export function normalizeSchoolExperienceRole(
  role: string | null | undefined,
): SchoolExperienceRole {
  const normalizedRole = normalizeSchoolRoleKey(role);

  if (!normalizedRole) {
    return "admin";
  }

  const aliasedRole = schoolRoleAliases[normalizedRole] ?? normalizedRole;

  return schoolExperienceRoles.has(aliasedRole) ? (aliasedRole as SchoolExperienceRole) : "admin";
}

export function getSchoolRoleAlias(role: string | null | undefined) {
  const normalizedRole = normalizeSchoolRoleKey(role);

  return schoolRoleAliases[normalizedRole] ?? null;
}
