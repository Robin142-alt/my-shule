export type ExtremeErpWorkspaceId =
  | "school-admin"
  | "hr-payroll"
  | "timetable-builder"
  | "communication-center"
  | "school-calendar"
  | "canteen-meals"
  | "co-curricular"
  | "data-security"
  | "setup-wizard"
  | "ict-assets"
  | "document-printing"
  | "reports-analytics"
  | "universal-approvals";

export type OperationalState = "LOADING" | "EMPTY" | "DEGRADED" | "FAILED" | "LOCKED";

export type OperationalQueue = {
  id: string;
  title: string;
  owner: string;
  priority: "High" | "Medium" | "Low";
  workflow: string;
  actions: string[];
  auditEvent: string;
};

export type OperationalFormBlueprint = {
  id: string;
  title: string;
  purpose: string;
  fields: string[];
  footerActions: string[];
  auditAction: string;
};

export type OperationalTableBlueprint = {
  id: string;
  title: string;
  columns: string[];
  rowActions: string[];
  bulkActions: string[];
};

export type ExtremeErpBlueprint = {
  id: ExtremeErpWorkspaceId;
  title: string;
  moduleCode: string;
  commandQuestion: string;
  roleFocus: string;
  urgentActions: string[];
  queues: OperationalQueue[];
  tables: OperationalTableBlueprint[];
  forms: OperationalFormBlueprint[];
  printOutputs: string[];
  sampleData: string[];
  states: OperationalState[];
};

export const EXTREME_ERP_REQUIRED_WORKSPACES: ExtremeErpWorkspaceId[] = [
  "school-admin",
  "hr-payroll",
  "timetable-builder",
  "communication-center",
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

const requiredStates: OperationalState[] = ["LOADING", "EMPTY", "DEGRADED", "FAILED", "LOCKED"];

function queue(id: string, title: string, owner: string, actions: string[], workflow: string, auditEvent: string): OperationalQueue {
  return {
    id,
    title,
    owner,
    priority: "High",
    workflow,
    actions,
    auditEvent,
  };
}

function table(id: string, title: string, columns: string[], rowActions: string[], bulkActions: string[]): OperationalTableBlueprint {
  return {
    id,
    title,
    columns,
    rowActions,
    bulkActions,
  };
}

function form(id: string, title: string, purpose: string, fields: string[], extraFooterActions: string[] = []): OperationalFormBlueprint {
  return {
    id,
    title,
    purpose,
    fields,
    footerActions: ["Cancel", "Save Draft", "Submit", ...extraFooterActions],
    auditAction: `audit.${id}`,
  };
}

function blueprint(input: Omit<ExtremeErpBlueprint, "states" | "sampleData"> & { sampleData?: string[] }): ExtremeErpBlueprint {
  return {
    ...input,
    states: requiredStates,
    sampleData: input.sampleData ?? [
      "Admission No: MYS/2026/001",
      "Student Name: Brian Otieno",
      "Parent Phone: 07XXXXXXXX",
      "Class: Grade 7 East",
      "Term: Term 1",
      "Year: 2026",
      "Fee Balance: KES 18,500",
    ],
  };
}

export const extremeErpBlueprints: ExtremeErpBlueprint[] = [
  blueprint({
    id: "school-admin",
    title: "School Administrator Command Center",
    moduleCode: "school_administration",
    commandQuestion: "Which school records, users, documents, or parent requests need front-office action now?",
    roleFocus: "Central admin desk for student records, parent records, staff support, appointments, and printing.",
    urgentActions: ["Record new student", "Update parent phone", "Print admission letter", "Return parent call"],
    queues: [
      queue("admin.records", "Record corrections pending", "Secretary", ["Review", "Update", "Send SMS", "Print Profile"], "Draft -> Reviewed -> Updated -> Archived", "STUDENT_RECORD_UPDATED"),
    ],
    tables: [
      table("admin.students", "Student records table", ["Admission No", "Student", "Class", "Parent Phone", "Status"], ["View", "Edit", "Print Profile", "Send SMS"], ["Print selected", "Send SMS"]),
    ],
    forms: [
      form("student-record", "Student Record Form", "Maintain the official student file.", ["Admission number", "Student name", "County", "Class", "Stream", "Parent phone"], ["Save and Print Profile", "Save and Notify Parent"]),
    ],
    printOutputs: ["Student profile", "Admission letter", "Parent contact list"],
  }),
  blueprint({
    id: "hr-payroll",
    title: "HR and Payroll Command Center",
    moduleCode: "hr_payroll",
    commandQuestion: "Which staff approvals, payroll items, leave requests, or coverage gaps need action?",
    roleFocus: "Staff records, payroll, leave, appraisals, duty ownership, and timetable coverage.",
    urgentActions: ["Approve leave", "Assign substitute", "Review payroll exception", "Send staff notice"],
    queues: [
      queue("hr.leave", "Leave approvals", "HR Manager", ["Approve", "Reject", "Assign Cover", "Escalate"], "Draft -> Submitted -> Approved -> Covered -> Archived", "LEAVE_APPROVED"),
    ],
    tables: [
      table("hr.staff", "Staff operations table", ["Staff", "Role", "Department", "Attendance", "Payroll Status"], ["View", "Edit", "Assign", "View Audit"], ["Send notice", "Export"]),
    ],
    forms: [
      form("staff-profile", "Staff Profile Form", "Create and update staff employment records.", ["Staff name", "Phone", "Role", "Department", "Employment type", "Login enabled"], ["Send Login Credentials"]),
    ],
    printOutputs: ["Payroll summary", "Payslip", "Leave approval letter"],
  }),
  blueprint({
    id: "timetable-builder",
    title: "Timetable Builder Command Center",
    moduleCode: "timetable_builder",
    commandQuestion: "Which timetable conflict, substitute lesson, room allocation, or lesson gap must be fixed?",
    roleFocus: "Build timetables, resolve teacher/class/room clashes, and notify affected users.",
    urgentActions: ["Resolve clash", "Assign substitute", "Publish timetable", "Notify class"],
    queues: [
      queue("timetable.conflicts", "Timetable conflicts", "Deputy Principal", ["Resolve", "Assign Substitute", "Notify Staff"], "Draft -> Validated -> Published -> Archived", "TIMETABLE_CONFLICT_RESOLVED"),
    ],
    tables: [
      table("timetable.periods", "Timetable periods", ["Class", "Subject", "Teacher", "Room", "Status"], ["Edit", "Resolve", "Notify"], ["Publish selected"]),
    ],
    forms: [
      form("timetable-conflict", "Conflict Resolution Form", "Resolve lesson collisions without losing audit history.", ["Affected class", "Subject", "Teacher", "Conflict type", "Substitute teacher", "Resolution note"], ["Notify Staff"]),
    ],
    printOutputs: ["Class timetable", "Teacher timetable", "Room timetable"],
  }),
  blueprint({
    id: "communication-center",
    title: "Communication Center",
    moduleCode: "communication_center",
    commandQuestion: "Which parent, staff, student, SMS, WhatsApp, or emergency communication must be sent or recovered now?",
    roleFocus: "Unified messaging for parents, staff, students, emergency broadcasts, templates, delivery logs, retries, and consent-based groups.",
    urgentActions: ["Send SMS", "Send WhatsApp", "Emergency Broadcast", "Retry Failed Messages", "Schedule Notice"],
    queues: [
      queue("communication.failed", "Failed delivery queue", "Communication Officer", ["Retry Delivery", "Change Channel", "Escalate", "Open Audit"], "Draft -> Approved -> Sent -> Delivered -> Archived", "COMMUNICATION_DELIVERY_RETRIED"),
    ],
    tables: [
      table("communication.log", "Communication log", ["Recipient", "Channel", "Message Type", "Status", "Sent By"], ["Retry Delivery", "View Message", "Open Audit"], ["Retry selected", "Export delivery log"]),
    ],
    forms: [
      form("bulk-message", "Bulk Message Form", "Send governed parent, staff, class, or emergency communication with delivery tracking.", ["Audience", "Channel", "Template", "Message", "Schedule time", "Approval required"], ["Submit for Approval", "Send Now"]),
    ],
    printOutputs: ["Delivery log", "Emergency contact list", "Parent notice register"],
  }),
  blueprint({
    id: "school-calendar",
    title: "School Calendar and Events",
    moduleCode: "school_calendar",
    commandQuestion: "Which event needs approval, transport, parent consent, reminders, or publishing?",
    roleFocus: "Academic dates, events, fee deadlines, parent meetings, trips, and reminders.",
    urgentActions: ["Approve Event", "Publish Event", "Send Reminder", "Notify Transport"],
    queues: [
      queue("calendar.approvals", "Events pending approval", "Principal", ["Approve", "Reject", "Return", "Publish"], "Draft -> Submitted -> Approved -> Published -> Completed -> Archived", "EVENT_PUBLISHED"),
    ],
    tables: [
      table("calendar.events", "Events table", ["Event", "Type", "Date", "Audience", "Status"], ["View", "Edit", "Publish", "Send Reminder"], ["Print event list"]),
    ],
    forms: [
      form("calendar-event", "Event Form", "Create events that trigger notices, transport alerts, and consent workflows.", ["Event title", "Event type", "Start date", "End date", "Target audience", "Transport required", "Parent consent required"], ["Submit for Approval", "Publish Event"]),
    ],
    printOutputs: ["Event list", "Trip consent form", "Parent meeting schedule"],
  }),
  blueprint({
    id: "canteen-meals",
    title: "Canteen, Meals, and Kitchen Stock",
    moduleCode: "meals_canteen",
    commandQuestion: "Which meal count, kitchen stock issue, special diet, or supplier delivery needs action?",
    roleFocus: "Meal plans, boarding counts, kitchen stock, special diets, and supplier deliveries.",
    urgentActions: ["Print meal count", "Issue kitchen stock", "Record meal attendance", "Request procurement"],
    queues: [
      queue("meals.stock", "Kitchen stock alerts", "Kitchen Staff", ["Receive Stock", "Issue Stock", "Mark Expired", "Request Procurement"], "Draft -> Issued -> Consumed -> Reconciled", "KITCHEN_STOCK_ISSUED"),
    ],
    tables: [
      table("meals.plans", "Meal plan table", ["Date", "Meal Type", "Menu", "Expected Students", "Special Diets", "Status"], ["View", "Edit Menu", "Print Meal Count", "Issue Stock"], ["Print selected"]),
    ],
    forms: [
      form("meal-plan", "Meal Plan Form", "Prepare school meals with student counts and diet controls.", ["Date", "Meal type", "Menu items", "Expected students", "Special diet notes", "Ingredients required"], ["Print Meal Plan", "Notify Boarding Master"]),
    ],
    printOutputs: ["Meal count", "Kitchen stock slip", "Special diet list"],
  }),
  blueprint({
    id: "co-curricular",
    title: "Co-curricular Activities Command Center",
    moduleCode: "co_curricular",
    commandQuestion: "Which trip, competition, consent, payment, equipment, or attendance item is blocking activity operations?",
    roleFocus: "Clubs, sports, trips, competitions, parent consent, activity fees, transport, and equipment.",
    urgentActions: ["Send Parent Consent", "Request Equipment", "Notify Transport", "Mark Attendance"],
    queues: [
      queue("activities.consent", "Trips pending parent consent", "Activity Coordinator", ["Approve", "Send Consent", "Notify Transport", "Print Student List"], "Draft -> Approved -> Consent Sent -> Completed -> Archived", "ACTIVITY_CONSENT_SENT"),
    ],
    tables: [
      table("activities.list", "Activities table", ["Activity", "Patron", "Students", "Next Event", "Status"], ["View", "Edit", "Add Members", "Send Notice"], ["Send SMS", "Export"]),
    ],
    forms: [
      form("activity-event", "Trip/Competition Form", "Coordinate trips with approvals, parent consent, fees, and transport.", ["Event title", "Activity", "Date", "Location", "Students involved", "Transport required", "Fee required"], ["Submit for Approval", "Send Parent Consent"]),
    ],
    printOutputs: ["Student list", "Trip consent form", "Certificate list"],
  }),
  blueprint({
    id: "data-security",
    title: "Data Security, Backup, and Admin Control",
    moduleCode: "data_security",
    commandQuestion: "Which access, backup, deleted record, export, or suspicious activity needs admin action?",
    roleFocus: "Login history, user sessions, deleted records, backups, exports, recovery, and audit reports.",
    urgentActions: ["Force Logout", "Suspend User", "Run Backup", "Restore Record"],
    queues: [
      queue("security.alerts", "Security exceptions", "System Admin", ["View Details", "Force Logout", "Suspend User", "View Audit"], "Detected -> Reviewed -> Resolved -> Archived", "SECURITY_EXCEPTION_REVIEWED"),
    ],
    tables: [
      table("security.logins", "Login history table", ["User", "Role", "Device", "IP", "Status"], ["View Details", "Force Logout", "Suspend User"], ["Flag suspicious"]),
    ],
    forms: [
      form("record-restore", "Deleted Record Recovery Form", "Restore deleted records with reason and approval.", ["Record type", "Deleted by", "Reason", "Recovery status", "Confirmation"], ["Restore", "View Audit"]),
    ],
    printOutputs: ["Backup report", "Audit trail report", "Login activity report"],
  }),
  blueprint({
    id: "setup-wizard",
    title: "First-Time Setup Wizard",
    moduleCode: "setup_wizard",
    commandQuestion: "Which setup step is incomplete before the school can launch daily operations?",
    roleFocus: "Guided school setup for low-ICT teams: profile, terms, classes, users, imports, fees, SMS, M-Pesa, templates, and launch.",
    urgentActions: ["Validate Import", "Fix Errors", "Save and Continue", "Launch School"],
    queues: [
      queue("setup.steps", "Setup steps pending", "School Owner", ["Continue", "Validate", "Skip If Allowed", "Launch"], "Profile -> Imports -> Finance -> Permissions -> Launch", "SCHOOL_SETUP_LAUNCHED"),
    ],
    tables: [
      table("setup.import", "Student import validation", ["Admission No", "Student", "Class", "Parent Phone", "Error"], ["Fix", "Validate", "Import"], ["Import Students"]),
    ],
    forms: [
      form("school-profile", "School Profile Step", "Set the tenant profile, year, term, classes, and launch defaults.", ["School name", "County", "Academic year", "Current term", "Classes", "Streams"], ["Save and Continue"]),
    ],
    printOutputs: ["Import error report", "Setup review", "Launch checklist"],
  }),
  blueprint({
    id: "ict-assets",
    title: "ICT and Digital Assets Dashboard",
    moduleCode: "ict_assets",
    commandQuestion: "Which device, lab booking, software license, repair, or high-value movement needs action?",
    roleFocus: "Computer labs, devices, software licenses, printers, routers, repairs, issue/return, and asset movement.",
    urgentActions: ["Issue Device", "Return Device", "Approve Lab Booking", "Report Fault"],
    queues: [
      queue("ict.repairs", "ICT repair requests", "ICT Officer", ["Assign Repair", "Send for Repair", "Mark Resolved", "Escalate Missing Device"], "Reported -> Assigned -> Repaired -> Closed", "ICT_REPAIR_ASSIGNED"),
    ],
    tables: [
      table("ict.assets", "ICT asset register", ["Asset Tag", "Asset", "Serial", "Location", "Condition", "Status"], ["Issue", "Return", "Move Asset", "Report Fault"], ["Print asset tags"]),
    ],
    forms: [
      form("ict-asset", "Add ICT Asset Form", "Register high-value digital assets with barcode and warranty controls.", ["Asset name", "Category", "Serial number", "Asset tag", "Purchase cost", "Warranty expiry"], ["Save and Print Barcode"]),
    ],
    printOutputs: ["Asset tag", "Issue slip", "Lab booking list"],
  }),
  blueprint({
    id: "document-printing",
    title: "Document and Printing Center",
    moduleCode: "document_printing",
    commandQuestion: "What must be printed, sent, regenerated, or archived now?",
    roleFocus: "Central printable outputs for student, finance, academic, operations, procurement, and welfare documents.",
    urgentActions: ["Preview", "Print", "Download PDF", "Send to Parent", "Retry Print"],
    queues: [
      queue("documents.print", "Documents pending print", "Secretary", ["Preview Document", "Print Queue Item", "Send to Parent", "Archive"], "Requested -> Generated -> Printed -> Archived", "DOCUMENT_PRINTED"),
    ],
    tables: [
      table("documents.queue", "Printing center table", ["Document Type", "Module", "Requested By", "Related Record", "Print Status"], ["Open Preview", "Print Row", "Download PDF", "View Audit"], ["Print selected", "Archive selected"]),
    ],
    forms: [
      form("print-template", "Print Template Settings", "Control headers, logos, signatures, QR codes, paper size, and defaults.", ["Template name", "Module", "School logo", "Signature area", "Paper size", "Show QR code"], ["Preview Template", "Print Test Page"]),
    ],
    printOutputs: ["Student profile", "Fee receipt", "Report card", "Visitor slip", "LPO", "Goods received note"],
  }),
  blueprint({
    id: "reports-analytics",
    title: "Reports and Analytics Center",
    moduleCode: "reports_analytics",
    commandQuestion: "Which report must be filtered, exported, printed, scheduled, or drilled into now?",
    roleFocus: "Role-aware reports across academics, finance, attendance, discipline, health, inventory, transport, boarding, HR, and audit.",
    urgentActions: ["Export PDF", "Export Excel", "Print", "Schedule Report"],
    queues: [
      queue("reports.exports", "Reports waiting for export", "Report Owner", ["Preview", "Export PDF", "Export Excel", "Schedule"], "Draft -> Generated -> Exported -> Archived", "REPORT_EXPORTED"),
    ],
    tables: [
      table("reports.catalog", "Reports catalog", ["Report", "Module", "Date Range", "Owner", "Status"], ["Preview", "Export", "Print", "Schedule"], ["Export selected"]),
    ],
    forms: [
      form("report-filter", "Report Filter Form", "Generate operational reports with school-ready filters.", ["Date range", "Term", "Academic year", "Class/stream", "Module", "Format"], ["Export PDF", "Export Excel", "Print"]),
    ],
    printOutputs: ["Fee collection report", "Attendance report", "Audit trail report", "Backup report"],
  }),
  blueprint({
    id: "universal-approvals",
    title: "Universal Approval Center",
    moduleCode: "universal_approvals",
    commandQuestion: "Which cross-module approval is delaying school operations?",
    roleFocus: "One approval inbox for fee waivers, reversals, admissions, procurement, leave, events, trips, report cards, SMS, and permissions.",
    urgentActions: ["Approve", "Reject", "Return for Correction", "Escalate", "Assign Reviewer"],
    queues: [
      queue("approvals.universal", "Cross-module approvals", "Approver", ["View", "Approve", "Reject", "Return", "Escalate"], "Submitted -> Under Review -> Approved -> Executed -> Archived", "APPROVAL_DECISION_RECORDED"),
    ],
    tables: [
      table("approvals.inbox", "Approval inbox table", ["Approval Type", "Requested By", "Module", "Priority", "Due Date", "Status"], ["View", "Approve", "Reject", "View Audit"], ["Approve selected", "Assign selected"]),
    ],
    forms: [
      form("approval-decision", "Approval Decision Modal", "Apply a governed decision with comments, notifications, and audit trail.", ["Decision", "Comment", "Effective date", "Notify requester", "Attachment"], ["Approve", "Reject", "Return", "Escalate"]),
    ],
    printOutputs: ["Approval register", "Decision letter", "Audit trail"],
  }),
];

export function getExtremeErpBlueprint(workspaceId: string) {
  return extremeErpBlueprints.find((blueprintItem) => blueprintItem.id === workspaceId);
}

export function isExtremeErpWorkspaceId(workspaceId: string): workspaceId is ExtremeErpWorkspaceId {
  return EXTREME_ERP_REQUIRED_WORKSPACES.includes(workspaceId as ExtremeErpWorkspaceId);
}
