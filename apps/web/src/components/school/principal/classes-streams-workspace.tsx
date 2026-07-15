"use client";

import { useState, type FormEvent } from "react";
import { Layers, Plus, Users } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/modal";
import { useSchoolQuery } from "@/lib/data/school-hooks";

import { createClass, createStream } from "./api-client";
import { Panel, StatusChip, MetricCard } from "./shared";

type StreamRecord = { id: string; name: string; students_count: number };
type ClassRecord = {
  id: string;
  name: string;
  level: string;
  class_teacher: string;
  total_students: number;
  streams: StreamRecord[];
  status: string;
};

type ClassesStreamsData = {
  metrics: { total_classes: number; total_streams: number; total_students: number; avg_class_size: number };
  classes: ClassRecord[];
};

const levelOptions = [
  "PP1",
  "PP2",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Form 1",
  "Form 2",
  "Form 3",
  "Form 4",
  "Senior School Year 1",
  "Senior School Year 2",
  "Senior School Year 3",
];

const emptyClassForm = {
  name: "",
  level: "",
  stream_name: "",
  capacity: "45",
  class_teacher: "",
};

export function ClassesStreamsWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<ClassesStreamsData>("/admin-command/principal/classes-streams");
  const [isSaving, setIsSaving] = useState(false);
  const [isClassOpen, setIsClassOpen] = useState(false);
  const [streamClass, setStreamClass] = useState<ClassRecord | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [classForm, setClassForm] = useState(emptyClassForm);
  const [streamForm, setStreamForm] = useState({ name: "", capacity: "45" });

  const classes = data?.classes || [];

  const openClassForm = () => {
    setFormError(null);
    setClassForm(emptyClassForm);
    setIsClassOpen(true);
  };

  const openStreamForm = (schoolClass: ClassRecord) => {
    setFormError(null);
    setStreamForm({ name: "", capacity: "45" });
    setStreamClass(schoolClass);
  };

  const handleCreateClass = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = classForm.name.trim();
    const level = classForm.level.trim();
    const streamName = classForm.stream_name.trim();
    const capacity = Number(classForm.capacity);

    if (!name || !level) {
      setFormError("Class name and level are required.");
      return;
    }

    if (!Number.isFinite(capacity) || capacity < 1) {
      setFormError("Capacity must be a positive number.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      const created = await createClass({
        name,
        class_name: name,
        level,
        grade_level: level,
        stream_name: streamName || null,
        capacity,
        class_teacher: classForm.class_teacher.trim() || null,
      });

      const classId = String((created as any)?.class?.id ?? (created as any)?.id ?? "");
      if (classId && streamName) {
        await createStream(classId, { name: streamName, capacity });
      }

      toast.success("Class setup submitted for this school.");
      setIsClassOpen(false);
      await refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create class.";
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateStream = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!streamClass) return;

    const name = streamForm.name.trim();
    const capacity = Number(streamForm.capacity);
    if (!name) {
      setFormError("Stream name is required.");
      return;
    }
    if (!Number.isFinite(capacity) || capacity < 1) {
      setFormError("Capacity must be a positive number.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      await createStream(streamClass.id, { name, stream_name: name, capacity });
      toast.success(`Stream ${name} submitted for ${streamClass.name}.`);
      setStreamClass(null);
      await refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create stream.";
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Panel
      title="Classes & Streams"
      description="Set the school-specific class structure that admissions, attendance, exams, timetable, and class teachers use."
      icon={Layers}
      actions={
        <button
          type="button"
          disabled={isSaving}
          onClick={openClassForm}
          className="inline-flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white transition hover:bg-blue-900 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Add Class
        </button>
      }
    >
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <MetricCard label="Total Classes" value={isLoading ? "..." : data?.metrics?.total_classes ?? 0} icon={Layers} />
        <MetricCard label="Total Streams" value={isLoading ? "..." : data?.metrics?.total_streams ?? 0} icon={Layers} tone="info" />
        <MetricCard label="Total Students" value={isLoading ? "..." : data?.metrics?.total_students ?? 0} icon={Users} />
        <MetricCard label="Avg Class Size" value={isLoading ? "..." : data?.metrics?.avg_class_size ?? 0} icon={Users} tone="info" />
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="border-b border-[#D8E0EC] px-4 py-3 font-bold">Class</th>
              <th className="border-b border-[#D8E0EC] px-4 py-3 font-bold">Level</th>
              <th className="border-b border-[#D8E0EC] px-4 py-3 font-bold">Class Teacher</th>
              <th className="border-b border-[#D8E0EC] px-4 py-3 font-bold">Students</th>
              <th className="border-b border-[#D8E0EC] px-4 py-3 font-bold">Streams</th>
              <th className="border-b border-[#D8E0EC] px-4 py-3 font-bold">Status</th>
              <th className="border-b border-[#D8E0EC] px-4 py-3 text-right font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">Loading classes...</td></tr>
            ) : classes.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">
                  No classes configured. Add the first class and stream so admissions can place applicants and exams can assign mark entry windows.
                </td>
              </tr>
            ) : (
              classes.map((cls) => (
                <tr key={cls.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{cls.name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{cls.level || "-"}</td>
                  <td className="px-4 py-3 text-[#64748B]">{cls.class_teacher || "-"}</td>
                  <td className="px-4 py-3 text-[#64748B]">{cls.total_students}</td>
                  <td className="px-4 py-3 text-[#64748B]">{cls.streams.length > 0 ? cls.streams.map((s) => `${s.name} (${s.students_count})`).join(", ") : "No streams"}</td>
                  <td className="px-4 py-3"><StatusChip label={cls.status || "Active"} tone={cls.status === "Active" ? "success" : "neutral"} /></td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openStreamForm(cls)}
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      Add stream
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={isClassOpen}
        onClose={() => !isSaving && setIsClassOpen(false)}
        title="Add class and stream"
        description="Create a school-scoped class level. Add the first stream now or add streams from the class row later."
        size="lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsClassOpen(false)}
              disabled={isSaving}
              className="rounded-lg border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-bold text-[#071D49] hover:bg-[#F8FAFC] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="principal-class-create-form"
              disabled={isSaving}
              className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save class"}
            </button>
          </>
        }
      >
        <form id="principal-class-create-form" onSubmit={handleCreateClass} className="space-y-4">
          {formError ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{formError}</div> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm font-bold text-[#334155]">
              Class name
              <input
                value={classForm.name}
                onChange={(event) => setClassForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Form 1 East"
                className="w-full rounded-xl border border-[#D8E0EC] px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-blue-400"
                required
              />
            </label>
            <label className="space-y-1 text-sm font-bold text-[#334155]">
              Level
              <select
                value={classForm.level}
                onChange={(event) => setClassForm((current) => ({ ...current, level: event.target.value }))}
                className="w-full rounded-xl border border-[#D8E0EC] px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-blue-400"
                required
              >
                <option value="">Select level</option>
                {levelOptions.map((level) => <option key={level} value={level}>{level}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-sm font-bold text-[#334155]">
              First stream
              <input
                value={classForm.stream_name}
                onChange={(event) => setClassForm((current) => ({ ...current, stream_name: event.target.value }))}
                placeholder="East"
                className="w-full rounded-xl border border-[#D8E0EC] px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-blue-400"
              />
            </label>
            <label className="space-y-1 text-sm font-bold text-[#334155]">
              Capacity
              <input
                type="number"
                min={1}
                value={classForm.capacity}
                onChange={(event) => setClassForm((current) => ({ ...current, capacity: event.target.value }))}
                className="w-full rounded-xl border border-[#D8E0EC] px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-blue-400"
              />
            </label>
            <label className="space-y-1 text-sm font-bold text-[#334155] md:col-span-2">
              Class teacher label
              <input
                value={classForm.class_teacher}
                onChange={(event) => setClassForm((current) => ({ ...current, class_teacher: event.target.value }))}
                placeholder="Assign after staff onboarding, or type a label for now"
                className="w-full rounded-xl border border-[#D8E0EC] px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-blue-400"
              />
            </label>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(streamClass)}
        onClose={() => !isSaving && setStreamClass(null)}
        title={streamClass ? `Add stream to ${streamClass.name}` : "Add stream"}
        description="Streams keep admissions, attendance, class teaching, exams, and report cards aligned inside one class level."
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setStreamClass(null)}
              disabled={isSaving}
              className="rounded-lg border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-bold text-[#071D49] hover:bg-[#F8FAFC] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="principal-stream-create-form"
              disabled={isSaving}
              className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save stream"}
            </button>
          </>
        }
      >
        <form id="principal-stream-create-form" onSubmit={handleCreateStream} className="space-y-4">
          {formError ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{formError}</div> : null}
          <label className="block space-y-1 text-sm font-bold text-[#334155]">
            Stream name
            <input
              value={streamForm.name}
              onChange={(event) => setStreamForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="North"
              className="w-full rounded-xl border border-[#D8E0EC] px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-blue-400"
              required
            />
          </label>
          <label className="block space-y-1 text-sm font-bold text-[#334155]">
            Capacity
            <input
              type="number"
              min={1}
              value={streamForm.capacity}
              onChange={(event) => setStreamForm((current) => ({ ...current, capacity: event.target.value }))}
              className="w-full rounded-xl border border-[#D8E0EC] px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-blue-400"
            />
          </label>
        </form>
      </Modal>
    </Panel>
  );
}
