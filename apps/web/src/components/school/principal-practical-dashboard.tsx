"use client";

import {
  AlertTriangle,
  BedDouble,
  BriefcaseBusiness,
  Bus,
  ClipboardCheck,
  FileText,
  GraduationCap,
  HeartPulse,
  History,
  Library,
  Menu,
  PackageCheck,
  Search,
  ShieldAlert,
  Users,
  UserCheck,
  UserPlus,
  WalletCards,
} from "lucide-react";
import { useEffect, useMemo, useState, type ComponentType } from "react";

import { DashboardGreeting } from "@/components/common/dashboard-greeting";
import { UserManagementWorkspace } from "@/components/school/user-management-workspace";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { getSchoolRoleGreetingName } from "@/lib/greetings/time-aware-greeting";
import {
  getCurrentSchoolId,
  publishSchoolOperationalEvent,
  readSchoolData,
  subscribeToSchoolDataUpdates,
  type SchoolOperationalEvent,
} from "@/lib/school/school-operational-store";
import { dispatchOperationalWorkflowAction } from "@/lib/workflows/operational-workflow-client";

type PrincipalSectionId =
  | "overview"
  | "attendance"
  | "fees"
  | "discipline"
  | "academics"
  | "staff"
  | "parents-visitors"
  | "sick-bay"
  | "boarding"
  | "transport"
  | "library"
  | "store-assets"
  | "admissions"
  | "user-management"
  | "reports"
  | "approvals"
  | "audit-logs"
  | "system-health";

type PracticalAction = {
  label: string;
  target?: PrincipalSectionId;
  tone?: "primary" | "warning" | "danger";
};

type PrincipalMetric = {
  label: string;
  value: string;
  helper: string;
};

type PrincipalSection = {
  id: PrincipalSectionId;
  label: string;
  icon: ComponentType<{ className?: string }>;
  source: string;
  status: "ok" | "warning" | "critical";
  summary: string;
  emptyState?: string;
  metrics: PrincipalMetric[];
  actions: PracticalAction[];
  records: Array<{
    item: string;
    owner: string;
    nextAction: string;
    status: string;
  }>;
};

type ActionLogItem = {
  id: string;
  label: string;
  section: string;
  status: "Sent" | "Will retry" | "Completed";
  detail: string;
};

type PrincipalSearchResult = {
  id: string;
  section: PrincipalSection;
  title: string;
  detail: string;
  actionLabel: string;
};

type PrincipalFeePaymentRecord = {
  id: string;
  student: string;
  admissionNo: string;
  amount: number;
  method: string;
  voteHead: string;
  term: string;
  reference: string;
  receiptNo: string;
  parentSmsSent: boolean;
  status: string;
};

type PrincipalFeeBalanceRecord = {
  id: string;
  student: string;
  admissionNo: string;
  className: string;
  balance: number;
  parentPhone: string;
  lastPayment: number;
  lastMethod: string;
  status: string;
};

const schoolName = "Kisumu Boys High School";

const principalSections: PrincipalSection[] = [
  {
    id: "attendance",
    label: "Attendance",
    icon: UserCheck,
    source: "Teacher and Class Teacher dashboards",
    status: "warning",
    summary: "18 students absent, 12 late, and 7 class registers still missing.",
    metrics: [
      { label: "Students present", value: "1,184", helper: "92% of expected learners" },
      { label: "Students absent", value: "18", helper: "Parents need SMS follow-up" },
      { label: "Late students", value: "12", helper: "Mainly Form 2 North and Form 3 East" },
      { label: "Missing registers", value: "7", helper: "Teachers have not submitted yet" },
    ],
    actions: [
      { label: "View Attendance", target: "attendance" },
      { label: "Send Absence SMS", tone: "warning" },
      { label: "Print Attendance Report" },
    ],
    records: [
      { item: "Form 2 North register missing", owner: "Class Teacher", nextAction: "Call teacher and submit register", status: "Due now" },
      { item: "18 absentees need parent SMS", owner: "Deputy Office", nextAction: "Send absence SMS", status: "Pending" },
      { item: "Late arrivals at lower gate", owner: "Security Desk", nextAction: "Attach gate log", status: "In progress" },
    ],
  },
  {
    id: "fees",
    label: "Fees",
    icon: WalletCards,
    source: "Accountant dashboard and M-Pesa confirmations",
    status: "warning",
    summary: "KSh 248,500 collected today with one failed M-Pesa confirmation.",
    metrics: [
      { label: "Collected today", value: "KSh 248,500", helper: "Cash, bank, and M-Pesa combined" },
      { label: "Balances above KSh 10,000", value: "42", helper: "Defaulter list ready" },
      { label: "Pending balances", value: "KSh 1.84M", helper: "Term 2 outstanding" },
      { label: "M-Pesa pending", value: "1", helper: "Confirmation needs retry" },
    ],
    actions: [
      { label: "View Collections", target: "fees" },
      { label: "Print Defaulters List" },
      { label: "Send Fee Reminders", tone: "warning" },
      { label: "Retry M-Pesa Confirmation", tone: "warning" },
    ],
    records: [
      { item: "QEX7ABC123 matched to Brian Otieno", owner: "Accountant", nextAction: "Print receipt", status: "Ready" },
      { item: "1 failed M-Pesa callback", owner: "Finance Office", nextAction: "Retry M-Pesa confirmation", status: "Needs action" },
      { item: "42 high balance learners", owner: "Bursar", nextAction: "Send fee reminders", status: "Due today" },
    ],
  },
  {
    id: "discipline",
    label: "Discipline",
    icon: ShieldAlert,
    source: "Teacher, Discipline Master, Deputy, and Counsellor dashboards",
    status: "warning",
    summary: "4 discipline cases await review, including one serious boarding incident.",
    emptyState: "No urgent discipline cases today",
    metrics: [
      { label: "New cases", value: "4", helper: "Created since morning" },
      { label: "Serious cases", value: "1", helper: "Needs deputy escalation" },
      { label: "Counsellor referrals", value: "2", helper: "Student welfare follow-up" },
      { label: "Repeat offenders", value: "3", helper: "Parent meetings suggested" },
    ],
    actions: [
      { label: "Review Cases", target: "discipline" },
      { label: "Escalate to Deputy", tone: "warning" },
      { label: "Notify Parent" },
    ],
    records: [
      { item: "Dormitory bullying report", owner: "Discipline Master", nextAction: "Escalate to deputy", status: "High" },
      { item: "Repeat lateness case", owner: "Class Teacher", nextAction: "Notify parent", status: "Pending" },
      { item: "Counsellor referral requested", owner: "Counsellor", nextAction: "Book session", status: "Today" },
    ],
  },
  {
    id: "parents-visitors",
    label: "Parents & Visitors",
    icon: Users,
    source: "Secretary and Security dashboards",
    status: "warning",
    summary: "6 visitors are inside school, 2 parents are waiting, and one pass is overstayed.",
    emptyState: "No visitors currently waiting",
    metrics: [
      { label: "Visitors inside", value: "6", helper: "Currently signed in" },
      { label: "Parents waiting", value: "2", helper: "At front office" },
      { label: "Overstayed visitors", value: "1", helper: "Security needs follow-up" },
      { label: "Blocked alerts", value: "0", helper: "No blocklisted visitor alerts" },
    ],
    actions: [
      { label: "View Visitors", target: "parents-visitors" },
      { label: "Print Visitor Log" },
      { label: "Alert Security", tone: "warning" },
    ],
    records: [
      { item: "Parent waiting for discipline follow-up", owner: "Secretary", nextAction: "Book deputy meeting", status: "Waiting" },
      { item: "Visitor badge KBH-071 overstayed", owner: "Security Desk", nextAction: "Confirm exit", status: "Needs action" },
      { item: "Report card collection request", owner: "Front Office", nextAction: "Print collection slip", status: "Ready" },
    ],
  },
  {
    id: "sick-bay",
    label: "Sick Bay",
    icon: HeartPulse,
    source: "Nurse dashboard and medicine stock records",
    status: "warning",
    summary: "3 sick bay cases recorded today and 2 medicine stock alerts need attention.",
    emptyState: "No medicine stock alerts",
    metrics: [
      { label: "Students treated", value: "3", helper: "Today" },
      { label: "Referred cases", value: "1", helper: "Hospital referral slip ready" },
      { label: "Low-stock medicines", value: "2", helper: "ORS and inhalers" },
      { label: "Parent SMS sent", value: "3", helper: "Guardian notifications" },
    ],
    actions: [
      { label: "View Sick Bay", target: "sick-bay" },
      { label: "View Medicine Stock" },
      { label: "Print Medical Slip" },
    ],
    records: [
      { item: "Brian Otieno fever case", owner: "Nurse", nextAction: "Monitor temperature", status: "Open" },
      { item: "Inhaler stock low", owner: "Nurse", nextAction: "Request reorder", status: "Low stock" },
      { item: "Football injury referral", owner: "Nurse", nextAction: "Notify parent", status: "Referred" },
    ],
  },
  {
    id: "boarding",
    label: "Boarding",
    icon: BedDouble,
    source: "Boarding Master dashboard",
    status: "warning",
    summary: "Morning roll call is complete, evening roll call pending, and 2 exeats need approval.",
    metrics: [
      { label: "Morning roll call", value: "Complete", helper: "All dorms submitted" },
      { label: "Evening roll call", value: "Pending", helper: "Starts at 6:45 PM" },
      { label: "Missing boarders", value: "0", helper: "No missing boarder currently" },
      { label: "Exeat requests", value: "2", helper: "Awaiting principal/deputy action" },
    ],
    actions: [
      { label: "View Boarding", target: "boarding" },
      { label: "Approve Exeat" },
      { label: "Alert Boarding Master", tone: "warning" },
    ],
    records: [
      { item: "Two exeat requests pending", owner: "Boarding Master", nextAction: "Approve or return", status: "Pending" },
      { item: "Dorm B supplies request", owner: "Storekeeper", nextAction: "Approve stock issue", status: "Today" },
      { item: "Evening roll call reminder", owner: "Boarding Master", nextAction: "Send reminder", status: "Scheduled" },
    ],
  },
  {
    id: "academics",
    label: "Academics",
    icon: GraduationCap,
    source: "Dean, HOD, Exams Manager, and Teacher dashboards",
    status: "warning",
    summary: "Lessons are mostly covered, but 9 marks are missing before report card processing.",
    metrics: [
      { label: "Lessons covered today", value: "86%", helper: "Across active classes" },
      { label: "Missing marks", value: "9", helper: "Before report card deadline" },
      { label: "Upcoming exams", value: "3", helper: "This week" },
      { label: "Report card progress", value: "74%", helper: "Draft generation stage" },
    ],
    actions: [
      { label: "View Academics", target: "academics" },
      { label: "View Exam Progress" },
      { label: "Notify HODs" },
    ],
    records: [
      { item: "Form 3 Mathematics marks missing", owner: "Exams Manager", nextAction: "Notify HOD", status: "Due today" },
      { item: "Grade 7 English lesson coverage low", owner: "HOD Languages", nextAction: "Request update", status: "Warning" },
      { item: "Report card batch at 74%", owner: "Dean of Academics", nextAction: "Review progress", status: "In progress" },
    ],
  },
  {
    id: "staff",
    label: "Staff",
    icon: BriefcaseBusiness,
    source: "Deputy Principal and HR/staff dashboards",
    status: "ok",
    summary: "54 teachers present, 3 absent, and 2 leave requests need approval.",
    metrics: [
      { label: "Teachers present", value: "54", helper: "Checked in today" },
      { label: "Teachers absent", value: "3", helper: "Cover required" },
      { label: "Leave requests", value: "2", helper: "Awaiting decision" },
      { label: "Duty issues", value: "1", helper: "Replacement needed" },
    ],
    actions: [
      { label: "View Staff", target: "staff" },
      { label: "Approve Leave" },
      { label: "Assign Duty Cover" },
    ],
    records: [
      { item: "Science teacher absent", owner: "Deputy Principal", nextAction: "Assign cover", status: "Open" },
      { item: "Two leave requests", owner: "HR Desk", nextAction: "Approve leave", status: "Pending" },
      { item: "Lunch duty replacement", owner: "Deputy Office", nextAction: "Assign staff member", status: "Today" },
    ],
  },
  {
    id: "transport",
    label: "Transport",
    icon: Bus,
    source: "Transport Manager dashboard and route attendance",
    status: "warning",
    summary: "Routes completed this morning, but one bus is marked for maintenance.",
    metrics: [
      { label: "Routes completed", value: "12/12", helper: "Morning trips closed" },
      { label: "Pickup/drop issues", value: "0", helper: "No stranded learner reported" },
      { label: "Vehicle issues", value: "1", helper: "Bus KDK 214F" },
      { label: "Fuel alerts", value: "1", helper: "Above weekly threshold" },
    ],
    actions: [
      { label: "View Transport", target: "transport" },
      { label: "Alert Transport Manager", tone: "warning" },
      { label: "Print Route List" },
    ],
    records: [
      { item: "Bus KDK 214F maintenance", owner: "Transport Manager", nextAction: "Schedule service", status: "Warning" },
      { item: "Fuel usage above weekly norm", owner: "Transport Office", nextAction: "Review fuel log", status: "Review" },
      { item: "Route 4 parent alert delivered", owner: "Driver", nextAction: "Close trip", status: "Complete" },
    ],
  },
  {
    id: "library",
    label: "Library",
    icon: Library,
    source: "Librarian dashboard",
    status: "ok",
    summary: "Book issue/return activity is normal with 5 overdue books needing reminders.",
    metrics: [
      { label: "Books issued today", value: "31", helper: "Scanner and manual issue" },
      { label: "Books returned", value: "24", helper: "Return slips ready" },
      { label: "Overdue books", value: "5", helper: "SMS reminder queue" },
      { label: "Lost/damaged", value: "1", helper: "Fine review needed" },
    ],
    actions: [
      { label: "View Library", target: "library" },
      { label: "Send Overdue SMS" },
      { label: "Print Library Report" },
    ],
    records: [
      { item: "Biology textbook overdue", owner: "Librarian", nextAction: "Send overdue SMS", status: "Due" },
      { item: "Lost book fine review", owner: "Librarian", nextAction: "Apply fine", status: "Pending" },
      { item: "Barcode label print queue", owner: "Librarian", nextAction: "Print labels", status: "Ready" },
    ],
  },
  {
    id: "store-assets",
    label: "Store & Assets",
    icon: PackageCheck,
    source: "Storekeeper and ICT dashboards",
    status: "warning",
    summary: "Three low-stock items and one projector movement request need approval.",
    metrics: [
      { label: "Low-stock items", value: "3", helper: "Chalk, gloves, printer paper" },
      { label: "Purchase requests", value: "2", helper: "Awaiting approval" },
      { label: "Asset movement", value: "1", helper: "Projector to science block" },
      { label: "Damaged assets", value: "1", helper: "ICT repair ticket open" },
    ],
    actions: [
      { label: "View Store", target: "store-assets" },
      { label: "Approve Purchase" },
      { label: "View Asset Movement" },
    ],
    records: [
      { item: "Gloves below reorder level", owner: "Storekeeper", nextAction: "Approve purchase", status: "Low stock" },
      { item: "Projector movement request", owner: "ICT Desk", nextAction: "Approve movement", status: "Pending" },
      { item: "Printer toner request", owner: "Secretary", nextAction: "Issue stock", status: "Today" },
    ],
  },
  {
    id: "admissions",
    label: "Admissions",
    icon: UserPlus,
    source: "Admissions and Secretary dashboards",
    status: "ok",
    summary: "5 active inquiries, 2 applications awaiting documents, and one admission letter ready.",
    metrics: [
      { label: "Active inquiries", value: "5", helper: "This week" },
      { label: "Document gaps", value: "2", helper: "Birth certificate or report form" },
      { label: "Interviews due", value: "3", helper: "Scheduled this week" },
      { label: "Letters ready", value: "1", helper: "Print and SMS parent" },
    ],
    actions: [
      { label: "View Admissions", target: "admissions" },
      { label: "Print Admission Letter" },
      { label: "SMS Parent Onboarding" },
    ],
    records: [
      { item: "Application document gap", owner: "Admissions Officer", nextAction: "Contact guardian", status: "Open" },
      { item: "Admission interview schedule", owner: "Secretary", nextAction: "Confirm meeting", status: "Today" },
      { item: "Admission letter ready", owner: "Admissions Office", nextAction: "Print letter", status: "Ready" },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: FileText,
    source: "All school departments",
    status: "ok",
    summary: "Board report, attendance summary, and fee collection report are ready to generate.",
    metrics: [
      { label: "Board report", value: "Ready", helper: "Uses today's live school data" },
      { label: "Attendance report", value: "Ready", helper: "Includes missing registers" },
      { label: "Fee report", value: "Ready", helper: "Includes M-Pesa status" },
      { label: "Discipline report", value: "Draft", helper: "Needs final review" },
    ],
    actions: [
      { label: "Generate Board Report" },
      { label: "Print Attendance Summary" },
      { label: "Export Fee Report" },
    ],
    records: [
      { item: "Daily leadership brief", owner: "Principal Office", nextAction: "Generate report", status: "Ready" },
      { item: "Fee collection report", owner: "Accountant", nextAction: "Export report", status: "Ready" },
      { item: "Discipline summary", owner: "Deputy Principal", nextAction: "Review cases", status: "Draft" },
    ],
  },
  {
    id: "approvals",
    label: "Approvals",
    icon: ClipboardCheck,
    source: "Finance, Store, Boarding, Discipline, and ICT dashboards",
    status: "critical",
    summary: "7 approvals need action before close of day.",
    metrics: [
      { label: "Fee reversals", value: "1", helper: "Needs reason and approval" },
      { label: "Stock purchases", value: "2", helper: "Low-stock requests" },
      { label: "Exeat approvals", value: "2", helper: "Boarding requests" },
      { label: "Asset movement", value: "1", helper: "Projector transfer" },
    ],
    actions: [
      { label: "Open Approval Queue", target: "approvals", tone: "warning" },
      { label: "Approve Selected" },
      { label: "Return for Correction" },
    ],
    records: [
      { item: "Fee reversal approval", owner: "Accountant", nextAction: "Approve or reject", status: "High" },
      { item: "Stock purchase approval", owner: "Storekeeper", nextAction: "Approve purchase", status: "Pending" },
      { item: "Exeat approval", owner: "Boarding Master", nextAction: "Approve exeat", status: "Due now" },
    ],
  },
  {
    id: "audit-logs",
    label: "Audit Logs",
    icon: History,
    source: "School accountability records",
    status: "ok",
    summary: "Recent school actions are visible for accountability.",
    metrics: [
      { label: "Actions today", value: "84", helper: "Across school offices" },
      { label: "Sensitive actions", value: "6", helper: "Approvals and reversals" },
      { label: "Print jobs", value: "22", helper: "Receipts, letters, reports" },
      { label: "SMS actions", value: "41", helper: "Parent communication" },
    ],
    actions: [
      { label: "View Accountability Records", target: "audit-logs" },
      { label: "Print Accountability Records" },
      { label: "Assign to Staff Member" },
    ],
    records: [
      { item: "Fee reminder SMS sent", owner: "Accountant", nextAction: "View record", status: "Done" },
      { item: "Visitor slip printed", owner: "Security Desk", nextAction: "View slip", status: "Done" },
      { item: "Exeat request opened", owner: "Boarding Master", nextAction: "Approve or return", status: "Open" },
    ],
  },
  {
    id: "system-health",
    label: "System Health",
    icon: AlertTriangle,
    source: "System monitor dashboard",
    status: "warning",
    summary: "One M-Pesa confirmation failed and one SMS batch needs retry.",
    metrics: [
      { label: "System alerts", value: "2", helper: "Needs office follow-up" },
      { label: "Failed SMS", value: "1", helper: "Retry sending SMS" },
      { label: "M-Pesa issue", value: "1", helper: "Retry confirmation" },
      { label: "Backups", value: "OK", helper: "Last backup completed" },
    ],
    actions: [
      { label: "Retry Failed SMS", tone: "warning" },
      { label: "Retry M-Pesa Callback", tone: "warning" },
      { label: "Notify System Admin", tone: "danger" },
      { label: "Mark Issue Solved" },
    ],
    records: [
      { item: "Failed SMS batch", owner: "System Monitor", nextAction: "Retry failed SMS", status: "Warning" },
      { item: "M-Pesa callback failed", owner: "Finance Office", nextAction: "Retry M-Pesa callback", status: "Warning" },
      { item: "Backup completed", owner: "System Monitor", nextAction: "No action needed", status: "OK" },
    ],
  },
  {
    id: "user-management",
    label: "Users & Invitations",
    icon: UserPlus,
    source: "School user records, pending invitations, roles, and access logs",
    status: "warning",
    summary: "86 active school users, 2 pending invitations, and 1 suspended account need review.",
    emptyState: "No pending user invitations",
    metrics: [
      { label: "Active users", value: "86", helper: "Current school only" },
      { label: "Pending invitations", value: "2", helper: "Expire automatically" },
      { label: "Suspended users", value: "1", helper: "Access blocked" },
      { label: "Roles with invite access", value: "2", helper: "Principal and Deputy Principal" },
    ],
    actions: [
      { label: "Manage Users", target: "user-management" },
      { label: "Invite New User", target: "user-management" },
      { label: "Review Pending Invitations", target: "user-management", tone: "warning" },
    ],
    records: [
      { item: "Faith Akinyi invitation pending", owner: "Principal Office", nextAction: "Resend or copy invite", status: "Pending" },
      { item: "Grace Njeri access review", owner: "Principal Office", nextAction: "Reactivate or keep suspended", status: "Suspended" },
      { item: "Deputy user management permission", owner: "Principal Office", nextAction: "Review permission summary", status: "Enabled" },
    ],
  },
];

const sidebarItems: Array<{ id: PrincipalSectionId; label: string; badge?: string }> = [
  { id: "overview", label: "Overview" },
  { id: "attendance", label: "Attendance", badge: "7" },
  { id: "fees", label: "Fees", badge: "1" },
  { id: "discipline", label: "Discipline", badge: "4" },
  { id: "academics", label: "Academics", badge: "9" },
  { id: "staff", label: "Staff" },
  { id: "parents-visitors", label: "Parents & Visitors", badge: "2" },
  { id: "sick-bay", label: "Sick Bay", badge: "2" },
  { id: "boarding", label: "Boarding", badge: "2" },
  { id: "transport", label: "Transport", badge: "1" },
  { id: "library", label: "Library" },
  { id: "store-assets", label: "Store & Assets", badge: "3" },
  { id: "admissions", label: "Admissions" },
  { id: "user-management", label: "Users & Invitations", badge: "2" },
  { id: "reports", label: "Reports" },
  { id: "approvals", label: "Approvals", badge: "7" },
  { id: "audit-logs", label: "Audit Logs" },
  { id: "system-health", label: "System Health", badge: "2" },
];

const summaryCards = [
  { label: "Students Present Today", value: "1,184", helper: "18 absent, 12 late", source: "Attendance" },
  { label: "Fees Collected Today", value: "KSh 248,500", helper: "1 M-Pesa confirmation failed", source: "Fees" },
  { label: "Visitors Inside", value: "6", helper: "2 parents waiting", source: "Parents & Visitors" },
  { label: "Sick Bay Cases", value: "3", helper: "1 referral, 2 stock alerts", source: "Sick Bay" },
  { label: "Pending Approvals", value: "7", helper: "Finance, boarding, store, discipline", source: "Approvals" },
  { label: "System Alerts", value: "2", helper: "SMS and M-Pesa retry needed", source: "System Health" },
];

const overviewSectionIds: PrincipalSectionId[] = [
  "attendance",
  "fees",
  "discipline",
  "parents-visitors",
  "sick-bay",
  "boarding",
  "academics",
  "staff",
  "user-management",
  "transport",
  "approvals",
];

function formatKsh(amount: number) {
  return `KSh ${amount.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

function buildPrincipalSectionsForSchool(schoolId: string) {
  const payments = readSchoolData<PrincipalFeePaymentRecord>("finance-payments", schoolId);
  const balances = readSchoolData<PrincipalFeeBalanceRecord>("fee-balances", schoolId);

  if (!payments.length && !balances.length) {
    return principalSections;
  }

  const collectedToday = payments.reduce((total, payment) => total + Number(payment.amount || 0), 0);
  const pendingMpesa = payments.filter((payment) => /pending/i.test(payment.status) || /m-pesa/i.test(payment.method)).length;
  const highBalanceCount = balances.filter((balance) => Number(balance.balance || 0) > 10000).length;
  const outstandingTotal = balances.reduce((total, balance) => total + Number(balance.balance || 0), 0);
  const paymentRows = payments.slice(0, 5).map((payment) => {
    const balance = balances.find((item) => item.student === payment.student || item.admissionNo === payment.admissionNo);
    const currentBalance = Number(balance?.balance ?? 0);

    return {
      item: `${payment.student} payment ${payment.receiptNo}`,
      owner: "Accountant",
      nextAction: `Current balance ${formatKsh(currentBalance)}`,
      status: payment.status || "Recorded",
    };
  });

  return principalSections.map((section) => {
    if (section.id !== "fees") {
      return section;
    }

    return {
      ...section,
      status: pendingMpesa > 0 || highBalanceCount > 0 ? "warning" : "ok",
      summary: `${formatKsh(collectedToday)} collected today from accountant payment records.`,
      metrics: [
        { label: "Collected today", value: formatKsh(collectedToday), helper: "From accountant payment records" },
        { label: "Balances above KSh 10,000", value: String(highBalanceCount), helper: "Defaulter list ready" },
        { label: "Pending balances", value: formatKsh(outstandingTotal), helper: "Current fee balance records" },
        { label: "M-Pesa pending", value: String(pendingMpesa), helper: "Confirmations needing finance follow-up" },
      ],
      records: paymentRows.length ? [...paymentRows, ...section.records].slice(0, 8) : section.records,
    } satisfies PrincipalSection;
  });
}

function buildSummaryCardsForSections(sections: PrincipalSection[]) {
  const fees = sectionById("fees", sections);

  return summaryCards.map((card) => {
    if (card.source !== "Fees") {
      return card;
    }

    return {
      ...card,
      value: fees.metrics[0]?.value ?? card.value,
      helper: fees.metrics[3]?.value
        ? `${fees.metrics[3].value} M-Pesa confirmation${fees.metrics[3].value === "1" ? "" : "s"} pending`
        : card.helper,
    };
  });
}

function principalSearchResults(query: string, sections = principalSections) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return [];
  }

  return sections.flatMap((section) => {
    const results: PrincipalSearchResult[] = [];
    const sectionHaystack = [
      section.label,
      section.summary,
      section.source,
      ...section.metrics.flatMap((metric) => [metric.label, metric.value, metric.helper]),
      ...section.actions.map((action) => action.label),
    ].join(" ").toLowerCase();

    if (sectionHaystack.includes(normalized)) {
      results.push({
        id: `${section.id}-section`,
        section,
        title: section.label,
        detail: section.summary,
        actionLabel: section.actions[0]?.label ?? `Open ${section.label}`,
      });
    }

    section.records.forEach((record, index) => {
      const recordHaystack = [
        record.item,
        record.owner,
        record.nextAction,
        record.status,
        section.label,
      ].join(" ").toLowerCase();

      if (recordHaystack.includes(normalized)) {
        results.push({
          id: `${section.id}-record-${index}`,
          section,
          title: record.item,
          detail: `${record.owner} - ${record.nextAction}`,
          actionLabel: record.nextAction,
        });
      }
    });

    return results;
  }).slice(0, 12);
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function sectionLabelForModule(moduleName: string) {
  const normalized = moduleName.toLowerCase();

  if (/finance|fee|receipt|mpesa/.test(normalized)) return "Fees";
  if (/visitor|front-office/.test(normalized)) return "Parents & Visitors";
  if (/clinic|medicine|sick/.test(normalized)) return "Sick Bay";
  if (/library|book/.test(normalized)) return "Library";
  if (/attendance|roll-call/.test(normalized)) return "Attendance";
  if (/boarding|hostel|exeat/.test(normalized)) return "Boarding";
  if (/transport|trip|vehicle/.test(normalized)) return "Transport";
  if (/inventory|stock|asset|store/.test(normalized)) return "Store & Assets";
  if (/discipline|welfare/.test(normalized)) return "Discipline";
  if (/academic|exam|marks/.test(normalized)) return "Academics";

  return "School Activity";
}

function resolveInitialSection(initialSection?: string, initialWorkspace?: string): PrincipalSectionId {
  const requested = `${initialSection ?? ""} ${initialWorkspace ?? ""}`.toLowerCase();

  if (/attendance/.test(requested)) return "attendance";
  if (/finance|fee|payment|mpesa|m-pesa|billing/.test(requested)) return "fees";
  if (/discipline|incident|welfare|counsellor/.test(requested)) return "discipline";
  if (/academic|exam|marks|lesson|report-card|report card/.test(requested)) return "academics";
  if (/staff|teacher|hr|leave/.test(requested)) return "staff";
  if (/user|users|invitation|invite|role|permission|account/.test(requested)) return "user-management";
  if (/parent|visitor|security|front/.test(requested)) return "parents-visitors";
  if (/clinic|sick|nurse|medicine|health/.test(requested)) return "sick-bay";
  if (/boarding|hostel|dorm|exeat/.test(requested)) return "boarding";
  if (/transport|bus|route|vehicle|fuel/.test(requested)) return "transport";
  if (/library|book/.test(requested)) return "library";
  if (/store|asset|inventory|ict|procurement/.test(requested)) return "store-assets";
  if (/admission|inquiry|application/.test(requested)) return "admissions";
  if (/report|document|print/.test(requested)) return "reports";
  if (/approval|approve|pending/.test(requested)) return "approvals";
  if (/audit|history|log/.test(requested)) return "audit-logs";
  if (/system|health|sync|sms|callback/.test(requested)) return "system-health";

  return "overview";
}

function sectionById(id: PrincipalSectionId, sections = principalSections) {
  return sections.find((section) => section.id === id) ?? sections[0] ?? principalSections[0];
}

function actionToneClass(tone?: PracticalAction["tone"]) {
  if (tone === "danger") return "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] hover:border-[#F87171]";
  if (tone === "warning") return "border-[#FED7AA] bg-[#FFF7ED] text-[#C2410C] hover:border-[#FB923C]";
  return "border-[#BFD7FF] bg-[#EEF6FF] text-[#0B3A7A] hover:border-[#7BAEF9]";
}

function statusTone(status: PrincipalSection["status"]) {
  if (status === "critical") return "critical";
  if (status === "warning") return "warning";
  return "ok";
}

function PracticalButton({
  action,
  section,
  onAction,
}: {
  action: PracticalAction;
  section: PrincipalSection;
  onAction: (action: PracticalAction, section: PrincipalSection) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onAction(action, section)}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition hover:-translate-y-0.5 ${actionToneClass(action.tone)}`}
    >
      <ClipboardCheck className="h-3.5 w-3.5" />
      {action.label}
    </button>
  );
}

function SourceLine({ source }: { source: string }) {
  return (
    <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#597091]">
      From: {source}
    </p>
  );
}

function MetricCard({ metric }: { metric: PrincipalMetric }) {
  return (
    <div className="rounded-xl border border-[#D7E0EF] bg-white p-3 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#597091]">{metric.label}</p>
      <p className="mt-1 text-2xl font-black tracking-tight text-[#071D49]">{metric.value}</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-[#52657F]">{metric.helper}</p>
    </div>
  );
}

function SchoolOperationCard({
  section,
  compact = false,
  onAction,
}: {
  section: PrincipalSection;
  compact?: boolean;
  onAction: (action: PracticalAction, section: PrincipalSection) => void;
}) {
  const Icon = section.icon;

  return (
    <Card className="border-[#D7E0EF] bg-white p-4 shadow-[0_16px_44px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="rounded-xl bg-[#EAF4FF] p-2 text-[#0B3A7A]">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-black text-[#071D49]">{section.label}</h3>
            <p className="mt-1 text-sm font-semibold leading-6 text-[#52657F]">{section.summary}</p>
            <SourceLine source={section.source} />
          </div>
        </div>
        <StatusPill label={section.status === "ok" ? "On track" : section.status === "critical" ? "Urgent" : "Needs attention"} tone={statusTone(section.status)} />
      </div>

      <div className={`mt-4 grid gap-3 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-4"}`}>
        {section.metrics.map((metric) => (
          <MetricCard key={`${section.id}-${metric.label}`} metric={metric} />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {section.actions.map((action) => (
          <PracticalButton key={`${section.id}-${action.label}`} action={action} section={section} onAction={onAction} />
        ))}
      </div>
    </Card>
  );
}

function OverviewSituationBoard({
  sections,
  onAction,
}: {
  sections: PrincipalSection[];
  onAction: (action: PracticalAction, section: PrincipalSection) => void;
}) {
  return (
    <Card className="border-[#D7E0EF] bg-white p-4 shadow-[0_16px_44px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#597091]">School activity today</p>
          <h2 className="mt-1 text-xl font-black text-[#071D49]">Daily school situation</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-[#52657F]">
            Attendance, fees, welfare, visitors, sick bay, boarding, academics, staff, transport, and approvals are visible from one place.
          </p>
        </div>
        <StatusPill label="Live school updates" tone="ok" />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2 2xl:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon;
          const mainMetric = section.metrics[0];
          const secondMetric = section.metrics[1];

          return (
            <div key={section.id} className="rounded-2xl border border-[#D7E0EF] bg-[#F8FAFC] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3">
                  <span className="mt-0.5 rounded-xl bg-[#EAF4FF] p-2 text-[#0B3A7A]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-[#071D49]">{section.label}</h3>
                    <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-[#52657F]">{section.summary}</p>
                  </div>
                </div>
                <StatusPill
                  label={section.status === "ok" ? "OK" : section.status === "critical" ? "Urgent" : "Open"}
                  tone={statusTone(section.status)}
                  compact
                />
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {[mainMetric, secondMetric].filter(Boolean).map((metric) => (
                  <div key={`${section.id}-${metric.label}`} className="rounded-xl border border-[#D7E0EF] bg-white px-3 py-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#597091]">{metric.label}</p>
                    <p className="text-lg font-black text-[#071D49]">{metric.value}</p>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#597091]">From: {section.source}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                {section.actions.slice(0, 2).map((action) => (
                  <PracticalButton key={`${section.id}-overview-${action.label}`} action={action} section={section} onAction={onAction} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function CompactApprovalsCard({
  section,
  onAction,
}: {
  section: PrincipalSection;
  onAction: (action: PracticalAction, section: PrincipalSection) => void;
}) {
  return (
    <Card className="border-[#FED7AA] bg-[#FFF7ED] p-3 shadow-[0_12px_30px_rgba(194,65,12,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="rounded-xl bg-white p-2 text-[#C2410C]">
            <ClipboardCheck className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#C2410C]">Pending approvals</p>
            <h2 className="mt-0.5 text-base font-black text-[#071D49]">{section.summary}</h2>
            <p className="mt-1 text-xs font-semibold text-[#7C2D12]">Open the approvals page for full review. The overview stays focused.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {section.metrics.slice(0, 3).map((metric) => (
            <span key={metric.label} className="rounded-full border border-[#FDBA74] bg-white px-2.5 py-1 text-xs font-black text-[#9A3412]">
              {metric.value} {metric.label}
            </span>
          ))}
          <PracticalButton action={section.actions[0]} section={section} onAction={onAction} />
        </div>
      </div>
    </Card>
  );
}

function RecordsPanel({
  section,
  onAction,
}: {
  section: PrincipalSection;
  onAction: (action: PracticalAction, section: PrincipalSection) => void;
}) {
  return (
    <Card className="border-[#D7E0EF] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#597091]">Action list</p>
          <h3 className="mt-1 text-base font-black text-[#071D49]">{section.label} items needing attention</h3>
        </div>
        <StatusPill label={`${section.records.length} items`} tone={section.records.length > 0 ? "warning" : "ok"} />
      </div>

      {section.records.length === 0 ? (
        <p className="mt-4 rounded-xl border border-[#BFE8D7] bg-[#ECFDF5] px-3 py-3 text-sm font-bold text-[#047857]">
          {section.emptyState ?? "Nothing urgent in this area right now"}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[11px] font-black uppercase tracking-[0.12em] text-[#597091]">
              <tr>
                <th className="border-b border-[#D7E0EF] px-3 py-2">Item</th>
                <th className="border-b border-[#D7E0EF] px-3 py-2">Owner</th>
                <th className="border-b border-[#D7E0EF] px-3 py-2">Next action</th>
                <th className="border-b border-[#D7E0EF] px-3 py-2">Status</th>
                <th className="border-b border-[#D7E0EF] px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody className="font-semibold text-[#1B2D4A]">
              {section.records.map((record) => (
                <tr key={`${section.id}-${record.item}`}>
                  <td className="border-b border-[#EDF2F7] px-3 py-3">{record.item}</td>
                  <td className="border-b border-[#EDF2F7] px-3 py-3 text-[#52657F]">{record.owner}</td>
                  <td className="border-b border-[#EDF2F7] px-3 py-3">{record.nextAction}</td>
                  <td className="border-b border-[#EDF2F7] px-3 py-3">
                    <span className="rounded-full border border-[#D7E0EF] bg-[#F8FAFC] px-2 py-1 text-xs font-black text-[#40608F]">
                      {record.status}
                    </span>
                  </td>
                  <td className="border-b border-[#EDF2F7] px-3 py-3">
                    <PracticalButton
                      action={{ label: record.nextAction, target: section.id }}
                      section={section}
                      onAction={onAction}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function PrincipalSearchPanel({
  query,
  results,
  onOpen,
}: {
  query: string;
  results: PrincipalSearchResult[];
  onOpen: (section: PrincipalSection, actionLabel: string) => void;
}) {
  return (
    <Card className="border-[#D7E0EF] bg-white p-4 shadow-[0_16px_44px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#597091]">Search results</p>
          <h2 className="mt-1 text-xl font-black text-[#071D49]">Results for {query}</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-[#52657F]">
            Search checks students, staff owners, receipts, visitors, sick bay notes, approvals, buses, assets, and school action lists.
          </p>
        </div>
        <StatusPill label={`${results.length} found`} tone={results.length ? "ok" : "warning"} />
      </div>

      <div className="mt-4 space-y-3">
        {results.length ? (
          results.map((result) => {
            const Icon = result.section.icon;

            return (
              <button
                key={result.id}
                type="button"
                onClick={() => onOpen(result.section, result.actionLabel)}
                className="grid w-full gap-3 rounded-2xl border border-[#D7E0EF] bg-[#F8FAFC] p-3 text-left transition hover:-translate-y-0.5 hover:border-[#9BC5FF] md:grid-cols-[minmax(0,1fr)_auto]"
              >
                <span className="flex min-w-0 gap-3">
                  <span className="mt-0.5 rounded-xl bg-[#EAF4FF] p-2 text-[#0B3A7A]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-black text-[#071D49]">{result.title}</span>
                    <span className="mt-1 block text-xs font-semibold leading-5 text-[#52657F]">{result.detail}</span>
                    <span className="mt-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-[#597091]">
                      From: {result.section.source}
                    </span>
                  </span>
                </span>
                <span className="inline-flex items-center justify-center rounded-xl border border-[#BFD7FF] bg-[#EEF6FF] px-3 py-2 text-xs font-black text-[#0B3A7A]">
                  Open {result.section.label}
                </span>
              </button>
            );
          })
        ) : (
          <p className="rounded-xl border border-[#FED7AA] bg-[#FFF7ED] px-3 py-3 text-sm font-bold text-[#C2410C]">
            No school record matched this search. Try a student name, admission number, parent phone, receipt code, visitor name, class, bus, or approval type.
          </p>
        )}
      </div>
    </Card>
  );
}

function StateExamples() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <p className="rounded-xl border border-[#D7E0EF] bg-white px-3 py-2 text-xs font-bold text-[#40608F]">
        Refreshing school data...
      </p>
      <p className="rounded-xl border border-[#BFE8D7] bg-[#ECFDF5] px-3 py-2 text-xs font-bold text-[#047857]">
        All attendance registers submitted
      </p>
      <p className="rounded-xl border border-[#FED7AA] bg-[#FFF7ED] px-3 py-2 text-xs font-bold text-[#C2410C]">
        Some live updates are delayed. Retry is available.
      </p>
    </div>
  );
}

export function PrincipalPracticalCommandCenter({
  initialSection,
  initialWorkspace,
  tenantSlug,
}: {
  initialSection?: string;
  initialWorkspace?: string;
  tenantSlug?: string | null;
}) {
  const [activeSection, setActiveSection] = useState<PrincipalSectionId>(() =>
    resolveInitialSection(initialSection, initialWorkspace),
  );
  const [, setActionLog] = useState<ActionLogItem[]>([
    {
      id: "seed-fee-sms",
      label: "Fee reminder SMS sent",
      section: "Fees",
      status: "Completed",
      detail: "42 parents with balances above KSh 10,000 queued for follow-up.",
    },
    {
      id: "seed-visitor-log",
      label: "Visitor log printed",
      section: "Parents & Visitors",
      status: "Completed",
      detail: "Current visitor list printed for front office and security.",
    },
  ]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const greetingName = getSchoolRoleGreetingName("principal") || "Principal Wanjiku";
  const schoolId = getCurrentSchoolId(tenantSlug);
  const [sections, setSections] = useState<PrincipalSection[]>(() => buildPrincipalSectionsForSchool(schoolId));
  const active = activeSection === "overview" ? null : sectionById(activeSection, sections);
  const searchResults = useMemo(() => principalSearchResults(searchQuery, sections), [searchQuery, sections]);
  const isSearching = searchQuery.trim().length > 0;
  const overviewSections = overviewSectionIds.map((id) => sectionById(id, sections));
  const approvalsSection = sectionById("approvals", sections);
  const currentSummaryCards = useMemo(() => buildSummaryCardsForSections(sections), [sections]);

  useEffect(() => {
    function loadSharedSchoolActions() {
      setSections(buildPrincipalSectionsForSchool(schoolId));

      const events: ActionLogItem[] = readSchoolData<SchoolOperationalEvent>("events", schoolId)
        .filter((event) => event.actorRole !== "principal")
        .slice(0, 6)
        .map((event) => ({
          id: event.id,
          label: event.title,
          section: sectionLabelForModule(event.module),
          status: event.severity === "critical" || event.severity === "warning" ? "Will retry" : "Completed",
          detail: event.body,
        }));

      if (events.length) {
        setActionLog((items) => {
          const existing = new Set(items.map((item) => item.id));
          return [...events.filter((event) => !existing.has(event.id)), ...items].slice(0, 8);
        });
      }
    }

    loadSharedSchoolActions();

    return subscribeToSchoolDataUpdates((detail) => {
      if (detail.schoolId === schoolId) {
        loadSharedSchoolActions();
      }
    });
  }, [schoolId]);

  function handleAction(action: PracticalAction, section: PrincipalSection) {
    if (action.target) {
      setActiveSection(action.target);
      setMobileNavOpen(false);
    }

    const logItem: ActionLogItem = {
      id: `${slug(section.id)}-${slug(action.label)}-${Date.now()}`,
      label: action.label,
      section: section.label,
      status: "Sent",
      detail: `${action.label} sent from ${section.label}.`,
    };

    setActionLog((items) => [logItem, ...items].slice(0, 8));
    setActionNotice(`${action.label} sent from ${section.label}.`);
    publishSchoolOperationalEvent({
      schoolId,
      actorRole: "principal",
      type: "PRINCIPAL_ACTION_SENT",
      module: section.id,
      title: action.label,
      body: `${action.label} sent from ${section.label}.`,
      entityId: logItem.id,
      severity: "success",
      payload: {
        schoolName,
        section: section.label,
        source: section.source,
      },
      notifications: [{ audienceRoles: ["principal"], title: action.label }],
    });

    void dispatchOperationalWorkflowAction({
      role: "principal",
      actionId: slug(action.label),
      workflowBinding: `${section.label} school action`,
      payload: {
        schoolName,
        actionLabel: action.label,
        section: section.label,
        source: section.source,
      },
    }).catch(() => {
      setActionNotice(`${action.label} sent from ${section.label}. The system will retry when the school connection is ready.`);
      setActionLog((items) =>
        items.map((item) =>
          item.id === logItem.id
            ? {
                ...item,
                status: "Will retry",
                detail: `${action.label} sent from ${section.label}. The system will retry when the school connection is ready.`,
              }
            : item,
        ),
      );
    });
  }

  function openSearchResult(section: PrincipalSection, actionLabel: string) {
    setActiveSection(section.id);
    setMobileNavOpen(false);
    setSearchQuery("");
    const logItem: ActionLogItem = {
      id: `search-${slug(section.id)}-${Date.now()}`,
      label: `Opened ${section.label}`,
      section: section.label,
      status: "Completed",
      detail: `Search opened ${section.label} for: ${actionLabel}.`,
    };

    setActionLog((items) => [logItem, ...items].slice(0, 8));
    setActionNotice(`Opened ${section.label}.`);
  }

  const nav = useMemo(() => sidebarItems, []);

  return (
    <div className="min-h-dvh bg-[#F3F6FA] lg:h-dvh lg:overflow-hidden" data-testid="role-operational-command-center">
      <div className="grid min-h-dvh lg:h-full lg:min-h-0 lg:grid-cols-[280px_minmax(0,1fr)]" data-testid="principal-practical-command-center">
        {mobileNavOpen ? (
          <button
            type="button"
            aria-label="Close principal navigation overlay"
            className="fixed inset-0 z-30 bg-slate-950/45 lg:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
        ) : null}
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-[min(84vw,280px)] min-h-0 flex-col overflow-hidden border-r border-[#D7E0EF] bg-[linear-gradient(180deg,#071D49_0%,#102E63_64%,#0F172A_100%)] p-4 text-white shadow-2xl transition-transform duration-200 lg:static lg:z-auto lg:h-full lg:w-auto lg:translate-x-0 lg:shadow-none ${
            mobileNavOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="shrink-0 rounded-2xl border border-white/12 bg-white/[0.08] p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100/80">{schoolName}</p>
            <h1 className="mt-3 text-2xl font-black tracking-tight">Principal Command Center</h1>
            <p className="mt-2 text-xs font-semibold text-white/65">Live daily school leadership desk</p>
          </div>

          <nav className="mt-4 grid min-h-0 flex-1 gap-2 overflow-y-auto pr-1" aria-label="Principal dashboard sidebar">
            {nav.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveSection(item.id);
                  setMobileNavOpen(false);
                }}
                aria-current={activeSection === item.id ? "page" : undefined}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm font-bold transition hover:-translate-y-0.5 ${
                  activeSection === item.id
                    ? "border-cyan-200/40 bg-cyan-200/14 text-white shadow-[0_0_24px_rgba(34,211,238,0.16)]"
                    : "border-white/10 bg-white/[0.06] text-white/76 hover:bg-white/[0.1]"
                }`}
              >
                <span>{item.label}</span>
                {item.badge ? (
                  <span className="rounded-full bg-[#FFEDD5] px-2 py-0.5 text-[11px] font-black text-[#C2410C]">{item.badge}</span>
                ) : null}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex min-h-dvh min-w-0 flex-col lg:h-full lg:min-h-0 lg:overflow-hidden">
          <header className="shrink-0 border-b border-[#D7E0EF] bg-white/92 px-4 py-2.5 shadow-sm backdrop-blur md:px-5">
            <div className="flex flex-wrap items-start justify-between gap-2.5">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  className="rounded-xl border border-[#D7E0EF] bg-white p-1.5 text-[#0B3A7A] lg:hidden"
                  onClick={() => setMobileNavOpen((open) => !open)}
                  aria-label="Open principal navigation"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div>
                  <DashboardGreeting
                    name={greetingName}
                    context="Here is what needs your attention at Kisumu Boys High School today."
                    tone="dark"
                  />
                  <h2 className="mt-1 text-lg font-black tracking-tight text-[#071D49]">Principal Command Center</h2>
                  <p className="mt-1 text-xs font-semibold text-[#52657F]">Term 2 2026 - Updated a few moments ago</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="relative hidden md:block">
                  <span className="sr-only">Search students, staff, receipts, visitors</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#40608F]" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.currentTarget.value)}
                    placeholder="Search students, staff, receipts, visitors"
                    className="w-[320px] rounded-xl border border-[#D7E0EF] bg-[#F8FAFC] py-1.5 pl-9 pr-3 text-sm font-semibold text-[#40608F] outline-none transition focus:border-[#9BC5FF] focus:bg-white"
                  />
                </label>
                <StatusPill label="Live school updates" tone="ok" />
                <StatusPill label="7 approvals" tone="warning" />
              </div>
            </div>
            <label className="relative mt-2 block md:hidden">
              <span className="sr-only">Search students, staff, receipts, visitors</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#40608F]" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.currentTarget.value)}
                placeholder="Search students, staff, receipts, visitors"
                className="w-full rounded-xl border border-[#D7E0EF] bg-[#F8FAFC] py-1.5 pl-9 pr-3 text-sm font-semibold text-[#40608F] outline-none transition focus:border-[#9BC5FF] focus:bg-white"
              />
            </label>
          </header>

          <section className="min-h-0 flex-1 overflow-y-auto px-3 py-3 md:px-5">
            {!active && !isSearching ? (
              <div className="grid shrink-0 gap-3 md:grid-cols-2 xl:grid-cols-6">
                {currentSummaryCards.map((card) => (
                  <button
                    key={card.label}
                    type="button"
                    onClick={() => setActiveSection(resolveInitialSection(card.source))}
                    className="rounded-2xl border border-[#D7E0EF] bg-white p-3 text-left shadow-[0_14px_36px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-[#9BC5FF]"
                  >
                    <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#597091]">{card.label}</p>
                    <p className="mt-1 text-xl font-black tracking-tight text-[#071D49]">{card.value}</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-[#52657F]">{card.helper}</p>
                  </button>
                ))}
              </div>
            ) : null}

            {actionNotice ? (
              <div className="mt-3 shrink-0 rounded-xl border border-[#B8D4FF] bg-[#EFF6FF] px-3 py-2 text-xs font-black text-[#0B3A7A]" role="status">
                {actionNotice}
              </div>
            ) : null}

            {isSearching ? (
              <div className="min-h-0 flex-1">
                <PrincipalSearchPanel query={searchQuery} results={searchResults} onOpen={openSearchResult} />
              </div>
            ) : active ? (
              <div className="min-h-0 flex-1">
                {active.id === "user-management" ? (
                  <UserManagementWorkspace
                    schoolId={schoolId}
                    schoolName={schoolName}
                    actorRole="Principal"
                    actorName={greetingName}
                    canInviteUsers
                    canManageUsers
                  />
                ) : (
                  <div className="min-h-0 space-y-4">
                    <SchoolOperationCard section={active} onAction={handleAction} />
                    <RecordsPanel section={active} onAction={handleAction} />
                    {active.id === "system-health" ? <StateExamples /> : null}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-3 min-h-0 flex-1 space-y-4">
                <CompactApprovalsCard section={approvalsSection} onAction={handleAction} />
                <OverviewSituationBoard sections={overviewSections} onAction={handleAction} />
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
