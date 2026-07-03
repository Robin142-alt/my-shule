"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import type { DeanDataset, AcademicReport, AcademicMessage, ApprovalFollowUp, TeacherWorkload } from "@/lib/modules/dean-data";

async function recordDeanWorkflow(action: string, payload: Record<string, unknown>) {
  return requestDashboardApi("/api/admin-command/dean-academics/action", {
    method: "POST",
    body: { action, ...payload },
  });
}

export function AcademicReportsWorkspace({ dataset }: { dataset: DeanDataset }) {
  const [reportRows, setReportRows] = useState(dataset.academicReports);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
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
        <Button variant="primary" onClick={() => setIsReportOpen(true)}>Generate New Report</Button>
      </div>
      {notice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}

      <DataTable 
        title="Recent Reports" 
        subtitle="Archive of generated academic summaries." 
        columns={columns} 
        rows={reportRows} 
        getRowKey={(row) => row.id} 
      />
      <Modal open={isReportOpen} title="Generate Academic Report" onClose={() => setIsReportOpen(false)}>
        <form className="space-y-4" onSubmit={async (event) => {
          event.preventDefault();
          setIsSaving(true);
          const form = new FormData(event.currentTarget);
          const report: AcademicReport = {
            id: `REP-${Date.now()}`,
            name: String(form.get("name") ?? "Academic Report"),
            type: String(form.get("type") ?? "Academic summary"),
            scope: String(form.get("scope") ?? "Whole school"),
            generatedBy: "Dean of Academics",
            dateGenerated: new Date().toISOString().slice(0, 10),
            format: "PDF",
            status: "processing",
          };
          try {
            const response = await requestDashboardApi<{ snapshotId?: string }>("/api/admin-command/dean-academics/reports/generate", {
              method: "POST",
              body: {
                title: report.name,
                type: report.type,
                scope: report.scope,
                format: "pdf",
              },
            });
            setReportRows((current) => [{ ...report, id: response.snapshotId ?? report.id, status: "ready" }, ...current]);
            setNotice(`${report.name} compiled and stored as a dean report snapshot.`);
            setIsReportOpen(false);
          } catch (error) {
            setNotice(error instanceof Error ? error.message : "Could not generate the dean report.");
          } finally {
            setIsSaving(false);
          }
        }}>
          <input name="name" className="input-base w-full" required placeholder="Report name" />
          <div className="grid gap-4 md:grid-cols-2">
            <input name="type" className="input-base" required placeholder="Report type" />
            <input name="scope" className="input-base" required placeholder="Scope" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsReportOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? "Generating..." : "Generate Report"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function MessagesNoticesWorkspace({ dataset }: { dataset: DeanDataset }) {
  const [messageRows, setMessageRows] = useState(dataset.messages);
  const [messageMode, setMessageMode] = useState<"in-app" | "sms" | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

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
        <Button variant="primary" onClick={() => setMessageMode("in-app")}>New Message</Button>
        <Button variant="secondary" onClick={() => setMessageMode("sms")}>SMS Blast (Parents)</Button>
      </div>
      {notice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}

      <DataTable 
        title="Message History" 
        subtitle="Recent academic notices sent out." 
        columns={columns} 
        rows={messageRows} 
        getRowKey={(row) => row.id} 
      />
      <Modal open={!!messageMode} title={messageMode === "sms" ? "SMS Blast to Parents" : "New Academic Message"} onClose={() => setMessageMode(null)}>
        <form className="space-y-4" onSubmit={async (event) => {
          event.preventDefault();
          setIsSaving(true);
          const form = new FormData(event.currentTarget);
          const message: AcademicMessage = {
            id: `MSG-${Date.now()}`,
            title: String(form.get("title") ?? "Academic notice"),
            audience: String(form.get("audience") ?? (messageMode === "sms" ? "Parents" : "Teachers")),
            channel: messageMode === "sms" ? "SMS" : "In-app",
            sentBy: "Dean of Academics",
            sentDate: new Date().toISOString().slice(0, 10),
            deliveryStatus: "pending",
            replies: 0,
          };
          try {
            await recordDeanWorkflow("academic_message_sent", {
              title: message.title,
              message: String(form.get("body") ?? ""),
              audience: message.audience,
              channel: message.channel,
              targetRoles: messageMode === "sms" ? ["parent"] : ["teacher", "hod"],
            });
            setMessageRows((current) => [{ ...message, deliveryStatus: "pending" }, ...current]);
            setNotice(`${message.channel} message recorded for ${message.audience}.`);
            setMessageMode(null);
          } catch (error) {
            setNotice(error instanceof Error ? error.message : "Could not record the academic message.");
          } finally {
            setIsSaving(false);
          }
        }}>
          <input name="title" className="input-base w-full" required placeholder="Subject" />
          <input name="audience" className="input-base w-full" required defaultValue={messageMode === "sms" ? "Parents of target class" : "All teachers"} />
          <textarea name="body" className="input-base min-h-24 w-full" required placeholder="Message content" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setMessageMode(null)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? "Queueing..." : "Queue Message"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function ApprovalsFollowUpsWorkspace({ dataset }: { dataset: DeanDataset }) {
  const [approvalRows, setApprovalRows] = useState(dataset.approvals);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
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
        <Button variant="primary" disabled={isSaving} onClick={async () => {
          const count = approvalRows.filter((row) => row.status === "pending").length;
          if (count === 0) {
            setNotice("No pending approvals require dean review.");
            return;
          }
          setIsSaving(true);
          try {
            await recordDeanWorkflow("approvals_reviewed", {
              title: "Dean approvals reviewed",
              message: `${count} pending approvals were reviewed by the dean.`,
              count,
            });
            setApprovalRows((current) => current.map((row) => row.status === "pending" ? { ...row, status: "approved" } : row));
            setNotice(`${count} pending approval${count === 1 ? "" : "s"} reviewed and recorded.`);
          } catch (error) {
            setNotice(error instanceof Error ? error.message : "Could not record the approval review.");
          } finally {
            setIsSaving(false);
          }
        }}>Review All Pending</Button>
      </div>
      {notice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}

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
  const [teachingMode, setTeachingMode] = useState<"log" | "plan" | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

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
        <Button variant="primary" onClick={() => setTeachingMode("log")}>Submit My Lesson Log</Button>
        <Button variant="secondary" onClick={() => setTeachingMode("plan")}>Submit My Lesson Plan</Button>
      </div>
      {notice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}

      <DataTable 
        title="My Assigned Classes" 
        subtitle="Overview of classes you personally teach." 
        columns={columns} 
        rows={classRows} 
        getRowKey={(row) => row.id} 
      />
      <Modal open={!!teachingMode} title={teachingMode === "log" ? "Submit Lesson Log" : "Submit Lesson Plan"} onClose={() => setTeachingMode(null)}>
        <form className="space-y-4" onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setIsSaving(true);
          try {
            await recordDeanWorkflow(teachingMode === "log" ? "teaching_lesson_log_submitted" : "teaching_lesson_plan_submitted", {
              title: teachingMode === "log" ? "Dean lesson log submitted" : "Dean lesson plan submitted",
              message: String(form.get("details") ?? ""),
              className: String(form.get("className") ?? ""),
              subject: String(form.get("subject") ?? ""),
            });
            setNotice(teachingMode === "log" ? "Lesson log submitted and recorded for dean teaching workload." : "Lesson plan submitted and recorded for dean teaching workload.");
            setTeachingMode(null);
          } catch (error) {
            setNotice(error instanceof Error ? error.message : "Could not submit the teaching record.");
          } finally {
            setIsSaving(false);
          }
        }}>
          <div className="grid gap-4 md:grid-cols-2">
            <input name="className" className="input-base" required placeholder="Class" />
            <input name="subject" className="input-base" required placeholder="Subject" />
          </div>
          <textarea name="details" className="input-base min-h-24 w-full" required placeholder={teachingMode === "log" ? "Topic taught, attendance link, and evidence" : "Topic, objectives, activities, and resources"} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setTeachingMode(null)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? "Submitting..." : "Submit"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function DeanSettingsWorkspace({ dataset: _dataset }: { dataset: DeanDataset }) {
  void _dataset;
  const [settingsMode, setSettingsMode] = useState<"risk" | "grading" | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [riskThreshold, setRiskThreshold] = useState("15%");
  const [missingLogs, setMissingLogs] = useState("3");
  const [gradingSystem, setGradingSystem] = useState("Standard 8-4-4 + CBC");
  const [reportComments, setReportComments] = useState("Mandatory");
  const [notice, setNotice] = useState<string | null>(null);

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
              <span className="font-semibold">{riskThreshold}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-sm text-foreground">Mean Deviation Anomaly Flag</span>
              <span className="font-semibold">±1.0</span>
            </div>
            <div className="flex justify-between items-center pb-2">
              <span className="text-sm text-foreground">Max Missing Lesson Logs Allowed</span>
              <span className="font-semibold">{missingLogs}</span>
            </div>
          </div>
          <Button variant="secondary" className="mt-4 w-full" onClick={() => setSettingsMode("risk")}>Edit Risk Thresholds</Button>
        </Card>
        
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Grading & Reports</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-sm text-foreground">Active Grading System</span>
              <span className="font-semibold">{gradingSystem}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-sm text-foreground">Report Card Comments</span>
              <span className="font-semibold">{reportComments}</span>
            </div>
            <div className="flex justify-between items-center pb-2">
              <span className="text-sm text-foreground">CA Weighting</span>
              <span className="font-semibold">30% CA / 70% Final</span>
            </div>
          </div>
          <Button variant="secondary" className="mt-4 w-full" onClick={() => setSettingsMode("grading")}>Edit Grading Rules</Button>
        </Card>
      </div>
      {notice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}
      <Modal open={!!settingsMode} title={settingsMode === "risk" ? "Edit Risk Thresholds" : "Edit Grading Rules"} onClose={() => setSettingsMode(null)}>
        {settingsMode === "risk" ? (
          <form className="space-y-4" onSubmit={async (event) => {
            event.preventDefault();
            setIsSaving(true);
            try {
              await recordDeanWorkflow("risk_thresholds_updated", {
                title: "Dean risk thresholds updated",
                message: `Syllabus delay critical alert ${riskThreshold}; max missing lesson logs ${missingLogs}.`,
                riskThreshold,
                missingLogs,
              });
              setNotice("Risk thresholds updated and recorded for the dean dashboard.");
              setSettingsMode(null);
            } catch (error) {
              setNotice(error instanceof Error ? error.message : "Could not save risk thresholds.");
            } finally {
              setIsSaving(false);
            }
          }}>
            <label className="block space-y-1 text-sm font-semibold">Syllabus delay critical alert
              <input className="input-base w-full" required value={riskThreshold} onChange={(event) => setRiskThreshold(event.target.value)} />
            </label>
            <label className="block space-y-1 text-sm font-semibold">Max missing lesson logs allowed
              <input className="input-base w-full" required value={missingLogs} onChange={(event) => setMissingLogs(event.target.value)} />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setSettingsMode(null)}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save Thresholds"}</Button>
            </div>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={async (event) => {
            event.preventDefault();
            setIsSaving(true);
            try {
              await recordDeanWorkflow("grading_rules_updated", {
                title: "Dean grading rules updated",
                message: `Active grading system ${gradingSystem}; report comments ${reportComments}.`,
                gradingSystem,
                reportComments,
              });
              setNotice("Grading rules updated and recorded for dean reports.");
              setSettingsMode(null);
            } catch (error) {
              setNotice(error instanceof Error ? error.message : "Could not save grading rules.");
            } finally {
              setIsSaving(false);
            }
          }}>
            <label className="block space-y-1 text-sm font-semibold">Active grading system
              <input className="input-base w-full" required value={gradingSystem} onChange={(event) => setGradingSystem(event.target.value)} />
            </label>
            <label className="block space-y-1 text-sm font-semibold">Report card comments
              <select className="input-base w-full" value={reportComments} onChange={(event) => setReportComments(event.target.value)}>
                <option>Mandatory</option>
                <option>Optional</option>
              </select>
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setSettingsMode(null)}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save Rules"}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
