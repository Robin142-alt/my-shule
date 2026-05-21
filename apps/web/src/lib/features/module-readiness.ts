import type { ExperienceNavItem } from "@/lib/experiences/types";

const productionReadyModules = new Set([
  "dashboard",
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

export function isInactiveModule(moduleId: string) {
  return inactiveModules.has(moduleId);
}

export function isProductionReadyModule(moduleId: string) {
  return productionReadyModules.has(moduleId) && !isInactiveModule(moduleId);
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

  return segments[0];
}

export function isProductionReadyHref(href: string) {
  return isProductionReadyModule(moduleIdFromHref(href));
}

export function filterProductionReadyNavItems<T extends Pick<ExperienceNavItem, "id">>(items: T[]) {
  return items.filter((item) => isProductionReadyModule(item.id));
}
