import {
  canRoleAccessModule,
  doesModuleExist,
  getRoleCapabilities,
  getRoleQuickActions,
  getRoleSidebar,
} from "@/lib/dashboard/role-config";
import { buildSchoolErpModel } from "@/lib/dashboard/erp-model";
import { getDashboardStudentHref, getDashboardWorkspaceHref } from "@/lib/dashboard/workspace-routes";
import { getSchoolWorkspace, type SchoolExperienceRole } from "@/lib/experiences/school-data";
import { getModuleReadiness, isProductionReadyHref, isProductionReadyModule } from "@/lib/features/module-readiness";
import { isSchoolSection } from "@/lib/routing/experience-routes";
import { AdmissionsDashboardHome } from "@/components/modules/admissions/admissions-dashboard-home";
import { InventoryDashboardHome } from "@/components/modules/inventory/inventory-dashboard-home";
import { renderWithProviders } from "./test-utils";
import { screen } from "@testing-library/react";
import { createElement } from "react";

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

const routedCommandCenterSections = [
  "academic-overview",
  "curriculum",
  "syllabus",
  "syllabus-coverage",
  "academic-analytics",
  "student-analytics",
  "teachers",
  "pending",
  "results-moderation",
  "integrity",
  "marks",
  "grading",
  "validation",
  "interventions",
  "alerts",
  "history",
  "department-settings",
  "department-overview",
  "lesson-observation",
  "schemes-of-work",
  "lesson-delivery",
  "assessments-cats",
  "exams-marks-moderation",
  "performance-analytics",
  "learner-interventions",
  "resources",
  "resources-requests",
  "department-meetings",
  "reports-downloads",
  "classes",
  "lesson-log",
  "exams-marks",
  "learner-progress",
  "teaching-resources",
  "store-requests",
  "profile",
  "class-teacher",
  "club",
  "invigilation",
  "builder",
  "scheduler",
  "marks",
  "missing-marks",
  "grading",
  "drafts",
  "report-templates",
  "submissions",
  "validation",
  "exports",
  "audit-log",
  "archive",
] as const;

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
  it("separates visible UI from live API and production readiness", () => {
    const attendance = getModuleReadiness("attendance");
    const exams = getModuleReadiness("exams");
    const unknown = getModuleReadiness("unmapped-module");

    expect(attendance).toEqual(expect.objectContaining({
      moduleCode: "attendance",
      visibleInDemo: expect.any(Boolean),
      uiComplete: expect.any(Boolean),
      liveApiConnected: expect.any(Boolean),
      tenantSafe: expect.any(Boolean),
      productionReady: false,
      missing: expect.arrayContaining(["module is explicitly inactive until its workflow contract is complete"]),
    }));
    expect(exams).toEqual(expect.objectContaining({
      moduleCode: "exams",
      uiComplete: true,
      liveApiConnected: true,
      tenantSafe: true,
      productionReady: true,
      missing: [],
    }));
    expect(unknown).toEqual(expect.objectContaining({
      productionReady: false,
      missing: expect.arrayContaining(["module is not in the production-ready allowlist"]),
    }));

    for (const readiness of [attendance, exams, unknown]) {
      if (readiness.productionReady) {
        expect(readiness.uiComplete).toBe(true);
        expect(readiness.liveApiConnected).toBe(true);
        expect(readiness.tenantSafe).toBe(true);
      }
    }
  });

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

    expect(getSchoolWorkspace("teacher").navItems.map((item) => item.id)).toContain("marks-entry");
    expect(getSchoolWorkspace("principal").navItems.map((item) => item.id)).toContain("overview");
    expect(getSchoolWorkspace("principal").navItems.map((item) => item.id)).toContain("approvals");
    expect(getSchoolWorkspace("teacher").navItems.map((item) => item.id)).toContain("resource-requests");
    expect(getSchoolWorkspace("librarian").navItems.map((item) => item.id)).toContain("books");
  });

  it("keeps every routed role command-center section accepted by the school route guard", () => {
    for (const section of routedCommandCenterSections) {
      expect(isSchoolSection(section)).toBe(true);
      expect(isProductionReadyModule(section)).toBe(true);
      expect(isProductionReadyHref(`/school/teacher/${section}`)).toBe(true);
    }
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

  it("keeps principal navigation structured per the new blueprint", () => {
    const principalNavIds = getSchoolWorkspace("principal").navItems.map((item) => item.id);

    expect(principalNavIds).toEqual(
      expect.arrayContaining([
        "overview",
        "setup-checklist",
        "school-profile",
        "academic-setup",
        "classes-streams",
        "subjects-departments",
        "staff-roles",
        "students",
        "attendance-monitoring",
        "academics",
        "exams-report-cards",
        "finance-overview",
        "discipline",
        "communication",
        "approvals",
        "reports",
        "settings",
      ]),
    );
  });

  it("keeps legacy dashboard home shortcuts on live role workspace routes", () => {
    const { unmount } = renderWithProviders(createElement(AdmissionsDashboardHome));

    expect(screen.getByRole("link", { name: /open admissions desk/i })).toHaveAttribute("href", "/school/admissions/applications");
    expect(screen.getByRole("link", { name: /start student admission/i })).toHaveAttribute("href", "/school/admissions/applications?action=start-admission");
    expect(screen.getByRole("link", { name: /review applications/i })).toHaveAttribute("href", "/school/admissions/applications");
    expect(screen.queryByRole("link", { name: /start student admission/i })).not.toHaveAttribute("href", "/dashboard/admissions/admissions");

    unmount();
    renderWithProviders(createElement(InventoryDashboardHome));

    expect(screen.getByRole("link", { name: /open inventory desk/i })).toHaveAttribute("href", "/school/storekeeper/inventory");
    expect(screen.getByRole("link", { name: /adjust stock/i })).toHaveAttribute("href", "/school/storekeeper/inventory?action=adjust");
    expect(screen.getByRole("link", { name: /create purchase order/i })).toHaveAttribute("href", "/school/storekeeper/procurement?action=create-purchase-order");
    expect(screen.queryByRole("link", { name: /adjust stock/i })).not.toHaveAttribute("href", "/dashboard/storekeeper/inventory");
  });

  it("routes legacy dashboard navigation to live role workspaces", () => {
    expect(getDashboardWorkspaceHref("admin", "dashboard")).toBe("/school/admin");
    expect(getDashboardWorkspaceHref("teacher", "academics")).toBe("/school/teacher/academics");
    expect(getDashboardWorkspaceHref("storekeeper", "inventory?action=adjust")).toBe("/school/storekeeper/inventory?action=adjust");
    expect(getDashboardWorkspaceHref("admissions", "admissions?view=student-directory&student=std-1")).toBe("/school/admissions/admissions?view=student-directory&student=std-1");
    expect(getDashboardStudentHref("teacher", "std-1")).toBe("/school/teacher/students/std-1");
    expect(getDashboardWorkspaceHref("exam-manager", "exam-setup")).toBe("/school/exams-manager/exam-setup");
    expect(getDashboardWorkspaceHref("dean", "teacher-workload")).toBe("/school/dean-academics/teacher-workload");

    expect(getDashboardWorkspaceHref("parent", "dashboard")).toBe("/portal/parent");
    expect(getDashboardWorkspaceHref("parent", "finance")).toBe("/portal/parent/fees");
    expect(getDashboardWorkspaceHref("parent", "communication")).toBe("/portal/parent/messages");
    expect(getDashboardWorkspaceHref("parent", "reports")).toBe("/portal/parent/downloads");
    expect(getDashboardStudentHref("parent", "std-1")).toBe("/portal/parent?student=std-1");
    expect(isProductionReadyHref(getDashboardWorkspaceHref("parent", "finance"))).toBe(true);
  });

  it("keeps legacy academic role sidebars on canonical routed command-center sections", () => {
    const examManagerHrefs = getRoleSidebar("exam-manager").map((item) => item.href);
    const deanHrefs = getRoleSidebar("dean").map((item) => item.href);
    const hodHrefs = getRoleSidebar("hod").map((item) => item.href);

    expect(examManagerHrefs).toEqual([
      "overview",
      "exam-setup",
      "exam-timetable",
      "marks-entry",
      "moderation",
      "analysis",
      "report-cards",
      "publishing",
      "reports",
    ]);
    expect(deanHrefs).toEqual([
      "overview",
      "curriculum-coverage",
      "department-performance",
      "teacher-workload",
      "lesson-plans",
      "lesson-logs",
      "assessments",
      "academic-interventions",
      "reports",
    ]);
    expect(hodHrefs).toEqual([
      "overview",
      "department-teachers",
      "subject-allocation",
      "coverage-review",
      "lesson-plans",
      "marks-moderation",
      "resource-requests",
      "reports",
    ]);

    expect(examManagerHrefs).not.toEqual(
      expect.arrayContaining(["audit-logs", "exam-calendar", "exam-classes", "marks-monitor", "results-processing"]),
    );
    expect(deanHrefs).not.toEqual(
      expect.arrayContaining(["academic-calendar", "departments", "continuous-assessment", "performance-analytics", "dean-settings"]),
    );
    expect(hodHrefs).not.toEqual(
      expect.arrayContaining(["schemes-of-work", "lesson-delivery", "assessments-cats", "performance-analytics", "reports-downloads"]),
    );

    for (const href of examManagerHrefs) {
      expect(getDashboardWorkspaceHref("exam-manager", href)).toMatch(/^\/school\/exams-manager(\/|$)/);
    }

    for (const href of deanHrefs) {
      expect(getDashboardWorkspaceHref("dean", href)).toMatch(/^\/school\/dean-academics(\/|$)/);
    }

    for (const href of hodHrefs) {
      expect(getDashboardWorkspaceHref("hod", href)).toMatch(/^\/school\/hod(\/|$)/);
    }
  });
});
