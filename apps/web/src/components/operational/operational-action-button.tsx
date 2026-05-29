"use client";

import { useState } from "react";
import type { ComponentType } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Lock, RotateCcw, ShieldCheck, WifiOff } from "lucide-react";

import { Modal } from "@/components/ui/modal";

export type OperationalActionHealth =
  | "ACTIVE"
  | "LOADING"
  | "SUCCESS"
  | "LOCKED"
  | "DEGRADED"
  | "FAILED"
  | "VALIDATION_FAILED"
  | "RETRY"
  | "OFFLINE_DRAFT";

export type OperationalActionContract = {
  actionId: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  capability: string;
  workflowBinding: string;
  executionHandler: string;
  eventContract: string[];
  auditEvent: string;
  confirmation?: "NONE" | "REASON_REQUIRED" | "DANGER_CONFIRM";
  retryPolicy?: "NONE" | "RETRY" | "ESCALATE";
  fallbackHandler?: string;
  health: OperationalActionHealth;
};

const healthClass: Record<OperationalActionHealth, string> = {
  ACTIVE: "border-[#BFD7FF] bg-[#EEF6FF] text-[#0B3A7A] hover:border-[#7BAEF9]",
  LOADING: "border-border bg-surface-muted text-muted",
  SUCCESS: "border-success/25 bg-success-soft text-success hover:border-success/45",
  LOCKED: "border-border bg-surface-muted text-muted",
  DEGRADED: "border-warning/25 bg-warning-soft text-warning hover:border-warning/45",
  FAILED: "border-danger/25 bg-danger-soft text-danger hover:border-danger/45",
  VALIDATION_FAILED: "border-danger/25 bg-danger-soft text-danger hover:border-danger/45",
  RETRY: "border-warning/25 bg-warning-soft text-warning hover:border-warning/45",
  OFFLINE_DRAFT: "border-border bg-primary-soft/50 text-muted hover:border-accent/25",
};

const healthIcon: Record<OperationalActionHealth, typeof ShieldCheck> = {
  ACTIVE: ShieldCheck,
  LOADING: Clock3,
  SUCCESS: CheckCircle2,
  LOCKED: Lock,
  DEGRADED: AlertTriangle,
  FAILED: AlertTriangle,
  VALIDATION_FAILED: AlertTriangle,
  RETRY: RotateCcw,
  OFFLINE_DRAFT: WifiOff,
};

const healthDisplay: Record<OperationalActionHealth, string> = {
  ACTIVE: "Ready",
  LOADING: "Sending",
  SUCCESS: "Done",
  LOCKED: "No permission",
  DEGRADED: "Retry available",
  FAILED: "Needs retry",
  VALIDATION_FAILED: "Check form",
  RETRY: "Retry",
  OFFLINE_DRAFT: "Saved offline",
};

function healthMessage(action: OperationalActionContract) {
  if (action.health === "LOCKED") {
    return "You do not have permission for this action, but it remains visible for context.";
  }

  if (action.health === "FAILED") {
    return "The action did not complete. Use retry or contact the school system admin.";
  }

  if (action.health === "DEGRADED") {
    return "The action is still available while the system retries the connection.";
  }

  if (action.health === "VALIDATION_FAILED") {
    return "Check the form details before sending again.";
  }

  if (action.health === "OFFLINE_DRAFT") {
    return "Saved locally. Sync will retry when connectivity returns.";
  }

  if (action.health === "RETRY") {
    return "Retry is available.";
  }

  return "Ready to use.";
}

export function OperationalActionButton({
  action,
  onExecute,
  compact = false,
  showDiagnostics = true,
}: {
  action: OperationalActionContract;
  onExecute?: (action: OperationalActionContract) => void | Promise<void>;
  compact?: boolean;
  showDiagnostics?: boolean;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const Icon = isSubmitting ? Clock3 : action.icon ?? healthIcon[action.health];
  const disabled = action.health === "LOCKED" || action.health === "LOADING" || isSubmitting;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [localNotice, setLocalNotice] = useState<string | null>(null);
  const displayState = isSubmitting ? "Sending" : healthDisplay[action.health];

  async function completeAction() {
    setIsSubmitting(true);
    setLocalNotice(`${action.label} is being sent...`);

    try {
      await onExecute?.(action);
      setLocalNotice(`${action.label} sent. Related school records refreshed.`);
    } catch {
      setLocalNotice(`${action.label} could not complete. Retry remains available.`);
    } finally {
      setIsSubmitting(false);
    }
  }

  function requestAction() {
    if (disabled) {
      return;
    }

    if (action.confirmation && action.confirmation !== "NONE") {
      setConfirmOpen(true);
      return;
    }

    void completeAction();
  }

  return (
    <div
      className={`${
        compact
          ? "inline-flex max-w-full"
          : "rounded-[var(--radius-sm)] border border-border bg-surface/80 p-3 shadow-[0_12px_32px_rgba(15,23,42,0.05)]"
      }`}
      data-action-health={action.health}
    >
      <button
        type="button"
        aria-label={`${action.label} ${displayState}`}
        disabled={disabled}
        onClick={() => {
          requestAction();
        }}
        className={`inline-flex items-center gap-2 rounded-[var(--radius-xs)] border px-3 py-2 text-xs font-bold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-75 ${healthClass[action.health]}`}
      >
        <Icon className="h-3.5 w-3.5" />
        {!compact || action.health !== "ACTIVE" ? (
          <span className="rounded-full border border-current/20 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em]">
            {displayState}
          </span>
        ) : null}
        {action.label}
      </button>
      {!compact && showDiagnostics ? (
        <div className="mt-2 space-y-1 text-[10px] font-semibold leading-4 text-muted">
          <p>{healthMessage(action)}</p>
          <p>This action keeps a reporting record with the user and time.</p>
        </div>
      ) : null}
      {localNotice ? (
        <p className="mt-2 rounded-[var(--radius-xs)] border border-success/20 bg-success-soft px-2 py-1.5 text-[10px] font-bold text-success">
          {localNotice}
        </p>
      ) : null}
      <Modal
        open={confirmOpen}
        title={`Confirm ${action.label}`}
        description={
          action.confirmation === "REASON_REQUIRED"
            ? "Confirm this school action. Add the reason in the related form."
            : "This changes the visible school record. Confirm before continuing."
        }
        onClose={() => setConfirmOpen(false)}
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="rounded-[var(--radius-xs)] border border-border bg-surface px-3 py-2 text-xs font-bold text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmOpen(false);
                void completeAction();
              }}
              className="rounded-[var(--radius-xs)] border border-accent/25 bg-accent-soft px-3 py-2 text-xs font-bold text-accent"
            >
              Yes, continue
            </button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-muted">
          <p>
            {action.label} will be recorded under {action.workflowBinding} and linked to {action.auditEvent}.
          </p>
          <p>Related dashboard sections will show the update immediately in this working prototype.</p>
        </div>
      </Modal>
    </div>
  );
}
