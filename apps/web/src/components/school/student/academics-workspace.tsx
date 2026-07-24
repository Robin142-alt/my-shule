"use client";

import { BookOpen, Download, FileText, GraduationCap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type AcademicMark = {
  id: string;
  subject: string;
  exam: string;
  teacher?: string | null;
  score: number;
  remarks?: string | null;
  status: string;
  published_at?: string | null;
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
  };
  assignments: [];
  marks: AcademicMark[];
  report_cards: ReportCard[];
};

export function AcademicsWorkspace() {
  const {
    data,
    isLoading,
    error,
  } = useSchoolQuery<StudentAcademicsData>("/admin-command/student/academics");

  const marks = data?.marks ?? [];
  const reportCards = data?.report_cards ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Academics & Report Cards</h2>
        <p className="mt-1 text-sm text-slate-500">
          View only marks and report cards that your school has officially published.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">
          Academic records could not be loaded: {error.message}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Published subjects"
          value={isLoading ? "..." : String(data?.metrics.subjects ?? 0)}
          icon={BookOpen}
        />
        <MetricCard
          label="Published mean score"
          value={isLoading ? "..." : `${data?.metrics.mean_score ?? 0}%`}
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
          <h3 className="font-medium text-slate-900">Published Marks</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
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
                  <td className="px-4 py-3 text-right font-bold text-slate-900">{mark.score}%</td>
                  <td className="px-4 py-3 text-slate-600">{mark.remarks || "No remarks"}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-2"
                onClick={() => window.open(report.download_url, "_blank", "noopener,noreferrer")}
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
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
