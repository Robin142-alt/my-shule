"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import type { DeanDataset, ContinuousAssessment, ExamReview } from "@/lib/modules/dean-data";

async function recordDeanWorkflow(action: string, payload: Record<string, unknown>) {
  return requestDashboardApi("/api/admin-command/dean-academics/action", {
    method: "POST",
    body: { action, ...payload },
  });
}

export function ContinuousAssessmentWorkspace({ dataset }: { dataset: DeanDataset }) {
  const [caRows, setCaRows] = useState(dataset.continuousAssessments);
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const missingMarks = caRows.reduce((acc, val) => acc + val.missingMarks, 0);
  const reminderTargets = caRows.filter((row) => row.missingMarks > 0);

  async function remindTeachers(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (reminderTargets.length === 0) {
      setNotice("All continuous assessment marks are already submitted.");
      setIsReminderOpen(false);
      return;
    }
    setIsSaving(true);
    try {
      await recordDeanWorkflow("ca_marks_reminder_sent", {
        title: "Continuous assessment marks reminder",
        message: String(form.get("message") ?? ""),
        targets: reminderTargets.map((row) => ({ id: row.id, teacher: row.teacher, className: row.className, subject: row.subject, missingMarks: row.missingMarks })),
      });
      setCaRows((current) =>
        current.map((row) =>
          row.missingMarks > 0 && row.status === "pending"
            ? { ...row, status: "in-progress" }
            : row,
        ),
      );
      setNotice(`Reminder recorded for ${reminderTargets.length} assessment submission${reminderTargets.length === 1 ? "" : "s"} with missing marks.`);
      setIsReminderOpen(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not record the assessment reminder.");
    } finally {
      setIsSaving(false);
    }
  }

  const columns: DataTableColumn<typeof caRows[0]>[] = [
    { id: "assessmentName", header: "Assessment", render: (row: ContinuousAssessment) => <span className="font-semibold">{row.name}</span> },
    { id: "class", header: "Class", render: (row: ContinuousAssessment) => row.className },
    { id: "subjects", header: "Marks Submitted", render: (row: ContinuousAssessment) => row.marksSubmitted },
    { id: "completion", header: "Class Mean", render: (row: ContinuousAssessment) => row.classMean },
    { id: "status", header: "Status", render: (row: ContinuousAssessment) => <StatusPill label={row.status} tone={row.status === "completed" ? "ok" : row.status === "overdue" ? "critical" : "warning"} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        eyebrow="Continuous Assessment" 
        title="CA Tracking" 
        description="Monitor submission rates for ongoing continuous assessments." 
      />
      <section className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <p className="eyebrow">Active Assessments</p>
          <p className="mt-2 text-2xl font-semibold">1 (CAT 1)</p>
        </Card>
        <Card className="p-5 border-l-4 border-l-warning">
          <p className="eyebrow">Missing Marksheets</p>
          <p className="mt-2 text-2xl font-semibold text-warning">{missingMarks}</p>
        </Card>
        <Card className="p-5">
          <p className="eyebrow">Overall Completion</p>
          <p className="mt-2 text-2xl font-semibold">83%</p>
        </Card>
      </section>

      <div className="flex gap-3 mt-4">
        <Button variant="primary" onClick={() => setIsReminderOpen(true)}>Remind Teachers</Button>
      </div>
      {notice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}

      <DataTable 
        title="Assessment Progress" 
        subtitle="Tracking class-level submission of CA marks." 
        columns={columns} 
        rows={caRows} 
        getRowKey={(row) => row.id} 
      />

      <Modal open={isReminderOpen} title="Remind Teachers" onClose={() => setIsReminderOpen(false)}>
        <form className="space-y-4" onSubmit={remindTeachers}>
          <div className="rounded-md border p-3 text-sm">
            <div className="font-semibold">Missing marks: {missingMarks}</div>
            <div className="mt-1 text-muted-foreground">
              {reminderTargets.length > 0
                ? reminderTargets.map((row) => `${row.teacher} - ${row.className} ${row.subject}`).join("; ")
                : "No teachers currently have missing CA marks."}
            </div>
          </div>
          <textarea
            name="message"
            className="input-base min-h-24 w-full"
            required
            defaultValue="Please submit the pending continuous assessment marks today so moderation and report preparation can proceed."
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsReminderOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? "Queueing..." : "Queue Reminder"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function ExamReviewWorkspace({ dataset }: { dataset: DeanDataset }) {
  const [examRows, setExamRows] = useState(dataset.examReviews);
  const [isRemarkOpen, setIsRemarkOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const anomaliesCount = examRows.filter(e => parseFloat(e.deviation) < -0.5).length;
  const pendingReviews = examRows.filter(e => e.reviewStatus === "pending").length;
  const approvedCount = examRows.filter(e => e.reviewStatus === "reviewed").length;
  const remarkTarget = examRows.find((row) => parseFloat(row.deviation) < -0.5) ?? examRows[0] ?? null;

  async function approveReviewedResults() {
    const approvableRows = examRows.filter((row) => row.reviewStatus !== "returned");
    if (approvableRows.length === 0) {
      setNotice("No reviewed results are available for dean approval.");
      return;
    }
    setIsSaving(true);
    try {
      await recordDeanWorkflow("exam_results_reviewed", {
        title: "Exam results reviewed by dean",
        message: `${approvableRows.length} subject result reviews were approved by the dean.`,
        results: approvableRows.map((row) => ({ id: row.id, className: row.className, subject: row.subject, teacher: row.teacher, deviation: row.deviation })),
      });
      setExamRows((current) =>
        current.map((row) =>
          row.reviewStatus !== "returned"
            ? { ...row, reviewStatus: "reviewed" }
            : row,
        ),
      );
      setNotice(`Dean review recorded for ${approvableRows.length} subject result${approvableRows.length === 1 ? "" : "s"}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not record the exam review.");
    } finally {
      setIsSaving(false);
    }
  }

  async function requestHodRemark(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!remarkTarget) {
      setNotice("No exam review row is available for HOD re-mark request.");
      setIsRemarkOpen(false);
      return;
    }

    const form = new FormData(event.currentTarget);
    setIsSaving(true);
    try {
      await recordDeanWorkflow("hod_remark_requested", {
        title: "HOD re-mark requested",
        message: String(form.get("message") ?? ""),
        examReviewId: remarkTarget.id,
        className: remarkTarget.className,
        subject: remarkTarget.subject,
        teacher: remarkTarget.teacher,
        deviation: remarkTarget.deviation,
      });
      setExamRows((current) =>
        current.map((row) =>
          row.id === remarkTarget.id ? { ...row, reviewStatus: "returned" } : row,
        ),
      );
      setNotice(`HOD re-mark request recorded for ${remarkTarget.className} ${remarkTarget.subject}.`);
      setIsRemarkOpen(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not request the HOD re-mark.");
    } finally {
      setIsSaving(false);
    }
  }

  const columns: DataTableColumn<typeof examRows[0]>[] = [
    { id: "class", header: "Class", render: (row: ExamReview) => <span className="font-semibold">{row.className}</span> },
    { id: "subject", header: "Subject", render: (row: ExamReview) => row.subject },
    { id: "previousMean", header: "Target Mean", render: (row: ExamReview) => row.targetMean },
    { id: "currentMean", header: "Current Mean", render: (row: ExamReview) => row.meanScore },
    { id: "teacher", header: "Teacher", render: (row: ExamReview) => row.teacher },
    { id: "anomaly", header: "Deviation", render: (row: ExamReview) => <span className={parseFloat(row.deviation) < -0.5 ? "text-danger font-semibold" : ""}>{row.deviation}</span> },
    { id: "status", header: "Status", render: (row: ExamReview) => <StatusPill label={row.reviewStatus} tone={row.reviewStatus === "reviewed" ? "ok" : "warning"} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        eyebrow="Exam Review" 
        title="Result Moderation & Anomalies" 
        description="Review extreme deviations in subject performance before publishing." 
      />
      <section className="grid gap-4 md:grid-cols-4">
        <Card className="p-5 border-l-4 border-l-danger">
          <p className="eyebrow">Anomalies Detected</p>
          <p className="mt-2 text-2xl font-semibold text-danger">{anomaliesCount}</p>
        </Card>
        <Card className="p-5 border-l-4 border-l-warning">
          <p className="eyebrow">Pending Dean Review</p>
          <p className="mt-2 text-2xl font-semibold text-warning">{pendingReviews}</p>
        </Card>
        <Card className="p-5">
          <p className="eyebrow">Approved Results</p>
          <p className="mt-2 text-2xl font-semibold text-success">{approvedCount}</p>
        </Card>
      </section>

      <div className="flex gap-3 mt-4">
        <Button variant="primary" disabled={isSaving} onClick={approveReviewedResults}>{isSaving ? "Recording..." : "Approve All Reviewed"}</Button>
        <Button variant="secondary" onClick={() => setIsRemarkOpen(true)}>Request HOD Re-mark</Button>
      </div>
      {notice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}

      <DataTable 
        title="Subject Performance Anomalies" 
        subtitle="Subjects with significant deviations from previous exams." 
        columns={columns} 
        rows={examRows} 
        getRowKey={(row) => row.id} 
      />

      <Modal open={isRemarkOpen} title="Request HOD Re-mark" onClose={() => setIsRemarkOpen(false)}>
        <form className="space-y-4" onSubmit={requestHodRemark}>
          {remarkTarget ? (
            <div className="rounded-md border p-3 text-sm">
              <div className="font-semibold">{remarkTarget.className} - {remarkTarget.subject}</div>
              <div className="mt-1 text-muted-foreground">Teacher: {remarkTarget.teacher}. Deviation: {remarkTarget.deviation} against target mean {remarkTarget.targetMean}.</div>
            </div>
          ) : null}
          <textarea
            name="message"
            className="input-base min-h-24 w-full"
            required
            defaultValue={remarkTarget ? `Please verify scripts and marks entry for ${remarkTarget.className} ${remarkTarget.subject} before final publication.` : ""}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsRemarkOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? "Sending..." : "Send Re-mark Request"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function ExamPerformanceAnalyticsWorkspace({ dataset }: { dataset: DeanDataset }) {
  const analyticsRows = dataset.classPerformance;

  const columns: DataTableColumn<typeof analyticsRows[0]>[] = [
    { id: "class", header: "Class", render: (row) => <span className="font-semibold">{row.className} {row.stream}</span> },
    { id: "teacher", header: "Class Teacher", render: (row) => row.classTeacher },
    { id: "meanScore", header: "Mean Score", render: (row) => row.meanScore },
    { id: "previousMean", header: "Previous Mean", render: (row) => row.previousMean },
    { id: "change", header: "Deviation", render: (row) => <span className={row.change.startsWith("-") ? "text-danger" : "text-success"}>{row.change}</span> },
    { id: "status", header: "Status", render: (row) => <StatusPill label={row.riskLevel} tone={row.riskLevel === "on-track" ? "ok" : "critical"} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        eyebrow="Performance Analytics" 
        title="Academic Performance" 
        description="Deep dive into class, subject, and departmental academic metrics." 
      />
      <section className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="eyebrow">School Mean Score</p>
          <p className="mt-2 text-3xl font-bold">6.8 (C+)</p>
          <p className="mt-1 text-sm text-success">+0.2 from last term</p>
        </Card>
        <Card className="p-5">
          <p className="eyebrow">Top Performing Department</p>
          <p className="mt-2 text-2xl font-bold">Humanities</p>
          <p className="mt-1 text-sm text-muted">Mean: 8.5 (B)</p>
        </Card>
        <Card className="p-5">
          <p className="eyebrow">Most Improved Class</p>
          <p className="mt-2 text-2xl font-bold">Form 2 East</p>
          <p className="mt-1 text-sm text-success">Deviation: +1.4</p>
        </Card>
      </section>

      <div className="mt-6">
        <DataTable 
          title="Performance Breakdown" 
          subtitle="Key performance indicators across different school entities." 
          columns={columns} 
          rows={analyticsRows} 
          getRowKey={(row) => row.id} 
        />
      </div>
    </div>
  );
}

export function ReportCardOversightWorkspace({ dataset }: { dataset: DeanDataset }) {
  const [reportRows, setReportRows] = useState(dataset.reportReadiness);
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [isNotifyOpen, setIsNotifyOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const totalMissingMarks = reportRows.reduce((acc, val) => acc + (val.marksStatus === "missing" ? 1 : 0), 0);
  const totalMissingComments = reportRows.reduce((acc, val) => acc + (val.commentsStatus === "missing" ? 1 : 0), 0);
  const classesReady = reportRows.filter(r => r.deanReview === "approved").length;
  const publishableRows = reportRows.filter((row) => row.marksStatus === "complete" && row.commentsStatus === "complete" && row.gradeStatus === "complete" && row.deanReview === "approved");
  const blockedRows = reportRows.filter((row) => !publishableRows.some((ready) => ready.id === row.id));

  async function publishReadyReports(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (publishableRows.length === 0) {
      setNotice("No report card batch is publishable yet. Missing marks, comments, grades, or dean review must be resolved first.");
      setIsPublishOpen(false);
      return;
    }
    setIsSaving(true);
    try {
      await recordDeanWorkflow("report_cards_submitted_for_publication", {
        title: "Report cards submitted for publication",
        message: `${publishableRows.length} report card batches submitted for publication. ${blockedRows.length} batches remain blocked.`,
        publishable: publishableRows.map((row) => ({ id: row.id, className: row.className, stream: row.stream, classTeacher: row.classTeacher })),
        blockedCount: blockedRows.length,
      });
      setReportRows((current) =>
        current.map((row) =>
          publishableRows.some((ready) => ready.id === row.id)
            ? { ...row, principalApproval: "approved" }
            : row,
        ),
      );
      setNotice(`${publishableRows.length} report card batch${publishableRows.length === 1 ? "" : "es"} submitted and recorded for publication. ${blockedRows.length} class${blockedRows.length === 1 ? "" : "es"} still need completion.`);
      setIsPublishOpen(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not submit report cards for publication.");
    } finally {
      setIsSaving(false);
    }
  }

  async function notifyClassTeachers(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const affected = reportRows.filter((row) => row.marksStatus === "missing" || row.commentsStatus === "missing").length;
    if (affected === 0) {
      setNotice("All class teachers have completed report card marks and comments.");
      setIsNotifyOpen(false);
      return;
    }
    setIsSaving(true);
    try {
      await recordDeanWorkflow("report_card_completion_notice_sent", {
        title: "Report card completion notice sent",
        message: String(form.get("message") ?? ""),
        affectedCount: affected,
        batches: reportRows
          .filter((row) => row.marksStatus === "missing" || row.commentsStatus === "missing")
          .map((row) => ({ id: row.id, className: row.className, stream: row.stream, classTeacher: row.classTeacher, marksStatus: row.marksStatus, commentsStatus: row.commentsStatus })),
      });
      setNotice(`Class teacher notification recorded for ${affected} incomplete report card batch${affected === 1 ? "" : "es"}.`);
      setIsNotifyOpen(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not notify class teachers.");
    } finally {
      setIsSaving(false);
    }
  }

  const columns: DataTableColumn<typeof reportRows[0]>[] = [
    { id: "class", header: "Class", render: (row) => <span className="font-semibold">{row.className} {row.stream}</span> },
    { id: "teacher", header: "Class Teacher", render: (row) => row.classTeacher },
    { id: "marks", header: "Marks Status", render: (row) => <span className={row.marksStatus === "missing" ? "text-danger font-semibold" : ""}>{row.marksStatus}</span> },
    { id: "comments", header: "Comments", render: (row) => <span className={row.commentsStatus === "missing" ? "text-warning font-semibold" : ""}>{row.commentsStatus}</span> },
    { id: "deanReview", header: "Dean Review", render: (row) => <StatusPill label={row.deanReview} tone={row.deanReview === "approved" ? "ok" : "warning"} /> },
    { id: "principalApproval", header: "Principal", render: (row) => <StatusPill label={row.principalApproval} tone={row.principalApproval === "approved" ? "ok" : "warning"} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        eyebrow="Report Card Oversight" 
        title="Report Generation Status" 
        description="Ensure all data is complete before generating and publishing end-term report cards." 
      />
      <section className="grid gap-4 md:grid-cols-4">
        <Card className="p-5 border-l-4 border-l-danger">
          <p className="eyebrow">Total Missing Marks</p>
          <p className="mt-2 text-2xl font-semibold text-danger">{totalMissingMarks}</p>
        </Card>
        <Card className="p-5 border-l-4 border-l-warning">
          <p className="eyebrow">Missing Class Teacher Comments</p>
          <p className="mt-2 text-2xl font-semibold text-warning">{totalMissingComments}</p>
        </Card>
        <Card className="p-5">
          <p className="eyebrow">Classes Ready</p>
          <p className="mt-2 text-2xl font-semibold text-success">{classesReady} / {reportRows.length}</p>
        </Card>
      </section>

      <div className="flex gap-3 mt-4">
        <Button variant="primary" onClick={() => setIsPublishOpen(true)}>Publish Reports</Button>
        <Button variant="secondary" onClick={() => setIsNotifyOpen(true)}>Notify Class Teachers</Button>
      </div>
      {notice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}

      <DataTable 
        title="Report Card Readiness" 
        subtitle="Tracking the completion of required data for report generation." 
        columns={columns} 
        rows={reportRows} 
        getRowKey={(row) => row.id} 
      />

      <Modal open={isPublishOpen} title="Publish Reports" onClose={() => setIsPublishOpen(false)}>
        <form className="space-y-4" onSubmit={publishReadyReports}>
          <div className="rounded-md border p-3 text-sm">
            <div className="font-semibold">Publishable batches: {publishableRows.length}</div>
            <div className="mt-1 text-muted-foreground">Blocked batches: {blockedRows.length}</div>
          </div>
          {blockedRows.length > 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Resolve missing marks, comments, grade status, and dean review before those batches can be published.
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsPublishOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? "Submitting..." : "Submit Ready Reports"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={isNotifyOpen} title="Notify Class Teachers" onClose={() => setIsNotifyOpen(false)}>
        <form className="space-y-4" onSubmit={notifyClassTeachers}>
          <textarea
            name="message"
            className="input-base min-h-24 w-full"
            required
            defaultValue="Please complete missing marks and class teacher comments so report cards can be reviewed and published."
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsNotifyOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? "Queueing..." : "Queue Notifications"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
