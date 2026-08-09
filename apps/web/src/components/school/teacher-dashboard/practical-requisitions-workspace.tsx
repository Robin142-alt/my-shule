"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { CheckCircle2, FlaskConical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import {
  SaveState,
  StatusChip,
  WorkspaceEmpty,
  WorkspaceError,
} from "@/components/school/laboratory-technician/shared";
import {
  LAB_UNITS,
  PRACTICAL_STATUS_LABELS,
  formatKenyanDate,
  statusTone,
  type LaboratoryActionResponse,
  type PracticalRequest,
} from "@/components/school/laboratory-technician/types";
import {
  createSubmissionId,
  isPendingSync,
  useLaboratoryMutation,
} from "@/components/school/laboratory-technician/use-laboratory-mutation";

import { Panel } from "./shared-components";

type RequestItemDraft = {
  key: string;
  item_name: string;
  requested_quantity: string;
  unit: string;
  custom_unit: string;
  is_returnable: boolean;
  notes: string;
};

type RequisitionDraft = {
  subject: string;
  class_name: string;
  practical_date: string;
  lesson_time: string;
  practical_title: string;
  learner_groups: string;
  teacher_notes: string;
  submission_id: string;
  items: RequestItemDraft[];
};

type FieldErrors = Partial<
  Record<
    | "subject"
    | "class_name"
    | "practical_date"
    | "lesson_time"
    | "practical_title"
    | "learner_groups"
    | "items",
    string
  >
>;

const fieldClass =
  "mt-1 min-h-11 w-full rounded-xl border border-[#C8D5EA] bg-white px-3 text-sm text-[#071D49] outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100";
const invalidFieldClass =
  "border-rose-400 focus:border-rose-500 focus:ring-rose-100";

function requestItem(): RequestItemDraft {
  return {
    key: createSubmissionId("teacher-practical-item"),
    item_name: "",
    requested_quantity: "",
    unit: "Pieces",
    custom_unit: "",
    is_returnable: true,
    notes: "",
  };
}

function emptyDraft(): RequisitionDraft {
  return {
    subject: "",
    class_name: "",
    practical_date: "",
    lesson_time: "",
    practical_title: "",
    learner_groups: "",
    teacher_notes: "",
    submission_id: createSubmissionId("teacher-practical-request"),
    items: [requestItem()],
  };
}

function numberValue(value: string | number | null | undefined) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function firstErrorField(errors: FieldErrors) {
  return (
    [
      "subject",
      "class_name",
      "practical_date",
      "lesson_time",
      "practical_title",
      "learner_groups",
      "items",
    ] as const
  ).find((field) => errors[field]);
}

function draftStorageKey(tenantId?: string | null, userId?: string | null) {
  return tenantId && userId
    ? `myshule:teacher-practical-requisition:${tenantId}:${userId}`
    : null;
}

export function PracticalRequisitionsWorkspace() {
  const liveSession = useLiveTenantSession("school");
  const formRef = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState<RequisitionDraft>(() => emptyDraft());
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saveState, setSaveState] = useState<
    "saved" | "saving" | "failed" | "pending_sync" | null
  >(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);

  const teacherId = liveSession.session?.user.user_id ?? null;
  const teacherName =
    liveSession.session?.user.display_name ||
    liveSession.user?.display_name ||
    liveSession.session?.user.email ||
    "Current teacher";
  const storageKey = draftStorageKey(liveSession.session?.tenantId, teacherId);

  const requestsQuery = useSchoolQuery<PracticalRequest[]>("/labs/requests", {
    enabled: Boolean(liveSession.session),
  });
  const myRequests = useMemo(
    () =>
      (requestsQuery.data ?? [])
        .filter(
          (request) =>
            request.teacher_id === teacherId ||
            (!request.teacher_id && request.teacher_name === teacherName),
        )
        .sort((left, right) =>
          `${right.practical_date}T${right.lesson_time}`.localeCompare(
            `${left.practical_date}T${left.lesson_time}`,
          ),
        ),
    [requestsQuery.data, teacherId, teacherName],
  );

  useEffect(() => {
    if (!storageKey) return;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as RequisitionDraft;
        if (Array.isArray(parsed.items) && parsed.items.length > 0) {
          setDraft(parsed);
        }
      }
    } catch {
      // A corrupt local draft must not prevent a teacher from using the form.
    } finally {
      setDraftLoaded(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || !draftLoaded) return;
    window.localStorage.setItem(storageKey, JSON.stringify(draft));
  }, [draft, draftLoaded, storageKey]);

  const createRequest = useLaboratoryMutation<
    LaboratoryActionResponse<{ request: PracticalRequest }>,
    Record<string, unknown>
  >({
    action: "teacher-practical-requisition",
    path: "/labs/practical-requests",
    onSuccess: (data) => {
      if (isPendingSync(data)) {
        setSaveState("pending_sync");
        setConfirmation(
          "This practical request is saved on this device and is waiting to sync. The laboratory has not received it yet.",
        );
        return;
      }

      setSaveState("saved");
      setConfirmation(data.message);
      toast.success(data.message);
      const next = emptyDraft();
      setDraft(next);
      setErrors({});
      if (storageKey) window.localStorage.removeItem(storageKey);
    },
    onError: (error) => {
      setSaveState("failed");
      setConfirmation(null);
      toast.error(
        "The practical request was not sent. Your entries are still here.",
      );
      setErrors((current) => ({
        ...current,
        items:
          error.message ||
          "The practical request was not sent. Check your entries and retry.",
      }));
    },
  });

  function updateDraft<K extends keyof RequisitionDraft>(
    field: K,
    value: RequisitionDraft[K],
  ) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setConfirmation(null);
  }

  function updateItem<K extends keyof RequestItemDraft>(
    index: number,
    field: K,
    value: RequestItemDraft[K],
  ) {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
    setErrors((current) => ({ ...current, items: undefined }));
    setConfirmation(null);
  }

  function addItem() {
    setDraft((current) => ({
      ...current,
      items: [...current.items, requestItem()],
    }));
  }

  function removeItem(index: number) {
    setDraft((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function validate() {
    const next: FieldErrors = {};
    if (!draft.subject.trim()) next.subject = "Enter the subject.";
    if (!draft.class_name.trim())
      next.class_name = "Enter the class and stream.";
    if (!draft.practical_date.trim())
      next.practical_date = "Enter the practical date.";
    if (!draft.lesson_time.trim()) next.lesson_time = "Enter the lesson time.";
    if (!draft.practical_title.trim())
      next.practical_title = "Enter the practical title or purpose.";
    if (
      !Number.isInteger(Number(draft.learner_groups)) ||
      Number(draft.learner_groups) < 1
    ) {
      next.learner_groups = "Enter at least one learner group.";
    }
    if (
      !draft.items.length ||
      draft.items.some(
        (item) =>
          !item.item_name.trim() ||
          numberValue(item.requested_quantity) <= 0 ||
          !(item.unit === "Custom" ? item.custom_unit.trim() : item.unit),
      )
    ) {
      next.items =
        "Enter an item name, quantity and unit for every requested item.";
    }
    setErrors(next);
    const first = firstErrorField(next);
    if (first) {
      requestAnimationFrame(() => {
        formRef.current
          ?.querySelector<HTMLElement>(`[data-field="${first}"]`)
          ?.focus();
      });
    }
    return Object.keys(next).length === 0;
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;
    if (!liveSession.session) {
      setErrors({
        items: "Your teacher session is not ready. Refresh and try again.",
      });
      return;
    }

    setSaveState("saving");
    setConfirmation(null);
    createRequest.mutate({
      subject: draft.subject.trim(),
      class_name: draft.class_name.trim(),
      practical_date: draft.practical_date.trim(),
      lesson_time: draft.lesson_time,
      practical_title: draft.practical_title.trim(),
      teacher_id: teacherId ?? undefined,
      teacher_name: teacherName,
      learner_groups: Number(draft.learner_groups),
      teacher_notes: draft.teacher_notes.trim() || undefined,
      submission_id: draft.submission_id,
      items: draft.items.map((item) => ({
        item_name: item.item_name.trim(),
        requested_quantity: numberValue(item.requested_quantity),
        unit: item.unit === "Custom" ? item.custom_unit.trim() : item.unit,
        is_returnable: item.is_returnable,
        notes: item.notes.trim() || undefined,
      })),
    });
  }

  return (
    <div className="space-y-5">
      <Panel
        title="Practical Requisitions"
        description="Request apparatus, chemicals and consumables for an upcoming lesson. The Laboratory Technician will confirm what is available."
        icon={FlaskConical}
      >
        <form ref={formRef} onSubmit={submit} className="space-y-5" noValidate>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
            <p className="font-black">Requesting as {teacherName}</p>
            <p className="mt-1 leading-6">
              Sending this request does not deduct stock. The Laboratory
              Technician will review and prepare the available items.
            </p>
          </div>

          {confirmation ? (
            <div
              role="status"
              className={`rounded-xl border p-4 text-sm font-bold ${
                saveState === "pending_sync"
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : "border-emerald-200 bg-emerald-50 text-emerald-900"
              }`}
            >
              <CheckCircle2
                className="mr-2 inline h-5 w-5"
                aria-hidden="true"
              />
              {confirmation}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Subject" error={errors.subject} dataField="subject">
              <input
                data-field="subject"
                value={draft.subject}
                onChange={(event) => updateDraft("subject", event.target.value)}
                placeholder="e.g. Biology"
                aria-invalid={Boolean(errors.subject)}
                className={`${fieldClass} ${errors.subject ? invalidFieldClass : ""}`}
              />
            </Field>
            <Field
              label="Class and Stream"
              error={errors.class_name}
              dataField="class_name"
            >
              <input
                data-field="class_name"
                value={draft.class_name}
                onChange={(event) =>
                  updateDraft("class_name", event.target.value)
                }
                placeholder="e.g. Form 2 North"
                aria-invalid={Boolean(errors.class_name)}
                className={`${fieldClass} ${errors.class_name ? invalidFieldClass : ""}`}
              />
            </Field>
            <Field
              label="Practical Date"
              hint="Use DD/MM/YYYY, for example 18/08/2026."
              error={errors.practical_date}
              dataField="practical_date"
            >
              <input
                data-field="practical_date"
                inputMode="numeric"
                value={draft.practical_date}
                onChange={(event) =>
                  updateDraft("practical_date", event.target.value)
                }
                placeholder="DD/MM/YYYY"
                aria-invalid={Boolean(errors.practical_date)}
                className={`${fieldClass} ${errors.practical_date ? invalidFieldClass : ""}`}
              />
            </Field>
            <Field
              label="Lesson Time"
              error={errors.lesson_time}
              dataField="lesson_time"
            >
              <input
                data-field="lesson_time"
                type="time"
                value={draft.lesson_time}
                onChange={(event) =>
                  updateDraft("lesson_time", event.target.value)
                }
                aria-invalid={Boolean(errors.lesson_time)}
                className={`${fieldClass} ${errors.lesson_time ? invalidFieldClass : ""}`}
              />
            </Field>
            <Field
              label="Practical Title or Purpose"
              error={errors.practical_title}
              dataField="practical_title"
            >
              <input
                data-field="practical_title"
                value={draft.practical_title}
                onChange={(event) =>
                  updateDraft("practical_title", event.target.value)
                }
                placeholder="e.g. Food tests"
                aria-invalid={Boolean(errors.practical_title)}
                className={`${fieldClass} ${errors.practical_title ? invalidFieldClass : ""}`}
              />
            </Field>
            <Field
              label="Number of Learners or Groups"
              error={errors.learner_groups}
              dataField="learner_groups"
            >
              <input
                data-field="learner_groups"
                type="number"
                inputMode="numeric"
                min="1"
                value={draft.learner_groups}
                onChange={(event) =>
                  updateDraft("learner_groups", event.target.value)
                }
                placeholder="e.g. 10"
                aria-invalid={Boolean(errors.learner_groups)}
                className={`${fieldClass} ${errors.learner_groups ? invalidFieldClass : ""}`}
              />
            </Field>
          </div>

          <section aria-labelledby="requested-items-heading">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3
                  id="requested-items-heading"
                  className="font-black text-[#071D49]"
                >
                  Requested Items
                </h3>
                <p className="mt-1 text-sm text-[#64748B]">
                  Add each item and the quantity needed for the whole lesson.
                </p>
              </div>
              <Button type="button" variant="secondary" onClick={addItem}>
                <Plus className="h-4 w-4" /> Add Another Item
              </Button>
            </div>

            {errors.items ? (
              <p role="alert" className="mb-3 text-sm font-bold text-rose-700">
                {errors.items}
              </p>
            ) : null}

            <div className="grid gap-3">
              {draft.items.map((item, index) => (
                <article
                  key={item.key}
                  className="rounded-2xl border border-[#D8E0EC] bg-[#F8FAFC] p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="font-black text-[#071D49]">
                      Item {index + 1}
                    </p>
                    {draft.items.length > 1 ? (
                      <button
                        type="button"
                        aria-label={`Remove item ${index + 1}`}
                        onClick={() => removeItem(index)}
                        className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="text-sm font-black text-[#071D49] lg:col-span-2">
                      Item Name
                      <input
                        data-field={index === 0 ? "items" : undefined}
                        value={item.item_name}
                        onChange={(event) =>
                          updateItem(index, "item_name", event.target.value)
                        }
                        placeholder="e.g. Test tubes"
                        aria-invalid={Boolean(errors.items)}
                        className={`${fieldClass} ${errors.items ? invalidFieldClass : ""}`}
                      />
                    </label>
                    <label className="text-sm font-black text-[#071D49]">
                      Quantity Needed
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0.001"
                        step="any"
                        value={item.requested_quantity}
                        onChange={(event) =>
                          updateItem(
                            index,
                            "requested_quantity",
                            event.target.value,
                          )
                        }
                        aria-invalid={Boolean(errors.items)}
                        className={`${fieldClass} ${errors.items ? invalidFieldClass : ""}`}
                      />
                    </label>
                    <label className="text-sm font-black text-[#071D49]">
                      Unit
                      <select
                        value={item.unit}
                        onChange={(event) =>
                          updateItem(index, "unit", event.target.value)
                        }
                        className={fieldClass}
                      >
                        {LAB_UNITS.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </select>
                    </label>
                    {item.unit === "Custom" ? (
                      <label className="text-sm font-black text-[#071D49]">
                        Custom Unit
                        <input
                          value={item.custom_unit}
                          onChange={(event) =>
                            updateItem(index, "custom_unit", event.target.value)
                          }
                          placeholder="Enter unit"
                          className={fieldClass}
                        />
                      </label>
                    ) : null}
                    <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[#C8D5EA] bg-white px-3 text-sm font-black text-[#071D49] lg:col-span-2 lg:mt-6">
                      <input
                        type="checkbox"
                        checked={item.is_returnable}
                        onChange={(event) =>
                          updateItem(
                            index,
                            "is_returnable",
                            event.target.checked,
                          )
                        }
                      />
                      Returnable after the practical
                    </label>
                    <label className="text-sm font-black text-[#071D49] lg:col-span-2">
                      Item Note (optional)
                      <input
                        value={item.notes}
                        onChange={(event) =>
                          updateItem(index, "notes", event.target.value)
                        }
                        placeholder="e.g. 10 ml per group"
                        className={fieldClass}
                      />
                    </label>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <label className="block text-sm font-black text-[#071D49]">
            Teacher Notes (optional)
            <textarea
              value={draft.teacher_notes}
              onChange={(event) =>
                updateDraft("teacher_notes", event.target.value)
              }
              placeholder="Share any preparation instructions the technician needs."
              className={`${fieldClass} min-h-24 py-3`}
            />
          </label>

          <div className="sticky bottom-0 -mx-5 flex flex-col gap-3 border-t border-[#D8E0EC] bg-white/95 px-5 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <SaveState state={saveState} />
            <Button
              type="submit"
              size="lg"
              disabled={createRequest.isPending || !liveSession.session}
              className="w-full sm:w-auto"
            >
              {createRequest.isPending
                ? "Sending Request…"
                : "Send Practical Request"}
            </Button>
          </div>
        </form>
      </Panel>

      <Panel
        title="My Practical Requests"
        description="Follow the Laboratory Technician's preparation status for requests you submitted."
        icon={FlaskConical}
      >
        {requestsQuery.isLoading ? (
          <div className="rounded-xl border border-[#D8E0EC] p-8 text-center text-sm text-[#64748B]">
            Loading your practical requests…
          </div>
        ) : requestsQuery.error ? (
          <WorkspaceError
            message={requestsQuery.error.message}
            onRetry={() => void requestsQuery.refetch()}
          />
        ) : myRequests.length === 0 ? (
          <WorkspaceEmpty
            title="You have not sent a practical request yet."
            description="Complete the requisition above so the Laboratory Technician can check and prepare the lesson items."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {myRequests.map((request) => (
              <article
                key={request.id}
                className="rounded-2xl border border-[#D8E0EC] p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-black text-[#071D49]">
                      {request.subject} · {request.class_name}
                    </p>
                    <p className="mt-1 text-sm text-[#334155]">
                      {request.practical_title}
                    </p>
                  </div>
                  <StatusChip
                    label={
                      PRACTICAL_STATUS_LABELS[request.status] ?? request.status
                    }
                    tone={statusTone(request.status)}
                  />
                </div>
                <p className="mt-3 text-sm text-[#64748B]">
                  {formatKenyanDate(request.practical_date)} at{" "}
                  {request.lesson_time}
                </p>
                <div className="mt-3 space-y-1 text-sm text-[#334155]">
                  {request.items.map((item) => (
                    <p key={item.id}>
                      {item.item_name}: {item.requested_quantity} {item.unit}
                    </p>
                  ))}
                </div>
                {request.rejection_reason ? (
                  <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">
                    Reason: {request.rejection_reason}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  dataField: string;
  children: ReactNode;
}) {
  return (
    <label className="text-sm font-black text-[#071D49]">
      {label}
      {children}
      {hint && !error ? (
        <span className="mt-1 block text-xs font-medium text-[#64748B]">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span className="mt-1 block text-xs font-bold text-rose-700">
          {error}
        </span>
      ) : null}
    </label>
  );
}
