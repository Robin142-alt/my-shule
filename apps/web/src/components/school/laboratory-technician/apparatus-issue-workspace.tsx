"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCircle2, PackageOpen, RotateCcw, Send } from "lucide-react";
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
  PRACTICAL_STATUS_LABELS,
  formatKenyanDate,
  statusTone,
  type LabIssue,
  type LaboratoryActionResponse,
  type PracticalRequest,
} from "./types";
import {
  createSubmissionId,
  isPendingSync,
  useLaboratoryMutation,
} from "./use-laboratory-mutation";

type SaveIndicator = "saved" | "saving" | "failed" | "pending_sync" | null;
type IssueMode = "issue" | "return" | "details" | null;

type IssueDraftLine = {
  request_item_id: string;
  item_name: string;
  unit: string;
  prepared_quantity: number;
  quantity_issued: string;
  is_returnable: boolean;
};

type ReturnField =
  | "returned_good"
  | "used_or_consumed"
  | "broken"
  | "missing"
  | "still_with_teacher"
  | "sent_for_maintenance"
  | "spilled_or_wasted";

type ReturnDraftLine = Record<ReturnField, string> & {
  issue_line_id: string;
  item_name: string;
  unit: string;
  quantity_issued: number;
  is_returnable: boolean;
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
    "The laboratory record could not be saved. Your entered information is still here."
  );
}

function isActiveIssue(issue: LabIssue) {
  return ["issued", "partially_returned", "overdue", "unresolved"].includes(
    issue.status,
  );
}

function returnAccounted(line: ReturnDraftLine) {
  return (
    asNumber(line.returned_good) +
    asNumber(line.used_or_consumed) +
    asNumber(line.broken) +
    asNumber(line.missing) +
    asNumber(line.still_with_teacher) +
    asNumber(line.sent_for_maintenance) +
    asNumber(line.spilled_or_wasted)
  );
}

const returnFields: Array<{
  key: ReturnField;
  returnableLabel: string;
  consumableLabel: string;
}> = [
  {
    key: "returned_good",
    returnableLabel: "Good Condition",
    consumableLabel: "Returned",
  },
  {
    key: "used_or_consumed",
    returnableLabel: "Used During Practical",
    consumableLabel: "Used or Consumed",
  },
  {
    key: "broken",
    returnableLabel: "Broken",
    consumableLabel: "Broken Container",
  },
  { key: "missing", returnableLabel: "Missing", consumableLabel: "Missing" },
  {
    key: "still_with_teacher",
    returnableLabel: "Still With Teacher",
    consumableLabel: "Still With Teacher",
  },
  {
    key: "sent_for_maintenance",
    returnableLabel: "Sent for Maintenance",
    consumableLabel: "Sent for Maintenance",
  },
  {
    key: "spilled_or_wasted",
    returnableLabel: "Wasted",
    consumableLabel: "Spilled or Wasted",
  },
];

export function ApparatusIssueWorkspace() {
  const issuesQuery = useSchoolQuery<LabIssue[]>("/labs/issues");
  const requestsQuery = useSchoolQuery<PracticalRequest[]>("/labs/requests");
  const issues = issuesQuery.data ?? [];
  const readyRequests = useMemo(
    () =>
      (requestsQuery.data ?? []).filter(
        (request) => request.status === "ready",
      ),
    [requestsQuery.data],
  );

  const [mode, setMode] = useState<IssueMode>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");
  const selectedRequest =
    (requestsQuery.data ?? []).find(
      (request) => request.id === selectedRequestId,
    ) ?? null;
  const [selectedIssueId, setSelectedIssueId] = useState<string>("");
  const selectedIssue =
    issues.find((issue) => issue.id === selectedIssueId) ?? null;
  const [showAll, setShowAll] = useState(false);
  const visibleIssues = showAll ? issues : issues.filter(isActiveIssue);
  const [saveState, setSaveState] = useState<SaveIndicator>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [receivedBy, setReceivedBy] = useState("");
  const [expectedReturnAt, setExpectedReturnAt] = useState("");
  const [issueNotes, setIssueNotes] = useState("");
  const [issueLines, setIssueLines] = useState<IssueDraftLine[]>([]);
  const [issueSubmissionId, setIssueSubmissionId] = useState(() =>
    createSubmissionId("practical-issue"),
  );

  const [returnNotes, setReturnNotes] = useState("");
  const [returnLines, setReturnLines] = useState<ReturnDraftLine[]>([]);
  const [returnSubmissionId, setReturnSubmissionId] = useState(() =>
    createSubmissionId("practical-return"),
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get("action");
    const requestId = params.get("request");
    const issueId = params.get("issue");
    if (requestId) setSelectedRequestId(requestId);
    if (issueId) setSelectedIssueId(issueId);
    if (action === "issue") setMode("issue");
    if (action === "return") setMode("return");
  }, []);

  useEffect(() => {
    if (mode === "issue" && !selectedRequestId && readyRequests[0]) {
      setSelectedRequestId(readyRequests[0].id);
    }
    if (mode === "return" && !selectedIssueId) {
      const firstActive = issues.find(isActiveIssue);
      if (firstActive) setSelectedIssueId(firstActive.id);
    }
  }, [issues, mode, readyRequests, selectedIssueId, selectedRequestId]);

  useEffect(() => {
    if (!selectedRequest) return;
    setReceivedBy(selectedRequest.teacher_name);
    setExpectedReturnAt("");
    setIssueNotes("");
    setIssueLines(
      selectedRequest.items
        .filter((item) => asNumber(item.prepared_quantity) > 0)
        .map((item) => ({
          request_item_id: item.id,
          item_name: item.substitute_item_name ?? item.item_name,
          unit: item.unit,
          prepared_quantity: asNumber(item.prepared_quantity),
          quantity_issued: String(item.prepared_quantity),
          is_returnable: item.is_returnable,
        })),
    );
    setIssueSubmissionId(createSubmissionId("practical-issue"));
    setSaveState(null);
    setFormError(null);
  }, [selectedRequest]);

  useEffect(() => {
    if (!selectedIssue) return;
    setReturnNotes("");
    setReturnLines(
      selectedIssue.items.map((item) => {
        const resolvedWithoutStill =
          asNumber(item.returned_good) +
          asNumber(item.used_or_consumed) +
          asNumber(item.broken) +
          asNumber(item.missing) +
          asNumber(item.sent_for_maintenance) +
          asNumber(item.spilled_or_wasted);
        const explicitStill = asNumber(item.still_with_teacher);
        const remaining = Math.max(
          0,
          asNumber(item.quantity_issued) - resolvedWithoutStill - explicitStill,
        );
        return {
          issue_line_id: item.id,
          item_name: item.item_name,
          unit: item.unit,
          quantity_issued: asNumber(item.quantity_issued),
          is_returnable: item.is_returnable,
          returned_good: String(item.returned_good),
          used_or_consumed: String(item.used_or_consumed),
          broken: String(item.broken),
          missing: String(item.missing),
          still_with_teacher: String(explicitStill + remaining),
          sent_for_maintenance: String(item.sent_for_maintenance),
          spilled_or_wasted: String(item.spilled_or_wasted),
        };
      }),
    );
    setReturnSubmissionId(createSubmissionId("practical-return"));
    setSaveState(null);
    setFormError(null);
  }, [selectedIssue]);

  const issueMutation = useLaboratoryMutation<
    LaboratoryActionResponse<{ issue: LabIssue }>,
    { requestId: string; payload: Record<string, unknown> }
  >({
    action: "confirm-practical-issue",
    path: ({ requestId }) => `/labs/practical-requests/${requestId}/issues`,
    body: ({ payload }) => payload,
    onSuccess: (data) => {
      if (isPendingSync(data)) {
        setSaveState("pending_sync");
        return;
      }
      setSaveState("saved");
      toast.success(data.message);
      setIssueSubmissionId(createSubmissionId("practical-issue"));
      setMode(null);
    },
    onError: (error) => {
      setSaveState("failed");
      setFormError(mutationError(error));
    },
  });

  const returnMutation = useLaboratoryMutation<
    LaboratoryActionResponse<{ issue: LabIssue }>,
    { issueId: string; payload: Record<string, unknown> }
  >({
    action: "receive-practical-return",
    path: ({ issueId }) => `/labs/issues/${issueId}/returns`,
    body: ({ payload }) => payload,
    onSuccess: (data) => {
      if (isPendingSync(data)) {
        setSaveState("pending_sync");
        return;
      }
      setSaveState("saved");
      toast.success(data.message);
      setReturnSubmissionId(createSubmissionId("practical-return"));
      setMode(null);
    },
    onError: (error) => {
      setSaveState("failed");
      setFormError(mutationError(error));
    },
  });

  const reminderMutation = useLaboratoryMutation<
    LaboratoryActionResponse<{ notification_queued?: boolean }>,
    { issueId: string }
  >({
    action: "send-return-reminder",
    path: ({ issueId }) => `/labs/issues/${issueId}/reminders`,
    body: () => ({}),
    onSuccess: (data) => {
      if (isPendingSync(data)) {
        toast.info(
          "Reminder is pending sync. It will only be marked sent after the server confirms it.",
        );
        return;
      }
      toast.success(data.message);
    },
    onError: (error) => toast.error(mutationError(error)),
  });

  function openIssue(request?: PracticalRequest) {
    if (request) setSelectedRequestId(request.id);
    setFormError(null);
    setSaveState(null);
    setMode("issue");
  }

  function openReturn(issue: LabIssue) {
    setSelectedIssueId(issue.id);
    setFormError(null);
    setSaveState(null);
    setMode("return");
  }

  function submitIssue() {
    if (!selectedRequest) {
      setFormError("Select a practical that is ready for issue.");
      return;
    }
    if (!receivedBy.trim()) {
      setFormError("Enter the name of the person receiving the items.");
      return;
    }
    const validLines = issueLines.filter(
      (line) => asNumber(line.quantity_issued) > 0,
    );
    if (!validLines.length) {
      setFormError("Confirm at least one issued quantity.");
      return;
    }
    if (
      validLines.some(
        (line) =>
          asNumber(line.quantity_issued) > line.prepared_quantity + 0.0001,
      )
    ) {
      setFormError(
        "An issued quantity cannot be higher than the prepared quantity.",
      );
      return;
    }
    if (validLines.some((line) => line.is_returnable) && !expectedReturnAt) {
      setFormError("Set the expected return time for the returnable items.");
      return;
    }
    setFormError(null);
    setSaveState("saving");
    issueMutation.mutate({
      requestId: selectedRequest.id,
      payload: {
        received_by: receivedBy.trim(),
        expected_return_at: expectedReturnAt
          ? new Date(expectedReturnAt).toISOString()
          : undefined,
        notes: issueNotes || undefined,
        submission_id: issueSubmissionId,
        items: validLines.map((line) => ({
          request_item_id: line.request_item_id,
          quantity_issued: asNumber(line.quantity_issued),
          is_returnable: line.is_returnable,
        })),
      },
    });
  }

  function updateReturnLine(index: number, key: ReturnField, value: string) {
    setReturnLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [key]: value } : line,
      ),
    );
  }

  function markRemainingStillWithTeacher(index: number) {
    setReturnLines((current) =>
      current.map((line, lineIndex) => {
        if (lineIndex !== index) return line;
        const accountedWithoutStill = returnFields
          .filter((field) => field.key !== "still_with_teacher")
          .reduce((total, field) => total + asNumber(line[field.key]), 0);
        return {
          ...line,
          still_with_teacher: String(
            Math.max(0, line.quantity_issued - accountedWithoutStill),
          ),
        };
      }),
    );
  }

  function markNormalCompleteReturn() {
    setReturnLines((current) =>
      current.map((line) => ({
        ...line,
        returned_good: line.is_returnable ? String(line.quantity_issued) : "0",
        used_or_consumed: line.is_returnable
          ? "0"
          : String(line.quantity_issued),
        broken: "0",
        missing: "0",
        still_with_teacher: "0",
        sent_for_maintenance: "0",
        spilled_or_wasted: "0",
      })),
    );
  }

  function submitReturn() {
    if (!selectedIssue) return;
    const unreconciled = returnLines.find(
      (line) => Math.abs(returnAccounted(line) - line.quantity_issued) > 0.0001,
    );
    if (unreconciled) {
      setFormError(
        `${unreconciled.item_name} must add up to ${unreconciled.quantity_issued} ${unreconciled.unit}. Record any unreturned quantity as Still With Teacher.`,
      );
      return;
    }
    setFormError(null);
    setSaveState("saving");
    returnMutation.mutate({
      issueId: selectedIssue.id,
      payload: {
        notes: returnNotes || undefined,
        submission_id: returnSubmissionId,
        items: returnLines.map((line) => ({
          issue_line_id: line.issue_line_id,
          returned_good: asNumber(line.returned_good),
          used_or_consumed: asNumber(line.used_or_consumed),
          broken: asNumber(line.broken),
          missing: asNumber(line.missing),
          still_with_teacher: asNumber(line.still_with_teacher),
          sent_for_maintenance: asNumber(line.sent_for_maintenance),
          spilled_or_wasted: asNumber(line.spilled_or_wasted),
        })),
      },
    });
  }

  const returnFullyResolved =
    returnLines.length > 0 &&
    returnLines.every(
      (line) =>
        Math.abs(returnAccounted(line) - line.quantity_issued) <= 0.0001,
    ) &&
    returnLines.every((line) => asNumber(line.still_with_teacher) <= 0.0001);

  return (
    <div className="space-y-5">
      <LabQuickActions compact />
      <Panel
        title="Issue and Return Book"
        description="Issue prepared practical items from one confirmation screen, then account for every item when it comes back."
        icon={PackageOpen}
        actions={
          <Button onClick={() => openIssue()} disabled={!readyRequests.length}>
            <Send className="h-4 w-4" /> Issue Prepared Items
          </Button>
        }
      >
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-bold text-blue-800">Ready to Issue</p>
            <p className="mt-1 text-2xl font-black text-blue-950">
              {readyRequests.length}
            </p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-bold text-amber-800">Awaiting Return</p>
            <p className="mt-1 text-2xl font-black text-amber-950">
              {issues.filter(isActiveIssue).length}
            </p>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm font-bold text-rose-800">Overdue</p>
            <p className="mt-1 text-2xl font-black text-rose-950">
              {issues.filter((issue) => issue.status === "overdue").length}
            </p>
          </div>
        </div>

        {readyRequests.length ? (
          <div className="mb-6">
            <h3 className="mb-3 font-black text-[#071D49]">
              Practicals Ready for Issue
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {readyRequests.map((request) => (
                <article
                  key={request.id}
                  className="rounded-xl border border-blue-200 bg-blue-50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-black text-blue-950">
                        {request.subject} · {request.class_name}
                      </p>
                      <p className="mt-1 text-sm text-blue-800">
                        {request.lesson_time} · {request.practical_title}
                      </p>
                      <p className="mt-1 text-sm text-blue-700">
                        Teacher: {request.teacher_name}
                      </p>
                    </div>
                    <StatusChip label="Ready" tone="success" />
                  </div>
                  <Button
                    className="mt-3 w-full sm:w-auto"
                    onClick={() => openIssue(request)}
                  >
                    Issue Items
                  </Button>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-black text-[#071D49]">
            {showAll ? "Issue History" : "Items Awaiting Return"}
          </h3>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowAll((value) => !value)}
          >
            {showAll ? "Show Active Issues" : "View Issue History"}
          </Button>
        </div>
        {issuesQuery.isLoading ? (
          <div className="rounded-xl border border-[#D8E0EC] p-8 text-center text-sm text-[#64748B]">
            Loading issue and return records…
          </div>
        ) : issuesQuery.error ? (
          <WorkspaceError
            message={issuesQuery.error.message}
            onRetry={() => void issuesQuery.refetch()}
          />
        ) : visibleIssues.length === 0 ? (
          <WorkspaceEmpty
            title="All issued laboratory items have been returned or accounted for."
            description="New issues will appear here until every quantity has been returned, used, broken, missing or left with the teacher."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {visibleIssues.map((issue) => (
              <article
                key={issue.id}
                className="rounded-2xl border border-[#D8E0EC] p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-black text-[#071D49]">
                      {issue.subject} · {issue.class_name}
                    </p>
                    <p className="mt-1 text-sm text-[#334155]">
                      {issue.practical_title}
                    </p>
                  </div>
                  <StatusChip
                    label={
                      PRACTICAL_STATUS_LABELS[issue.status] ??
                      issue.status.replaceAll("_", " ")
                    }
                    tone={statusTone(issue.status)}
                  />
                </div>
                <div className="mt-3 grid gap-1 text-sm text-[#64748B]">
                  <p>
                    Issued to:{" "}
                    <strong className="text-[#334155]">
                      {issue.received_by}
                    </strong>
                  </p>
                  <p>Teacher: {issue.teacher_name}</p>
                  <p>Issued: {formatKenyanDate(issue.issued_at)}</p>
                  <p>
                    Expected back:{" "}
                    {issue.expected_return_at
                      ? formatKenyanDate(issue.expected_return_at)
                      : "No return time set"}
                  </p>
                  <p>
                    {issue.items.length} item{" "}
                    {issue.items.length === 1 ? "line" : "lines"}
                  </p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  {isActiveIssue(issue) ? (
                    <Button onClick={() => openReturn(issue)}>
                      <RotateCcw className="h-4 w-4" /> Receive Return
                    </Button>
                  ) : null}
                  {isActiveIssue(issue) ? (
                    <Button
                      variant="secondary"
                      disabled={reminderMutation.isPending}
                      onClick={() =>
                        reminderMutation.mutate({ issueId: issue.id })
                      }
                    >
                      <Bell className="h-4 w-4" /> Send Reminder
                    </Button>
                  ) : null}
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSelectedIssueId(issue.id);
                      setMode("details");
                    }}
                  >
                    View Issue
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>

      <Modal
        open={mode === "issue"}
        title="Confirm Practical Issue"
        description="Teacher, class, subject and prepared quantities are filled from the practical request."
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
              onClick={submitIssue}
              disabled={issueMutation.isPending || !selectedRequest}
            >
              <Send className="h-4 w-4" /> Confirm Issue
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
          <label>
            <span className={labelClass}>Practical Ready for Issue</span>
            <select
              className={fieldClass}
              value={selectedRequestId}
              onChange={(event) => setSelectedRequestId(event.target.value)}
            >
              <option value="">Select a ready practical</option>
              {readyRequests.map((request) => (
                <option key={request.id} value={request.id}>
                  {request.lesson_time} · {request.subject} ·{" "}
                  {request.class_name} · {request.practical_title}
                </option>
              ))}
            </select>
          </label>
          {selectedRequest ? (
            <>
              <div className="grid gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <p>
                  <strong>Teacher</strong>
                  <br />
                  {selectedRequest.teacher_name}
                </p>
                <p>
                  <strong>Subject</strong>
                  <br />
                  {selectedRequest.subject}
                </p>
                <p>
                  <strong>Class and Stream</strong>
                  <br />
                  {selectedRequest.class_name}
                </p>
                <p>
                  <strong>Practical</strong>
                  <br />
                  {selectedRequest.practical_title}
                </p>
                <p>
                  <strong>Date</strong>
                  <br />
                  {formatKenyanDate(selectedRequest.practical_date)}
                </p>
                <p>
                  <strong>Lesson Time</strong>
                  <br />
                  {selectedRequest.lesson_time}
                </p>
              </div>
              <div className="space-y-3">
                <h4 className="font-black text-[#071D49]">Prepared Items</h4>
                {issueLines.map((line, index) => (
                  <div
                    key={line.request_item_id}
                    className="grid gap-3 rounded-xl border border-[#D8E0EC] p-4 sm:grid-cols-[1fr_10rem_12rem]"
                  >
                    <div>
                      <p className="font-black text-[#071D49]">
                        {line.item_name}
                      </p>
                      <p className="text-sm text-[#64748B]">
                        Prepared: {line.prepared_quantity} {line.unit}
                      </p>
                    </div>
                    <label>
                      <span className={labelClass}>Items Issued</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        max={line.prepared_quantity}
                        step="any"
                        className={fieldClass}
                        value={line.quantity_issued}
                        onChange={(event) =>
                          setIssueLines((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    quantity_issued: event.target.value,
                                  }
                                : item,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      <span className={labelClass}>How Is It Tracked?</span>
                      <select
                        className={fieldClass}
                        value={line.is_returnable ? "returnable" : "consumable"}
                        onChange={(event) =>
                          setIssueLines((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    is_returnable:
                                      event.target.value === "returnable",
                                  }
                                : item,
                            ),
                          )
                        }
                      >
                        <option value="returnable">Returnable</option>
                        <option value="consumable">Used or Consumed</option>
                      </select>
                    </label>
                  </div>
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className={labelClass}>Person Receiving the Items</span>
                  <input
                    className={fieldClass}
                    value={receivedBy}
                    onChange={(event) => setReceivedBy(event.target.value)}
                  />
                </label>
                <label>
                  <span className={labelClass}>Expected Return Time</span>
                  <input
                    type="datetime-local"
                    className={fieldClass}
                    value={expectedReturnAt}
                    onChange={(event) =>
                      setExpectedReturnAt(event.target.value)
                    }
                  />
                </label>
              </div>
              <label>
                <span className={labelClass}>Issue Note (optional)</span>
                <textarea
                  className={`${fieldClass} min-h-20 py-3`}
                  value={issueNotes}
                  onChange={(event) => setIssueNotes(event.target.value)}
                />
              </label>
            </>
          ) : requestsQuery.isLoading ? (
            <p className="text-sm text-[#64748B]">Loading ready practicals…</p>
          ) : (
            <WorkspaceEmpty
              title="No practical is ready for issue."
              description="Prepare the requested items and use Mark Practical Ready before confirming an issue."
            />
          )}
        </div>
      </Modal>

      <Modal
        open={mode === "return" && Boolean(selectedIssue)}
        title="Receive Return"
        description={
          selectedIssue
            ? `${selectedIssue.subject} · ${selectedIssue.class_name} · issued to ${selectedIssue.received_by}`
            : undefined
        }
        onClose={() => setMode(null)}
        size="xl"
        mobileFullScreen
        footer={
          <>
            <SaveState state={saveState} />
            <span
              className={`mr-auto text-sm font-black ${returnFullyResolved ? "text-emerald-700" : "text-amber-700"}`}
            >
              {returnFullyResolved
                ? "All quantities accounted for"
                : "Partial return — unresolved items will stay open"}
            </span>
            <Button variant="secondary" onClick={() => setMode(null)}>
              Cancel
            </Button>
            <Button
              onClick={submitReturn}
              disabled={returnMutation.isPending || !returnLines.length}
            >
              <RotateCcw className="h-4 w-4" /> Record Return
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
          <Button
            size="sm"
            variant="secondary"
            onClick={markNormalCompleteReturn}
          >
            <CheckCircle2 className="h-4 w-4" /> Record Normal Complete Return
          </Button>
          {returnLines.map((line, index) => {
            const accounted = returnAccounted(line);
            const reconciled =
              Math.abs(accounted - line.quantity_issued) <= 0.0001;
            return (
              <div
                key={line.issue_line_id}
                className="rounded-xl border border-[#D8E0EC] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h4 className="font-black text-[#071D49]">
                      {line.item_name}
                    </h4>
                    <p className="mt-1 text-sm text-[#64748B]">
                      Issued: {line.quantity_issued} {line.unit} ·{" "}
                      {line.is_returnable
                        ? "Returnable"
                        : "Consumable or chemical"}
                    </p>
                  </div>
                  <StatusChip
                    label={
                      reconciled
                        ? "Figures Reconcile"
                        : `${Math.max(0, line.quantity_issued - accounted)} ${line.unit} unresolved`
                    }
                    tone={reconciled ? "success" : "warning"}
                  />
                </div>
                <div className="mt-3 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                  {returnFields.map((field) => (
                    <label key={field.key}>
                      <span className={labelClass}>
                        {line.is_returnable
                          ? field.returnableLabel
                          : field.consumableLabel}
                      </span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="any"
                        className={fieldClass}
                        value={line[field.key]}
                        onChange={(event) =>
                          updateReturnLine(index, field.key, event.target.value)
                        }
                      />
                    </label>
                  ))}
                </div>
                <Button
                  className="mt-3"
                  size="sm"
                  variant="secondary"
                  onClick={() => markRemainingStillWithTeacher(index)}
                >
                  Put Unresolved Quantity Under Still With Teacher
                </Button>
              </div>
            );
          })}
          <p className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            Broken, missing and spilled quantities are recorded in the Breakage
            and Loss Register from this return. No learner or teacher is charged
            automatically.
          </p>
          <label>
            <span className={labelClass}>Return Note (optional)</span>
            <textarea
              className={`${fieldClass} min-h-24 py-3`}
              value={returnNotes}
              placeholder="Brief explanation for breakage, loss, waste or items still with the teacher"
              onChange={(event) => setReturnNotes(event.target.value)}
            />
          </label>
        </div>
      </Modal>

      <Modal
        open={mode === "details" && Boolean(selectedIssue)}
        title="Issue Record"
        description={
          selectedIssue
            ? `${selectedIssue.subject} · ${selectedIssue.class_name}`
            : undefined
        }
        onClose={() => setMode(null)}
        size="lg"
      >
        {selectedIssue ? (
          <div className="space-y-3 text-sm">
            <div className="grid gap-3 rounded-xl bg-[#F8FAFC] p-4 sm:grid-cols-2">
              <p>
                <strong>Practical:</strong>
                <br />
                {selectedIssue.practical_title}
              </p>
              <p>
                <strong>Received by:</strong>
                <br />
                {selectedIssue.received_by}
              </p>
              <p>
                <strong>Issued:</strong>
                <br />
                {formatKenyanDate(selectedIssue.issued_at)}
              </p>
              <p>
                <strong>Expected return:</strong>
                <br />
                {selectedIssue.expected_return_at
                  ? formatKenyanDate(selectedIssue.expected_return_at)
                  : "Not set"}
              </p>
            </div>
            {selectedIssue.items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-[#D8E0EC] p-3"
              >
                <p className="font-black text-[#071D49]">
                  {item.item_name} · {item.quantity_issued} {item.unit}
                </p>
                <p className="mt-1 text-[#64748B]">
                  Good {item.returned_good} · Used {item.used_or_consumed} ·
                  Broken {item.broken} · Missing {item.missing} · Still with
                  teacher {item.still_with_teacher} · Maintenance{" "}
                  {item.sent_for_maintenance} · Wasted {item.spilled_or_wasted}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
