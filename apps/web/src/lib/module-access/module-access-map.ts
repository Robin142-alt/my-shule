import type { ExperienceNavItem } from "@/lib/experiences/types";

export type SchoolModuleCode =
  | "students"
  | "admissions"
  | "academics"
  | "finance"
  | "exams"
  | "discipline"
  | "timetable"
  | "lab_management"
  | "teacher_biometric_attendance"
  | "parent_portal"
  | "inventory"
  | "library"
  | "transport"
  | "communication_sms"
  | "reports"
  | "staff"
  | "admin_command_centers"
  | "principal_dashboard"
  | "clinic_health"
  | "procurement"
  | "hostel"
  | "boarding"
  | "cbt_exams"
  | "lms"
  | "ai_insights"
  | "visitor_management"
  | "asset_tracking"
  | "iot";

export type ModuleRegistryItem = {
  code: SchoolModuleCode | string;
  name: string;
  description: string;
  status?: "active" | "inactive";
  base_price_cents?: number;
  per_student_price_cents?: number;
};

export const implementation100ModuleCodes: SchoolModuleCode[] = [
  "students",
  "admissions",
  "academics",
  "finance",
  "exams",
  "discipline",
  "timetable",
  "lab_management",
  "teacher_biometric_attendance",
  "parent_portal",
  "inventory",
  "library",
  "transport",
  "communication_sms",
  "reports",
  "staff",
  "admin_command_centers",
  "principal_dashboard",
  "clinic_health",
  "procurement",
  "hostel",
  "boarding",
  "cbt_exams",
  "lms",
  "ai_insights",
  "visitor_management",
  "asset_tracking",
];

export const implementation101ModuleCodes: SchoolModuleCode[] = [
  ...implementation100ModuleCodes,
  "iot",
];

export const defaultOnboardingModuleCodes: SchoolModuleCode[] = [
  "students",
  "admissions",
  "academics",
  "finance",
  "exams",
  "discipline",
  "communication_sms",
  "reports",
  "staff",
  "timetable",
  "admin_command_centers",
  "principal_dashboard",
];

export const fallbackModuleCatalog: ModuleRegistryItem[] = [
  {
    code: "students",
    name: "Student Management",
    description: "Student records, guardians, class placement, and learner lifecycle.",
  },
  {
    code: "admissions",
    name: "Admissions",
    description: "Student onboarding, document verification, transfers, and registration.",
  },
  {
    code: "academics",
    name: "Academic Structure",
    description: "CBE, CBC, 8-4-4, international levels, classes, streams, and subjects.",
  },
  {
    code: "finance",
    name: "Fee Management",
    description: "Fee structures, invoices, payments, arrears, and M-PESA review.",
  },
  {
    code: "exams",
    name: "Exams and Results",
    description: "Assessments, grading queues, report cards, and academic analytics.",
  },
  {
    code: "discipline",
    name: "Discipline",
    description: "Incidents, cases, sanctions, repeat-offender analytics, and escalation.",
  },
  {
    code: "timetable",
    name: "Timetable",
    description: "Class schedules, teacher cover, lesson execution, and room conflicts.",
  },
  {
    code: "lab_management",
    name: "Laboratory Management",
    description: "Departments, lab sessions, attendance, equipment, and chemical safety.",
  },
  {
    code: "teacher_biometric_attendance",
    name: "Teacher Attendance",
    description: "Biometric devices, offline sync, attendance logs, and punctuality reports.",
  },
  {
    code: "parent_portal",
    name: "Parent Portal",
    description: "Parent and student self-service access.",
  },
  {
    code: "inventory",
    name: "Store and Inventory",
    description: "Stock, procurement, issuing, transfers, and reconciliation.",
  },
  {
    code: "library",
    name: "Library",
    description: "Catalog, lending, returns, fines, reservations, and library reports.",
  },
  {
    code: "transport",
    name: "Transport",
    description: "Routes, vehicles, learners, and trip operations.",
  },
  {
    code: "communication_sms",
    name: "Communication and SMS",
    description: "SMS wallet, announcements, reminders, and delivery logs.",
  },
  {
    code: "reports",
    name: "Reports",
    description: "PDF, CSV, Excel, scheduled, and operational exports.",
  },
  {
    code: "staff",
    name: "Staff and HR",
    description: "Staff profiles, roles, documents, leave, and duty ownership.",
  },
  {
    code: "admin_command_centers",
    name: "Administrative Leadership",
    description: "Principal, deputy principal, and secretary command centers.",
  },
  {
    code: "principal_dashboard",
    name: "Principal Executive Dashboard",
    description: "Module-aware executive KPIs, alerts, analytics, and reports.",
  },
  {
    code: "clinic_health",
    name: "Clinic and Health",
    description: "Clinic visits, medicine inventory, dispensing, and health analytics.",
  },
  {
    code: "procurement",
    name: "Procurement",
    description: "Purchase requests, supplier tracking, approvals, and budget linkage.",
  },
  {
    code: "hostel",
    name: "Hostel",
    description: "Hostel occupancy, dormitory issues, boarding incidents, and meal analytics.",
  },
  {
    code: "boarding",
    name: "Boarding Management",
    description: "Boarding houses, meal analytics, and boarding student operations.",
  },
  {
    code: "cbt_exams",
    name: "CBT Exams",
    description: "Computer-based tests, online exam delivery, grading, and invigilation analytics.",
  },
  {
    code: "lms",
    name: "eLearning and LMS",
    description: "Digital learning content, assignments, and online class resources.",
  },
  {
    code: "ai_insights",
    name: "AI Insights",
    description: "Smart alerts, forecasts, anomalies, and executive recommendations.",
  },
  {
    code: "visitor_management",
    name: "Visitor Management",
    description: "Gate visitors, appointments, check-ins, emergency logs, and security reports.",
  },
  {
    code: "asset_tracking",
    name: "Asset Tracking",
    description: "School assets, assignments, repairs, depreciation, and utilization reporting.",
  },
  {
    code: "iot",
    name: "IoT and Smart Campus",
    description: "Device registry, telemetry ingestion, smart campus alerts, and command dispatch.",
  },
];

const schoolSectionModuleMap: Record<string, SchoolModuleCode | null> = {
  dashboard: null,
  students: "students",
  admissions: "admissions",
  finance: "finance",
  mpesa: "finance",
  academics: "academics",
  exams: "exams",
  discipline: "discipline",
  reports: "reports",
  communication: "communication_sms",
  transport: "transport",
  procurement: "procurement",
  hostel: "hostel",
  boarding: "boarding",
  cbt: "cbt_exams",
  lms: "lms",
  "ai-insights": "ai_insights",
  visitors: "visitor_management",
  assets: "asset_tracking",
  iot: "iot",
  timetable: "timetable",
  staff: "staff",
  inventory: "inventory",
  library: "library",
  clinic: "clinic_health",
  labs: "lab_management",
  "teacher-attendance": "teacher_biometric_attendance",
  leadership: "admin_command_centers",
  settings: null,
  "support-new-ticket": null,
  "support-my-tickets": null,
  "support-knowledge-base": null,
  "support-system-status": null,
};

export function getModuleCodeForSchoolSection(section: string) {
  return schoolSectionModuleMap[section] ?? null;
}

export function isSchoolSectionEnabled(
  section: string,
  enabledModuleCodes: ReadonlySet<string> | string[] | null | undefined,
) {
  const requiredModuleCode = getModuleCodeForSchoolSection(section);

  if (!requiredModuleCode || !enabledModuleCodes) {
    return true;
  }

  return Array.isArray(enabledModuleCodes)
    ? enabledModuleCodes.includes(requiredModuleCode)
    : enabledModuleCodes.has(requiredModuleCode);
}

export function filterNavItemsByEnabledModules<T extends Pick<ExperienceNavItem, "id">>(
  items: T[],
  enabledModuleCodes: ReadonlySet<string> | string[] | null | undefined,
) {
  return items.filter((item) => isSchoolSectionEnabled(item.id, enabledModuleCodes));
}

export function sortModuleCatalog(items: ModuleRegistryItem[]) {
  const order = new Map(fallbackModuleCatalog.map((item, index) => [item.code, index]));

  return [...items].sort((a, b) => {
    const aOrder = order.get(a.code) ?? Number.MAX_SAFE_INTEGER;
    const bOrder = order.get(b.code) ?? Number.MAX_SAFE_INTEGER;

    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }

    return a.name.localeCompare(b.name);
  });
}
