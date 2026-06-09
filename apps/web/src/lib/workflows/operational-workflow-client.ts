import { requestSchoolApiProxy } from "@/lib/dashboard/school-api-proxy-client";

export type OperationalActionDispatchInput = {
  actionId: string;
  workflowBinding: string;
  role?: string;
  aggregateId?: string;
  commandId?: string;
  payload?: Record<string, unknown>;
};

export type OperationalActionDispatchResult = {
  status: "DISPATCHED";
  actionId: string;
  workflowBinding: string;
  executionHandler?: string;
  eventId?: string;
  eventName: string;
  widgetRefresh?: {
    dashboardId: string;
    nodeId: string;
    events: string[];
  };
  auditAction?: string;
};

export async function dispatchOperationalWorkflowAction(
  input: OperationalActionDispatchInput,
): Promise<OperationalActionDispatchResult> {
  const role = input.role ?? "principal";
  const endpoint =
    role === "principal" && !input.payload?.runtimeActionContract
      ? `/operational-workflows/principal/actions/${encodeURIComponent(input.actionId)}/dispatch`
      : `/operational-workflows/roles/${encodeURIComponent(role)}/actions/${encodeURIComponent(input.actionId)}/dispatch`;

  return requestSchoolApiProxy<OperationalActionDispatchResult>(
    endpoint,
    {
      method: "POST",
      body: {
        aggregateId: input.aggregateId ?? `${input.workflowBinding}:${input.actionId}`,
        commandId: input.commandId,
        payload: input.payload ?? {},
      },
    },
  );
}
