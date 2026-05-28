"use client";

import { useState } from "react";
import { CheckCircle2, ClipboardCheck, FileClock, RadioTower } from "lucide-react";

import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import type { ApprovalWorkflow, ApprovalWorkflowAction, ApprovalWorkflowActionHealth } from "@/lib/workflows/workflow-catalog";
import { dispatchOperationalWorkflowAction } from "@/lib/workflows/operational-workflow-client";

const stageLabels: Record<ApprovalWorkflow["stage"], string> = {
  request: "Request",
  review: "Review",
  approval: "Approval",
  release: "Release",
};

type RuntimeActionState = {
  health: ApprovalWorkflowActionHealth;
  busy?: boolean;
  message?: string;
  eventName?: string;
};

function actionKey(workflowId: string, actionId: string) {
  return `${workflowId}:${actionId}`;
}

function actionHealthClass(health: ApprovalWorkflowActionHealth) {
  if (health === "FAILED") {
    return "border-danger/25 bg-danger-soft text-danger hover:border-danger/40";
  }

  if (health === "DEGRADED") {
    return "border-warning/25 bg-warning-soft text-warning hover:border-warning/40";
  }

  if (health === "LOCKED") {
    return "border-border bg-surface-muted text-muted";
  }

  return "border-accent/25 bg-accent-soft text-accent hover:border-accent/40";
}

function actionHealthLabel(state: RuntimeActionState | undefined, action: ApprovalWorkflowAction) {
  const health = state?.health ?? action.health ?? "ACTIVE";

  if (state?.busy) {
    return "DEGRADED";
  }

  return health;
}

function actionHealthDisplay(health: ApprovalWorkflowActionHealth, busy?: boolean) {
  if (busy) return "Sending";
  if (health === "FAILED") return "Needs retry";
  if (health === "DEGRADED") return "Retry available";
  if (health === "LOCKED") return "No permission";
  return "Ready";
}

export function ApprovalCommandPanel({
  workflows,
  title = "Approval queue",
  subtitle = "Requests waiting for review, approval, return, or follow-up.",
}: {
  workflows: ApprovalWorkflow[];
  title?: string;
  subtitle?: string;
}) {
  const [actionStates, setActionStates] = useState<Record<string, RuntimeActionState>>({});

  async function handleAction(workflow: ApprovalWorkflow, action: ApprovalWorkflowAction) {
    const key = actionKey(workflow.id, action.actionId);

    if ((actionStates[key]?.health ?? action.health) === "LOCKED") {
      return;
    }

    setActionStates((current) => ({
      ...current,
      [key]: {
        health: "DEGRADED",
        busy: true,
        message: `${action.label} is being sent for review.`,
      },
    }));

    try {
      const result = await dispatchOperationalWorkflowAction({
        actionId: action.actionId,
        workflowBinding: action.workflowBinding,
        payload: {
          workflowId: workflow.id,
          workflowLabel: workflow.label,
          actionLabel: action.label,
          emittedEvents: action.emittedEvents,
          auditAction: action.auditAction,
        },
      });

      setActionStates((current) => ({
        ...current,
        [key]: {
          health: "ACTIVE",
          message: `${action.label} completed.`,
          eventName: result.eventName,
        },
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Operational dispatcher unavailable.";

      setActionStates((current) => ({
        ...current,
        [key]: {
          health: "FAILED",
          message: `${action.label} needs retry: ${message}`,
          eventName: "Retry is available. The request remains visible.",
        },
      }));
    }
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Approvals</p>
          <h3 className="mt-2 text-lg font-semibold text-foreground">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted">{subtitle}</p>
        </div>
        <StatusPill
          label={`${workflows.length} active`}
          tone={workflows.some((workflow) => workflow.tone === "critical") ? "critical" : workflows.length > 0 ? "warning" : "ok"}
        />
      </div>

      <div className="mt-5 space-y-3">
        {workflows.length === 0 ? (
          <div className="rounded-[var(--radius-sm)] border border-border bg-primary-soft/40 px-4 py-4 text-sm text-muted">
            No approval requests are waiting right now.
          </div>
        ) : (
          workflows.map((workflow) => (
            <div key={workflow.id} className="rounded-[var(--radius-sm)] border border-border bg-surface-muted/75 px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-accent" />
                    <p className="text-sm font-semibold text-foreground">{workflow.label}</p>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted">{workflow.description}</p>
                </div>
                <StatusPill label={`${workflow.count}`} tone={workflow.tone} compact />
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                {(["request", "review", "approval", "release"] as const).map((stage) => {
                  const active = stage === workflow.stage;
                  const Icon = stage === "release" ? RadioTower : stage === "approval" ? CheckCircle2 : FileClock;

                  return (
                    <div
                      key={stage}
                      className={`rounded-[var(--radius-xs)] border px-2 py-2 ${
                        active
                          ? "border-accent/35 bg-accent-soft text-accent"
                          : "border-border bg-primary-soft/30"
                      }`}
                    >
                      <Icon className="mb-1 h-3.5 w-3.5" />
                      {stageLabels[stage]}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 rounded-[var(--radius-xs)] border border-border bg-primary-soft/25 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Actions</p>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                    Permission checked
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {workflow.actions.map((action) => {
                    const key = actionKey(workflow.id, action.actionId);
                    const state = actionStates[key];
                    const health = actionHealthLabel(state, action);
                    const disabled = health === "LOCKED" || Boolean(state?.busy);

                    return (
                      <button
                        key={action.actionId}
                        type="button"
                        aria-label={action.label}
                        disabled={disabled}
                        onClick={() => void handleAction(workflow, action)}
                        className={`inline-flex items-center gap-2 rounded-[var(--radius-xs)] border px-3 py-2 text-xs font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 ${actionHealthClass(health)}`}
                      >
                        <span className="rounded-full border border-current/20 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em]">
                          {actionHealthDisplay(health, state?.busy)}
                        </span>
                        {action.label}
                      </button>
                    );
                  })}
                </div>
                {workflow.actions.map((action) => {
                  const state = actionStates[actionKey(workflow.id, action.actionId)];

                  if (!state?.message) {
                    return null;
                  }

                  return (
                    <div
                      key={`${action.actionId}-status`}
                      className={`mt-3 rounded-[var(--radius-xs)] border px-3 py-2 text-xs leading-5 ${
                        state.health === "FAILED"
                          ? "border-danger/20 bg-danger-soft/60 text-danger"
                          : "border-accent/20 bg-accent-soft/50 text-accent"
                      }`}
                    >
                      <p className="font-semibold">{state.message}</p>
                      {state.eventName ? <p className="mt-1 text-current/80">{state.eventName}</p> : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
