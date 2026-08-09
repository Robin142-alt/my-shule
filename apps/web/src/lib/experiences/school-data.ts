import { LayoutGrid, Settings, Building2, GraduationCap, BookOpenCheck, Users, CalendarDays, FileSpreadsheet, CircleDollarSign, ShieldAlert, MessageSquareText, ClipboardList, Stethoscope, BusFront, Activity, Boxes, Library, FlaskConical } from "lucide-react";

import { buildSchoolErpModel } from "@/lib/dashboard/erp-model";
import { buildDashboardSnapshot } from "@/lib/dashboard/empty-data";
import type { DashboardRole } from "@/lib/dashboard/types";
import { getDefaultSchoolBranding, getSchoolBrandingBySlug } from "@/lib/auth/school-branding";
import type {
  ExperienceMetric,
  ExperienceNavItem,
  ExperienceProfile,
  SchoolExperienceRole, PortalViewer,
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

const schoolNavMap: Record<SchoolExperienceRole | PortalViewer, ExperienceNavItem[]> = {
  "principal": [
    { id: "overview", label: "Overview", href: toSchoolPath("overview"), icon: LayoutGrid },
    { id: "setup-checklist", label: "Setup Checklist", href: toSchoolPath("setup-checklist"), icon: Settings },
    { id: "school-profile", label: "School Profile", href: toSchoolPath("school-profile"), icon: Building2 },
    { id: "academic-setup", label: "Academic Setup", href: toSchoolPath("academic-setup"), icon: GraduationCap },
    { id: "classes-streams", label: "Classes & Streams", href: toSchoolPath("classes-streams"), icon: Building2 },
    { id: "subjects-departments", label: "Subjects & Departments", href: toSchoolPath("subjects-departments"), icon: BookOpenCheck },
    { id: "staff-roles", label: "Staff & Roles", href: toSchoolPath("staff-roles"), icon: Users },
    { id: "students", label: "Students", href: toSchoolPath("students"), icon: Users },
    { id: "attendance-monitoring", label: "Attendance", href: toSchoolPath("attendance-monitoring"), icon: CalendarDays },
    { id: "academics", label: "Academics", href: toSchoolPath("academics"), icon: GraduationCap },
    { id: "exams-report-cards", label: "Exams & Report Cards", href: toSchoolPath("exams-report-cards"), icon: FileSpreadsheet },
    { id: "finance-overview", label: "Finance Overview", href: toSchoolPath("finance-overview"), icon: CircleDollarSign },
    { id: "discipline", label: "Discipline", href: toSchoolPath("discipline"), icon: ShieldAlert },
    { id: "communication", label: "Communication", href: toSchoolPath("communication"), icon: MessageSquareText },
    { id: "approvals", label: "Approvals", href: toSchoolPath("approvals"), icon: ClipboardList },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet },
    { id: "ai-insights", label: "AI Insights", href: toSchoolPath("ai-insights"), icon: Activity },
    { id: "settings", label: "Settings", href: toSchoolPath("settings"), icon: Settings },
    ...supportSidebarItems,
  ],
  "deputy-principal": [
    { id: "overview", label: "Overview", href: toSchoolPath("overview"), icon: LayoutGrid },
    { id: "daily-operations", label: "Daily Operations", href: toSchoolPath("daily-operations"), icon: CalendarDays },
    { id: "attendance-monitoring", label: "Attendance Monitoring", href: toSchoolPath("attendance-monitoring"), icon: LayoutGrid },
    { id: "staff-duty-roster", label: "Staff Duty Roster", href: toSchoolPath("staff-duty-roster"), icon: LayoutGrid },
    { id: "discipline-coordination", label: "Discipline Coordination", href: toSchoolPath("discipline-coordination"), icon: LayoutGrid },
    { id: "student-welfare", label: "Student Welfare", href: toSchoolPath("student-welfare"), icon: LayoutGrid },
    { id: "approvals", label: "Approvals", href: toSchoolPath("approvals"), icon: ClipboardList },
    { id: "cbt", label: "CBT Exams", href: toSchoolPath("cbt"), icon: GraduationCap },
    { id: "lms", label: "LMS", href: toSchoolPath("lms"), icon: BookOpenCheck },
    { id: "communication", label: "Communication", href: toSchoolPath("communication"), icon: MessageSquareText },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet },
    ...supportSidebarItems,
  ],
  "admin": [
    { id: "overview", label: "Overview", href: toSchoolPath("overview"), icon: LayoutGrid },
    { id: "data-setup", label: "Data Setup", href: toSchoolPath("data-setup"), icon: LayoutGrid },
    { id: "students", label: "Students", href: toSchoolPath("students"), icon: Users },
    { id: "parents", label: "Parents", href: toSchoolPath("parents"), icon: LayoutGrid },
    { id: "staff-records", label: "Staff Records", href: toSchoolPath("staff-records"), icon: LayoutGrid },
    { id: "classes-streams", label: "Classes & Streams", href: toSchoolPath("classes-streams"), icon: Building2 },
    { id: "subjects", label: "Subjects", href: toSchoolPath("subjects"), icon: LayoutGrid },
    { id: "imports", label: "Imports", href: toSchoolPath("imports"), icon: LayoutGrid },
    { id: "data-quality", label: "Data Quality", href: toSchoolPath("data-quality"), icon: ShieldAlert },
    { id: "transport", label: "Transport", href: toSchoolPath("transport"), icon: BusFront },
    { id: "hostel", label: "Hostel", href: toSchoolPath("hostel"), icon: Building2 },
    { id: "boarding", label: "Boarding", href: toSchoolPath("boarding"), icon: Building2 },
    { id: "visitors", label: "Visitors", href: toSchoolPath("visitors"), icon: Users },
    { id: "assets", label: "Assets", href: toSchoolPath("assets"), icon: Boxes },
    { id: "procurement", label: "Procurement", href: toSchoolPath("procurement"), icon: Boxes },
    { id: "iot", label: "IoT & Smart Campus", href: toSchoolPath("iot"), icon: Activity },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet },
    { id: "settings", label: "Settings", href: toSchoolPath("settings"), icon: Settings },
    ...supportSidebarItems,
  ],
  "dean-academics": [
    { id: "overview", label: "Overview", href: toSchoolPath("overview"), icon: LayoutGrid },
    { id: "curriculum-coverage", label: "Curriculum Coverage", href: toSchoolPath("curriculum-coverage"), icon: BookOpenCheck },
    { id: "lesson-plans", label: "Lesson Plans", href: toSchoolPath("lesson-plans"), icon: FileSpreadsheet },
    { id: "lesson-logs", label: "Lesson Logs", href: toSchoolPath("lesson-logs"), icon: ClipboardList },
    { id: "teacher-workload", label: "Teacher Workload", href: toSchoolPath("teacher-workload"), icon: Users },
    { id: "department-performance", label: "Department Performance", href: toSchoolPath("department-performance"), icon: GraduationCap },
    { id: "assessments", label: "Assessments", href: toSchoolPath("assessments"), icon: GraduationCap },
    { id: "academic-interventions", label: "Academic Interventions", href: toSchoolPath("academic-interventions"), icon: ShieldAlert },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet },
    ...supportSidebarItems,
  ],
  "exams-manager": [
    { id: "overview", label: "Overview", href: toSchoolPath("overview"), icon: LayoutGrid },
    { id: "exam-setup", label: "Exam Setup", href: toSchoolPath("exam-setup"), icon: Settings },
    { id: "exam-timetable", label: "Exam Timetable", href: toSchoolPath("exam-timetable"), icon: CalendarDays },
    { id: "marks-entry", label: "Marks Entry", href: toSchoolPath("marks-entry"), icon: GraduationCap },
    { id: "moderation", label: "Moderation", href: toSchoolPath("moderation"), icon: ShieldAlert },
    { id: "report-cards", label: "Report Cards", href: toSchoolPath("report-cards"), icon: FileSpreadsheet },
    { id: "publishing", label: "Publishing", href: toSchoolPath("publishing"), icon: LayoutGrid },
    { id: "analysis", label: "Analysis", href: toSchoolPath("analysis"), icon: Activity },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet },
    ...supportSidebarItems,
  ],
  "hod": [
    { id: "overview", label: "Overview", href: toSchoolPath("overview"), icon: LayoutGrid },
    { id: "department-teachers", label: "Department Teachers", href: toSchoolPath("department-teachers"), icon: Users },
    { id: "subject-allocation", label: "Subject Allocation", href: toSchoolPath("subject-allocation"), icon: BookOpenCheck },
    { id: "coverage-review", label: "Coverage Review", href: toSchoolPath("coverage-review"), icon: LayoutGrid },
    { id: "lesson-plans", label: "Lesson Plans", href: toSchoolPath("lesson-plans"), icon: FileSpreadsheet },
    { id: "marks-moderation", label: "Marks Moderation", href: toSchoolPath("marks-moderation"), icon: ShieldAlert },
    { id: "resource-requests", label: "Resource Requests", href: toSchoolPath("resource-requests"), icon: FileSpreadsheet },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet },
    ...supportSidebarItems,
  ],
  "teacher": [
    { id: "overview", label: "Overview", href: toSchoolPath("overview"), icon: LayoutGrid },
    { id: "my-timetable", label: "My Timetable", href: toSchoolPath("my-timetable"), icon: CalendarDays },
    { id: "teacher-attendance", label: "Attendance", href: toSchoolPath("teacher-attendance"), icon: CalendarDays },
    { id: "subjects-classes", label: "Subjects & Classes", href: toSchoolPath("subjects-classes"), icon: BookOpenCheck },
    { id: "lesson-plans", label: "Lesson Plans", href: toSchoolPath("lesson-plans"), icon: FileSpreadsheet },
    { id: "lesson-logs", label: "Lesson Logs", href: toSchoolPath("lesson-logs"), icon: ClipboardList },
    { id: "assignments-homework", label: "Assignments/Homework", href: toSchoolPath("assignments-homework"), icon: FileSpreadsheet },
    { id: "marks-entry", label: "Marks Entry", href: toSchoolPath("marks-entry"), icon: GraduationCap },
    { id: "student-notes", label: "Student Notes", href: toSchoolPath("student-notes"), icon: ClipboardList },
    { id: "resource-requests", label: "Resource Requests", href: toSchoolPath("resource-requests"), icon: FileSpreadsheet },
    { id: "practical-requisitions", label: "Practical Requisitions", href: toSchoolPath("practical-requisitions"), icon: FlaskConical },
    { id: "messages", label: "Messages", href: toSchoolPath("messages"), icon: MessageSquareText },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet },
    ...supportSidebarItems,
  ],
  "class-teacher": [
    { id: "overview", label: "Overview", href: toSchoolPath("overview"), icon: LayoutGrid },
    { id: "my-class", label: "My Class", href: toSchoolPath("my-class"), icon: Users },
    { id: "attendance-follow-up", label: "Attendance Follow-up", href: toSchoolPath("attendance-follow-up"), icon: CalendarDays },
    { id: "learner-profiles", label: "Learner Profiles", href: toSchoolPath("learner-profiles"), icon: Users },
    { id: "parent-contacts", label: "Parent Contacts", href: toSchoolPath("parent-contacts"), icon: MessageSquareText },
    { id: "class-academics", label: "Class Academics", href: toSchoolPath("class-academics"), icon: GraduationCap },
    { id: "report-comments", label: "Report Comments", href: toSchoolPath("report-comments"), icon: MessageSquareText },
    { id: "discipline-follow-up", label: "Discipline Follow-up", href: toSchoolPath("discipline-follow-up"), icon: ShieldAlert },
    { id: "welfare-notes", label: "Welfare Notes", href: toSchoolPath("welfare-notes"), icon: FileSpreadsheet },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet },
    ...supportSidebarItems,
  ],
  "accountant": [
    { id: "overview", label: "Overview", href: toSchoolPath("overview"), icon: LayoutGrid },
    { id: "fee-structures", label: "Fee Structures", href: toSchoolPath("fee-structures"), icon: CircleDollarSign },
    { id: "invoices", label: "Invoices", href: toSchoolPath("invoices"), icon: FileSpreadsheet },
    { id: "payments", label: "Fees / Payments", href: toSchoolPath("payments"), icon: CircleDollarSign },
    { id: "receipts", label: "Receipts", href: toSchoolPath("receipts"), icon: ClipboardList },
    { id: "m-pesa-reconciliation", label: "M-Pesa Reconciliation", href: toSchoolPath("m-pesa-reconciliation"), icon: Activity },
    { id: "arrears", label: "Arrears", href: toSchoolPath("arrears"), icon: ShieldAlert },
    { id: "waivers-discounts", label: "Waivers & Discounts", href: toSchoolPath("waivers-discounts"), icon: CircleDollarSign },
    { id: "expenses", label: "Expenses", href: toSchoolPath("expenses"), icon: FileSpreadsheet },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet },
    { id: "settings", label: "Settings", href: toSchoolPath("settings"), icon: Settings },
    ...supportSidebarItems,
  ],
  "secretary": [
    { id: "overview", label: "Overview", href: toSchoolPath("overview"), icon: LayoutGrid },
    { id: "reception-queue", label: "Reception Queue", href: toSchoolPath("reception-queue"), icon: Users },
    { id: "visitors", label: "Visitors", href: toSchoolPath("visitors"), icon: Users },
    { id: "appointments", label: "Appointments", href: toSchoolPath("appointments"), icon: CalendarDays },
    { id: "calls-log", label: "Calls Log", href: toSchoolPath("calls-log"), icon: ClipboardList },
    { id: "letters-documents", label: "Letters & Documents", href: toSchoolPath("letters-documents"), icon: FileSpreadsheet },
    { id: "parent-messages", label: "Parent Messages", href: toSchoolPath("parent-messages"), icon: MessageSquareText },
    { id: "student-clearance", label: "Student Clearance", href: toSchoolPath("student-clearance"), icon: ShieldAlert },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet },
    ...supportSidebarItems,
  ],
  "admissions": [
    { id: "overview", label: "Overview", href: toSchoolPath("overview"), icon: LayoutGrid },
    { id: "enquiries", label: "Enquiries", href: toSchoolPath("enquiries"), icon: MessageSquareText },
    { id: "applications", label: "Applications", href: toSchoolPath("applications"), icon: Users },
    { id: "applicant-profiles", label: "Applicant Profiles", href: toSchoolPath("applicant-profiles"), icon: Users },
    { id: "documents", label: "Documents", href: toSchoolPath("documents"), icon: FileSpreadsheet },
    { id: "interviews", label: "Interviews", href: toSchoolPath("interviews"), icon: CalendarDays },
    { id: "appointments", label: "Appointments", href: toSchoolPath("appointments"), icon: CalendarDays },
    { id: "selection", label: "Selection & Offers", href: toSchoolPath("selection"), icon: ClipboardList },
    { id: "fee-clearance", label: "Fee Clearance", href: toSchoolPath("fee-clearance"), icon: CircleDollarSign },
    { id: "placement", label: "Class Placement", href: toSchoolPath("placement"), icon: Building2 },
    { id: "enrolment", label: "Enrolment", href: toSchoolPath("enrolment"), icon: Users },
    { id: "parents", label: "Parents", href: toSchoolPath("parents"), icon: Users },
    { id: "transfers", label: "Transfers", href: toSchoolPath("transfers"), icon: ClipboardList },
    { id: "imports", label: "Imports", href: toSchoolPath("imports"), icon: ClipboardList },
    { id: "templates", label: "Templates", href: toSchoolPath("templates"), icon: FileSpreadsheet },
    { id: "tasks", label: "Tasks", href: toSchoolPath("tasks"), icon: ClipboardList },
    { id: "communication", label: "Communication", href: toSchoolPath("communication"), icon: MessageSquareText },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet },
    ...supportSidebarItems,
  ],
  "discipline-master": [
    { id: "overview", label: "Overview", href: toSchoolPath("overview"), icon: LayoutGrid },
    { id: "incident-log", label: "Incident Log", href: toSchoolPath("incident-log"), icon: ClipboardList },
    { id: "cases", label: "Cases", href: toSchoolPath("cases"), icon: ShieldAlert },
    { id: "actions-sanctions", label: "Actions & Sanctions", href: toSchoolPath("actions-sanctions"), icon: ShieldAlert },
    { id: "parent-summons", label: "Parent Summons", href: toSchoolPath("parent-summons"), icon: MessageSquareText },
    { id: "counselling-referrals", label: "Counselling Referrals", href: toSchoolPath("counselling-referrals"), icon: Users },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet },
    ...supportSidebarItems,
  ],
  "guidance-counselling": [
    { id: "overview", label: "Overview", href: toSchoolPath("overview"), icon: LayoutGrid },
    { id: "referrals", label: "Referrals", href: toSchoolPath("referrals"), icon: ClipboardList },
    { id: "sessions", label: "Sessions", href: toSchoolPath("sessions"), icon: CalendarDays },
    { id: "follow-ups", label: "Follow-ups", href: toSchoolPath("follow-ups"), icon: Activity },
    { id: "welfare-notes", label: "Welfare Notes", href: toSchoolPath("welfare-notes"), icon: FileSpreadsheet },
    { id: "parent-engagement", label: "Parent Engagement", href: toSchoolPath("parent-engagement"), icon: MessageSquareText },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet },
    ...supportSidebarItems,
  ],
  "nurse": [
    { id: "overview", label: "Overview", href: toSchoolPath("overview"), icon: LayoutGrid },
    { id: "sick-bay-queue", label: "Sick Bay Queue", href: toSchoolPath("sick-bay-queue"), icon: Users },
    { id: "visits", label: "Visits", href: toSchoolPath("visits"), icon: CalendarDays },
    { id: "medicine-inventory", label: "Medicine Inventory", href: toSchoolPath("medicine-inventory"), icon: Boxes },
    { id: "dispensing-log", label: "Dispensing Log", href: toSchoolPath("dispensing-log"), icon: ClipboardList },
    { id: "parent-notifications", label: "Parent Notifications", href: toSchoolPath("parent-notifications"), icon: MessageSquareText },
    { id: "health-reports", label: "Health Reports", href: toSchoolPath("health-reports"), icon: FileSpreadsheet },
    ...supportSidebarItems,
  ],
  "librarian": [
    { id: "overview", label: "Overview", href: toSchoolPath("overview"), icon: LayoutGrid },
    { id: "books", label: "Books", href: toSchoolPath("books"), icon: Library },
    { id: "issue-book", label: "Issue Book", href: toSchoolPath("issue-book"), icon: ClipboardList },
    { id: "return-book", label: "Return Book", href: toSchoolPath("return-book"), icon: ClipboardList },
    { id: "borrowers", label: "Borrowers", href: toSchoolPath("borrowers"), icon: Users },
    { id: "overdue-books", label: "Overdue Books", href: toSchoolPath("overdue-books"), icon: ShieldAlert },
    { id: "fines-lost-damaged", label: "Fines/Lost/Damaged", href: toSchoolPath("fines-lost-damaged"), icon: CircleDollarSign },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet },
    ...supportSidebarItems,
  ],
  "storekeeper": [
    { id: "overview", label: "Overview", href: toSchoolPath("overview"), icon: LayoutGrid },
    { id: "items", label: "Items", href: toSchoolPath("items"), icon: Boxes },
    { id: "stock-in", label: "Stock In", href: toSchoolPath("stock-in"), icon: ClipboardList },
    { id: "stock-issue", label: "Stock Issue", href: toSchoolPath("stock-issue"), icon: ClipboardList },
    { id: "requests", label: "Requests", href: toSchoolPath("requests"), icon: ClipboardList },
    { id: "low-stock", label: "Low Stock", href: toSchoolPath("low-stock"), icon: ShieldAlert },
    { id: "stocktake", label: "Stocktake", href: toSchoolPath("stocktake"), icon: Activity },
    { id: "damaged-missing", label: "Damaged/Missing", href: toSchoolPath("damaged-missing"), icon: ShieldAlert },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet },
    ...supportSidebarItems,
  ],
  "procurement-officer": [
    { id: "overview", label: "Overview", href: toSchoolPath("overview"), icon: LayoutGrid },
    { id: "purchase-requests", label: "Purchase Requests", href: toSchoolPath("purchase-requests"), icon: ClipboardList },
    { id: "suppliers", label: "Suppliers", href: toSchoolPath("suppliers"), icon: Users },
    { id: "quotations", label: "Quotations", href: toSchoolPath("quotations"), icon: FileSpreadsheet },
    { id: "purchase-orders", label: "Purchase Orders", href: toSchoolPath("purchase-orders"), icon: ClipboardList },
    { id: "deliveries", label: "Deliveries", href: toSchoolPath("deliveries"), icon: BusFront },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet },
    ...supportSidebarItems,
  ],
  "boarding-master": [
    { id: "overview", label: "Overview", href: toSchoolPath("overview"), icon: LayoutGrid },
    { id: "hostels", label: "Hostels", href: toSchoolPath("hostels"), icon: Building2 },
    { id: "rooms-beds", label: "Rooms & Beds", href: toSchoolPath("rooms-beds"), icon: Building2 },
    { id: "allocation", label: "Allocation", href: toSchoolPath("allocation"), icon: ClipboardList },
    { id: "boarding-attendance", label: "Boarding Attendance", href: toSchoolPath("boarding-attendance"), icon: CalendarDays },
    { id: "leave-exit", label: "Leave/Exit", href: toSchoolPath("leave-exit"), icon: ShieldAlert },
    { id: "incidents", label: "Incidents", href: toSchoolPath("incidents"), icon: ShieldAlert },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet },
    ...supportSidebarItems,
  ],
  "security-officer": [
    { id: "overview", label: "Overview", href: toSchoolPath("overview"), icon: LayoutGrid },
    { id: "gate-register", label: "Gate Register", href: toSchoolPath("gate-register"), icon: ClipboardList },
    { id: "visitors", label: "Visitors", href: toSchoolPath("visitors"), icon: Users },
    { id: "student-exit-passes", label: "Student Exit Passes", href: toSchoolPath("student-exit-passes"), icon: ShieldAlert },
    { id: "staff-movement", label: "Staff Movement", href: toSchoolPath("staff-movement"), icon: ClipboardList },
    { id: "incidents", label: "Incidents", href: toSchoolPath("incidents"), icon: ShieldAlert },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet },
    ...supportSidebarItems,
  ],
  "transport-manager": [
    { id: "overview", label: "Overview", href: toSchoolPath("overview"), icon: LayoutGrid },
    { id: "routes", label: "Routes", href: toSchoolPath("routes"), icon: BusFront },
    { id: "vehicles", label: "Vehicles", href: toSchoolPath("vehicles"), icon: BusFront },
    { id: "drivers", label: "Drivers", href: toSchoolPath("drivers"), icon: Users },
    { id: "student-transport-list", label: "Student Transport List", href: toSchoolPath("student-transport-list"), icon: Users },
    { id: "trips", label: "Trips", href: toSchoolPath("trips"), icon: CalendarDays },
    { id: "fuel-maintenance", label: "Fuel & Maintenance", href: toSchoolPath("fuel-maintenance"), icon: Activity },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet },
    ...supportSidebarItems,
  ],
  "laboratory-technician": [
    { id: "overview", label: "Today", href: toSchoolPath("overview"), icon: LayoutGrid },
    { id: "lab-inventory", label: "Stock Book", href: toSchoolPath("lab-inventory"), icon: Boxes },
    { id: "lab-timetable", label: "Practicals", href: toSchoolPath("lab-timetable"), icon: CalendarDays },
    { id: "apparatus-issue", label: "Issue & Return", href: toSchoolPath("apparatus-issue"), icon: ClipboardList },
    { id: "chemicals", label: "Chemicals Register", href: toSchoolPath("chemicals"), icon: FlaskConical },
    { id: "stocktake", label: "Stocktake", href: toSchoolPath("stocktake"), icon: ClipboardList },
    { id: "safety-incidents", label: "Safety & Breakages", href: toSchoolPath("safety-incidents"), icon: ShieldAlert },
    { id: "reports", label: "Registers & Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet },
    ...supportSidebarItems,
  ],
  "ict-manager": [
    { id: "overview", label: "Overview", href: toSchoolPath("overview"), icon: LayoutGrid },
    { id: "assets", label: "Assets", href: toSchoolPath("assets"), icon: Boxes },
    { id: "asset-assignment", label: "Asset Assignment", href: toSchoolPath("asset-assignment"), icon: ClipboardList },
    { id: "maintenance", label: "Maintenance", href: toSchoolPath("maintenance"), icon: Settings },
    { id: "loans-returns", label: "Loans & Returns", href: toSchoolPath("loans-returns"), icon: ClipboardList },
    { id: "facilities-issues", label: "Facilities Issues", href: toSchoolPath("facilities-issues"), icon: ShieldAlert },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet },
    ...supportSidebarItems,
  ],
  "parent": [
    { id: "dashboard", label: "Dashboard", href: toSchoolPath("dashboard"), icon: LayoutGrid },
    { id: "fees", label: "Fees", href: toSchoolPath("fees"), icon: CircleDollarSign },
    { id: "academics", label: "Academics", href: toSchoolPath("academics"), icon: GraduationCap },
    { id: "behavior", label: "Behavior", href: toSchoolPath("behavior"), icon: ShieldAlert },
    { id: "health", label: "Health", href: toSchoolPath("health"), icon: Stethoscope },
    { id: "messages", label: "Messages", href: toSchoolPath("messages"), icon: MessageSquareText },
    { id: "downloads", label: "Downloads", href: toSchoolPath("downloads"), icon: FileSpreadsheet },
    { id: "notifications", label: "Notifications", href: toSchoolPath("notifications"), icon: MessageSquareText },
    ...supportSidebarItems,
  ],
  "student": [
    { id: "dashboard", label: "Dashboard", href: toSchoolPath("dashboard"), icon: LayoutGrid },
    { id: "fees", label: "Fees", href: toSchoolPath("fees"), icon: CircleDollarSign },
    { id: "academics", label: "Academics", href: toSchoolPath("academics"), icon: GraduationCap },
    { id: "behavior", label: "Behavior", href: toSchoolPath("behavior"), icon: ShieldAlert },
    { id: "messages", label: "Messages", href: toSchoolPath("messages"), icon: MessageSquareText },
    { id: "downloads", label: "Downloads", href: toSchoolPath("downloads"), icon: FileSpreadsheet },
    { id: "notifications", label: "Notifications", href: toSchoolPath("notifications"), icon: MessageSquareText },
    ...supportSidebarItems,
  ],
  "grade-master": [],
  "bursar": []
};

schoolNavMap["grade-master"] = schoolNavMap["class-teacher"];
schoolNavMap["bursar"] = schoolNavMap["accountant"];

const examsWorkspaceNavItem: ExperienceNavItem = {
  id: "exams",
  label: "Exams",
  href: toSchoolPath("exams"),
  icon: FileSpreadsheet,
};

for (const role of [
  "principal",
  "deputy-principal",
  "dean-academics",
  "exams-manager",
  "hod",
  "teacher",
  "class-teacher",
  "grade-master",
] as const) {
  if (!schoolNavMap[role].some((item) => item.id === "exams")) {
    schoolNavMap[role] = [...schoolNavMap[role], examsWorkspaceNavItem];
  }
}

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
  "procurement-officer": "storekeeper",
};

export const schoolSectionLabels: Record<string, string> = {
  "overview": "Overview",
  "setup-checklist": "Setup Checklist",
  "school-profile": "School Profile",
  "academic-setup": "Academic Setup",
  "classes-streams": "Classes & Streams",
  "subjects-departments": "Subjects & Departments",
  "staff-roles": "Staff & Roles",
  "students": "Students",
  "attendance": "Attendance",
  "academics": "Academics",
  "exams-report-cards": "Exams & Report Cards",
  "finance-overview": "Finance Overview",
  "discipline": "Discipline",
  "communication": "Communication",
  "approvals": "Approvals",
  "reports": "Reports",
  "settings": "Settings",
  "daily-operations": "Daily Operations",
  "attendance-monitoring": "Attendance Monitoring",
  "staff-duty-roster": "Staff Duty Roster",
  "discipline-coordination": "Discipline Coordination",
  "student-welfare": "Student Welfare",
  "data-setup": "Data Setup",
  "parents": "Parents",
  "staff-records": "Staff Records",
  "subjects": "Subjects",
  "imports": "Imports",
  "data-quality": "Data Quality",
  "curriculum-coverage": "Curriculum Coverage",
  "lesson-plans": "Lesson Plans",
  "lesson-logs": "Lesson Logs",
  "teacher-workload": "Teacher Workload",
  "department-performance": "Department Performance",
  "assessments": "Assessments",
  "academic-interventions": "Academic Interventions",
  "exam-setup": "Exam Setup",
  "exam-timetable": "Exam Timetable",
  "marks-entry": "Marks Entry",
  "moderation": "Moderation",
  "report-cards": "Report Cards",
  "publishing": "Publishing",
  "analysis": "Analysis",
  "department-teachers": "Department Teachers",
  "subject-allocation": "Subject Allocation",
  "coverage-review": "Coverage Review",
  "marks-moderation": "Marks Moderation",
  "resource-requests": "Resource Requests",
  "practical-requisitions": "Practical Requisitions",
  "my-timetable": "My Timetable",
  "subjects-classes": "Subjects & Classes",
  "assignments-homework": "Assignments/Homework",
  "student-notes": "Student Notes",
  "messages": "Messages",
  "my-class": "My Class",
  "attendance-follow-up": "Attendance Follow-up",
  "learner-profiles": "Learner Profiles",
  "parent-contacts": "Parent Contacts",
  "class-academics": "Class Academics",
  "report-comments": "Report Comments",
  "discipline-follow-up": "Discipline Follow-up",
  "welfare-notes": "Welfare Notes",
  "fee-structures": "Fee Structures",
  "invoices": "Invoices",
  "payments": "Payments",
  "receipts": "Receipts",
  "m-pesa-reconciliation": "M-Pesa Reconciliation",
  "arrears": "Arrears",
  "waivers-discounts": "Waivers & Discounts",
  "expenses": "Expenses",
  "reception-queue": "Reception Queue",
  "visitors": "Visitors",
  "appointments": "Appointments",
  "calls-log": "Calls Log",
  "letters-documents": "Letters & Documents",
  "parent-messages": "Parent Messages",
  "student-clearance": "Student Clearance",
  "applications": "Applications",
  "interviews": "Interviews",
  "admissions": "Admissions",
  "class-placement": "Class Placement",
  "documents": "Documents",
  "enquiries": "Enquiries",
  "applicant-profiles": "Applicant Profiles",
  "selection": "Selection & Offers",
  "fee-clearance": "Fee Clearance",
  "placement": "Class Placement",
  "enrolment": "Enrolment",
  "transfers": "Transfers",
  "templates": "Templates",
  "tasks": "Tasks",
  "parent-linking": "Parent Linking",
  "incident-log": "Incident Log",
  "cases": "Cases",
  "actions-sanctions": "Actions & Sanctions",
  "parent-summons": "Parent Summons",
  "counselling-referrals": "Counselling Referrals",
  "referrals": "Referrals",
  "sessions": "Sessions",
  "follow-ups": "Follow-ups",
  "parent-engagement": "Parent Engagement",
  "sick-bay-queue": "Sick Bay Queue",
  "visits": "Visits",
  "medicine-inventory": "Medicine Inventory",
  "dispensing-log": "Dispensing Log",
  "parent-notifications": "Parent Notifications",
  "health-reports": "Health Reports",
  "books": "Books",
  "issue-book": "Issue Book",
  "return-book": "Return Book",
  "borrowers": "Borrowers",
  "overdue-books": "Overdue Books",
  "fines-lost-damaged": "Fines/Lost/Damaged",
  "items": "Items",
  "stock-in": "Stock In",
  "stock-issue": "Stock Issue",
  "requests": "Requests",
  "low-stock": "Low Stock",
  "stocktake": "Stocktake",
  "damaged-missing": "Damaged/Missing",
  "purchase-requests": "Purchase Requests",
  "suppliers": "Suppliers",
  "quotations": "Quotations",
  "purchase-orders": "Purchase Orders",
  "deliveries": "Deliveries",
  "hostels": "Hostels",
  "rooms-beds": "Rooms & Beds",
  "allocation": "Allocation",
  "boarding-attendance": "Boarding Attendance",
  "leave-exit": "Leave/Exit",
  "incidents": "Incidents",
  "gate-register": "Gate Register",
  "student-exit-passes": "Student Exit Passes",
  "staff-movement": "Staff Movement",
  "routes": "Routes",
  "vehicles": "Vehicles",
  "drivers": "Drivers",
  "student-transport-list": "Student Transport List",
  "trips": "Trips",
  "fuel-maintenance": "Fuel & Maintenance",
  "lab-inventory": "Stock Book",
  "apparatus-issue": "Issue & Return",
  "chemicals": "Chemicals Register",
  "lab-timetable": "Practicals",
  "safety-incidents": "Safety & Breakages",
  "assets": "Assets",
  "asset-assignment": "Asset Assignment",
  "maintenance": "Maintenance",
  "loans-returns": "Loans & Returns",
  "facilities-issues": "Facilities Issues",
  "dashboard": "Dashboard",
  "fees": "Fees",
  "behavior": "Behavior",
  "health": "Health",
  "downloads": "Downloads",
  "notifications": "Notifications",
  "principal-overview": "Overview",
  "support-new-ticket": "New Ticket",
  "support-my-tickets": "My Tickets",
  "support-knowledge-base": "Knowledge Base",
  "support-system-status": "System Status",
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
      name: "Bursar Achieng",
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
    "procurement-officer": {
      name: "Procurement Officer",
      roleLabel: "Procurement officer",
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
import { toSchoolStudentPath } from "@/lib/routing/experience-routes";

export function buildSchoolStudentHref(
  role: SchoolExperienceRole,
  studentId: string,
  routeMode: "hosted" | "nested" | "public",
) {
  if (routeMode === "public") {
    return `/school/${role}/students/${studentId}`;
  }
  return toSchoolStudentPath(studentId);
}
