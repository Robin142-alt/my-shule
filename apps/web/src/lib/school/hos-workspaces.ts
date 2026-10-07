import { BarChart3, BookOpen, ChartNoAxesCombined, ClipboardCheck, FileSearch, FileText, GitCompareArrows, HeartHandshake, ShieldAlert, TrendingUp, Users } from "lucide-react";

/** Every HOS entry uses the subject-scoped analytics contract or authenticated appointments. */
export const hosWorkspaces = [
  { id: "subjects", label: "My Subject Appointments", group: "Command Center", icon: BookOpen, view: null, description: "Your subject responsibilities, dates and appointment history." },
  { id: "exam-analytics", label: "Exam Analytics", group: "Academic Results", icon: ChartNoAxesCombined, view: null, description: "Explore the complete analytics library for your appointed subjects, with downloads and printing." },
  { id: "performance-analytics", label: "Subject Performance", group: "Academic Results", icon: BarChart3, view: "Performance", description: "Achievement bands, pass rates and assessment coverage." },
  { id: "comparisons", label: "Compare Results", group: "Academic Results", icon: GitCompareArrows, view: "Comparisons", description: "Compare exams, classes, streams and teacher allocations." },
  { id: "trends", label: "Performance Trends", group: "Academic Results", icon: TrendingUp, view: "Trends", description: "Exam, term and year trends for your subjects." },
  { id: "student-analytics", label: "Learner Performance", group: "Learner Support", icon: Users, view: "Learners", description: "Search learners, review progress and plan support." },
  { id: "at-risk", label: "Learners at Risk", group: "Learner Support", icon: ShieldAlert, view: "At Risk", description: "Prioritize learners with declining results or other risk evidence." },
  { id: "learner-interventions", label: "Interventions", group: "Learner Support", icon: HeartHandshake, view: "Interventions", description: "Review support plans, overdue reviews and measured outcomes." },
  { id: "exam-analysis", label: "Exam Analysis", group: "Review & Reports", icon: FileSearch, view: "Exam Analysis", description: "Review exam evidence and available assessment detail." },
  { id: "missing-marks", label: "Results Readiness", group: "Review & Reports", icon: ClipboardCheck, view: "Exam Operations", description: "Review marks completeness and data quality in your subject scope." },
  { id: "advanced-analysis", label: "Result Insights", group: "Review & Reports", icon: ChartNoAxesCombined, view: "Advanced", description: "Explore performance gaps, consistency and risk movement." },
  { id: "reports", label: "Subject Reports", group: "Review & Reports", icon: FileText, view: "Reports", description: "Preview, download and print school-branded subject reports." },
] as const;

export type HosSection = typeof hosWorkspaces[number]["id"];

export function normalizeHosSection(section?: string): HosSection {
  if (section === "exams") return "exam-analysis";
  return hosWorkspaces.find(item => item.id === section)?.id ?? "exam-analytics";
}

export function isHosSection(section: string) {
  return ["dashboard", "overview", "exams", "academic-intelligence"].includes(section) || hosWorkspaces.some(item => item.id === section);
}
