import { useState } from "react";
import { Clock3, UserRoundCheck } from "lucide-react";

import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import type { StatusTone } from "@/lib/dashboard/types";
import {
  getCurrentSchoolId,
  publishSchoolOperationalEvent,
} from "@/lib/school/school-operational-store";

import {
  OperationalActionButton,
  type OperationalActionContract,
  type OperationalActionExecutionResult,
} from "./operational-action-button";

export type OperationalQueueItem = {
  id: string;
  title: string;
  owner: string;
  workflow: string;
  sla: string;
  priority: {
    label: string;
    tone: StatusTone;
  };
  actions: OperationalActionContract[];
  auditEvent: string;
};

export type OperationalQueueContract = {
  title: string;
  description: string;
  items: OperationalQueueItem[];
  bulkActions: OperationalActionContract[];
};

export function OperationalQueue({
  contract,
  onExecute,
}: {
  contract: OperationalQueueContract;
  onExecute?: (
    action: OperationalActionContract,
  ) => OperationalActionExecutionResult | string | void | Promise<OperationalActionExecutionResult | string | void>;
}) {
  const [items, setItems] = useState(() => contract.items);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeTone, setNoticeTone] = useState<"success" | "warning" | "danger">("success");

  function updateItemPriority(itemId: string, label: string, tone: StatusTone) {
    setItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, priority: { label, tone } } : item)),
    );
  }

  function queueEventType(actionLabel: string) {
    return `operational_queue.${actionLabel.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "action"}`;
  }

  function publishQueueAction(action: OperationalActionContract, item?: OperationalQueueItem) {
    const normalized = action.label.toLowerCase();
    const targetItems = item ? [item] : items;

    publishSchoolOperationalEvent({
      schoolId: getCurrentSchoolId(),
      type: action.auditEvent || queueEventType(action.label),
      module: action.workflowBinding || "operational-queue",
      actorRole: "school-staff",
      entityId: item?.id ?? contract.title,
      title: `${contract.title}: ${action.label}`,
      body: `${action.label} accepted for ${targetItems.length} ${targetItems.length === 1 ? "queue item" : "queue items"}.`,
      severity: /reject|escalate|failed/.test(normalized) ? "warning" : "info",
      payload: {
        actionId: action.actionId,
        capability: action.capability,
        workflowBinding: action.workflowBinding,
        executionHandler: action.executionHandler,
        eventContract: action.eventContract,
        queueTitle: contract.title,
        itemIds: targetItems.map((queueItem) => queueItem.id),
        auditEvents: targetItems.map((queueItem) => queueItem.auditEvent),
      },
      notifications: /sms|notify|alert|reminder|approve|reject|assign|escalate/.test(normalized)
        ? [
            {
              audienceRoles: ["Principal", "Deputy Principal"],
              title: `${contract.title}: ${action.label}`,
              body: `${action.label} was recorded for ${targetItems.length} ${targetItems.length === 1 ? "queue item" : "queue items"}.`,
              severity: /reject|escalate|failed/.test(normalized) ? "warning" : "info",
              relatedModule: action.workflowBinding || "operational-queue",
              relatedRecordId: item?.id,
              requiresAction: /approve|reject|assign|escalate/.test(normalized),
            },
          ]
        : undefined,
      sms: /sms/.test(normalized)
        ? targetItems.map((queueItem) => ({
            recipient: queueItem.owner,
            message: `${contract.title}: ${action.label} has been recorded for ${queueItem.title}.`,
          }))
        : undefined,
    });
  }

  async function executeAction(
    action: OperationalActionContract,
    item?: OperationalQueueItem,
  ): Promise<OperationalActionExecutionResult> {
    const normalized = action.label.toLowerCase();
    let resultMessage = "";
    let resultTone: OperationalActionExecutionResult["tone"] = "success";

    setNoticeTone("warning");
    setNotice(`${action.label} is being processed...`);

    let handlerResult: OperationalActionExecutionResult | string | void;
    try {
      handlerResult = onExecute ? await onExecute(action) : undefined;
      if (!onExecute) publishQueueAction(action, item);
    } catch (error) {
      setNoticeTone("danger");
      setNotice(error instanceof Error ? error.message : "The connected workflow failed.");
      throw error;
    }
    if (handlerResult && typeof handlerResult === "object" && "message" in handlerResult) {
      resultMessage = handlerResult.message;
      resultTone = handlerResult.tone ?? resultTone;
    } else if (typeof handlerResult === "string" && handlerResult.trim().length > 0) {
      resultMessage = handlerResult;
    }

    if (resultTone === "danger") {
      setNotice(resultMessage);
      setNoticeTone("danger");
      return { message: resultMessage, tone: resultTone };
    }

    if (item) {
      if (/approve/.test(normalized)) {
        updateItemPriority(item.id, "Approved", "ok");
        resultMessage ||= `${item.title} approved and related records updated.`;
      } else if (/reject/.test(normalized)) {
        updateItemPriority(item.id, "Rejected", "critical");
        resultMessage ||= `${item.title} rejected and returned to the responsible desk.`;
        resultTone ||= "warning";
      } else if (/resolve|mark/.test(normalized)) {
        updateItemPriority(item.id, "Resolved", "ok");
        resultMessage ||= `${item.title} marked solved.`;
      } else if (/sms|notify|alert|reminder/.test(normalized)) {
        resultMessage ||= `SMS queued for ${item.title}.`;
        resultTone = "warning";
      } else if (/assign/.test(normalized)) {
        updateItemPriority(item.id, "Assigned", "ok");
        resultMessage ||= `${item.title} assigned for follow-up.`;
      } else if (/escalate/.test(normalized)) {
        updateItemPriority(item.id, "Escalated", "warning");
        resultMessage ||= `${item.title} escalated to the next school desk.`;
        resultTone = "warning";
      } else {
        resultMessage ||= `${action.label} was recorded for ${item.title} and queued for dashboard sync.`;
      }
    } else if (/approve/.test(normalized)) {
      setItems((current) => current.map((queueItem) => ({ ...queueItem, priority: { label: "Approved", tone: "ok" } })));
      resultMessage ||= "Selected queue items approved.";
    } else if (/sms|notify|alert|reminder/.test(normalized)) {
      resultMessage ||= "SMS queued for all queued families.";
      resultTone = "warning";
    } else if (/assign/.test(normalized)) {
      setItems((current) => current.map((queueItem) => ({ ...queueItem, priority: { label: "Assigned", tone: "ok" } })));
      resultMessage ||= "Selected queue items assigned.";
    } else if (/escalate/.test(normalized)) {
      setItems((current) =>
        current.map((queueItem) => ({ ...queueItem, priority: { label: "Escalated", tone: "warning" } })),
      );
      resultMessage ||= "Selected queue items escalated.";
      resultTone = "warning";
    } else {
      resultMessage ||= `${action.label} was recorded for this queue and queued for dashboard sync.`;
    }

    setNotice(resultMessage);
    setNoticeTone(resultTone === "warning" ? "warning" : "success");
    return { message: resultMessage, tone: resultTone };
  }

  return (
    <Card className="flex min-h-[260px] flex-col overflow-visible p-4">
      <div className="shrink-0 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{"Today\u2019s Work"}</p>
          <h2 className="mt-2 text-lg font-bold text-foreground">{contract.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{contract.description}</p>
        </div>
        <StatusPill label={`${items.length} queued`} tone={items.length > 0 ? "warning" : "ok"} />
      </div>

      {items.length > 0 && contract.bulkActions.length > 0 ? (
        <div className="mt-4 shrink-0 flex flex-wrap gap-2 rounded-[var(--radius-sm)] border border-border bg-primary-soft/35 p-3">
          {contract.bulkActions.map((action) => (
            <OperationalActionButton
              key={action.actionId}
              action={action}
              onExecute={(executedAction) => executeAction(executedAction)}
              compact
            />
          ))}
        </div>
      ) : null}

      {notice ? (
        <div role={noticeTone === "danger" ? "alert" : "status"} aria-atomic="true" className={`mt-3 break-words rounded-[var(--radius-sm)] border px-3 py-2 text-sm font-bold ${
          noticeTone === "danger"
            ? "border-danger/20 bg-danger-soft text-danger"
            : noticeTone === "warning"
              ? "border-warning/20 bg-warning-soft text-warning"
              : "border-success/20 bg-success-soft text-success"
        }`}>
          {notice}
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-[var(--radius-sm)] border border-dashed border-border bg-surface-muted/70 p-5 text-sm font-semibold text-muted">
            No pending work in this queue. Create the first record from the Form tab, or refresh after another school desk submits work.
          </div>
        ) : null}
        {items.map((item) => (
          <article key={item.id} className="rounded-[var(--radius-sm)] border border-border bg-surface-muted/75 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">{item.title}</h3>
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <UserRoundCheck className="h-3.5 w-3.5 text-accent" />
                    Owner: {item.owner}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5 text-accent" />
                    Due: {item.sla}
                  </span>
                  <span>Progress: {item.workflow}</span>
                </div>
              </div>
              <StatusPill label={item.priority.label} tone={item.priority.tone} compact />
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {item.actions.map((action) => (
                <OperationalActionButton
                  key={action.actionId}
                  action={action}
                  onExecute={(executedAction) => executeAction(executedAction, item)}
                  compact
                />
              ))}
            </div>
            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-muted">
              Reporting record active for this item
            </p>
          </article>
        ))}
      </div>
    </Card>
  );
}
