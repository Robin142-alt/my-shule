"use client";

import { RecordTable } from "@/components/ui/record-table";
import { useState } from "react";
import { Forward, Plus } from "lucide-react";
import { toast } from "sonner";

import { usePermissions } from "@/components/providers/permission-context";
import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";

import { Panel, StatusChip, type Tone } from "./shared";

type ReferralRecord = {
  id: string;
  student_name: string;
  class: string;
  referred_by: string;
  reason: string;
  date: string;
  status: string;
  risk_level?: string;
};

type ReferralsData = {
  metrics: {
    pending_referrals: number;
    accepted: number;
    external: number;
  };
  referralsList: ReferralRecord[];
};

type ReferralOption = { id: string; label: string; status?: string | null };
type StudentOption = ReferralOption & { class_id?: string | null };

type ReferralOptions = {
  students: StudentOption[];
  classes: ReferralOption[];
  terms: ReferralOption[];
  years: ReferralOption[];
  incidents: ReferralOption[];
};

type CreateReferralPayload = {
  student_id: string;
  class_id: string;
  academic_term_id: string;
  academic_year_id: string;
  incident_id?: string;
  reason: string;
  risk_level: "low" | "medium" | "high" | "critical";
};

const emptyReferral: CreateReferralPayload = {
  student_id: "",
  class_id: "",
  academic_term_id: "",
  academic_year_id: "",
  incident_id: "",
  reason: "",
  risk_level: "medium",
};

export function ReferralsWorkspace() {
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const { data, error, isLoading, refetch } = useSchoolQuery<ReferralsData>(
    "/admin-command/guidance-counselling/referrals",
  );
  const optionsQuery = useSchoolQuery<ReferralOptions>(
    "/admin-command/guidance-counselling/referral-options",
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateReferralPayload>(emptyReferral);
  const canWrite = hasPermission("counselling:write");

  const createReferral = useSchoolMutation<unknown, CreateReferralPayload>(
    "/admin-command/guidance-counselling/referrals",
    "POST",
    {
      onSuccess: async () => {
        toast.success("Counselling referral created.");
        setForm(emptyReferral);
        setShowForm(false);
        await refetch();
      },
      onError: (mutationError) => {
        toast.error("Referral was not created", { description: mutationError.message });
      },
    },
  );
  const updateStatus = useSchoolMutation<unknown, { id: string; status: "accepted" | "closed" }>(
    ({ id }) => "/admin-command/guidance-counselling/referrals/" + encodeURIComponent(id) + "/status",
    "POST",
    {
      onSuccess: async () => {
        toast.success("Referral status updated.");
        await refetch();
      },
      onError: (mutationError) => {
        toast.error("Referral status was not updated", { description: mutationError.message });
      },
    },
  );

  const items = data?.referralsList ?? [];
  const options = optionsQuery.data;

  function openReferralForm() {
    setForm((current) => ({
      ...current,
      academic_term_id: current.academic_term_id || options?.terms?.[0]?.id || "",
      academic_year_id: current.academic_year_id || options?.years?.[0]?.id || "",
    }));
    setShowForm(true);
  }

  function submitReferral() {
    if (!form.student_id || !form.class_id || !form.academic_term_id || !form.academic_year_id || !form.reason.trim()) {
      toast.error("Student, class, term, year, and referral reason are required.");
      return;
    }
    createReferral.mutate({
      ...form,
      incident_id: form.incident_id || undefined,
      reason: form.reason.trim(),
    });
  }

  const getStatusTone = (status: string): Tone => {
    const normalized = status.toLowerCase();
    if (normalized === "accepted" || normalized === "closed") return "success";
    if (normalized === "open") return "warning";
    if (normalized === "declined") return "danger";
    return "neutral";
  };

  return (
    <Panel
      title="Referrals"
      description="Create and manage private, school-scoped counselling referrals."
      icon={Forward}
      actions={
        <button
          type="button"
          disabled={permissionsLoading || !canWrite || optionsQuery.isLoading || Boolean(optionsQuery.error)}
          onClick={openReferralForm}
          title={!permissionsLoading && !canWrite ? "Counselling write permission is required" : undefined}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> New Referral
        </button>
      }
    >
      {optionsQuery.error ? (
        <div role="alert" className="mb-4 rounded-xl border border-warning-border bg-warning-soft p-4 text-sm text-amber-900">
          Referral options could not be loaded. Retry before creating a referral.
          <button type="button" onClick={() => void optionsQuery.refetch()} className="ml-2 font-black underline">Retry</button>
        </div>
      ) : null}

      {showForm ? (
        <div className="mb-6 rounded-xl border border-info-border bg-info-soft p-4">
          <h3 className="text-sm font-black text-foreground">Create counselling referral</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="text-xs font-bold text-foreground">
              Student *
              <select
                value={form.student_id}
                onChange={(event) => {
                  const student = options?.students.find((candidate) => candidate.id === event.target.value);
                  setForm((current) => ({
                    ...current,
                    student_id: event.target.value,
                    class_id: student?.class_id || current.class_id,
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-border bg-white p-2 text-sm"
              >
                <option value="">Select student</option>
                {(options?.students ?? []).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-foreground">
              Class *
              <select
                value={form.class_id}
                onChange={(event) => setForm((current) => ({ ...current, class_id: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-border bg-white p-2 text-sm"
              >
                <option value="">Select class</option>
                {(options?.classes ?? []).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-foreground">
              Academic term *
              <select
                value={form.academic_term_id}
                onChange={(event) => setForm((current) => ({ ...current, academic_term_id: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-border bg-white p-2 text-sm"
              >
                <option value="">Select term</option>
                {(options?.terms ?? []).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-foreground">
              Academic year *
              <select
                value={form.academic_year_id}
                onChange={(event) => setForm((current) => ({ ...current, academic_year_id: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-border bg-white p-2 text-sm"
              >
                <option value="">Select year</option>
                {(options?.years ?? []).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-foreground">
              Risk level
              <select
                value={form.risk_level}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  risk_level: event.target.value as CreateReferralPayload["risk_level"],
                }))}
                className="mt-1 w-full rounded-lg border border-border bg-white p-2 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>
            <label className="text-xs font-bold text-foreground">
              Related discipline incident
              <select
                value={form.incident_id}
                onChange={(event) => setForm((current) => ({ ...current, incident_id: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-border bg-white p-2 text-sm"
              >
                <option value="">None</option>
                {(options?.incidents ?? []).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-foreground md:col-span-2">
              Referral reason *
              <textarea
                value={form.reason}
                onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
                rows={3}
                className="mt-1 w-full rounded-lg border border-border bg-white p-2 text-sm"
              />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-muted">Cancel</button>
            <button
              type="button"
              disabled={createReferral.isPending}
              onClick={submitReferral}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-black text-white disabled:opacity-50"
            >
              {createReferral.isPending ? "Saving…" : "Save Referral"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-warning-border bg-warning-soft p-4">
          <div className="text-sm font-semibold text-warning">Pending Referrals</div>
          <div className="mt-1 text-lg font-black text-warning">{isLoading ? "..." : data?.metrics?.pending_referrals ?? 0}</div>
        </div>
        <div className="rounded-xl border border-success-border bg-success-soft p-4">
          <div className="text-sm font-semibold text-success">Accepted</div>
          <div className="mt-1 text-lg font-black text-success">{isLoading ? "..." : data?.metrics?.accepted ?? 0}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">External</div>
          <div className="mt-1 text-lg font-black text-foreground">{isLoading ? "..." : data?.metrics?.external ?? 0}</div>
        </div>
      </div>

      {error ? (
        <div role="alert" className="rounded-xl border border-danger-border bg-danger-soft p-4 text-sm text-danger">
          <p className="font-black">Counselling referrals could not be loaded.</p>
          <p className="mt-1">{error.message}</p>
          <button type="button" onClick={() => void refetch()} className="mt-3 font-black underline">Retry</button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <RecordTable className="w-full whitespace-nowrap text-left text-sm">
            <thead className="bg-surface-muted text-foreground">
              <tr>
                <th className="px-4 py-3 font-bold">Student</th>
                <th className="px-4 py-3 font-bold">Class</th>
                <th className="px-4 py-3 font-bold">Reason</th>
                <th className="px-4 py-3 font-bold">Risk</th>
                <th className="px-4 py-3 font-bold">Date</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">Loading referrals…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">No counselling referrals exist for this school. Create one when a learner needs confidential follow-up.</td></tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="border-t border-border hover:bg-surface-muted">
                    <td className="px-4 py-3 font-semibold text-foreground">{row.student_name}</td>
                    <td className="px-4 py-3 text-muted">{row.class}</td>
                    <td className="max-w-[24rem] whitespace-normal px-4 py-3 text-muted">{row.reason}</td>
                    <td className="px-4 py-3 text-muted">{row.risk_level || "medium"}</td>
                    <td className="px-4 py-3 text-muted">{row.date}</td>
                    <td className="px-4 py-3"><StatusChip label={row.status} tone={getStatusTone(row.status)} /></td>
                    <td className="px-4 py-3">
                      {canWrite && row.status.toLowerCase() === "open" ? (
                        <button type="button" onClick={() => updateStatus.mutate({ id: row.id, status: "accepted" })} className="font-black text-info underline">Accept</button>
                      ) : null}
                      {canWrite && row.status.toLowerCase() === "accepted" ? (
                        <button type="button" onClick={() => updateStatus.mutate({ id: row.id, status: "closed" })} className="font-black text-success underline">Close</button>
                      ) : null}
                    </td>
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
