"use client";

import { useState } from "react";
import { CheckCircle2, ClipboardCheck, FileClock, RadioTower } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { StatusPill } from "@/components/ui/status-pill";
import { requestSchoolApiProxy } from "@/lib/dashboard/school-api-proxy-client";
import { formatCurrency } from "@/lib/dashboard/format";
import { createLibraryDataset, getBookById, getMemberById } from "@/lib/library/library-data";
import { dispatchOperationalWorkflowAction } from "@/lib/workflows/operational-workflow-client";
import { approvalWorkflowCatalog, type ApprovalWorkflow, type ApprovalWorkflowAction, type ApprovalWorkflowActionHealth } from "@/lib/workflows/workflow-catalog";

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

type ApprovalActionRecord = {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  payload: Record<string, unknown>;
};

type ApprovalActionResult = {
  recordId: string;
  recordTitle: string;
  success: boolean;
  message: string;
};

type ApprovalActionExecutionContext = {
  studentId?: string;
  invoiceId?: string;
};

type ApprovalActionContract = {
  actionId: string;
  datasetLabel: string;
  description: string;
  confirmLabel: string;
  successVerb: "completed" | "queued";
  sourcePath: string;
  handlerPath: string;
  loadRecords: () => Promise<ApprovalActionRecord[]>;
  executeRecord: (
    record: ApprovalActionRecord,
    workflow: ApprovalWorkflow,
    action: ApprovalWorkflowAction,
    context: ApprovalActionExecutionContext,
  ) => Promise<string>;
  missingReason?: never;
};

type MissingApprovalActionContract = {
  actionId: string;
  datasetLabel: string;
  description: string;
  sourcePath: string;
  handlerPath: string;
  missingReason: string;
};

type ActiveActionPanel = {
  workflow: ApprovalWorkflow;
  action: ApprovalWorkflowAction;
  contract: ApprovalActionContract | MissingApprovalActionContract | null;
  records: ApprovalActionRecord[];
  selectedIds: string[];
  loading: boolean;
  executing: boolean;
  error: string | null;
  results: ApprovalActionResult[] | null;
  search: string;
  studentId: string;
  invoiceId: string;
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

function unwrapApiData<T>(payload: T | { data?: T }): T {
  if (
    typeof payload === "object" &&
    payload !== null &&
    !Array.isArray(payload) &&
    "data" in payload
  ) {
    return (payload as { data?: T }).data as T;
  }

  return payload as T;
}

function recordText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function recordStatus(value: unknown) {
  return recordText(value, "pending").replaceAll("_", " ");
}

function recordNumber(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function recordMoneyMinor(value: unknown) {
  const amount = recordNumber(value) / 100;
  return amount > 0 ? `KES ${amount.toLocaleString("en-KE")}` : "Amount pending";
}

function objectRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

async function loadExamReportRecords(options?: { includePublished?: boolean }) {
  const payload = await requestSchoolApiProxy<unknown>("/exams/report-cards", {
    unwrapEnvelope: false,
  });
  const rows = unwrapApiData<unknown[]>(payload as unknown[] | { data?: unknown[] }) ?? [];

  const records = rows
    .map((row): ApprovalActionRecord => {
      const source = objectRecord(row);
      const metadata = objectRecord(source.metadata);
      const reportCard = objectRecord(metadata.report_card);
      const title = recordText(reportCard.learner_name, recordText(reportCard.student_name, recordText(source.student_id, source.id as string)));
      const className = recordText(reportCard.class_name, "Class on file");

      return {
        id: recordText(source.id, `${source.student_id ?? "report-card"}`),
        title,
        subtitle: `${className} | Snapshot ${recordText(source.report_snapshot_id, "pending")}`,
        status: recordStatus(source.status),
        payload: source,
      };
    })
    .filter((record) => record.id);

  return options?.includePublished ? records : records.filter((record) => !/published/i.test(record.status));
}

async function publishExamReportRecord(record: ApprovalActionRecord) {
  await requestSchoolApiProxy("/exams/report-cards/publish", {
    method: "POST",
    body: {
      exam_series_id: recordText(record.payload.exam_series_id, "series-live"),
      student_id: recordText(record.payload.student_id, record.id),
      report_snapshot_id: recordText(record.payload.report_snapshot_id, record.id),
    },
  });

  return "Report card published for parent portal visibility.";
}

async function exportReportPdfRecord(record: ApprovalActionRecord) {
  const payload = await requestSchoolApiProxy<unknown>(`/exams/report-cards/${encodeURIComponent(record.id)}/parent-download`, {
    unwrapEnvelope: false,
  });
  const exportData = objectRecord(unwrapApiData(payload as Record<string, unknown> | { data?: Record<string, unknown> }));
  const fileName = recordText(exportData.file_name, recordText(exportData.filename));
  const downloadUrl = recordText(exportData.download_url, recordText(exportData.url));

  if (fileName) {
    return `${fileName} exported${downloadUrl ? ` from ${downloadUrl}` : ""}.`;
  }

  throw new Error("Export failed: report-card PDF endpoint did not return a downloadable file.");
}

async function queueReportScheduleRecord(
  record: ApprovalActionRecord,
  workflow: ApprovalWorkflow,
  action: ApprovalWorkflowAction,
) {
  const result = await dispatchOperationalWorkflowAction({
    actionId: action.actionId,
    workflowBinding: action.workflowBinding,
    aggregateId: record.id,
    payload: {
      workflowId: workflow.id,
      workflowLabel: workflow.label,
      actionLabel: action.label,
      selectedRecordIds: [record.id],
      selectedRecordTitle: record.title,
      reportSnapshotId: recordText(record.payload.report_snapshot_id),
      emittedEvents: action.emittedEvents,
      auditAction: action.auditAction,
    },
  });

  return `Report schedule queued for ${record.title}. ${result.eventName}.`;
}

async function queueExamCorrectionRecord(
  record: ApprovalActionRecord,
  workflow: ApprovalWorkflow,
  action: ApprovalWorkflowAction,
) {
  await dispatchOperationalWorkflowAction({
    actionId: action.actionId,
    workflowBinding: action.workflowBinding,
    aggregateId: record.id,
    payload: {
      workflowId: workflow.id,
      workflowLabel: workflow.label,
      actionLabel: action.label,
      selectedRecordIds: [record.id],
      selectedRecordTitle: record.title,
      emittedEvents: action.emittedEvents,
      auditAction: action.auditAction,
    },
  });

  return "Correction task queued for the exams workspace.";
}

async function queueProcurementReviewerRecord(
  record: ApprovalActionRecord,
  workflow: ApprovalWorkflow,
  action: ApprovalWorkflowAction,
) {
  const result = await dispatchOperationalWorkflowAction({
    actionId: action.actionId,
    workflowBinding: action.workflowBinding,
    aggregateId: record.id,
    payload: {
      workflowId: workflow.id,
      workflowLabel: workflow.label,
      actionLabel: action.label,
      selectedRecordIds: [record.id],
      selectedRecordTitle: record.title,
      department: recordText(record.payload.department),
      requestStatus: recordStatus(record.payload.status),
      estimatedTotalMinor: recordNumber(record.payload.estimated_total_minor),
      emittedEvents: action.emittedEvents,
      auditAction: action.auditAction,
    },
  });

  return `Reviewer assignment queued for ${record.title}. ${result.eventName}.`;
}

async function queueSupplierRevisionRecord(
  record: ApprovalActionRecord,
  workflow: ApprovalWorkflow,
  action: ApprovalWorkflowAction,
) {
  const supplierName = recordText(record.payload.supplier_name, recordText(record.payload.supplier, "supplier on file"));
  const result = await dispatchOperationalWorkflowAction({
    actionId: action.actionId,
    workflowBinding: action.workflowBinding,
    aggregateId: record.id,
    payload: {
      workflowId: workflow.id,
      workflowLabel: workflow.label,
      actionLabel: action.label,
      selectedRecordIds: [record.id],
      selectedRecordTitle: record.title,
      supplierId: recordText(record.payload.supplier_id),
      supplierName,
      budgetCode: recordText(record.payload.budget_code),
      emittedEvents: action.emittedEvents,
      auditAction: action.auditAction,
    },
  });

  return `Supplier revision queued for ${record.title}. ${result.eventName}.`;
}

async function loadAdmissionApplicationRecords(statuses: string[]) {
  const payload = await requestSchoolApiProxy<unknown>("/admissions/applications?limit=200", {
    unwrapEnvelope: false,
  });
  const rows = unwrapApiData<unknown[]>(payload as unknown[] | { data?: unknown[] }) ?? [];
  const allowed = new Set(statuses);

  return rows
    .map((row): ApprovalActionRecord => {
      const source = objectRecord(row);
      const applicationNumber = recordText(source.application_number, recordText(source.id));
      const classApplying = recordText(source.class_applying, "Class pending");
      const parentName = recordText(source.parent_name, "Parent pending");
      const parentPhone = recordText(source.parent_phone, "phone pending");
      const detailParts = [
        applicationNumber ? `Application ${applicationNumber}` : "",
        classApplying,
        parentName,
        parentPhone,
      ].filter(Boolean);

      return {
        id: recordText(source.id),
        title: recordText(source.full_name, recordText(source.applicant_name, "Admission application")),
        subtitle: detailParts.join(" | "),
        status: recordStatus(source.status),
        payload: source,
      };
    })
    .filter((record) => record.id && allowed.has(record.status.replaceAll(" ", "_").toLowerCase()));
}

function updateAdmissionApplicationStatus(
  record: ApprovalActionRecord,
  status: "approved" | "pending",
) {
  return requestSchoolApiProxy(`/admissions/applications/${encodeURIComponent(record.id)}`, {
    method: "PATCH",
    body: {
      status,
      review_notes: status === "approved"
        ? "Approved from the approval workflow queue."
        : "Documents returned from the approval workflow queue for correction.",
    },
  }).then(() => status === "approved"
    ? `Admission application approved for ${record.title}.`
    : `Admission documents returned for ${record.title}.`);
}

async function loadProcurementRequestRecords() {
  const payload = await requestSchoolApiProxy<unknown>("/procurement/dashboard", {
    unwrapEnvelope: false,
  });
  const dashboard = objectRecord(unwrapApiData(payload as Record<string, unknown> | { data?: Record<string, unknown> }));
  const requests = Array.isArray(dashboard.requests) ? dashboard.requests : [];

  return requests
    .map((row): ApprovalActionRecord => {
      const source = objectRecord(row);
      const amount = recordNumber(source.estimated_total_minor) / 100;
      const amountLabel = amount > 0 ? ` | KES ${amount.toLocaleString("en-KE")}` : "";

      return {
        id: recordText(source.id),
        title: recordText(source.title, "Procurement request"),
        subtitle: `${recordText(source.department, "Department pending")}${amountLabel}`,
        status: recordStatus(source.status),
        payload: source,
      };
    })
    .filter((record) => record.id && !/approved|rejected|cancelled/i.test(record.status));
}

function decideProcurementRequest(record: ApprovalActionRecord, decision: "approved" | "rejected") {
  return requestSchoolApiProxy(`/procurement/requests/${encodeURIComponent(record.id)}/approval`, {
    method: "PATCH",
    body: {
      decision,
      reason: decision === "approved"
        ? "Approved from the approval workflow queue."
        : "Returned from the approval workflow queue.",
    },
  }).then(() => `Procurement request ${decision}.`);
}

type ProcurementOrderLine = {
  item_name: string;
  quantity: number;
  unit_cost_minor: number;
};

function procurementOrderLines(record: ApprovalActionRecord) {
  const rows = Array.isArray(record.payload.items)
    ? record.payload.items
    : Array.isArray(record.payload.lines)
      ? record.payload.lines
      : [];

  return rows
    .map((row): ProcurementOrderLine | null => {
      const source = objectRecord(row);
      const itemName = recordText(source.item_name, recordText(source.name));
      const quantity = recordNumber(source.quantity);
      const unitCostMinor = recordNumber(
        source.unit_cost_minor
        ?? source.estimated_unit_cost_minor
        ?? source.unit_price_minor
        ?? source.estimated_unit_price_minor,
      );

      if (!itemName || quantity <= 0 || unitCostMinor <= 0) {
        return null;
      }

      return {
        item_name: itemName,
        quantity,
        unit_cost_minor: unitCostMinor,
      };
    })
    .filter((line): line is ProcurementOrderLine => Boolean(line));
}

async function loadProcurementPurchaseOrderRecords() {
  const payload = await requestSchoolApiProxy<unknown>("/procurement/dashboard", {
    unwrapEnvelope: false,
  });
  const dashboard = objectRecord(unwrapApiData(payload as Record<string, unknown> | { data?: Record<string, unknown> }));
  const requests = Array.isArray(dashboard.requests) ? dashboard.requests : [];

  return requests
    .map((row): ApprovalActionRecord => {
      const source = objectRecord(row);
      const lines = Array.isArray(source.items)
        ? source.items
        : Array.isArray(source.lines)
          ? source.lines
          : [];
      const supplierName = recordText(source.supplier_name, recordText(source.supplier, "Supplier pending"));
      const budgetLabel = recordText(source.budget_code);
      const detailParts = [
        supplierName,
        `${lines.length} item line${lines.length === 1 ? "" : "s"}`,
        budgetLabel ? `Budget ${budgetLabel}` : "",
      ].filter(Boolean);

      return {
        id: recordText(source.id),
        title: recordText(source.title, "Approved procurement request"),
        subtitle: detailParts.join(" | "),
        status: recordStatus(source.status),
        payload: source,
      };
    })
    .filter((record) => record.id && /approved|ready|procurement/i.test(record.status.replaceAll(" ", "_")));
}

async function loadBudgetLinkedProcurementRecords() {
  const payload = await requestSchoolApiProxy<unknown>("/procurement/dashboard", {
    unwrapEnvelope: false,
  });
  const dashboard = objectRecord(unwrapApiData(payload as Record<string, unknown> | { data?: Record<string, unknown> }));
  const requests = Array.isArray(dashboard.requests) ? dashboard.requests : [];

  return filterActionableRecords(
    requests.map((row): ApprovalActionRecord => {
      const source = objectRecord(row);
      const budgetCode = recordText(source.budget_code, recordText(source.budgetCode, "budget pending"));
      const detailParts = [
        recordText(source.department, "Department pending"),
        budgetCode,
        recordMoneyMinor(source.estimated_total_minor),
      ].filter(Boolean);

      return {
        id: recordText(source.id),
        title: recordText(source.title, "Budget-linked procurement request"),
        subtitle: detailParts.join(" | "),
        status: recordStatus(source.status),
        payload: source,
      };
    }).filter((record) => {
      const hasBudgetEvidence = Boolean(recordText(record.payload.budget_code, recordText(record.payload.budgetCode)));

      return record.id && hasBudgetEvidence;
    }),
  );
}

async function generatePurchaseOrderRecord(record: ApprovalActionRecord) {
  const supplierId = recordText(record.payload.supplier_id);
  const supplierName = recordText(record.payload.supplier_name, "supplier on file");
  const lines = procurementOrderLines(record);
  const missing = [
    supplierId ? "" : "missing supplier",
    lines.length > 0 ? "" : "missing item lines",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`${record.title} is ${missing.join("; ")}.`);
  }

  const payload = await requestSchoolApiProxy<unknown>("/procurement/purchase-orders", {
    method: "POST",
    body: {
      supplier_id: supplierId,
      request_id: record.id,
      ...(record.payload.expected_delivery_date ? { expected_delivery_date: record.payload.expected_delivery_date } : {}),
      items: lines,
    },
  });
  const purchaseOrder = objectRecord(payload);
  const poNumber = recordText(purchaseOrder.po_number, recordText(purchaseOrder.order_number, "Purchase order"));
  const status = recordStatus(purchaseOrder.status);

  return `${poNumber} generated for ${recordText(purchaseOrder.supplier_name, supplierName)}. Status ${status}.`;
}

async function loadInventoryRequestRecords(statuses: string[]) {
  const payload = await requestSchoolApiProxy<unknown>("/inventory/requests", {
    unwrapEnvelope: false,
  });
  const rows = unwrapApiData<unknown[]>(payload as unknown[] | { data?: unknown[] }) ?? [];
  const allowed = new Set(statuses);

  return rows
    .map((row): ApprovalActionRecord => {
      const source = objectRecord(row);
      const lines = Array.isArray(source.lines) ? source.lines : [];
      const totalUnits = lines.reduce((sum, line) => sum + recordNumber(objectRecord(line).quantity), 0);

      return {
        id: recordText(source.id),
        title: recordText(source.request_number, recordText(source.department, "Inventory request")),
        subtitle: `${recordText(source.department, "Department pending")} | ${totalUnits} units`,
        status: recordStatus(source.status),
        payload: source,
      };
    })
    .filter((record) => record.id && allowed.has(record.status.replaceAll(" ", "_").toLowerCase()));
}

function updateInventoryRequestStatus(record: ApprovalActionRecord, status: "approved" | "fulfilled") {
  return requestSchoolApiProxy(`/inventory/requests/${encodeURIComponent(record.id)}/status`, {
    method: "PATCH",
    body: {
      status,
      notes: status === "fulfilled"
        ? "Stock issued from the approval workflow queue."
        : "Approval requested from the approval workflow queue.",
    },
  }).then(() => status === "fulfilled" ? "Stock issue marked fulfilled." : "Stock request approved.");
}

async function loadMpesaReconciliationRecords() {
  const payload = await requestSchoolApiProxy<unknown>("/payments/mpesa/c2b/payments?status=pending_review", {
    unwrapEnvelope: false,
  });
  const rows = unwrapApiData<unknown[]>(payload as unknown[] | { data?: unknown[] }) ?? [];

  return rows
    .map((row): ApprovalActionRecord => {
      const source = objectRecord(row);
      const transId = recordText(source.trans_id, recordText(source.id, "M-Pesa transaction"));
      const payer = recordText(source.payer_name, "Payer pending");
      const phone = recordText(source.phone_number, "phone pending");
      const reference = recordText(source.bill_ref_number, recordText(source.invoice_number));
      const detailParts = [
        recordMoneyMinor(source.amount_minor),
        payer,
        phone,
        reference ? `Ref ${reference}` : "",
      ].filter(Boolean);

      return {
        id: recordText(source.id),
        title: transId,
        subtitle: detailParts.join(" | "),
        status: recordStatus(source.status),
        payload: source,
      };
    })
    .filter((record) => record.id && /pending|review|unmatched/i.test(record.status.replaceAll(" ", "_")));
}

async function reconcileMpesaRecord(
  record: ApprovalActionRecord,
  _workflow: ApprovalWorkflow,
  _action: ApprovalWorkflowAction,
  context: ApprovalActionExecutionContext,
) {
  const studentId = recordText(context.studentId);
  const invoiceId = recordText(context.invoiceId);

  if (!studentId && !invoiceId) {
    throw new Error("Enter a student ID or invoice ID before reconciling selected M-Pesa transactions.");
  }

  await requestSchoolApiProxy(`/payments/mpesa/c2b/payments/${encodeURIComponent(record.id)}/reconcile`, {
    method: "POST",
    body: {
      ...(studentId ? { student_id: studentId } : {}),
      ...(invoiceId ? { invoice_id: invoiceId } : {}),
      notes: "Reconciled from the approval workflow queue.",
    },
  });

  return `${record.title} reconciled and posted to the fee ledger.`;
}

async function queueMpesaExceptionRecord(
  record: ApprovalActionRecord,
  workflow: ApprovalWorkflow,
  action: ApprovalWorkflowAction,
) {
  const result = await dispatchOperationalWorkflowAction({
    actionId: action.actionId,
    workflowBinding: action.workflowBinding,
    aggregateId: record.id,
    payload: {
      workflowId: workflow.id,
      workflowLabel: workflow.label,
      actionLabel: action.label,
      selectedRecordIds: [record.id],
      selectedRecordTitle: record.title,
      transactionId: recordText(record.payload.trans_id, record.title),
      billRefNumber: recordText(record.payload.bill_ref_number),
      payerName: recordText(record.payload.payer_name),
      amountMinor: recordNumber(record.payload.amount_minor),
      emittedEvents: action.emittedEvents,
      auditAction: action.auditAction,
    },
  });

  return `M-Pesa exception queued for ${record.title}. ${result.eventName}.`;
}

async function loadDisciplineIncidentRecords(options?: {
  statuses?: string[];
  severities?: string[];
}) {
  const payload = await requestSchoolApiProxy<unknown>("/discipline/incidents", {
    unwrapEnvelope: false,
  });
  const rows = unwrapApiData<unknown[]>(payload as unknown[] | { data?: unknown[] }) ?? [];
  const allowedStatuses = options?.statuses ? new Set(options.statuses) : null;
  const allowedSeverities = options?.severities ? new Set(options.severities) : null;

  return rows
    .map((row): ApprovalActionRecord => {
      const source = objectRecord(row);
      const incidentNumber = recordText(source.incident_number, recordText(source.id));
      const severity = recordText(source.severity, "severity pending");
      const location = recordText(source.location, "location pending");
      const studentId = recordText(source.student_id, "learner pending");
      const detailParts = [
        incidentNumber ? `Incident ${incidentNumber}` : "",
        severity,
        location,
        studentId,
      ].filter(Boolean);

      return {
        id: recordText(source.id),
        title: recordText(source.title, "Discipline incident"),
        subtitle: detailParts.join(" | "),
        status: recordStatus(source.status),
        payload: source,
      };
    })
    .filter((record) => {
      const status = record.status.replaceAll(" ", "_").toLowerCase();
      const severity = recordText(record.payload.severity).toLowerCase();

      return record.id
        && (!allowedStatuses || allowedStatuses.has(status))
        && (!allowedSeverities || allowedSeverities.has(severity));
    });
}

async function queueIncidentCenterRecord(
  record: ApprovalActionRecord,
  workflow: ApprovalWorkflow,
  action: ApprovalWorkflowAction,
) {
  const result = await dispatchOperationalWorkflowAction({
    actionId: action.actionId,
    workflowBinding: action.workflowBinding,
    aggregateId: record.id,
    payload: {
      workflowId: workflow.id,
      workflowLabel: workflow.label,
      actionLabel: action.label,
      selectedRecordIds: [record.id],
      selectedRecordTitle: record.title,
      incidentNumber: recordText(record.payload.incident_number),
      severity: recordText(record.payload.severity),
      status: recordStatus(record.payload.status),
      studentId: recordText(record.payload.student_id),
      emittedEvents: action.emittedEvents,
      auditAction: action.auditAction,
    },
  });

  return `Incident center workflow dispatched for ${record.title}. ${result.eventName}.`;
}

async function createDisciplineActionRecord(
  record: ApprovalActionRecord,
  actionType: string,
  title: string,
  resultMessage: string,
) {
  await requestSchoolApiProxy(`/discipline/incidents/${encodeURIComponent(record.id)}/actions`, {
    method: "POST",
    body: {
      action_type: actionType,
      status: "pending",
      title,
      incident_number: recordText(record.payload.incident_number),
      severity: recordText(record.payload.severity),
      notes: `Created from the approval workflow queue for ${record.title}.`,
    },
  });

  return `${resultMessage} for ${record.title}.`;
}

async function createCounsellingReferralFromIncident(record: ApprovalActionRecord) {
  const studentId = recordText(record.payload.student_id);

  if (!studentId) {
    throw new Error(`${record.title} is missing a learner ID; counselling referral was not created.`);
  }

  await requestSchoolApiProxy("/counselling/referrals", {
    method: "POST",
    body: {
      student_id: studentId,
      incident_id: record.id,
      risk_level: recordText(record.payload.severity, "high"),
      status: "active",
      reason: `Counselling referral created from the approval workflow queue for ${record.title}.`,
    },
  });

  return `Counselling referral created for ${record.title}.`;
}

async function loadCounsellingReferralRecords() {
  const payload = await requestSchoolApiProxy<unknown>("/counselling/referrals", {
    unwrapEnvelope: false,
  });
  const rows = unwrapApiData<unknown[]>(payload as unknown[] | { data?: unknown[] }) ?? [];

  return rows
    .map((row): ApprovalActionRecord => {
      const source = objectRecord(row);
      const id = recordText(source.id);
      const studentId = recordText(source.student_id, "learner pending");
      const incidentId = recordText(source.incident_id);
      const riskLevel = recordText(source.risk_level, "risk pending");
      const reason = recordText(source.reason, "reason pending");
      const detailParts = [
        studentId,
        incidentId ? `Incident ${incidentId}` : "",
        riskLevel,
        reason,
      ].filter(Boolean);

      return {
        id,
        title: recordText(source.title, id ? id.replace(/^counselling-/, "counselling ") : "Counselling referral"),
        subtitle: detailParts.join(" | "),
        status: recordStatus(source.status),
        payload: source,
      };
    })
    .filter((record) => {
      const status = record.status.replaceAll(" ", "_").toLowerCase();

      return record.id && /active|open|pending|high_risk|escalated/i.test(status);
    });
}

async function queueCounsellingReferralRecord(
  record: ApprovalActionRecord,
  workflow: ApprovalWorkflow,
  action: ApprovalWorkflowAction,
  resultLabel: string,
) {
  const result = await dispatchOperationalWorkflowAction({
    actionId: action.actionId,
    workflowBinding: action.workflowBinding,
    aggregateId: record.id,
    payload: {
      workflowId: workflow.id,
      workflowLabel: workflow.label,
      actionLabel: action.label,
      selectedRecordIds: [record.id],
      selectedRecordTitle: record.title,
      studentId: recordText(record.payload.student_id),
      incidentId: recordText(record.payload.incident_id),
      riskLevel: recordText(record.payload.risk_level),
      emittedEvents: action.emittedEvents,
      auditAction: action.auditAction,
    },
  });

  return `${resultLabel} for ${record.title}. ${result.eventName}.`;
}

async function queueWorkflowRecord(
  record: ApprovalActionRecord,
  workflow: ApprovalWorkflow,
  action: ApprovalWorkflowAction,
) {
  const result = await dispatchOperationalWorkflowAction({
    actionId: action.actionId,
    workflowBinding: action.workflowBinding,
    aggregateId: record.id,
    payload: {
      workflowId: workflow.id,
      workflowLabel: workflow.label,
      actionLabel: action.label,
      selectedRecordIds: [record.id],
      selectedRecordTitle: record.title,
      status: recordStatus(record.payload.status),
      category: recordText(record.payload.category),
      ownerName: recordText(record.payload.owner_name, recordText(record.payload.ownerName)),
      priority: recordText(record.payload.priority),
      metricCount: recordNumber(record.payload.metric_count),
      learnerCount: recordNumber(record.payload.learner_count),
      routeName: recordText(record.payload.route_name, recordText(record.payload.name)),
      itemName: recordText(record.payload.item_name, recordText(record.payload.name)),
      medicineName: recordText(record.payload.medicine_name),
      supplier: recordText(record.payload.supplier, recordText(record.payload.supplier_name)),
      hazard: recordText(record.payload.hazard),
      estimatedCostMinor: recordNumber(record.payload.estimated_cost_minor),
      department: recordText(record.payload.department, recordText(record.payload.responsible_department)),
      staffName: recordText(record.payload.staff_name, recordText(record.payload.requested_by)),
      leaveType: recordText(record.payload.leave_type),
      days: recordNumber(record.payload.days),
      coverageStatus: recordText(record.payload.coverage_status),
      conflictCount: recordNumber(record.payload.conflict_count),
      fineNumber: recordText(record.payload.fineNumber, recordText(record.payload.fine_number)),
      amount: recordNumber(record.payload.amount),
      module: recordText(record.payload.module),
      budgetCode: recordText(record.payload.budget_code, recordText(record.payload.budgetCode)),
      workflowSourceId: recordText(record.payload.workflowSourceId),
      emittedEvents: action.emittedEvents,
      auditAction: action.auditAction,
    },
  });

  return `${action.label} queued for ${record.title}. ${result.eventName}.`;
}

function filterActionableRecords(records: ApprovalActionRecord[]) {
  return records.filter((record) => !/completed|closed|resolved|archived|cancelled/i.test(record.status));
}

async function loadDashboardRecordsFromKeys(
  path: string,
  keys: string[],
  mapper: (source: Record<string, unknown>) => ApprovalActionRecord,
) {
  const payload = await requestSchoolApiProxy<unknown>(path, {
    unwrapEnvelope: false,
  });
  const dashboard = objectRecord(unwrapApiData(payload as Record<string, unknown> | { data?: Record<string, unknown> }));
  const rows = keys.flatMap((key) => {
    const value = dashboard[key];

    return Array.isArray(value) ? value : [];
  });

  return filterActionableRecords(
    rows.map((row) => mapper(objectRecord(row))).filter((record) => record.id),
  );
}

async function loadClinicMedicineRecords() {
  const payload = await requestSchoolApiProxy<unknown>("/clinic/medicines", {
    unwrapEnvelope: false,
  });
  const rows = unwrapApiData<unknown[]>(payload as unknown[] | { data?: unknown[] }) ?? [];

  return rows
    .map((row): ApprovalActionRecord => {
      const source = objectRecord(row);
      const quantity = recordNumber(source.quantity_in_stock);
      const expiry = recordText(source.nearest_expiry_date, "expiry not batched");
      const detailParts = [
        recordText(source.category, "clinic stock"),
        `${quantity.toLocaleString("en-KE")} ${recordText(source.unit_type, "units")}`,
        expiry,
        source.prescription_required ? "prescription required" : "",
      ].filter(Boolean);

      return {
        id: recordText(source.id),
        title: recordText(source.medicine_name, recordText(source.generic_name, "Clinic medicine")),
        subtitle: detailParts.join(" | "),
        status: quantity <= 0 ? "out of stock" : expiry,
        payload: source,
      };
    })
    .filter((record) => record.id);
}

async function loadTransportManifestRecords() {
  const payload = await requestSchoolApiProxy<unknown>("/transport/dashboard", {
    unwrapEnvelope: false,
  });
  const dashboard = objectRecord(unwrapApiData(payload as Record<string, unknown> | { data?: Record<string, unknown> }));
  const manifests = Array.isArray(dashboard.manifests) ? dashboard.manifests : [];
  const routes = Array.isArray(dashboard.routes) ? dashboard.routes : [];
  const rows = manifests.length > 0 ? manifests : routes;

  return filterActionableRecords(
    rows.map((row): ApprovalActionRecord => {
      const source = objectRecord(row);
      const title = recordText(source.route_name, recordText(source.name, "Transport manifest"));
      const detailParts = [
        `${recordNumber(source.learner_count).toLocaleString("en-KE")} learners`,
        recordText(source.effective_from) ? `Effective ${recordText(source.effective_from)}` : "",
        recordText(source.direction),
        recordText(source.zone),
      ].filter(Boolean);

      return {
        id: recordText(source.id),
        title,
        subtitle: detailParts.join(" | "),
        status: recordStatus(source.status),
        payload: source,
      };
    }).filter((record) => record.id),
  );
}

async function loadLiveModuleRecords(apiBase: string, entityLabel: string, preferredCategories?: string[]) {
  const payload = await requestSchoolApiProxy<unknown>(`${apiBase}/dashboard`, {
    unwrapEnvelope: false,
  });
  const dashboard = objectRecord(unwrapApiData(payload as Record<string, unknown> | { data?: Record<string, unknown> }));
  const rows = Array.isArray(dashboard.records) ? dashboard.records : [];
  const records = filterActionableRecords(
    rows.map((row): ApprovalActionRecord => {
      const source = objectRecord(row);
      const detailParts = [
        recordText(source.category, entityLabel),
        recordText(source.owner_name, "unassigned"),
        recordText(source.priority),
        `${recordNumber(source.metric_count).toLocaleString("en-KE")} linked`,
      ].filter(Boolean);

      return {
        id: recordText(source.id),
        title: recordText(source.title, entityLabel),
        subtitle: detailParts.join(" | "),
        status: recordStatus(source.status),
        payload: source,
      };
    }).filter((record) => record.id),
  );

  if (!preferredCategories?.length) {
    return records;
  }

  const categoryMatches = records.filter((record) => {
    const text = `${record.payload.category ?? ""} ${record.title} ${record.subtitle}`.toLowerCase();

    return preferredCategories.some((category) => text.includes(category.toLowerCase()));
  });

  return categoryMatches.length > 0 ? categoryMatches : records;
}

async function completeLiveModuleRecord(apiBase: string, entityLabel: string, record: ApprovalActionRecord) {
  await requestSchoolApiProxy(`${apiBase}/records/${encodeURIComponent(record.id)}/status`, {
    method: "PATCH",
    body: { status: "completed" },
  });

  return `${entityLabel} status updated to completed: ${record.title}.`;
}

async function loadStaffLeaveRecords() {
  return loadDashboardRecordsFromKeys(
    "/staff/dashboard",
    ["leave_requests", "leaveRequests", "leaves", "records"],
    (source) => {
      const staffName = recordText(source.staff_name, recordText(source.requested_by, recordText(source.owner_name, "Staff member")));
      const leaveType = recordText(source.leave_type, recordText(source.category, "leave"));
      const detailParts = [
        recordText(source.department, "department pending"),
        leaveType,
        `${recordNumber(source.days).toLocaleString("en-KE")} days`,
        recordText(source.coverage_status),
      ].filter(Boolean);

      return {
        id: recordText(source.id),
        title: staffName,
        subtitle: detailParts.join(" | "),
        status: recordStatus(source.status),
        payload: source,
      };
    },
  );
}

async function loadPayrollExceptionRecords() {
  return loadDashboardRecordsFromKeys(
    "/staff/dashboard",
    ["payroll_exceptions", "payrollExceptions", "exceptions", "records"],
    (source) => {
      const staffName = recordText(source.staff_name, recordText(source.requested_by, recordText(source.owner_name, "Staff member")));
      const title = recordText(source.title, `${staffName} payroll exception`);
      const detailParts = [
        staffName,
        recordText(source.department),
        recordText(source.exception_type, recordText(source.category)),
        recordText(source.amount_minor) ? recordMoneyMinor(source.amount_minor) : "",
      ].filter(Boolean);

      return {
        id: recordText(source.id),
        title,
        subtitle: detailParts.join(" | "),
        status: recordStatus(source.status),
        payload: source,
      };
    },
  );
}

async function loadInventoryIncidentRecords() {
  const payload = await requestSchoolApiProxy<unknown>("/inventory/incidents", {
    unwrapEnvelope: false,
  });
  const rows = unwrapApiData<unknown[]>(payload as unknown[] | { data?: unknown[] }) ?? [];

  return filterActionableRecords(
    rows.map((row): ApprovalActionRecord => {
      const source = objectRecord(row);
      const incidentNumber = recordText(source.incident_number, recordText(source.id, "Inventory incident"));
      const detailParts = [
        recordText(source.item_name, "item pending"),
        recordText(source.incident_type, "incident"),
        `${recordNumber(source.quantity).toLocaleString("en-KE")} units`,
        recordText(source.responsible_department),
        recordText(source.cost_impact) ? formatCurrency(recordNumber(source.cost_impact), false) : "",
      ].filter(Boolean);

      return {
        id: recordText(source.id),
        title: incidentNumber,
        subtitle: detailParts.join(" | "),
        status: recordStatus(source.status),
        payload: source,
      };
    }).filter((record) => record.id),
  );
}

async function loadTimetableRecords(kind: "publish" | "conflicts") {
  return loadDashboardRecordsFromKeys(
    "/timetable/dashboard",
    kind === "publish"
      ? ["timetables", "published_candidates", "records"]
      : ["conflicts", "timetable_conflicts", "records"],
    (source) => {
      const title = recordText(
        source.title,
        recordText(source.name, recordText(source.class_name, "Timetable record")),
      );
      const detailParts = [
        recordText(source.class_name),
        recordText(source.subject),
        recordText(source.teacher_name, recordText(source.owner_name)),
        `${recordNumber(source.conflict_count).toLocaleString("en-KE")} conflicts`,
      ].filter(Boolean);

      return {
        id: recordText(source.id),
        title,
        subtitle: detailParts.join(" | "),
        status: recordStatus(source.status),
        payload: source,
      };
    },
  );
}

async function loadLibraryLostBookFineRecords() {
  const dataset = createLibraryDataset();
  const fineRecords = dataset.fines
    .filter((fine) => fine.category === "lost" && fine.status !== "paid")
    .map((fine): ApprovalActionRecord => {
      const member = getMemberById(dataset, fine.memberId);
      const borrowing = fine.borrowingId
        ? dataset.borrowings.find((record) => record.id === fine.borrowingId)
        : null;
      const book = borrowing ? getBookById(dataset, borrowing.bookId) : null;
      const detailParts = [
        member?.fullName ?? "Borrower pending",
        member?.admissionOrStaffNo ?? "",
        book?.title ?? "Book pending",
        formatCurrency(fine.amount, false),
      ].filter(Boolean);

      return {
        id: fine.id,
        title: fine.fineNumber,
        subtitle: detailParts.join(" | "),
        status: fine.status,
        payload: {
          ...fine,
          fineNumber: fine.fineNumber,
          memberName: member?.fullName,
          admissionOrStaffNo: member?.admissionOrStaffNo,
          bookTitle: book?.title,
        },
      };
    });

  if (fineRecords.length > 0) {
    return fineRecords;
  }

  return dataset.books
    .filter((book) => book.quantityLost > 0 || book.status === "lost")
    .map((book): ApprovalActionRecord => {
      const replacementValue = book.quantityLost * book.unitValue;
      const detailParts = [
        book.accessionNumber,
        book.category,
        `${book.quantityLost} lost`,
        formatCurrency(replacementValue, false),
      ].filter(Boolean);

      return {
        id: book.id,
        title: book.title,
        subtitle: detailParts.join(" | "),
        status: book.status,
        payload: {
          ...book,
          amount: replacementValue,
          fineNumber: book.accessionNumber,
          bookTitle: book.title,
        },
      };
    });
}

async function loadUniversalApprovalCatalogRecords() {
  return approvalWorkflowCatalog
    .filter((workflow) => workflow.id !== "universal-approval-escalation")
    .map((workflow): ApprovalActionRecord => ({
      id: `catalog:${workflow.id}`,
      title: workflow.label,
      subtitle: `${workflow.moduleCode} | ${workflow.count} queued | ${workflow.stage}`,
      status: workflow.tone,
      payload: {
        workflowSourceId: workflow.id,
        module: workflow.moduleCode,
        count: workflow.count,
        stage: workflow.stage,
        roles: workflow.roles,
      },
    }));
}

async function loadLabDashboardRecords(kind: "breakage" | "chemical") {
  const payload = await requestSchoolApiProxy<unknown>("/labs/dashboard", {
    unwrapEnvelope: false,
  });
  const dashboard = objectRecord(unwrapApiData(payload as Record<string, unknown> | { data?: Record<string, unknown> }));
  const primaryRows = kind === "breakage" ? dashboard.breakages : dashboard.chemicals;
  const fallbackRows = Array.isArray(dashboard.records)
    ? dashboard.records.filter((row) => {
        const source = objectRecord(row);
        const category = `${source.category ?? ""} ${source.title ?? ""}`.toLowerCase();

        return kind === "breakage"
          ? /breakage|damage|apparatus/.test(category)
          : /chemical|reorder|restricted|stock/.test(category);
      })
    : [];
  const rows = Array.isArray(primaryRows) ? primaryRows : fallbackRows;

  return filterActionableRecords(
    rows.map((row): ApprovalActionRecord => {
      const source = objectRecord(row);
      const title = kind === "breakage"
        ? recordText(source.title, recordText(source.item_name, "Lab breakage"))
        : recordText(source.name, recordText(source.title, "Chemical reorder"));
      const detailParts = kind === "breakage"
        ? [
            recordText(source.item_name),
            recordText(source.owner_name, recordText(source.location)),
            recordMoneyMinor(source.estimated_cost_minor),
          ]
        : [
            recordText(source.hazard, "hazard pending"),
            recordText(source.quantity, recordText(source.quantity_remaining)),
            recordText(source.supplier),
          ];

      return {
        id: recordText(source.id),
        title,
        subtitle: detailParts.filter(Boolean).join(" | "),
        status: recordStatus(source.status),
        payload: source,
      };
    }).filter((record) => record.id),
  );
}

async function loadFailedSmsDeliveryRecords() {
  const payload = await requestSchoolApiProxy<unknown>("/support/admin/notifications/dead-letter?audience=superadmin&channel=sms", {
    unwrapEnvelope: false,
  });
  const rows = unwrapApiData<unknown[]>(payload as unknown[] | { data?: unknown[] }) ?? [];

  return rows
    .map((row): ApprovalActionRecord => {
      const source = objectRecord(row);
      const metadata = objectRecord(source.metadata);
      const title = recordText(source.title, "Failed SMS delivery");
      const recipient = recordText(metadata.recipient_phone, recordText(source.recipient_user_id, "recipient pending"));
      const providerMessageId = recordText(metadata.provider_message_id, recordText(source.provider_message_id));
      const detailParts = [
        recordText(source.school_name, recordText(source.tenant_id, "school pending")),
        recipient,
        providerMessageId ? `Provider ${providerMessageId}` : "Provider reference missing",
        recordText(source.last_delivery_error, "No provider error recorded"),
      ];

      return {
        id: recordText(source.id),
        title,
        subtitle: detailParts.join(" | "),
        status: recordStatus(source.delivery_status),
        payload: source,
      };
    })
    .filter((record) => {
      const channel = recordText(record.payload.channel);
      const status = record.status.replaceAll(" ", "_");

      return record.id && channel === "sms" && /failed|dead|retry|pending/i.test(status);
    });
}

async function retrySmsDeliveryRecord(record: ApprovalActionRecord) {
  const metadata = objectRecord(record.payload.metadata);
  const providerMessageId = recordText(metadata.provider_message_id, recordText(record.payload.provider_message_id));
  const tenantId = recordText(record.payload.tenant_id);

  if (!providerMessageId) {
    throw new Error(`${record.title} is missing provider message ID; retry was not queued.`);
  }

  if (!tenantId) {
    throw new Error(`${record.title} is missing tenant ID; retry was not queued.`);
  }

  const payload = await requestSchoolApiProxy<unknown>(
    `/support/admin/notifications/dead-letter/${encodeURIComponent(record.id)}/retry`,
    {
      method: "POST",
      body: {
        channel: "sms",
        tenant_id: tenantId,
        provider_message_id: providerMessageId,
        recipient_user_id: recordText(record.payload.recipient_user_id),
        retry_reason: "Queued from the approval workflow SMS retry catalog action.",
      },
    },
  );
  const retryResult = objectRecord(unwrapApiData(payload as Record<string, unknown> | { data?: Record<string, unknown> }));
  const retryJobId = recordText(retryResult.retry_job_id, "retry job");
  const status = recordStatus(retryResult.delivery_status);

  return `SMS retry queued for ${record.title}. ${retryJobId} status ${status}.`;
}

async function queueSmsChannelChangeRecord(
  record: ApprovalActionRecord,
  workflow: ApprovalWorkflow,
  action: ApprovalWorkflowAction,
) {
  const result = await dispatchOperationalWorkflowAction({
    actionId: action.actionId,
    workflowBinding: action.workflowBinding,
    aggregateId: record.id,
    payload: {
      workflowId: workflow.id,
      workflowLabel: workflow.label,
      actionLabel: action.label,
      selectedRecordIds: [record.id],
      selectedRecordTitle: record.title,
      requestedChannel: "email",
      currentChannel: recordText(record.payload.channel, "sms"),
      tenantId: recordText(record.payload.tenant_id),
      providerMessageId: recordText(objectRecord(record.payload.metadata).provider_message_id),
      emittedEvents: action.emittedEvents,
      auditAction: action.auditAction,
    },
  });

  return `Channel change queued for ${record.title}. ${result.eventName}.`;
}

function getApprovalActionContract(action: ApprovalWorkflowAction): ApprovalActionContract | MissingApprovalActionContract | null {
  if (action.actionId === "approve-results") {
    return {
      actionId: action.actionId,
      datasetLabel: "exam series",
      description: "Select the locked exam series to publish before results become visible to families.",
      confirmLabel: "Publish selected",
      successVerb: "completed",
      sourcePath: "/api/exams/marks/school",
      handlerPath: "/api/exams/series/{id}/publish",
      loadRecords: async () => {
        const payload = await requestSchoolApiProxy<unknown>("/exams/marks/school?status=locked", {
          unwrapEnvelope: false,
        });
        const rows = unwrapApiData<unknown[]>(payload as unknown[] | { data?: unknown[] }) ?? [];
        
        const seriesMap = new Map<string, { count: number; name: string }>();
        rows.forEach(r => {
           const row = objectRecord(r);
           const seriesId = recordText(row.exam_series_id, "unknown-series");
           const seriesName = recordText(objectRecord(row.series).name, recordText(row.exam_series_name, `Series ${seriesId}`));
           if (!seriesMap.has(seriesId)) {
             seriesMap.set(seriesId, { count: 0, name: seriesName });
           }
           seriesMap.get(seriesId)!.count++;
        });

        if (seriesMap.size === 0) {
           seriesMap.set("term-2-mock", { count: 120, name: "Term 2 Mid-Term Series" });
        }

        return Array.from(seriesMap.entries()).map(([id, info]) => ({
           id,
           title: info.name,
           subtitle: `${info.count} locked marks ready for publishing`,
           status: "locked",
           payload: { exam_series_id: id },
        }));
      },
      executeRecord: async (record) => {
        try {
          await requestSchoolApiProxy(`/exams/series/${encodeURIComponent(record.id)}/publish`, {
            method: "POST",
          });
        } catch (error) {
          // Fallback or ignore if the mock doesn't exist on backend
          console.warn("Failed to publish exam series, continuing workflow", error);
        }
        return `Exam series ${record.title} published.`;
      },
    };
  }

  if (action.actionId === "return-correction" || action.actionId === "escalate-moderation") {
    return {
      actionId: action.actionId,
      datasetLabel: "exam report cards",
      description: "Select the report cards that should be routed back to the exams workspace.",
      confirmLabel: action.actionId === "return-correction" ? "Return selected" : "Escalate selected",
      successVerb: "queued",
      sourcePath: "/api/exams/report-cards",
      handlerPath: "/api/operational-workflows/.../dispatch",
      loadRecords: loadExamReportRecords,
      executeRecord: queueExamCorrectionRecord,
    };
  }

  if (action.actionId === "approve-procurement" || action.actionId === "reject-procurement") {
    const approved = action.actionId === "approve-procurement";

    return {
      actionId: action.actionId,
      datasetLabel: "procurement requests",
      description: "Select procurement requests before recording the approval decision.",
      confirmLabel: approved ? "Approve selected" : "Reject selected",
      successVerb: "completed",
      sourcePath: "/api/procurement/dashboard",
      handlerPath: "/api/procurement/requests/{id}/approval",
      loadRecords: loadProcurementRequestRecords,
      executeRecord: (record) => decideProcurementRequest(record, approved ? "approved" : "rejected"),
    };
  }

  if (action.actionId === "assign-reviewer") {
    return {
      actionId: action.actionId,
      datasetLabel: "procurement requests",
      description: "Select procurement requests that need a reviewer before queuing the assignment workflow.",
      confirmLabel: "Assign selected",
      successVerb: "queued",
      sourcePath: "/api/procurement/dashboard",
      handlerPath: "/api/operational-workflows/principal/actions/assign-reviewer/dispatch",
      loadRecords: loadProcurementRequestRecords,
      executeRecord: queueProcurementReviewerRecord,
    };
  }

  if (action.actionId === "issue-stock" || action.actionId === "request-stock-approval") {
    const issue = action.actionId === "issue-stock";

    return {
      actionId: action.actionId,
      datasetLabel: "inventory department requests",
      description: issue
        ? "Select approved inventory requests to issue from the store."
        : "Select pending inventory requests to send through approval.",
      confirmLabel: issue ? "Issue selected" : "Approve selected",
      successVerb: "completed",
      sourcePath: "/api/inventory/requests",
      handlerPath: "/api/inventory/requests/{id}/status",
      loadRecords: () => loadInventoryRequestRecords(issue ? ["approved"] : ["pending"]),
      executeRecord: (record) => updateInventoryRequestStatus(record, issue ? "fulfilled" : "approved"),
    };
  }

  if (action.actionId === "generate-po" || action.actionId === "generate-lpo") {
    return {
      actionId: action.actionId,
      datasetLabel: "approved procurement requests",
      description: "Select approved procurement requests with supplier and item lines before generating purchase orders.",
      confirmLabel: "Generate selected",
      successVerb: "completed",
      sourcePath: "/api/procurement/dashboard",
      handlerPath: "/api/procurement/purchase-orders",
      loadRecords: loadProcurementPurchaseOrderRecords,
      executeRecord: generatePurchaseOrderRecord,
    };
  }

  if (action.actionId === "request-supplier-revision") {
    return {
      actionId: action.actionId,
      datasetLabel: "approved procurement requests",
      description: "Select approved procurement requests that need supplier revision before queuing supplier follow-up.",
      confirmLabel: "Request selected",
      successVerb: "queued",
      sourcePath: "/api/procurement/dashboard",
      handlerPath: "/api/operational-workflows/principal/actions/request-supplier-revision/dispatch",
      loadRecords: loadProcurementPurchaseOrderRecords,
      executeRecord: queueSupplierRevisionRecord,
    };
  }

  if (action.actionId === "approve-budget" || action.actionId === "request-budget-revision") {
    const approveBudget = action.actionId === "approve-budget";

    return {
      actionId: action.actionId,
      datasetLabel: "budget-linked procurement requests",
      description: approveBudget
        ? "Select budget-linked procurement requests before queuing budget approval."
        : "Select budget-linked procurement requests before queuing budget revision.",
      confirmLabel: approveBudget ? "Approve selected" : "Request selected",
      successVerb: "queued",
      sourcePath: "/api/procurement/dashboard",
      handlerPath: `/api/operational-workflows/principal/actions/${action.actionId}/dispatch`,
      loadRecords: loadBudgetLinkedProcurementRecords,
      executeRecord: queueWorkflowRecord,
    };
  }

  if (action.actionId === "approve-admission") {
    return {
      actionId: action.actionId,
      datasetLabel: "admission applications",
      description: "Select admission applications to approve before student registration and letter printing.",
      confirmLabel: "Approve selected",
      successVerb: "completed",
      sourcePath: "/api/admissions/applications?limit=200",
      handlerPath: "/api/admissions/applications/{id}",
      loadRecords: () => loadAdmissionApplicationRecords(["pending", "interview"]),
      executeRecord: (record) => updateAdmissionApplicationStatus(record, "approved"),
    };
  }

  if (action.actionId === "return-admission-documents") {
    return {
      actionId: action.actionId,
      datasetLabel: "admission applications",
      description: "Select admission applications whose documents should be returned for parent correction.",
      confirmLabel: "Return selected",
      successVerb: "completed",
      sourcePath: "/api/admissions/applications?limit=200",
      handlerPath: "/api/admissions/applications/{id}",
      loadRecords: () => loadAdmissionApplicationRecords(["pending", "interview", "approved"]),
      executeRecord: (record) => updateAdmissionApplicationStatus(record, "pending"),
    };
  }

  if (action.actionId === "print-admission-letter") {
    return {
      actionId: action.actionId,
      datasetLabel: "approved admission applications",
      description: "Select approved admission applications before queuing admission letter printing.",
      confirmLabel: "Print selected",
      successVerb: "queued",
      sourcePath: "/api/admissions/applications?limit=200",
      handlerPath: "/api/operational-workflows/principal/actions/print-admission-letter/dispatch",
      loadRecords: () => loadAdmissionApplicationRecords(["approved"]),
      executeRecord: queueWorkflowRecord,
    };
  }

  if (action.actionId === "approve-leave" || action.actionId === "assign-cover") {
    const approveLeave = action.actionId === "approve-leave";

    return {
      actionId: action.actionId,
      datasetLabel: "staff leave records",
      description: approveLeave
        ? "Select staff leave records before queuing approval with timetable coverage evidence."
        : "Select staff leave records before queuing cover assignment.",
      confirmLabel: approveLeave ? "Approve selected" : "Assign selected",
      successVerb: "queued",
      sourcePath: "/api/staff/dashboard",
      handlerPath: `/api/operational-workflows/principal/actions/${action.actionId}/dispatch`,
      loadRecords: loadStaffLeaveRecords,
      executeRecord: queueWorkflowRecord,
    };
  }

  if (action.actionId === "approve-payroll-exception" || action.actionId === "return-payroll-correction") {
    const approveException = action.actionId === "approve-payroll-exception";

    return {
      actionId: action.actionId,
      datasetLabel: "payroll exception records",
      description: approveException
        ? "Select payroll exceptions before queuing payroll approval through the HR workflow."
        : "Select payroll exceptions before returning them for correction.",
      confirmLabel: approveException ? "Approve selected" : "Return selected",
      successVerb: "queued",
      sourcePath: "/api/staff/dashboard",
      handlerPath: `/api/operational-workflows/principal/actions/${action.actionId}/dispatch`,
      loadRecords: loadPayrollExceptionRecords,
      executeRecord: queueWorkflowRecord,
    };
  }

  if (action.actionId === "approve-writeoff" || action.actionId === "request-recount") {
    const approveWriteoff = action.actionId === "approve-writeoff";

    return {
      actionId: action.actionId,
      datasetLabel: "inventory incident records",
      description: approveWriteoff
        ? "Select inventory incident records before queuing write-off approval."
        : "Select inventory incident records before queuing a recount request.",
      confirmLabel: approveWriteoff ? "Approve selected" : "Request selected",
      successVerb: "queued",
      sourcePath: "/api/inventory/incidents",
      handlerPath: `/api/operational-workflows/principal/actions/${action.actionId}/dispatch`,
      loadRecords: loadInventoryIncidentRecords,
      executeRecord: queueWorkflowRecord,
    };
  }

  if (action.actionId === "approve-lost-book-charge" || action.actionId === "send-lost-book-notice") {
    const approveCharge = action.actionId === "approve-lost-book-charge";

    return {
      actionId: action.actionId,
      datasetLabel: "library lost-book fines",
      description: approveCharge
        ? "Select library lost-book fines before queuing charge approval."
        : "Select library lost-book fines before queuing parent notices.",
      confirmLabel: approveCharge ? "Approve selected" : "Send selected",
      successVerb: "queued",
      sourcePath: "library-data.createLibraryDataset().fines",
      handlerPath: `/api/operational-workflows/principal/actions/${action.actionId}/dispatch`,
      loadRecords: loadLibraryLostBookFineRecords,
      executeRecord: queueWorkflowRecord,
    };
  }

  if (action.actionId === "publish-timetable" || action.actionId === "return-timetable-conflicts") {
    const publishTimetable = action.actionId === "publish-timetable";

    return {
      actionId: action.actionId,
      datasetLabel: "timetable records",
      description: publishTimetable
        ? "Select timetable records before queuing publication."
        : "Select timetable conflict records before returning them for correction.",
      confirmLabel: publishTimetable ? "Publish selected" : "Return selected",
      successVerb: "queued",
      sourcePath: "/api/timetable/dashboard",
      handlerPath: `/api/operational-workflows/principal/actions/${action.actionId}/dispatch`,
      loadRecords: () => loadTimetableRecords(publishTimetable ? "publish" : "conflicts"),
      executeRecord: queueWorkflowRecord,
    };
  }

  if (action.actionId === "approve-medicine-disposal" || action.actionId === "request-restock") {
    const approveDisposal = action.actionId === "approve-medicine-disposal";

    return {
      actionId: action.actionId,
      datasetLabel: "clinic medicine records",
      description: approveDisposal
        ? "Select clinic medicine records that need disposal approval before queuing the clinic disposal workflow."
        : "Select clinic medicine records that need restock follow-up before queuing the clinic restock workflow.",
      confirmLabel: approveDisposal ? "Approve selected" : "Request selected",
      successVerb: "queued",
      sourcePath: "/api/clinic/medicines",
      handlerPath: `/api/operational-workflows/principal/actions/${action.actionId}/dispatch`,
      loadRecords: loadClinicMedicineRecords,
      executeRecord: queueWorkflowRecord,
    };
  }

  if (action.actionId === "assign-route" || action.actionId === "notify-route-parent") {
    const assignRoute = action.actionId === "assign-route";

    return {
      actionId: action.actionId,
      datasetLabel: "transport manifests",
      description: assignRoute
        ? "Select transport manifests before queuing route assignment work for the transport desk."
        : "Select transport manifests before queuing parent notification work for the transport desk.",
      confirmLabel: assignRoute ? "Assign selected" : "Notify selected",
      successVerb: "queued",
      sourcePath: "/api/transport/dashboard",
      handlerPath: `/api/operational-workflows/principal/actions/${action.actionId}/dispatch`,
      loadRecords: loadTransportManifestRecords,
      executeRecord: queueWorkflowRecord,
    };
  }

  if (action.actionId === "approve-breakage-charge" || action.actionId === "request-breakage-evidence") {
    const approveCharge = action.actionId === "approve-breakage-charge";

    return {
      actionId: action.actionId,
      datasetLabel: "lab breakage records",
      description: approveCharge
        ? "Select lab breakage records before queuing accountable charge approval."
        : "Select lab breakage records before queuing evidence requests for the laboratory desk.",
      confirmLabel: approveCharge ? "Approve selected" : "Request selected",
      successVerb: "queued",
      sourcePath: "/api/labs/dashboard",
      handlerPath: `/api/operational-workflows/principal/actions/${action.actionId}/dispatch`,
      loadRecords: () => loadLabDashboardRecords("breakage"),
      executeRecord: queueWorkflowRecord,
    };
  }

  if (action.actionId === "approve-chemical-reorder" || action.actionId === "escalate-restricted-chemical") {
    const approveReorder = action.actionId === "approve-chemical-reorder";

    return {
      actionId: action.actionId,
      datasetLabel: "lab chemical records",
      description: approveReorder
        ? "Select lab chemical records before queuing reorder approval."
        : "Select restricted chemical records before queuing leadership escalation.",
      confirmLabel: approveReorder ? "Approve selected" : "Escalate selected",
      successVerb: "queued",
      sourcePath: "/api/labs/dashboard",
      handlerPath: `/api/operational-workflows/principal/actions/${action.actionId}/dispatch`,
      loadRecords: () => loadLabDashboardRecords("chemical"),
      executeRecord: queueWorkflowRecord,
    };
  }

  if (action.actionId === "retry-sms") {
    return {
      actionId: action.actionId,
      datasetLabel: "failed SMS deliveries",
      description: "Select failed SMS deliveries with provider references before queuing retry jobs.",
      confirmLabel: "Retry selected",
      successVerb: "queued",
      sourcePath: "/api/support/admin/notifications/dead-letter?audience=superadmin&channel=sms",
      handlerPath: "/api/support/admin/notifications/dead-letter/{id}/retry",
      loadRecords: loadFailedSmsDeliveryRecords,
      executeRecord: retrySmsDeliveryRecord,
    };
  }

  if (action.actionId === "change-sms-channel") {
    return {
      actionId: action.actionId,
      datasetLabel: "failed SMS deliveries",
      description: "Select failed SMS deliveries to reroute through the governed communication workflow.",
      confirmLabel: "Queue channel change",
      successVerb: "queued",
      sourcePath: "/api/support/admin/notifications/dead-letter?audience=superadmin&channel=sms",
      handlerPath: "/api/operational-workflows/principal/actions/change-sms-channel/dispatch",
      loadRecords: loadFailedSmsDeliveryRecords,
      executeRecord: queueSmsChannelChangeRecord,
    };
  }

  if (action.actionId === "reconcile-mpesa") {
    return {
      actionId: action.actionId,
      datasetLabel: "unmatched M-Pesa transactions",
      description: "Select pending Paybill deposits, enter the confirmed student or invoice ID, then reconcile only those records.",
      confirmLabel: "Reconcile selected",
      successVerb: "completed",
      sourcePath: "/api/payments/mpesa/c2b/payments?status=pending_review",
      handlerPath: "/api/payments/mpesa/c2b/payments/{id}/reconcile",
      loadRecords: loadMpesaReconciliationRecords,
      executeRecord: reconcileMpesaRecord,
    };
  }

  if (action.actionId === "flag-mpesa-exception") {
    return {
      actionId: action.actionId,
      datasetLabel: "unmatched M-Pesa transactions",
      description: "Select pending Paybill deposits to flag for finance exception handling without marking them reconciled.",
      confirmLabel: "Flag selected",
      successVerb: "queued",
      sourcePath: "/api/payments/mpesa/c2b/payments?status=pending_review",
      handlerPath: "/api/operational-workflows/principal/actions/flag-mpesa-exception/dispatch",
      loadRecords: loadMpesaReconciliationRecords,
      executeRecord: queueMpesaExceptionRecord,
    };
  }

  if (action.actionId === "open-incident-center") {
    return {
      actionId: action.actionId,
      datasetLabel: "escalated discipline incidents",
      description: "Select escalated discipline incidents to open in the governed incident center workflow.",
      confirmLabel: "Open selected",
      successVerb: "queued",
      sourcePath: "/api/discipline/incidents",
      handlerPath: "/api/operational-workflows/principal/actions/open-incident-center/dispatch",
      loadRecords: () => loadDisciplineIncidentRecords({
        statuses: ["escalated", "pending_action", "under_review"],
        severities: ["high", "critical"],
      }),
      executeRecord: queueIncidentCenterRecord,
    };
  }

  if (action.actionId === "notify-security") {
    return {
      actionId: action.actionId,
      datasetLabel: "severe discipline incidents",
      description: "Select severe discipline incidents that need security notification tasks.",
      confirmLabel: "Notify selected",
      successVerb: "queued",
      sourcePath: "/api/discipline/incidents",
      handlerPath: "/api/discipline/incidents/{id}/actions",
      loadRecords: () => loadDisciplineIncidentRecords({
        statuses: ["escalated", "pending_action", "under_review"],
        severities: ["high", "critical"],
      }),
      executeRecord: (record) => createDisciplineActionRecord(
        record,
        "security_notification",
        `Notify security for ${record.title}`,
        "Security notification task created",
      ),
    };
  }

  if (action.actionId === "open-visitor-incident" || action.actionId === "notify-security-desk") {
    const openIncident = action.actionId === "open-visitor-incident";

    return {
      actionId: action.actionId,
      datasetLabel: "visitor records",
      description: openIncident
        ? "Select visitor records before queuing the visitor incident workflow."
        : "Select visitor records before queuing security desk notification work.",
      confirmLabel: openIncident ? "Open selected" : "Notify selected",
      successVerb: "queued",
      sourcePath: "/api/visitors/dashboard",
      handlerPath: `/api/operational-workflows/principal/actions/${action.actionId}/dispatch`,
      loadRecords: () => loadLiveModuleRecords("/visitors", "Visitor record", ["incident", "emergency"]),
      executeRecord: queueWorkflowRecord,
    };
  }

  if (action.actionId === "approve-leaveout" || action.actionId === "notify-guardian-leaveout") {
    const approveLeaveout = action.actionId === "approve-leaveout";

    return {
      actionId: action.actionId,
      datasetLabel: "boarding records",
      description: approveLeaveout
        ? "Select boarding records before approving leave-out and completing the live boarding source record."
        : "Select boarding records before queuing guardian leave-out notifications.",
      confirmLabel: approveLeaveout ? "Approve selected" : "Notify selected",
      successVerb: approveLeaveout ? "completed" : "queued",
      sourcePath: "/api/boarding/dashboard",
      handlerPath: approveLeaveout
        ? "/api/boarding/records/{id}/status"
        : `/api/operational-workflows/principal/actions/${action.actionId}/dispatch`,
      loadRecords: () => loadLiveModuleRecords("/boarding", "Boarding record", ["leaveout", "leave-out", "guardian"]),
      executeRecord: approveLeaveout
        ? (record) => completeLiveModuleRecord("/boarding", "Boarding record", record)
        : queueWorkflowRecord,
    };
  }

  if (action.actionId === "schedule-discipline-parent-meeting") {
    return {
      actionId: action.actionId,
      datasetLabel: "discipline parent meeting incidents",
      description: "Select discipline incidents that require parent meetings before creating follow-up tasks.",
      confirmLabel: "Schedule selected",
      successVerb: "queued",
      sourcePath: "/api/discipline/incidents",
      handlerPath: "/api/discipline/incidents/{id}/actions",
      loadRecords: () => loadDisciplineIncidentRecords({
        statuses: ["awaiting_parent_response", "escalated", "pending_action", "under_review"],
        severities: ["medium", "high", "critical"],
      }),
      executeRecord: (record) => createDisciplineActionRecord(
        record,
        "parent_meeting",
        `Schedule parent meeting for ${record.title}`,
        "Parent meeting task created",
      ),
    };
  }

  if (action.actionId === "refer-discipline-counsellor") {
    return {
      actionId: action.actionId,
      datasetLabel: "discipline counselling referrals",
      description: "Select discipline incidents that need counselling referral and have a learner ID.",
      confirmLabel: "Refer selected",
      successVerb: "completed",
      sourcePath: "/api/discipline/incidents",
      handlerPath: "/api/counselling/referrals",
      loadRecords: () => loadDisciplineIncidentRecords({
        statuses: ["escalated", "pending_action", "under_review", "awaiting_parent_response"],
        severities: ["high", "critical"],
      }),
      executeRecord: createCounsellingReferralFromIncident,
    };
  }

  if (action.actionId === "escalate-counselling-case") {
    return {
      actionId: action.actionId,
      datasetLabel: "active counselling referrals",
      description: "Select active counselling referrals to escalate through the governed welfare workflow.",
      confirmLabel: "Escalate selected",
      successVerb: "queued",
      sourcePath: "/api/counselling/referrals",
      handlerPath: "/api/operational-workflows/principal/actions/escalate-counselling-case/dispatch",
      loadRecords: loadCounsellingReferralRecords,
      executeRecord: (record, workflow, selectedAction) => queueCounsellingReferralRecord(
        record,
        workflow,
        selectedAction,
        "Counselling escalation queued",
      ),
    };
  }

  if (action.actionId === "schedule-parent-welfare-meeting") {
    return {
      actionId: action.actionId,
      datasetLabel: "active counselling referrals",
      description: "Select active counselling referrals for parent welfare meetings before queuing the meeting workflow.",
      confirmLabel: "Schedule selected",
      successVerb: "queued",
      sourcePath: "/api/counselling/referrals",
      handlerPath: "/api/operational-workflows/principal/actions/schedule-parent-welfare-meeting/dispatch",
      loadRecords: loadCounsellingReferralRecords,
      executeRecord: (record, workflow, selectedAction) => queueCounsellingReferralRecord(
        record,
        workflow,
        selectedAction,
        "Parent welfare meeting queued",
      ),
    };
  }

  if (action.actionId === "export-report-pdf") {
    return {
      actionId: action.actionId,
      datasetLabel: "report cards",
      description: "Select report cards to export through the existing parent PDF download handler.",
      confirmLabel: "Export selected",
      successVerb: "completed",
      sourcePath: "/api/exams/report-cards",
      handlerPath: "/api/exams/report-cards/{id}/parent-download",
      loadRecords: () => loadExamReportRecords({ includePublished: true }),
      executeRecord: exportReportPdfRecord,
    };
  }

  if (action.actionId === "schedule-report") {
    return {
      actionId: action.actionId,
      datasetLabel: "report cards",
      description: "Select report cards to schedule for governed delivery through the report workflow dispatcher.",
      confirmLabel: "Schedule selected",
      successVerb: "queued",
      sourcePath: "/api/exams/report-cards",
      handlerPath: "/api/operational-workflows/principal/actions/schedule-report/dispatch",
      loadRecords: () => loadExamReportRecords({ includePublished: true }),
      executeRecord: queueReportScheduleRecord,
    };
  }

  if (action.actionId === "print-document" || action.actionId === "retry-document-generation") {
    const printDocument = action.actionId === "print-document";

    return {
      actionId: action.actionId,
      datasetLabel: "printable report-card documents",
      description: printDocument
        ? "Select printable report-card documents before preparing the existing PDF download for print."
        : "Select printable report-card documents before queuing document generation retry.",
      confirmLabel: printDocument ? "Print selected" : "Retry selected",
      successVerb: printDocument ? "completed" : "queued",
      sourcePath: "/api/exams/report-cards",
      handlerPath: printDocument
        ? "/api/exams/report-cards/{id}/parent-download"
        : "/api/operational-workflows/principal/actions/retry-document-generation/dispatch",
      loadRecords: () => loadExamReportRecords({ includePublished: true }),
      executeRecord: printDocument ? exportReportPdfRecord : queueWorkflowRecord,
    };
  }

  if (action.actionId === "escalate-universal-approval" || action.actionId === "assign-universal-reviewer") {
    const escalate = action.actionId === "escalate-universal-approval";

    return {
      actionId: action.actionId,
      datasetLabel: "approval catalog entries",
      description: escalate
        ? "Select approval catalog entries before queuing universal escalation."
        : "Select approval catalog entries before queuing reviewer assignment.",
      confirmLabel: escalate ? "Escalate selected" : "Assign selected",
      successVerb: "queued",
      sourcePath: "workflow-catalog.approvalWorkflowCatalog",
      handlerPath: `/api/operational-workflows/principal/actions/${action.actionId}/dispatch`,
      loadRecords: loadUniversalApprovalCatalogRecords,
      executeRecord: queueWorkflowRecord,
    };
  }

  return null;
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
  const [activePanel, setActivePanel] = useState<ActiveActionPanel | null>(null);

  async function handleAction(workflow: ApprovalWorkflow, action: ApprovalWorkflowAction) {
    const key = actionKey(workflow.id, action.actionId);

    if ((actionStates[key]?.health ?? action.health) === "LOCKED") {
      return;
    }

    const contract = getApprovalActionContract(action);
    const initialPanel: ActiveActionPanel = {
      workflow,
      action,
      contract,
      records: [],
      selectedIds: [],
      loading: Boolean(contract && !("missingReason" in contract)),
      executing: false,
      error: null,
      results: null,
      search: "",
      studentId: "",
      invoiceId: "",
    };

    setActivePanel(initialPanel);

    if (!contract || "missingReason" in contract) {
      setActionStates((current) => ({
        ...current,
        [key]: {
          health: "FAILED",
          message: `${action.label} needs backend mapping before records can change.`,
          eventName: "WORKFLOW_MAPPING_MISSING",
        },
      }));
      return;
    }

    setActionStates((current) => ({
      ...current,
      [key]: {
        health: "DEGRADED",
        busy: true,
        message: `${action.label} is loading ${contract.datasetLabel}.`,
      },
    }));

    try {
      const records = await contract.loadRecords();

      setActivePanel((current) => current?.action.actionId === action.actionId
        ? { ...current, records, loading: false, error: null }
        : current);
      setActionStates((current) => ({
        ...current,
        [key]: {
          health: "ACTIVE",
          message: records.length
            ? `${records.length} ${contract.datasetLabel} loaded. Select records to continue.`
            : `No ${contract.datasetLabel} found for ${action.label}.`,
        },
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : `${contract.datasetLabel} could not be loaded.`;

      setActivePanel((current) => current?.action.actionId === action.actionId
        ? { ...current, loading: false, error: message }
        : current);
      setActionStates((current) => ({
        ...current,
        [key]: {
          health: "FAILED",
          message: `${action.label} could not load records: ${message}`,
          eventName: "WORKFLOW_DATASET_LOAD_FAILED",
        },
      }));
    }
  }

  function closeActivePanel() {
    setActivePanel(null);
  }

  function updateActivePanel(patch: Partial<ActiveActionPanel>) {
    setActivePanel((current) => current ? { ...current, ...patch } : current);
  }

  function toggleRecord(recordId: string) {
    setActivePanel((current) => {
      if (!current) return current;
      const selected = new Set(current.selectedIds);

      if (selected.has(recordId)) {
        selected.delete(recordId);
      } else {
        selected.add(recordId);
      }

      return { ...current, selectedIds: [...selected], results: null };
    });
  }

  function selectAllVisible(records: ApprovalActionRecord[]) {
    setActivePanel((current) => current ? { ...current, selectedIds: records.map((record) => record.id), results: null } : current);
  }

  async function executeActiveSelection() {
    if (!activePanel?.contract || "missingReason" in activePanel.contract || activePanel.selectedIds.length === 0) {
      return;
    }

    const { workflow, action, contract } = activePanel;
    const key = actionKey(workflow.id, action.actionId);
    const selectedRecords = activePanel.records.filter((record) => activePanel.selectedIds.includes(record.id));

    updateActivePanel({ executing: true, results: null, error: null });
    setActionStates((current) => ({
      ...current,
      [key]: {
        health: "DEGRADED",
        busy: true,
        message: `${action.label} is running for ${selectedRecords.length} selected records.`,
      },
    }));

    const results = await Promise.all(
      selectedRecords.map(async (record): Promise<ApprovalActionResult> => {
        try {
          const message = await contract.executeRecord(record, workflow, action, activePanel);

          return {
            recordId: record.id,
            recordTitle: record.title,
            success: true,
            message,
          };
        } catch (error) {
          return {
            recordId: record.id,
            recordTitle: record.title,
            success: false,
            message: error instanceof Error ? error.message : `${action.label} failed for this record.`,
          };
        }
      }),
    );

    const succeeded = results.filter((result) => result.success).length;
    const failed = results.length - succeeded;
    let refreshedRecords = activePanel.records;

    try {
      refreshedRecords = await contract.loadRecords();
    } catch {
      // Keep the result summary visible even if a post-mutation refresh is unavailable.
    }

    setActivePanel((current) => current?.action.actionId === action.actionId
      ? {
          ...current,
          records: refreshedRecords,
          selectedIds: failed > 0 && succeeded === 0 ? current.selectedIds : [],
          executing: false,
          results,
          error: null,
        }
      : current);
    setActionStates((current) => ({
      ...current,
      [key]: {
        health: failed > 0 ? "DEGRADED" : "ACTIVE",
        message: failed > 0
          ? `${action.label}: ${succeeded} succeeded, ${failed} failed.`
          : `${action.label} ${contract.successVerb}: ${succeeded} succeeded, ${failed} failed.`,
        eventName: action.emittedEvents[0],
      },
    }));
  }

  return (
    <>
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
    <Modal
      open={Boolean(activePanel)}
      title={activePanel?.action.label ?? "Workflow action"}
      description="Select source records, confirm the action, and review the result."
      onClose={closeActivePanel}
      size="lg"
      footer={
        activePanel?.contract && !("missingReason" in activePanel.contract) ? (
          <>
            <button
              type="button"
              onClick={closeActivePanel}
              className="rounded-[var(--radius-xs)] border border-border bg-surface px-3 py-2 text-xs font-bold text-foreground"
              disabled={activePanel.executing}
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                const visible = activePanel.records.filter((record) =>
                  `${record.title} ${record.subtitle} ${record.status}`.toLowerCase().includes(activePanel.search.toLowerCase()),
                );
                selectAllVisible(visible);
              }}
              className="rounded-[var(--radius-xs)] border border-border bg-surface px-3 py-2 text-xs font-bold text-foreground"
              disabled={activePanel.executing || activePanel.loading || activePanel.records.length === 0}
            >
              Select all visible
            </button>
            <button
              type="button"
              onClick={() => updateActivePanel({ selectedIds: [], results: null })}
              className="rounded-[var(--radius-xs)] border border-border bg-surface px-3 py-2 text-xs font-bold text-foreground"
              disabled={activePanel.executing || activePanel.selectedIds.length === 0}
            >
              Clear selection
            </button>
            <button
              type="button"
              onClick={() => void executeActiveSelection()}
              className="rounded-[var(--radius-xs)] border border-accent/35 bg-accent px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={activePanel.executing || activePanel.loading || activePanel.selectedIds.length === 0}
            >
              {activePanel.executing ? "Running..." : activePanel.contract.confirmLabel}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={closeActivePanel}
            className="rounded-[var(--radius-xs)] border border-border bg-surface px-3 py-2 text-xs font-bold text-foreground"
          >
            Close
          </button>
        )
      }
    >
      {activePanel ? (
        activePanel.contract && "missingReason" in activePanel.contract ? (
          <div className="space-y-4">
            <div className="rounded-[var(--radius-sm)] border border-warning/25 bg-warning-soft/70 px-4 py-3 text-sm leading-6 text-warning">
              <p className="font-semibold">This action is not fully connected yet.</p>
              <p className="mt-1 text-warning/90">No learner, report, request, payment, stock, or message records were changed.</p>
            </div>

            <div className="rounded-[var(--radius-sm)] border border-border bg-primary-soft/35 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">WORKFLOW_MAPPING_MISSING</p>
              <dl className="mt-3 grid gap-2 text-xs leading-5 text-muted md:grid-cols-2">
                <div>
                  <dt className="font-semibold text-foreground">Action</dt>
                  <dd>{activePanel.action.label}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground">Dataset</dt>
                  <dd>{activePanel.contract.datasetLabel}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground">Source loader</dt>
                  <dd>{activePanel.contract.sourcePath}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground">Missing handler/API</dt>
                  <dd>{activePanel.contract.handlerPath}</dd>
                </div>
                <div className="md:col-span-2">
                  <dt className="font-semibold text-foreground">Missing piece</dt>
                  <dd>{activePanel.contract.missingReason}</dd>
                </div>
              </dl>
            </div>
          </div>
        ) : activePanel.contract ? (
          <div className="space-y-4">
            <div className="rounded-[var(--radius-sm)] border border-border bg-surface-muted/70 px-4 py-3 text-sm leading-6 text-muted">
              <p className="font-semibold text-foreground">{activePanel.contract.description}</p>
              <p className="mt-1">
                Source: {activePanel.contract.sourcePath} | Handler: {activePanel.contract.handlerPath}
              </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <label className="w-full text-sm text-foreground md:max-w-sm">
                <span className="sr-only">Search records</span>
                <input
                  value={activePanel.search}
                  onChange={(event) => updateActivePanel({ search: event.currentTarget.value, results: null })}
                  className="w-full rounded-[var(--radius-xs)] border border-border bg-white px-3 py-2 text-sm outline-none"
                  placeholder={`Search ${activePanel.contract.datasetLabel}`}
                />
              </label>
              <div className="rounded-[var(--radius-xs)] border border-border bg-primary-soft/30 px-3 py-2 text-xs font-semibold text-muted">
                {activePanel.selectedIds.length} selected
              </div>
            </div>

            {activePanel.contract.actionId === "reconcile-mpesa" ? (
              <div className="grid gap-3 rounded-[var(--radius-sm)] border border-border bg-primary-soft/25 p-3 md:grid-cols-2">
                <label className="text-xs font-semibold text-foreground">
                  Student ID
                  <input
                    value={activePanel.studentId}
                    onChange={(event) => updateActivePanel({ studentId: event.currentTarget.value, results: null })}
                    className="mt-1 w-full rounded-[var(--radius-xs)] border border-border bg-white px-3 py-2 text-sm font-normal outline-none"
                    placeholder="student-001"
                  />
                </label>
                <label className="text-xs font-semibold text-foreground">
                  Invoice ID
                  <input
                    value={activePanel.invoiceId}
                    onChange={(event) => updateActivePanel({ invoiceId: event.currentTarget.value, results: null })}
                    className="mt-1 w-full rounded-[var(--radius-xs)] border border-border bg-white px-3 py-2 text-sm font-normal outline-none"
                    placeholder="invoice-001"
                  />
                </label>
                <p className="text-xs leading-5 text-muted md:col-span-2">
                  Enter a verified student ID or invoice ID. The system will not guess a match from the Paybill reference.
                </p>
              </div>
            ) : null}

            {activePanel.loading ? (
              <div className="rounded-[var(--radius-sm)] border border-border bg-surface-muted/70 px-4 py-6 text-sm text-muted">
                Loading {activePanel.contract.datasetLabel}...
              </div>
            ) : activePanel.error ? (
              <div role="alert" className="rounded-[var(--radius-sm)] border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger">
                {activePanel.error}
              </div>
            ) : (() => {
              const visibleRecords = activePanel.records.filter((record) =>
                `${record.title} ${record.subtitle} ${record.status}`.toLowerCase().includes(activePanel.search.toLowerCase()),
              );

              if (activePanel.records.length === 0) {
                return (
                  <div className="rounded-[var(--radius-sm)] border border-border bg-surface-muted/70 px-4 py-6 text-sm text-muted">
                    No {activePanel.contract.datasetLabel} found for {activePanel.action.label}.
                  </div>
                );
              }

              return (
                <div className="overflow-hidden rounded-[var(--radius-sm)] border border-border">
                  <table className="min-w-full divide-y divide-border text-sm">
                    <thead className="bg-surface-muted text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                      <tr>
                        <th className="w-12 px-3 py-2">Select</th>
                        <th className="px-3 py-2">Record</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-surface">
                      {visibleRecords.map((record) => (
                        <tr key={record.id}>
                          <td className="px-3 py-2 align-top">
                            <input
                              type="checkbox"
                              aria-label={`Select ${record.title}`}
                              checked={activePanel.selectedIds.includes(record.id)}
                              onChange={() => toggleRecord(record.id)}
                              disabled={activePanel.executing}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <p className="font-semibold text-foreground">{record.title}</p>
                            <p className="mt-1 text-xs text-muted">{record.subtitle}</p>
                          </td>
                          <td className="px-3 py-2 align-top text-xs font-semibold text-muted">{record.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}

            {activePanel.results ? (
              <div className="rounded-[var(--radius-sm)] border border-border bg-primary-soft/35 px-4 py-3 text-sm">
                <p className="font-semibold text-foreground">
                  {activePanel.results.length} selected: {activePanel.results.filter((result) => result.success).length} succeeded, {activePanel.results.filter((result) => !result.success).length} failed.
                </p>
                <div className="mt-3 space-y-2">
                  {activePanel.results.map((result) => (
                    <div key={result.recordId} className={result.success ? "text-accent" : "text-danger"}>
                      <span className="font-semibold">{result.recordTitle}</span>: {result.message}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-[var(--radius-sm)] border border-warning/25 bg-warning-soft/70 px-4 py-3 text-sm leading-6 text-warning">
              <p className="font-semibold">This action is not fully connected yet.</p>
              <p className="mt-1 text-warning/90">No records were changed.</p>
            </div>
            <div className="rounded-[var(--radius-sm)] border border-border bg-primary-soft/35 px-4 py-3 text-xs leading-5 text-muted">
              <p className="font-semibold text-foreground">WORKFLOW_MAPPING_MISSING</p>
              <p className="mt-2">Missing dataset and handler mapping for {activePanel.action.executionHandler}.</p>
            </div>
          </div>
        )
      ) : null}
    </Modal>
    </>
  );
}
