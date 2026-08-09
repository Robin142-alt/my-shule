import {
  isSchoolExperienceRole,
  normalizeSchoolExperienceRole,
} from "@/lib/auth/school-role-normalization";
import type { SchoolExperienceRole } from "@/lib/experiences/types";

export type DashboardRoleSource =
  | "primary_membership"
  | "additional_assignment"
  | "teacher_eligibility";

export type DashboardRoleOptionDto = {
  role_code: string;
  role_name: string;
  is_primary: boolean;
  is_teacher_mode: boolean;
  sources: DashboardRoleSource[];
};

export type DashboardRoleContextDto = {
  primary_role: string;
  active_role: string;
  assigned_roles: string[];
  available_roles: DashboardRoleOptionDto[];
  teacher_dashboard_eligible: boolean;
};

export type SchoolDashboardRoleOption = {
  roleCode: SchoolExperienceRole;
  authorizationRoleCode: string;
  roleName: string;
  isPrimary: boolean;
  isTeacherMode: boolean;
  sources: DashboardRoleSource[];
};

export type SchoolDashboardRoleContext = {
  primaryRole: SchoolExperienceRole;
  primaryAuthorizationRoleCode: string;
  activeRole: SchoolExperienceRole;
  activeAuthorizationRoleCode: string;
  assignedRoles: SchoolExperienceRole[];
  assignedAuthorizationRoleCodes: string[];
  availableRoles: SchoolDashboardRoleOption[];
  teacherDashboardEligible: boolean;
};

const roleLabels: Record<SchoolExperienceRole, string> = {
  principal: "Principal Dashboard",
  "deputy-principal": "Deputy Principal Dashboard",
  secretary: "Secretary Dashboard",
  bursar: "Bursar Dashboard",
  accountant: "Accountant Dashboard",
  teacher: "Teacher Dashboard",
  "dean-academics": "Dean of Academics Dashboard",
  "exams-manager": "Exams Manager Dashboard",
  hod: "Head of Department Dashboard",
  "class-teacher": "Class Teacher Dashboard",
  "grade-master": "Grade/Form Master Dashboard",
  admin: "School Administration Dashboard",
  student: "Student Dashboard",
  storekeeper: "Storekeeper Dashboard",
  librarian: "Librarian Dashboard",
  nurse: "Nurse Dashboard",
  "boarding-master": "Boarding Master Dashboard",
  "security-officer": "Security Officer Dashboard",
  "transport-manager": "Transport Manager Dashboard",
  "ict-manager": "ICT Manager Dashboard",
  "laboratory-technician": "Laboratory Technician Dashboard",
  "guidance-counselling": "School Counsellor Dashboard",
  "discipline-master": "Discipline Master Dashboard",
  "procurement-officer": "Procurement Officer Dashboard",
  admissions: "Admissions Dashboard",
};

const dashboardRoleSources = new Set<DashboardRoleSource>([
  "primary_membership",
  "additional_assignment",
  "teacher_eligibility",
]);

function toSchoolRole(value: unknown): SchoolExperienceRole | null {
  if (typeof value !== "string" || !isSchoolExperienceRole(value)) {
    return null;
  }

  return normalizeSchoolExperienceRole(value);
}

function normalizeAuthorizationRoleKey(value: string) {
  return value.trim().toLowerCase();
}

export function getSchoolDashboardRoleLabel(role: SchoolExperienceRole) {
  return roleLabels[role];
}

export function normalizeDashboardRoleContext(
  input: unknown,
  fallbackRole: SchoolExperienceRole,
): SchoolDashboardRoleContext {
  const value = input && typeof input === "object"
    ? input as Partial<DashboardRoleContextDto>
    : null;
  const activeRole = toSchoolRole(value?.active_role) ?? fallbackRole;
  const primaryRole = toSchoolRole(value?.primary_role) ?? activeRole;
  const rawActiveRole = typeof value?.active_role === "string" && value.active_role.trim()
    ? value.active_role.trim()
    : activeRole;
  const rawPrimaryRole = typeof value?.primary_role === "string" && value.primary_role.trim()
    ? value.primary_role.trim()
    : rawActiveRole;
  const assignedAuthorizationRoleCodes = Array.from(new Map(
    (Array.isArray(value?.assigned_roles) ? value.assigned_roles : [rawPrimaryRole])
      .filter((role): role is string => typeof role === "string" && Boolean(role.trim()))
      .filter((role) => Boolean(toSchoolRole(role)))
      .map((role) => [normalizeAuthorizationRoleKey(role), role.trim()]),
  ).values());
  const assignedRoles = Array.from(new Set(
    assignedAuthorizationRoleCodes
      .map(toSchoolRole)
      .filter((role): role is SchoolExperienceRole => Boolean(role)),
  ));
  const options = new Map<string, SchoolDashboardRoleOption>();

  if (Array.isArray(value?.available_roles)) {
    value.available_roles.forEach((rawOption) => {
      if (!rawOption || typeof rawOption !== "object") {
        return;
      }

      const roleCode = toSchoolRole(rawOption.role_code);
      if (!roleCode) {
        return;
      }

      const sources = Array.isArray(rawOption.sources)
        ? rawOption.sources.filter(
            (source): source is DashboardRoleSource => dashboardRoleSources.has(source),
          )
        : [];
      const roleName = typeof rawOption.role_name === "string" && rawOption.role_name.trim()
        ? rawOption.role_name.trim()
        : getSchoolDashboardRoleLabel(roleCode);

      const authorizationRoleCode = rawOption.role_code.trim();
      const nextOption: SchoolDashboardRoleOption = {
        roleCode,
        authorizationRoleCode,
        roleName,
        isPrimary: rawOption.is_primary === true
          || normalizeAuthorizationRoleKey(authorizationRoleCode) === normalizeAuthorizationRoleKey(rawPrimaryRole),
        isTeacherMode: rawOption.is_teacher_mode === true || roleCode === "teacher",
        sources,
      };
      const optionKey = normalizeAuthorizationRoleKey(authorizationRoleCode);
      const existingOption = options.get(optionKey);

      options.set(optionKey, existingOption
        ? {
            ...existingOption,
            isPrimary: existingOption.isPrimary || nextOption.isPrimary,
            isTeacherMode: existingOption.isTeacherMode || nextOption.isTeacherMode,
            sources: Array.from(new Set([...existingOption.sources, ...sources])),
          }
        : nextOption);
    });
  }

  // The active role came from the authenticated server session. Keeping it visible
  // is safe even while the separately refreshed dashboard-role list is loading.
  const activeOptionKey = normalizeAuthorizationRoleKey(rawActiveRole);
  if (!options.has(activeOptionKey)) {
    options.set(activeOptionKey, {
      roleCode: activeRole,
      authorizationRoleCode: rawActiveRole,
      roleName: getSchoolDashboardRoleLabel(activeRole),
      isPrimary: activeOptionKey === normalizeAuthorizationRoleKey(rawPrimaryRole),
      isTeacherMode: activeRole === "teacher",
      sources: activeOptionKey === normalizeAuthorizationRoleKey(rawPrimaryRole)
        ? ["primary_membership"]
        : [],
    });
  }

  return {
    primaryRole,
    primaryAuthorizationRoleCode: rawPrimaryRole,
    activeRole,
    activeAuthorizationRoleCode: rawActiveRole,
    assignedRoles,
    assignedAuthorizationRoleCodes,
    availableRoles: Array.from(options.values()),
    teacherDashboardEligible: value?.teacher_dashboard_eligible === true,
  };
}

export function toDashboardRoleContextDto(
  context: SchoolDashboardRoleContext,
): DashboardRoleContextDto {
  return {
    primary_role: context.primaryAuthorizationRoleCode,
    active_role: context.activeAuthorizationRoleCode,
    assigned_roles: context.assignedAuthorizationRoleCodes,
    available_roles: context.availableRoles.map((option) => ({
      role_code: option.authorizationRoleCode,
      role_name: option.roleName,
      is_primary: option.isPrimary,
      is_teacher_mode: option.isTeacherMode,
      sources: option.sources,
    })),
    teacher_dashboard_eligible: context.teacherDashboardEligible,
  };
}
