"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import type { DeanDataset, AcademicReport, AcademicMessage, ApprovalFollowUp, TeacherWorkload } from "@/lib/modules/dean-data";

export function AcademicReportsWorkspace({ dataset }: { dataset: DeanDataset }) {
  const reportRows = dataset.academicReports;
  const publishedCount = reportRows.filter(r => r.status === "ready").length;
  const draftCount = reportRows.filter(r => r.status === "processing").length;

  const columns: DataTableColumn<typeof reportRows[0]>[] = [
    { id: "reportName", header: "Report Name", render: (row: AcademicReport) => <span className="font-semibold">{row.name}</span> },
    { id: "type", header: "Report Type", render: (row: AcademicReport) => row.type },
    { id: "generated", header: "Date Generated", render: (row: AcademicReport) => row.dateGenerated },
    { id: "status", header: "Status", render: (row: AcademicReport) => <StatusPill label={row.status} tone={row.status === "ready" ? "ok" : row.status === "processing" ? "warning" : "critical"} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        eyebrow="Academic Reports" 
        title="Custom Reports & Exports" 
        description="Generate and review comprehensive academic reports for the Principal and Ministry." 
      />
      <section className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="eyebrow">Reports Published</p>
          <p className="mt-2 text-3xl font-bold">{publishedCount}</p>
        </Card>
        <Card className="p-5 border-l-4 border-l-warning">
          <p className="eyebrow">Drafts Pending Review</p>
          <p className="mt-2 text-3xl font-bold text-warning">{draftCount}</p>
        </Card>
      </section>

      <div className="flex gap-3 mt-4">
        <Button variant="primary">Generate New Report</Button>
      </div>

      <DataTable 
        title="Recent Reports" 
        subtitle="Archive of generated academic summaries." 
        columns={columns} 
        rows={reportRows} 
        getRowKey={(row) => row.id} 
      />
    </div>
  );
}

export function MessagesNoticesWorkspace({ dataset }: { dataset: DeanDataset }) {
  const messageRows = dataset.messages;

  const columns: DataTableColumn<typeof messageRows[0]>[] = [
    { id: "date", header: "Date", render: (row: AcademicMessage) => row.sentDate },
    { id: "recipient", header: "Recipient(s)", render: (row: AcademicMessage) => <span className="font-semibold">{row.audience}</span> },
    { id: "subject", header: "Subject / Summary", render: (row: AcademicMessage) => row.title },
    { id: "status", header: "Status", render: (row: AcademicMessage) => <StatusPill label={row.deliveryStatus} tone="ok" /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        eyebrow="Messages & Notices" 
        title="Academic Communications" 
        description="Broadcast academic updates to teachers, HODs, students, and parents." 
      />
      
      <div className="flex gap-3 mt-4">
        <Button variant="primary">New Message</Button>
        <Button variant="secondary">SMS Blast (Parents)</Button>
      </div>

      <DataTable 
        title="Message History" 
        subtitle="Recent academic notices sent out." 
        columns={columns} 
        rows={messageRows} 
        getRowKey={(row) => row.id} 
      />
    </div>
  );
}

export function ApprovalsFollowUpsWorkspace({ dataset }: { dataset: DeanDataset }) {
  const approvalRows = dataset.approvals;
  const pendingApprovals = approvalRows.filter(a => a.status === "pending").length;

  const columns: DataTableColumn<typeof approvalRows[0]>[] = [
    { id: "date", header: "Date", render: (row: ApprovalFollowUp) => row.dueDate },
    { id: "type", header: "Request Type", render: (row: ApprovalFollowUp) => <span className="font-semibold">{row.type}</span> },
    { id: "details", header: "Details", render: (row: ApprovalFollowUp) => row.item },
    { id: "requester", header: "Requested By", render: (row: ApprovalFollowUp) => row.submittedBy },
    { id: "status", header: "Status", render: (row: ApprovalFollowUp) => <StatusPill label={row.status} tone={row.status === "approved" ? "ok" : "warning"} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        eyebrow="Approvals & Follow-ups" 
        title="Pending Approvals Queue" 
        description="Review and action requests from teachers, HODs, and the Exams Manager." 
      />
      <section className="grid gap-4 md:grid-cols-3">
        <Card className="p-5 border-l-4 border-l-warning">
          <p className="eyebrow">Pending Approvals</p>
          <p className="mt-2 text-3xl font-bold text-warning">{pendingApprovals}</p>
        </Card>
      </section>

      <div className="flex gap-3 mt-4">
        <Button variant="primary">Review All Pending</Button>
      </div>

      <DataTable 
        title="Approval Queue" 
        subtitle="Recent requests requiring Dean authorization." 
        columns={columns} 
        rows={approvalRows} 
        getRowKey={(row) => row.id} 
      />
    </div>
  );
}

export function MyTeachingWorkspace({ dataset }: { dataset: DeanDataset }) {
  const classRows = dataset.teacherWorkloads;
  const myLessonsPerWeek = classRows.reduce((acc: number, val: TeacherWorkload) => acc + (val.lessonsPerWeek || 0), 0);

  const columns: DataTableColumn<TeacherWorkload>[] = [
    { id: "class", header: "Class", render: (row: TeacherWorkload) => <span className="font-semibold">{row.classes}</span> },
    { id: "subject", header: "Subject", render: (row: TeacherWorkload) => row.subjects },
    { id: "syllabus", header: "My Coverage", render: (row: TeacherWorkload) => row.syllabusCoverage },
    { id: "students", header: "Lessons", render: (row: TeacherWorkload) => row.lessonsPerWeek },
    { id: "nextLesson", header: "Status", render: (row: TeacherWorkload) => row.workloadStatus },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        eyebrow="My Teaching" 
        title="Personal Classes" 
        description="Manage your own teaching workload alongside administrative duties." 
      />
      <section className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="eyebrow">My Lessons / Week</p>
          <p className="mt-2 text-3xl font-bold">{myLessonsPerWeek > 0 ? myLessonsPerWeek : 12}</p>
        </Card>
        <Card className="p-5">
          <p className="eyebrow">My Missing Logs</p>
          <p className="mt-2 text-3xl font-bold text-success">0</p>
        </Card>
      </section>

      <div className="flex gap-3 mt-4">
        <Button variant="primary">Submit My Lesson Log</Button>
        <Button variant="secondary">Submit My Lesson Plan</Button>
      </div>

      <DataTable 
        title="My Assigned Classes" 
        subtitle="Overview of classes you personally teach." 
        columns={columns} 
        rows={classRows} 
        getRowKey={(row) => row.id} 
      />
    </div>
  );
}

export function DeanSettingsWorkspace({ dataset }: { dataset: DeanDataset }) {
  return (
    <div className="space-y-6">
      <PageHeader 
        eyebrow="Settings" 
        title="Academic Thresholds" 
        description="Configure rules for risk detection, grading policies, and dashboard limits." 
      />
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Risk Thresholds</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-sm text-foreground">Syllabus Delay Critical Alert (%)</span>
              <span className="font-semibold">15%</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-sm text-foreground">Mean Deviation Anomaly Flag</span>
              <span className="font-semibold">±1.0</span>
            </div>
            <div className="flex justify-between items-center pb-2">
              <span className="text-sm text-foreground">Max Missing Lesson Logs Allowed</span>
              <span className="font-semibold">3</span>
            </div>
          </div>
          <Button variant="secondary" className="mt-4 w-full">Edit Risk Thresholds</Button>
        </Card>
        
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Grading & Reports</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-sm text-foreground">Active Grading System</span>
              <span className="font-semibold">Standard 8-4-4 + CBC</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-sm text-foreground">Report Card Comments</span>
              <span className="font-semibold">Mandatory</span>
            </div>
            <div className="flex justify-between items-center pb-2">
              <span className="text-sm text-foreground">CA Weighting</span>
              <span className="font-semibold">30% CA / 70% Final</span>
            </div>
          </div>
          <Button variant="secondary" className="mt-4 w-full">Edit Grading Rules</Button>
        </Card>
      </div>
    </div>
  );
}
