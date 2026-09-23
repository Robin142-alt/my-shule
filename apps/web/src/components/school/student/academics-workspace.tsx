"use client";

import { RecordTable } from "@/components/ui/record-table";
import { BookOpen, CheckCircle2, Clock3, Download, Eye, FileText, GraduationCap } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";
import { openPrintDocument } from "@/lib/dashboard/export";

type AcademicMark = {
  id: string;
  subject: string;
  exam: string;
  teacher?: string | null;
  score: number | null;
  score_status: string;
  remarks?: string | null;
  status: string;
  published_at?: string | null;
};

type StudentAssignment = {
  id: string;
  title: string;
  description?: string | null;
  subject: string;
  teacher?: string | null;
  due_at: string;
  status: string;
  submission_status?: string | null;
  submitted_at?: string | null;
  completed_at?: string | null;
  is_complete: boolean;
};

type ReportCard = {
  id: string;
  student_name?: string | null;
  exam_series_name?: string | null;
  academic_year?: string | null;
  term?: string | null;
  status: string;
  published_at?: string | null;
  download_url: string;
};

type StudentAcademicsData = {
  metrics: {
    subjects: number;
    mean_score: number;
    report_cards: number;
    pending_assignments: number;
    entered_scores?: number;
  };
  assignments: StudentAssignment[];
  marks: AcademicMark[];
  report_cards: ReportCard[];
};

export function AcademicsWorkspace() {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useSchoolQuery<StudentAcademicsData>("/admin-command/student/academics");
  const markAssignmentDone = useSchoolMutation<
    { success: boolean; alreadyCompleted?: boolean },
    { assignmentId: string }
  >(
    "/api/student-portal/assignments/mark-done",
    "POST",
    {
      onSuccess: async (result) => {
        toast.success(result.alreadyCompleted ? "Assignment was already complete." : "Assignment marked complete.");
        await refetch();
      },
      onError: (mutationError) => {
        toast.error(mutationError.message || "Assignment could not be completed.");
      },
    },
  );

  const assignments = data?.assignments ?? [];
  const marks = data?.marks ?? [];
  const reportCards = data?.report_cards ?? [];

  function downloadReportCard(report: ReportCard) {
    window.open(report.download_url, "_blank", "noopener,noreferrer");
  }

  function previewReportCard(report: ReportCard) {
    openPrintDocument({
      eyebrow: "Published report card",
      title: report.term || report.exam_series_name || "School report card",
      subtitle: report.student_name || "Student report",
      rows: [
        { label: "Academic year", value: report.academic_year || "Not recorded" },
        { label: "Assessment", value: report.exam_series_name || "Published assessment" },
        { label: "Published", value: formatDate(report.published_at) },
        { label: "Status", value: report.status },
      ],
      footer: "Open the official downloaded report card for the full approved result and school branding.",
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Academics & Report Cards</h2>
        <p className="mt-1 text-sm text-slate-500">
          Complete class assignments and view only marks and report cards that your school has officially published.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">
          Academic records could not be loaded: {error.message}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Pending assignments"
          value={isLoading ? "..." : String(data?.metrics.pending_assignments ?? 0)}
          icon={Clock3}
        />
        <MetricCard
          label="Published subjects"
          value={isLoading ? "..." : String(data?.metrics.subjects ?? 0)}
          icon={BookOpen}
        />
        <MetricCard
          label="Published mean score"
          value={isLoading
            ? "..."
            : (data?.metrics.entered_scores ?? marks.filter((mark) => mark.score !== null).length) > 0
              ? `${data?.metrics.mean_score ?? 0}%`
              : "Not available"}
          icon={GraduationCap}
        />
        <MetricCard
          label="Report cards"
          value={isLoading ? "..." : String(data?.metrics.report_cards ?? 0)}
          icon={FileText}
        />
      </div>

      <Card className="overflow-hidden border border-slate-200">
        <div className="border-b border-slate-100 bg-slate-50/50 p-4">
          <h3 className="font-medium text-slate-900">Assignments</h3>
          <p className="mt-1 text-sm text-slate-500">
            Assignments published by teachers for your current class appear here.
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading assignments...</div>
          ) : assignments.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-medium text-slate-900">No assignments have been published</p>
              <p className="mt-1 text-sm text-slate-500">
                Your teacher&apos;s next published class assignment will appear here.
              </p>
            </div>
          ) : assignments.map((assignment) => (
            <div key={assignment.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-medium text-slate-900">{assignment.title}</h4>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    assignment.is_complete
                      ? "bg-emerald-50 text-emerald-700"
                      : isPastDue(assignment.due_at)
                        ? "bg-rose-50 text-rose-700"
                        : "bg-amber-50 text-amber-700"
                  }`}>
                    {assignment.is_complete ? "Completed" : isPastDue(assignment.due_at) ? "Overdue" : "Pending"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {assignment.subject} - {assignment.teacher || "Teacher not recorded"}
                </p>
                {assignment.description ? (
                  <p className="mt-1 text-sm text-slate-500">{assignment.description}</p>
                ) : null}
                <p className="mt-2 text-xs font-medium text-slate-500">
                  Due {formatDate(assignment.due_at)}
                </p>
              </div>
              <Button
                type="button"
                variant={assignment.is_complete ? "outline" : "default"}
                className="shrink-0 gap-2"
                disabled={assignment.is_complete || markAssignmentDone.isPending}
                onClick={() => markAssignmentDone.mutate({ assignmentId: assignment.id })}
              >
                <CheckCircle2 className="h-4 w-4" />
                {assignment.is_complete
                  ? "Completed"
                  : markAssignmentDone.isPending && markAssignmentDone.variables?.assignmentId === assignment.id
                    ? "Saving..."
                    : "Mark complete"}
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden border border-slate-200">
        <div className="border-b border-slate-100 bg-slate-50/50 p-4">
          <h3 className="font-medium text-slate-900">Published Marks</h3>
        </div>
        <div className="overflow-x-auto">
          <RecordTable className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Assessment</th>
                <th className="px-4 py-3 font-medium">Teacher</th>
                <th className="px-4 py-3 text-right font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Loading published marks...
                  </td>
                </tr>
              ) : marks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No marks have been published to your student portal yet.
                  </td>
                </tr>
              ) : marks.map((mark) => (
                <tr key={mark.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-900">{mark.subject}</td>
                  <td className="px-4 py-3 text-slate-600">{mark.exam}</td>
                  <td className="px-4 py-3 text-slate-600">{mark.teacher || "Not recorded"}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">
                    {mark.score === null ? formatScoreStatus(mark.score_status) : `${mark.score}%`}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{mark.remarks || "No remarks"}</td>
                </tr>
              ))}
            </tbody>
          </RecordTable>
        </div>
      </Card>

      <div>
        <h3 className="mb-3 font-medium text-slate-900">Published Report Cards</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {isLoading ? (
            <Card className="p-6 text-center text-slate-500">Loading report cards...</Card>
          ) : reportCards.length === 0 ? (
            <Card className="border border-dashed border-slate-300 p-8 text-center md:col-span-2 xl:col-span-3">
              <p className="font-medium text-slate-900">No published report cards</p>
              <p className="mt-1 text-sm text-slate-500">
                Report cards appear here after the exams workflow is approved and published.
              </p>
            </Card>
          ) : reportCards.map((report) => (
            <Card key={report.id} className="flex items-center justify-between gap-4 border border-slate-200 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="rounded-lg bg-rose-50 p-2 text-rose-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="truncate text-sm font-medium text-slate-900">
                    {report.term || report.exam_series_name || "Published report card"}
                  </h4>
                  <p className="truncate text-xs text-slate-500">
                    {[report.academic_year, formatDate(report.published_at)].filter(Boolean).join(" - ")}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => previewReportCard(report)}
                >
                  <Eye className="h-4 w-4" />
                  Preview
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => downloadReportCard(report)}
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof BookOpen;
}) {
  return (
    <Card className="border border-slate-200 p-5">
      <Icon className="h-5 w-5 text-blue-600" />
      <p className="mt-4 text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </Card>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "Date not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date not recorded" : date.toLocaleDateString("en-KE");
}

function isPastDue(value?: string | null) {
  if (!value) return false;
  const dueDate = new Date(value);
  return !Number.isNaN(dueDate.getTime()) && dueDate.getTime() < Date.now();
}

function formatScoreStatus(value: string) {
  const labels: Record<string, string> = {
    absent: "Absent",
    exempt: "Exempt",
    not_assessed: "Not assessed",
    incomplete: "Incomplete",
    withheld: "Withheld",
    medical_exception: "Medical exception",
    transfer_student: "Transfer student",
  };
  return labels[value] || "Not assessed";
}
