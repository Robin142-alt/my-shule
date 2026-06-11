"use client";

import { Printer, ShieldCheck, Zap } from "lucide-react";

import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { OperationalQueue, type OperationalQueueContract } from "@/components/operational/operational-queue";
import { OperationalTable, type OperationalTableContract } from "@/components/operational/operational-table";
import { OperationalFormShell, type OperationalFormContract } from "@/components/operational/operational-form-shell";
import { OperationalStatePanel } from "@/components/operational/operational-state-panel";
import { RightDetailsDrawer } from "@/components/operational/right-details-drawer";
import type { OperationalActionContract } from "@/components/operational/operational-action-button";
import type { ExtremeErpBlueprint } from "@/lib/operational/extreme-erp-blueprints";
import { getDocxAddedModuleContract } from "@/lib/operational/myshule-extreme-operating-system";
import { WorkspaceHeader } from "@/components/operational/workspace-header";
import { WorkspaceSummaryCard, WorkspaceSummaryGrid } from "@/components/operational/workspace-summary-cards";

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function actionContract(label: string, workflowBinding: string, auditEvent: string, index = 0): OperationalActionContract {
  return {
    actionId: `${slug(workflowBinding)}-${slug(label)}-${index}`,
    label,
    capability: `CAN_${slug(label).replace(/-/g, "_").toUpperCase()}`,
    workflowBinding,
    executionHandler: `workflows.${slug(workflowBinding)}.${slug(label)}`,
    eventContract: [auditEvent],
    auditEvent: `audit.${slug(label)}`,
    confirmation: label.toLowerCase().includes("reject") ? "REASON_REQUIRED" : "NONE",
    retryPolicy: "RETRY",
    fallbackHandler: `fallback.${slug(workflowBinding)}.${slug(label)}`,
    health: label.toLowerCase().includes("retry") ? "RETRY" : "ACTIVE",
  };
}

function toQueueContract(blueprint: ExtremeErpBlueprint): OperationalQueueContract {
  return {
    title: "Executable workflow queue",
    description: "Each row is assignable, auditable, recoverable, and bound to a workflow transition.",
    bulkActions: [
      actionContract("Assign selected", `${blueprint.id}-bulk`, "BULK_QUEUE_ASSIGNED"),
      actionContract("Open audit trail", `${blueprint.id}-bulk`, "AUDIT_TRAIL_OPENED", 1),
    ],
    items: blueprint.queues.map((queue) => ({
      id: queue.id,
      title: queue.title,
      owner: queue.owner,
      workflow: queue.workflow,
      sla: queue.priority === "High" ? "Due today" : "Due this week",
      priority: {
        label: queue.priority,
        tone: queue.priority === "High" ? "critical" : queue.priority === "Medium" ? "warning" : "ok",
      },
      auditEvent: queue.auditEvent,
      actions: queue.actions.map((action, index) => actionContract(action, queue.workflow, queue.auditEvent, index)),
    })),
  };
}

function toTableContract(blueprint: ExtremeErpBlueprint): OperationalTableContract {
  const table = blueprint.tables[0];

  return {
    title: table.title,
    description: "Search, filter, act, print, export, and review saved records without leaving this section.",
    searchPlaceholder: `Search ${blueprint.title}`,
    filters: ["Status", "Owner", "Priority"],
    sortOptions: ["Newest", "Due soon", "Highest priority"],
    columns: table.columns.slice(0, 5).map((column) => ({
      key: slug(column),
      label: column,
    })),
    rows: [
      {
        id: `${table.id}-sample`,
        cells: Object.fromEntries(
          table.columns.slice(0, 5).map((column, index) => [
            slug(column),
            blueprint.sampleData[index] ?? blueprint.sampleData[0] ?? "Pending",
          ]),
        ),
        status: {
          label: "Pending",
          tone: "warning",
        },
        actions: table.rowActions,
      },
    ],
    bulkActions: table.bulkActions,
    exportLabel: "Export",
    printLabel: "Print section",
  };
}

function toFormContract(blueprint: ExtremeErpBlueprint): OperationalFormContract {
  const form = blueprint.forms[0];

  return {
    title: form.title,
    description: form.purpose,
    fields: form.fields.slice(0, 6).map((field, index) => ({
      id: `${form.id}-${slug(field)}`,
      label: field,
      type: field.toLowerCase().includes("phone") ? "tel" : "text",
      value: blueprint.sampleData[index] ?? "",
    })),
    footerActions: form.footerActions.filter(
      (action): action is OperationalFormContract["footerActions"][number] =>
        [
          "Cancel",
          "Save Draft",
          "Submit",
          "Preview",
          "Print",
          "Submit for Approval",
          "Send SMS",
          "Preview Print",
        ].includes(action),
    ),
    auditAction: form.auditAction,
    workflowBinding: blueprint.queues[0]?.workflow ?? "Draft -> Submitted -> Archived",
    capability: `CAN_USE_${blueprint.moduleCode.toUpperCase()}`,
  };
}

export function OperationalBlueprintWorkspace({ blueprint }: { blueprint: ExtremeErpBlueprint }) {
  const docxContract = getDocxAddedModuleContract(blueprint.id);

  return (
    <div className="space-y-5">
      <WorkspaceHeader
        title={blueprint.title}
        description={blueprint.roleFocus}
        contextBar={{
          schoolName: "MyShule Academy",
          academicYear: "2026/2027",
          term: "Term 2",
          weekDate: "Week 4",
          userRole: "Super Admin",
          scope: "Global",
        }}
        permission="FULL_ACCESS"
        moduleStatus="ACTIVE"
      />

      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
        <p className="text-sm font-bold text-foreground mb-4">{blueprint.commandQuestion}</p>
        <div className="mb-6 flex flex-wrap gap-2">
          {blueprint.urgentActions.map((action) => (
            <button
              key={action}
              type="button"
              aria-label={action}
              className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-accent bg-accent/10 px-3 py-2 text-xs font-bold text-accent transition hover:-translate-y-0.5 hover:bg-accent/20"
            >
              <Zap className="h-3.5 w-3.5" />
              {action}
            </button>
          ))}
        </div>

        <WorkspaceSummaryGrid>
          {blueprint.sampleData.map((item, i) => (
            <WorkspaceSummaryCard
              key={item}
              title={`Summary ${i + 1}`}
              value={item}
              state="SUCCESS"
              icon={<Zap className="h-4 w-4" />}
            />
          ))}
        </WorkspaceSummaryGrid>
      </div>

      {docxContract ? (
        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <RightDetailsDrawer
            title="Right details drawer"
            subtitle="Every queue row opens here instead of navigating away from this section."
            sections={{
              details: docxContract.rightDetailsDrawer,
              comments: ["Decision comments remain linked to this school and versioned."],
              attachments: ["Evidence, generated PDFs, and signed documents stay attached."],
              history: ["Requested", "Reviewed", "Updated", "Archived"],
              workflow: docxContract.approvalWorkflow.split(" -> "),
              audit: docxContract.auditTrail,
            }}
          />
          <Card className="p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="eyebrow">Permission checks</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {docxContract.permissionChecks.map((permission) => (
                    <span key={permission} className="rounded-[var(--radius-xs)] border border-accent/20 bg-accent-soft px-3 py-2 text-xs font-bold text-accent">
                      {permission}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="eyebrow">Low-bandwidth recovery</p>
                <div className="mt-3 space-y-2">
                  {docxContract.lowBandwidthBehavior.map((item) => (
                    <p key={item} className="rounded-[var(--radius-xs)] border border-border bg-primary-soft/30 px-3 py-2 text-xs font-semibold text-muted">
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-[var(--radius-sm)] border border-border bg-surface-muted px-3 py-3 text-xs text-muted">
              <span className="font-bold text-foreground">Audit trail: </span>
              {docxContract.auditTrail.join(", ")}
            </div>
          </Card>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <OperationalQueue contract={toQueueContract(blueprint)} />

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-accent" />
            <h2 className="text-lg font-bold text-foreground">State safety</h2>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {blueprint.states.map((state) => (
              <div key={state} className="rounded-[var(--radius-xs)] border border-border bg-primary-soft/30 px-3 py-2 text-xs font-bold text-muted">
                {state}
              </div>
            ))}
          </div>
          <div className="mt-4">
            <OperationalStatePanel
              state="FAILED"
              title="FAILED"
              message="Execution stays visible. Retry, fallback, audit trail, and self-healing repair remain available."
            />
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <OperationalTable contract={toTableContract(blueprint)} />
        <OperationalFormShell contract={toFormContract(blueprint)} />
      </section>

      <Card className="p-5">
        <div className="flex items-center gap-2">
          <Printer className="h-4 w-4 text-accent" />
          <h2 className="text-base font-bold text-foreground">Print outputs</h2>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {blueprint.printOutputs.map((output) => (
            <span key={output} className="rounded-[var(--radius-xs)] border border-border bg-primary-soft/30 px-3 py-2 text-xs font-bold text-muted">
              {output}
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}
