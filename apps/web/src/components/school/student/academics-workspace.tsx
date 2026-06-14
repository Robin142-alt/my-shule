// @ts-nocheck
"use client";

import { Download, BookOpen, Clock, CheckCircle, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSchoolQuery, useSchoolMutation } from "@/lib/data/school-hooks";

export function AcademicsWorkspace() {
  // Fetch real data from the backend
  const { data: assignments, isLoading: assignLoading, refetch: refetchAssign } = useSchoolQuery('/api/academics/my-assignments');
  const { data: reportCards, isLoading: reportsLoading } = useSchoolQuery('/api/exams/report-cards');

  const activeAssignments = Array.isArray(assignments) ? assignments : [];
  const publishedReports = Array.isArray(reportCards) ? reportCards.slice(0, 3) : [];

  const markDoneMutation = useSchoolMutation({
    // We mock an endpoint update for marking assignment done
    endpoint: '/api/academics/assignments', 
    method: 'PATCH',
    onSuccess: () => {
      refetchAssign();
      alert('Marked as done!');
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">My Academics & Homework</h2>
          <p className="text-sm text-slate-500 mt-1">Stay on top of your assignments and view your report cards.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-medium text-slate-900 mb-2">Pending Assignments</h3>
          
          {assignLoading ? (
             <Card className="p-8 border border-slate-200 text-center animate-pulse text-slate-500">
               Loading assignments...
             </Card>
          ) : activeAssignments.length > 0 ? (
             activeAssignments.map((task: any, idx: number) => (
                <Card key={idx} className="p-4 border border-slate-200 flex flex-col md:flex-row gap-4 justify-between group hover:border-blue-200 transition-colors">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900">{task.title}</h4>
                      <p className="text-sm text-slate-500 mt-1">{task.subject || 'General'}</p>
                      {task.description && (
                        <p className="text-sm text-slate-600 mt-2 bg-slate-50 p-2 rounded">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/50">
                          <Clock className="w-3 h-3" /> Due {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end items-end gap-2 text-sm">
                    <Button 
                      variant="outline" 
                      className="gap-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                      onClick={() => markDoneMutation.mutate({ id: task.id, status: 'completed' })}
                      disabled={markDoneMutation.isPending}
                    >
                      <CheckCircle className="w-4 h-4" /> Mark Done
                    </Button>
                  </div>
                </Card>
             ))
          ) : (
             <Card className="p-8 border border-slate-200 border-dashed text-center">
               <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mb-4">
                 <CheckCircle className="w-6 h-6" />
               </div>
               <p className="text-slate-900 font-medium">All Caught Up!</p>
               <p className="text-sm text-slate-500 mt-1">You have no pending assignments right now.</p>
             </Card>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="font-medium text-slate-900 mb-2">My Report Cards</h3>
          
          <div className="space-y-3">
            {reportsLoading ? (
               <Card className="p-6 border border-slate-200 text-center text-slate-500 animate-pulse">
                 Loading...
               </Card>
            ) : publishedReports.length > 0 ? (
               publishedReports.map((report: any, idx: number) => (
                  <Card key={idx} className="p-4 border border-slate-200 flex items-center justify-between hover:border-blue-200 transition-colors">
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
                  </Card>
               ))
            ) : (
               <Card className="p-6 border border-slate-200 text-center">
                 <p className="text-sm text-slate-500">No report cards have been published yet.</p>
               </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Temporary icon definition
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

