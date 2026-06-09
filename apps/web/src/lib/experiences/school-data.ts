import {
  BarChart3,
  BookOpenCheck,
  Boxes,
  Building2,
  BusFront,
  CalendarDays,
  ClipboardList,
  CircleDollarSign,
  Cpu,
  FileSpreadsheet,
  Fingerprint,
  FlaskConical,
  GraduationCap,
  LayoutGrid,
  MessageSquareText,
  Printer,
  Settings,
  ShoppingCart,
  SmartphoneCharging,
  Stethoscope,
  ShieldAlert,
  Users,
  UserSquare2,
} from "lucide-react";

import { buildSchoolErpModel } from "@/lib/dashboard/erp-model";
import { buildDashboardSnapshot } from "@/lib/dashboard/empty-data";
import type { DashboardRole } from "@/lib/dashboard/types";
import { getDefaultSchoolBranding, getSchoolBrandingBySlug } from "@/lib/auth/school-branding";
import type {
  ExperienceMetric,
  ExperienceNavItem,
  ExperienceProfile,
  SchoolExperienceRole,
} from "@/lib/experiences/types";
import { filterProductionReadyNavItems } from "@/lib/features/module-readiness";
export type { SchoolExperienceRole } from "@/lib/experiences/types";
import { toSchoolPath } from "@/lib/routing/experience-routes";
import { supportSidebarItems } from "@/lib/support/support-data";

export interface SchoolSubscriptionReminder {
  id: string;
  channel: "admin" | "sms" | "email";
  title: string;
  detail: string;
  status: string;
  tone: "ok" | "warning" | "critical";
}

export interface SchoolSubscriptionStage {
  id: string;
  label: "ACTIVE" | "TRIAL" | "EXPIRING" | "GRACE_PERIOD" | "RESTRICTED" | "SUSPENDED";
  description: string;
}

export interface SchoolSubscriptionView {
  state: SchoolSubscriptionStage["label"];
  tone: "ok" | "warning" | "critical";
  accessMode: "full" | "read_only" | "billing_only";
  statusLabel: string;
  headline: string;
  detail: string;
  renewalDueLabel: string;
  exportAllowedLabel: string;
  primaryActionLabel: string;
  primaryActionHref: string;
  reminders: SchoolSubscriptionReminder[];
  stages: SchoolSubscriptionStage[];
}

const schoolNavMap: Record<SchoolExperienceRole, ExperienceNavItem[]> = {
  principal: [
    { id: "dashboard", label: "Dashboard", href: toSchoolPath("dashboard"), icon: LayoutGrid, group: "Overview" },
    { id: "executive-analytics", label: "Executive Analytics", href: toSchoolPath("executive-analytics"), icon: BarChart3, group: "Command" },
    { id: "alerts-risks", label: "Alerts & Risks", href: toSchoolPath("alerts-risks"), icon: ShieldAlert, group: "Command" },
    { id: "approvals", label: "Approvals", href: toSchoolPath("approvals"), icon: ClipboardList, group: "Governance" },
    { id: "universal-approvals", label: "Universal Approvals", href: toSchoolPath("universal-approvals"), icon: ClipboardList, group: "Governance" },
    { id: "users-staff", label: "Users & Staff", href: toSchoolPath("users-staff"), icon: UserSquare2, group: "Governance" },
    { id: "exams", label: "Academic Oversight", href: toSchoolPath("exams"), icon: BookOpenCheck, group: "Governance" },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet, group: "Governance" },
    { id: "reports-analytics", label: "Reports Center", href: toSchoolPath("reports-analytics"), icon: BarChart3, group: "Governance" },
    { id: "school-calendar", label: "School Calendar", href: toSchoolPath("school-calendar"), icon: CalendarDays, group: "Operations" },
    { id: "communication-center", label: "Communication Center", href: toSchoolPath("communication-center"), icon: MessageSquareText, group: "Operations" },
    { id: "document-printing", label: "Document Printing", href: toSchoolPath("document-printing"), icon: Printer, group: "Operations" },
    { id: "data-security", label: "Data Security", href: toSchoolPath("data-security"), icon: Fingerprint, group: "Intelligence" },
    { id: "ai-insights", label: "AI Insights", href: toSchoolPath("ai-insights"), icon: Cpu, group: "Intelligence" },
    { id: "audit-logs", label: "Audit Logs", href: toSchoolPath("audit-logs"), icon: Fingerprint, group: "Intelligence" },
    ...supportSidebarItems,
    { id: "settings", label: "Settings", href: toSchoolPath("settings"), icon: Settings, group: "Administration" },
  ],
  "deputy-principal": [
    { id: "dashboard", label: "Dashboard", href: toSchoolPath("dashboard"), icon: LayoutGrid, group: "Overview" },
    { id: "students", label: "Students", href: toSchoolPath("students"), icon: Users, group: "Students" },
    { id: "academics", label: "Academics", href: toSchoolPath("academics"), icon: GraduationCap, group: "Academics" },
    { id: "exams", label: "Exams", href: toSchoolPath("exams"), icon: BookOpenCheck, group: "Academics" },
    { id: "cbt", label: "CBT Exams", href: toSchoolPath("cbt"), icon: BookOpenCheck, group: "Academics" },
    { id: "lms", label: "LMS", href: toSchoolPath("lms"), icon: GraduationCap, group: "Academics" },
    { id: "timetable", label: "Timetable", href: toSchoolPath("timetable"), icon: CalendarDays, group: "Operations" },
    { id: "timetable-builder", label: "Timetable Builder", href: toSchoolPath("timetable-builder"), icon: CalendarDays, group: "Operations" },
    { id: "school-calendar", label: "School Calendar", href: toSchoolPath("school-calendar"), icon: CalendarDays, group: "Operations" },
    { id: "co-curricular", label: "Co-curricular", href: toSchoolPath("co-curricular"), icon: GraduationCap, group: "Operations" },
    { id: "labs", label: "Laboratories", href: toSchoolPath("labs"), icon: FlaskConical, group: "Operations" },
    { id: "discipline", label: "Discipline", href: toSchoolPath("discipline"), icon: ShieldAlert, group: "Student welfare" },
    { id: "clinic", label: "Clinic", href: toSchoolPath("clinic"), icon: Stethoscope, group: "Student welfare" },
    { id: "leadership", label: "Operations", href: toSchoolPath("leadership"), icon: Building2, group: "Operations" },
    { id: "teacher-attendance", label: "Teacher Attendance", href: toSchoolPath("teacher-attendance"), icon: Fingerprint, group: "Operations" },
    { id: "transport", label: "Transport", href: toSchoolPath("transport"), icon: BusFront, group: "Operations" },
    { id: "procurement", label: "Procurement", href: toSchoolPath("procurement"), icon: ShoppingCart, group: "Operations" },
    { id: "hostel", label: "Hostel", href: toSchoolPath("hostel"), icon: Building2, group: "Operations" },
    { id: "boarding", label: "Boarding", href: toSchoolPath("boarding"), icon: Building2, group: "Operations" },
    { id: "visitors", label: "Visitors", href: toSchoolPath("visitors"), icon: ClipboardList, group: "Operations" },
    { id: "assets", label: "Assets", href: toSchoolPath("assets"), icon: Boxes, group: "Operations" },
    { id: "iot", label: "IoT", href: toSchoolPath("iot"), icon: Cpu, group: "Operations" },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet, group: "Operations" },
    { id: "communication", label: "Communication (SMS)", href: toSchoolPath("communication"), icon: MessageSquareText, group: "Operations" },
    { id: "communication-center", label: "Communication Center", href: toSchoolPath("communication-center"), icon: MessageSquareText, group: "Operations" },
    { id: "universal-approvals", label: "Universal Approvals", href: toSchoolPath("universal-approvals"), icon: ClipboardList, group: "Operations" },
    ...supportSidebarItems,
  ],
  secretary: [
    { id: "dashboard", label: "Dashboard", href: toSchoolPath("dashboard"), icon: LayoutGrid, group: "Overview" },
    { id: "school-admin", label: "School Admin", href: toSchoolPath("school-admin"), icon: Building2, group: "Administration" },
    { id: "admissions", label: "Admissions", href: toSchoolPath("admissions"), icon: ClipboardList, group: "Admissions" },
    { id: "students", label: "Students", href: toSchoolPath("students"), icon: Users, group: "Records" },
    { id: "document-printing", label: "Document Printing", href: toSchoolPath("document-printing"), icon: Printer, group: "Records" },
    { id: "communication", label: "Communication (SMS)", href: toSchoolPath("communication"), icon: MessageSquareText, group: "Administration" },
    { id: "communication-center", label: "Communication Center", href: toSchoolPath("communication-center"), icon: MessageSquareText, group: "Administration" },
    { id: "school-calendar", label: "School Calendar", href: toSchoolPath("school-calendar"), icon: CalendarDays, group: "Administration" },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet, group: "Administration" },
    { id: "staff", label: "Staff", href: toSchoolPath("staff"), icon: UserSquare2, group: "Administration" },
    { id: "leadership", label: "Secretary Desk", href: toSchoolPath("leadership"), icon: Building2, group: "Administration" },
    ...supportSidebarItems,
  ],
  bursar: [
    { id: "dashboard", label: "Dashboard", href: toSchoolPath("dashboard"), icon: LayoutGrid, group: "Overview" },
    { id: "students", label: "Students", href: toSchoolPath("students"), icon: Users, group: "Students" },
    { id: "finance", label: "Fees / Payments", href: toSchoolPath("finance"), icon: CircleDollarSign, group: "Finance" },
    { id: "mpesa", label: "MPESA Transactions", href: toSchoolPath("mpesa"), icon: SmartphoneCharging, group: "Finance" },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet, group: "Operations" },
    { id: "communication", label: "Communication (SMS)", href: toSchoolPath("communication"), icon: MessageSquareText, group: "Operations" },
    ...supportSidebarItems,
    { id: "settings", label: "Settings", href: toSchoolPath("settings"), icon: Settings, group: "Administration" },
  ],
  accountant: [
    { id: "dashboard", label: "Dashboard", href: toSchoolPath("dashboard"), icon: LayoutGrid, group: "Overview" },
    { id: "finance", label: "Finance Overview", href: toSchoolPath("finance"), icon: CircleDollarSign, group: "Finance" },
    { id: "mpesa", label: "Bank Reconciliation", href: toSchoolPath("mpesa"), icon: SmartphoneCharging, group: "Banking" },
    { id: "procurement", label: "Procurement", href: toSchoolPath("procurement"), icon: ShoppingCart, group: "Expenses" },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet, group: "Reports" },
    { id: "ai-insights", label: "AI Insights", href: toSchoolPath("ai-insights"), icon: Cpu, group: "Intelligence" },
    { id: "communication", label: "Communication", href: toSchoolPath("communication"), icon: MessageSquareText, group: "Operations" },
    ...supportSidebarItems,
    { id: "settings", label: "Settings", href: toSchoolPath("settings"), icon: Settings, group: "Administration" },
  ],
  teacher: [
    { id: "dashboard", label: "Dashboard", href: toSchoolPath("dashboard"), icon: LayoutGrid, group: "Overview" },
    { id: "students", label: "Students", href: toSchoolPath("students"), icon: Users, group: "Students" },
    { id: "academics", label: "Academics", href: toSchoolPath("academics"), icon: GraduationCap, group: "Academics" },
    { id: "exams", label: "Exams", href: toSchoolPath("exams"), icon: BookOpenCheck, group: "Academics" },
    { id: "cbt", label: "CBT Exams", href: toSchoolPath("cbt"), icon: BookOpenCheck, group: "Academics" },
    { id: "lms", label: "LMS", href: toSchoolPath("lms"), icon: GraduationCap, group: "Academics" },
    { id: "labs", label: "Laboratories", href: toSchoolPath("labs"), icon: FlaskConical, group: "Academics" },
    { id: "discipline", label: "Discipline", href: toSchoolPath("discipline"), icon: ShieldAlert, group: "Student welfare" },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet, group: "Academics" },
    { id: "communication", label: "Communication (SMS)", href: toSchoolPath("communication"), icon: MessageSquareText, group: "Operations" },
    { id: "timetable", label: "Timetable", href: toSchoolPath("timetable"), icon: CalendarDays, group: "Operations" },
    ...supportSidebarItems,
  ],
  "dean-academics": [
    { id: "dashboard", label: "Overview", href: toSchoolPath("dashboard"), icon: LayoutGrid, group: "Approval Gate" },
    { id: "exams", label: "Pending Reviews", href: toSchoolPath("exams"), icon: ClipboardList, group: "Approval Gate" },
    { id: "reports", label: "Report Card Approval", href: toSchoolPath("reports"), icon: FileSpreadsheet, group: "Approval Gate" },
    { id: "academics", label: "Curriculum Compliance", href: toSchoolPath("academics"), icon: BookOpenCheck, group: "Quality Control" },
    { id: "staff", label: "Teacher Performance Review", href: toSchoolPath("staff"), icon: Users, group: "Quality Control" },
    { id: "ai-insights", label: "Grading Integrity Checks", href: toSchoolPath("ai-insights"), icon: Cpu, group: "Quality Control" },
    ...supportSidebarItems,
  ],
  "exams-manager": [
    { id: "dashboard", label: "Overview", href: toSchoolPath("dashboard"), icon: LayoutGrid, group: "Exam Production" },
    { id: "exams", label: "Exam Builder", href: toSchoolPath("exams"), icon: ClipboardList, group: "Exam Production" },
    { id: "timetable", label: "Timetable Scheduler", href: toSchoolPath("timetable"), icon: CalendarDays, group: "Exam Production" },
    { id: "marks", label: "Marks Entry Hub", href: toSchoolPath("exams"), icon: BookOpenCheck, group: "Marks" },
    { id: "grading", label: "Grade Processing", href: toSchoolPath("exams"), icon: BarChart3, group: "Marks" },
    { id: "reports", label: "Report Card Drafts", href: toSchoolPath("reports"), icon: FileSpreadsheet, group: "Draft Reports" },
    { id: "validation", label: "Data Validation", href: toSchoolPath("exams"), icon: ShieldAlert, group: "Quality Control" },
    ...supportSidebarItems,
  ],
  hod: [
    { id: "dashboard", label: "Dashboard Overview", href: toSchoolPath("dashboard"), icon: LayoutGrid, group: "Overview" },
    { id: "staff", label: "Teachers", href: toSchoolPath("staff"), icon: Users, group: "Department" },
    { id: "academics", label: "Subjects", href: toSchoolPath("academics"), icon: GraduationCap, group: "Department" },
    { id: "syllabus", label: "Syllabus Coverage", href: toSchoolPath("academics"), icon: ClipboardList, group: "Curriculum" },
    { id: "exams", label: "Exams & Performance", href: toSchoolPath("exams"), icon: BookOpenCheck, group: "Curriculum" },
    { id: "lesson-plans", label: "Lesson Plans", href: toSchoolPath("academics"), icon: FileSpreadsheet, group: "Curriculum" },
    { id: "attendance", label: "Attendance Analysis", href: toSchoolPath("teacher-attendance"), icon: Fingerprint, group: "Analytics" },
    { id: "resources", label: "Department Resources", href: toSchoolPath("assets"), icon: Boxes, group: "Operations" },
    { id: "reports", label: "Meetings & Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet, group: "Operations" },
    { id: "student-analytics", label: "Student Analytics", href: toSchoolPath("students"), icon: Users, group: "Analytics" },
    { id: "timetable", label: "Timetable Coordination", href: toSchoolPath("timetable"), icon: CalendarDays, group: "Operations" },
    { id: "communication", label: "Communication", href: toSchoolPath("communication"), icon: MessageSquareText, group: "Engagement" },
    ...supportSidebarItems,
    { id: "settings", label: "Settings", href: toSchoolPath("settings"), icon: Settings, group: "Administration" },
  ],
  admin: [
    { id: "dashboard", label: "Dashboard", href: toSchoolPath("dashboard"), icon: LayoutGrid, group: "Overview" },
    { id: "students", label: "Students", href: toSchoolPath("students"), icon: Users, group: "Students" },
    { id: "discipline", label: "Discipline", href: toSchoolPath("discipline"), icon: ShieldAlert, group: "Student welfare" },
    { id: "teacher-attendance", label: "Teacher Attendance", href: toSchoolPath("teacher-attendance"), icon: Fingerprint, group: "Operations" },
    { id: "transport", label: "Transport", href: toSchoolPath("transport"), icon: BusFront, group: "Operations" },
    { id: "procurement", label: "Procurement", href: toSchoolPath("procurement"), icon: ShoppingCart, group: "Operations" },
    { id: "school-admin", label: "School Admin", href: toSchoolPath("school-admin"), icon: Building2, group: "Operations" },
    { id: "hr-payroll", label: "HR & Payroll", href: toSchoolPath("hr-payroll"), icon: UserSquare2, group: "Operations" },
    { id: "timetable-builder", label: "Timetable Builder", href: toSchoolPath("timetable-builder"), icon: CalendarDays, group: "Operations" },
    { id: "communication-center", label: "Communication Center", href: toSchoolPath("communication-center"), icon: MessageSquareText, group: "Operations" },
    { id: "school-calendar", label: "School Calendar", href: toSchoolPath("school-calendar"), icon: CalendarDays, group: "Operations" },
    { id: "canteen-meals", label: "Canteen & Meals", href: toSchoolPath("canteen-meals"), icon: ShoppingCart, group: "Operations" },
    { id: "co-curricular", label: "Co-curricular", href: toSchoolPath("co-curricular"), icon: GraduationCap, group: "Operations" },
    { id: "data-security", label: "Data Security", href: toSchoolPath("data-security"), icon: Fingerprint, group: "Operations" },
    { id: "setup-wizard", label: "Setup Wizard", href: toSchoolPath("setup-wizard"), icon: ClipboardList, group: "Operations" },
    { id: "ict-assets", label: "ICT Assets", href: toSchoolPath("ict-assets"), icon: Cpu, group: "Operations" },
    { id: "document-printing", label: "Document Printing", href: toSchoolPath("document-printing"), icon: Printer, group: "Operations" },
    { id: "reports-analytics", label: "Reports Center", href: toSchoolPath("reports-analytics"), icon: BarChart3, group: "Operations" },
    { id: "universal-approvals", label: "Universal Approvals", href: toSchoolPath("universal-approvals"), icon: ClipboardList, group: "Operations" },
    { id: "hostel", label: "Hostel", href: toSchoolPath("hostel"), icon: Building2, group: "Operations" },
    { id: "boarding", label: "Boarding", href: toSchoolPath("boarding"), icon: Building2, group: "Operations" },
    { id: "visitors", label: "Visitors", href: toSchoolPath("visitors"), icon: ClipboardList, group: "Operations" },
    { id: "assets", label: "Assets", href: toSchoolPath("assets"), icon: Boxes, group: "Operations" },
    { id: "iot", label: "IoT", href: toSchoolPath("iot"), icon: Cpu, group: "Operations" },
    { id: "labs", label: "Laboratories", href: toSchoolPath("labs"), icon: FlaskConical, group: "Operations" },
    { id: "clinic", label: "Clinic", href: toSchoolPath("clinic"), icon: Stethoscope, group: "Operations" },
    { id: "finance", label: "Fees / Payments", href: toSchoolPath("finance"), icon: CircleDollarSign, group: "Finance" },
    { id: "mpesa", label: "MPESA Transactions", href: toSchoolPath("mpesa"), icon: SmartphoneCharging, group: "Finance" },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet, group: "Operations" },
    { id: "communication", label: "Communication (SMS)", href: toSchoolPath("communication"), icon: MessageSquareText, group: "Operations" },
    ...supportSidebarItems,
    { id: "staff", label: "Staff", href: toSchoolPath("staff"), icon: UserSquare2, group: "Administration" },
    { id: "inventory", label: "Inventory", href: toSchoolPath("inventory"), icon: Boxes, group: "Administration" },
    { id: "settings", label: "Settings", href: toSchoolPath("settings"), icon: Settings, group: "Administration" },
  ],
  student: [
    { id: "dashboard", label: "Dashboard", href: toSchoolPath("dashboard"), icon: LayoutGrid, group: "Overview" },
    { id: "academics", label: "Learning", href: toSchoolPath("academics"), icon: GraduationCap, group: "Academics" },
    { id: "lms", label: "Assignments", href: toSchoolPath("lms"), icon: GraduationCap, group: "Academics" },
    { id: "library", label: "Library Books", href: toSchoolPath("library"), icon: BookOpenCheck, group: "School life" },
    { id: "timetable", label: "Timetable", href: toSchoolPath("timetable"), icon: CalendarDays, group: "School life" },
    { id: "communication", label: "Messages", href: toSchoolPath("communication"), icon: MessageSquareText, group: "School life" },
    { id: "reports", label: "Downloads", href: toSchoolPath("reports"), icon: FileSpreadsheet, group: "School life" },
  ],
  "ict-manager": [
    { id: "dashboard", label: "Dashboard", href: toSchoolPath("dashboard"), icon: LayoutGrid, group: "Overview" },
    { id: "ict-assets", label: "ICT Assets", href: toSchoolPath("ict-assets"), icon: Cpu, group: "ICT" },
    { id: "assets", label: "Device Assets", href: toSchoolPath("assets"), icon: Boxes, group: "ICT" },
    { id: "labs", label: "Computer Lab", href: toSchoolPath("labs"), icon: FlaskConical, group: "ICT" },
    { id: "iot", label: "Network Devices", href: toSchoolPath("iot"), icon: Cpu, group: "ICT" },
    { id: "procurement", label: "Repair Requests", href: toSchoolPath("procurement"), icon: ShoppingCart, group: "ICT" },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet, group: "ICT" },
  ],
  storekeeper: [
    { id: "dashboard", label: "Dashboard", href: toSchoolPath("dashboard"), icon: LayoutGrid, group: "Overview" },
    { id: "inventory", label: "Inventory", href: toSchoolPath("inventory"), icon: Boxes, group: "Store operations" },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet, group: "Store operations" },
    { id: "communication", label: "Communication", href: toSchoolPath("communication"), icon: MessageSquareText, group: "Operations" },
    ...supportSidebarItems,
  ],
  admissions: [
    { id: "dashboard", label: "Dashboard", href: toSchoolPath("dashboard"), icon: LayoutGrid, group: "Overview" },
    { id: "admissions", label: "Admissions", href: toSchoolPath("admissions"), icon: ClipboardList, group: "Admissions" },
    { id: "students", label: "Students", href: toSchoolPath("students"), icon: Users, group: "Admissions" },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet, group: "Admissions" },
    { id: "communication", label: "Communication", href: toSchoolPath("communication"), icon: MessageSquareText, group: "Operations" },
    ...supportSidebarItems,
  ],
  librarian: [
    { id: "dashboard", label: "Dashboard", href: toSchoolPath("dashboard"), icon: LayoutGrid, group: "Overview" },
    { id: "library", label: "Library Desk", href: toSchoolPath("library"), icon: BookOpenCheck, group: "Library" },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet, group: "Library" },
    { id: "communication", label: "Overdue SMS", href: toSchoolPath("communication"), icon: MessageSquareText, group: "Library" },
    ...supportSidebarItems,
  ],
  nurse: [
    { id: "dashboard", label: "Dashboard", href: toSchoolPath("dashboard"), icon: LayoutGrid, group: "Overview" },
    { id: "clinic", label: "Clinic", href: toSchoolPath("clinic"), icon: Stethoscope, group: "Student welfare" },
    { id: "students", label: "Students", href: toSchoolPath("students"), icon: Users, group: "Student welfare" },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet, group: "Student welfare" },
    { id: "communication", label: "Communication", href: toSchoolPath("communication"), icon: MessageSquareText, group: "Student welfare" },
    ...supportSidebarItems,
  ],
  "class-teacher": [
    { id: "dashboard", label: "Dashboard Home", href: toSchoolPath("dashboard"), icon: LayoutGrid, group: "Overview" },
    { id: "students", label: "My Class", href: toSchoolPath("students"), icon: Users, group: "Class Operations" },
    { id: "academics", label: "Academic Performance", href: toSchoolPath("academics"), icon: GraduationCap, group: "Learning" },
    { id: "exams", label: "Exams", href: toSchoolPath("exams"), icon: BookOpenCheck, group: "Learning" },
    { id: "discipline", label: "Discipline", href: toSchoolPath("discipline"), icon: ShieldAlert, group: "Student Care" },
    { id: "clinic", label: "Student Welfare", href: toSchoolPath("clinic"), icon: Stethoscope, group: "Student Care" },
    { id: "communication", label: "Parent Communication", href: toSchoolPath("communication"), icon: MessageSquareText, group: "Student Care" },
    { id: "timetable", label: "Timetable", href: toSchoolPath("timetable"), icon: CalendarDays, group: "Planning" },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet, group: "Planning" },
    ...supportSidebarItems,
    { id: "settings", label: "Settings", href: toSchoolPath("settings"), icon: Settings, group: "Resources" },
  ],
  "grade-master": [
    { id: "dashboard", label: "Dashboard Overview", href: toSchoolPath("dashboard"), icon: LayoutGrid, group: "Overview" },
    { id: "students", label: "Streams & Classes", href: toSchoolPath("students"), icon: Users, group: "Grade Operations" },
    { id: "attendance", label: "Attendance Oversight", href: toSchoolPath("students"), icon: UserSquare2, group: "Grade Operations" },
    { id: "discipline", label: "Discipline Oversight", href: toSchoolPath("discipline"), icon: ShieldAlert, group: "Grade Operations" },
    { id: "academics", label: "Academic Monitoring", href: toSchoolPath("academics"), icon: GraduationCap, group: "Academics" },
    { id: "exams", label: "Grade/Form Results", href: toSchoolPath("exams"), icon: BookOpenCheck, group: "Academics" },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet, group: "Administration" },
    { id: "communication", label: "Parent Escalations", href: toSchoolPath("communication"), icon: MessageSquareText, group: "Student Support" },
    ...supportSidebarItems,
    { id: "settings", label: "Settings", href: toSchoolPath("settings"), icon: Settings, group: "Resources" },
  ],
  "boarding-master": [
    { id: "dashboard", label: "Dashboard", href: toSchoolPath("dashboard"), icon: LayoutGrid, group: "Overview" },
    { id: "boarding", label: "Boarding", href: toSchoolPath("boarding"), icon: Building2, group: "Boarding" },
    { id: "hostel", label: "Hostel", href: toSchoolPath("hostel"), icon: Building2, group: "Boarding" },
    { id: "students", label: "Students", href: toSchoolPath("students"), icon: Users, group: "Student welfare" },
    { id: "discipline", label: "Discipline", href: toSchoolPath("discipline"), icon: ShieldAlert, group: "Student welfare" },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet, group: "Boarding" },
    { id: "communication", label: "Communication", href: toSchoolPath("communication"), icon: MessageSquareText, group: "Boarding" },
    ...supportSidebarItems,
  ],
  "security-officer": [
    { id: "dashboard", label: "Dashboard", href: toSchoolPath("dashboard"), icon: LayoutGrid, group: "Overview" },
    { id: "visitors", label: "Visitors", href: toSchoolPath("visitors"), icon: ClipboardList, group: "Gate records" },
    { id: "transport", label: "Transport", href: toSchoolPath("transport"), icon: BusFront, group: "Movement" },
    { id: "students", label: "Students", href: toSchoolPath("students"), icon: Users, group: "Movement" },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet, group: "Gate records" },
    ...supportSidebarItems,
  ],
  "transport-manager": [
    { id: "dashboard", label: "Dashboard Overview", href: toSchoolPath("dashboard"), icon: LayoutGrid, group: "Overview" },
    { id: "transport", label: "Fleet Management", href: toSchoolPath("transport"), icon: BusFront, group: "Fleet" },
    { id: "students", label: "Student Transport Allocation", href: toSchoolPath("students"), icon: Users, group: "Students" },
    { id: "communication", label: "Parent Notifications", href: toSchoolPath("communication"), icon: MessageSquareText, group: "Communication" },
    { id: "reports", label: "Reports & Analytics", href: toSchoolPath("reports"), icon: FileSpreadsheet, group: "Reporting" },
    { id: "settings", label: "Settings", href: toSchoolPath("settings"), icon: Settings, group: "Administration" },
    ...supportSidebarItems,
  ],
  "laboratory-technician": [
    { id: "dashboard", label: "Dashboard", href: toSchoolPath("dashboard"), icon: LayoutGrid, group: "Overview" },
    { id: "labs", label: "Laboratories", href: toSchoolPath("labs"), icon: FlaskConical, group: "Laboratory" },
    { id: "inventory", label: "Inventory", href: toSchoolPath("inventory"), icon: Boxes, group: "Laboratory" },
    { id: "procurement", label: "Requests", href: toSchoolPath("procurement"), icon: ShoppingCart, group: "Laboratory" },
    { id: "assets", label: "Equipment", href: toSchoolPath("assets"), icon: Boxes, group: "Laboratory" },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet, group: "Laboratory" },
    { id: "ai-insights", label: "AI Insights", href: toSchoolPath("ai-insights"), icon: Cpu, group: "Laboratory" },
    ...supportSidebarItems,
  ],
  "guidance-counselling": [
    { id: "dashboard", label: "Dashboard", href: toSchoolPath("dashboard"), icon: LayoutGrid, group: "Overview" },
    { id: "students", label: "Student Cases", href: toSchoolPath("students"), icon: Users, group: "Wellbeing" },
    { id: "discipline", label: "Discipline Referrals", href: toSchoolPath("discipline"), icon: ShieldAlert, group: "Wellbeing" },
    { id: "clinic", label: "Mental Health Tracking", href: toSchoolPath("clinic"), icon: Stethoscope, group: "Wellbeing" },
    { id: "communication", label: "Parent Meetings", href: toSchoolPath("communication"), icon: MessageSquareText, group: "Engagement" },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet, group: "Reporting" },
    { id: "ai-insights", label: "AI Insights", href: toSchoolPath("ai-insights"), icon: Cpu, group: "Intelligence" },
    ...supportSidebarItems,
  ],
  "discipline-master": [
    { id: "dashboard", label: "Dashboard", href: toSchoolPath("dashboard"), icon: LayoutGrid, group: "Overview" },
    { id: "discipline", label: "Incident Reports", href: toSchoolPath("discipline"), icon: ShieldAlert, group: "Cases" },
    { id: "students", label: "Student Discipline Profiles", href: toSchoolPath("students"), icon: Users, group: "Cases" },
    { id: "boarding", label: "Dormitory Cases", href: toSchoolPath("boarding"), icon: Building2, group: "Boarding" },
    { id: "clinic", label: "Counselling Referrals", href: toSchoolPath("clinic"), icon: Stethoscope, group: "Intervention" },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet, group: "Reporting" },
    { id: "ai-insights", label: "AI Risk Predictions", href: toSchoolPath("ai-insights"), icon: Cpu, group: "Intelligence" },
    { id: "communication", label: "Parent Meetings", href: toSchoolPath("communication"), icon: MessageSquareText, group: "Communication" },
    ...supportSidebarItems,
  ],
};

const roleToDashboardRole: Record<SchoolExperienceRole, DashboardRole> = {
  principal: "admin",
  "deputy-principal": "admin",
  secretary: "admissions",
  bursar: "bursar",
  accountant: "bursar",
  teacher: "teacher",
  "dean-academics": "teacher",
  "exams-manager": "teacher",
  hod: "teacher",
  "class-teacher": "teacher",
  "grade-master": "teacher",
  admin: "admin",
  student: "teacher",
  "ict-manager": "admin",
  storekeeper: "storekeeper",
  librarian: "librarian",
  nurse: "admin",
  "boarding-master": "admin",
  "security-officer": "admin",
  "transport-manager": "admin",
  "laboratory-technician": "admin",
  "guidance-counselling": "admin",
  "discipline-master": "admin",
  admissions: "admissions",
};

export const schoolSectionLabels: Record<string, string> = {
  dashboard: "Dashboard",
  "executive-analytics": "Executive Analytics",
  "alerts-risks": "Alerts & Risks",
  approvals: "Approvals",
  "users-staff": "Users & Staff",
  "audit-logs": "Audit Logs",
  students: "Students",
  finance: "Fees / Payments",
  mpesa: "MPESA Transactions",
  academics: "Academics",
  syllabus: "Syllabus Coverage",
  "lesson-plans": "Lesson Plans",
  attendance: "Attendance",
  resources: "Department Resources",
  "student-analytics": "Student Analytics",
  marks: "Marks Entry Hub",
  grading: "Grade Processing",
  validation: "Data Validation",
  exams: "Exams",
  discipline: "Discipline",
  labs: "Laboratories",
  clinic: "Clinic",
  leadership: "Leadership",
  "teacher-attendance": "Teacher Attendance",
  reports: "Reports",
  communication: "Communication",
  transport: "Transport",
  procurement: "Procurement",
  "school-admin": "School Administrator",
  "hr-payroll": "HR and Payroll",
  "timetable-builder": "Timetable Builder",
  "communication-center": "Communication Center",
  "school-calendar": "School Calendar",
  "canteen-meals": "Canteen and Meals",
  "co-curricular": "Co-curricular Activities",
  "data-security": "Data Security and Backup",
  "setup-wizard": "First-Time Setup Wizard",
  "ict-assets": "ICT and Digital Assets",
  "document-printing": "Document and Printing Center",
  "reports-analytics": "Reports and Analytics Center",
  "universal-approvals": "Universal Approval Center",
  hostel: "Hostel",
  boarding: "Boarding",
  cbt: "CBT Exams",
  lms: "LMS",
  "ai-insights": "AI Insights",
  visitors: "Visitor Management",
  assets: "Asset Tracking",
  iot: "IoT and Smart Campus",
  timetable: "Timetable",
  staff: "Staff",
  inventory: "Inventory",
  library: "Library",
  "support-new-ticket": "New Ticket",
  "support-my-tickets": "My Tickets",
  "support-knowledge-base": "Knowledge Base",
  "support-system-status": "System Status",
  settings: "Settings",
};

function buildSchoolProfile(role: SchoolExperienceRole, schoolName: string): ExperienceProfile {
  const profileMap: Record<SchoolExperienceRole, ExperienceProfile> = {
    principal: {
      name: "Principal Account",
      roleLabel: "Principal",
      contextLabel: schoolName,
    },
    "deputy-principal": {
      name: "Deputy Principal",
      roleLabel: "Deputy principal",
      contextLabel: schoolName,
    },
    secretary: {
      name: "Secretary",
      roleLabel: "Secretary",
      contextLabel: schoolName,
    },
    bursar: {
      name: "Bursar",
      roleLabel: "Bursar",
      contextLabel: schoolName,
    },
    accountant: {
      name: "Accountant",
      roleLabel: "Accountant",
      contextLabel: schoolName,
    },
    teacher: {
      name: "Teacher Account",
      roleLabel: "Teacher",
      contextLabel: schoolName,
    },
    "dean-academics": {
      name: "Dean of Academics",
      roleLabel: "Dean of Academics",
      contextLabel: schoolName,
    },
    "exams-manager": {
      name: "Exams Manager",
      roleLabel: "Exams Manager",
      contextLabel: schoolName,
    },
    hod: {
      name: "Head of Department",
      roleLabel: "Head of Department",
      contextLabel: schoolName,
    },
    "class-teacher": {
      name: "Class Teacher",
      roleLabel: "Class teacher",
      contextLabel: schoolName,
    },
    "grade-master": {
      name: "Grade Master",
      roleLabel: "Grade/Form master",
      contextLabel: schoolName,
    },
    admin: {
      name: "School Admin",
      roleLabel: "School admin",
      contextLabel: schoolName,
    },
    student: {
      name: "Student Account",
      roleLabel: "Student",
      contextLabel: schoolName,
    },
    "ict-manager": {
      name: "ICT Manager",
      roleLabel: "ICT / Computer Lab",
      contextLabel: schoolName,
    },
    storekeeper: {
      name: "Storekeeper",
      roleLabel: "Storekeeper",
      contextLabel: schoolName,
    },
    librarian: {
      name: "Librarian",
      roleLabel: "Librarian",
      contextLabel: schoolName,
    },
    nurse: {
      name: "School Nurse",
      roleLabel: "Nurse",
      contextLabel: schoolName,
    },
    "boarding-master": {
      name: "Boarding Master",
      roleLabel: "Boarding master",
      contextLabel: schoolName,
    },
    "security-officer": {
      name: "Security Officer",
      roleLabel: "Security officer",
      contextLabel: schoolName,
    },
    "transport-manager": {
      name: "Transport Manager",
      roleLabel: "Transport manager",
      contextLabel: schoolName,
    },
    "laboratory-technician": {
      name: "Laboratory Technician",
      roleLabel: "Laboratory technician",
      contextLabel: schoolName,
    },
    "guidance-counselling": {
      name: "School Counsellor",
      roleLabel: "School counsellor",
      contextLabel: schoolName,
    },
    "discipline-master": {
      name: "Discipline Master",
      roleLabel: "Discipline master",
      contextLabel: schoolName,
    },
    admissions: {
      name: "Admissions Officer",
      roleLabel: "Admissions officer",
      contextLabel: schoolName,
    },
  };

  return {
    ...profileMap[role],
    roleKey: role,
  };
}

function canCreateSchoolSupportTicket(role: SchoolExperienceRole) {
  return role === "principal" || role === "deputy-principal";
}

function filterSupportItemsForRole(role: SchoolExperienceRole, items: ExperienceNavItem[]) {
  if (canCreateSchoolSupportTicket(role)) {
    return items;
  }

  return items.filter((item) => !item.id.startsWith("support-"));
}

export function getSchoolWorkspace(role: SchoolExperienceRole, tenantSlug?: string | null) {
  const branding = getSchoolBrandingBySlug(tenantSlug) ?? getDefaultSchoolBranding();
  const dashboardRole = roleToDashboardRole[role];
  const snapshot = buildDashboardSnapshot(dashboardRole, branding.slug, true);
  const model = buildSchoolErpModel({
    role: dashboardRole,
    tenant: snapshot.tenant,
    online: true,
  });

  return {
    role,
    branding,
    dashboardRole,
    snapshot,
    model,
    subscription: buildSchoolSubscription(role),
    navItems: filterSupportItemsForRole(role, filterProductionReadyNavItems(schoolNavMap[role])),
    profile: buildSchoolProfile(role, branding.name),
  };
}

export function getSchoolKpiSummary(role: SchoolExperienceRole, tenantSlug?: string | null): ExperienceMetric[] {
  const { snapshot } = getSchoolWorkspace(role, tenantSlug);

  return snapshot.kpis.slice(0, 4).map((item) => ({
    id: item.id,
    label: item.label,
    value: item.value,
    helper: item.helper,
    trend: item.trendValue,
  }));
}

function buildSchoolSubscription(role: SchoolExperienceRole): SchoolSubscriptionView {
  const stages: SchoolSubscriptionStage[] = [
    {
      id: "active",
      label: "ACTIVE",
      description: "All school workflows remain fully available.",
    },
    {
      id: "trial",
      label: "TRIAL",
      description: "Trial schools get the full product until the trial end date.",
    },
    {
      id: "expiring",
      label: "EXPIRING",
      description: "Warning window before a renewal becomes urgent.",
    },
    {
      id: "grace",
      label: "GRACE_PERIOD",
      description: "Full access remains available while the school completes renewal.",
    },
    {
      id: "restricted",
      label: "RESTRICTED",
      description: "School records stay readable, but new writes are paused except billing and export.",
    },
    {
      id: "suspended",
      label: "SUSPENDED",
      description: "Billing, support, and export remain available so the school can recover safely.",
    },
  ];

  return {
    state: "ACTIVE",
    tone: "ok",
    accessMode: "full",
    statusLabel: "Subscription setup pending",
    headline: "Subscription details appear after onboarding",
    detail: "Billing status, renewal dates, and payment instructions are loaded from the live tenant subscription record.",
    renewalDueLabel: "Not configured",
    exportAllowedLabel: "Data export always remains available",
    primaryActionLabel: role === "teacher" ? "Open support" : role === "librarian" ? "Open catalog" : "Open finance",
    primaryActionHref: role === "teacher" ? toSchoolPath("support-my-tickets") : role === "librarian" ? toSchoolPath("library") : toSchoolPath("finance"),
    reminders: [],
    stages,
  };
}
