"use client";
import { useState } from "react";
import { Calendar, Plus } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { createTimetableSlot } from "./api-client";

type TimetableSlot = {
  id: string;
  exam_name: string;
  subject: string;
  class_name: string;
  date: string;
  start_time: string;
  end_time: string;
  venue: string;
  invigilator: string;
  status: string;
};

type TimetableData = {
  metrics: {
    total_slots: number;
    scheduled: number;
    in_progress: number;
    completed: number;
  };
  slots: TimetableSlot[];
};

export function ExamTimetableWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<TimetableData>('/admin-command/exams-manager/exam-timetable');
  const [isCreating, setIsCreating] = useState(false);

  const slots = data?.slots || [];

  const getStatusTone = (st: string): Tone => {
    switch (st?.toLowerCase()) {
      case "scheduled": return "info";
      case "in_progress": return "warning";
      case "completed": return "success";
      case "cancelled": return "danger";
      default: return "neutral";
    }
  };

  const handleAddSlot = async () => {
    setIsCreating(true);
    try {
      await createTimetableSlot({});
      toast.success("Timetable slot added.");
      refetch();
    } catch {
      toast.error("Failed to add timetable slot.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Panel
      title="Exam Timetable"
      description="Schedule examination dates, venues, and assign invigilators."
      icon={Calendar}
      actions={
        <button onClick={handleAddSlot} disabled={isCreating} className="inline-flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition disabled:opacity-50">
          <Plus className="w-4 h-4" /> {isCreating ? "Adding..." : "Add Slot"}
        </button>
      }
    >
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total Slots</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.total_slots ?? 0}</div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="text-sm font-semibold text-blue-700">Scheduled</div>
          <div className="mt-1 text-2xl font-black text-blue-700">{isLoading ? "..." : data?.metrics?.scheduled ?? 0}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-semibold text-amber-700">In Progress</div>
          <div className="mt-1 text-2xl font-black text-amber-700">{isLoading ? "..." : data?.metrics?.in_progress ?? 0}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-semibold text-emerald-700">Completed</div>
          <div className="mt-1 text-2xl font-black text-emerald-700">{isLoading ? "..." : data?.metrics?.completed ?? 0}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Exam</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Subject</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Class</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Date</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Time</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Venue</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Invigilator</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">Loading timetable...</td></tr>
            ) : slots.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">No timetable slots created. Click &quot;Add Slot&quot; to schedule the first exam session.</td></tr>
            ) : (
              slots.map((slot) => (
                <tr key={slot.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{slot.exam_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{slot.subject}</td>
                  <td className="px-4 py-3 text-[#64748B]">{slot.class_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{slot.date}</td>
                  <td className="px-4 py-3 text-[#64748B]">{slot.start_time} – {slot.end_time}</td>
                  <td className="px-4 py-3 text-[#64748B]">{slot.venue}</td>
                  <td className="px-4 py-3 text-[#64748B]">{slot.invigilator}</td>
                  <td className="px-4 py-3"><StatusChip label={slot.status} tone={getStatusTone(slot.status)} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
