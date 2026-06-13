import type {
  CapabilityItem,
  DashboardRole,
  DashboardWidgetKey,
  QuickActionItem,
  SidebarItem,
} from "./types";
import { DASHBOARD_ROLES } from "./types";
import {
  buildCapabilitySidebar,
  isModuleEntitled,
  type CapabilityEnforcementSnapshot,
  type ModuleEntitlementInput,
  type RolePermissionInput,
} from "@/lib/capability-engine/school-capability-engine";
import { isProductionReadyModule } from "@/lib/features/module-readiness";
import { getModuleCodeForSchoolSection } from "@/lib/module-access/module-access-map";

type RoleCapabilityOptions = {
  moduleEntitlements?: ModuleEntitlementInput;
  rolePermissions?: RolePermissionInput;
  enforcement?: CapabilityEnforcementSnapshot;
};

export const roleLabels: Record<DashboardRole, string> = {
  admin: "Admin",
  bursar: "Bursar",
  teacher: "Teacher",
  parent: "Parent",
  storekeeper: "Storekeeper",
  librarian: "Librarian",
  admissions: "Admissions",
  "exam-manager": "Exam Manager",
  hod: "Head of Department",
  dean: "Dean of Academics",
};

export const sidebarItems: SidebarItem[] = [
  { id: "dashboard", label: "Dashboard", href: "dashboard", roles: DASHBOARD_ROLES.filter(r => r !== "exam-manager" && r !== "dean" && r !== "hod") },
  { id: "students", label: "Students", href: "students", roles: ["admin", "bursar", "teacher", "parent"] },
  { id: "inventory", label: "Inventory", href: "inventory", roles: ["admin", "bursar", "storekeeper"] },
  { id: "library", label: "Library", href: "library", roles: ["librarian"] },
  { id: "admissions", label: "Admissions", href: "admissions", roles: ["admin", "admissions"] },
  { id: "finance", label: "Fees / Payments", href: "finance", roles: ["admin", "bursar", "parent"] },
  { id: "mpesa", label: "MPESA Transactions", href: "mpesa", roles: ["admin", "bursar"] },
  { id: "academics", label: "Academics", href: "academics", roles: ["admin", "teacher", "parent"] },
  { id: "reports", label: "Reports", href: "reports", roles: ["admin", "bursar", "teacher", "parent"] },
  { id: "communication", label: "Communication (SMS)", href: "communication", roles: ["admin", "bursar", "teacher", "parent"] },
  { id: "approvals", label: "Approvals", href: "approvals", roles: ["admin", "bursar"] },
  { id: "settings", label: "Settings", href: "settings", roles: ["admin", "bursar"] },
  
  // Exam Manager workspaces
  { id: "overview", label: "Overview", href: "overview", roles: ["exam-manager"] },
  { id: "exam-calendar", label: "Exam Calendar", href: "exam-calendar", roles: ["exam-manager"] },
  { id: "exam-setup", label: "Exam Setup", href: "exam-setup", roles: ["exam-manager"] },
  { id: "exam-classes", label: "Exam Classes & Subjects", href: "exam-classes", roles: ["exam-manager"] },
  { id: "papers-components", label: "Papers & Components", href: "papers-components", roles: ["exam-manager"] },
  { id: "exam-timetable", label: "Exam Timetable", href: "exam-timetable", roles: ["exam-manager"] },
  { id: "invigilation", label: "Invigilation", href: "invigilation", roles: ["exam-manager"] },
  { id: "exam-attendance", label: "Exam Attendance", href: "exam-attendance", roles: ["exam-manager"] },
  { id: "marks-monitor", label: "Marks Entry Monitor", href: "marks-monitor", roles: ["exam-manager"] },
  { id: "my-marks", label: "My Marks Entry", href: "my-marks", roles: ["exam-manager"] },
  { id: "imports-templates", label: "Imports & Templates", href: "imports-templates", roles: ["exam-manager"] },
  { id: "moderation", label: "Moderation & Validation", href: "moderation", roles: ["exam-manager"] },
  { id: "grading-rubrics", label: "Grading & Rubrics", href: "grading-rubrics", roles: ["exam-manager"] },
  { id: "results-processing", label: "Results Processing", href: "results-processing", roles: ["exam-manager"] },
  { id: "report-cards", label: "Report Cards", href: "report-cards", roles: ["exam-manager"] },
  { id: "approvals-publishing", label: "Approvals & Publishing", href: "approvals-publishing", roles: ["exam-manager"] },
  { id: "student-cases", label: "Student Exam Cases", href: "student-cases", roles: ["exam-manager"] },
  { id: "communication-exam", label: "Communication", href: "communication-exam", roles: ["exam-manager"] },
  { id: "reports-exam", label: "Reports & Downloads", href: "reports-exam", roles: ["exam-manager"] },
  { id: "audit-logs", label: "Audit Logs", href: "audit-logs", roles: ["exam-manager"] },
  { id: "exam-settings", label: "Exam Settings", href: "exam-settings", roles: ["exam-manager"] },
  
  // Dean of Academics workspaces
  { id: "command-center", label: "Command Center", href: "command-center", roles: ["dean"] },
  { id: "academic-calendar", label: "Academic Calendar", href: "academic-calendar", roles: ["dean"] },
  { id: "departments", label: "Departments & HODs", href: "departments", roles: ["dean"] },
  { id: "subjects", label: "Subjects & Curriculum", href: "subjects", roles: ["dean"] },
  { id: "teacher-workload", label: "Teacher Workload", href: "teacher-workload", roles: ["dean"] },
  { id: "timetable-oversight", label: "Timetable Oversight", href: "timetable-oversight", roles: ["dean"] },
  { id: "lesson-plans", label: "Lesson Plans", href: "lesson-plans", roles: ["dean"] },
  { id: "lesson-logs", label: "Lesson Logs", href: "lesson-logs", roles: ["dean"] },
  { id: "syllabus-coverage", label: "Syllabus Coverage", href: "syllabus-coverage", roles: ["dean"] },
  { id: "continuous-assessment", label: "Continuous Assessment", href: "continuous-assessment", roles: ["dean"] },
  { id: "exam-review", label: "Exam Review", href: "exam-review", roles: ["dean"] },
  { id: "performance-analytics", label: "Performance Analytics", href: "performance-analytics", roles: ["dean"] },
  { id: "academic-interventions", label: "Academic Interventions", href: "academic-interventions", roles: ["dean"] },
  { id: "department-reviews", label: "Department Reviews", href: "department-reviews", roles: ["dean"] },
  { id: "teacher-academic-reports", label: "Teacher Academic Reports", href: "teacher-academic-reports", roles: ["dean"] },
  { id: "student-academic-support", label: "Student Academic Support", href: "student-academic-support", roles: ["dean"] },
  { id: "report-card-oversight", label: "Report Card Oversight", href: "report-card-oversight", roles: ["dean"] },
  { id: "academic-reports", label: "Academic Reports", href: "academic-reports", roles: ["dean"] },
  { id: "messages-notices", label: "Messages & Notices", href: "messages-notices", roles: ["dean"] },
  { id: "approvals-follow-ups", label: "Approvals & Follow-ups", href: "approvals-follow-ups", roles: ["dean"] },
  { id: "my-teaching", label: "My Teaching", href: "my-teaching", roles: ["dean"] },
  { id: "dean-settings", label: "Settings", href: "dean-settings", roles: ["dean"] },
  
  // HOD workspaces
  { id: "overview", label: "Overview", href: "overview", roles: ["hod"] },
  { id: "my-teaching", label: "My Teaching", href: "my-teaching", roles: ["hod"] },
  { id: "department-teachers", label: "Department Teachers", href: "department-teachers", roles: ["hod"] },
  { id: "subject-allocation", label: "Subject Allocation", href: "subject-allocation", roles: ["hod"] },
  { id: "schemes-of-work", label: "Schemes of Work", href: "schemes-of-work", roles: ["hod"] },
  { id: "lesson-plans", label: "Lesson Plans", href: "lesson-plans", roles: ["hod"] },
  { id: "lesson-delivery", label: "Lesson Delivery", href: "lesson-delivery", roles: ["hod"] },
  { id: "syllabus-coverage", label: "Syllabus Coverage", href: "syllabus-coverage", roles: ["hod"] },
  { id: "assessments-cats", label: "Assessments & CATs", href: "assessments-cats", roles: ["hod"] },
  { id: "exams-marks-moderation", label: "Exams & Marks Moderation", href: "exams-marks-moderation", roles: ["hod"] },
  { id: "performance-analytics", label: "Performance Analytics", href: "performance-analytics", roles: ["hod"] },
  { id: "learner-interventions", label: "Learner Interventions", href: "learner-interventions", roles: ["hod"] },
  { id: "lesson-observation", label: "Lesson Observation", href: "lesson-observation", roles: ["hod"] },
  { id: "resources-requests", label: "Resources & Requests", href: "resources-requests", roles: ["hod"] },
  { id: "department-meetings", label: "Department Meetings", href: "department-meetings", roles: ["hod"] },
  { id: "communication", label: "Communication", href: "communication", roles: ["hod"] },
  { id: "approvals", label: "Approvals", href: "approvals", roles: ["hod"] },
  { id: "reports-downloads", label: "Reports & Downloads", href: "reports-downloads", roles: ["hod"] },
  { id: "department-settings", label: "Department Settings", href: "department-settings", roles: ["hod"] },
];

export const quickActionsCatalog: QuickActionItem[] = [
  {
    id: "add-student",
    label: "Add Student",
    description: "Admit a new learner and assign a class instantly.",
    href: "students",
    roles: ["admin"],
    offlineAllowed: false,
  },
  {
    id: "record-payment",
    label: "Record Payment",
    description: "Capture fee payments or verify M-PESA receipts.",
    href: "finance",
    roles: ["admin", "bursar"],
    offlineAllowed: false,
    sensitive: true,
  },
  {
    id: "view-child",
    label: "View Child Summary",
    description: "Open academics, fee balance, and communication history.",
    href: "students",
    roles: ["parent"],
    offlineAllowed: true,
  },
  {
    id: "adjust-stock",
    label: "Adjust Stock",
    description: "Record stock issues, receipts, and urgent quantity corrections.",
    href: "inventory",
    roles: ["storekeeper", "admin"],
    offlineAllowed: false,
  },
  {
    id: "create-po",
    label: "Create PO",
    description: "Prepare a supplier purchase order and route it for approval.",
    href: "inventory",
    roles: ["storekeeper", "admin", "bursar"],
    offlineAllowed: false,
  },
  {
    id: "send-sms",
    label: "Send SMS",
    description: "Notify families about fees, academics, or timetable changes.",
    href: "communication",
    roles: ["admin", "bursar", "teacher"],
    offlineAllowed: false,
  },
  {
    id: "print-report",
    label: "Print Report",
    description: "Open the report center and print a school-ready summary fast.",
    href: "reports",
    roles: ["admin", "bursar"],
    offlineAllowed: false,
  },
  {
    id: "open-library",
    label: "Open Catalog",
    description: "Manage catalog, borrowing, returns, fines, and reports.",
    href: "library",
    roles: ["librarian"],
    offlineAllowed: true,
  },
  {
    id: "issue-book",
    label: "Issue Book",
    description: "Open the borrowing desk for a learner or staff member.",
    href: "library",
    roles: ["librarian"],
    offlineAllowed: true,
  },
  {
    id: "new-registration",
    label: "New Registration",
    description: "Start a full learner admission and registration workflow.",
    href: "admissions",
    roles: ["admissions", "admin"],
    offlineAllowed: false,
  },
  {
    id: "review-application",
    label: "Review Application",
    description: "Open pending files, missing documents, and approval queues.",
    href: "admissions",
    roles: ["admissions", "admin"],
    offlineAllowed: false,
  },
];

export const capabilityCatalog: CapabilityItem[] = [
  {
    id: "cap-students",
    label: "Student records",
    description: "Admissions, guardian links, learner history, and class placement.",
    href: "students",
    roles: ["admin", "teacher", "parent"],
    status: "ok",
    category: "students",
  },
  {
    id: "cap-guardians",
    label: "Family profiles",
    description: "Parent contacts, notices, fee visibility, and household-facing views.",
    href: "students",
    roles: ["admin", "parent"],
    status: "ok",
    category: "students",
  },
  {
    id: "cap-cbc",
    label: "CBC academics",
    description: "Subjects, exams, grading queue, and competency performance trends.",
    href: "academics",
    roles: ["admin", "teacher", "parent"],
    status: "ok",
    category: "academics",
  },
  {
    id: "cap-billing",
    label: "Billing and invoices",
    description: "Fee structures, invoice pressure, and subscription-aware collection control.",
    href: "finance",
    roles: ["admin", "bursar", "parent"],
    status: "warning",
    category: "finance",
  },
  {
    id: "cap-inventory-stock",
    label: "Inventory control",
    description: "Stock cards, reorder pressure, storage locations, and issue history.",
    href: "inventory",
    roles: ["admin", "bursar", "storekeeper"],
    status: "warning",
    category: "inventory",
  },
  {
    id: "cap-procurement",
    label: "Procurement workflow",
    description: "Suppliers, purchase orders, approvals, receiving, and cost exposure.",
    href: "inventory",
    roles: ["admin", "bursar", "storekeeper"],
    status: "ok",
    category: "inventory",
  },
  {
    id: "cap-library",
    label: "Library operations",
    description: "Catalog, issuing, returns, reservations, overdue items, fines, and reports.",
    href: "library",
    roles: ["librarian"],
    status: "ok",
    category: "library",
  },
  {
    id: "cap-admissions",
    label: "Admissions office",
    description: "Applications, interviews, approvals, registration, and classing.",
    href: "admissions",
    roles: ["admin", "admissions"],
    status: "ok",
    category: "admissions",
  },
  {
    id: "cap-documents",
    label: "Student documents",
    description: "Birth certificates, report forms, verification, and missing file follow-up.",
    href: "admissions",
    roles: ["admin", "admissions"],
    status: "warning",
    category: "admissions",
  },
  {
    id: "cap-mpesa",
    label: "M-PESA payments",
    description: "STK callbacks, failed transactions, retries, and payment lifecycle monitoring.",
    href: "mpesa",
    roles: ["admin", "bursar"],
    status: "critical",
    category: "finance",
  },
  {
    id: "cap-ledger",
    label: "Ledger and reconciliation",
    description: "Double-entry truth, collections reconciliation, and finance audit posture.",
    href: "finance",
    roles: ["admin", "bursar"],
    status: "ok",
    category: "finance",
  },
  {
    id: "cap-communication",
    label: "Communication",
    description: "SMS bursts, notices, reminders, and parent outreach queues.",
    href: "communication",
    roles: ["admin", "bursar", "teacher", "parent"],
    status: "ok",
    category: "communication",
  },
  {
    id: "cap-reports",
    label: "Reports and analytics",
    description: "Cross-functional drill-downs for finance, academics, and operations trend reading.",
    href: "reports",
    roles: ["admin", "bursar", "teacher", "parent"],
    status: "ok",
    category: "reports",
  },
  {
    id: "cap-observability",
    label: "System health",
    description: "Live service health, delayed jobs, alerts, and production readiness.",
    href: "reports",
    roles: ["admin", "bursar"],
    status: "warning",
    category: "reports",
  },
  {
    id: "cap-security",
    label: "Security and compliance",
    description: "School controls, role scope, consent, export, and operational safeguards.",
    href: "settings",
    roles: ["admin", "bursar"],
    status: "ok",
    category: "settings",
  },
];

const roleWidgetOrder: Record<DashboardRole, DashboardWidgetKey[]> = {
  admin: ["finance", "academics"],
  bursar: ["finance"],
  teacher: ["academics"],
  parent: ["finance", "academics"],
  storekeeper: ["inventory"],
  librarian: ["library"],
  admissions: ["admissions", "students"],
  "exam-manager": ["academics"],
  hod: ["academics"],
  dean: ["academics"],
};

const coreRoleSections = new Set(["dashboard", "settings"]);

function moduleCodeForRoleSection(section: string) {
  const mappedModuleCode = getModuleCodeForSchoolSection(section);

  if (mappedModuleCode || coreRoleSections.has(section)) {
    return mappedModuleCode;
  }

  return section;
}

function filterByCapabilities<TItem extends { id: string; href: string }>(
  items: TItem[],
  options: RoleCapabilityOptions = {},
) {
  const visibleItems = buildCapabilitySidebar({
    items: items.map((item, index) => ({
      ...item,
      capabilityIndex: index,
      moduleCode: moduleCodeForRoleSection(item.href),
    })),
    moduleEntitlements: options.moduleEntitlements,
    rolePermissions: options.rolePermissions,
    enforcement: options.enforcement,
  });
  const visibleIndexes = new Set(visibleItems.map((item) => item.capabilityIndex));

  return items.filter((_item, index) => visibleIndexes.has(index));
}

function isCapabilityItemEntitled(item: CapabilityItem, options: RoleCapabilityOptions = {}) {
  const hrefModuleCode = moduleCodeForRoleSection(item.href);
  const categoryModuleCode = moduleCodeForRoleSection(item.category);

  return (
    isModuleEntitled(hrefModuleCode, options.moduleEntitlements)
    && isModuleEntitled(categoryModuleCode, options.moduleEntitlements)
  );
}

export function isDashboardRole(value: string): value is DashboardRole {
  return DASHBOARD_ROLES.includes(value as DashboardRole);
}

export function getRoleSidebar(role: DashboardRole, options: RoleCapabilityOptions = {}): SidebarItem[] {
  const roleItems = sidebarItems.filter((item) => item.roles.includes(role) && isProductionReadyModule(item.id));

  return filterByCapabilities(roleItems, options);
}

export function getRoleQuickActions(role: DashboardRole, options: RoleCapabilityOptions = {}) {
  const roleItems = quickActionsCatalog.filter((item) => item.roles.includes(role) && isProductionReadyModule(item.href));

  return filterByCapabilities(roleItems, options);
}

export function getRoleWidgetOrder(role: DashboardRole) {
  return roleWidgetOrder[role].filter((widget) => isProductionReadyModule(widget));
}

export function getRoleCapabilities(role: DashboardRole, options: RoleCapabilityOptions = {}) {
  return capabilityCatalog.filter(
    (item) =>
      item.roles.includes(role)
      && isProductionReadyModule(item.href)
      && isProductionReadyModule(item.category)
      && isCapabilityItemEntitled(item, options),
  );
}

export function canRoleAccessModule(
  role: DashboardRole,
  moduleName: string,
  options: RoleCapabilityOptions = {},
) {
  if (!isProductionReadyModule(moduleName)) {
    return false;
  }

  const moduleItem = sidebarItems.find(
    (item) => item.id === moduleName || item.href === moduleName,
  );

  return Boolean(
    moduleItem
    && moduleItem.roles.includes(role)
    && isModuleEntitled(moduleCodeForRoleSection(moduleName), options.moduleEntitlements),
  );
}

export function doesModuleExist(moduleName: string, options: RoleCapabilityOptions = {}) {
  if (!isProductionReadyModule(moduleName)) {
    return false;
  }

  return sidebarItems.some(
    (item) =>
      (item.id === moduleName || item.href === moduleName)
      && isModuleEntitled(moduleCodeForRoleSection(moduleName), options.moduleEntitlements),
  );
}
