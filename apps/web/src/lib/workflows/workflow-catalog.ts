import type { SchoolModuleCode } from "@/lib/module-access/module-access-map";

export type ApprovalWorkflow = {
  id: string;
  label: string;
  description: string;
  moduleCode: SchoolModuleCode;
  roles: string[];
  stage: "request" | "review" | "approval" | "release";
  count: number;
  tone: "ok" | "warning" | "critical";
};

export const approvalWorkflowCatalog: ApprovalWorkflow[] = [
  {
    id: "exam-release",
    label: "Exam release approvals",
    description: "Approve moderated results before they become visible to families.",
    moduleCode: "exams",
    roles: ["principal", "deputy-principal", "hod"],
    stage: "approval",
    count: 4,
    tone: "warning",
  },
  {
    id: "procurement-approval",
    label: "Procurement approvals",
    description: "Review purchase requests, supplier decisions, and delivery exposure.",
    moduleCode: "procurement",
    roles: ["principal", "bursar", "procurement-officer"],
    stage: "review",
    count: 6,
    tone: "warning",
  },
  {
    id: "leave-approval",
    label: "Leave approvals",
    description: "Approve staff leave while preserving timetable coverage.",
    moduleCode: "staff",
    roles: ["principal", "deputy-principal", "hr-officer"],
    stage: "approval",
    count: 2,
    tone: "ok",
  },
  {
    id: "inventory-writeoff",
    label: "Inventory write-offs",
    description: "Authorize loss, damage, and reconciliation adjustments.",
    moduleCode: "inventory",
    roles: ["principal", "bursar", "storekeeper", "procurement-officer"],
    stage: "approval",
    count: 3,
    tone: "warning",
  },
  {
    id: "discipline-escalation",
    label: "Disciplinary approvals",
    description: "Approve escalated sanctions and parent-facing incident outcomes.",
    moduleCode: "discipline",
    roles: ["principal", "deputy-principal", "class-teacher"],
    stage: "approval",
    count: 5,
    tone: "critical",
  },
  {
    id: "medicine-disposal",
    label: "Medicine disposal approvals",
    description: "Approve expired medicine disposal and emergency supply restock.",
    moduleCode: "clinic_health",
    roles: ["principal", "nurse"],
    stage: "review",
    count: 1,
    tone: "warning",
  },
  {
    id: "budget-approval",
    label: "Budget approvals",
    description: "Release finance-controlled budgets after accountability review.",
    moduleCode: "finance",
    roles: ["principal", "bursar", "accountant"],
    stage: "release",
    count: 2,
    tone: "ok",
  },
];

export function isModuleCodeEnabled(
  moduleCode: string,
  enabledModuleCodes: ReadonlySet<string> | string[] | null | undefined,
) {
  if (!enabledModuleCodes) {
    return false;
  }

  return Array.isArray(enabledModuleCodes)
    ? enabledModuleCodes.includes(moduleCode)
    : enabledModuleCodes.has(moduleCode);
}

export function getVisibleApprovalWorkflows(input: {
  role: string;
  enabledModuleCodes: ReadonlySet<string> | string[] | null | undefined;
}) {
  return approvalWorkflowCatalog.filter(
    (workflow) =>
      workflow.roles.includes(input.role) &&
      isModuleCodeEnabled(workflow.moduleCode, input.enabledModuleCodes),
  );
}
