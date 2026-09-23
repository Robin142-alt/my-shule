"use client";

import { RecordTable } from "@/components/ui/record-table";
import { useState } from "react";
import { ClipboardCheck, Plus } from "lucide-react";
import { toast } from "sonner";

import { usePermissions } from "@/components/providers/permission-context";
import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";

import { Panel, StatusChip, type Tone } from "./shared";
import type { BoardingReferenceData } from "./api-client";

type BoardingAttendanceRecord = {
  id: string;
  house_id?: string | null;
  house_name?: string | null;
  checked_at: string;
  status: string;
  notes?: string | null;
  expected_students?: number;
  missing_students?: number;
};

type BoardingAttendanceData = {
  metrics: {
    checks_today: number;
    clear: number;
    attention_required: number;
  };
  boardingattendanceList: BoardingAttendanceRecord[];
};

type RollCallPayload = {
  house_id: string;
  status: "clear" | "attention_required";
  notes: string;
  missing_student_ids: string[];
};

const emptyRollCall: RollCallPayload = { house_id: "", status: "clear", notes: "", missing_student_ids: [] };

export function BoardingAttendanceWorkspace() {
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const { data, error, isLoading, refetch } = useSchoolQuery<BoardingAttendanceData>(
    "/admin-command/boarding-master/boarding-attendance",
  );
  const {
    data: references,
    error: referencesError,
    isLoading: referencesLoading,
  } = useSchoolQuery<BoardingReferenceData>("/admin-command/boarding-master/references");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<RollCallPayload>(emptyRollCall);
  const canWrite = hasPermission("boarding:write");
  const submitRollCall = useSchoolMutation<unknown, RollCallPayload>(
    "/admin-command/boarding-master/boarding-attendance",
    "POST",
    {
      onSuccess: async () => {
        toast.success("Boarding roll call submitted.");
        setForm(emptyRollCall);
        setShowForm(false);
        await refetch();
      },
      onError: (mutationError) => {
        toast.error("Roll call was not submitted", { description: mutationError.message });
      },
    },
  );
  const items = data?.boardingattendanceList ?? [];
  const houses = Array.isArray(references?.houses) ? references.houses : [];
  const students = Array.isArray(references?.students) ? references.students : [];
  const referencesIncomplete = references != null
    && (!Array.isArray(references.houses) || !Array.isArray(references.students));
  const houseStudents = students.filter((student) => student.house_id === form.house_id);
  const referencesUnavailable = referencesIncomplete || houses.length === 0 || students.length === 0;

  const getStatusTone = (status: string): Tone => {
    if (status.toLowerCase() === "clear") return "success";
    if (status.toLowerCase() === "attention_required") return "danger";
    return "neutral";
  };

  function saveRollCall() {
    if (!form.house_id) {
      toast.error("Select the boarding house being checked.");
      return;
    }
    if (form.status === "attention_required" && !form.notes.trim()) {
      toast.error("Describe the missing learner or issue that requires attention.");
      return;
    }
    if (form.status === "attention_required" && form.missing_student_ids.length === 0) {
      toast.error("Select at least one missing learner.");
      return;
    }
    submitRollCall.mutate({ ...form, notes: form.notes.trim() });
  }

  function toggleMissingStudent(studentId: string) {
    setForm((current) => ({
      ...current,
      missing_student_ids: current.missing_student_ids.includes(studentId)
        ? current.missing_student_ids.filter((id) => id !== studentId)
        : [...current.missing_student_ids, studentId],
    }));
  }

  return (
    <Panel
      title="Boarding Attendance"
      description="Submit the daily boarding roll call and surface missing-boarder follow-up truthfully."
      icon={ClipboardCheck}
      actions={
        <button
          type="button"
          disabled={permissionsLoading || referencesLoading || !canWrite || referencesUnavailable}
          onClick={() => setShowForm(true)}
          title={!permissionsLoading && !canWrite ? "Boarding write permission is required" : undefined}
          className="inline-flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Submit Roll Call
        </button>
      }
    >
      {!referencesLoading && !referencesError && referencesIncomplete ? (
        <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Boarding house and learner references are incomplete. Refresh this workspace before submitting a roll call.
        </div>
      ) : null}
      {!referencesLoading && !referencesError && !referencesIncomplete && houses.length === 0 ? (
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          No boarding houses are configured for this school. Create a house before submitting a roll call.
        </div>
      ) : null}
      {!referencesLoading && !referencesError && !referencesIncomplete && houses.length > 0 && students.length === 0 ? (
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          No active boarders are assigned to a boarding house. Complete boarder allocation before submitting a roll call.
        </div>
      ) : null}
      {showForm ? (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h3 className="text-sm font-black text-[#071D49]">Record the current hostel check</h3>
          {referencesError ? (
            <p role="alert" className="mt-3 text-sm font-semibold text-rose-700">Boarding house and learner references could not be loaded: {referencesError.message}</p>
          ) : null}
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="text-xs font-bold text-[#334155]">
              Boarding house
              <select
                value={form.house_id}
                disabled={referencesUnavailable}
                onChange={(event) => setForm((current) => ({ ...current, house_id: event.target.value, missing_student_ids: [] }))}
                className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm"
              >
                <option value="">Select a house</option>
                {houses.map((house) => <option key={house.id} value={house.id}>{house.title}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-[#334155]">
              Check result
              <select
                value={form.status}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  status: event.target.value as RollCallPayload["status"],
                  missing_student_ids: event.target.value === "clear" ? [] : current.missing_student_ids,
                }))}
                className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm"
              >
                <option value="clear">All accounted for</option>
                <option value="attention_required">Attention required</option>
              </select>
            </label>
            <label className="text-xs font-bold text-[#334155]">
              Notes {form.status === "attention_required" ? "*" : ""}
              <input
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Missing learner, late return, or handover note"
                className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm"
              />
            </label>
            {form.status === "attention_required" ? (
              <fieldset className="rounded-lg border border-[#D8E0EC] bg-white p-3 text-xs md:col-span-2">
                <legend className="px-1 font-bold text-[#334155]">Missing learners</legend>
                {!form.house_id ? <p className="text-[#64748B]">Select a house first.</p> : null}
                {form.house_id && houseStudents.length === 0 ? <p className="text-rose-700">No active boarders are assigned to this house.</p> : null}
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {houseStudents.map((student) => (
                    <label key={student.id} className="flex items-start gap-2 rounded-md border border-[#E2E8F0] p-2">
                      <input
                        type="checkbox"
                        checked={form.missing_student_ids.includes(student.id)}
                        onChange={() => toggleMissingStudent(student.id)}
                        className="mt-0.5"
                      />
                      <span>{student.student_name}<span className="block text-[11px] text-[#64748B]">{student.admission_number}</span></span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-[#64748B]">Cancel</button>
            <button
              type="button"
              disabled={submitRollCall.isPending || referencesLoading || Boolean(referencesError) || referencesUnavailable}
              onClick={saveRollCall}
              className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-50"
            >
              {submitRollCall.isPending ? "Submitting…" : "Confirm Roll Call"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Checks Today</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.checks_today ?? 0}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-semibold text-emerald-700">Clear</div>
          <div className="mt-1 text-lg font-black text-emerald-800">{isLoading ? "..." : data?.metrics?.clear ?? 0}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-sm font-semibold text-rose-700">Attention Required</div>
          <div className="mt-1 text-lg font-black text-rose-800">{isLoading ? "..." : data?.metrics?.attention_required ?? 0}</div>
        </div>
      </div>

      {error ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <p className="font-black">Boarding roll calls could not be loaded.</p>
          <p className="mt-1">{error.message}</p>
          <button type="button" onClick={() => void refetch()} className="mt-3 font-black underline">Retry</button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
          <RecordTable className="w-full whitespace-nowrap text-left text-sm">
            <thead className="bg-[#F8FAFC] text-[#071D49]">
              <tr>
                <th className="px-4 py-3 font-bold">Hostel / House</th>
                <th className="px-4 py-3 font-bold">Checked At</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">Learners</th>
                <th className="px-4 py-3 font-bold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">Loading roll calls…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">No boarding roll call has been submitted for this school. Submit the first check before handover.</td></tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 font-semibold text-[#071D49]">{row.house_name || "All hostels"}</td>
                    <td className="px-4 py-3 text-[#64748B]">{row.checked_at}</td>
                    <td className="px-4 py-3"><StatusChip label={row.status.replaceAll("_", " ")} tone={getStatusTone(row.status)} /></td>
                    <td className="px-4 py-3 text-[#64748B]">{row.missing_students ?? 0} missing / {row.expected_students ?? 0} expected</td>
                    <td className="max-w-[24rem] whitespace-normal px-4 py-3 text-[#64748B]">{row.notes || "No issue recorded"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </RecordTable>
        </div>
      )}
    </Panel>
  );
}
