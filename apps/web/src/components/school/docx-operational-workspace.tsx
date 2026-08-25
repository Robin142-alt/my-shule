"use client";

import { useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";

import { OperationalActionButton, type OperationalActionContract } from "@/components/operational/operational-action-button";
import { OperationalFormShell, type OperationalFormContract, type OperationalFormField, type OperationalFormFooterAction, type OperationalFormValues } from "@/components/operational/operational-form-shell";
import { OperationalTable, type OperationalTableColumn, type OperationalTableContract } from "@/components/operational/operational-table";
import { WorkspaceHeader } from "@/components/operational/workspace-header";
import { getCsrfToken } from "@/lib/auth/csrf-client";
import { getDocxAddedModuleContract } from "@/lib/operational/myshule-extreme-operating-system";

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleize(value: string) {
  return value
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function currentRouteParts() {
  if (typeof window === "undefined") {
    return { schoolName: "School workspace", role: "School staff" };
  }

  const parts = window.location.pathname.split("/").filter(Boolean);
  const schoolName = parts[0] === "school" && parts[1] ? titleize(parts[1]) : "School workspace";
  const role = parts[0] === "school" && parts[2] ? titleize(parts[2]) : "School staff";

  return { schoolName, role };
}

function toWorkflowBinding(label: string, moduleId: string) {
  return `${slug(moduleId)}.${slug(label).replace(/-/g, "_") || "action"}`;
}

function toAction(label: string, index: number, moduleId: string): OperationalActionContract {
  const workflowBinding = toWorkflowBinding(label, moduleId);

  return {
    actionId: `${slug(moduleId)}-urgent-${index}`,
    label,
    capability: "CAN_EXECUTE_OPERATIONAL_WORKFLOW",
    workflowBinding,
    executionHandler: workflowBinding,
    eventContract: ["workflow.event.created"],
    auditEvent: `audit.${workflowBinding}`,
    confirmation: /delete|archive|suspend|reject|reverse/i.test(label) ? "REASON_REQUIRED" : "NONE",
    retryPolicy: "RETRY",
    fallbackHandler: "workflow-event",
    health: "ACTIVE",
  };
}

function toColumns(labels: string[]): OperationalTableColumn[] {
  const normalized = labels.filter((label) => label.trim().length > 0);
  const source = normalized.length ? normalized : ["Record", "Status", "Actions"];

  return source.map((label, index) => ({
    key: slug(label) || `column-${index}`,
    label,
  }));
}

function toTableContract(
  table: { title: string; columns: string[]; rowActions: string[]; bulkActions: string[] },
  moduleTitle: string,
): OperationalTableContract {
  const columns = toColumns(table.columns);

  return {
    title: table.title || `${moduleTitle} records`,
    description: "Live school-scoped records for this workspace. Empty state means no records currently require action.",
    searchPlaceholder: `Search ${moduleTitle.toLowerCase()} records`,
    filters: ["Pending", "Today", "Urgent"],
    sortOptions: ["Newest", "Highest priority", "Due first"],
    columns,
    rows: [],
    bulkActions: table.bulkActions.filter(Boolean),
    exportLabel: `Export ${moduleTitle}`,
    printLabel: `Print ${moduleTitle}`,
  };
}

const allowedFooterActions: OperationalFormFooterAction[] = [
  "Cancel",
  "Save Draft",
  "Submit",
  "Preview",
  "Print",
  "Submit for Approval",
  "Send SMS",
  "Preview Print",
];

function toFooterActions(actions: string[]): OperationalFormFooterAction[] {
  const filtered = actions.filter((action): action is OperationalFormFooterAction =>
    allowedFooterActions.includes(action as OperationalFormFooterAction),
  );

  return filtered.length ? Array.from(new Set(filtered)) : ["Cancel", "Save Draft", "Submit"];
}

function fieldType(label: string): OperationalFormField["type"] {
  const value = label.toLowerCase();

  if (/email/.test(value)) return "email";
  if (/phone|mobile|sms/.test(value)) return "tel";
  if (/date|expiry|deadline|due/.test(value)) return "date";
  if (/time/.test(value)) return "time";
  if (/amount|capacity|quantity|number|total|\bcount\b/.test(value)) return "number";
  if (/note|reason|comment|message|description/.test(value)) return "textarea";
  if (/status|role|class|stream|term|year|type|category|priority/.test(value)) return "select";

  return "text";
}

function toFormContract(
  form: { title: string; fields: string[]; footerActions: string[] },
  moduleId: string,
): OperationalFormContract {
  const fields = form.fields.filter(Boolean).map((label, index): OperationalFormField => {
    const type = fieldType(label);

    return {
      id: `${slug(moduleId)}-${slug(form.title)}-${index}`,
      label,
      type,
      options: type === "select" ? ["Pending", "In progress", "Approved", "Completed"] : undefined,
      required: !/optional|note|comment|message/i.test(label),
    };
  });

  const workflowBinding = toWorkflowBinding(form.title, moduleId);

  return {
    title: form.title,
    description: "This form records a governed school workflow action with tenant context and audit metadata.",
    fields,
    footerActions: toFooterActions(form.footerActions),
    auditAction: `audit.${workflowBinding}`,
    workflowBinding,
    capability: "CAN_SUBMIT_OPERATIONAL_FORM",
  };
}

async function postWorkflowEvent(input: {
  moduleId: string;
  moduleTitle: string;
  action: string;
  entityType: string;
  payload: Record<string, unknown>;
}) {
  const csrfToken = await getCsrfToken();
  const response = await fetch("/api/workflow/events", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "x-myshule-csrf": csrfToken,
    },
    body: JSON.stringify({
      eventType: toWorkflowBinding(input.action, input.moduleId),
      entityType: input.entityType,
      title: `${input.moduleTitle}: ${input.action}`,
      message: `${input.action} was recorded for ${input.moduleTitle}.`,
      priority: /urgent|critical|failed|reject|delay/i.test(input.action) ? "high" : "normal",
      targetRoles: ["principal", "deputy_principal"],
      payload: input.payload,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? `${input.action} could not be recorded.`);
  }
}

export function DocxOperationalWorkspace({ moduleId }: { moduleId: string }) {
  const docxContract = getDocxAddedModuleContract(moduleId);
  const [actionError, setActionError] = useState<string | null>(null);
  const routeParts = useMemo(() => currentRouteParts(), []);

  if (!docxContract) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center space-y-4 rounded-xl border border-dashed p-10 text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-500" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold tracking-tight">Workspace Not Found</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            The workspace definition for &quot;{moduleId}&quot; could not be found in the operational blueprint system.
          </p>
        </div>
      </div>
    );
  }

  const contract = docxContract;
  const actions = contract.urgentActionStrip.map((label, index) => toAction(label, index, contract.id));
  const tables = [toTableContract(contract.mainTable, contract.title)];
  const forms = contract.forms.map((form) => toFormContract(form, contract.id));

  async function handleAction(action: string, context: { scope: string; rowId?: string }) {
    setActionError(null);
    try {
      await postWorkflowEvent({
        moduleId: contract.id,
        moduleTitle: contract.title,
        action,
        entityType: "operational_workspace_action",
        payload: { context, moduleId: contract.id },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Action execution failed.";
      setActionError(message);
      throw error;
    }
  }

  return (
    <div className="space-y-5">
      <WorkspaceHeader
        title={contract.title}
        description={`Manage ${contract.title.toLowerCase()} workflows with school-scoped records, permissions, and audit events.`}
        contextBar={{
          schoolName: routeParts.schoolName,
          academicYear: "Current year",
          term: "Current term",
          weekDate: new Date().toLocaleDateString("en-KE", { weekday: "short", day: "2-digit", month: "short" }),
          userRole: routeParts.role,
          scope: "Tenant scoped",
        }}
        permission="FULL_ACCESS"
        moduleStatus="ACTIVE"
      />

      {actionError ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          {actionError}
        </div>
      ) : null}

      {actions.length > 0 ? (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {actions.map((action) => (
            <OperationalActionButton
              key={action.actionId}
              action={action}
              onExecute={async (nextAction) => {
                await handleAction(nextAction.label, { scope: "urgent" });
                return `${nextAction.label} was recorded in the workflow event log.`;
              }}
            />
          ))}
        </section>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          {tables.map((table) => (
            <OperationalTable
              key={table.title}
              onAction={handleAction}
              contract={table}
              emptyMessage="No live records are waiting in this workspace. Use the form or action strip to create a governed workflow item."
            />
          ))}
        </div>

        <div className="space-y-5">
          {forms.length > 0 ? (
            forms.map((form) => (
              <OperationalFormShell
                key={form.title}
                onAction={async (action, formContract, values: OperationalFormValues) => {
                  setActionError(null);
                  try {
                    await postWorkflowEvent({
                      moduleId: contract.id,
                      moduleTitle: contract.title,
                      action,
                      entityType: "operational_form_submission",
                      payload: {
                        formTitle: formContract.title,
                        workflowBinding: formContract.workflowBinding,
                        values,
                      },
                    });
                  } catch (error) {
                    const message = error instanceof Error ? error.message : "Form submission failed.";
                    setActionError(message);
                    throw error;
                  }
                }}
                contract={form}
              />
            ))
          ) : (
            <div className="rounded-xl border p-5 text-center text-sm text-muted-foreground shadow-sm">
              No form is required for this workspace. Use the action strip or table controls to record work.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
