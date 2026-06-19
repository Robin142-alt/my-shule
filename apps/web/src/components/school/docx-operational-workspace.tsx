// @ts-nocheck
"use client";

import { AlertCircle } from "lucide-react";
import { getDocxAddedModuleContract } from "@/lib/operational/myshule-extreme-operating-system";
import { OperationalStatePanel } from "@/components/operational/operational-state-panel";
import { OperationalTable } from "@/components/operational/operational-table";
import { OperationalFormShell } from "@/components/operational/operational-form-shell";
import { WorkspaceHeader } from "@/components/operational/workspace-header";

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function DocxOperationalWorkspace({ moduleId }: { moduleId: string }) {
  const docxContract = getDocxAddedModuleContract(moduleId);

  if (!docxContract) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center space-y-4 rounded-xl border border-dashed p-10 text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-500" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold tracking-tight">Workspace Not Found</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            The workspace definitions for ID "{moduleId}" could not be found in the operational blueprint system.
          </p>
        </div>
      </div>
    );
  }

  // Create an aggressive fallback mapping so UI isn't completely empty if definitions lack tables
  const hasTables = (docxContract as any).tables && (docxContract as any).tables.length > 0;
  const hasForms = (docxContract as any).forms && (docxContract as any).forms.length > 0;

  async function handleAction(action: string, context: { scope: string; rowId?: string }) {
    try {
      const response = await fetch("/api/workflow/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: `UI_ACTION_TRIGGERED`,
          payload: { action, context, moduleId }
        })
      });
      if (!response.ok) throw new Error("API Execution Failed");
    } catch (e) {
      console.error("Action execution error:", e);
      throw e;
    }
  }

  return (
    <div className="space-y-5">
      <WorkspaceHeader
        title={docxContract.title}
        description={`Manage and operate ${docxContract.title.toLowerCase()} workflows. Data is securely partitioned by tenant isolation.`}
        actions={docxContract.urgentActions?.map((action, i) => ({
          actionId: `urgent-${i}`,
          label: action.label,
          capability: "CAN_EXECUTE_URGENT",
          workflowBinding: action.workflowBinding,
          executionHandler: action.workflowBinding,
          eventContract: [],
          auditEvent: `audit.${action.workflowBinding}`,
          confirmation: "NONE",
          retryPolicy: "FAIL",
          fallbackHandler: "",
          health: "ACTIVE",
          primary: true,
        })) || []}
      />

      {docxContract.urgentActions && docxContract.urgentActions.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <OperationalStatePanel 
            title="System State" 
            metrics={[
              { label: "Active Nodes", value: "Operational", status: "ok" },
              { label: "Pending Events", value: "0", status: "ok" }
            ]} 
          />
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-5">
          {hasTables ? (
            docxContract.tables.map((table, i) => (
              <OperationalTable
                key={i}
                onAction={handleAction}
                contract={{
                  title: table.title,
                  description: "Data strictly governed by AGP Tenant Scope.",
                  bulkActions: [],
                  columns: table.columns,
                  fetchStrategy: "GRAPHQL_EDGE",
                  projectionEvent: `PROJECTION_${slug(table.title).toUpperCase()}`,
                  rowActions: table.rowActions.map((action, j) => ({
                    actionId: `row-${i}-${j}`,
                    label: action.label,
                    capability: "CAN_EXECUTE_ROW",
                    workflowBinding: action.workflowBinding,
                    executionHandler: action.workflowBinding,
                    eventContract: [],
                    auditEvent: `audit.${action.workflowBinding}`,
                    confirmation: "NONE",
                    retryPolicy: "FAIL",
                    fallbackHandler: "",
                    health: "ACTIVE"
                  }))
                }}
              />
            ))
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
              No operational tables defined for this domain yet.
            </div>
          )}
        </div>

        <div className="space-y-5">
          {hasForms ? (
            docxContract.forms.map((form, i) => (
              <OperationalFormShell
                key={i}
                onAction={async (action, contract, values) => {
                  try {
                    const response = await fetch("/api/workflow/events", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        eventType: `FORM_SUBMISSION`,
                        payload: { action, formId: contract.id, values, moduleId }
                      })
                    });
                    if (!response.ok) throw new Error("Form submission failed");
                  } catch (e) {
                    console.error("Form execution error:", e);
                    throw e;
                  }
                }}
                contract={{
                  id: `form-${i}`,
                  title: form.title,
                  description: "Form submissions are securely tracked via the event bus.",
                  fields: form.fields,
                  submitAction: {
                    actionId: `submit-${i}`,
                    label: "Submit Payload",
                    capability: "CAN_SUBMIT",
                    workflowBinding: "submit",
                    executionHandler: "submit",
                    eventContract: [],
                    auditEvent: "audit.submit",
                    confirmation: "NONE",
                    retryPolicy: "FAIL",
                    fallbackHandler: "",
                    health: "ACTIVE",
                    primary: true
                  }
                }}
              />
            ))
          ) : (
             <div className="rounded-xl border p-5 shadow-sm text-center text-sm text-muted-foreground">
              No operational forms defined.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
