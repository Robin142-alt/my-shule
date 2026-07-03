"use client";

import { useState } from "react";
import { Download, BookOpen, GraduationCap, Clock, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSchoolQuery } from "@/lib/data/school-hooks";

interface Assignment {
  id?: string;
  title: string;
  due_date?: string;
  subject?: string;
}

interface ReportCardSummary {
  id?: string;
  term?: string;
  academic_year?: string;
}

interface MarkSummary {
  id?: string;
  subject?: string;
  exam?: string;
  score?: string | number;
  grade?: string;
}

export function AcademicsWorkspace() {
  const [showAllHomework, setShowAllHomework] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // Fetch real data from the backend
  const { data: assignments, isLoading: assignLoading } = useSchoolQuery<Assignment[]>('/api/academics/my-assignments');
  const { data: reportCards, isLoading: reportsLoading } = useSchoolQuery<ReportCardSummary[]>('/api/exams/report-cards');
  const { data: marks, isLoading: marksLoading } = useSchoolQuery<MarkSummary[]>('/api/exams/marks');

  const allAssignments = Array.isArray(assignments) ? assignments : [];
  const activeAssignments = showAllHomework ? allAssignments : allAssignments.slice(0, 3);
  const publishedReports = Array.isArray(reportCards) ? reportCards.slice(0, 3) : [];

  function openReportCard(report: ReportCardSummary) {
    if (!report?.id) {
      setNotice("This report card cannot be downloaded because it has no report identifier.");
      return;
    }

    window.open(`/api/exams/report-cards/${encodeURIComponent(report.id)}/parent-download`, "_blank", "noopener,noreferrer");
    setNotice(`Report card download requested for ${report.term || "selected term"}.`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Academics Overview</h2>
          <p className="text-sm text-slate-500 mt-1">Track grades, assignments, and download term reports.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border border-slate-200 col-span-1 md:col-span-2 bg-white">
          <h3 className="font-medium text-slate-900 flex items-center gap-2 mb-4">
            <GraduationCap className="w-5 h-5 text-blue-500" /> Recent Grades
          </h3>
          <div className="space-y-3">
            {marksLoading ? (
               <div className="animate-pulse space-y-2">
                 <div className="h-10 bg-slate-100 rounded"></div>
                 <div className="h-10 bg-slate-100 rounded"></div>
               </div>
            ) : Array.isArray(marks) && marks.length > 0 ? (
               marks.slice(0, 4).map((mark, idx) => (
                 <div key={mark.id ?? idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div>
                      <p className="font-medium text-slate-900">{mark.subject || 'Subject'}</p>
                      <p className="text-xs text-slate-500">{mark.exam || 'Assessment'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">{mark.score}%</p>
                      <p className="text-xs text-slate-500 font-medium">Grade {mark.grade || '-'}</p>
                    </div>
                 </div>
               ))
            ) : (
               <div className="p-4 text-center text-slate-500 bg-slate-50 rounded-lg">
                 No recent grades published.
               </div>
            )}
          </div>
        </Card>

        <Card className="p-6 border border-slate-200">
          <h3 className="font-medium text-slate-900 flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-emerald-500" /> Active Homework
          </h3>
          <div className="space-y-4">
            {assignLoading ? (
               <div className="animate-pulse space-y-2">
                 <div className="h-16 bg-slate-100 rounded"></div>
                 <div className="h-16 bg-slate-100 rounded"></div>
               </div>
            ) : activeAssignments.length > 0 ? (
               activeAssignments.map((task, idx) => (
                 <div key={task.id ?? idx} className="pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                    <p className="font-medium text-slate-900 text-sm">{task.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{task.subject || 'General'}</p>
                    <p className="text-xs text-amber-600 font-medium mt-1.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Due {task.due_date ? new Date(task.due_date).toLocaleDateString() : "not set"}
                    </p>
                 </div>
               ))
            ) : (
               <div className="p-4 text-center text-sm text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                 No pending homework.
               </div>
            )}
            {allAssignments.length > 3 ? (
              <Button variant="outline" className="w-full text-xs h-8" onClick={() => setShowAllHomework((current) => !current)}>
                {showAllHomework ? "Show Recent" : "View All"}
              </Button>
            ) : null}
          </div>
        </Card>
      </div>
      {notice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}

      <Card className="border border-slate-200 overflow-hidden mt-6">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-medium text-slate-900">Term Report Cards</h3>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportsLoading ? (
             <div className="col-span-full text-center p-8 text-slate-500 animate-pulse">
               Loading report cards...
             </div>
          ) : publishedReports.length > 0 ? (
             publishedReports.map((report, idx) => (
              <div key={report.id ?? idx} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-white hover:border-blue-200 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-50 text-rose-600 rounded">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-900">{report.term || 'Term'}</h4>
                    <p className="text-xs text-slate-500">{report.academic_year || 'Year'}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => openReportCard(report)} aria-label={`Download ${report.term || "term"} report card`}>
                  <Download className="w-4 h-4" />
                </Button>
              </div>
             ))
          ) : (
              <div className="col-span-full p-8 text-center text-slate-500 bg-slate-50 rounded border border-dashed border-slate-200">
                No official report cards have been published yet for this academic year.
              </div>
          )}
        </div>
      </Card>
    </div>
  );
}

