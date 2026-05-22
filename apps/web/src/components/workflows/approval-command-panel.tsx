import { CheckCircle2, ClipboardCheck, FileClock, RadioTower } from "lucide-react";

import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import type { ApprovalWorkflow } from "@/lib/workflows/workflow-catalog";

const stageLabels: Record<ApprovalWorkflow["stage"], string> = {
  request: "Request",
  review: "Review",
  approval: "Approval",
  release: "Release",
};

export function ApprovalCommandPanel({
  workflows,
  title = "Approval command queue",
  subtitle = "Only enabled-module workflows appear here.",
}: {
  workflows: ApprovalWorkflow[];
  title?: string;
  subtitle?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Governance</p>
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
            No approval workflows are visible for the enabled module set.
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
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
