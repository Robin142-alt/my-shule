"use client";
import { useState } from "react";
import { PenLine, Lock } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { lockMarksEntry } from "./api-client";

type MarksEntryRecord = {
  id: string;
  exam_name: string;
  subject: string;
  class_name: string;
  teacher: string;
  total_students: number;
  entered: number;
  missing: number;
  status: string;
  deadline: string;
};

type MarksEntryData = {
  metrics: {
    total_entries: number;
    completed: number;
    pending: number;
    overdue: number;
    completion_rate: number;
  };
  entries: MarksEntryRecord[];
};

export function MarksEntryWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<MarksEntryData>('/admin-command/exams-manager/marks-entry');
  const [lockingId, setLockingId] = useState<string | null>(null);

  const entries = data?.entries || [];

  const getStatusTone = (st: string): Tone => {
    switch (st?.toLowerCase()) {
      case "completed": return "success";
      case "in_progress": return "info";
      case "pending": return "neutral";
      case "overdue": return "danger";
      case "locked": return "warning";
      default: return "neutral";
    }
  };

  const handleLock = async (id: string) => {
    setLockingId(id);
    try {
      await lockMarksEntry(id);
      toast.success("Marks entry locked successfully.");
      refetch();
    } catch {
      toast.error("Failed to lock marks entry.");
    } finally {
      setLockingId(null);
    }
  };

  return (
    <Panel title="Marks Entry" description="Monitor and manage marks submission by teachers across all subjects." icon={PenLine}>
      <div className="grid gap-4 md:grid-cols-5 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total Entries</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.total_entries ?? 0}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-semibold text-emerald-700">Completed</div>
          <div className="mt-1 text-2xl font-black text-emerald-700">{isLoading ? "..." : data?.metrics?.completed ?? 0}</div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="text-sm font-semibold text-blue-700">Pending</div>
          <div className="mt-1 text-2xl font-black text-blue-700">{isLoading ? "..." : data?.metrics?.pending ?? 0}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-sm font-semibold text-rose-700">Overdue</div>
          <div className="mt-1 text-2xl font-black text-rose-700">{isLoading ? "..." : data?.metrics?.overdue ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Completion Rate</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">{isLoading ? "..." : `${data?.metrics?.completion_rate ?? 0}%`}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Exam</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Subject</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Class</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Teacher</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Progress</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Missing</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Deadline</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-[#64748B]">Loading marks entry data...</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-[#64748B]">No marks entries found. Set up an exam and assign subjects to teachers first.</td></tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{entry.exam_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{entry.subject}</td>
                  <td className="px-4 py-3 text-[#64748B]">{entry.class_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{entry.teacher}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold">{entry.entered}/{entry.total_students}</span>
                  </td>
                  <td className="px-4 py-3 text-rose-600 font-bold">{entry.missing}</td>
                  <td className="px-4 py-3 text-[#64748B]">{entry.deadline}</td>
                  <td className="px-4 py-3"><StatusChip label={entry.status} tone={getStatusTone(entry.status)} /></td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleLock(entry.id)}
                      disabled={lockingId === entry.id || entry.status === "Locked"}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:underline disabled:opacity-50"
                    >
                      <Lock className="w-3 h-3" /> {lockingId === entry.id ? "Locking..." : "Lock"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
