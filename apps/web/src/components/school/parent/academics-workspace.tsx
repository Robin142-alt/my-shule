"use client";

import { Download, BookOpen, GraduationCap, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSchoolQuery } from "@/hooks/use-school-api";

export function AcademicsWorkspace() {
  // Fetch real data from the backend
  const { data: assignments, isLoading: assignLoading } = useSchoolQuery('/api/academics/my-assignments');
  const { data: reportCards, isLoading: reportsLoading } = useSchoolQuery('/api/exams/report-cards');
  const { data: marks, isLoading: marksLoading } = useSchoolQuery('/api/exams/marks');

  const activeAssignments = Array.isArray(assignments) ? assignments.slice(0, 3) : [];
  const publishedReports = Array.isArray(reportCards) ? reportCards.slice(0, 3) : [];

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
               marks.slice(0, 4).map((mark: any, idx: number) => (
                 <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
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
               activeAssignments.map((task: any, idx: number) => (
                 <div key={idx} className="pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                    <p className="font-medium text-slate-900 text-sm">{task.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{task.subject || 'General'}</p>
                    <p className="text-xs text-amber-600 font-medium mt-1.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Due {new Date(task.due_date).toLocaleDateString()}
                    </p>
                 </div>
               ))
            ) : (
               <div className="p-4 text-center text-sm text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                 No pending homework.
               </div>
            )}
            <Button variant="outline" className="w-full text-xs h-8">View All</Button>
          </div>
        </Card>
      </div>

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
             publishedReports.map((report: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-white hover:border-blue-200 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-50 text-rose-600 rounded">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-900">{report.term || 'Term'}</h4>
                    <p className="text-xs text-slate-500">{report.academic_year || 'Year'}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600">
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

// Temporary icon definition for the missing FileText import from previous template
function FileText(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
      <line x1="10" x2="8" y1="9" y2="9" />
    </svg>
  )
}
