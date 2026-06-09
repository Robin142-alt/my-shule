import type { SchoolExperienceRole } from "@/lib/experiences/types";

const schoolExperienceRoles = new Set<string>([
  "principal",
  "deputy-principal",
  "secretary",
  "bursar",
  "accountant",
  "teacher",
  "dean-academics",
  "exams-manager",
  "hod",
  "class-teacher",
  "grade-master",
  "admin",
  "student",
  "storekeeper",
  "librarian",
  "nurse",
  "boarding-master",
  "security-officer",
  "transport-manager",
  "ict-manager",
  "laboratory-technician",
  "guidance-counselling",
  "discipline-master",
  "admissions",
]);

const schoolRoleAliases: Record<string, SchoolExperienceRole> = {
  owner: "principal",
  "school-admin": "admin",
  "school-owner": "principal",
  "tenant-owner": "principal",
  student: "student",
  "deputy-principal": "deputy-principal",
  hod: "hod",
  "head-of-department": "hod",
  "department-head": "hod",
  "class-teacher": "class-teacher",
  "grade-master": "grade-master",
  "form-master": "grade-master",
  "grade-form-master": "grade-master",
  "boarding-master": "boarding-master",
  "security-officer": "security-officer",
  "transport-manager": "transport-manager",
  "ict-manager": "ict-manager",
  ict: "ict-manager",
  "computer-lab-manager": "ict-manager",
  "computer-lab-user": "ict-manager",
  "ict-computer-lab-user": "ict-manager",
  "laboratory-technician": "laboratory-technician",
  "lab-technician": "laboratory-technician",
  "guidance-counselling": "guidance-counselling",
  "school-counsellor": "guidance-counselling",
  counsellor: "guidance-counselling",
  counselor: "guidance-counselling",
  "discipline-master": "discipline-master",
  "dean-of-students": "discipline-master",
  "dean-academics": "dean-academics",
  "dean-of-academics": "dean-academics",
  "academic-dean": "dean-academics",
  "exams-manager": "exams-manager",
  "exam-officer": "exams-manager",
  "examination-officer": "exams-manager",
  "clinic-staff": "nurse",
  registrar: "admissions",
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
  const rawRole = role?.trim().toLowerCase() ?? "";
  const normalizedRole = normalizeSchoolRoleKey(role);
  const alias = schoolRoleAliases[normalizedRole] ?? null;

  return alias && alias !== rawRole ? alias : null;
}
