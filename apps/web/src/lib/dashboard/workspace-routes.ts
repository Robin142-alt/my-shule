import type { DashboardRole } from "@/lib/dashboard/types";

const portalModuleMap: Record<string, string> = {
  students: "dashboard",
  finance: "fees",
  academics: "academics",
  communication: "messages",
  reports: "downloads",
};

const schoolRoleRouteMap: Partial<Record<DashboardRole, string>> = {
  "exam-manager": "exams-manager",
  dean: "dean-academics",
};

export function getDashboardWorkspaceHref(
  role: DashboardRole,
  moduleName: string,
) {
  const cleanModuleName = moduleName.split(/[?#]/)[0] || "dashboard";
  const suffix = moduleName.slice(cleanModuleName.length);

  if (role === "parent") {
    const portalSection = portalModuleMap[cleanModuleName] ?? cleanModuleName;
    const base =
      portalSection === "dashboard"
        ? "/portal/parent"
        : `/portal/parent/${portalSection}`;

    return `${base}${suffix}`;
  }

  const schoolRole = schoolRoleRouteMap[role] ?? role;
  const base =
    cleanModuleName === "dashboard"
      ? `/school/${schoolRole}`
      : `/school/${schoolRole}/${cleanModuleName}`;

  return `${base}${suffix}`;
}

export function getDashboardStudentHref(role: DashboardRole, studentId: string) {
  if (role === "parent") {
    return `/portal/parent?student=${encodeURIComponent(studentId)}`;
  }

  return `/school/${role}/students/${encodeURIComponent(studentId)}`;
}
