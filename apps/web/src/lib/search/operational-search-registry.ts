import type { SearchEntityType } from "@/lib/search/search-access-policy";

export type OperationalSearchAction = {
  label: string;
  href: string;
  capability?: string;
  auditEvent: string;
};

export type OperationalSearchRecord = {
  id: string;
  type: SearchEntityType;
  typeLabel: string;
  title: string;
  detail: string;
  keywords: string;
  scopeTags: string[];
  actions: OperationalSearchAction[];
};

const action = (label: string, href: string, auditEvent: string, capability?: string): OperationalSearchAction => ({
  label,
  href,
  auditEvent,
  capability,
});

export const operationalSearchRegistry: OperationalSearchRecord[] = [
  {
    id: "student-brian-otieno",
    type: "student",
    typeLabel: "Student",
    title: "Brian Otieno",
    detail: "Admission No: MYS/2026/001",
    keywords: "brian otieno admission mys/2026/001 grade 7 east blue parent phone 07XXXXXXXX fee balance attendance discipline academic report",
    scopeTags: ["school-wide", "executive", "operations", "front-office", "finance", "teacher-assigned", "class-teacher-owned", "grade-owned", "academic-approval", "exams-office", "own-child", "clinic-permitted", "counselling-permitted", "discipline-permitted", "boarding", "transport", "admissions"],
    actions: [
      action("View Profile", "/students/MYS-2026-001", "SEARCH_STUDENT_PROFILE_OPENED", "students:view"),
      action("View Fee Balance", "/finance?student=MYS-2026-001", "SEARCH_STUDENT_FEE_BALANCE_OPENED", "finance:view"),
      action("Record Payment", "/finance?student=MYS-2026-001&action=record-payment", "SEARCH_PAYMENT_RECORD_STARTED", "finance:create-payment"),
      action("Mark Attendance", "/students?student=MYS-2026-001&action=attendance", "SEARCH_ATTENDANCE_STARTED", "attendance:mark"),
      action("Add Discipline Case", "/discipline?student=MYS-2026-001&action=new-case", "SEARCH_DISCIPLINE_CASE_STARTED", "discipline:create"),
      action("Send Parent SMS", "/communication?student=MYS-2026-001&action=sms", "SEARCH_PARENT_SMS_STARTED", "communication:send-sms"),
      action("View Academic Report", "/reports?student=MYS-2026-001&type=academic", "SEARCH_ACADEMIC_REPORT_OPENED", "academics:view"),
    ],
  },
  {
    id: "parent-brian-guardian",
    type: "parent",
    typeLabel: "Parent",
    title: "Brian Otieno guardian",
    detail: "Parent Phone: 07XXXXXXXX",
    keywords: "parent guardian phone 07XXXXXXXX brian otieno children fee statement communication history sms",
    scopeTags: ["school-wide", "executive", "operations", "front-office", "finance", "teacher-assigned", "class-teacher-owned", "grade-owned", "own-child", "clinic-permitted", "counselling-permitted", "discipline-permitted", "boarding", "transport", "admissions"],
    actions: [
      action("View Children", "/students?parent=07XXXXXXXX", "SEARCH_PARENT_CHILDREN_OPENED", "students:view"),
      action("Send SMS", "/communication?parent=07XXXXXXXX&action=sms", "SEARCH_PARENT_SMS_STARTED", "communication:send-sms"),
      action("View Fee Statement", "/finance?parent=07XXXXXXXX", "SEARCH_PARENT_FEE_STATEMENT_OPENED", "finance:view"),
      action("View Communication History", "/communication?parent=07XXXXXXXX&view=history", "SEARCH_PARENT_COMMUNICATION_OPENED", "communication:view"),
    ],
  },
  {
    id: "receipt-qex7abc123",
    type: "receipt",
    typeLabel: "Receipt",
    title: "M-Pesa QEX7ABC123",
    detail: "Fee receipt - KES 18,500",
    keywords: "mpesa qex7abc123 receipt fee payment finance reverse print send parent",
    scopeTags: ["school-wide", "executive", "front-office", "finance", "own-child"],
    actions: [
      action("View Receipt", "/finance?receipt=QEX7ABC123", "SEARCH_RECEIPT_OPENED", "finance:view"),
      action("Print Receipt", "/document-printing?receipt=QEX7ABC123", "SEARCH_RECEIPT_PRINTED", "documents:print"),
      action("Send to Parent", "/communication?receipt=QEX7ABC123&action=send", "SEARCH_RECEIPT_SMS_STARTED", "communication:send-sms"),
      action("Reverse Payment if allowed", "/finance?receipt=QEX7ABC123&action=reverse", "SEARCH_PAYMENT_REVERSAL_STARTED", "finance:reverse-payment"),
    ],
  },
  {
    id: "mpesa-qex7abc123",
    type: "mpesa",
    typeLabel: "M-Pesa",
    title: "QEX7ABC123 callback",
    detail: "Matched payment callback - KES 18,500",
    keywords: "mpesa callback qex7abc123 matched payment reconciliation finance callback",
    scopeTags: ["school-wide", "executive", "finance"],
    actions: [
      action("Open Reconciliation", "/finance/mpesa?code=QEX7ABC123", "SEARCH_MPESA_RECONCILIATION_OPENED", "finance:reconcile"),
      action("Retry Callback Verification", "/finance/mpesa?code=QEX7ABC123&action=retry", "SEARCH_MPESA_CALLBACK_RETRY_STARTED", "finance:reconcile"),
    ],
  },
  {
    id: "visitor-otieno",
    type: "visitor",
    typeLabel: "Visitor",
    title: "Mary Otieno",
    detail: "Visitor awaiting checkout - Main Gate",
    keywords: "visitor mary otieno gate security parent checkout badge",
    scopeTags: ["school-wide", "operations", "front-office", "security"],
    actions: [
      action("Open Visitor Log", "/visitors?visitor=mary-otieno", "SEARCH_VISITOR_OPENED", "visitors:view"),
      action("Check Out Visitor", "/visitors?visitor=mary-otieno&action=checkout", "SEARCH_VISITOR_CHECKOUT_STARTED", "visitors:update"),
      action("Print Visitor Badge", "/document-printing?visitor=mary-otieno", "SEARCH_VISITOR_BADGE_PRINTED", "documents:print"),
    ],
  },
  {
    id: "book-biology-form1",
    type: "book",
    typeLabel: "Book",
    title: "Biology Form 1",
    detail: "3 overdue copies",
    keywords: "book biology library overdue borrow return scan",
    scopeTags: ["library", "self"],
    actions: [
      action("Open Book", "/library/catalogue?book=biology-form-1", "SEARCH_BOOK_OPENED", "library:view"),
      action("Scan Return", "/library/returns?book=biology-form-1", "SEARCH_LIBRARY_RETURN_STARTED", "library:return"),
    ],
  },
  {
    id: "assignment-math-fractions",
    type: "assignment",
    typeLabel: "Assignment",
    title: "Fractions homework",
    detail: "Grade 7 East - due Friday",
    keywords: "assignment homework fractions grade 7 east teacher student due submitted feedback",
    scopeTags: ["school-wide", "teacher-assigned", "class-teacher-owned", "grade-owned", "academic-approval", "self", "own-child"],
    actions: [
      action("Open Assignment", "/assignments?assignment=fractions-homework", "SEARCH_ASSIGNMENT_OPENED", "assignments:view"),
      action("Grade Assignment", "/assignments?assignment=fractions-homework&action=grade", "SEARCH_ASSIGNMENT_GRADING_STARTED", "assignments:grade"),
    ],
  },
  {
    id: "inventory-gloves",
    type: "inventory",
    typeLabel: "Inventory",
    title: "Disposable gloves",
    detail: "Low stock - 12 boxes remaining",
    keywords: "inventory gloves low stock storekeeper lab clinic canteen reorder procurement",
    scopeTags: ["school-wide", "inventory", "labs", "clinic-permitted"],
    actions: [
      action("Open Stock Card", "/inventory?item=gloves", "SEARCH_STOCK_CARD_OPENED", "inventory:view"),
      action("Request Procurement", "/procurement?action=request&item=gloves", "SEARCH_PROCUREMENT_REQUEST_STARTED", "procurement:create"),
    ],
  },
  {
    id: "bus-route-ruiru",
    type: "route",
    typeLabel: "Route",
    title: "Ruiru Morning Route",
    detail: "Bus 12 - ETA 7:18 AM",
    keywords: "bus route rui ru transport morning eta driver manifest delayed",
    scopeTags: ["school-wide", "operations", "transport", "own-child"],
    actions: [
      action("Open Route", "/transport/routes?route=ruiru-morning", "SEARCH_ROUTE_OPENED", "transport:view"),
      action("Send Route SMS", "/transport/notifications?route=ruiru-morning", "SEARCH_ROUTE_SMS_STARTED", "communication:send-sms"),
      action("Print Manifest", "/document-printing?route=ruiru-morning", "SEARCH_ROUTE_MANIFEST_PRINTED", "documents:print"),
    ],
  },
  {
    id: "admission-kamau",
    type: "admission",
    typeLabel: "Admission",
    title: "Ann Kamau application",
    detail: "Grade 7 East - missing birth certificate",
    keywords: "admission application ann kamau grade 7 east document verification birth certificate",
    scopeTags: ["school-wide", "front-office", "admissions"],
    actions: [
      action("Open Application", "/admissions?application=ann-kamau", "SEARCH_ADMISSION_OPENED", "admissions:view"),
      action("Request Missing Document", "/admissions?application=ann-kamau&action=request-document", "SEARCH_ADMISSION_DOCUMENT_REQUESTED", "communication:send-sms"),
    ],
  },
  {
    id: "discipline-case-bullying",
    type: "disciplineCase",
    typeLabel: "Discipline",
    title: "Bullying investigation",
    detail: "Grade 7 East - parent meeting pending",
    keywords: "discipline bullying incident parent meeting investigation grade 7 east",
    scopeTags: ["school-wide", "operations", "class-teacher-owned", "grade-owned", "discipline-permitted"],
    actions: [
      action("Open Case", "/discipline?case=bullying-grade-7-east", "SEARCH_DISCIPLINE_CASE_OPENED", "discipline:view"),
      action("Schedule Parent Meeting", "/discipline?case=bullying-grade-7-east&action=meeting", "SEARCH_DISCIPLINE_MEETING_STARTED", "discipline:update"),
    ],
  },
  {
    id: "health-case-fever",
    type: "healthCase",
    typeLabel: "Health",
    title: "Clinic follow-up",
    detail: "Fever follow-up due today",
    keywords: "clinic health fever medicine nurse follow-up guardian",
    scopeTags: ["school-wide", "clinic-permitted", "own-child"],
    actions: [
      action("Open Clinic Case", "/clinic?case=fever-follow-up", "SEARCH_CLINIC_CASE_OPENED", "clinic:view"),
      action("Notify Guardian", "/clinic?case=fever-follow-up&action=notify", "SEARCH_CLINIC_GUARDIAN_NOTIFY_STARTED", "communication:send-sms"),
    ],
  },
  {
    id: "platform-tenant-greenfield",
    type: "platformTenant",
    typeLabel: "Tenant",
    title: "Greenfield Academy",
    detail: "ACTIVE - modules healthy",
    keywords: "tenant school greenfield academy platform active modules health",
    scopeTags: ["platform", "platform-health"],
    actions: [
      action("Open Tenant", "/superadmin/schools?tenant=greenfield", "SEARCH_TENANT_OPENED", "platform:view"),
      action("View Audit", "/superadmin/audit?tenant=greenfield", "SEARCH_TENANT_AUDIT_OPENED", "audit:view"),
    ],
  },
  {
    id: "system-job-events-replay",
    type: "systemJob",
    typeLabel: "System Job",
    title: "Event replay worker",
    detail: "Healthy - backlog 0",
    keywords: "system job event replay worker queue monitor health backlog",
    scopeTags: ["platform-health"],
    actions: [
      action("Open Job", "/superadmin/system-health?job=event-replay", "SEARCH_SYSTEM_JOB_OPENED", "system:view"),
      action("View Logs", "/superadmin/logs?job=event-replay", "SEARCH_SYSTEM_LOGS_OPENED", "system:logs"),
    ],
  },
];
