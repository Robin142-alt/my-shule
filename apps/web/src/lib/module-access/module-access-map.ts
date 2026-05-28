import type { ExperienceNavItem } from "@/lib/experiences/types";
import {
  buildCapabilitySidebar,
  isModuleEntitled,
  type ModuleEntitlementInput,
} from "@/lib/capability-engine/school-capability-engine";

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
  | "school_administration"
  | "hr_payroll"
  | "timetable_builder"
  | "communication_center"
  | "school_calendar"
  | "meals_canteen"
  | "co_curricular"
  | "data_security"
  | "setup_wizard"
  | "ict_assets"
  | "document_printing"
  | "reports_analytics"
  | "universal_approvals"
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
  "school_administration",
  "hr_payroll",
  "timetable_builder",
  "communication_center",
  "school_calendar",
  "meals_canteen",
  "co_curricular",
  "data_security",
  "setup_wizard",
  "ict_assets",
  "document_printing",
  "reports_analytics",
  "universal_approvals",
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
    code: "school_administration",
    name: "School Administration",
    description: "Front-office records, appointments, parent service, letters, and governed document handling.",
  },
  {
    code: "hr_payroll",
    name: "HR and Payroll",
    description: "Staff records, leave, payroll exceptions, duty coverage, payslips, and HR approvals.",
  },
  {
    code: "timetable_builder",
    name: "Timetable Builder",
    description: "Teacher, class, room, substitute, and conflict resolution workflows.",
  },
  {
    code: "communication_center",
    name: "Communication Center",
    description: "SMS, email, WhatsApp, emergency broadcasts, delivery retries, templates, and read receipts.",
  },
  {
    code: "school_calendar",
    name: "School Calendar",
    description: "Events, deadlines, trips, parent meetings, consent workflows, and reminders.",
  },
  {
    code: "meals_canteen",
    name: "Canteen and Meals",
    description: "Meal planning, kitchen stock, supplier deliveries, special diets, and meal counts.",
  },
  {
    code: "co_curricular",
    name: "Co-curricular Activities",
    description: "Clubs, sports, trips, competitions, consent forms, transport, equipment, and attendance.",
  },
  {
    code: "data_security",
    name: "Data Security and Backup",
    description: "Backups, deleted record recovery, sessions, suspicious activity, exports, and audit controls.",
  },
  {
    code: "setup_wizard",
    name: "First-Time Setup Wizard",
    description: "Guided onboarding for profile, terms, classes, users, imports, fees, SMS, M-Pesa, and launch.",
  },
  {
    code: "ict_assets",
    name: "ICT and Digital Assets",
    description: "Computer labs, devices, software licenses, printers, repairs, issue and return workflows.",
  },
  {
    code: "document_printing",
    name: "Document and Printing Center",
    description: "Central templates, previews, PDF generation, printing, archiving, and delivery recovery.",
  },
  {
    code: "reports_analytics",
    name: "Reports and Analytics Center",
    description: "Operational reports, filters, exports, schedules, drilldowns, and role-aware analytics.",
  },
  {
    code: "universal_approvals",
    name: "Universal Approval Center",
    description: "Cross-module approval inbox for waivers, reversals, admissions, procurement, leave, trips, and reports.",
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
  "executive-analytics": "principal_dashboard",
  "alerts-risks": "principal_dashboard",
  approvals: "admin_command_centers",
  "users-staff": "staff",
  "audit-logs": "admin_command_centers",
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
  "school-admin": "school_administration",
  "hr-payroll": "hr_payroll",
  "timetable-builder": "timetable_builder",
  "communication-center": "communication_center",
  "school-calendar": "school_calendar",
  "canteen-meals": "meals_canteen",
  "co-curricular": "co_curricular",
  "data-security": "data_security",
  "setup-wizard": "setup_wizard",
  "ict-assets": "ict_assets",
  "document-printing": "document_printing",
  "reports-analytics": "reports_analytics",
  "universal-approvals": "universal_approvals",
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

export function getModuleCodeForSchoolSection(section: string, role?: string | null) {
  if (section === "dashboard" && role === "principal") {
    return "principal_dashboard";
  }

  return schoolSectionModuleMap[section] ?? null;
}

export function isSchoolSectionEnabled(
  section: string,
  enabledModuleCodes: ModuleEntitlementInput,
) {
  const requiredModuleCode = getModuleCodeForSchoolSection(section);

  return isModuleEntitled(requiredModuleCode, enabledModuleCodes);
}

export function filterNavItemsByEnabledModules<T extends Pick<ExperienceNavItem, "id">>(
  items: T[],
  enabledModuleCodes: ModuleEntitlementInput,
) {
  const visibleItems = buildCapabilitySidebar({
    items: items.map((item) => ({
      ...item,
      moduleCode: getModuleCodeForSchoolSection(item.id),
    })),
    moduleEntitlements: enabledModuleCodes,
  });
  const visibleIds = new Set(visibleItems.map((item) => item.id));

  return items.filter((item) => visibleIds.has(item.id));
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
