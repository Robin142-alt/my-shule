"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SimpleListCard } from "@/components/experience/activity-list-card";
import { StudentStatusBadge } from "@/components/modules/students/lifecycle/StudentStatusBadge";
import { StudentLifecycleActions } from "@/components/modules/students/lifecycle/StudentLifecycleActions";
import { DisciplineWorkspace } from "@/components/discipline/discipline-workspace";
import { MetricGrid } from "@/components/experience/metric-grid";
import { AdmissionsModuleScreen } from "@/components/modules/admissions/admissions-module-screen";
import { AiInsightsModuleScreen } from "@/components/modules/ai-insights/ai-insights-module-screen";
import { AssetTrackingModuleScreen } from "@/components/modules/assets/asset-tracking-module-screen";
import { BoardingModuleScreen } from "@/components/modules/boarding/boarding-module-screen";
import { CbtModuleScreen } from "@/components/modules/cbt/cbt-module-screen";
import { ExamsModuleScreen } from "@/components/modules/exams/exams-module-screen";
import { HostelModuleScreen } from "@/components/modules/hostel/hostel-module-screen";
import { InventoryModuleScreen } from "@/components/modules/inventory/inventory-module-screen";
import { IotModuleScreen } from "@/components/modules/iot/iot-module-screen";
import { LmsModuleScreen } from "@/components/modules/lms/lms-module-screen";
import { ProcurementModuleScreen } from "@/components/modules/procurement/procurement-module-screen";
import { TransportModuleScreen } from "@/components/modules/transport/transport-module-screen";
import { VisitorManagementModuleScreen } from "@/components/modules/visitors/visitor-management-module-screen";
import { MPesaReconciliationWorkspace } from "@/components/school/accountant/m-pesa-reconciliation-workspace";
import { ErpShell } from "@/components/school/erp-shell";
import { buttonClasses } from "@/components/ui/button";
import { DeanAcademicsCommandCenter } from "@/components/school/dean-academics-command-center";
import { DeanModuleScreen } from "@/components/modules/dean/dean-module-screen";
import { DeputyPrincipalCommandCenter } from "@/components/school/deputy-principal-command-center";
import { PrincipalCommandCenter } from "@/components/school/principal-command-center";
import { BoardingMasterCommandCenter } from "@/components/school/boarding-master-command-center";
import { LaboratoryTechnicianCommandCenter } from "@/components/school/laboratory-technician-command-center";
import { AccountantCommandCenter } from "@/components/school/accountant-command-center";
import { NurseCommandCenter } from "@/components/school/nurse-command-center";
import { CounsellorCommandCenter } from "@/components/school/counsellor-command-center";
import { LibrarianCommandCenter } from "@/components/school/librarian-command-center";
import { DisciplineMasterCommandCenter } from "@/components/school/discipline-master-command-center";
import { SecurityCommandCenter } from "@/components/school/security-command-center";
import { ExamsManagerCommandCenter } from "@/components/school/exams-manager-command-center";
import { GradeMasterCommandCenter } from "@/components/school/grade-master-command-center";
import { HodCommandCenter } from "@/components/school/hod-command-center";
import { OperationalBlueprintWorkspace } from "@/components/school/operational-blueprint-workspace";
import { RoleOperationalCommandCenter } from "@/components/school/role-operational-command-center";
import { TeacherCommandCenter } from "@/components/school/teacher-command-center";
import { SecretaryCommandCenterFull } from "@/components/school/secretary-command-center-full";
import { IctManagerCommandCenter } from "@/components/school/ict-manager-command-center";
import { ProcurementOfficerCommandCenter } from "@/components/school/procurement-officer-command-center";
import { StudentCommandCenter } from "@/components/school/student-command-center";
import { ClassTeacherCommandCenter } from "@/components/school/class-teacher-command-center";
import { AdmissionsDashboardCommandCenter } from "@/components/school/admissions-dashboard/admissions-dashboard-command-center";
import { StorekeeperCommandCenter } from "@/components/school/storekeeper-command-center";
import { TransportManagerCommandCenter } from "@/components/school/transport-manager-command-center";
import { UserManagementPanel } from "@/components/school/user-management-panel";
import { SupportCenterWorkspace } from "@/components/support/support-center-workspace";
import { LearnerPicker } from "@/components/common/learner-picker";
import { unwrapBillingApiData } from "@/lib/billing/billing-utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { StatusPill } from "@/components/ui/status-pill";
import { Tabs } from "@/components/ui/tabs";
import {
  downloadCsvFile,
  downloadTextFile,
  openPrintDocument,
} from "@/lib/dashboard/export";
import { getCsrfToken } from "@/lib/auth/csrf-client";
import { redirectOnExpiredSessionResponse } from "@/lib/auth/session-expiry-client";
import type { ExperienceNotificationItem } from "@/lib/experiences/types";
import { SchoolStudentsPage } from "./student-directory-workspace";
import { SchoolAcademicsPage } from "./academics-workspace-admin";
import { SchoolReportsPage } from "./reports-workspace";
import { SchoolPageHeader } from "./school-page-header";

import { getSchoolWorkspace, schoolSectionLabels, type SchoolExperienceRole, type SchoolSubscriptionView } from "@/lib/experiences/school-data";
import { getExtremeErpBlueprint, isExtremeErpWorkspaceId } from "@/lib/operational/extreme-erp-blueprints";
import {
  filterNavItemsByEnabledModules,
  getModuleCodeForSchoolSection,
  implementation101ModuleCodes,
  isSchoolSectionEnabled,
} from "@/lib/module-access/module-access-map";
import {
  readCachedSchoolModuleCodes,
  writeCachedSchoolModuleCodes,
} from "@/lib/module-access/school-module-access-cache";
import { toSchoolPath, toSchoolStudentPath } from "@/lib/routing/experience-routes";
import { startSchoolOperationalEventSyncRetryWorker } from "@/lib/school/school-operational-store";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { GraduationCap, Loader2 } from "lucide-react";
import type { LearnerLookupItem } from "@/lib/students/student-lookup";
import { PermissionProvider } from "@/components/providers/permission-context";

export type SchoolRouteMode = "hosted" | "public";
export type ManualReceiptMethod = "cash" | "cheque" | "bank_deposit" | "eft" | "mpesa_c2b";
export type ManualReceiptStatus = "received" | "deposited" | "cleared" | "bounced" | "reversed";
export type MpesaC2bStatus = "pending_review" | "matched" | "rejected";

export type ManualReceiptResponse = {
  id: string;
  receipt_number: string;
  payment_method: ManualReceiptMethod;
  status: ManualReceiptStatus;
  student_id: string | null;
  invoice_id: string | null;
  amount_minor: string;
  payer_name: string | null;
  received_at: string;
  cheque_number: string | null;
  drawer_bank: string | null;
  deposit_reference: string | null;
  ledger_transaction_id: string | null;
  reversal_ledger_transaction_id: string | null;
  notes: string | null;
};

export type MpesaC2bPaymentResponse = {
  id: string;
  trans_id: string;
  business_short_code: string;
  bill_ref_number: string | null;
  invoice_number: string | null;
  amount_minor: string;
  phone_number: string | null;
  payer_name: string | null;
  status: MpesaC2bStatus;
  matched_invoice_id: string | null;
  matched_student_id: string | null;
  ledger_transaction_id: string | null;
  received_at: string;
};

export type FinanceActivityResponse = {
  id: string;
  kind: "invoice" | "receipt";
  student_id: string | null;
  student_name: string | null;
  invoice_id: string | null;
  amount_minor: string;
  method: string;
  status: string;
  reference: string;
  occurred_at: string;
  ledger_transaction_id: string | null;
};

export type StudentFeeBalanceResponse = {
  tenant_id: string;
  student_id: string;
  student_name: string | null;
  currency_code: string;
  invoiced_amount_minor: string;
  paid_amount_minor: string;
  credit_amount_minor: string;
  balance_amount_minor: string;
  invoice_count: number;
  last_activity_at: string | null;
};

type StudentFeeStatementEntryResponse = {
  id: string;
  kind: "invoice" | "receipt";
  source_id: string;
  invoice_id: string | null;
  reference: string;
  description: string;
  status: string;
  method: string;
  debit_amount_minor: string;
  credit_amount_minor: string;
  balance_after_minor: string;
  occurred_at: string;
  ledger_transaction_id: string | null;
};

export type StudentFeeStatementResponse = {
  summary: StudentFeeBalanceResponse;
  entries: StudentFeeStatementEntryResponse[];
};

type CsvReportArtifactResponse = {
  filename: string;
  content_type: string;
  csv: string;
};

type FinanceReconciliationBucket = "cleared" | "pending" | "exception";

type FinanceReconciliationTotals = {
  transaction_count: number;
  total_amount_minor: string;
  cleared_count: number;
  cleared_amount_minor: string;
  pending_count: number;
  pending_amount_minor: string;
  exception_count: number;
  exception_amount_minor: string;
};

type FinanceReconciliationMethodSummary = {
  payment_method: ManualReceiptMethod;
  transaction_count: number;
  total_amount_minor: string;
  cleared_amount_minor: string;
  pending_amount_minor: string;
  exception_amount_minor: string;
};

type FinanceReconciliationRow = {
  payment_id: string;
  receipt_number: string;
  payment_method: ManualReceiptMethod;
  status: ManualReceiptStatus;
  reconciliation_bucket: FinanceReconciliationBucket;
  amount_minor: string;
  currency_code: string;
  occurred_at: string;
  reference: string;
  payer_name: string | null;
  student_id: string | null;
  invoice_id: string | null;
  ledger_transaction_id: string | null;
  reversal_ledger_transaction_id: string | null;
};

export type FinanceReconciliationResponse = {
  period: {
    from: string;
    to: string;
    payment_method: ManualReceiptMethod | null;
  };
  totals: FinanceReconciliationTotals;
  method_summaries: FinanceReconciliationMethodSummary[];
  rows: FinanceReconciliationRow[];
};

export type FeeStructureLineItemResponse = {
  code: string;
  label: string;
  amount_minor: string;
};

export type FeeStructureResponse = {
  id: string;
  name: string;
  academic_year: string;
  term: string;
  grade_level: string;
  class_name: string | null;
  currency_code: string;
  status: "draft" | "active" | "archived";
  due_days: number;
  line_items: FeeStructureLineItemResponse[];
  total_amount_minor: string;
  created_at: string;
};

export type BulkFeeInvoiceGenerationResponse = {
  fee_structure_id: string;
  idempotency_key: string;
  generated_count: number;
  skipped_count: number;
};

export type BillableFeeStudentResponse = {
  student_id: string;
  student_name: string;
  admission_number: string;
  grade_level: string;
  class_name: string | null;
  guardian_phone: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeFeeStructures(value: unknown): FeeStructureResponse[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .filter((row) => typeof row.id === "string" && typeof row.name === "string")
    .map((row) => ({
      id: row.id as string,
      name: row.name as string,
      academic_year: typeof row.academic_year === "string" ? row.academic_year : "",
      term: typeof row.term === "string" ? row.term : "",
      grade_level: typeof row.grade_level === "string" ? row.grade_level : "",
      class_name: typeof row.class_name === "string" ? row.class_name : null,
      currency_code: typeof row.currency_code === "string" ? row.currency_code : "KES",
      status: row.status === "draft" || row.status === "archived" ? row.status : "active",
      due_days: typeof row.due_days === "number" ? row.due_days : 14,
      line_items: Array.isArray(row.line_items) ? row.line_items.filter(isRecord).map((item) => ({
        code: typeof item.code === "string" ? item.code : "",
        label: typeof item.label === "string" ? item.label : "",
        amount_minor: typeof item.amount_minor === "string" ? item.amount_minor : String(item.amount_minor ?? "0"),
      })) : [],
      total_amount_minor: typeof row.total_amount_minor === "string" ? row.total_amount_minor : String(row.total_amount_minor ?? "0"),
      created_at: typeof row.created_at === "string" ? row.created_at : "",
    }));
}

function normalizeBillableFeeStudents(value: unknown): BillableFeeStudentResponse[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .filter((row) => typeof row.student_id === "string" && typeof row.student_name === "string")
    .map((row) => ({
      student_id: row.student_id as string,
      student_name: row.student_name as string,
      admission_number: typeof row.admission_number === "string" ? row.admission_number : "",
      grade_level: typeof row.grade_level === "string" ? row.grade_level : "",
      class_name: typeof row.class_name === "string" ? row.class_name : null,
      guardian_phone: typeof row.guardian_phone === "string" ? row.guardian_phone : null,
    }));
}

type ClinicAnalyticsResponse = {
  total_medicines?: number | string;
  low_stock_medicines?: number | string;
  out_of_stock_medicines?: number | string;
  expiring_medicines?: number | string;
  clinic_visits_today?: number | string;
  medicine_units_dispensed_month?: number | string;
  medicine_consumption_cost_minor?: number | string;
  wastage_due_to_expiry_minor?: number | string;
  emergency_supply_ready_rate?: number | string;
  most_used_medicine?: number | string;
  critical_alerts?: number | string;
};

type ClinicMedicineResponse = {
  id: string;
  medicine_name: string;
  generic_name?: string | null;
  category: string;
  unit_type: string;
  quantity_in_stock?: number | string;
  nearest_expiry_date?: string | null;
  prescription_required?: boolean;
};

export type FinanceActivityRow = {
  id: string;
  student: string;
  amount: string;
  method: string;
  date: string;
  reference: string;
  status: string;
  statusTone: "ok" | "warning" | "critical";
};

export type FeeLineItemDraft = {
  id: string;
  code: string;
  label: string;
  amount: string;
};

export type BulkFeeStudentDraft = {
  id: string;
  student_id: string;
  student_name: string;
  admission_number: string;
  class_name: string;
  guardian_phone: string;
};

export const manualReceiptMethodLabels: Record<ManualReceiptMethod, string> = {
  cash: "Cash",
  cheque: "Cheque",
  bank_deposit: "Bank deposit",
  eft: "EFT",
  mpesa_c2b: "M-PESA Paybill",
};

export const manualReceiptSelectableMethods: ManualReceiptMethod[] = [
  "cash",
  "cheque",
  "bank_deposit",
  "eft",
];

export const manualReceiptStatusTone: Record<ManualReceiptStatus, "ok" | "warning" | "critical"> = {
  received: "warning",
  deposited: "warning",
  cleared: "ok",
  bounced: "critical",
  reversed: "warning",
};

export const mpesaC2bStatusTone: Record<MpesaC2bStatus, "ok" | "warning" | "critical"> = {
  pending_review: "warning",
  matched: "ok",
  rejected: "critical",
};

const financeReconciliationBucketTone: Record<FinanceReconciliationBucket, "ok" | "warning" | "critical"> = {
  cleared: "ok",
  pending: "warning",
  exception: "critical",
};

export function buildSchoolSectionHref(
  role: SchoolExperienceRole,
  section: string,
  routeMode: SchoolRouteMode,
) {
  if (routeMode === "public") {
    return section === "dashboard" ? `/school/${role}` : `/school/${role}/${section}`;
  }

  return toSchoolPath(section as any);
}

function buildSchoolStudentHref(
  role: SchoolExperienceRole,
  studentId: string,
  routeMode: SchoolRouteMode,
) {
  if (routeMode === "public") {
    return `/school/${role}/students/${studentId}`;
  }

  return toSchoolStudentPath(studentId);
}

function mapSchoolHref(
  role: SchoolExperienceRole,
  href: string,
  routeMode: SchoolRouteMode,
) {
  const normalized = href.replace(/^\/+/, "");

  const section = normalized.length === 0 ? "dashboard" : normalized;

  return buildSchoolSectionHref(
    role,
    (section as string) || "dashboard",
    routeMode,
  );
}

const supportWorkspaceSectionIds = new Set([
  "support-new-ticket",
  "support-my-tickets",
  "support-knowledge-base",
  "support-system-status",
]);

const admissionsDashboardSectionIds = new Set([
  "dashboard",
  "overview",
  "enquiries",
  "applications",
  "applicant-profiles",
  "documents",
  "interviews",
  "appointments",
  "selection",
  "fee-clearance",
  "placement",
  "enrolment",
  "parents",
  "transfers",
  "imports",
  "templates",
  "tasks",
  "communication",
  "reports",
  "admissions",
  "class-placement",
  "parent-linking",
]);

const teacherDashboardSectionIds = new Set([
  "dashboard",
  "overview",
  "students",
  "academics",
  "communication",
  "timetable",
  "my-timetable",
  "classes",
  "subjects-classes",
  "attendance",
  "teacher-attendance",
  "lesson-log",
  "lesson-logs",
  "lesson-plans",
  "syllabus-coverage",
  "assignments",
  "assignments-homework",
  "assessments-cats",
  "exams",
  "exams-marks",
  "marks-entry",
  "learner-progress",
  "student-notes",
  "discipline-welfare",
  "parent-communication",
  "messages",
  "teaching-resources",
  "resource-requests",
  "store-requests",
  "reports",
  "reports-downloads",
  "reports-analytics",
  "notifications",
  "profile",
  "class-teacher",
  "club",
  "invigilation",
]);

const examsManagerDashboardSectionIds = new Set([
  "dashboard",
  "overview",
  "exams",
  "builder",
  "exam-setup",
  "scheduler",
  "exam-timetable",
  "marks",
  "missing-marks",
  "submissions",
  "marks-entry",
  "moderation",
  "validation",
  "grading",
  "academic-analytics",
  "analysis",
  "drafts",
  "report-templates",
  "report-cards",
  "publishing",
  "imports",
  "templates",
  "imports-templates",
  "exports",
  "audit-log",
  "archive",
  "reports",
]);

function canCreateSupportTickets(role: SchoolExperienceRole) {
  return role === "principal" || role === "deputy-principal";
}

const roleOperationalWorkspaceSectionIds = new Set([
  "dashboard",
  "setup-checklist",
  "school-setup",
  "executive-analytics",
  "alerts-risks",
  "approvals",
  "universal-approvals",
  "users-staff",
  "reports",
  "reports-analytics",
  "school-calendar",
  "communication-center",
  "document-printing",
  "data-security",
  "ai-insights",
  "audit-logs",
  "settings",
  "students",
  "school-admin",
  "mpesa",
  "academics",
  "academic-interventions",
  "syllabus",
  "curriculum-coverage",
  "department-performance",
  "teacher-workload",
  "lesson-plans",
  "lesson-logs",
  "assessments",
  "attendance",
  "resources",
  "department-teachers",
  "subject-allocation",
  "coverage-review",
  "marks-moderation",
  "resource-requests",
  "student-analytics",
  "marks",
  "grading",
  "validation",
  "communication",
  "transport",
  "procurement",
  "hostel",
  "boarding",
  "cbt",
  "lms",
  "visitors",
  "assets",
  "iot",
  "exams",
  "discipline",
  "labs",
  "teacher-attendance",
  "clinic",
  "leadership",
  "timetable",
  "staff",
  "admissions",
  "inventory",
  "library",
  "hr-payroll",
  "timetable-builder",
  "canteen-meals",
  "co-curricular",
  "setup-wizard",
  "ict-assets",
]);

const deanAcademicsWorkspaceSectionIds = new Set([
  "dashboard",
  "overview",
  "academic-overview",
  "academics",
  "curriculum",
  "syllabus",
  "curriculum-coverage",
  "academic-analytics",
  "department-performance",
  "student-analytics",
  "teachers",
  "staff",
  "teacher-workload",
  "lesson-plans",
  "lesson-logs",
  "attendance",
  "pending",
  "moderation",
  "results-moderation",
  "integrity",
  "exams",
  "marks",
  "grading",
  "validation",
  "assessments",
  "interventions",
  "alerts",
  "academic-interventions",
  "history",
  "approvals",
  "universal-approvals",
  "reports",
  "reports-analytics",
]);

const hodWorkspaceSectionIds = new Set([
  "dashboard",
  "overview",
  "my-teaching",
  "department-settings",
  "department-overview",
  "department-teachers",
  "staff",
  "teacher-attendance",
  "lesson-observation",
  "subject-allocation",
  "timetable",
  "timetable-builder",
  "schemes-of-work",
  "syllabus",
  "syllabus-coverage",
  "attendance",
  "academics",
  "lesson-delivery",
  "coverage-review",
  "lesson-plans",
  "assessments-cats",
  "exams",
  "exams-marks-moderation",
  "marks",
  "grading",
  "validation",
  "performance-analytics",
  "student-analytics",
  "learner-interventions",
  "marks-moderation",
  "resources",
  "resources-requests",
  "resource-requests",
  "procurement",
  "inventory",
  "approvals",
  "communication",
  "users-invitations",
  "sick-bay",
  "exams-reports",
  "department-meetings",
  "reports",
  "reports-downloads",
]);

const financeRoleDedicatedSectionIds = new Set([
  "fee-structures",
  "invoices",
  "payments",
  "receipts",
  "mpesa",
  "m-pesa-reconciliation",
  "arrears",
  "waivers-discounts",
  "expenses",
  "reports",
]);
const principalCommandCenterSectionIds = new Set([
  "dashboard",
  "setup-checklist",
  "school-profile",
  "academic-setup",
  "classes-streams",
  "subjects-departments",
  "staff-roles",
  "finance",
  "finance-overview",
  "fees",
  "attendance",
  "attendance-monitoring",
  "discipline",
  "visitors",
  "sick-bay",
  "clinic",
  "boarding",
  "academics",
  "staff",
  "transport",
  "library",
  "exams",
  "exams-reports",
  "exams-report-cards",
  "communication",
  "users-invitations",
  "approvals",
  "reports",
  "audit-logs",
]);

const nurseCommandCenterSectionIds = new Set([
  "dashboard",
  "overview",
  "visits",
  "sick-bay-queue",
  "medicine-inventory",
  "dispensing-log",
  "parent-notifications",
  "health-reports",
]);

const librarianCommandCenterSectionIds = new Set([
  "dashboard",
  "overview",
  "issue",
  "return",
  "catalogue",
  "add_books",
  "loans",
  "lost_damaged",
  "fines",
  "borrowers",
  "class_textbooks",
  "reservations",
  "stocktake",
  "departments",
  "visits",
  "requests",
  "reports",
  "notices",
  "settings",
]);

const boardingMasterCommandCenterSectionIds = new Set([
  "dashboard",
  "overview",
  "register",
  "dorms",
  "beds",
  "roll-call",
  "leave",
  "late-returns",
  "duty",
  "incidents",
  "welfare",
  "meals",
  "inspections",
  "maintenance",
  "inventory",
  "visitors",
  "communication",
  "approvals",
  "reports",
  "settings",
]);

const transportManagerCommandCenterSectionIds = new Set([
  "dashboard",
  "overview",
  "fleet",
  "routes",
  "allocation",
  "drivers",
  "fuel",
  "maintenance",
  "trips",
  "attendance",
  "gps",
  "notifications",
  "incidents",
  "compliance",
  "reports",
  "settings",
]);

const laboratoryTechnicianCommandCenterSectionIds = new Set([
  "dashboard",
  "overview",
  "schedule",
  "requests",
  "preparation",
  "issue_return",
  "apparatus",
  "chemicals",
  "consumables",
  "intake",
  "stocktake",
  "faults",
  "incidents",
  "disposal",
  "procurement",
  "reports",
  "messages",
  "settings",
]);

const counsellorCommandCenterSectionIds = new Set([
  "dashboard",
  "overview",
  "referrals",
  "cases",
  "appointments",
  "sessions",
  "followups",
  "welfare",
  "group",
  "parents",
  "teachers",
  "discipline",
  "health",
  "escalations",
  "reports",
  "templates",
  "settings",
]);

const disciplineMasterCommandCenterSectionIds = new Set([
  "dashboard",
  "overview",
  "report-intake",
  "log-incident",
  "incident-register",
  "triage-queue",
  "student-conduct",
  "investigations",
  "actions",
  "parent-comm",
  "counselling",
  "approvals",
  "detention",
  "monitoring",
  "reports",
  "templates",
  "audit",
  "settings",
]);
const standardOperationalRoleIds = new Set<SchoolExperienceRole>([
  "deputy-principal",
  "secretary",
  "bursar",
  "accountant",
  "class-teacher",
  "admin",
  "storekeeper",
  "librarian",
  "nurse",
  "boarding-master",
  "security-officer",
  "transport-manager",
  "laboratory-technician",
  "guidance-counselling",
  "discipline-master",
]);

function shouldRenderRoleOperationalWorkspace(role: SchoolExperienceRole, section: string) {
  if (
    standardOperationalRoleIds.has(role)
    && roleOperationalWorkspaceSectionIds.has(section)
    && !supportWorkspaceSectionIds.has(section)
  ) {
    return true;
  }

  if (role === "dean-academics") {
    return deanAcademicsWorkspaceSectionIds.has(section);
  }

  if (role === "hod") {
    return hodWorkspaceSectionIds.has(section);
  }

  if (role === "admissions") {
    return admissionsDashboardSectionIds.has(section);
  }

  if (role === "teacher") {
    return teacherDashboardSectionIds.has(section);
  }

  if (role === "exams-manager") {
    return examsManagerDashboardSectionIds.has(section);
  }

  if (role === "admin") {
    return section === "dashboard";
  }

  if (role === "principal") {
    return principalCommandCenterSectionIds.has(section);
  }

  if (role === "nurse") {
    return nurseCommandCenterSectionIds.has(section);
  }

  if (role === "librarian") {
    return librarianCommandCenterSectionIds.has(section);
  }

  if (role === "boarding-master") {
    return boardingMasterCommandCenterSectionIds.has(section);
  }

  if (role === "transport-manager") {
    return transportManagerCommandCenterSectionIds.has(section);
  }

  if (role === "laboratory-technician") {
    return laboratoryTechnicianCommandCenterSectionIds.has(section);
  }

  if (role === "guidance-counselling") {
    return counsellorCommandCenterSectionIds.has(section);
  }

  if (role === "discipline-master") {
    return disciplineMasterCommandCenterSectionIds.has(section);
  }

  if ((role === "accountant" || role === "bursar") && section === "finance") {
    return false;
  }

  if ((role === "accountant" || role === "bursar") && financeRoleDedicatedSectionIds.has(section)) {
    return true;
  }

  return roleOperationalWorkspaceSectionIds.has(section) && !supportWorkspaceSectionIds.has(section);
}

export function getMissingFieldError(fields: Array<{ label: string; value: string }>) {
  const missingField = fields.find((field) => field.value.trim().length === 0);
  return missingField ? `${missingField.label} is required.` : null;
}

function parsePositiveAmount(value: string) {
  const normalized = value.replace(/,/g, "").trim();
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function formatKesAmount(amount: number) {
  return `KES ${amount.toLocaleString("en-KE")}`;
}

function formatMinorKes(amountMinor: string) {
  const value = Number(amountMinor);

  if (!Number.isFinite(value)) {
    return "KES 0";
  }

  return formatKesAmount(value / 100);
}

function toMinorUnits(amount: string) {
  const parsed = parsePositiveAmount(amount);

  if (parsed === null) {
    return null;
  }

  return String(Math.round(parsed * 100));
}

export function buildFeeStructureLineItems(drafts: FeeLineItemDraft[]) {
  const activeDrafts = drafts.filter((draft) =>
    [draft.code, draft.label, draft.amount].some((value) => value.trim().length > 0),
  );
  const seenCodes = new Set<string>();
  const lineItems: FeeStructureLineItemResponse[] = [];

  if (activeDrafts.length === 0) {
    return { error: "At least one fee line item is required.", lineItems };
  }

  for (const draft of activeDrafts) {
    const label = draft.label.trim();
    const amountMinor = toMinorUnits(draft.amount);
    const code = draft.code.trim().toLowerCase() || label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

    if (!label || !draft.amount.trim()) {
      return { error: "Each fee line item needs a label and amount.", lineItems };
    }

    if (!code) {
      return { error: "Fee line item code could not be generated from the label.", lineItems };
    }

    if (!amountMinor) {
      return { error: "Fee line item amounts must be greater than zero.", lineItems };
    }

    if (seenCodes.has(code)) {
      return { error: `Duplicate fee line item code "${code}".`, lineItems };
    }

    seenCodes.add(code);
    lineItems.push({ code, label, amount_minor: amountMinor });
  }

  return { error: null, lineItems };
}

export function buildBulkFeeStudents(drafts: BulkFeeStudentDraft[]) {
  const activeDrafts = drafts.filter((draft) =>
    [draft.student_id, draft.student_name, draft.admission_number, draft.class_name, draft.guardian_phone].some(
      (value) => value.trim().length > 0,
    ),
  );
  const seenStudentIds = new Set<string>();
  const students: Array<Omit<BulkFeeStudentDraft, "id">> = [];

  if (activeDrafts.length === 0) {
    return { error: "At least one student is required for bulk billing.", students };
  }

  for (const draft of activeDrafts) {
    const studentId = draft.student_id.trim();
    const studentName = draft.student_name.trim();

    if (!studentId || !studentName) {
          return { error: "Each billing row needs a learner and learner name.", students };
    }

    if (seenStudentIds.has(studentId)) {
      return { error: `Student "${studentId}" appears more than once.`, students };
    }

    seenStudentIds.add(studentId);
    students.push({
      student_id: studentId,
      student_name: studentName,
      admission_number: draft.admission_number.trim(),
      class_name: draft.class_name.trim(),
      guardian_phone: draft.guardian_phone.trim(),
    });
  }

  return { error: null, students };
}

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function getMonthStartInputValue() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

function createDraftId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}`;
}

function createEmptyFeeLineItemDraft(): FeeLineItemDraft {
  return {
    id: createDraftId("fee-line"),
    code: "",
    label: "",
    amount: "",
  };
}

function createEmptyBulkFeeStudentDraft(): BulkFeeStudentDraft {
  return {
    id: createDraftId("bulk-student"),
    student_id: "",
    student_name: "",
    admission_number: "",
    class_name: "",
    guardian_phone: "",
  };
}

export function toBulkFeeStudentDraft(student: BillableFeeStudentResponse): BulkFeeStudentDraft {
  return {
    id: student.student_id,
    student_id: student.student_id,
    student_name: student.student_name,
    admission_number: student.admission_number,
    class_name: student.class_name ?? student.grade_level,
    guardian_phone: student.guardian_phone ?? "",
  };
}

function formatActivityDate(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Unknown";
  }

  return parsed.toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getFinanceActivityTone(activity: FinanceActivityResponse): "ok" | "warning" | "critical" {
  if (activity.kind === "invoice") {
    return activity.status === "paid" ? "ok" : "warning";
  }

  if (activity.status === "cleared") {
    return "ok";
  }

  return activity.status === "bounced" || activity.status === "reversed" ? "critical" : "warning";
}

function getStatementEntryTone(entry: StudentFeeStatementEntryResponse): "ok" | "warning" | "critical" {
  if (["paid", "cleared"].includes(entry.status)) {
    return "ok";
  }

  if (["bounced", "reversed", "void"].includes(entry.status)) {
    return "critical";
  }

  return "warning";
}

function toFinanceActivityRow(activity: FinanceActivityResponse): FinanceActivityRow {
  return {
    id: activity.id,
    student: activity.student_name ?? activity.student_id ?? "Unassigned",
    amount: formatMinorKes(activity.amount_minor),
    method:
      activity.kind === "invoice"
        ? "Invoice"
        : manualReceiptMethodLabels[activity.method as ManualReceiptMethod] ?? activity.method,
    date: formatActivityDate(activity.occurred_at),
    reference: activity.reference,
    status: activity.status.replace("_", " "),
    statusTone: getFinanceActivityTone(activity),
  };
}

export function sumFinanceActivityMinor(
  activities: FinanceActivityResponse[],
  predicate: (activity: FinanceActivityResponse) => boolean,
) {
  return activities
    .filter(predicate)
    .reduce((total, activity) => {
      try {
        return total + BigInt(activity.amount_minor);
      } catch {
        return total;
      }
    }, BigInt(0))
    .toString();
}

export function buildFinanceSummaryItems(
  activities: FinanceActivityResponse[],
  loading: boolean,
) {
  const invoicedMinor = sumFinanceActivityMinor(activities, (activity) => activity.kind === "invoice");
  const collectedMinor = sumFinanceActivityMinor(
    activities,
    (activity) => activity.kind === "receipt" && activity.status === "cleared",
  );
  const pendingReviewCount = activities.filter(
    (activity) =>
      activity.kind === "receipt" &&
      ["received", "deposited"].includes(activity.status),
  ).length;
  const outstandingMinor = (BigInt(invoicedMinor) - BigInt(collectedMinor)).toString();

  return [
    {
      id: "invoiced",
      label: "Invoiced",
      value: loading ? "Loading" : formatMinorKes(invoicedMinor),
      helper: "Live fee invoices",
    },
    {
      id: "collected",
      label: "Collected",
      value: loading ? "Loading" : formatMinorKes(collectedMinor),
      helper: "Cleared receipts",
    },
    {
      id: "outstanding",
      label: "Outstanding",
      value: loading ? "Loading" : formatMinorKes(BigInt(outstandingMinor) > BigInt(0) ? outstandingMinor : "0"),
      helper: "Invoice less cleared receipts",
    },
    {
      id: "pending-review",
      label: "Pending review",
      value: loading ? "Loading" : String(pendingReviewCount),
      helper: "Receipts awaiting clearance",
    },
  ];
}


export function SubscriptionLifecyclePanel({
  subscription,
  role,
  routeMode,
  tenantSlug,
}: {
  subscription: SchoolSubscriptionView;
  role: SchoolExperienceRole;
  routeMode: SchoolRouteMode;
  tenantSlug?: string | null;
}) {
  const router = useRouter();
  const [renewOpen, setRenewOpen] = useState(false);
  const [renewalSubmitting, setRenewalSubmitting] = useState(false);
  const [renewalError, setRenewalError] = useState<string | null>(null);
  const [renewalMessage, setRenewalMessage] = useState<string | null>(null);

  async function startMpesaRenewal() {
    setRenewalSubmitting(true);
    setRenewalError(null);
    setRenewalMessage(null);

    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(
        buildBillingApiPath("/api/billing/subscriptions/current/renewal-payment-intents", tenantSlug),
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "content-type": "application/json",
            "x-myshule-csrf": csrfToken,
          },
          body: JSON.stringify({
            idempotency_key: `subscription-renewal-${subscription.state.toLowerCase()}-${Date.now()}`,
          }),
        },
      );

      if (redirectOnExpiredSessionResponse(response, "school", (href) => router.replace(href))) {
        return;
      }

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || "MPESA renewal could not be started.");
      }

      setRenewalMessage(
        `MPESA renewal started for ${payload?.invoice_number ?? "the renewal invoice"}. Payment intent ${
          payload?.payment_intent_id ?? "is pending"
        }.`,
      );
    } catch (caught) {
      setRenewalError(caught instanceof Error ? caught.message : "MPESA renewal could not be started.");
    } finally {
      setRenewalSubmitting(false);
    }
  }

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-semibold text-foreground">Subscription lifecycle</p>
                <StatusPill label={subscription.state} tone={subscription.tone} />
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">
                {subscription.detail}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setRenewOpen(true)}>
                {subscription.primaryActionLabel}
              </Button>
              <Link href={buildSchoolSectionHref(role, "reports", routeMode)} className={buttonClasses({ variant: "secondary" })}>
                Export school data
              </Link>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {subscription.stages.map((stage) => (
              <div
                key={stage.id}
                className={`rounded-xl border px-4 py-4 ${
                  stage.label === subscription.state
                    ? "border-warning bg-warning/10"
                    : "border-border bg-surface-muted"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  {stage.label}
                </p>
                <p className="mt-2 text-sm leading-6 text-foreground">{stage.description}</p>
              </div>
            ))}
          </div>
        </Card>
        <SimpleListCard
          title="Reminder delivery"
          subtitle="Admin, SMS, and email reminders stay visible before any access restriction."
          items={subscription.reminders.map((reminder) => ({
            id: reminder.id,
            title: reminder.title,
            subtitle: `${reminder.channel.toUpperCase()} • ${reminder.detail}`,
            value: reminder.status,
            tone: reminder.tone,
          }))}
        />
      </div>
      <Modal
        open={renewOpen}
        title="Renew school subscription"
        description="Use the current billing phone on file to start an MPESA renewal and restore continuous access."
        onClose={() => setRenewOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRenewOpen(false)}>
              Cancel
            </Button>
            <Button onClick={startMpesaRenewal} disabled={renewalSubmitting}>
              {renewalSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {renewalSubmitting ? "Starting renewal..." : "Start MPESA renewal"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {renewalError ? (
            <div role="alert" className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
              {renewalError}
            </div>
          ) : null}
          {renewalMessage ? (
            <div aria-live="polite" className="rounded-xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">
              {renewalMessage}
            </div>
          ) : null}
          <div className="rounded-xl border border-border bg-surface-muted px-4 py-4">
            <p className="text-sm font-semibold text-foreground">Renewal flow</p>
            <ol className="mt-3 space-y-2 text-sm leading-6 text-muted">
              <li>1. Generate a renewal invoice for the current subscription window.</li>
              <li>2. Send the MPESA STK push to the billing phone on file.</li>
              <li>3. Keep exports and billing open until the payment settles.</li>
              <li>4. Restore full school access automatically after the renewal posts.</li>
            </ol>
          </div>
          <div className="rounded-xl border border-border bg-white px-4 py-4">
            <p className="text-sm font-semibold text-foreground">Current policy</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              The school never hard locks immediately. Warning banners appear first, then grace
              period, then read-only restriction, while export and renewal remain available.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}

export function SchoolDashboardHome({
  role,
  tenantSlug,
  routeMode,
}: {
  role: SchoolExperienceRole;
  tenantSlug?: string | null;
  routeMode: SchoolRouteMode;
}) {
  return (
    <RoleOperationalCommandCenter
      role={role}
      initialSection="dashboard"
      tenantSlug={tenantSlug}
      routeMode={routeMode}
    />
  );
}


function StudentProfilePage({
  role,
  tenantSlug,
  studentId,
}: {
  role: SchoolExperienceRole;
  tenantSlug?: string | null;
  studentId: string;
}) {
  const { model } = getSchoolWorkspace(role, tenantSlug);
  const profile = model.studentProfiles.find((entry) => entry.id === studentId) ?? model.studentProfiles[0];
  const profileDocuments = [
    { label: "Admission form", value: "Uploaded and verified" },
    { label: "Guardian consent", value: "Stored with learner registration" },
  ];

  function downloadDocuments() {
    openPrintDocument({
      eyebrow: "Student documents",
      title: `${profile.name} document pack`,
      subtitle: `${profile.admissionNumber} • ${profile.className}`,
      rows: profileDocuments.map((item) => ({
        label: item.label,
        value: item.value,
      })),
      footer: "This document summary can be printed or saved as PDF for the learner file.",
    });
  }

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        eyebrow="Student profile"
        title={profile.name}
        description={`${profile.admissionNumber} • ${profile.className} • Parent ${profile.parentName} (${profile.parentPhone})`}
        actions={
          <div className="flex items-center space-x-3">
            <StudentStatusBadge status="ACTIVE" />
            <StudentLifecycleActions studentId={studentId} status="ACTIVE" />
            <Button variant="secondary" onClick={downloadDocuments}>
              Download documents
            </Button>
          </div>
        }
      />
      <MetricGrid
        items={profile.metrics.map((metric) => ({
          id: metric.id,
          label: metric.label,
          value: metric.value,
          helper: metric.helper,
        }))}
      />
      <Tabs
        items={[
          {
            id: "overview",
            label: "Overview",
            panel: (
              <div className="grid gap-6 lg:grid-cols-2">
                <SimpleListCard
                  title="Learner snapshot"
                  subtitle="The essentials principals and admins usually confirm first."
                  items={[
                    { id: "balance", title: "Current balance", subtitle: "What is still outstanding this term", value: profile.balance, tone: profile.balanceTone },
                    { id: "parent", title: "Parent contact", subtitle: profile.parentName, value: profile.parentPhone },
                    { id: "class", title: "Class placement", subtitle: profile.className, value: profile.admissionNumber },
                  ]}
                />
                <SimpleListCard
                  title="Overview actions"
                  subtitle="Fast follow-up actions for this learner."
                  items={[
                    { id: "contact", title: "Open parent contact details", subtitle: "Discuss balances or classroom updates through approved channels", value: "Available" },
                    { id: "fee", title: "Open fee statement", subtitle: "Prepare a printable account view", value: "Ready" },
                    { id: "academics", title: "Open report card", subtitle: "See current performance and comments", value: "Current" },
                  ]}
                />
              </div>
            ),
          },
          {
            id: "fees",
            label: "Fees",
            panel: (
              <div className="space-y-6">
                <DataTable
                  title="Fee structure"
                  columns={[
                    { id: "item", header: "Item", render: (row) => row.item },
                    { id: "frequency", header: "Frequency", render: (row) => row.frequency },
                    { id: "amount", header: "Amount", render: (row) => row.amount, className: "text-right font-semibold", headerClassName: "text-right" },
                  ]}
                  rows={profile.feeStructure}
                  getRowKey={(row) => row.id}
                />
                <DataTable
                  title="Payment history"
                  columns={[
                    { id: "date", header: "Date", render: (row) => row.date },
                    { id: "method", header: "Method", render: (row) => row.method },
                    { id: "reference", header: "Reference", render: (row) => row.reference },
                    { id: "amount", header: "Amount", render: (row) => row.amount, className: "text-right font-semibold", headerClassName: "text-right" },
                    { id: "status", header: "Status", render: (row) => <StatusPill label={row.status} tone={row.statusTone} /> },
                  ]}
                  rows={profile.paymentHistory}
                  getRowKey={(row) => row.id}
                />
              </div>
            ),
          },
          {
            id: "academics",
            label: "Academics",
            panel: (
              <DataTable
                title="Academic performance"
                columns={[
                  { id: "subject", header: "Subject", render: (row) => row.subject },
                  { id: "teacher", header: "Teacher", render: (row) => row.teacher },
                  { id: "average", header: "Average", render: (row) => row.average, className: "text-right font-semibold", headerClassName: "text-right" },
                  { id: "grade", header: "Grade", render: (row) => row.grade },
                ]}
                rows={profile.academics}
                getRowKey={(row) => row.id}
              />
            ),
          },
          {
            id: "discipline",
            label: "Discipline",
            panel: (
              <SimpleListCard
                title="Discipline"
                subtitle="This space keeps pastoral notes calm and searchable."
                items={[
                  { id: "discipline-1", title: "No active discipline incidents", subtitle: "Learner has no unresolved concerns on file." },
                ]}
              />
            ),
          },
          {
            id: "documents",
            label: "Documents",
            panel: (
              <SimpleListCard
                title="Documents"
                subtitle="Files linked to admission, transfers, and medical notes."
                items={[
                  { id: "doc-1", title: "Admission form", subtitle: "Uploaded and verified by admin office", value: "PDF" },
                  { id: "doc-2", title: "Guardian consent", subtitle: "Stored with learner registration", value: "PDF" },
                ]}
              />
            ),
          },
        ]}
      />
    </div>
  );
}

function SchoolFinancePage({
  role,
  tenantSlug,
  routeMode,
}: {
  role: SchoolExperienceRole;
  tenantSlug?: string | null;
  routeMode: SchoolRouteMode;
}) {
  const { subscription } = getSchoolWorkspace(role, tenantSlug);
  const [activity, setActivity] = useState<FinanceActivityResponse[]>([]);
  const [rows, setRows] = useState<FinanceActivityRow[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [balances, setBalances] = useState<StudentFeeBalanceResponse[]>([]);
  const [balancesLoading, setBalancesLoading] = useState(true);
  const [statement, setStatement] = useState<StudentFeeStatementResponse | null>(null);
  const [statementLoading, setStatementLoading] = useState(false);
  const [statementError, setStatementError] = useState<string | null>(null);
  const [reconciliation, setReconciliation] = useState<FinanceReconciliationResponse | null>(null);
  const [reconciliationLoading, setReconciliationLoading] = useState(true);
  const [reconciliationError, setReconciliationError] = useState<string | null>(null);
  const [reconciliationFilters, setReconciliationFilters] = useState<{
    from: string;
    to: string;
    method: ManualReceiptMethod | "all";
  }>(() => ({
    from: getMonthStartInputValue(),
    to: getTodayInputValue(),
    method: "all",
  }));
  const [feeStructures, setFeeStructures] = useState<FeeStructureResponse[]>([]);
  const [feeStructuresLoading, setFeeStructuresLoading] = useState(true);
  const [feeStructureSaving, setFeeStructureSaving] = useState(false);
  const [feeStructureError, setFeeStructureError] = useState<string | null>(null);
  const [feeStructureDraft, setFeeStructureDraft] = useState({
    name: "",
    academic_year: String(new Date().getFullYear()),
    term: "",
    grade_level: "",
    class_name: "",
    status: "active" as FeeStructureResponse["status"],
    due_days: "14",
  });
  const [feeLineItems, setFeeLineItems] = useState<FeeLineItemDraft[]>(() => [
    createEmptyFeeLineItemDraft(),
  ]);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [billableStudents, setBillableStudents] = useState<BillableFeeStudentResponse[]>([]);
  const [billableStudentsLoading, setBillableStudentsLoading] = useState(false);
  const [bulkDraft, setBulkDraft] = useState({
    fee_structure_id: "",
    idempotency_key: "",
    due_at: "",
  });
  const [bulkStudents, setBulkStudents] = useState<BulkFeeStudentDraft[]>(() => [
    createEmptyBulkFeeStudentDraft(),
  ]);
  const [selectedBulkStudentIds, setSelectedBulkStudentIds] = useState<Set<string>>(() => new Set());
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [invoiceDraft, setInvoiceDraft] = useState({ studentId: "", studentName: "", amount: "", dueAt: "" });
  const [selectedInvoiceLearner, setSelectedInvoiceLearner] = useState<LearnerLookupItem | null>(null);
  const [paymentDraft, setPaymentDraft] = useState({
    payment_method: "cash" as ManualReceiptMethod,
    student_id: "",
    invoice_id: "",
    payer_name: "",
    amount: "",
    reference: "",
  });
  const [selectedPaymentLearner, setSelectedPaymentLearner] = useState<LearnerLookupItem | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [financeMessage, setFinanceMessage] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  async function loadSummary() {
    setSummaryLoading(true);
    try {
      const response = await fetch(buildBillingApiPath("/api/finance/summary", tenantSlug), {
        cache: "no-store",
      });
      if (response.ok) {
        setSummaryData(await response.json());
      }
    } catch (e) {
    } finally {
      setSummaryLoading(false);
    }
  }

  async function loadFinanceActivity() {
    setActivityLoading(true);

    try {
      const response = await fetch(buildBillingApiPath("/api/billing/finance-activity?limit=25&offset=0", tenantSlug), {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Finance activity could not be loaded.");
      }

      const payload = (await response.json()) as FinanceActivityResponse[];
      setActivity(payload);
      setRows(payload.map(toFinanceActivityRow));
    } catch (caught) {
      setActivity([]);
      setRows([]);
      setFinanceMessage(caught instanceof Error ? caught.message : "Finance activity could not be loaded.");
    } finally {
      setActivityLoading(false);
    }
  }

  async function loadStudentBalances() {
    setBalancesLoading(true);

    try {
      const response = await fetch(buildBillingApiPath("/api/billing/student-balances", tenantSlug), {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Student balances could not be loaded.");
      }

      const payload = (await response.json()) as StudentFeeBalanceResponse[];
      setBalances(payload);
    } catch (caught) {
      setBalances([]);
      setFinanceMessage(caught instanceof Error ? caught.message : "Student balances could not be loaded.");
    } finally {
      setBalancesLoading(false);
    }
  }

  async function loadReconciliationReport() {
    setReconciliationLoading(true);
    setReconciliationError(null);

    const params = new URLSearchParams();

    if (reconciliationFilters.from) {
      params.set("from", reconciliationFilters.from);
    }

    if (reconciliationFilters.to) {
      params.set("to", reconciliationFilters.to);
    }

    if (reconciliationFilters.method !== "all") {
      params.set("method", reconciliationFilters.method);
    }

    try {
      const response = await fetch(
        buildBillingApiPath(`/api/billing/reconciliation?${params.toString()}`, tenantSlug),
        { cache: "no-store" },
      );
      const payload = (await response.json().catch(() => null)) as
        | FinanceReconciliationResponse
        | { message?: string }
        | null;

      if (!response.ok || !payload || !("rows" in payload)) {
        throw new Error(
          payload && "message" in payload && payload.message
            ? payload.message
            : "Reconciliation report could not be loaded.",
        );
      }

      setReconciliation(payload);
    } catch (caught) {
      setReconciliation(null);
      setReconciliationError(caught instanceof Error ? caught.message : "Reconciliation report could not be loaded.");
    } finally {
      setReconciliationLoading(false);
    }
  }

  async function loadFeeStructures() {
    setFeeStructuresLoading(true);
    setFeeStructureError(null);

    try {
      const response = await fetch(buildBillingApiPath("/api/billing/fee-structures", tenantSlug), {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as
        | FeeStructureResponse[]
        | { data?: FeeStructureResponse[]; message?: string }
        | { message?: string }
        | null;
      const feeStructuresPayload = normalizeFeeStructures(unwrapBillingApiData<unknown>(payload));

      if (!response.ok) {
        throw new Error(
          payload && !Array.isArray(payload) && payload.message
            ? payload.message
            : "Fee structures could not be loaded.",
        );
      }

      setFeeStructures(feeStructuresPayload);
      setBulkDraft((current) => ({
        ...current,
        fee_structure_id: current.fee_structure_id || feeStructuresPayload[0]?.id || "",
      }));
    } catch (caught) {
      setFeeStructures([]);
      setFeeStructureError(caught instanceof Error ? caught.message : "Fee structures could not be loaded.");
    } finally {
      setFeeStructuresLoading(false);
    }
  }

  useEffect(() => {
    void loadFeeStructures();
  }, [tenantSlug]);

  function openInvoiceModal() {
    setInvoiceDraft({ studentId: "", studentName: "", amount: "", dueAt: "" });
    setSelectedInvoiceLearner(null);
    setInvoiceError(null);
    setShowInvoiceModal(true);
  }

  function closeInvoiceModal() {
    setShowInvoiceModal(false);
    setInvoiceError(null);
  }

  function openPaymentModal() {
    setPaymentDraft({
      payment_method: "cash",
      student_id: "",
      invoice_id: "",
      payer_name: "",
      amount: "",
      reference: "",
    });
    setSelectedPaymentLearner(null);
    setPaymentError(null);
    setShowPaymentModal(true);
  }

  function closePaymentModal() {
    setShowPaymentModal(false);
    setPaymentError(null);
  }

  function closeStatementModal() {
    setStatement(null);
    setStatementError(null);
    setStatementLoading(false);
  }

  async function openStudentStatement(balance: StudentFeeBalanceResponse) {
    setStatementError(null);
    setStatementLoading(true);

    try {
      const response = await fetch(
        buildBillingApiPath(
          `/api/billing/student-balances/${encodeURIComponent(balance.student_id)}/statement`,
          tenantSlug,
        ),
        { cache: "no-store" },
      );
      const payload = (await response.json().catch(() => null)) as
        | StudentFeeStatementResponse
        | { message?: string }
        | null;

      if (!response.ok || !payload || !("entries" in payload)) {
        throw new Error(
          payload && "message" in payload && payload.message
            ? payload.message
            : "Student statement could not be loaded.",
        );
      }

      setStatement(payload);
    } catch (caught) {
      setStatement(null);
      setStatementError(caught instanceof Error ? caught.message : "Student statement could not be loaded.");
    } finally {
      setStatementLoading(false);
    }
  }

  async function exportStudentStatement(studentId: string) {
    setStatementError(null);

    try {
      const response = await fetch(
        buildBillingApiPath(
          `/api/billing/student-balances/${encodeURIComponent(studentId)}/statement/export`,
          tenantSlug,
        ),
        { cache: "no-store" },
      );
      const payload = (await response.json().catch(() => null)) as
        | CsvReportArtifactResponse
        | { message?: string }
        | null;

      if (!response.ok || !payload || !("csv" in payload)) {
        throw new Error(
          payload && "message" in payload && payload.message
            ? payload.message
            : "Student statement export could not be prepared.",
        );
      }

      downloadTextFile({
        filename: payload.filename,
        content: payload.csv,
        mimeType: payload.content_type,
      });
    } catch (caught) {
      setStatementError(caught instanceof Error ? caught.message : "Student statement export could not be prepared.");
    }
  }

  async function exportReconciliationReport() {
    setReconciliationError(null);

    const params = new URLSearchParams();

    if (reconciliationFilters.from) {
      params.set("from", reconciliationFilters.from);
    }

    if (reconciliationFilters.to) {
      params.set("to", reconciliationFilters.to);
    }

    if (reconciliationFilters.method !== "all") {
      params.set("method", reconciliationFilters.method);
    }

    try {
      const response = await fetch(
        buildBillingApiPath(`/api/billing/reconciliation/export?${params.toString()}`, tenantSlug),
        { cache: "no-store" },
      );
      const payload = (await response.json().catch(() => null)) as
        | CsvReportArtifactResponse
        | { message?: string }
        | null;

      if (!response.ok || !payload || !("csv" in payload)) {
        throw new Error(
          payload && "message" in payload && payload.message
            ? payload.message
            : "Reconciliation export could not be prepared.",
        );
      }

      downloadTextFile({
        filename: payload.filename,
        content: payload.csv,
        mimeType: payload.content_type,
      });
    } catch (caught) {
      setReconciliationError(caught instanceof Error ? caught.message : "Reconciliation export could not be prepared.");
    }
  }

  function updateFeeLineItem(
    id: string,
    field: keyof Omit<FeeLineItemDraft, "id">,
    value: string,
  ) {
    setFeeLineItems((current) =>
      current.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
    setFeeStructureError(null);
  }

  function removeFeeLineItem(id: string) {
    setFeeLineItems((current) =>
      current.length === 1 ? [createEmptyFeeLineItemDraft()] : current.filter((item) => item.id !== id),
    );
    setFeeStructureError(null);
  }

  function updateBulkStudent(
    id: string,
    field: keyof Omit<BulkFeeStudentDraft, "id">,
    value: string,
  ) {
    setBulkStudents((current) =>
      current.map((student) => (student.id === id ? { ...student, [field]: value } : student)),
    );
    setBulkError(null);
  }

  function removeBulkStudent(id: string) {
    setBulkStudents((current) =>
      current.length === 1 ? [] : current.filter((student) => student.id !== id),
    );
    setSelectedBulkStudentIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    setBulkError(null);
  }

  function toggleBulkRosterStudent(student: BillableFeeStudentResponse) {
    setSelectedBulkStudentIds((current) => {
      const next = new Set(current);

      if (next.has(student.student_id)) {
        next.delete(student.student_id);
        setBulkStudents((drafts) => drafts.filter((draft) => draft.id !== student.student_id));
      } else {
        next.add(student.student_id);
        setBulkStudents((drafts) => {
          const manualDrafts = drafts.filter((draft) => !billableStudents.some((row) => row.student_id === draft.id));
          const rosterDrafts = billableStudents
            .filter((row) => next.has(row.student_id))
            .map(toBulkFeeStudentDraft);
          return [...rosterDrafts, ...manualDrafts];
        });
      }

      return next;
    });
    setBulkError(null);
  }

  function selectAllVisibleBulkRosterStudents() {
    const next = new Set(billableStudents.map((student) => student.student_id));
    setSelectedBulkStudentIds(next);
    setBulkStudents((drafts) => {
      const manualDrafts = drafts.filter((draft) => !billableStudents.some((row) => row.student_id === draft.id));
      return [...billableStudents.map(toBulkFeeStudentDraft), ...manualDrafts];
    });
    setBulkError(null);
  }

  function clearBulkRosterSelection() {
    setSelectedBulkStudentIds(new Set());
    setBulkStudents((drafts) => drafts.filter((draft) => !billableStudents.some((row) => row.student_id === draft.id)));
    setBulkError(null);
  }

  const hasBulkBillingStudents = bulkStudents.some((student) =>
    [student.student_id, student.student_name, student.admission_number, student.class_name, student.guardian_phone].some(
      (value) => value.trim().length > 0,
    ),
  );
  const canGenerateBulkInvoices = bulkDraft.fee_structure_id.trim().length > 0 && hasBulkBillingStudents;

  async function saveFeeStructure() {
    if (feeStructureSaving) {
      return;
    }

    const validationError = getMissingFieldError([
      { label: "Fee name", value: feeStructureDraft.name },
      { label: "Academic year", value: feeStructureDraft.academic_year },
      { label: "Term", value: feeStructureDraft.term },
      { label: "Grade level", value: feeStructureDraft.grade_level },
    ]);
    const dueDays = Number(feeStructureDraft.due_days);
    const lineItemResult = buildFeeStructureLineItems(feeLineItems);

    if (validationError) {
      setFeeStructureError(validationError);
      return;
    }

    if (!Number.isInteger(dueDays) || dueDays < 0 || dueDays > 365) {
      setFeeStructureError("Due days must be a whole number between 0 and 365.");
      return;
    }

    if (lineItemResult.error) {
      setFeeStructureError(lineItemResult.error);
      return;
    }

    try {
      setFeeStructureSaving(true);
      const csrfToken = await getCsrfToken();
      const response = await fetch(buildBillingApiPath("/api/billing/fee-structures", tenantSlug), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-myshule-csrf": csrfToken,
        },
        body: JSON.stringify({
          name: feeStructureDraft.name.trim(),
          academic_year: feeStructureDraft.academic_year.trim(),
          term: feeStructureDraft.term.trim(),
          grade_level: feeStructureDraft.grade_level.trim(),
          class_name: feeStructureDraft.class_name.trim() || undefined,
          status: feeStructureDraft.status,
          due_days: dueDays,
          line_items: lineItemResult.lineItems,
          metadata: {
            source: "school_finance_fee_setup",
          },
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | FeeStructureResponse
        | { data?: FeeStructureResponse; message?: string }
        | { message?: string }
        | null;
      const savedFeeStructure = unwrapBillingApiData<FeeStructureResponse>(payload);

      if (!response.ok || !savedFeeStructure || !("id" in savedFeeStructure)) {
        throw new Error(payload && "message" in payload && payload.message ? payload.message : "Fee structure could not be saved.");
      }

      setFeeStructureError(null);
      setFinanceMessage(`${savedFeeStructure.name} saved for ${savedFeeStructure.grade_level}.`);
      setBulkDraft((current) => ({ ...current, fee_structure_id: savedFeeStructure.id }));
      setFeeStructureDraft((current) => ({
        ...current,
        name: "",
        term: "",
        grade_level: "",
        class_name: "",
      }));
      setFeeLineItems([createEmptyFeeLineItemDraft()]);
      await loadFeeStructures();
    } catch (caught) {
      setFeeStructureError(caught instanceof Error ? caught.message : "Fee structure could not be saved.");
    } finally {
      setFeeStructureSaving(false);
    }
  }

  async function archiveFeeStructure(feeStructure: FeeStructureResponse) {
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(
        buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(feeStructure.id)}/archive`, tenantSlug),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-myshule-csrf": csrfToken,
          },
        },
      );
      const payload = (await response.json().catch(() => null)) as
        | FeeStructureResponse
        | { data?: FeeStructureResponse; message?: string }
        | { message?: string }
        | null;
      const archivedFeeStructure = unwrapBillingApiData<FeeStructureResponse>(payload);

      if (!response.ok || !archivedFeeStructure || !("id" in archivedFeeStructure)) {
        throw new Error(payload && "message" in payload && payload.message ? payload.message : "Fee structure could not be archived.");
      }

      setFeeStructureError(null);
      setFinanceMessage(`${archivedFeeStructure.name} archived.`);
      setBillableStudents([]);
      setSelectedBulkStudentIds(new Set());
      setBulkStudents([]);
      setBulkDraft((current) => ({
        ...current,
        fee_structure_id: current.fee_structure_id === archivedFeeStructure.id ? "" : current.fee_structure_id,
      }));
      await loadFeeStructures();
    } catch (caught) {
      setFeeStructureError(caught instanceof Error ? caught.message : "Fee structure could not be archived.");
    }
  }

  async function generateBulkFeeInvoices() {
    const selectedFeeStructureId = bulkDraft.fee_structure_id.trim();
    const studentResult = buildBulkFeeStudents(bulkStudents);

    if (!selectedFeeStructureId) {
      setBulkError("Select a fee structure before generating invoices.");
      return;
    }

    if (studentResult.error) {
      setBulkError(studentResult.error);
      return;
    }

    try {
      const csrfToken = await getCsrfToken();
      const idempotencyKey =
        bulkDraft.idempotency_key.trim() ||
        `bulk-fees-${crypto.randomUUID()}`;
      const response = await fetch(
        buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/generate-invoices`, tenantSlug),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-myshule-csrf": csrfToken,
          },
          body: JSON.stringify({
            idempotency_key: idempotencyKey,
            due_at: bulkDraft.due_at.trim()
              ? new Date(`${bulkDraft.due_at.trim()}T23:59:59.000Z`).toISOString()
              : undefined,
            target_students: studentResult.students.map((student) => ({
              student_id: student.student_id,
              student_name: student.student_name,
              admission_number: student.admission_number || undefined,
              class_name: student.class_name || undefined,
              guardian_phone: student.guardian_phone || undefined,
            })),
            metadata: {
              source: "school_finance_bulk_billing",
            },
          }),
        },
      );
      const payload = (await response.json().catch(() => null)) as
        | BulkFeeInvoiceGenerationResponse
        | { data?: BulkFeeInvoiceGenerationResponse; message?: string }
        | { message?: string }
        | null;
      const generationResult = unwrapBillingApiData<BulkFeeInvoiceGenerationResponse>(payload);

      if (!response.ok || !generationResult || !("generated_count" in generationResult)) {
        throw new Error(payload && "message" in payload && payload.message ? payload.message : "Bulk invoices could not be generated.");
      }

      setBulkError(null);
      setFinanceMessage(`${generationResult.generated_count} invoices generated; ${generationResult.skipped_count} duplicate rows skipped.`);
      setBulkDraft((current) => ({ ...current, idempotency_key: "", due_at: "" }));
      setSelectedBulkStudentIds(new Set());
      setBulkStudents([]);
      await loadFinanceActivity();
      await loadStudentBalances();
      await loadReconciliationReport();
    } catch (caught) {
      setBulkError(caught instanceof Error ? caught.message : "Bulk invoices could not be generated.");
    }
  }

  async function loadBillableStudentsForSelectedFeeStructure() {
    const selectedFeeStructureId = bulkDraft.fee_structure_id.trim();

    if (!selectedFeeStructureId) {
      setBulkError("Select a fee structure before loading roster students.");
      return;
    }

    setBillableStudentsLoading(true);
    setBulkError(null);

    try {
      const response = await fetch(
        buildBillingApiPath(`/api/billing/fee-structures/${encodeURIComponent(selectedFeeStructureId)}/billable-students`, tenantSlug),
        { cache: "no-store" },
      );
      const payload = (await response.json().catch(() => null)) as
        | BillableFeeStudentResponse[]
        | { data?: BillableFeeStudentResponse[]; message?: string }
        | { message?: string }
        | null;
      const billableStudentsPayload = normalizeBillableFeeStudents(unwrapBillingApiData<unknown>(payload));

      if (!response.ok) {
        throw new Error(
          payload && !Array.isArray(payload) && payload.message
            ? payload.message
            : "Billable roster could not be loaded.",
        );
      }

      setBillableStudents(billableStudentsPayload);
      setSelectedBulkStudentIds(new Set());
      setBulkStudents([]);

      if (billableStudentsPayload.length === 0) {
        setFinanceMessage("No active roster students matched this fee structure.");
        return;
      }

      setFinanceMessage(`${billableStudentsPayload.length} roster students loaded. Select learners to bill.`);
    } catch (caught) {
      setBillableStudents([]);
      setBulkError(caught instanceof Error ? caught.message : "Billable roster could not be loaded.");
    } finally {
      setBillableStudentsLoading(false);
    }
  }

  async function saveInvoice() {
    const validationError = getMissingFieldError([
      { label: "Learner", value: invoiceDraft.studentId },
      { label: "Student name", value: invoiceDraft.studentName },
      { label: "Amount", value: invoiceDraft.amount },
    ]);
    const amountMinor = toMinorUnits(invoiceDraft.amount);

    if (validationError) {
      setInvoiceError(validationError);
      return;
    }

    if (!amountMinor) {
      setInvoiceError("Amount must be a number greater than zero.");
      return;
    }

    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(buildBillingApiPath("/api/billing/invoices", tenantSlug), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-myshule-csrf": csrfToken,
        },
        body: JSON.stringify({
          description: `Fees for ${invoiceDraft.studentName.trim()}`,
          total_amount_minor: amountMinor,
          due_at: invoiceDraft.dueAt.trim()
            ? new Date(invoiceDraft.dueAt.trim()).toISOString()
            : undefined,
          metadata: {
            student_id: invoiceDraft.studentId.trim(),
            student_name: invoiceDraft.studentName.trim(),
          },
        }),
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Invoice could not be created.");
      }

      setInvoiceError(null);
      setFinanceMessage(`Invoice created for ${invoiceDraft.studentName.trim()}.`);
      setInvoiceDraft({ studentId: "", studentName: "", amount: "", dueAt: "" });
      setSelectedInvoiceLearner(null);
      setShowInvoiceModal(false);
      await loadFinanceActivity();
      await loadStudentBalances();
    } catch (caught) {
      setInvoiceError(caught instanceof Error ? caught.message : "Invoice could not be created.");
    }
  }

  async function savePayment() {
    const validationError = getMissingFieldError([
      { label: "Student or invoice", value: paymentDraft.student_id || paymentDraft.invoice_id },
      { label: "Amount", value: paymentDraft.amount },
      { label: "Reference", value: paymentDraft.reference },
    ]);
    const amountMinor = toMinorUnits(paymentDraft.amount);

    if (validationError) {
      setPaymentError(validationError);
      return;
    }

    if (!amountMinor) {
      setPaymentError("Amount must be a number greater than zero.");
      return;
    }

    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(buildBillingApiPath("/api/billing/manual-fee-payments", tenantSlug), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-myshule-csrf": csrfToken,
        },
        body: JSON.stringify({
          idempotency_key: `finance-quick-${crypto.randomUUID()}`,
          payment_method: paymentDraft.payment_method,
          amount_minor: amountMinor,
          student_id: paymentDraft.student_id.trim() || undefined,
          invoice_id: paymentDraft.invoice_id.trim() || undefined,
          payer_name: paymentDraft.payer_name.trim() || undefined,
          deposit_reference: paymentDraft.reference.trim(),
          external_reference: paymentDraft.reference.trim(),
          metadata: {
            source: "school_finance_quick_entry",
            student_name: paymentDraft.payer_name.trim() || undefined,
          },
        }),
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Payment could not be recorded.");
      }

      setPaymentError(null);
      setFinanceMessage("Payment recorded and posted to finance activity.");
      setPaymentDraft({
        payment_method: "cash",
        student_id: "",
        invoice_id: "",
        payer_name: "",
        amount: "",
        reference: "",
      });
      setSelectedPaymentLearner(null);
      setShowPaymentModal(false);
      await loadFinanceActivity();
      await loadStudentBalances();
      await loadReconciliationReport();
    } catch (caught) {
      setPaymentError(caught instanceof Error ? caught.message : "Payment could not be recorded.");
    }
  }

  const invoiceOptions = activity
    .filter((entry) => entry.kind === "invoice")
    .map((entry) => ({
      id: entry.invoice_id ?? entry.id,
      reference: entry.reference,
      studentId: entry.student_id,
      studentName: entry.student_name,
      amount: formatMinorKes(entry.amount_minor),
      status: entry.status,
    }));
  const filteredInvoiceOptions = invoiceOptions.filter(
    (invoice) => !selectedPaymentLearner || invoice.studentId === selectedPaymentLearner.id,
  );

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        eyebrow="Fees and payments"
        title="Collections desk"
        description="Record payments, generate statements, and keep balances obvious enough for bursars and admins to trust instantly."
        actions={
          <>
            <Button variant="secondary" onClick={openInvoiceModal}>
              Create invoice
            </Button>
            <Button onClick={openPaymentModal}>Record payment</Button>
          </>
        }
      />
      {financeMessage ? (
        <div
          aria-live="polite"
          className="rounded-xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-foreground"
        >
          {financeMessage}
        </div>
      ) : null}
      {!summaryLoading && summaryData ? (
        <MetricGrid
          columns="three"
          items={[
            {
              id: "collections",
              label: "Today Collections",
              value: summaryData.collectionsToday || "KES 0",
              helper: "Ledger activity",
              trend: summaryData.trendLabel || "Stable",
            },
            {
              id: "outstanding",
              label: "Outstanding Invoices",
              value: summaryData.outstandingInvoices || "KES 0",
              helper: "To be collected",
              trend: "Needs review",
            },
            {
              id: "failed",
              label: "Failed Payments",
              value: summaryData.failedPayments || "0",
              helper: "Requires follow-up",
              trend: "Action required",
            },
          ]}
        />
      ) : (
        <MetricGrid items={buildFinanceSummaryItems(activity, activityLoading)} />
      )}
      <SubscriptionLifecyclePanel subscription={subscription} role={role} routeMode={routeMode} tenantSlug={tenantSlug} />
      <section className="space-y-5 rounded-xl border border-border bg-surface px-5 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fee setup</p>
            <h3 className="mt-1 text-lg font-semibold text-foreground">Term billing control</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Build structured fees, then generate controlled invoices for the selected student rows.
            </p>
          </div>
          <Button variant="secondary" onClick={() => void loadFeeStructures()}>
            Refresh
          </Button>
        </div>
        {feeStructureError ? (
          <div role="alert" className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-foreground">
            {feeStructureError}
          </div>
        ) : null}
        {bulkError ? (
          <div role="alert" className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-foreground">
            {bulkError}
          </div>
        ) : null}
        <div className="grid gap-5 xl:grid-cols-2">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-2 text-sm text-foreground md:col-span-2">
                <span className="font-medium">Fee name</span>
                <input
                  aria-label="Fee structure name"
                  className="input-base"
                  value={feeStructureDraft.name}
                  onChange={(event) => {
                    setFeeStructureDraft((current) => ({ ...current, name: event.target.value }));
                    setFeeStructureError(null);
                  }}
                />
              </label>
              <label className="space-y-2 text-sm text-foreground">
                <span className="font-medium">Academic year</span>
                <input
                  aria-label="Fee structure academic year"
                  className="input-base"
                  value={feeStructureDraft.academic_year}
                  onChange={(event) => {
                    setFeeStructureDraft((current) => ({ ...current, academic_year: event.target.value }));
                    setFeeStructureError(null);
                  }}
                />
              </label>
              <label className="space-y-2 text-sm text-foreground">
                <span className="font-medium">Term</span>
                <input
                  aria-label="Fee structure term"
                  className="input-base"
                  value={feeStructureDraft.term}
                  onChange={(event) => {
                    setFeeStructureDraft((current) => ({ ...current, term: event.target.value }));
                    setFeeStructureError(null);
                  }}
                />
              </label>
              <label className="space-y-2 text-sm text-foreground">
                <span className="font-medium">Grade level</span>
                <input
                  aria-label="Fee structure grade level"
                  className="input-base"
                  value={feeStructureDraft.grade_level}
                  onChange={(event) => {
                    setFeeStructureDraft((current) => ({ ...current, grade_level: event.target.value }));
                    setFeeStructureError(null);
                  }}
                />
              </label>
              <label className="space-y-2 text-sm text-foreground">
                <span className="font-medium">Class</span>
                <input
                  aria-label="Fee structure class"
                  className="input-base"
                  value={feeStructureDraft.class_name}
                  onChange={(event) => {
                    setFeeStructureDraft((current) => ({ ...current, class_name: event.target.value }));
                    setFeeStructureError(null);
                  }}
                />
              </label>
              <label className="space-y-2 text-sm text-foreground">
                <span className="font-medium">Status</span>
                <select
                  aria-label="Fee structure status"
                  className="input-base"
                  value={feeStructureDraft.status}
                  onChange={(event) => {
                    setFeeStructureDraft((current) => ({
                      ...current,
                      status: event.target.value as FeeStructureResponse["status"],
                    }));
                    setFeeStructureError(null);
                  }}
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
              <label className="space-y-2 text-sm text-foreground">
                <span className="font-medium">Due days</span>
                <input
                  aria-label="Fee structure due days"
                  className="input-base"
                  inputMode="numeric"
                  value={feeStructureDraft.due_days}
                  onChange={(event) => {
                    setFeeStructureDraft((current) => ({ ...current, due_days: event.target.value }));
                    setFeeStructureError(null);
                  }}
                />
              </label>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">Line items</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setFeeLineItems((current) => [...current, createEmptyFeeLineItemDraft()])}
                >
                  Add line
                </Button>
              </div>
              {feeLineItems.map((item) => (
                <div key={item.id} className="grid gap-2 md:grid-cols-[0.8fr_1.2fr_0.8fr_auto]">
                  <input
                    aria-label="Fee line item code"
                    className="input-base"
                    value={item.code}
                    onChange={(event) => updateFeeLineItem(item.id, "code", event.target.value)}
                  />
                  <input
                    aria-label="Fee line item label"
                    className="input-base"
                    value={item.label}
                    onChange={(event) => updateFeeLineItem(item.id, "label", event.target.value)}
                  />
                  <input
                    aria-label="Fee line item amount"
                    className="input-base"
                    inputMode="decimal"
                    value={item.amount}
                    onChange={(event) => updateFeeLineItem(item.id, "amount", event.target.value)}
                  />
                  <Button size="sm" variant="ghost" onClick={() => removeFeeLineItem(item.id)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <Button onClick={() => void saveFeeStructure()} disabled={feeStructureSaving}>
              {feeStructureSaving ? "Saving fee structure..." : "Save fee structure"}
            </Button>
          </div>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-2 text-sm text-foreground md:col-span-2">
                <span className="font-medium">Fee structure</span>
                <select
                  aria-label="Bulk billing fee structure"
                  className="input-base"
                  value={bulkDraft.fee_structure_id}
                  onChange={(event) => {
                    setBulkDraft((current) => ({ ...current, fee_structure_id: event.target.value }));
                    setBillableStudents([]);
                    setSelectedBulkStudentIds(new Set());
                    setBulkStudents([]);
                    setBulkError(null);
                  }}
                >
                  <option value="">Select fee structure</option>
                  {feeStructures.map((structure) => (
                    <option key={structure.id} value={structure.id}>
                      {structure.name} - {structure.grade_level} {structure.term}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm text-foreground">
                <span className="font-medium">Due date</span>
                <input
                  aria-label="Bulk billing due date"
                  className="input-base"
                  type="date"
                  value={bulkDraft.due_at}
                  onChange={(event) => {
                    setBulkDraft((current) => ({ ...current, due_at: event.target.value }));
                    setBulkError(null);
                  }}
                />
              </label>
              <label className="space-y-2 text-sm text-foreground">
                <span className="font-medium">Batch key</span>
                <input
                  aria-label="Bulk billing idempotency key"
                  className="input-base"
                  value={bulkDraft.idempotency_key}
                  onChange={(event) => {
                    setBulkDraft((current) => ({ ...current, idempotency_key: event.target.value }));
                    setBulkError(null);
                  }}
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => void loadBillableStudentsForSelectedFeeStructure()}
                disabled={billableStudentsLoading}
              >
                {billableStudentsLoading ? "Loading roster" : "Load roster"}
              </Button>
              <Button onClick={() => void generateBulkFeeInvoices()} disabled={!canGenerateBulkInvoices}>
                Generate invoices
              </Button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Selected students</p>
                  <p className="text-xs text-muted-foreground">
                    {bulkStudents.length > 0
                      ? `${bulkStudents.length} selected for invoice generation`
                      : "Select roster learners or add a manual row before generating invoices."}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setBulkStudents((current) => [...current, createEmptyBulkFeeStudentDraft()])}
                >
                  Add student
                </Button>
              </div>
              {bulkStudents.map((student) => (
                <div key={student.id} className="grid gap-2 md:grid-cols-2 xl:grid-cols-[1fr_1fr_0.8fr_0.8fr_0.9fr_auto]">
                  <input
                    aria-label="Bulk billing learner roster key"
                    className="input-base"
                    value={student.student_id}
                    onChange={(event) => updateBulkStudent(student.id, "student_id", event.target.value)}
                  />
                  <input
                    aria-label="Bulk billing student name"
                    className="input-base"
                    value={student.student_name}
                    onChange={(event) => updateBulkStudent(student.id, "student_name", event.target.value)}
                  />
                  <input
                    aria-label="Bulk billing admission number"
                    className="input-base"
                    value={student.admission_number}
                    onChange={(event) => updateBulkStudent(student.id, "admission_number", event.target.value)}
                  />
                  <input
                    aria-label="Bulk billing class"
                    className="input-base"
                    value={student.class_name}
                    onChange={(event) => updateBulkStudent(student.id, "class_name", event.target.value)}
                  />
                  <input
                    aria-label="Bulk billing guardian phone"
                    className="input-base"
                    value={student.guardian_phone}
                    onChange={(event) => updateBulkStudent(student.id, "guardian_phone", event.target.value)}
                  />
                  <Button size="sm" variant="ghost" onClick={() => removeBulkStudent(student.id)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <DataTable
              title="Billable roster"
              subtitle={billableStudentsLoading ? "Loading active students..." : "Active students matched to the selected fee structure."}
              actions={
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{selectedBulkStudentIds.size} selected</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={selectAllVisibleBulkRosterStudents}
                    disabled={billableStudents.length === 0}
                  >
                    Select all visible
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearBulkRosterSelection}
                    disabled={selectedBulkStudentIds.size === 0}
                  >
                    Clear selection
                  </Button>
                </div>
              }
              columns={[
                {
                  id: "select",
                  header: "Select",
                  render: (row) => (
                    <input
                      aria-label={`Select ${row.student_name} for bulk billing`}
                      className="h-4 w-4 rounded border-border text-primary focus-ring"
                      type="checkbox"
                      checked={selectedBulkStudentIds.has(row.student_id)}
                      onChange={() => toggleBulkRosterStudent(row)}
                    />
                  ),
                },
                { id: "student", header: "Student", render: (row) => row.student_name },
                { id: "admission", header: "Admission", render: (row) => row.admission_number },
                {
                  id: "class",
                  header: "Class",
                  render: (row) => `${row.grade_level}${row.class_name ? ` / ${row.class_name}` : ""}`,
                },
                { id: "guardian", header: "Guardian phone", render: (row) => row.guardian_phone ?? "Not set" },
              ]}
              rows={billableStudents}
              getRowKey={(row) => row.student_id}
              emptyMessage={billableStudentsLoading ? "Loading roster students..." : "No roster students loaded for this fee structure."}
            />
          </div>
        </div>
        <DataTable
          title="Fee structures"
          subtitle={feeStructuresLoading ? "Loading fee structures..." : "School fee plans available for bulk billing."}
          columns={[
            { id: "name", header: "Name", render: (row) => row.name },
            {
              id: "scope",
              header: "Scope",
              render: (row) => `${row.academic_year} / ${row.term} / ${row.grade_level}${row.class_name ? ` / ${row.class_name}` : ""}`,
            },
            { id: "items", header: "Items", render: (row) => String(row.line_items.length), className: "text-right", headerClassName: "text-right" },
            { id: "total", header: "Total", render: (row) => formatMinorKes(row.total_amount_minor), className: "text-right font-semibold", headerClassName: "text-right" },
            { id: "due", header: "Due days", render: (row) => String(row.due_days), className: "text-right", headerClassName: "text-right" },
            {
              id: "status",
              header: "Status",
              render: (row) => (
                <StatusPill
                  label={row.status}
                  tone={row.status === "active" ? "ok" : row.status === "draft" ? "warning" : "critical"}
                />
              ),
            },
            {
              id: "actions",
              header: "Actions",
              render: (row) =>
                row.status === "archived" ? (
                  <span className="text-xs text-muted-foreground">Archived</span>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => void archiveFeeStructure(row)}>
                    Archive
                  </Button>
                ),
            },
          ]}
          rows={feeStructures}
          getRowKey={(row) => row.id}
          emptyMessage={feeStructuresLoading ? "Loading fee structures..." : "No fee structures have been created yet."}
        />
      </section>
      <section className="space-y-5 rounded-xl border border-border bg-surface px-5 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reconciliation</p>
            <h3 className="mt-1 text-lg font-semibold text-foreground">Accountant collection control</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Match cleared collections, pending bank work, and exception receipts across payment channels.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-5">
            <input
              aria-label="Reconciliation from date"
              className="input-base"
              type="date"
              value={reconciliationFilters.from}
              onChange={(event) =>
                setReconciliationFilters((current) => ({ ...current, from: event.target.value }))
              }
            />
            <input
              aria-label="Reconciliation to date"
              className="input-base"
              type="date"
              value={reconciliationFilters.to}
              onChange={(event) =>
                setReconciliationFilters((current) => ({ ...current, to: event.target.value }))
              }
            />
            <select
              aria-label="Reconciliation payment method"
              className="input-base"
              value={reconciliationFilters.method}
              onChange={(event) =>
                setReconciliationFilters((current) => ({
                  ...current,
                  method: event.target.value as ManualReceiptMethod | "all",
                }))
              }
            >
              <option value="all">All methods</option>
              {Object.entries(manualReceiptMethodLabels).map(([method, label]) => (
                <option key={method} value={method}>
                  {label}
                </option>
              ))}
            </select>
            <Button variant="secondary" onClick={() => void loadReconciliationReport()}>
              Run
            </Button>
            <Button onClick={() => void exportReconciliationReport()}>
              Export
            </Button>
          </div>
        </div>
        {reconciliationError ? (
          <div role="alert" className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-foreground">
            {reconciliationError}
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-surface-strong p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cleared</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {reconciliationLoading ? "Loading" : formatMinorKes(reconciliation?.totals.cleared_amount_minor ?? "0")}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface-strong p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pending</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {reconciliationLoading ? "Loading" : formatMinorKes(reconciliation?.totals.pending_amount_minor ?? "0")}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface-strong p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Exceptions</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {reconciliationLoading ? "Loading" : formatMinorKes(reconciliation?.totals.exception_amount_minor ?? "0")}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface-strong p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Transactions</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {reconciliationLoading ? "Loading" : String(reconciliation?.totals.transaction_count ?? 0)}
            </p>
          </div>
        </div>
        <DataTable
          title="Method summary"
          subtitle={reconciliationLoading ? "Loading channel totals..." : "Cleared, pending, and exception totals by collection channel."}
          columns={[
            { id: "method", header: "Method", render: (row) => manualReceiptMethodLabels[row.payment_method] },
            { id: "count", header: "Count", render: (row) => String(row.transaction_count), className: "text-right", headerClassName: "text-right" },
            { id: "cleared", header: "Cleared", render: (row) => formatMinorKes(row.cleared_amount_minor), className: "text-right", headerClassName: "text-right" },
            { id: "pending", header: "Pending", render: (row) => formatMinorKes(row.pending_amount_minor), className: "text-right", headerClassName: "text-right" },
            { id: "exceptions", header: "Exceptions", render: (row) => formatMinorKes(row.exception_amount_minor), className: "text-right", headerClassName: "text-right" },
          ]}
          rows={reconciliation?.method_summaries ?? []}
          getRowKey={(row) => row.payment_method}
          emptyMessage={reconciliationLoading ? "Loading reconciliation method totals..." : "No method totals for this period."}
        />
        <DataTable
          title="Reconciliation register"
          subtitle={reconciliationLoading ? "Loading receipt register..." : "Receipt-level accountant control for the selected period."}
          columns={[
            { id: "occurred", header: "Occurred", render: (row) => formatActivityDate(row.occurred_at) },
            { id: "receipt", header: "Receipt", render: (row) => row.receipt_number },
            { id: "method", header: "Method", render: (row) => manualReceiptMethodLabels[row.payment_method] },
            { id: "amount", header: "Amount", render: (row) => formatMinorKes(row.amount_minor), className: "text-right font-semibold", headerClassName: "text-right" },
            { id: "reference", header: "Reference", render: (row) => row.reference },
            { id: "ledger", header: "Ledger", render: (row) => row.ledger_transaction_id ?? row.reversal_ledger_transaction_id ?? "Pending" },
            {
              id: "bucket",
              header: "Bucket",
              render: (row) => (
                <StatusPill
                  label={row.reconciliation_bucket}
                  tone={financeReconciliationBucketTone[row.reconciliation_bucket]}
                />
              ),
            },
          ]}
          rows={reconciliation?.rows ?? []}
          getRowKey={(row) => row.payment_id}
          emptyMessage={reconciliationLoading ? "Loading reconciliation receipts..." : "No receipts match this reconciliation period."}
        />
      </section>
      <DataTable
        title="Payment history"
        subtitle={activityLoading ? "Loading persisted finance activity..." : "Invoices and ledger-backed receipts from the live billing system."}
        columns={[
          { id: "student", header: "Student", render: (row) => row.student },
          { id: "amount", header: "Amount", render: (row) => row.amount, className: "text-right font-semibold", headerClassName: "text-right" },
          { id: "method", header: "Method", render: (row) => row.method },
          { id: "date", header: "Date", render: (row) => row.date },
          { id: "reference", header: "Reference", render: (row) => row.reference },
          { id: "status", header: "Status", render: (row) => <StatusPill label={row.status} tone={row.statusTone} /> },
        ]}
        rows={rows}
        getRowKey={(row) => row.id}
        emptyMessage={activityLoading ? "Loading finance activity..." : "No finance activity has been posted yet."}
      />
      <DataTable
        title="Student balances"
        subtitle={balancesLoading ? "Loading persisted student statements..." : "Outstanding balances from live invoices, cleared allocations, and unapplied credits."}
        columns={[
          {
            id: "student",
            header: "Student",
            render: (row) => row.student_name ?? row.student_id,
          },
          {
            id: "invoiced",
            header: "Invoiced",
            render: (row) => formatMinorKes(row.invoiced_amount_minor),
            className: "text-right",
            headerClassName: "text-right",
          },
          {
            id: "paid",
            header: "Paid",
            render: (row) => formatMinorKes(row.paid_amount_minor),
            className: "text-right",
            headerClassName: "text-right",
          },
          {
            id: "credit",
            header: "Credit",
            render: (row) => formatMinorKes(row.credit_amount_minor),
            className: "text-right",
            headerClassName: "text-right",
          },
          {
            id: "balance",
            header: "Balance",
            render: (row) => formatMinorKes(row.balance_amount_minor),
            className: "text-right font-semibold",
            headerClassName: "text-right",
          },
          {
            id: "invoiceCount",
            header: "Invoices",
            render: (row) => String(row.invoice_count),
            className: "text-right",
            headerClassName: "text-right",
          },
          {
            id: "lastActivity",
            header: "Last activity",
            render: (row) => (row.last_activity_at ? formatActivityDate(row.last_activity_at) : "No activity"),
          },
          {
            id: "actions",
            header: "Actions",
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => void openStudentStatement(row)}>
                  View
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void exportStudentStatement(row.student_id)}>
                  Export
                </Button>
              </div>
            ),
          },
        ]}
        rows={balances}
        getRowKey={(row) => row.student_id}
        emptyMessage={balancesLoading ? "Loading student balances..." : "No student balances have been created yet."}
      />
      <Modal
        open={Boolean(statement || statementLoading || statementError)}
        title={statement ? `${statement.summary.student_name ?? statement.summary.student_id} fee statement` : "Student statement"}
        description="Invoice debits, receipt credits, pending payments, and running balance from persisted billing records."
        onClose={closeStatementModal}
        footer={
          <>
            <Button variant="secondary" onClick={closeStatementModal}>
              Close
            </Button>
            {statement ? (
              <Button onClick={() => void exportStudentStatement(statement.summary.student_id)}>
                Export CSV
              </Button>
            ) : null}
          </>
        }
      >
        <div className="space-y-5">
          {statementError ? (
            <div role="alert" className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-foreground">
              {statementError}
            </div>
          ) : null}
          {statementLoading ? (
            <div className="rounded-xl border border-border bg-surface-strong px-4 py-3 text-sm text-muted-foreground">
              Loading statement activity...
            </div>
          ) : null}
          {statement ? (
            <>
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-border bg-surface-strong p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Invoiced</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{formatMinorKes(statement.summary.invoiced_amount_minor)}</p>
                </div>
                <div className="rounded-xl border border-border bg-surface-strong p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Paid</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{formatMinorKes(statement.summary.paid_amount_minor)}</p>
                </div>
                <div className="rounded-xl border border-border bg-surface-strong p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Credit</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{formatMinorKes(statement.summary.credit_amount_minor)}</p>
                </div>
                <div className="rounded-xl border border-border bg-surface-strong p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Balance</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{formatMinorKes(statement.summary.balance_amount_minor)}</p>
                </div>
              </div>
              <DataTable
                title="Statement activity"
                subtitle="Running balance from invoice debits and receipt credits."
                columns={[
                  { id: "date", header: "Date", render: (row) => formatActivityDate(row.occurred_at) },
                  { id: "type", header: "Type", render: (row) => row.kind },
                  { id: "reference", header: "Reference", render: (row) => row.reference },
                  { id: "description", header: "Description", render: (row) => row.description },
                  {
                    id: "debit",
                    header: "Debit",
                    render: (row) => formatMinorKes(row.debit_amount_minor),
                    className: "text-right",
                    headerClassName: "text-right",
                  },
                  {
                    id: "credit",
                    header: "Credit",
                    render: (row) => formatMinorKes(row.credit_amount_minor),
                    className: "text-right",
                    headerClassName: "text-right",
                  },
                  {
                    id: "balance",
                    header: "Balance",
                    render: (row) => formatMinorKes(row.balance_after_minor),
                    className: "text-right font-semibold",
                    headerClassName: "text-right",
                  },
                  {
                    id: "status",
                    header: "Status",
                    render: (row) => <StatusPill label={row.status.replace("_", " ")} tone={getStatementEntryTone(row)} />,
                  },
                ]}
                rows={statement.entries}
                getRowKey={(row) => row.id}
                emptyMessage="No statement activity found."
              />
            </>
          ) : null}
        </div>
      </Modal>
      <Modal
        open={showInvoiceModal}
        title="Create invoice"
        description="Generate a new fee invoice that appears in the collections desk immediately."
        onClose={closeInvoiceModal}
        footer={
          <>
            <Button variant="secondary" onClick={closeInvoiceModal}>
              Cancel
            </Button>
            <Button onClick={saveInvoice}>Create invoice</Button>
          </>
        }
      >
        <div className="space-y-4">
          {invoiceError ? (
            <div role="alert" className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-foreground">
              {invoiceError}
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <LearnerPicker
              label="Learner"
              tenantSlug={tenantSlug ?? ""}
              value={selectedInvoiceLearner}
              onChange={(learner) => {
                setSelectedInvoiceLearner(learner);
                setInvoiceDraft((current) => ({
                  ...current,
                  studentId: learner?.id ?? "",
                  studentName: learner?.name ?? "",
                }));
                setInvoiceError(null);
              }}
              hint="Search name or admission number, then enter the invoice amount."
            />
          </div>
          <label className="space-y-2 text-sm text-foreground">
            <span className="font-medium">Student name</span>
            <input
              aria-label="Invoice student"
              value={invoiceDraft.studentName}
              onChange={(event) => {
                setInvoiceDraft((current) => ({ ...current, studentName: event.target.value }));
                setInvoiceError(null);
              }}
              className="input-base"
              placeholder="Learner full name"
            />
          </label>
          <label className="space-y-2 text-sm text-foreground">
            <span className="font-medium">Amount</span>
            <input
              aria-label="Invoice amount"
              value={invoiceDraft.amount}
              onChange={(event) => {
                setInvoiceDraft((current) => ({ ...current, amount: event.target.value }));
                setInvoiceError(null);
              }}
              className="input-base"
              inputMode="numeric"
              placeholder="Amount in KES"
            />
          </label>
          <label className="space-y-2 text-sm text-foreground md:col-span-2">
            <span className="font-medium">Due date</span>
            <input
              aria-label="Invoice due date"
              value={invoiceDraft.dueAt}
              onChange={(event) => {
                setInvoiceDraft((current) => ({ ...current, dueAt: event.target.value }));
                setInvoiceError(null);
              }}
              className="input-base"
              type="date"
            />
          </label>
        </div>
        </div>
      </Modal>
      <Modal
        open={showPaymentModal}
        title="Record payment"
        description="Post a payment reference straight into the fee history ledger."
        onClose={closePaymentModal}
        footer={
          <>
            <Button variant="secondary" onClick={closePaymentModal}>
              Cancel
            </Button>
            <Button onClick={savePayment}>Save payment</Button>
          </>
        }
      >
        <div className="space-y-4">
          {paymentError ? (
            <div role="alert" className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-foreground">
              {paymentError}
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-foreground">
            <span className="font-medium">Method</span>
            <select
              aria-label="Payment method"
              value={paymentDraft.payment_method}
              onChange={(event) => {
                setPaymentDraft((current) => ({
                  ...current,
                  payment_method: event.target.value as ManualReceiptMethod,
                }));
                setPaymentError(null);
              }}
              className="input-base"
            >
              {manualReceiptSelectableMethods
                .filter((method) => method !== "cheque")
                .map((method) => (
                  <option key={method} value={method}>
                    {manualReceiptMethodLabels[method]}
                  </option>
                ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-foreground">
            <span className="font-medium">Amount</span>
            <input
              aria-label="Payment amount"
              value={paymentDraft.amount}
              onChange={(event) => {
                setPaymentDraft((current) => ({ ...current, amount: event.target.value }));
                setPaymentError(null);
              }}
              className="input-base"
              inputMode="numeric"
              placeholder="Amount in KES"
            />
          </label>
          <div className="space-y-2 text-sm text-foreground">
            <LearnerPicker
              label="Payment student or admission number"
              tenantSlug={tenantSlug ?? ""}
              value={selectedPaymentLearner}
              onChange={(learner) => {
                setSelectedPaymentLearner(learner);
                setPaymentDraft((current) => ({
                  ...current,
                  student_id: learner?.id ?? "",
                }));
                setPaymentError(null);
              }}
            />
          </div>
          <label className="space-y-2 text-sm text-foreground">
            <span className="font-medium">Select invoice</span>
            <select
              aria-label="Payment invoice"
              value={paymentDraft.invoice_id}
              onChange={(event) => {
                setPaymentDraft((current) => ({ ...current, invoice_id: event.target.value }));
                setPaymentError(null);
              }}
              className="input-base"
            >
              <option value="">Match automatically or select invoice</option>
              {filteredInvoiceOptions.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.reference} - {invoice.studentName ?? "Learner"} - {invoice.amount}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-foreground md:col-span-2">
            <span className="font-medium">Payer name</span>
            <input
              aria-label="Payment payer name"
              value={paymentDraft.payer_name}
              onChange={(event) => {
                setPaymentDraft((current) => ({ ...current, payer_name: event.target.value }));
                setPaymentError(null);
              }}
              className="input-base"
              placeholder="Parent or payer name"
            />
          </label>
          <label className="space-y-2 text-sm text-foreground md:col-span-2">
            <span className="font-medium">Reference</span>
            <input
              aria-label="Payment reference"
              value={paymentDraft.reference}
              onChange={(event) => {
                setPaymentDraft((current) => ({ ...current, reference: event.target.value }));
                setPaymentError(null);
              }}
              className="input-base"
              placeholder="Payment reference"
            />
          </label>
        </div>
        </div>
      </Modal>
    </div>
  );
}


function unwrapApiData<T>(
  payload: T | { data?: T; message?: string } | { message?: string } | null | undefined,
): T | null {
  if (isRecord(payload) && "data" in payload) {
    return payload.data === undefined ? null : payload.data as T;
  }

  return payload === undefined ? null : payload as T;
}

function getApiResponseMessage(payload: unknown): string | null {
  if (!isRecord(payload) || typeof payload.message !== "string") {
    return null;
  }

  return payload.message;
}

function buildBillingApiPath(path: string, tenantSlug?: string | null) {
  if (!tenantSlug) {
    return path;
  }

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}tenantSlug=${encodeURIComponent(tenantSlug)}`;
}

function buildPaymentsApiPath(path: string, tenantSlug?: string | null) {
  if (!tenantSlug) {
    return path;
  }

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}tenantSlug=${encodeURIComponent(tenantSlug)}`;
}



function SchoolCommunicationPage({
  role,
  tenantSlug,
}: {
  role: SchoolExperienceRole;
  tenantSlug?: string | null;
}) {
  const { model } = getSchoolWorkspace(role, tenantSlug);
  const [history, setHistory] = useState(model.communication.history);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [audience, setAudience] = useState("All parents");
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [smsError, setSmsError] = useState<string | null>(null);
  const [smsMessage, setSmsMessage] = useState<string | null>(null);
  const [smsWallet, setSmsWallet] = useState<{
    sms_balance: number;
    monthly_used: number;
    monthly_limit: number | null;
    sms_plan: string;
    low_balance: boolean;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSmsWallet() {
      try {
        const response = await fetch("/api/school/sms/wallet", {
          method: "GET",
          credentials: "same-origin",
        });

        if (!response.ok) return;
        const payload = (await response.json()) as typeof smsWallet;

        if (!cancelled) {
          setSmsWallet(payload);
        }
      } catch {
        if (!cancelled) {
          setSmsWallet(null);
        }
      }
    }

    void loadSmsWallet();

    return () => {
      cancelled = true;
    };
  }, []);

  function openSmsModal() {
    setAudience("All parents");
    setRecipient("");
    setMessage("");
    setSmsError(null);
    setShowSmsModal(true);
  }

  function closeSmsModal() {
    setShowSmsModal(false);
    setSmsError(null);
  }

  async function sendSms() {
    const validationError = getMissingFieldError([
      { label: "Audience", value: audience },
      { label: "Recipient phone", value: recipient },
      { label: "Message", value: message },
    ]);

    if (validationError) {
      setSmsError(validationError);
      return;
    }

    const trimmedAudience = audience.trim();
    const trimmedRecipient = recipient.trim();
    const trimmedMessage = message.trim();

    try {
      const response = await fetch("/api/sms/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-myshule-csrf": await getCsrfToken(),
        },
        credentials: "same-origin",
        body: JSON.stringify({
          recipient: trimmedRecipient,
          message: trimmedMessage,
          message_type: "school_communication",
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { balance_after?: number; credit_cost?: number; message?: string }
        | null;

      if (!response.ok) {
        setSmsError(payload?.message ?? "SMS balance exhausted");
        return;
      }

      if (typeof payload?.balance_after === "number") {
        const balanceAfter = payload.balance_after;
        const creditCost = payload.credit_cost ?? 1;
        setSmsWallet((current) =>
          current
            ? {
                ...current,
                sms_balance: balanceAfter,
                monthly_used: current.monthly_used + creditCost,
                low_balance: balanceAfter <= 100,
              }
            : current,
        );
      }
    } catch (error) {
      setSmsError(error instanceof Error ? error.message : "Unable to send SMS right now.");
      return;
    }

    setHistory((currentRows) => [
      {
        id: `sms-${Date.now()}`,
        audience: trimmedAudience,
        message: trimmedMessage,
        sentAt: "Queued now",
        status: "Queued",
        statusTone: "warning",
      },
      ...currentRows,
    ]);
    setSmsError(null);
    setSmsMessage(`SMS queued for ${trimmedAudience}.`);
    setMessage("");
    setShowSmsModal(false);
  }

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        eyebrow="Communication"
        title="School messaging"
        description="Announcements, fee reminders, class updates, and SMS history in one straightforward section."
        actions={<Button onClick={openSmsModal}>Send SMS</Button>}
      />
      {smsMessage ? (
        <div
          aria-live="polite"
          className="rounded-xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-foreground"
        >
          {smsMessage}
        </div>
      ) : null}
      <MetricGrid
        items={(smsWallet
          ? [
              {
                id: "sms-balance",
                label: "SMS balance",
                value: smsWallet.sms_balance.toLocaleString(),
                helper: smsWallet.low_balance ? "Low balance threshold reached" : `${smsWallet.sms_plan} plan`,
              },
              {
                id: "sms-used",
                label: "Sent this month",
                value: smsWallet.monthly_used.toLocaleString(),
                helper: smsWallet.monthly_limit ? `${smsWallet.monthly_limit.toLocaleString()} monthly limit` : "No monthly limit",
              },
            ]
          : model.communication.summary
        ).map((item) => ({
          id: item.id,
          label: item.label,
          value: item.value,
          helper: item.helper,
        }))}
      />
      <DataTable
        title="SMS history"
        subtitle="Messages queued or already delivered to parents, class groups, or balance follow-up lists."
        columns={[
          { id: "audience", header: "Audience", render: (row) => row.audience },
          { id: "message", header: "Message", render: (row) => row.message },
          { id: "sentAt", header: "Queued", render: (row) => row.sentAt },
          { id: "status", header: "Status", render: (row) => <StatusPill label={row.status} tone={row.statusTone} /> },
        ]}
        rows={history}
        getRowKey={(row) => row.id}
      />
      <Modal
        open={showSmsModal}
        title="Send SMS"
        description="Compose a school message and add it to the communication queue log."
        onClose={closeSmsModal}
        footer={
          <>
            <Button variant="secondary" onClick={closeSmsModal}>
              Cancel
            </Button>
            <Button onClick={sendSms}>Send SMS</Button>
          </>
        }
      >
        <div className="space-y-4">
          {smsError ? (
            <div role="alert" className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-foreground">
              {smsError}
            </div>
          ) : null}
          <label className="space-y-2 text-sm text-foreground">
            <span className="font-medium">Audience</span>
            <input
              aria-label="Audience"
              value={audience}
              onChange={(event) => {
                setAudience(event.target.value);
                setSmsError(null);
              }}
              className="input-base"
              placeholder="All parents"
            />
          </label>
          <label className="space-y-2 text-sm text-foreground">
            <span className="font-medium">Recipient phone</span>
            <input
              aria-label="Recipient phone"
              value={recipient}
              onChange={(event) => {
                setRecipient(event.target.value);
                setSmsError(null);
              }}
              className="input-base"
              placeholder="+254700000000"
            />
          </label>
          <label className="space-y-2 text-sm text-foreground">
            <span className="font-medium">Message</span>
            <textarea
              aria-label="Message"
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
                setSmsError(null);
              }}
              className="input-base min-h-28"
              placeholder="Fee reminder or school notice"
            />
          </label>
        </div>
      </Modal>
    </div>
  );
}

function DarajaIntegrationSettings() {
  const [form, setForm] = useState({
    paybill_number: "",
    till_number: "",
    shortcode: "",
    consumer_key: "",
    consumer_secret: "",
    passkey: "",
    environment: "sandbox",
  });
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [masked, setMasked] = useState<{
    consumer_key_masked?: string | null;
    consumer_secret_masked?: string | null;
    passkey_masked?: string | null;
    callback_url?: string | null;
    last_test_status?: string | null;
    is_active?: boolean;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDaraja() {
      try {
        const response = await fetch("/api/integrations/daraja", {
          method: "GET",
          credentials: "same-origin",
        });

        if (!response.ok) return;
        const payload = (await response.json()) as typeof masked & {
          paybill_number?: string | null;
          till_number?: string | null;
          shortcode?: string | null;
          environment?: string;
        };

        if (!cancelled && payload) {
          setMasked(payload);
          setForm((current) => ({
            ...current,
            paybill_number: payload.paybill_number ?? "",
            till_number: payload.till_number ?? "",
            shortcode: payload.shortcode ?? "",
            environment: payload.environment ?? current.environment,
          }));
        }
      } catch {
        if (!cancelled) setMasked(null);
      }
    }

    void loadDaraja();

    return () => {
      cancelled = true;
    };
  }, []);

  async function saveDaraja() {
    setError(null);
    setStatus(null);

    try {
      const response = await fetch("/api/integrations/daraja", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-myshule-csrf": await getCsrfToken(),
        },
        credentials: "same-origin",
        body: JSON.stringify({
          ...form,
          is_active: false,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | (typeof masked & { message?: string })
        | null;

      if (!response.ok) {
        setError(payload?.message ?? "Unable to save Daraja settings.");
        return;
      }

      setMasked(payload);
      setStatus("Daraja credentials saved securely. Secrets are masked after save.");
      setForm((current) => ({
        ...current,
        consumer_key: "",
        consumer_secret: "",
        passkey: "",
      }));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save Daraja settings.");
    }
  }

  async function testDaraja() {
    setError(null);
    setStatus(null);

    try {
      const response = await fetch(`/api/integrations/daraja/test?environment=${encodeURIComponent(form.environment)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-myshule-csrf": await getCsrfToken(),
        },
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => null)) as { message?: string; status?: string } | null;

      if (!response.ok) {
        setError(payload?.message ?? "Daraja test failed.");
        return;
      }

      setStatus("Daraja connection test passed.");
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : "Daraja test failed.");
    }
  }

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-muted">M-PESA Daraja</p>
          <h3 className="mt-1 text-lg font-semibold text-foreground">School-owned payment integration</h3>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Schools keep their own paybill or till credentials. My Shule only reconciles callbacks and receipts.
          </p>
        </div>
        <StatusPill
          label={masked?.is_active ? "Active" : masked?.last_test_status === "ok" ? "Tested" : "Setup pending"}
          tone={masked?.is_active || masked?.last_test_status === "ok" ? "ok" : "warning"}
        />
      </div>
      {status ? <AuthLikeNotice tone="success" message={status} /> : null}
      {error ? <AuthLikeNotice tone="error" message={error} /> : null}
      <div className="grid gap-3 md:grid-cols-3">
        {[
          ["Paybill number", "paybill_number"],
          ["Till number", "till_number"],
          ["Shortcode", "shortcode"],
          ["Consumer key", "consumer_key"],
          ["Consumer secret", "consumer_secret"],
          ["Passkey", "passkey"],
        ].map(([label, key]) => (
          <label key={key} className="space-y-2 text-sm text-foreground">
            <span className="font-medium">{label}</span>
            <input
              aria-label={label}
              className="input-base"
              value={form[key as keyof typeof form]}
              placeholder={
                key === "consumer_key"
                  ? masked?.consumer_key_masked ?? ""
                  : key === "consumer_secret"
                    ? masked?.consumer_secret_masked ?? ""
                    : key === "passkey"
                      ? masked?.passkey_masked ?? ""
                      : ""
              }
              type={key.includes("secret") || key === "passkey" ? "password" : "text"}
              onChange={(event) =>
                setForm((current) => ({ ...current, [key]: event.target.value }))
              }
            />
          </label>
        ))}
        <label className="space-y-2 text-sm text-foreground">
          <span className="font-medium">Environment</span>
          <select
            aria-label="Daraja environment"
            className="input-base"
            value={form.environment}
            onChange={(event) => setForm((current) => ({ ...current, environment: event.target.value }))}
          >
            <option value="sandbox">Sandbox</option>
            <option value="production">Production</option>
          </select>
        </label>
      </div>
      {masked?.callback_url ? (
        <div className="rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-muted">
          Callback URL: <span className="font-mono text-foreground">{masked.callback_url}</span>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button onClick={saveDaraja}>Save credentials</Button>
        <Button variant="secondary" onClick={testDaraja}>Test Daraja connection</Button>
      </div>
    </Card>
  );
}

function AuthLikeNotice({ tone, message }: { tone: "success" | "error"; message: string }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl border px-4 py-3 text-sm ${
        tone === "success"
          ? "border-success/20 bg-success/10 text-foreground"
          : "border-danger/20 bg-danger/10 text-foreground"
      }`}
    >
      {message}
    </div>
  );
}

function ModuleDisabledPanel({
  section,
  role,
  routeMode,
}: {
  section: string;
  role: SchoolExperienceRole;
  routeMode: SchoolRouteMode;
}) {
  const requiredModule = getModuleCodeForSchoolSection(section, role);

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        eyebrow="Module access"
        title="Module not enabled for your school"
        description="This section is controlled by the platform Super Admin. Existing records stay preserved and become visible again when the module is re-enabled."
        actions={
          <Link href={buildSchoolSectionHref(role, "dashboard", routeMode)}>
            <Button variant="secondary">Back to dashboard</Button>
          </Link>
        }
      />
      <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {schoolSectionLabels[section] ?? "Requested module"}
            </p>
            <p className="mt-1 text-sm text-muted">
              Required module code: {requiredModule ?? "core section"}
            </p>
          </div>
          <StatusPill label="Disabled by Superadmin" tone="warning" />
        </div>
      </Card>
    </div>
  );
}

function ModuleAccessVerifyingPanel({
  section,
  role,
}: {
  section: string;
  role: SchoolExperienceRole;
}) {
  const requiredModule = getModuleCodeForSchoolSection(section, role);

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        eyebrow="Access control"
        title="Verifying module access"
        description="MyShule is confirming school access, enabled modules, assigned permissions, and section visibility before opening this page."
      />
      <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {schoolSectionLabels[section] ?? "Requested section"}
            </p>
            <p className="mt-1 text-sm text-muted">
              Required module code: {requiredModule ?? "core section"}
            </p>
          </div>
          <StatusPill label="Access sync" tone="warning" />
        </div>
      </Card>
    </div>
  );
}

type LabsAttendanceRow = {
  id: string;
  student: string;
  className: string;
  status: string;
  tone: "ok" | "warning" | "critical";
};

function LabsOperationsPage() {
  const [attendanceRows, setAttendanceRows] = useState<LabsAttendanceRow[]>([
    { id: "lab-att-1", student: "Awaiting class register", className: "Grade 9 Blue", status: "Not marked", tone: "warning" as const },
    { id: "lab-att-2", student: "Class stream register", className: "Form 2 East", status: "Not marked", tone: "warning" as const },
  ]);

  function markMandatoryAttendance() {
    setAttendanceRows((rows) =>
      rows.map((row) => ({
        ...row,
        status: "Present",
        tone: "ok" as const,
      })),
    );
  }

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        eyebrow="Laboratories"
        title="Laboratory operations"
        description="Departments, sessions, mandatory attendance, equipment issuing, chemical safety, and reconciliation in one school-safe page."
        actions={<Button onClick={markMandatoryAttendance}>Mark attendance</Button>}
      />
      <MetricGrid
        items={[
          { id: "scheduled", label: "Scheduled sessions", value: "0", helper: "Create sessions from the lab API" },
          { id: "attendance", label: "Attendance required", value: "Mandatory", helper: "Completion is blocked until marking is done" },
          { id: "chemicals", label: "Expired chemicals", value: "Blocked", helper: "Unsafe batches cannot be issued" },
          { id: "returns", label: "Open reconciliations", value: "0", helper: "Returned equipment is tracked per session" },
        ]}
      />
      <Tabs
        items={[
          {
            id: "sessions",
            label: "Sessions",
            panel: (
              <DataTable
                title="Lab sessions"
                subtitle="Every session is linked to a lab, class, subject, teacher, and attendance register."
                columns={[
                  { id: "subject", header: "Subject", render: (row) => row.subject },
                  { id: "className", header: "Class", render: (row) => row.className },
                  { id: "lab", header: "Lab", render: (row) => row.lab },
                  { id: "status", header: "Status", render: (row) => <StatusPill label={row.status} tone={row.tone} /> },
                ]}
                rows={[
                  { id: "session-1", subject: "Chemistry practical", className: "Form 3", lab: "Chemistry Lab 1", status: "Ready to schedule", tone: "warning" as const },
                  { id: "session-2", subject: "ICT project", className: "Grade 8", lab: "ICT Lab", status: "No conflicts", tone: "ok" as const },
                ]}
                getRowKey={(row) => row.id}
              />
            ),
          },
          {
            id: "attendance",
            label: "Attendance",
            panel: (
              <DataTable
                title="Mandatory lab attendance"
                subtitle="Absent, late, and excused records are traceable to the lab session."
                columns={[
                  { id: "student", header: "Learner", render: (row) => row.student },
                  { id: "className", header: "Class", render: (row) => row.className },
                  { id: "status", header: "Status", render: (row) => <StatusPill label={row.status} tone={row.tone} /> },
                ]}
                rows={attendanceRows}
                getRowKey={(row) => row.id}
              />
            ),
          },
          {
            id: "inventory",
            label: "Equipment",
            panel: (
              <DataTable
                title="Equipment issue register"
                subtitle="Quantity issued, returned, damaged, and reconciled are recorded per session."
                columns={[
                  { id: "name", header: "Equipment", render: (row) => row.name },
                  { id: "department", header: "Department", render: (row) => row.department },
                  { id: "available", header: "Available", render: (row) => row.available, className: "text-right", headerClassName: "text-right" },
                  { id: "condition", header: "Condition", render: (row) => <StatusPill label={row.condition} tone={row.tone} /> },
                ]}
                rows={[
                  { id: "eq-1", name: "Microscope", department: "Biology", available: "12", condition: "Serviceable", tone: "ok" as const },
                  { id: "eq-2", name: "Bunsen burner", department: "Chemistry", available: "18", condition: "Reconcile returns", tone: "warning" as const },
                ]}
                getRowKey={(row) => row.id}
              />
            ),
          },
          {
            id: "chemicals",
            label: "Chemicals",
            panel: (
              <DataTable
                title="Chemical batch safety"
                subtitle="Expired and quarantined chemicals cannot be issued; disposal requires HOD approval."
                columns={[
                  { id: "name", header: "Chemical", render: (row) => row.name },
                  { id: "batch", header: "Batch", render: (row) => row.batch },
                  { id: "hazard", header: "Hazard", render: (row) => row.hazard },
                  { id: "status", header: "Status", render: (row) => <StatusPill label={row.status} tone={row.tone} /> },
                ]}
                rows={[
                  { id: "chem-1", name: "Hydrochloric acid", batch: "HCL-2026-01", hazard: "Corrosive", status: "Active", tone: "ok" as const },
                  { id: "chem-2", name: "Ethanol", batch: "ETH-2025-04", hazard: "Flammable", status: "Near expiry", tone: "warning" as const },
                ]}
                getRowKey={(row) => row.id}
              />
            ),
          },
        ]}
      />
    </div>
  );
}

function TeacherBiometricAttendancePage() {
  return (
    <div className="space-y-6">
      <SchoolPageHeader
        eyebrow="Teacher attendance"
        title="Biometric attendance"
        description="Biometric scans are the source of truth, with offline device sync, duplicate event protection, and principal-only audited overrides."
      />
      <MetricGrid
        items={[
          { id: "devices", label: "Registered devices", value: "0", helper: "Devices appear after enrollment" },
          { id: "offline", label: "Offline queue", value: "0", helper: "Scans sync when connectivity returns" },
          { id: "late", label: "Late threshold", value: "7:40 AM", helper: "Start time plus grace period" },
          { id: "cutoff", label: "Absence cutoff", value: "9:00 AM", helper: "Configurable per school" },
        ]}
      />
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <DataTable
          title="Scan feed"
          subtitle="Append-only attendance events from registered school devices."
          columns={[
            { id: "teacher", header: "Teacher", render: (row) => row.teacher },
            { id: "device", header: "Device", render: (row) => row.device },
            { id: "time", header: "Time", render: (row) => row.time },
            { id: "status", header: "Status", render: (row) => <StatusPill label={row.status} tone={row.tone} /> },
          ]}
          rows={[
            { id: "scan-1", teacher: "No live scan yet", device: "Gate device", time: "Awaiting sync", status: "Ready", tone: "ok" as const },
            { id: "scan-2", teacher: "Offline device queue", device: "Staff room", time: "0 pending", status: "Synced", tone: "ok" as const },
          ]}
          getRowKey={(row) => row.id}
        />
        <SimpleListCard
          title="Attendance rule engine"
          subtitle="Rules are school-specific and recorded when changed."
          items={[
            { id: "rule-1", title: "Late detection", subtitle: "After default start time plus grace period.", value: "Active" },
            { id: "rule-2", title: "Half-day detection", subtitle: "Missing checkout is treated as half-day review.", value: "Active" },
            { id: "rule-3", title: "Duplicate prevention", subtitle: "Event hashes are ignored after first sync.", value: "Active" },
          ]}
        />
      </div>
    </div>
  );
}

function metricNumber(value: number | string | undefined) {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

function formatInsightValue(value: number | string | undefined, unit?: string) {
  if (unit === "KES cents") {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }).format(metricNumber(value) / 100);
  }

  if (unit === "%") {
    return `${metricNumber(value).toFixed(0)}%`;
  }

  if (typeof value === "number") {
    return new Intl.NumberFormat("en-KE").format(value);
  }

  return value ?? "0";
}

function ClinicOperationsPage({
  tenantSlug,
  liveDataEnabled = true,
}: {
  tenantSlug?: string | null;
  liveDataEnabled?: boolean;
}) {
  const [analytics, setAnalytics] = useState<ClinicAnalyticsResponse | null>(null);
  const [medicines, setMedicines] = useState<ClinicMedicineResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!liveDataEnabled) {
      return () => {
        cancelled = true;
      };
    }

    async function loadClinic() {
      try {
        const query = tenantSlug ? `?tenantSlug=${encodeURIComponent(tenantSlug)}` : "";
        const [analyticsResponse, medicinesResponse] = await Promise.all([
          fetch(`/api/clinic/analytics/principal${query}`, { credentials: "same-origin", cache: "no-store" }),
          fetch(`/api/clinic/medicines${query}`, { credentials: "same-origin", cache: "no-store" }),
        ]);

        if (!analyticsResponse.ok || !medicinesResponse.ok) {
          throw new Error("Clinic section is not available.");
        }

        const nextAnalytics = await analyticsResponse.json() as ClinicAnalyticsResponse;
        const nextMedicines = await medicinesResponse.json() as ClinicMedicineResponse[];

        if (!cancelled) {
          setAnalytics(nextAnalytics);
          setMedicines(Array.isArray(nextMedicines) ? nextMedicines : []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Clinic section is not available.");
        }
      }
    }

    void loadClinic();

    return () => {
      cancelled = true;
    };
  }, [liveDataEnabled, tenantSlug]);

  const metrics = [
    { id: "medicines", label: "Medicines", value: formatInsightValue(analytics?.total_medicines), helper: "Active medicine records" },
    { id: "low-stock", label: "Low stock", value: formatInsightValue(analytics?.low_stock_medicines), helper: "Batches below threshold" },
    { id: "expiring", label: "Expiring", value: formatInsightValue(analytics?.expiring_medicines), helper: "Within 90 days" },
    { id: "visits", label: "Visits today", value: formatInsightValue(analytics?.clinic_visits_today), helper: "Recorded clinic visits" },
    { id: "clinic-costs", label: "Clinic costs", value: formatMinorKes(String(analytics?.medicine_consumption_cost_minor ?? "0")), helper: "Medicine issued this month" },
    { id: "expiry-wastage", label: "Expiry wastage", value: formatMinorKes(String(analytics?.wastage_due_to_expiry_minor ?? "0")), helper: "Expired medicine value" },
    { id: "emergency-ready", label: "Emergency ready", value: `${formatInsightValue(analytics?.emergency_supply_ready_rate)}%`, helper: "Emergency supplies available" },
  ];

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        eyebrow="Clinic"
        title="Medicine inventory"
        description="Medicine stock, dispensing, expiry, and administrative analytics."
        actions={<StatusPill label={error ? "Attention" : "Ready"} tone={error ? "warning" : "ok"} />}
      />
      {error ? (
        <Card className="border-warning/20 bg-warning/5 p-4">
          <p className="text-sm font-semibold text-foreground">{error}</p>
        </Card>
      ) : null}
      <MetricGrid items={metrics} />
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <DataTable
          title="Medicine batches"
          subtitle="Stock levels and expiry status from clinic inventory."
          columns={[
            { id: "medicine", header: "Medicine", render: (row) => row.medicine_name },
            { id: "category", header: "Category", render: (row) => row.category },
            { id: "stock", header: "Stock", render: (row) => `${formatInsightValue(row.quantity_in_stock)} ${row.unit_type}`, className: "text-right font-semibold", headerClassName: "text-right" },
            { id: "expiry", header: "Nearest expiry", render: (row) => row.nearest_expiry_date ?? "Not batched" },
          ]}
          rows={medicines}
          getRowKey={(row) => row.id}
        />
        <SimpleListCard
          title="Readiness"
          subtitle="Principal-facing health operations without confidential notes."
          items={[
            { id: "critical", title: "Critical alerts", subtitle: "Open critical clinic alerts.", value: formatInsightValue(analytics?.critical_alerts) },
            { id: "out-stock", title: "Out of stock", subtitle: "Medicine batches with no available stock.", value: formatInsightValue(analytics?.out_of_stock_medicines) },
            { id: "dispensed", title: "Dispensed this month", subtitle: "Medicine units issued from clinic visits.", value: formatInsightValue(analytics?.medicine_units_dispensed_month) },
            { id: "most-used", title: "Most used medicine", subtitle: "Highest volume medicine dispensed this month.", value: formatInsightValue(analytics?.most_used_medicine) },
            { id: "emergency", title: "Emergency readiness", subtitle: "Emergency supplies with usable stock.", value: `${formatInsightValue(analytics?.emergency_supply_ready_rate)}%` },
          ]}
        />
      </div>
    </div>
  );
}

function LeadershipCommandCenterPage({ role }: { role: SchoolExperienceRole }) {
  const title =
    role === "deputy-principal"
      ? "Operations command center"
      : role === "secretary"
        ? "Administration and records desk"
        : "Strategic control center";
  const description =
    role === "deputy-principal"
      ? "Daily attendance, discipline, timetable execution, duty roster, and incident enforcement."
      : role === "secretary"
        ? "Admissions, communication, records, reporting, meeting minutes, and action item follow-up."
        : "Executive oversight of academic, financial, disciplinary, staff, and governance signals.";

  return (
    <div className="space-y-6">
      <SchoolPageHeader eyebrow="Leadership" title={title} description={description} />
      <MetricGrid
        items={[
          { id: "attendance", label: "Attendance compliance", value: "Live", helper: "Teacher and learner signals" },
          { id: "fees", label: "Fee collection", value: "Read only", helper: "Principal financial oversight" },
          { id: "discipline", label: "Discipline severity", value: "Weighted", helper: "Repeat cases and escalations" },
          { id: "audit", label: "Audit trail", value: "Immutable", helper: "Critical accountability records" },
        ]}
      />
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <DataTable
          title="Command queue"
          subtitle="Role-specific work that needs leadership action."
          columns={[
            { id: "item", header: "Item", render: (row) => row.item },
            { id: "owner", header: "Owner", render: (row) => row.owner },
            { id: "status", header: "Status", render: (row) => <StatusPill label={row.status} tone={row.tone} /> },
          ]}
          rows={[
            { id: "cmd-1", item: "Morning attendance sweep", owner: "Deputy principal", status: "Watching", tone: "warning" as const },
            { id: "cmd-2", item: "Fee arrears report", owner: "Principal", status: "Read only", tone: "ok" as const },
            { id: "cmd-3", item: "Admissions documents", owner: "Secretary", status: "Queued", tone: "warning" as const },
          ]}
          getRowKey={(row) => row.id}
        />
        <SimpleListCard
          title="Audit and governance"
          subtitle="Every critical action is logged with actor, school, reason, and time."
          items={[
            { id: "audit-1", title: "Policy approval", subtitle: "Non-technical approvals are tracked before enforcement.", value: "Ready" },
            { id: "audit-2", title: "Permission changes", subtitle: "RBAC edits appear in the immutable audit log.", value: "Tracked" },
            { id: "audit-3", title: "Manual overrides", subtitle: "Teacher attendance overrides require principal reason.", value: "Restricted" },
          ]}
        />
      </div>
    </div>
  );
}

function SchoolBasicCardPage({
  eyebrow,
  title,
  description,
  items,
}: {
  eyebrow: string;
  title: string;
  description: string;
  items: Array<{ id: string; title: string; subtitle: string; value?: string }>;
}) {
  return (
    <div className="space-y-6">
      <SchoolPageHeader eyebrow={eyebrow} title={title} description={description} />
      <SimpleListCard title={title} subtitle={description} items={items} />
    </div>
  );
}

type SchoolPagesProps = {
  role: SchoolExperienceRole;
  section?: string;
  studentId?: string;
  tenantSlug?: string | null;
  userLabel?: string | null;
  routeMode?: SchoolRouteMode;
  liveDataEnabled?: boolean;
};

type BackendSchoolNotification = {
  id?: unknown;
  title?: unknown;
  detail?: unknown;
  body?: unknown;
  status?: unknown;
  tone?: unknown;
  href?: unknown;
  sourceModule?: unknown;
  relatedModule?: unknown;
  relatedRecordId?: unknown;
  createdAt?: unknown;
  readAt?: unknown;
};

function toExperienceNotificationItem(notification: BackendSchoolNotification): ExperienceNotificationItem | null {
  if (typeof notification.id !== "string" || !notification.id.trim()) {
    return null;
  }

  const title =
    typeof notification.title === "string" && notification.title.trim()
      ? notification.title.trim()
      : "School update";
  const detail =
    typeof notification.detail === "string" && notification.detail.trim()
      ? notification.detail.trim()
      : typeof notification.body === "string" && notification.body.trim()
        ? notification.body.trim()
        : "A school action needs attention.";
  const tone =
    notification.tone === "critical" || notification.tone === "warning" || notification.tone === "ok"
      ? notification.tone
      : "ok";

  return {
    id: notification.id.trim(),
    title,
    detail,
    timeLabel: formatSchoolNotificationTime(notification.createdAt),
    tone,
    href: typeof notification.href === "string" && notification.href.trim() ? notification.href.trim() : undefined,
    status:
      typeof notification.status === "string" && notification.status.trim()
        ? notification.status.trim()
        : "unread",
    sourceModule:
      typeof notification.sourceModule === "string" && notification.sourceModule.trim()
        ? notification.sourceModule.trim()
        : undefined,
    relatedModule:
      typeof notification.relatedModule === "string" && notification.relatedModule.trim()
        ? notification.relatedModule.trim()
        : null,
    relatedRecordId:
      typeof notification.relatedRecordId === "string" && notification.relatedRecordId.trim()
        ? notification.relatedRecordId.trim()
        : null,
  };
}

function formatSchoolNotificationTime(value: unknown) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    return "school update";
  }

  const elapsedMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.round(elapsedMs / 60_000));

  if (minutes < 1) {
    return "now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  return new Date(value).toLocaleDateString("en-KE", {
    month: "short",
    day: "numeric",
  });
}

export function SchoolPages(props: SchoolPagesProps) {
  return <SchoolPagesShell {...props} />;
}

function SchoolPagesShell({
  role,
  section = "dashboard",
  studentId,
  tenantSlug,
  userLabel,
  routeMode = "hosted",
  liveDataEnabled = true,
}: SchoolPagesProps) {
  const router = useRouter();
  const replaceRoute = router.replace;
  const workspace = getSchoolWorkspace(role, tenantSlug);
  const [moduleAccessState, setModuleAccessState] = useState<{
    codes: Set<string> | null;
    verified: boolean;
  }>(() => {
    const cachedModuleCodes = readCachedSchoolModuleCodes({ role, tenantSlug });

    if (!liveDataEnabled) {
      return {
        codes: cachedModuleCodes ?? new Set<string>(implementation101ModuleCodes),
        verified: true,
      };
    }

    return {
      codes: cachedModuleCodes,
      verified: Boolean(cachedModuleCodes && cachedModuleCodes.size > 0),
    };
  });
  const [liveNotifications, setLiveNotifications] = useState<ExperienceNotificationItem[]>([]);
  const lastNotificationLoadRef = useRef(0);
  const { navItems, profile, branding } = workspace;
  const activeHref = studentId
    ? buildSchoolSectionHref(role, "students", routeMode)
    : section === "dashboard"
      ? buildSchoolSectionHref(role, "dashboard", routeMode)
      : buildSchoolSectionHref(
          role,
          (section as string) || "dashboard",
          routeMode,
        );
  useEffect(() => {
    let cancelled = false;
    const cachedModuleCodes = readCachedSchoolModuleCodes({ role, tenantSlug });
    const hasUsableCachedModuleCodes = Boolean(cachedModuleCodes && cachedModuleCodes.size > 0);

    if (!liveDataEnabled) {
      return () => {
        cancelled = true;
      };
    }

    async function loadModuleAccess() {
      try {
        const response = await fetch("/api/school/modules/me", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
            });

            if (redirectOnExpiredSessionResponse(response, "school", (href) => replaceRoute(href))) {
              return;
            }

            if (!response.ok) {
              if (!cancelled && !hasUsableCachedModuleCodes) {
                setModuleAccessState({
                  codes: new Set(),
                  verified: true,
                });
              }

              return;
            }

        const payload = (await response.json().catch(() => null)) as string[] | { data?: string[] } | null;
        const moduleCodes = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : null;

        if (!cancelled && moduleCodes) {
          const nextModuleCodes = new Set(moduleCodes);

          writeCachedSchoolModuleCodes({
            role,
            tenantSlug,
            moduleCodes: nextModuleCodes,
          });
          setModuleAccessState({
            codes: nextModuleCodes,
            verified: true,
          });
        }
          } catch {
            if (!cancelled && !hasUsableCachedModuleCodes) {
              setModuleAccessState({
                codes: new Set(),
                verified: true,
              });
            }
          }
        }

    void loadModuleAccess();

    return () => {
      cancelled = true;
    };
  }, [liveDataEnabled, replaceRoute, role, tenantSlug]);
  useEffect(() => {
    if (!liveDataEnabled) {
      return () => undefined;
    }

    return startSchoolOperationalEventSyncRetryWorker(tenantSlug ?? undefined);
  }, [liveDataEnabled, tenantSlug]);
  useEffect(() => {
    let cancelled = false;

    if (!liveDataEnabled) {
      return () => {
        cancelled = true;
      };
    }

    async function loadLiveNotifications() {
      lastNotificationLoadRef.current = Date.now();
      try {
        const response = await fetch("/api/events/notifications?limit=8", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });

        if (redirectOnExpiredSessionResponse(response, "school", (href) => replaceRoute(href))) {
          return;
        }

        if (!response.ok) {
          return;
        }

        const payload = (await response.json().catch(() => null)) as
          | { data?: BackendSchoolNotification[] }
          | BackendSchoolNotification[]
          | null;
        const rows = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : [];
        const nextNotifications = rows
          .map((item) => toExperienceNotificationItem(item))
          .filter((item): item is ExperienceNotificationItem => Boolean(item))
          .filter((item) => item.status !== "read");

        if (!cancelled) {
          setLiveNotifications(nextNotifications);
        }
      } catch {
        if (!cancelled) {
          setLiveNotifications((items) => items);
        }
      }
    }

    void loadLiveNotifications();
    const refreshWhenUserReturns = () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      if (Date.now() - lastNotificationLoadRef.current > 60_000) {
        void loadLiveNotifications();
      }
    };

    window.addEventListener("focus", refreshWhenUserReturns);
    document.addEventListener("visibilitychange", refreshWhenUserReturns);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshWhenUserReturns);
      document.removeEventListener("visibilitychange", refreshWhenUserReturns);
    };
  }, [liveDataEnabled, replaceRoute, role, tenantSlug]);

  const accessLoading = !moduleAccessState.verified;
  const visibleModuleCodes = moduleAccessState.codes ?? new Set<string>();
  const requiredModuleCode = getModuleCodeForSchoolSection(section, role);
  const principalDashboardRequiresModule = role === "principal" && section === "dashboard";
  const principalWorkspaceSyncing = role === "principal" && accessLoading && !studentId;
  const shellNavItems = principalWorkspaceSyncing
    ? navItems
    : filterNavItemsByEnabledModules(navItems, visibleModuleCodes);

  const { data: teachingAssignments } = useSchoolQuery<any[]>("/api/academics/teacher-assignments");
  const hasTeachingAssignments = role === "teacher" || (Array.isArray(teachingAssignments) && teachingAssignments.length > 0);

  const scopedNavItems = shellNavItems
    .filter((item) => !(
      role === "principal"
      && item.id === "dashboard"
      && !principalWorkspaceSyncing
      && !visibleModuleCodes.has("principal_dashboard")
    ))
    .map((item) => ({
      ...item,
      href: mapSchoolHref(role, item.href, routeMode),
    }));

  if (hasTeachingAssignments && !scopedNavItems.some(item => item.id === "my-teaching")) {
    scopedNavItems.push({
      id: "my-teaching",
      label: "My Teaching",
      href: mapSchoolHref(role, toSchoolPath("my-teaching"), routeMode),
      icon: GraduationCap,
      group: "Academics",
    });
  }
  const principalDashboardEnabled =
    role !== "principal"
    || section !== "dashboard"
    || principalWorkspaceSyncing
    || visibleModuleCodes.has("principal_dashboard");
  const financeRoleDedicatedSection =
    (role === "accountant" || role === "bursar")
    && financeRoleDedicatedSectionIds.has(section);
  const requiresAccessSync =
    !principalWorkspaceSyncing
    && accessLoading
    && !financeRoleDedicatedSection
    && (Boolean(requiredModuleCode) || principalDashboardRequiresModule);
  const canOpenSection = studentId
    ? true
    : financeRoleDedicatedSection
      ? true
    : principalWorkspaceSyncing
      || (!requiresAccessSync && isSchoolSectionEnabled(section, visibleModuleCodes) && principalDashboardEnabled);
  async function markLiveNotificationRead(item: ExperienceNotificationItem) {
    if (!liveNotifications.some((notification) => notification.id === item.id)) {
      return;
    }

    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`/api/events/notifications/${encodeURIComponent(item.id)}/read`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
          "x-myshule-csrf": csrfToken,
        },
      });

      if (redirectOnExpiredSessionResponse(response, "school", (href) => replaceRoute(href))) {
        return;
      }

      if (!response.ok) {
        return;
      }

      setLiveNotifications((items) =>
        items.filter((notification) => notification.id !== item.id),
      );
    } catch {
      setLiveNotifications((items) => items);
    }
  }
  const subscriptionNotifications: ExperienceNotificationItem[] =
    workspace.subscription.state === "ACTIVE"
      ? []
      : [
          {
            id: "subscription-renewal",
            title: workspace.subscription.statusLabel,
            detail: workspace.subscription.detail,
            timeLabel: "billing",
            tone: workspace.subscription.tone,
            href: mapSchoolHref(role, workspace.subscription.primaryActionHref, routeMode),
          },
        ];
  const notifications: ExperienceNotificationItem[] = [
    ...(liveDataEnabled ? liveNotifications : []),
    ...subscriptionNotifications,
    ...workspace.snapshot.notifications.slice(0, 3).map(
      (item): ExperienceNotificationItem => ({
        id: item.id,
        title: item.title,
        detail: `${item.severity.toUpperCase()} notification`,
        timeLabel: item.timeLabel,
        tone: item.severity === "critical" ? "critical" : item.severity === "warning" ? "warning" : "ok",
        href: buildSchoolSectionHref(role, "reports", routeMode),
      }),
    ),
  ];
  const operationalBlueprint = isExtremeErpWorkspaceId(section)
    ? getExtremeErpBlueprint(section)
    : null;
  const renderRoleOperationalWorkspace =
    !studentId && shouldRenderRoleOperationalWorkspace(role, section);

  if (!studentId && section === "admissions") {
    return <AdmissionsDashboardCommandCenter routeMode={routeMode} activeSection="applications" />;
  }

  if (renderRoleOperationalWorkspace) {
    if (role === "principal") {
      return <PrincipalCommandCenter routeMode={routeMode} tenantSlug={tenantSlug} activeSection={section} userLabel={userLabel} />;
    }

    if (role === "student") {
      return <StudentCommandCenter routeMode={routeMode} activeSection={section} />;
    }

    if (section === "exams") {
      if (role === "grade-master") {
        // @ts-ignore
        return <GradeMasterCommandCenter routeMode={routeMode} activeSection={section} />;
      }

      if (role === "hod") {
        // @ts-ignore
        return <HodCommandCenter routeMode={routeMode} activeSection={section} />;
      }

      if (role === "dean-academics") {
        // @ts-ignore
        return <DeanAcademicsCommandCenter routeMode={routeMode} activeSection={section} />;
      }

      if (role === "deputy-principal") {
        // @ts-ignore
        return <DeputyPrincipalCommandCenter routeMode={routeMode} activeSection={section} tenantSlug={tenantSlug} userLabel={userLabel} />;
      }

      if (role === "exams-manager") {
        // @ts-ignore
        return <ExamsManagerCommandCenter routeMode={routeMode} activeSection={section} />;
      }
    }

    if (standardOperationalRoleIds.has(role)) {
      return (
        <RoleOperationalCommandCenter
          key={`${role}:${section}`}
          role={role}
          initialSection={section}
          initialWorkspace={schoolSectionLabels[section]}
          tenantSlug={tenantSlug}
          routeMode={routeMode}
        />
      );
    }

    if (role === "dean-academics") {
      // @ts-ignore
      return <DeanAcademicsCommandCenter routeMode={routeMode} activeSection={section} />;
    }

    if (role === "accountant" || role === "bursar") {
      return (
        <PermissionProvider schoolId={tenantSlug ?? undefined}>
          <AccountantCommandCenter routeMode={routeMode} role={role} activeSection={section} tenantSlug={tenantSlug} />
        </PermissionProvider>
      );
    }

    if (role === "secretary") {
      return <SecretaryCommandCenterFull routeMode={routeMode} activeSection={section} />;
    }

    if (role === "ict-manager") {
      return <IctManagerCommandCenter routeMode={routeMode} activeSection={section} />;
    }

    if (role === "procurement-officer") {
      return <ProcurementOfficerCommandCenter routeMode={routeMode} activeSection={section} />;
    }

    if (role === "discipline-master") {
      return <DisciplineMasterCommandCenter activeSection={section} />;
    }

    if (role === "librarian") {
      return <LibrarianCommandCenter activeSection={section} />;
    }

    if (role === "boarding-master") {
      // @ts-ignore
      return <BoardingMasterCommandCenter routeMode={routeMode} activeSection={section} />;
    }

    if (role === "nurse") {
      // @ts-ignore
      return <NurseCommandCenter activeSection={section} />;
    }

    if (role === "guidance-counselling") {
      // @ts-ignore
      return <CounsellorCommandCenter routeMode={routeMode} activeSection={section} />;
    }

    if (role === "laboratory-technician") {
      // @ts-ignore
      return <LaboratoryTechnicianCommandCenter routeMode={routeMode} activeSection={section} />;
    }

    if (role === "security-officer") {
      // @ts-ignore
      return <SecurityCommandCenter routeMode={routeMode} activeSection={section} />;
    }

    if (role === "grade-master") {
      // @ts-ignore
      return <GradeMasterCommandCenter routeMode={routeMode} activeSection={section} />;
    }

    if (role === "hod") {
      // @ts-ignore
      return <HodCommandCenter routeMode={routeMode} activeSection={section} />;
    }


    if (role === "deputy-principal") {
      // @ts-ignore
      return <DeputyPrincipalCommandCenter routeMode={routeMode} activeSection={section} tenantSlug={tenantSlug} userLabel={userLabel} />;
    }

    if (role === "exams-manager") {
      // @ts-ignore
      return <ExamsManagerCommandCenter routeMode={routeMode} activeSection={section} />;
    }

    if (role === "teacher") {
      // @ts-ignore
      return <TeacherCommandCenter routeMode={routeMode} activeSection={section} />;
    }

    if (role === "class-teacher") {
      // @ts-ignore
      return <ClassTeacherCommandCenter routeMode={routeMode} activeSection={section} />;
    }

    if (role === "admissions") {
      return <AdmissionsDashboardCommandCenter routeMode={routeMode} activeSection={section} />;
    }

    if (role === "storekeeper") {
      // @ts-ignore
      return <StorekeeperCommandCenter routeMode={routeMode} activeSection={section} />;
    }

    if (role === "transport-manager") {
      // @ts-ignore
      return <TransportManagerCommandCenter routeMode={routeMode} activeSection={section} />;
    }

    return (
      <RoleOperationalCommandCenter
        key={`${role}:${section}`}
        role={role}
        initialSection={section}
        initialWorkspace={schoolSectionLabels[section]}
        tenantSlug={tenantSlug}
        routeMode={routeMode}
      />
    );
  }

  return (
    <PermissionProvider schoolId={tenantSlug ?? undefined}>
    <ErpShell
      brand={{
        title: branding.shortName,
        subtitle: `${branding.county} school ERP`,
      }}
      navItems={scopedNavItems}
      activeHref={activeHref}
      topLabel={`${branding.name} school ERP`}
      title={schoolSectionLabels[section] ?? "Dashboard"}
      subtitle={`Built for ${branding.name}: clear balances, familiar school workflows, and direct actions for non-technical teams.`}
      status={{ label: "School protected", tone: "ok" }}
      profile={profile}
      notifications={notifications}
      onNotificationOpen={markLiveNotificationRead}
      actions={
        <StatusPill
          label={`${workspace.model.currentTerm} | ${workspace.model.academicYear}`}
          tone="ok"
        />
      }
    >
      {requiresAccessSync ? (
        <ModuleAccessVerifyingPanel section={section} role={role} />
      ) : !canOpenSection ? (
        <ModuleDisabledPanel section={section} role={role} routeMode={routeMode} />
      ) : (
        <>
      {studentId ? <StudentProfilePage role={role} tenantSlug={tenantSlug} studentId={studentId} /> : null}
      {!studentId && !renderRoleOperationalWorkspace && section === "students" ? (
        <SchoolStudentsPage role={role} tenantSlug={tenantSlug} routeMode={routeMode} />
      ) : null}
      {!studentId && !renderRoleOperationalWorkspace && section === "finance" ? <SchoolFinancePage role={role} tenantSlug={tenantSlug} routeMode={routeMode} /> : null}
      {!studentId && !renderRoleOperationalWorkspace && (section === "mpesa" || section === "m-pesa-reconciliation") ? (
        <MPesaReconciliationWorkspace role={role} tenantSlug={tenantSlug} />
      ) : null}
      {!studentId && !renderRoleOperationalWorkspace && section === "communication" ? <SchoolCommunicationPage role={role} tenantSlug={tenantSlug} /> : null}
      {!studentId && !renderRoleOperationalWorkspace && operationalBlueprint ? (
        <OperationalBlueprintWorkspace blueprint={operationalBlueprint} />
      ) : null}
      {!studentId && !renderRoleOperationalWorkspace && section === "transport" ? (
        <TransportModuleScreen tenantSlug={tenantSlug} />
      ) : null}
      {!studentId && !renderRoleOperationalWorkspace && section === "procurement" ? (
        <ProcurementModuleScreen tenantSlug={tenantSlug} />
      ) : null}
      {!studentId && !renderRoleOperationalWorkspace && section === "hostel" ? (
        <HostelModuleScreen tenantSlug={tenantSlug} />
      ) : null}
      {!studentId && !renderRoleOperationalWorkspace && section === "boarding" ? (
        <BoardingModuleScreen tenantSlug={tenantSlug} />
      ) : null}
      {!studentId && !renderRoleOperationalWorkspace && section === "cbt" ? (
        <CbtModuleScreen tenantSlug={tenantSlug} />
      ) : null}
      {!studentId && !renderRoleOperationalWorkspace && section === "lms" ? (
        <LmsModuleScreen tenantSlug={tenantSlug} />
      ) : null}
      {!studentId && !renderRoleOperationalWorkspace && section === "ai-insights" ? (
        <AiInsightsModuleScreen tenantSlug={tenantSlug} />
      ) : null}
      {!studentId && !renderRoleOperationalWorkspace && section === "visitors" ? (
        <VisitorManagementModuleScreen tenantSlug={tenantSlug} />
      ) : null}
      {!studentId && !renderRoleOperationalWorkspace && section === "assets" ? (
        <AssetTrackingModuleScreen tenantSlug={tenantSlug} />
      ) : null}
      {!studentId && !renderRoleOperationalWorkspace && section === "iot" ? (
        <IotModuleScreen tenantSlug={tenantSlug} />
      ) : null}
      {!studentId && !renderRoleOperationalWorkspace && (
        section === "support-new-ticket"
        || section === "support-my-tickets"
        || section === "support-knowledge-base"
        || section === "support-system-status"
      ) ? (
        canCreateSupportTickets(role) ? (
          <SupportCenterWorkspace
            tenantSlug={tenantSlug}
            defaultView={section as "support-new-ticket" | "support-my-tickets" | "support-knowledge-base" | "support-system-status"}
          />
        ) : (
          <ModuleDisabledPanel section={section} role={role} routeMode={routeMode} />
        )
      ) : null}
      {!studentId && !renderRoleOperationalWorkspace && section === "exams" ? (
        <ExamsModuleScreen
          role={role}
          schoolName={workspace.branding.name}
          tenantSlug={tenantSlug}
        />
      ) : null}
      {!studentId && !renderRoleOperationalWorkspace && section === "discipline" ? (
        <DisciplineWorkspace tenantSlug={tenantSlug} />
      ) : null}
      {!studentId && !renderRoleOperationalWorkspace && section === "labs" ? (
        <LabsOperationsPage />
      ) : null}
      {!studentId && !renderRoleOperationalWorkspace && section === "teacher-attendance" ? (
        <TeacherBiometricAttendancePage />
      ) : null}
      {!studentId && !renderRoleOperationalWorkspace && section === "clinic" ? (
        <ClinicOperationsPage tenantSlug={tenantSlug} liveDataEnabled={liveDataEnabled} />
      ) : null}
      {!studentId && !renderRoleOperationalWorkspace && section === "leadership" ? (
        <LeadershipCommandCenterPage role={role} />
      ) : null}
      {!studentId && !renderRoleOperationalWorkspace && section === "timetable" ? (
        <SchoolBasicCardPage
          eyebrow="Timetable"
          title="Timetable coordination"
          description="Class streams, teacher cover, and room availability without clutter."
          items={[
            { id: "time-1", title: "No timetable periods published", subtitle: "Class streams and rooms appear after the timetable is configured.", value: "0" },
            { id: "time-2", title: "No teacher cover requests", subtitle: "Cover requests appear only when staff availability changes.", value: "0" },
            { id: "time-3", title: "No room conflicts", subtitle: "Room availability checks appear after timetable data is imported.", value: "0" },
          ]}
        />
      ) : null}
      {!studentId && !renderRoleOperationalWorkspace && section === "staff" ? (
        <SchoolBasicCardPage
          eyebrow="Staff"
          title="Staff operations"
          description="Teachers, office staff, and operational ownership at a glance."
          items={[
            { id: "staff-1", title: "No staff accounts yet", subtitle: "Staff records appear after school administrators send real invitations.", value: "0" },
            { id: "staff-2", title: "No coverage schedule", subtitle: "Office coverage appears after staff shifts are configured.", value: "0" },
            { id: "staff-3", title: "No leave requests", subtitle: "Leave approvals appear after staff begin using this section.", value: "0" },
          ]}
        />
      ) : null}
      {!studentId && !renderRoleOperationalWorkspace && section === "admissions" ? (
        <AdmissionsModuleScreen role={workspace.dashboardRole} snapshot={workspace.snapshot} online />
      ) : null}
      {!studentId && !renderRoleOperationalWorkspace && section === "inventory" ? (
        <InventoryModuleScreen role={workspace.dashboardRole} snapshot={workspace.snapshot} online />
      ) : null}
      {!studentId && !renderRoleOperationalWorkspace && role === "dean-academics" ? (
        <DeanModuleScreen role="dean" moduleName={section || "command-center"} snapshot={workspace.snapshot} online={true} />
      ) : null}
      {!studentId && !renderRoleOperationalWorkspace && section === "settings" ? (
        <div className="space-y-6">
          <SchoolPageHeader
            eyebrow="Settings"
            title="School settings"
            description="School profile, fee structure, and user management in one trusted admin area."
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <DataTable
              title="School profile"
              columns={[
                { id: "label", header: "Field", render: (row) => row.label },
                { id: "value", header: "Value", render: (row) => row.value },
              ]}
              rows={workspace.model.settings.schoolProfile}
              getRowKey={(row) => row.id}
            />
            <DataTable
              title="Fee structure"
              columns={[
                { id: "item", header: "Item", render: (row) => row.item },
                { id: "frequency", header: "Frequency", render: (row) => row.frequency },
                { id: "amount", header: "Amount", render: (row) => row.amount, className: "text-right font-semibold", headerClassName: "text-right" },
              ]}
              rows={workspace.model.settings.feeStructure}
              getRowKey={(row) => row.id}
            />
          </div>
          <DarajaIntegrationSettings />
          <UserManagementPanel />
        </div>
      ) : null}
        </>
      )}
    </ErpShell>
    </PermissionProvider>
  );
}






