"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Calendar, Plus } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { createTimetableSlot } from "./api-client";
import { Modal } from "@/components/ui/modal";

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

type ExamManagerOption = {
  id: string;
  label: string;
  status?: string | null;
  user_id?: string | null;
  exam_series_id?: string | null;
  subject_id?: string | null;
};

type ExamManagerOptions = {
  examSeries?: ExamManagerOption[];
  assessments?: ExamManagerOption[];
  staff?: ExamManagerOption[];
};

const emptyForm = {
  exam_series_id: "",
  assessment_id: "",
  date: "",
  start_time: "",
  end_time: "",
  room_name: "",
  staff_user_id: "",
};

export function ExamTimetableWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<TimetableData>('/admin-command/exams-manager/exam-timetable');
  const { data: options, isLoading: optionsLoading } = useSchoolQuery<ExamManagerOptions>('/admin-command/exams-manager/options');
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const slots = data?.slots || [];
  const examSeries = options?.examSeries || [];
  const assessments = options?.assessments || [];
  const staffOptions = (options?.staff || []).filter((staff) => staff.user_id);
  const availableAssessments = useMemo(
    () => assessments.filter((assessment) => !form.exam_series_id || assessment.exam_series_id === form.exam_series_id),
    [assessments, form.exam_series_id],
  );
  const canSchedule = examSeries.length > 0;

  const getStatusTone = (st: string): Tone => {
    switch (st?.toLowerCase().replace(/\s+/g, "_")) {
      case "scheduled": return "info";
      case "in_progress": return "warning";
      case "completed": return "success";
      case "cancelled": return "danger";
      default: return "neutral";
    }
  };

  const openCreateForm = () => {
    setFormError(null);
    setForm(emptyForm);
    setIsCreateOpen(true);
  };

  const handleAddSlot = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!form.exam_series_id) {
      setFormError("Choose the exam cycle this timetable slot belongs to.");
      return;
    }

    if (!form.date || !form.start_time || !form.end_time) {
      setFormError("Exam date, start time, and end time are required.");
      return;
    }

    if (form.end_time <= form.start_time) {
      setFormError("End time must be after start time.");
      return;
    }

    const roomName = form.room_name.trim();
    if (!roomName) {
      setFormError("Room or venue is required.");
      return;
    }

    setIsCreating(true);
    try {
      await createTimetableSlot({
        exam_series_id: form.exam_series_id,
        assessment_id: form.assessment_id || null,
        date: form.date,
        start_time: form.start_time,
        end_time: form.end_time,
        room_name: roomName,
        staff_user_id: form.staff_user_id || null,
      });
      toast.success("Timetable slot scheduled.");
      setIsCreateOpen(false);
      setForm(emptyForm);
      await refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to schedule timetable slot.";
      setFormError(message);
      toast.error(message);
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
        <button type="button" onClick={openCreateForm} disabled={isCreating} className="inline-flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white transition hover:bg-blue-900 disabled:opacity-50">
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

      {!optionsLoading && !canSchedule ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Create an exam cycle before scheduling timetable slots.{" "}
          <Link href="/school/exams-manager/exam-setup" className="underline">Open exam setup</Link>
        </div>
      ) : null}

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
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">
                  No timetable slots have been scheduled yet. Add the first slot with exam cycle, date, time, room, and optional invigilator assignment.
                </td>
              </tr>
            ) : (
              slots.map((slot) => (
                <tr key={slot.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{slot.exam_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{slot.subject}</td>
                  <td className="px-4 py-3 text-[#64748B]">{slot.class_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{slot.date}</td>
                  <td className="px-4 py-3 text-[#64748B]">{slot.start_time} - {slot.end_time}</td>
                  <td className="px-4 py-3 text-[#64748B]">{slot.venue}</td>
                  <td className="px-4 py-3 text-[#64748B]">{slot.invigilator}</td>
                  <td className="px-4 py-3"><StatusChip label={slot.status} tone={getStatusTone(slot.status)} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={isCreateOpen}
        onClose={() => !isCreating && setIsCreateOpen(false)}
        title="Add timetable slot"
        description="Schedule a real exam session for this school. The slot is saved to the timetable and can carry an invigilator assignment."
        size="lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              disabled={isCreating}
              className="rounded-lg border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-bold text-[#071D49] hover:bg-[#F8FAFC] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="exam-timetable-create-form"
              disabled={isCreating || optionsLoading || !canSchedule}
              className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 disabled:opacity-50"
            >
              {isCreating ? "Scheduling..." : "Schedule slot"}
            </button>
          </>
        }
      >
        <form id="exam-timetable-create-form" onSubmit={handleAddSlot} className="space-y-4">
          {formError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              {formError}
            </div>
          ) : null}

          {!canSchedule && !optionsLoading ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
              No exam cycle exists for this school yet.{" "}
              <Link href="/school/exams-manager/exam-setup" className="underline">Create an exam cycle first.</Link>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm font-bold text-[#334155] md:col-span-2">
              Exam cycle
              <select
                name="exam_series_id"
                value={form.exam_series_id}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  exam_series_id: event.target.value,
                  assessment_id: "",
                }))}
                className="w-full rounded-xl border border-[#D8E0EC] px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-blue-400"
                required
                disabled={optionsLoading || !canSchedule}
              >
                <option value="">{optionsLoading ? "Loading exam cycles..." : "Select exam cycle"}</option>
                {examSeries.map((exam) => (
                  <option key={exam.id} value={exam.id}>{exam.label}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm font-bold text-[#334155] md:col-span-2">
              Assessment or paper
              <select
                name="assessment_id"
                value={form.assessment_id}
                onChange={(event) => setForm((current) => ({ ...current, assessment_id: event.target.value }))}
                className="w-full rounded-xl border border-[#D8E0EC] px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-blue-400"
                disabled={optionsLoading || availableAssessments.length === 0}
              >
                <option value="">{availableAssessments.length === 0 ? "No papers configured yet" : "General exam slot"}</option>
                {availableAssessments.map((assessment) => (
                  <option key={assessment.id} value={assessment.id}>{assessment.label}</option>
                ))}
              </select>
              {availableAssessments.length === 0 ? (
                <span className="text-xs font-semibold text-[#64748B]">You can still schedule a general exam session, then attach papers after assessment setup.</span>
              ) : null}
            </label>

            <label className="space-y-1 text-sm font-bold text-[#334155]">
              Date
              <input
                name="date"
                type="date"
                value={form.date}
                onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                className="w-full rounded-xl border border-[#D8E0EC] px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-blue-400"
                required
              />
            </label>

            <label className="space-y-1 text-sm font-bold text-[#334155]">
              Room or venue
              <input
                name="room_name"
                value={form.room_name}
                onChange={(event) => setForm((current) => ({ ...current, room_name: event.target.value }))}
                className="w-full rounded-xl border border-[#D8E0EC] px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-blue-400"
                placeholder="Main Hall"
                required
              />
            </label>

            <label className="space-y-1 text-sm font-bold text-[#334155]">
              Start time
              <input
                name="start_time"
                type="time"
                value={form.start_time}
                onChange={(event) => setForm((current) => ({ ...current, start_time: event.target.value }))}
                className="w-full rounded-xl border border-[#D8E0EC] px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-blue-400"
                required
              />
            </label>

            <label className="space-y-1 text-sm font-bold text-[#334155]">
              End time
              <input
                name="end_time"
                type="time"
                value={form.end_time}
                onChange={(event) => setForm((current) => ({ ...current, end_time: event.target.value }))}
                className="w-full rounded-xl border border-[#D8E0EC] px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-blue-400"
                required
              />
            </label>

            <label className="space-y-1 text-sm font-bold text-[#334155] md:col-span-2">
              Invigilator
              <select
                name="staff_user_id"
                value={form.staff_user_id}
                onChange={(event) => setForm((current) => ({ ...current, staff_user_id: event.target.value }))}
                className="w-full rounded-xl border border-[#D8E0EC] px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-blue-400"
                disabled={optionsLoading || staffOptions.length === 0}
              >
                <option value="">{staffOptions.length === 0 ? "No active staff accounts available" : "Assign later"}</option>
                {staffOptions.map((staff) => (
                  <option key={staff.id} value={staff.user_id ?? ""}>{staff.label}</option>
                ))}
              </select>
            </label>
          </div>
        </form>
      </Modal>
    </Panel>
  );
}
