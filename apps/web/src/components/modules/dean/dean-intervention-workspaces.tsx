"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import type { AcademicIntervention, DeanDataset, DepartmentReview, StudentSupportCase, TeacherReport } from "@/lib/modules/dean-data";

async function recordDeanWorkflow(action: string, payload: Record<string, unknown>) {
  return requestDashboardApi("/api/admin-command/dean-academics/action", {
    method: "POST",
    body: { action, ...payload },
  });
}

export function AcademicInterventionsWorkspace({ dataset }: { dataset: DeanDataset }) {
  const [interventionRows, setInterventionRows] = useState(dataset.interventions);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
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
        <Button variant="primary" onClick={() => setIsCreateOpen(true)}>Create New Intervention</Button>
      </div>
      {notice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}

      <DataTable 
        title="Ongoing Interventions" 
        subtitle="Tracking remedial and corrective academic plans." 
        columns={columns} 
        rows={interventionRows} 
        getRowKey={(row) => row.id} 
      />
      <Modal open={isCreateOpen} title="Create Academic Intervention" onClose={() => setIsCreateOpen(false)}>
        <form className="space-y-4" onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const intervention: AcademicIntervention = {
            id: `INT-${Date.now()}`,
            title: String(form.get("title") ?? "Academic intervention"),
            type: String(form.get("type") ?? "Remedial teaching"),
            target: String(form.get("target") ?? "Target class"),
            department: String(form.get("department") ?? "Academics"),
            responsiblePerson: String(form.get("responsiblePerson") ?? "HOD"),
            startDate: new Date().toISOString().slice(0, 10),
            dueDate: String(form.get("dueDate") ?? new Date().toISOString().slice(0, 10)),
            progress: "0%",
            status: "active",
          };
          setIsSaving(true);
          try {
            await recordDeanWorkflow("academic_intervention_created", {
              title: intervention.title,
              message: `${intervention.type} for ${intervention.target}, assigned to ${intervention.responsiblePerson}.`,
              intervention,
            });
            setInterventionRows((current) => [intervention, ...current]);
            setNotice(`${intervention.title} recorded and assigned to ${intervention.responsiblePerson}.`);
            setIsCreateOpen(false);
          } catch (error) {
            setNotice(error instanceof Error ? error.message : "Could not save the academic intervention.");
          } finally {
            setIsSaving(false);
          }
        }}>
          <input name="title" className="input-base w-full" required placeholder="Intervention title" />
          <div className="grid gap-4 md:grid-cols-2">
            <input name="target" className="input-base" required placeholder="Target class or subject" />
            <input name="type" className="input-base" required placeholder="Action plan" />
            <input name="department" className="input-base" required placeholder="Department" />
            <input name="responsiblePerson" className="input-base" required placeholder="Responsible person" />
          </div>
          <input name="dueDate" type="date" className="input-base w-full" required />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save Intervention"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function StudentAcademicSupportWorkspace({ dataset }: { dataset: DeanDataset }) {
  const [supportRows, setSupportRows] = useState(dataset.studentSupportCases);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isMentorOpen, setIsMentorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const pendingReviews = supportRows.filter(s => s.interventionStatus === "pending").length;
  const graduated = supportRows.filter(s => s.interventionStatus === "resolved").length;

  const columns: DataTableColumn<typeof supportRows[0]>[] = [
    { id: "student", header: "Student", render: (row) => <span className="font-semibold">{row.student}</span> },
    { id: "class", header: "Class", render: (row) => row.className },
    { id: "reason", header: "Reason for Support", render: (row) => row.mainConcern },
    { id: "supportType", header: "Support Type", render: () => "Remedial" },
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
        <Button variant="primary" onClick={() => setIsSupportOpen(true)}>Add Student to Support List</Button>
        <Button variant="secondary" onClick={() => setIsMentorOpen(true)}>View Mentor Reports</Button>
      </div>
      {notice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}

      <DataTable 
        title="Academic Support Register" 
        subtitle="Learners currently receiving targeted academic interventions." 
        columns={columns} 
        rows={supportRows} 
        getRowKey={(row) => row.id} 
      />
      <Modal open={isSupportOpen} title="Add Student Support Case" onClose={() => setIsSupportOpen(false)}>
        <form className="space-y-4" onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const supportCase: StudentSupportCase = {
            id: `SS-${Date.now()}`,
            student: String(form.get("student") ?? "Student"),
            admissionNo: String(form.get("admissionNo") ?? "ADM"),
            className: String(form.get("className") ?? "Class"),
            stream: String(form.get("stream") ?? ""),
            mainConcern: String(form.get("mainConcern") ?? "Academic support"),
            subjectsAffected: String(form.get("subjectsAffected") ?? "All subjects"),
            currentMean: String(form.get("currentMean") ?? "N/A"),
            previousMean: String(form.get("previousMean") ?? "N/A"),
            interventionStatus: "pending",
            responsiblePerson: String(form.get("responsiblePerson") ?? "Class teacher"),
          };
          setIsSaving(true);
          try {
            await recordDeanWorkflow("student_support_case_created", {
              title: "Student academic support case created",
              message: `${supportCase.student} added to academic support for ${supportCase.mainConcern}.`,
              supportCase,
            });
            setSupportRows((current) => [supportCase, ...current]);
            setNotice(`${supportCase.student} added to academic support and recorded.`);
            setIsSupportOpen(false);
          } catch (error) {
            setNotice(error instanceof Error ? error.message : "Could not save the support case.");
          } finally {
            setIsSaving(false);
          }
        }}>
          <div className="grid gap-4 md:grid-cols-2">
            <input name="student" className="input-base" required placeholder="Student name" />
            <input name="admissionNo" className="input-base" required placeholder="Admission no." />
            <input name="className" className="input-base" required placeholder="Class" />
            <input name="stream" className="input-base" placeholder="Stream" />
            <input name="subjectsAffected" className="input-base" required placeholder="Subjects affected" />
            <input name="responsiblePerson" className="input-base" required placeholder="Assigned mentor" />
            <input name="currentMean" className="input-base" placeholder="Current mean" />
            <input name="previousMean" className="input-base" placeholder="Previous mean" />
          </div>
          <textarea name="mainConcern" className="input-base min-h-24 w-full" required placeholder="Main concern and support plan" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsSupportOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save Support Case"}</Button>
          </div>
        </form>
      </Modal>
      <Modal open={isMentorOpen} title="Mentor Reports" onClose={() => setIsMentorOpen(false)}>
        <div className="space-y-3">
          {supportRows.length ? supportRows.map((row) => (
            <div key={row.id} className="rounded-md border p-3 text-sm">
              <div className="font-semibold">{row.student} - {row.responsiblePerson}</div>
              <div className="mt-1 text-muted-foreground">{row.mainConcern}; status: {row.interventionStatus}</div>
            </div>
          )) : <div className="text-sm text-muted-foreground">No mentor reports exist yet.</div>}
        </div>
      </Modal>
    </div>
  );
}

export function DepartmentReviewsWorkspace({ dataset }: { dataset: DeanDataset }) {
  const [reviewRows, setReviewRows] = useState(dataset.departmentReviews);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
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
        <Button variant="primary" onClick={() => setIsScheduleOpen(true)}>Schedule Review</Button>
      </div>
      {notice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}

      <DataTable 
        title="Department Review History" 
        subtitle="Recent evaluations of department heads." 
        columns={columns} 
        rows={reviewRows} 
        getRowKey={(row) => row.id} 
      />
      <Modal open={isScheduleOpen} title="Schedule Department Review" onClose={() => setIsScheduleOpen(false)}>
        <form className="space-y-4" onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const review: DepartmentReview = {
            id: `DR-${Date.now()}`,
            reviewPeriod: String(form.get("reviewPeriod") ?? "Term review"),
            department: String(form.get("department") ?? "Department"),
            hod: String(form.get("hod") ?? "HOD"),
            reportStatus: "pending",
            coverageStatus: "behind",
            performanceStatus: "below-target",
            teacherIssues: 0,
            deanReviewStatus: "pending",
            dueDate: String(form.get("dueDate") ?? new Date().toISOString().slice(0, 10)),
          };
          setIsSaving(true);
          try {
            await recordDeanWorkflow("department_review_scheduled", {
              title: "Department review scheduled",
              message: `${review.department} review scheduled for ${review.dueDate}.`,
              review,
            });
            setReviewRows((current) => [review, ...current]);
            setNotice(`${review.department} review scheduled and recorded for ${review.dueDate}.`);
            setIsScheduleOpen(false);
          } catch (error) {
            setNotice(error instanceof Error ? error.message : "Could not schedule the department review.");
          } finally {
            setIsSaving(false);
          }
        }}>
          <div className="grid gap-4 md:grid-cols-2">
            <input name="department" className="input-base" required placeholder="Department" />
            <input name="hod" className="input-base" required placeholder="HOD" />
            <input name="reviewPeriod" className="input-base" required placeholder="Review period" />
            <input name="dueDate" type="date" className="input-base" required />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsScheduleOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? "Scheduling..." : "Schedule Review"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function TeacherAcademicReportsWorkspace({ dataset }: { dataset: DeanDataset }) {
  const [reportRows, setReportRows] = useState(dataset.teacherReports);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

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
        <Button variant="primary" disabled={isSaving} onClick={async () => {
          const pendingRows = reportRows.filter((row) => row.deanStatus === "pending");
          if (pendingRows.length === 0) {
            setNotice("No teacher reports are pending dean review.");
            return;
          }
          setIsSaving(true);
          try {
            await recordDeanWorkflow("teacher_reports_reviewed", {
              title: "Teacher academic reports reviewed",
              message: `${pendingRows.length} teacher academic reports were reviewed by the dean.`,
              reports: pendingRows.map((row) => ({ id: row.id, teacher: row.teacher, reportPeriod: row.reportPeriod, keyRisk: row.keyRisk })),
            });
            setReportRows((current) => current.map((row): TeacherReport => row.deanStatus === "pending" ? { ...row, deanStatus: "approved" } : row));
            setNotice(`${pendingRows.length} teacher report${pendingRows.length === 1 ? "" : "s"} reviewed and recorded.`);
          } catch (error) {
            setNotice(error instanceof Error ? error.message : "Could not record teacher report review.");
          } finally {
            setIsSaving(false);
          }
        }}>{isSaving ? "Recording..." : "Review Pending Reports"}</Button>
      </div>
      {notice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}

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
