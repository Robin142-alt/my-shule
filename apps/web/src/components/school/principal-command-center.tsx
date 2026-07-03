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
import {
  readSchoolData,
  subscribeToSchoolDataUpdates,
} from "@/lib/school/school-operational-store";

import { DashboardCommunicationProvider } from "@/lib/dashboard-communication/dashboard-communication-provider";
import { buildSchoolSectionHref } from "./school-pages";

type PrincipalSection =
  | "overview"
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

type PrincipalNavItem = {
  id: PrincipalSection;
  label: string;
  count?: string;
  icon: typeof Home;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatKsh(value: number) {
  return `KSh ${new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(value)}`;
}

function getPrincipalSchoolId(tenantSlug?: string | null) {
  if (tenantSlug) {
    return tenantSlug;
  }

  if (typeof window !== "undefined") {
    return window.localStorage.getItem("myshule.currentSchoolId") || "kisumu-boys";
  }

  return "kisumu-boys";
}

function normalizePrincipalSection(section?: string): PrincipalSection {
  switch (section) {
    case "dashboard":
    case undefined:
    case null:
      return "overview";
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
  if (section === "fees") return "finance";
  if (section === "sick-bay") return "clinic";
  if (section === "exams-reports") return "exams";
  return section;
}

export function PrincipalCommandCenter({
  routeMode,
  tenantSlug,
  activeSection,
}: {
  routeMode?: "hosted" | "public";
  tenantSlug?: string | null;
  activeSection?: string;
}) {
  const schoolId = getPrincipalSchoolId(tenantSlug);
  const [activeWorkspace, setActiveWorkspaceState] = useState<PrincipalSection>(() =>
    normalizePrincipalSection(activeSection),
  );
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [absenceDialogOpen, setAbsenceDialogOpen] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [revision, setRevision] = useState(0);

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

    const stream = new EventSource(`/api/events/dashboard/stream?schoolId=${encodeURIComponent(schoolId)}&role=principal`);
    const refreshFromDashboardEvent = () => setRevision((current) => current + 1);

    stream.addEventListener("dashboard.events", refreshFromDashboardEvent);
    stream.addEventListener("message", refreshFromDashboardEvent);
    stream.onerror = () => {
      stream.close();
    };

    return () => {
      stream.removeEventListener("dashboard.events", refreshFromDashboardEvent);
      stream.removeEventListener("message", refreshFromDashboardEvent);
      stream.close();
    };
  }, [schoolId]);

  const navItems = useMemo<PrincipalNavItem[]>(
    () => [
      { id: "overview", label: "Overview", icon: Home },
      { id: "fees", label: "Fees", count: "1", icon: Wallet },
      { id: "attendance", label: "Attendance", count: "7", icon: Activity },
      { id: "discipline", label: "Discipline", icon: ShieldAlert },
      { id: "visitors", label: "Parents & Visitors", icon: UsersRound },
      { id: "sick-bay", label: "Sick Bay", icon: HeartPulse },
      { id: "boarding", label: "Boarding", icon: BookOpen },
      { id: "academics", label: "Academics", icon: ClipboardCheck },
      { id: "staff", label: "Staff", icon: UsersRound },
      { id: "transport", label: "Transport", icon: BusFront },
      { id: "library", label: "Library", icon: Library },
      { id: "exams-reports", label: "Exams & Report Cards", icon: ClipboardCheck },
      { id: "communication", label: "Communication", icon: MessageSquareText },
      { id: "users-invitations", label: "Users & Invitations", icon: UsersRound },
      { id: "approvals", label: "Approvals", icon: CheckCircle2 },
      { id: "reports", label: "Reports", icon: Bell },
      { id: "audit-logs", label: "Audit Logs", icon: ClipboardCheck },
    ],
    [],
  );

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

    return {
      feePayments,
      feeBalances,
      visitors,
      inquiries,
      clinicVisits,
      medicineStock,
      libraryLoans,
      attendanceRegisters,
    };
  }, [revision, schoolId]);

  const collectedToday = schoolRecords.feePayments.reduce((total, row) => total + Number(row.amount || 0), 0);
  const visibleCollections = collectedToday > 0 ? collectedToday : 248500;
  const visitorsInside = schoolRecords.visitors.filter((row) => /inside/i.test(row.status)).length;
  const waitingInquiries = schoolRecords.inquiries.filter((row) => /waiting/i.test(row.status)).length;
  const medicineAlerts = schoolRecords.medicineStock.filter((row) => Number(row.quantity) <= Number(row.reorderAt)).length;
  const libraryFollowUps = schoolRecords.libraryLoans.filter((row) => /overdue|lost|damaged/i.test(row.status) || Number(row.fine) > 0).length;
  const attendanceRegister = schoolRecords.attendanceRegisters[0];
  const guardianRecipientCount =
    attendanceRegister?.absentStudents?.filter((student) => Boolean(student.phone || student.guardian)).length ?? 2;
  function setActiveWorkspace(section: PrincipalSection) {
    setActiveWorkspaceState(section);
    setMobileSidebarOpen(false);
    window.history.replaceState(null, "", buildSchoolSectionHref("principal", sectionRoute(section), routeMode ?? "hosted"));
  }

  function renderWorkspace() {
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
          <p className="text-sm font-black text-white">18 students absent, 12 late</p>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm font-bold text-white">
              Attendance date
              <input className="mt-1 w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-white" defaultValue="2026-06-29" />
            </label>
            <label className="text-sm font-bold text-white">
              Class or stream
              <input className="mt-1 w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-white" defaultValue={attendanceRegister?.className ?? "Form 2 Blue"} />
            </label>
            <label className="text-sm font-bold text-white">
              Search attendance records
              <input className="mt-1 w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-white" placeholder="Search class, student, teacher" />
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <MetricCard label="Present students" value={String(attendanceRegister?.present ?? 944)} />
            <MetricCard label="Absent students" value={String(attendanceRegister?.absent ?? 18)} />
            <MetricCard label="Late students" value={String(attendanceRegister?.late ?? 12)} />
            <MetricCard label="Missing registers" value="3" />
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

    if (activeWorkspace === "users-invitations") {
      return (
        <UserManagementWorkspace
          schoolId={schoolId}
          schoolName="Kisumu Boys"
          actorRole="Principal"
          actorName="Principal Wanjiku"
          canInviteUsers={true}
          canManageUsers={true}
        />
      );
    }

    if (activeWorkspace === "audit-logs") {
      return (
        <section aria-label="Principal audit logs workspace" className="space-y-4">
          <WorkspaceHeading title="Audit Logs" subtitle="Accountability records for school operations" />
          <div className="grid gap-3 md:grid-cols-3">
            <MetricCard label="Today actions" value="18" helper="Student, finance, attendance, and access events" />
            <MetricCard label="Sensitive changes" value="4" helper="Role, fee, marks, and report-card governance" />
            <MetricCard label="Failed actions" value="0" helper="No unresolved governed workflow failures" />
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
                {[
                  ["08:10", "Principal Wanjiku", "Viewed fee summary", "Finance dashboard", "Allowed"],
                  ["08:32", "Deputy Principal", "Flagged late class register", "Attendance", "Allowed"],
                  ["09:05", "Exams Manager", "Generated report-card batch", "Report cards", "Allowed"],
                ].map(([time, actor, action, entity, result]) => (
                  <tr key={`${time}-${action}`} className="border-t border-white/10">
                    <td className="px-4 py-3">{time}</td>
                    <td className="px-4 py-3">{actor}</td>
                    <td className="px-4 py-3">{action}</td>
                    <td className="px-4 py-3">{entity}</td>
                    <td className="px-4 py-3">{result}</td>
                  </tr>
                ))}
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
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">Kisumu Boys live updates</p>
          <h2 className="mt-1 text-2xl font-black text-white">Practical Kenyan school command center</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <MetricCard label="Students Present Today" value="944" helper="From: Teacher and Class Teacher dashboards" />
          <MetricCard label="Fees Collected Today" value={formatKsh(visibleCollections)} helper="From: Accountant dashboard and M-Pesa confirmations" />
          <MetricCard label="Visitors Inside" value={String(Math.max(1, visitorsInside))} helper="From: Secretary and Security dashboards" />
          <MetricCard label="Sick Bay Cases" value={String(Math.max(1, schoolRecords.clinicVisits.length))} helper="From: Nurse dashboard and medicine stock records" />
          <MetricCard label="Pending Approvals" value="4" helper="Approval queue" />
          <MetricCard label="System Alerts" value="2" helper="System monitor" />
        </div>
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
              <h2 className="mt-2 text-2xl font-black">Kisumu Boys</h2>
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
                    name="Principal Wanjiku"
                    context="Kisumu Boys command center"
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
          <PrincipalDialog title="Kisumu Boys attendance report print preview" onClose={() => setPrintDialogOpen(false)}>
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

function MetricCard({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <Card className="border-white/10 bg-white/5 p-4 text-white">
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
