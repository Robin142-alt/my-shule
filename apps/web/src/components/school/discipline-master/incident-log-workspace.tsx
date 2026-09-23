"use client";

import { RecordTable } from "@/components/ui/record-table";
import { useState } from "react";
import { AlertTriangle, Plus } from "lucide-react";
import { toast } from "sonner";

import { usePermissions } from "@/components/providers/permission-context";
import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";

import { Panel, StatusChip, type Tone } from "./shared";

type DisciplineIncident = {
  id: string;
  incident_number: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  occurred_at: string;
  location?: string | null;
};

type Option = { id: string; label: string };
type StudentOption = Option & { class_id?: string | null };
type OffenseOption = Option & { default_severity?: IncidentPayload["severity"] };

type IncidentOptions = {
  students: StudentOption[];
  classes: Option[];
  terms: Option[];
  years: Option[];
  offense_categories: OffenseOption[];
};

type IncidentPayload = {
  student_id: string;
  class_id: string;
  academic_term_id: string;
  academic_year_id: string;
  offense_category_id: string;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  occurred_at: string;
  location?: string;
  description: string;
  action_taken?: string;
};

function newIncidentForm(): IncidentPayload {
  return {
    student_id: "",
    class_id: "",
    academic_term_id: "",
    academic_year_id: "",
    offense_category_id: "",
    title: "",
    severity: "medium",
    occurred_at: new Date().toISOString().slice(0, 16),
    location: "",
    description: "",
    action_taken: "",
  };
}

export function IncidentLogWorkspace() {
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const { data, error, isLoading, refetch } = useSchoolQuery<DisciplineIncident[]>(
    "/discipline/incidents",
  );
  const optionsQuery = useSchoolQuery<IncidentOptions>("/discipline/incident-options");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<IncidentPayload>(newIncidentForm);
  const canWrite = hasPermission("discipline:write");
  const createIncident = useSchoolMutation<{ incident?: DisciplineIncident }, IncidentPayload>(
    "/discipline/incidents",
    "POST",
    {
      onSuccess: async () => {
        toast.success("Discipline incident recorded.");
        setForm(newIncidentForm());
        setShowForm(false);
        await refetch();
      },
      onError: (mutationError) => {
        toast.error("Incident was not recorded", { description: mutationError.message });
      },
    },
  );
  const records = data ?? [];
  const options = optionsQuery.data;

  function openIncidentForm() {
    setForm((current) => ({
      ...current,
      academic_term_id: current.academic_term_id || options?.terms?.[0]?.id || "",
      academic_year_id: current.academic_year_id || options?.years?.[0]?.id || "",
    }));
    setShowForm(true);
  }

  function submitIncident() {
    const required = [
      form.student_id,
      form.class_id,
      form.academic_term_id,
      form.academic_year_id,
      form.offense_category_id,
      form.title.trim(),
      form.description.trim(),
      form.occurred_at,
    ];
    if (required.some((value) => !value)) {
      toast.error("Complete every required incident field before saving.");
      return;
    }
    createIncident.mutate({
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      occurred_at: new Date(form.occurred_at).toISOString(),
      location: form.location?.trim() || undefined,
      action_taken: form.action_taken?.trim() || undefined,
    });
  }

  function toneFor(value: string): Tone {
    const normalized = value.toLowerCase();
    if (["resolved", "closed"].includes(normalized)) return "success";
    if (["critical", "high", "escalated"].includes(normalized)) return "danger";
    if (["reported", "under_review", "medium"].includes(normalized)) return "warning";
    return "neutral";
  }

  return (
    <Panel
      title="Incident Log"
      description="Record and follow up discipline incidents through the governed school workflow."
      icon={AlertTriangle}
      actions={
        <button
          type="button"
          disabled={permissionsLoading || !canWrite || optionsQuery.isLoading || Boolean(optionsQuery.error)}
          onClick={openIncidentForm}
          title={!permissionsLoading && !canWrite ? "Discipline write permission is required" : undefined}
          className="inline-flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Report Incident
        </button>
      }
    >
      {optionsQuery.error ? (
        <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Student, class, term, and offense choices could not be loaded. Retry before recording an incident.
          <button type="button" onClick={() => void optionsQuery.refetch()} className="ml-2 font-black underline">Retry</button>
        </div>
      ) : null}

      {showForm ? (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h3 className="text-sm font-black text-[#071D49]">Report discipline incident</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="text-xs font-bold text-[#334155]">
              Student *
              <select
                value={form.student_id}
                onChange={(event) => {
                  const student = options?.students.find((option) => option.id === event.target.value);
                  setForm((current) => ({
                    ...current,
                    student_id: event.target.value,
                    class_id: student?.class_id || current.class_id,
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm"
              >
                <option value="">Select student</option>
                {(options?.students ?? []).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-[#334155]">
              Class *
              <select value={form.class_id} onChange={(event) => setForm((current) => ({ ...current, class_id: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm">
                <option value="">Select class</option>
                {(options?.classes ?? []).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-[#334155]">
              Term *
              <select value={form.academic_term_id} onChange={(event) => setForm((current) => ({ ...current, academic_term_id: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm">
                <option value="">Select term</option>
                {(options?.terms ?? []).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-[#334155]">
              Year *
              <select value={form.academic_year_id} onChange={(event) => setForm((current) => ({ ...current, academic_year_id: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm">
                <option value="">Select year</option>
                {(options?.years ?? []).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-[#334155]">
              Offense category *
              <select
                value={form.offense_category_id}
                onChange={(event) => {
                  const category = options?.offense_categories.find((option) => option.id === event.target.value);
                  setForm((current) => ({
                    ...current,
                    offense_category_id: event.target.value,
                    severity: category?.default_severity || current.severity,
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm"
              >
                <option value="">Select offense</option>
                {(options?.offense_categories ?? []).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-[#334155]">
              Severity *
              <select value={form.severity} onChange={(event) => setForm((current) => ({ ...current, severity: event.target.value as IncidentPayload["severity"] }))} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>
            <label className="text-xs font-bold text-[#334155]">
              Incident title *
              <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm" />
            </label>
            <label className="text-xs font-bold text-[#334155]">
              Occurred at *
              <input type="datetime-local" value={form.occurred_at} onChange={(event) => setForm((current) => ({ ...current, occurred_at: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm" />
            </label>
            <label className="text-xs font-bold text-[#334155]">
              Location
              <input value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm" />
            </label>
            <label className="text-xs font-bold text-[#334155] md:col-span-2">
              Description *
              <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={3} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm" />
            </label>
            <label className="text-xs font-bold text-[#334155] md:col-span-2">
              Immediate action taken
              <textarea value={form.action_taken} onChange={(event) => setForm((current) => ({ ...current, action_taken: event.target.value }))} rows={2} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm" />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-[#64748B]">Cancel</button>
            <button type="button" disabled={createIncident.isPending} onClick={submitIncident} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-50">
              {createIncident.isPending ? "Saving…" : "Save Incident"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748B]">Total Records</p>
          <p className="mt-2 text-3xl font-black text-[#071D49]">{isLoading ? "..." : records.length}</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">Action Required</p>
          <p className="mt-2 text-3xl font-black text-rose-800">{isLoading ? "..." : records.filter((record) => !["resolved", "closed"].includes(record.status.toLowerCase())).length}</p>
        </div>
      </div>

      {error ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <p className="font-black">Discipline incidents could not be loaded.</p>
          <p className="mt-1">{error.message}</p>
          <button type="button" onClick={() => void refetch()} className="mt-3 font-black underline">Retry</button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
          <RecordTable className="w-full whitespace-nowrap text-left text-sm">
            <thead className="bg-[#F8FAFC] text-[#071D49]">
              <tr>
                <th className="px-4 py-3 font-bold">Incident</th>
                <th className="px-4 py-3 font-bold">Title</th>
                <th className="px-4 py-3 font-bold">Occurred</th>
                <th className="px-4 py-3 font-bold">Severity</th>
                <th className="px-4 py-3 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">Loading incidents…</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">No discipline incidents exist for this school. Use Report Incident when a real case occurs.</td></tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 font-mono text-xs text-[#64748B]">{record.incident_number}</td>
                    <td className="max-w-[28rem] whitespace-normal px-4 py-3 font-semibold text-[#071D49]">{record.title}</td>
                    <td className="px-4 py-3 text-[#64748B]">{record.occurred_at}</td>
                    <td className="px-4 py-3"><StatusChip label={record.severity} tone={toneFor(record.severity)} /></td>
                    <td className="px-4 py-3"><StatusChip label={record.status.replaceAll("_", " ")} tone={toneFor(record.status)} /></td>
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
