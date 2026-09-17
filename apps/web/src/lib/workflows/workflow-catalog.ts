import type { SchoolModuleCode } from "@/lib/module-access/module-access-map";

export type ApprovalWorkflowActionHealth = "ACTIVE" | "DEGRADED" | "FAILED" | "LOCKED";

export type ApprovalWorkflowAction = {
  actionId: string;
  label: string;
  workflowBinding: string;
  executionHandler: string;
  capabilityRequirements: string[];
  fallbackHandler: string;
  retryPolicy: {
    maxAttempts: number;
    backoff: "fixed" | "linear" | "exponential";
  };
  emittedEvents: string[];
  auditAction: string;
  health?: ApprovalWorkflowActionHealth;
};

export type ApprovalWorkflow = {
  id: string;
  label: string;
  description: string;
  moduleCode: SchoolModuleCode;
  roles: string[];
  stage: "request" | "review" | "approval" | "release";
  count: number;
  tone: "ok" | "warning" | "critical";
  actions: ApprovalWorkflowAction[];
};

function operationalAction(
  actionId: string,
  label: string,
  workflowBinding: string,
  executionHandler: string,
  emittedEvents: string[],
  health: ApprovalWorkflowActionHealth = "ACTIVE",
): ApprovalWorkflowAction {
  return {
    actionId,
    label,
    workflowBinding,
    executionHandler,
    capabilityRequirements: [`${workflowBinding.split("-")[0]}:execute`],
    fallbackHandler: `fallback.${executionHandler}`,
    retryPolicy: {
      maxAttempts: 3,
      backoff: "exponential",
    },
    emittedEvents,
    auditAction: `audit.${actionId}`,
    health,
  };
}

export const approvalWorkflowCatalog: ApprovalWorkflow[] = [
  {
    id: "exam-release",
    label: "Exam release approvals",
    description: "Approve moderated results before they become visible to families.",
    moduleCode: "exams",
    roles: ["principal", "deputy-principal", "dean-academics"],
    stage: "approval",
    count: 4,
    tone: "warning",
    actions: [
      operationalAction("approve-results", "Approve Results", "exam-release", "workflows.examRelease.approve", [
        "RESULTS_APPROVED",
        "PRINCIPAL_APPROVAL_GRANTED",
      ]),
      operationalAction("return-correction", "Return for Correction", "exam-release", "workflows.examRelease.return", [
        "RESULTS_RETURNED_FOR_CORRECTION",
      ]),
      operationalAction("escalate-moderation", "Escalate Moderation", "exam-release", "workflows.examRelease.escalate", [
        "EXAM_MODERATION_ESCALATED",
      ]),
    ],
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
    actions: [
      operationalAction("approve-procurement", "Approve", "procurement-approval", "workflows.procurement.approve", [
        "PROCUREMENT_APPROVED",
      ]),
      operationalAction("reject-procurement", "Reject", "procurement-approval", "workflows.procurement.reject", [
        "PROCUREMENT_REJECTED",
      ]),
      operationalAction("assign-reviewer", "Assign Reviewer", "procurement-approval", "workflows.procurement.assignReviewer", [
        "PROCUREMENT_REVIEWER_ASSIGNED",
      ]),
      operationalAction("generate-po", "Generate PO", "procurement-approval", "workflows.procurement.generatePurchaseOrder", [
        "PURCHASE_ORDER_GENERATED",
      ]),
    ],
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
    actions: [
      operationalAction("approve-leave", "Approve Leave", "leave-approval", "workflows.leave.approve", [
        "LEAVE_APPROVED",
      ], "DEGRADED"),
      operationalAction("assign-cover", "Assign Cover", "leave-approval", "workflows.leave.assignCover", [
        "LEAVE_COVER_ASSIGNED",
      ], "DEGRADED"),
    ],
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
    actions: [
      operationalAction("approve-writeoff", "Approve Write-off", "inventory-writeoff", "workflows.inventory.approveWriteoff", [
        "INVENTORY_WRITEOFF_APPROVED",
      ], "DEGRADED"),
      operationalAction("request-recount", "Request Recount", "inventory-writeoff", "workflows.inventory.requestRecount", [
        "INVENTORY_RECOUNT_REQUESTED",
      ], "DEGRADED"),
    ],
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
    actions: [
      operationalAction("open-incident-center", "Open Incident Center", "incident-escalation", "workflows.incident.open", [
        "INCIDENT_CENTER_OPENED",
      ]),
      operationalAction("notify-security", "Notify Security", "incident-escalation", "workflows.incident.notifySecurity", [
        "SECURITY_NOTIFIED",
      ]),
    ],
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
    actions: [
      operationalAction("approve-medicine-disposal", "Approve Disposal", "medicine-disposal", "workflows.clinic.approveDisposal", [
        "MEDICINE_DISPOSAL_APPROVED",
      ], "DEGRADED"),
      operationalAction("request-restock", "Request Restock", "medicine-disposal", "workflows.clinic.requestRestock", [
        "CLINIC_RESTOCK_REQUESTED",
      ], "DEGRADED"),
    ],
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
    actions: [
      operationalAction("approve-budget", "Approve Budget", "budget-approval", "workflows.budget.approve", [
        "BUDGET_APPROVED",
      ], "DEGRADED"),
      operationalAction("request-budget-revision", "Request Revision", "budget-approval", "workflows.budget.requestRevision", [
        "BUDGET_REVISION_REQUESTED",
      ], "DEGRADED"),
    ],
  },
  {
    id: "admissions-approval",
    label: "Admissions approvals",
    description: "Review verified applications before admission letters and student records are generated.",
    moduleCode: "admissions",
    roles: ["principal", "secretary", "admissions"],
    stage: "approval",
    count: 18,
    tone: "warning",
    actions: [
      operationalAction("approve-admission", "Approve Admission", "admissions-approval", "workflows.admissions.approve", [
        "ADMISSION_APPROVED",
      ]),
      operationalAction("return-admission-documents", "Return Documents", "admissions-approval", "workflows.admissions.returnDocuments", [
        "ADMISSION_DOCUMENTS_RETURNED",
      ]),
      operationalAction("print-admission-letter", "Print Letter", "admissions-approval", "workflows.admissions.printLetter", [
        "ADMISSION_LETTER_PRINTED",
      ]),
    ],
  },
  {
    id: "transport-route-assignment",
    label: "Transport route assignments",
    description: "Assign learners to stops, vehicles, and parent notification routes.",
    moduleCode: "transport",
    roles: ["transport-manager", "principal", "secretary"],
    stage: "review",
    count: 9,
    tone: "warning",
    actions: [
      operationalAction("assign-route", "Assign Route", "transport-route-assignment", "workflows.transport.assignRoute", [
        "TRANSPORT_ROUTE_ASSIGNED",
      ]),
      operationalAction("notify-route-parent", "Notify Parent", "transport-route-assignment", "workflows.transport.notifyParent", [
        "TRANSPORT_PARENT_NOTIFIED",
      ]),
    ],
  },
  {
    id: "lab-breakage-approval",
    label: "Lab breakage approvals",
    description: "Approve accountability decisions for damaged apparatus and practical-session incidents.",
    moduleCode: "lab_management",
    roles: ["laboratory-technician", "principal", "deputy-principal"],
    stage: "approval",
    count: 4,
    tone: "critical",
    actions: [
      operationalAction("approve-breakage-charge", "Approve Charge", "lab-breakage-approval", "workflows.labs.approveBreakageCharge", [
        "LAB_BREAKAGE_CHARGE_APPROVED",
      ]),
      operationalAction("request-breakage-evidence", "Request Evidence", "lab-breakage-approval", "workflows.labs.requestEvidence", [
        "LAB_BREAKAGE_EVIDENCE_REQUESTED",
      ]),
    ],
  },
  {
    id: "chemical-reorder",
    label: "Chemical reorder requests",
    description: "Route low-stock and restricted chemical replenishment through safe approvals.",
    moduleCode: "lab_management",
    roles: ["laboratory-technician", "storekeeper", "principal"],
    stage: "review",
    count: 6,
    tone: "warning",
    actions: [
      operationalAction("approve-chemical-reorder", "Approve Reorder", "chemical-reorder", "workflows.labs.approveChemicalReorder", [
        "CHEMICAL_REORDER_APPROVED",
      ]),
      operationalAction("escalate-restricted-chemical", "Escalate Restricted Chemical", "chemical-reorder", "workflows.labs.escalateRestrictedChemical", [
        "RESTRICTED_CHEMICAL_ESCALATED",
      ], "DEGRADED"),
    ],
  },
  {
    id: "stock-issue",
    label: "Stock issue approvals",
    description: "Issue consumables, stock cards, and department requests with audit-backed inventory movement.",
    moduleCode: "inventory",
    roles: ["storekeeper", "principal", "bursar"],
    stage: "release",
    count: 11,
    tone: "warning",
    actions: [
      operationalAction("issue-stock", "Issue Stock", "stock-issue", "workflows.inventory.issueStock", [
        "STOCK_ISSUED",
      ]),
      operationalAction("request-stock-approval", "Request Approval", "stock-issue", "workflows.inventory.requestApproval", [
        "STOCK_APPROVAL_REQUESTED",
      ]),
    ],
  },
  {
    id: "visitor-incident",
    label: "Visitor incident handling",
    description: "Escalate gate incidents, visitor movements, and security desk evidence.",
    moduleCode: "visitor_management",
    roles: ["security-officer", "deputy-principal", "principal"],
    stage: "review",
    count: 3,
    tone: "critical",
    actions: [
      operationalAction("open-visitor-incident", "Open Incident", "visitor-incident", "workflows.security.openVisitorIncident", [
        "VISITOR_INCIDENT_OPENED",
      ]),
      operationalAction("notify-security-desk", "Notify Security Desk", "visitor-incident", "workflows.security.notifyDesk", [
        "SECURITY_DESK_NOTIFIED",
      ]),
    ],
  },
  {
    id: "boarding-leaveout",
    label: "Boarding leave-out approvals",
    description: "Approve guardian-confirmed leave-outs while preserving dormitory accountability.",
    moduleCode: "boarding",
    roles: ["boarding-master", "deputy-principal", "principal"],
    stage: "approval",
    count: 7,
    tone: "warning",
    actions: [
      operationalAction("approve-leaveout", "Approve Leave-out", "boarding-leaveout", "workflows.boarding.approveLeaveout", [
        "BOARDING_LEAVEOUT_APPROVED",
      ]),
      operationalAction("notify-guardian-leaveout", "Notify Guardian", "boarding-leaveout", "workflows.boarding.notifyGuardian", [
        "BOARDING_GUARDIAN_NOTIFIED",
      ]),
    ],
  },
  {
    id: "counselling-escalation",
    label: "Counselling escalations",
    description: "Escalate urgent welfare cases to leadership, clinic, or guardian workflows without exposing private notes.",
    moduleCode: "admin_command_centers",
    roles: ["guidance-counselling", "principal", "deputy-principal"],
    stage: "review",
    count: 5,
    tone: "critical",
    actions: [
      operationalAction("escalate-counselling-case", "Escalate Case", "counselling-escalation", "workflows.counselling.escalateCase", [
        "COUNSELLING_CASE_ESCALATED",
      ]),
      operationalAction("schedule-parent-welfare-meeting", "Schedule Parent Meeting", "counselling-escalation", "workflows.counselling.scheduleParentMeeting", [
        "WELFARE_PARENT_MEETING_SCHEDULED",
      ]),
    ],
  },
  {
    id: "discipline-parent-meeting",
    label: "Discipline parent meetings",
    description: "Move repeat incidents into parent meeting, counselling referral, or principal escalation.",
    moduleCode: "discipline",
    roles: ["discipline-master", "class-teacher", "deputy-principal", "principal"],
    stage: "review",
    count: 12,
    tone: "critical",
    actions: [
      operationalAction("schedule-discipline-parent-meeting", "Schedule Parent Meeting", "discipline-parent-meeting", "workflows.discipline.scheduleParentMeeting", [
        "DISCIPLINE_PARENT_MEETING_SCHEDULED",
      ]),
      operationalAction("refer-discipline-counsellor", "Refer to Counsellor", "discipline-parent-meeting", "workflows.discipline.referCounsellor", [
        "DISCIPLINE_COUNSELLING_REFERRAL_CREATED",
      ]),
    ],
  },
  {
    id: "library-lost-book",
    label: "Lost book accountability",
    description: "Approve lost book charges, parent notices, and replacement tracking.",
    moduleCode: "library",
    roles: ["librarian", "class-teacher", "principal"],
    stage: "approval",
    count: 8,
    tone: "warning",
    actions: [
      operationalAction("approve-lost-book-charge", "Approve Charge", "library-lost-book", "workflows.library.approveLostBookCharge", [
        "LOST_BOOK_CHARGE_APPROVED",
      ]),
      operationalAction("send-lost-book-notice", "Send Parent Notice", "library-lost-book", "workflows.library.sendParentNotice", [
        "LOST_BOOK_PARENT_NOTICE_SENT",
      ]),
    ],
  },
  {
    id: "payroll-exception",
    label: "Payroll exceptions",
    description: "Resolve payroll blockers, payslip errors, and staff payment approvals.",
    moduleCode: "hr_payroll",
    roles: ["principal", "accountant", "bursar"],
    stage: "review",
    count: 2,
    tone: "critical",
    actions: [
      operationalAction("approve-payroll-exception", "Approve Exception", "payroll-exception", "workflows.payroll.approveException", [
        "PAYROLL_EXCEPTION_APPROVED",
      ]),
      operationalAction("return-payroll-correction", "Return Correction", "payroll-exception", "workflows.payroll.returnCorrection", [
        "PAYROLL_CORRECTION_RETURNED",
      ]),
    ],
  },
  {
    id: "timetable-publish",
    label: "Timetable publishing",
    description: "Publish validated timetables after conflicts, substitutions, and staff notifications are resolved.",
    moduleCode: "timetable_builder",
    roles: ["deputy-principal", "principal", "hod"],
    stage: "release",
    count: 1,
    tone: "ok",
    actions: [
      operationalAction("publish-timetable", "Publish Timetable", "timetable-publish", "workflows.timetable.publish", [
        "TIMETABLE_PUBLISHED",
      ]),
      operationalAction("return-timetable-conflicts", "Return Conflicts", "timetable-publish", "workflows.timetable.returnConflicts", [
        "TIMETABLE_CONFLICTS_RETURNED",
      ]),
    ],
  },
  {
    id: "procurement-purchase-order",
    label: "Procurement purchase orders",
    description: "Generate LPOs and goods-received follow-up from approved purchase requests.",
    moduleCode: "procurement",
    roles: ["principal", "bursar", "storekeeper"],
    stage: "release",
    count: 5,
    tone: "warning",
    actions: [
      operationalAction("generate-lpo", "Generate LPO", "procurement-purchase-order", "workflows.procurement.generateLpo", [
        "LPO_GENERATED",
      ]),
      operationalAction("request-supplier-revision", "Request Supplier Revision", "procurement-purchase-order", "workflows.procurement.requestSupplierRevision", [
        "SUPPLIER_REVISION_REQUESTED",
      ]),
    ],
  },
  {
    id: "document-print-request",
    label: "Document print requests",
    description: "Preview, print, retry, archive, and send school documents from one governed queue.",
    moduleCode: "document_printing",
    roles: ["secretary", "principal", "accountant"],
    stage: "release",
    count: 22,
    tone: "warning",
    actions: [
      operationalAction("print-document", "Print Document", "document-print-request", "workflows.documents.print", [
        "DOCUMENT_PRINTED",
      ]),
      operationalAction("retry-document-generation", "Retry Generation", "document-print-request", "workflows.documents.retryGeneration", [
        "DOCUMENT_GENERATION_RETRIED",
      ], "DEGRADED"),
    ],
  },
  {
    id: "sms-retry",
    label: "SMS retry queue",
    description: "Retry failed parent and staff communication with delivery audit visibility.",
    moduleCode: "communication_center",
    roles: ["secretary", "principal", "class-teacher", "accountant"],
    stage: "release",
    count: 15,
    tone: "warning",
    actions: [
      operationalAction("retry-sms", "Retry SMS", "sms-retry", "workflows.communication.retrySms", [
        "SMS_RETRY_TRIGGERED",
      ], "DEGRADED"),
      operationalAction("change-sms-channel", "Change Channel", "sms-retry", "workflows.communication.changeChannel", [
        "COMMUNICATION_CHANNEL_CHANGED",
      ]),
    ],
  },
  {
    id: "mpesa-reconciliation",
    label: "M-Pesa reconciliation",
    description: "Resolve unmatched Paybill deposits and finance projection exceptions.",
    moduleCode: "finance",
    roles: ["accountant", "bursar", "principal"],
    stage: "review",
    count: 6,
    tone: "critical",
    actions: [
      operationalAction("reconcile-mpesa", "Reconcile M-Pesa", "mpesa-reconciliation", "workflows.finance.reconcileMpesa", [
        "MPESA_PAYMENT_RECONCILED",
      ]),
      operationalAction("flag-mpesa-exception", "Flag Exception", "mpesa-reconciliation", "workflows.finance.flagMpesaException", [
        "MPESA_RECONCILIATION_EXCEPTION_FLAGGED",
      ]),
    ],
  },
  {
    id: "report-export",
    label: "Report export approvals",
    description: "Export, schedule, and audit sensitive operational reports.",
    moduleCode: "reports_analytics",
    roles: ["principal", "deputy-principal", "accountant", "hod"],
    stage: "release",
    count: 10,
    tone: "ok",
    actions: [
      operationalAction("export-report-pdf", "Export PDF", "report-export", "workflows.reports.exportPdf", [
        "REPORT_PDF_EXPORTED",
      ]),
      operationalAction("schedule-report", "Schedule Report", "report-export", "workflows.reports.schedule", [
        "REPORT_SCHEDULED",
      ]),
    ],
  },
  {
    id: "universal-approval-escalation",
    label: "Universal approval escalations",
    description: "Escalate stuck cross-module approvals while preserving workflow lineage.",
    moduleCode: "universal_approvals",
    roles: ["principal", "deputy-principal", "accountant", "secretary"],
    stage: "approval",
    count: 13,
    tone: "critical",
    actions: [
      operationalAction("escalate-universal-approval", "Escalate Approval", "universal-approval-escalation", "workflows.approvals.escalate", [
        "UNIVERSAL_APPROVAL_ESCALATED",
      ]),
      operationalAction("assign-universal-reviewer", "Assign Reviewer", "universal-approval-escalation", "workflows.approvals.assignReviewer", [
        "UNIVERSAL_APPROVAL_REVIEWER_ASSIGNED",
      ]),
    ],
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
