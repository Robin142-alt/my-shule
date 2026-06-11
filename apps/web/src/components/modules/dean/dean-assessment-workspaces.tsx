"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import type { DeanDataset, ContinuousAssessment, ExamReview, ReportReadiness } from "@/lib/modules/dean-data";

export function ContinuousAssessmentWorkspace({ dataset }: { dataset: DeanDataset }) {
  const caRows = dataset.continuousAssessments;
  const missingMarks = caRows.reduce((acc, val) => acc + val.missingMarks, 0);

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
        <Button variant="primary">Remind Teachers</Button>
      </div>

      <DataTable 
        title="Assessment Progress" 
        subtitle="Tracking class-level submission of CA marks." 
        columns={columns} 
        rows={caRows} 
        getRowKey={(row) => row.id} 
      />
    </div>
  );
}

export function ExamReviewWorkspace({ dataset }: { dataset: DeanDataset }) {
  const examRows = dataset.examReviews;
  const anomaliesCount = examRows.filter(e => parseFloat(e.deviation) < -0.5).length;
  const pendingReviews = examRows.filter(e => e.reviewStatus === "pending").length;
  const approvedCount = examRows.filter(e => e.reviewStatus === "reviewed").length;

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
        <Button variant="primary">Approve All Reviewed</Button>
        <Button variant="secondary">Request HOD Re-mark</Button>
      </div>

      <DataTable 
        title="Subject Performance Anomalies" 
        subtitle="Subjects with significant deviations from previous exams." 
        columns={columns} 
        rows={examRows} 
        getRowKey={(row) => row.id} 
      />
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
  const reportRows = dataset.reportReadiness;
  const assessmentRows = dataset.continuousAssessments;
  const totalMissingMarks = reportRows.reduce((acc, val) => acc + (val.marksStatus === "missing" ? 1 : 0), 0);
  const totalMissingComments = reportRows.reduce((acc, val) => acc + (val.commentsStatus === "missing" ? 1 : 0), 0);
  const classesReady = reportRows.filter(r => r.deanReview === "approved").length;

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
        <Button variant="primary" disabled>Publish Reports</Button>
        <Button variant="secondary">Notify Class Teachers</Button>
      </div>

      <DataTable 
        title="Report Card Readiness" 
        subtitle="Tracking the completion of required data for report generation." 
        columns={columns} 
        rows={reportRows} 
        getRowKey={(row) => row.id} 
      />
    </div>
  );
}
