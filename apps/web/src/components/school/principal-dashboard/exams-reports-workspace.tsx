"use client";

import { Card } from "@/components/ui/card";
import { AlertCircle, FileText, CheckCircle2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Loader2 } from "lucide-react";
import { usePermissions } from "@/components/providers/permission-context";

type PrincipalExamsData = {
  status: "active" | "degraded" | "setup_required";
  activeExams: number;
  reportsPending: number;
  missingMarksAlerts: number;
  averageScore: number;
  performanceTrend: Array<{ label: string; value: number }>;
  recentResults: Array<any>;
};

export function PrincipalExamsReportsWorkspace() {
  const { data, isLoading, error, refetch } = useSchoolQuery<PrincipalExamsData>('/admin-command/principal/exams');
  const academicSetupData: any = { academicYears: [], terms: [] };
  const { hasPermission } = usePermissions();
  
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const handleApproveAllReports = async () => {
    const results = Array.isArray(data?.recentResults) ? data.recentResults : [];
    const examIds = results
      .map((result: any) => result.exam_id ?? result.examId ?? result.id)
      .filter(Boolean);

    if (examIds.length === 0) {
      setFormError("No report-card batch is available for approval.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");
    try {
      await Promise.all(examIds.map((examId: string) => requestDashboardApi(`/admin-command/principal/exams-report-cards/${examId}/approve`, { method: "POST" })));
      await refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to approve report-card batches.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateExam = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");
    const formData = new FormData(e.currentTarget);
    
    try {
      await requestDashboardApi('/admin-command/exams/cycles', {
        method: "POST",
        body: {
          name: formData.get("name"),
          academicYearId: formData.get("academicYearId"),
          termId: formData.get("termId"),
          examType: formData.get("examType"),
        }
      });
      setIsExamModalOpen(false);
      refetch();
    } catch (err: any) {
      setFormError(err.message || "Failed to create exam series");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-white/5 rounded-xl border border-white/10" />
          <div className="h-64 bg-white/5 rounded-xl border border-white/10" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border border-red-500/20 bg-red-500/10 p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-500" />
          <h2 className="text-xl font-bold text-red-500">Failed to load Exams Overview</h2>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Reports Pending Approval</div>
          <div className="mt-2 text-2xl font-black text-yellow-500">{data.reportsPending}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Missing Marks Alerts</div>
          <div className="mt-2 text-2xl font-black text-red-500">{data.missingMarksAlerts}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">School Average Score</div>
          <div className="mt-2 text-2xl font-black text-white">{data.averageScore}%</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm font-semibold text-white/70">Active Exams</div>
              <div className="mt-2 text-2xl font-black text-white">{data.activeExams}</div>
            </div>
            {hasPermission('exams:write') && (
              <Button size="sm" variant="outline" className="text-xs bg-white/10 text-white" onClick={() => setIsExamModalOpen(true)}>
                + New Exam
              </Button>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full">
          <h2 className="text-xl font-bold text-white mb-6">Exam Performance Trend</h2>
          <div className="flex-1 flex items-end gap-2 mt-4 min-h-[200px]">
            {data.performanceTrend?.map((item) => (
              <div key={item.label} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="w-full relative bg-white/5 rounded-t-sm" style={{ height: "150px" }}>
                  <div 
                    className="absolute bottom-0 w-full bg-purple-500/50 rounded-t-sm transition-all duration-500 group-hover:bg-purple-400/60"
                    style={{ height: `${item.value}%` }}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.value}%
                    </div>
                  </div>
                </div>
                <span className="text-xs text-white/50">{item.label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Pending Reports Action</h2>
            <button type="button" disabled={isSubmitting} onClick={handleApproveAllReports} className="text-xs bg-white/10 text-white px-3 py-1.5 rounded hover:bg-white/20 transition-colors flex items-center gap-1 disabled:opacity-50">
              <CheckCircle2 className="h-3 w-3" />
              {isSubmitting ? "Approving..." : "Approve All"}
            </button>
          </div>
          
          {(!data.recentResults || data.recentResults.length === 0) ? (
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-center bg-white/5 rounded-lg border border-white/5">
              <FileText className="h-10 w-10 text-white/20 mb-3" />
              <p className="text-white/60">No recent exam results to review</p>
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto pr-2">
              {/* Report tasks will go here */}
            </div>
          )}
        </Card>
      </div>

      <Modal open={isExamModalOpen} onClose={() => setIsExamModalOpen(false)} title="Create Exam Series">
        <form onSubmit={handleCreateExam} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-sm">
              {formError}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Exam Name</label>
            <input type="text" name="name" required className="w-full border rounded p-2 text-sm" placeholder="e.g. Term 1 Midterms" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Academic Year</label>
            <select name="academicYearId" required className="w-full border rounded p-2 text-sm bg-white text-black">
              <option value="">Select Academic Year</option>
              {/* @ts-ignore */}
              {academicSetupData?.academicYears?.map((y: any) => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Term / Semester</label>
            <select name="termId" required className="w-full border rounded p-2 text-sm bg-white text-black">
              <option value="">Select Term</option>
              {/* @ts-ignore */}
              {academicSetupData?.terms?.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Exam Type</label>
            <select name="examType" required className="w-full border rounded p-2 text-sm bg-white text-black">
              <option value="OPENER">Opener Exam</option>
              <option value="MIDTERM">Midterm</option>
              <option value="ENDTERM">End of Term</option>
              <option value="MOCK">Mock Exam</option>
              <option value="CAT">Continuous Assessment</option>
              <option value="PROJECT">Project Work</option>
            </select>
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Exam Series
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
