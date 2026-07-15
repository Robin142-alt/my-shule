"use client";

import {
  Activity,
  Bell,
  BookOpen,
  BusFront,
  CheckCircle2,
  ClipboardCheck,
  HeartPulse,
  Home,
  Library,
  Menu,
  MessageSquareText,
  ShieldAlert,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Card } from "@/components/ui/card";
import { DashboardGreeting } from "@/components/common/dashboard-greeting";
import { UserManagementWorkspace } from "@/components/school/user-management-workspace";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import {
  readSchoolData,
  type SchoolAuditLog,
  type SchoolNotification,
  type SchoolOperationalRequest,
  subscribeToSchoolDataUpdates,
} from "@/lib/school/school-operational-store";
import {
  downloadCsvFile,
  openPrintDocument,
} from "@/lib/dashboard/export";

import { DashboardCommunicationProvider } from "@/lib/dashboard-communication/dashboard-communication-provider";
import { tenantSlugToName } from "@/lib/seo/tenant-routes";
import { buildSchoolSectionHref } from "./school-pages";

type PrincipalSection =
  | "overview"
  | "setup-checklist"
  | "fees"
  | "attendance"
  | "discipline"
  | "visitors"
  | "sick-bay"
  | "boarding"
  | "academics"
  | "staff"
  | "transport"
  | "library"
  | "exams-reports"
  | "communication"
  | "users-invitations"
  | "approvals"
  | "reports"
  | "audit-logs"
  | "settings";

type FeePaymentRecord = {
  id: string;
  student: string;
  amount: number;
  receiptNo?: string;
  status?: string;
};

type FeeBalanceRecord = {
  id: string;
  student: string;
  balance: number;
  status?: string;
};

type VisitorRecord = {
  id: string;
  visitor: string;
  visiting: string;
  status: string;
};

type InquiryRecord = {
  id: string;
  parent: string;
  student: string;
  status: string;
};

type ClinicVisitRecord = {
  id: string;
  student: string;
  status: string;
};

type MedicineStockRecord = {
  id: string;
  medicine: string;
  quantity: number;
  reorderAt: number;
};

type LibraryLoanRecord = {
  id: string;
  bookTitle: string;
  borrower: string;
  status: string;
  fine: number;
};

type AttendanceRegisterRecord = {
  id: string;
  className: string;
  teacher?: string;
  present: number;
  absent: number;
  late: number;
  status?: string;
  presentStudents?: string[];
  absentStudents?: Array<{ name: string; guardian?: string; phone?: string }>;
  lateStudents?: string[];
  markedAt?: string;
};

type PrincipalGenericRecord = {
  id: string;
  title?: string;
  student?: string;
  incident?: string;
  subject?: string;
  name?: string;
  role?: string;
  route?: string;
  vehicle?: string;
  dorm?: string;
  type?: string;
  status?: string;
  severity?: string;
};

type PrincipalWorkspaceRow = {
  id: string;
  title: string;
  detail: string;
  value: string;
};

type PrincipalActivationStep = {
  id: string;
  title: string;
  owner: string;
  dependency: string;
  unlocks: string;
  complete: boolean;
  actionLabel?: string;
  target?: PrincipalSection;
};

type PrincipalNavItem = {
  id: PrincipalSection;
  label: string;
  count?: string;
  icon: typeof Home;
};

type PrincipalDashboardAlert = {
  id: string;
  module_code: string;
  title: string;
  message: string;
  severity: "warning" | "critical";
  action_hint?: string;
};

type PrincipalExecutiveDashboard = {
  tenant_id: string;
  generated_at: string;
  enabled_modules: string[];
  alerts: PrincipalDashboardAlert[];
  notifications: PrincipalDashboardAlert[];
  realtime_channels: string[];
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatKsh(value: number) {
  return `KSh ${new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(value)}`;
}

function getPrincipalSchoolId(tenantSlug?: string | null) {
  return tenantSlug?.trim() || "school-workspace";
}

function getPrincipalSchoolName(schoolId: string) {
  return schoolId === "school-workspace" ? "School workspace" : tenantSlugToName(schoolId);
}

function isKisumuDemoTenant(schoolId: string) {
  return schoolId === "kisumu-boys" || schoolId === "kisumu-boys-demo";
}

function normalizePrincipalSection(section?: string): PrincipalSection {
  switch (section) {
    case "dashboard":
    case undefined:
    case null:
      return "overview";
    case "setup":
    case "checklist":
    case "school-setup":
    case "setup-checklist":
      return "setup-checklist";
    case "finance":
    case "finance-overview":
      return "fees";
    case "clinic":
    case "health":
      return "sick-bay";
    case "exams":
    case "exams-report-cards":
      return "exams-reports";
    case "parents":
      return "visitors";
    case "users":
    case "invitations":
    case "user-management":
      return "users-invitations";
    default:
      return section as PrincipalSection;
  }
}

function sectionRoute(section: PrincipalSection) {
  if (section === "overview") return "dashboard";
  if (section === "setup-checklist") return "setup-checklist";
  if (section === "fees") return "finance";
  if (section === "sick-bay") return "clinic";
  if (section === "exams-reports") return "exams";
  return section;
}

export function PrincipalCommandCenter({
  routeMode,
  tenantSlug,
  activeSection,
  userLabel,
}: {
  routeMode?: "hosted" | "public";
  tenantSlug?: string | null;
  activeSection?: string;
  userLabel?: string | null;
}) {
  const schoolId = getPrincipalSchoolId(tenantSlug);
  const schoolName = getPrincipalSchoolName(schoolId);
  const principalName = userLabel?.trim() || "Principal";
  const isDemoTenant = isKisumuDemoTenant(schoolId);
  const [activeWorkspace, setActiveWorkspaceState] = useState<PrincipalSection>(() =>
    normalizePrincipalSection(activeSection),
  );
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [absenceDialogOpen, setAbsenceDialogOpen] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const [streamedPrincipalDashboard, setStreamedPrincipalDashboard] =
    useState<PrincipalExecutiveDashboard | null>(null);
  const { data: fetchedPrincipalDashboard, isLoading: principalDashboardLoading } =
    useSchoolQuery<PrincipalExecutiveDashboard>("/admin-command/principal/dashboard", {
      tenantId: schoolId,
    });

  useEffect(() => {
    setActiveWorkspaceState(normalizePrincipalSection(activeSection));
  }, [activeSection]);

  useEffect(() => {
    window.localStorage.setItem("myshule.currentSchoolId", schoolId);
  }, [schoolId]);

  useEffect(() => {
    return subscribeToSchoolDataUpdates((detail) => {
      if (detail.schoolId === schoolId) {
        setRevision((current) => current + 1);
      }
    });
  }, [schoolId]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      return undefined;
    }

    const stream = new EventSource(`/api/admin-command/principal/dashboard/stream?tenantId=${encodeURIComponent(schoolId)}`);
    const applyPrincipalDashboardEvent = (event: MessageEvent) => {
      try {
        const dashboard = JSON.parse(event.data) as PrincipalExecutiveDashboard;
        setStreamedPrincipalDashboard(dashboard);
        setRevision((current) => current + 1);
      } catch {
        setRevision((current) => current + 1);
      }
    };

    stream.addEventListener("principal.dashboard", applyPrincipalDashboardEvent);
    stream.addEventListener("message", applyPrincipalDashboardEvent);
    stream.onerror = () => {
      stream.close();
    };

    return () => {
      stream.removeEventListener("principal.dashboard", applyPrincipalDashboardEvent);
      stream.removeEventListener("message", applyPrincipalDashboardEvent);
      stream.close();
    };
  }, [schoolId]);

  const schoolRecords = useMemo(() => {
    const dataSnapshot = { schoolId, revision };
    const feePayments = readSchoolData<FeePaymentRecord>("finance-payments", dataSnapshot.schoolId);
    const feeBalances = readSchoolData<FeeBalanceRecord>("fee-balances", dataSnapshot.schoolId);
    const visitors = [
      ...readSchoolData<VisitorRecord>("visitors", dataSnapshot.schoolId),
      ...readSchoolData<VisitorRecord>("secretary-visitors", dataSnapshot.schoolId),
    ];
    const inquiries = [
      ...readSchoolData<InquiryRecord>("front-office-inquiries", dataSnapshot.schoolId),
      ...readSchoolData<InquiryRecord>("secretary-inquiries", dataSnapshot.schoolId),
    ];
    const clinicVisits = readSchoolData<ClinicVisitRecord>("clinic-visits", dataSnapshot.schoolId);
    const medicineStock = readSchoolData<MedicineStockRecord>("medicine-stock", dataSnapshot.schoolId);
    const libraryLoans = readSchoolData<LibraryLoanRecord>("library-loans", dataSnapshot.schoolId);
    const attendanceRegisters = readSchoolData<AttendanceRegisterRecord>("attendance-registers", dataSnapshot.schoolId);
    const operationalRequests = readSchoolData<SchoolOperationalRequest>("operationalRequests", dataSnapshot.schoolId);
    const notifications = readSchoolData<SchoolNotification>("notifications", dataSnapshot.schoolId);
    const auditLogs = readSchoolData<SchoolAuditLog>("auditLogs", dataSnapshot.schoolId);
    const disciplineCases = readSchoolData<PrincipalGenericRecord>("discipline-cases", dataSnapshot.schoolId);
    const boardingRecords = [
      ...readSchoolData<PrincipalGenericRecord>("boarding-roll-calls", dataSnapshot.schoolId),
      ...readSchoolData<PrincipalGenericRecord>("boarding-exeat-requests", dataSnapshot.schoolId),
    ];
    const academicRecords = [
      ...readSchoolData<PrincipalGenericRecord>("subjects", dataSnapshot.schoolId),
      ...readSchoolData<PrincipalGenericRecord>("teacher-allocations", dataSnapshot.schoolId),
      ...readSchoolData<PrincipalGenericRecord>("lesson-coverage", dataSnapshot.schoolId),
    ];
    const staffRecords = [
      ...readSchoolData<PrincipalGenericRecord>("staff-records", dataSnapshot.schoolId),
      ...readSchoolData<PrincipalGenericRecord>("user-invitations", dataSnapshot.schoolId),
    ];
    const transportRecords = [
      ...readSchoolData<PrincipalGenericRecord>("transport-routes", dataSnapshot.schoolId),
      ...readSchoolData<PrincipalGenericRecord>("transport-trips", dataSnapshot.schoolId),
    ];
    const reportRecords = [
      ...readSchoolData<PrincipalGenericRecord>("generated-reports", dataSnapshot.schoolId),
      ...readSchoolData<PrincipalGenericRecord>("printed-documents", dataSnapshot.schoolId),
    ];

    return {
      feePayments,
      feeBalances,
      visitors,
      inquiries,
      clinicVisits,
      medicineStock,
      libraryLoans,
      attendanceRegisters,
      operationalRequests,
      notifications,
      auditLogs,
      disciplineCases,
      boardingRecords,
      academicRecords,
      staffRecords,
      transportRecords,
      reportRecords,
    };
  }, [revision, schoolId]);

  const collectedToday = schoolRecords.feePayments.reduce((total, row) => total + Number(row.amount || 0), 0);
  const visibleCollections = collectedToday > 0 ? collectedToday : isDemoTenant ? 248500 : 0;
  const visitorsInside = schoolRecords.visitors.filter((row) => /inside/i.test(row.status)).length;
  const waitingInquiries = schoolRecords.inquiries.filter((row) => /waiting/i.test(row.status)).length;
  const medicineAlerts = schoolRecords.medicineStock.filter((row) => Number(row.quantity) <= Number(row.reorderAt)).length;
  const libraryFollowUps = schoolRecords.libraryLoans.filter((row) => /overdue|lost|damaged/i.test(row.status) || Number(row.fine) > 0).length;
  const attendanceRegister = schoolRecords.attendanceRegisters[0];
  const presentStudents = attendanceRegister?.present ?? (isDemoTenant ? 944 : 0);
  const absentStudents = attendanceRegister?.absent ?? (isDemoTenant ? 18 : 0);
  const lateStudents = attendanceRegister?.late ?? (isDemoTenant ? 12 : 0);
  const missingRegisters = schoolRecords.attendanceRegisters.length === 0 ? 0 : 3;
  const guardianRecipientCount =
    attendanceRegister?.absentStudents?.filter((student) => Boolean(student.phone || student.guardian)).length ?? 0;
  const principalDashboard = streamedPrincipalDashboard ?? fetchedPrincipalDashboard;
  const principalAlerts = principalDashboard?.alerts ?? [];
  const enabledPrincipalModules = principalDashboard?.enabled_modules ?? [];
  const pendingApprovals = schoolRecords.operationalRequests.filter((request) =>
    request.status === "Pending"
    && (request.targetRoles.includes("principal") || request.originRole === "principal"),
  ).length;
  const unresolvedSystemAlerts = [
    ...principalAlerts.filter((alert) => alert.severity === "critical" || alert.severity === "warning"),
    ...schoolRecords.notifications.filter((notification) =>
      !notification.read
      && (notification.severity === "critical" || notification.severity === "warning")
      && (notification.audienceRoles.includes("principal") || notification.recipientRole === "principal"),
    ),
  ].length;
  const pendingFeeItems = schoolRecords.feeBalances.filter((balance) => Number(balance.balance) > 0).length;
  const attendanceFollowUps = absentStudents + lateStudents + missingRegisters;
  const activationSteps = useMemo<PrincipalActivationStep[]>(
    () => [
      {
        id: "modules-enabled",
        title: "Confirm enabled modules",
        owner: "Super Admin",
        dependency: "The platform owner must enable the school modules this tenant is allowed to use.",
        unlocks: "Only enabled modules appear in sidebars and APIs.",
        complete: enabledPrincipalModules.length > 0,
      },
      {
        id: "academic-foundation",
        title: "Create academic foundation",
        owner: "Principal / Deputy",
        dependency: "Set classes, streams, subjects, departments, academic year, and current term before admissions, timetable, and exams.",
        unlocks: "Admissions placement, teacher allocation, timetable, attendance, exam setup, and report cards.",
        complete: schoolRecords.academicRecords.length > 0,
        actionLabel: "Open Academics",
        target: "academics",
      },
      {
        id: "staff-invitations",
        title: "Invite and assign staff",
        owner: "Principal",
        dependency: "Invite operational staff and assign roles before daily departments can work.",
        unlocks: "Teacher workloads, HOD/dean review, finance, admissions, library, health, stores, boarding, and transport workflows.",
        complete: schoolRecords.staffRecords.length > 0,
        actionLabel: "Open Users & Invitations",
        target: "users-invitations",
      },
      {
        id: "students-admitted",
        title: "Admit and place learners",
        owner: "Admissions / Secretary",
        dependency: "Learners need admission, class placement, and guardian links before portals, billing, attendance, and exams can operate.",
        unlocks: "Parent/student portals, fee billing, class registers, attendance, assignments, marks, and reports.",
        complete: schoolRecords.inquiries.length > 0 || presentStudents > 0,
        actionLabel: "Open Parents & Visitors",
        target: "visitors",
      },
      {
        id: "finance-started",
        title: "Configure fees and first billing",
        owner: "Accountant / Bursar",
        dependency: "Fee structures and billable learners must exist before invoices, receipts, balances, and parent statements.",
        unlocks: "Invoices, payments, receipts, statements, arrears, waivers, and principal finance summary.",
        complete: schoolRecords.feePayments.length > 0 || schoolRecords.feeBalances.length > 0,
        actionLabel: "Open Fees",
        target: "fees",
      },
      {
        id: "attendance-started",
        title: "Start registers and daily operations",
        owner: "Teachers / Class Teachers",
        dependency: "Class registers require admitted learners, class ownership, and teacher allocation.",
        unlocks: "Principal attendance monitoring, parent absence notifications, and daily school health signals.",
        complete: schoolRecords.attendanceRegisters.length > 0,
        actionLabel: "Open Attendance",
        target: "attendance",
      },
      {
        id: "exams-ready",
        title: "Configure exams and report cards",
        owner: "Exams Manager / Dean / HOD / Teachers",
        dependency: "Subjects, classes, teachers, grading policy, and active term must exist before marks entry and publishing.",
        unlocks: "Marks entry, moderation, approval, parent visibility, analytics, and downloadable report cards.",
        complete: schoolRecords.reportRecords.some((record) => /report|exam|card|result/i.test(`${record.title ?? ""} ${record.type ?? ""}`)),
        actionLabel: "Open Exams",
        target: "exams-reports",
      },
      {
        id: "reports-audit",
        title: "Generate first operational reports",
        owner: "Principal / Department leads",
        dependency: "Reports need source records and must produce preview, download, print, or observable queued jobs.",
        unlocks: "Board reports, compliance evidence, audit-safe exports, and go-live confidence.",
        complete: schoolRecords.reportRecords.length > 0,
        actionLabel: "Open Reports",
        target: "reports",
      },
    ],
    [
      enabledPrincipalModules.length,
      presentStudents,
      schoolRecords.academicRecords.length,
      schoolRecords.attendanceRegisters.length,
      schoolRecords.feeBalances.length,
      schoolRecords.feePayments.length,
      schoolRecords.inquiries.length,
      schoolRecords.reportRecords,
      schoolRecords.staffRecords.length,
    ],
  );
  const completedActivationSteps = activationSteps.filter((step) => step.complete).length;
  const activationProgress = Math.round((completedActivationSteps / activationSteps.length) * 100);
  const navCount = (value: number) => (value > 0 ? String(value) : undefined);
  const navItems = useMemo<PrincipalNavItem[]>(
    () => [
      { id: "overview", label: "Overview", icon: Home },
      { id: "setup-checklist", label: "School Setup", count: activationProgress < 100 ? `${activationProgress}%` : undefined, icon: CheckCircle2 },
      { id: "fees", label: "Fees", count: navCount(pendingFeeItems), icon: Wallet },
      { id: "attendance", label: "Attendance", count: navCount(attendanceFollowUps), icon: Activity },
      { id: "discipline", label: "Discipline", count: navCount(schoolRecords.disciplineCases.length), icon: ShieldAlert },
      { id: "visitors", label: "Parents & Visitors", count: navCount(visitorsInside + waitingInquiries), icon: UsersRound },
      { id: "sick-bay", label: "Sick Bay", count: navCount(schoolRecords.clinicVisits.length + medicineAlerts), icon: HeartPulse },
      { id: "boarding", label: "Boarding", count: navCount(schoolRecords.boardingRecords.length), icon: BookOpen },
      { id: "academics", label: "Academics", count: navCount(schoolRecords.academicRecords.length), icon: ClipboardCheck },
      { id: "staff", label: "Staff", count: navCount(schoolRecords.staffRecords.length), icon: UsersRound },
      { id: "transport", label: "Transport", count: navCount(schoolRecords.transportRecords.length), icon: BusFront },
      { id: "library", label: "Library", count: navCount(libraryFollowUps), icon: Library },
      { id: "exams-reports", label: "Exams & Report Cards", icon: ClipboardCheck },
      { id: "communication", label: "Communication", count: navCount(schoolRecords.notifications.filter((notification) => !notification.read).length), icon: MessageSquareText },
      { id: "users-invitations", label: "Users & Invitations", icon: UsersRound },
      { id: "approvals", label: "Approvals", count: navCount(pendingApprovals), icon: CheckCircle2 },
      { id: "reports", label: "Reports", count: navCount(schoolRecords.reportRecords.length), icon: Bell },
      { id: "audit-logs", label: "Audit Logs", count: navCount(schoolRecords.auditLogs.length), icon: ClipboardCheck },
    ],
    [
      attendanceFollowUps,
      activationProgress,
      libraryFollowUps,
      medicineAlerts,
      pendingApprovals,
      pendingFeeItems,
      schoolRecords.academicRecords.length,
      schoolRecords.auditLogs.length,
      schoolRecords.boardingRecords.length,
      schoolRecords.clinicVisits.length,
      schoolRecords.disciplineCases.length,
      schoolRecords.notifications,
      schoolRecords.reportRecords.length,
      schoolRecords.staffRecords.length,
      schoolRecords.transportRecords.length,
      visitorsInside,
      waitingInquiries,
    ],
  );
  function setActiveWorkspace(section: PrincipalSection) {
    setActiveWorkspaceState(section);
    setMobileSidebarOpen(false);
    window.history.replaceState(null, "", buildSchoolSectionHref("principal", sectionRoute(section), routeMode ?? "hosted"));
  }

  function exportPrincipalWorkspaceSummary(section: PrincipalSection, title: string, rows: PrincipalWorkspaceRow[], metrics: Array<[string, number]>) {
    downloadCsvFile({
      filename: `${schoolId}-${section}-summary-${new Date().toISOString().slice(0, 10)}.csv`,
      headers: ["type", "title", "detail", "value"],
      rows: [
        ...metrics.map(([label, value]) => ["metric", label, "", String(value)]),
        ...rows.map((row) => ["record", row.title, row.detail, row.value]),
      ],
    });
  }

  function printPrincipalWorkspaceSummary(title: string, rows: PrincipalWorkspaceRow[], metrics: Array<[string, number]>) {
    openPrintDocument({
      eyebrow: "Principal workspace report",
      title: `${schoolName} - ${title}`,
      subtitle: `Generated by the Principal workspace on ${new Date().toLocaleString("en-KE")}.`,
      rows: [
        ...metrics.map(([label, value]) => ({ label, value: String(value) })),
        ...(rows.length
          ? rows.map((row) => ({ label: row.title, value: `${row.detail} - ${row.value}` }))
          : [{ label: "Records", value: "No records available yet. Complete the listed setup dependencies before rerunning this report." }]),
      ],
      footer: "This report is generated from the current tenant-scoped Principal workspace state.",
    });
  }

  function renderWorkspace() {
    if (activeWorkspace === "setup-checklist") {
      return (
        <section aria-label="Principal school setup workspace" className="space-y-5">
          <WorkspaceHeading
            title="School Setup Checklist"
            subtitle="Activation path from clean tenant to daily operations. Each incomplete item names the missing dependency and the workspace that unlocks the next workflow."
          />
          <Card className="border-white/10 bg-white/5 p-4 text-white">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black">Activation readiness</p>
                <p className="mt-1 text-xs font-semibold text-white/65">
                  {completedActivationSteps} of {activationSteps.length} activation gates complete for {schoolName}.
                </p>
              </div>
              <span className="rounded-full border border-cyan-200/30 bg-cyan-200/10 px-3 py-1 text-sm font-black text-cyan-100">
                {activationProgress}% ready
              </span>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-cyan-300" style={{ width: `${activationProgress}%` }} />
            </div>
          </Card>
          <div className="space-y-3">
            {activationSteps.map((step, index) => (
              <Card key={step.id} className="border-white/10 bg-white/5 p-4 text-white">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100">Step {index + 1} - {step.owner}</p>
                    <h3 className="mt-1 text-lg font-black">{step.title}</h3>
                    <p className="mt-2 text-sm font-semibold text-white/70">Dependency: {step.dependency}</p>
                    <p className="mt-1 text-sm font-semibold text-white/70">Unlocks: {step.unlocks}</p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
                    <span className={cn(
                      "rounded-full border px-3 py-1 text-xs font-black",
                      step.complete ? "border-emerald-200/30 bg-emerald-200/10 text-emerald-100" : "border-amber-200/30 bg-amber-200/10 text-amber-100",
                    )}>
                      {step.complete ? "Complete" : "Setup required"}
                    </span>
                    {step.target && step.actionLabel ? (
                      <button
                        type="button"
                        onClick={() => setActiveWorkspace(step.target as PrincipalSection)}
                        className="rounded-lg border border-cyan-200/30 bg-cyan-200/10 px-3 py-2 text-sm font-black text-cyan-100"
                      >
                        {step.actionLabel}
                      </button>
                    ) : null}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      );
    }

    if (activeWorkspace === "fees") {
      return (
        <section aria-label="Principal fees workspace" className="space-y-4">
          <WorkspaceHeading title="Fees" subtitle="Fees items needing attention" />
          <ActionRow labels={["View Collections", "Print Defaulters List", "Export Fee Summary"]} />
          <p className="text-sm font-black text-cyan-100">
            Fees workspace ready with {schoolRecords.feePayments.length + schoolRecords.feeBalances.length} operational records and 3 metrics.
          </p>
          <p className="text-sm font-black text-white">{formatKsh(visibleCollections)} collected today</p>
          {schoolRecords.feePayments.map((payment) => (
            <Card key={payment.id} className="border-white/10 bg-white/5 p-4 text-white">
              <p className="font-black">{payment.student} payment {payment.receiptNo ?? payment.id}</p>
              <p className="text-sm font-semibold text-white/70">Receipt amount {formatKsh(payment.amount)}</p>
            </Card>
          ))}
          {schoolRecords.feeBalances.map((balance) => (
            <p key={balance.id} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white">
              {balance.student}: Current balance {formatKsh(balance.balance)}
            </p>
          ))}
        </section>
      );
    }

    if (activeWorkspace === "attendance") {
      return (
        <section aria-label="Principal attendance workspace" className="space-y-4">
          <WorkspaceHeading title="Attendance" subtitle="Attendance items needing attention" />
          <p className="text-sm font-black text-white">{absentStudents} students absent, {lateStudents} late</p>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm font-bold text-white">
              Attendance date
              <input className="mt-1 w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-white" defaultValue="2026-06-29" />
            </label>
            <label className="text-sm font-bold text-white">
              Class or stream
              <input className="mt-1 w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-white" defaultValue={attendanceRegister?.className ?? ""} placeholder="No class register submitted yet" />
            </label>
            <label className="text-sm font-bold text-white">
              Search attendance records
              <input className="mt-1 w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-white" placeholder="Search class, student, teacher" />
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <MetricCard label="Present students" value={String(presentStudents)} />
            <MetricCard label="Absent students" value={String(absentStudents)} />
            <MetricCard label="Late students" value={String(lateStudents)} />
            <MetricCard label="Missing registers" value={String(missingRegisters)} />
          </div>
          <p className="text-sm font-semibold text-white/75">Teacher responsible: {attendanceRegister?.teacher ?? "Class Teacher dashboard"}</p>
          <p className="text-sm font-semibold text-white/75">Last updated from Teacher and Class Teacher dashboards</p>
          <ActionRow
            labels={["Send Absence SMS", "Print Attendance Report"]}
            onAction={(label) => {
              if (label === "Send Absence SMS") setAbsenceDialogOpen(true);
              if (label === "Print Attendance Report") setPrintDialogOpen(true);
            }}
          />
          {absenceDialogOpen ? (
            <p className="rounded-xl border border-cyan-200/30 bg-cyan-200/10 px-4 py-3 text-sm font-black text-cyan-100">
              Absence SMS confirmation ready with {guardianRecipientCount} guardian recipients for review before queueing.
            </p>
          ) : null}
        </section>
      );
    }

    if (activeWorkspace === "visitors") {
      return (
        <section aria-label="Principal visitors workspace" className="space-y-4">
          <WorkspaceHeading title="Parents & Visitors" subtitle="Front-office movement and parent inquiry queue" />
          <p className="text-sm font-black text-white">{visitorsInside} visitor inside and {waitingInquiries} parent inquiry waiting</p>
          {schoolRecords.visitors.map((visitor) => (
            <p key={visitor.id} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white">
              {visitor.visitor} visiting {visitor.visiting}
            </p>
          ))}
          {schoolRecords.inquiries.map((inquiry) => (
            <p key={inquiry.id} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white">
              {inquiry.parent} waiting for {inquiry.student}
            </p>
          ))}
        </section>
      );
    }

    if (activeWorkspace === "discipline") {
      return (
        <PrincipalListWorkspace
          section="discipline"
          title="Discipline"
          subtitle="Discipline incidents, parent summons, counselling referrals, and serious-case approvals"
          emptyTitle="No discipline cases recorded yet"
          emptyBody="Discipline records will appear after the discipline master logs a case, escalates a serious incident, or requests principal approval."
          primaryAction="Review Discipline Policy"
          rows={schoolRecords.disciplineCases.map((record) => ({
            id: record.id,
            title: record.student ?? record.incident ?? record.title ?? "Discipline case",
            detail: record.incident ?? record.severity ?? "Awaiting incident details",
            value: record.status ?? "Recorded",
          }))}
          metrics={[
            ["Open cases", schoolRecords.disciplineCases.filter((record) => !/resolved|closed/i.test(record.status ?? "")).length],
            ["Serious cases", schoolRecords.disciplineCases.filter((record) => /serious|critical/i.test(`${record.severity ?? ""} ${record.status ?? ""}`)).length],
            ["Pending approvals", pendingApprovals],
          ]}
          onNavigate={setActiveWorkspace}
          onExport={exportPrincipalWorkspaceSummary}
          onPrint={printPrincipalWorkspaceSummary}
        />
      );
    }

    if (activeWorkspace === "sick-bay") {
      return (
        <section aria-label="Principal sick bay workspace" className="space-y-4">
          <WorkspaceHeading title="Sick Bay" subtitle="Nurse referrals and medicine stock alerts" />
          <p className="text-sm font-black text-white">{schoolRecords.clinicVisits.length} sick bay case recorded and {medicineAlerts} medicine stock alert</p>
          {schoolRecords.clinicVisits.map((visit) => (
            <p key={visit.id} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white">
              {visit.student} referred from sick bay
            </p>
          ))}
          {schoolRecords.medicineStock.filter((row) => Number(row.quantity) <= Number(row.reorderAt)).map((row) => (
            <p key={row.id} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white">
              {row.medicine} low stock
            </p>
          ))}
        </section>
      );
    }

    if (activeWorkspace === "boarding") {
      return (
        <PrincipalListWorkspace
          section="boarding"
          title="Boarding"
          subtitle="Boarding roll call, dorm capacity, exeat requests, incidents, and welfare follow-up"
          emptyTitle="No boarding activity yet"
          emptyBody="Boarding records will appear after dorm setup, roll call submission, exeat requests, or boarding welfare incidents."
          primaryAction="Open Boarding Setup"
          rows={schoolRecords.boardingRecords.map((record) => ({
            id: record.id,
            title: record.student ?? record.dorm ?? record.title ?? "Boarding record",
            detail: record.dorm ?? record.type ?? "Boarding operation",
            value: record.status ?? "Recorded",
          }))}
          metrics={[
            ["Boarding records", schoolRecords.boardingRecords.length],
            ["Pending exeats", schoolRecords.boardingRecords.filter((record) => /pending/i.test(record.status ?? "")).length],
            ["Welfare alerts", schoolRecords.notifications.filter((notification) => /boarding|hostel|dorm/i.test(notification.sourceModule)).length],
          ]}
          onNavigate={setActiveWorkspace}
          onExport={exportPrincipalWorkspaceSummary}
          onPrint={printPrincipalWorkspaceSummary}
        />
      );
    }

    if (activeWorkspace === "academics") {
      return (
        <PrincipalListWorkspace
          section="academics"
          title="Academics"
          subtitle="Subjects, teacher allocation, lesson coverage, syllabus progress, and curriculum setup"
          emptyTitle="No academic setup records yet"
          emptyBody="Academic records will appear after subjects, streams, teacher allocations, lesson coverage, or syllabus plans are configured."
          primaryAction="Open Academic Setup"
          rows={schoolRecords.academicRecords.map((record) => ({
            id: record.id,
            title: record.title ?? record.subject ?? "Academic record",
            detail: record.subject ?? record.type ?? "Academic setup item",
            value: record.status ?? "Recorded",
          }))}
          metrics={[
            ["Academic records", schoolRecords.academicRecords.length],
            ["Teacher allocations", schoolRecords.academicRecords.filter((record) => /teacher|allocation/i.test(`${record.type ?? ""} ${record.title ?? ""}`)).length],
            ["Lesson coverage", schoolRecords.academicRecords.filter((record) => /lesson|coverage/i.test(`${record.type ?? ""} ${record.title ?? ""}`)).length],
          ]}
          onNavigate={setActiveWorkspace}
          onExport={exportPrincipalWorkspaceSummary}
          onPrint={printPrincipalWorkspaceSummary}
        />
      );
    }

    if (activeWorkspace === "staff") {
      return (
        <PrincipalListWorkspace
          section="staff"
          title="Staff"
          subtitle="Staff invitations, active roles, teaching duties, leave, and operational ownership"
          emptyTitle="No staff records yet"
          emptyBody="Staff records will appear after the principal invites users or the administrator creates staff profiles."
          primaryAction="Invite Staff"
          rows={schoolRecords.staffRecords.map((record) => ({
            id: record.id,
            title: record.name ?? record.title ?? "Staff member",
            detail: record.role ?? record.type ?? "School staff",
            value: record.status ?? "Recorded",
          }))}
          metrics={[
            ["Staff records", schoolRecords.staffRecords.length],
            ["Pending invitations", schoolRecords.staffRecords.filter((record) => /invited|pending/i.test(record.status ?? "")).length],
            ["Active staff", schoolRecords.staffRecords.filter((record) => /active/i.test(record.status ?? "")).length],
          ]}
          onNavigate={setActiveWorkspace}
          onExport={exportPrincipalWorkspaceSummary}
          onPrint={printPrincipalWorkspaceSummary}
        />
      );
    }

    if (activeWorkspace === "transport") {
      return (
        <PrincipalListWorkspace
          section="transport"
          title="Transport"
          subtitle="Routes, vehicles, student assignments, trips, pickup/drop-off events, and safety alerts"
          emptyTitle="No transport records yet"
          emptyBody="Transport records will appear after routes, vehicles, drivers, or student transport assignments are configured."
          primaryAction="Open Transport Setup"
          rows={schoolRecords.transportRecords.map((record) => ({
            id: record.id,
            title: record.route ?? record.vehicle ?? record.title ?? "Transport record",
            detail: record.vehicle ?? record.type ?? "Transport operation",
            value: record.status ?? "Recorded",
          }))}
          metrics={[
            ["Transport records", schoolRecords.transportRecords.length],
            ["Routes", schoolRecords.transportRecords.filter((record) => Boolean(record.route)).length],
            ["Trips today", schoolRecords.transportRecords.filter((record) => /trip|picked|dropped/i.test(`${record.type ?? ""} ${record.status ?? ""}`)).length],
          ]}
          onNavigate={setActiveWorkspace}
          onExport={exportPrincipalWorkspaceSummary}
          onPrint={printPrincipalWorkspaceSummary}
        />
      );
    }

    if (activeWorkspace === "library") {
      return (
        <section aria-label="Principal library workspace" className="space-y-4">
          <WorkspaceHeading title="Library" subtitle="Borrowing, overdue books, lost items, and fines" />
          <p className="text-sm font-black text-white">{schoolRecords.libraryLoans.length} active library records with {libraryFollowUps} needing follow-up</p>
          {schoolRecords.libraryLoans.map((loan) => (
            <Card key={loan.id} className="border-white/10 bg-white/5 p-4 text-white">
              <p className="font-black">{loan.bookTitle} borrowed by {loan.borrower}</p>
              <p className="text-sm font-semibold text-white/70">Fine {formatKsh(Number(loan.fine || 0))}</p>
            </Card>
          ))}
        </section>
      );
    }

    if (activeWorkspace === "exams-reports") {
      return (
        <section aria-label="Principal exams workspace" className="space-y-4">
          <WorkspaceHeading title="Exams & Results Command Center" subtitle="Exam governance queue for moderation, approval, and publishing" />
          <ActionRow labels={["Academic oversight", "Results approval", "Report publishing"]} />
        </section>
      );
    }

    if (activeWorkspace === "communication") {
      return (
        <PrincipalListWorkspace
          section="communication"
          title="Communication"
          subtitle="Parent/staff messages, delivery failures, notification queues, and unread alerts"
          emptyTitle="No communication records yet"
          emptyBody="Messages and notifications will appear after school workflows send parent, staff, or student communication."
          primaryAction="Open Communication Center"
          rows={schoolRecords.notifications.map((notification) => ({
            id: notification.id,
            title: notification.title,
            detail: notification.body,
            value: notification.read ? "Read" : "Unread",
          }))}
          metrics={[
            ["Unread notifications", schoolRecords.notifications.filter((notification) => !notification.read).length],
            ["Action required", schoolRecords.notifications.filter((notification) => notification.requiresAction).length],
            ["System alerts", unresolvedSystemAlerts],
          ]}
          onNavigate={setActiveWorkspace}
          onExport={exportPrincipalWorkspaceSummary}
          onPrint={printPrincipalWorkspaceSummary}
        />
      );
    }

    if (activeWorkspace === "users-invitations") {
      return (
        <UserManagementWorkspace
          schoolId={schoolId}
          schoolName={schoolName}
          actorRole="Principal"
          actorName={principalName}
          canInviteUsers={true}
          canManageUsers={true}
        />
      );
    }

    if (activeWorkspace === "approvals") {
      const approvalRows = schoolRecords.operationalRequests.filter((request) =>
        request.targetRoles.includes("principal") || request.originRole === "principal",
      );

      return (
        <PrincipalListWorkspace
          section="approvals"
          title="Approvals"
          subtitle="Principal approval queue across finance, exams, discipline, boarding, stock, and reports"
          emptyTitle="No approvals pending"
          emptyBody="This fresh school has no pending principal approvals. Requests will appear here after staff submit governed workflows."
          primaryAction="Refresh Approval Queue"
          rows={approvalRows.map((request) => ({
            id: request.id,
            title: request.title,
            detail: request.body,
            value: request.status,
          }))}
          metrics={[
            ["Pending approvals", pendingApprovals],
            ["Approved", approvalRows.filter((request) => request.status === "Approved").length],
            ["Rejected or failed", approvalRows.filter((request) => request.status === "Rejected" || request.status === "Failed").length],
          ]}
          onNavigate={setActiveWorkspace}
          onExport={exportPrincipalWorkspaceSummary}
          onPrint={printPrincipalWorkspaceSummary}
        />
      );
    }

    if (activeWorkspace === "reports") {
      return (
        <PrincipalListWorkspace
          section="reports"
          title="Reports"
          subtitle="Generated reports, printed documents, exports, and audit-safe download evidence"
          emptyTitle="No reports generated yet"
          emptyBody="Reports will appear after fee statements, attendance summaries, board reports, report cards, or operational exports are generated."
          primaryAction="Generate Principal Report"
          rows={schoolRecords.reportRecords.map((record) => ({
            id: record.id,
            title: record.title ?? record.type ?? "Generated report",
            detail: record.type ?? "Report/document",
            value: record.status ?? "Generated",
          }))}
          metrics={[
            ["Generated reports", schoolRecords.reportRecords.length],
            ["Printed documents", schoolRecords.reportRecords.filter((record) => /print|document/i.test(record.type ?? "")).length],
            ["Exports needing approval", pendingApprovals],
          ]}
          onNavigate={setActiveWorkspace}
          onExport={exportPrincipalWorkspaceSummary}
          onPrint={printPrincipalWorkspaceSummary}
        />
      );
    }

    if (activeWorkspace === "audit-logs") {
      return (
        <section aria-label="Principal audit logs workspace" className="space-y-4">
          <WorkspaceHeading title="Audit Logs" subtitle="Accountability records for school operations" />
          <div className="grid gap-3 md:grid-cols-3">
            <MetricCard label="Today actions" value={String(schoolRecords.auditLogs.length)} helper="Student, finance, attendance, and access events" />
            <MetricCard label="Sensitive changes" value={String(schoolRecords.auditLogs.filter((log) => /role|fee|mark|report|approval|permission/i.test(log.action)).length)} helper="Role, fee, marks, and report-card governance" />
            <MetricCard label="Failed actions" value={String(schoolRecords.auditLogs.filter((log) => /fail|error|reject/i.test(log.action)).length)} helper="No unresolved governed workflow failures" />
          </div>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[680px] text-left text-sm text-white">
              <thead className="bg-white/10 text-cyan-100">
                <tr>
                  <th className="px-4 py-3 font-black">Time</th>
                  <th className="px-4 py-3 font-black">Actor</th>
                  <th className="px-4 py-3 font-black">Action</th>
                  <th className="px-4 py-3 font-black">Entity</th>
                  <th className="px-4 py-3 font-black">Result</th>
                </tr>
              </thead>
              <tbody>
                {schoolRecords.auditLogs.length ? schoolRecords.auditLogs.map((log) => (
                  <tr key={log.id} className="border-t border-white/10">
                    <td className="px-4 py-3">{new Date(log.createdAt).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="px-4 py-3">{log.actorRole}</td>
                    <td className="px-4 py-3">{log.action}</td>
                    <td className="px-4 py-3">{log.module}</td>
                    <td className="px-4 py-3">{log.title}</td>
                  </tr>
                )) : (
                  <tr className="border-t border-white/10">
                    <td className="px-4 py-6 text-white/70" colSpan={5}>No audit events recorded for this school yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      );
    }

    return (
      <section aria-label="Principal overview workspace" className="space-y-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">School activity today</p>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">{schoolName} live updates</p>
          <h2 className="mt-1 text-2xl font-black text-white">Practical Kenyan school command center</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <MetricCard label="Students Present Today" value={String(presentStudents)} helper="From: Teacher and Class Teacher dashboards" />
          <MetricCard label="Fees Collected Today" value={formatKsh(visibleCollections)} helper="From: Accountant dashboard and M-Pesa confirmations" />
          <MetricCard label="Visitors Inside" value={String(visitorsInside)} helper="From: Secretary and Security dashboards" />
          <MetricCard label="Sick Bay Cases" value={String(schoolRecords.clinicVisits.length)} helper="From: Nurse dashboard and medicine stock records" />
          <MetricCard label="Pending Approvals" value={String(pendingApprovals)} helper="Approval queue" testId="principal-metric-pending-approvals" />
          <MetricCard label="System Alerts" value={String(unresolvedSystemAlerts)} helper="System monitor" testId="principal-metric-system-alerts" />
        </div>
        <Card className="border-white/10 bg-white/5 p-4 text-white">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-black">Alerts and risk center</p>
              <p className="mt-1 text-xs font-semibold text-white/65">
                Module-aware principal dashboard using enabled_modules from the live backend.
              </p>
            </div>
            <span className="rounded-full border border-cyan-200/30 bg-cyan-200/10 px-3 py-1 text-xs font-black text-cyan-100">
              {principalDashboardLoading ? "Loading modules" : `${enabledPrincipalModules.length} modules enabled`}
            </span>
          </div>
          <p className="mt-3 text-xs font-semibold text-white/65">
            Enabled modules: {enabledPrincipalModules.join(", ") || "Waiting for live principal dashboard"}
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {(principalAlerts.length ? principalAlerts.slice(0, 4) : [
              {
                id: "fallback-principal-risk",
                module_code: "principal_dashboard",
                title: "No live risk alerts returned",
                message: "The principal dashboard endpoint is reachable but has no current risk alerts for this tenant.",
                severity: "warning" as const,
              },
            ]).map((alert) => (
              <div key={alert.id} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <p className="text-sm font-black">{alert.title}</p>
                <p className="mt-1 text-xs font-semibold text-white/65">{alert.message}</p>
                <p className="mt-2 text-[11px] font-black uppercase tracking-[0.14em] text-cyan-100">
                  {alert.module_code} - {alert.severity}
                </p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="border-white/10 bg-white/5 p-4 text-white">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black">School activation path</p>
              <p className="mt-1 text-xs font-semibold text-white/65">
                {completedActivationSteps} of {activationSteps.length} setup gates complete. Open the checklist to see the dependency order.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveWorkspace("setup-checklist")}
              className="rounded-lg border border-cyan-200/30 bg-cyan-200/10 px-3 py-2 text-sm font-black text-cyan-100"
            >
              Open School Setup
            </button>
          </div>
        </Card>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Attendance", "View Attendance"],
            ["Fees", "View Fees"],
            ["Discipline", "View Discipline"],
            ["Parents & Visitors", "View Visitors"],
            ["Sick Bay", "View Sick Bay"],
            ["Boarding", "View Boarding"],
            ["Academics", "View Academics"],
            ["Staff", "View Staff"],
            ["Transport", "View Transport"],
          ].map(([label, action]) => (
            <button
              key={label}
              type="button"
              onClick={() => setActiveWorkspace(label === "Fees" ? "fees" : label === "Sick Bay" ? "sick-bay" : label === "Parents & Visitors" ? "visitors" : label.toLowerCase() as PrincipalSection)}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-black text-white transition hover:border-cyan-200/40 hover:bg-white/10"
            >
              <span className="block">{label}</span>
              <span className="mt-1 block text-xs font-semibold text-cyan-100">{action}</span>
            </button>
          ))}
        </div>
        <Card className="border-white/10 bg-white/5 p-4 text-white">
          <p className="text-sm font-black">Pending approvals</p>
          <button
            type="button"
            onClick={() => setActiveWorkspace("approvals")}
            className="mt-3 rounded-lg border border-cyan-200/30 bg-cyan-200/10 px-3 py-2 text-sm font-black text-cyan-100"
          >
            Open Approval Queue
          </button>
        </Card>
      </section>
    );
  }

  return (
    <DashboardCommunicationProvider>
      <div
        data-testid={activeWorkspace === "exams-reports" ? undefined : "role-operational-command-center"}
        data-route-mode={routeMode ?? "hosted"}
        className="min-h-dvh bg-[#F3F4F6] pb-24 lg:pb-6"
      >
        {mobileSidebarOpen ? (
          <button
            type="button"
            aria-label="Close principal navigation overlay"
            className="fixed inset-0 z-30 bg-slate-950/45 xl:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        ) : null}
        <div
          data-testid="principal-practical-command-center"
          className="grid gap-5 p-3 md:p-5 xl:grid-cols-[300px_minmax(0,1fr)]"
        >
          <aside
            className={cn(
              "fixed inset-y-0 left-0 z-40 flex w-[min(84vw,300px)] min-h-0 flex-col overflow-hidden border-r border-[#C8D5EA]/30 bg-[#071D49] p-4 text-white shadow-2xl transition-transform duration-200 xl:static xl:z-auto xl:h-[calc(100dvh-40px)] xl:w-auto xl:translate-x-0 xl:rounded-[var(--radius-xl)] xl:border-[#C8D5EA]/50 xl:shadow-[0_24px_70px_rgba(7,29,73,0.22)]",
              mobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
            )}
          >
            <div className="rounded-[var(--radius-lg)] border border-white/10 bg-white/[0.06] p-4">
              <p className="text-xs font-black uppercase text-cyan-200">Principal Command</p>
              <h2 className="mt-2 text-2xl font-black">{schoolName}</h2>
            </div>
            <nav aria-label="Principal dashboard sidebar" className="mt-5 flex-1 space-y-2 overflow-auto pr-1 pb-10">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveWorkspace(item.id)}
                    className={cn(
                      "flex min-h-10 w-full items-center justify-between gap-3 rounded-[var(--radius)] px-3 py-2 text-sm font-bold transition hover:-translate-y-0.5",
                      activeWorkspace === item.id
                        ? "border border-cyan-300/35 bg-cyan-300/12 text-cyan-100 shadow-[inset_4px_0_0_#22D3EE]"
                        : "text-white/72 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.count ? <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-black text-warning">{item.count}</span> : null}
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className="min-w-0 space-y-5">
            <header className="rounded-[var(--radius-xl)] border border-[#C8D5EA] bg-white p-4 text-[#071D49] shadow-[0_18px_50px_rgba(7,29,73,0.12)] md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <DashboardGreeting
                    name={principalName}
                    context={`${schoolName} command center`}
                  />
                  <h1 className="mt-1 text-2xl font-black">Principal Dashboard</h1>
                </div>
                <button
                  type="button"
                  aria-label="Open principal navigation"
                  className="rounded-xl border border-[#C8D5EA] bg-[#F8FAFC] px-3 py-2 text-sm font-black text-[#071D49] xl:hidden"
                  onClick={() => setMobileSidebarOpen(true)}
                >
                  <Menu className="mr-2 inline h-4 w-4" aria-hidden="true" />
                  Menu
                </button>
              </div>
            </header>

            <div className="rounded-[var(--radius-xl)] bg-[#071D49] p-5 shadow-[0_24px_70px_rgba(7,29,73,0.22)]">
              <section className="max-h-none overflow-y-auto">
                {renderWorkspace()}
              </section>
            </div>
          </main>
        </div>

        {absenceDialogOpen ? (
          <PrincipalDialog title="Confirm absence SMS" onClose={() => setAbsenceDialogOpen(false)}>
            <p className="font-black text-[#071D49]">
              Absence SMS confirmation ready with {guardianRecipientCount} guardian recipients for review before queueing.
            </p>
            <p className="font-black">Parent/guardian recipients</p>
            <p className="mt-2 text-sm font-semibold text-slate-600">Missing phone numbers: Faith Akinyi</p>
            <p className="mt-2 text-sm font-semibold text-slate-600">Message preview: Your child is marked absent today. Contact the school if this is incorrect.</p>
            <p className="mt-2 text-sm font-black text-rose-600">Disabled: SMS provider is not configured</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-lg border px-3 py-2 text-sm font-black" onClick={() => setAbsenceDialogOpen(false)}>Close</button>
              <button type="button" disabled className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-black text-slate-500">Queue absence SMS</button>
            </div>
          </PrincipalDialog>
        ) : null}

        {printDialogOpen ? (
          <PrincipalDialog title={`${schoolName} attendance report print preview`} onClose={() => setPrintDialogOpen(false)}>
            <p className="font-black">Preview document</p>
            <p className="mt-2 text-sm font-semibold text-slate-600">Attendance register, missing learners, late arrivals, and teacher source are compiled for the principal.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-lg border px-3 py-2 text-sm font-black" onClick={() => setPrintDialogOpen(false)}>Close</button>
              <button type="button" className="rounded-lg bg-[#071D49] px-3 py-2 text-sm font-black text-white">Print</button>
            </div>
          </PrincipalDialog>
        ) : null}
      </div>
    </DashboardCommunicationProvider>
  );
}

function WorkspaceHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-2xl font-black text-white">{title}</h2>
      <p className="mt-1 text-sm font-semibold text-white/70">{subtitle}</p>
    </div>
  );
}

function PrincipalListWorkspace({
  section,
  title,
  subtitle,
  emptyTitle,
  emptyBody,
  primaryAction,
  rows,
  metrics,
  onNavigate,
  onExport,
  onPrint,
}: {
  section: PrincipalSection;
  title: string;
  subtitle: string;
  emptyTitle: string;
  emptyBody: string;
  primaryAction: string;
  rows: PrincipalWorkspaceRow[];
  metrics: Array<[string, number]>;
  onNavigate: (section: PrincipalSection) => void;
  onExport: (section: PrincipalSection, title: string, rows: PrincipalWorkspaceRow[], metrics: Array<[string, number]>) => void;
  onPrint: (title: string, rows: PrincipalWorkspaceRow[], metrics: Array<[string, number]>) => void;
}) {
  const primaryTargets: Partial<Record<PrincipalSection, PrincipalSection>> = {
    discipline: "discipline",
    boarding: "boarding",
    academics: "academics",
    staff: "users-invitations",
    transport: "transport",
    communication: "communication",
    approvals: "approvals",
    reports: "reports",
  };

  return (
    <section aria-label={`Principal ${section} workspace`} className="space-y-4">
      <WorkspaceHeading title={title} subtitle={subtitle} />
      <div className="grid gap-3 md:grid-cols-3">
        {metrics.map(([label, value]) => (
          <MetricCard key={label} label={label} value={String(value)} />
        ))}
      </div>
      <ActionRow
        labels={[primaryAction, "Export Summary", "Print Workspace Report"]}
        onAction={(label) => {
          if (label === primaryAction) {
            onNavigate(primaryTargets[section] ?? section);
          } else if (label === "Export Summary") {
            onExport(section, title, rows, metrics);
          } else if (label === "Print Workspace Report") {
            onPrint(title, rows, metrics);
          }
        }}
      />
      {rows.length ? (
        <div className="space-y-3">
          {rows.map((row) => (
            <Card key={row.id} className="border-white/10 bg-white/5 p-4 text-white">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-black">{row.title}</p>
                  <p className="mt-1 text-sm font-semibold text-white/70">{row.detail}</p>
                </div>
                <span className="rounded-full border border-cyan-200/30 bg-cyan-200/10 px-3 py-1 text-xs font-black text-cyan-100">
                  {row.value}
                </span>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-white/10 bg-white/5 p-4 text-white">
          <p className="font-black">{emptyTitle}</p>
          <p className="mt-2 text-sm font-semibold text-white/70">{emptyBody}</p>
          <button
            type="button"
            onClick={() => onNavigate(primaryTargets[section] ?? section)}
            className="mt-4 rounded-lg border border-cyan-200/30 bg-cyan-200/10 px-3 py-2 text-sm font-black text-cyan-100"
          >
            {primaryAction}
          </button>
        </Card>
      )}
    </section>
  );
}

function MetricCard({ label, value, helper, testId }: { label: string; value: string; helper?: string; testId?: string }) {
  return (
    <Card data-testid={testId} className="border-white/10 bg-white/5 p-4 text-white">
      <p className="text-sm font-black">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
      {helper ? <p className="mt-2 text-xs font-semibold text-white/65">{helper}</p> : null}
    </Card>
  );
}

function ActionRow({
  labels,
  onAction,
}: {
  labels: string[];
  onAction?: (label: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {labels.map((label) => (
        <button
          key={label}
          type="button"
          onClick={() => onAction?.(label)}
          className="rounded-lg border border-cyan-200/30 bg-cyan-200/10 px-3 py-2 text-sm font-black text-cyan-100"
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function PrincipalDialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4">
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-lg rounded-2xl bg-white p-5 text-slate-900 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-black">{title}</h2>
          <button type="button" aria-label="Dismiss dialog" onClick={onClose} className="rounded-lg border p-1">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
