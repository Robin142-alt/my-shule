export const DEPUTY_WORKSPACES = [
  "overview", "daily-operations", "attendance", "discipline", "welfare", "staff-duty",
  "timetable", "academics", "teaching", "exams", "academic-intelligence", "classes",
  "approvals", "communication", "users-invitations", "reports", "staff-roles", "settings", "cbt", "lms",
  "support-new-ticket", "support-my-tickets", "support-knowledge-base", "support-system-status",
] as const;

export const DEPUTY_WORKSPACE_ALIASES: Record<string, string> = {
  dashboard: "overview",
  "attendance-escalations": "attendance", "attendance-monitoring": "attendance",
  "student-attendance": "attendance", "staff-attendance": "attendance",
  "discipline-cases": "discipline", "incident-routing": "discipline", "discipline-coordination": "discipline",
  "student-welfare": "welfare", "health-welfare": "welfare",
  "staff-coordination": "staff-duty", "duty-roster": "staff-duty", "duty-rosters": "staff-duty", "staff-duty-roster": "staff-duty",
  "timetable-conflicts": "timetable", "timetable-builder": "timetable",
  "academic-review": "academics", "academic-setup": "academics", "academic-monitoring": "academics",
  "subjects": "academics", "subjects-departments": "academics", "subject-allocation": "academics",
  "academic-analytics": "academic-intelligence",
  "classes-streams": "classes", "reports-downloads": "reports", "reports-analytics": "reports",
  "my-teaching": "teaching", "teacher-workload": "teaching",
};

export function resolveDeputyWorkspace(section = "dashboard") {
  return DEPUTY_WORKSPACE_ALIASES[section] ?? section;
}

export function isDeputyWorkspace(section: string) {
  return (DEPUTY_WORKSPACES as readonly string[]).includes(resolveDeputyWorkspace(section));
}
