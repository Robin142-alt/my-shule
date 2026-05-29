import { useState } from "react";
import { Clock3, UserRoundCheck } from "lucide-react";

import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import type { StatusTone } from "@/lib/dashboard/types";

import { OperationalActionButton, type OperationalActionContract } from "./operational-action-button";

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
  onExecute?: (action: OperationalActionContract) => void;
}) {
  const [items, setItems] = useState(() => contract.items);
  const [notice, setNotice] = useState<string | null>(null);

  function updateItemPriority(itemId: string, label: string, tone: StatusTone) {
    setItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, priority: { label, tone } } : item)),
    );
  }

  function executeAction(action: OperationalActionContract, item?: OperationalQueueItem) {
    const normalized = action.label.toLowerCase();

    if (item) {
      if (/approve/.test(normalized)) {
        updateItemPriority(item.id, "Approved", "ok");
        setNotice(`${item.title} approved and related records updated.`);
      } else if (/reject/.test(normalized)) {
        updateItemPriority(item.id, "Rejected", "critical");
        setNotice(`${item.title} rejected and returned to the responsible desk.`);
      } else if (/resolve|mark/.test(normalized)) {
        updateItemPriority(item.id, "Resolved", "ok");
        setNotice(`${item.title} marked solved.`);
      } else if (/sms|notify|alert|reminder/.test(normalized)) {
        setNotice(`SMS queued for ${item.title}.`);
      } else if (/assign/.test(normalized)) {
        updateItemPriority(item.id, "Assigned", "ok");
        setNotice(`${item.title} assigned for follow-up.`);
      } else if (/escalate/.test(normalized)) {
        updateItemPriority(item.id, "Escalated", "warning");
        setNotice(`${item.title} escalated to the next school desk.`);
      } else {
        setNotice(`${action.label} completed for ${item.title}.`);
      }
    } else if (/approve/.test(normalized)) {
      setItems((current) => current.map((queueItem) => ({ ...queueItem, priority: { label: "Approved", tone: "ok" } })));
      setNotice("Selected queue items approved.");
    } else if (/sms|notify|alert|reminder/.test(normalized)) {
      setNotice("SMS queued for all queued families.");
    } else if (/assign/.test(normalized)) {
      setItems((current) => current.map((queueItem) => ({ ...queueItem, priority: { label: "Assigned", tone: "ok" } })));
      setNotice("Selected queue items assigned.");
    } else if (/escalate/.test(normalized)) {
      setItems((current) =>
        current.map((queueItem) => ({ ...queueItem, priority: { label: "Escalated", tone: "warning" } })),
      );
      setNotice("Selected queue items escalated.");
    } else {
      setNotice(`${action.label} completed for this queue.`);
    }

    onExecute?.(action);
  }

  return (
    <Card className="flex max-h-[calc(100vh-330px)] min-h-[300px] flex-col overflow-hidden p-4">
      <div className="shrink-0 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{"Today\u2019s Work"}</p>
          <h2 className="mt-2 text-lg font-bold text-foreground">{contract.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{contract.description}</p>
        </div>
        <StatusPill label={`${items.length} queued`} tone={items.length > 0 ? "warning" : "ok"} />
      </div>

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

      {notice ? (
        <div className="mt-3 rounded-[var(--radius-sm)] border border-success/20 bg-success-soft px-3 py-2 text-xs font-bold text-success">
          {notice}
        </div>
      ) : null}

      <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <div className="rounded-[var(--radius-sm)] border border-dashed border-border bg-surface-muted/70 p-5 text-sm font-semibold text-muted">
            No pending work in this queue right now.
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
              Reporting record ready for this item
            </p>
          </article>
        ))}
      </div>
    </Card>
  );
}
