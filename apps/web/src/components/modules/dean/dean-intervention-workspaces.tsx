"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import type { DeanDataset } from "@/lib/modules/dean-data";

export function AcademicInterventionsWorkspace({ dataset }: { dataset: DeanDataset }) {
  const interventionRows = dataset.interventions;
  const escalated = interventionRows.filter(i => i.status === "overdue").length;
  const resolved = interventionRows.filter(i => i.status === "completed").length;

  const columns: DataTableColumn<typeof interventionRows[0]>[] = [
    { id: "target", header: "Target Area", render: (row) => <span className="font-semibold">{row.target}</span> },
    { id: "issue", header: "Identified Issue", render: (row) => row.title },
    { id: "actionPlan", header: "Action Plan", render: (row) => row.type },
    { id: "assignedTo", header: "Assigned To", render: (row) => row.responsiblePerson },
    { id: "deadline", header: "Deadline", render: (row) => row.dueDate },
    { id: "status", header: "Status", render: (row) => <StatusPill label={row.status} tone={row.status === "active" ? "ok" : row.status === "overdue" ? "critical" : "warning"} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        eyebrow="Academic Interventions" 
        title="Class & Subject Interventions" 
        description="Manage corrective actions for underperforming classes and subjects." 
      />
      <section className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="eyebrow">Active Interventions</p>
          <p className="mt-2 text-3xl font-bold">{interventionRows.length}</p>
        </Card>
        <Card className="p-5 border-l-4 border-l-danger">
          <p className="eyebrow">Escalated to Principal</p>
          <p className="mt-2 text-3xl font-bold text-danger">{escalated}</p>
        </Card>
        <Card className="p-5">
          <p className="eyebrow">Resolved This Term</p>
          <p className="mt-2 text-3xl font-bold text-success">{resolved}</p>
        </Card>
      </section>

      <div className="flex gap-3 mt-4">
        <Button variant="primary">Create New Intervention</Button>
      </div>

      <DataTable 
        title="Ongoing Interventions" 
        subtitle="Tracking remedial and corrective academic plans." 
        columns={columns} 
        rows={interventionRows} 
        getRowKey={(row) => row.id} 
      />
    </div>
  );
}

export function StudentAcademicSupportWorkspace({ dataset }: { dataset: DeanDataset }) {
  const supportRows = dataset.studentSupportCases;
  const pendingReviews = supportRows.filter(s => s.interventionStatus === "pending").length;
  const graduated = supportRows.filter(s => s.interventionStatus === "resolved").length;

  const columns: DataTableColumn<typeof supportRows[0]>[] = [
    { id: "student", header: "Student", render: (row) => <span className="font-semibold">{row.student}</span> },
    { id: "class", header: "Class", render: (row) => row.className },
    { id: "reason", header: "Reason for Support", render: (row) => row.mainConcern },
    { id: "supportType", header: "Support Type", render: (row) => "Remedial" },
    { id: "assignedTo", header: "Assigned Mentor", render: (row) => row.responsiblePerson },
    { id: "nextReview", header: "Status", render: (row) => <StatusPill label={row.interventionStatus} tone={row.interventionStatus === "active" ? "ok" : "critical"} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        eyebrow="Student Academic Support" 
        title="At-Risk Learners" 
        description="Track individual students requiring special academic attention and mentorship." 
      />
      <section className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="eyebrow">Students on Support</p>
          <p className="mt-2 text-3xl font-bold">{supportRows.length}</p>
        </Card>
        <Card className="p-5 border-l-4 border-l-warning">
          <p className="eyebrow">Pending Reviews</p>
          <p className="mt-2 text-3xl font-bold text-warning">{pendingReviews}</p>
        </Card>
        <Card className="p-5">
          <p className="eyebrow">Graduated from Support</p>
          <p className="mt-2 text-3xl font-bold text-success">{graduated}</p>
        </Card>
      </section>

      <div className="flex gap-3 mt-4">
        <Button variant="primary">Add Student to Support List</Button>
        <Button variant="secondary">View Mentor Reports</Button>
      </div>

      <DataTable 
        title="Academic Support Register" 
        subtitle="Learners currently receiving targeted academic interventions." 
        columns={columns} 
        rows={supportRows} 
        getRowKey={(row) => row.id} 
      />
    </div>
  );
}

export function DepartmentReviewsWorkspace({ dataset }: { dataset: DeanDataset }) {
  const reviewRows = dataset.departmentReviews;
  const overdueReviews = reviewRows.filter(r => r.deanReviewStatus === "pending").length;

  const columns: DataTableColumn<typeof reviewRows[0]>[] = [
    { id: "department", header: "Department", render: (row) => <span className="font-semibold">{row.department}</span> },
    { id: "hod", header: "HOD", render: (row) => row.hod },
    { id: "date", header: "Review Period", render: (row) => row.reviewPeriod },
    { id: "focus", header: "Coverage", render: (row) => <StatusPill label={row.coverageStatus} tone={row.coverageStatus === "on-track" ? "ok" : "critical"} /> },
    { id: "rating", header: "Performance", render: (row) => <StatusPill label={row.performanceStatus} tone={row.performanceStatus === "on-track" ? "ok" : "warning"} /> },
    { id: "nextReview", header: "Due Date", render: (row) => row.dueDate },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        eyebrow="Department Reviews" 
        title="HOD Evaluations" 
        description="Schedule and record periodic reviews of departmental performance." 
      />
      <section className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="eyebrow">Reviews Conducted (Term)</p>
          <p className="mt-2 text-3xl font-bold">{reviewRows.length}</p>
        </Card>
        <Card className="p-5 border-l-4 border-l-warning">
          <p className="eyebrow">Pending Reviews</p>
          <p className="mt-2 text-3xl font-bold text-warning">{overdueReviews}</p>
        </Card>
      </section>

      <div className="flex gap-3 mt-4">
        <Button variant="primary">Schedule Review</Button>
      </div>

      <DataTable 
        title="Department Review History" 
        subtitle="Recent evaluations of department heads." 
        columns={columns} 
        rows={reviewRows} 
        getRowKey={(row) => row.id} 
      />
    </div>
  );
}

export function TeacherAcademicReportsWorkspace({ dataset }: { dataset: DeanDataset }) {
  const reportRows = dataset.teacherReports;

  const columns: DataTableColumn<typeof reportRows[0]>[] = [
    { id: "teacher", header: "Teacher", render: (row) => <span className="font-semibold">{row.teacher}</span> },
    { id: "type", header: "Report Period", render: (row) => row.reportPeriod },
    { id: "term", header: "Key Risk", render: (row) => row.keyRisk },
    { id: "submitted", header: "Submission", render: (row) => <StatusPill label={row.submissionStatus} tone={row.submissionStatus === "submitted" ? "ok" : "critical"} /> },
    { id: "status", header: "Dean Status", render: (row) => <StatusPill label={row.deanStatus} tone={row.deanStatus === "approved" ? "ok" : "warning"} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        eyebrow="Teacher Academic Reports" 
        title="Teacher Self-Evaluations & Analyses" 
        description="Review end-of-term or mid-term academic reports submitted by teachers." 
      />
      
      <div className="flex gap-3 mt-4">
        <Button variant="primary">Review Pending Reports</Button>
      </div>

      <DataTable 
        title="Submitted Teacher Reports" 
        subtitle="Tracking teacher submissions of required academic analysis documents." 
        columns={columns} 
        rows={reportRows} 
        getRowKey={(row) => row.id} 
      />
    </div>
  );
}
