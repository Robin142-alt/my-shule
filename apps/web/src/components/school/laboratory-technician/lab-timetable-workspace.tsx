"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Check,
  ClipboardList,
  LockKeyhole,
  Plus,
  Send,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useSchoolQuery } from "@/lib/data/school-hooks";

import {
  LabQuickActions,
  Panel,
  SaveState,
  StatusChip,
  WorkspaceEmpty,
  WorkspaceError,
} from "./shared";
import {
  LAB_UNITS,
  PRACTICAL_STATUS_LABELS,
  formatKenyanDate,
  statusTone,
  type LabInventoryData,
  type LaboratoryActionResponse,
  type PracticalRequest,
} from "./types";
import {
  createSubmissionId,
  isPendingSync,
  useLaboratoryMutation,
} from "./use-laboratory-mutation";

type SaveIndicator = "saved" | "saving" | "failed" | "pending_sync" | null;
type WorkspaceMode = "new" | "review" | "prepare" | "details" | null;

type NewRequestItem = {
  key: string;
  item_id: string;
  item_source: "equipment" | "chemical" | "";
  item_name: string;
  requested_quantity: string;
  unit: string;
  is_returnable: boolean;
  notes: string;
};

type ReviewItem = {
  request_item_id: string;
  item_name: string;
  unit: string;
  requested_quantity: number;
  available_quantity: number;
  substitute_available_quantity: number | null;
  approved_quantity: string;
  substitute_item_id: string;
  substitute_item_name: string;
  note: string;
};

type PreparationItem = {
  key: string;
  request_item_id?: string;
  item_id: string;
  item_source: "equipment" | "chemical" | "";
  original_item_name: string;
  item_name: string;
  unit: string;
  requested_quantity: number;
  available_quantity: number;
  prepared_quantity: string;
  is_returnable: boolean;
  substitute_item_id: string;
  substitute_item_name: string;
  note: string;
};

const fieldClass =
  "min-h-11 w-full rounded-xl border border-[#C8D5EA] bg-white px-3 text-sm text-[#071D49] outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100";
const labelClass = "mb-1.5 block text-sm font-black text-[#071D49]";

function asNumber(value: string | number | null | undefined) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function mutationError(error: Error | null) {
  return (
    error?.message ||
    "The request could not be saved. Your entered information is still here."
  );
}

function newItemRow(): NewRequestItem {
  return {
    key: createSubmissionId("request-item"),
    item_id: "",
    item_source: "",
    item_name: "",
    requested_quantity: "",
    unit: "Pieces",
    is_returnable: true,
    notes: "",
  };
}

const SECURE_ASSESSMENT_ROLES = [
  "LAB_TECHNICIAN",
  "PRINCIPAL",
  "DEPUTY_PRINCIPAL",
  "DEAN_ACADEMICS",
  "EXAMS_MANAGER",
] as const;

function newRequestForm() {
  return {
    subject: "",
    class_name: "",
    practical_date: "",
    lesson_time: "",
    practical_title: "",
    teacher_name: "",
    learner_groups: "",
    teacher_notes: "",
    is_assessment: false,
    confidential_notes: "",
    items: [newItemRow()],
  };
}

function navigateToIssue(requestId: string) {
  const path = window.location.pathname.replace(
    /\/lab-timetable\/?$/,
    "/apparatus-issue",
  );
  window.location.assign(
    `${path}?action=issue&request=${encodeURIComponent(requestId)}`,
  );
}

export function LabTimetableWorkspace() {
  const requestsQuery = useSchoolQuery<PracticalRequest[]>("/labs/requests");
  const inventoryQuery = useSchoolQuery<LabInventoryData>("/labs/inventory");
  const requests = useMemo(
    () =>
      [...(requestsQuery.data ?? [])].sort((left, right) =>
        `${left.practical_date}T${left.lesson_time}`.localeCompare(
          `${right.practical_date}T${right.lesson_time}`,
        ),
      ),
    [requestsQuery.data],
  );
  const inventory = useMemo(
    () => inventoryQuery.data?.items ?? [],
    [inventoryQuery.data],
  );

  const [mode, setMode] = useState<WorkspaceMode>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null,
  );
  const selectedRequest =
    requests.find((request) => request.id === selectedRequestId) ?? null;
  const [saveState, setSaveState] = useState<SaveIndicator>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [requestForm, setRequestForm] = useState(newRequestForm);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [rejectionReason, setRejectionReason] = useState("");
  const [preparationItems, setPreparationItems] = useState<PreparationItem[]>(
    [],
  );
  const [preparationNote, setPreparationNote] = useState("");
  const [requestSubmissionId, setRequestSubmissionId] = useState(() =>
    createSubmissionId("practical-request"),
  );
  const [reviewSubmissionId, setReviewSubmissionId] = useState(() =>
    createSubmissionId("practical-review"),
  );
  const [preparationSubmissionId, setPreparationSubmissionId] = useState(() =>
    createSubmissionId("practical-preparation"),
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get("action");
    const requestId = params.get("request");
    if (requestId) setSelectedRequestId(requestId);
    if (action === "prepare") setMode("prepare");
  }, []);

  useEffect(() => {
    if (!requests.length || selectedRequestId) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("action") === "prepare") {
      const firstActionable = requests.find((request) =>
        [
          "requested",
          "under_review",
          "partially_available",
          "preparing",
        ].includes(request.status),
      );
      if (firstActionable) setSelectedRequestId(firstActionable.id);
    }
  }, [requests, selectedRequestId]);

  useEffect(() => {
    if (!selectedRequest) return;
    setReviewItems(
      selectedRequest.items.map((item) => {
        const requested = asNumber(item.requested_quantity);
        const available = asNumber(item.available_quantity);
        return {
          request_item_id: item.id,
          item_name: item.item_name,
          unit: item.unit,
          requested_quantity: requested,
          available_quantity: available,
          substitute_available_quantity: item.substitute_item_id
            ? asNumber(
                inventory.find((stock) => stock.id === item.substitute_item_id)
                  ?.quantity_available,
              )
            : null,
          approved_quantity: String(
            item.approved_quantity ?? Math.min(requested, available),
          ),
          substitute_item_id: item.substitute_item_id ?? "",
          substitute_item_name: item.substitute_item_name ?? "",
          note: item.note ?? "",
        };
      }),
    );
    setPreparationItems(
      selectedRequest.items.map((item) => {
        const requested = asNumber(item.requested_quantity);
        const available = asNumber(item.available_quantity);
        const substituteStock = item.substitute_item_id
          ? inventory.find((stock) => stock.id === item.substitute_item_id)
          : null;
        return {
          key: item.id,
          request_item_id: item.id,
          item_id: substituteStock?.id ?? item.item_id ?? "",
          item_source: substituteStock?.item_source ?? item.item_source ?? "",
          original_item_name: item.item_name,
          item_name: item.substitute_item_name ?? item.item_name,
          unit: item.unit,
          requested_quantity: requested,
          available_quantity: substituteStock
            ? asNumber(substituteStock.quantity_available)
            : available,
          prepared_quantity: String(
            (item.prepared_quantity || item.approved_quantity) ??
              Math.min(requested, available),
          ),
          is_returnable: item.is_returnable,
          substitute_item_id: item.substitute_item_id ?? "",
          substitute_item_name: item.substitute_item_name ?? "",
          note: item.note ?? "",
        };
      }),
    );
    setPreparationNote(selectedRequest.preparation_note ?? "");
    setRejectionReason(selectedRequest.rejection_reason ?? "");
    setFormError(null);
    setSaveState(null);
  }, [inventory, selectedRequest]);

  const createMutation = useLaboratoryMutation<
    LaboratoryActionResponse<{ request: PracticalRequest }>,
    Record<string, unknown>
  >({
    action: "create-practical-request",
    path: "/labs/practical-requests",
    onSuccess: (data) => {
      if (isPendingSync(data)) {
        setSaveState("pending_sync");
        return;
      }
      setSaveState("saved");
      toast.success(data.message);
      setMode(null);
      setRequestSubmissionId(createSubmissionId("practical-request"));
      setRequestForm(newRequestForm());
    },
    onError: (error) => {
      setSaveState("failed");
      setFormError(mutationError(error));
    },
  });

  const reviewMutation = useLaboratoryMutation<
    LaboratoryActionResponse<{ request: PracticalRequest }>,
    { requestId: string; payload: Record<string, unknown> }
  >({
    action: "review-practical-request",
    method: "PATCH",
    path: ({ requestId }) => `/labs/practical-requests/${requestId}/review`,
    body: ({ payload }) => payload,
    onSuccess: (data) => {
      if (isPendingSync(data)) {
        setSaveState("pending_sync");
        return;
      }
      setSaveState("saved");
      toast.success(data.message);
      setMode(null);
    },
    onError: (error) => {
      setSaveState("failed");
      setFormError(mutationError(error));
    },
  });

  const preparationMutation = useLaboratoryMutation<
    LaboratoryActionResponse<{ request: PracticalRequest }>,
    { requestId: string; payload: Record<string, unknown> }
  >({
    action: "prepare-practical",
    method: "PATCH",
    path: ({ requestId }) =>
      `/labs/practical-requests/${requestId}/preparation`,
    body: ({ payload }) => payload,
    onSuccess: (data) => {
      if (isPendingSync(data)) {
        setSaveState("pending_sync");
        return;
      }
      setSaveState("saved");
      toast.success(data.message);
      setMode(null);
    },
    onError: (error) => {
      setSaveState("failed");
      setFormError(mutationError(error));
    },
  });

  function openRequest(
    request: PracticalRequest,
    nextMode: Exclude<WorkspaceMode, "new" | null>,
  ) {
    setSelectedRequestId(request.id);
    if (nextMode === "review") {
      setReviewSubmissionId(createSubmissionId("practical-review"));
    }
    if (nextMode === "prepare") {
      setPreparationSubmissionId(
        createSubmissionId("practical-preparation"),
      );
    }
    setMode(nextMode);
    setSaveState(null);
    setFormError(null);
  }

  function selectInventoryForRequest(index: number, itemId: string) {
    const selected = inventory.find((item) => item.id === itemId);
    setRequestForm((current) => ({
      ...current,
      items: current.items.map((row, rowIndex) =>
        rowIndex !== index || !selected
          ? row
          : {
              ...row,
              item_id: selected.id,
              item_source: selected.item_source,
              item_name: selected.item_name,
              unit: selected.unit,
              is_returnable:
                selected.item_type === "apparatus" ||
                selected.item_type === "safety_equipment",
            },
      ),
    }));
  }

  function submitNewRequest() {
    setFormError(null);
    const validItems = requestForm.items.filter(
      (item) => item.item_name.trim() && asNumber(item.requested_quantity) > 0,
    );
    if (
      !requestForm.subject.trim() ||
      !requestForm.class_name.trim() ||
      !requestForm.practical_date.trim() ||
      !requestForm.lesson_time.trim() ||
      !requestForm.practical_title.trim() ||
      !requestForm.teacher_name.trim()
    ) {
      setFormError(
        "Enter the subject, class and stream, date, lesson time, practical title and teacher.",
      );
      return;
    }
    if (!validItems.length) {
      setFormError("Add at least one requested item and quantity.");
      return;
    }
    setSaveState("saving");
    const {
      is_assessment: isAssessment,
      confidential_notes: confidentialNotes,
      ...ordinaryRequest
    } = requestForm;
    createMutation.mutate({
      ...ordinaryRequest,
      is_assessment: isAssessment,
      ...(isAssessment
        ? {
            confidential_notes: confidentialNotes.trim() || undefined,
            authorized_roles: [...SECURE_ASSESSMENT_ROLES],
          }
        : {}),
      learner_groups: requestForm.learner_groups
        ? asNumber(requestForm.learner_groups)
        : undefined,
      submission_id: requestSubmissionId,
      items: validItems.map(({ key: _key, ...item }) => ({
        ...item,
        item_id: item.item_id || undefined,
        item_source: item.item_source || undefined,
        requested_quantity: asNumber(item.requested_quantity),
        notes: item.notes || undefined,
      })),
    });
  }

  function submitReview(
    status: "preparing" | "partially_available" | "rejected",
  ) {
    if (!selectedRequest) return;
    if (status === "rejected" && !rejectionReason.trim()) {
      setFormError(
        "Give a short reason so the teacher knows why the request was rejected.",
      );
      return;
    }
    const overApproved = reviewItems.find((item) => {
      const usableQuantity =
        item.substitute_available_quantity ?? item.available_quantity;
      return asNumber(item.approved_quantity) > usableQuantity + 0.0001;
    });
    if (status !== "rejected" && overApproved) {
      setFormError(
        `${overApproved.item_name} cannot be approved above the available quantity. Record the shortage or choose an available substitute.`,
      );
      return;
    }
    setFormError(null);
    setSaveState("saving");
    reviewMutation.mutate({
      requestId: selectedRequest.id,
      payload: {
        submission_id: reviewSubmissionId,
        status,
        reason: status === "rejected" ? rejectionReason.trim() : undefined,
        items: reviewItems.map((item) => ({
          request_item_id: item.request_item_id,
          approved_quantity: asNumber(item.approved_quantity),
          substitute_item_id: item.substitute_item_id || undefined,
          substitute_item_name: item.substitute_item_name || undefined,
          note: item.note || undefined,
        })),
      },
    });
  }

  function selectReviewSubstitute(index: number, itemId: string) {
    const selected = inventory.find((item) => item.id === itemId);
    setReviewItems((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              substitute_item_id: selected?.id ?? "",
              substitute_item_name: selected?.item_name ?? "",
              substitute_available_quantity: selected
                ? asNumber(selected.quantity_available)
                : null,
              approved_quantity: selected
                ? String(
                    Math.min(
                      row.requested_quantity,
                      asNumber(selected.quantity_available),
                    ),
                  )
                : String(
                    Math.min(row.requested_quantity, row.available_quantity),
                  ),
            }
          : row,
      ),
    );
  }

  function selectSubstitute(index: number, itemId: string) {
    const selected = inventory.find((item) => item.id === itemId);
    if (!selected) return;
    setPreparationItems((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              item_id: selected.id,
              item_source: selected.item_source,
              item_name: selected.item_name,
              unit: selected.unit,
              available_quantity: asNumber(selected.quantity_available),
              substitute_item_id: selected.id,
              substitute_item_name: selected.item_name,
              is_returnable:
                selected.item_type === "apparatus" ||
                selected.item_type === "safety_equipment",
            }
          : row,
      ),
    );
  }

  function addNecessaryItem() {
    setPreparationItems((current) => [
      ...current,
      {
        key: createSubmissionId("necessary-item"),
        item_id: "",
        item_source: "",
        original_item_name: "Additional item",
        item_name: "",
        unit: "Pieces",
        requested_quantity: 0,
        available_quantity: 0,
        prepared_quantity: "",
        is_returnable: true,
        substitute_item_id: "",
        substitute_item_name: "",
        note: "Needed for preparation",
      },
    ]);
  }

  function selectNecessaryItem(index: number, itemId: string) {
    const selected = inventory.find((item) => item.id === itemId);
    if (!selected) return;
    setPreparationItems((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              item_id: selected.id,
              item_source: selected.item_source,
              item_name: selected.item_name,
              unit: selected.unit,
              available_quantity: asNumber(selected.quantity_available),
              is_returnable:
                selected.item_type === "apparatus" ||
                selected.item_type === "safety_equipment",
            }
          : row,
      ),
    );
  }

  function savePreparation(markReady: boolean) {
    if (!selectedRequest) return;
    const validItems = preparationItems.filter((item) => item.item_name.trim());
    if (!validItems.length) {
      setFormError("Keep at least one item on the preparation checklist.");
      return;
    }
    if (
      validItems.some(
        (item) =>
          asNumber(item.prepared_quantity) > item.available_quantity + 0.0001,
      )
    ) {
      setFormError(
        "A prepared quantity cannot be higher than the quantity currently available.",
      );
      return;
    }
    setFormError(null);
    setSaveState("saving");
    preparationMutation.mutate({
      requestId: selectedRequest.id,
      payload: {
        submission_id: preparationSubmissionId,
        mark_ready: markReady,
        preparation_note: preparationNote || undefined,
        items: validItems.map((item) => ({
          request_item_id: item.request_item_id,
          item_id: item.item_id || undefined,
          item_source: item.item_source || undefined,
          item_name: item.item_name,
          unit: item.unit,
          prepared_quantity: asNumber(item.prepared_quantity),
          is_returnable: item.is_returnable,
          substitute_item_id: item.substitute_item_id || undefined,
          substitute_item_name: item.substitute_item_name || undefined,
          note: item.note || undefined,
        })),
      },
    });
  }

  return (
    <div className="space-y-5">
      <LabQuickActions compact />
      <Panel
        title="Practical Requests"
        description="Check requests in lesson order, confirm what is available and prepare everything from one checklist. Approval does not deduct stock."
        icon={CalendarClock}
        actions={
          <Button
            onClick={() => {
              setMode("new");
              setSaveState(null);
              setFormError(null);
            }}
          >
            <Plus className="h-4 w-4" /> New Practical Request
          </Button>
        }
      >
        {requestsQuery.isLoading ? (
          <div className="rounded-xl border border-[#D8E0EC] p-8 text-center text-sm text-[#64748B]">
            Loading practical requests…
          </div>
        ) : requestsQuery.error ? (
          <WorkspaceError
            message={requestsQuery.error.message}
            onRetry={() => void requestsQuery.refetch()}
          />
        ) : requests.length === 0 ? (
          <WorkspaceEmpty
            title="There are no practical requests awaiting preparation."
            description="Add a practical request when a teacher brings the requisition, or return here to view upcoming practicals."
            actions={
              <Button onClick={() => setMode("new")}>
                Add Practical Request
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3">
            {requests.map((request, index) => {
              const shortages = request.items.filter(
                (item) =>
                  asNumber(item.available_quantity) <
                  asNumber(item.requested_quantity),
              );
              return (
                <article
                  key={request.id}
                  className="rounded-2xl border border-[#D8E0EC] bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-[#071D49] px-2.5 py-1 text-xs font-black text-white">
                          {index + 1}
                        </span>
                        <span className="text-lg font-black text-[#071D49]">
                          {request.lesson_time}
                        </span>
                        <StatusChip
                          label={
                            PRACTICAL_STATUS_LABELS[request.status] ??
                            request.status
                          }
                          tone={statusTone(request.status)}
                        />
                        {request.is_assessment ? (
                          <StatusChip
                            label="Secure Assessment"
                            tone="warning"
                          />
                        ) : null}
                      </div>
                      <h3 className="mt-2 text-base font-black text-[#071D49]">
                        {request.subject} · {request.class_name}
                      </h3>
                      <p className="mt-1 text-sm text-[#334155]">
                        {request.practical_title}
                      </p>
                      <p className="mt-1 text-sm text-[#64748B]">
                        {formatKenyanDate(request.practical_date)} ·{" "}
                        {request.teacher_name} · {request.items.length}{" "}
                        requested{" "}
                        {request.items.length === 1 ? "item" : "items"}
                      </p>
                      {shortages.length ? (
                        <p className="mt-2 text-sm font-bold text-amber-700">
                          Shortage to review:{" "}
                          {shortages.map((item) => item.item_name).join(", ")}
                        </p>
                      ) : null}
                    </div>
                    <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                      <Button
                        variant="secondary"
                        onClick={() => openRequest(request, "details")}
                      >
                        View Request
                      </Button>
                      {[
                        "requested",
                        "under_review",
                        "partially_available",
                      ].includes(request.status) ? (
                        <Button
                          variant="secondary"
                          onClick={() => openRequest(request, "review")}
                        >
                          Check Availability
                        </Button>
                      ) : null}
                      {!["ready", "issued", "completed", "rejected"].includes(
                        request.status,
                      ) ? (
                        <Button onClick={() => openRequest(request, "prepare")}>
                          Prepare Items
                        </Button>
                      ) : null}
                      {request.status === "ready" ? (
                        <Button onClick={() => navigateToIssue(request.id)}>
                          <Send className="h-4 w-4" /> Issue Items
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Panel>

      <Modal
        open={mode === "new"}
        title="New Practical Request"
        description="Record the teacher's lesson request. Stock is not deducted at this stage."
        onClose={() => setMode(null)}
        size="xl"
        mobileFullScreen
        footer={
          <>
            <SaveState state={saveState} />
            <Button variant="secondary" onClick={() => setMode(null)}>
              Cancel
            </Button>
            <Button
              onClick={submitNewRequest}
              disabled={createMutation.isPending}
            >
              Submit Practical Request
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {formError ? (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900"
            >
              {formError}
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["Subject", "subject", "e.g. Chemistry"],
              ["Class and Stream", "class_name", "e.g. Form 3 East"],
              ["Practical Date", "practical_date", "DD/MM/YYYY"],
              ["Lesson Time", "lesson_time", "e.g. 09:20"],
              [
                "Practical Title or Purpose",
                "practical_title",
                "e.g. Test for gases",
              ],
              ["Teacher", "teacher_name", "e.g. Mr Kamau"],
            ].map(([label, key, placeholder]) => (
              <label key={key}>
                <span className={labelClass}>{label}</span>
                <input
                  className={fieldClass}
                  value={String(requestForm[key as keyof typeof requestForm])}
                  placeholder={placeholder}
                  onChange={(event) =>
                    setRequestForm((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                />
              </label>
            ))}
            <label>
              <span className={labelClass}>Number of Learners or Groups</span>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                className={fieldClass}
                value={requestForm.learner_groups}
                onChange={(event) =>
                  setRequestForm((current) => ({
                    ...current,
                    learner_groups: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              <span className={labelClass}>Teacher Notes</span>
              <input
                className={fieldClass}
                value={requestForm.teacher_notes}
                onChange={(event) =>
                  setRequestForm((current) => ({
                    ...current,
                    teacher_notes: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <div
            className={`rounded-2xl border p-4 ${
              requestForm.is_assessment
                ? "border-amber-300 bg-amber-50"
                : "border-[#D8E0EC] bg-[#F8FAFC]"
            }`}
          >
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 shrink-0"
                checked={requestForm.is_assessment}
                onChange={(event) =>
                  setRequestForm((current) => ({
                    ...current,
                    is_assessment: event.target.checked,
                  }))
                }
              />
              <span>
                <span className="flex items-center gap-2 font-black text-[#071D49]">
                  <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                  Secure assessment or examination practical
                </span>
                <span className="mt-1 block text-sm leading-6 text-[#64748B]">
                  Use this only when preparation details must be restricted to authorized examination staff.
                </span>
              </span>
            </label>
            {requestForm.is_assessment ? (
              <div className="mt-4 space-y-4 border-t border-amber-300 pt-4">
                <div
                  role="note"
                  className="rounded-xl border border-amber-300 bg-white p-3 text-sm leading-6 text-amber-950"
                >
                  <p className="font-black">Authorized staff only</p>
                  <p className="mt-1">
                    Secure preparation details are limited to the Laboratory Technician, Principal, Deputy Principal,
                    Dean of Academics, and Exams Manager. Ordinary teachers, learners, parents, and other roles cannot
                    view this request through the laboratory API.
                  </p>
                  <p className="mt-2 font-bold">
                    MyShule supports materials and stock preparation only. Always follow official KNEC instructions;
                    this workspace does not replace or reproduce them.
                  </p>
                </div>
                <label>
                  <span className={labelClass}>Confidential Preparation Notes</span>
                  <textarea
                    className={`${fieldClass} min-h-24 py-3`}
                    value={requestForm.confidential_notes}
                    placeholder="Optional notes for authorized preparation staff"
                    onChange={(event) =>
                      setRequestForm((current) => ({
                        ...current,
                        confidential_notes: event.target.value,
                      }))
                    }
                  />
                  <span className="mt-1 block text-xs font-semibold leading-5 text-amber-900">
                    Do not copy confidential examination questions or full official instructions into MyShule.
                  </span>
                </label>
              </div>
            ) : null}
          </div>
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="font-black text-[#071D49]">Requested Items</h4>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  setRequestForm((current) => ({
                    ...current,
                    items: [...current.items, newItemRow()],
                  }))
                }
              >
                <Plus className="h-4 w-4" /> Add Item
              </Button>
            </div>
            <div className="space-y-3">
              {requestForm.items.map((row, index) => (
                <div
                  key={row.key}
                  className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-3"
                >
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <label className="lg:col-span-2">
                      <span className={labelClass}>Item</span>
                      <select
                        className={fieldClass}
                        value={row.item_id}
                        onChange={(event) =>
                          selectInventoryForRequest(index, event.target.value)
                        }
                      >
                        <option value="">Type manually / select stock</option>
                        {inventory.map((item) => (
                          <option
                            key={`${item.item_source}:${item.id}`}
                            value={item.id}
                          >
                            {item.item_name} · {item.quantity_available}{" "}
                            {item.unit} available
                          </option>
                        ))}
                      </select>
                      <input
                        aria-label="Requested item name"
                        className={`${fieldClass} mt-2`}
                        value={row.item_name}
                        placeholder="Item name"
                        onChange={(event) =>
                          setRequestForm((current) => ({
                            ...current,
                            items: current.items.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    item_name: event.target.value,
                                    item_id: "",
                                    item_source: "",
                                  }
                                : item,
                            ),
                          }))
                        }
                      />
                    </label>
                    <label>
                      <span className={labelClass}>Requested Quantity</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="any"
                        className={fieldClass}
                        value={row.requested_quantity}
                        onChange={(event) =>
                          setRequestForm((current) => ({
                            ...current,
                            items: current.items.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    requested_quantity: event.target.value,
                                  }
                                : item,
                            ),
                          }))
                        }
                      />
                    </label>
                    <label>
                      <span className={labelClass}>Unit</span>
                      <select
                        className={fieldClass}
                        value={row.unit}
                        onChange={(event) =>
                          setRequestForm((current) => ({
                            ...current,
                            items: current.items.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, unit: event.target.value }
                                : item,
                            ),
                          }))
                        }
                      >
                        {LAB_UNITS.filter((unit) => unit !== "Custom").map(
                          (unit) => (
                            <option key={unit}>{unit}</option>
                          ),
                        )}
                      </select>
                    </label>
                    <div className="flex items-end gap-2">
                      <label className="flex min-h-11 flex-1 items-center gap-2 rounded-xl border border-[#C8D5EA] bg-white px-3 text-sm font-bold text-[#071D49]">
                        <input
                          type="checkbox"
                          checked={row.is_returnable}
                          onChange={(event) =>
                            setRequestForm((current) => ({
                              ...current,
                              items: current.items.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      is_returnable: event.target.checked,
                                    }
                                  : item,
                              ),
                            }))
                          }
                        />{" "}
                        Returnable
                      </label>
                      {requestForm.items.length > 1 ? (
                        <button
                          type="button"
                          aria-label={`Remove ${row.item_name || "item"}`}
                          onClick={() =>
                            setRequestForm((current) => ({
                              ...current,
                              items: current.items.filter(
                                (_, itemIndex) => itemIndex !== index,
                              ),
                            }))
                          }
                          className="min-h-11 rounded-xl border border-rose-200 px-3 text-rose-700"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={mode === "details" && Boolean(selectedRequest)}
        title="Practical Request"
        description={
          selectedRequest
            ? `${selectedRequest.subject} · ${selectedRequest.class_name}`
            : undefined
        }
        onClose={() => setMode(null)}
        size="lg"
      >
        {selectedRequest ? (
          <div className="space-y-4 text-sm">
            <div className="grid gap-3 rounded-xl bg-[#F8FAFC] p-4 sm:grid-cols-2">
              <p>
                <strong>Date and time:</strong>
                <br />
                {formatKenyanDate(selectedRequest.practical_date)} at{" "}
                {selectedRequest.lesson_time}
              </p>
              <p>
                <strong>Teacher:</strong>
                <br />
                {selectedRequest.teacher_name}
              </p>
              <p>
                <strong>Purpose:</strong>
                <br />
                {selectedRequest.practical_title}
              </p>
              <p>
                <strong>Learners or groups:</strong>
                <br />
                {selectedRequest.learner_groups ?? "Not stated"}
              </p>
            </div>
            {selectedRequest.teacher_notes ? (
              <p className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                <strong>Teacher notes:</strong> {selectedRequest.teacher_notes}
              </p>
            ) : null}
            {selectedRequest.is_assessment ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-950">
                <p className="flex items-center gap-2 font-black">
                  <LockKeyhole className="h-4 w-4" aria-hidden="true" /> Authorized assessment preparation
                </p>
                <p className="mt-1 leading-6">
                  Keep these details within authorized examination staff. Use MyShule for inventory preparation and
                  continue to follow official KNEC instructions.
                </p>
              </div>
            ) : null}
            {selectedRequest.confidential_notes ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <strong>Authorized assessment note:</strong>{" "}
                {selectedRequest.confidential_notes}
              </p>
            ) : null}
            <div className="space-y-2">
              {selectedRequest.items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap justify-between gap-2 rounded-xl border border-[#D8E0EC] p-3"
                >
                  <span className="font-black text-[#071D49]">
                    {item.item_name}
                  </span>
                  <span>
                    {item.requested_quantity} {item.unit} requested ·{" "}
                    {item.available_quantity} available
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={mode === "review" && Boolean(selectedRequest)}
        title="Check Availability"
        description={
          selectedRequest
            ? `${selectedRequest.subject} · ${selectedRequest.class_name} · approval does not deduct stock`
            : undefined
        }
        onClose={() => setMode(null)}
        size="xl"
        mobileFullScreen
        footer={
          <>
            <SaveState state={saveState} />
            <Button
              variant="danger"
              disabled={reviewMutation.isPending}
              onClick={() => submitReview("rejected")}
            >
              <XCircle className="h-4 w-4" /> Reject with Reason
            </Button>
            <Button
              variant="secondary"
              disabled={reviewMutation.isPending}
              onClick={() => submitReview("partially_available")}
            >
              Approve Available Quantities
            </Button>
            <Button
              disabled={
                reviewMutation.isPending ||
                reviewItems.some(
                  (item) =>
                    asNumber(item.approved_quantity) < item.requested_quantity,
                )
              }
              onClick={() => submitReview("preparing")}
            >
              <Check className="h-4 w-4" /> Approve Full Request
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError ? (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900"
            >
              {formError}
            </div>
          ) : null}
          {reviewItems.map((item, index) => (
            <div
              key={item.request_item_id}
              className="rounded-xl border border-[#D8E0EC] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-black text-[#071D49]">{item.item_name}</h4>
                <StatusChip
                  label={
                    item.available_quantity >= item.requested_quantity
                      ? "Available"
                      : item.available_quantity > 0
                        ? "Partial"
                        : "Unavailable"
                  }
                  tone={
                    item.available_quantity >= item.requested_quantity
                      ? "success"
                      : "warning"
                  }
                />
              </div>
              <p className="mt-1 text-sm text-[#64748B]">
                Requested: {item.requested_quantity} {item.unit} · Available
                now: {item.available_quantity} {item.unit}
              </p>
              {item.substitute_available_quantity !== null ? (
                <p className="mt-1 text-sm font-bold text-blue-700">
                  Substitute available: {item.substitute_available_quantity}{" "}
                  {item.unit}
                </p>
              ) : null}
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label>
                  <span className={labelClass}>Quantity Approved</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    className={fieldClass}
                    value={item.approved_quantity}
                    onChange={(event) =>
                      setReviewItems((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index
                            ? { ...row, approved_quantity: event.target.value }
                            : row,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  <span className={labelClass}>
                    Suggest an Alternative Item
                  </span>
                  <select
                    className={fieldClass}
                    value={item.substitute_item_id}
                    onChange={(event) =>
                      selectReviewSubstitute(index, event.target.value)
                    }
                  >
                    <option value="">No substitute</option>
                    {inventory.map((stock) => (
                      <option
                        key={`${stock.item_source}:${stock.id}`}
                        value={stock.id}
                      >
                        {stock.item_name} ({stock.quantity_available}{" "}
                        {stock.unit})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className={labelClass}>Shortage or Review Note</span>
                  <input
                    className={fieldClass}
                    value={item.note}
                    placeholder="e.g. Only 15 beakers available"
                    onChange={(event) =>
                      setReviewItems((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index
                            ? { ...row, note: event.target.value }
                            : row,
                        ),
                      )
                    }
                  />
                </label>
              </div>
            </div>
          ))}
          <label>
            <span className={labelClass}>
              Reason for Rejection (only required when rejecting)
            </span>
            <textarea
              className={`${fieldClass} min-h-24 py-3`}
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
            />
          </label>
        </div>
      </Modal>

      <Modal
        open={mode === "prepare" && Boolean(selectedRequest)}
        title="Prepare Practical"
        description={
          selectedRequest
            ? `${selectedRequest.lesson_time} · ${selectedRequest.subject} · ${selectedRequest.class_name} · ${selectedRequest.teacher_name}`
            : undefined
        }
        onClose={() => setMode(null)}
        size="xl"
        mobileFullScreen
        footer={
          <>
            <SaveState state={saveState} />
            <Button
              variant="secondary"
              disabled={preparationMutation.isPending}
              onClick={() => savePreparation(false)}
            >
              Save and Continue Later
            </Button>
            <Button
              disabled={preparationMutation.isPending}
              onClick={() => savePreparation(true)}
            >
              <ClipboardList className="h-4 w-4" /> Mark Practical Ready
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError ? (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900"
            >
              {formError}
            </div>
          ) : null}
          {selectedRequest?.is_assessment ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
              <p className="flex items-center gap-2 font-black">
                <LockKeyhole className="h-4 w-4" aria-hidden="true" /> Secure assessment preparation — authorized staff only
              </p>
              <p className="mt-1 leading-6">
                Prepare inventory here, keep assessment details confidential, and follow official KNEC instructions.
              </p>
              {selectedRequest.confidential_notes ? (
                <p className="mt-2 rounded-lg bg-white p-3">
                  <strong>Confidential preparation note:</strong> {selectedRequest.confidential_notes}
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                setPreparationItems((current) =>
                  current.map((item) => ({
                    ...item,
                    prepared_quantity: String(
                      Math.min(
                        item.available_quantity,
                        item.requested_quantity || item.available_quantity,
                      ),
                    ),
                  })),
                )
              }
            >
              <Check className="h-4 w-4" /> Mark All Available Items Prepared
            </Button>
            <Button size="sm" variant="secondary" onClick={addNecessaryItem}>
              <Plus className="h-4 w-4" /> Add Necessary Item
            </Button>
          </div>
          {preparationItems.map((item, index) => {
            const prepared = asNumber(item.prepared_quantity);
            const status =
              prepared <= 0
                ? "Unavailable"
                : item.requested_quantity > 0 &&
                    prepared < item.requested_quantity
                  ? "Partial"
                  : "Prepared";
            return (
              <div
                key={item.key}
                className="rounded-xl border border-[#D8E0EC] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-black text-[#071D49]">
                      {item.original_item_name}
                    </h4>
                    {item.substitute_item_name ? (
                      <p className="text-xs font-bold text-blue-700">
                        Substitute: {item.substitute_item_name}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex min-h-10 items-center gap-2 rounded-xl border border-[#C8D5EA] px-3 text-sm font-black text-[#071D49]">
                      <input
                        type="checkbox"
                        checked={prepared > 0}
                        onChange={(event) =>
                          setPreparationItems((current) =>
                            current.map((row, rowIndex) =>
                              rowIndex === index
                                ? {
                                    ...row,
                                    prepared_quantity: event.target.checked
                                      ? String(
                                          Math.min(
                                            row.available_quantity,
                                            row.requested_quantity ||
                                              row.available_quantity,
                                          ),
                                        )
                                      : "0",
                                  }
                                : row,
                            ),
                          )
                        }
                      />
                      Prepared
                    </label>
                    <StatusChip
                      label={status}
                      tone={status === "Prepared" ? "success" : "warning"}
                    />
                  </div>
                </div>
                <p className="mt-1 text-sm text-[#64748B]">
                  Requested: {item.requested_quantity || "Additional"}{" "}
                  {item.unit} · Available: {item.available_quantity} {item.unit}
                </p>
                {!item.request_item_id ? (
                  <label className="mt-3 block">
                    <span className={labelClass}>Necessary Item</span>
                    <select
                      className={fieldClass}
                      value={item.item_id}
                      onChange={(event) =>
                        selectNecessaryItem(index, event.target.value)
                      }
                    >
                      <option value="">Select an inventory item</option>
                      {inventory.map((stock) => (
                        <option
                          key={`${stock.item_source}:${stock.id}`}
                          value={stock.id}
                        >
                          {stock.item_name} · {stock.quantity_available}{" "}
                          {stock.unit}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label>
                    <span className={labelClass}>Preparing</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      className={fieldClass}
                      value={item.prepared_quantity}
                      onChange={(event) =>
                        setPreparationItems((current) =>
                          current.map((row, rowIndex) =>
                            rowIndex === index
                              ? {
                                  ...row,
                                  prepared_quantity: event.target.value,
                                }
                              : row,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    <span className={labelClass}>Unit</span>
                    <select
                      className={fieldClass}
                      value={item.unit}
                      onChange={(event) =>
                        setPreparationItems((current) =>
                          current.map((row, rowIndex) =>
                            rowIndex === index
                              ? { ...row, unit: event.target.value }
                              : row,
                          ),
                        )
                      }
                    >
                      {LAB_UNITS.filter((unit) => unit !== "Custom").map(
                        (unit) => (
                          <option key={unit}>{unit}</option>
                        ),
                      )}
                    </select>
                  </label>
                  <label>
                    <span className={labelClass}>Substitute (optional)</span>
                    <select
                      className={fieldClass}
                      value={item.substitute_item_id}
                      onChange={(event) =>
                        selectSubstitute(index, event.target.value)
                      }
                    >
                      <option value="">No substitute</option>
                      {inventory
                        .filter((stock) => stock.id !== item.item_id)
                        .map((stock) => (
                          <option
                            key={`${stock.item_source}:${stock.id}`}
                            value={stock.id}
                          >
                            {stock.item_name} · {stock.quantity_available}{" "}
                            {stock.unit}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    <span className={labelClass}>
                      Preparation or Shortage Note
                    </span>
                    <input
                      className={fieldClass}
                      value={item.note}
                      placeholder="e.g. 5 beakers short"
                      onChange={(event) =>
                        setPreparationItems((current) =>
                          current.map((row, rowIndex) =>
                            rowIndex === index
                              ? { ...row, note: event.target.value }
                              : row,
                          ),
                        )
                      }
                    />
                  </label>
                </div>
              </div>
            );
          })}
          <label>
            <span className={labelClass}>Preparation Note</span>
            <textarea
              className={`${fieldClass} min-h-24 py-3`}
              value={preparationNote}
              placeholder="Notes for issuing or setting up the lesson"
              onChange={(event) => setPreparationNote(event.target.value)}
            />
          </label>
        </div>
      </Modal>
    </div>
  );
}
