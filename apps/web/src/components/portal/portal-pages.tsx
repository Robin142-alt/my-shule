"use client";

import { useEffect, useState, type ReactNode } from "react";
import { SmartphoneCharging } from "lucide-react";
import Link from "next/link";

import { ParentDisciplineView } from "@/components/discipline/discipline-workspace";
import { ActivityListCard, SimpleListCard } from "@/components/experience/activity-list-card";
import { MetricGrid } from "@/components/experience/metric-grid";
import { ParentCommandCenter } from "@/components/portal/parent-command-center";
import { PortalShell } from "@/components/portal/portal-shell";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  LiveIndicator,
  OperationalTimeline,
  ProgressRing,
  RiskHeatmap,
  SignalStrip,
} from "@/components/ui/command-primitives";
import { DataTable } from "@/components/ui/data-table";
import { StatusPill } from "@/components/ui/status-pill";
import {
  copyTextToClipboard,
  downloadTextFile,
  openPrintDocument,
} from "@/lib/dashboard/export";
import type { ExperienceNotificationItem } from "@/lib/experiences/types";
import {
  getPortalWorkspace,
  getPortalAcademicTargets, getPortalFeeHistory, getPortalMessages, getPortalParentChildren, getPortalPublishedExamResults, getPortalPublishedReportCards, getPortalTeacherComments,
  type PortalViewer,
} from "@/lib/experiences/portal-data";
import { toPortalPath } from "@/lib/routing/experience-routes";
import { getCurrentSchoolId } from "@/lib/school/school-operational-store";
import {
  readSchoolData,
  subscribeToSchoolDataUpdates,
} from "@/lib/school/school-operational-store";

type PortalRouteMode = "hosted" | "public";

type ParentMedicalHistoryRow = {
  id: string;
  visit_date?: string;
  symptoms_summary?: string | null;
  diagnosis_summary?: string | null;
  treatment_summary?: string | null;
  status?: string;
  medicines_dispensed?: Array<{
    medicine_name?: string;
    dosage?: string;
    quantity_dispensed?: number | string;
  }>;
};

type PortalLearnerCounsellingSessionRecord = {
  id: string;
  student: string;
  sessionType: string;
  followUpDate: string;
  status: string;
};

type PortalLearnerLibraryLoanRecord = {
  id: string;
  bookTitle: string;
  borrower: string;
  dueDate: string;
  status: string;
  fine?: number;
};

type PortalLearnerAttendanceRegisterRecord = {
  id: string;
  className: string;
  teacher?: string;
  absent?: number;
  status: string;
  markedAt?: string;
  absentLearners?: string[];
  lateLearners?: string[];
};

type PortalLearnerFeePaymentRecord = {
  id: string;
  student: string;
  admissionNo: string;
  amount: number;
  method: string;
  reference: string;
  receiptNo: string;
  status: string;
};

type PortalLearnerFeeBalanceRecord = {
  id: string;
  student: string;
  admissionNo: string;
  balance: number;
  status: string;
};

type PortalLearnerClinicVisitRecord = {
  id: string;
  student: string;
  className: string;
  medicine: string;
  status: string;
  parentContacted?: boolean;
  time: string;
};

type PortalFeeHistoryRow = {
  id: string;
  date: string;
  amount: string;
  method: string;
  reference: string;
  status: string;
};

function formatKsh(amount: number) {
  return `KSh ${amount.toLocaleString("en-KE")}`;
}

function studentOperationalItems(learnerName: string) {
  const feeBalances = readSchoolData<PortalLearnerFeeBalanceRecord>("fee-balances");
  const finance = readSchoolData<PortalLearnerFeePaymentRecord>("finance-payments")
    .filter((item) => item.student === learnerName)
    .map((item) => {
      const balance = feeBalances.find((record) => record.admissionNo === item.admissionNo || record.student === item.student);
      return {
        id: `student-finance-${item.id}`,
        title: `Fee payment recorded: ${formatKsh(item.amount)}`,
        subtitle: `Receipt ${item.receiptNo} via ${item.method}. Balance ${formatKsh(Number(balance?.balance ?? 0))}.`,
        value: item.status,
        tone: item.status === "M-Pesa Pending" || item.status === "Reversal Requested" ? "warning" as const : "ok" as const,
      };
    });
  const attendance = readSchoolData<PortalLearnerAttendanceRegisterRecord>("attendance-registers")
    .filter((item) => {
      const absentLearners = Array.isArray(item.absentLearners) ? item.absentLearners : [];
      const lateLearners = Array.isArray(item.lateLearners) ? item.lateLearners : [];
      return [...absentLearners, ...lateLearners].some((name) => name.toLowerCase() === learnerName.toLowerCase());
    })
    .map((item) => ({
      id: `student-attendance-${item.id}`,
      title: `Attendance follow-up recorded for ${item.className}`,
      subtitle: `${item.teacher ?? "Class teacher"} submitted the register with ${Number(item.absent ?? 0)} absent learners.`,
      value: item.status,
      tone: "warning" as const,
    }));
  const counselling = readSchoolData<PortalLearnerCounsellingSessionRecord>("counselling-sessions")
    .filter((item) => item.student === learnerName && item.status !== "Closed")
    .map((item) => ({
      id: `student-counselling-${item.id}`,
      title: "Counselling follow-up scheduled with the school counsellor",
      subtitle: `${item.sessionType} on ${item.followUpDate}. Detailed counsellor notes stay protected.`,
      value: item.status,
      tone: "warning" as const,
    }));
  const clinic = readSchoolData<PortalLearnerClinicVisitRecord>("clinic-visits")
    .filter((item) => item.student === learnerName)
    .map((item) => ({
      id: `student-clinic-${item.id}`,
      title: `Sick bay visit recorded: ${item.medicine}`,
      subtitle: `${item.status} at ${item.time}. Parent notification ${item.parentContacted ? "sent" : "pending"}.`,
      value: item.status,
      tone: item.status === "Referred" ? "warning" as const : "ok" as const,
    }));
  const library = readSchoolData<PortalLearnerLibraryLoanRecord>("library-loans")
    .filter((item) => item.borrower === learnerName && item.status !== "Returned")
    .map((item) => ({
      id: `student-library-${item.id}`,
      title: `${item.bookTitle} due on ${item.dueDate}`,
      subtitle: `Library status: ${item.status}. ${Number(item.fine ?? 0) > 0 ? `Fine ${formatKsh(Number(item.fine ?? 0))}. ` : ""}Return it through the librarian desk.`,
      value: item.status,
      tone: item.status === "Overdue" ? "warning" as const : "ok" as const,
    }));

  return [...finance, ...attendance, ...counselling, ...clinic, ...library].slice(0, 8);
}

function portalFeeRowsForLearner(learnerName: string): PortalFeeHistoryRow[] {
  const storedPayments = readSchoolData<PortalLearnerFeePaymentRecord>("finance-payments")
    .filter((item) => item.student === learnerName)
    .map((item) => ({
      id: item.id,
      date: item.receiptNo,
      amount: formatKsh(item.amount),
      method: item.method,
      reference: item.reference || item.receiptNo,
      status: item.status,
    }));

  return storedPayments.length > 0 ? storedPayments : getPortalFeeHistory(getCurrentSchoolId());
}

function buildPortalSectionHref(
  viewer: PortalViewer,
  section: Parameters<typeof toPortalPath>[0],
  routeMode: PortalRouteMode,
) {
  if (routeMode === "public") {
    return section === "dashboard" ? `/portal/${viewer}` : `/portal/${viewer}/${section}`;
  }

  return toPortalPath(section);
}

function mapPortalHref(
  viewer: PortalViewer,
  href: string,
  routeMode: PortalRouteMode,
) {
  const normalized = href.replace(/^\/+/, "");
  const section = normalized.length === 0 ? "dashboard" : normalized;

  return buildPortalSectionHref(
    viewer,
    section as Parameters<typeof toPortalPath>[0],
    routeMode,
  );
}

function PortalPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Parent & student portal</p>
          <h2 className="mt-2 text-2xl font-bold text-foreground">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </Card>
  );
}

function PortalDashboard({ viewer, routeMode }: { viewer: PortalViewer; routeMode: PortalRouteMode }) {
  const [studentNotice, setStudentNotice] = useState("Student desk ready for lessons, assignments, library books, and teacher messages.");
  const [studentUpdates, setStudentUpdates] = useState(() => studentOperationalItems("Brian Otieno"));
  const studentQuickActions = [
    { label: "View Assignment", href: buildPortalSectionHref("student", "academics", routeMode), helper: "Opens learning progress and academic notices." },
    { label: "Submit Work", disabledReason: "Disabled: submit-work form is not connected to an assignment yet." },
    { label: "View Learning Progress", href: buildPortalSectionHref("student", "academics", routeMode), helper: "Opens published learning progress." },
    { label: "Download Notes", href: buildPortalSectionHref("student", "downloads", routeMode), helper: "Opens available downloads." },
    { label: "View Library Due Date", disabledReason: "Disabled: student library due-date workspace is not connected." },
    { label: "Message Teacher", href: buildPortalSectionHref("student", "messages", routeMode), helper: "Opens official school messages." },
    { label: "Open Timetable", disabledReason: "Disabled: student timetable workspace is not connected." },
    { label: "View Announcement", href: buildPortalSectionHref("student", "notifications", routeMode), helper: "Opens school announcements." },
  ];

  useEffect(() => {
    function refreshStudentUpdates() {
      setStudentUpdates(studentOperationalItems("Brian Otieno"));
    }

    refreshStudentUpdates();
    return subscribeToSchoolDataUpdates(() => refreshStudentUpdates());
  }, []);

  if (viewer === "parent") {
    return <ParentCommandCenter routeMode={routeMode} />;
  }

  const { metrics } = getPortalWorkspace(viewer, getCurrentSchoolId());

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title="Student learning command view"
        description="A focused student view of assignments, timetable, attendance, notices, and learning activity."
        actions={<LiveIndicator label="Student sync" tone="ok" />}
      />
      <div role="status" className="rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold text-foreground shadow-sm">
        {studentNotice}
      </div>
      <MetricGrid items={metrics} />
      <SignalStrip
        items={[
          { id: "attendance", label: "Attendance snapshot", value: "Today", tone: "ok" },
          { id: "fees", label: "Fee summary", value: "Private", tone: "ok" },
          { id: "communication", label: "Teacher messages", value: "Monitored", tone: "warning" },
        ]}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <div className="space-y-6">
          <Card className="p-5">
            <p className="eyebrow">Today&apos;s work</p>
            <h3 className="mt-2 text-lg font-semibold text-foreground">Student quick actions</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              Practical learning actions stay visible without exposing schoolwide office data.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {studentQuickActions.map((action) => (
                action.href ? (
                  <Link
                    key={action.label}
                    href={action.href}
                    onClick={() =>
                      setStudentNotice(
                        `${action.label} route ready for Brian Otieno at ${action.href}; ${studentUpdates.length} learner-safe updates loaded.`,
                      )
                    }
                    className={buttonClasses({ variant: "secondary", className: "justify-center" })}
                  >
                    {action.label}
                  </Link>
                ) : (
                  <div key={action.label} className="rounded-[var(--radius-sm)] border border-border bg-surface-muted p-2">
                    <Button type="button" variant="secondary" disabled className="w-full justify-center">
                      {action.label}
                    </Button>
                    <p className="mt-2 text-[11px] font-semibold leading-4 text-muted">{action.disabledReason}</p>
                  </div>
                )
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="eyebrow">Child progress</p>
                <h3 className="mt-2 text-lg font-semibold text-foreground">
                  My progress timeline
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Attendance, academics, health, and communication updates appear here only for the verified learner.
                </p>
              </div>
              <ProgressRing value={76} label="Connection" tone="ok" />
            </div>
            <div className="mt-5">
              <OperationalTimeline
                items={[
                  { id: "attendance", title: "Attendance snapshot", detail: "Today's register appears after the class teacher publishes attendance.", timeLabel: "today", tone: "ok" },
                  { id: "fees", title: "Fee summary", detail: "Balances and payments remain private to verified family accounts.", timeLabel: "live", tone: "ok" },
                  { id: "clinic", title: "Clinic report", detail: "Health records appear when the Clinic module is enabled by the school.", timeLabel: "module", tone: "warning" },
                  { id: "teacher", title: "Teacher communication", detail: "Messages and notices stay connected to official school records.", timeLabel: "sync", tone: "ok" },
                ]}
              />
            </div>
          </Card>
          <DataTable
            title="Recent payments"
            subtitle="The latest posted family transactions."
            columns={[
              { id: "date", header: "Date", render: (row) => row.date },
              { id: "amount", header: "Amount", render: (row) => row.amount, className: "text-right font-semibold", headerClassName: "text-right" },
              { id: "method", header: "Method", render: (row) => row.method },
              { id: "reference", header: "Reference", render: (row) => row.reference },
              { id: "status", header: "Status", render: (row) => row.status },
            ]}
            rows={getPortalFeeHistory(getCurrentSchoolId())}
            getRowKey={(row) => row.id}
          />
        </div>
        <div className="space-y-6">
          <Card className="p-5">
            <p className="eyebrow">Learner wellbeing</p>
            <h3 className="mt-2 text-lg font-semibold text-foreground">Operational snapshots</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              Parents see a calm summary instead of schoolwide operational data.
            </p>
            <div className="mt-5">
              <RiskHeatmap
                cells={[
                  { id: "academics", label: "Academics", tone: "ok", value: "steady" },
                  { id: "attendance", label: "Attendance", tone: "ok", value: "present" },
                  { id: "discipline", label: "Discipline", tone: "warning", value: "watch" },
                  { id: "transport", label: "Transport", tone: "ok", value: "route" },
                ]}
              />
            </div>
          </Card>
          <ActivityListCard
            title="Messages"
            subtitle="Announcements, reminders, and teacher communication."
            items={getPortalMessages(getCurrentSchoolId())}
          />
          <SimpleListCard
            title="School updates"
            subtitle="Only learner-safe updates from school desks appear here."
            items={studentUpdates}
          />
        </div>
      </div>
    </div>
  );
}

function PortalFeesPage({ viewer }: { viewer: PortalViewer }) {
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [feeRows, setFeeRows] = useState<PortalFeeHistoryRow[]>(() => portalFeeRowsForLearner("Brian Otieno"));

  useEffect(() => {
    function refreshFeeRows() {
      setFeeRows(portalFeeRowsForLearner("Brian Otieno"));
    }

    refreshFeeRows();
    return subscribeToSchoolDataUpdates(() => refreshFeeRows());
  }, []);

  async function shareStatement() {
    const statementText = [
      "My Shule family statement",
      "",
      ...feeRows.map(
        (row) => `${row.date} | ${row.amount} | ${row.method} | ${row.reference} | ${row.status}`,
      ),
    ].join("\n");

    await copyTextToClipboard(statementText);
    setShareStatus(`Statement copied with ${feeRows.length} posted payment rows for the verified family account.`);
  }

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title="Fees"
        description="Current balance, payment history, and clear M-PESA instructions."
        actions={<Button onClick={() => void shareStatement()}>Share statement</Button>}
      />
      {shareStatus ? (
        <div className="rounded-xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-foreground">
          {shareStatus}
        </div>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
        <DataTable
          title="Payment history"
          subtitle="Posted transactions for the current fee account."
          columns={[
            { id: "date", header: "Date", render: (row) => row.date },
            { id: "amount", header: "Amount", render: (row) => row.amount, className: "text-right font-semibold", headerClassName: "text-right" },
            { id: "method", header: "Method", render: (row) => row.method },
            { id: "reference", header: "Reference", render: (row) => row.reference },
            { id: "status", header: "Status", render: (row) => row.status },
          ]}
            rows={feeRows}
            getRowKey={(row) => row.id}
          />
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-foreground">
              <SmartphoneCharging className="h-5 w-5" />
            </span>
            <div>
              <p className="text-lg font-semibold text-foreground">M-PESA payment instructions</p>
              <p className="mt-1 text-sm text-muted">Friendly enough for parents, still operationally accurate.</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {[
              "Go to M-PESA > Lipa na M-PESA > Pay Bill.",
              "Business number: 174379",
              "Use the learner admission number exactly as provided by the school.",
            ].map((item) => (
              <div key={item} className="rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-foreground">
                {item}
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-xl border border-warning/20 bg-warning/5 px-4 py-4">
            <p className="text-sm leading-6 text-foreground">
              {viewer === "parent"
                ? "If the payment is not reflected in 10 minutes, use the Messages page to contact bursary support."
                : "Students can view balance status here, but only linked family payers should settle fees."}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function PortalAcademicsPage({ viewer }: { viewer: PortalViewer }) {
  const [activeChildId, setActiveChildId] = useState(getPortalParentChildren(getCurrentSchoolId())[0]?.id ?? "");
  const [acknowledgedReports, setAcknowledgedReports] = useState<Record<string, boolean>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const activeChild = getPortalParentChildren(getCurrentSchoolId()).find((child) => child.id === activeChildId) ?? getPortalParentChildren(getCurrentSchoolId())[0];
  const visibleReports = getPortalPublishedReportCards(getCurrentSchoolId()).filter((report) => report.childId === activeChild?.id);
  const visibleResults = getPortalPublishedExamResults(getCurrentSchoolId()).filter((row) => row.childName === activeChild?.name);
  const visibleTargets = getPortalAcademicTargets(getCurrentSchoolId()).filter((row) => row.childName === activeChild?.name);
  const selectedReport = visibleReports.find((report) => report.id === selectedReportId) ?? null;
  const latestReport = visibleReports[0];
  const latestResult = visibleResults[0];
  const nextTarget = visibleTargets[0];
  const pendingAcknowledgements = visibleReports.filter((report) => !(acknowledgedReports[report.id] ?? report.acknowledged)).length;

  function printReportCard(report = visibleReports[0]) {
    if (!report) {
      setStatusMessage("No published report card is available to print.");
      return;
    }

    openPrintDocument({
      eyebrow: "Portal academics",
      title: `${report.reportType} - ${report.childName}`,
      subtitle: `${report.exam}, ${report.term} ${report.year}. Published ${report.publishedDate}.`,
      rows: visibleResults.map((row) => ({
        label: `${row.subject} - ${row.teacherComment}`,
        value: `${row.performance} (${row.grade})`,
      })),
      footer: "Published family portal report-card preview.",
    });
    setStatusMessage(
      `Print preview ready for ${report.childName}: ${visibleResults.length} published subject row${visibleResults.length === 1 ? "" : "s"} loaded.`,
    );
  }

  async function downloadReportCard(report = visibleReports[0]) {
    if (!report) {
      setStatusMessage("No published report card is available to download.");
      return;
    }

    try {
      setStatusMessage("Preparing report card download...");
      const res = await fetch(`/api/exams/report-cards/${report.id}/parent-download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        }
      });
      if (!res.ok) throw new Error("Failed to get download token");
      const { token } = await res.json();
      window.open(`/api/exams/report-cards/download/${token}`, '_blank');
      setStatusMessage(`Downloading report card for ${report.childName}...`);
    } catch (e: any) {
      setStatusMessage(`Download failed: ${e.message}`);
    }
  }

  function acknowledgeReport(reportId: string) {
    const report = getPortalPublishedReportCards(getCurrentSchoolId()).find((item) => item.id === reportId);

    if (!report) {
      setStatusMessage("Required source report was not found.");
      return;
    }

    setAcknowledgedReports((current) => ({ ...current, [reportId]: true }));
    setStatusMessage(`Report acknowledged for ${report.childName}.`);
  }

  function openReportViewer(reportId: string) {
    const report = visibleReports.find((item) => item.id === reportId);

    if (!report) {
      setStatusMessage("Required source report was not found for this linked child.");
      return;
    }

    setSelectedReportId(report.id);
    setStatusMessage(`Viewing published report for ${report.childName}.`);
  }

  if (viewer !== "parent") {
    return (
      <div className="space-y-6">
        <PortalPageHeader
          title="Academics"
          description="Learning resources and school notices for the verified student account."
        />
        <Card className="p-5">
          <p className="text-sm leading-6 text-muted">
            Published academic reports are handled through the parent portal in this exam flow.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title="Academics"
        description="Published results, report cards, teacher comments, targets, and acknowledgement for linked children only."
        actions={
          <Button variant="secondary" onClick={() => downloadReportCard()}>
            Download latest report
          </Button>
        }
      />
      {statusMessage ? (
        <div className="rounded-xl border border-success/20 bg-success/10 px-4 py-3 text-sm font-semibold text-foreground">
          {statusMessage}
        </div>
      ) : null}
      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Child switcher</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {getPortalParentChildren(getCurrentSchoolId()).map((child) => {
            const active = child.id === activeChild?.id;

            return (
              <button
                key={child.id}
                type="button"
                onClick={() => {
                  setActiveChildId(child.id);
                  setSelectedReportId(null);
                  const childReportCount = getPortalPublishedReportCards(getCurrentSchoolId()).filter((report) => report.childId === child.id).length;
                  const childResultCount = getPortalPublishedExamResults(getCurrentSchoolId()).filter((row) => row.childName === child.name).length;
                  setStatusMessage(
                    `${child.name} academic record selected: ${childReportCount} published report${childReportCount === 1 ? "" : "s"}, ${childResultCount} result row${childResultCount === 1 ? "" : "s"} loaded.`,
                  );
                }}
                className={`rounded-[var(--radius-sm)] border px-4 py-3 text-left transition ${
                  active
                    ? "border-info/30 bg-info-soft text-foreground"
                    : "border-border bg-surface-muted text-muted-strong hover:border-border-strong"
                }`}
              >
                <p className="text-sm font-semibold">{child.name}</p>
                <p className="mt-1 text-[12px]">
                  {child.admissionNumber} - {child.gradeForm} {child.stream}
                </p>
                <p className="mt-1 text-[12px]">{child.school} - {child.status}</p>
              </button>
            );
          })}
        </div>
      </Card>
      <Card className="p-5">
        <p className="eyebrow">Child Overview</p>
        <h3 className="mt-2 text-lg font-semibold text-foreground">Child Overview</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Latest Exam", latestReport?.exam ?? "No published exam"],
            ["Overall Performance", latestResult ? `${latestResult.performance} (${latestResult.grade})` : "No published result"],
            ["Class/Form/Grade", activeChild?.gradeForm ?? "Not recorded"],
            ["Improvement areas", nextTarget?.target ?? "No target published"],
            ["Next Academic Target", nextTarget?.suggestedAction ?? "No next step published"],
            ["Report Acknowledgement Status", pendingAcknowledgements > 0 ? `${pendingAcknowledgements} awaiting acknowledgement` : "All reports acknowledged"],
            ["Attendance Summary", "Shown when school attendance records are connected"],
            ["Fee Balance", "Hidden unless school report policy allows fee visibility"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">{label}</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-5">
        <p className="eyebrow">Academic Progress</p>
        <h3 className="mt-2 text-lg font-semibold text-foreground">Academic Progress</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">Performance trend</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {visibleResults.length ? visibleResults.map((row) => `${row.subject}: ${row.performance}`).join(" | ") : "No published trend yet"}
            </p>
          </div>
          <div className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">Best subjects</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{visibleResults[0]?.subject ?? "No subject result published"}</p>
          </div>
          <div className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">Improvement areas</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{nextTarget?.target ?? "No improvement area published"}</p>
          </div>
        </div>
      </Card>
      {selectedReport ? (
        <Card className="p-5" data-testid="parent-report-viewer">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="eyebrow">Parent report viewer</p>
              <h3 className="mt-2 text-lg font-semibold text-foreground">Parent report viewer</h3>
              <p className="mt-1 text-sm font-semibold text-muted">{selectedReport.reportType}</p>
              <p className="mt-1 text-sm text-muted">
                {selectedReport.exam} - {selectedReport.term} {selectedReport.year} - Published {selectedReport.publishedDate}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => downloadReportCard(selectedReport)}>
                Download PDF
              </Button>
              <Button size="sm" variant="secondary" onClick={() => printReportCard(selectedReport)}>
                Print
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setSelectedReportId(null)}>
                Close
              </Button>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
                {selectedReport.reportType === "Legacy 8-4-4/KCSE Report" ? "Student bio" : "Learner bio"}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">{selectedReport.childName}</p>
              <p className="mt-1 text-sm text-muted">{selectedReport.gradeForm}</p>
              <p className="mt-1 text-sm text-muted">{activeChild?.admissionNumber} - {activeChild?.school}</p>
            </div>
            <div className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
                {selectedReport.reportType === "Legacy 8-4-4/KCSE Report" ? "Legacy marks and grade summary" : "CBC competency summary"}
              </p>
              <p className="mt-1 text-sm leading-6 text-foreground">{selectedReport.summary}</p>
            </div>
            <div className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">Acknowledgement</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {(acknowledgedReports[selectedReport.id] ?? selectedReport.acknowledged) ? "Acknowledged" : "Awaiting acknowledgement"}
              </p>
              <p className="mt-1 text-sm text-muted">{selectedReport.viewedStatus}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-[var(--radius-sm)] border border-border bg-white px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">Teacher comments</p>
              <div className="mt-3 space-y-2">
                {getPortalTeacherComments(getCurrentSchoolId()).map((comment) => (
                  <div key={comment.id} className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-3 py-2">
                    <p className="text-sm font-semibold text-foreground">{comment.title}</p>
                    <p className="mt-1 text-sm text-muted">{comment.detail}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[var(--radius-sm)] border border-border bg-white px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">Academic targets</p>
              <div className="mt-3 space-y-2">
                {visibleTargets.length ? (
                  visibleTargets.map((target) => (
                    <div key={target.id} className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-3 py-2">
                      <p className="text-sm font-semibold text-foreground">{target.subject}: {target.target}</p>
                      <p className="mt-1 text-sm text-muted">{target.suggestedAction}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted">No published academic targets are available for this child.</p>
                )}
              </div>
            </div>
          </div>
        </Card>
      ) : null}
      <DataTable
        title="Published report cards"
        subtitle="Only reports released to the parent portal for the active linked child."
        columns={[
          { id: "child", header: "Child", render: (row) => row.childName },
          { id: "exam", header: "Exam", render: (row) => row.exam },
          { id: "grade", header: "Grade/Form", render: (row) => row.gradeForm },
          { id: "type", header: "Report type", render: (row) => row.reportType },
          { id: "published", header: "Published", render: (row) => row.publishedDate },
          {
            id: "acknowledged",
            header: "Acknowledgement",
            render: (row) => {
              const acknowledged = acknowledgedReports[row.id] ?? row.acknowledged;

              return acknowledged ? "Acknowledged just now" : "Awaiting acknowledgement";
            },
          },
          {
            id: "actions",
            header: "Actions",
            render: (row) => {
              const acknowledged = acknowledgedReports[row.id] ?? row.acknowledged;

              return (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => openReportViewer(row.id)}>
                    View Report
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => downloadReportCard(row)}>
                    Download PDF
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => printReportCard(row)}>
                    Print
                  </Button>
                  <Button size="sm" onClick={() => acknowledgeReport(row.id)} disabled={acknowledged}>
                    {acknowledged ? "Acknowledged" : "Acknowledge Report"}
                  </Button>
                </div>
              );
            },
          },
        ]}
        rows={visibleReports}
        getRowKey={(row) => row.id}
        emptyMessage="No published report cards found for this linked child."
      />
      <DataTable
        title="Parent Acknowledgement"
        subtitle="Parent confirmation for reports published to the active linked child."
        columns={[
          { id: "report", header: "Report", render: (row) => row.exam },
          { id: "published", header: "Published Date", render: (row) => row.publishedDate },
          { id: "viewed", header: "Viewed Date", render: (row) => row.viewedStatus },
          {
            id: "acknowledgement",
            header: "Acknowledgement Status",
            render: (row) => (acknowledgedReports[row.id] ?? row.acknowledged) ? "Acknowledged" : "Awaiting acknowledgement",
          },
          {
            id: "action",
            header: "Action",
            render: (row) => {
              const acknowledged = acknowledgedReports[row.id] ?? row.acknowledged;

              return (
                <Button size="sm" onClick={() => acknowledgeReport(row.id)} disabled={acknowledged}>
                  {acknowledged ? "Acknowledged" : "Acknowledge Report"}
                </Button>
              );
            },
          },
        ]}
        rows={visibleReports}
        getRowKey={(row) => `ack-${row.id}`}
        emptyMessage="No published reports require acknowledgement for this linked child."
      />
      <DataTable
        title="Published exam results"
        subtitle="Subject performance released by the school for the active linked child."
        columns={[
          { id: "exam", header: "Exam", render: (row) => row.exam },
          { id: "subject", header: "Subject", render: (row) => row.subject },
          { id: "performance", header: "Performance", render: (row) => row.performance, className: "font-semibold" },
          { id: "grade", header: "Grade", render: (row) => row.grade },
          { id: "comment", header: "Teacher comment", render: (row) => row.teacherComment },
          { id: "target", header: "Target", render: (row) => row.target },
          { id: "status", header: "Status", render: (row) => <StatusPill label={row.status} tone="ok" /> },
        ]}
        rows={visibleResults}
        getRowKey={(row) => row.id}
        emptyMessage="No published results found for this linked child."
      />
      <DataTable
        title="Academic targets"
        subtitle="Next steps published with the learner academic record."
        columns={[
          { id: "subject", header: "Subject", render: (row) => row.subject },
          { id: "current", header: "Current performance", render: (row) => row.currentPerformance },
          { id: "target", header: "Target", render: (row) => row.target },
          { id: "teacher", header: "Responsible teacher", render: (row) => row.responsibleTeacher },
          { id: "action", header: "Suggested action", render: (row) => row.suggestedAction },
          { id: "status", header: "Status", render: (row) => row.status },
        ]}
        rows={visibleTargets}
        getRowKey={(row) => row.id}
        emptyMessage="No academic targets found for this linked child."
      />
      <ActivityListCard
        title="Teacher and school comments"
        subtitle="Published teacher, class teacher, and principal comments for the active learner."
        items={getPortalTeacherComments(getCurrentSchoolId())}
      />
      <ActivityListCard
        title="School Messages"
        subtitle="Academic-related notices released to the parent dashboard."
        items={getPortalMessages(getCurrentSchoolId())}
      />
    </div>
  );
}

function PortalMessagesPage() {
  return (
    <div className="space-y-6">
      <PortalPageHeader
        title="Messages"
        description="Announcements, SMS history, and family communication in one calm center."
      />
      <ActivityListCard
        title="School messages"
        subtitle="Recent notices and action-oriented reminders."
        items={getPortalMessages(getCurrentSchoolId())}
      />
    </div>
  );
}

function PortalDownloadsPage() {
  function downloadAll() {
    downloadTextFile({
      filename: "portal-downloads.txt",
      content: [
        "My Shule portal downloads",
        "",
        "No portal documents are available yet.",
      ].join("\n"),
    });
  }

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title="Downloads"
        description="Important documents ready to save or print."
        actions={
          <Button variant="secondary" onClick={downloadAll}>
            Download all
          </Button>
        }
      />
      <SimpleListCard
        title="Available files"
        subtitle="Family documents appear after the school publishes real files."
        items={[]}
      />
    </div>
  );
}

function PortalHealthPage({ viewer }: { viewer: PortalViewer }) {
  const [studentId, setStudentId] = useState("");
  const [history, setHistory] = useState<ParentMedicalHistoryRow[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId.trim() || viewer !== "parent") {
      return;
    }

    let cancelled = false;

    async function loadHistory() {
      setStatus("Loading medical history");

      try {
        const response = await fetch(`/api/clinic/parent/students/${encodeURIComponent(studentId.trim())}/history`, {
          credentials: "same-origin",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Medical history is not available for this learner.");
        }

        const payload = await response.json() as ParentMedicalHistoryRow[];

        if (!cancelled) {
          setHistory(Array.isArray(payload) ? payload : []);
          setStatus(null);
        }
      } catch (error) {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : "Medical history is not available for this learner.");
        }
      }
    }

    const timer = window.setTimeout(() => {
      void loadHistory();
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [studentId, viewer]);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title="Health"
        description="Clinic visits and medicines issued to linked learners."
      />
      {viewer !== "parent" ? (
        <Card className="p-5">
          <p className="text-sm text-muted">Health history is available to linked parents and guardians.</p>
        </Card>
      ) : (
        <>
          <Card className="p-5">
            <label className="text-sm font-semibold text-foreground" htmlFor="student-medical-history-id">
              Learner ID
            </label>
            <input
              id="student-medical-history-id"
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              placeholder="Paste linked learner ID"
            />
            {status ? <p className="mt-3 text-sm text-muted">{status}</p> : null}
          </Card>
          <DataTable
            title="Medical history"
            subtitle="Confidential clinician notes remain hidden from this view."
            columns={[
              { id: "date", header: "Date", render: (row) => row.visit_date ?? "Not dated" },
              { id: "diagnosis", header: "Summary", render: (row) => row.diagnosis_summary ?? row.symptoms_summary ?? "No summary" },
              {
                id: "medicine",
                header: "Medicine",
                render: (row) => row.medicines_dispensed?.map((item) => item.medicine_name).filter(Boolean).join(", ") || "None recorded",
              },
              { id: "status", header: "Status", render: (row) => <StatusPill label={row.status ?? "recorded"} tone="ok" /> },
            ]}
            rows={history}
            getRowKey={(row) => row.id}
          />
        </>
      )}
    </div>
  );
}

function PortalNotificationsPage() {
  return (
    <div className="space-y-6">
      <PortalPageHeader
        title="Notifications"
        description="Important fee, academic, and classroom notices gathered in one list."
      />
      <ActivityListCard
        title="Notification feed"
        subtitle="Recent alerts and reminders for the learner account."
        items={getPortalMessages(getCurrentSchoolId())}
      />
    </div>
  );
}

export function PortalPages({
  viewer,
  section = "dashboard",
  routeMode = "hosted",
}: {
  viewer: PortalViewer;
  section?: string;
  routeMode?: PortalRouteMode;
}) {
  const { navItems, profile } = getPortalWorkspace(viewer, getCurrentSchoolId());
  const activeHref =
    section === "dashboard"
      ? buildPortalSectionHref(viewer, "dashboard", routeMode)
      : buildPortalSectionHref(
          viewer,
          section as Parameters<typeof toPortalPath>[0],
          routeMode,
        );
  const scopedNavItems = navItems.map((item) => ({
    ...item,
    href: mapPortalHref(viewer, item.href, routeMode),
  }));
  const notifications: ExperienceNotificationItem[] = getPortalMessages(getCurrentSchoolId()).map(
    (message): ExperienceNotificationItem => ({
      id: message.id,
      title: message.title,
      detail: message.detail,
      timeLabel: message.timeLabel,
      tone: message.tone,
      href: mapPortalHref(viewer, "/notifications", routeMode),
    }),
  );

  return (
    <PortalShell
      brand={{ title: "My Shule Portal", subtitle: viewer === "parent" ? "Family portal" : "Student portal" }}
      navItems={scopedNavItems}
      activeHref={activeHref}
      topLabel={viewer === "parent" ? "Family portal" : "Student portal"}
      title={section === "dashboard" ? "Family dashboard" : section.charAt(0).toUpperCase() + section.slice(1)}
      subtitle="Mobile-friendly, calm, and clear enough for families to use without training."
      status={{ label: "School synced", tone: "ok" }}
      profile={profile}
      notifications={notifications}
      actions={<StatusPill label="Balance visible" tone="ok" />}
    >
      {section === "dashboard" ? <PortalDashboard viewer={viewer} routeMode={routeMode} /> : null}
      {section === "fees" ? <PortalFeesPage viewer={viewer} /> : null}
      {section === "academics" ? <PortalAcademicsPage viewer={viewer} /> : null}
      {section === "discipline" ? <ParentDisciplineView /> : null}
      {section === "health" ? <PortalHealthPage viewer={viewer} /> : null}
      {section === "messages" ? <PortalMessagesPage /> : null}
      {section === "downloads" ? <PortalDownloadsPage /> : null}
      {section === "notifications" ? <PortalNotificationsPage /> : null}
    </PortalShell>
  );
}
