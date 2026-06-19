"use client";
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
          className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition disabled:opacity-50"
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      }
    >
      {/* Metrics grid */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#64748B]"><BookOpen className="w-4 h-4" /> Total Books</div>
          <div className="mt-2 text-2xl font-black text-[#071D49]">{isLoading ? "..." : metrics?.total_books ?? 0}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><TrendingUp className="w-4 h-4" /> Available</div>
          <div className="mt-2 text-2xl font-black text-emerald-700">{isLoading ? "..." : metrics?.books_available ?? 0}</div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-700"><BookOpen className="w-4 h-4" /> Issued</div>
          <div className="mt-2 text-2xl font-black text-blue-700">{isLoading ? "..." : metrics?.books_issued ?? 0}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-rose-700"><Clock className="w-4 h-4" /> Overdue</div>
          <div className="mt-2 text-2xl font-black text-rose-700">{isLoading ? "..." : metrics?.overdue_count ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#64748B]"><Users className="w-4 h-4" /> Borrowers</div>
          <div className="mt-2 text-2xl font-black text-[#071D49]">{isLoading ? "..." : metrics?.active_borrowers ?? 0}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-700"><AlertTriangle className="w-4 h-4" /> Fines Pending</div>
          <div className="mt-2 text-2xl font-black text-amber-700">{isLoading ? "..." : metrics?.fines_pending ?? 0}</div>
        </div>
      </div>

      {/* Recent activity table */}
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Action</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Student</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Book</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Date</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">Loading recent activity...</td></tr>
            ) : activity.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">No recent library activity. Issue or return a book to see activity here.</td></tr>
            ) : (
              activity.map((item) => (
                <tr key={item.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{item.action}</td>
                  <td className="px-4 py-3 text-[#64748B]">{item.student_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{item.book_title}</td>
                  <td className="px-4 py-3 text-[#64748B]">{item.date}</td>
                  <td className="px-4 py-3"><StatusChip label={item.status} tone={getActivityTone(item.status)} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
