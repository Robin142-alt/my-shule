export type DashboardActionType =
  | "OPEN_WORKSPACE"
  | "OPEN_MODAL"
  | "NAVIGATE_ROUTE"
  | "FETCH_RECORDS"
  | "MUTATE_RECORD"
  | "SEND_COMMUNICATION"
  | "PRINT_PREVIEW"
  | "EXPORT_FILE"
  | "CREATE_NOTIFICATION_TASK"
  | "DISABLED_WITH_REASON";

export type DashboardActionContract = {
  id: string;
  label: string;
  sourceRole: string;
  sourceDashboard: string;
  sourceModule: string;
  actionType: DashboardActionType;
  enabled?: boolean;
  requiredPermission: string;
  requiredSchoolId: string;
  requiredData: string[];
  destination?: string;
  modal?: string;
  workspace?: string;
  route?: string;
  api?: { method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"; path: string };
  method?: string;
  payload?: string;
  handler: string;
  loadingState: string;
  successState: string;
  failureState: string;
  emptyState: string;
  refreshQueries: string[];
  affectedDashboards: string[];
  mutation?: string;
  notification?: string;
  inAppNotification?: string;
  smsOrEmail?: string;
  printOrExport?: string;
  auditTrail: string;
  tenantIsolation: string;
  testRequirement: string;
  disabledReason?: string;
};

export const fakeSuccessPhrases = [
  "Opened Attendance",
  "Action completed",
  "Workflow dispatched",
  "completed successfully",
  "is being sent",
  "print started",
  "export generated",
  "Request submitted",
] as const;

const requiredContractFields = [
  "id",
  "label",
  "sourceRole",
  "sourceDashboard",
  "sourceModule",
  "actionType",
  "requiredPermission",
  "requiredSchoolId",
  "tenantIsolation",
  "handler",
  "loadingState",
  "successState",
  "failureState",
  "emptyState",
  "auditTrail",
  "testRequirement",
] as const satisfies ReadonlyArray<keyof DashboardActionContract>;

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasMeaningfulProof(value: unknown): boolean {
  return hasText(value) && value.trim().toLowerCase() !== "none";
}

export function assertDashboardActionContract<T extends Partial<DashboardActionContract>>(action: T): T {
  for (const field of requiredContractFields) {
    if (!hasText(action[field])) {
      throw new Error(`Dashboard action contract ${action.id ?? "(missing id)"} is missing ${field}.`);
    }
  }

  if (!/(schoolId|tenant|current school)/i.test(action.tenantIsolation ?? "")) {
    throw new Error(
      `Dashboard action contract ${action.id ?? "(missing id)"} tenantIsolation must mention schoolId, tenant, or current school.`,
    );
  }

  const isDisabled = action.enabled === false || action.actionType === "DISABLED_WITH_REASON";
  if (isDisabled) {
    if (!hasText(action.disabledReason) || !action.disabledReason.trim().startsWith("Disabled:")) {
      throw new Error(
        `Dashboard action contract ${action.id ?? "(missing id)"} disabled actions require a visible disabledReason starting with "Disabled:".`,
      );
    }

    return action;
  }

  const hasProofOfWork = [
    action.destination,
    action.modal,
    action.workspace,
    action.route,
    action.api,
    action.mutation,
    action.notification,
    action.printOrExport,
    action.disabledReason,
  ].some(hasMeaningfulProof);

  if (!hasProofOfWork) {
    throw new Error(
      `Enabled dashboard action contract ${action.id ?? "(missing id)"} requires destination, modal, workspace, route, api, print, export, mutation, notification, or disabledReason proof of work.`,
    );
  }

  return action;
}
