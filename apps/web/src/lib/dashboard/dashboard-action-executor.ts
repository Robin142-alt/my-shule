import type { DashboardActionContract } from "@/lib/dashboard/dashboard-action-contract";

export type DashboardActionExecutionEvidence = {
  status: "started" | "succeeded" | "failed" | "disabled";
  message: string;
  eventId?: string;
  recordId?: string;
  fileName?: string;
  queuedCount?: number;
  sentCount?: number;
  failedCount?: number;
  skippedCount?: number;
};

export function disabledEvidence(contract: DashboardActionContract): DashboardActionExecutionEvidence {
  return {
    status: "disabled",
    message: contract.disabledReason ?? "Disabled: this dashboard action is not configured.",
  };
}
