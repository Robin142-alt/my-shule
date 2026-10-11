import { isSchoolSection } from "./experience-routes";
import { isDeputyWorkspace } from "./deputy-workspaces";
import { isProductionReadyModule } from "@/lib/features/module-readiness";

// Canonical IDs owned by the dedicated command centers. These are deliberately
// role-specific: the retired generic attendance workspace stays unavailable.
export const dedicatedSchoolWorkspaces: Record<string, readonly string[]> = {
  "class-teacher": ["dashboard", "home", "register", "attendance", "progress", "exam-analytics", "comments", "discipline", "welfare", "health", "communication", "meetings", "homework", "timetable", "documents", "requests", "reports", "notifications", "settings"],
  "grade-master": ["dashboard", "overview", "learners", "streams", "attendance", "academics", "exam-analytics", "exams", "discipline", "welfare", "communication", "meetings", "timetable", "assignments", "requests", "reports", "notifications", "teaching", "settings"],
  "exams-manager": ["dashboard", "overview", "exam-workflow", "exam-setup", "exam-timetable", "marks-entry", "moderation", "exam-analytics", "report-cards", "imports-templates", "reports"],
  "procurement-officer": ["dashboard", "overview", "pos", "purchase-orders", "suppliers", "requisitions", "budget"],
};

export function isDedicatedSchoolWorkspace(role: string, section: string) {
  return dedicatedSchoolWorkspaces[role]?.includes(section) ?? false;
}

export function isSchoolWorkspaceSection(role: string, section: string) {
  if (role === "deputy-principal") return isDeputyWorkspace(section);
  if (isDedicatedSchoolWorkspace(role, section)) return true;
  // The dedicated teacher register has its own backend contract; only the
  // retired generic attendance page remains unavailable.
  if (role === "teacher" && section === "attendance") return true;
  return isSchoolSection(section) && isProductionReadyModule(section);
}
