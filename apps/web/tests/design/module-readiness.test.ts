import {
  canRoleAccessModule,
  doesModuleExist,
  getRoleCapabilities,
  getRoleQuickActions,
  getRoleSidebar,
} from "@/lib/dashboard/role-config";
import { buildSchoolErpModel } from "@/lib/dashboard/erp-model";
import { getSchoolWorkspace, type SchoolExperienceRole } from "@/lib/experiences/school-data";
import { isProductionReadyHref, isProductionReadyModule } from "@/lib/features/module-readiness";

const moduleControlledProductionSections = new Set([
  "academics",
  "communication",
  "reports",
  "staff",
  "timetable",
  "library",
  "labs",
  "leadership",
  "teacher-attendance",
]);

const inactiveModules = new Set([
  "attendance",
]);

const dashboardRoles = ["admin", "teacher", "parent", "bursar", "storekeeper", "admissions"] as const;
const schoolRoles: SchoolExperienceRole[] = [
  "principal",
  "deputy-principal",
  "secretary",
  "bursar",
  "teacher",
  "admin",
  "storekeeper",
  "admissions",
  "librarian",
];

function moduleFromDashboardHref(href: string) {
  const segments = href.split(/[?#]/)[0].split("/").filter(Boolean);

  if (segments[0] !== "dashboard") {
    return segments[0] ?? "dashboard";
  }

  return segments.length > 2 ? segments[2] : "dashboard";
}

describe("production module readiness", () => {
  it("hides incomplete modules from role sidebar navigation", () => {
    for (const role of dashboardRoles) {
      const sidebarIds = getRoleSidebar(role).map((item) => item.id);
      expect(sidebarIds.filter((id) => inactiveModules.has(id))).toEqual([]);
    }
  });

  it("hides incomplete modules from school workspace navigation", () => {
    for (const role of schoolRoles) {
      const workspaceIds = getSchoolWorkspace(role).navItems.map((item) => item.id);
      expect(workspaceIds.filter((id) => inactiveModules.has(id))).toEqual([]);
    }
  });

  it("removes quick actions and capabilities that point to inactive workflows", () => {
    for (const role of dashboardRoles) {
      const actionModules = getRoleQuickActions(role).map((action) => action.href);
      const capabilityCategories = getRoleCapabilities(role).map((capability) => capability.category);

      expect(actionModules.filter((module) => inactiveModules.has(module))).toEqual([]);
      expect(capabilityCategories.filter((category) => inactiveModules.has(category))).toEqual([]);
    }
  });

  it("prevents direct access checks from treating incomplete modules as available", () => {
    expect(doesModuleExist("communication")).toBe(true);
    expect(doesModuleExist("reports")).toBe(true);
    expect(canRoleAccessModule("teacher", "academics")).toBe(true);
    expect(canRoleAccessModule("admin", "attendance")).toBe(false);
  });

  it("keeps module-controlled production surfaces available while attendance stays retired", () => {
    expect(isProductionReadyModule("exams")).toBe(true);
    expect(isProductionReadyHref("/school/teacher/exams")).toBe(true);
    expect(isProductionReadyModule("attendance")).toBe(false);

    for (const moduleId of moduleControlledProductionSections) {
      expect(isProductionReadyModule(moduleId)).toBe(true);
      expect(isProductionReadyHref(`/school/principal/${moduleId}`)).toBe(true);
    }

    expect(getSchoolWorkspace("teacher").navItems.map((item) => item.id)).toContain("exams");
    expect(getSchoolWorkspace("principal").navItems.map((item) => item.id)).toContain("executive-analytics");
    expect(getSchoolWorkspace("principal").navItems.map((item) => item.id)).toContain("approvals");
    expect(getSchoolWorkspace("teacher").navItems.map((item) => item.id)).toContain("labs");
    expect(getSchoolWorkspace("librarian").navItems.map((item) => item.id)).toContain("library");
  });

  it("does not generate dashboard KPI links into inactive workflows", () => {
    for (const role of dashboardRoles) {
      const model = buildSchoolErpModel({
        role,
        tenant: { id: "tenant-1", name: "Configured workspace", county: "Nairobi" },
        online: true,
      });
      const kpiModules = model.dashboard.kpis.map((kpi) => moduleFromDashboardHref(kpi.href));

      expect(kpiModules.filter((module) => inactiveModules.has(module))).toEqual([]);
    }
  });

  it("keeps principal navigation executive-only", () => {
    const principalNavIds = getSchoolWorkspace("principal").navItems.map((item) => item.id);

    expect(principalNavIds).toEqual(
      expect.arrayContaining([
        "dashboard",
        "executive-analytics",
        "alerts-risks",
        "approvals",
        "users-staff",
        "reports",
        "ai-insights",
        "audit-logs",
        "settings",
      ]),
    );
    expect(principalNavIds).not.toContain("students");
    expect(principalNavIds).not.toContain("finance");
    expect(principalNavIds).not.toContain("transport");
    expect(principalNavIds).not.toContain("procurement");
  });
});
