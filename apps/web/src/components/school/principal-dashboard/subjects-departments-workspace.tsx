"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { AlertCircle, BookOpen, Users2, Plus, Loader2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { usePermissions } from "@/components/providers/permission-context";

type PrincipalSubjectsData = {
  status: "active" | "degraded" | "setup_required";
  totalSubjects: number;
  coreSubjects: number;
  electiveSubjects: number;
  departments: number;
  subjectDistribution: Array<{ label: string; value: number }>;
  departmentHeads: Array<any>;
};

export function PrincipalSubjectsDepartmentsWorkspace() {
  const { data, isLoading, error, refetch } = useSchoolQuery<PrincipalSubjectsData>('/admin-command/principal/subjects');
  const { data: yearsData } = useSchoolQuery<any[]>('/academics/academic-years');
  const { data: subjectsData } = useSchoolQuery<any[]>('/academics/subjects');
  const { data: departmentsData } = useSchoolQuery<any[]>('/academics/departments');
  const { hasPermission } = usePermissions();

  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
  const [isSubmittingDept, setIsSubmittingDept] = useState(false);
  const [deptFormError, setDeptFormError] = useState("");

  const hasYears = yearsData && yearsData.length > 0;

  const handleCreateSubject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");
    const formData = new FormData(e.currentTarget);
    try {
      await requestDashboardApi('/academics/subjects', {
        method: "POST",
        body: {
          code: formData.get("code"),
          name: formData.get("name"),
        }
      });
      setIsSubjectModalOpen(false);
      refetch();
    } catch (err: any) {
      setFormError(err.message || "Failed to create subject");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveSubject = async (id: string) => {
    if (!confirm("Are you sure you want to archive this subject?")) return;
    try {
      await requestDashboardApi(`/academics/subjects/${id}`, { method: "DELETE" });
      refetch();
    } catch (err: any) {
      alert(err.message || "Failed to archive subject");
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
          <h2 className="text-xl font-bold text-red-500">Failed to load Subjects Overview</h2>
        </div>
      </Card>
    );
  }

  const handleCreateDepartment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmittingDept(true);
    setDeptFormError("");
    const formData = new FormData(e.currentTarget);
    try {
      await requestDashboardApi('/academics/departments', {
        method: "POST",
        body: {
          name: formData.get("name"),
          head_of_department_user_id: formData.get("head_of_department_user_id") || null,
        }
      });
      setIsDepartmentModalOpen(false);
      refetch();
    } catch (err: any) {
      setDeptFormError(err.message || "Failed to create department");
    } finally {
      setIsSubmittingDept(false);
    }
  };

  const handleArchiveDepartment = async (id: string) => {
    if (!confirm("Are you sure you want to archive this department?")) return;
    try {
      await requestDashboardApi(`/academics/departments/${id}`, { method: "DELETE" });
      refetch();
    } catch (err: any) {
      alert(err.message || "Failed to archive department");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        {hasPermission('academics:write') && (
          <Button 
            variant="outline" 
            onClick={() => setIsSubjectModalOpen(true)}
            disabled={!hasYears}
            title={!hasYears ? "Cannot create subjects before an academic year is configured" : ""}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Subject
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Total Departments</div>
          <div className="mt-2 text-2xl font-black text-white">{data.departments}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Total Subjects</div>
          <div className="mt-2 text-2xl font-black text-white">{data.totalSubjects}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Core Subjects</div>
          <div className="mt-2 text-2xl font-black text-blue-400">{data.coreSubjects}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Elective Subjects</div>
          <div className="mt-2 text-2xl font-black text-green-400">{data.electiveSubjects}</div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full">
          <h2 className="text-xl font-bold text-white mb-6">Subject Distribution</h2>
          <div className="flex-1 flex items-end gap-2 mt-4 min-h-[200px]">
            {(!data.subjectDistribution || data.subjectDistribution.length === 0) ? (
              <div className="flex flex-col items-center justify-center flex-1 py-8 text-center bg-white/5 rounded-lg border border-white/5 w-full">
                <BookOpen className="h-10 w-10 text-white/20 mb-3" />
                <p className="text-white/60">No subjects found</p>
                <p className="text-xs text-white/40 mt-1">Create subjects to see distribution</p>
              </div>
            ) : (
              data.subjectDistribution.map((item) => (
                <div key={item.label} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="w-full relative bg-white/5 rounded-t-sm" style={{ height: "150px" }}>
                    <div 
                      className="absolute bottom-0 w-full bg-orange-500/50 rounded-t-sm transition-all duration-500 group-hover:bg-orange-400/60"
                      style={{ height: `${Math.min((item.value / 10) * 100, 100)}%` }}
                    >
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.value}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-white/50">{item.label}</span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Subjects</h2>
          </div>
          
          {!subjectsData || subjectsData.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-center bg-white/5 rounded-lg border border-white/5">
              <BookOpen className="h-10 w-10 text-white/20 mb-3" />
              <p className="text-white/60">No subjects configured</p>
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto pr-2">
              {subjectsData.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <div>
                    <div className="font-medium text-white">{s.name}</div>
                    <div className="text-xs text-white/50">Code: {s.code}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-red-400 border-red-500/20 hover:bg-red-500/20" onClick={() => handleArchiveSubject(s.id)}>
                      Archive
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mt-6">
        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Departments</h2>
            {hasPermission('academics:write') && (
              <Button size="sm" variant="outline" onClick={() => setIsDepartmentModalOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Department
              </Button>
            )}
          </div>
          
          {!departmentsData || departmentsData.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-center bg-white/5 rounded-lg border border-white/5">
              <Users2 className="h-10 w-10 text-white/20 mb-3" />
              <p className="text-white/60">No departments configured</p>
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto pr-2">
              {departmentsData.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <div>
                    <div className="font-medium text-white">{d.name}</div>
                    <div className="text-xs text-white/50">{d.head_of_department_user_id ? "Has HOD" : "No HOD assigned"}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-red-400 border-red-500/20 hover:bg-red-500/20" onClick={() => handleArchiveDepartment(d.id)}>
                      Archive
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal open={isSubjectModalOpen} onClose={() => setIsSubjectModalOpen(false)} title="Create Subject">
        <form onSubmit={handleCreateSubject} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-sm">
              {formError}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Subject Code</label>
            <input name="code" required className="w-full border rounded p-2 text-sm" placeholder="e.g. MAT, ENG, SCI" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Subject Name</label>
            <input name="name" required className="w-full border rounded p-2 text-sm" placeholder="e.g. Mathematics" />
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Subject
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={isDepartmentModalOpen} onClose={() => setIsDepartmentModalOpen(false)} title="Create Department">
        <form onSubmit={handleCreateDepartment} className="space-y-4">
          {deptFormError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-sm">
              {deptFormError}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Department Name</label>
            <input name="name" required className="w-full border rounded p-2 text-sm" placeholder="e.g. Languages, Sciences" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">HOD User ID (Optional UUID)</label>
            <input name="head_of_department_user_id" className="w-full border rounded p-2 text-sm" placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000" />
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={isSubmittingDept}>
              {isSubmittingDept && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Department
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
