"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  ClipboardCheck,
  Eye,
  FlaskConical,
  RotateCcw,
  Send,
} from "lucide-react";
import { toast } from "sonner";

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
  formatKenyanDate,
  PRACTICAL_STATUS_LABELS,
  statusTone,
  type LabAttentionItem,
  type LabHomeData,
  type LabIssue,
  type PracticalRequest,
} from "./types";
import { isPendingSync, useLaboratoryMutation } from "./use-laboratory-mutation";

function navigateTo(section: string, params: Record<string, string> = {}) {
  const segments = window.location.pathname.split("/").filter(Boolean);
  const roleIndex = segments.findIndex((segment) => segment === "laboratory-technician");
  const base = roleIndex >= 0
    ? `/${segments.slice(0, roleIndex + 1).join("/")}`
    : "/school/laboratory-technician";
  const query = new URLSearchParams(params).toString();
  window.location.assign(`${base}/${section}${query ? `?${query}` : ""}`);
}

function practicalStatus(request: PracticalRequest) {
  return PRACTICAL_STATUS_LABELS[request.status] ?? request.status.replaceAll("_", " ");
}

function preparationLabel(status: string) {
  if (["ready", "issued", "partially_returned", "completed"].includes(status)) return "Ready";
  if (status === "preparing") return "Preparing";
  if (status === "partially_available") return "Partially Available";
  if (status === "rejected") return "Rejected";
  return "Not Prepared";
}

function issueLabel(status: string) {
  if (status === "completed") return "Returned";
  if (status === "partially_returned") return "Partially Returned";
  if (status === "issued") return "Issued";
  return "Not Issued";
}

function issueReturnableCount(issue: LabIssue) {
  return issue.items.filter((item) => item.is_returnable).reduce((total, item) => {
    const issued = Number(item.quantity_issued);
    const accountedFor = Number(item.returned_good) + Number(item.broken) + Number(item.missing)
      + Number(item.still_with_teacher) + Number(item.sent_for_maintenance);
    const notYetAccountedFor = Math.max(0, issued - accountedFor);
    return total + Number(item.still_with_teacher) + notYetAccountedFor;
  }, 0);
}

function practicalAction(request: PracticalRequest) {
  if (request.status === "ready") {
    return { label: "Issue Items", section: "apparatus-issue", action: "issue", icon: Send };
  }
  if (["issued", "partially_returned"].includes(request.status)) {
    return { label: "Receive Returns", section: "apparatus-issue", action: "return", icon: RotateCcw };
  }
  if (!["completed", "rejected"].includes(request.status)) {
    return { label: "Prepare Items", section: "lab-timetable", action: "prepare", icon: ClipboardCheck };
  }
  return null;
}

function AttentionCard({ item }: { item: LabAttentionItem }) {
  const open = () => {
    if (item.id.startsWith("item:")) {
      navigateTo("lab-inventory", { search: item.title });
    } else if (item.id.startsWith("issue:")) {
      navigateTo("apparatus-issue", { issue: item.id.split(":")[1], action: "return" });
    } else {
      navigateTo("safety-incidents", { record: item.id.split(":")[1] ?? "", action: "review" });
    }
  };

  return (
    <button
      type="button"
      onClick={open}
      className={`w-full rounded-xl border p-4 text-left transition hover:shadow-sm ${
        item.severity === "danger" ? "border-rose-200 bg-rose-50" : "border-amber-200 bg-amber-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className={`mt-0.5 h-5 w-5 shrink-0 ${item.severity === "danger" ? "text-rose-700" : "text-amber-700"}`}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-black text-[#071D49]">{item.title}</p>
            <StatusChip label={item.type} tone={item.severity} />
          </div>
          <p className="mt-1 text-sm leading-6 text-[#64748B]">{item.detail}</p>
        </div>
      </div>
    </button>
  );
}

export function OverviewWorkspace() {
  const homeQuery = useSchoolQuery<LabHomeData>("/labs/home");
  const [remindingIssueId, setRemindingIssueId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "failed" | "pending_sync" | null>(null);
  const reminderMutation = useLaboratoryMutation<{ message: string; _offline?: boolean }, { issueId: string }>({
    action: "send-return-reminder",
    path: ({ issueId }) => `/labs/issues/${issueId}/reminders`,
    body: () => ({}),
  });

  async function sendReminder(issue: LabIssue) {
    setRemindingIssueId(issue.id);
    setSaveState("saving");
    try {
      const response = await reminderMutation.mutateAsync({ issueId: issue.id });
      if (isPendingSync(response)) {
        setSaveState("pending_sync");
        toast.warning("The reminder is pending sync. It has not been sent yet.");
        return;
      }
      setSaveState("saved");
      toast.success(response.message || `Return reminder sent to ${issue.received_by}.`);
      await homeQuery.refetch();
    } catch (error) {
      setSaveState("failed");
      toast.error(error instanceof Error ? error.message : "The return reminder could not be sent.");
    } finally {
      setRemindingIssueId(null);
    }
  }

  const today = [...(homeQuery.data?.today ?? [])].sort((a, b) => a.lesson_time.localeCompare(b.lesson_time));
  const awaitingReturn = homeQuery.data?.awaiting_return ?? [];
  const attention = homeQuery.data?.attention ?? [];

  return (
    <div className="space-y-5">
      <Panel
        title="Laboratory Today"
        description="See today’s practicals, items awaiting return, and records that need your attention."
        icon={FlaskConical}
      >
        <LabQuickActions />
      </Panel>

      {homeQuery.error ? (
        <WorkspaceError
          message="Check the connection and try again. Your school’s laboratory records have not been changed."
          onRetry={() => void homeQuery.refetch()}
        />
      ) : null}

      <Panel
        title="Today’s Practicals"
        description="Arranged in lesson-time order so the next preparation is easy to find."
        icon={CalendarClock}
      >
        {homeQuery.isLoading ? (
          <p className="py-8 text-center text-sm font-semibold text-[#64748B]">Loading today’s practicals…</p>
        ) : today.length === 0 ? (
          <WorkspaceEmpty
            title="There are no practical requests awaiting preparation today."
            description="Open upcoming practicals to check the next lesson or review a teacher’s request."
            actions={(
              <button
                type="button"
                onClick={() => navigateTo("lab-timetable")}
                className="min-h-11 rounded-xl bg-[#071D49] px-4 text-sm font-black text-white"
              >
                View Upcoming Practicals
              </button>
            )}
          />
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {today.map((request) => {
              const nextAction = practicalAction(request);
              const ActionIcon = nextAction?.icon;
              return (
                <article key={request.id} className="rounded-xl border border-[#D8E0EC] bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-black text-[#071D49]">{request.lesson_time} · {request.subject}</p>
                      <p className="mt-1 text-sm font-bold text-[#334155]">{request.class_name} · {request.teacher_name}</p>
                    </div>
                    <StatusChip label={practicalStatus(request)} tone={statusTone(request.status)} />
                  </div>
                  <p className="mt-3 font-bold text-[#071D49]">{request.practical_title}</p>
                  <p className="mt-1 text-sm text-[#64748B]">
                    {request.items.length} requested {request.items.length === 1 ? "item" : "items"} · {formatKenyanDate(request.practical_date)}
                  </p>
                  <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <div className="rounded-lg bg-[#F8FAFC] px-3 py-2">
                      <dt className="font-semibold text-[#64748B]">Preparation</dt>
                      <dd className="mt-0.5 font-black text-[#071D49]">{preparationLabel(request.status)}</dd>
                    </div>
                    <div className="rounded-lg bg-[#F8FAFC] px-3 py-2">
                      <dt className="font-semibold text-[#64748B]">Issue</dt>
                      <dd className="mt-0.5 font-black text-[#071D49]">{issueLabel(request.status)}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => navigateTo("lab-timetable", { request: request.id })}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#C8D5EA] px-3 text-sm font-black text-[#071D49]"
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" /> View Request
                    </button>
                    {nextAction && ActionIcon ? (
                      <button
                        type="button"
                        onClick={() => navigateTo(nextAction.section, { request: request.id, action: nextAction.action })}
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#071D49] px-3 text-sm font-black text-white"
                      >
                        <ActionIcon className="h-4 w-4" aria-hidden="true" /> {nextAction.label}
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel
        title="Items Awaiting Return"
        description="Only active issues with items still to be returned or accounted for are shown."
        icon={RotateCcw}
      >
        <div className="mb-3"><SaveState state={saveState} /></div>
        {homeQuery.isLoading ? (
          <p className="py-8 text-center text-sm font-semibold text-[#64748B]">Checking issued items…</p>
        ) : awaitingReturn.length === 0 ? (
          <WorkspaceEmpty
            title="All issued laboratory items have been returned or accounted for."
            description="New issues will appear here when returnable items leave the laboratory."
          />
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {awaitingReturn.map((issue) => (
              <article key={issue.id} className="rounded-xl border border-[#D8E0EC] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-[#071D49]">{issue.practical_title}</p>
                    <p className="mt-1 text-sm font-bold text-[#334155]">{issue.subject} · {issue.class_name}</p>
                  </div>
                  <StatusChip label={issue.status.replaceAll("_", " ")} tone={statusTone(issue.status)} />
                </div>
                <p className="mt-3 text-sm leading-6 text-[#64748B]">
                  Received by {issue.received_by}. {issueReturnableCount(issue)} returnable items still need attention.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => navigateTo("apparatus-issue", { issue: issue.id, action: "return" })}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#071D49] px-3 text-sm font-black text-white"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" /> Receive Return
                  </button>
                  <button
                    type="button"
                    disabled={remindingIssueId === issue.id}
                    onClick={() => void sendReminder(issue)}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#C8D5EA] px-3 text-sm font-black text-[#071D49] disabled:opacity-60"
                  >
                    <Bell className="h-4 w-4" aria-hidden="true" />
                    {remindingIssueId === issue.id ? "Sending…" : "Send Reminder"}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateTo("apparatus-issue", { issue: issue.id })}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#C8D5EA] px-3 text-sm font-black text-[#071D49]"
                  >
                    <Eye className="h-4 w-4" aria-hidden="true" /> View Issue
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Attention Required" description="Low stock, expiry, damage, missing items, overdue returns, and safety checks due." icon={AlertTriangle}>
        {homeQuery.isLoading ? (
          <p className="py-8 text-center text-sm font-semibold text-[#64748B]">Checking laboratory attention items…</p>
        ) : attention.length === 0 ? (
          <WorkspaceEmpty
            title="No laboratory records need urgent attention."
            description="All tracked items are above their minimum quantities, returns are accounted for, and no safety inspection is due."
          />
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {attention.map((item) => <AttentionCard key={item.id} item={item} />)}
          </div>
        )}
      </Panel>
    </div>
  );
}
