"use client";

import { type FormEvent, useState } from "react";
import { Target } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/modal";
import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";
import { Panel, StatusChip, type Tone } from "./shared";

type InterventionStatus = "planned" | "active" | "monitoring" | "completed" | "cancelled";
type UpdateType = "progress" | "assessment" | "reassessment" | "note" | "status_change";
type ScoreStatus =
  | "entered"
  | "absent"
  | "exempt"
  | "not_assessed"
  | "incomplete"
  | "withheld"
  | "medical_exception"
  | "transfer_student";

type AcademicInterventionUpdate = {
  id: string;
  update_type: string;
  notes: string;
  score?: number | null;
  score_status?: string | null;
  recorded_at: string;
};

type AcademicIntervention = {
  id: string;
  student_name: string;
  admission_number?: string | null;
  class: string;
  class_name?: string | null;
  subject: string;
  subject_name?: string | null;
  source: string;
  intervention_type: string;
  trigger_reason: string;
  plan: string;
  teacher: string;
  owner_name?: string | null;
  hod_user_id?: string | null;
  hod_name?: string | null;
  priority: string;
  status: InterventionStatus;
  status_label: string;
  start_date: string;
  starts_on?: string | null;
  due_on?: string | null;
  completed_at?: string | null;
  outcome?: Record<string, unknown> | null;
  update_count: number;
  updates: AcademicInterventionUpdate[];
};

type AcademicInterventionsData = {
  metrics: {
    active_interventions: number;
    students_targeted: number;
    completed: number;
    overdue: number;
  };
  items: AcademicIntervention[];
};

type UpdatePayload = {
  update_type: UpdateType;
  notes: string;
  status?: InterventionStatus;
  score?: number;
  score_status?: ScoreStatus;
  outcome?: {
    summary: string;
    measured_result: string;
  };
};

type MutationResponse = {
  success: boolean;
  message: string;
};

type UpdateForm = {
  updateType: UpdateType;
  notes: string;
  status: "" | InterventionStatus;
  scoreStatus: "" | ScoreStatus;
  score: string;
  outcomeSummary: string;
  outcomeMeasure: string;
  hodMessage: string;
};

const EMPTY_UPDATE_FORM: UpdateForm = {
  updateType: "progress",
  notes: "",
  status: "",
  scoreStatus: "",
  score: "",
  outcomeSummary: "",
  outcomeMeasure: "",
  hodMessage: "",
};

const STATUS_TRANSITIONS: Record<InterventionStatus, InterventionStatus[]> = {
  planned: ["planned", "active", "cancelled"],
  active: ["active", "monitoring", "completed", "cancelled"],
  monitoring: ["monitoring", "active", "completed", "cancelled"],
  completed: ["completed"],
  cancelled: ["cancelled"],
};

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(date);
}

function statusTone(status: string): Tone {
  switch (status.toLowerCase()) {
    case "active":
    case "completed":
      return "success";
    case "planned":
    case "monitoring":
      return "warning";
    case "cancelled":
      return "danger";
    default:
      return "neutral";
  }
}

function priorityTone(priority: string): Tone {
  switch (priority.toLowerCase()) {
    case "urgent":
      return "danger";
    case "high":
      return "warning";
    case "low":
      return "info";
    default:
      return "neutral";
  }
}

export function AcademicInterventionsWorkspace() {
  const {
    data,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useSchoolQuery<AcademicInterventionsData>("/exams/interventions");
  const [selected, setSelected] = useState<AcademicIntervention | null>(null);
  const [form, setForm] = useState<UpdateForm>(EMPTY_UPDATE_FORM);

  const updateMutation = useSchoolMutation<MutationResponse, UpdatePayload>(
    `/exams/interventions/${encodeURIComponent(selected?.id ?? "missing")}/updates`,
    "POST",
  );
  const notifyHodMutation = useSchoolMutation<MutationResponse, { message?: string }>(
    `/exams/interventions/${encodeURIComponent(selected?.id ?? "missing")}/notify-hod`,
    "POST",
  );

  const items = data?.items ?? [];
  const metrics = data?.metrics;

  function openManager(intervention: AcademicIntervention) {
    setSelected(intervention);
    setForm({
      ...EMPTY_UPDATE_FORM,
      hodMessage: `Please review the ${intervention.subject} intervention for ${intervention.student_name}.`,
    });
  }

  function closeManager() {
    if (updateMutation.isPending || notifyHodMutation.isPending) return;
    setSelected(null);
    setForm(EMPTY_UPDATE_FORM);
  }

  async function saveUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;

    const notes = form.notes.trim();
    if (!notes) {
      toast.error("Enter the progress evidence or decision note.");
      return;
    }

    const payload: UpdatePayload = {
      update_type: form.updateType,
      notes,
    };

    if (form.status) {
      payload.status = form.status;
    }
    if (form.scoreStatus) {
      payload.score_status = form.scoreStatus;
      if (form.scoreStatus === "entered") {
        const score = Number(form.score);
        if (form.score.trim() === "" || !Number.isFinite(score) || score < 0) {
          toast.error("Enter a valid non-negative score for assessed evidence.");
          return;
        }
        payload.score = score;
      }
    }
    if (form.status === "completed") {
      const summary = form.outcomeSummary.trim();
      const measuredResult = form.outcomeMeasure.trim();
      if (!summary || !measuredResult) {
        toast.error("Completion requires an outcome summary and measured result.");
        return;
      }
      payload.outcome = { summary, measured_result: measuredResult };
    }

    try {
      const response = await updateMutation.mutateAsync(payload);
      toast.success(response.message || "Intervention progress saved.");
      setSelected(null);
      setForm(EMPTY_UPDATE_FORM);
      await refetch();
    } catch (mutationError) {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : "Intervention progress could not be saved.",
      );
    }
  }

  async function notifyHod() {
    if (!selected) return;
    const message = form.hodMessage.trim();
    try {
      const response = await notifyHodMutation.mutateAsync(message ? { message } : {});
      toast.success(response.message || "HOD follow-up sent.");
      await refetch();
    } catch (mutationError) {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : "The HOD follow-up could not be sent.",
      );
    }
  }

  return (
    <>
      <Panel
        title="Academic Interventions"
        description="Coordinate measured, school-scoped support plans from identification through completion."
        icon={Target}
        actions={
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="rounded-lg border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-black text-[#071D49] disabled:opacity-50"
          >
            {isFetching ? "Refreshing..." : "Refresh"}
          </button>
        }
      >
        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Active", metrics?.active_interventions ?? 0],
            ["Learners targeted", metrics?.students_targeted ?? 0],
            ["Completed", metrics?.completed ?? 0],
            ["Overdue reviews", metrics?.overdue ?? 0],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-[#D8E0EC] bg-[#F8FAFC] p-4">
              <div className="text-sm font-semibold text-[#64748B]">{label}</div>
              <div className="mt-1 text-2xl font-black text-[#071D49]">
                {isLoading ? "..." : value}
              </div>
            </div>
          ))}
        </div>

        {error ? (
          <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <p className="font-bold">Academic interventions could not be loaded.</p>
            <p className="mt-1">{error.message}</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-3 rounded-lg border border-rose-300 bg-white px-3 py-2 font-bold"
            >
              Retry
            </button>
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-lg border border-[#D8E0EC]">
          <table className="min-w-[1050px] w-full text-left text-sm">
            <thead className="bg-[#F8FAFC] text-[#071D49]">
              <tr>
                <th className="px-4 py-3 font-bold">Learner / scope</th>
                <th className="px-4 py-3 font-bold">Reason and plan</th>
                <th className="px-4 py-3 font-bold">Owner / HOD</th>
                <th className="px-4 py-3 font-bold">Timeline</th>
                <th className="px-4 py-3 font-bold">Priority</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">Evidence</th>
                <th className="px-4 py-3 text-right font-bold">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[#64748B]">
                    Loading school interventions...
                  </td>
                </tr>
              ) : items.length === 0 && !error ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[#64748B]">
                    No academic interventions yet. Create one from a performance review when a
                    learner, class, or subject needs a measured support plan.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="border-t border-[#D8E0EC] align-top hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3">
                      <div className="font-bold text-[#071D49]">{row.student_name}</div>
                      <div className="mt-1 text-xs text-[#64748B]">
                        {[row.class, row.subject].filter(Boolean).join(" / ")}
                      </div>
                    </td>
                    <td className="max-w-[280px] px-4 py-3 text-[#64748B]">
                      <div className="font-semibold text-[#071D49]">{row.trigger_reason}</div>
                      <div className="mt-1 line-clamp-2">{row.plan}</div>
                    </td>
                    <td className="px-4 py-3 text-[#64748B]">
                      <div>{row.teacher}</div>
                      <div className="mt-1 text-xs">HOD: {row.hod_name ?? "Not assigned"}</div>
                    </td>
                    <td className="px-4 py-3 text-[#64748B]">
                      <div>{formatDate(row.starts_on ?? row.start_date)}</div>
                      <div className="mt-1 text-xs">Review: {formatDate(row.due_on)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusChip label={titleCase(row.priority)} tone={priorityTone(row.priority)} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusChip label={titleCase(row.status)} tone={statusTone(row.status)} />
                    </td>
                    <td className="px-4 py-3 text-[#64748B]">
                      {row.update_count} update{row.update_count === 1 ? "" : "s"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openManager(row)}
                        className="rounded-lg bg-[#071D49] px-3 py-2 text-xs font-black text-white"
                      >
                        Review and update
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <Modal
        open={Boolean(selected)}
        title={selected ? `Manage ${selected.student_name}` : "Manage intervention"}
        description={
          selected
            ? `${selected.class} / ${selected.subject}. Every update is retained in the school audit trail.`
            : undefined
        }
        onClose={closeManager}
        size="lg"
        footer={
          <div className="flex w-full flex-wrap justify-between gap-3">
            <button
              type="button"
              onClick={notifyHod}
              disabled={notifyHodMutation.isPending || updateMutation.isPending}
              className="rounded-lg border border-[#BFDBFE] bg-[#EEF5FF] px-4 py-2 text-sm font-black text-[#0B63CE] disabled:opacity-50"
            >
              {notifyHodMutation.isPending ? "Sending..." : "Notify assigned HOD"}
            </button>
            <button
              type="button"
              onClick={closeManager}
              disabled={notifyHodMutation.isPending || updateMutation.isPending}
              className="rounded-lg border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-bold text-[#071D49] disabled:opacity-50"
            >
              Close
            </button>
          </div>
        }
      >
        {selected ? (
          <div className="space-y-6">
            <section className="rounded-lg border border-[#D8E0EC] bg-[#F8FAFC] p-4">
              <div className="flex flex-wrap gap-2">
                <StatusChip label={titleCase(selected.status)} tone={statusTone(selected.status)} />
                <StatusChip
                  label={titleCase(selected.priority)}
                  tone={priorityTone(selected.priority)}
                />
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-bold text-[#071D49]">Trigger</dt>
                  <dd className="mt-1 text-[#64748B]">{selected.trigger_reason}</dd>
                </div>
                <div>
                  <dt className="font-bold text-[#071D49]">Support plan</dt>
                  <dd className="mt-1 text-[#64748B]">{selected.plan}</dd>
                </div>
                <div>
                  <dt className="font-bold text-[#071D49]">Responsible owner</dt>
                  <dd className="mt-1 text-[#64748B]">{selected.teacher}</dd>
                </div>
                <div>
                  <dt className="font-bold text-[#071D49]">Department HOD</dt>
                  <dd className="mt-1 text-[#64748B]">{selected.hod_name ?? "Not assigned"}</dd>
                </div>
              </dl>
            </section>

            <form onSubmit={saveUpdate} className="space-y-4">
              <h4 className="font-black text-[#071D49]">Record progress or decision</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-bold text-[#071D49]">
                  Update type
                  <select
                    value={form.updateType}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        updateType: event.target.value as UpdateType,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white px-3 py-2 font-normal"
                  >
                    <option value="progress">Progress</option>
                    <option value="assessment">Assessment</option>
                    <option value="reassessment">Reassessment</option>
                    <option value="note">Note</option>
                    <option value="status_change">Status decision</option>
                  </select>
                </label>
                <label className="text-sm font-bold text-[#071D49]">
                  Lifecycle status
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        status: event.target.value as UpdateForm["status"],
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white px-3 py-2 font-normal"
                  >
                    <option value="">Keep {titleCase(selected.status)}</option>
                    {STATUS_TRANSITIONS[selected.status].map((status) => (
                      <option key={status} value={status}>
                        {titleCase(status)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block text-sm font-bold text-[#071D49]">
                Evidence and notes
                <textarea
                  required
                  rows={4}
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, notes: event.target.value }))
                  }
                  placeholder="Record the support delivered, learner response, evidence reviewed, and next step."
                  className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 font-normal"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-bold text-[#071D49]">
                  Assessment evidence
                  <select
                    value={form.scoreStatus}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        scoreStatus: event.target.value as UpdateForm["scoreStatus"],
                        score: event.target.value === "entered" ? current.score : "",
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white px-3 py-2 font-normal"
                  >
                    <option value="">No assessment evidence</option>
                    <option value="entered">Score entered</option>
                    <option value="absent">Absent</option>
                    <option value="exempt">Exempt</option>
                    <option value="not_assessed">Not assessed</option>
                    <option value="incomplete">Incomplete</option>
                    <option value="withheld">Withheld</option>
                    <option value="medical_exception">Medical exception</option>
                    <option value="transfer_student">Transfer student</option>
                  </select>
                </label>
                <label className="text-sm font-bold text-[#071D49]">
                  Score
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={form.scoreStatus !== "entered"}
                    value={form.score}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, score: event.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 font-normal disabled:bg-slate-100"
                  />
                </label>
              </div>
              {form.status === "completed" ? (
                <div className="grid gap-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 sm:grid-cols-2">
                  <label className="text-sm font-bold text-emerald-950">
                    Outcome summary
                    <input
                      required
                      value={form.outcomeSummary}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          outcomeSummary: event.target.value,
                        }))
                      }
                      placeholder="What changed?"
                      className="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 font-normal"
                    />
                  </label>
                  <label className="text-sm font-bold text-emerald-950">
                    Measured result
                    <input
                      required
                      value={form.outcomeMeasure}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          outcomeMeasure: event.target.value,
                        }))
                      }
                      placeholder="e.g. Average improved from 42% to 58%"
                      className="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 font-normal"
                    />
                  </label>
                </div>
              ) : null}
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="w-full rounded-lg bg-[#071D49] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
              >
                {updateMutation.isPending ? "Saving evidence..." : "Save intervention update"}
              </button>
            </form>

            <section>
              <h4 className="font-black text-[#071D49]">Notify the department HOD</h4>
              <textarea
                rows={3}
                value={form.hodMessage}
                onChange={(event) =>
                  setForm((current) => ({ ...current, hodMessage: event.target.value }))
                }
                className="mt-2 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm"
              />
              {!selected.hod_user_id ? (
                <p className="mt-2 text-xs font-semibold text-amber-700">
                  No HOD is currently attached to this subject. The action will explain the
                  assignment needed in Academic Setup.
                </p>
              ) : null}
            </section>

            <section>
              <h4 className="font-black text-[#071D49]">Evidence history</h4>
              {selected.updates.length === 0 ? (
                <p className="mt-2 rounded-lg border border-dashed border-[#D8E0EC] p-4 text-sm text-[#64748B]">
                  No progress evidence has been recorded yet.
                </p>
              ) : (
                <div className="mt-2 space-y-2">
                  {selected.updates.map((update) => (
                    <div key={update.id} className="rounded-lg border border-[#D8E0EC] p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-[#071D49]">
                          {titleCase(update.update_type)}
                        </span>
                        <span className="text-xs text-[#64748B]">
                          {formatDate(update.recorded_at)}
                        </span>
                      </div>
                      <p className="mt-1 text-[#64748B]">{update.notes}</p>
                      {update.score_status ? (
                        <p className="mt-1 text-xs font-semibold text-[#071D49]">
                          Evidence: {titleCase(update.score_status)}
                          {update.score_status === "entered" ? ` (${update.score})` : ""}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
