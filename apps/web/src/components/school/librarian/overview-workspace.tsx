"use client";
import { RecordTable } from "@/components/ui/record-table";
import { useState } from "react";
import { LayoutDashboard, BookOpen, Users, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type RecentActivity = {
  id: string;
  action: string;
  student_name: string;
  book_title: string;
  date: string;
  status: string;
};

type LibrarianOverviewData = {
  metrics: {
    total_books: number;
    books_issued: number;
    overdue_count: number;
    active_borrowers: number;
    fines_pending: number;
    books_available: number;
  };
  recent_activity: RecentActivity[];
};

export function OverviewWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<LibrarianOverviewData>('/admin-command/librarian/overview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const metrics = data?.metrics;
  const activity = data?.recent_activity || [];

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

  const getActivityTone = (status: string): Tone => {
    if (status === "Returned") return "success";
    if (status === "Issued") return "info";
    if (status === "Overdue") return "danger";
    if (status === "Fine Created") return "warning";
    return "neutral";
  };

  return (
    <Panel
      title="Library Overview"
      description="Today's library status, recent activity, and key metrics."
      icon={LayoutDashboard}
      actions={
        <button
          disabled={isRefreshing}
          onClick={handleRefresh}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition disabled:opacity-50"
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      }
    >
      {/* Metrics grid */}
      <div className="app-metric-grid grid gap-4 md:grid-cols-3 lg:grid-cols-6 mb-6">
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted"><BookOpen className="w-4 h-4" /> Total Books</div>
          <div className="mt-2 text-2xl font-black text-foreground">{isLoading ? "..." : metrics?.total_books ?? 0}</div>
        </div>
        <div className="rounded-xl border border-success-border bg-success-soft p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-success"><TrendingUp className="w-4 h-4" /> Available</div>
          <div className="mt-2 text-2xl font-black text-success">{isLoading ? "..." : metrics?.books_available ?? 0}</div>
        </div>
        <div className="rounded-xl border border-info-border bg-info-soft p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-info"><BookOpen className="w-4 h-4" /> Issued</div>
          <div className="mt-2 text-2xl font-black text-info">{isLoading ? "..." : metrics?.books_issued ?? 0}</div>
        </div>
        <div className="rounded-xl border border-danger-border bg-danger-soft p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-danger"><Clock className="w-4 h-4" /> Overdue</div>
          <div className="mt-2 text-2xl font-black text-danger">{isLoading ? "..." : metrics?.overdue_count ?? 0}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted"><Users className="w-4 h-4" /> Borrowers</div>
          <div className="mt-2 text-2xl font-black text-foreground">{isLoading ? "..." : metrics?.active_borrowers ?? 0}</div>
        </div>
        <div className="rounded-xl border border-warning-border bg-warning-soft p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-warning"><AlertTriangle className="w-4 h-4" /> Fines Pending</div>
          <div className="mt-2 text-2xl font-black text-warning">{isLoading ? "..." : metrics?.fines_pending ?? 0}</div>
        </div>
      </div>

      {/* Recent activity table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <RecordTable className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-border">Action</th>
              <th className="px-4 py-3 font-bold border-b border-border">Student</th>
              <th className="px-4 py-3 font-bold border-b border-border">Book</th>
              <th className="px-4 py-3 font-bold border-b border-border">Date</th>
              <th className="px-4 py-3 font-bold border-b border-border">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">Loading recent activity...</td></tr>
            ) : activity.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">No recent library activity. Issue or return a book to see activity here.</td></tr>
            ) : (
              activity.map((item) => (
                <tr key={item.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3 font-semibold text-foreground">{item.action}</td>
                  <td className="px-4 py-3 text-muted">{item.student_name}</td>
                  <td className="px-4 py-3 text-muted">{item.book_title}</td>
                  <td className="px-4 py-3 text-muted">{item.date}</td>
                  <td className="px-4 py-3"><StatusChip label={item.status} tone={getActivityTone(item.status)} /></td>
                </tr>
              ))
            )}
          </tbody>
        </RecordTable>
      </div>
    </Panel>
  );
}
