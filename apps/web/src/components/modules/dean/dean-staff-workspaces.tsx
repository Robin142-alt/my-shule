"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import type { DeanDataset, DepartmentSummary, TeacherWorkload } from "@/lib/modules/dean-data";

async function recordDeanWorkflow(action: string, payload: Record<string, unknown>) {
  return requestDashboardApi("/api/admin-command/dean-academics/action", {
    method: "POST",
    body: { action, ...payload },
  });
}

export function DepartmentsWorkspace({ dataset }: { dataset: DeanDataset }) {
  const [deptRows, setDeptRows] = useState(dataset.departments);
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentSummary | null>(deptRows[0] ?? null);
  const [isAssignHodOpen, setIsAssignHodOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [hodName, setHodName] = useState(deptRows[0]?.hod ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const onTrackDepts = deptRows.filter(d => d.riskLevel === "on-track").length;
  const pendingReports = deptRows.reduce((acc, val) => acc + val.pendingReports, 0);

  function openAssignHod() {
    const target = deptRows[0] ?? null;
    setSelectedDepartment(target);
    setHodName(target?.hod ?? "");
    setIsAssignHodOpen(true);
  }

  async function assignHod(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDepartment) {
      setNotice("No department is available for HOD assignment.");
      setIsAssignHodOpen(false);
      return;
    }

    setIsSaving(true);
    try {
      await recordDeanWorkflow("hod_assignment_requested", {
        title: "HOD assignment requested",
        message: `${hodName.trim()} was selected for ${selectedDepartment.name}. Confirm the staff user ID before final role update.`,
        departmentId: selectedDepartment.id,
        departmentName: selectedDepartment.name,
        hodName: hodName.trim(),
      });
      setDeptRows((current) =>
        current.map((row) =>
          row.id === selectedDepartment.id ? { ...row, hod: hodName.trim() } : row,
        ),
      );
      setNotice(`${hodName.trim()} recorded as the requested HOD for ${selectedDepartment.name}.`);
      setIsAssignHodOpen(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not record the HOD assignment request.");
    } finally {
      setIsSaving(false);
    }
  }

  async function requestDepartmentReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const target = deptRows.find((row) => row.pendingReports > 0) ?? deptRows[0] ?? null;
    if (!target) {
      setNotice("No department is available for report request.");
      setIsReportOpen(false);
      return;
    }

    setIsSaving(true);
    try {
      await recordDeanWorkflow("department_report_requested", {
        title: "Department report requested",
        message: String(form.get("message") ?? ""),
        departmentId: target.id,
        departmentName: target.name,
        hod: target.hod,
      });
      setNotice(`Department report request recorded for ${target.hod} in ${target.name}.`);
      setIsReportOpen(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not request the department report.");
    } finally {
      setIsSaving(false);
    }
  }

  const columns: DataTableColumn<typeof deptRows[0]>[] = [
    { id: "department", header: "Department", render: (row) => <span className="font-semibold">{row.name}</span> },
    { id: "hod", header: "HOD", render: (row) => row.hod },
    { id: "teachers", header: "Teachers", render: (row) => row.teachers },
    { id: "coverage", header: "Avg Coverage", render: (row) => row.syllabusCoverage },
    { id: "performance", header: "Avg Mean", render: (row) => row.performance },
    { id: "risk", header: "Risk Level", render: (row) => <StatusPill label={row.riskLevel} tone={row.riskLevel === "critical" ? "critical" : row.riskLevel === "warning" ? "warning" : "ok"} /> },
    { id: "review", header: "Last Review", render: (row) => row.lastReview },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        eyebrow="Departments & HODs" 
        title="Department Oversight" 
        description="Supervise academic departments, review HOD performance, and assign leadership." 
      />
      <section className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <p className="eyebrow">Total Departments</p>
          <p className="mt-2 text-2xl font-semibold">{deptRows.length}</p>
        </Card>
        <Card className="p-5">
          <p className="eyebrow">Departments On Track</p>
          <p className="mt-2 text-2xl font-semibold text-success">{onTrackDepts}</p>
        </Card>
        <Card className="p-5 border-l-4 border-l-warning">
          <p className="eyebrow">Pending HOD Reports</p>
          <p className="mt-2 text-2xl font-semibold text-warning">{pendingReports}</p>
        </Card>
      </section>

      <div className="flex gap-3 mt-4">
        <Button variant="primary" onClick={openAssignHod}>Assign HOD</Button>
        <Button variant="secondary" onClick={() => setIsReportOpen(true)}>Request Department Report</Button>
      </div>
      {notice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}

      <DataTable 
        title="Department Overview" 
        subtitle="Current health of all school departments." 
        columns={columns} 
        rows={deptRows} 
        getRowKey={(row) => row.id} 
      />

      <Modal open={isAssignHodOpen} title="Assign HOD" onClose={() => setIsAssignHodOpen(false)}>
        <form className="space-y-4" onSubmit={assignHod}>
          <label className="block text-sm font-semibold">
            Department
            <select
              className="input-base mt-1 w-full"
              value={selectedDepartment?.id ?? ""}
              onChange={(event) => {
                const next = deptRows.find((row) => row.id === event.target.value) ?? null;
                setSelectedDepartment(next);
                setHodName(next?.hod ?? "");
              }}
            >
              {deptRows.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold">
            HOD name
            <input className="input-base mt-1 w-full" required value={hodName} onChange={(event) => setHodName(event.target.value)} />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsAssignHodOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save HOD"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={isReportOpen} title="Request Department Report" onClose={() => setIsReportOpen(false)}>
        <form className="space-y-4" onSubmit={requestDepartmentReport}>
          <textarea
            name="message"
            className="input-base min-h-24 w-full"
            required
            defaultValue="Please submit the current department academic report with syllabus coverage, performance risks, teacher issues, and required dean interventions."
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsReportOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? "Sending..." : "Send Request"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function TeacherWorkloadWorkspace({ dataset }: { dataset: DeanDataset }) {
  const [workloadRows, setWorkloadRows] = useState(dataset.teacherWorkloads);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const overloaded = workloadRows.filter(w => w.workloadStatus === "overloaded").length;
  const underloaded = workloadRows.filter(w => w.workloadStatus === "underloaded").length;
  const avgLessons = workloadRows.length ? Math.round(workloadRows.reduce((acc, val) => acc + val.lessonsPerWeek, 0) / workloadRows.length) : 0;

  async function rebalanceWorkload() {
    const recommendations = workloadRows.filter((row) => row.workloadStatus === "overloaded" || row.workloadStatus === "underloaded");
    if (recommendations.length === 0) {
      setNotice("Teacher workloads are already balanced.");
      return;
    }

    setIsSaving(true);
    try {
      await recordDeanWorkflow("teacher_workload_rebalance_requested", {
        title: "Teacher workload rebalance requested",
        message: `${recommendations.length} teacher workload recommendations were recorded for timetable/admin review.`,
        teachers: recommendations.map((row) => ({ id: row.id, teacher: row.teacher, status: row.workloadStatus })),
      });
      setWorkloadRows((current) =>
        current.map((row): TeacherWorkload => {
        if (row.workloadStatus === "overloaded") {
          return { ...row, lessonsPerWeek: Math.max(0, row.lessonsPerWeek - 2), workloadStatus: "balanced" };
        }

        if (row.workloadStatus === "underloaded") {
          return { ...row, lessonsPerWeek: row.lessonsPerWeek + 2, workloadStatus: "balanced" };
        }

        return row;
      }),
      );
      setNotice(`Balanced workload recommendations recorded for ${recommendations.length} teacher${recommendations.length === 1 ? "" : "s"}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not record workload rebalance recommendations.");
    } finally {
      setIsSaving(false);
    }
  }

  const columns: DataTableColumn<typeof workloadRows[0]>[] = [
    { id: "teacher", header: "Teacher", render: (row) => <span className="font-semibold">{row.teacher}</span> },
    { id: "department", header: "Department", render: (row) => row.department },
    { id: "classes", header: "Classes", render: (row) => row.classes },
    { id: "lessons", header: "Lessons/Week", render: (row) => row.lessonsPerWeek },
    { id: "hod", header: "HOD", render: (row) => row.hodRole },
    { id: "logs", header: "Log Submission", render: (row) => row.logsSubmitted },
    { id: "status", header: "Status", render: (row) => <StatusPill label={row.workloadStatus} tone={row.workloadStatus === "balanced" ? "ok" : row.workloadStatus === "overloaded" ? "critical" : "warning"} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        eyebrow="Teacher Workload" 
        title="Workload & Utilization" 
        description="Prevent teacher burnout and ensure fair distribution of lessons." 
      />
      <section className="grid gap-4 md:grid-cols-4">
        <Card className="p-5 border-l-4 border-l-danger">
          <p className="eyebrow">Overloaded Teachers</p>
          <p className="mt-2 text-2xl font-semibold text-danger">{overloaded}</p>
        </Card>
        <Card className="p-5 border-l-4 border-l-warning">
          <p className="eyebrow">Underutilized</p>
          <p className="mt-2 text-2xl font-semibold text-warning">{underloaded}</p>
        </Card>
        <Card className="p-5">
          <p className="eyebrow">Avg Lessons / Week</p>
          <p className="mt-2 text-2xl font-semibold">{avgLessons}</p>
        </Card>
      </section>

      <div className="flex gap-3 mt-4">
        <Button variant="primary" disabled={isSaving} onClick={rebalanceWorkload}>{isSaving ? "Recording..." : "Balance Workload"}</Button>
      </div>
      {notice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}

      <DataTable 
        title="Teaching Staff Workload" 
        subtitle="Distribution of lessons across all teachers." 
        columns={columns} 
        rows={workloadRows} 
        getRowKey={(row) => row.id} 
      />
    </div>
  );
}

export function LessonPlansWorkspace({ dataset }: { dataset: DeanDataset }) {
  const [planRows, setPlanRows] = useState(dataset.lessonPlans);
  const [isMissingOpen, setIsMissingOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const pendingDean = planRows.filter(p => p.deanReview === "pending").length;
  const missingPlans = planRows.filter((row) => row.reviewStatus === "draft" || row.reviewStatus === "returned").length;
  const approvedThisWeek = planRows.filter(p => p.deanReview === "approved").length;

  async function reviewPendingPlans() {
    const pendingRows = planRows.filter((row) => row.deanReview === "pending");
    if (pendingRows.length === 0) {
      setNotice("No lesson plans are pending dean review.");
      return;
    }
    setIsSaving(true);
    try {
      await recordDeanWorkflow("lesson_plans_reviewed", {
        title: "Lesson plans reviewed",
        message: `${pendingRows.length} pending lesson plans were reviewed by the dean.`,
        lessonPlans: pendingRows.map((row) => ({ id: row.id, teacher: row.teacher, subject: row.subject, className: row.className })),
      });
      setPlanRows((current) =>
        current.map((row) =>
          row.deanReview === "pending"
            ? { ...row, deanReview: "approved", reviewStatus: "approved" }
            : row,
        ),
      );
      setNotice(`${pendingRows.length} lesson plan${pendingRows.length === 1 ? "" : "s"} reviewed and recorded.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not record lesson plan review.");
    } finally {
      setIsSaving(false);
    }
  }

  async function requestMissingPlans(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const targets = planRows.filter((row) => row.reviewStatus === "draft" || row.reviewStatus === "returned");
    if (targets.length === 0) {
      setNotice("No missing lesson plans were found in the current plan list.");
      setIsMissingOpen(false);
      return;
    }
    setIsSaving(true);
    try {
      await recordDeanWorkflow("missing_lesson_plans_requested", {
        title: "Missing lesson plans requested",
        message: String(form.get("message") ?? ""),
        targets: targets.map((row) => ({ id: row.id, teacher: row.teacher, subject: row.subject, className: row.className })),
      });
      setNotice(`Missing lesson plan request recorded for ${targets.length} teacher submission${targets.length === 1 ? "" : "s"}.`);
      setIsMissingOpen(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not request missing lesson plans.");
    } finally {
      setIsSaving(false);
    }
  }

  const columns: DataTableColumn<typeof planRows[0]>[] = [
    { id: "teacher", header: "Teacher", render: (row) => <span className="font-semibold">{row.teacher}</span> },
    { id: "subject", header: "Subject", render: (row) => row.subject },
    { id: "class", header: "Class", render: (row) => row.className },
    { id: "week", header: "Week", render: (row) => row.week },
    { id: "submitted", header: "Submitted", render: (row) => row.submittedDate },
    { id: "status", header: "Status", render: (row) => <StatusPill label={row.reviewStatus} tone={row.reviewStatus === "approved" ? "ok" : row.reviewStatus === "returned" ? "critical" : "warning"} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        eyebrow="Lesson Plans" 
        title="Lesson Plan Approvals" 
        description="Ensure teachers are preparing adequately for classes." 
      />
      <section className="grid gap-4 md:grid-cols-4">
        <Card className="p-5 border-l-4 border-l-warning">
          <p className="eyebrow">Pending Dean Review</p>
          <p className="mt-2 text-2xl font-semibold text-warning">{pendingDean}</p>
        </Card>
        <Card className="p-5 border-l-4 border-l-danger">
          <p className="eyebrow">Missing Plans (Week)</p>
          <p className="mt-2 text-2xl font-semibold text-danger">{missingPlans}</p>
        </Card>
        <Card className="p-5">
          <p className="eyebrow">Approved This Week</p>
          <p className="mt-2 text-2xl font-semibold text-success">{approvedThisWeek}</p>
        </Card>
      </section>

      <div className="flex gap-3 mt-4">
        <Button variant="primary" disabled={isSaving} onClick={reviewPendingPlans}>{isSaving ? "Recording..." : "Review Pending"}</Button>
        <Button variant="secondary" onClick={() => setIsMissingOpen(true)}>Request Missing</Button>
      </div>
      {notice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}

      <DataTable 
        title="Recent Lesson Plans" 
        subtitle="Status of lesson plans for the current and upcoming weeks." 
        columns={columns} 
        rows={planRows} 
        getRowKey={(row) => row.id} 
      />

      <Modal open={isMissingOpen} title="Request Missing Lesson Plans" onClose={() => setIsMissingOpen(false)}>
        <form className="space-y-4" onSubmit={requestMissingPlans}>
          <textarea
            name="message"
            className="input-base min-h-24 w-full"
            required
            defaultValue="Please submit or correct the missing lesson plans for this week before the dean's academic review closes."
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsMissingOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? "Sending..." : "Send Requests"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function LessonLogsWorkspace({ dataset }: { dataset: DeanDataset }) {
  const [logRows, setLogRows] = useState(dataset.lessonLogs);
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const missingLogs = logRows.filter(l => l.logStatus === "missing").length;
  const lateLogs = logRows.filter(l => l.logStatus === "late").length;
  const submittedToday = logRows.filter(l => l.logStatus === "submitted").length;

  async function requestMissingLogs(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const targets = logRows.filter((row) => row.logStatus === "missing" || row.logStatus === "late");
    if (targets.length === 0) {
      setNotice("No missing or late lesson logs were found.");
      setIsRequestOpen(false);
      return;
    }
    setIsSaving(true);
    try {
      await recordDeanWorkflow("missing_lesson_logs_requested", {
        title: "Missing or late lesson logs requested",
        message: String(form.get("message") ?? ""),
        targets: targets.map((row) => ({ id: row.id, teacher: row.teacher, status: row.logStatus, subject: row.subject, className: row.className })),
      });
      setLogRows((current) =>
        current.map((row) =>
          row.logStatus === "missing" || row.logStatus === "late"
            ? { ...row, deanStatus: "flagged" }
            : row,
        ),
      );
      setNotice(`Lesson log request recorded for ${targets.length} missing or late log${targets.length === 1 ? "" : "s"}.`);
      setIsRequestOpen(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not request lesson log updates.");
    } finally {
      setIsSaving(false);
    }
  }

  const columns: DataTableColumn<typeof logRows[0]>[] = [
    { id: "date", header: "Date", render: (row) => row.date },
    { id: "teacher", header: "Teacher", render: (row) => <span className="font-semibold">{row.teacher}</span> },
    { id: "class", header: "Class", render: (row) => row.className },
    { id: "subject", header: "Subject", render: (row) => row.subject },
    { id: "slot", header: "Timetable Slot", render: (row) => row.timetabledLesson },
    { id: "status", header: "Status", render: (row) => <StatusPill label={row.logStatus} tone={row.logStatus === "submitted" ? "ok" : row.logStatus === "missing" || row.logStatus === "late" ? "critical" : "warning"} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        eyebrow="Lesson Logs" 
        title="Teaching Accountability" 
        description="Verify that scheduled lessons actually took place." 
      />
      <section className="grid gap-4 md:grid-cols-4">
        <Card className="p-5 border-l-4 border-l-danger">
          <p className="eyebrow">Missing Logs (Today)</p>
          <p className="mt-2 text-2xl font-semibold text-danger">{missingLogs}</p>
        </Card>
        <Card className="p-5 border-l-4 border-l-warning">
          <p className="eyebrow">Late Logs (Week)</p>
          <p className="mt-2 text-2xl font-semibold text-warning">{lateLogs}</p>
        </Card>
        <Card className="p-5">
          <p className="eyebrow">Logs Submitted Today</p>
          <p className="mt-2 text-2xl font-semibold text-success">{submittedToday}</p>
        </Card>
      </section>

      <div className="flex gap-3 mt-4">
        <Button variant="primary" onClick={() => setIsRequestOpen(true)}>Request Missing Logs</Button>
      </div>
      {notice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}

      <DataTable 
        title="Lesson Log Submissions" 
        subtitle="Recent entries against the master timetable." 
        columns={columns} 
        rows={logRows} 
        getRowKey={(row) => row.id} 
      />

      <Modal open={isRequestOpen} title="Request Missing Logs" onClose={() => setIsRequestOpen(false)}>
        <form className="space-y-4" onSubmit={requestMissingLogs}>
          <textarea
            name="message"
            className="input-base min-h-24 w-full"
            required
            defaultValue="Please submit the missing lesson log with the topic taught, attendance link, and any lesson recovery notes."
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsRequestOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? "Sending..." : "Send Log Requests"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
