import type { ExperienceNavItem } from "@/lib/experiences/types";
import { SCHOOL_SECTIONS, PORTAL_SECTIONS } from "@/lib/routing/experience-routes";

const productionReadyModules = new Set([
  ...SCHOOL_SECTIONS,
  ...PORTAL_SECTIONS,
  "dashboard",
  "executive-analytics",
  "alerts-risks",
  "approvals",
  "users-staff",
  "audit-logs",
  "students",
  "admissions",
  "finance",
  "mpesa",
  "inventory",
  "library",
  "discipline",
  "exams",
  "academics",
  "communication",
  "transport",
  "procurement",
  "school-admin",
  "hr-payroll",
  "timetable-builder",
  "communication-center",
  "school-calendar",
  "canteen-meals",
  "co-curricular",
  "data-security",
  "setup-wizard",
  "ict-assets",
  "document-printing",
  "reports-analytics",
  "universal-approvals",
  "hostel",
  "boarding",
  "cbt",
  "lms",
  "ai-insights",
  "visitors",
  "assets",
  "iot",
  "reports",
  "staff",
  "timetable",
  "labs",
  "clinic",
  "leadership",
  "teacher-attendance",
  "settings",
  "support-new-ticket",
  "support-my-tickets",
  "support-knowledge-base",
  "support-system-status",
]);

const inactiveModules = new Set([
  "attendance",
]);

export type ModuleReadiness = {
  moduleCode: string;
  visibleInDemo: boolean;
  uiComplete: boolean;
  liveApiConnected: boolean;
  tenantSafe: boolean;
  productionReady: boolean;
  missing: string[];
};

export function isInactiveModule(moduleId: string) {
  return inactiveModules.has(moduleId);
}

export function isProductionReadyModule(moduleId: string) {
  return productionReadyModules.has(moduleId) && !isInactiveModule(moduleId);
}

export function getModuleReadiness(moduleId: string): ModuleReadiness {
  const inactive = isInactiveModule(moduleId);
  const knownProductionModule = productionReadyModules.has(moduleId);
  const productionReady = knownProductionModule && !inactive;
  const missing: string[] = [];

  if (!knownProductionModule) {
    missing.push("module is not in the production-ready allowlist");
  }

  if (inactive) {
    missing.push("module is explicitly inactive until its workflow contract is complete");
  }

  return {
    moduleCode: moduleId,
    visibleInDemo: knownProductionModule || inactive,
    uiComplete: productionReady,
    liveApiConnected: productionReady,
    tenantSafe: productionReady,
    productionReady,
    missing,
  };
}

export function moduleIdFromHref(href: string) {
  const path = href.split(/[?#]/)[0];
  const segments = path.split("/").filter(Boolean);

  if (segments.length === 0) {
    return "dashboard";
  }

  if (segments[0] === "dashboard") {
    return segments.length > 2 ? segments[2] : "dashboard";
  }

  if (segments[0] === "school") {
    return segments.length > 2 ? segments[2] : "dashboard";
  }

  if (segments[0] === "portal") {
    if (segments.length <= 2) {
      return "dashboard";
    }

    if (segments[2] === "fees") {
      return "finance";
    }

    if (segments[2] === "messages") {
      return "communication";
    }

    if (segments[2] === "downloads") {
      return "reports";
    }

    return segments[2];
  }

  return segments[0];
}

export function isProductionReadyHref(href: string) {
  return isProductionReadyModule(moduleIdFromHref(href));
}

export function filterProductionReadyNavItems<T extends Pick<ExperienceNavItem, "id">>(items: T[]) {
  return items.filter((item) => isProductionReadyModule(item.id));
}
