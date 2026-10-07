const academicRoles = new Set([
  "principal", "deputy-principal", "dean-academics", "exams-manager",
  "hod", "hos", "grade-master", "class-teacher", "teacher",
]);

/** Keep saved links working after consolidating the duplicate analytics workspace. */
export function resolveExamAnalyticsSection(role: string, section: string) {
  if (!academicRoles.has(role)) return section;
  if (section === "academic-intelligence" || section === "academic-analytics") return "exam-analytics";
  if (role === "exams-manager" && ["analysis", "grading"].includes(section)) return "exam-analytics";
  if (role === "dean-academics" && ["department-performance", "student-analytics"].includes(section)) return "exam-analytics";
  if (role === "teacher" && section === "reports-analytics") return "exam-analytics";
  return section;
}
