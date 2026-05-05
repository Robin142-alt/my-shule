"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, FileSpreadsheet, Printer, Send, UserPlus } from "lucide-react";

import { ActivityListCard, SimpleListCard } from "@/components/experience/activity-list-card";
import { MetricGrid } from "@/components/experience/metric-grid";
import { QuickActionBar } from "@/components/experience/quick-action-bar";
import { WorkspaceShell } from "@/components/experience/workspace-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { StatusPill } from "@/components/ui/status-pill";
import { Tabs } from "@/components/ui/tabs";
import { getSchoolKpiSummary, getSchoolWorkspace, schoolSectionLabels, type SchoolExperienceRole, type SchoolSubscriptionView } from "@/lib/experiences/school-data";

function SchoolPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-bold text-foreground">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </Card>
  );
}

function SubscriptionBanner({
  role,
  subscription,
}: {
  role: SchoolExperienceRole;
  subscription: SchoolSubscriptionView;
}) {
  return (
    <Card className="border-l-4 border-l-warning p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill label={subscription.statusLabel} tone={subscription.tone} />
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              {subscription.state}
            </span>
          </div>
          <h3 className="mt-3 text-lg font-semibold text-foreground">{subscription.headline}</h3>
          <p className="mt-2 text-sm leading-6 text-muted">{subscription.detail}</p>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted">
            <span>{subscription.renewalDueLabel}</span>
            <span>{subscription.exportAllowedLabel}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={subscription.primaryActionHref}>
            <Button>{subscription.primaryActionLabel}</Button>
          </Link>
          <Link href={`/school/${role}/reports`}>
            <Button variant="secondary">Export data</Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

function SubscriptionLifecyclePanel({
  role,
  subscription,
}: {
  role: SchoolExperienceRole;
  subscription: SchoolSubscriptionView;
}) {
  const [renewOpen, setRenewOpen] = useState(false);

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
              <Link href={`/school/${role}/reports`}>
                <Button variant="secondary">Export school data</Button>
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
            <Link href={`/school/${role}/finance`}>
              <Button>Start MPESA renewal</Button>
            </Link>
          </>
        }
      >
        <div className="space-y-4">
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

function SchoolDashboardHome({ role }: { role: SchoolExperienceRole }) {
  const { snapshot, model, subscription } = getSchoolWorkspace(role);

  return (
    <div className="space-y-6">
      <SubscriptionBanner role={role} subscription={subscription} />
      <MetricGrid items={getSchoolKpiSummary(role)} />
      <QuickActionBar
        actions={[
          { id: "record-payment", label: "Record Payment", description: "Post a school payment quickly", href: `/school/${role}/finance`, icon: FileSpreadsheet },
          { id: "add-student", label: "Add Student", description: "Create a learner record", href: `/school/${role}/students`, icon: UserPlus },
          { id: "send-sms", label: "Send SMS", description: "Reach families or a class stream", href: `/school/${role}/communication`, icon: Send },
          { id: "print-report", label: "Print Report", description: "Open class or fee reports", href: `/school/${role}/reports`, icon: Printer },
        ]}
      />
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <DataTable
            title="MPESA transactions"
            subtitle="Fresh mobile payments that bursars or principals usually check first."
            columns={[
              { id: "student", header: "Student", render: (row) => row.student },
              { id: "amount", header: "Amount", render: (row) => row.amount, className: "text-right font-semibold", headerClassName: "text-right" },
              { id: "phone", header: "Phone", render: (row) => row.phone },
              { id: "code", header: "Code", render: (row) => row.code },
              { id: "status", header: "Status", render: (row) => <StatusPill label={row.status} tone={row.statusTone} /> },
            ]}
            rows={model.dashboard.mpesaFeed}
            getRowKey={(row) => row.id}
          />
          <DataTable
            title="Payment activity"
            subtitle="Posted and in-flight collections for the current term."
            columns={[
              { id: "student", header: "Student", render: (row) => row.student },
              { id: "amount", header: "Amount", render: (row) => row.amount, className: "text-right font-semibold", headerClassName: "text-right" },
              { id: "method", header: "Method", render: (row) => row.method },
              { id: "date", header: "Date", render: (row) => row.date },
              { id: "reference", header: "Reference", render: (row) => row.reference },
            ]}
            rows={model.finance.rows.slice(0, 5)}
            getRowKey={(row) => row.id}
          />
        </div>
        <div className="space-y-6">
          <SimpleListCard
            title="Defaulters list"
            subtitle="Families that usually need a call or reminder next."
            items={model.dashboard.defaulters.map((row) => ({
              id: row.id,
              title: row.student,
              subtitle: row.className,
              value: row.balance,
            }))}
          />
          <SimpleListCard
            title="Attendance summary"
            subtitle="Signals for class roll call completion today."
            items={snapshot.attendance.classStatus.map((entry) => ({
              id: entry.className,
              title: entry.className,
              subtitle: `Attendance completion ${entry.value}`,
              value: entry.status,
              tone:
                entry.status === "synced"
                  ? "ok"
                  : entry.status === "pending"
                    ? "warning"
                    : "critical",
            }))}
          />
          <SimpleListCard
            title="Alerts"
            subtitle="Items that need attention before routine work."
            items={snapshot.alerts.map((alert) => ({
              id: alert.id,
              title: alert.title,
              subtitle: alert.description,
              value: alert.severity,
              tone: alert.severity,
            }))}
          />
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <ActivityListCard
          title="Recent activity"
          subtitle="School operations in reverse chronological order."
          items={snapshot.activityFeed.map((item) => ({
            id: item.id,
            title: item.title,
            detail: item.detail,
            timeLabel: item.timeLabel,
            tone: item.category === "payment" ? "ok" : item.category === "attendance" ? "warning" : "ok",
          }))}
        />
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-foreground">Quick actions</p>
              <p className="mt-1 text-sm leading-6 text-muted">
                The everyday things school teams need within two clicks.
              </p>
            </div>
            <Link href={`/school/${role}/reports`} className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              Reports
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {snapshot.quickActions.slice(0, 4).map((action) => (
              <Link
                key={action.id}
                href={`/school/${role}/${action.href}`}
                className="rounded-xl border border-border bg-surface-muted px-4 py-4 transition duration-150 hover:bg-surface-strong"
              >
                <p className="text-sm font-semibold text-foreground">{action.label}</p>
                <p className="mt-1 text-sm text-muted">{action.description}</p>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function SchoolStudentsPage({ role }: { role: SchoolExperienceRole }) {
  const { model } = getSchoolWorkspace(role);

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        eyebrow="Students"
        title="Learner register"
        description="Search, review, and open each learner profile with the balance and parent contact visible immediately."
        actions={<Button>Add student</Button>}
      />
      <DataTable
        title="Students"
        subtitle="Admission, family contact, class placement, and fee balance in one table."
        columns={[
          {
            id: "name",
            header: "Student Name",
            render: (row) => (
              <Link href={`/school/${role}/students/${row.id}`} className="font-semibold text-foreground underline-offset-4 hover:underline">
                {row.name}
              </Link>
            ),
          },
          { id: "admissionNumber", header: "Admission Number", render: (row) => row.admissionNumber },
          { id: "className", header: "Class", render: (row) => row.className },
          { id: "parent", header: "Parent Contact", render: (row) => row.parent },
          {
            id: "balance",
            header: "Fee Balance",
            render: (row) => <StatusPill label={row.balance} tone={row.balanceTone} />,
          },
        ]}
        rows={model.students.rows}
        getRowKey={(row) => row.id}
      />
    </div>
  );
}

function StudentProfilePage({
  role,
  studentId,
}: {
  role: SchoolExperienceRole;
  studentId: string;
}) {
  const { model } = getSchoolWorkspace(role);
  const profile = model.studentProfiles.find((entry) => entry.id === studentId) ?? model.studentProfiles[0];

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        eyebrow="Student profile"
        title={profile.name}
        description={`${profile.admissionNumber} • ${profile.className} • Parent ${profile.parentName} (${profile.parentPhone})`}
        actions={<Button variant="secondary">Download documents</Button>}
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
                    { id: "call", title: "Call parent", subtitle: "Discuss attendance or balances", value: "Available" },
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
            id: "attendance",
            label: "Attendance",
            panel: (
              <DataTable
                title="Attendance record"
                columns={[
                  { id: "date", header: "Date", render: (row) => row.date },
                  { id: "status", header: "Status", render: (row) => <StatusPill label={row.status} tone={row.statusTone} /> },
                  { id: "note", header: "Note", render: (row) => row.note },
                ]}
                rows={profile.attendance}
                getRowKey={(row) => row.id}
              />
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

function SchoolFinancePage({ role }: { role: SchoolExperienceRole }) {
  const { model, subscription } = getSchoolWorkspace(role);

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        eyebrow="Fees and payments"
        title="Collections workspace"
        description="Record payments, generate statements, and keep balances obvious enough for bursars and admins to trust instantly."
        actions={
          <>
            <Button variant="secondary">Create invoice</Button>
            <Button>Record payment</Button>
          </>
        }
      />
      <MetricGrid
        items={model.finance.summary.map((item) => ({
          id: item.id,
          label: item.label,
          value: item.value,
          helper: item.helper,
        }))}
      />
      <SubscriptionLifecyclePanel role={role} subscription={subscription} />
      <DataTable
        title="Payment history"
        subtitle="This term's collections and references, ready for statements or reversals."
        columns={[
          { id: "student", header: "Student", render: (row) => row.student },
          { id: "amount", header: "Amount", render: (row) => row.amount, className: "text-right font-semibold", headerClassName: "text-right" },
          { id: "method", header: "Method", render: (row) => row.method },
          { id: "date", header: "Date", render: (row) => row.date },
          { id: "reference", header: "Reference", render: (row) => row.reference },
          { id: "status", header: "Status", render: (row) => <StatusPill label={row.status} tone={row.statusTone} /> },
        ]}
        rows={model.finance.rows}
        getRowKey={(row) => row.id}
      />
    </div>
  );
}

function SchoolMpesaPage({ role }: { role: SchoolExperienceRole }) {
  const { model } = getSchoolWorkspace(role);

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        eyebrow="MPESA"
        title="Mobile money reconciliation"
        description="Handle auto-matching, manual review, callback confidence, and duplicate detection from one focused page."
        actions={<Button>Manual reconcile</Button>}
      />
      <MetricGrid
        items={model.mpesa.summary.map((item) => ({
          id: item.id,
          label: item.label,
          value: item.value,
          helper: item.helper,
        }))}
      />
      <DataTable
        title="MPESA transactions"
        subtitle="Phone, amount, receipt code, status, and matched learner."
        columns={[
          { id: "phone", header: "Phone", render: (row) => row.phone },
          { id: "amount", header: "Amount", render: (row) => row.amount, className: "text-right font-semibold", headerClassName: "text-right" },
          { id: "code", header: "Code", render: (row) => row.code },
          { id: "status", header: "Status", render: (row) => <StatusPill label={row.status} tone={row.statusTone} /> },
          { id: "matchedStudent", header: "Matched Student", render: (row) => row.matchedStudent },
          { id: "receivedAt", header: "Received", render: (row) => row.receivedAt },
        ]}
        rows={model.mpesa.rows}
        getRowKey={(row) => row.id}
      />
    </div>
  );
}

function SchoolAttendancePage({ role }: { role: SchoolExperienceRole }) {
  const { model } = getSchoolWorkspace(role);

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        eyebrow="Attendance"
        title="Daily attendance"
        description="Simple, fast marking with enough summary to spot unmarked classes or absent learners immediately."
        actions={<Button>{`Save ${model.attendance.dateLabel}`}</Button>}
      />
      <MetricGrid
        items={model.attendance.summary.map((item) => ({
          id: item.id,
          label: item.label,
          value: item.value,
          helper: item.helper,
        }))}
      />
      <DataTable
        title={`Roll call • ${model.attendance.dateLabel}`}
        subtitle="Toggle present or absent and keep offline-safe work clear."
        columns={[
          { id: "student", header: "Student", render: (row) => row.student },
          { id: "className", header: "Class", render: (row) => row.className },
          { id: "state", header: "Status", render: (row) => <StatusPill label={row.state} tone={row.state === "present" ? "ok" : "warning"} /> },
          { id: "synced", header: "Sync", render: (row) => <StatusPill label={row.synced} tone={row.synced} /> },
        ]}
        rows={model.attendance.rows}
        getRowKey={(row) => row.id}
      />
    </div>
  );
}

function SchoolAcademicsPage({ role }: { role: SchoolExperienceRole }) {
  const { model } = getSchoolWorkspace(role);

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        eyebrow="Academics"
        title="CBC academics"
        description="Marks entry, subject oversight, report cards, and classroom performance in a structure that feels familiar to schools."
      />
      <MetricGrid
        items={model.academics.summary.map((item) => ({
          id: item.id,
          label: item.label,
          value: item.value,
          helper: item.helper,
        }))}
      />
      <Tabs
        items={[
          {
            id: "subjects",
            label: "Subjects",
            panel: (
              <DataTable
                columns={[
                  { id: "subject", header: "Subject", render: (row) => row.subject },
                  { id: "teacher", header: "Teacher", render: (row) => row.teacher },
                  { id: "className", header: "Class", render: (row) => row.className },
                  { id: "average", header: "Average", render: (row) => row.average, className: "text-right font-semibold", headerClassName: "text-right" },
                ]}
                rows={model.academics.subjects}
                getRowKey={(row) => row.id}
              />
            ),
          },
          {
            id: "marks",
            label: "Marks entry",
            panel: (
              <DataTable
                columns={[
                  { id: "student", header: "Student", render: (row) => row.student },
                  { id: "english", header: "English", render: (row) => row.english, className: "text-right", headerClassName: "text-right" },
                  { id: "maths", header: "Maths", render: (row) => row.maths, className: "text-right", headerClassName: "text-right" },
                  { id: "science", header: "Science", render: (row) => row.science, className: "text-right", headerClassName: "text-right" },
                  { id: "socialStudies", header: "SST", render: (row) => row.socialStudies, className: "text-right", headerClassName: "text-right" },
                ]}
                rows={model.academics.marks}
                getRowKey={(row) => row.id}
              />
            ),
          },
          {
            id: "report-cards",
            label: "Report cards",
            panel: (
              <DataTable
                columns={[
                  { id: "learner", header: "Learner", render: (row) => row.learner },
                  { id: "className", header: "Class", render: (row) => row.className },
                  { id: "reportType", header: "Report", render: (row) => row.reportType },
                  { id: "status", header: "Status", render: (row) => <StatusPill label={row.status} tone={row.statusTone} /> },
                ]}
                rows={model.academics.reports}
                getRowKey={(row) => row.id}
              />
            ),
          },
        ]}
      />
    </div>
  );
}

function SchoolReportsPage({ role }: { role: SchoolExperienceRole }) {
  const { model } = getSchoolWorkspace(role);

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        eyebrow="Reports"
        title="Reports and exports"
        description="Print fee statements, payment summaries, report cards, and attendance exports without hunting through the system."
        actions={
          <>
            <Button variant="secondary">Export Excel</Button>
            <Button>Print report</Button>
          </>
        }
      />
      <MetricGrid
        items={model.reports.summary.map((item) => ({
          id: item.id,
          label: item.label,
          value: item.value,
          helper: item.helper,
        }))}
      />
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {model.reports.reports.map((report) => {
          const Icon = report.icon;
          return (
            <Card key={report.id} className="p-5">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-foreground">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{report.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{report.description}</p>
              <div className="mt-5 flex gap-2">
                <Button variant="secondary" size="sm">Print</Button>
                <Button size="sm">Export PDF</Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function SchoolCommunicationPage({ role }: { role: SchoolExperienceRole }) {
  const { model } = getSchoolWorkspace(role);

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        eyebrow="Communication"
        title="School messaging"
        description="Announcements, fee reminders, class updates, and SMS history in one straightforward workspace."
        actions={<Button>Send SMS</Button>}
      />
      <MetricGrid
        items={model.communication.summary.map((item) => ({
          id: item.id,
          label: item.label,
          value: item.value,
          helper: item.helper,
        }))}
      />
      <DataTable
        title="SMS history"
        subtitle="Messages already sent to all parents, class groups, or balance follow-up lists."
        columns={[
          { id: "audience", header: "Audience", render: (row) => row.audience },
          { id: "message", header: "Message", render: (row) => row.message },
          { id: "sentAt", header: "Sent", render: (row) => row.sentAt },
          { id: "status", header: "Status", render: (row) => <StatusPill label={row.status} tone={row.statusTone} /> },
        ]}
        rows={model.communication.history}
        getRowKey={(row) => row.id}
      />
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

export function SchoolPages({
  role,
  section = "dashboard",
  studentId,
}: {
  role: SchoolExperienceRole;
  section?: string;
  studentId?: string;
}) {
  const { navItems, profile } = getSchoolWorkspace(role);
  const activeHref = studentId
    ? `/school/${role}/students`
    : section === "dashboard"
      ? `/school/${role}`
      : `/school/${role}/${section}`;

  return (
    <WorkspaceShell
      brand={{ title: "Amani Prep", subtitle: "School workspace" }}
      navItems={navItems}
      activeHref={activeHref}
      topLabel={`School experience • ${role}`}
      title={schoolSectionLabels[section] ?? "Dashboard"}
      subtitle="Built for non-technical school teams: clear balances, familiar tables, and direct actions."
      status={{ label: "Tenant isolated", tone: "ok" }}
      profile={profile}
      actions={
        <Button variant="secondary">
          <CalendarDays className="h-4 w-4" />
          Term 2 • 2026
        </Button>
      }
    >
      {studentId ? <StudentProfilePage role={role} studentId={studentId} /> : null}
      {!studentId && section === "dashboard" ? <SchoolDashboardHome role={role} /> : null}
      {!studentId && section === "students" ? <SchoolStudentsPage role={role} /> : null}
      {!studentId && section === "finance" ? <SchoolFinancePage role={role} /> : null}
      {!studentId && section === "mpesa" ? <SchoolMpesaPage role={role} /> : null}
      {!studentId && section === "attendance" ? <SchoolAttendancePage role={role} /> : null}
      {!studentId && section === "academics" ? <SchoolAcademicsPage role={role} /> : null}
      {!studentId && section === "reports" ? <SchoolReportsPage role={role} /> : null}
      {!studentId && section === "communication" ? <SchoolCommunicationPage role={role} /> : null}
      {!studentId && section === "exams" ? (
        <SchoolBasicCardPage
          eyebrow="Exams"
          title="Exam operations"
          description="Timelines, invigilation readiness, and exam-room preparation in a calm operational view."
          items={[
            { id: "exam-1", title: "Mid-term CAT", subtitle: "Starts Monday across Grade 4–9", value: "5 days" },
            { id: "exam-2", title: "Invigilation rota", subtitle: "Teachers allocated and awaiting principal confirmation", value: "Draft" },
            { id: "exam-3", title: "CBC moderation", subtitle: "Science and Maths papers need moderation", value: "2 queues" },
          ]}
        />
      ) : null}
      {!studentId && section === "timetable" ? (
        <SchoolBasicCardPage
          eyebrow="Timetable"
          title="Timetable coordination"
          description="Class streams, teacher cover, and room availability without clutter."
          items={[
            { id: "time-1", title: "Grade 7 Hope", subtitle: "Maths • Mr. Otieno • Room 4", value: "08:00" },
            { id: "time-2", title: "Grade 5 Joy", subtitle: "English • Ms. Njoroge • Room 2", value: "09:10" },
            { id: "time-3", title: "Cover needed", subtitle: "Science practical facilitator absent", value: "Action" },
          ]}
        />
      ) : null}
      {!studentId && section === "staff" ? (
        <SchoolBasicCardPage
          eyebrow="Staff"
          title="Staff operations"
          description="Teachers, office staff, and operational ownership at a glance."
          items={[
            { id: "staff-1", title: "Teaching staff", subtitle: "27 teachers active this term", value: "27" },
            { id: "staff-2", title: "Admin coverage", subtitle: "Front office and bursary both staffed today", value: "Ready" },
            { id: "staff-3", title: "Leave requests", subtitle: "Two pending approvals this week", value: "2" },
          ]}
        />
      ) : null}
      {!studentId && section === "inventory" ? (
        <SchoolBasicCardPage
          eyebrow="Inventory"
          title="Inventory control"
          description="Simple operational inventory for books, lab items, and consumables."
          items={[
            { id: "inv-1", title: "Exercise books", subtitle: "Store balance looks healthy for the month", value: "1,240" },
            { id: "inv-2", title: "Science kits", subtitle: "Three kits need replenishment before exams", value: "Low" },
            { id: "inv-3", title: "Printer paper", subtitle: "Stock supports current report-card run", value: "OK" },
          ]}
        />
      ) : null}
      {!studentId && section === "settings" ? (
        <div className="space-y-6">
          <SchoolPageHeader
            eyebrow="Settings"
            title="School settings"
            description="School profile, fee structure, and user management in one trusted admin area."
          />
          <div className="grid gap-6 lg:grid-cols-3">
            <DataTable
              title="School profile"
              columns={[
                { id: "label", header: "Field", render: (row) => row.label },
                { id: "value", header: "Value", render: (row) => row.value },
              ]}
              rows={getSchoolWorkspace(role).model.settings.schoolProfile}
              getRowKey={(row) => row.id}
            />
            <DataTable
              title="Fee structure"
              columns={[
                { id: "item", header: "Item", render: (row) => row.item },
                { id: "frequency", header: "Frequency", render: (row) => row.frequency },
                { id: "amount", header: "Amount", render: (row) => row.amount, className: "text-right font-semibold", headerClassName: "text-right" },
              ]}
              rows={getSchoolWorkspace(role).model.settings.feeStructure}
              getRowKey={(row) => row.id}
            />
            <DataTable
              title="Users"
              columns={[
                { id: "name", header: "User", render: (row) => row.name },
                { id: "role", header: "Role", render: (row) => row.role },
                { id: "phone", header: "Phone", render: (row) => row.phone },
                { id: "status", header: "Status", render: (row) => <StatusPill label={row.status} tone={row.statusTone} /> },
              ]}
              rows={getSchoolWorkspace(role).model.settings.users}
              getRowKey={(row) => row.id}
            />
          </div>
        </div>
      ) : null}
    </WorkspaceShell>
  );
}
