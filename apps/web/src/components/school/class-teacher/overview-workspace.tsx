"use client";
import { useState } from "react";
import { LayoutDashboard, Users, UserX, BookOpen, AlertTriangle, Heart } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type AlertItem = {
  id: string;
  type: string;
  student_name: string;
  message: string;
  severity: string;
  created_at: string;
};

type OverviewData = {
  metrics: {
    total_students: number;
    present_today: number;
    absent_today: number;
    pending_discipline: number;
    welfare_flags: number;
    mean_grade: string;
  };
  alerts: AlertItem[];
};

export function OverviewWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<OverviewData>('/admin-command/class-teacher/overview');

  const metrics = data?.metrics;
  const alerts = data?.alerts || [];

  const getSeverityTone = (s: string): Tone => {
    if (s === "critical" || s === "high") return "danger";
    if (s === "medium") return "warning";
    if (s === "low") return "info";
    return "neutral";
  };

  return (
    <Panel title="Class Overview" description="Today's snapshot of your class — attendance, academics, and alerts." icon={LayoutDashboard}>
      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6 mb-6">
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted"><Users className="w-4 h-4" /> Total Students</div>
          <div className="mt-2 text-2xl font-black text-foreground">{isLoading ? "..." : metrics?.total_students ?? 0}</div>
        </div>
        <div className="rounded-xl border border-success-border bg-success-soft p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-success"><Users className="w-4 h-4" /> Present</div>
          <div className="mt-2 text-2xl font-black text-success">{isLoading ? "..." : metrics?.present_today ?? 0}</div>
        </div>
        <div className="rounded-xl border border-danger-border bg-danger-soft p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-danger"><UserX className="w-4 h-4" /> Absent</div>
          <div className="mt-2 text-2xl font-black text-danger">{isLoading ? "..." : metrics?.absent_today ?? 0}</div>
        </div>
        <div className="rounded-xl border border-warning-border bg-warning-soft p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-warning"><AlertTriangle className="w-4 h-4" /> Discipline</div>
          <div className="mt-2 text-2xl font-black text-warning">{isLoading ? "..." : metrics?.pending_discipline ?? 0}</div>
        </div>
        <div className="rounded-xl border border-info-border bg-info-soft p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-info"><Heart className="w-4 h-4" /> Welfare</div>
          <div className="mt-2 text-2xl font-black text-info">{isLoading ? "..." : metrics?.welfare_flags ?? 0}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted"><BookOpen className="w-4 h-4" /> Mean Grade</div>
          <div className="mt-2 text-2xl font-black text-foreground">{isLoading ? "..." : metrics?.mean_grade ?? "—"}</div>
        </div>
      </div>

      {/* Alerts table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-border">Severity</th>
              <th className="px-4 py-3 font-bold border-b border-border">Type</th>
              <th className="px-4 py-3 font-bold border-b border-border">Student</th>
              <th className="px-4 py-3 font-bold border-b border-border">Message</th>
              <th className="px-4 py-3 font-bold border-b border-border">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">Loading alerts...</td></tr>
            ) : alerts.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">No active alerts. Your class is running smoothly today.</td></tr>
            ) : (
              alerts.map((a) => (
                <tr key={a.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3"><StatusChip label={a.severity} tone={getSeverityTone(a.severity)} /></td>
                  <td className="px-4 py-3 font-medium text-foreground capitalize">{a.type}</td>
                  <td className="px-4 py-3 text-muted">{a.student_name}</td>
                  <td className="px-4 py-3 text-muted max-w-xs truncate">{a.message}</td>
                  <td className="px-4 py-3 text-muted">{a.created_at}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
