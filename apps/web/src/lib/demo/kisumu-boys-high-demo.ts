import { resolveCapabilityEnforcement } from "@/lib/capability-engine/school-capability-engine";
import {
  createDashboardCommunicationSystem,
  type DashboardEvent,
  type DashboardEventType,
  type DashboardNotification,
  type WidgetStateRecord,
} from "@/lib/dashboard-communication/dashboard-communication-system";

export type KisumuBoysDashboardRole =
  | "principal"
  | "deputy-principal"
  | "secretary"
  | "accountant"
  | "teacher"
  | "class-teacher"
  | "grade-master"
  | "hod"
  | "dean-academics"
  | "exams-manager"
  | "discipline-master"
  | "guidance-counselling"
  | "nurse"
  | "boarding-master"
  | "security-officer"
  | "transport-manager"
  | "storekeeper"
  | "librarian"
  | "laboratory-technician"
  | "admissions"
  | "parent"
  | "student"
  | "superadmin"
  | "system-monitor";

type DemoPayload = Record<string, unknown> & {
  title: string;
  body: string;
  auditId: string;
  targetDashboards: KisumuBoysDashboardRole[];
  queue: string;
  action: string;
};

export interface KisumuBoysDependencyLoop {
  label: string;
  eventId: string;
  eventType: DashboardEventType;
  notificationTitle: string;
  targetDashboards: KisumuBoysDashboardRole[];
  widgetIdByDashboard: Record<string, string>;
}

interface DemoRecord {
  id: string;
  label: string;
  status: string;
  owner: string;
}

export interface KisumuBoysDemoScenario {
  tenant: {
    tenantId: "kisumu-boys";
    schoolName: "Kisumu Boys High";
    county: "Kisumu";
    academicTerm: "Term 2 2026";
  };
  dashboards: KisumuBoysDashboardRole[];
  records: {
    students: DemoRecord[];
    staff: DemoRecord[];
    feePayments: DemoRecord[];
    attendanceMarks: DemoRecord[];
    clinicVisits: DemoRecord[];
    medicineStock: DemoRecord[];
    visitorLogs: DemoRecord[];
    libraryLoans: DemoRecord[];
    inventoryMovements: DemoRecord[];
    assets: DemoRecord[];
    boardingRollCalls: DemoRecord[];
    transportTrips: DemoRecord[];
    disciplineCases: DemoRecord[];
    admissions: DemoRecord[];
    examBatches: DemoRecord[];
  };
  events: DashboardEvent<DemoPayload>[];
}

export interface KisumuBoysReadinessScore {
  score: number;
  missing: string[];
  dashboardCount: number;
  eventCount: number;
  widgetCount: number;
  queueCount: number;
}

const tenant = {
  tenantId: "kisumu-boys",
  schoolName: "Kisumu Boys High",
  county: "Kisumu",
  academicTerm: "Term 2 2026",
} as const;

const kisumuBoysSlugAliases = new Set([
  "",
  "kisumu-boys",
  "kisumu-boys-high",
  "kisumu-boys-high-school",
  "kb-high",
  "kbh",
]);

export function shouldUseKisumuBoysDemoTenant(tenantSlug?: string | null) {
  return kisumuBoysSlugAliases.has((tenantSlug ?? "").trim().toLowerCase());
}

export const kisumuBoysDashboardRoles: KisumuBoysDashboardRole[] = [
  "principal",
  "deputy-principal",
  "secretary",
  "accountant",
  "teacher",
  "class-teacher",
  "grade-master",
  "hod",
  "dean-academics",
  "exams-manager",
  "discipline-master",
  "guidance-counselling",
  "nurse",
  "boarding-master",
  "security-officer",
  "transport-manager",
  "storekeeper",
  "librarian",
  "laboratory-technician",
  "admissions",
  "parent",
  "student",
  "superadmin",
  "system-monitor",
];

function demoRecords(prefix: string, labels: string[], minimumCount = 24): DemoRecord[] {
  const expandedLabels = [...labels];

  for (let index = labels.length; index < minimumCount; index += 1) {
    expandedLabels.push(`${prefix.toUpperCase()} workload sample ${index + 1} - KB High operational record`);
  }

  return expandedLabels.map((label, index) => ({
    id: `${prefix}-${String(index + 1).padStart(2, "0")}`,
    label,
    status: index % 5 === 0 ? "urgent" : index % 3 === 0 ? "pending" : "active",
    owner: ["Principal office", "Deputy office", "Front office", "Department owner"][index % 4],
  }));
}

const records: KisumuBoysDemoScenario["records"] = {
  students: demoRecords("student", [
    "KBH/2026/001 - Brian Otieno - Form 2 North",
    "KBH/2026/002 - Malik Omondi - Form 1 East",
    "KBH/2026/003 - Alvin Ochieng - Form 3 West",
    "KBH/2026/004 - Steve Odhiambo - Form 4 South",
    "KBH/2026/005 - Adrian Onyango - Form 2 South",
    "KBH/2026/006 - Ian Ouma - Form 1 North",
    "KBH/2026/007 - Calvin Were - Form 3 East",
    "KBH/2026/008 - Lewis Oketch - Form 4 West",
    "KBH/2026/009 - Victor Mboya - Form 2 East",
    "KBH/2026/010 - Ezra Achieng - Form 1 South",
    "KBH/2026/011 - Mark Agutu - Form 3 North",
    "KBH/2026/012 - Noel Otieno - Form 4 East",
  ]),
  staff: demoRecords("staff", [
    "Dr. Achieng - Principal",
    "Mr. Onyango - Deputy Principal",
    "Ms. Njeri - Secretary",
    "Mr. Oduor - Accountant",
    "Mrs. Atieno - Nurse",
    "Mr. Wekesa - Transport Manager",
    "Mr. Omari - Security Lead",
    "Ms. Kilonzo - Librarian",
    "Mr. Biko - Storekeeper",
    "Mrs. Karimi - Dean of Academics",
  ]),
  feePayments: demoRecords("fee", [
    "M-Pesa KSH 18,500 from Parent Akinyi for KBH/2026/001",
    "Cash KSH 7,000 from Parent Otieno for KBH/2026/002",
    "Bank deposit KSH 42,000 for Form 4 boarding fee",
    "Bursary credit KSH 12,000 awaiting approval",
    "Partial payment KSH 5,500 with SMS receipt pending",
    "Overpayment KSH 1,800 flagged for credit",
    "Refund request KSH 2,400 awaiting principal approval",
    "M-Pesa callback failed for transaction RQ92KBY",
  ]),
  attendanceMarks: demoRecords("attendance", [
    "Form 2 North marked present 42/45",
    "Form 1 East marked present 39/41",
    "Form 3 West late arrivals 6",
    "Form 4 South absent learners 4",
    "Teacher movement check for Science block",
    "Lesson attendance synced for Mathematics",
    "Parent SMS queued for chronic absentee",
    "Deputy follow-up assigned for missing student",
    "Class Teacher absence reason captured",
    "System monitor confirms attendance projection update",
  ]),
  clinicVisits: demoRecords("clinic", [
    "Brian Otieno fever case logged",
    "Adrian Onyango asthma follow-up",
    "Noel Otieno football injury referral",
    "Ian Ouma headache treated and returned to class",
    "Victor Mboya parent medical SMS sent",
    "Calvin Were boarding master notified after clinic visit",
  ]),
  medicineStock: demoRecords("medicine", [
    "Paracetamol tablets - 120 remaining",
    "ORS sachets - 44 remaining",
    "Inhaler stock - 3 remaining low-stock warning",
    "Bandages - 28 rolls",
    "Antiseptic 500ml - expires 2026-07-01",
    "Thermometer sleeves - reorder suggested",
  ]),
  visitorLogs: demoRecords("visitor", [
    "Mary Otieno checked in for fee inquiry",
    "Peter Akinyi returning visitor matched by phone",
    "Supplier vehicle KDL 314K checked in",
    "Parent meeting visitor slip printed",
    "Overstayed visitor alert at main gate",
    "Blocklisted visitor attempt rejected",
  ]),
  libraryLoans: demoRecords("library", [
    "Scan issue: Chemistry Form 3 to KBH/2026/003",
    "Scan return: Fasihi Simulizi from KBH/2026/008",
    "Overdue: Biology Practical Guide for KBH/2026/009",
    "Lost book fine applied for KBH/2026/005",
    "Damaged atlas marked for repair",
    "Bulk barcode labels generated for 200 books",
  ]),
  inventoryMovements: demoRecords("stock", [
    "Chalk issued to Humanities department",
    "Printer paper issued to Secretary office",
    "Toner low-stock alert",
    "Lab gloves issued to Chemistry laboratory",
    "Mattress assigned to Dorm B",
    "Cleaning supplies issued to Boarding",
    "Sports kits issued to Games master",
    "High-value projector movement requires approval",
  ]),
  assets: demoRecords("asset", [
    "Projector PRJ-004 assigned to Science block",
    "Laptop LAP-012 issued to HOD Sciences",
    "Router RTR-003 under repair",
    "Camera CAM-002 assigned to Media club",
    "Tablet TAB-007 checked into ICT lab",
    "Printer PRT-009 toner replacement requested",
    "Lab microscope MIC-011 maintenance due",
    "Dorm mattress MAT-099 movement logged",
  ]),
  boardingRollCalls: demoRecords("boarding", [
    "Morning roll call Dorm A complete",
    "Evening roll call Dorm B missing one learner",
    "Exeat request for KBH/2026/004 awaiting approval",
    "Dorm supplies request created for cleaning materials",
  ]),
  transportTrips: demoRecords("transport", [
    "Route A bus departed 6:12 AM",
    "Route B bus delayed by traffic",
    "Route C vehicle maintenance due",
    "Fuel usage anomaly for KBH Bus 03",
    "Parent alert sent for route change",
  ]),
  disciplineCases: demoRecords("discipline", [
    "Teacher created lateness case for KBH/2026/007",
    "Class teacher review pending for bullying report",
    "Deputy approval required for suspension recommendation",
    "Counsellor referral linked to repeat case",
    "Security notified for serious gate incident",
  ]),
  admissions: demoRecords("admission", [
    "Inquiry captured for Form 1 2026",
    "Application documents verified for new learner",
    "Interview scheduled and SMS sent",
    "Admission decision ready for principal review",
    "Admission letter and first invoice generated",
  ]),
  examBatches: demoRecords("exam", [
    "Form 2 Midterm marks entry 82% complete",
    "Mathematics missing marks alert",
    "Draft report card batch generated",
    "Dean moderation queue ready",
    "Principal academic overview refreshed",
  ]),
};

function widgetId(role: KisumuBoysDashboardRole, key: string) {
  return `${role}.${key}`;
}

function createLoop({
  label,
  eventId,
  eventType,
  notificationTitle,
  sourceModule,
  entityId,
  action,
  queue,
  targetDashboards,
}: {
  label: string;
  eventId: string;
  eventType: DashboardEventType;
  notificationTitle: string;
  sourceModule: string;
  entityId: string;
  action: string;
  queue: string;
  targetDashboards: KisumuBoysDashboardRole[];
}): { loop: KisumuBoysDependencyLoop; event: DashboardEvent<DemoPayload> } {
  const uniqueTargets = Array.from(new Set<KisumuBoysDashboardRole>(["principal", ...targetDashboards]));
  const widgetKey = `${eventId}.live`;

  return {
    loop: {
      label,
      eventId,
      eventType,
      notificationTitle,
      targetDashboards: uniqueTargets,
      widgetIdByDashboard: Object.fromEntries(uniqueTargets.map((role) => [role, widgetId(role, widgetKey)])),
    },
    event: {
      id: eventId,
      type: eventType,
      tenantId: tenant.tenantId,
      sourceModule,
      entityId,
      occurredAt: "2026-05-27T06:45:00.000+03:00",
      payload: {
        title: notificationTitle,
        body: label,
        auditId: `audit.kisumu-boys.${eventId}`,
        targetDashboards: uniqueTargets,
        queue,
        action,
      },
    },
  };
}

const loopDefinitions = [
  createLoop({
    label: "Fee payment recorded and ledger projection updated",
    eventId: "kb-loop-fee-payment",
    eventType: "FEE_PAYMENT_COMPLETED",
    notificationTitle: "Fee payment updated across offices",
    sourceModule: "finance",
    entityId: "receipt-kbh-001",
    action: "Record payment, print receipt, send parent SMS",
    queue: "Fee collection and exceptions",
    targetDashboards: ["accountant", "parent", "student", "secretary", "system-monitor"],
  }),
  createLoop({
    label: "Student marked absent and follow-up ownership assigned",
    eventId: "kb-loop-attendance-absence",
    eventType: "ATTENDANCE_UPDATED",
    notificationTitle: "Attendance absence synced",
    sourceModule: "attendance",
    entityId: "attendance-form-2-north",
    action: "Capture reason, notify parent, assign follow-up",
    queue: "Attendance intervention queue",
    targetDashboards: ["teacher", "class-teacher", "parent", "deputy-principal", "grade-master"],
  }),
  createLoop({
    label: "Medicine dispensed, stock deducted, and care notifications sent",
    eventId: "kb-loop-medicine-dispensed",
    eventType: "MEDICINE_DISPENSED",
    notificationTitle: "Clinic medicine dispensed",
    sourceModule: "clinic",
    entityId: "clinic-visit-kbh-001",
    action: "Record vitals, deduct stock, notify guardian",
    queue: "Sick-bay and medicine stock",
    targetDashboards: ["nurse", "parent", "class-teacher", "boarding-master", "system-monitor"],
  }),
  createLoop({
    label: "Visitor checked in with slip printing and office notification",
    eventId: "kb-loop-visitor-checkin",
    eventType: "VISITOR_CHECKED_IN",
    notificationTitle: "Visitor currently inside",
    sourceModule: "visitors",
    entityId: "visitor-kbh-001",
    action: "Register visitor, print pass, notify office",
    queue: "Gate visitor rush queue",
    targetDashboards: ["security-officer", "secretary", "system-monitor"],
  }),
  createLoop({
    label: "Library overdue case created with parent and learner notifications",
    eventId: "kb-loop-library-overdue",
    eventType: "LIBRARY_BOOK_OVERDUE",
    notificationTitle: "Library overdue action required",
    sourceModule: "library",
    entityId: "loan-kbh-003",
    action: "Send overdue SMS, apply fine, print notice",
    queue: "Library overdue and fines",
    targetDashboards: ["librarian", "student", "parent", "class-teacher"],
  }),
  createLoop({
    label: "Discipline case created and routed through review chain",
    eventId: "kb-loop-discipline-case",
    eventType: "DISCIPLINE_CASE_CREATED",
    notificationTitle: "Discipline case routed",
    sourceModule: "discipline",
    entityId: "discipline-kbh-001",
    action: "Investigate, notify parent, assign intervention",
    queue: "Discipline escalation queue",
    targetDashboards: [
      "teacher",
      "discipline-master",
      "parent",
      "deputy-principal",
      "guidance-counselling",
      "boarding-master",
      "security-officer",
    ],
  }),
  createLoop({
    label: "Asset issued with movement history and audit ownership",
    eventId: "kb-loop-asset-issued",
    eventType: "ASSET_ISSUED",
    notificationTitle: "Asset movement recorded",
    sourceModule: "inventory",
    entityId: "asset-prj-004",
    action: "Approve movement, print asset slip, update audit",
    queue: "Asset issue and movement approval",
    targetDashboards: ["storekeeper", "hod", "system-monitor"],
  }),
  createLoop({
    label: "Student admitted with fee assignment and parent onboarding",
    eventId: "kb-loop-student-admitted",
    eventType: "STUDENT_ADMITTED",
    notificationTitle: "New learner admitted",
    sourceModule: "admissions",
    entityId: "admission-kbh-004",
    action: "Generate admission number, first invoice, parent SMS",
    queue: "Admissions onboarding queue",
    targetDashboards: ["admissions", "accountant", "parent", "class-teacher", "secretary"],
  }),
  createLoop({
    label: "Bus route changed and parent route alerts dispatched",
    eventId: "kb-loop-bus-route-changed",
    eventType: "BUS_ROUTE_CHANGED",
    notificationTitle: "Transport route changed",
    sourceModule: "transport",
    entityId: "route-kbh-b",
    action: "Update route, alert parents, refresh trip board",
    queue: "Transport route exception queue",
    targetDashboards: ["transport-manager", "parent", "student", "secretary"],
  }),
  createLoop({
    label: "Boarding roll call missing student escalated to safety teams",
    eventId: "kb-loop-boarding-missing",
    eventType: "BOARDING_ROLL_CALL_MISSING",
    notificationTitle: "Boarding missing learner alert",
    sourceModule: "boarding",
    entityId: "rollcall-dorm-b-evening",
    action: "Escalate missing learner, notify security and parent",
    queue: "Boarding roll call exceptions",
    targetDashboards: ["boarding-master", "deputy-principal", "security-officer", "parent", "class-teacher"],
  }),
];

const supplementalEvents: DashboardEvent<DemoPayload>[] = [
  {
    id: "kb-event-exam-submitted",
    type: "EXAM_SUBMITTED",
    tenantId: tenant.tenantId,
    sourceModule: "exams",
    entityId: "exam-form-2-midterm",
    occurredAt: "2026-05-27T09:20:00.000+03:00",
    payload: {
      title: "Form 2 Midterm submitted for Dean review",
      body: "Missing marks are below threshold; integrity scan is available.",
      auditId: "audit.kisumu-boys.kb-event-exam-submitted",
      targetDashboards: ["principal", "dean-academics", "exams-manager", "hod"],
      queue: "Exam moderation and report cards",
      action: "Open review, return for correction, or send to Principal approval",
    },
  },
  {
    id: "kb-event-transport-trip",
    type: "TRANSPORT_TRIP_UPDATED",
    tenantId: tenant.tenantId,
    sourceModule: "transport",
    entityId: "trip-route-a",
    occurredAt: "2026-05-27T07:10:00.000+03:00",
    payload: {
      title: "Route A trip completed",
      body: "Route A bus arrived and parent pickup notices were reconciled.",
      auditId: "audit.kisumu-boys.kb-event-transport-trip",
      targetDashboards: ["principal", "transport-manager", "parent", "student"],
      queue: "Transport live routes",
      action: "Close trip, review delay, or send route notice",
    },
  },
  {
    id: "kb-event-stock-changed",
    type: "INVENTORY_STOCK_CHANGED",
    tenantId: tenant.tenantId,
    sourceModule: "inventory",
    entityId: "stock-toner-001",
    occurredAt: "2026-05-27T08:55:00.000+03:00",
    payload: {
      title: "Toner low-stock procurement required",
      body: "Secretary office has 1 toner remaining; approval queue opened.",
      auditId: "audit.kisumu-boys.kb-event-stock-changed",
      targetDashboards: ["principal", "storekeeper", "secretary", "system-monitor"],
      queue: "Store low-stock and procurement",
      action: "Create procurement request or issue alternative stock",
    },
  },
  {
    id: "kb-event-welfare-alert",
    type: "STUDENT_WELFARE_ALERTED",
    tenantId: tenant.tenantId,
    sourceModule: "welfare",
    entityId: "welfare-kbh-007",
    occurredAt: "2026-05-27T10:15:00.000+03:00",
    payload: {
      title: "Student welfare risk linked to attendance and discipline",
      body: "Counselling appointment suggested after repeated absenteeism.",
      auditId: "audit.kisumu-boys.kb-event-welfare-alert",
      targetDashboards: ["principal", "guidance-counselling", "class-teacher", "parent", "deputy-principal"],
      queue: "Student welfare interventions",
      action: "Schedule counselling, notify parent, or assign class teacher follow-up",
    },
  },
  {
    id: "kb-event-dean-approval",
    type: "DEAN_APPROVAL_GRANTED",
    tenantId: tenant.tenantId,
    sourceModule: "exams",
    entityId: "reportcards-form-2",
    occurredAt: "2026-05-27T11:30:00.000+03:00",
    payload: {
      title: "Dean approved report card batch for Principal",
      body: "Form 2 report card batch moved to Principal approval queue.",
      auditId: "audit.kisumu-boys.kb-event-dean-approval",
      targetDashboards: ["principal", "dean-academics", "exams-manager", "parent"],
      queue: "Principal result approval",
      action: "Approve results, return to Dean, or open audit trail",
    },
  },
  {
    id: "kb-event-exam-validation",
    type: "EXAM_VALIDATION_FAILED",
    tenantId: tenant.tenantId,
    sourceModule: "exams",
    entityId: "exam-math-form-3",
    occurredAt: "2026-05-27T12:05:00.000+03:00",
    payload: {
      title: "Math marks validation failed",
      body: "Two classes have out-of-range scores before processing.",
      auditId: "audit.kisumu-boys.kb-event-exam-validation",
      targetDashboards: ["principal", "exams-manager", "dean-academics", "hod", "system-monitor"],
      queue: "Exam data validation",
      action: "Return marks for correction or assign HOD review",
    },
  },
  {
    id: "kb-event-discipline-escalated",
    type: "DISCIPLINE_CASE_ESCALATED",
    tenantId: tenant.tenantId,
    sourceModule: "discipline",
    entityId: "discipline-kbh-002",
    occurredAt: "2026-05-27T12:20:00.000+03:00",
    payload: {
      title: "Serious discipline case escalated",
      body: "Deputy intervention and parent meeting required today.",
      auditId: "audit.kisumu-boys.kb-event-discipline-escalated",
      targetDashboards: ["principal", "deputy-principal", "discipline-master", "parent", "security-officer"],
      queue: "Serious discipline escalations",
      action: "Schedule hearing, notify parent, or assign counsellor",
    },
  },
  {
    id: "kb-event-mpesa-callback-failed",
    type: "FEE_PAYMENT_COMPLETED",
    tenantId: tenant.tenantId,
    sourceModule: "finance",
    entityId: "mpesa-rq92kby",
    occurredAt: "2026-05-27T12:35:00.000+03:00",
    payload: {
      title: "M-Pesa callback requires reconciliation",
      body: "Payment received but callback reconciliation is pending.",
      auditId: "audit.kisumu-boys.kb-event-mpesa-callback-failed",
      targetDashboards: ["principal", "accountant", "secretary", "system-monitor", "parent"],
      queue: "M-Pesa reconciliation exceptions",
      action: "Match payment, print receipt, or escalate callback failure",
    },
  },
  {
    id: "kb-event-lab-practical",
    type: "INVENTORY_STOCK_CHANGED",
    tenantId: tenant.tenantId,
    sourceModule: "inventory",
    entityId: "lab-chem-request-004",
    occurredAt: "2026-05-27T13:10:00.000+03:00",
    payload: {
      title: "Chemistry practical stock issued",
      body: "Lab gloves and reagents issued with hazard note.",
      auditId: "audit.kisumu-boys.kb-event-lab-practical",
      targetDashboards: ["principal", "laboratory-technician", "storekeeper", "hod"],
      queue: "Laboratory practical requests",
      action: "Confirm safety checklist, print issue slip, or report breakage",
    },
  },
  {
    id: "kb-event-superadmin-sync",
    type: "INVENTORY_STOCK_CHANGED",
    tenantId: tenant.tenantId,
    sourceModule: "platform",
    entityId: "tenant-health-kbh",
    occurredAt: "2026-05-27T14:00:00.000+03:00",
    payload: {
      title: "Tenant demo projections healthy",
      body: "Widget registry, SMS, M-Pesa, and event replay projections are synchronized.",
      auditId: "audit.kisumu-boys.kb-event-superadmin-sync",
      targetDashboards: ["principal", "superadmin", "system-monitor"],
      queue: "Platform reliability",
      action: "Inspect audit trail, replay event stream, or verify tenant isolation",
    },
  },
];

type RoleDemoProfile = {
  modules: string[];
  eventTypes: DashboardEventType[];
  queues: string[];
  actions: string[];
  subjects: string[];
};

const roleDemoProfiles: Record<KisumuBoysDashboardRole, RoleDemoProfile> = {
  principal: {
    modules: ["finance", "exams", "attendance", "discipline", "boarding", "transport", "clinic", "visitors"],
    eventTypes: ["REPORT_GENERATED", "DEAN_APPROVAL_GRANTED", "FEE_PAYMENT_COMPLETED", "SYSTEM_HEALTH_DEGRADED"],
    queues: ["Executive approvals", "Risk command queue", "Board reporting", "School health watch"],
    actions: ["Approve decision", "Assign deputy owner", "Generate board report", "Open audit trail"],
    subjects: ["board report pack", "principal result approval", "fee risk exception", "serious incident review"],
  },
  "deputy-principal": {
    modules: ["attendance", "discipline", "staff", "boarding"],
    eventTypes: ["ATTENDANCE_UPDATED", "DISCIPLINE_CASE_ESCALATED", "STAFF_MOVEMENT_UPDATED", "BOARDING_ROLL_CALL_MISSING"],
    queues: ["Discipline interventions", "Attendance follow-up", "Teacher movement", "Boarding safety"],
    actions: ["Investigate case", "Notify parent", "Assign duty teacher", "Escalate to principal"],
    subjects: ["late arrival pattern", "prefect report", "teacher movement gap", "missing boarder alert"],
  },
  secretary: {
    modules: ["front-office", "finance", "visitors", "communication"],
    eventTypes: ["PARENT_MEETING_BOOKED", "FEE_PAYMENT_COMPLETED", "VISITOR_CHECKED_IN", "DOCUMENT_PRINTED"],
    queues: ["Parent service desk", "Document requests", "Visitor pass desk", "Communication follow-up"],
    actions: ["Print document", "Book appointment", "Send SMS parent", "Escalate issue"],
    subjects: ["fee statement request", "transfer letter print", "parent complaint", "visitor registration"],
  },
  accountant: {
    modules: ["finance", "payments", "billing", "reports"],
    eventTypes: ["FEE_PAYMENT_COMPLETED", "MPESA_CALLBACK_FAILED", "FEE_WAIVER_REQUESTED", "REPORT_GENERATED"],
    queues: ["Fee collection", "M-Pesa reconciliation", "Waiver approvals", "Daily cash-up"],
    actions: ["Record payment", "Print receipt", "Send SMS receipt", "Request reversal approval"],
    subjects: ["partial payment", "overpayment credit", "bursary allocation", "arrears reminder"],
  },
  teacher: {
    modules: ["attendance", "academics", "discipline", "lms"],
    eventTypes: ["ATTENDANCE_UPDATED", "LMS_ASSIGNMENT_POSTED", "DISCIPLINE_CASE_CREATED", "EXAM_SUBMITTED"],
    queues: ["Lesson attendance", "Assignments", "Teacher discipline referrals", "Marks submission"],
    actions: ["Mark attendance", "Post assignment", "Create discipline case", "Submit marks"],
    subjects: ["lesson register", "homework follow-up", "class disruption", "missing marks batch"],
  },
  "class-teacher": {
    modules: ["attendance", "students", "communication", "discipline"],
    eventTypes: ["ATTENDANCE_UPDATED", "STUDENT_WELFARE_ALERTED", "PARENT_MEETING_BOOKED", "DISCIPLINE_CASE_CREATED"],
    queues: ["Class follow-ups", "Parent meetings", "Student welfare", "Class discipline review"],
    actions: ["Call guardian", "Record reason", "Book meeting", "Close follow-up"],
    subjects: ["chronic absentee", "guardian phone update", "welfare case", "repeat lateness"],
  },
  "grade-master": {
    modules: ["attendance", "academics", "discipline", "students"],
    eventTypes: ["ATTENDANCE_UPDATED", "GRADE_PROCESSING_COMPLETED", "DISCIPLINE_CASE_ESCALATED", "STUDENT_WELFARE_ALERTED"],
    queues: ["Stream attendance", "Grade performance", "Risk learners", "Teacher follow-up"],
    actions: ["Compare streams", "Assign class teacher", "Open intervention", "Generate grade report"],
    subjects: ["Form 2 North attendance", "Form 2 East performance", "risk student tracker", "teacher report gap"],
  },
  hod: {
    modules: ["academics", "exams", "staff", "laboratory"],
    eventTypes: ["GRADE_PROCESSING_COMPLETED", "EXAM_VALIDATION_FAILED", "STAFF_MOVEMENT_UPDATED", "LAB_PRACTICAL_REQUESTED"],
    queues: ["Subject performance", "Lesson plan review", "Syllabus coverage", "Department resources"],
    actions: ["Review lesson plan", "Assign teacher", "Request correction", "Approve practical"],
    subjects: ["Math weak topics", "lesson plan pending", "coverage delay", "lab practical resources"],
  },
  "dean-academics": {
    modules: ["exams", "academics", "reports", "staff"],
    eventTypes: ["EXAM_SUBMITTED", "REPORT_CARD_GENERATED", "EXAM_VALIDATION_FAILED", "DEAN_APPROVAL_GRANTED"],
    queues: ["Dean review", "Report card approval", "Integrity checks", "Teacher submissions"],
    actions: ["Approve batch", "Reject with reason", "Return for correction", "Open integrity scan"],
    subjects: ["report card batch", "grading anomaly", "missing subject data", "teacher submission delay"],
  },
  "exams-manager": {
    modules: ["exams", "academics", "reports", "communication"],
    eventTypes: ["EXAM_SUBMITTED", "GRADE_PROCESSING_COMPLETED", "REPORT_CARD_GENERATED", "EXAM_VALIDATION_FAILED"],
    queues: ["Exam builder", "Marks entry", "Grade processing", "Draft reports"],
    actions: ["Create exam", "Upload marks", "Process grades", "Send to Dean"],
    subjects: ["CAT marks upload", "draft report generation", "grade boundary setup", "missing marks validation"],
  },
  "discipline-master": {
    modules: ["discipline", "communication", "boarding", "counselling"],
    eventTypes: ["DISCIPLINE_CASE_CREATED", "DISCIPLINE_CASE_ESCALATED", "COUNSELLING_REFERRAL_CREATED", "PARENT_MEETING_BOOKED"],
    queues: ["Investigation queue", "Parent hearings", "Repeat cases", "Counsellor referrals"],
    actions: ["Investigate case", "Attach evidence", "Notify parent", "Close discipline case"],
    subjects: ["bullying report", "repeat lateness", "hearing letter", "counsellor referral"],
  },
  "guidance-counselling": {
    modules: ["counselling", "students", "discipline", "boarding"],
    eventTypes: ["COUNSELLING_REFERRAL_CREATED", "STUDENT_WELFARE_ALERTED", "DISCIPLINE_CASE_ESCALATED", "PARENT_MEETING_BOOKED"],
    queues: ["Counselling referrals", "Session follow-up", "Parent meeting", "Wellness risk"],
    actions: ["Schedule session", "Record notes", "Notify guardian", "Escalate risk"],
    subjects: ["emotional risk", "academic stress", "discipline referral", "boarding wellness"],
  },
  nurse: {
    modules: ["clinic", "inventory", "communication", "boarding"],
    eventTypes: ["MEDICINE_DISPENSED", "MEDICAL_REFERRAL_CREATED", "INVENTORY_STOCK_CHANGED", "STUDENT_WELFARE_ALERTED"],
    queues: ["Sick-bay visits", "Medicine stock", "Referrals", "Guardian notifications"],
    actions: ["Record vitals", "Dispense medicine", "Print medical slip", "SMS guardian"],
    subjects: ["fever case", "medicine reorder", "hospital referral", "boarding clinic alert"],
  },
  "boarding-master": {
    modules: ["boarding", "clinic", "discipline", "inventory"],
    eventTypes: ["BOARDING_ROLL_CALL_MISSING", "HOSTEL_EXEAT_REQUESTED", "MEDICAL_REFERRAL_CREATED", "STOCK_ISSUE_RECORDED"],
    queues: ["Dorm roll call", "Exeat requests", "Dorm supplies", "Boarding incidents"],
    actions: ["Confirm roll call", "Approve exeat", "Notify parent", "Request supplies"],
    subjects: ["Dorm B missing student", "leave-out approval", "mattress issue", "sick boarder referral"],
  },
  "security-officer": {
    modules: ["visitors", "security", "boarding", "communication"],
    eventTypes: ["VISITOR_CHECKED_IN", "VISITOR_EXIT_RECORDED", "BOARDING_ROLL_CALL_MISSING", "SYSTEM_HEALTH_DEGRADED"],
    queues: ["Gate check-in", "Visitor checkout", "Overstay alerts", "Emergency list"],
    actions: ["Print visitor slip", "Mark exited", "Notify office", "Open emergency list"],
    subjects: ["returning visitor", "overstayed visitor", "vehicle entry", "missing boarder security alert"],
  },
  "transport-manager": {
    modules: ["transport", "finance", "communication", "inventory"],
    eventTypes: ["TRANSPORT_TRIP_UPDATED", "BUS_ROUTE_CHANGED", "FEE_PAYMENT_COMPLETED", "PROCUREMENT_REQUESTED"],
    queues: ["Live trips", "Route changes", "Fuel requests", "Vehicle maintenance"],
    actions: ["Update route ETA", "Send parent alert", "Record fuel", "Schedule maintenance"],
    subjects: ["Route A delay", "fuel anomaly", "student route assignment", "bus maintenance"],
  },
  storekeeper: {
    modules: ["inventory", "procurement", "assets", "laboratory"],
    eventTypes: ["STOCK_ISSUE_RECORDED", "PROCUREMENT_REQUESTED", "ASSET_ISSUED", "LAB_PRACTICAL_REQUESTED"],
    queues: ["Stock issue desk", "Procurement", "Asset movement", "Low-stock alerts"],
    actions: ["Issue stock", "Print issue slip", "Create procurement", "Approve movement"],
    subjects: ["chalk issue", "toner low stock", "projector movement", "lab gloves request"],
  },
  librarian: {
    modules: ["library", "communication", "finance", "students"],
    eventTypes: ["LIBRARY_BOOK_ISSUED", "LIBRARY_BOOK_OVERDUE", "DOCUMENT_PRINTED", "FEE_PAYMENT_COMPLETED"],
    queues: ["Barcode issue", "Book returns", "Overdue fines", "Lost and damaged books"],
    actions: ["Scan issue slip", "Scan return", "Apply overdue fine", "Print library slip"],
    subjects: ["barcode issue", "overdue biology book", "lost book fine", "bulk barcode labels"],
  },
  "laboratory-technician": {
    modules: ["laboratory", "inventory", "assets", "academics"],
    eventTypes: ["LAB_PRACTICAL_REQUESTED", "STOCK_ISSUE_RECORDED", "ASSET_ISSUED", "SYSTEM_HEALTH_DEGRADED"],
    queues: ["Practical requests", "Chemical stock", "Breakages", "Safety warnings"],
    actions: ["Prepare lab", "Issue apparatus", "Report breakage", "Print safety sheet"],
    subjects: ["Chemistry practical", "hazard warning", "microscope breakage", "chemical reorder"],
  },
  admissions: {
    modules: ["admissions", "finance", "students", "communication"],
    eventTypes: ["ADMISSION_APPLICATION_UPDATED", "STUDENT_ADMITTED", "FEE_PAYMENT_COMPLETED", "DOCUMENT_PRINTED"],
    queues: ["Inquiries", "Document verification", "Admission decisions", "Parent onboarding"],
    actions: ["Verify documents", "Generate admission number", "Create first invoice", "Print admission letter"],
    subjects: ["new inquiry", "interview scheduling", "document gap", "admission letter"],
  },
  parent: {
    modules: ["finance", "attendance", "academics", "communication"],
    eventTypes: ["FEE_PAYMENT_COMPLETED", "ATTENDANCE_UPDATED", "REPORT_CARD_GENERATED", "PARENT_MEETING_BOOKED"],
    queues: ["Fee updates", "Attendance notices", "Report cards", "Meeting requests"],
    actions: ["View statement", "Download letter", "Acknowledge notice", "Request meeting"],
    subjects: ["fee receipt", "absence alert", "report card ready", "meeting request"],
  },
  student: {
    modules: ["academics", "library", "transport", "communication"],
    eventTypes: ["LMS_ASSIGNMENT_POSTED", "LIBRARY_BOOK_OVERDUE", "BUS_ROUTE_CHANGED", "REPORT_CARD_GENERATED"],
    queues: ["Assignments", "Library notices", "Transport updates", "Academic progress"],
    actions: ["Open assignment", "Renew library book", "View route alert", "Download report"],
    subjects: ["new assignment", "overdue book", "route change", "exam result"],
  },
  superadmin: {
    modules: ["platform", "billing", "sms", "module-access"],
    eventTypes: ["MODULE_ENABLED", "USER_ROLE_CHANGED", "SMS_DELIVERY_FAILED", "BACKUP_COMPLETED"],
    queues: ["Tenant onboarding", "Module entitlements", "SMS provider", "Backups"],
    actions: ["Enable module", "Audit role change", "Retry SMS provider", "Verify backup"],
    subjects: ["module assignment", "role policy update", "SMS provider issue", "backup verification"],
  },
  "system-monitor": {
    modules: ["platform", "events", "sms", "payments"],
    eventTypes: ["SYSTEM_HEALTH_DEGRADED", "SMS_DELIVERY_FAILED", "MPESA_CALLBACK_FAILED", "BACKUP_COMPLETED"],
    queues: ["System health", "Failed jobs", "M-Pesa callbacks", "Event replay"],
    actions: ["Open system logs", "Retry failed job", "Replay event", "Escalate incident"],
    subjects: ["API health warning", "failed SMS", "M-Pesa callback", "backup complete"],
  },
};

function generatedRoleEvents(): DashboardEvent<DemoPayload>[] {
  return Object.entries(roleDemoProfiles).flatMap(([role, profile]) =>
    Array.from({ length: 8 }, (_, index) => {
      const dashboardRole = role as KisumuBoysDashboardRole;
      const eventType = profile.eventTypes[index % profile.eventTypes.length];
      const sourceModule = profile.modules[index % profile.modules.length];
      const queue = profile.queues[index % profile.queues.length];
      const action = profile.actions[index % profile.actions.length];
      const subject = profile.subjects[index % profile.subjects.length];
      const id = `kb-density-${role}-${String(index + 1).padStart(2, "0")}`;
      const targetDashboards = Array.from(new Set<KisumuBoysDashboardRole>(["principal", dashboardRole]));

      return {
        id,
        type: eventType,
        tenantId: tenant.tenantId,
        sourceModule,
        entityId: `${sourceModule}-${role}-${index + 1}`,
        occurredAt: `2026-05-27T${String(6 + (index % 10)).padStart(2, "0")}:${String((index * 7) % 60).padStart(2, "0")}:00.000+03:00`,
        payload: {
          title: `${queue}: ${subject}`,
          body: `Kisumu Boys High ${subject} requires ${action.toLowerCase()} by ${role.replace(/-/g, " ")}.`,
          auditId: `audit.kisumu-boys.${id}`,
          targetDashboards,
          queue,
          action,
        },
      };
    }),
  );
}

export const kisumuBoysDependencyLoops = loopDefinitions.map((definition) => definition.loop);

const loopEvents = loopDefinitions.map((definition) => definition.event);

function scenarioEvents() {
  return [...loopEvents, ...supplementalEvents, ...generatedRoleEvents()];
}

export function getKisumuBoysHighDemoScenario(): KisumuBoysDemoScenario {
  return {
    tenant,
    dashboards: kisumuBoysDashboardRoles,
    records,
    events: scenarioEvents(),
  };
}

const moduleEntitlements = {
  admissions: true,
  academics: true,
  assets: true,
  attendance: true,
  billing: true,
  boarding: true,
  clinic: true,
  communication: true,
  counselling: true,
  discipline: true,
  events: true,
  exams: true,
  finance: true,
  "front-office": true,
  inventory: true,
  laboratory: true,
  library: true,
  lms: true,
  "module-access": true,
  payments: true,
  platform: true,
  procurement: true,
  security: true,
  sms: true,
  staff: true,
  students: true,
  transport: true,
  visitors: true,
  welfare: true,
} satisfies Record<string, boolean>;

function allWidgetIds() {
  const loopWidgetIds = kisumuBoysDependencyLoops.flatMap((loop) => Object.values(loop.widgetIdByDashboard));
  const supplementalWidgetIds = supplementalEvents.flatMap((event) =>
    event.payload.targetDashboards.map((role) => widgetId(role, `${event.id}.live`)),
  );

  return Array.from(new Set([...loopWidgetIds, ...supplementalWidgetIds]));
}

export function createKisumuBoysHighCommunicationHarness() {
  const scenario = getKisumuBoysHighDemoScenario();
  const notificationsByRole = new Map<KisumuBoysDashboardRole, DashboardNotification[]>();
  const handledEventIds: string[] = [];
  const system = createDashboardCommunicationSystem({
    moduleEntitlements,
    rolePermissions: ["demo:read"],
    enforcement: resolveCapabilityEnforcement({
      tenantLifecycle: "ACTIVE",
      billingState: "PAID",
    }),
  });

  for (const role of scenario.dashboards) {
    notificationsByRole.set(role, []);
    system.notificationChannel.subscribe(`role:${role}`, (notification) => {
      notificationsByRole.get(role)?.push(notification);
    });
  }

  for (const event of scenario.events) {
    const outputKey = `${event.type.toLowerCase()}-${event.entityId}`;
    system.moduleOutputRegistry.registerOutput({
      moduleCode: event.sourceModule,
      outputKey,
      widgetId: `${event.sourceModule}.${outputKey}`,
      dataSource: `/demo/kisumu-boys/${event.sourceModule}/${event.entityId}`,
      eventTypes: [event.type],
    });

    for (const role of event.payload.targetDashboards) {
      const id = widgetId(role, `${event.id}.live`);

      system.registerWidgetSubscriber({
        widget: {
          id,
          moduleCode: event.sourceModule,
          hasData: true,
          requiredPermission: "demo:read",
        },
        eventTypes: [event.type],
        onEvent: (incomingEvent) => {
          if (incomingEvent.id !== event.id || incomingEvent.tenantId !== tenant.tenantId) {
            return;
          }

          handledEventIds.push(incomingEvent.id);
          system.widgetStateStore.setWidgetState(id, {
            state: "ACTIVE",
            message: String(incomingEvent.payload.body ?? incomingEvent.payload.title),
            lastEventId: incomingEvent.id,
          });
        },
      });
    }
  }

  function emit(event: DashboardEvent<DemoPayload>) {
    system.eventBus.emit(event);
    system.notificationChannel.publish({
      id: `notification-${event.id}`,
      eventType: event.type,
      title: event.payload.title,
      body: event.payload.body,
      tone: event.type.includes("FAILED") || event.type.includes("MISSING") ? "critical" : "warning",
      targetChannels: event.payload.targetDashboards.map((role) => `role:${role}`),
      createdAt: event.occurredAt,
    });
  }

  return {
    scenario,
    emit,
    emitAll() {
      for (const event of scenario.events) {
        emit(event);
      }
    },
    getWidgetState(widgetIdValue: string): WidgetStateRecord | null {
      return system.widgetStateStore.getWidgetState(widgetIdValue);
    },
    getNotificationsForRole(role: KisumuBoysDashboardRole) {
      return notificationsByRole.get(role) ?? [];
    },
    getHandledEventIds() {
      return [...handledEventIds];
    },
    getWidgetIds: allWidgetIds,
  };
}

export function getKisumuBoysRoleFeed(role: string) {
  const scenario = getKisumuBoysHighDemoScenario();
  const dashboardRole = role as KisumuBoysDashboardRole;

  return scenario.events
    .filter((event) => event.payload.targetDashboards.includes(dashboardRole))
    .map((event) => ({
      id: event.id,
      title: event.payload.title,
      body: event.payload.body,
      queue: event.payload.queue,
      action: event.payload.action,
      eventType: event.type,
      auditId: event.payload.auditId,
    }));
}

export function scoreKisumuBoysHighDemoReadiness(): KisumuBoysReadinessScore {
  const scenario = getKisumuBoysHighDemoScenario();
  const requiredRecordGroups = Object.entries(scenario.records);
  const missing: string[] = [];
  const eventTypes = new Set(scenario.events.map((event) => event.type));

  for (const [key, values] of requiredRecordGroups) {
    if (values.length === 0) {
      missing.push(`missing records.${key}`);
    }
  }

  for (const loop of kisumuBoysDependencyLoops) {
    if (!eventTypes.has(loop.eventType)) {
      missing.push(`missing ${loop.eventType}`);
    }

    for (const role of loop.targetDashboards) {
      if (!loop.widgetIdByDashboard[role]) {
        missing.push(`missing widget for ${loop.label} -> ${role}`);
      }
    }
  }

  const widgetCount = allWidgetIds().length;
  const queueCount = new Set(scenario.events.map((event) => event.payload.queue)).size + scenario.dashboards.length;
  const checks =
    requiredRecordGroups.length
    + kisumuBoysDependencyLoops.length
    + scenario.dashboards.length
    + scenario.events.length;
  const score = missing.length === 0 ? 100 : Math.max(0, Math.round(((checks - missing.length) / checks) * 100));

  return {
    score,
    missing,
    dashboardCount: scenario.dashboards.length,
    eventCount: scenario.events.length,
    widgetCount,
    queueCount,
  };
}
