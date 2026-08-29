"use client";

import { type FormEvent, useState } from "react";
import { GraduationCap } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/modal";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";
import { buildSchoolStaffOptions, type SchoolStaffOptionInput } from "@/lib/school/staff-option-label";
import { Panel, StatusChip, type Tone } from "./shared";

type ClassSection = {
  id: string;
  name: string;
  grade_level?: string;
  stream?: string;
};

type Subject = {
  id: string;
  code?: string;
  name: string;
};

type Teacher = SchoolStaffOptionInput & { user_id: string };

export type AcademicIntervention = {
  id: string;
  student_name: string;
  class: string;
  class_name?: string | null;
  subject: string;
  subject_name?: string | null;
  teacher: string;
  owner_name?: string | null;
  hod_user_id?: string | null;
  hod_name?: string | null;
  trigger_reason: string;
  plan: string;
  priority: string;
  status: string;
  starts_on?: string | null;
  due_on?: string | null;
  update_count: number;
};

type AcademicsData = {
  metrics: {
    active_subjects: number;
    active_interventions: number;
    students_targeted: number;
    completed: number;
    overdue: number;
  };
  interventions: AcademicIntervention[];
};

type CreateInterventionPayload = {
  class_section_id: string;
  subject_id: string;
  owner_user_id: string;
  source: "manual";
  trigger_reason: string;
  plan: string;
  priority: "low" | "normal" | "high" | "urgent";
  starts_on?: string;
  due_on?: string;
  target?: {
    description: string;
  };
};

type MutationResponse = {
  success: boolean;
  message: string;
};

type CreateForm = {
  classSectionId: string;
  subjectId: string;
  ownerUserId: string;
  reason: string;
  plan: string;
  target: string;
  priority: CreateInterventionPayload["priority"];
  startsOn: string;
  dueOn: string;
};

function dateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function createEmptyForm(): CreateForm {
  const today = new Date();
  const reviewDate = new Date(today);
  reviewDate.setDate(reviewDate.getDate() + 14);
  return {
    classSectionId: "",
    subjectId: "",
    ownerUserId: "",
    reason: "",
    plan: "",
    target: "",
    priority: "normal",
    startsOn: dateInputValue(today),
    dueOn: dateInputValue(reviewDate),
  };
}

function unwrapRows<T>(value: T[] | { items?: T[] } | undefined): T[] {
  if (Array.isArray(value)) return value;
  return Array.isArray(value?.items) ? value.items : [];
}

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

export function DeputyAcademicsMonitoringWorkspace() {
  const {
    data,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useSchoolQuery<AcademicsData>("/admin-command/deputy/academics");
  const classesQuery = useSchoolQuery<ClassSection[]>("/api/academics/class-sections");
  const subjectsQuery = useSchoolQuery<Subject[]>("/api/academics/subjects");
  const teachersQuery = useSchoolQuery<Teacher[]>("/api/academics/teachers");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CreateForm>(() => createEmptyForm());
  const [notifyingId, setNotifyingId] = useState<string | null>(null);

  const createMutation = useSchoolMutation<MutationResponse, CreateInterventionPayload>(
    "/exams/interventions",
    "POST",
  );

  const interventions = data?.interventions ?? [];
  const metrics = data?.metrics;
  const classes = unwrapRows(classesQuery.data);
  const subjects = unwrapRows(subjectsQuery.data);
  const teachers = buildSchoolStaffOptions(unwrapRows(teachersQuery.data));
  const setupErrors = [
    classesQuery.error?.message,
    subjectsQuery.error?.message,
    teachersQuery.error?.message,
  ].filter(Boolean);
  const setupMissing = [
    classes.length === 0 ? "classes" : null,
    subjects.length === 0 ? "subjects" : null,
    teachers.length === 0 ? "teaching staff" : null,
  ].filter(Boolean) as string[];

  async function handleMessageHod(intervention: AcademicIntervention) {
    setNotifyingId(intervention.id);
    try {
      const response = await requestDashboardApi<MutationResponse>(
        `/exams/interventions/${encodeURIComponent(intervention.id)}/notify-hod`,
        {
          method: "POST",
          body: {
            message: `Please review the ${intervention.subject} intervention for ${intervention.student_name}: ${intervention.trigger_reason}`,
          },
        },
      );
      toast.success(response.message || "HOD follow-up sent.");
      await refetch();
    } catch (mutationError) {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : "The HOD follow-up could not be sent.",
      );
    } finally {
      setNotifyingId(null);
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.classSectionId || !form.subjectId || !form.ownerUserId) {
      toast.error("Select a school class, subject, and responsible teacher.");
      return;
    }
    if (!form.reason.trim() || !form.plan.trim()) {
      toast.error("Enter both the intervention reason and support plan.");
      return;
    }
    if (form.startsOn && form.dueOn && form.dueOn < form.startsOn) {
      toast.error("The review date cannot be before the start date.");
      return;
    }

    const payload: CreateInterventionPayload = {
      class_section_id: form.classSectionId,
      subject_id: form.subjectId,
      owner_user_id: form.ownerUserId,
      source: "manual",
      trigger_reason: form.reason.trim(),
      plan: form.plan.trim(),
      priority: form.priority,
      ...(form.startsOn ? { starts_on: form.startsOn } : {}),
      ...(form.dueOn ? { due_on: form.dueOn } : {}),
      ...(form.target.trim() ? { target: { description: form.target.trim() } } : {}),
    };

    try {
      const response = await createMutation.mutateAsync(payload);
      toast.success(response.message || "Academic intervention created and assigned.");
      setShowModal(false);
      setForm(createEmptyForm());
      await refetch();
    } catch (mutationError) {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : "The academic intervention could not be created.",
      );
    }
  }

  return (
    <>
      <Panel
        title="Academics Monitoring"
        description="Coordinate school-scoped support plans for weak results, missed learning, and syllabus risks."
        icon={GraduationCap}
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="rounded-lg border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-black text-[#071D49] disabled:opacity-50"
            >
              {isFetching ? "Refreshing..." : "Refresh"}
            </button>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white"
            >
              Create intervention
            </button>
          </div>
        }
      >
        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["Active subjects", metrics?.active_subjects ?? 0],
            ["Active plans", metrics?.active_interventions ?? 0],
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
            <p className="font-bold">Academic monitoring could not be loaded.</p>
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
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-[#F8FAFC] text-[#071D49]">
              <tr>
                <th className="px-4 py-3 font-bold">Learner / scope</th>
                <th className="px-4 py-3 font-bold">Reason and plan</th>
                <th className="px-4 py-3 font-bold">Owner</th>
                <th className="px-4 py-3 font-bold">HOD</th>
                <th className="px-4 py-3 font-bold">Review date</th>
                <th className="px-4 py-3 font-bold">Priority</th>
                <th className="px-4 py-3 font-bold">Status</th>
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
              ) : interventions.length === 0 && !error ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[#64748B]">
                    No academic interventions are active. Create the first measured support plan
                    when a learner, class, or subject needs follow-up.
                  </td>
                </tr>
              ) : (
                interventions.map((intervention) => (
                  <tr
                    key={intervention.id}
                    className="border-t border-[#D8E0EC] align-top hover:bg-[#F8FAFC]"
                  >
                    <td className="px-4 py-3">
                      <div className="font-bold text-[#071D49]">{intervention.student_name}</div>
                      <div className="mt-1 text-xs text-[#64748B]">
                        {intervention.class} / {intervention.subject}
                      </div>
                    </td>
                    <td className="max-w-[280px] px-4 py-3 text-[#64748B]">
                      <div className="font-semibold text-[#071D49]">
                        {intervention.trigger_reason}
                      </div>
                      <div className="mt-1 line-clamp-2">{intervention.plan}</div>
                    </td>
                    <td className="px-4 py-3 text-[#64748B]">{intervention.teacher}</td>
                    <td className="px-4 py-3 text-[#64748B]">
                      {intervention.hod_name ?? "Not assigned"}
                    </td>
                    <td className="px-4 py-3 text-[#64748B]">
                      {formatDate(intervention.due_on)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusChip
                        label={titleCase(intervention.priority)}
                        tone={priorityTone(intervention.priority)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <StatusChip
                        label={titleCase(intervention.status)}
                        tone={statusTone(intervention.status)}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => void handleMessageHod(intervention)}
                        disabled={notifyingId === intervention.id}
                        className="rounded-lg border border-[#BFDBFE] bg-[#EEF5FF] px-3 py-2 text-xs font-black text-[#0B63CE] disabled:opacity-50"
                      >
                        {notifyingId === intervention.id ? "Sending..." : "Message HOD"}
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
        open={showModal}
        title="Create academic intervention"
        description="Assign a real school class, subject, and responsible teacher. The plan will be shared with the Dean and relevant HOD."
        onClose={() => {
          if (!createMutation.isPending) setShowModal(false);
        }}
        size="lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              disabled={createMutation.isPending}
              className="rounded-lg border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-bold text-[#071D49] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-academic-intervention"
              disabled={createMutation.isPending || setupMissing.length > 0}
              className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-50"
            >
              {createMutation.isPending ? "Creating..." : "Create and assign"}
            </button>
          </>
        }
      >
        <form id="create-academic-intervention" onSubmit={handleCreate} className="space-y-4">
          {setupErrors.length > 0 ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              Academic setup options could not be loaded: {setupErrors.join(" ")}
            </div>
          ) : null}
          {setupMissing.length > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Complete {setupMissing.join(", ")} in Academic Setup before assigning an
              intervention.
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold text-[#071D49]">
              Class / form / grade
              <select
                required
                value={form.classSectionId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, classSectionId: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white px-3 py-2 font-normal"
              >
                <option value="">Select school class</option>
                {classes.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-bold text-[#071D49]">
              Subject / learning area
              <select
                required
                value={form.subjectId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, subjectId: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white px-3 py-2 font-normal"
              >
                <option value="">Select school subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-sm font-bold text-[#071D49]">
            Responsible teacher
            <select
              required
              value={form.ownerUserId}
              onChange={(event) =>
                setForm((current) => ({ ...current, ownerUserId: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white px-3 py-2 font-normal"
            >
              <option value="">Select active teaching staff</option>
              {teachers.map((teacher) => (
                <option key={teacher.value} value={teacher.value}>
                  {teacher.label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold text-[#071D49]">
              Priority
              <select
                value={form.priority}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    priority: event.target.value as CreateForm["priority"],
                  }))
                }
                className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white px-3 py-2 font-normal"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
            <label className="text-sm font-bold text-[#071D49]">
              Measurable target
              <input
                value={form.target}
                onChange={(event) =>
                  setForm((current) => ({ ...current, target: event.target.value }))
                }
                placeholder="e.g. Reach 60% by the next assessment"
                className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 font-normal"
              />
            </label>
          </div>

          <label className="block text-sm font-bold text-[#071D49]">
            Intervention reason
            <textarea
              required
              rows={3}
              value={form.reason}
              onChange={(event) =>
                setForm((current) => ({ ...current, reason: event.target.value }))
              }
              placeholder="State the verified performance, attendance, or learning concern."
              className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 font-normal"
            />
          </label>

          <label className="block text-sm font-bold text-[#071D49]">
            Support plan
            <textarea
              required
              rows={4}
              value={form.plan}
              onChange={(event) =>
                setForm((current) => ({ ...current, plan: event.target.value }))
              }
              placeholder="Describe the support actions, frequency, evidence owner, and review method."
              className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 font-normal"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold text-[#071D49]">
              Starts on
              <input
                type="date"
                value={form.startsOn}
                onChange={(event) =>
                  setForm((current) => ({ ...current, startsOn: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 font-normal"
              />
            </label>
            <label className="text-sm font-bold text-[#071D49]">
              Review due
              <input
                type="date"
                value={form.dueOn}
                onChange={(event) =>
                  setForm((current) => ({ ...current, dueOn: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 font-normal"
              />
            </label>
          </div>
        </form>
      </Modal>
    </>
  );
}
