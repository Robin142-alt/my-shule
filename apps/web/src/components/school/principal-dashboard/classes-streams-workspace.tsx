"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { AlertCircle, LayoutDashboard, Settings2, Plus, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/components/providers/permission-context";
import { useVerifiedPrincipalDashboardApi } from "./verified-tenant-api";

type PrincipalClassesData = {
  status: "active" | "degraded" | "setup_required";
  totalClasses: number;
  totalStreams: number;
  averageClassSize: number;
  capacityUtilization: number;
  classDistribution: Array<{ label: string; value: number }>;
  recentAdjustments: Array<any>;
};

export function PrincipalClassesStreamsWorkspace() {
  const { data, isLoading, error, refetch: refetchOverview } = useSchoolQuery<PrincipalClassesData>('/admin-command/principal/classes');
  const requestPrincipalApi = useVerifiedPrincipalDashboardApi();
  const { data: yearsData } = useSchoolQuery<any[]>('/academics/academic-years');
  const { data: classesData, refetch: refetchClassSections } = useSchoolQuery<any[]>('/academics/class-sections');
  const { hasPermission } = usePermissions();

  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isStreamModalOpen, setIsStreamModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const hasYears = yearsData && yearsData.length > 0;
  const hasClasses = classesData && classesData.length > 0;

  const handleCreateClass = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");
    const formData = new FormData(e.currentTarget);
    try {
      await requestPrincipalApi('/academics/class-sections', {
        method: "POST",
        body: {
          academic_year_id: formData.get("academic_year_id"),
          name: formData.get("name"),
          grade_level: formData.get("grade_level"),
          capacity: formData.get("capacity") ? Number(formData.get("capacity")) : undefined,
        }
      });
      setIsClassModalOpen(false);
      await Promise.all([refetchOverview(), refetchClassSections()]);
    } catch (err: any) {
      setFormError(err.message || "Failed to create class section");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateStream = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");
    const formData = new FormData(e.currentTarget);
    try {
      await requestPrincipalApi('/academics/class-streams', {
        method: "POST",
        body: {
          class_section_id: formData.get("class_section_id"),
          name: formData.get("name"),
          capacity: formData.get("capacity") ? Number(formData.get("capacity")) : undefined,
        }
      });
      setIsStreamModalOpen(false);
      await Promise.all([refetchOverview(), refetchClassSections()]);
    } catch (err: any) {
      setFormError(err.message || "Failed to create stream");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveClass = async (id: string) => {
    if (!confirm("Are you sure you want to archive this class?")) return;
    try {
      await requestPrincipalApi(`/academics/class-sections/${id}`, { method: "DELETE" });
      await Promise.all([refetchOverview(), refetchClassSections()]);
    } catch (err: any) {
      toast.error(err.message || "Failed to archive class");
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
          <h2 className="text-xl font-bold text-red-500">Failed to load Classes Overview</h2>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        {hasPermission('academics:write') && (
          <>
            <Button 
              variant="outline" 
              onClick={() => setIsClassModalOpen(true)}
              disabled={!hasYears}
              title={!hasYears ? "Cannot create a class before an academic year exists" : ""}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Class Section
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsStreamModalOpen(true)}
              disabled={!hasClasses}
              title={!hasClasses ? "Cannot create a stream before a class section exists" : ""}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Stream
            </Button>
          </>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Total Streams</div>
          <div className="mt-2 text-2xl font-black text-white">{data.totalStreams}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Total Classes</div>
          <div className="mt-2 text-2xl font-black text-white">{data.totalClasses}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Average Size</div>
          <div className="mt-2 text-2xl font-black text-white">{data.averageClassSize} students</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Capacity Utilization</div>
          <div className="mt-2 text-2xl font-black text-blue-400">{data.capacityUtilization}%</div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full">
          <h2 className="text-xl font-bold text-white mb-6">Population Distribution</h2>
          <div className="flex-1 flex items-end gap-2 mt-4 min-h-[200px]">
            {(!data.classDistribution || data.classDistribution.length === 0) ? (
              <div className="flex flex-col items-center justify-center flex-1 py-8 text-center bg-white/5 rounded-lg border border-white/5 w-full">
                <Users className="h-10 w-10 text-white/20 mb-3" />
                <p className="text-white/60 mb-1">No classes found</p>
                <p className="text-xs text-white/40 mb-4">Create a class section to see distribution</p>
                {hasPermission('academics:write') && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsClassModalOpen(true)}
                    disabled={!hasYears}
                    title={!hasYears ? "Cannot create a class before an academic year exists" : ""}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Class
                  </Button>
                )}
              </div>
            ) : (
              data.classDistribution.map((item) => (
                <div key={item.label} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="w-full relative bg-white/5 rounded-t-sm" style={{ height: "150px" }}>
                    <div 
                      className="absolute bottom-0 w-full bg-indigo-500/50 rounded-t-sm transition-all duration-500 group-hover:bg-indigo-400/60"
                      style={{ height: `${Math.min((item.value / 400) * 100, 100)}%` }}
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
            <h2 className="text-xl font-bold text-white">Class Sections</h2>
          </div>
          
          {!classesData || classesData.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-center bg-white/5 rounded-lg border border-white/5">
              <LayoutDashboard className="h-10 w-10 text-white/20 mb-3" />
              <p className="text-white/60 mb-4">No classes configured</p>
              {hasPermission('academics:write') && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsClassModalOpen(true)}
                  disabled={!hasYears}
                  title={!hasYears ? "Cannot create a class before an academic year exists" : ""}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Class Section
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto pr-2">
              {classesData.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <div>
                    <div className="font-medium text-white">{c.name}</div>
                    <div className="text-xs text-white/50">Capacity: {c.capacity || 'N/A'}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-red-400 border-red-500/20 hover:bg-red-500/20" onClick={() => handleArchiveClass(c.id)}>
                      Archive
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal open={isClassModalOpen} onClose={() => setIsClassModalOpen(false)} title="Create Class Section">
        <form onSubmit={handleCreateClass} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-sm">
              {formError}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Academic Year</label>
            <select name="academic_year_id" required className="input-base">
              <option value="">Select Academic Year...</option>
              {yearsData?.map(year => (
                <option key={year.id} value={year.id}>{year.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Class Name</label>
              <input name="name" required className="input-base" placeholder="e.g. Form 1" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Grade Level</label>
              <input name="grade_level" required className="input-base" placeholder="e.g. 9" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Capacity</label>
            <input type="number" name="capacity" required className="input-base" defaultValue={40} />
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Class
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={isStreamModalOpen} onClose={() => setIsStreamModalOpen(false)} title="Create Stream">
        <form onSubmit={handleCreateStream} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-sm">
              {formError}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Class Section</label>
            <select name="class_section_id" required className="input-base">
              <option value="">Select Class Section...</option>
              {classesData?.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Stream Name</label>
            <input name="name" required className="input-base" placeholder="e.g. Red, North, A" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Capacity</label>
            <input type="number" name="capacity" required className="input-base" defaultValue={40} />
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Stream
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
