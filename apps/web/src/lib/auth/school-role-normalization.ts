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
  "nurse",
  "boarding-master",
  "security-officer",
  "admissions",
]);

const schoolRoleAliases: Record<string, SchoolExperienceRole> = {
  owner: "principal",
  "school-admin": "admin",
  "school-owner": "principal",
  "tenant-owner": "principal",
  "deputy-principal": "deputy-principal",
  "boarding-master": "boarding-master",
  "security-officer": "security-officer",
  "clinic-staff": "nurse",
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
