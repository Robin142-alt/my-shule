"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import type { DeanDataset } from "@/lib/modules/dean-data";

export function DepartmentsWorkspace({ dataset }: { dataset: DeanDataset }) {
  const deptRows = dataset.departments;
  const onTrackDepts = deptRows.filter(d => d.riskLevel === "on-track").length;
  const pendingReports = deptRows.reduce((acc, val) => acc + val.pendingReports, 0);

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
        <Button variant="primary">Assign HOD</Button>
        <Button variant="secondary">Request Department Report</Button>
      </div>

      <DataTable 
        title="Department Overview" 
        subtitle="Current health of all school departments." 
        columns={columns} 
        rows={deptRows} 
        getRowKey={(row) => row.id} 
      />
    </div>
  );
}

export function TeacherWorkloadWorkspace({ dataset }: { dataset: DeanDataset }) {
  const workloadRows = dataset.teacherWorkloads;
  const overloaded = workloadRows.filter(w => w.workloadStatus === "overloaded").length;
  const underloaded = workloadRows.filter(w => w.workloadStatus === "underloaded").length;
  const avgLessons = workloadRows.length ? Math.round(workloadRows.reduce((acc, val) => acc + val.lessonsPerWeek, 0) / workloadRows.length) : 0;

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
        <Button variant="primary">Balance Workload</Button>
      </div>

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
  const planRows = dataset.lessonPlans;
  const pendingDean = planRows.filter(p => p.deanReview === "pending").length;
  const missingPlans = 8; // In a real app, this would be computed by comparing expected timetable with submitted plans
  const approvedThisWeek = planRows.filter(p => p.deanReview === "approved").length;

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
        <Button variant="primary">Review Pending</Button>
        <Button variant="secondary">Request Missing</Button>
      </div>

      <DataTable 
        title="Recent Lesson Plans" 
        subtitle="Status of lesson plans for the current and upcoming weeks." 
        columns={columns} 
        rows={planRows} 
        getRowKey={(row) => row.id} 
      />
    </div>
  );
}

export function LessonLogsWorkspace({ dataset }: { dataset: DeanDataset }) {
  const logRows = dataset.lessonLogs;
  const missingLogs = logRows.filter(l => l.logStatus === "missing").length;
  const lateLogs = logRows.filter(l => l.logStatus === "late").length;
  const submittedToday = logRows.filter(l => l.logStatus === "submitted").length;

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
        <Button variant="primary">Request Missing Logs</Button>
      </div>

      <DataTable 
        title="Lesson Log Submissions" 
        subtitle="Recent entries against the master timetable." 
        columns={columns} 
        rows={logRows} 
        getRowKey={(row) => row.id} 
      />
    </div>
  );
}
