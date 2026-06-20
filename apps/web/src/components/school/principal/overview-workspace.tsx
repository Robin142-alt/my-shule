"use client";
import { useState } from "react";
import { LayoutDashboard, Users, GraduationCap, DollarSign, UserCheck, ClipboardCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, MetricCard, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type AlertItem = {
  id: string;
  title: string;
  category: string;
  severity: string;
  timestamp: string;
  status: string;
};

type OverviewData = {
  metrics: {
    total_students: number;
    total_staff: number;
    attendance_rate: number;
    fee_collection_rate: number;
    pending_approvals: number;
    open_discipline_cases: number;
  };
  alerts: AlertItem[];
};

export function OverviewWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<OverviewData>('/admin-command/principal/overview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const metrics = data?.metrics;
  const alerts = data?.alerts || [];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success("Dashboard refreshed.");
    } catch {
      toast.error("Failed to refresh dashboard.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const getSeverityTone = (severity: string): Tone => {
    switch (severity?.toLowerCase()) {
      case "critical": return "danger";
      case "high": return "danger";
      case "medium": return "warning";
      case "low": return "info";
      default: return "neutral";
    }
  };

  const getStatusTone = (status: string): Tone => {
    switch (status?.toLowerCase()) {
      case "resolved": return "success";
      case "in_progress": case "in progress": return "info";
      case "pending": return "warning";
      case "open": return "danger";
      default: return "neutral";
    }
  };

  return (
    <Panel
      title="Principal Overview"
      description="School-wide snapshot — key metrics, alerts, and items requiring your attention."
      icon={LayoutDashboard}
      actions={
        <button disabled={isRefreshing} onClick={handleRefresh} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition disabled:opacity-50">
          {isRefreshing ? "Refreshing…" : "Refresh"}
        </button>
      }
    >
      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6 mb-6">
        <MetricCard label="Total Students" value={isLoading ? "…" : metrics?.total_students ?? 0} icon={GraduationCap} />
        <MetricCard label="Total Staff" value={isLoading ? "…" : metrics?.total_staff ?? 0} icon={Users} />
        <MetricCard label="Attendance Rate" value={isLoading ? "…" : `${metrics?.attendance_rate ?? 0}%`} icon={UserCheck} tone={(metrics?.attendance_rate ?? 100) < 80 ? "danger" : "success"} />
        <MetricCard label="Fee Collection" value={isLoading ? "…" : `${metrics?.fee_collection_rate ?? 0}%`} icon={DollarSign} tone={(metrics?.fee_collection_rate ?? 100) < 70 ? "warning" : "success"} />
        <MetricCard label="Pending Approvals" value={isLoading ? "…" : metrics?.pending_approvals ?? 0} icon={ClipboardCheck} tone={(metrics?.pending_approvals ?? 0) > 0 ? "warning" : "success"} />
        <MetricCard label="Discipline Cases" value={isLoading ? "…" : metrics?.open_discipline_cases ?? 0} icon={ShieldAlert} tone={(metrics?.open_discipline_cases ?? 0) > 0 ? "danger" : "success"} />
      </div>

      {/* Alerts Table */}
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Severity</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Alert</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Category</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Time</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">Loading school overview…</td></tr>
            ) : alerts.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">No active alerts. Your school is running smoothly.</td></tr>
            ) : (
              alerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3"><StatusChip label={alert.severity} tone={getSeverityTone(alert.severity)} /></td>
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{alert.title}</td>
                  <td className="px-4 py-3 text-[#64748B]">{alert.category}</td>
                  <td className="px-4 py-3 text-[#64748B]">{alert.timestamp}</td>
                  <td className="px-4 py-3"><StatusChip label={alert.status} tone={getStatusTone(alert.status)} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
