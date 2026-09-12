"use client";

import { WorkspaceRetry } from "@/components/school/workspace-retry";

import { Card } from "@/components/ui/card";
import { AlertCircle, CalendarClock, UserX, UserMinus } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Loader2 } from "lucide-react";
import { usePermissions } from "@/components/providers/permission-context";
import { useVerifiedPrincipalDashboardApi } from "./verified-tenant-api";

type PrincipalAttendanceData = {
  status: "active" | "degraded" | "setup_required";
  present: number;
  absent: number;
  late: number;
  chronicAbsenteeism: number;
  attendanceTrend: Array<{ label: string; value: number }>;
  recentAbsences: Array<{ id: string; student_name: string; admission_number: string | null; date: string; status: string; reason: string | null }>;
  students: Array<{ id: string; name: string; admission_number: string | null; class: string }>;
};

export function PrincipalAttendanceWorkspace() {
  const { data, isLoading, error, refetch } = useSchoolQuery<PrincipalAttendanceData>('/admin-command/principal/attendance');
  const requestPrincipalApi = useVerifiedPrincipalDashboardApi();
  const { hasPermission } = usePermissions();
  
  const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const handleLogAbsence = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");
    const formData = new FormData(e.currentTarget);
    
    try {
      await requestPrincipalApi('/admin-command/attendance/absences', {
        method: "POST",
        body: {
          studentId: formData.get("studentId"),
          date: formData.get("date"),
          reason: formData.get("reason"),
          isExcused: formData.get("isExcused") === "on",
        }
      });
      setIsAbsenceModalOpen(false);
      refetch();
    } catch (err: any) {
      setFormError(err.message || "Failed to log absence");
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
          <h2 className="text-xl font-bold text-red-500">Failed to load Attendance Overview</h2>
        </div>
        <WorkspaceRetry onRetry={() => refetch()} />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Present Today</div>
          <div className="mt-2 text-2xl font-black text-green-500">{data.present}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Absent Today</div>
          <div className="mt-2 text-2xl font-black text-red-500">{data.absent}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Late Arrivals</div>
          <div className="mt-2 text-2xl font-black text-orange-500">{data.late}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Chronic Absenteeism</div>
          <div className="mt-2 text-2xl font-black text-white">{data.chronicAbsenteeism}%</div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full">
          <h2 className="text-xl font-bold text-white mb-6">Weekly Attendance Rate</h2>
          <div className="flex-1 flex items-end gap-2 mt-4 min-h-[200px]">
            {data.attendanceTrend?.map((item) => (
              <div key={item.label} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="w-full relative bg-white/5 rounded-t-sm" style={{ height: "150px" }}>
                  <div 
                    className="absolute bottom-0 w-full bg-green-500/50 rounded-t-sm transition-all duration-500 group-hover:bg-green-400/60"
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
            <h2 className="text-xl font-bold text-white">Recent Absences</h2>
            {hasPermission('attendance:write') && (
              <Button size="sm" variant="outline" className="text-xs bg-red-500/20 text-red-400 px-3 py-1.5 rounded hover:bg-red-500/30 transition-colors flex items-center gap-1" onClick={() => setIsAbsenceModalOpen(true)}>
                <UserMinus className="h-3 w-3 mr-1" />
                Log Absence
              </Button>
            )}
          </div>
          
          {(!data.recentAbsences || data.recentAbsences.length === 0) ? (
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-center bg-white/5 rounded-lg border border-white/5">
              <UserMinus className="h-10 w-10 text-white/20 mb-3" />
              <p className="text-white/60 mb-4">No recent absences reported</p>
              {hasPermission('attendance:write') && (
                <Button size="sm" variant="outline" onClick={() => setIsAbsenceModalOpen(true)}>
                  <UserMinus className="h-4 w-4 mr-2" /> Log Absence
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto pr-2">
              {data.recentAbsences.map((absence) => (
                <div key={absence.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-medium text-white">{absence.student_name}</h4>
                      <p className="text-sm text-white/60">
                        {absence.admission_number || "No admission number"} - {absence.date}
                      </p>
                      {absence.reason && <p className="mt-1 text-xs text-white/50">{absence.reason}</p>}
                    </div>
                    <span className="rounded-full bg-red-500/15 px-2 py-1 text-xs font-semibold capitalize text-red-300">
                      {absence.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal open={isAbsenceModalOpen} onClose={() => setIsAbsenceModalOpen(false)} title="Log Absence">
        <form onSubmit={handleLogAbsence} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-sm">
              {formError}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Student</label>
            <select name="studentId" required className="w-full border rounded p-2 text-sm bg-white text-black">
              <option value="">Select a student...</option>
              {data.students?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.admission_number ? `(${s.admission_number})` : ""} - {s.class}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Date</label>
            <input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full border rounded p-2 text-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason</label>
            <textarea name="reason" required rows={3} className="w-full border rounded p-2 text-sm" placeholder="Why is the student absent?" />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="isExcused" className="rounded" />
            <span className="text-sm">Excused Absence</span>
          </label>
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Record
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
