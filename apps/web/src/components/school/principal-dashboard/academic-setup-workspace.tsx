"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { AlertCircle, GraduationCap, Calendar, Settings, Plus, Loader2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

type AcademicSetupData = {
  status: "active" | "degraded" | "setup_required";
  activeTerm: string;
  weeksRemaining: number;
  gradingsConfigured: boolean;
  subjectsRegistered: number;
  teachersAssigned: number;
  pendingConfigurations: number;
  recentChanges: Array<{ title: string; time: string }>;
};

export function PrincipalAcademicSetupWorkspace() {
  const { data, isLoading, error, refetch } = useSchoolQuery<AcademicSetupData>('/admin-command/principal/academic-setup');
  const { data: yearsData } = useSchoolQuery<any[]>('/academics/academic-years');

  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [isTermModalOpen, setIsTermModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const hasYears = yearsData && yearsData.length > 0;

  const handleCreateYear = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");
    const formData = new FormData(e.currentTarget);
    try {
      await requestDashboardApi('/academics/years', {
        method: "POST",
        body: {
          name: formData.get("name"),
          starts_on: formData.get("starts_on"),
          ends_on: formData.get("ends_on"),
        }
      });
      setIsYearModalOpen(false);
      refetch();
    } catch (err: any) {
      setFormError(err.message || "Failed to create academic year");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTerm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");
    const formData = new FormData(e.currentTarget);
    try {
      await requestDashboardApi('/academics/terms', {
        method: "POST",
        body: {
          academic_year_id: formData.get("academic_year_id"),
          name: formData.get("name"),
          starts_on: formData.get("starts_on"),
          ends_on: formData.get("ends_on"),
        }
      });
      setIsTermModalOpen(false);
      refetch();
    } catch (err: any) {
      setFormError(err.message || "Failed to create academic term");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveYear = async (id: string) => {
    if (!confirm("Are you sure you want to archive this academic year?")) return;
    try {
      await requestDashboardApi(`/academics/years/${id}`, { method: "DELETE" });
      refetch();
    } catch (err: any) {
      alert(err.message || "Failed to archive year");
    }
  };

  const { data: gradingData } = useSchoolQuery<any[]>('/academics/grading-systems');
  const { data: attendanceData } = useSchoolQuery<any[]>('/academics/attendance-settings');
  const { data: reportCardData } = useSchoolQuery<any[]>('/academics/report-card-settings');

  const [isGradingModalOpen, setIsGradingModalOpen] = useState(false);
  const [isSubmittingGrading, setIsSubmittingGrading] = useState(false);
  const [gradingFormError, setGradingFormError] = useState("");

  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false);
  const [attendanceFormError, setAttendanceFormError] = useState("");

  const [isReportCardModalOpen, setIsReportCardModalOpen] = useState(false);
  const [isSubmittingReportCard, setIsSubmittingReportCard] = useState(false);
  const [reportCardFormError, setReportCardFormError] = useState("");

  const handleCreateGrading = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmittingGrading(true);
    setGradingFormError("");
    const formData = new FormData(e.currentTarget);
    try {
      await requestDashboardApi('/academics/grading-systems', {
        method: "POST",
        body: {
          name: formData.get("name"),
          description: formData.get("description"),
        }
      });
      setIsGradingModalOpen(false);
      refetch();
    } catch (err: any) {
      setGradingFormError(err.message || "Failed to create grading system");
    } finally {
      setIsSubmittingGrading(false);
    }
  };

  const handleCreateAttendance = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmittingAttendance(true);
    setAttendanceFormError("");
    const formData = new FormData(e.currentTarget);
    try {
      await requestDashboardApi('/academics/attendance-settings', {
        method: "POST",
        body: {
          name: formData.get("name"),
          description: formData.get("description"),
        }
      });
      setIsAttendanceModalOpen(false);
      refetch();
    } catch (err: any) {
      setAttendanceFormError(err.message || "Failed to create attendance setting");
    } finally {
      setIsSubmittingAttendance(false);
    }
  };

  const handleCreateReportCard = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmittingReportCard(true);
    setReportCardFormError("");
    const formData = new FormData(e.currentTarget);
    try {
      await requestDashboardApi('/academics/report-card-settings', {
        method: "POST",
        body: {
          name: formData.get("name"),
          grading_system_id: formData.get("grading_system_id") || null,
          show_rank: formData.get("show_rank") === 'on',
          show_attendance: formData.get("show_attendance") === 'on',
        }
      });
      setIsReportCardModalOpen(false);
      refetch();
    } catch (err: any) {
      setReportCardFormError(err.message || "Failed to create report card setting");
    } finally {
      setIsSubmittingReportCard(false);
    }
  };

  const handleArchiveGrading = async (id: string) => {
    if (!confirm("Are you sure you want to archive this grading system?")) return;
    try {
      await requestDashboardApi(`/academics/grading-systems/${id}`, { method: "DELETE" });
      refetch();
    } catch (err: any) {
      alert(err.message || "Failed to archive grading system");
    }
  };

  const handleArchiveAttendance = async (id: string) => {
    if (!confirm("Are you sure you want to archive this attendance setting?")) return;
    try {
      await requestDashboardApi(`/academics/attendance-settings/${id}`, { method: "DELETE" });
      refetch();
    } catch (err: any) {
      alert(err.message || "Failed to archive attendance setting");
    }
  };

  const handleArchiveReportCard = async (id: string) => {
    if (!confirm("Are you sure you want to archive this report card setting?")) return;
    try {
      await requestDashboardApi(`/academics/report-card-settings/${id}`, { method: "DELETE" });
      refetch();
    } catch (err: any) {
      alert(err.message || "Failed to archive report card setting");
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
          <h2 className="text-xl font-bold text-red-500">Failed to load Academic Setup</h2>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Active Term</div>
          <div className="mt-2 text-xl font-black text-white">{data.activeTerm}</div>
          <div className="mt-1 text-xs text-white/50">{data.weeksRemaining} weeks remaining</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Grading System</div>
          <div className="mt-2 text-xl font-black text-white">
            {data.gradingsConfigured ? "Configured" : "Pending"}
          </div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Subjects Registered</div>
          <div className="mt-2 text-2xl font-black text-white">{data.subjectsRegistered}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Teachers Assigned</div>
          <div className="mt-2 text-2xl font-black text-white">{data.teachersAssigned}</div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full min-h-[300px]">
          <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-white">Configuration Hub</h2>
          </div>
          
          <div className="space-y-3 flex-1 overflow-y-auto pr-2">
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                  <Calendar className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-bold text-white">Academic Calendar</p>
                  <p className="text-xs text-white/60">Manage years and terms</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setIsYearModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Year
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setIsTermModalOpen(true)}
                  disabled={!hasYears}
                  title={!hasYears ? "Cannot create a term before an academic year exists" : ""}
                >
                  <Plus className="h-4 w-4 mr-1" /> Term
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                  <GraduationCap className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="font-bold text-white">Grading Systems</p>
                  <p className="text-xs text-white/60">Configure grading scales and rules</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setIsGradingModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                  <Settings className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="font-bold text-white">Attendance Settings</p>
                  <p className="text-xs text-white/60">Manage attendance tracking rules</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setIsAttendanceModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full min-h-[300px]">
          <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-white">Pending Configurations</h2>
          </div>
          
          {data.pendingConfigurations === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-center bg-white/5 rounded-lg border border-white/5">
              <AlertCircle className="h-10 w-10 text-emerald-400/50 mb-3" />
              <p className="text-white/60">All academic configurations are complete.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-center bg-white/5 rounded-lg border border-rose-500/20">
              <Settings className="h-10 w-10 text-rose-400/50 mb-3" />
              <p className="text-white font-bold text-lg">{data.pendingConfigurations} actions required</p>
              <p className="text-white/60 text-sm mt-1">Check the Setup Checklist for details.</p>
            </div>
          )}
        </Card>
      </div>

      <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full mt-6">
        <h2 className="text-xl font-bold text-white mb-4">Academic Years</h2>
        {!yearsData || yearsData.length === 0 ? (
          <div className="text-white/60 text-sm py-4">No academic years configured yet.</div>
        ) : (
          <div className="space-y-2">
            {yearsData.map((year: any) => (
              <div key={year.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <div>
                  <div className="font-medium text-white">{year.name}</div>
                  <div className="text-xs text-white/50">{new Date(year.starts_on).toLocaleDateString()} - {new Date(year.ends_on).toLocaleDateString()}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-red-400 border-red-500/20 hover:bg-red-500/20" onClick={() => handleArchiveYear(year.id)}>
                    Archive
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full mt-6">
        <h2 className="text-xl font-bold text-white mb-4">Grading Systems</h2>
        {!gradingData || gradingData.length === 0 ? (
          <div className="text-white/60 text-sm py-4">No grading systems configured yet.</div>
        ) : (
          <div className="space-y-2">
            {gradingData.map((grading: any) => (
              <div key={grading.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <div>
                  <div className="font-medium text-white">{grading.name}</div>
                  <div className="text-xs text-white/50">{grading.description || 'No description'}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-red-400 border-red-500/20 hover:bg-red-500/20" onClick={() => handleArchiveGrading(grading.id)}>
                    Archive
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full mt-6">
        <h2 className="text-xl font-bold text-white mb-4">Attendance Settings</h2>
        {!attendanceData || attendanceData.length === 0 ? (
          <div className="text-white/60 text-sm py-4">No attendance settings configured yet.</div>
        ) : (
          <div className="space-y-2">
            {attendanceData.map((att: any) => (
              <div key={att.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <div>
                  <div className="font-medium text-white">{att.name}</div>
                  <div className="text-xs text-white/50">{att.description || 'No description'}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-red-400 border-red-500/20 hover:bg-red-500/20" onClick={() => handleArchiveAttendance(att.id)}>
                    Archive
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Report Card Settings</h2>
            <Button size="sm" variant="outline" onClick={() => setIsReportCardModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Profile
            </Button>
          </div>
          {!reportCardData || reportCardData.length === 0 ? (
            <div className="text-white/60 text-sm py-4 text-center">No report card settings configured yet.</div>
          ) : (
            <div className="space-y-2">
              {reportCardData.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <div>
                    <div className="font-medium text-white">{s.name}</div>
                    <div className="text-xs text-white/50">
                      Rank: {s.show_rank ? "Yes" : "No"} | Attendance: {s.show_attendance ? "Yes" : "No"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-red-400 border-red-500/20 hover:bg-red-500/20" onClick={() => handleArchiveReportCard(s.id)}>
                      Archive
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

      <Modal open={isYearModalOpen} onClose={() => setIsYearModalOpen(false)} title="Create Academic Year">
        <form onSubmit={handleCreateYear} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-sm">
              {formError}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Year Name</label>
            <input name="name" required className="w-full border rounded p-2 text-sm" placeholder="e.g. 2026 Academic Year" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Starts On</label>
              <input type="date" name="starts_on" required className="w-full border rounded p-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Ends On</label>
              <input type="date" name="ends_on" required className="w-full border rounded p-2 text-sm" />
            </div>
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Year
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={isTermModalOpen} onClose={() => setIsTermModalOpen(false)} title="Create Academic Term">
        <form onSubmit={handleCreateTerm} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-sm">
              {formError}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Academic Year</label>
            <select name="academic_year_id" required className="w-full border rounded p-2 text-sm bg-white">
              <option value="">Select Academic Year...</option>
              {yearsData?.map(year => (
                <option key={year.id} value={year.id}>{year.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Term Name</label>
            <input name="name" required className="w-full border rounded p-2 text-sm" placeholder="e.g. Term 1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Starts On</label>
              <input type="date" name="starts_on" required className="w-full border rounded p-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Ends On</label>
              <input type="date" name="ends_on" required className="w-full border rounded p-2 text-sm" />
            </div>
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Term
            </Button>
          </div>
        </form>
      </Modal>
      <Modal open={isGradingModalOpen} onClose={() => setIsGradingModalOpen(false)} title="Create Grading System">
        <form onSubmit={handleCreateGrading} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-sm">
              {formError}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <input name="name" required className="w-full border rounded p-2 text-sm" placeholder="e.g. KCSE 8-4-4 Standard" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <textarea name="description" className="w-full border rounded p-2 text-sm" placeholder="Optional details..." />
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Grading System
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={isAttendanceModalOpen} onClose={() => setIsAttendanceModalOpen(false)} title="Create Attendance Setting">
        <form onSubmit={handleCreateAttendance} className="space-y-4">
          {attendanceFormError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-sm">
              {attendanceFormError}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Setting Name</label>
            <input name="name" required className="w-full border rounded p-2 text-sm" placeholder="e.g. Standard Daily" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <textarea name="description" className="w-full border rounded p-2 text-sm" placeholder="Rules for daily attendance..." />
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={isSubmittingAttendance}>
              {isSubmittingAttendance && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Setting
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={isReportCardModalOpen} onClose={() => setIsReportCardModalOpen(false)} title="Create Report Card Profile">
        <form onSubmit={handleCreateReportCard} className="space-y-4">
          {reportCardFormError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-sm">
              {reportCardFormError}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Profile Name</label>
            <input name="name" required className="w-full border rounded p-2 text-sm" placeholder="e.g. Standard CBC Profile" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Grading System</label>
            <select name="grading_system_id" className="w-full border rounded p-2 text-sm bg-white text-black">
              <option value="">None (Raw marks only)</option>
              {gradingData?.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" name="show_rank" id="show_rank" defaultChecked className="rounded border-gray-300" />
            <label htmlFor="show_rank" className="text-sm font-medium">Show Student Rank</label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" name="show_attendance" id="show_attendance" defaultChecked className="rounded border-gray-300" />
            <label htmlFor="show_attendance" className="text-sm font-medium">Show Attendance Metrics</label>
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={isSubmittingReportCard}>
              {isSubmittingReportCard && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Profile
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
