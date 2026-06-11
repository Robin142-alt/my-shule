import { generatedWorkspaceDefinitions } from './generated-workspace-definitions';
import type { ExtremeErpBlueprint, ExtremeErpWorkspaceId, OperationalState } from "./extreme-erp-blueprints";
import type { SearchAccessMode, SearchEntityType } from "@/lib/search/search-access-policy";

export const KENYAN_OPERATIONAL_EXAMPLES = [
  "Admission No: MYS/2026/001",
  "Student Name: Brian Otieno",
  "Parent Phone: 07XXXXXXXX",
  "M-Pesa Code: QEX7ABC123",
  "County: Kiambu",
  "Sub County: Ruiru",
  "Class: Grade 7 East",
  "Stream: Blue",
  "Term: Term 1",
  "Year: 2026",
  "Fee Balance: KES 18,500",
] as const;

export const GLOBAL_OPERATING_SYSTEM_CONTRACT = {
  layout: [
    "left sidebar navigation",
    "top header",
    "current school name",
    "academic year selector",
    "term selector",
    "role badge",
    "global search",
    "notification bell",
    "urgent action counter",
    "profile menu",
    "sync status indicator",
    "quick action menu",
    "main content area",
    "optional right activity drawer",
  ],
  search: {
    entities: [
      "students",
      "parents",
      "staff",
      "classes",
      "subjects",
      "receipts",
      "invoices",
      "M-Pesa transactions",
      "exams",
      "assignments",
      "incidents",
      "books",
      "inventory items",
      "buses",
      "routes",
      "visitors",
      "admissions",
      "documents",
      "support tickets",
    ],
    studentActions: [
      "View Profile",
      "View Fee Balance",
      "Record Payment",
      "Mark Attendance",
      "Add Discipline Case",
      "Send Parent SMS",
      "View Academic Report",
    ],
    parentActions: ["View Children", "Send SMS", "View Fee Statement", "View Communication History"],
    receiptActions: ["View Receipt", "Print Receipt", "Send to Parent", "Reverse Payment if allowed"],
  },
  uiStates: [
    "loading",
    "success",
    "error",
    "empty",
    "degraded",
    "offline/draft",
    "permission denied",
    "validation failed",
    "retry",
  ],
  buttonCategories: {
    primary: {
      examples: ["Add Student", "Save Payment", "Submit Attendance", "Create Exam", "Approve Request", "Send Notice"],
      requirements: ["capability", "handler", "workflow transition", "audit log", "notification trigger"],
    },
    secondary: {
      examples: ["Cancel", "Save Draft", "Preview", "Export", "Print", "View Details"],
      requirements: ["purpose", "enabled state", "disabled state", "error behavior"],
    },
    danger: {
      examples: ["Delete", "Suspend", "Reverse Payment", "Reject Application", "Cancel Route"],
      requirements: ["confirmation modal", "reason field", "audit log", "permission check"],
    },
    workflow: {
      examples: ["Submit for Approval", "Approve", "Reject", "Return for Correction", "Escalate", "Assign", "Mark Resolved"],
      requirements: ["workflow binding", "capability validation", "event emission", "retry policy"],
    },
    recovery: {
      examples: ["Retry SMS", "Retry Sync", "Reconcile Again", "Restore", "Reprocess Report", "Resolve Conflict"],
      requirements: ["failure event", "fallback handler", "self-healing signal", "visible retry"],
    },
    communication: {
      examples: ["Send SMS", "Open Parent Contact Details", "Send Email", "Send Notice", "Resend Message", "Notify Staff"],
      requirements: ["recipient validation", "template", "delivery tracking", "retry queue"],
    },
  },
  formSystem: {
    footer: ["Cancel", "Save Draft", "Submit", "Preview", "Print", "Submit for Approval", "Send SMS", "Preview Print"],
    inputs: [
      "text input",
      "number input",
      "currency input",
      "phone input",
      "email input",
      "date picker",
      "time picker",
      "dropdown",
      "searchable dropdown",
      "multi-select",
      "checkbox",
      "radio group",
      "switch",
      "textarea",
      "file upload",
      "image upload",
      "table input",
      "repeatable fields",
      "student selector",
      "parent selector",
      "staff selector",
      "class selector",
      "stream selector",
      "subject selector",
      "term selector",
      "academic year selector",
    ],
    phoneHelper: "Use an active parent/guardian number for SMS and M-Pesa communication.",
    currency: "KES",
  },
  tableSystem: {
    everyTableMustInclude: [
      "title",
      "description",
      "search box",
      "filters",
      "sort controls",
      "column visibility controls",
      "pagination",
      "status badges",
      "row actions",
      "bulk actions",
      "export",
      "print where useful",
      "loading skeleton",
      "empty state",
      "error state",
    ],
    rowActions: ["View", "Edit", "Approve", "Reject", "Assign", "Print", "Export", "Send SMS", "Archive", "View Action Record"],
    bulkActions: ["Send SMS to selected parents", "Print selected records", "Export selected rows", "Approve selected requests"],
  },
  graphRules: {
    requiredParts: ["title", "date range filter", "class/stream/role filter", "explanation", "action suggestion"],
    actionExamples: ["View Students", "Send Parent SMS", "Export Finance Report"],
  },
  workflow: {
    standard: "Draft -> Submitted -> Under Review -> Approved -> Executed -> Archived",
    alternatives: ["Rejected", "Returned for Correction", "Escalated", "Cancelled", "Failed", "Retried"],
    itemFields: ["current status", "owner", "assigned role", "due date", "priority", "last update", "next action", "comments", "attachments", "audit trail"],
  },
} as const;

export type DocxRoleId =
  | "principal"
  | "deputy-principal"
  | "secretary"
  | "accountant"
  | "teacher"
  | "dean-academics"
  | "exams-manager"
  | "hod"
  | "class-teacher"
  | "grade-master"
  | "nurse"
  | "guidance-counselling"
  | "discipline-master"
  | "librarian"
  | "parent"
  | "student"
  | "storekeeper"
  | "boarding-master"
  | "security-officer"
  | "transport-manager"
  | "laboratory-technician"
  | "admissions"
  | "superadmin"
  | "system-monitor";

export type DocxAddedModuleId = string;

type OperationalTableContract = {
  title: string;
  columns: string[];
  rowActions: string[];
  bulkActions: string[];
};

type OperationalFormContract = {
  title: string;
  fields: string[];
  footerActions: string[];
};

type OperationalRoleQueueContract = {
  title: string;
  owner: string;
  priority: "High" | "Medium" | "Low";
  workflow: string;
  actions: string[];
  auditEvent: string;
  sla: string;
};

export type OperationalRoleBlueprint = {
  id: DocxRoleId;
  identity: string;
  searchMode: SearchAccessMode;
  searchEntities: SearchEntityType[];
  forbiddenEntities: SearchEntityType[];
  firstViewport: string[];
  sidebar: string[];
  queues: OperationalRoleQueueContract[];
  primaryActions: string[];
  tables: OperationalTableContract[];
  forms: OperationalFormContract[];
  workflows: string[];
  communicationTriggers: string[];
  printOutputs: string[];
  dependencies: string[];
  states: string[];
  mobileBehavior: string[];
  lowBandwidthBehavior: string[];
};

export type DocxAddedModuleContract = {
  id: DocxAddedModuleId;
  title: string;
  uniqueSidebar: string[];
  urgentActionStrip: string[];
  mainTable: OperationalTableContract;
  forms: OperationalFormContract[];
  rightDetailsDrawer: string[];
  approvalWorkflow: string;
  smsTriggers: string[];
  printOutputs: string[];
  auditTrail: string[];
  permissionChecks: string[];
  sampleData?: string[];
  states: string[];
  mobileBehavior: string[];
  lowBandwidthBehavior: string[];
};

const defaultStates = ["LOADING", "EMPTY", "DEGRADED", "FAILED", "LOCKED"] as const;
const defaultAuditTrail = ["actor", "tenant", "capability", "workflow", "events"] as const;
const defaultMobileBehavior = ["collapse sidebar into drawer", "keep urgent actions first", "keep queue actions thumb-reachable"] as const;
const defaultLowBandwidthBehavior = ["show cached queue", "allow offline draft", "retry sync visibly"] as const;

const defaultSearchEntities: SearchEntityType[] = ["student", "parent", "staff", "class", "document"];
const defaultForbiddenEntities: SearchEntityType[] = ["platformTenant", "systemJob"];

const roleSearchProfiles: Record<
  DocxRoleId,
  { mode: SearchAccessMode; entities: SearchEntityType[]; forbidden: SearchEntityType[] }
> = {
  principal: {
    mode: "GLOBAL_EXECUTIVE",
    entities: ["student", "parent", "staff", "class", "receipt", "invoice", "mpesa", "exam", "incident", "inventory", "bus", "route", "visitor", "document"],
    forbidden: ["platformTenant", "systemJob"],
  },
  "deputy-principal": {
    mode: "GLOBAL_OPERATIONS",
    entities: ["student", "parent", "staff", "class", "exam", "assignment", "incident", "bus", "route", "visitor", "disciplineCase", "document"],
    forbidden: ["receipt", "invoice", "mpesa", "platformTenant", "systemJob", "healthCase", "counsellingCase"],
  },
  secretary: {
    mode: "GLOBAL_FRONT_OFFICE",
    entities: ["student", "parent", "visitor", "admission", "document", "receipt", "supportTicket", "class"],
    forbidden: ["mpesa", "invoice", "healthCase", "counsellingCase", "disciplineCase", "platformTenant", "systemJob"],
  },
  accountant: {
    mode: "GLOBAL_FINANCE",
    entities: ["student", "parent", "receipt", "invoice", "mpesa", "document", "staff", "supportTicket"],
    forbidden: ["healthCase", "counsellingCase", "disciplineCase", "platformTenant", "systemJob"],
  },
  teacher: {
    mode: "ROLE_SCOPED",
    entities: ["student", "parent", "class", "subject", "assignment", "exam", "document"],
    forbidden: ["receipt", "invoice", "mpesa", "healthCase", "counsellingCase", "disciplineCase", "platformTenant", "systemJob"],
  },
  "class-teacher": {
    mode: "ROLE_SCOPED",
    entities: ["student", "parent", "class", "assignment", "exam", "incident", "disciplineCase", "document"],
    forbidden: ["receipt", "invoice", "mpesa", "healthCase", "counsellingCase", "platformTenant", "systemJob"],
  },
  "grade-master": {
    mode: "ROLE_SCOPED",
    entities: ["student", "parent", "staff", "class", "subject", "exam", "assignment", "incident", "disciplineCase", "document"],
    forbidden: ["receipt", "invoice", "mpesa", "healthCase", "counsellingCase", "platformTenant", "systemJob"],
  },
  hod: {
    mode: "ROLE_SCOPED",
    entities: ["student", "staff", "class", "subject", "exam", "assignment", "document"],
    forbidden: ["receipt", "invoice", "mpesa", "healthCase", "counsellingCase", "disciplineCase", "platformTenant", "systemJob"],
  },
  "dean-academics": {
    mode: "ROLE_SCOPED",
    entities: ["student", "staff", "class", "subject", "exam", "assignment", "document"],
    forbidden: ["receipt", "invoice", "mpesa", "healthCase", "counsellingCase", "disciplineCase", "platformTenant", "systemJob"],
  },
  "exams-manager": {
    mode: "ROLE_SCOPED",
    entities: ["student", "staff", "class", "subject", "exam", "assignment", "document"],
    forbidden: ["receipt", "invoice", "mpesa", "healthCase", "counsellingCase", "disciplineCase", "platformTenant", "systemJob"],
  },
  nurse: {
    mode: "SENSITIVE_SCOPED",
    entities: ["student", "parent", "healthCase", "inventory", "document"],
    forbidden: ["receipt", "invoice", "mpesa", "counsellingCase", "disciplineCase", "platformTenant", "systemJob"],
  },
  "guidance-counselling": {
    mode: "SENSITIVE_SCOPED",
    entities: ["student", "parent", "counsellingCase", "incident", "document"],
    forbidden: ["receipt", "invoice", "mpesa", "healthCase", "platformTenant", "systemJob"],
  },
  "discipline-master": {
    mode: "SENSITIVE_SCOPED",
    entities: ["student", "parent", "incident", "disciplineCase", "document"],
    forbidden: ["receipt", "invoice", "mpesa", "healthCase", "counsellingCase", "platformTenant", "systemJob"],
  },
  librarian: {
    mode: "MODULE_SCOPED",
    entities: ["book", "student", "parent", "document"],
    forbidden: ["receipt", "invoice", "mpesa", "healthCase", "counsellingCase", "disciplineCase", "platformTenant", "systemJob"],
  },
  parent: {
    mode: "SELF_ONLY",
    entities: ["student", "receipt", "invoice", "exam", "assignment", "bus", "route", "document", "incident", "healthCase"],
    forbidden: ["staff", "platformTenant", "systemJob", "counsellingCase", "disciplineCase"],
  },
  student: {
    mode: "SELF_ONLY",
    entities: ["assignment", "exam", "book", "document", "student", "subject", "class"],
    forbidden: ["parent", "staff", "receipt", "invoice", "mpesa", "healthCase", "counsellingCase", "disciplineCase", "platformTenant", "systemJob"],
  },
  storekeeper: {
    mode: "MODULE_SCOPED",
    entities: ["inventory", "document", "supportTicket"],
    forbidden: ["student", "parent", "receipt", "invoice", "mpesa", "healthCase", "counsellingCase", "disciplineCase", "platformTenant", "systemJob"],
  },
  "boarding-master": {
    mode: "MODULE_SCOPED",
    entities: ["student", "parent", "incident", "document"],
    forbidden: ["receipt", "invoice", "mpesa", "healthCase", "counsellingCase", "platformTenant", "systemJob"],
  },
  "security-officer": {
    mode: "MODULE_SCOPED",
    entities: ["visitor", "student", "staff", "bus", "route", "incident", "document"],
    forbidden: ["receipt", "invoice", "mpesa", "healthCase", "counsellingCase", "platformTenant", "systemJob"],
  },
  "transport-manager": {
    mode: "MODULE_SCOPED",
    entities: ["student", "parent", "bus", "route", "staff", "incident", "document"],
    forbidden: ["receipt", "invoice", "mpesa", "healthCase", "counsellingCase", "platformTenant", "systemJob"],
  },
  "laboratory-technician": {
    mode: "MODULE_SCOPED",
    entities: ["class", "subject", "inventory", "document", "incident"],
    forbidden: ["student", "parent", "receipt", "invoice", "mpesa", "healthCase", "counsellingCase", "disciplineCase", "platformTenant", "systemJob"],
  },
  admissions: {
    mode: "MODULE_SCOPED",
    entities: ["admission", "student", "parent", "document", "supportTicket"],
    forbidden: ["receipt", "invoice", "mpesa", "healthCase", "counsellingCase", "disciplineCase", "platformTenant", "systemJob"],
  },
  superadmin: {
    mode: "PLATFORM",
    entities: ["platformTenant", "systemJob", "supportTicket", "document"],
    forbidden: ["student", "parent", "healthCase", "counsellingCase", "disciplineCase"],
  },
  "system-monitor": {
    mode: "PLATFORM_HEALTH",
    entities: ["systemJob", "supportTicket", "document", "platformTenant"],
    forbidden: ["student", "parent", "staff", "receipt", "invoice", "mpesa", "healthCase", "counsellingCase", "disciplineCase"],
  },
};

type RolePracticalityEnrichment = Partial<
  Pick<
    OperationalRoleBlueprint,
    "firstViewport" | "sidebar" | "primaryActions" | "workflows" | "communicationTriggers" | "printOutputs" | "dependencies"
  >
> & {
  tableColumns?: string[];
  tableRowActions?: string[];
  tableBulkActions?: string[];
  formFields?: string[];
  formFooterActions?: string[];
  queueActions?: string[];
};

type ModulePracticalityEnrichment = Partial<
  Pick<DocxAddedModuleContract, "uniqueSidebar" | "urgentActionStrip" | "rightDetailsDrawer" | "smsTriggers" | "printOutputs" | "permissionChecks">
> & {
  tableColumns?: string[];
  tableRowActions?: string[];
  tableBulkActions?: string[];
  formFields?: string[];
  formFooterActions?: string[];
};

const implementation1370UniversalRoleEnrichment: RolePracticalityEnrichment = {
  firstViewport: [
    "sidebar workspace",
    "daily task queue",
    "urgent alerts",
    "search action",
    "print/export action",
    "SMS trigger",
    "approval workflow",
    "audit trail",
    "report queue",
    "offline retry queue",
  ],
  primaryActions: ["Search", "Print", "Send SMS", "Submit Approval", "View Details", "Retry Sync"],
  workflows: ["Action captured -> Cross-dashboard update -> Audit logged -> Offline retry confirmed"],
  communicationTriggers: ["SMS trigger", "Cross-dashboard notification"],
  printOutputs: ["Operational report", "Print/export packet"],
  dependencies: ["search", "approval", "audit", "reports", "offline retry", "cross-dashboard updates"],
  tableColumns: ["Queue Status", "SLA Age", "Owner", "Audit State"],
  tableRowActions: ["Search", "Print", "Send SMS", "View Details", "Retry"],
  tableBulkActions: ["Print selected", "Export selected", "Send SMS to selected", "Approve selected"],
  formFields: ["Search reference", "SMS recipient", "Approval reason", "Print/export option", "Offline draft note"],
  formFooterActions: ["Print", "Submit for Approval", "Send SMS", "Retry Sync"],
  queueActions: ["Search", "Print", "Send SMS", "Approve", "View Details", "Retry Sync"],
};

const implementation1370RoleEnrichment: Record<DocxRoleId, RolePracticalityEnrichment> = {
  principal: {
    firstViewport: [
      "students present today",
      "teachers present",
      "visitors currently inside",
      "fees received today",
      "pending parent complaints",
      "sick-bay cases today",
      "discipline cases today",
      "boarding roll call status",
      "transport route status",
      "system health",
      "failed SMS",
      "M-Pesa callbacks",
    ],
    sidebar: ["Morning Operations", "School Health", "Board Reports", "System Health"],
    primaryActions: ["Open Morning Summary", "Approve Results", "Approve Budget", "Emergency Broadcast", "View System Health"],
    workflows: ["Morning operations -> Risk triage -> Owner assigned -> Principal decision -> Cross-dashboard update"],
    communicationTriggers: ["Emergency broadcast", "Parent confidence alert", "Staff accountability notice"],
    printOutputs: ["Morning operations report", "Board report", "System health report"],
    dependencies: ["boarding", "transport", "clinic", "security", "system monitor"],
    tableColumns: ["Students Present Today", "Teachers Present", "Fees Received Today", "Visitors Currently Inside"],
    formFields: ["Decision owner", "Escalation channel", "Board report section", "System health note"],
    queueActions: ["Assign Owner", "Emergency Broadcast", "Open System Health"],
  },
  "deputy-principal": {
    firstViewport: ["overview", "daily operations", "attendance", "discipline", "staff duty", "timetable"],
    sidebar: [
      "Overview",
      "Daily Operations",
      "Attendance & Punctuality",
      "Discipline & Behaviour",
      "Student Welfare",
      "Staff Duty & Supervision",
      "Timetable & Relief Lessons",
      "Academics Monitoring",
      "Teaching",
      "Exams & Marks",
      "Classes & Streams",
      "Approvals & Escalations",
      "Communication",
      "Reports & Downloads",
      "Staff & Roles",
      "Settings"
    ],
    primaryActions: ["Start Morning Review", "Assign Relief Teacher", "Create Discipline Case", "Generate Daily Summary", "Send Staff Notice"],
    workflows: ["Discipline escalation -> Deputy review -> Parent summons -> Resolution"],
    communicationTriggers: ["Parent summons", "Staff notice", "Timetable disruption"],
    printOutputs: ["Daily Summary", "Discipline Report", "Relief Timetable", "Attendance Slip"],
    dependencies: ["attendance", "discipline", "academics", "staff", "communication"],
    tableColumns: ["Student", "Class", "Type", "Status", "Assigned To"],
    formFields: ["Incident Category", "Severity", "Description", "Assigned Staff"],
    queueActions: ["Assign", "Escalate", "Mark Resolved"]
  },
  secretary: {
    firstViewport: ["parent phone", "fee balance preview", "document request queue", "visitor pass", "book appointment"],
    sidebar: ["Parent Walk-ins", "Fee Balance Preview", "Document Requests", "Appointments", "Visitor Pass Printing"],
    primaryActions: ["Quick Search Student", "Print Fee Statement", "Print Transfer Letter", "Book Appointment", "Escalate Issue"],
    workflows: ["Parent arrives -> Quick search -> Issue logged -> Document/appointment printed -> Department notified"],
    communicationTriggers: ["SMS parent from dashboard", "Appointment reminder", "Escalate issue notification"],
    printOutputs: ["Print fee statement", "Print admission letter", "Print transfer letter", "Visitor pass"],
    dependencies: ["finance", "admissions", "students", "visitors", "documents"],
    tableColumns: ["Parent Phone", "Fee Balance Preview", "Document Request Queue", "Escalation Department"],
    tableRowActions: ["Print Fee Statement", "Print Transfer Letter", "Book Appointment", "Escalate Issue"],
    formFields: ["Parent phone", "Walk-in reason", "Fee balance preview", "Appointment with", "Document requested"],
    queueActions: ["Print Visitor Pass", "Escalate Issue", "SMS Parent"],
  },
  accountant: {
    firstViewport: ["vote heads", "boarding fees", "transport fees", "lunch fees", "M-Pesa confirmation", "principal dashboard"],
    sidebar: ["Vote Heads", "Term Billing", "Boarding Fees", "Transport Fees", "Lunch Fees", "Bursaries", "Refunds"],
    primaryActions: ["Apply Bursary", "Record Partial Payments", "Record Overpayments", "Track Refund", "Confirm M-Pesa"],
    workflows: ["Payment captured -> Balance updated -> Receipt/SMS queued -> Principal dashboard refreshed"],
    communicationTriggers: ["Parent SMS receipt", "Fee reminder", "Principal dashboard update"],
    printOutputs: ["Daily collection report", "Class fee balance report", "Defaulters list"],
    dependencies: ["vote heads", "transport fees", "boarding fees", "lunch fees", "principal dashboard"],
    tableColumns: ["Vote Heads", "Boarding Fees", "Transport Fees", "Lunch Fees", "Bursary", "Refund"],
    tableRowActions: ["M-Pesa Confirmation", "Payment Reversal", "Track Refund", "Send Receipt SMS"],
    formFields: ["Bursary", "Partial payments", "Overpayments", "Refund reason", "M-Pesa confirmation"],
    queueActions: ["Confirm M-Pesa", "Approve Payment Reversal", "Update Principal Dashboard"],
  },
  teacher: {
    firstViewport: ["lesson attendance", "student concern", "assignment marking", "parent follow-up"],
    sidebar: ["Lesson Attendance", "Student Concerns", "Parent Follow-ups", "Marks Drafts"],
    primaryActions: ["Create Discipline Referral", "Notify Class Teacher", "Print Lesson Attendance"],
    dependencies: ["class teacher", "parent", "discipline", "academics"],
  },
  "dean-academics": {
    firstViewport: ["report card", "missing marks", "subject performance", "teacher performance", "principal academic overview"],
    sidebar: ["Teacher Submission Tracker", "Subject Performance", "Principal Academic Overview"],
    primaryActions: ["Open Missing Marks", "Review Subject Performance", "Send Principal Academic Overview"],
    workflows: ["Report card review -> Dean decision -> Principal academic overview -> Publishing gate"],
    communicationTriggers: ["Missing marks alert", "Principal academic overview ready"],
    printOutputs: ["Subject performance report", "Teacher performance report", "Principal academic overview"],
    dependencies: ["report cards", "teacher performance", "subject performance", "principal queue"],
  },
  "exams-manager": {
    firstViewport: [
      "subject setup",
      "class/grade setup",
      "stream setup",
      "teacher-subject allocation",
      "bulk marks upload",
      "grade calculation",
      "report card generation",
      "missing marks alert",
      "print report cards",
    ],
    sidebar: ["Subject Setup", "Class/Grade Setup", "Stream Setup", "Teacher-Subject Allocation", "Bulk Marks Upload"],
    primaryActions: ["Setup Subject", "Setup Class/Grade", "Setup Stream", "Allocate Teacher-Subject", "Bulk Marks Upload", "Print Report Cards"],
    workflows: ["Setup -> Marks upload -> Grade calculation -> Report card generation -> Missing marks alert -> Dean review"],
    printOutputs: ["Print report cards", "Subject performance analysis", "Class performance analysis"],
    dependencies: ["subject setup", "stream setup", "teacher-subject allocation", "report cards"],
  },
  hod: {
    firstViewport: ["teacher effectiveness", "department resource requests", "syllabus risk", "weak topics"],
    sidebar: ["Teacher Effectiveness", "Weak Topics", "Department Resources", "Action Items"],
    primaryActions: ["Assign Remediation", "Request Resources", "Escalate Coverage Risk"],
    dependencies: ["teachers", "subjects", "resources", "exams"],
  },
  "class-teacher": {
    firstViewport: ["parent dependency", "student attendance", "discipline status", "fee concern routing"],
    sidebar: ["Daily Class Queue", "Parent Dependency", "Student Follow-up", "Letters"],
    primaryActions: ["Create Parent Meeting", "Print Class Letter", "Route Fee Concern"],
    dependencies: ["students", "parents", "attendance", "discipline", "fees"],
  },
  "grade-master": {
    firstViewport: ["stream bottlenecks", "class teacher follow-ups", "parent escalations", "intervention tracker"],
    sidebar: ["Intervention Tracker", "Class Teacher Follow-ups", "Parent Escalations", "Stream Bottlenecks"],
    primaryActions: ["Assign Intervention Owner", "Print Stream Intervention Sheet"],
    dependencies: ["streams", "teachers", "parents", "welfare"],
  },
  nurse: {
    firstViewport: ["symptoms", "temperature", "vitals", "medicine given", "quantity dispensed", "expired medicine"],
    sidebar: ["Vitals", "Medicine Stock", "Expired Medicine", "Supplier Batches", "Parent Notifications"],
    primaryActions: ["Record Vitals", "Auto-deduct Medicine", "Notify Class Teacher", "Notify Boarding Master", "Load Medicine Stock"],
    workflows: ["Sick-bay visit -> Symptoms/vitals captured -> Medicine given -> Stock auto-deduct -> Parent/class teacher notified"],
    communicationTriggers: ["Notify class teacher", "Notify boarding master", "Parent SMS health notice"],
    printOutputs: ["Medical slip", "Medical referral slip", "Medicine stock report"],
    dependencies: ["medicine inventory", "parents", "class teacher", "boarding master"],
    tableColumns: ["Symptoms", "Temperature", "Vitals", "Medicine Given", "Quantity Dispensed", "Expiry"],
    formFields: ["Symptoms", "Temperature", "Vitals", "Medicine given", "Quantity dispensed", "Supplier", "Batch", "Expiry"],
    queueActions: ["Auto-deduct Stock", "Notify Class Teacher", "Notify Boarding Master"],
  },
  "guidance-counselling": {
    firstViewport: ["confidential intervention", "counsellor referral", "parent meeting", "repeat welfare risk"],
    sidebar: ["Counsellor Referrals", "Parent Meetings", "Welfare Timeline", "Risk Follow-up"],
    primaryActions: ["Book Counselling Session", "Create Welfare Plan", "Escalate Safely"],
    dependencies: ["welfare", "parents", "discipline", "clinic"],
  },
  "discipline-master": {
    firstViewport: [
      "teacher creates case",
      "class teacher reviews",
      "parent is notified",
      "deputy principal approves",
      "counsellor referral",
      "boarding master notified",
      "security notified",
      "attach evidence",
      "repeat cases",
    ],
    sidebar: ["Case Intake", "Class Teacher Review", "Deputy Approval", "Counsellor Referrals", "Evidence"],
    primaryActions: ["Teacher Creates Case", "Class Teacher Reviews", "Notify Parent", "Request Deputy Principal Approves", "Attach Evidence"],
    workflows: ["Teacher creates case -> Class teacher reviews -> Parent is notified -> Deputy principal approves -> Counsellor/boarding/security notified"],
    communicationTriggers: ["Parent is notified", "Boarding master notified", "Security notified", "Counsellor referral"],
    printOutputs: ["Discipline letter", "Evidence packet", "Repeat cases report"],
    dependencies: ["teacher", "class teacher", "parent", "deputy principal", "counsellor", "boarding master", "security"],
  },
  librarian: {
    firstViewport: ["barcode scanner", "bulk upload", "generate barcode labels", "scan student ID", "book stock count"],
    sidebar: ["Barcode Scanner", "Bulk Upload", "Barcode Labels", "Book Stock Count", "Lost/Damaged Books"],
    primaryActions: ["Add Book by Barcode Scanner", "Bulk Upload Books", "Generate Barcode Labels", "Scan Student ID", "Scan Book to Return"],
    workflows: ["Scan student ID -> Scan book barcode -> Confirm issue -> Print/SMS issue record"],
    communicationTriggers: ["Overdue SMS", "Fine SMS", "Lost book SMS"],
    printOutputs: ["Library issue slips", "Library return slips", "Barcode labels", "Book stock count"],
    dependencies: ["barcode scanner", "students", "parents", "printing", "communication"],
    tableColumns: ["Barcode Scanner", "Damaged Book", "Lost Book", "Book Stock Count"],
    tableRowActions: ["Scan Book to Return", "Mark Damaged Book", "Mark Lost Book", "Send Overdue SMS"],
    formFields: ["Barcode scanner", "Scan student ID", "Book barcode", "Damaged book note", "Lost book reason"],
  },
  parent: {
    firstViewport: ["fee statement", "receipts", "student attendance", "academic reports", "medical alerts", "library borrowed books"],
    sidebar: ["Receipts", "Student Attendance", "Academic Reports", "Medical Alerts", "Library Borrowed Books", "Transport Route", "Boarding Status", "Downloads/Letters"],
    primaryActions: ["Download Receipts", "View Library Borrowed Books", "Download Letters"],
    printOutputs: ["Receipts", "Downloads/letters", "Academic reports"],
    dependencies: ["finance", "attendance", "academics", "medical alerts", "library", "transport route", "boarding status"],
  },
  student: {
    firstViewport: ["timetable", "assignments", "exam results", "library books borrowed", "discipline status", "club"],
    sidebar: ["Exam Results", "Library Books Borrowed", "Discipline Status", "Clubs", "Teacher Messages", "Academic Progress"],
    primaryActions: ["View Exam Results", "Open Teacher Messages", "Track Academic Progress"],
    communicationTriggers: ["Teacher messages", "Club notice"],
    printOutputs: ["Academic progress report"],
    dependencies: ["timetable", "assignments", "library books borrowed", "discipline status", "teacher messages"],
  },
  storekeeper: {
    firstViewport: ["consumable", "asset", "supplier", "unit cost", "high-value", "stock movement", "stock take"],
    sidebar: ["Consumables", "Assets", "High-value Approvals", "Stock Take", "Movement History"],
    primaryActions: ["Add Consumable", "Add Asset", "Record Supplier", "Issue High-value Item", "Run Stock Take"],
    workflows: ["Stock received -> Movement recorded -> High-value approval if needed -> Issue slip printed -> Audit updated"],
    printOutputs: ["Stock issue slips", "Stock report", "Movement history"],
    dependencies: ["supplier", "procurement", "departments", "assets", "audit"],
    tableColumns: ["Consumable", "Asset", "Supplier", "Unit Cost", "Stock Movement"],
    formFields: ["Consumable/asset", "Supplier", "Unit cost", "High-value approval", "Stock take count", "Chalk", "Toners", "Mattresses", "Sports equipment"],
    queueActions: ["Approve High-value Issue", "Print Issue Slip", "Open Movement History"],
  },
  "boarding-master": {
    firstViewport: ["dormitory setup", "bed allocation", "morning roll call", "evening roll call", "exeat", "sick referral"],
    sidebar: ["Dormitory Setup", "Bed Allocation", "Morning Roll Call", "Evening Roll Call", "Exeats", "Dorm Supplies"],
    primaryActions: ["Setup Dormitory", "Allocate Bed", "Mark Morning Roll Call", "Mark Evening Roll Call", "Create Exeat"],
    workflows: ["Roll call -> Missing student alert -> Deputy/security/class teacher/parent notified -> Resolution logged"],
    communicationTriggers: ["Parent SMS", "Sick referral", "Discipline referral", "Missing student alert"],
    printOutputs: ["Hostel roll call", "Exeat pass", "Dorm supplies request"],
    dependencies: ["dormitory setup", "bed allocation", "nurse", "discipline", "security", "parents"],
    tableColumns: ["Dormitory Setup", "Bed Allocation", "Mattress Asset", "Dorm Supplies"],
    formFields: ["Dormitory setup", "Bed allocation", "Exeat", "Sick referral", "Discipline referral", "Dorm supplies", "Mattress asset"],
  },
  "security-officer": {
    firstViewport: ["returning visitor", "ID/passport", "vehicle number", "currently inside", "blocklisted visitor"],
    sidebar: ["Returning Visitors", "Currently Inside", "Overstayed Visitors", "Blocklisted Visitors", "Emergency Visitor List"],
    primaryActions: ["Search Returning Visitor", "Mark Visitor Exited", "Print Visitor Slip", "Open Emergency Visitor List"],
    workflows: ["Returning visitor search -> ID/passport verified -> Visitor slip printed -> Currently inside board -> Mark visitor exited"],
    communicationTriggers: ["Notify office or staff", "Blocklisted visitor alert", "Emergency visitor list"],
    printOutputs: ["Visitor slip", "Emergency visitor list"],
    dependencies: ["visitors", "staff", "students", "security alerts"],
    tableColumns: ["Returning Visitor", "ID/Passport", "Vehicle Number", "Currently Inside", "Overstayed Visitors"],
    tableRowActions: ["Mark Visitor Exited", "Flag Blocklisted Visitor", "Notify Office"],
    formFields: ["Returning visitor phone/ID", "ID/passport", "Vehicle number", "Reason for visit", "Host notified"],
  },
  "transport-manager": {
    firstViewport: ["routes", "vehicles", "drivers", "student route assignment", "fuel", "maintenance", "transport fees"],
    sidebar: ["Trip Attendance", "Fuel", "Maintenance", "Transport Fees", "Parent Alerts"],
    primaryActions: ["Assign Student Route", "Record Trip Attendance", "Log Fuel", "Send Parent Alert"],
    printOutputs: ["Transport route lists", "Trip attendance report"],
    dependencies: ["vehicles", "routes", "drivers", "parents", "finance"],
  },
  "laboratory-technician": {
    firstViewport: ["practical requests", "chemicals", "apparatus", "breakages", "hazard warnings"],
    sidebar: ["Practical Requests", "Chemicals", "Apparatus", "Issue/Return", "Hazard Warnings"],
    primaryActions: ["Approve Practical Request", "Issue Apparatus", "Return Apparatus", "Record Hazard Warning"],
    printOutputs: ["Lab asset report", "Hazard warning report"],
    dependencies: ["chemicals", "apparatus", "safety", "inventory"],
  },
  admissions: {
    firstViewport: ["inquiry registration", "document upload", "interview", "fee structure assignment", "class/stream assignment"],
    sidebar: ["Inquiry Registration", "Document Upload", "Interview Status", "Fee Assignment", "Parent Onboarding"],
    primaryActions: ["Register Inquiry", "Upload Documents", "Record Interview", "Assign Fee Structure", "Create Parent Account"],
    workflows: ["Inquiry registration -> Application -> Document upload -> Interview -> Admission number -> First invoice -> Parent SMS onboarding"],
    communicationTriggers: ["Parent SMS onboarding", "Document verification SMS"],
    printOutputs: ["Admission letter", "First invoice", "Document checklist"],
    dependencies: ["fee structure assignment", "class/stream assignment", "parent account creation", "student profile"],
    tableColumns: ["Admission Number", "Parent Account Creation", "First Invoice"],
    formFields: ["Inquiry registration", "Document upload", "Interview", "Fee structure assignment", "Class/stream assignment", "Parent account creation", "Admission number", "First invoice", "Parent SMS onboarding"],
  },
  superadmin: {
    firstViewport: ["academic years", "terms", "classes/grades/forms", "streams", "subjects", "departments", "roles", "permissions"],
    sidebar: ["Academic Years", "Terms", "Classes/Grades/Forms", "Streams", "Subjects", "Departments", "Roles", "Permissions", "Backups"],
    primaryActions: ["Configure SMS Provider", "Configure SMS Templates", "Configure M-Pesa Settings", "Configure Receipt Settings", "Configure Report Card Templates"],
    printOutputs: ["Backup settings report", "School settings report"],
    dependencies: ["SMS provider", "SMS templates", "M-Pesa settings", "receipt settings", "report card templates", "backup settings"],
  },
  "system-monitor": {
    firstViewport: ["server status", "database status", "failed background jobs", "failed SMS", "failed M-Pesa callbacks", "failed report generation"],
    sidebar: ["Server Status", "Database Status", "Failed Background Jobs", "Failed SMS", "Failed M-Pesa Callbacks", "Offline Devices", "API Health"],
    primaryActions: ["Retry Failed SMS", "Replay M-Pesa Callback", "Retry Failed Report Generation", "Open API Health"],
    workflows: ["Failure detected -> Retry/replay -> Sync status verified -> Error logs/audit updated"],
    printOutputs: ["API health report", "Backup status report", "Error logs export"],
    dependencies: ["backup status", "offline devices", "sync status", "error logs", "API health"],
    tableColumns: ["Server Status", "Database Status", "Failed Background Jobs", "Backup Status", "Offline Devices", "Sync Status", "API Health"],
  },
};

const implementation1370UniversalModuleEnrichment: ModulePracticalityEnrichment = {
  uniqueSidebar: ["Approval Workflow", "SMS Triggers", "Retry Queue"],
  urgentActionStrip: ["Print", "Send SMS", "Submit Approval", "Retry Sync"],
  rightDetailsDrawer: ["approval workflow", "SMS delivery", "retry status", "audit trail"],
  smsTriggers: ["SMS trigger"],
  printOutputs: ["Print/export packet"],
  permissionChecks: ["approval", "audit", "retry"],
  tableRowActions: ["Print", "Send SMS", "Submit Approval", "Retry"],
  tableBulkActions: ["Print selected", "Send SMS to selected", "Submit selected for approval"],
  formFields: ["SMS recipient", "Approval reason", "Retry note"],
  formFooterActions: ["Print", "Send SMS", "Submit for Approval", "Retry Sync"],
};

const implementation1370ModuleEnrichment: Partial<Record<DocxAddedModuleId, ModulePracticalityEnrichment>> = {
  "ict-assets": {
    uniqueSidebar: ["Computers", "Laptops", "Projectors", "Printers", "Routers", "Software Licenses", "Lab Bookings"],
    urgentActionStrip: ["Register Computers", "Register Laptops", "Track Internet Issues", "Request Replacement Parts"],
    tableColumns: ["Computers", "Laptops", "Projectors", "Printers", "Routers", "Software Licenses", "Assigned Devices", "Internet Issues"],
    tableRowActions: ["Request Replacement Parts", "Track Assigned Devices", "Open Lab Bookings"],
    formFields: ["Computers", "Laptops", "Projectors", "Printers", "Routers", "Software licenses", "Lab bookings", "Assigned devices", "Internet issues", "Request replacement parts"],
    rightDetailsDrawer: ["computers", "laptops", "projectors", "printers", "routers", "software licenses", "lab bookings", "assigned devices", "internet issues"],
  },
  "document-printing": {
    uniqueSidebar: ["Fee Receipts", "Fee Statements", "Admission Letters", "Report Cards", "Visitor Slips", "Library Slips"],
    urgentActionStrip: ["Print Fee Receipts", "Print Report Cards", "Print Visitor Slips", "Print Medical Referral Slips"],
    tableColumns: ["Fee Receipts", "Fee Statements", "Admission Letters", "Report Cards", "Visitor Slips", "Stock Issue Slips"],
    formFields: ["Fee receipts", "Fee statements", "Admission letters", "Report cards", "Visitor slips", "Library issue slips", "Library return slips", "Stock issue slips", "Asset movement slips", "Hostel roll call", "Transport route lists", "Discipline letters", "Medical referral slips", "Board reports"],
    printOutputs: [
      "Fee receipts",
      "Fee statements",
      "Admission letters",
      "Report cards",
      "Visitor slips",
      "Library issue slips",
      "Library return slips",
      "Stock issue slips",
      "Asset movement slips",
      "Hostel roll call",
      "Transport route lists",
      "Discipline letters",
      "Medical referral slips",
      "Board reports",
    ],
  },
};

function mergeUniqueStrings(...groups: Array<readonly string[] | undefined>): string[] {
  return Array.from(new Set(groups.flatMap((group) => group ?? []).filter(Boolean)));
}

function enrichTables(tables: OperationalTableContract[], enrichment: RolePracticalityEnrichment | ModulePracticalityEnrichment): OperationalTableContract[] {
  return tables.map((item) => ({
    ...item,
    columns: mergeUniqueStrings(item.columns, enrichment.tableColumns),
    rowActions: mergeUniqueStrings(item.rowActions, enrichment.tableRowActions),
    bulkActions: mergeUniqueStrings(item.bulkActions, enrichment.tableBulkActions),
  }));
}

function enrichForms(forms: OperationalFormContract[], enrichment: RolePracticalityEnrichment | ModulePracticalityEnrichment): OperationalFormContract[] {
  return forms.map((item) => ({
    ...item,
    fields: mergeUniqueStrings(item.fields, enrichment.formFields),
    footerActions: mergeUniqueStrings(item.footerActions, enrichment.formFooterActions),
  }));
}

function enrichQueues(queues: OperationalRoleQueueContract[], enrichment: RolePracticalityEnrichment): OperationalRoleQueueContract[] {
  return queues.map((item) => ({
    ...item,
    actions: mergeUniqueStrings(item.actions, enrichment.queueActions),
  }));
}

export function table(title: string, columns: string[], rowActions: string[], bulkActions: string[]): OperationalTableContract {
  return { title, columns, rowActions, bulkActions };
}

export function form(title: string, fields: string[], extraFooterActions: string[] = []): OperationalFormContract {
  return {
    title,
    fields,
    footerActions: ["Cancel", "Save Draft", "Submit", ...extraFooterActions],
  };
}

function roleQueue(
  title: string,
  owner: string,
  workflow: string,
  actions: string[],
  auditEvent: string,
  priority: "High" | "Medium" | "Low" = "High",
): OperationalRoleQueueContract {
  return {
    title,
    owner,
    priority,
    workflow,
    actions: [...new Set([...actions, "View Details"])],
    auditEvent,
    sla: priority === "High" ? "Due today" : "Due this week",
  };
}

function buildDefaultRoleQueue(input: Pick<OperationalRoleBlueprint, "id" | "primaryActions" | "workflows">): OperationalRoleQueueContract {
  const workflow = input.workflows.find((item) => item.includes("->")) ?? "Draft -> Submitted -> Under Review -> Approved -> Archived";
  const auditEvent = `${input.id.replace(/-/g, "_").toUpperCase()}_WORKFLOW_ACTIONED`;

  return roleQueue(
    "Primary operational queue",
    input.id
      .split("-")
      .map((part) => part[0]?.toUpperCase() + part.slice(1))
      .join(" "),
    workflow,
    input.primaryActions.slice(0, 5),
    auditEvent,
  );
}

function roleBlueprint(
  input: Omit<
    OperationalRoleBlueprint,
    "searchMode" | "searchEntities" | "forbiddenEntities" | "queues" | "states" | "mobileBehavior" | "lowBandwidthBehavior"
  > &
    Partial<
      Pick<
        OperationalRoleBlueprint,
        "searchMode" | "searchEntities" | "forbiddenEntities" | "queues" | "states" | "mobileBehavior" | "lowBandwidthBehavior"
      >
    >,
): OperationalRoleBlueprint {
  const searchProfile = roleSearchProfiles[input.id];
  const rolePracticality = implementation1370RoleEnrichment[input.id];
  const firstViewport = mergeUniqueStrings(
    input.firstViewport,
    implementation1370UniversalRoleEnrichment.firstViewport,
    rolePracticality.firstViewport,
  );
  const sidebar = mergeUniqueStrings(input.sidebar, rolePracticality.sidebar);
  const primaryActions = mergeUniqueStrings(
    input.primaryActions,
    implementation1370UniversalRoleEnrichment.primaryActions,
    rolePracticality.primaryActions,
  );
  const workflows = mergeUniqueStrings(input.workflows, implementation1370UniversalRoleEnrichment.workflows, rolePracticality.workflows);
  const communicationTriggers = mergeUniqueStrings(
    input.communicationTriggers,
    implementation1370UniversalRoleEnrichment.communicationTriggers,
    rolePracticality.communicationTriggers,
  );
  const printOutputs = mergeUniqueStrings(input.printOutputs, implementation1370UniversalRoleEnrichment.printOutputs, rolePracticality.printOutputs);
  const dependencies = mergeUniqueStrings(input.dependencies, implementation1370UniversalRoleEnrichment.dependencies, rolePracticality.dependencies);
  const tables = enrichTables(enrichTables(input.tables, implementation1370UniversalRoleEnrichment), rolePracticality);
  const forms = enrichForms(enrichForms(input.forms, implementation1370UniversalRoleEnrichment), rolePracticality);
  const queues = enrichQueues(
    enrichQueues(input.queues ?? [buildDefaultRoleQueue({ id: input.id, primaryActions, workflows })], implementation1370UniversalRoleEnrichment),
    rolePracticality,
  );
  const actionFirstViewport = /pending|urgent|missing|failed|unresolved|alerts|approvals|follow|exceptions|queue|action|review|requests|overdue|risk/i.test(
    firstViewport.join(" "),
  )
    ? firstViewport
    : [...firstViewport, "urgent action queue"];

  return {
    ...input,
    firstViewport: actionFirstViewport,
    sidebar,
    primaryActions,
    tables,
    forms,
    workflows,
    communicationTriggers,
    printOutputs,
    dependencies,
    searchMode: input.searchMode ?? searchProfile?.mode ?? "ROLE_SCOPED",
    searchEntities: input.searchEntities ?? searchProfile?.entities ?? defaultSearchEntities,
    forbiddenEntities: input.forbiddenEntities ?? searchProfile?.forbidden ?? defaultForbiddenEntities,
    queues,
    states: input.states ?? [...defaultStates],
    mobileBehavior: input.mobileBehavior ?? [...defaultMobileBehavior],
    lowBandwidthBehavior: input.lowBandwidthBehavior ?? [...defaultLowBandwidthBehavior],
  };
}

export function moduleContract(input: Omit<DocxAddedModuleContract, "auditTrail" | "states" | "mobileBehavior" | "lowBandwidthBehavior"> & Partial<Pick<DocxAddedModuleContract, "mobileBehavior" | "lowBandwidthBehavior">>): DocxAddedModuleContract {
  const modulePracticality = implementation1370ModuleEnrichment[input.id] ?? {};
  const mainTable = enrichTables(enrichTables([input.mainTable], implementation1370UniversalModuleEnrichment), modulePracticality)[0] ?? input.mainTable;

  return {
    ...input,
    uniqueSidebar: mergeUniqueStrings(input.uniqueSidebar, implementation1370UniversalModuleEnrichment.uniqueSidebar, modulePracticality.uniqueSidebar),
    urgentActionStrip: mergeUniqueStrings(input.urgentActionStrip, implementation1370UniversalModuleEnrichment.urgentActionStrip, modulePracticality.urgentActionStrip),
    mainTable,
    forms: enrichForms(enrichForms(input.forms, implementation1370UniversalModuleEnrichment), modulePracticality),
    rightDetailsDrawer: mergeUniqueStrings(input.rightDetailsDrawer, implementation1370UniversalModuleEnrichment.rightDetailsDrawer, modulePracticality.rightDetailsDrawer),
    approvalWorkflow: `${input.approvalWorkflow} | approval workflow`,
    smsTriggers: mergeUniqueStrings(input.smsTriggers, implementation1370UniversalModuleEnrichment.smsTriggers, modulePracticality.smsTriggers),
    printOutputs: mergeUniqueStrings(input.printOutputs, implementation1370UniversalModuleEnrichment.printOutputs, modulePracticality.printOutputs),
    auditTrail: [...defaultAuditTrail],
    permissionChecks: mergeUniqueStrings(input.permissionChecks, implementation1370UniversalModuleEnrichment.permissionChecks, modulePracticality.permissionChecks),
    states: [...defaultStates],
    mobileBehavior: input.mobileBehavior ?? ["collapse sidebar into drawer", "stack urgent actions", "keep row actions reachable"],
    lowBandwidthBehavior: input.lowBandwidthBehavior ?? ["show cached queue", "allow save draft", "retry sync visibly"],
  };
}

export const MYSHULE_OPERATIONAL_ROLE_IDS: DocxRoleId[] = [
  "principal",
  "deputy-principal",
  "secretary",
  "accountant",
  "teacher",
  "dean-academics",
  "exams-manager",
  "hod",
  "class-teacher",
  "grade-master",
  "nurse",
  "guidance-counselling",
  "discipline-master",
  "librarian",
  "parent",
  "student",
  "storekeeper",
  "boarding-master",
  "security-officer",
  "transport-manager",
  "laboratory-technician",
  "admissions",
  "superadmin",
  "system-monitor",
];

const roleBlueprints: OperationalRoleBlueprint[] = [
  roleBlueprint({
    id: "principal",
    identity: "Institution-wide command center for leadership risk, approvals, escalations, academic quality, and finance exceptions.",
    firstViewport: ["pending approvals", "serious discipline escalations", "missing marks before deadline", "low attendance classes", "high fee arrears", "parent complaints"],
    sidebar: [
      "Command Center",
      "Morning Operations",
      "Approvals",
      "Escalations",
      "Academic Oversight",
      "Finance Oversight",
      "Attendance Oversight",
      "Student Welfare",
      "Staff Accountability",
      "Users & Invitations",
      "Parent Confidence",
      "Communication",
      "Transport",
      "Inventory & Assets",
      "Compliance",
      "Audit Logs",
      "School Health",
    ],
    primaryActions: ["Approve", "Reject", "Return for Correction", "Escalate", "Assign to Deputy", "Generate Board Report"],
    tables: [table("Approval Table", ["Request Type", "Requested By", "Affected Person", "Priority", "Due Date", "Actions"], ["View", "Approve", "Reject", "Return", "Escalate", "View Audit"], ["Approve selected", "Assign selected"])],
    forms: [form("Approval Modal", ["Decision", "Comment", "Effective date", "Notify requester", "Notify affected parent/staff"], ["Submit Decision"])],
    workflows: ["Approval workflow", "Escalation workflow", "School notice approval", "Academic report approval", "Finance exception approval"],
    communicationTriggers: ["Send School Notice", "Notify requester", "Notify parent/staff"],
    printOutputs: ["Board report", "Leadership summary", "Approval register"],
    dependencies: ["academics", "finance", "discipline", "attendance", "staff", "communication", "audit"],
  }),
  roleBlueprint({
    id: "deputy-principal",
    identity: "Daily school operations tracker for attendance, staff coordination, timetable conflicts, incidents, and duty roster gaps.",
    firstViewport: ["missing attendance", "absent teachers", "timetable conflicts", "unresolved incidents", "student movement issues", "duty roster gaps"],
    sidebar: ["Daily Operations", "Attendance Escalations", "Staff Coordination", "Timetable Conflicts", "Duty Roster", "Incident Routing", "Users & Invitations"],
    primaryActions: ["Assign", "Reassign", "Resolve", "Escalate", "Add Note", "Notify Staff"],
    tables: [table("Daily Operations Table", ["Issue Type", "Affected Class", "Assigned Person", "Priority", "Status", "Action Required"], ["Assign", "Reassign", "Resolve", "Escalate"], ["Assign selected", "Export"])],
    forms: [form("Timetable Conflict Resolution Form", ["Affected class", "Subject", "Teacher", "Conflict type", "Substitute teacher", "Resolution note"], ["Notify Staff"])],
    workflows: ["Issue reported -> Assigned -> Resolved -> Archived", "Conflict detected -> Resolved -> Notified -> Closed"],
    communicationTriggers: ["Notify Teacher", "Notify Class Teacher", "Notify Class"],
    printOutputs: ["Daily operations report", "Duty roster", "Coverage report"],
    dependencies: ["attendance", "timetable", "discipline", "staff", "communication"],
  }),
  roleBlueprint({
    id: "secretary",
    identity: "Front-office engine for visitors, student records, parent records, admissions support, letters, calls, and printing.",
    firstViewport: ["visitors signed in", "record updates", "document requests", "admission inquiries", "parent messages", "calls to return"],
    sidebar: ["Front Office", "Student Records", "Parent Records", "Admissions Support", "Visitor Log", "Letters & Documents", "Printing Center"],
    primaryActions: ["Add Student", "Update Student Record", "Record Visitor", "Print Letter", "Send SMS", "Schedule Appointment"],
    tables: [table("Student Records Table", ["Admission No", "Student", "Class", "Stream", "Parent Phone", "Status"], ["View Profile", "Edit", "Print Profile", "Send Parent SMS"], ["Print selected", "Send SMS"])],
    forms: [form("Student Record Form", ["Admission number", "First name", "Surname", "Gender", "Date of birth", "Class", "Stream", "Parent phone"], ["Save Student", "Preview Profile"])],
    workflows: ["Record draft -> Saved -> Printed -> Parent notified", "Visitor check-in -> Slip printed -> Checked out -> Archived"],
    communicationTriggers: ["Send Parent SMS", "Return parent call", "Appointment reminder"],
    printOutputs: ["Admission letter", "Student profile", "Visitor slip", "Parent contact list"],
    dependencies: ["students", "admissions", "documents", "visitors", "communication"],
  }),
  roleBlueprint({
    id: "accountant",
    identity: "Financial control room for payments, M-Pesa reconciliation, arrears, waivers, receipts, reversals, and fee reminders.",
    firstViewport: ["today's payments", "unreconciled M-Pesa", "failed callbacks", "high balances", "waiver requests", "duplicate warnings"],
    sidebar: ["Finance Command Center", "Fee Structures", "Invoices", "Payments", "M-Pesa Reconciliation", "Receipts", "Waivers", "Reports"],
    primaryActions: ["Record Payment", "Generate Invoice", "Print Receipt", "Send Fee Reminder", "Reconcile Payment", "Reverse Payment"],
    tables: [table("Payments Table", ["Receipt No", "Student", "Admission No", "Class", "Amount", "Method", "Status"], ["View Receipt", "Print Receipt", "Send Receipt SMS", "Reverse Payment", "View Audit"], ["Print selected", "Export selected"])],
    forms: [form("Payment Form", ["Student selector", "Amount paid", "Payment method", "Transaction code", "Term", "Year", "Vote head", "Notes"], ["Save Payment", "Preview Receipt", "Send Parent SMS"])],
    workflows: ["Payment captured -> Reconciled -> Receipt printed -> Parent notified", "Waiver requested -> Approved -> Applied -> Archived"],
    communicationTriggers: ["Send fee reminder", "Send receipt SMS", "Notify waiver decision"],
    printOutputs: ["Fee receipt", "Fee statement", "Daily collection summary", "Waiver approval letter"],
    dependencies: ["students", "fees", "mpesa", "communication", "reports", "audit"],
  }),
  roleBlueprint({
    id: "teacher",
    identity: "Daily teaching execution workspace for lessons, attendance, assignments, marks, student concerns, and parent follow-up.",
    firstViewport: ["today's lessons", "attendance not submitted", "assignments to mark", "marks deadlines", "students needing attention", "HOD messages"],
    sidebar: ["Teaching Queue", "My Classes", "Attendance", "Lessons", "Assignments", "Marks Entry", "Student Notes", "Parent Communication"],
    primaryActions: ["Mark Attendance", "Start Lesson", "Add Lesson Note", "Create Assignment", "Enter Marks", "Report Student Concern"],
    tables: [table("Teaching Queue", ["Lesson", "Class", "Time", "Status", "Action"], ["Start Lesson", "Mark Attendance", "Add Note", "Submit Marks"], ["Mark selected present", "Export"])],
    forms: [form("Attendance Form", ["Class", "Stream", "Date", "Session", "Student attendance table", "Absent reason"], ["Submit Attendance"])],
    workflows: ["Lesson scheduled -> Started -> Attendance submitted -> Notes saved", "Marks draft -> Submitted -> HOD review"],
    communicationTriggers: ["Message Parent", "Notify HOD", "Assignment reminder"],
    printOutputs: ["Class list", "Assignment list", "Marks entry sheet"],
    dependencies: ["classes", "attendance", "assignments", "exams", "communication"],
  }),
  roleBlueprint({
    id: "dean-academics",
    identity: "Academic quality firewall for exam moderation, grading integrity, curriculum compliance, and report-card approval.",
    firstViewport: ["pending exam reviews", "report card batches", "grading anomalies", "late teacher submissions", "curriculum gaps"],
    sidebar: ["Overview", "Pending Reviews", "Exam Moderation", "Report Card Approval", "Grading Integrity Checks", "Curriculum Compliance"],
    primaryActions: ["Open Review", "Approve Batch", "Reject Batch", "Return for Correction", "Request Reprocessing"],
    tables: [table("Pending Exam Reviews", ["Exam", "Class", "Completion", "Missing Marks", "Teacher Status", "Actions"], ["Open Review", "Approve", "Reject", "Return"], ["Approve batch", "Return batch"])],
    forms: [form("Dean Decision Form", ["Decision", "Reason code", "Comments", "Notify exams office", "Attachment"], ["Submit Decision"])],
    workflows: ["Exams Office -> Dean Review -> Principal Approval -> Publishing"],
    communicationTriggers: ["Notify Exams Office", "Notify HOD", "Notify Principal queue"],
    printOutputs: ["Moderation report", "Report card approval summary", "Integrity scan"],
    dependencies: ["exams", "academics", "staff", "audit"],
  }),
  roleBlueprint({
    id: "exams-manager",
    identity: "Academic data production engine for exam setup, marks entry, grade processing, validation, and draft report cards.",
    firstViewport: ["active exams", "pending marks", "validation errors", "teacher submission delays", "draft report cards"],
    sidebar: [
      "Overview",
      "Exam Builder",
      "Timetable Scheduler",
      "Marks Entry Hub",
      "Grade Processing",
      "Report Card Drafts",
      "Submission Tracker",
      "Data Validation",
      "Export Center",
      "Archive",
    ],
    primaryActions: ["Create Exam", "Schedule Timetable", "Upload Marks", "Process Grades", "Generate Drafts", "Send to Dean"],
    tables: [table("Submission Tracker", ["Teacher", "Subject", "Class", "Submitted", "Late", "Actions"], ["Open", "Remind", "Validate", "Export"], ["Send reminders", "Export"])],
    forms: [form("Exam Builder", ["Exam type", "Class", "Subjects", "Weighting rules", "Term", "Year"], ["Create Exam"])],
    workflows: ["Exam creation -> Marks entry -> Grade processing -> Validation -> Draft generation -> Dean review"],
    communicationTriggers: ["Remind teacher", "Notify Dean", "Notify HOD"],
    printOutputs: ["Marksheet", "Draft report card", "Class summary"],
    dependencies: ["exams", "academics", "teachers", "reports"],
  }),
  roleBlueprint({
    id: "hod",
    identity: "Departmental academic control desk for teachers, syllabus coverage, exams, lesson plans, and student performance trends.",
    firstViewport: ["low syllabus coverage", "pending lesson plans", "weak subject performance", "missing marks", "teacher follow-ups"],
    sidebar: [
      "Dashboard Overview",
      "Teachers",
      "Subjects",
      "Syllabus Coverage",
      "Exams & Performance",
      "Lesson Plans",
      "Attendance Analysis",
      "Department Resources",
      "Meetings & Reports",
      "Student Analytics",
      "Timetable Coordination",
      "Curriculum Compliance",
      "Communication",
      "Notifications",
      "Settings",
    ],
    primaryActions: ["Review Lesson Plan", "Send Reminder", "Schedule Meeting", "Approve Plan", "Return Plan", "Generate Report"],
    tables: [table("Teacher Performance Table", ["Teacher", "Subjects", "Classes", "Attendance", "Coverage", "Lesson Plans"], ["View", "Review", "Remind", "Open Audit"], ["Send reminders", "Export"])],
    forms: [form("Teacher Review Form", ["Teacher", "Observation", "Recommendation", "Follow-up date", "Notify teacher"], ["Submit Review"])],
    workflows: ["Lesson plan submitted -> HOD review -> Approved/Returned -> Archived"],
    communicationTriggers: ["Teacher announcement", "Meeting reminder", "Performance alert"],
    printOutputs: ["Department report", "Syllabus coverage report", "Teacher evaluation"],
    dependencies: ["staff", "academics", "exams", "resources"],
  }),
  roleBlueprint({
    id: "class-teacher",
    identity: "Student follow-up workspace for attendance, welfare, parent communication, discipline, and class performance.",
    firstViewport: ["absent students", "students needing attention", "unread parent messages", "missing assignments", "discipline follow-ups"],
    sidebar: ["Dashboard Home", "My Class", "Attendance", "Academic Performance", "Assignments", "Discipline", "Parent Communication"],
    primaryActions: ["Mark Attendance", "Message Parent", "Record Note", "Mark Concern", "Generate Class Report"],
    tables: [table("Class Roster", ["Student", "Admission No", "Attendance", "Fee Status", "Discipline", "Average"], ["Open Profile", "Message Parent", "Record Note", "Mark Concern"], ["Send SMS", "Print class list"])],
    forms: [form("Class Note Form", ["Student", "Concern category", "Note", "Follow-up date", "Notify parent"], ["Save Note"])],
    workflows: ["Concern recorded -> Follow-up scheduled -> Parent contacted -> Resolved"],
    communicationTriggers: ["Absenteeism notice", "Assignment reminder", "Appreciation message"],
    printOutputs: ["Class list", "Attendance report", "Class summary"],
    dependencies: ["students", "attendance", "academics", "communication", "discipline"],
  }),
  roleBlueprint({
    id: "grade-master",
    identity: "Grade/Form supervision cockpit for all streams, class teachers, welfare, attendance, discipline, academics, and parent escalations.",
    firstViewport: ["stream attendance ranking", "discipline hot streams", "students at risk", "teacher follow-ups", "parent escalations"],
    sidebar: ["Dashboard Overview", "Streams & Classes", "Attendance Oversight", "Discipline Oversight", "Academic Monitoring", "Parent Escalations"],
    primaryActions: ["Open Stream", "Escalate Case", "Schedule Meeting", "Send Reminder", "Generate Grade Report"],
    tables: [table("Streams Table", ["Stream", "Class Teacher", "Students", "Attendance", "Discipline Score", "Academic Average"], ["Open", "Message Teacher", "Escalate", "View Audit"], ["Export", "Send reminders"])],
    forms: [form("Intervention Plan", ["Student/Stream", "Issue", "Owner", "Due date", "Parent involvement"], ["Submit Plan"])],
    workflows: ["Issue detected -> Owner assigned -> Intervention -> Follow-up -> Closed"],
    communicationTriggers: ["Parent escalation", "Teacher reminder", "Meeting notice"],
    printOutputs: ["Grade report", "Stream comparison", "Parent meeting list"],
    dependencies: ["streams", "students", "teachers", "attendance", "discipline", "academics"],
  }),
  roleBlueprint({
    id: "nurse",
    identity: "Student health tracker for clinic visits, medicine stock, emergency care, referrals, and parent notification.",
    firstViewport: ["clinic visits today", "medicine low stock", "emergency cases", "students needing parent contact", "referrals pending"],
    sidebar: ["Clinic Command Center", "Clinic Visits", "Medicine Inventory", "Referrals", "Emergency Cases", "Health Reports"],
    primaryActions: ["Record Visit", "Dispense Medicine", "Contact Parent", "Refer to Hospital", "Print Referral"],
    tables: [table("Clinic Visits", ["Student", "Class", "Complaint", "Action", "Parent Contacted", "Status"], ["View", "Update", "Contact Parent", "Print Referral"], ["Export", "Print selected"])],
    forms: [form("Clinic Visit Form", ["Student", "Symptoms", "Temperature", "Medicine issued", "Parent contact required", "Referral note"], ["Save Visit", "Notify Parent"])],
    workflows: ["Visit logged -> Treatment/Referral -> Parent notified -> Closed"],
    communicationTriggers: ["Parent health notice", "Clinic referral", "Medicine restock alert"],
    printOutputs: ["Clinic referral form", "Medicine issue slip", "Health report"],
    dependencies: ["students", "boarding", "communication", "inventory"],
  }),
  roleBlueprint({
    id: "guidance-counselling",
    identity: "Welfare case manager for student emotional wellbeing, confidential cases, interventions, referrals, and crisis prevention.",
    firstViewport: ["urgent intervention alerts", "unresolved cases", "bullying reports", "parent meetings", "students silently struggling"],
    sidebar: ["Dashboard", "Student Cases", "Appointments", "Wellness Analytics", "Parent Meetings", "Emergency Cases"],
    primaryActions: ["Start Session", "Add Notes", "Escalate", "Refer to Clinic", "Notify Principal"],
    tables: [table("Students Needing Attention", ["Student", "Risk Level", "Trigger", "Last Session", "Status"], ["Open Case", "Start Session", "Escalate", "Schedule Follow-up"], ["Assign selected", "Export"])],
    forms: [form("Counselling Session Form", ["Student", "Issue category", "Priority", "Notes", "Follow-up date", "Parent involvement"], ["Save Confidential Notes"])],
    workflows: ["Referral -> Assessment -> Intervention -> Follow-up -> Resolved"],
    communicationTriggers: ["Parent meeting request", "Principal escalation", "Clinic referral"],
    printOutputs: ["Confidential case summary", "Parent meeting note", "Referral slip"],
    dependencies: ["students", "discipline", "clinic", "parents", "audit"],
  }),
  roleBlueprint({
    id: "discipline-master",
    identity: "Behavior intelligence and school order control center for incidents, discipline profiles, parent meetings, and positive behavior.",
    firstViewport: ["live incidents", "high risk students", "bullying cases", "dormitory incidents", "teacher complaints"],
    sidebar: ["Dashboard", "Incident Reports", "Student Discipline Profiles", "Prefects Reports", "Dormitory Cases", "Counselling Referrals"],
    primaryActions: ["Record Incident", "Open Student Profile", "Notify Parent", "Refer to Counsellor", "Generate Warning Letter"],
    tables: [table("Incident Feed", ["Student", "Class", "Time", "Severity", "Teacher", "Location", "Action"], ["View", "Assign", "Escalate", "Notify Parent"], ["Assign selected", "Export"])],
    forms: [form("Incident Report Form", ["Student", "Category", "Severity", "Date/time", "Witnesses", "Action taken", "Parent notified"], ["Submit Case"])],
    workflows: ["Incident recorded -> Investigation -> Intervention -> Follow-up -> Closed"],
    communicationTriggers: ["Parent notice", "Counsellor referral", "Principal escalation"],
    printOutputs: ["Discipline slip", "Warning letter", "Weekly discipline report"],
    dependencies: ["students", "boarding", "counselling", "parents", "security"],
  }),
  roleBlueprint({
    id: "librarian",
    identity: "Circulation system for book issue, returns, fines, overdue notices, stock, reservations, and library reports.",
    firstViewport: ["books overdue", "returns today", "fines pending", "lost books", "reservations pending"],
    sidebar: ["Library Command Center", "Book Catalog", "Issue Books", "Returns", "Fines", "Reservations", "Reports"],
    primaryActions: ["Issue Book", "Return Book", "Apply Fine", "Send Overdue SMS", "Print Slip"],
    tables: [table("Borrowing Register", ["Student", "Book", "Issue Date", "Due Date", "Fine", "Status"], ["Return", "Renew", "Fine", "Send SMS"], ["Send overdue SMS", "Export"])],
    forms: [form("Book Issue Form", ["Student", "Book barcode", "Issue date", "Due date", "Condition", "Notes"], ["Issue Book", "Print Slip"])],
    workflows: ["Book issued -> Due tracking -> Returned/Fined -> Closed"],
    communicationTriggers: ["Overdue SMS", "Fine notice", "Reservation ready"],
    printOutputs: ["Library issue slip", "Fine notice", "Borrowing report"],
    dependencies: ["students", "parents", "reports", "communication"],
  }),
  roleBlueprint({
    id: "parent",
    identity: "Child monitoring portal for fees, attendance, notices, results, discipline, health, and communication.",
    firstViewport: ["fee balance", "attendance alerts", "notices unread", "report cards", "discipline/health alerts"],
    sidebar: ["Dashboard", "Fees", "Academics", "Attendance", "Discipline", "Health", "Messages", "Downloads"],
    primaryActions: ["View Statement", "Download Receipt", "Send Message", "Download Report", "Acknowledge Notice"],
    tables: [table("Child Activity", ["Date", "Module", "Item", "Status", "Action"], ["View", "Download", "Acknowledge", "Message School"], ["Download selected", "Print"])],
    forms: [form("Parent Message Form", ["Child", "Category", "Message", "Attachment"], ["Send Message"])],
    workflows: ["Notice published -> Parent reads -> Acknowledged -> Archived"],
    communicationTriggers: ["Fee reminder", "Attendance alert", "Result published", "School notice"],
    printOutputs: ["Fee statement", "Receipt", "Report card"],
    dependencies: ["students", "finance", "academics", "communication", "portal"],
  }),
  roleBlueprint({
    id: "student",
    identity: "Academic life portal for timetable, assignments, results, library, fees visibility, notices, and personal progress.",
    firstViewport: ["today timetable", "assignments due", "results released", "library overdue", "notices"],
    sidebar: ["Dashboard", "Timetable", "Assignments", "Results", "Library", "Notices", "Downloads"],
    primaryActions: ["View Assignment", "Submit Work", "Download Report", "Read Notice", "View Timetable"],
    tables: [table("Student Tasks", ["Task", "Subject", "Due Date", "Status", "Action"], ["View", "Submit", "Download", "Ask Teacher"], ["Download selected", "Print"])],
    forms: [form("Assignment Submission", ["Assignment", "Attachment", "Comment"], ["Submit Work"])],
    workflows: ["Assignment assigned -> Submitted -> Marked -> Feedback released"],
    communicationTriggers: ["Assignment reminder", "Result release", "Notice alert"],
    printOutputs: ["Timetable", "Assignment list", "Report card"],
    dependencies: ["academics", "assignments", "library", "communication"],
  }),
  roleBlueprint({
    id: "storekeeper",
    identity: "Inventory control system for stock receive, issue, low stock, procurement needs, damage, and audit movement.",
    firstViewport: ["low stock", "issue requests", "stock receipts pending", "damaged stock", "procurement needs"],
    sidebar: ["Store Command Center", "Inventory", "Receive Stock", "Issue Stock", "Transfers", "Procurement Requests", "Reports"],
    primaryActions: ["Receive Stock", "Issue Stock", "Request Procurement", "Print Stock Slip", "View Movement"],
    tables: [table("Stock Register", ["Item", "Category", "Quantity", "Unit", "Reorder Level", "Status"], ["Issue", "Receive", "Request Procurement", "View Movement"], ["Issue selected", "Export"])],
    forms: [form("Stock Issue Form", ["Item", "Quantity", "Issued to", "Department", "Purpose", "Approved by"], ["Issue Stock", "Print Slip"])],
    workflows: ["Request -> Approved -> Issued -> Reconciled -> Archived"],
    communicationTriggers: ["Low stock alert", "Issue notification", "Procurement request"],
    printOutputs: ["Stock issue slip", "Stock movement report", "Procurement needs report"],
    dependencies: ["inventory", "procurement", "departments", "finance"],
  }),
  roleBlueprint({
    id: "boarding-master",
    identity: "Hostel operations dashboard for roll call, dorm issues, leave/exeat, meal counts, welfare, discipline, and parent alerts.",
    firstViewport: ["roll call not done", "missing students", "dorm incidents", "leave requests", "meal counts"],
    sidebar: ["Boarding Command Center", "Dormitories", "Roll Call", "Leave/Exeats", "Dorm Incidents", "Meals", "Reports"],
    primaryActions: ["Mark Roll Call", "Report Missing Student", "Approve Leave", "Notify Parent", "Print Roll Call"],
    tables: [table("Dorm Roll Call", ["Student", "Dorm", "Bed", "Status", "Time", "Action"], ["Mark Present", "Mark Missing", "Notify Parent", "Escalate"], ["Mark selected", "Print"])],
    forms: [form("Dorm Incident Form", ["Student", "Dorm", "Incident", "Severity", "Action", "Notify parent"], ["Submit Incident"])],
    workflows: ["Roll call -> Exception detected -> Escalated -> Resolved"],
    communicationTriggers: ["Missing student alert", "Parent boarding notice", "Meal count notice"],
    printOutputs: ["Dorm roll call", "Leave pass", "Dorm incident report"],
    dependencies: ["students", "discipline", "meals", "security", "parents"],
  }),
  roleBlueprint({
    id: "security-officer",
    identity: "Gate and incident log for visitors, student exits, vehicle movement, gate passes, emergencies, and unauthorized access.",
    firstViewport: ["visitors signed in", "exit passes pending", "unauthorized movement", "incidents", "vehicles at gate"],
    sidebar: ["Gate Command Center", "Visitors", "Gate Passes", "Student Exit", "Vehicle Log", "Incidents", "Reports"],
    primaryActions: ["Record Visitor", "Print Visitor Slip", "Approve Gate Pass", "Report Incident", "Notify Admin"],
    tables: [table("Visitor Log", ["Visitor", "Phone", "ID", "Person Visiting", "Purpose", "Status"], ["Check In", "Print Slip", "Check Out", "Flag"], ["Print selected", "Export"])],
    forms: [form("Visitor Log Form", ["Visitor name", "Phone", "ID number", "Person visiting", "Purpose", "Badge number"], ["Check In", "Print Visitor Slip"])],
    workflows: ["Visitor checked in -> Slip printed -> Visit completed -> Checked out"],
    communicationTriggers: ["Notify host", "Emergency alert", "Unauthorized access alert"],
    printOutputs: ["Visitor slip", "Gate pass", "Incident report"],
    dependencies: ["visitors", "students", "transport", "security", "communication"],
  }),
  roleBlueprint({
    id: "transport-manager",
    identity: "Route operations center for fleet, routes, students, drivers, GPS, parent notifications, fuel, maintenance, and incidents.",
    firstViewport: ["active trips", "delayed routes", "vehicles offline", "drivers absent", "missed pickups"],
    sidebar: ["Dashboard Overview", "Fleet Management", "Routes & Stops", "Student Allocation", "Driver Management", "GPS Tracking"],
    primaryActions: ["Assign Route", "Add Vehicle", "Report Incident", "Send Parent Alert", "Schedule Maintenance"],
    tables: [table("Live Route Snapshot", ["Bus", "Route", "Driver", "Status", "ETA", "Delay"], ["Track", "Notify Parents", "Report Incident", "Open Audit"], ["Notify selected", "Export"])],
    forms: [form("Route Assignment Form", ["Vehicle", "Driver", "Route", "Stops", "Students", "Effective date"], ["Assign Route"])],
    workflows: ["Trip scheduled -> Started -> Live tracking -> Completed -> Reported"],
    communicationTriggers: ["Bus arriving", "Bus delayed", "Emergency alert", "Route change"],
    printOutputs: ["Route list", "Trip attendance", "Vehicle report"],
    dependencies: ["students", "parents", "gps", "finance", "communication"],
  }),
  roleBlueprint({
    id: "laboratory-technician",
    identity: "Lab resource manager for sessions, chemicals, apparatus, safety, breakages, maintenance, and practical readiness.",
    firstViewport: ["practicals today", "chemicals low", "dangerous substances", "repairs pending", "safety alerts"],
    sidebar: ["Dashboard", "Lab Sessions", "Chemicals", "Equipment", "Inventory", "Breakages", "Safety Logs", "Practical Exams"],
    primaryActions: ["Mark Lab Ready", "Add Chemical", "Record Breakage", "Schedule Maintenance", "Submit Incident"],
    tables: [table("Lab Session Timeline", ["Class", "Teacher", "Lab", "Status", "Chemicals", "Apparatus"], ["Mark Ready", "Print Sheet", "Cancel", "View Safety"], ["Print sheets", "Export"])],
    forms: [form("Chemical Stock Form", ["Chemical", "Quantity", "Unit", "Expiry date", "Hazard level", "Storage location"], ["Save Chemical"])],
    workflows: ["Session scheduled -> Setup -> Safety checked -> Ready -> Reconciled"],
    communicationTriggers: ["Teacher readiness notice", "Safety alert", "Procurement request"],
    printOutputs: ["Practical sheet", "Chemical register", "Breakage report"],
    dependencies: ["academics", "inventory", "procurement", "safety", "reports"],
  }),
  roleBlueprint({
    id: "admissions",
    identity: "Enrollment pipeline for inquiries, applications, document verification, admission approval, fees setup, and parent onboarding.",
    firstViewport: ["new inquiries", "applications pending", "documents missing", "interviews scheduled", "admission letters pending"],
    sidebar: [
      "Overview",
      "Enquiries & Walk-ins",
      "Applications",
      "Applicant Profiles",
      "Documents & Verification",
      "Interviews & Assessments",
      "Selection & Offers",
      "Admission Fee Clearance",
      "Enrolment & Admission Numbers",
      "Class & Stream Placement",
      "Parents & Guardians",
      "Transfers & Re-admissions",
      "Communication",
      "Appointments & Visits",
      "Imports & Bulk Uploads",
      "Reports & Downloads",
      "Tasks & Follow-ups",
      "Admission Templates"
    ],
    primaryActions: ["Add Inquiry", "Approve Admission", "Request Document", "Print Admission Letter", "Send Parent SMS"],
    tables: [table("Admissions Pipeline", ["Applicant", "Class", "Parent Phone", "Documents", "Status", "Action"], ["View", "Approve", "Reject", "Print Letter"], ["Send SMS", "Export"])],
    forms: [form("Application Form", ["Student name", "Class", "Previous school", "Parent name", "Parent phone", "Documents"], ["Submit Application"])],
    workflows: ["Inquiry -> Application -> Verification -> Approval -> Admission letter -> Student record"],
    communicationTriggers: ["Application received", "Document request", "Admission approved"],
    printOutputs: ["Admission letter", "Document checklist", "Student profile"],
    dependencies: ["students", "parents", "finance", "documents", "communication"],
  }),
  roleBlueprint({
    id: "superadmin",
    identity: "School setup platform for schools, modules, billing status, infrastructure, support, and platform controls.",
    firstViewport: ["school setup issues", "module requests", "overdue schools", "support escalations", "infrastructure alerts"],
    sidebar: ["Dashboard", "Schools", "Modules", "Billing", "Support", "Infrastructure", "Audit Logs", "Settings"],
    primaryActions: ["Create School", "Enable Module", "Set Billing Status", "Suspend School", "View Details"],
    tables: [table("Schools Table", ["School", "County", "State", "Modules", "Billing", "Status"], ["View", "Enable Module", "Set State", "View School Record"], ["Export", "Notify selected"])],
    forms: [form("School Setup Form", ["School name", "County", "Owner", "Modules", "Initial state", "Billing status"], ["Provision School"])],
    workflows: ["Provisioning -> Setup -> Verification -> Active -> Managed"],
    communicationTriggers: ["School notice", "Support update", "Billing warning"],
    printOutputs: ["School report", "Module assignment report", "Saved records export"],
    dependencies: ["school lifecycle", "billing", "modules", "support", "audit"],
  }),
  roleBlueprint({
    id: "system-monitor",
    identity: "System health center for failed SMS, M-Pesa confirmations, reports, backups, offline devices, and school support.",
    firstViewport: ["failed jobs", "service issues", "failed updates", "backup health", "retry status"],
    sidebar: ["System Health", "Services", "Queues", "School Updates", "Failed Items", "Backups", "Security", "Reports"],
    primaryActions: ["Retry Job", "Replay Update", "Retry Failed Job", "Open Logs", "Acknowledge Incident"],
    tables: [table("Failure Queue", ["Service", "School Update", "School", "Attempts", "Status", "Action"], ["Retry", "Replay Update", "Mark Issue Solved", "View Details"], ["Retry selected", "Export"])],
    forms: [form("Retry Form", ["Service", "School", "Failure type", "Reason", "Notify owner"], ["Retry Failed Job"])],
    workflows: ["Failure detected -> Retry started -> Retried -> Recovered or marked for support -> Recorded"],
    communicationTriggers: ["Incident alert", "Retry success", "Escalation notice"],
    printOutputs: ["System health report", "Failure report", "Saved records export"],
    dependencies: ["school updates", "queues", "monitoring", "audit", "automatic retries"],
  }),
];

export const DOCX_ADDED_MODULE_IDS: DocxAddedModuleId[] = [
  "school-admin",
  "hr-payroll",
  "timetable-builder",
  "communication-center",
  "procurement",
  "school-calendar",
  "canteen-meals",
  "co-curricular",
  "data-security",
  "setup-wizard",
  "ict-assets",
  "document-printing",
  "reports-analytics",
  "universal-approvals",
];

const addedModuleContracts: DocxAddedModuleContract[] = generatedWorkspaceDefinitions;
export function getDocxAddedModuleContractByWorkspace(workspaceName: string) {
  // First, check by title or exact match
  let contract = addedModuleContracts.find((c) => c.title.toLowerCase() === workspaceName.toLowerCase());
  if (contract) return contract;

  // Then check by unique sidebar matching
  contract = addedModuleContracts.find((c) => 
    c.uniqueSidebar.some(s => s.toLowerCase() === workspaceName.toLowerCase())
  );
  if (contract) return contract;

  // Then check for partial matches in title
  contract = addedModuleContracts.find((c) => 
    c.title.toLowerCase().includes(workspaceName.toLowerCase()) || 
    workspaceName.toLowerCase().includes(c.title.toLowerCase())
  );
  if (contract) return contract;

  // Fallback to the first one as a generic template
  return addedModuleContracts[0];
}

export function generateExtremeErpBlueprintFromContract(workspaceName: string, roleFocus: string): ExtremeErpBlueprint | null {
  const contract = getDocxAddedModuleContractByWorkspace(workspaceName);
  
  if (!contract) return null;

  return {
    id: contract.id as ExtremeErpWorkspaceId,
    title: workspaceName,
    moduleCode: contract.id,
    commandQuestion: `What would you like to do in ${workspaceName}?`,
    roleFocus: roleFocus,
    urgentActions: contract.urgentActionStrip,
    queues: [
      {
        id: `${contract.id}-queue`,
        title: "Executable workflow queue",
        owner: roleFocus,
        priority: "Medium",
        workflow: contract.approvalWorkflow,
        actions: ["Review", "Approve", "Return"],
        auditEvent: "ACTION_PERFORMED",
      }
    ],
    tables: [
      {
        id: `${contract.id}-table`,
        title: contract.mainTable.title,
        columns: contract.mainTable.columns,
        rowActions: contract.mainTable.rowActions,
        bulkActions: contract.mainTable.bulkActions,
      }
    ],
    forms: contract.forms.map((f) => ({
      id: f.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
      title: f.title,
      purpose: "Standard data entry form",
      fields: f.fields,
      footerActions: f.footerActions,
      auditAction: "FORM_SUBMITTED",
    })),
    printOutputs: contract.printOutputs,
    sampleData: ["Active", "Pending", "0 Issues"],
    states: ["LOADING", "EMPTY", "DEGRADED", "FAILED", "LOCKED"] satisfies OperationalState[],
  };
}

export function getOperationalRoleBlueprint(roleId: string) { return roleBlueprints.find((blueprint) => blueprint.id === roleId); }

export function getDocxAddedModuleContract(moduleId: string) { return addedModuleContracts.find((contract) => contract.id === moduleId); }

export const MYSHULE_OPERATIONAL_ROLE_BLUEPRINTS = roleBlueprints;
export const DOCX_ADDED_MODULE_CONTRACTS = addedModuleContracts;
