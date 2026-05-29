"use client";

import {
  CheckCircle2,
  ClipboardList,
  Clock3,
  HeartPulse,
  Hospital,
  LayoutDashboard,
  ListChecks,
  Menu,
  MessageCircle,
  Pill,
  Printer,
  RadioTower,
  Search,
  ShieldCheck,
  Stethoscope,
  Thermometer,
  type LucideIcon,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { DashboardGreeting } from "@/components/common/dashboard-greeting";
import {
  OperationalActionButton,
  type OperationalActionContract,
  type OperationalActionHealth,
} from "@/components/operational/operational-action-button";
import {
  OperationalFormShell,
  type OperationalFormContract,
  type OperationalFormFooterAction,
  type OperationalFormValues,
} from "@/components/operational/operational-form-shell";
import { OperationalQueue, type OperationalQueueContract } from "@/components/operational/operational-queue";
import { OperationalTable, type OperationalTableContract } from "@/components/operational/operational-table";
import { PrincipalPracticalCommandCenter } from "@/components/school/principal-practical-dashboard";
import { UserManagementWorkspace } from "@/components/school/user-management-workspace";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import type { SchoolExperienceRole } from "@/lib/experiences/types";
import {
  getOperationalRoleBlueprint,
  type DocxRoleId,
  type OperationalRoleBlueprint,
} from "@/lib/operational/myshule-extreme-operating-system";
import {
  getPracticalRoleProfile,
  schoolFriendlyActionLabel,
  schoolFriendlyText,
  type PracticalRoleProfile,
} from "@/lib/school/role-practical-ui";
import {
  addSchoolRecord,
  getCurrentSchoolId,
  mergeSchoolRecordsById,
  publishSchoolOperationalEvent,
  readSchoolData,
  subscribeToSchoolDataUpdates,
  updateSchoolRecord,
} from "@/lib/school/school-operational-store";
import {
  getKisumuBoysRoleFeed,
  scoreKisumuBoysHighDemoReadiness,
  shouldUseKisumuBoysDemoTenant,
} from "@/lib/demo/kisumu-boys-high-demo";
import { getSchoolRoleGreetingName } from "@/lib/greetings/time-aware-greeting";
import { dispatchOperationalWorkflowAction } from "@/lib/workflows/operational-workflow-client";

const roleIdMap: Partial<Record<SchoolExperienceRole, DocxRoleId>> = {
  principal: "principal",
  "deputy-principal": "deputy-principal",
  secretary: "secretary",
  bursar: "accountant",
  accountant: "accountant",
  teacher: "teacher",
  "dean-academics": "dean-academics",
  "exams-manager": "exams-manager",
  hod: "hod",
  "class-teacher": "class-teacher",
  "grade-master": "grade-master",
  admin: "secretary",
  storekeeper: "storekeeper",
  librarian: "librarian",
  nurse: "nurse",
  "boarding-master": "boarding-master",
  "security-officer": "security-officer",
  "transport-manager": "transport-manager",
  "laboratory-technician": "laboratory-technician",
  "guidance-counselling": "guidance-counselling",
  "discipline-master": "discipline-master",
  admissions: "admissions",
};

type ExecutionLogItem = {
  id: string;
  label: string;
  workflow: string;
  audit: string;
  events: string[];
  status: OperationalActionHealth;
};

type RuntimeWorkspaceEntry = {
  id: string;
  workspace: string;
  title: string;
  formTitle?: string;
  actionLabel: string;
  source: "form" | "queue" | "table" | "workspace";
  values: OperationalFormValues;
  status: "Saved from form submission" | "Draft saved" | "Action dispatched";
  createdAt: string;
};

type WorkspacePanel = "queue" | "records" | "form";

type AttendanceRegisterRecord = {
  id: string;
  classId?: string;
  className: string;
  subject?: string;
  teacher?: string;
  totalLearners?: number;
  present?: number;
  absent?: number;
  status: string;
  markedAt?: string;
};

type ClinicVisitRecord = {
  id: string;
  student: string;
  className: string;
  symptoms: string;
  temperature: string;
  medicine: string;
  quantity: number;
  guardianPhone: string;
  status: "In sick bay" | "Released" | "Referred";
  parentContacted: boolean;
  time: string;
};

type MedicineStockRecord = {
  id: string;
  medicine: string;
  batch: string;
  quantity: number;
  expiry: string;
  reorderAt: number;
};

type AdmissionApplicantRecord = {
  id: string;
  applicant: string;
  className: string;
  parentPhone: string;
  documents: "Missing" | "Partial" | "Complete";
  interviewDate: string;
  status: "Inquiry" | "Application Pending" | "Documents Verified" | "Interview Scheduled" | "Approved" | "Rejected" | "Onboarded";
  admissionNumber?: string;
  parentSmsSent: boolean;
  letterPrinted: boolean;
  note: string;
};

type LibraryBookRecord = {
  id: string;
  title: string;
  barcode: string;
  isbn: string;
  author: string;
  category: string;
  shelf: string;
  status: "Available" | "Issued" | "Lost" | "Damaged";
};

type LibraryLoanRecord = {
  id: string;
  bookTitle: string;
  barcode: string;
  borrower: string;
  admissionNo: string;
  dueDate: string;
  status: "Issued" | "Returned" | "Overdue" | "Lost" | "Damaged";
  fine: number;
  parentSmsSent: boolean;
};

type StockItemRecord = {
  id: string;
  item: string;
  category: "Consumable" | "Asset" | "Food" | "Lab" | "Office";
  quantity: number;
  unit: string;
  supplier: string;
  department: string;
  unitCost: number;
  status: "OK" | "Low Stock" | "Damaged" | "Approval Required";
};

type StockMovementRecord = {
  id: string;
  item: string;
  quantity: number;
  department: string;
  receiver: string;
  movementType: "Received" | "Issued" | "Stock Take" | "Damaged/Lost";
  note: string;
  time: string;
};

type BoardingRollCallRecord = {
  id: string;
  student: string;
  className: string;
  dorm: string;
  bed: string;
  status: "Present" | "Missing" | "Sick" | "On Exeat";
  parentSmsSent: boolean;
  lastMarked: string;
};

type ExeatRequestRecord = {
  id: string;
  student: string;
  dorm: string;
  reason: string;
  parentPhone: string;
  status: "Pending" | "Approved" | "Forwarded" | "Rejected";
};

type TransportVehicleRecord = {
  id: string;
  vehicle: string;
  route: string;
  driver: string;
  status: "Active" | "Delayed" | "Maintenance" | "Offline";
  fuelLevel: number;
  maintenanceNote: string;
};

type TransportTripRecord = {
  id: string;
  student: string;
  admissionNo: string;
  route: string;
  stop: string;
  status: "Waiting" | "Picked" | "Dropped" | "Not Picked";
  parentAlertSent: boolean;
  time: string;
};

type LabInventoryRecord = {
  id: string;
  item: string;
  category: "Chemical" | "Apparatus" | "Asset";
  quantity: number;
  unit: string;
  location: string;
  status: "OK" | "Low Stock" | "Issued" | "Broken" | "Hazard";
  hazard: "Low" | "Medium" | "High";
};

type LabPracticalRequestRecord = {
  id: string;
  teacher: string;
  className: string;
  subject: string;
  practical: string;
  requestedFor: string;
  status: "Requested" | "Prepared" | "Issued" | "Completed" | "Hazard Hold";
  teacherAlerted: boolean;
};

type LabIssueRecord = {
  id: string;
  item: string;
  teacher: string;
  className: string;
  quantity: number;
  status: "Issued" | "Returned" | "Broken";
  note: string;
};

type FeeBalanceRecord = {
  id: string;
  student: string;
  admissionNo: string;
  className: string;
  balance: number;
  parentPhone: string;
  lastPayment: number;
  lastMethod: "M-Pesa" | "Cash" | "Bank" | "Bursary";
  status: "Clear" | "Balance" | "High Balance";
};

type FeePaymentRecord = {
  id: string;
  student: string;
  admissionNo: string;
  amount: number;
  method: "M-Pesa" | "Cash" | "Bank" | "Bursary";
  voteHead: string;
  term: string;
  reference: string;
  receiptNo: string;
  parentSmsSent: boolean;
  status: "Recorded" | "M-Pesa Pending" | "Confirmed" | "Reversal Requested";
};

type SecretaryVisitorRecord = {
  id: string;
  visitor: string;
  phoneOrId: string;
  visiting: string;
  reason: string;
  vehicle: string;
  status: "Waiting" | "Inside" | "Exited" | "Overstayed";
  checkInTime: string;
  slipPrinted: boolean;
};

type SecretaryInquiryRecord = {
  id: string;
  parent: string;
  student: string;
  className: string;
  phone: string;
  issue: string;
  department: "Finance" | "Admissions" | "Discipline" | "Medical" | "Academics" | "Principal";
  status: "Waiting" | "In Progress" | "Resolved" | "Escalated";
  smsSent: boolean;
};

type RoleSearchResult = {
  id: string;
  label: string;
  detail: string;
  workspace: string;
  panel: WorkspacePanel;
  actionLabel: string;
};

const workspacePanels: Array<{ id: WorkspacePanel; label: string }> = [
  { id: "queue", label: "Today's Work" },
  { id: "records", label: "Records" },
  { id: "form", label: "Form" },
];

const initialClinicVisits: ClinicVisitRecord[] = [
  {
    id: "clinic-visit-brian",
    student: "Brian Otieno",
    className: "Form 2 East",
    symptoms: "Fever and headache",
    temperature: "38.1",
    medicine: "Paracetamol",
    quantity: 2,
    guardianPhone: "0712 345 678",
    status: "In sick bay",
    parentContacted: true,
    time: "08:45",
  },
  {
    id: "clinic-visit-faith",
    student: "Faith Akinyi",
    className: "Grade 8 West",
    symptoms: "Sports ankle injury",
    temperature: "36.8",
    medicine: "Bandage",
    quantity: 1,
    guardianPhone: "0798 765 432",
    status: "Referred",
    parentContacted: true,
    time: "10:20",
  },
];

const initialMedicineStock: MedicineStockRecord[] = [
  { id: "medicine-paracetamol", medicine: "Paracetamol", batch: "PAR-0426", quantity: 18, expiry: "2026-09-30", reorderAt: 20 },
  { id: "medicine-bandage", medicine: "Bandage", batch: "BDG-018", quantity: 34, expiry: "2027-01-15", reorderAt: 15 },
  { id: "medicine-saline", medicine: "Oral Rehydration Salts", batch: "ORS-103", quantity: 12, expiry: "2026-07-10", reorderAt: 10 },
  { id: "medicine-gloves", medicine: "Disposable Gloves", batch: "GLV-221", quantity: 8, expiry: "2028-04-01", reorderAt: 25 },
];

const initialAdmissionApplicants: AdmissionApplicantRecord[] = [
  {
    id: "admission-ivy-akinyi",
    applicant: "Ivy Akinyi",
    className: "Form 1 North",
    parentPhone: "0712 889 441",
    documents: "Partial",
    interviewDate: "2026-05-29",
    status: "Application Pending",
    parentSmsSent: false,
    letterPrinted: false,
    note: "Birth certificate received, leaving certificate missing.",
  },
  {
    id: "admission-david-kiptoo",
    applicant: "David Kiptoo",
    className: "Grade 8 East",
    parentPhone: "0799 112 300",
    documents: "Complete",
    interviewDate: "2026-05-28",
    status: "Documents Verified",
    parentSmsSent: true,
    letterPrinted: false,
    note: "Interview completed, awaiting principal approval.",
  },
  {
    id: "admission-grace-njeri",
    applicant: "Grace Njeri",
    className: "Form 2 West",
    parentPhone: "0700 456 900",
    documents: "Complete",
    interviewDate: "2026-05-27",
    status: "Approved",
    admissionNumber: "KBI/2026/114",
    parentSmsSent: true,
    letterPrinted: true,
    note: "Admission letter printed and first invoice prepared.",
  },
];

const initialLibraryBooks: LibraryBookRecord[] = [
  {
    id: "library-book-bio-f1",
    title: "Biology Form 1",
    barcode: "KB-LIB-1001",
    isbn: "9789966001011",
    author: "KLB Biology Team",
    category: "Science",
    shelf: "SCI-A2",
    status: "Issued",
  },
  {
    id: "library-book-kiswahili-f2",
    title: "Kiswahili Kitovu Form 2",
    barcode: "KB-LIB-1002",
    isbn: "9789966002216",
    author: "Mwalimu Press",
    category: "Languages",
    shelf: "LAN-B4",
    status: "Available",
  },
  {
    id: "library-book-atlas",
    title: "Longhorn Secondary Atlas",
    barcode: "KB-LIB-1003",
    isbn: "9789966003312",
    author: "Longhorn Kenya",
    category: "Geography",
    shelf: "HUM-C1",
    status: "Damaged",
  },
];

const initialLibraryLoans: LibraryLoanRecord[] = [
  {
    id: "library-loan-brian",
    bookTitle: "Biology Form 1",
    barcode: "KB-LIB-1001",
    borrower: "Brian Otieno",
    admissionNo: "KBI/2026/044",
    dueDate: "2026-05-24",
    status: "Overdue",
    fine: 120,
    parentSmsSent: false,
  },
  {
    id: "library-loan-faith",
    bookTitle: "Chemistry Practical Manual",
    barcode: "KB-LIB-1044",
    borrower: "Faith Akinyi",
    admissionNo: "KBI/2025/118",
    dueDate: "2026-05-30",
    status: "Issued",
    fine: 0,
    parentSmsSent: true,
  },
];

const initialStockItems: StockItemRecord[] = [
  {
    id: "stock-marker-pens",
    item: "Whiteboard Markers",
    category: "Consumable",
    quantity: 18,
    unit: "pieces",
    supplier: "Kisumu Stationers",
    department: "Academics",
    unitCost: 120,
    status: "Low Stock",
  },
  {
    id: "stock-lab-gloves",
    item: "Lab Gloves",
    category: "Lab",
    quantity: 42,
    unit: "pairs",
    supplier: "MediLab Supplies",
    department: "Science",
    unitCost: 45,
    status: "OK",
  },
  {
    id: "stock-projector",
    item: "Epson Projector",
    category: "Asset",
    quantity: 1,
    unit: "unit",
    supplier: "Lake ICT Solutions",
    department: "ICT",
    unitCost: 84500,
    status: "Approval Required",
  },
];

const initialStockMovements: StockMovementRecord[] = [
  {
    id: "movement-marker-issued",
    item: "Whiteboard Markers",
    quantity: 12,
    department: "Mathematics",
    receiver: "Mr. Otieno",
    movementType: "Issued",
    note: "Issued for Form 2 lesson coverage.",
    time: "08:15",
  },
  {
    id: "movement-gloves-received",
    item: "Lab Gloves",
    quantity: 30,
    department: "Science",
    receiver: "Mrs. Achieng",
    movementType: "Received",
    note: "Supplier delivery confirmed.",
    time: "09:40",
  },
];

const initialBoardingRollCalls: BoardingRollCallRecord[] = [
  {
    id: "boarding-brian",
    student: "Brian Otieno",
    className: "Form 2 East",
    dorm: "Lake House",
    bed: "L-18",
    status: "Present",
    parentSmsSent: false,
    lastMarked: "06:35",
  },
  {
    id: "boarding-calvin",
    student: "Calvin Were",
    className: "Form 1 North",
    dorm: "Hill House",
    bed: "H-07",
    status: "Missing",
    parentSmsSent: true,
    lastMarked: "06:40",
  },
  {
    id: "boarding-faith",
    student: "Faith Akinyi",
    className: "Grade 8 West",
    dorm: "River House",
    bed: "R-22",
    status: "Sick",
    parentSmsSent: true,
    lastMarked: "07:10",
  },
];

const initialExeatRequests: ExeatRequestRecord[] = [
  {
    id: "exeat-brian",
    student: "Brian Otieno",
    dorm: "Lake House",
    reason: "Dental appointment",
    parentPhone: "0712 345 678",
    status: "Pending",
  },
  {
    id: "exeat-mary",
    student: "Mary Wanjiku",
    dorm: "Hill House",
    reason: "Family function",
    parentPhone: "0798 111 222",
    status: "Forwarded",
  },
];

const initialTransportVehicles: TransportVehicleRecord[] = [
  {
    id: "vehicle-kdk214f",
    vehicle: "KDK 214F",
    route: "Mamboleo Route",
    driver: "James Mwangi",
    status: "Maintenance",
    fuelLevel: 32,
    maintenanceNote: "Brake inspection due today",
  },
  {
    id: "vehicle-kcf118b",
    vehicle: "KCF 118B",
    route: "Kondele Route",
    driver: "Mercy Njeri",
    status: "Active",
    fuelLevel: 68,
    maintenanceNote: "Service due next week",
  },
];

const initialTransportTrips: TransportTripRecord[] = [
  {
    id: "trip-brian",
    student: "Brian Otieno",
    admissionNo: "KBI/2026/044",
    route: "Mamboleo Route",
    stop: "Mega City",
    status: "Picked",
    parentAlertSent: true,
    time: "06:55",
  },
  {
    id: "trip-faith",
    student: "Faith Akinyi",
    admissionNo: "KBI/2025/118",
    route: "Kondele Route",
    stop: "Kondele Stage",
    status: "Not Picked",
    parentAlertSent: false,
    time: "07:05",
  },
];

const initialLabInventory: LabInventoryRecord[] = [
  {
    id: "lab-hcl",
    item: "Hydrochloric Acid",
    category: "Chemical",
    quantity: 4,
    unit: "litres",
    location: "Chemical cabinet A",
    status: "Low Stock",
    hazard: "High",
  },
  {
    id: "lab-microscope",
    item: "Student Microscope",
    category: "Apparatus",
    quantity: 18,
    unit: "pieces",
    location: "Biology Lab",
    status: "OK",
    hazard: "Low",
  },
  {
    id: "lab-goggles",
    item: "Safety Goggles",
    category: "Apparatus",
    quantity: 12,
    unit: "pieces",
    location: "Prep room",
    status: "Low Stock",
    hazard: "Medium",
  },
];

const initialLabRequests: LabPracticalRequestRecord[] = [
  {
    id: "lab-request-titration",
    teacher: "Mr. Otieno",
    className: "Form 3 West",
    subject: "Chemistry",
    practical: "Acid-base titration",
    requestedFor: "Today 10:40",
    status: "Requested",
    teacherAlerted: false,
  },
  {
    id: "lab-request-microscope",
    teacher: "Mrs. Achieng",
    className: "Form 2 North",
    subject: "Biology",
    practical: "Onion cell microscopy",
    requestedFor: "Tomorrow 08:20",
    status: "Prepared",
    teacherAlerted: true,
  },
];

const initialLabIssues: LabIssueRecord[] = [
  {
    id: "lab-issue-goggles",
    item: "Safety Goggles",
    teacher: "Mr. Otieno",
    className: "Form 3 West",
    quantity: 10,
    status: "Issued",
    note: "For Chemistry practical",
  },
];

const initialFeeBalances: FeeBalanceRecord[] = [
  {
    id: "fee-brian",
    student: "Brian Otieno",
    admissionNo: "KBI/2026/044",
    className: "Form 2 East",
    balance: 12400,
    parentPhone: "0712 345 678",
    lastPayment: 8000,
    lastMethod: "M-Pesa",
    status: "Balance",
  },
  {
    id: "fee-faith",
    student: "Faith Akinyi",
    admissionNo: "KBI/2025/118",
    className: "Grade 8 West",
    balance: 28500,
    parentPhone: "0798 111 222",
    lastPayment: 12000,
    lastMethod: "Bank",
    status: "High Balance",
  },
  {
    id: "fee-david",
    student: "David Kiptoo",
    admissionNo: "KBI/2026/330",
    className: "Form 1 North",
    balance: 0,
    parentPhone: "0700 555 222",
    lastPayment: 24500,
    lastMethod: "Cash",
    status: "Clear",
  },
];

const initialFeePayments: FeePaymentRecord[] = [
  {
    id: "payment-qex7",
    student: "Brian Otieno",
    admissionNo: "KBI/2026/044",
    amount: 8000,
    method: "M-Pesa",
    voteHead: "Tuition",
    term: "Term 2 2026",
    reference: "QEX7ABC123",
    receiptNo: "KBI-RCPT-1044",
    parentSmsSent: true,
    status: "Confirmed",
  },
  {
    id: "payment-pending-mpesa",
    student: "Faith Akinyi",
    admissionNo: "KBI/2025/118",
    amount: 12000,
    method: "M-Pesa",
    voteHead: "Boarding",
    term: "Term 2 2026",
    reference: "QFE9PENDING",
    receiptNo: "KBI-RCPT-1045",
    parentSmsSent: false,
    status: "M-Pesa Pending",
  },
];

const initialSecretaryVisitors: SecretaryVisitorRecord[] = [
  {
    id: "visitor-otieno",
    visitor: "Mr. Otieno",
    phoneOrId: "0712 999 111",
    visiting: "Brian Otieno",
    reason: "Fee balance inquiry",
    vehicle: "KDA 118Q",
    status: "Inside",
    checkInTime: "08:12",
    slipPrinted: true,
  },
  {
    id: "visitor-njeri",
    visitor: "Grace Njeri",
    phoneOrId: "ID 22881133",
    visiting: "Admissions Office",
    reason: "Admission inquiry",
    vehicle: "",
    status: "Waiting",
    checkInTime: "09:05",
    slipPrinted: false,
  },
];

const initialSecretaryInquiries: SecretaryInquiryRecord[] = [
  {
    id: "inquiry-transfer",
    parent: "Mrs. Achieng",
    student: "Faith Akinyi",
    className: "Grade 8 West",
    phone: "0798 111 222",
    issue: "Transfer letter request",
    department: "Admissions",
    status: "Waiting",
    smsSent: false,
  },
  {
    id: "inquiry-report-card",
    parent: "Mr. Mwangi",
    student: "David Kiptoo",
    className: "Form 1 North",
    phone: "0700 555 222",
    issue: "Report card collection",
    department: "Academics",
    status: "In Progress",
    smsSent: true,
  },
];

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function runtimeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function runtimeNumber(min: number, range: number) {
  return Math.floor(min + Math.random() * range);
}

function titleize(value: string) {
  return value
    .split("-")
    .flatMap((part) => part.split(" "))
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function titleizeRole(role: SchoolExperienceRole) {
  return titleize(role);
}

function commandCenterTitle(role: SchoolExperienceRole) {
  if (role === "librarian") {
    return "Library Operations";
  }

  if (role === "storekeeper") {
    return "Inventory Operations";
  }

  if (role === "nurse") {
    return "Clinic Operations";
  }

  return titleizeRole(role);
}

function actionCapability(label: string) {
  return `CAN_${slug(label).replace(/-/g, "_").toUpperCase()}`;
}

function actionEvent(label: string) {
  return `${slug(label).replace(/-/g, "_").toUpperCase()}_REQUESTED`;
}

function uniqueStrings(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function rotateItems<T>(items: T[], start: number, count: number) {
  if (items.length === 0 || count <= 0) {
    return [];
  }

  return Array.from({ length: Math.min(count, items.length) }, (_, offset) => items[(start + offset) % items.length]);
}

type WorkspaceKind =
  | "command"
  | "approval"
  | "academic"
  | "finance"
  | "attendance"
  | "discipline"
  | "communication"
  | "students"
  | "staff"
  | "transport"
  | "inventory"
  | "library"
  | "clinic"
  | "counselling"
  | "boarding"
  | "security"
  | "laboratory"
  | "admissions"
  | "reports"
  | "settings"
  | "audit"
  | "general";

function workspaceKind(role: SchoolExperienceRole, workspace: string): WorkspaceKind {
  const value = workspace.toLowerCase();
  const dominantRoleKinds: Partial<Record<SchoolExperienceRole, WorkspaceKind>> = {
    accountant: "finance",
    bursar: "finance",
    storekeeper: "inventory",
    librarian: "library",
    nurse: "clinic",
    "boarding-master": "boarding",
    "security-officer": "security",
    "transport-manager": "transport",
    "laboratory-technician": "laboratory",
    "guidance-counselling": "counselling",
    "discipline-master": "discipline",
    admissions: "admissions",
  };

  if (/audit|logs|history|compliance|school health|system health|infrastructure|event bus|dead letters|failed jobs/.test(value)) return "audit";
  if (/setting|billing|subscription|configuration|integrations/.test(value)) return "settings";
  if (/report|analytics|export|board report/.test(value)) return "reports";
  if (/command|overview|dashboard|morning operations|daily operations|front office|teaching queue|system monitor/.test(value)) return "command";
  if (dominantRoleKinds[role]) return dominantRoleKinds[role];
  if (/escalation|escalations/.test(value)) return "approval";
  if (/approval|review|pending|moderation|dean|principal|waiver/.test(value)) return "approval";
  if (/finance|fee|payment|invoice|receipt|arrears|mpesa|m-pesa|payroll|bank|budget/.test(value)) return "finance";
  if (/attendance|late|absent|roll call|night attendance/.test(value)) return "attendance";
  if (/discipline|incident|bullying|suspension|case|prefect|behaviour|behavior/.test(value)) return "discipline";
  if (/academic|exam|marks|grade|performance|subject|syllabus|lesson|curriculum|timetable|assignment/.test(value)) return "academic";
  if (/parent|communication|message|announcement|sms|notice|notification/.test(value)) return "communication";
  if (/student|class|stream|welfare|profile|roster|children/.test(value)) return "students";
  if (/staff|teacher|hr|leave|appraisal|duty|coverage/.test(value)) return "staff";
  if (/transport|fleet|route|bus|driver|fuel|gps|trip|vehicle/.test(value)) return "transport";
  if (/inventory|stock|store|supplier|procurement|issue|receipt|low stock/.test(value)) return "inventory";
  if (/library|book|borrowing|return|fine|catalogue|catalog/.test(value)) return "library";
  if (/clinic|nurse|medicine|medical|health|referral|emergency/.test(value)) return "clinic";
  if (/counselling|counseling|wellness|mental|session/.test(value)) return "counselling";
  if (/boarding|dorm|bed|leave-out|leave out|hostel/.test(value)) return "boarding";
  if (/security|visitor|gate|exit|access/.test(value)) return "security";
  if (/lab|laboratory|chemical|apparatus|practical|breakage|safety/.test(value)) return "laboratory";
  if (/admission|registrar|inquiry|application|interview/.test(value)) return "admissions";
  return "general";
}

function workspaceWorkflow(kind: WorkspaceKind, workspace: string) {
  const name = titleize(workspace);
  const workflows: Record<WorkspaceKind, string> = {
    command: `${name} intake -> Owner assigned -> Action taken -> Verified -> Closed`,
    approval: `${name} submitted -> Review -> Decision -> Notified -> Archived`,
    academic: `${name} detected -> Teacher action -> HOD/Dean review -> Verified -> Published internally`,
    finance: `${name} captured -> Reconciled -> Approved -> Parent notified -> Ledger updated`,
    attendance: `${name} flagged -> Reason captured -> Parent notified -> Follow-up -> Closed`,
    discipline: `${name} reported -> Investigation -> Intervention -> Parent notified -> Resolved`,
    communication: `${name} drafted -> Recipient checked -> Sent -> Delivery tracked -> Archived`,
    students: `${name} identified -> Profile reviewed -> Action assigned -> Follow-up -> Closed`,
    staff: `${name} raised -> Supervisor assigned -> Staff notified -> Completed -> Logged`,
    transport: `${name} reported -> Route/vehicle action -> Parent alert -> Verified -> Closed`,
    inventory: `${name} requested -> Stock checked -> Issued/ordered -> Recorded -> Audited`,
    library: `${name} scanned -> Borrower verified -> Issued/returned -> Notice sent -> Closed`,
    clinic: `${name} logged -> Care action -> Guardian notified -> Referral/follow-up -> Closed`,
    counselling: `${name} referred -> Session scheduled -> Intervention -> Follow-up -> Closed`,
    boarding: `${name} raised -> Dorm action -> Parent/Deputy notified -> Verified -> Closed`,
    security: `${name} logged -> Verification -> Action taken -> Admin notified -> Closed`,
    laboratory: `${name} requested -> Setup/safety check -> Teacher notified -> Completed -> Logged`,
    admissions: `${name} received -> Documents checked -> Interview/decision -> Letter printed -> Archived`,
    reports: `${name} requested -> Filters applied -> Generated -> Reviewed -> Exported`,
    settings: `${name} change drafted -> Capability check -> Applied -> Verified -> Audit logged`,
    audit: `${name} event captured -> Inspection -> Finding assigned -> Remediation -> Closed`,
    general: `${name} opened -> Assigned -> Actioned -> Verified -> Archived`,
  };

  return workflows[kind];
}

function workspaceAuditEvent(workspace: string) {
  return `${slug(workspace).replace(/-/g, "_").toUpperCase()}_WORKSPACE_ACTIONED`;
}

function workspaceOwner(role: SchoolExperienceRole, kind: WorkspaceKind) {
  if (kind === "approval") return "Approver";
  if (kind === "finance") return "Finance office";
  if (kind === "attendance") return "Class owner";
  if (kind === "communication") return "Communication desk";
  if (kind === "transport") return "Transport desk";
  if (kind === "security") return "Security desk";
  if (kind === "clinic") return "Clinic desk";
  if (kind === "laboratory") return "Lab technician";
  return titleizeRole(role);
}

function workspaceActionLabels(kind: WorkspaceKind, workspace: string, blueprint: OperationalRoleBlueprint, workspaceIndex: number) {
  const byKind: Record<WorkspaceKind, string[]> = {
    command: ["Open Urgent Tasks", "Assign Owner", "Escalate Risk", "Send Update", "Print Summary", "View Details"],
    approval: ["Open Review", "Approve", "Reject", "Return for Correction", "Assign Reviewer", "View Details"],
    academic: ["Open Academic Review", "Request Correction", "Approve Batch", "Notify Teacher", "Print Academic Report", "View Details"],
    finance: ["Record Payment", "Confirm M-Pesa", "Print Receipt", "Send Fee Reminder", "Approve Waiver", "View Details"],
    attendance: ["Mark Present", "Mark Absent", "Record Reason", "Notify Parent", "Print Attendance Report", "View Details"],
    discipline: ["Record Incident", "Escalate Case", "Notify Parent", "Refer to Counsellor", "Mark Issue Solved", "View Details"],
    communication: ["Send Message", "Schedule Meeting", "Use Template", "Mark Responded", "Escalate", "View Details"],
    students: ["Open Profile", "Message Guardian", "Record Note", "Mark Concern", "Assign Follow-up", "View Details"],
    staff: ["Assign Staff Member", "Request Update", "Schedule Meeting", "Send Reminder", "Record Observation", "View Details"],
    transport: ["Assign Route", "Update ETA", "Send Parent Alert", "Report Vehicle Issue", "Schedule Maintenance", "View Details"],
    inventory: ["Receive Stock", "Issue Stock", "Create Procurement Request", "Start Stock Take", "Print Slip", "View Details"],
    library: ["Issue Book", "Return Book", "Apply Fine", "Send Overdue SMS", "Print Slip", "View Details"],
    clinic: ["Record Visit", "Dispense Medicine", "Notify Parent", "Refer to Hospital", "Print Medical Slip", "View Details"],
    counselling: ["Start Session", "Add Notes", "Escalate Emergency", "Notify Principal", "Schedule Follow-up", "View Details"],
    boarding: ["Mark Roll Call", "Approve Exeat", "Assign Bed", "Notify Parent", "Report Incident", "View Details"],
    security: ["Register Visitor", "Verify Gate Pass", "Log Vehicle", "Report Incident", "Call Admin", "Print Visitor Badge"],
    laboratory: ["Approve Practical Prep", "Add Chemical Stock", "Record Breakage", "Schedule Maintenance", "Alert Teacher", "View Details"],
    admissions: ["Add Inquiry", "Verify Documents", "Schedule Interview", "Approve Admission", "Print Admission Letter", "View Details"],
    reports: ["Generate Report", "Apply Filters", "Export PDF", "Export Excel", "Schedule Report", "View Details"],
    settings: ["Update Setting", "Test Integration", "Save Policy", "Verify Callback", "Request Approval", "View Details"],
    audit: ["Review Update", "Retry Sync", "Retry Failed Job", "Assign to Staff Member", "Mark Issue Solved", "Download Report"],
    general: ["Open Item", "Assign Owner", "Update Status", "Escalate", "Generate Report", "View Details"],
  };

  if (kind === "command") {
    return uniqueStrings([...rotateItems(blueprint.primaryActions, workspaceIndex, 4), ...byKind.command])
      .map(schoolFriendlyActionLabel)
      .slice(0, 6);
  }

  return uniqueStrings([...byKind[kind], ...rotateItems(blueprint.primaryActions, workspaceIndex, 2)])
    .map(schoolFriendlyActionLabel)
    .slice(0, 6);
}

function workspaceColumns(kind: WorkspaceKind) {
  const byKind: Record<WorkspaceKind, string[]> = {
    command: ["Priority Item", "Owner", "SLA", "Status", "Next Action"],
    approval: ["Request", "Submitted By", "Affected Person", "Priority", "Status", "Next Action"],
    academic: ["Academic Item", "Class/Stream", "Teacher", "Status", "Next Action"],
    finance: ["Account", "Amount", "Payment Ref", "Parent", "Status", "Next Action"],
    attendance: ["Student/Class", "Reason", "Last Seen", "Status", "Next Action"],
    discipline: ["Case", "Student", "Severity", "Status", "Next Action"],
    communication: ["Recipient", "Channel", "Message Type", "Status", "Next Action"],
    students: ["Student", "Admission No", "Class/Stream", "Risk", "Next Action"],
    staff: ["Staff Member", "Role", "Issue", "Status", "Next Action"],
    transport: ["Vehicle/Route", "Driver", "ETA", "Status", "Next Action"],
    inventory: ["Item", "Quantity", "Store Location", "Status", "Next Action"],
    library: ["Book/Borrower", "Admission No", "Due Date", "Status", "Next Action"],
    clinic: ["Student", "Visit Type", "Guardian", "Status", "Next Action"],
    counselling: ["Student", "Risk Level", "Referral Source", "Status", "Next Action"],
    boarding: ["Dorm/Student", "Issue", "Warden", "Status", "Next Action"],
    security: ["Visitor/Pass", "Person", "Location", "Status", "Next Action"],
    laboratory: ["Lab Item", "Teacher/Class", "Hazard/Condition", "Status", "Next Action"],
    admissions: ["Applicant", "Guardian", "Stage", "Status", "Next Action"],
    reports: ["Report", "Owner", "Period", "Status", "Next Action"],
    settings: ["Setting", "Scope", "Owner", "Status", "Next Action"],
    audit: ["Audit Item", "Actor", "Entity", "Status", "Next Action"],
    general: ["Item", "Owner", "Priority", "Status", "Next Action"],
  };

  return byKind[kind];
}

function workspaceFieldLabels(kind: WorkspaceKind) {
  const byKind: Record<WorkspaceKind, string[]> = {
    command: ["Priority item", "Assigned owner", "Action required", "Due date", "Update note"],
    approval: ["Decision", "Reason code", "Comment", "Effective date", "Notify requester"],
    academic: ["Class/Stream", "Subject", "Review decision", "Correction note", "Notify teacher"],
    finance: ["Student selector", "Amount paid", "Payment method", "Transaction code", "Parent phone"],
    attendance: ["Student/Class", "Attendance status", "Reason", "Parent notification", "Follow-up date"],
    discipline: ["Student", "Incident type", "Severity", "Action taken", "Parent notified"],
    communication: ["Recipient group", "Message type", "Message note", "Send time", "Requires acknowledgement"],
    students: ["Student", "Concern category", "Note", "Follow-up date", "Guardian notification"],
    staff: ["Staff member", "Issue type", "Action owner", "Due date", "Supervisor note"],
    transport: ["Vehicle/Route", "Driver", "ETA", "Alert message", "Parent notification"],
    inventory: ["Inventory item", "Quantity", "Store location", "Issue/receipt note", "Requester"],
    library: ["Borrower", "Book barcode", "Due date", "Fine amount", "Notice message"],
    clinic: ["Student", "Visit type", "Medicine/Referral", "Guardian phone", "Clinical note"],
    counselling: ["Student", "Session type", "Risk level", "Intervention note", "Follow-up date"],
    boarding: ["Dorm/Student", "Issue type", "Warden action", "Parent notification", "Follow-up date"],
    security: ["Visitor/Pass", "ID number", "Destination", "Action taken", "Admin notification"],
    laboratory: ["Lab session/item", "Chemical/apparatus", "Hazard level", "Action taken", "Teacher notified"],
    admissions: ["Applicant name", "Guardian phone", "Application stage", "Document status", "Decision note"],
    reports: ["Report type", "Date range", "Class/Department", "Export format", "Reviewer"],
    settings: ["Setting name", "Scope", "New value", "Reason", "Requires approval"],
    audit: ["Audit item", "Finding type", "Assigned owner", "Resolution note", "Due date"],
    general: ["Item", "Owner", "Status", "Comment", "Due date"],
  };

  return byKind[kind];
}

function workspaceFooterActions(kind: WorkspaceKind): OperationalFormFooterAction[] {
  if (kind === "finance" || kind === "communication") return ["Cancel", "Save Draft", "Submit", "Save and Send SMS", "Save and Print"];
  if (kind === "reports") return ["Cancel", "Preview", "Print", "Submit"];
  if (kind === "approval") return ["Cancel", "Save Draft", "Submit for Approval", "Print"];
  if (["admissions", "inventory", "library", "clinic", "laboratory", "security", "transport"].includes(kind)) {
    return ["Cancel", "Save Draft", "Submit", "Save and Print"];
  }

  return ["Cancel", "Save Draft", "Submit"];
}

function workspaceFilters(kind: WorkspaceKind) {
  if (kind === "finance") return ["Term", "Payment status", "Class", "Balance"];
  if (kind === "attendance") return ["Today", "Class", "Reason", "Follow-up"];
  if (kind === "transport") return ["Route", "Vehicle", "Delay", "Driver"];
  if (kind === "academic") return ["Class", "Subject", "Teacher", "Deadline"];
  if (kind === "communication") return ["Unread", "SMS status", "Parent", "Class"];
  return ["Status", "Owner", "Priority", "SLA"];
}

function workspaceRowTitles(kind: WorkspaceKind, workspace: string) {
  const byKind: Record<WorkspaceKind, string[]> = {
    command: ["Urgent school action queue", "Blocked workflow needing owner", "Daily command follow-up"],
    approval: ["Report cards awaiting approval", "Budget request pending decision", "Student transfer needs review"],
    academic: ["Grade 7 East missing marks", "Mathematics performance review", "Syllabus coverage recovery"],
    finance: ["MYS/2026/001 arrears exception", "QEX7ABC123 M-Pesa reconciliation", "Waiver request awaiting review"],
    attendance: ["Brian Otieno absent follow-up", "Grade 7 East late arrival pattern", "Form 2 North chronic absentee list"],
    discipline: ["Dormitory bullying investigation", "Repeat lateness case", "Parent discipline meeting pending"],
    communication: ["Parent SMS retry queue", "Meeting acknowledgement pending", "Class announcement draft"],
    students: ["Brian Otieno welfare follow-up", "Mary Wanjiku guardian update", "Grade 7 East risk flag"],
    staff: ["Teacher coverage gap", "Lesson plan follow-up", "Duty roster replacement"],
    transport: ["Route 4 delayed by 18 minutes", "Bus KDK 214F maintenance", "Missed pickup parent alert"],
    inventory: ["Gloves below reorder level", "Stock issue request pending", "Supplier delivery confirmation"],
    library: ["Overdue biology textbook", "Lost book follow-up", "Library card print queue"],
    clinic: ["Sick bay parent contact", "Medicine refill needed", "Referral follow-up due"],
    counselling: ["High-risk student intervention", "Teacher referral pending", "Parent meeting follow-up"],
    boarding: ["Dorm B night attendance gap", "Leave-out request pending", "Bed allocation conflict"],
    security: ["Visitor badge pending checkout", "Gate pass verification", "Vehicle log exception"],
    laboratory: ["Chemistry practical setup", "Hydrochloric acid reorder", "Microscope breakage record"],
    admissions: ["Application document gap", "Interview scheduling", "Admission letter print"],
    reports: ["Term board report draft", "Attendance export pending", "Compliance summary review"],
    settings: ["M-Pesa callback verification", "SMS sender policy", "Role permission update"],
    audit: ["Failed action review", "Permission change review", "School update retry request"],
    general: [`${workspace} task`, `${workspace} follow-up`, `${workspace} exception`],
  };

  return byKind[kind];
}

function workspaceCellValue(kind: WorkspaceKind, column: string, rowTitle: string, rowIndex: number) {
  const normalized = column.toLowerCase();

  if (/request|item|case|student\/class|academic|account|recipient|vehicle|book|applicant|report|setting|audit/.test(normalized)) {
    return rowTitle;
  }

  if (/student/.test(normalized)) return rowIndex === 0 ? "Brian Otieno" : rowIndex === 1 ? "Mary Wanjiku" : "Kevin Maina";
  if (/admission/.test(normalized)) return `MYS/2026/00${rowIndex + 1}`;
  if (/class|stream/.test(normalized)) return rowIndex === 0 ? "Grade 7 East" : rowIndex === 1 ? "Form 2 North" : "Grade 8 West";
  if (/teacher|submitted|owner|actor|reviewer/.test(normalized)) return rowIndex === 0 ? "Mr. Otieno" : rowIndex === 1 ? "Ms. Achieng" : "Deputy Office";
  if (/parent|guardian|phone/.test(normalized)) return rowIndex === 0 ? "0712345678" : "0798765432";
  if (/amount/.test(normalized)) return rowIndex === 0 ? "KSh 18,500" : rowIndex === 1 ? "KSh 7,200" : "KSh 3,450";
  if (/payment ref/.test(normalized)) return rowIndex === 1 ? "QEX7ABC123" : "Manual review";
  if (/priority|severity|risk/.test(normalized)) return rowIndex === 0 ? "High" : rowIndex === 1 ? "Medium" : "Normal";
  if (/status/.test(normalized)) return rowIndex === 0 ? "Needs action" : rowIndex === 1 ? "In progress" : "Pending owner";
  if (/next action|action/.test(normalized)) {
    const nextActionByKind: Record<WorkspaceKind, string> = {
      command: "Open Priority Queue",
      approval: "Open Review",
      academic: "Open Academic Review",
      finance: "Reconcile",
      attendance: "Record Reason",
      discipline: "Escalate Case",
      communication: "Send Message",
      students: "Open Profile",
      staff: "Assign Staff",
      transport: "Update ETA",
      inventory: "Issue Stock",
      library: "Return Book",
      clinic: "Contact Parent",
      counselling: "Start Session",
      boarding: "Notify Parent",
      security: "Verify Gate Pass",
      laboratory: "Mark Lab Ready",
      admissions: "Check Documents",
      reports: "Generate Report",
      settings: "Update Setting",
      audit: "Assign Follow-up",
      general: "Open Item",
    };

    return nextActionByKind[kind];
  }
  if (/due|date|eta|last seen|period|time/.test(normalized)) return rowIndex === 0 ? "Due today" : rowIndex === 1 ? "Tomorrow" : "This week";
  if (/driver/.test(normalized)) return rowIndex === 0 ? "James Mwangi" : "Mercy Njeri";
  if (/quantity/.test(normalized)) return rowIndex === 0 ? "12 remaining" : "4 boxes";
  if (/location/.test(normalized)) return kind === "laboratory" ? "Chemistry Lab 1" : "Main store";

  return rowIndex === 0 ? "Requires review" : "Pending update";
}

function formatKes(value: string | undefined) {
  const numericValue = Number(String(value ?? "").replace(/[^\d.]/g, ""));

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return value ?? "";
  }

  return `KSh ${numericValue.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

function runtimeCellValue(kind: WorkspaceKind, column: string, entry: RuntimeWorkspaceEntry) {
  const normalized = column.toLowerCase();
  const values = entry.values;

  if (/account|student\/class|student|request|item|case|academic|recipient|vehicle|book|applicant|report|setting|audit/.test(normalized)) {
    return values["student-selector"]
      ?? values.student
      ?? values["student/class"]
      ?? values["vehicle/route"]
      ?? values["recipient-group"]
      ?? entry.title;
  }

  if (/amount/.test(normalized)) return formatKes(values["amount-paid"] ?? values.amount);
  if (/payment ref/.test(normalized)) return values["transaction-code"] ?? "Manual review";
  if (/parent|guardian|phone/.test(normalized)) return values["parent-phone"] ?? values["guardian-phone"] ?? values["parent-notification"] ?? "";
  if (/status/.test(normalized)) return entry.status;
  if (/next action|action/.test(normalized)) return kind === "finance" ? "Reconcile" : "Open Entry";
  if (/due|date|eta|last seen|period|time/.test(normalized)) return values["follow-up-date"] ?? values["send-time"] ?? "Just now";
  if (/driver/.test(normalized)) return values.driver ?? "Assigned driver";
  if (/quantity/.test(normalized)) return values.quantity ?? values["quantity"] ?? "Entered";
  if (/location/.test(normalized)) return values["store-location"] ?? values.destination ?? "School office";

  return entry.actionLabel;
}

function isCommandWorkspace(workspace: string, index: number) {
  const normalized = workspace.trim().toLowerCase();

  return index === 0 || normalized === "command center" || normalized === "overview" || normalized === "dashboard";
}

function isDiagnosticsWorkspace(workspace: string) {
  return /audit|logs|system health|infrastructure|school updates|failed items/i.test(workspace);
}

function actionContract({
  role,
  label,
  workflowBinding,
  auditEvent,
  index = 0,
  health = "ACTIVE",
}: {
  role: SchoolExperienceRole;
  label: string;
  workflowBinding: string;
  auditEvent: string;
  index?: number;
  health?: OperationalActionHealth;
}): OperationalActionContract {
  const friendlyLabel = schoolFriendlyActionLabel(label);
  const actionSlug = slug(friendlyLabel);

  return {
    actionId: `${role}-${slug(workflowBinding)}-${actionSlug}-${index}`,
    label: friendlyLabel,
    capability: actionCapability(friendlyLabel),
    workflowBinding,
    executionHandler: `workflows.${role}.${slug(workflowBinding)}.${actionSlug}`,
    eventContract: [auditEvent, actionEvent(friendlyLabel)],
    auditEvent: `audit.${role}.${actionSlug}`,
    confirmation: /reject|reverse|suspend|delete|cancel|emergency/i.test(label) ? "REASON_REQUIRED" : "NONE",
    retryPolicy: "RETRY",
    fallbackHandler: `fallback.${role}.${actionSlug}`,
    health,
  };
}

function fieldType(field: string): OperationalFormContract["fields"][number]["type"] {
  const normalized = field.toLowerCase();

  if (normalized.includes("phone")) {
    return "tel";
  }

  if (normalized.includes("email")) {
    return "email";
  }

  if (normalized.includes("date")) {
    return "date";
  }

  if (normalized.includes("time")) {
    return "time";
  }

  if (normalized.includes("amount") || normalized.includes("score") || normalized.includes("count")) {
    return "number";
  }

  if (normalized.includes("comment") || normalized.includes("note") || normalized.includes("reason")) {
    return "textarea";
  }

  if (
    normalized.includes("status")
    || normalized.includes("type")
    || normalized.includes("class")
    || normalized.includes("stream")
    || normalized.includes("decision")
  ) {
    return "select";
  }

  return "text";
}

function formFieldDefaultValue(kind: WorkspaceKind, activeWorkspace: string, field: string, index: number) {
  const normalized = field.toLowerCase();

  if (fieldType(field) === "select") {
    return `${titleize(field)} option`;
  }

  if (index === 0) {
    return workspaceRowTitles(kind, activeWorkspace)[0] ?? "School record";
  }

  if (fieldType(field) === "date") {
    return "2026-05-28";
  }

  if (fieldType(field) === "time") {
    return "08:30";
  }

  if (fieldType(field) === "tel" || normalized.includes("phone")) {
    return "0712345678";
  }

  if (fieldType(field) === "email") {
    return "office@kisumuboys.ac.ke";
  }

  if (fieldType(field) === "number") {
    return normalized.includes("amount") ? "12000" : "1";
  }

  if (fieldType(field) === "textarea") {
    return "Captured for today's school follow-up.";
  }

  if (/transaction|reference|code/.test(normalized)) {
    return "QEX7ABC123";
  }

  if (/owner|staff|teacher|warden|driver|reviewer|requester/.test(normalized)) {
    return "Mr. Otieno";
  }

  if (/student|learner|applicant|borrower/.test(normalized)) {
    return "Brian Otieno";
  }

  return `${titleize(field)} ready`;
}

function workspaceActions(
  role: SchoolExperienceRole,
  blueprint: OperationalRoleBlueprint,
  workspace: string,
  workspaceIndex: number,
  healthById: Record<string, OperationalActionHealth>,
) {
  const kind = workspaceKind(role, workspace);
  const workflowBinding = workspaceWorkflow(kind, workspace);
  const auditEvent = workspaceAuditEvent(workspace);
  const labels = isDiagnosticsWorkspace(workspace)
    ? workspaceActionLabels("audit", workspace, blueprint, workspaceIndex)
    : workspaceActionLabels(kind, workspace, blueprint, workspaceIndex);

  return labels.slice(0, 6).map((label, index) => {
    const action = actionContract({
      role,
      label,
      workflowBinding,
      auditEvent,
      index,
    });

    return { ...action, health: healthById[action.actionId] ?? action.health };
  });
}

function urgentActionContract(
  role: SchoolExperienceRole,
  item: string,
  workspaceIndex: number,
  healthById: Record<string, OperationalActionHealth>,
) {
  const label = schoolFriendlyActionLabel(`Open ${item}`);
  const action = actionContract({
    role,
    label,
    workflowBinding: "Urgent action intake",
    auditEvent: "URGENT_ACTION_OPENED",
    index: workspaceIndex,
  });

  return { ...action, health: healthById[action.actionId] ?? action.health };
}

function toQueueContract(
  role: SchoolExperienceRole,
  blueprint: OperationalRoleBlueprint,
  healthById: Record<string, OperationalActionHealth>,
  activeWorkspace: string,
  activeWorkspaceIndex: number,
  runtimeEntries: RuntimeWorkspaceEntry[],
): OperationalQueueContract {
  const kind = workspaceKind(role, activeWorkspace);
  const workflowBinding = workspaceWorkflow(kind, activeWorkspace);
  const auditEvent = workspaceAuditEvent(activeWorkspace);
  const queueActions = workspaceActionLabels(kind, activeWorkspace, blueprint, activeWorkspaceIndex);
  const rowTitles = workspaceRowTitles(kind, activeWorkspace);

  return {
    title: `${schoolFriendlyText(activeWorkspace)} today's work`,
    description: `Only ${schoolFriendlyText(activeWorkspace.toLowerCase())} work appears here. Each item has an owner, due time, next action, and saved record.`,
    bulkActions: ["Assign selected", "Escalate selected", "Print selected", "Export selected"].map((label, index) => {
      const action = actionContract({
        role,
        label: schoolFriendlyActionLabel(label),
        workflowBinding,
        auditEvent,
        index,
      });

      return { ...action, health: healthById[action.actionId] ?? action.health };
    }),
    items: [
      ...runtimeEntries.map((entry, itemIndex) => ({
        id: entry.id,
        title: entry.title,
        owner: workspaceOwner(role, kind),
        workflow: schoolFriendlyText(workflowBinding),
        sla: entry.status === "Draft saved" ? "Draft" : "Due now",
        priority: {
          label: entry.status === "Draft saved" ? "Medium" : "High",
          tone: entry.status === "Draft saved" ? "warning" as const : "critical" as const,
        },
        auditEvent,
        actions: rotateItems(queueActions, itemIndex, 5).map((label, actionIndex) => {
          const action = actionContract({
            role,
            label: schoolFriendlyActionLabel(label),
            workflowBinding,
            auditEvent,
            index: 100 + itemIndex * 10 + actionIndex,
          });

          return { ...action, health: healthById[action.actionId] ?? action.health };
        }),
      })),
      ...rowTitles.map((title, itemIndex) => ({
        id: `${role}-${slug(activeWorkspace)}-queue-${itemIndex}`,
        title,
        owner: workspaceOwner(role, kind),
        workflow: schoolFriendlyText(workflowBinding),
        sla: itemIndex === 0 ? "Due now" : itemIndex === 1 ? "Due today" : "Due this week",
        priority: {
          label: itemIndex === 0 ? "High" : itemIndex === 1 ? "Medium" : "Normal",
          tone: itemIndex === 0 ? "critical" as const : itemIndex === 1 ? "warning" as const : "ok" as const,
        },
        auditEvent,
        actions: rotateItems(queueActions, itemIndex, 5).map((label, actionIndex) => {
          const action = actionContract({
            role,
            label: schoolFriendlyActionLabel(label),
            workflowBinding,
            auditEvent,
            index: itemIndex * 10 + actionIndex,
          });

          return { ...action, health: healthById[action.actionId] ?? action.health };
        }),
      })),
    ],
  };
}

function toTableContract(
  role: SchoolExperienceRole,
  blueprint: OperationalRoleBlueprint,
  tableIndex: number,
  activeWorkspace: string,
  runtimeEntries: RuntimeWorkspaceEntry[],
): OperationalTableContract {
  const kind = workspaceKind(role, activeWorkspace);
  const blueprintTable = blueprint.tables[tableIndex % blueprint.tables.length];
  const generatedColumns = uniqueStrings([...workspaceColumns(kind), ...(blueprintTable?.columns ?? [])])
    .map(schoolFriendlyText)
    .slice(0, 10);
  const rowTitles = workspaceRowTitles(kind, activeWorkspace);
  const rowActions = uniqueStrings([
    ...workspaceActionLabels(kind, activeWorkspace, blueprint, tableIndex),
    ...(blueprintTable?.rowActions ?? []),
  ]).map(schoolFriendlyActionLabel).slice(0, 6);
  const bulkActions = uniqueStrings(["Assign selected", "Escalate selected", "Print selected", "Export selected", ...(blueprintTable?.bulkActions ?? [])]).map(schoolFriendlyActionLabel).slice(0, 6);
  const columns = generatedColumns.map((column) => ({
    key: slug(column),
    label: column,
  }));

  return {
    title: `${schoolFriendlyText(activeWorkspace)} records`,
    description: `Focused ${schoolFriendlyText(activeWorkspace.toLowerCase())} records only. Search, filter, print, export, and open item-level actions without mixing another section.`,
    searchPlaceholder: `Search ${schoolFriendlyText(activeWorkspace.toLowerCase())}`,
    filters: workspaceFilters(kind),
    sortOptions: ["Newest", "Due soon", "Highest priority"],
    columns,
    rows: [
      ...runtimeEntries.map((entry, rowIndex) => ({
        id: entry.id,
        cells: Object.fromEntries(generatedColumns.map((column) => [slug(column), runtimeCellValue(kind, column, entry)])),
        status: {
          label: entry.status,
          tone: entry.status === "Action dispatched" ? "ok" as const : "warning" as const,
        },
        actions: rotateItems(rowActions, rowIndex, 3),
      })),
      ...rowTitles.map((title, rowIndex) => ({
        id: `${role}-${slug(activeWorkspace)}-row-${rowIndex}`,
        cells: Object.fromEntries(generatedColumns.map((column) => [slug(column), workspaceCellValue(kind, column, title, rowIndex)])),
        status: {
          label: rowIndex === 0 ? "Needs action" : rowIndex === 1 ? "In progress" : "Pending",
          tone: rowIndex === 0 ? "warning" as const : "ok" as const,
        },
        actions: rotateItems(rowActions, rowIndex, 3),
      })),
    ],
    bulkActions,
    exportLabel: "Export",
    printLabel: "Print",
  };
}

function toFormContract(
  role: SchoolExperienceRole,
  blueprint: OperationalRoleBlueprint,
  formIndex: number,
  activeWorkspace: string,
): OperationalFormContract {
  const kind = workspaceKind(role, activeWorkspace);
  const blueprintForm = blueprint.forms[formIndex % blueprint.forms.length];
  const fieldLabels = uniqueStrings([...workspaceFieldLabels(kind), ...(blueprintForm?.fields ?? [])])
    .map(schoolFriendlyText)
    .slice(0, 12);
  const workflowBinding = workspaceWorkflow(kind, activeWorkspace);

  return {
    title: `${schoolFriendlyText(activeWorkspace)} form`,
    description: `Capture a ${schoolFriendlyText(activeWorkspace.toLowerCase())} decision or update. The form stays inside this section and updates the right school records.`,
    fields: fieldLabels.map((field, index) => ({
      id: `${role}-${slug(activeWorkspace)}-${slug(field)}`,
      label: field,
      type: fieldType(field),
      value: formFieldDefaultValue(kind, activeWorkspace, field, index),
      options: fieldType(field) === "select" ? [`${titleize(field)} option`, "Needs review", "Approved", "Return for correction"] : undefined,
    })),
    footerActions: workspaceFooterActions(kind),
    auditAction: `audit.${role}.${slug(activeWorkspace)}.form`,
    workflowBinding,
    capability: "CAN_USE_OPERATIONAL_WORKFLOW",
  };
}

function PracticalSummaryGrid({ profile }: { profile: PracticalRoleProfile }) {
  return (
    <div className="grid shrink-0 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {profile.summaryCards.map((card) => (
        <Card key={card.label} className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-muted">{card.label}</p>
              <p className="mt-2 text-2xl font-black text-foreground">{card.value}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-muted">{card.helper}</p>
            </div>
            <StatusPill label={card.tone === "critical" ? "Urgent" : card.tone === "warning" ? "Check" : "OK"} tone={card.tone ?? "ok"} compact />
          </div>
          <p className="mt-3 rounded-xl border border-border bg-surface-muted px-3 py-2 text-[11px] font-semibold text-muted">
            {card.source}
          </p>
        </Card>
      ))}
    </div>
  );
}

function PracticalAlertsPanel({ profile }: { profile: PracticalRoleProfile }) {
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="eyebrow">Urgent alerts</p>
          <h3 className="mt-1 text-base font-black text-foreground">Needs attention today</h3>
        </div>
        <StatusPill label={`${profile.urgentAlerts.length} alerts`} tone={profile.urgentAlerts.length > 0 ? "warning" : "ok"} />
      </div>
      <div className="mt-3 grid gap-2">
        {profile.urgentAlerts.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm font-semibold text-muted">
            {profile.emptyState}
          </p>
        ) : profile.urgentAlerts.map((alert) => (
          <div key={alert} className="flex items-center justify-between gap-3 rounded-xl border border-warning/20 bg-warning-soft/60 px-3 py-2">
            <span className="text-sm font-bold text-foreground">{alert}</span>
            <StatusPill label="Review" tone="warning" compact />
          </div>
        ))}
      </div>
    </Card>
  );
}

function NurseClinicWorkspace({
  visits,
  medicines,
  notice,
  onRecordVisit,
  onLoadMedicine,
  onNotifyParent,
  onRefer,
  onRelease,
  onPrint,
  onPrintRegister,
}: {
  visits: ClinicVisitRecord[];
  medicines: MedicineStockRecord[];
  notice: string;
  onRecordVisit: (visit: Omit<ClinicVisitRecord, "id" | "status" | "parentContacted" | "time">) => void;
  onLoadMedicine: (medicine: Omit<MedicineStockRecord, "id">) => void;
  onNotifyParent: (id: string) => void;
  onRefer: (id: string) => void;
  onRelease: (id: string) => void;
  onPrint: (id: string) => void;
  onPrintRegister: () => void;
}) {
  const [student, setStudent] = useState("Brian Otieno");
  const [className, setClassName] = useState("Form 2 East");
  const [symptoms, setSymptoms] = useState("");
  const [temperature, setTemperature] = useState("37.0");
  const [selectedMedicine, setSelectedMedicine] = useState(medicines[0]?.medicine ?? "Paracetamol");
  const [quantity, setQuantity] = useState("1");
  const [guardianPhone, setGuardianPhone] = useState("0712345678");
  const [newMedicine, setNewMedicine] = useState("");
  const [newBatch, setNewBatch] = useState("");
  const [newQuantity, setNewQuantity] = useState("10");
  const [newExpiry, setNewExpiry] = useState("2026-12-31");
  const fieldClass = "rounded-xl border border-[#D7E0EF] bg-white px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-[#1D4ED8]";

  const lowStock = medicines.filter((item) => item.quantity <= item.reorderAt);
  const treatedToday = visits.length;
  const referrals = visits.filter((visit) => visit.status === "Referred").length;
  const parentAlerts = visits.filter((visit) => visit.parentContacted).length;
  const clinicSummaryCards: Array<{
    label: string;
    value: string;
    helper: string;
    Icon: LucideIcon;
    tone: "ok" | "warning" | "critical";
  }> = [
    { label: "Treated Today", value: String(treatedToday), helper: "From sick bay register", Icon: HeartPulse, tone: "warning" },
    { label: "In Sick Bay", value: String(visits.filter((visit) => visit.status === "In sick bay").length), helper: "Monitoring vitals", Icon: Thermometer, tone: "warning" },
    { label: "Low Stock", value: String(lowStock.length), helper: "Medicine reorder alerts", Icon: Pill, tone: lowStock.length > 0 ? "critical" : "ok" },
    { label: "Referrals", value: String(referrals), helper: "Hospital follow-up", Icon: Hospital, tone: referrals > 0 ? "critical" : "ok" },
    { label: "Parent Alerts", value: String(parentAlerts), helper: "SMS sent from clinic", Icon: MessageCircle, tone: "ok" },
  ];

  return (
    <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-4">
        <div role="status" className="rounded-xl border border-[#B8D4FF] bg-[#EFF6FF] px-4 py-3 text-sm font-black text-[#1D4ED8]">
          {notice}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {clinicSummaryCards.map(({ label, value, helper, Icon, tone }) => {
            return (
              <Card key={label} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <Icon className="h-5 w-5 text-accent" />
                  <StatusPill label={tone === "critical" ? "Urgent" : tone === "warning" ? "Check" : "OK"} tone={tone} compact />
                </div>
                <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-muted">{label}</p>
                <p className="mt-1 text-3xl font-black text-foreground">{value}</p>
                <p className="mt-1 text-xs font-semibold text-muted">{helper}</p>
              </Card>
            );
          })}
        </div>

        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Sick bay visit</p>
              <h3 className="mt-1 text-lg font-black text-foreground">Record visit and dispense medicine</h3>
              <p className="mt-1 text-sm font-semibold text-muted">Submitting this form adds a visit, deducts stock, and prepares parent notification.</p>
            </div>
            <StatusPill label="Medicine stock connected" tone="ok" />
          </div>
          <form
            className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              onRecordVisit({
                student,
                className,
                symptoms,
                temperature,
                medicine: selectedMedicine,
                quantity: Math.max(1, Number(quantity || 1)),
                guardianPhone,
              });
              setSymptoms("");
              setQuantity("1");
            }}
          >
            <input value={student} onChange={(event) => setStudent(event.currentTarget.value)} className={fieldClass} aria-label="Student name" placeholder="Student name" required />
            <input value={className} onChange={(event) => setClassName(event.currentTarget.value)} className={fieldClass} aria-label="Class or form" placeholder="Class/Form" required />
            <input value={guardianPhone} onChange={(event) => setGuardianPhone(event.currentTarget.value)} className={fieldClass} aria-label="Guardian phone" placeholder="Guardian phone" required />
            <input value={temperature} onChange={(event) => setTemperature(event.currentTarget.value)} className={fieldClass} aria-label="Temperature" placeholder="Temperature" required />
            <select value={selectedMedicine} onChange={(event) => setSelectedMedicine(event.currentTarget.value)} className={fieldClass} aria-label="Medicine given">
              {medicines.map((item) => <option key={item.id} value={item.medicine}>{item.medicine} ({item.quantity} left)</option>)}
            </select>
            <input value={quantity} onChange={(event) => setQuantity(event.currentTarget.value)} className={fieldClass} aria-label="Quantity dispensed" inputMode="numeric" placeholder="Quantity" required />
            <textarea value={symptoms} onChange={(event) => setSymptoms(event.currentTarget.value)} className={`${fieldClass} md:col-span-2 xl:col-span-3`} aria-label="Symptoms and treatment notes" placeholder="Symptoms, vitals, and treatment notes" required />
            <button type="submit" className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white md:col-span-2 xl:col-span-3">Save Visit and Deduct Stock</button>
          </form>
        </Card>

        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Clinic visits</p>
              <h3 className="mt-1 text-lg font-black text-foreground">Today&apos;s sick bay register</h3>
            </div>
            <button type="button" onClick={onPrintRegister} className="inline-flex items-center gap-2 rounded-xl border border-[#D7E0EF] px-3 py-2 text-sm font-black text-[#071D49]">
              <Printer className="h-4 w-4" /> Print Register
            </button>
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-[#D7E0EF]">
            <table className="min-w-full divide-y divide-[#E2E8F0] text-sm">
              <thead className="bg-[#F8FAFC] text-left text-xs font-black uppercase tracking-[0.12em] text-muted">
                <tr>
                  {["Student", "Symptoms", "Medicine", "Guardian", "Status", "Action"].map((column) => <th key={column} className="px-3 py-3">{column}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] bg-white">
                {visits.map((visit) => (
                  <tr key={visit.id}>
                    <td className="px-3 py-3 font-black text-foreground">
                      {visit.student}
                      <span className="block text-xs font-semibold text-muted">{visit.className} - {visit.time}</span>
                    </td>
                    <td className="px-3 py-3 font-semibold text-muted">{visit.symptoms} ({visit.temperature}C)</td>
                    <td className="px-3 py-3 font-semibold text-muted">{visit.medicine} x{visit.quantity}</td>
                    <td className="px-3 py-3 font-semibold text-muted">{visit.guardianPhone}</td>
                    <td className="px-3 py-3"><StatusPill label={visit.status} tone={visit.status === "Referred" ? "critical" : "warning"} compact /></td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => onNotifyParent(visit.id)} className="rounded-lg border border-[#B8D4FF] px-2 py-1 text-xs font-black text-[#1D4ED8]">Notify Parent</button>
                        <button type="button" onClick={() => onRefer(visit.id)} className="rounded-lg border border-[#FED7AA] px-2 py-1 text-xs font-black text-warning">Refer</button>
                        <button type="button" onClick={() => onRelease(visit.id)} className="rounded-lg border border-[#BBF7D0] px-2 py-1 text-xs font-black text-success">Release</button>
                        <button type="button" onClick={() => onPrint(visit.id)} className="rounded-lg border border-[#D7E0EF] px-2 py-1 text-xs font-black text-[#071D49]">Print Slip</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <aside className="space-y-4">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Pill className="h-4 w-4 text-accent" />
            <h3 className="text-lg font-black text-foreground">Medicine inventory</h3>
          </div>
          <div className="mt-4 space-y-2">
            {medicines.map((item) => (
              <div key={item.id} className="rounded-xl border border-[#D7E0EF] bg-surface-muted p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-black text-foreground">{item.medicine}</p>
                  <StatusPill label={item.quantity <= item.reorderAt ? "Low stock" : "OK"} tone={item.quantity <= item.reorderAt ? "critical" : "ok"} compact />
                </div>
                <p className="mt-1 text-xs font-semibold text-muted">Batch {item.batch} - {item.quantity} units - expires {item.expiry}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-accent" />
            <h3 className="text-lg font-black text-foreground">Load medicine stock</h3>
          </div>
          <form
            className="mt-4 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              onLoadMedicine({
                medicine: newMedicine,
                batch: newBatch || "NEW-BATCH",
                quantity: Math.max(1, Number(newQuantity || 1)),
                expiry: newExpiry,
                reorderAt: 10,
              });
              setNewMedicine("");
              setNewBatch("");
              setNewQuantity("10");
            }}
          >
            <input value={newMedicine} onChange={(event) => setNewMedicine(event.currentTarget.value)} className={fieldClass} aria-label="New medicine name" placeholder="Medicine name" required />
            <input value={newBatch} onChange={(event) => setNewBatch(event.currentTarget.value)} className={fieldClass} aria-label="Batch number" placeholder="Batch number" required />
            <input value={newQuantity} onChange={(event) => setNewQuantity(event.currentTarget.value)} className={fieldClass} aria-label="Stock quantity" inputMode="numeric" placeholder="Quantity" required />
            <input value={newExpiry} onChange={(event) => setNewExpiry(event.currentTarget.value)} className={fieldClass} aria-label="Expiry date" type="date" required />
            <button type="submit" className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">Add Stock</button>
          </form>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Hospital className="h-4 w-4 text-warning" />
            <h3 className="text-lg font-black text-foreground">Referral readiness</h3>
          </div>
          <p className="mt-3 text-sm font-semibold leading-6 text-muted">
            Serious cases can be referred to hospital, parent SMS can be sent, and boarding/class teacher follow-up remains visible in the visit record.
          </p>
        </Card>
      </aside>
    </div>
  );
}

function AdmissionsWorkspace({
  applicants,
  notice,
  onAddApplicant,
  onVerifyDocuments,
  onScheduleInterview,
  onApprove,
  onReject,
  onSendSms,
  onPrintLetter,
  onPrintPipeline,
}: {
  applicants: AdmissionApplicantRecord[];
  notice: string;
  onAddApplicant: (applicant: Omit<AdmissionApplicantRecord, "id" | "status" | "admissionNumber" | "parentSmsSent" | "letterPrinted">) => void;
  onVerifyDocuments: (id: string) => void;
  onScheduleInterview: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onSendSms: (id: string) => void;
  onPrintLetter: (id: string) => void;
  onPrintPipeline: () => void;
}) {
  const [applicant, setApplicant] = useState("Faith Akinyi");
  const [className, setClassName] = useState("Form 1 North");
  const [parentPhone, setParentPhone] = useState("0712345678");
  const [documents, setDocuments] = useState<AdmissionApplicantRecord["documents"]>("Partial");
  const [interviewDate, setInterviewDate] = useState("2026-05-29");
  const [note, setNote] = useState("Parent requested boarding placement and fee structure.");
  const fieldClass = "rounded-xl border border-[#D7E0EF] bg-white px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-[#1D4ED8]";

  const pendingApplications = applicants.filter((item) => item.status === "Inquiry" || item.status === "Application Pending").length;
  const missingDocuments = applicants.filter((item) => item.documents !== "Complete").length;
  const interviews = applicants.filter((item) => item.status === "Interview Scheduled" || item.interviewDate).length;
  const approved = applicants.filter((item) => item.status === "Approved" || item.status === "Onboarded").length;
  const lettersPending = applicants.filter((item) => item.status === "Approved" && !item.letterPrinted).length;
  const summaryCards: Array<{
    label: string;
    value: string;
    helper: string;
    tone: "ok" | "warning" | "critical";
    Icon: LucideIcon;
  }> = [
    { label: "New Inquiries", value: String(applicants.filter((item) => item.status === "Inquiry").length), helper: "From front office intake", tone: "warning", Icon: ClipboardList },
    { label: "Applications Pending", value: String(pendingApplications), helper: "Waiting for action", tone: pendingApplications > 0 ? "warning" : "ok", Icon: ListChecks },
    { label: "Documents Missing", value: String(missingDocuments), helper: "Birth certificates, leaving letters", tone: missingDocuments > 0 ? "critical" : "ok", Icon: ShieldCheck },
    { label: "Interviews", value: String(interviews), helper: "Scheduled or completed", tone: "warning", Icon: Clock3 },
    { label: "Approved", value: String(approved), helper: "Ready for student creation", tone: "ok", Icon: CheckCircle2 },
    { label: "Letters Pending", value: String(lettersPending), helper: "Admission letters to print", tone: lettersPending > 0 ? "warning" : "ok", Icon: Printer },
  ];

  function statusTone(status: AdmissionApplicantRecord["status"]): "ok" | "warning" | "critical" {
    if (status === "Rejected") return "critical";
    if (status === "Approved" || status === "Onboarded" || status === "Documents Verified") return "ok";
    return "warning";
  }

  return (
    <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-4">
        <div role="status" className="rounded-xl border border-[#B8D4FF] bg-[#EFF6FF] px-4 py-3 text-sm font-black text-[#1D4ED8]">
          {notice}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {summaryCards.map(({ label, value, helper, tone, Icon }) => (
            <Card key={label} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <Icon className="h-5 w-5 text-accent" />
                <StatusPill label={tone === "critical" ? "Urgent" : tone === "warning" ? "Check" : "OK"} tone={tone} compact />
              </div>
              <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-muted">{label}</p>
              <p className="mt-1 text-3xl font-black text-foreground">{value}</p>
              <p className="mt-1 text-xs font-semibold text-muted">{helper}</p>
            </Card>
          ))}
        </div>

        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Admission intake</p>
              <h3 className="mt-1 text-lg font-black text-foreground">Add inquiry or application</h3>
              <p className="mt-1 text-sm font-semibold text-muted">
                Captures the learner, parent contact, class request, document status, interview date, and onboarding note.
              </p>
            </div>
            <StatusPill label="Parent onboarding ready" tone="ok" />
          </div>
          <form
            className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              onAddApplicant({
                applicant,
                className,
                parentPhone,
                documents,
                interviewDate,
                note,
              });
              setApplicant("");
              setParentPhone("");
              setDocuments("Partial");
              setNote("");
            }}
          >
            <input value={applicant} onChange={(event) => setApplicant(event.currentTarget.value)} className={fieldClass} aria-label="Applicant name" placeholder="Applicant name" required />
            <select value={className} onChange={(event) => setClassName(event.currentTarget.value)} className={fieldClass} aria-label="Class or form requested">
              {["Grade 6 Blue", "Grade 8 East", "Form 1 North", "Form 2 West", "Form 4 South"].map((option) => <option key={option}>{option}</option>)}
            </select>
            <input value={parentPhone} onChange={(event) => setParentPhone(event.currentTarget.value)} className={fieldClass} aria-label="Parent phone" placeholder="Parent phone" required />
            <select value={documents} onChange={(event) => setDocuments(event.currentTarget.value as AdmissionApplicantRecord["documents"])} className={fieldClass} aria-label="Document status">
              {["Missing", "Partial", "Complete"].map((option) => <option key={option}>{option}</option>)}
            </select>
            <input value={interviewDate} onChange={(event) => setInterviewDate(event.currentTarget.value)} className={fieldClass} aria-label="Interview date" type="date" required />
            <textarea value={note} onChange={(event) => setNote(event.currentTarget.value)} className={`${fieldClass} md:col-span-2 xl:col-span-3`} aria-label="Admission note" placeholder="Admission note" required />
            <button type="submit" className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white md:col-span-2 xl:col-span-3">
              Save Inquiry
            </button>
          </form>
        </Card>

        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Application pipeline</p>
              <h3 className="mt-1 text-lg font-black text-foreground">Applications, documents, interviews, and letters</h3>
            </div>
            <button type="button" onClick={onPrintPipeline} className="inline-flex items-center gap-2 rounded-xl border border-[#D7E0EF] px-3 py-2 text-sm font-black text-[#071D49]">
              <Printer className="h-4 w-4" /> Print Pipeline
            </button>
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-[#D7E0EF]">
            <table className="min-w-full divide-y divide-[#E2E8F0] text-sm">
              <thead className="bg-[#F8FAFC] text-left text-xs font-black uppercase tracking-[0.12em] text-muted">
                <tr>
                  {["Applicant", "Class/Form", "Parent", "Documents", "Status", "Action"].map((column) => <th key={column} className="px-3 py-3">{column}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] bg-white">
                {applicants.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-3 font-black text-foreground">
                      {item.applicant}
                      <span className="block text-xs font-semibold text-muted">{item.admissionNumber ?? "Admission number pending"}</span>
                    </td>
                    <td className="px-3 py-3 font-semibold text-muted">{item.className}</td>
                    <td className="px-3 py-3 font-semibold text-muted">{item.parentPhone}</td>
                    <td className="px-3 py-3">
                      <StatusPill label={item.documents} tone={item.documents === "Complete" ? "ok" : item.documents === "Partial" ? "warning" : "critical"} compact />
                    </td>
                    <td className="px-3 py-3">
                      <StatusPill label={item.status} tone={statusTone(item.status)} compact />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => onVerifyDocuments(item.id)} className="rounded-lg border border-[#B8D4FF] px-2 py-1 text-xs font-black text-[#1D4ED8]">Verify Documents</button>
                        <button type="button" onClick={() => onScheduleInterview(item.id)} className="rounded-lg border border-[#D7E0EF] px-2 py-1 text-xs font-black text-[#071D49]">Schedule Interview</button>
                        <button type="button" onClick={() => onApprove(item.id)} className="rounded-lg border border-[#BBF7D0] px-2 py-1 text-xs font-black text-success">Approve Admission</button>
                        <button type="button" onClick={() => onReject(item.id)} className="rounded-lg border border-[#FECACA] px-2 py-1 text-xs font-black text-critical">Reject</button>
                        <button type="button" onClick={() => onPrintLetter(item.id)} className="rounded-lg border border-[#D7E0EF] px-2 py-1 text-xs font-black text-[#071D49]">Print Letter</button>
                        <button type="button" onClick={() => onSendSms(item.id)} className="rounded-lg border border-[#B8D4FF] px-2 py-1 text-xs font-black text-[#1D4ED8]">Send Parent SMS</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <aside className="space-y-4">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-accent" />
            <h3 className="text-lg font-black text-foreground">Onboarding checklist</h3>
          </div>
          <div className="mt-4 space-y-2">
            {["Document verification", "Interview or assessment", "Admission decision", "Admission number", "First invoice", "Parent SMS onboarding"].map((item) => (
              <div key={item} className="flex items-center justify-between gap-2 rounded-xl border border-[#D7E0EF] bg-surface-muted p-3">
                <p className="text-sm font-black text-foreground">{item}</p>
                <StatusPill label="Tracked" tone="ok" compact />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-accent" />
            <h3 className="text-lg font-black text-foreground">Parent communication</h3>
          </div>
          <p className="mt-3 text-sm font-semibold leading-6 text-muted">
            Approved admissions can send parent onboarding SMS, prepare the first invoice, and mark the letter printed without leaving the admissions desk.
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-warning" />
            <h3 className="text-lg font-black text-foreground">Missing documents</h3>
          </div>
          <div className="mt-3 space-y-2">
            {applicants.filter((item) => item.documents !== "Complete").length === 0 ? (
              <p className="rounded-xl border border-[#D7E0EF] bg-surface-muted p-3 text-sm font-semibold text-muted">All applicant documents are complete.</p>
            ) : applicants.filter((item) => item.documents !== "Complete").map((item) => (
              <div key={item.id} className="rounded-xl border border-[#FED7AA] bg-warning-soft/50 p-3">
                <p className="text-sm font-black text-foreground">{item.applicant}</p>
                <p className="mt-1 text-xs font-semibold text-muted">{item.documents} documents - {item.note}</p>
              </div>
            ))}
          </div>
        </Card>
      </aside>
    </div>
  );
}

function LibraryWorkspace({
  books,
  loans,
  notice,
  onAddBook,
  onIssueBook,
  onReturnBook,
  onMarkLost,
  onMarkDamaged,
  onSendSms,
  onPrintSlip,
  onPrintReport,
}: {
  books: LibraryBookRecord[];
  loans: LibraryLoanRecord[];
  notice: string;
  onAddBook: (book: Omit<LibraryBookRecord, "id" | "status">) => void;
  onIssueBook: (loan: Omit<LibraryLoanRecord, "id" | "bookTitle" | "status" | "fine" | "parentSmsSent">) => void;
  onReturnBook: (id: string) => void;
  onMarkLost: (id: string) => void;
  onMarkDamaged: (id: string) => void;
  onSendSms: (id: string) => void;
  onPrintSlip: (id: string) => void;
  onPrintReport: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [title, setTitle] = useState("Computer Studies Form 1");
  const [barcode, setBarcode] = useState("KB-LIB-2101");
  const [isbn, setIsbn] = useState("9789966004418");
  const [author, setAuthor] = useState("Kenya School Press");
  const [category, setCategory] = useState("Computer Studies");
  const [shelf, setShelf] = useState("ICT-D1");
  const [issueBarcode, setIssueBarcode] = useState(books[0]?.barcode ?? "KB-LIB-1001");
  const [borrower, setBorrower] = useState("Brian Otieno");
  const [admissionNo, setAdmissionNo] = useState("KBI/2026/044");
  const [dueDate, setDueDate] = useState("2026-06-04");
  const fieldClass = "rounded-xl border border-[#D7E0EF] bg-white px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-[#1D4ED8]";
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredBooks = books.filter((book) => (
    `${book.title} ${book.barcode} ${book.author} ${book.category} ${book.shelf}`.toLowerCase().includes(normalizedSearch)
  ));
  const overdueLoans = loans.filter((loan) => loan.status === "Overdue");
  const lostOrDamaged = loans.filter((loan) => loan.status === "Lost" || loan.status === "Damaged").length
    + books.filter((book) => book.status === "Lost" || book.status === "Damaged").length;
  const summaryCards: Array<{
    label: string;
    value: string;
    helper: string;
    tone: "ok" | "warning" | "critical";
    Icon: LucideIcon;
  }> = [
    { label: "Books Issued Today", value: String(loans.filter((loan) => loan.status === "Issued" || loan.status === "Overdue").length), helper: "From issue register", tone: "warning", Icon: ClipboardList },
    { label: "Available Books", value: String(books.filter((book) => book.status === "Available").length), helper: "Ready for issuing", tone: "ok", Icon: CheckCircle2 },
    { label: "Overdue Books", value: String(overdueLoans.length), helper: "Parent SMS available", tone: overdueLoans.length > 0 ? "critical" : "ok", Icon: Clock3 },
    { label: "Lost/Damaged", value: String(lostOrDamaged), helper: "Fine or repair follow-up", tone: lostOrDamaged > 0 ? "warning" : "ok", Icon: ShieldCheck },
    { label: "Fines Pending", value: `KSh ${loans.reduce((total, loan) => total + loan.fine, 0).toLocaleString("en-KE")}`, helper: "From borrower records", tone: "warning", Icon: ListChecks },
  ];

  return (
    <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-4">
        <div role="status" className="rounded-xl border border-[#B8D4FF] bg-[#EFF6FF] px-4 py-3 text-sm font-black text-[#1D4ED8]">
          {notice}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {summaryCards.map(({ label, value, helper, tone, Icon }) => (
            <Card key={label} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <Icon className="h-5 w-5 text-accent" />
                <StatusPill label={tone === "critical" ? "Urgent" : tone === "warning" ? "Check" : "OK"} tone={tone} compact />
              </div>
              <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-muted">{label}</p>
              <p className="mt-1 text-2xl font-black text-foreground">{value}</p>
              <p className="mt-1 text-xs font-semibold text-muted">{helper}</p>
            </Card>
          ))}
        </div>

        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Barcode scanner desk</p>
              <h3 className="mt-1 text-lg font-black text-foreground">Issue or return books quickly</h3>
              <p className="mt-1 text-sm font-semibold text-muted">Scan or type the book barcode, attach the learner admission number, and print/SMS the slip.</p>
            </div>
            <StatusPill label="Scanner input ready" tone="ok" />
          </div>
          <form
            className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault();
              onIssueBook({
                barcode: issueBarcode,
                borrower,
                admissionNo,
                dueDate,
              });
            }}
          >
            <input value={issueBarcode} onChange={(event) => setIssueBarcode(event.currentTarget.value)} className={fieldClass} aria-label="Book barcode" placeholder="Scan book barcode" required />
            <input value={borrower} onChange={(event) => setBorrower(event.currentTarget.value)} className={fieldClass} aria-label="Borrower name" placeholder="Borrower name" required />
            <input value={admissionNo} onChange={(event) => setAdmissionNo(event.currentTarget.value)} className={fieldClass} aria-label="Admission number" placeholder="Admission number" required />
            <input value={dueDate} onChange={(event) => setDueDate(event.currentTarget.value)} className={fieldClass} aria-label="Due date" type="date" required />
            <button type="submit" className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white md:col-span-2 xl:col-span-4">Issue Book</button>
          </form>
        </Card>

        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Borrower records</p>
              <h3 className="mt-1 text-lg font-black text-foreground">Issued, returned, overdue, lost, and damaged books</h3>
            </div>
            <button type="button" onClick={onPrintReport} className="inline-flex items-center gap-2 rounded-xl border border-[#D7E0EF] px-3 py-2 text-sm font-black text-[#071D49]">
              <Printer className="h-4 w-4" /> Print Library Report
            </button>
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-[#D7E0EF]">
            <table className="min-w-full divide-y divide-[#E2E8F0] text-sm">
              <thead className="bg-[#F8FAFC] text-left text-xs font-black uppercase tracking-[0.12em] text-muted">
                <tr>
                  {["Book Title", "Barcode", "Borrower", "Due Date", "Status", "Action"].map((column) => <th key={column} className="px-3 py-3">{column}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] bg-white">
                {loans.map((loan) => (
                  <tr key={loan.id}>
                    <td className="px-3 py-3 font-black text-foreground">
                      {loan.bookTitle}
                      <span className="block text-xs font-semibold text-muted">Fine: KSh {loan.fine.toLocaleString("en-KE")}</span>
                    </td>
                    <td className="px-3 py-3 font-semibold text-muted">{loan.barcode}</td>
                    <td className="px-3 py-3 font-semibold text-muted">{loan.borrower} - {loan.admissionNo}</td>
                    <td className="px-3 py-3 font-semibold text-muted">{loan.dueDate}</td>
                    <td className="px-3 py-3">
                      <StatusPill label={loan.status} tone={loan.status === "Overdue" || loan.status === "Lost" ? "critical" : loan.status === "Damaged" ? "warning" : "ok"} compact />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => onReturnBook(loan.id)} className="rounded-lg border border-[#BBF7D0] px-2 py-1 text-xs font-black text-success">Return Book</button>
                        <button type="button" onClick={() => onMarkLost(loan.id)} className="rounded-lg border border-[#FECACA] px-2 py-1 text-xs font-black text-critical">Mark Lost</button>
                        <button type="button" onClick={() => onMarkDamaged(loan.id)} className="rounded-lg border border-[#FED7AA] px-2 py-1 text-xs font-black text-warning">Mark Damaged</button>
                        <button type="button" onClick={() => onSendSms(loan.id)} className="rounded-lg border border-[#B8D4FF] px-2 py-1 text-xs font-black text-[#1D4ED8]">Send Overdue SMS</button>
                        <button type="button" onClick={() => onPrintSlip(loan.id)} className="rounded-lg border border-[#D7E0EF] px-2 py-1 text-xs font-black text-[#071D49]">Print Slip</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <aside className="space-y-4">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Book catalogue</p>
              <h3 className="mt-1 text-lg font-black text-foreground">Search books</h3>
            </div>
            <StatusPill label={`${filteredBooks.length} shown`} tone="ok" />
          </div>
          <label className="mt-4 block">
            <span className="sr-only">Search catalogue</span>
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.currentTarget.value)} className={fieldClass} aria-label="Search catalogue" placeholder="Search title, barcode, shelf" />
          </label>
          <div className="mt-3 space-y-2">
            {filteredBooks.length === 0 ? (
              <p className="rounded-xl border border-[#D7E0EF] bg-surface-muted p-3 text-sm font-semibold text-muted">No book matches that search.</p>
            ) : filteredBooks.map((book) => (
              <div key={book.id} className="rounded-xl border border-[#D7E0EF] bg-surface-muted p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-black text-foreground">{book.title}</p>
                  <StatusPill label={book.status} tone={book.status === "Available" ? "ok" : book.status === "Issued" ? "warning" : "critical"} compact />
                </div>
                <p className="mt-1 text-xs font-semibold text-muted">{book.barcode} - {book.category} - shelf {book.shelf}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-accent" />
            <h3 className="text-lg font-black text-foreground">Add book</h3>
          </div>
          <form
            className="mt-4 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              onAddBook({ title, barcode, isbn, author, category, shelf });
              setTitle("");
              setBarcode("");
              setIsbn("");
              setAuthor("");
              setCategory("");
              setShelf("");
            }}
          >
            <input value={title} onChange={(event) => setTitle(event.currentTarget.value)} className={fieldClass} aria-label="Book title" placeholder="Book title" required />
            <input value={barcode} onChange={(event) => setBarcode(event.currentTarget.value)} className={fieldClass} aria-label="New book barcode" placeholder="Barcode" required />
            <input value={isbn} onChange={(event) => setIsbn(event.currentTarget.value)} className={fieldClass} aria-label="ISBN" placeholder="ISBN" required />
            <input value={author} onChange={(event) => setAuthor(event.currentTarget.value)} className={fieldClass} aria-label="Author" placeholder="Author" required />
            <input value={category} onChange={(event) => setCategory(event.currentTarget.value)} className={fieldClass} aria-label="Category" placeholder="Category" required />
            <input value={shelf} onChange={(event) => setShelf(event.currentTarget.value)} className={fieldClass} aria-label="Shelf number" placeholder="Shelf number" required />
            <button type="submit" className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">Add Book</button>
          </form>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-warning" />
            <h3 className="text-lg font-black text-foreground">Overdue follow-up</h3>
          </div>
          <div className="mt-3 space-y-2">
            {overdueLoans.length === 0 ? (
              <p className="rounded-xl border border-[#D7E0EF] bg-surface-muted p-3 text-sm font-semibold text-muted">No overdue books right now.</p>
            ) : overdueLoans.map((loan) => (
              <div key={loan.id} className="rounded-xl border border-[#FED7AA] bg-warning-soft/50 p-3">
                <p className="text-sm font-black text-foreground">{loan.borrower}</p>
                <p className="mt-1 text-xs font-semibold text-muted">{loan.bookTitle} overdue. Fine KSh {loan.fine.toLocaleString("en-KE")}.</p>
              </div>
            ))}
          </div>
        </Card>
      </aside>
    </div>
  );
}

function StorekeeperWorkspace({
  items,
  movements,
  notice,
  onAddStock,
  onIssueStock,
  onReceiveStock,
  onMarkDamaged,
  onPrintSlip,
  onExport,
}: {
  items: StockItemRecord[];
  movements: StockMovementRecord[];
  notice: string;
  onAddStock: (item: Omit<StockItemRecord, "id" | "status">) => void;
  onIssueStock: (movement: Omit<StockMovementRecord, "id" | "movementType" | "time">) => void;
  onReceiveStock: (movement: Omit<StockMovementRecord, "id" | "movementType" | "time">) => void;
  onMarkDamaged: (id: string) => void;
  onPrintSlip: (id: string) => void;
  onExport: () => void;
}) {
  const [itemName, setItemName] = useState("Exercise Books");
  const [category, setCategory] = useState<StockItemRecord["category"]>("Consumable");
  const [quantity, setQuantity] = useState("120");
  const [unit, setUnit] = useState("pieces");
  const [supplier, setSupplier] = useState("Kisumu Stationers");
  const [department, setDepartment] = useState("Academics");
  const [receiver, setReceiver] = useState("Mrs. Wanjiku");
  const [unitCost, setUnitCost] = useState("80");
  const [movementItem, setMovementItem] = useState(items[0]?.item ?? "Whiteboard Markers");
  const [movementQuantity, setMovementQuantity] = useState("5");
  const [movementDepartment, setMovementDepartment] = useState("Mathematics");
  const [movementReceiver, setMovementReceiver] = useState("Mr. Otieno");
  const [movementNote, setMovementNote] = useState("Issued for classroom use.");
  const fieldClass = "rounded-xl border border-[#D7E0EF] bg-white px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-[#1D4ED8]";
  const lowStock = items.filter((item) => item.status === "Low Stock" || item.quantity <= 20);
  const stockValue = items.reduce((total, item) => total + item.quantity * item.unitCost, 0);
  const damagedCount = items.filter((item) => item.status === "Damaged").length + movements.filter((item) => item.movementType === "Damaged/Lost").length;
  const summaryCards: Array<{
    label: string;
    value: string;
    helper: string;
    tone: "ok" | "warning" | "critical";
    Icon: LucideIcon;
  }> = [
    { label: "Low Stock Items", value: String(lowStock.length), helper: "Reorder or procurement needed", tone: lowStock.length > 0 ? "critical" : "ok", Icon: ListChecks },
    { label: "Items Issued Today", value: String(movements.filter((item) => item.movementType === "Issued").length), helper: "From stock movement log", tone: "warning", Icon: ClipboardList },
    { label: "Stock Value", value: `KSh ${stockValue.toLocaleString("en-KE")}`, helper: "Current recorded stock", tone: "ok", Icon: CheckCircle2 },
    { label: "Damaged/Lost", value: String(damagedCount), helper: "Requires follow-up", tone: damagedCount > 0 ? "warning" : "ok", Icon: ShieldCheck },
    { label: "Approval Items", value: String(items.filter((item) => item.status === "Approval Required").length), helper: "High-value movement control", tone: "warning", Icon: Clock3 },
  ];

  return (
    <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-4">
        <div role="status" className="rounded-xl border border-[#B8D4FF] bg-[#EFF6FF] px-4 py-3 text-sm font-black text-[#1D4ED8]">
          {notice}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {summaryCards.map(({ label, value, helper, tone, Icon }) => (
            <Card key={label} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <Icon className="h-5 w-5 text-accent" />
                <StatusPill label={tone === "critical" ? "Urgent" : tone === "warning" ? "Check" : "OK"} tone={tone} compact />
              </div>
              <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-muted">{label}</p>
              <p className="mt-1 text-2xl font-black text-foreground">{value}</p>
              <p className="mt-1 text-xs font-semibold text-muted">{helper}</p>
            </Card>
          ))}
        </div>

        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Stock movement</p>
              <h3 className="mt-1 text-lg font-black text-foreground">Issue stock to a department</h3>
              <p className="mt-1 text-sm font-semibold text-muted">Deducts stock, records the receiver, and adds a printable issue slip.</p>
            </div>
            <StatusPill label="Movement history connected" tone="ok" />
          </div>
          <form
            className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              onIssueStock({
                item: movementItem,
                quantity: Math.max(1, Number(movementQuantity || 1)),
                department: movementDepartment,
                receiver: movementReceiver,
                note: movementNote,
              });
            }}
          >
            <select value={movementItem} onChange={(event) => setMovementItem(event.currentTarget.value)} className={fieldClass} aria-label="Stock item to issue">
              {items.map((item) => <option key={item.id}>{item.item}</option>)}
            </select>
            <input value={movementQuantity} onChange={(event) => setMovementQuantity(event.currentTarget.value)} className={fieldClass} aria-label="Issue quantity" inputMode="numeric" placeholder="Quantity" required />
            <input value={movementDepartment} onChange={(event) => setMovementDepartment(event.currentTarget.value)} className={fieldClass} aria-label="Receiving department" placeholder="Department" required />
            <input value={movementReceiver} onChange={(event) => setMovementReceiver(event.currentTarget.value)} className={fieldClass} aria-label="Receiver name" placeholder="Receiver" required />
            <textarea value={movementNote} onChange={(event) => setMovementNote(event.currentTarget.value)} className={`${fieldClass} md:col-span-2 xl:col-span-2`} aria-label="Stock movement note" placeholder="Purpose or note" required />
            <button type="submit" className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white md:col-span-2 xl:col-span-3">Issue Stock</button>
          </form>
        </Card>

        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Movement history</p>
              <h3 className="mt-1 text-lg font-black text-foreground">Who took what, when, and for what purpose</h3>
            </div>
            <button type="button" onClick={onExport} className="rounded-xl border border-[#D7E0EF] px-3 py-2 text-sm font-black text-[#071D49]">Export Stock Report</button>
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-[#D7E0EF]">
            <table className="min-w-full divide-y divide-[#E2E8F0] text-sm">
              <thead className="bg-[#F8FAFC] text-left text-xs font-black uppercase tracking-[0.12em] text-muted">
                <tr>
                  {["Item", "Quantity", "Department", "Receiver", "Type", "Action"].map((column) => <th key={column} className="px-3 py-3">{column}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] bg-white">
                {movements.map((movement) => (
                  <tr key={movement.id}>
                    <td className="px-3 py-3 font-black text-foreground">
                      {movement.item}
                      <span className="block text-xs font-semibold text-muted">{movement.note}</span>
                    </td>
                    <td className="px-3 py-3 font-semibold text-muted">{movement.quantity}</td>
                    <td className="px-3 py-3 font-semibold text-muted">{movement.department}</td>
                    <td className="px-3 py-3 font-semibold text-muted">{movement.receiver} - {movement.time}</td>
                    <td className="px-3 py-3">
                      <StatusPill label={movement.movementType} tone={movement.movementType === "Damaged/Lost" ? "critical" : movement.movementType === "Issued" ? "warning" : "ok"} compact />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => onPrintSlip(movement.id)} className="rounded-lg border border-[#D7E0EF] px-2 py-1 text-xs font-black text-[#071D49]">Print Slip</button>
                        <button type="button" onClick={() => onMarkDamaged(movement.id)} className="rounded-lg border border-[#FED7AA] px-2 py-1 text-xs font-black text-warning">Mark Damaged</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <aside className="space-y-4">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-accent" />
            <h3 className="text-lg font-black text-foreground">Add or receive stock</h3>
          </div>
          <form
            className="mt-4 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const stockItem = {
                item: itemName,
                category,
                quantity: Math.max(1, Number(quantity || 1)),
                unit,
                supplier,
                department,
                unitCost: Math.max(0, Number(unitCost || 0)),
              };
              onAddStock(stockItem);
              onReceiveStock({
                item: itemName,
                quantity: stockItem.quantity,
                department,
                receiver,
                note: `Received from ${supplier}`,
              });
              setItemName("");
              setQuantity("1");
            }}
          >
            <input value={itemName} onChange={(event) => setItemName(event.currentTarget.value)} className={fieldClass} aria-label="Stock item name" placeholder="Item name" required />
            <select value={category} onChange={(event) => setCategory(event.currentTarget.value as StockItemRecord["category"])} className={fieldClass} aria-label="Stock category">
              {["Consumable", "Asset", "Food", "Lab", "Office"].map((option) => <option key={option}>{option}</option>)}
            </select>
            <input value={quantity} onChange={(event) => setQuantity(event.currentTarget.value)} className={fieldClass} aria-label="Stock quantity" inputMode="numeric" placeholder="Quantity" required />
            <input value={unit} onChange={(event) => setUnit(event.currentTarget.value)} className={fieldClass} aria-label="Stock unit" placeholder="Unit" required />
            <input value={supplier} onChange={(event) => setSupplier(event.currentTarget.value)} className={fieldClass} aria-label="Supplier" placeholder="Supplier" required />
            <input value={department} onChange={(event) => setDepartment(event.currentTarget.value)} className={fieldClass} aria-label="Responsible department" placeholder="Department" required />
            <input value={receiver} onChange={(event) => setReceiver(event.currentTarget.value)} className={fieldClass} aria-label="Received by" placeholder="Received by" required />
            <input value={unitCost} onChange={(event) => setUnitCost(event.currentTarget.value)} className={fieldClass} aria-label="Unit cost" inputMode="numeric" placeholder="Unit cost" required />
            <button type="submit" className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">Receive Stock</button>
          </form>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-black text-foreground">Stock catalogue</h3>
            <StatusPill label={`${items.length} items`} tone="ok" />
          </div>
          <div className="mt-3 space-y-2">
            {items.map((item) => (
              <div key={item.id} className="rounded-xl border border-[#D7E0EF] bg-surface-muted p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-black text-foreground">{item.item}</p>
                  <StatusPill label={item.status} tone={item.status === "Low Stock" || item.status === "Damaged" ? "critical" : item.status === "Approval Required" ? "warning" : "ok"} compact />
                </div>
                <p className="mt-1 text-xs font-semibold text-muted">{item.quantity} {item.unit} - {item.department} - {item.supplier}</p>
              </div>
            ))}
          </div>
        </Card>
      </aside>
    </div>
  );
}

function BoardingWorkspace({
  rollCalls,
  exeats,
  notice,
  onAddRollCall,
  onMarkPresent,
  onMarkMissing,
  onNotifyParent,
  onReferNurse,
  onAddExeat,
  onApproveExeat,
  onForwardExeat,
  onPrintRollCall,
}: {
  rollCalls: BoardingRollCallRecord[];
  exeats: ExeatRequestRecord[];
  notice: string;
  onAddRollCall: (record: Omit<BoardingRollCallRecord, "id" | "parentSmsSent" | "lastMarked">) => void;
  onMarkPresent: (id: string) => void;
  onMarkMissing: (id: string) => void;
  onNotifyParent: (id: string) => void;
  onReferNurse: (id: string) => void;
  onAddExeat: (request: Omit<ExeatRequestRecord, "id" | "status">) => void;
  onApproveExeat: (id: string) => void;
  onForwardExeat: (id: string) => void;
  onPrintRollCall: () => void;
}) {
  const [student, setStudent] = useState("Kevin Maina");
  const [className, setClassName] = useState("Form 3 South");
  const [dorm, setDorm] = useState("Lake House");
  const [bed, setBed] = useState("L-21");
  const [status, setStatus] = useState<BoardingRollCallRecord["status"]>("Present");
  const [exeatStudent, setExeatStudent] = useState("Kevin Maina");
  const [exeatDorm, setExeatDorm] = useState("Lake House");
  const [exeatReason, setExeatReason] = useState("Medical appointment");
  const [exeatPhone, setExeatPhone] = useState("0712345678");
  const fieldClass = "rounded-xl border border-[#D7E0EF] bg-white px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-[#1D4ED8]";
  const missing = rollCalls.filter((item) => item.status === "Missing");
  const sick = rollCalls.filter((item) => item.status === "Sick");
  const pendingExeats = exeats.filter((item) => item.status === "Pending" || item.status === "Forwarded");
  const summaryCards: Array<{
    label: string;
    value: string;
    helper: string;
    tone: "ok" | "warning" | "critical";
    Icon: LucideIcon;
  }> = [
    { label: "Boarders Present", value: String(rollCalls.filter((item) => item.status === "Present").length), helper: "From morning roll call", tone: "ok", Icon: CheckCircle2 },
    { label: "Missing Boarders", value: String(missing.length), helper: "Deputy/security alert needed", tone: missing.length > 0 ? "critical" : "ok", Icon: ShieldCheck },
    { label: "Exeat Requests", value: String(pendingExeats.length), helper: "Parent approval follow-up", tone: pendingExeats.length > 0 ? "warning" : "ok", Icon: ClipboardList },
    { label: "Sick Boarders", value: String(sick.length), helper: "Nurse referral available", tone: sick.length > 0 ? "warning" : "ok", Icon: HeartPulse },
    { label: "Parent Alerts", value: String(rollCalls.filter((item) => item.parentSmsSent).length), helper: "SMS sent from hostel", tone: "ok", Icon: MessageCircle },
  ];

  return (
    <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-4">
        <div role="status" className="rounded-xl border border-[#B8D4FF] bg-[#EFF6FF] px-4 py-3 text-sm font-black text-[#1D4ED8]">
          {notice}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {summaryCards.map(({ label, value, helper, tone, Icon }) => (
            <Card key={label} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <Icon className="h-5 w-5 text-accent" />
                <StatusPill label={tone === "critical" ? "Urgent" : tone === "warning" ? "Check" : "OK"} tone={tone} compact />
              </div>
              <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-muted">{label}</p>
              <p className="mt-1 text-2xl font-black text-foreground">{value}</p>
              <p className="mt-1 text-xs font-semibold text-muted">{helper}</p>
            </Card>
          ))}
        </div>

        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Hostel roll call</p>
              <h3 className="mt-1 text-lg font-black text-foreground">Mark boarder roll call</h3>
              <p className="mt-1 text-sm font-semibold text-muted">Missing or sick boarders can notify parents, deputy, security, or nurse from the same table.</p>
            </div>
            <button type="button" onClick={onPrintRollCall} className="rounded-xl border border-[#D7E0EF] px-3 py-2 text-sm font-black text-[#071D49]">Print Roll Call</button>
          </div>
          <form
            className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5"
            onSubmit={(event) => {
              event.preventDefault();
              onAddRollCall({ student, className, dorm, bed, status });
            }}
          >
            <input value={student} onChange={(event) => setStudent(event.currentTarget.value)} className={fieldClass} aria-label="Boarder name" placeholder="Student name" required />
            <input value={className} onChange={(event) => setClassName(event.currentTarget.value)} className={fieldClass} aria-label="Boarder class" placeholder="Class/Form" required />
            <input value={dorm} onChange={(event) => setDorm(event.currentTarget.value)} className={fieldClass} aria-label="Dormitory" placeholder="Dormitory" required />
            <input value={bed} onChange={(event) => setBed(event.currentTarget.value)} className={fieldClass} aria-label="Bed number" placeholder="Bed number" required />
            <select value={status} onChange={(event) => setStatus(event.currentTarget.value as BoardingRollCallRecord["status"])} className={fieldClass} aria-label="Roll call status">
              {["Present", "Missing", "Sick", "On Exeat"].map((option) => <option key={option}>{option}</option>)}
            </select>
            <button type="submit" className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white md:col-span-2 xl:col-span-5">Save Roll Call</button>
          </form>
        </Card>

        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Roll call register</p>
              <h3 className="mt-1 text-lg font-black text-foreground">Dormitory status and actions</h3>
            </div>
            <StatusPill label={`${rollCalls.length} boarders`} tone="ok" />
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-[#D7E0EF]">
            <table className="min-w-full divide-y divide-[#E2E8F0] text-sm">
              <thead className="bg-[#F8FAFC] text-left text-xs font-black uppercase tracking-[0.12em] text-muted">
                <tr>
                  {["Student", "Dorm/Bed", "Status", "Last Marked", "Parent SMS", "Action"].map((column) => <th key={column} className="px-3 py-3">{column}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] bg-white">
                {rollCalls.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-3 font-black text-foreground">
                      {item.student}
                      <span className="block text-xs font-semibold text-muted">{item.className}</span>
                    </td>
                    <td className="px-3 py-3 font-semibold text-muted">{item.dorm} - {item.bed}</td>
                    <td className="px-3 py-3">
                      <StatusPill label={item.status} tone={item.status === "Missing" ? "critical" : item.status === "Sick" ? "warning" : "ok"} compact />
                    </td>
                    <td className="px-3 py-3 font-semibold text-muted">{item.lastMarked}</td>
                    <td className="px-3 py-3"><StatusPill label={item.parentSmsSent ? "Sent" : "Not sent"} tone={item.parentSmsSent ? "ok" : "warning"} compact /></td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => onMarkPresent(item.id)} className="rounded-lg border border-[#BBF7D0] px-2 py-1 text-xs font-black text-success">Mark Present</button>
                        <button type="button" onClick={() => onMarkMissing(item.id)} className="rounded-lg border border-[#FECACA] px-2 py-1 text-xs font-black text-critical">Mark Missing</button>
                        <button type="button" onClick={() => onNotifyParent(item.id)} className="rounded-lg border border-[#B8D4FF] px-2 py-1 text-xs font-black text-[#1D4ED8]">Notify Parent</button>
                        <button type="button" onClick={() => onReferNurse(item.id)} className="rounded-lg border border-[#FED7AA] px-2 py-1 text-xs font-black text-warning">Refer to Nurse</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <aside className="space-y-4">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-accent" />
            <h3 className="text-lg font-black text-foreground">Exeat request</h3>
          </div>
          <form
            className="mt-4 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              onAddExeat({ student: exeatStudent, dorm: exeatDorm, reason: exeatReason, parentPhone: exeatPhone });
            }}
          >
            <input value={exeatStudent} onChange={(event) => setExeatStudent(event.currentTarget.value)} className={fieldClass} aria-label="Exeat student" placeholder="Student" required />
            <input value={exeatDorm} onChange={(event) => setExeatDorm(event.currentTarget.value)} className={fieldClass} aria-label="Exeat dormitory" placeholder="Dormitory" required />
            <input value={exeatPhone} onChange={(event) => setExeatPhone(event.currentTarget.value)} className={fieldClass} aria-label="Exeat parent phone" placeholder="Parent phone" required />
            <textarea value={exeatReason} onChange={(event) => setExeatReason(event.currentTarget.value)} className={fieldClass} aria-label="Exeat reason" placeholder="Reason" required />
            <button type="submit" className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">Add Exeat Request</button>
          </form>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-black text-foreground">Exeat approvals</h3>
            <StatusPill label={`${pendingExeats.length} pending`} tone={pendingExeats.length > 0 ? "warning" : "ok"} />
          </div>
          <div className="mt-3 space-y-2">
            {exeats.map((request) => (
              <div key={request.id} className="rounded-xl border border-[#D7E0EF] bg-surface-muted p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-black text-foreground">{request.student}</p>
                  <StatusPill label={request.status} tone={request.status === "Approved" ? "ok" : request.status === "Rejected" ? "critical" : "warning"} compact />
                </div>
                <p className="mt-1 text-xs font-semibold text-muted">{request.dorm} - {request.reason} - {request.parentPhone}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => onApproveExeat(request.id)} className="rounded-lg border border-[#BBF7D0] px-2 py-1 text-xs font-black text-success">Approve Exeat</button>
                  <button type="button" onClick={() => onForwardExeat(request.id)} className="rounded-lg border border-[#B8D4FF] px-2 py-1 text-xs font-black text-[#1D4ED8]">Forward to Deputy</button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </aside>
    </div>
  );
}

function TransportWorkspace({
  vehicles,
  trips,
  notice,
  onAddTrip,
  onMarkPicked,
  onMarkDropped,
  onNotifyParent,
  onReportVehicleIssue,
  onAddFuel,
  onScheduleMaintenance,
  onPrintRouteList,
}: {
  vehicles: TransportVehicleRecord[];
  trips: TransportTripRecord[];
  notice: string;
  onAddTrip: (trip: Omit<TransportTripRecord, "id" | "status" | "parentAlertSent" | "time">) => void;
  onMarkPicked: (id: string) => void;
  onMarkDropped: (id: string) => void;
  onNotifyParent: (id: string) => void;
  onReportVehicleIssue: (id: string) => void;
  onAddFuel: (id: string) => void;
  onScheduleMaintenance: (id: string) => void;
  onPrintRouteList: () => void;
}) {
  const [student, setStudent] = useState("Mary Wanjiku");
  const [admissionNo, setAdmissionNo] = useState("KBI/2026/220");
  const [route, setRoute] = useState(vehicles[0]?.route ?? "Mamboleo Route");
  const [stop, setStop] = useState("Kibuye Market");
  const fieldClass = "rounded-xl border border-[#D7E0EF] bg-white px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-[#1D4ED8]";
  const activeRoutes = new Set(vehicles.map((item) => item.route)).size;
  const notPicked = trips.filter((trip) => trip.status === "Not Picked");
  const vehicleIssues = vehicles.filter((vehicle) => vehicle.status === "Maintenance" || vehicle.status === "Offline" || vehicle.status === "Delayed");
  const fuelAlerts = vehicles.filter((vehicle) => vehicle.fuelLevel <= 35);
  const summaryCards: Array<{
    label: string;
    value: string;
    helper: string;
    tone: "ok" | "warning" | "critical";
    Icon: LucideIcon;
  }> = [
    { label: "Active Routes", value: String(activeRoutes), helper: "From route list", tone: "ok", Icon: CheckCircle2 },
    { label: "Students Picked", value: String(trips.filter((trip) => trip.status === "Picked" || trip.status === "Dropped").length), helper: "Trip attendance", tone: "ok", Icon: ClipboardList },
    { label: "Not Picked", value: String(notPicked.length), helper: "Parent alert required", tone: notPicked.length > 0 ? "critical" : "ok", Icon: ShieldCheck },
    { label: "Vehicle Issues", value: String(vehicleIssues.length), helper: "Maintenance or delay", tone: vehicleIssues.length > 0 ? "warning" : "ok", Icon: Clock3 },
    { label: "Fuel Alerts", value: String(fuelAlerts.length), helper: "Low fuel follow-up", tone: fuelAlerts.length > 0 ? "warning" : "ok", Icon: ListChecks },
  ];

  return (
    <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-4">
        <div role="status" className="rounded-xl border border-[#B8D4FF] bg-[#EFF6FF] px-4 py-3 text-sm font-black text-[#1D4ED8]">
          {notice}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {summaryCards.map(({ label, value, helper, tone, Icon }) => (
            <Card key={label} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <Icon className="h-5 w-5 text-accent" />
                <StatusPill label={tone === "critical" ? "Urgent" : tone === "warning" ? "Check" : "OK"} tone={tone} compact />
              </div>
              <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-muted">{label}</p>
              <p className="mt-1 text-2xl font-black text-foreground">{value}</p>
              <p className="mt-1 text-xs font-semibold text-muted">{helper}</p>
            </Card>
          ))}
        </div>

        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Trip attendance</p>
              <h3 className="mt-1 text-lg font-black text-foreground">Record pickup or drop-off</h3>
              <p className="mt-1 text-sm font-semibold text-muted">Adds the learner to trip attendance and keeps parent alerts available.</p>
            </div>
            <button type="button" onClick={onPrintRouteList} className="rounded-xl border border-[#D7E0EF] px-3 py-2 text-sm font-black text-[#071D49]">Print Route List</button>
          </div>
          <form
            className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault();
              onAddTrip({ student, admissionNo, route, stop });
            }}
          >
            <input value={student} onChange={(event) => setStudent(event.currentTarget.value)} className={fieldClass} aria-label="Transport student" placeholder="Student" required />
            <input value={admissionNo} onChange={(event) => setAdmissionNo(event.currentTarget.value)} className={fieldClass} aria-label="Transport admission number" placeholder="Admission no." required />
            <select value={route} onChange={(event) => setRoute(event.currentTarget.value)} className={fieldClass} aria-label="Transport route">
              {vehicles.map((vehicle) => <option key={vehicle.id}>{vehicle.route}</option>)}
            </select>
            <input value={stop} onChange={(event) => setStop(event.currentTarget.value)} className={fieldClass} aria-label="Transport stop" placeholder="Stop" required />
            <button type="submit" className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white md:col-span-2 xl:col-span-4">Add Trip Record</button>
          </form>
        </Card>

        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Student trip list</p>
              <h3 className="mt-1 text-lg font-black text-foreground">Pickups, drop-offs, and parent alerts</h3>
            </div>
            <StatusPill label={`${trips.length} trip records`} tone="ok" />
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-[#D7E0EF]">
            <table className="min-w-full divide-y divide-[#E2E8F0] text-sm">
              <thead className="bg-[#F8FAFC] text-left text-xs font-black uppercase tracking-[0.12em] text-muted">
                <tr>
                  {["Student", "Route", "Stop", "Status", "Parent Alert", "Action"].map((column) => <th key={column} className="px-3 py-3">{column}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] bg-white">
                {trips.map((trip) => (
                  <tr key={trip.id}>
                    <td className="px-3 py-3 font-black text-foreground">
                      {trip.student}
                      <span className="block text-xs font-semibold text-muted">{trip.admissionNo} - {trip.time}</span>
                    </td>
                    <td className="px-3 py-3 font-semibold text-muted">{trip.route}</td>
                    <td className="px-3 py-3 font-semibold text-muted">{trip.stop}</td>
                    <td className="px-3 py-3">
                      <StatusPill label={trip.status} tone={trip.status === "Not Picked" ? "critical" : trip.status === "Waiting" ? "warning" : "ok"} compact />
                    </td>
                    <td className="px-3 py-3"><StatusPill label={trip.parentAlertSent ? "Sent" : "Not sent"} tone={trip.parentAlertSent ? "ok" : "warning"} compact /></td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => onMarkPicked(trip.id)} className="rounded-lg border border-[#BBF7D0] px-2 py-1 text-xs font-black text-success">Mark Picked</button>
                        <button type="button" onClick={() => onMarkDropped(trip.id)} className="rounded-lg border border-[#D7E0EF] px-2 py-1 text-xs font-black text-[#071D49]">Mark Dropped</button>
                        <button type="button" onClick={() => onNotifyParent(trip.id)} className="rounded-lg border border-[#B8D4FF] px-2 py-1 text-xs font-black text-[#1D4ED8]">Notify Parent</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <aside className="space-y-4">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-black text-foreground">Vehicles and maintenance</h3>
            <StatusPill label={`${vehicles.length} vehicles`} tone="ok" />
          </div>
          <div className="mt-3 space-y-2">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="rounded-xl border border-[#D7E0EF] bg-surface-muted p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-black text-foreground">{vehicle.vehicle}</p>
                  <StatusPill label={vehicle.status} tone={vehicle.status === "Active" ? "ok" : vehicle.status === "Maintenance" || vehicle.status === "Delayed" ? "warning" : "critical"} compact />
                </div>
                <p className="mt-1 text-xs font-semibold text-muted">{vehicle.route} - {vehicle.driver} - fuel {vehicle.fuelLevel}%</p>
                <p className="mt-1 text-xs font-semibold text-muted">{vehicle.maintenanceNote}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => onReportVehicleIssue(vehicle.id)} className="rounded-lg border border-[#FED7AA] px-2 py-1 text-xs font-black text-warning">Report Vehicle Issue</button>
                  <button type="button" onClick={() => onAddFuel(vehicle.id)} className="rounded-lg border border-[#B8D4FF] px-2 py-1 text-xs font-black text-[#1D4ED8]">Add Fuel Record</button>
                  <button type="button" onClick={() => onScheduleMaintenance(vehicle.id)} className="rounded-lg border border-[#D7E0EF] px-2 py-1 text-xs font-black text-[#071D49]">Schedule Maintenance</button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </aside>
    </div>
  );
}

function LaboratoryWorkspace({
  inventory,
  requests,
  issues,
  notice,
  onAddChemicalStock,
  onAddPracticalRequest,
  onApprovePracticalPrep,
  onIssueApparatus,
  onReturnApparatus,
  onRecordBreakage,
  onAlertTeacher,
  onPrintPracticalChecklist,
}: {
  inventory: LabInventoryRecord[];
  requests: LabPracticalRequestRecord[];
  issues: LabIssueRecord[];
  notice: string;
  onAddChemicalStock: (record: Omit<LabInventoryRecord, "id" | "status">) => void;
  onAddPracticalRequest: (record: Omit<LabPracticalRequestRecord, "id" | "status" | "teacherAlerted">) => void;
  onApprovePracticalPrep: (id: string) => void;
  onIssueApparatus: (requestId: string) => void;
  onReturnApparatus: (issueId: string) => void;
  onRecordBreakage: (issueId: string) => void;
  onAlertTeacher: (requestId: string) => void;
  onPrintPracticalChecklist: () => void;
}) {
  const [teacher, setTeacher] = useState("Mr. Otieno");
  const [className, setClassName] = useState("Form 3 West");
  const [subject, setSubject] = useState("Chemistry");
  const [practical, setPractical] = useState("Acid-base titration");
  const [requestedFor, setRequestedFor] = useState("Today 10:40");
  const [stockItem, setStockItem] = useState("Sodium Hydroxide");
  const [stockCategory, setStockCategory] = useState<LabInventoryRecord["category"]>("Chemical");
  const [stockQuantity, setStockQuantity] = useState("5");
  const [stockUnit, setStockUnit] = useState("litres");
  const [stockLocation, setStockLocation] = useState("Chemical cabinet B");
  const [hazard, setHazard] = useState<LabInventoryRecord["hazard"]>("Medium");
  const fieldClass = "rounded-xl border border-[#D7E0EF] bg-white px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-[#1D4ED8]";
  const lowStock = inventory.filter((item) => item.status === "Low Stock");
  const safetyAlerts = inventory.filter((item) => item.status === "Hazard" || item.hazard === "High");
  const breakages = issues.filter((item) => item.status === "Broken");
  const pendingRequests = requests.filter((item) => item.status === "Requested" || item.status === "Hazard Hold");
  const summaryCards: Array<{
    label: string;
    value: string;
    helper: string;
    tone: "ok" | "warning" | "critical";
    Icon: LucideIcon;
  }> = [
    { label: "Practical Requests", value: String(pendingRequests.length), helper: "From teacher requests", tone: pendingRequests.length > 0 ? "warning" : "ok", Icon: ClipboardList },
    { label: "Chemicals Low Stock", value: String(lowStock.filter((item) => item.category === "Chemical").length), helper: "Reorder needed", tone: lowStock.length > 0 ? "critical" : "ok", Icon: Pill },
    { label: "Apparatus Issued", value: String(issues.filter((item) => item.status === "Issued").length), helper: "Issue/return register", tone: "warning", Icon: ListChecks },
    { label: "Breakages Reported", value: String(breakages.length), helper: "Repair or replacement", tone: breakages.length > 0 ? "warning" : "ok", Icon: ShieldCheck },
    { label: "Safety Alerts", value: String(safetyAlerts.length), helper: "Hazard handling", tone: safetyAlerts.length > 0 ? "critical" : "ok", Icon: HeartPulse },
  ];

  return (
    <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-4">
        <div role="status" className="rounded-xl border border-[#B8D4FF] bg-[#EFF6FF] px-4 py-3 text-sm font-black text-[#1D4ED8]">
          {notice}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {summaryCards.map(({ label, value, helper, tone, Icon }) => (
            <Card key={label} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <Icon className="h-5 w-5 text-accent" />
                <StatusPill label={tone === "critical" ? "Urgent" : tone === "warning" ? "Check" : "OK"} tone={tone} compact />
              </div>
              <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-muted">{label}</p>
              <p className="mt-1 text-2xl font-black text-foreground">{value}</p>
              <p className="mt-1 text-xs font-semibold text-muted">{helper}</p>
            </Card>
          ))}
        </div>

        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Practical preparation</p>
              <h3 className="mt-1 text-lg font-black text-foreground">Add practical request</h3>
              <p className="mt-1 text-sm font-semibold text-muted">Captures teacher practical requests and keeps safety checks visible.</p>
            </div>
            <button type="button" onClick={onPrintPracticalChecklist} className="rounded-xl border border-[#D7E0EF] px-3 py-2 text-sm font-black text-[#071D49]">Print Practical Checklist</button>
          </div>
          <form
            className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5"
            onSubmit={(event) => {
              event.preventDefault();
              onAddPracticalRequest({ teacher, className, subject, practical, requestedFor });
            }}
          >
            <input value={teacher} onChange={(event) => setTeacher(event.currentTarget.value)} className={fieldClass} aria-label="Lab teacher" placeholder="Teacher" required />
            <input value={className} onChange={(event) => setClassName(event.currentTarget.value)} className={fieldClass} aria-label="Lab class or form" placeholder="Class/Form" required />
            <input value={subject} onChange={(event) => setSubject(event.currentTarget.value)} className={fieldClass} aria-label="Lab subject" placeholder="Subject" required />
            <input value={practical} onChange={(event) => setPractical(event.currentTarget.value)} className={fieldClass} aria-label="Lab practical" placeholder="Practical" required />
            <input value={requestedFor} onChange={(event) => setRequestedFor(event.currentTarget.value)} className={fieldClass} aria-label="Practical time" placeholder="Requested for" required />
            <button type="submit" className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white md:col-span-2 xl:col-span-5">Add Practical Request</button>
          </form>
        </Card>

        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Teacher requests</p>
              <h3 className="mt-1 text-lg font-black text-foreground">Practical requests and safety status</h3>
            </div>
            <StatusPill label={`${requests.length} requests`} tone="ok" />
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-[#D7E0EF]">
            <table className="min-w-full divide-y divide-[#E2E8F0] text-sm">
              <thead className="bg-[#F8FAFC] text-left text-xs font-black uppercase tracking-[0.12em] text-muted">
                <tr>
                  {["Practical", "Teacher/Class", "Time", "Status", "Teacher Alert", "Action"].map((column) => <th key={column} className="px-3 py-3">{column}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] bg-white">
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td className="px-3 py-3 font-black text-foreground">
                      {request.practical}
                      <span className="block text-xs font-semibold text-muted">{request.subject}</span>
                    </td>
                    <td className="px-3 py-3 font-semibold text-muted">{request.teacher} - {request.className}</td>
                    <td className="px-3 py-3 font-semibold text-muted">{request.requestedFor}</td>
                    <td className="px-3 py-3"><StatusPill label={request.status} tone={request.status === "Hazard Hold" ? "critical" : request.status === "Prepared" || request.status === "Completed" ? "ok" : "warning"} compact /></td>
                    <td className="px-3 py-3"><StatusPill label={request.teacherAlerted ? "Sent" : "Not sent"} tone={request.teacherAlerted ? "ok" : "warning"} compact /></td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => onApprovePracticalPrep(request.id)} className="rounded-lg border border-[#BBF7D0] px-2 py-1 text-xs font-black text-success">Approve Practical Prep</button>
                        <button type="button" onClick={() => onIssueApparatus(request.id)} className="rounded-lg border border-[#B8D4FF] px-2 py-1 text-xs font-black text-[#1D4ED8]">Issue Apparatus</button>
                        <button type="button" onClick={() => onAlertTeacher(request.id)} className="rounded-lg border border-[#FED7AA] px-2 py-1 text-xs font-black text-warning">Alert Teacher</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <aside className="space-y-4">
        <Card className="p-5">
          <h3 className="text-lg font-black text-foreground">Add chemical or apparatus stock</h3>
          <form
            className="mt-4 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              onAddChemicalStock({ item: stockItem, category: stockCategory, quantity: Number(stockQuantity), unit: stockUnit, location: stockLocation, hazard });
            }}
          >
            <input value={stockItem} onChange={(event) => setStockItem(event.currentTarget.value)} className={fieldClass} aria-label="Lab stock item" placeholder="Chemical/apparatus" required />
            <select value={stockCategory} onChange={(event) => setStockCategory(event.currentTarget.value as LabInventoryRecord["category"])} className={fieldClass} aria-label="Lab stock category">
              <option>Chemical</option>
              <option>Apparatus</option>
              <option>Asset</option>
            </select>
            <input value={stockQuantity} onChange={(event) => setStockQuantity(event.currentTarget.value)} className={fieldClass} aria-label="Lab stock quantity" inputMode="numeric" placeholder="Quantity" required />
            <input value={stockUnit} onChange={(event) => setStockUnit(event.currentTarget.value)} className={fieldClass} aria-label="Lab stock unit" placeholder="Unit" required />
            <input value={stockLocation} onChange={(event) => setStockLocation(event.currentTarget.value)} className={fieldClass} aria-label="Lab stock location" placeholder="Location" required />
            <select value={hazard} onChange={(event) => setHazard(event.currentTarget.value as LabInventoryRecord["hazard"])} className={fieldClass} aria-label="Hazard level">
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
            <button type="submit" className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">Add Chemical Stock</button>
          </form>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-black text-foreground">Chemical and apparatus inventory</h3>
            <StatusPill label={`${inventory.length} items`} tone="ok" />
          </div>
          <div className="mt-3 space-y-2">
            {inventory.map((item) => (
              <div key={item.id} className="rounded-xl border border-[#D7E0EF] bg-surface-muted p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-black text-foreground">{item.item}</p>
                  <StatusPill label={item.status} tone={item.status === "OK" ? "ok" : item.status === "Hazard" || item.hazard === "High" ? "critical" : "warning"} compact />
                </div>
                <p className="mt-1 text-xs font-semibold text-muted">{item.quantity} {item.unit} - {item.location} - hazard {item.hazard}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-black text-foreground">Apparatus issue register</h3>
            <StatusPill label={`${issues.length} records`} tone="warning" />
          </div>
          <div className="mt-3 space-y-2">
            {issues.map((issue) => (
              <div key={issue.id} className="rounded-xl border border-[#D7E0EF] bg-surface-muted p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-black text-foreground">{issue.item}</p>
                  <StatusPill label={issue.status} tone={issue.status === "Broken" ? "critical" : issue.status === "Returned" ? "ok" : "warning"} compact />
                </div>
                <p className="mt-1 text-xs font-semibold text-muted">{issue.teacher} - {issue.className} - {issue.quantity} issued</p>
                <p className="mt-1 text-xs font-semibold text-muted">{issue.note}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => onReturnApparatus(issue.id)} className="rounded-lg border border-[#BBF7D0] px-2 py-1 text-xs font-black text-success">Return Apparatus</button>
                  <button type="button" onClick={() => onRecordBreakage(issue.id)} className="rounded-lg border border-[#FED7AA] px-2 py-1 text-xs font-black text-warning">Record Breakage</button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </aside>
    </div>
  );
}

function AccountantWorkspace({
  balances,
  payments,
  notice,
  onRecordPayment,
  onConfirmMpesa,
  onPrintReceipt,
  onSendReceiptSms,
  onSendFeeReminder,
  onRequestReversal,
  onExportFees,
}: {
  balances: FeeBalanceRecord[];
  payments: FeePaymentRecord[];
  notice: string;
  onRecordPayment: (payment: Omit<FeePaymentRecord, "id" | "receiptNo" | "parentSmsSent" | "status">) => void;
  onConfirmMpesa: (id: string) => void;
  onPrintReceipt: (id: string) => void;
  onSendReceiptSms: (id: string) => void;
  onSendFeeReminder: (studentId: string) => void;
  onRequestReversal: (id: string) => void;
  onExportFees: () => void;
}) {
  const [studentId, setStudentId] = useState(balances[0]?.id ?? "");
  const selectedStudent = balances.find((item) => item.id === studentId) ?? balances[0];
  const [amount, setAmount] = useState("2500");
  const [method, setMethod] = useState<FeePaymentRecord["method"]>("M-Pesa");
  const [voteHead, setVoteHead] = useState("Tuition");
  const [term, setTerm] = useState("Term 2 2026");
  const [reference, setReference] = useState("QNEW123456");
  const [searchTerm, setSearchTerm] = useState("");
  const fieldClass = "rounded-xl border border-[#D7E0EF] bg-white px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-[#1D4ED8]";
  const collectedToday = payments.reduce((total, item) => total + item.amount, 0);
  const pendingMpesa = payments.filter((item) => item.status === "M-Pesa Pending");
  const highBalances = balances.filter((item) => item.status === "High Balance");
  const filteredBalances = balances.filter((item) => `${item.student} ${item.admissionNo} ${item.className}`.toLowerCase().includes(searchTerm.toLowerCase()));
  const summaryCards: Array<{ label: string; value: string; helper: string; tone: "ok" | "warning" | "critical"; Icon: LucideIcon }> = [
    { label: "Fees Collected Today", value: `KSh ${collectedToday.toLocaleString("en-KE")}`, helper: "From recorded receipts", tone: "ok", Icon: CheckCircle2 },
    { label: "M-Pesa Confirmed", value: String(payments.filter((item) => item.method === "M-Pesa" && item.status === "Confirmed").length), helper: "Payment confirmations", tone: "ok", Icon: ClipboardList },
    { label: "Pending M-Pesa", value: String(pendingMpesa.length), helper: "Needs callback confirmation", tone: pendingMpesa.length > 0 ? "warning" : "ok", Icon: Clock3 },
    { label: "High Balances", value: String(highBalances.length), helper: "Above KSh 10,000", tone: highBalances.length > 0 ? "critical" : "ok", Icon: ShieldCheck },
    { label: "Receipts Printed", value: String(payments.length), helper: "Printable fee evidence", tone: "ok", Icon: Printer },
  ];

  return (
    <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-4">
        <div role="status" className="rounded-xl border border-[#B8D4FF] bg-[#EFF6FF] px-4 py-3 text-sm font-black text-[#1D4ED8]">{notice}</div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {summaryCards.map(({ label, value, helper, tone, Icon }) => (
            <Card key={label} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <Icon className="h-5 w-5 text-accent" />
                <StatusPill label={tone === "critical" ? "Urgent" : tone === "warning" ? "Check" : "OK"} tone={tone} compact />
              </div>
              <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-muted">{label}</p>
              <p className="mt-1 text-2xl font-black text-foreground">{value}</p>
              <p className="mt-1 text-xs font-semibold text-muted">{helper}</p>
            </Card>
          ))}
        </div>

        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Fee payment entry</p>
              <h3 className="mt-1 text-lg font-black text-foreground">Record payment and print receipt</h3>
              <p className="mt-1 text-sm font-semibold text-muted">Updates the student balance and keeps receipt/SMS actions available.</p>
            </div>
            <button type="button" onClick={onExportFees} className="rounded-xl border border-[#D7E0EF] px-3 py-2 text-sm font-black text-[#071D49]">Export Fee List CSV</button>
          </div>
          <form
            className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6"
            onSubmit={(event) => {
              event.preventDefault();
              if (!selectedStudent) return;
              onRecordPayment({
                student: selectedStudent.student,
                admissionNo: selectedStudent.admissionNo,
                amount: Number(amount),
                method,
                voteHead,
                term,
                reference,
              });
            }}
          >
            <select value={studentId} onChange={(event) => setStudentId(event.currentTarget.value)} className={fieldClass} aria-label="Fee student">
              {balances.map((student) => <option key={student.id} value={student.id}>{student.student} - {student.admissionNo}</option>)}
            </select>
            <input value={amount} onChange={(event) => setAmount(event.currentTarget.value)} className={fieldClass} aria-label="Payment amount" inputMode="numeric" placeholder="Amount" required />
            <select value={method} onChange={(event) => setMethod(event.currentTarget.value as FeePaymentRecord["method"])} className={fieldClass} aria-label="Payment method">
              <option>M-Pesa</option>
              <option>Cash</option>
              <option>Bank</option>
              <option>Bursary</option>
            </select>
            <select value={voteHead} onChange={(event) => setVoteHead(event.currentTarget.value)} className={fieldClass} aria-label="Vote head">
              <option>Tuition</option>
              <option>Boarding</option>
              <option>Transport</option>
              <option>Lunch</option>
              <option>Exam</option>
            </select>
            <input value={term} onChange={(event) => setTerm(event.currentTarget.value)} className={fieldClass} aria-label="Payment term" placeholder="Term" required />
            <input value={reference} onChange={(event) => setReference(event.currentTarget.value)} className={fieldClass} aria-label="Payment reference" placeholder="Reference" required />
            <button type="submit" className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white md:col-span-2 xl:col-span-6">Record Payment</button>
          </form>
        </Card>

        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Recent payments</p>
              <h3 className="mt-1 text-lg font-black text-foreground">Receipts, SMS, and M-Pesa confirmations</h3>
            </div>
            <StatusPill label={`${payments.length} payments`} tone="ok" />
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-[#D7E0EF]">
            <table className="min-w-full divide-y divide-[#E2E8F0] text-sm">
              <thead className="bg-[#F8FAFC] text-left text-xs font-black uppercase tracking-[0.12em] text-muted">
                <tr>{["Student", "Amount", "Method", "Receipt", "Status", "Action"].map((column) => <th key={column} className="px-3 py-3">{column}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] bg-white">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-3 py-3 font-black text-foreground">{payment.student}<span className="block text-xs font-semibold text-muted">{payment.admissionNo}</span></td>
                    <td className="px-3 py-3 font-semibold text-muted">KSh {payment.amount.toLocaleString("en-KE")}</td>
                    <td className="px-3 py-3 font-semibold text-muted">{payment.method} - {payment.reference}</td>
                    <td className="px-3 py-3 font-semibold text-muted">{payment.receiptNo}</td>
                    <td className="px-3 py-3"><StatusPill label={payment.status} tone={payment.status === "Confirmed" || payment.status === "Recorded" ? "ok" : payment.status === "Reversal Requested" ? "critical" : "warning"} compact /></td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => onConfirmMpesa(payment.id)} className="rounded-lg border border-[#BBF7D0] px-2 py-1 text-xs font-black text-success">Confirm M-Pesa</button>
                        <button type="button" onClick={() => onPrintReceipt(payment.id)} className="rounded-lg border border-[#B8D4FF] px-2 py-1 text-xs font-black text-[#1D4ED8]">Print Receipt</button>
                        <button type="button" onClick={() => onSendReceiptSms(payment.id)} className="rounded-lg border border-[#FED7AA] px-2 py-1 text-xs font-black text-warning">Send Receipt SMS</button>
                        <button type="button" onClick={() => onRequestReversal(payment.id)} className="rounded-lg border border-[#FECACA] px-2 py-1 text-xs font-black text-danger">Request Reversal</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <aside className="space-y-4">
        <Card className="p-5">
          <h3 className="text-lg font-black text-foreground">Student balance search</h3>
          <input value={searchTerm} onChange={(event) => setSearchTerm(event.currentTarget.value)} className={`${fieldClass} mt-4 w-full`} aria-label="Search fee balances" placeholder="Search student, admission no, class" />
          <div className="mt-3 space-y-2">
            {filteredBalances.map((student) => (
              <div key={student.id} className="rounded-xl border border-[#D7E0EF] bg-surface-muted p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-black text-foreground">{student.student}</p>
                  <StatusPill label={student.status} tone={student.status === "Clear" ? "ok" : student.status === "High Balance" ? "critical" : "warning"} compact />
                </div>
                <p className="mt-1 text-xs font-semibold text-muted">{student.className} - {student.admissionNo} - balance KSh {student.balance.toLocaleString("en-KE")}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => onSendFeeReminder(student.id)} className="rounded-lg border border-[#FED7AA] px-2 py-1 text-xs font-black text-warning">Send Fee Reminder</button>
                  <button type="button" onClick={() => onExportFees()} className="rounded-lg border border-[#D7E0EF] px-2 py-1 text-xs font-black text-[#071D49]">Print Statement</button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </aside>
    </div>
  );
}

function SecretaryWorkspace({
  visitors,
  inquiries,
  balances,
  notice,
  onRegisterVisitor,
  onPrintVisitorSlip,
  onCheckOutVisitor,
  onPrintFeeStatement,
  onMarkParentServed,
  onSendParentSms,
  onEscalateInquiry,
  onAddInquiry,
}: {
  visitors: SecretaryVisitorRecord[];
  inquiries: SecretaryInquiryRecord[];
  balances: FeeBalanceRecord[];
  notice: string;
  onRegisterVisitor: (visitor: Omit<SecretaryVisitorRecord, "id" | "status" | "checkInTime" | "slipPrinted">) => void;
  onPrintVisitorSlip: (id: string) => void;
  onCheckOutVisitor: (id: string) => void;
  onPrintFeeStatement: (student: FeeBalanceRecord) => void;
  onMarkParentServed: (id: string) => void;
  onSendParentSms: (id: string) => void;
  onEscalateInquiry: (id: string) => void;
  onAddInquiry: (record: Omit<SecretaryInquiryRecord, "id" | "status" | "smsSent">) => void;
}) {
  const [visitor, setVisitor] = useState("Jane Wairimu");
  const [phoneOrId, setPhoneOrId] = useState("0711 222 333");
  const [visiting, setVisiting] = useState("Principal Office");
  const [reason, setReason] = useState("Meeting appointment");
  const [vehicle, setVehicle] = useState("");
  const [parent, setParent] = useState("Mrs. Wanjiku");
  const [student, setStudent] = useState("Brian Otieno");
  const [className, setClassName] = useState("Form 2 East");
  const [phone, setPhone] = useState("0712 345 678");
  const [issue, setIssue] = useState("Fee statement request");
  const [department, setDepartment] = useState<SecretaryInquiryRecord["department"]>("Finance");
  const [studentSearch, setStudentSearch] = useState("");
  const fieldClass = "rounded-xl border border-[#D7E0EF] bg-white px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-[#1D4ED8]";
  const waitingParents = inquiries.filter((item) => item.status === "Waiting");
  const waitingVisitors = visitors.filter((item) => item.status === "Waiting");
  const insideVisitors = visitors.filter((item) => item.status === "Inside" || item.status === "Overstayed");
  const filteredStudents = balances.filter((item) => `${item.student} ${item.admissionNo} ${item.parentPhone}`.toLowerCase().includes(studentSearch.toLowerCase()));
  const summaryCards: Array<{ label: string; value: string; helper: string; tone: "ok" | "warning" | "critical"; Icon: LucideIcon }> = [
    { label: "Parents Waiting", value: String(waitingParents.length), helper: "Front office queue", tone: waitingParents.length > 0 ? "warning" : "ok", Icon: ClipboardList },
    { label: "Visitors Waiting", value: String(waitingVisitors.length), helper: "Gate/front desk log", tone: waitingVisitors.length > 0 ? "warning" : "ok", Icon: Clock3 },
    { label: "Visitors Inside", value: String(insideVisitors.length), helper: "Security gate log", tone: insideVisitors.length > 0 ? "warning" : "ok", Icon: ShieldCheck },
    { label: "Documents Requested", value: String(inquiries.filter((item) => /letter|statement|report/i.test(item.issue)).length), helper: "Letters and statements", tone: "warning", Icon: Printer },
    { label: "SMS Sent", value: String(inquiries.filter((item) => item.smsSent).length), helper: "Parent communication", tone: "ok", Icon: MessageCircle },
  ];

  return (
    <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-4">
        <div role="status" className="rounded-xl border border-[#B8D4FF] bg-[#EFF6FF] px-4 py-3 text-sm font-black text-[#1D4ED8]">{notice}</div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {summaryCards.map(({ label, value, helper, tone, Icon }) => (
            <Card key={label} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <Icon className="h-5 w-5 text-accent" />
                <StatusPill label={tone === "critical" ? "Urgent" : tone === "warning" ? "Check" : "OK"} tone={tone} compact />
              </div>
              <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-muted">{label}</p>
              <p className="mt-1 text-2xl font-black text-foreground">{value}</p>
              <p className="mt-1 text-xs font-semibold text-muted">{helper}</p>
            </Card>
          ))}
        </div>

        <Card className="p-5">
          <div>
            <p className="eyebrow">Fast visitor check-in</p>
            <h3 className="mt-1 text-lg font-black text-foreground">Register visitor and issue slip</h3>
            <p className="mt-1 text-sm font-semibold text-muted">Designed for parent rush hours and visiting days.</p>
          </div>
          <form
            className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5"
            onSubmit={(event) => {
              event.preventDefault();
              onRegisterVisitor({ visitor, phoneOrId, visiting, reason, vehicle });
            }}
          >
            <input value={visitor} onChange={(event) => setVisitor(event.currentTarget.value)} className={fieldClass} aria-label="Visitor name" placeholder="Visitor name" required />
            <input value={phoneOrId} onChange={(event) => setPhoneOrId(event.currentTarget.value)} className={fieldClass} aria-label="Visitor phone or ID" placeholder="Phone/ID" required />
            <input value={visiting} onChange={(event) => setVisiting(event.currentTarget.value)} className={fieldClass} aria-label="Person being visited" placeholder="Visiting" required />
            <input value={reason} onChange={(event) => setReason(event.currentTarget.value)} className={fieldClass} aria-label="Visit reason" placeholder="Reason" required />
            <input value={vehicle} onChange={(event) => setVehicle(event.currentTarget.value)} className={fieldClass} aria-label="Vehicle number" placeholder="Vehicle no. optional" />
            <button type="submit" className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white md:col-span-2 xl:col-span-5">Check In Visitor</button>
          </form>
        </Card>

        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Parent queue</p>
              <h3 className="mt-1 text-lg font-black text-foreground">Parent inquiries and document requests</h3>
            </div>
            <StatusPill label={`${inquiries.length} requests`} tone="warning" />
          </div>
          <form
            className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault();
              onAddInquiry({ parent, student, className, phone, issue, department });
            }}
          >
            <input value={parent} onChange={(event) => setParent(event.currentTarget.value)} className={fieldClass} aria-label="Parent name" placeholder="Parent name" required />
            <input value={student} onChange={(event) => setStudent(event.currentTarget.value)} className={fieldClass} aria-label="Inquiry student" placeholder="Student" required />
            <input value={className} onChange={(event) => setClassName(event.currentTarget.value)} className={fieldClass} aria-label="Inquiry class" placeholder="Class/Form" required />
            <input value={phone} onChange={(event) => setPhone(event.currentTarget.value)} className={fieldClass} aria-label="Parent phone" placeholder="Parent phone" required />
            <input value={issue} onChange={(event) => setIssue(event.currentTarget.value)} className={`${fieldClass} md:col-span-2`} aria-label="Inquiry issue" placeholder="Issue/request" required />
            <select value={department} onChange={(event) => setDepartment(event.currentTarget.value as SecretaryInquiryRecord["department"])} className={fieldClass} aria-label="Inquiry department">
              <option>Finance</option>
              <option>Admissions</option>
              <option>Discipline</option>
              <option>Medical</option>
              <option>Academics</option>
              <option>Principal</option>
            </select>
            <button type="submit" className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">Register Complaint</button>
          </form>
          <div className="mt-4 overflow-x-auto rounded-xl border border-[#D7E0EF]">
            <table className="min-w-full divide-y divide-[#E2E8F0] text-sm">
              <thead className="bg-[#F8FAFC] text-left text-xs font-black uppercase tracking-[0.12em] text-muted">
                <tr>{["Parent", "Student", "Issue", "Status", "SMS", "Action"].map((column) => <th key={column} className="px-3 py-3">{column}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] bg-white">
                {inquiries.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-3 font-black text-foreground">{item.parent}<span className="block text-xs font-semibold text-muted">{item.phone}</span></td>
                    <td className="px-3 py-3 font-semibold text-muted">{item.student} - {item.className}</td>
                    <td className="px-3 py-3 font-semibold text-muted">{item.issue}<span className="block text-xs">{item.department}</span></td>
                    <td className="px-3 py-3"><StatusPill label={item.status} tone={item.status === "Resolved" ? "ok" : item.status === "Escalated" ? "critical" : "warning"} compact /></td>
                    <td className="px-3 py-3"><StatusPill label={item.smsSent ? "Sent" : "Not sent"} tone={item.smsSent ? "ok" : "warning"} compact /></td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => onMarkParentServed(item.id)} className="rounded-lg border border-[#BBF7D0] px-2 py-1 text-xs font-black text-success">Mark Parent Served</button>
                        <button type="button" onClick={() => onSendParentSms(item.id)} className="rounded-lg border border-[#FED7AA] px-2 py-1 text-xs font-black text-warning">Send SMS</button>
                        <button type="button" onClick={() => onEscalateInquiry(item.id)} className="rounded-lg border border-[#B8D4FF] px-2 py-1 text-xs font-black text-[#1D4ED8]">Escalate Issue</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <aside className="space-y-4">
        <Card className="p-5">
          <h3 className="text-lg font-black text-foreground">Student quick search</h3>
          <input value={studentSearch} onChange={(event) => setStudentSearch(event.currentTarget.value)} className={`${fieldClass} mt-4 w-full`} aria-label="Secretary student search" placeholder="Search name, admission no, parent phone" />
          <div className="mt-3 space-y-2">
            {filteredStudents.map((studentRecord) => (
              <div key={studentRecord.id} className="rounded-xl border border-[#D7E0EF] bg-surface-muted p-3">
                <p className="text-sm font-black text-foreground">{studentRecord.student}</p>
                <p className="mt-1 text-xs font-semibold text-muted">{studentRecord.className} - {studentRecord.admissionNo} - balance KSh {studentRecord.balance.toLocaleString("en-KE")}</p>
                <button type="button" onClick={() => onPrintFeeStatement(studentRecord)} className="mt-2 rounded-lg border border-[#B8D4FF] px-2 py-1 text-xs font-black text-[#1D4ED8]">Print Fee Statement</button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-lg font-black text-foreground">Visitors currently inside</h3>
          <div className="mt-3 space-y-2">
            {visitors.map((item) => (
              <div key={item.id} className="rounded-xl border border-[#D7E0EF] bg-surface-muted p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-black text-foreground">{item.visitor}</p>
                  <StatusPill label={item.status} tone={item.status === "Exited" ? "ok" : item.status === "Overstayed" ? "critical" : "warning"} compact />
                </div>
                <p className="mt-1 text-xs font-semibold text-muted">{item.phoneOrId} - visiting {item.visiting} - {item.checkInTime}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => onPrintVisitorSlip(item.id)} className="rounded-lg border border-[#B8D4FF] px-2 py-1 text-xs font-black text-[#1D4ED8]">Print Visitor Slip</button>
                  <button type="button" onClick={() => onCheckOutVisitor(item.id)} className="rounded-lg border border-[#BBF7D0] px-2 py-1 text-xs font-black text-success">Check Out Visitor</button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </aside>
    </div>
  );
}

function WorkflowMap({ workflows }: { workflows: string[] }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <RadioTower className="h-4 w-4 text-accent" />
        <h2 className="text-lg font-bold text-foreground">Task progress</h2>
      </div>
      <div className="mt-4 space-y-3">
        {workflows.map((workflow, workflowIndex) => (
          <div key={`${workflow}-${workflowIndex}`} className="rounded-[var(--radius-sm)] border border-border bg-surface-muted/70 p-3">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-muted">Process {workflowIndex + 1}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {workflow.split("->").map((step, stepIndex) => (
                <div key={`${workflow}-${step}-${stepIndex}`} className="flex items-center gap-2">
                  <span className="rounded-full border border-accent/25 bg-accent-soft px-3 py-1 text-xs font-bold text-accent">
                    {schoolFriendlyText(step.trim())}
                  </span>
                  {stepIndex < workflow.split("->").length - 1 ? (
                    <span className="text-xs font-black text-muted">-&gt;</span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ExecutionInlineNotice({ items }: { items: ExecutionLogItem[] }) {
  const latest = items[0];

  if (!latest) {
    return null;
  }

  return (
    <div className="rounded-xl border border-[#D7E0EF] bg-white/75 px-3 py-2 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs font-bold text-[#071D49]">{latest.label}</p>
        <StatusPill label={latest.status} tone={latest.status === "SUCCESS" ? "ok" : latest.status === "FAILED" ? "critical" : "warning"} compact />
      </div>
      <p className="mt-1 text-[11px] font-semibold text-[#40608F]">{latest.events.map(schoolFriendlyText).join(", ")}</p>
      <p className="mt-1 text-[11px] font-semibold text-[#40608F]">Saved for reporting</p>
    </div>
  );
}

function RecoveryPanel({ blueprint }: { blueprint: OperationalRoleBlueprint }) {
  const stateLabels: Record<string, string> = {
    ACTIVE: "Working",
    LOADING: "Loading",
    EMPTY: "No records",
    DEGRADED: "Retry available",
    FAILED: "Needs attention",
    LOCKED: "No permission",
  };

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-accent" />
          <h2 className="text-lg font-bold text-foreground">Connection and form safety</h2>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {["ACTIVE", ...blueprint.states.filter((state) => state !== "LOADING")].map((state) => (
            <span
              key={state}
              className="rounded-xl border border-border bg-primary-soft/40 px-3 py-2 text-xs font-black text-muted"
            >
              {stateLabels[state] ?? schoolFriendlyText(state)}
            </span>
          ))}
        </div>
      </Card>
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <WifiOff className="h-4 w-4 text-accent" />
          <h2 className="text-lg font-bold text-foreground">Low-bandwidth continuity</h2>
        </div>
        <div className="mt-3 space-y-2">
          {blueprint.lowBandwidthBehavior.map((item) => (
            <p key={item} className="rounded-xl border border-border bg-surface-muted px-3 py-2 text-xs font-semibold text-muted">
              {schoolFriendlyText(item)}
            </p>
          ))}
        </div>
      </Card>
    </div>
  );
}

function WorkspaceActionStrip({
  actions,
  onExecute,
}: {
  actions: OperationalActionContract[];
  onExecute: (action: OperationalActionContract) => void;
}) {
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Section actions</p>
          <h3 className="mt-1 text-base font-black text-foreground">Useful school actions</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <OperationalActionButton
              key={action.actionId}
              action={action}
              onExecute={(nextAction) => onExecute(nextAction)}
              compact
            />
          ))}
        </div>
      </div>
    </Card>
  );
}

function RoleSearchPanel({
  query,
  results,
  onOpen,
}: {
  query: string;
  results: RoleSearchResult[];
  onOpen: (result: RoleSearchResult) => void;
}) {
  return (
    <Card className="p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Search results</p>
          <h2 className="mt-1 text-lg font-black text-foreground">Records and actions matching {query}</h2>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-muted">
            Results open the right section, record list, form, or task queue. No search result leaves the role&apos;s permitted desk.
          </p>
        </div>
        <StatusPill label={`${results.length} found`} tone={results.length ? "ok" : "warning"} />
      </div>

      <div className="mt-4 space-y-3">
        {results.length === 0 ? (
          <div className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-8 text-center">
            <p className="text-sm font-black text-foreground">No matching school record found.</p>
            <p className="mt-2 text-sm font-semibold text-muted">
              Try a student name, admission number, parent phone, receipt code, class, book barcode, visitor phone, item name, or task owner.
            </p>
          </div>
        ) : results.map((result) => (
          <button
            key={result.id}
            type="button"
            onClick={() => onOpen(result)}
            className="grid w-full gap-3 rounded-[var(--radius-sm)] border border-border bg-surface-muted/80 p-4 text-left transition hover:-translate-y-0.5 hover:border-accent/35 md:grid-cols-[minmax(0,1fr)_auto]"
          >
            <span>
              <span className="block text-sm font-black text-foreground">{result.label}</span>
              <span className="mt-1 block text-xs font-semibold leading-5 text-muted">{result.detail}</span>
            </span>
            <span className="inline-flex items-center justify-center rounded-[var(--radius-xs)] border border-accent/25 bg-accent-soft px-3 py-2 text-xs font-black text-accent">
              {result.actionLabel}
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}

function OutputGovernancePanel({ blueprint, role }: { blueprint: OperationalRoleBlueprint; role: SchoolExperienceRole }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-accent" />
        <h2 className="text-base font-bold text-foreground">Reports, messages, and connected school desks</h2>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <div>
          <p className="eyebrow">Printable reports</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {blueprint.printOutputs.map((output) => (
              <span key={output} className="rounded-xl border border-border bg-primary-soft/35 px-3 py-2 text-xs font-bold text-muted">
                {schoolFriendlyText(output)}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="eyebrow">Messages</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {blueprint.communicationTriggers.map((trigger) => (
              <span key={trigger} className="rounded-xl border border-border bg-surface-muted px-3 py-2 text-xs font-bold text-muted">
                {schoolFriendlyText(trigger)}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="eyebrow">Connected desks</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {blueprint.dependencies.map((dependency) => (
              <span key={dependency} className="rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold text-muted">
                {schoolFriendlyText(dependency)}
              </span>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-surface-muted px-3 py-2 text-xs font-semibold text-muted">
        <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
        {titleizeRole(role)} actions check permission, update the right records, notify related desks, and keep a reporting record.
      </p>
    </Card>
  );
}

function WorkspacePanelTabs({
  activePanel,
  onChange,
}: {
  activePanel: WorkspacePanel;
  onChange: (panel: WorkspacePanel) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-[#D7E0EF] bg-white/70 p-2 shadow-sm">
      {workspacePanels.map((panel) => (
        <button
          key={panel.id}
          type="button"
          onClick={() => onChange(panel.id)}
          aria-pressed={activePanel === panel.id}
          className={`rounded-xl px-3 py-2 text-xs font-black transition hover:-translate-y-0.5 ${
            activePanel === panel.id
              ? "bg-[#0B3A7A] text-white shadow-[0_10px_28px_rgba(11,58,122,0.22)]"
              : "bg-white text-[#40608F] hover:bg-[#EDF4FF]"
          }`}
        >
          {panel.label}
        </button>
      ))}
    </div>
  );
}

function KisumuBoysDemoFeedPanel({
  feed,
  score,
  role,
  profile,
  onExecute,
}: {
  feed: ReturnType<typeof getKisumuBoysRoleFeed>;
  score: ReturnType<typeof scoreKisumuBoysHighDemoReadiness>;
  role: SchoolExperienceRole;
  profile: PracticalRoleProfile;
  onExecute: (action: OperationalActionContract) => void;
}) {
  if (feed.length === 0) {
    return null;
  }

  return (
    <Card className="border-[#B8D4FF] bg-[linear-gradient(135deg,#FFFFFF_0%,#EDF5FF_100%)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Kisumu Boys High live updates</p>
          <h3 className="mt-1 text-lg font-black text-[#071D49]">{profile.sidebarTitle} activity is active</h3>
          <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-[#40608F]">
            {profile.todayContext} These records come from the {profile.sectionNoun} and update when staff complete
            their daily actions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill label={`${score.score}/100 ready`} tone="ok" />
          <StatusPill label={`${score.eventCount} school updates`} tone="warning" />
          <StatusPill label={`${score.widgetCount} sections`} tone="ok" />
        </div>
      </div>
      <div className="mt-4 grid gap-3">
        {feed.slice(0, 18).map((item, index) => {
          const action: OperationalActionContract = {
            actionId: `kisumu-boys-${slug(role)}-${slug(item.id)}-${index}`,
            label: schoolFriendlyActionLabel(item.action),
            capability: "CAN_OPERATE_KISUMU_BOYS_DEMO",
            workflowBinding: item.queue,
            executionHandler: `demo.kisumu-boys.${slug(item.id)}.execute`,
            eventContract: [item.eventType],
            auditEvent: item.auditId,
            retryPolicy: "RETRY",
            fallbackHandler: "retry.school.update",
            health: "ACTIVE",
          };

          return (
            <div
              key={item.id}
              className="grid gap-3 rounded-xl border border-[#D7E0EF] bg-white/85 p-3 shadow-sm md:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill label={schoolFriendlyText(item.eventType.replace(/_/g, " "))} tone="ok" compact />
                  <p className="text-sm font-black text-[#071D49]">{item.title}</p>
                </div>
                <p className="mt-1 text-xs font-semibold leading-5 text-[#52657F]">{item.body}</p>
                <p className="mt-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#40608F]">
                  Work list: {schoolFriendlyText(item.queue)} | update record ready
                </p>
              </div>
              <OperationalActionButton action={action} onExecute={onExecute} compact />
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function kisumuBoysFeedMatchesWorkspace(
  item: ReturnType<typeof getKisumuBoysRoleFeed>[number],
  kind: WorkspaceKind,
) {
  if (kind === "command") {
    return true;
  }

  const haystack = `${item.title} ${item.body} ${item.queue} ${item.action} ${item.eventType}`.toLowerCase();
  const patternsByKind: Record<WorkspaceKind, RegExp[]> = {
    command: [/.*/],
    approval: [/approval|approve|dean|principal|decision|waiver|review|moderation/],
    academic: [/exam|grade|report card|marks|subject|syllabus|academic|lesson|performance|lms|assignment/],
    finance: [/fee|m-pesa|mpesa|payment|cash|waiver|bursary|receipt|arrears|billing|callback/],
    attendance: [/attendance|absence|absent|late|roll call|teacher attendance/],
    discipline: [/discipline|case|incident|bullying|hearing|suspension|prefect/],
    communication: [/sms|message|notice|announcement|parent|meeting|communication/],
    students: [/student|learner|welfare|guardian|profile|risk/],
    staff: [/staff|teacher|movement|duty|leave|role|hr/],
    transport: [/transport|bus|route|trip|fuel|vehicle|driver|eta/],
    inventory: [/inventory|stock|asset|procurement|store|supplier|issue|toner|projector/],
    library: [/library|book|barcode|overdue|fine|borrow|return/],
    clinic: [/clinic|medicine|medical|sick|referral|vitals|health/],
    counselling: [/counselling|counseling|wellness|session|emotional|intervention/],
    boarding: [/boarding|hostel|dorm|roll call|exeat|boarder|bed/],
    security: [/security|visitor|gate|exit|vehicle|emergency|overstay/],
    laboratory: [/lab|laboratory|chemical|apparatus|practical|hazard|microscope/],
    admissions: [/admission|application|inquiry|interview|documents|onboarding/],
    reports: [/report|export|document|print|board report|generated/],
    settings: [/setting|module|role|policy|m-pesa|sms provider|configuration|backup/],
    audit: [/audit|event|replay|logs|system health|failed|backup|monitor|degraded/],
    general: [/.*/],
  };

  return patternsByKind[kind].some((pattern) => pattern.test(haystack));
}

function filterKisumuBoysFeedForWorkspace({
  feed,
  kind,
}: {
  feed: ReturnType<typeof getKisumuBoysRoleFeed>;
  kind: WorkspaceKind;
}) {
  const filtered = feed.filter((item) => kisumuBoysFeedMatchesWorkspace(item, kind));

  if (kind === "command" || kind === "general") {
    return filtered.slice(0, 16);
  }

  return filtered.slice(0, 18);
}

function kisumuBoysFeedToRuntimeEntries({
  feed,
  workspace,
}: {
  feed: ReturnType<typeof getKisumuBoysRoleFeed>;
  workspace: string;
}): RuntimeWorkspaceEntry[] {
  return feed.slice(0, 12).map((item, index) => ({
    id: `demo-${slug(item.id)}-${index}`,
    workspace,
    title: item.title,
    actionLabel: item.action,
    source: "queue",
    values: {
      item: item.title,
      owner: schoolFriendlyText(item.queue),
      status: schoolFriendlyText(item.eventType.replace(/_/g, " ")),
      "next-action": schoolFriendlyActionLabel(item.action),
      "saved-record": "Ready",
    },
    status: "Action dispatched",
    createdAt: "2026-05-27T06:45:00.000+03:00",
  }));
}

function limitQueueContract(contract: OperationalQueueContract, limit: number): OperationalQueueContract {
  const limitedItems = contract.items.slice(0, limit);

  return {
    ...contract,
    description: `${contract.description} Showing ${limitedItems.length} focused items here; use Records for the wider school list.`,
    items: limitedItems,
  };
}

function hasBroadSchoolSearch(role: SchoolExperienceRole) {
  return role === "principal"
    || role === "deputy-principal"
    || role === "secretary"
    || role === "accountant"
    || role === "bursar";
}

function searchPlaceholder(role: SchoolExperienceRole, profile: PracticalRoleProfile, workspace: string) {
  if (hasBroadSchoolSearch(role)) {
    return "Search students, parents, receipts, visitors, staff";
  }

  return `Search this ${profile.sectionNoun || schoolFriendlyText(workspace.toLowerCase())}`;
}

function buildRoleSearchResults({
  query,
  role,
  profile,
  sidebarItems,
  activeWorkspace,
  queueContract,
  tableContract,
  formContract,
  actions,
}: {
  query: string;
  role: SchoolExperienceRole;
  profile: PracticalRoleProfile;
  sidebarItems: string[];
  activeWorkspace: string;
  queueContract: OperationalQueueContract;
  tableContract: OperationalTableContract;
  formContract: OperationalFormContract;
  actions: OperationalActionContract[];
}): RoleSearchResult[] {
  const term = query.trim().toLowerCase();

  if (!term) {
    return [];
  }

  const broadSearch = hasBroadSchoolSearch(role);
  const allowedWorkspaces = broadSearch ? sidebarItems : [activeWorkspace];
  const results: RoleSearchResult[] = [];

  function addResult(result: RoleSearchResult, haystack: string) {
    if (results.length >= 18) {
      return;
    }

    if (haystack.toLowerCase().includes(term)) {
      results.push(result);
    }
  }

  allowedWorkspaces.forEach((workspace) => {
    addResult(
      {
        id: `section-${slug(workspace)}`,
        label: schoolFriendlyText(workspace),
        detail: broadSearch
          ? `Open the ${schoolFriendlyText(workspace.toLowerCase())} section.`
          : `Open records for this ${profile.sectionNoun}.`,
        workspace,
        panel: "queue",
        actionLabel: "Open section",
      },
      workspace,
    );
  });

  profile.summaryCards.forEach((card) => {
    addResult(
      {
        id: `summary-${slug(card.label)}`,
        label: card.label,
        detail: `${card.value} - ${card.helper} (${card.source})`,
        workspace: activeWorkspace,
        panel: "queue",
        actionLabel: "Open summary",
      },
      `${card.label} ${card.value} ${card.helper} ${card.source}`,
    );
  });

  profile.urgentAlerts.forEach((alert, index) => {
    addResult(
      {
        id: `alert-${index}-${slug(alert)}`,
        label: alert,
        detail: "Urgent school item waiting for review.",
        workspace: activeWorkspace,
        panel: "queue",
        actionLabel: "Open alert",
      },
      alert,
    );
  });

  queueContract.items.forEach((item) => {
    addResult(
      {
        id: `queue-${item.id}`,
        label: item.title,
        detail: `Owner: ${item.owner}. Due: ${item.sla}.`,
        workspace: activeWorkspace,
        panel: "queue",
        actionLabel: "Open task",
      },
      `${item.title} ${item.owner} ${item.sla} ${item.workflow} ${item.actions.map((action) => action.label).join(" ")}`,
    );
  });

  tableContract.rows.forEach((row) => {
    addResult(
      {
        id: `record-${row.id}`,
        label: Object.values(row.cells)[0] ?? row.id,
        detail: Object.values(row.cells).slice(1, 4).join(" | "),
        workspace: activeWorkspace,
        panel: "records",
        actionLabel: "Open record",
      },
      `${row.id} ${Object.values(row.cells).join(" ")} ${row.actions.join(" ")}`,
    );
  });

  formContract.fields.forEach((field) => {
    addResult(
      {
        id: `form-${field.id}`,
        label: field.label,
        detail: `Open ${formContract.title} and fill ${field.label}.`,
        workspace: activeWorkspace,
        panel: "form",
        actionLabel: "Open form",
      },
      `${field.label} ${field.value ?? ""} ${field.options?.join(" ") ?? ""}`,
    );
  });

  actions.forEach((action) => {
    addResult(
      {
        id: `action-${action.actionId}`,
        label: action.label,
        detail: "School action button available in this section.",
        workspace: activeWorkspace,
        panel: "queue",
        actionLabel: action.label,
      },
      `${action.label} ${action.capability} ${action.workflowBinding}`,
    );
  });

  return results;
}

export function RoleOperationalCommandCenter(props: {
  role: SchoolExperienceRole;
  initialSection?: string;
  initialWorkspace?: string;
  tenantSlug?: string | null;
  routeMode?: "hosted" | "public";
}) {
  if (props.role === "principal") {
    return (
      <PrincipalPracticalCommandCenter
        initialSection={props.initialSection}
        initialWorkspace={props.initialWorkspace}
        tenantSlug={props.tenantSlug}
      />
    );
  }

  return <GenericRoleOperationalCommandCenter {...props} />;
}

function GenericRoleOperationalCommandCenter({
  role,
  initialSection,
  initialWorkspace,
  tenantSlug,
}: {
  role: SchoolExperienceRole;
  initialSection?: string;
  initialWorkspace?: string;
  tenantSlug?: string | null;
}) {
  const blueprintId = roleIdMap[role];
  const blueprint = blueprintId ? getOperationalRoleBlueprint(blueprintId) : null;
  const roleTitle = titleizeRole(role);
  const roleProfile = getPracticalRoleProfile(role);
  const commandTitle = roleProfile.title || commandCenterTitle(role);
  const greetingName = getSchoolRoleGreetingName(role);
  const schoolId = getCurrentSchoolId(tenantSlug);
  const sidebarItems = useMemo(() => blueprint?.sidebar ?? [], [blueprint?.sidebar]);
  const routeWorkspaceKey = `${initialSection ?? ""}:${initialWorkspace ?? ""}`;
  const preferredWorkspace = useMemo(
    () => resolvePreferredWorkspace({
      role,
      sidebarItems,
      initialSection,
      initialWorkspace,
    }),
    [initialSection, initialWorkspace, role, sidebarItems],
  );
  const [workspaceSelection, setWorkspaceSelection] = useState<{
    routeKey: string;
    workspace: string | null;
  }>({
    routeKey: routeWorkspaceKey,
    workspace: null,
  });
  const activeWorkspace =
    workspaceSelection.routeKey === routeWorkspaceKey && workspaceSelection.workspace
      ? workspaceSelection.workspace
      : preferredWorkspace;
  const [activePanel, setActivePanel] = useState<WorkspacePanel>("queue");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [healthById, setHealthById] = useState<Record<string, OperationalActionHealth>>({});
  const [executionLog, setExecutionLog] = useState<ExecutionLogItem[]>([]);
  const [runtimeEntries, setRuntimeEntries] = useState<RuntimeWorkspaceEntry[]>([]);
  const [attendanceRegisters, setAttendanceRegisters] = useState<AttendanceRegisterRecord[]>([]);
  const [clinicVisits, setClinicVisits] = useState<ClinicVisitRecord[]>(initialClinicVisits);
  const [medicineStock, setMedicineStock] = useState<MedicineStockRecord[]>(initialMedicineStock);
  const [clinicNotice, setClinicNotice] = useState("Sick bay ready. Record visits, dispense medicine, notify parents, and print slips from this desk.");
  const [admissionApplicants, setAdmissionApplicants] = useState<AdmissionApplicantRecord[]>(initialAdmissionApplicants);
  const [admissionsNotice, setAdmissionsNotice] = useState("Admissions desk ready. Add inquiries, verify documents, approve learners, print letters, and notify parents.");
  const [libraryBooks, setLibraryBooks] = useState<LibraryBookRecord[]>(initialLibraryBooks);
  const [libraryLoans, setLibraryLoans] = useState<LibraryLoanRecord[]>(initialLibraryLoans);
  const [libraryNotice, setLibraryNotice] = useState("Library desk ready. Scan books, issue returns, print slips, send SMS, and track fines from this desk.");
  const [stockItems, setStockItems] = useState<StockItemRecord[]>(initialStockItems);
  const [stockMovements, setStockMovements] = useState<StockMovementRecord[]>(initialStockMovements);
  const [stockNotice, setStockNotice] = useState("Store desk ready. Receive stock, issue items, track movement history, print slips, and export reports.");
  const [boardingRollCalls, setBoardingRollCalls] = useState<BoardingRollCallRecord[]>(initialBoardingRollCalls);
  const [exeatRequests, setExeatRequests] = useState<ExeatRequestRecord[]>(initialExeatRequests);
  const [boardingNotice, setBoardingNotice] = useState("Boarding desk ready. Mark roll call, handle missing boarders, approve exeats, notify parents, and print hostel sheets.");
  const [transportVehicles, setTransportVehicles] = useState<TransportVehicleRecord[]>(initialTransportVehicles);
  const [transportTrips, setTransportTrips] = useState<TransportTripRecord[]>(initialTransportTrips);
  const [transportNotice, setTransportNotice] = useState("Transport desk ready. Record trips, mark pickups and drop-offs, alert parents, and track fuel or maintenance.");
  const [labInventory, setLabInventory] = useState<LabInventoryRecord[]>(initialLabInventory);
  const [labRequests, setLabRequests] = useState<LabPracticalRequestRecord[]>(initialLabRequests);
  const [labIssues, setLabIssues] = useState<LabIssueRecord[]>(initialLabIssues);
  const [labNotice, setLabNotice] = useState("Laboratory desk ready. Prepare practicals, track chemicals, issue apparatus, record breakages, and alert teachers.");
  const [feeBalances, setFeeBalances] = useState<FeeBalanceRecord[]>(initialFeeBalances);
  const [feePayments, setFeePayments] = useState<FeePaymentRecord[]>(initialFeePayments);
  const [financeNotice, setFinanceNotice] = useState("Finance desk ready. Record payments, confirm M-Pesa, print receipts, send SMS, and export fee lists.");
  const [secretaryVisitors, setSecretaryVisitors] = useState<SecretaryVisitorRecord[]>(initialSecretaryVisitors);
  const [secretaryInquiries, setSecretaryInquiries] = useState<SecretaryInquiryRecord[]>(initialSecretaryInquiries);
  const [secretaryNotice, setSecretaryNotice] = useState("Front office ready. Register visitors, serve parents, print slips, send SMS, and escalate issues.");

  useEffect(() => {
    function hydrateStoredSchoolRecords() {
      setClinicVisits(mergeSchoolRecordsById(initialClinicVisits, readSchoolData<ClinicVisitRecord>("clinic-visits", schoolId)));
      setMedicineStock(mergeSchoolRecordsById(initialMedicineStock, readSchoolData<MedicineStockRecord>("medicine-stock", schoolId)));
      setLibraryBooks(mergeSchoolRecordsById(initialLibraryBooks, readSchoolData<LibraryBookRecord>("library-books", schoolId)));
      setLibraryLoans(mergeSchoolRecordsById(initialLibraryLoans, readSchoolData<LibraryLoanRecord>("library-loans", schoolId)));
      setFeePayments(mergeSchoolRecordsById(initialFeePayments, readSchoolData<FeePaymentRecord>("finance-payments", schoolId)));
      setSecretaryVisitors(mergeSchoolRecordsById(initialSecretaryVisitors, readSchoolData<SecretaryVisitorRecord>("visitors", schoolId)));
      setSecretaryInquiries(mergeSchoolRecordsById(initialSecretaryInquiries, readSchoolData<SecretaryInquiryRecord>("front-office-inquiries", schoolId)));
      setAttendanceRegisters(readSchoolData<AttendanceRegisterRecord>("attendance-registers", schoolId));
    }

    hydrateStoredSchoolRecords();

    return subscribeToSchoolDataUpdates((detail) => {
      if (detail.schoolId === schoolId) {
        hydrateStoredSchoolRecords();
      }
    });
  }, [schoolId]);
  const demoRole = blueprintId ?? role;
  const useKisumuBoysDemo = shouldUseKisumuBoysDemoTenant(tenantSlug);
  const kisumuBoysRoleFeed = useMemo(
    () => (useKisumuBoysDemo ? getKisumuBoysRoleFeed(demoRole) : []),
    [demoRole, useKisumuBoysDemo],
  );
  const kisumuBoysScore = useMemo(
    () => (useKisumuBoysDemo ? scoreKisumuBoysHighDemoReadiness() : null),
    [useKisumuBoysDemo],
  );

  if (!blueprint) {
    return null;
  }

  const resolvedBlueprint = blueprint;
  const resolvedWorkspace = sidebarItems.includes(activeWorkspace) ? activeWorkspace : sidebarItems[0] ?? "Command Center";
  const activeWorkspaceIndex = Math.max(0, sidebarItems.indexOf(resolvedWorkspace));
  const activeWorkspaceKind = workspaceKind(role, resolvedWorkspace);
  const isNurseClinicWorkspace = role === "nurse" && (activeWorkspaceKind === "clinic" || /clinic command center/i.test(resolvedWorkspace));
  const isAdmissionsWorkspace = role === "admissions" && (activeWorkspaceKind === "admissions" || /admissions command center/i.test(resolvedWorkspace));
  const isLibraryWorkspace = role === "librarian" && (activeWorkspaceKind === "library" || /library command center|library operations|library desk/i.test(resolvedWorkspace));
  const isStorekeeperWorkspace = role === "storekeeper" && (activeWorkspaceKind === "inventory" || /store command center|inventory command center|inventory operations|store desk|stock/i.test(resolvedWorkspace));
  const isBoardingWorkspace = role === "boarding-master" && (activeWorkspaceKind === "boarding" || /boarding command center|hostel|dorm|roll call/i.test(resolvedWorkspace));
  const isTransportWorkspace = role === "transport-manager" && (activeWorkspaceKind === "transport" || /dashboard overview|transport|fleet|route|vehicle/i.test(resolvedWorkspace));
  const isLaboratoryWorkspace = role === "laboratory-technician" && (activeWorkspaceKind === "laboratory" || /dashboard|laboratory|lab|chemical|apparatus|practical|safety/i.test(resolvedWorkspace));
  const isAccountantWorkspace = (role === "accountant" || role === "bursar") && (activeWorkspaceKind === "finance" || /dashboard|fee|finance|receipt|payment|m-pesa|mpesa|balance/i.test(resolvedWorkspace));
  const isSecretaryWorkspace = (role === "secretary" || role === "admin") && (activeWorkspaceKind === "command" || activeWorkspaceKind === "communication" || /dashboard|front office|visitor|parent|document|appointment|communication/i.test(resolvedWorkspace));
  const isUserManagementWorkspace = role === "deputy-principal" && /user|invitation|invite|role|permission/i.test(resolvedWorkspace);
  const diagnosticsWorkspace = isDiagnosticsWorkspace(resolvedWorkspace);
  const commandWorkspace = isCommandWorkspace(resolvedWorkspace, activeWorkspaceIndex);
  const kisumuBoysFeed = filterKisumuBoysFeedForWorkspace({
    feed: kisumuBoysRoleFeed,
    kind: activeWorkspaceKind,
  });
  const demoWorkspaceEntries = kisumuBoysScore
    ? kisumuBoysFeedToRuntimeEntries({
      feed: kisumuBoysFeed,
      workspace: resolvedWorkspace,
    })
    : [];
  const attendanceWorkspaceEntries =
    activeWorkspaceKind === "attendance"
      ? attendanceRegisters.slice(0, 12).map((record, index): RuntimeWorkspaceEntry => ({
        id: `attendance-${record.id}-${index}`,
        workspace: resolvedWorkspace,
        title: `${record.className} attendance submitted`,
        actionLabel: Number(record.absent ?? 0) > 0 ? "Notify Parent" : "Open Register",
        source: "queue",
        values: {
          item: `${record.className} attendance submitted`,
          student: record.className,
          "student/class": record.className,
          owner: record.teacher ?? "Teacher",
          status: record.status,
          "next-action": Number(record.absent ?? 0) > 0 ? "Follow up absentees" : "Review register",
          absent: String(record.absent ?? 0),
          present: String(record.present ?? 0),
          "last-seen": record.markedAt
            ? new Date(record.markedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "Just now",
        },
        status: "Action dispatched",
        createdAt: record.markedAt ?? new Date().toISOString(),
      }))
      : [];
  const workspaceRuntimeEntries = [
    ...attendanceWorkspaceEntries,
    ...demoWorkspaceEntries,
    ...runtimeEntries.filter((entry) => entry.workspace === resolvedWorkspace),
  ];
  const queueContract = toQueueContract(role, resolvedBlueprint, healthById, resolvedWorkspace, activeWorkspaceIndex, workspaceRuntimeEntries);
  const visibleQueueContract = limitQueueContract(queueContract, commandWorkspace ? 5 : 8);
  const tableContract = toTableContract(role, resolvedBlueprint, activeWorkspaceIndex, resolvedWorkspace, workspaceRuntimeEntries);
  const formContract = toFormContract(role, resolvedBlueprint, activeWorkspaceIndex, resolvedWorkspace);
  const actions = workspaceActions(role, resolvedBlueprint, resolvedWorkspace, activeWorkspaceIndex, healthById);
  const roleSearchResults = buildRoleSearchResults({
    query: searchQuery,
    role,
    profile: roleProfile,
    sidebarItems,
    activeWorkspace: resolvedWorkspace,
    queueContract,
    tableContract,
    formContract,
    actions,
  });
  const isSearching = searchQuery.trim().length > 0;

  async function executeAction(
    action: OperationalActionContract,
    options?: {
      payload?: Record<string, unknown>;
      materializeEntry?: RuntimeWorkspaceEntry;
    },
  ) {
    setHealthById((current) => ({
      ...current,
      [action.actionId]: "DEGRADED",
    }));
    setExecutionLog((current) => [
      {
        id: runtimeId(`${action.actionId}-dispatching`),
        label: `${action.label} sending`,
        workflow: schoolFriendlyText(action.workflowBinding),
        audit: action.auditEvent,
        events: ["Permission checking", "Task sending"],
        status: "DEGRADED" as OperationalActionHealth,
      },
      ...current,
    ].slice(0, 6));

    try {
      const result = await dispatchOperationalWorkflowAction({
        role,
        actionId: action.actionId,
        workflowBinding: action.workflowBinding,
        payload: {
          runtimeActionContract: {
            label: action.label,
            capability: action.capability,
            workflowBinding: action.workflowBinding,
            executionHandler: action.executionHandler,
            eventContract: action.eventContract,
            auditEvent: action.auditEvent,
            retryPolicy: action.retryPolicy ?? "RETRY",
            fallbackHandler: action.fallbackHandler,
          },
          workspace: resolvedWorkspace,
          source: {
            type: options?.materializeEntry?.source ?? "workspace",
            action: action.label,
          },
          ...(options?.payload ?? {}),
        },
      });

      setHealthById((current) => ({
        ...current,
        [action.actionId]: "SUCCESS",
      }));
      setExecutionLog((current) => [
        {
          id: runtimeId(`${action.actionId}-success`),
          label: action.label,
          workflow: schoolFriendlyText(result.workflowBinding),
          audit: result.auditAction ?? action.auditEvent,
          events: result.widgetRefresh?.events?.length ? result.widgetRefresh.events.map(schoolFriendlyText) : action.eventContract.map(schoolFriendlyText),
          status: "SUCCESS" as OperationalActionHealth,
        },
        ...current,
      ].slice(0, 6));
      publishSchoolOperationalEvent({
        schoolId,
        actorRole: role,
        type: "WORKFLOW_ACTION_SENT",
        module: activeWorkspaceKind,
        title: action.label,
        body: `${action.label} completed from ${resolvedWorkspace}.`,
        entityId: action.actionId,
        severity: "success",
        payload: {
          workspace: resolvedWorkspace,
          workflowBinding: result.workflowBinding,
          eventName: result.eventName,
          auditAction: result.auditAction ?? action.auditEvent,
        },
        notifications: [
          { audienceRoles: ["principal", role], title: `${action.label} completed` },
        ],
      });
      if (options?.materializeEntry) {
        setRuntimeEntries((current) => [
          options.materializeEntry as RuntimeWorkspaceEntry,
          ...current.filter((entry) => entry.id !== options.materializeEntry?.id),
        ].slice(0, 20));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Operational dispatcher unavailable";

      setHealthById((current) => ({
        ...current,
        [action.actionId]: "FAILED",
      }));
      setExecutionLog((current) => [
        {
          id: runtimeId(`${action.actionId}-failed`),
          label: `${action.label} needs retry: ${schoolFriendlyText(message)}`,
          workflow: schoolFriendlyText(action.workflowBinding),
          audit: action.auditEvent,
          events: ["Task could not send", "Retry started", "Backup action started"],
          status: "FAILED" as OperationalActionHealth,
        },
        ...current,
      ].slice(0, 6));
      publishSchoolOperationalEvent({
        schoolId,
        actorRole: role,
        type: "WORKFLOW_ACTION_SAVED_FOR_RETRY",
        module: activeWorkspaceKind,
        title: `${action.label} saved for retry`,
        body: `${action.label} could not send immediately. Retry remains visible.`,
        entityId: action.actionId,
        severity: "warning",
        payload: {
          workspace: resolvedWorkspace,
          message,
        },
        notifications: [
          { audienceRoles: ["system-monitor", "principal", role], title: "Action saved for retry", severity: "warning" },
        ],
      });
    }
  }

  function executeFormAction(action: OperationalFormFooterAction, contract: OperationalFormContract, formData: OperationalFormValues) {
    const formEntryActions: OperationalFormFooterAction[] = ["Save Draft", "Submit", "Submit for Approval", "Save and Send SMS", "Save and Print"];
    const shouldMaterializeEntry = formEntryActions.includes(action);
    const entryId = runtimeId(`${role}-${slug(resolvedWorkspace)}`);
    const actionToDispatch = actionContract({
      role,
      label: action,
      workflowBinding: contract.workflowBinding,
      auditEvent: contract.auditAction,
      index: contract.footerActions.indexOf(action),
    });

    void executeAction(actionToDispatch, {
      payload: {
        formTitle: contract.title,
        formData,
      },
      materializeEntry: shouldMaterializeEntry
        ? {
            id: entryId,
            workspace: resolvedWorkspace,
            title: `${contract.title}: ${formData["student-selector"] ?? formData.student ?? formData["student/class"] ?? formData["transaction-code"] ?? "new entry"}`,
            formTitle: contract.title,
            actionLabel: action,
            source: "form",
            values: formData,
            status: action === "Save Draft" ? "Draft saved" : "Saved from form submission",
            createdAt: new Date().toISOString(),
          }
        : undefined,
    });
  }

  function executeTableAction(action: string, context: { scope: string; rowId?: string }) {
    void executeAction(actionContract({
      role,
      label: action,
      workflowBinding: `${resolvedWorkspace} ${context.scope} action`,
      auditEvent: context.rowId ? `TABLE_ROW_${slug(context.rowId).toUpperCase()}_ACTIONED` : "TABLE_ACTIONED",
    }));
  }

  function publishDashboardEvent(input: {
    type: string;
    module: string;
    title: string;
    body: string;
    entityId?: string;
    severity?: "info" | "warning" | "critical" | "success";
    payload?: Record<string, unknown>;
    notifications?: Array<{
      audienceRoles: string[];
      title?: string;
      body?: string;
      severity?: "info" | "warning" | "critical" | "success";
    }>;
    sms?: Array<{ recipient: string; message: string }>;
  }) {
    publishSchoolOperationalEvent({
      schoolId,
      actorRole: role,
      ...input,
    });
  }

  function addLocalExecutionLog(
    label: string,
    events: string[],
    options?: {
      workflow?: string;
      audit?: string;
    },
  ) {
    setExecutionLog((current) => [
      {
        id: runtimeId(`local-${slug(label)}`),
        label,
        workflow: options?.workflow ?? "Clinic visit -> Care action -> Guardian notified -> Follow-up",
        audit: options?.audit ?? "audit.nurse.clinic.local_action",
        events,
        status: "SUCCESS" as OperationalActionHealth,
      },
      ...current,
    ].slice(0, 6));
    publishDashboardEvent({
      type: "DASHBOARD_ACTION_RECORDED",
      module: activeWorkspaceKind,
      title: label,
      body: events.map(schoolFriendlyText).join(", "),
      severity: "success",
      payload: {
        workspace: resolvedWorkspace,
        workflow: options?.workflow,
        audit: options?.audit,
      },
    });
  }

  function recordClinicVisit(visit: Omit<ClinicVisitRecord, "id" | "status" | "parentContacted" | "time">) {
    const visitId = runtimeId("clinic-visit");
    const quantity = Math.max(1, visit.quantity);
    const newVisit: ClinicVisitRecord = {
      ...visit,
      id: visitId,
      quantity,
      status: "In sick bay",
      parentContacted: false,
      time: new Date().toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }),
    };
    setClinicVisits((current) => [newVisit, ...current]);
    setMedicineStock((current) => current.map((item) => (
      item.medicine === visit.medicine
        ? { ...item, quantity: Math.max(0, item.quantity - quantity) }
        : item
    )));
    addSchoolRecord("clinic-visits", newVisit, schoolId);
    addSchoolRecord("medicine-dispensations", {
      id: runtimeId("dispensation"),
      student: visit.student,
      className: visit.className,
      medicine: visit.medicine,
      quantity,
      guardianPhone: visit.guardianPhone,
      visitId,
      createdAt: new Date().toISOString(),
    }, schoolId);
    publishDashboardEvent({
      type: "CLINIC_VISIT_RECORDED",
      module: "clinic",
      title: `${visit.student} sick bay visit recorded`,
      body: `${visit.symptoms}. ${visit.medicine} quantity ${quantity} dispensed and stock deducted.`,
      entityId: visitId,
      severity: "warning",
      payload: { visit: newVisit },
      notifications: [
        { audienceRoles: ["principal", "deputy-principal", "class-teacher", "boarding-master"], title: "Sick bay visit recorded" },
      ],
    });
    addLocalExecutionLog(
      `${visit.student} sick bay visit saved and ${visit.medicine} stock deducted`,
      ["Clinic visit saved", "Medicine stock deducted", "Parent SMS ready"],
    );
    setClinicNotice(`${visit.student} visit saved. ${visit.medicine} stock deducted by ${quantity}.`);
  }

  function loadMedicineStock(medicine: Omit<MedicineStockRecord, "id">) {
    const newMedicine = { ...medicine, id: runtimeId("medicine") };

    setMedicineStock((current) => [
      newMedicine,
      ...current,
    ]);
    addSchoolRecord("medicine-stock", newMedicine, schoolId);
    addLocalExecutionLog(`${medicine.medicine} stock loaded`, ["Medicine batch saved", "Stock count updated"]);
    setClinicNotice(`${medicine.medicine} stock loaded. Inventory count updated.`);
  }

  function notifyClinicParent(id: string) {
    const visit = clinicVisits.find((item) => item.id === id);
    setClinicVisits((current) => current.map((item) => item.id === id ? { ...item, parentContacted: true } : item));
    updateSchoolRecord("clinic-visits", id, { parentContacted: true }, schoolId);
    publishDashboardEvent({
      type: "CLINIC_PARENT_SMS_SENT",
      module: "clinic",
      title: `${visit?.student ?? "Student"} parent notified`,
      body: "Guardian SMS sent for sick bay visit.",
      entityId: id,
      severity: "success",
      sms: visit?.guardianPhone ? [{ recipient: visit.guardianPhone, message: `${visit.student} has been attended to at the school sick bay.` }] : undefined,
      notifications: [{ audienceRoles: ["principal", "class-teacher"], title: "Sick bay parent SMS sent" }],
    });
    addLocalExecutionLog(`${visit?.student ?? "Student"} parent notified`, ["Parent SMS sent", "Class teacher copy prepared"]);
    setClinicNotice(`${visit?.student ?? "Student"} parent SMS sent.`);
  }

  function referClinicVisit(id: string) {
    const visit = clinicVisits.find((item) => item.id === id);
    setClinicVisits((current) => current.map((item) => item.id === id ? { ...item, status: "Referred", parentContacted: true } : item));
    updateSchoolRecord("clinic-visits", id, { status: "Referred", parentContacted: true }, schoolId);
    publishDashboardEvent({
      type: "CLINIC_REFERRAL_CREATED",
      module: "clinic",
      title: `${visit?.student ?? "Student"} referred to hospital`,
      body: "Hospital referral created and leadership notified.",
      entityId: id,
      severity: "critical",
      notifications: [
        { audienceRoles: ["principal", "deputy-principal", "boarding-master", "class-teacher"], title: "Medical referral created", severity: "critical" },
      ],
      sms: visit?.guardianPhone ? [{ recipient: visit.guardianPhone, message: `${visit.student} has been referred for medical attention. Please contact the school.` }] : undefined,
    });
    addLocalExecutionLog(`${visit?.student ?? "Student"} referred to hospital`, ["Referral slip prepared", "Guardian notified", "Deputy notified"]);
    setClinicNotice(`${visit?.student ?? "Student"} referred to hospital. Guardian and deputy notified.`);
  }

  function releaseClinicVisit(id: string) {
    const visit = clinicVisits.find((item) => item.id === id);
    setClinicVisits((current) => current.map((item) => item.id === id ? { ...item, status: "Released" } : item));
    updateSchoolRecord("clinic-visits", id, { status: "Released" }, schoolId);
    addLocalExecutionLog(`${visit?.student ?? "Student"} released from sick bay`, ["Visit closed", "Class teacher notified"]);
    setClinicNotice(`${visit?.student ?? "Student"} released from sick bay.`);
  }

  function printClinicSlip(id: string) {
    const visit = clinicVisits.find((item) => item.id === id);
    addLocalExecutionLog(`${visit?.student ?? "Student"} medical slip opened`, ["Medical slip prepared", "Print dialog opened"]);
    setClinicNotice(`${visit?.student ?? "Student"} medical slip opened for printing.`);
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  function printClinicRegister() {
    publishDashboardEvent({
      type: "CLINIC_REGISTER_PRINTED",
      module: "clinic",
      title: "Sick bay register opened for printing",
      body: `${clinicVisits.length} sick bay visit records prepared for printing.`,
      severity: "success",
      notifications: [{ audienceRoles: ["nurse", "principal"], title: "Sick bay register printed" }],
    });
    addLocalExecutionLog("Sick bay register opened", ["Sick bay register prepared", "Print dialog opened"]);
    setClinicNotice("Sick bay register opened for printing.");
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  function addAdmissionsExecutionLog(label: string, events: string[]) {
    addLocalExecutionLog(label, events, {
      workflow: "Inquiry -> Documents -> Interview -> Decision -> Parent onboarding",
      audit: "audit.admissions.local_action",
    });
  }

  function recordAdmissionApplicant(applicant: Omit<AdmissionApplicantRecord, "id" | "status" | "admissionNumber" | "parentSmsSent" | "letterPrinted">) {
    const newApplicant: AdmissionApplicantRecord = {
      ...applicant,
      id: runtimeId("admission"),
      status: applicant.documents === "Complete" ? "Application Pending" : "Inquiry",
      parentSmsSent: false,
      letterPrinted: false,
    };

    setAdmissionApplicants((current) => [newApplicant, ...current]);
    addAdmissionsExecutionLog(`${applicant.applicant} inquiry saved`, ["Admission inquiry saved", "Document checklist opened", "Parent contact captured"]);
    setAdmissionsNotice(`${applicant.applicant} saved. Document verification and interview follow-up are now visible.`);
  }

  function verifyAdmissionDocuments(id: string) {
    const applicant = admissionApplicants.find((item) => item.id === id);

    setAdmissionApplicants((current) => current.map((item) => item.id === id ? {
      ...item,
      documents: "Complete",
      status: item.status === "Approved" || item.status === "Onboarded" ? item.status : "Documents Verified",
    } : item));
    addAdmissionsExecutionLog(`${applicant?.applicant ?? "Applicant"} documents verified`, ["Documents marked complete", "Interview/decision can continue"]);
    setAdmissionsNotice(`${applicant?.applicant ?? "Applicant"} documents verified.`);
  }

  function scheduleAdmissionInterview(id: string) {
    const applicant = admissionApplicants.find((item) => item.id === id);

    setAdmissionApplicants((current) => current.map((item) => item.id === id ? {
      ...item,
      status: item.status === "Approved" || item.status === "Onboarded" ? item.status : "Interview Scheduled",
      interviewDate: item.interviewDate || "2026-05-29",
    } : item));
    addAdmissionsExecutionLog(`${applicant?.applicant ?? "Applicant"} interview scheduled`, ["Interview date saved", "Parent reminder ready"]);
    setAdmissionsNotice(`${applicant?.applicant ?? "Applicant"} interview scheduled for ${applicant?.interviewDate || "2026-05-29"}.`);
  }

  function approveAdmissionApplicant(id: string) {
    const applicant = admissionApplicants.find((item) => item.id === id);
    const generatedNumber = applicant?.admissionNumber ?? `KBI/2026/${runtimeNumber(100, 800)}`;

    setAdmissionApplicants((current) => current.map((item) => item.id === id ? {
      ...item,
      documents: "Complete",
      status: "Approved",
      admissionNumber: item.admissionNumber ?? generatedNumber,
    } : item));
    addAdmissionsExecutionLog(`${applicant?.applicant ?? "Applicant"} admission approved`, ["Admission approved", "Admission number generated", "First invoice can be prepared"]);
    setAdmissionsNotice(`${applicant?.applicant ?? "Applicant"} approved with admission number ${generatedNumber}.`);
  }

  function rejectAdmissionApplicant(id: string) {
    const applicant = admissionApplicants.find((item) => item.id === id);

    setAdmissionApplicants((current) => current.map((item) => item.id === id ? { ...item, status: "Rejected" } : item));
    addAdmissionsExecutionLog(`${applicant?.applicant ?? "Applicant"} application rejected`, ["Application status updated", "Parent communication required"]);
    setAdmissionsNotice(`${applicant?.applicant ?? "Applicant"} application marked rejected. Parent communication is still available.`);
  }

  function sendAdmissionParentSms(id: string) {
    const applicant = admissionApplicants.find((item) => item.id === id);

    setAdmissionApplicants((current) => current.map((item) => {
      if (item.id !== id) return item;

      const shouldOnboard = item.status === "Approved" && item.letterPrinted;

      return {
        ...item,
        parentSmsSent: true,
        status: shouldOnboard ? "Onboarded" : item.status,
      };
    }));
    addAdmissionsExecutionLog(`${applicant?.applicant ?? "Applicant"} parent SMS sent`, ["Parent onboarding SMS sent", "Admissions communication log updated"]);
    setAdmissionsNotice(`${applicant?.applicant ?? "Applicant"} parent SMS sent to ${applicant?.parentPhone ?? "guardian"}.`);
  }

  function printAdmissionLetter(id: string) {
    const applicant = admissionApplicants.find((item) => item.id === id);

    setAdmissionApplicants((current) => current.map((item) => {
      if (item.id !== id) return item;

      const shouldOnboard = item.status === "Approved" && item.parentSmsSent;

      return {
        ...item,
        letterPrinted: true,
        status: shouldOnboard ? "Onboarded" : item.status,
      };
    }));
    addAdmissionsExecutionLog(`${applicant?.applicant ?? "Applicant"} admission letter opened`, ["Admission letter prepared", "Print dialog opened"]);
    setAdmissionsNotice(`${applicant?.applicant ?? "Applicant"} admission letter opened for printing.`);
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  function printAdmissionsPipeline() {
    publishDashboardEvent({
      type: "ADMISSIONS_PIPELINE_PRINTED",
      module: "admissions",
      title: "Admissions pipeline opened for printing",
      body: `${admissionApplicants.length} applicant records prepared for printing.`,
      severity: "success",
      notifications: [{ audienceRoles: ["admissions", "principal"], title: "Admissions pipeline printed" }],
    });
    addAdmissionsExecutionLog("Admissions pipeline opened", ["Application pipeline prepared", "Print dialog opened"]);
    setAdmissionsNotice("Admissions pipeline opened for printing.");
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  function addLibraryExecutionLog(label: string, events: string[]) {
    addLocalExecutionLog(label, events, {
      workflow: "Scan book -> Verify borrower -> Update library records -> Notify/print slip",
      audit: "audit.library.local_action",
    });
  }

  function addLibraryBook(book: Omit<LibraryBookRecord, "id" | "status">) {
    const newBook: LibraryBookRecord = {
      ...book,
      id: runtimeId("library-book"),
      status: "Available",
    };

    setLibraryBooks((current) => [newBook, ...current]);
    addSchoolRecord("library-books", newBook, schoolId);
    publishDashboardEvent({
      type: "LIBRARY_BOOK_ADDED",
      module: "library",
      title: `${book.title} added to library catalogue`,
      body: `Barcode ${book.barcode} registered on shelf ${book.shelf}.`,
      entityId: newBook.id,
      severity: "success",
      payload: { book: newBook },
      notifications: [{ audienceRoles: ["principal", "librarian"], title: "New library book added" }],
    });
    addLibraryExecutionLog(`${book.title} added to catalogue`, ["Book saved", "Barcode registered", "Catalogue count updated"]);
    setLibraryNotice(`${book.title} added with barcode ${book.barcode}.`);
  }

  function issueLibraryBook(loan: Omit<LibraryLoanRecord, "id" | "bookTitle" | "status" | "fine" | "parentSmsSent">) {
    const book = libraryBooks.find((item) => item.barcode.toLowerCase() === loan.barcode.toLowerCase());
    const bookTitle = book?.title ?? `Scanned book ${loan.barcode}`;
    const newLoan: LibraryLoanRecord = {
      ...loan,
      id: runtimeId("library-loan"),
      bookTitle,
      status: "Issued",
      fine: 0,
      parentSmsSent: false,
    };

    setLibraryLoans((current) => [newLoan, ...current]);
    setLibraryBooks((current) => current.map((item) => (
      item.barcode.toLowerCase() === loan.barcode.toLowerCase()
        ? { ...item, status: "Issued" }
        : item
    )));
    addSchoolRecord("library-loans", newLoan, schoolId);
    if (book) {
      updateSchoolRecord("library-books", book.id, { status: "Issued" }, schoolId);
    }
    publishDashboardEvent({
      type: "LIBRARY_BOOK_ISSUED",
      module: "library",
      title: `${bookTitle} issued to ${loan.borrower}`,
      body: `Due on ${loan.dueDate}. Borrower admission number ${loan.admissionNo}.`,
      entityId: newLoan.id,
      severity: "info",
      payload: { loan: newLoan },
      notifications: [{ audienceRoles: ["parent", "student", "class-teacher"], title: "Library book issued" }],
    });
    addLibraryExecutionLog(`${bookTitle} issued to ${loan.borrower}`, ["Book issued", "Borrower record updated", "Issue slip ready"]);
    setLibraryNotice(`${bookTitle} issued to ${loan.borrower}. Print or SMS the issue slip.`);
  }

  function returnLibraryBook(id: string) {
    const loan = libraryLoans.find((item) => item.id === id);

    setLibraryLoans((current) => current.map((item) => item.id === id ? { ...item, status: "Returned", fine: 0 } : item));
    setLibraryBooks((current) => current.map((item) => (
      loan && item.barcode === loan.barcode ? { ...item, status: "Available" } : item
    )));
    updateSchoolRecord("library-loans", id, { status: "Returned", fine: 0 }, schoolId);
    if (loan) {
      const book = libraryBooks.find((item) => item.barcode === loan.barcode);
      if (book) {
        updateSchoolRecord("library-books", book.id, { status: "Available" }, schoolId);
      }
    }
    publishDashboardEvent({
      type: "LIBRARY_BOOK_RETURNED",
      module: "library",
      title: `${loan?.bookTitle ?? "Book"} returned`,
      body: "Return saved, book marked available, and fine cleared.",
      entityId: id,
      severity: "success",
      notifications: [{ audienceRoles: ["librarian", "class-teacher"], title: "Library book returned" }],
    });
    addLibraryExecutionLog(`${loan?.bookTitle ?? "Book"} returned`, ["Return saved", "Book marked available", "Fine cleared"]);
    setLibraryNotice(`${loan?.bookTitle ?? "Book"} returned and marked available.`);
  }

  function markLibraryLost(id: string) {
    const loan = libraryLoans.find((item) => item.id === id);

    setLibraryLoans((current) => current.map((item) => item.id === id ? { ...item, status: "Lost", fine: Math.max(item.fine, 850) } : item));
    setLibraryBooks((current) => current.map((item) => (
      loan && item.barcode === loan.barcode ? { ...item, status: "Lost" } : item
    )));
    updateSchoolRecord("library-loans", id, { status: "Lost", fine: Math.max(loan?.fine ?? 0, 850) }, schoolId);
    publishDashboardEvent({
      type: "LIBRARY_BOOK_LOST",
      module: "library",
      title: `${loan?.bookTitle ?? "Book"} marked lost`,
      body: "Lost book fine applied and parent follow-up is ready.",
      entityId: id,
      severity: "warning",
      notifications: [{ audienceRoles: ["parent", "student", "class-teacher", "principal"], title: "Library book marked lost", severity: "warning" }],
    });
    addLibraryExecutionLog(`${loan?.bookTitle ?? "Book"} marked lost`, ["Lost book saved", "Fine applied", "Parent SMS ready"]);
    setLibraryNotice(`${loan?.bookTitle ?? "Book"} marked lost. Fine applied for follow-up.`);
  }

  function markLibraryDamaged(id: string) {
    const loan = libraryLoans.find((item) => item.id === id);

    setLibraryLoans((current) => current.map((item) => item.id === id ? { ...item, status: "Damaged", fine: Math.max(item.fine, 300) } : item));
    setLibraryBooks((current) => current.map((item) => (
      loan && item.barcode === loan.barcode ? { ...item, status: "Damaged" } : item
    )));
    updateSchoolRecord("library-loans", id, { status: "Damaged", fine: Math.max(loan?.fine ?? 0, 300) }, schoolId);
    addLibraryExecutionLog(`${loan?.bookTitle ?? "Book"} marked damaged`, ["Damage record saved", "Fine applied"]);
    setLibraryNotice(`${loan?.bookTitle ?? "Book"} marked damaged. Repair or replacement follow-up is visible.`);
  }

  function sendLibrarySms(id: string) {
    const loan = libraryLoans.find((item) => item.id === id);

    setLibraryLoans((current) => current.map((item) => item.id === id ? { ...item, parentSmsSent: true } : item));
    updateSchoolRecord("library-loans", id, { parentSmsSent: true }, schoolId);
    publishDashboardEvent({
      type: "LIBRARY_SMS_SENT",
      module: "library",
      title: `${loan?.borrower ?? "Borrower"} library SMS sent`,
      body: `${loan?.bookTitle ?? "Book"} message sent to parent/student.`,
      entityId: id,
      severity: "success",
      sms: [{ recipient: loan?.admissionNo ?? "student", message: `Library update: ${loan?.bookTitle ?? "book"} requires attention.` }],
      notifications: [{ audienceRoles: ["parent", "student"], title: "Library SMS sent" }],
    });
    addLibraryExecutionLog(`${loan?.borrower ?? "Borrower"} library SMS sent`, ["Overdue SMS sent", "Communication log updated"]);
    setLibraryNotice(`${loan?.borrower ?? "Borrower"} parent/student SMS sent for ${loan?.bookTitle ?? "book"}.`);
  }

  function printLibrarySlip(id: string) {
    const loan = libraryLoans.find((item) => item.id === id);

    addLibraryExecutionLog(`${loan?.bookTitle ?? "Book"} library slip opened`, ["Library slip prepared", "Print dialog opened"]);
    setLibraryNotice(`${loan?.bookTitle ?? "Book"} slip opened for printing.`);
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  function printLibraryReport() {
    publishDashboardEvent({
      type: "LIBRARY_REPORT_PRINTED",
      module: "library",
      title: "Library report opened for printing",
      body: `${libraryLoans.length} borrower records and ${libraryBooks.length} catalogue records prepared for printing.`,
      severity: "success",
      notifications: [{ audienceRoles: ["librarian", "principal"], title: "Library report printed" }],
    });
    addLibraryExecutionLog("Library report opened", ["Library report prepared", "Print dialog opened"]);
    setLibraryNotice("Library report opened for printing.");
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  function addStockExecutionLog(label: string, events: string[]) {
    addLocalExecutionLog(label, events, {
      workflow: "Stock request -> Receive/issue -> Movement saved -> Slip/report ready",
      audit: "audit.storekeeper.local_action",
    });
  }

  function addStockItem(item: Omit<StockItemRecord, "id" | "status">) {
    const newItem: StockItemRecord = {
      ...item,
      id: runtimeId("stock"),
      status: item.category === "Asset" ? "Approval Required" : item.quantity <= 20 ? "Low Stock" : "OK",
    };

    setStockItems((current) => [newItem, ...current]);
    addStockExecutionLog(`${item.item} stock item saved`, ["Stock catalogue updated", "Supplier and department recorded"]);
    setStockNotice(`${item.item} saved in stock catalogue.`);
  }

  function receiveStock(movement: Omit<StockMovementRecord, "id" | "movementType" | "time">) {
    const newMovement: StockMovementRecord = {
      ...movement,
      id: runtimeId("stock-movement"),
      movementType: "Received",
      time: new Date().toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }),
    };

    setStockMovements((current) => [newMovement, ...current]);
    addStockExecutionLog(`${movement.item} received`, ["Stock received", "Movement history updated", "Receiving slip ready"]);
    setStockNotice(`${movement.item} received and movement history updated.`);
  }

  function issueStock(movement: Omit<StockMovementRecord, "id" | "movementType" | "time">) {
    const quantity = Math.max(1, movement.quantity);
    const newMovement: StockMovementRecord = {
      ...movement,
      quantity,
      id: runtimeId("stock-movement"),
      movementType: "Issued",
      time: new Date().toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }),
    };

    setStockMovements((current) => [newMovement, ...current]);
    setStockItems((current) => current.map((item) => {
      if (item.item !== movement.item) return item;

      const nextQuantity = Math.max(0, item.quantity - quantity);

      return {
        ...item,
        quantity: nextQuantity,
        status: nextQuantity <= 20 ? "Low Stock" : item.status === "Damaged" ? "Damaged" : "OK",
      };
    }));
    addStockExecutionLog(`${movement.item} issued to ${movement.department}`, ["Stock deducted", "Issue receiver recorded", "Issue slip ready"]);
    setStockNotice(`${movement.item} issued to ${movement.department}. Receiver: ${movement.receiver}.`);
  }

  function markStockMovementDamaged(id: string) {
    const movement = stockMovements.find((item) => item.id === id);

    setStockMovements((current) => current.map((item) => item.id === id ? { ...item, movementType: "Damaged/Lost" } : item));
    setStockItems((current) => current.map((item) => (
      movement && item.item === movement.item ? { ...item, status: "Damaged" } : item
    )));
    addStockExecutionLog(`${movement?.item ?? "Stock"} marked damaged`, ["Damage/loss record saved", "Principal follow-up available"]);
    setStockNotice(`${movement?.item ?? "Stock"} marked damaged/lost for follow-up.`);
  }

  function printStockSlip(id: string) {
    const movement = stockMovements.find((item) => item.id === id);

    addStockExecutionLog(`${movement?.item ?? "Stock"} slip opened`, ["Stock slip prepared", "Print dialog opened"]);
    setStockNotice(`${movement?.item ?? "Stock"} issue slip opened for printing.`);
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  function exportStockReport() {
    addStockExecutionLog("Stock report exported", ["CSV export prepared", "Stock movement report downloaded"]);
    setStockNotice("Stock report exported with current catalogue and movement history.");
  }

  function addBoardingExecutionLog(label: string, events: string[]) {
    addLocalExecutionLog(label, events, {
      workflow: "Roll call -> Exception review -> Parent/deputy notified -> Closed",
      audit: "audit.boarding.local_action",
    });
  }

  function addBoardingRollCall(record: Omit<BoardingRollCallRecord, "id" | "parentSmsSent" | "lastMarked">) {
    const newRecord: BoardingRollCallRecord = {
      ...record,
      id: runtimeId("boarding-roll-call"),
      parentSmsSent: record.status === "Missing" || record.status === "Sick",
      lastMarked: new Date().toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }),
    };

    setBoardingRollCalls((current) => [newRecord, ...current]);
    addBoardingExecutionLog(`${record.student} roll call saved`, ["Roll call saved", record.status === "Missing" ? "Missing boarder alert ready" : "Hostel record updated"]);
    setBoardingNotice(`${record.student} marked ${record.status.toLowerCase()} in ${record.dorm}.`);
  }

  function markBoarderPresent(id: string) {
    const record = boardingRollCalls.find((item) => item.id === id);

    setBoardingRollCalls((current) => current.map((item) => item.id === id ? {
      ...item,
      status: "Present",
      lastMarked: new Date().toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }),
    } : item));
    addBoardingExecutionLog(`${record?.student ?? "Boarder"} marked present`, ["Roll call corrected", "Missing alert cleared"]);
    setBoardingNotice(`${record?.student ?? "Boarder"} marked present.`);
  }

  function markBoarderMissing(id: string) {
    const record = boardingRollCalls.find((item) => item.id === id);

    setBoardingRollCalls((current) => current.map((item) => item.id === id ? {
      ...item,
      status: "Missing",
      parentSmsSent: true,
      lastMarked: new Date().toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }),
    } : item));
    addBoardingExecutionLog(`${record?.student ?? "Boarder"} marked missing`, ["Deputy alert ready", "Security alert ready", "Parent SMS sent"]);
    setBoardingNotice(`${record?.student ?? "Boarder"} marked missing. Parent, deputy, and security follow-up prepared.`);
  }

  function notifyBoarderParent(id: string) {
    const record = boardingRollCalls.find((item) => item.id === id);

    setBoardingRollCalls((current) => current.map((item) => item.id === id ? { ...item, parentSmsSent: true } : item));
    addBoardingExecutionLog(`${record?.student ?? "Boarder"} parent notified`, ["Parent SMS sent", "Boarding communication log updated"]);
    setBoardingNotice(`${record?.student ?? "Boarder"} parent SMS sent.`);
  }

  function referBoarderToNurse(id: string) {
    const record = boardingRollCalls.find((item) => item.id === id);

    setBoardingRollCalls((current) => current.map((item) => item.id === id ? { ...item, status: "Sick", parentSmsSent: true } : item));
    addBoardingExecutionLog(`${record?.student ?? "Boarder"} referred to nurse`, ["Nurse referral created", "Parent SMS sent", "Class teacher copy ready"]);
    setBoardingNotice(`${record?.student ?? "Boarder"} referred to nurse and parent notified.`);
  }

  function addExeatRequest(request: Omit<ExeatRequestRecord, "id" | "status">) {
    const newRequest: ExeatRequestRecord = {
      ...request,
      id: runtimeId("exeat"),
      status: "Pending",
    };

    setExeatRequests((current) => [newRequest, ...current]);
    addBoardingExecutionLog(`${request.student} exeat request saved`, ["Exeat request saved", "Approval queue updated"]);
    setBoardingNotice(`${request.student} exeat request saved for ${request.reason}.`);
  }

  function approveExeatRequest(id: string) {
    const request = exeatRequests.find((item) => item.id === id);

    setExeatRequests((current) => current.map((item) => item.id === id ? { ...item, status: "Approved" } : item));
    addBoardingExecutionLog(`${request?.student ?? "Boarder"} exeat approved`, ["Exeat approved", "Parent SMS ready", "Security gate pass ready"]);
    setBoardingNotice(`${request?.student ?? "Boarder"} exeat approved. Gate pass can be printed.`);
  }

  function forwardExeatRequest(id: string) {
    const request = exeatRequests.find((item) => item.id === id);

    setExeatRequests((current) => current.map((item) => item.id === id ? { ...item, status: "Forwarded" } : item));
    addBoardingExecutionLog(`${request?.student ?? "Boarder"} exeat forwarded`, ["Deputy review requested", "Exeat remains visible"]);
    setBoardingNotice(`${request?.student ?? "Boarder"} exeat forwarded to deputy.`);
  }

  function printBoardingRollCall() {
    addBoardingExecutionLog("Hostel roll call sheet opened", ["Roll call print view prepared", "Print dialog opened"]);
    setBoardingNotice("Hostel roll call sheet opened for printing.");
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  function addTransportExecutionLog(label: string, events: string[]) {
    addLocalExecutionLog(label, events, {
      workflow: "Trip record -> Route update -> Parent alert -> Transport report",
      audit: "audit.transport.local_action",
    });
  }

  function addTransportTrip(trip: Omit<TransportTripRecord, "id" | "status" | "parentAlertSent" | "time">) {
    const newTrip: TransportTripRecord = {
      ...trip,
      id: runtimeId("transport-trip"),
      status: "Waiting",
      parentAlertSent: false,
      time: new Date().toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }),
    };

    setTransportTrips((current) => [newTrip, ...current]);
    addTransportExecutionLog(`${trip.student} trip record added`, ["Trip attendance saved", "Parent alert ready"]);
    setTransportNotice(`${trip.student} added to ${trip.route} at ${trip.stop}.`);
  }

  function markTransportPicked(id: string) {
    const trip = transportTrips.find((item) => item.id === id);

    setTransportTrips((current) => current.map((item) => item.id === id ? { ...item, status: "Picked", parentAlertSent: true } : item));
    addTransportExecutionLog(`${trip?.student ?? "Student"} marked picked`, ["Trip attendance updated", "Parent pickup SMS sent"]);
    setTransportNotice(`${trip?.student ?? "Student"} marked picked. Parent alert sent.`);
  }

  function markTransportDropped(id: string) {
    const trip = transportTrips.find((item) => item.id === id);

    setTransportTrips((current) => current.map((item) => item.id === id ? { ...item, status: "Dropped", parentAlertSent: true } : item));
    addTransportExecutionLog(`${trip?.student ?? "Student"} marked dropped`, ["Drop-off saved", "Parent drop-off SMS sent"]);
    setTransportNotice(`${trip?.student ?? "Student"} marked dropped. Parent alert sent.`);
  }

  function notifyTransportParent(id: string) {
    const trip = transportTrips.find((item) => item.id === id);

    setTransportTrips((current) => current.map((item) => item.id === id ? { ...item, parentAlertSent: true } : item));
    addTransportExecutionLog(`${trip?.student ?? "Student"} parent transport alert sent`, ["Parent transport SMS sent", "Route communication updated"]);
    setTransportNotice(`${trip?.student ?? "Student"} parent transport alert sent.`);
  }

  function reportTransportVehicleIssue(id: string) {
    const vehicle = transportVehicles.find((item) => item.id === id);

    setTransportVehicles((current) => current.map((item) => item.id === id ? { ...item, status: "Maintenance", maintenanceNote: "Issue reported by transport desk" } : item));
    addTransportExecutionLog(`${vehicle?.vehicle ?? "Vehicle"} issue reported`, ["Vehicle issue saved", "Principal transport alert ready"]);
    setTransportNotice(`${vehicle?.vehicle ?? "Vehicle"} issue reported for maintenance follow-up.`);
  }

  function addTransportFuelRecord(id: string) {
    const vehicle = transportVehicles.find((item) => item.id === id);

    setTransportVehicles((current) => current.map((item) => item.id === id ? { ...item, fuelLevel: Math.min(100, item.fuelLevel + 25) } : item));
    addTransportExecutionLog(`${vehicle?.vehicle ?? "Vehicle"} fuel record added`, ["Fuel record saved", "Fuel level updated"]);
    setTransportNotice(`${vehicle?.vehicle ?? "Vehicle"} fuel record added.`);
  }

  function scheduleTransportMaintenance(id: string) {
    const vehicle = transportVehicles.find((item) => item.id === id);

    setTransportVehicles((current) => current.map((item) => item.id === id ? { ...item, status: "Maintenance", maintenanceNote: "Maintenance scheduled for today" } : item));
    addTransportExecutionLog(`${vehicle?.vehicle ?? "Vehicle"} maintenance scheduled`, ["Maintenance saved", "Vehicle status updated"]);
    setTransportNotice(`${vehicle?.vehicle ?? "Vehicle"} workshop booking confirmed.`);
  }

  function printTransportRouteList() {
    addTransportExecutionLog("Transport route list opened", ["Route list prepared", "Print dialog opened"]);
    setTransportNotice("Transport route list opened for printing.");
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  function addLabExecutionLog(label: string, events: string[]) {
    addLocalExecutionLog(label, events, {
      workflow: "Lab request -> Safety check -> Issue/return -> Teacher notified",
      audit: "audit.laboratory.local_action",
    });
  }

  function addLabChemicalStock(record: Omit<LabInventoryRecord, "id" | "status">) {
    const newRecord: LabInventoryRecord = {
      ...record,
      id: runtimeId("lab-stock"),
      status: Number(record.quantity) <= 5 ? "Low Stock" : "OK",
    };

    setLabInventory((current) => [newRecord, ...current]);
    addLabExecutionLog(`${record.item} stock added`, ["Lab inventory updated", "Safety level recorded"]);
    setLabNotice(`${record.item} added to lab inventory with ${record.hazard.toLowerCase()} hazard level.`);
  }

  function addLabPracticalRequest(record: Omit<LabPracticalRequestRecord, "id" | "status" | "teacherAlerted">) {
    const newRequest: LabPracticalRequestRecord = {
      ...record,
      id: runtimeId("lab-request"),
      status: "Requested",
      teacherAlerted: false,
    };

    setLabRequests((current) => [newRequest, ...current]);
    addLabExecutionLog(`${record.practical} practical request saved`, ["Teacher practical request saved", "Safety prep queue updated"]);
    setLabNotice(`${record.practical} request saved for ${record.className}.`);
  }

  function approveLabPracticalPrep(id: string) {
    const request = labRequests.find((item) => item.id === id);

    setLabRequests((current) => current.map((item) => item.id === id ? { ...item, status: "Prepared" } : item));
    addLabExecutionLog(`${request?.practical ?? "Practical"} prep approved`, ["Preparation approved", "Teacher notification ready"]);
    setLabNotice(`${request?.practical ?? "Practical"} preparation approved.`);
  }

  function issueLabApparatus(requestId: string) {
    const request = labRequests.find((item) => item.id === requestId);
    const apparatus = labInventory.find((item) => item.category === "Apparatus" && item.quantity > 0);

    if (!request || !apparatus) {
      setLabNotice("No apparatus is available to issue for this practical.");
      return;
    }

    const issue: LabIssueRecord = {
      id: runtimeId("lab-issue"),
      item: apparatus.item,
      teacher: request.teacher,
      className: request.className,
      quantity: Math.min(5, apparatus.quantity),
      status: "Issued",
      note: request.practical,
    };

    setLabInventory((current) => current.map((item) => item.id === apparatus.id ? { ...item, quantity: Math.max(0, item.quantity - issue.quantity), status: item.quantity - issue.quantity <= 5 ? "Low Stock" : item.status } : item));
    setLabRequests((current) => current.map((item) => item.id === requestId ? { ...item, status: "Issued" } : item));
    setLabIssues((current) => [issue, ...current]);
    addLabExecutionLog(`${apparatus.item} issued for ${request.practical}`, ["Apparatus issued", "Inventory reduced", "Issue register updated"]);
    setLabNotice(`${apparatus.item} issued to ${request.teacher} for ${request.className}.`);
  }

  function returnLabApparatus(issueId: string) {
    const issue = labIssues.find((item) => item.id === issueId);

    setLabIssues((current) => current.map((item) => item.id === issueId ? { ...item, status: "Returned", note: "Returned in good condition" } : item));
    setLabInventory((current) => current.map((item) => item.item === issue?.item ? { ...item, quantity: item.quantity + (issue?.quantity ?? 0), status: "OK" } : item));
    addLabExecutionLog(`${issue?.item ?? "Apparatus"} returned`, ["Return saved", "Inventory restored"]);
    setLabNotice(`${issue?.item ?? "Apparatus"} returned and stock restored.`);
  }

  function recordLabBreakage(issueId: string) {
    const issue = labIssues.find((item) => item.id === issueId);

    setLabIssues((current) => current.map((item) => item.id === issueId ? { ...item, status: "Broken", note: "Breakage recorded for replacement follow-up" } : item));
    setLabInventory((current) => current.map((item) => item.item === issue?.item ? { ...item, status: "Broken" } : item));
    addLabExecutionLog(`${issue?.item ?? "Apparatus"} breakage recorded`, ["Breakage saved", "Replacement follow-up available"]);
    setLabNotice(`${issue?.item ?? "Apparatus"} breakage recorded for follow-up.`);
  }

  function alertLabTeacher(requestId: string) {
    const request = labRequests.find((item) => item.id === requestId);

    setLabRequests((current) => current.map((item) => item.id === requestId ? { ...item, teacherAlerted: true } : item));
    addLabExecutionLog(`${request?.teacher ?? "Teacher"} lab alert sent`, ["Teacher SMS simulated", "Lab communication log updated"]);
    setLabNotice(`${request?.teacher ?? "Teacher"} alerted about ${request?.practical ?? "the practical"}.`);
  }

  function printLabPracticalChecklist() {
    addLabExecutionLog("Practical checklist opened", ["Lab checklist prepared", "Print dialog opened"]);
    setLabNotice("Practical checklist opened for printing.");
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  function addFinanceExecutionLog(label: string, events: string[]) {
    addLocalExecutionLog(label, events, {
      workflow: "Fee action -> Ledger update -> Receipt/SMS -> Principal summary",
      audit: "audit.finance.local_action",
    });
  }

  function recordFeePayment(payment: Omit<FeePaymentRecord, "id" | "receiptNo" | "parentSmsSent" | "status">) {
    const receiptNo = `KBI-RCPT-${runtimeNumber(1100, 8000)}`;
    const balanceRecord = feeBalances.find((item) => item.admissionNo === payment.admissionNo);
    const newPayment: FeePaymentRecord = {
      ...payment,
      id: runtimeId("fee-payment"),
      receiptNo,
      parentSmsSent: false,
      status: payment.method === "M-Pesa" ? "M-Pesa Pending" : "Recorded",
    };

    setFeePayments((current) => [newPayment, ...current]);
    setFeeBalances((current) => current.map((item) => item.admissionNo === payment.admissionNo ? {
      ...item,
      balance: Math.max(0, item.balance - payment.amount),
      lastPayment: payment.amount,
      lastMethod: payment.method,
      status: Math.max(0, item.balance - payment.amount) === 0 ? "Clear" : Math.max(0, item.balance - payment.amount) > 10000 ? "High Balance" : "Balance",
    } : item));
    addSchoolRecord("finance-payments", newPayment, schoolId);
    addSchoolRecord("receipts", {
      id: `receipt-${receiptNo}`,
      receiptNo,
      student: payment.student,
      admissionNo: payment.admissionNo,
      className: balanceRecord?.className ?? "Class/Form not set",
      amount: payment.amount,
      method: payment.method,
      term: payment.term,
      voteHead: payment.voteHead,
      parentPhone: balanceRecord?.parentPhone ?? "",
      createdAt: new Date().toISOString(),
    }, schoolId);
    publishDashboardEvent({
      type: "FEE_PAYMENT_RECORDED",
      module: "finance",
      title: `${payment.student} fee payment recorded`,
      body: `KSh ${payment.amount.toLocaleString("en-KE")} received by ${payment.method}. Receipt ${receiptNo} is ready.`,
      entityId: newPayment.id,
      severity: "success",
      payload: { payment: newPayment },
      notifications: [
        { audienceRoles: ["principal", "secretary", "parent", "student"], title: "Fee payment recorded" },
      ],
    });
    addFinanceExecutionLog(`${payment.student} payment recorded`, ["Payment saved", "Student balance updated", "Receipt ready"]);
    setFinanceNotice(`${payment.student} payment recorded. Receipt ${receiptNo} is ready.`);
  }

  function confirmMpesaPayment(id: string) {
    const payment = feePayments.find((item) => item.id === id);

    setFeePayments((current) => current.map((item) => item.id === id ? { ...item, status: "Confirmed" } : item));
    updateSchoolRecord("finance-payments", id, { status: "Confirmed" }, schoolId);
    publishDashboardEvent({
      type: "MPESA_PAYMENT_CONFIRMED",
      module: "finance",
      title: `${payment?.student ?? "Payment"} M-Pesa confirmed`,
      body: `${payment?.receiptNo ?? "Receipt"} marked confirmed.`,
      entityId: id,
      severity: "success",
      notifications: [{ audienceRoles: ["principal", "secretary", "parent"], title: "M-Pesa payment confirmed" }],
    });
    addFinanceExecutionLog(`${payment?.student ?? "Payment"} M-Pesa confirmed`, ["M-Pesa confirmation saved", "Ledger marked confirmed"]);
    setFinanceNotice(`${payment?.student ?? "Payment"} M-Pesa confirmation completed.`);
  }

  function printFeeReceipt(id: string) {
    const payment = feePayments.find((item) => item.id === id);

    addFinanceExecutionLog(`${payment?.receiptNo ?? "Receipt"} opened`, ["Receipt print view prepared", "Print dialog opened"]);
    setFinanceNotice(`${payment?.receiptNo ?? "Receipt"} opened for printing.`);
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  function sendReceiptSms(id: string) {
    const payment = feePayments.find((item) => item.id === id);
    const balanceRecord = feeBalances.find((item) => item.admissionNo === payment?.admissionNo);

    setFeePayments((current) => current.map((item) => item.id === id ? { ...item, parentSmsSent: true } : item));
    updateSchoolRecord("finance-payments", id, { parentSmsSent: true }, schoolId);
    publishDashboardEvent({
      type: "FEE_RECEIPT_SMS_SENT",
      module: "finance",
      title: `${payment?.student ?? "Parent"} receipt SMS sent`,
      body: `${payment?.receiptNo ?? "Receipt"} SMS sent to ${balanceRecord?.parentPhone ?? "parent"}.`,
      entityId: id,
      severity: "success",
      sms: balanceRecord?.parentPhone && payment ? [{ recipient: balanceRecord.parentPhone, message: `Payment received. Receipt ${payment.receiptNo}. Amount KSh ${payment.amount.toLocaleString("en-KE")}.` }] : undefined,
      notifications: [{ audienceRoles: ["parent", "secretary"], title: "Receipt SMS sent" }],
    });
    addFinanceExecutionLog(`${payment?.student ?? "Parent"} receipt SMS sent`, ["Receipt SMS simulated", "Parent communication updated"]);
    setFinanceNotice(`${payment?.student ?? "Parent"} receipt SMS sent.`);
  }

  function sendFeeReminder(studentId: string) {
    const student = feeBalances.find((item) => item.id === studentId);

    publishDashboardEvent({
      type: "FEE_REMINDER_SMS_SENT",
      module: "finance",
      title: `${student?.student ?? "Student"} fee reminder sent`,
      body: `Reminder sent to ${student?.parentPhone ?? "parent"} for balance follow-up.`,
      entityId: studentId,
      severity: "warning",
      sms: student?.parentPhone ? [{ recipient: student.parentPhone, message: `Fee reminder for ${student.student}: balance KSh ${student.balance.toLocaleString("en-KE")}.` }] : undefined,
      notifications: [{ audienceRoles: ["parent", "class-teacher", "principal"], title: "Fee reminder sent", severity: "warning" }],
    });
    addFinanceExecutionLog(`${student?.student ?? "Student"} fee reminder sent`, ["Fee reminder SMS simulated", "Class teacher copy ready"]);
    setFinanceNotice(`${student?.student ?? "Student"} fee reminder sent to ${student?.parentPhone ?? "parent"}.`);
  }

  function requestFeeReversal(id: string) {
    const payment = feePayments.find((item) => item.id === id);

    setFeePayments((current) => current.map((item) => item.id === id ? { ...item, status: "Reversal Requested" } : item));
    updateSchoolRecord("finance-payments", id, { status: "Reversal Requested" }, schoolId);
    publishDashboardEvent({
      type: "FEE_REVERSAL_REQUESTED",
      module: "finance",
      title: `${payment?.receiptNo ?? "Payment"} reversal requested`,
      body: "Payment reversal approval requested and visible to leadership.",
      entityId: id,
      severity: "warning",
      notifications: [{ audienceRoles: ["principal", "accountant"], title: "Fee reversal approval requested", severity: "warning" }],
    });
    addFinanceExecutionLog(`${payment?.receiptNo ?? "Payment"} reversal requested`, ["Reversal approval requested", "Audit record created"]);
    setFinanceNotice(`${payment?.receiptNo ?? "Payment"} reversal sent for approval.`);
  }

  function exportFeeList() {
    addFinanceExecutionLog("Fee list CSV exported", ["Visible balances exported", "Download prepared"]);
    setFinanceNotice("Fee list CSV export prepared.");
  }

  function addSecretaryExecutionLog(label: string, events: string[]) {
    addLocalExecutionLog(label, events, {
      workflow: "Front office intake -> Department action -> Parent update -> Closed",
      audit: "audit.secretary.local_action",
    });
  }

  function registerSecretaryVisitor(visitor: Omit<SecretaryVisitorRecord, "id" | "status" | "checkInTime" | "slipPrinted">) {
    const newVisitor: SecretaryVisitorRecord = {
      ...visitor,
      id: runtimeId("visitor"),
      status: "Inside",
      checkInTime: new Date().toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }),
      slipPrinted: false,
    };

    setSecretaryVisitors((current) => [newVisitor, ...current]);
    addSchoolRecord("visitors", newVisitor, schoolId);
    publishDashboardEvent({
      type: "VISITOR_CHECKED_IN",
      module: "visitors",
      title: `${visitor.visitor} checked in`,
      body: `${visitor.visitor} is visiting ${visitor.visiting} for ${visitor.reason}.`,
      entityId: newVisitor.id,
      severity: "info",
      payload: { visitor: newVisitor },
      notifications: [{ audienceRoles: ["principal", "secretary", "security-officer"], title: "Visitor checked in" }],
    });
    addSecretaryExecutionLog(`${visitor.visitor} checked in`, ["Visitor registered", "Security/front office log updated"]);
    setSecretaryNotice(`${visitor.visitor} checked in to visit ${visitor.visiting}.`);
  }

  function printSecretaryVisitorSlip(id: string) {
    const visitor = secretaryVisitors.find((item) => item.id === id);

    setSecretaryVisitors((current) => current.map((item) => item.id === id ? { ...item, slipPrinted: true } : item));
    updateSchoolRecord("visitors", id, { slipPrinted: true }, schoolId);
    addSecretaryExecutionLog(`${visitor?.visitor ?? "Visitor"} slip printed`, ["Visitor slip prepared", "Print dialog opened"]);
    setSecretaryNotice(`${visitor?.visitor ?? "Visitor"} visitor slip opened for printing.`);
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  function printSecretaryFeeStatement(student: FeeBalanceRecord) {
    publishDashboardEvent({
      type: "FEE_STATEMENT_PRINTED",
      module: "front-office",
      title: `${student.student} fee statement printed`,
      body: `Fee statement opened for ${student.admissionNo} by the secretary desk.`,
      entityId: student.id,
      severity: "success",
      notifications: [{ audienceRoles: ["secretary", "accountant"], title: "Fee statement printed" }],
    });
    addSecretaryExecutionLog(`${student.student} fee statement printed`, ["Fee statement prepared", "Print dialog opened"]);
    setSecretaryNotice(`${student.student} fee statement opened for printing.`);
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  function checkOutSecretaryVisitor(id: string) {
    const visitor = secretaryVisitors.find((item) => item.id === id);

    setSecretaryVisitors((current) => current.map((item) => item.id === id ? { ...item, status: "Exited" } : item));
    updateSchoolRecord("visitors", id, { status: "Exited" }, schoolId);
    publishDashboardEvent({
      type: "VISITOR_CHECKED_OUT",
      module: "visitors",
      title: `${visitor?.visitor ?? "Visitor"} checked out`,
      body: "Visitor exit saved and current-inside board updated.",
      entityId: id,
      severity: "success",
      notifications: [{ audienceRoles: ["principal", "secretary", "security-officer"], title: "Visitor checked out" }],
    });
    addSecretaryExecutionLog(`${visitor?.visitor ?? "Visitor"} checked out`, ["Visitor exit saved", "Security board updated"]);
    setSecretaryNotice(`${visitor?.visitor ?? "Visitor"} checked out.`);
  }

  function addSecretaryInquiry(record: Omit<SecretaryInquiryRecord, "id" | "status" | "smsSent">) {
    const newInquiry: SecretaryInquiryRecord = {
      ...record,
      id: runtimeId("inquiry"),
      status: "Waiting",
      smsSent: false,
    };

    setSecretaryInquiries((current) => [newInquiry, ...current]);
    addSchoolRecord("front-office-inquiries", newInquiry, schoolId);
    publishDashboardEvent({
      type: "PARENT_INQUIRY_REGISTERED",
      module: "front-office",
      title: `${record.parent} inquiry registered`,
      body: `${record.issue} routed to ${record.department}.`,
      entityId: newInquiry.id,
      severity: "warning",
      payload: { inquiry: newInquiry },
      notifications: [{ audienceRoles: ["principal", "secretary", record.department.toLowerCase()], title: "Parent inquiry registered", severity: "warning" }],
    });
    addSecretaryExecutionLog(`${record.parent} inquiry registered`, ["Parent inquiry saved", "Department queue updated"]);
    setSecretaryNotice(`${record.parent} request registered for ${record.department}.`);
  }

  function markSecretaryParentServed(id: string) {
    const inquiry = secretaryInquiries.find((item) => item.id === id);

    setSecretaryInquiries((current) => current.map((item) => item.id === id ? { ...item, status: "Resolved" } : item));
    updateSchoolRecord("front-office-inquiries", id, { status: "Resolved" }, schoolId);
    addSecretaryExecutionLog(`${inquiry?.parent ?? "Parent"} marked served`, ["Front office queue updated", "Request closed"]);
    setSecretaryNotice(`${inquiry?.parent ?? "Parent"} marked served.`);
  }

  function sendSecretaryParentSms(id: string) {
    const inquiry = secretaryInquiries.find((item) => item.id === id);

    setSecretaryInquiries((current) => current.map((item) => item.id === id ? { ...item, smsSent: true } : item));
    updateSchoolRecord("front-office-inquiries", id, { smsSent: true }, schoolId);
    publishDashboardEvent({
      type: "PARENT_INQUIRY_SMS_SENT",
      module: "front-office",
      title: `${inquiry?.parent ?? "Parent"} SMS sent`,
      body: `SMS sent about ${inquiry?.issue ?? "front office request"}.`,
      entityId: id,
      severity: "success",
      sms: inquiry?.phone ? [{ recipient: inquiry.phone, message: `MyShule update: ${inquiry.issue} is being handled by ${inquiry.department}.` }] : undefined,
      notifications: [{ audienceRoles: ["secretary", "principal"], title: "Front office SMS sent" }],
    });
    addSecretaryExecutionLog(`${inquiry?.parent ?? "Parent"} SMS sent`, ["Parent SMS simulated", "Communication log updated"]);
    setSecretaryNotice(`${inquiry?.parent ?? "Parent"} SMS sent.`);
  }

  function escalateSecretaryInquiry(id: string) {
    const inquiry = secretaryInquiries.find((item) => item.id === id);

    setSecretaryInquiries((current) => current.map((item) => item.id === id ? { ...item, status: "Escalated" } : item));
    updateSchoolRecord("front-office-inquiries", id, { status: "Escalated" }, schoolId);
    publishDashboardEvent({
      type: "PARENT_INQUIRY_ESCALATED",
      module: "front-office",
      title: `${inquiry?.issue ?? "Inquiry"} escalated`,
      body: `Escalated to ${inquiry?.department ?? "department"} for follow-up.`,
      entityId: id,
      severity: "critical",
      notifications: [{ audienceRoles: ["principal", "deputy-principal", "secretary"], title: "Front office issue escalated", severity: "critical" }],
    });
    addSecretaryExecutionLog(`${inquiry?.issue ?? "Inquiry"} escalated`, ["Department escalation created", "Owner notified"]);
    setSecretaryNotice(`${inquiry?.issue ?? "Inquiry"} escalated to ${inquiry?.department ?? "department"}.`);
  }

  function openSearchResult(result: RoleSearchResult) {
    setWorkspaceSelection({
      routeKey: routeWorkspaceKey,
      workspace: result.workspace,
    });
    setActivePanel(result.panel);
    setSearchQuery("");
    setExecutionLog((current) => [
      {
        id: runtimeId(`search-${slug(result.workspace)}`),
        label: `Opened ${result.label}`,
        workflow: schoolFriendlyText(result.workspace),
        audit: "SEARCH_RESULT_OPENED",
        events: ["Search opened school record", "Section changed"],
        status: "SUCCESS" as OperationalActionHealth,
      },
      ...current,
    ].slice(0, 6));
  }

  function renderOperationalPanel() {
    if (isLaboratoryWorkspace) {
      return (
        <LaboratoryWorkspace
          inventory={labInventory}
          requests={labRequests}
          issues={labIssues}
          notice={labNotice}
          onAddChemicalStock={addLabChemicalStock}
          onAddPracticalRequest={addLabPracticalRequest}
          onApprovePracticalPrep={approveLabPracticalPrep}
          onIssueApparatus={issueLabApparatus}
          onReturnApparatus={returnLabApparatus}
          onRecordBreakage={recordLabBreakage}
          onAlertTeacher={alertLabTeacher}
          onPrintPracticalChecklist={printLabPracticalChecklist}
        />
      );
    }

    if (isTransportWorkspace) {
      return (
        <TransportWorkspace
          vehicles={transportVehicles}
          trips={transportTrips}
          notice={transportNotice}
          onAddTrip={addTransportTrip}
          onMarkPicked={markTransportPicked}
          onMarkDropped={markTransportDropped}
          onNotifyParent={notifyTransportParent}
          onReportVehicleIssue={reportTransportVehicleIssue}
          onAddFuel={addTransportFuelRecord}
          onScheduleMaintenance={scheduleTransportMaintenance}
          onPrintRouteList={printTransportRouteList}
        />
      );
    }

    if (isBoardingWorkspace) {
      return (
        <BoardingWorkspace
          rollCalls={boardingRollCalls}
          exeats={exeatRequests}
          notice={boardingNotice}
          onAddRollCall={addBoardingRollCall}
          onMarkPresent={markBoarderPresent}
          onMarkMissing={markBoarderMissing}
          onNotifyParent={notifyBoarderParent}
          onReferNurse={referBoarderToNurse}
          onAddExeat={addExeatRequest}
          onApproveExeat={approveExeatRequest}
          onForwardExeat={forwardExeatRequest}
          onPrintRollCall={printBoardingRollCall}
        />
      );
    }

    if (isStorekeeperWorkspace) {
      return (
        <StorekeeperWorkspace
          items={stockItems}
          movements={stockMovements}
          notice={stockNotice}
          onAddStock={addStockItem}
          onIssueStock={issueStock}
          onReceiveStock={receiveStock}
          onMarkDamaged={markStockMovementDamaged}
          onPrintSlip={printStockSlip}
          onExport={exportStockReport}
        />
      );
    }

    if (isLibraryWorkspace) {
      return (
        <LibraryWorkspace
          books={libraryBooks}
          loans={libraryLoans}
          notice={libraryNotice}
          onAddBook={addLibraryBook}
          onIssueBook={issueLibraryBook}
          onReturnBook={returnLibraryBook}
          onMarkLost={markLibraryLost}
          onMarkDamaged={markLibraryDamaged}
          onSendSms={sendLibrarySms}
          onPrintSlip={printLibrarySlip}
          onPrintReport={printLibraryReport}
        />
      );
    }

    if (isAdmissionsWorkspace) {
      return (
        <AdmissionsWorkspace
          applicants={admissionApplicants}
          notice={admissionsNotice}
          onAddApplicant={recordAdmissionApplicant}
          onVerifyDocuments={verifyAdmissionDocuments}
          onScheduleInterview={scheduleAdmissionInterview}
          onApprove={approveAdmissionApplicant}
          onReject={rejectAdmissionApplicant}
          onSendSms={sendAdmissionParentSms}
          onPrintLetter={printAdmissionLetter}
          onPrintPipeline={printAdmissionsPipeline}
        />
      );
    }

    if (isNurseClinicWorkspace) {
      return (
        <NurseClinicWorkspace
          visits={clinicVisits}
          medicines={medicineStock}
          notice={clinicNotice}
          onRecordVisit={recordClinicVisit}
          onLoadMedicine={loadMedicineStock}
          onNotifyParent={notifyClinicParent}
          onRefer={referClinicVisit}
          onRelease={releaseClinicVisit}
          onPrint={printClinicSlip}
          onPrintRegister={printClinicRegister}
        />
      );
    }

    if (activePanel === "records") {
      return <OperationalTable contract={tableContract} onAction={executeTableAction} showStatePanels={false} />;
    }

    if (activePanel === "form") {
      return <OperationalFormShell contract={formContract} onAction={executeFormAction} showExecutionContract={false} />;
    }

    return <OperationalQueue contract={visibleQueueContract} onExecute={(action) => void executeAction(action)} />;
  }

  return (
    <div className="min-h-dvh bg-[#F3F6FA] lg:h-dvh lg:overflow-hidden" data-testid="role-operational-command-center">
      <div className="mx-auto grid min-h-dvh max-w-none gap-0 lg:h-full lg:min-h-0 lg:grid-cols-[292px_minmax(0,1fr)]">
        {mobileSidebarOpen ? (
          <button
            type="button"
            aria-label={`Close ${roleTitle} menu overlay`}
            className="fixed inset-0 z-30 bg-slate-950/45 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        ) : null}
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-[min(84vw,292px)] min-h-0 flex-col overflow-hidden border-r border-[#D7E0EF] bg-[linear-gradient(180deg,#071D49_0%,#102E63_58%,#0F172A_100%)] p-4 text-white shadow-2xl transition-transform duration-200 lg:static lg:z-auto lg:h-full lg:w-auto lg:translate-x-0 lg:shadow-none ${
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="shrink-0 rounded-2xl border border-white/12 bg-white/[0.08] p-4 backdrop-blur">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4 text-cyan-200" />
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/80">Role menu</p>
              </div>
              <button
                type="button"
                className="rounded-lg border border-white/15 bg-white/10 p-1.5 text-white lg:hidden"
                onClick={() => setMobileSidebarOpen(false)}
                aria-label={`Close ${roleTitle} menu`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight">{roleProfile.sidebarTitle}</h1>
            <p className="mt-2 text-xs font-semibold leading-5 text-white/62">{roleProfile.sidebarSubtitle}</p>
          </div>

          <nav className="mt-4 grid min-h-0 flex-1 gap-2 overflow-y-auto pr-1" aria-label={`${roleTitle} operational sidebar`}>
            {sidebarItems.map((item, index) => (
              <button
                key={item}
                type="button"
                aria-current={item === resolvedWorkspace ? "page" : undefined}
                onClick={() => {
                  setWorkspaceSelection({
                    routeKey: routeWorkspaceKey,
                    workspace: item,
                  });
                  setActivePanel("queue");
                  setMobileSidebarOpen(false);
                }}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-bold transition hover:-translate-y-0.5 ${
                  item === resolvedWorkspace
                    ? "border-cyan-200/35 bg-cyan-200/14 text-white shadow-[0_0_24px_rgba(34,211,238,0.16)]"
                    : "border-white/10 bg-white/[0.06] text-white/78 hover:bg-white/[0.1]"
                }`}
              >
                <span>{schoolFriendlyText(item)}</span>
                {item === resolvedWorkspace ? <StatusPill label="Active" tone="ok" compact /> : (
                  index < roleProfile.urgentAlerts.length ? (
                    <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-black text-warning">
                      Urgent
                    </span>
                  ) : null
                )}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex min-h-dvh min-w-0 flex-col lg:h-full lg:min-h-0 lg:overflow-hidden">
          <header className="shrink-0 border-b border-[#D7E0EF] bg-[linear-gradient(135deg,#071D49_0%,#123A7A_58%,#0F172A_100%)] px-4 py-2.5 text-white shadow-[0_18px_48px_rgba(7,29,73,0.16)] md:px-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2">
                <button
                  type="button"
                  className="mt-0.5 rounded-xl border border-white/15 bg-white/10 p-1.5 text-white lg:hidden"
                  onClick={() => setMobileSidebarOpen(true)}
                  aria-label={`Open ${roleTitle} menu`}
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div className="min-w-0">
                  <DashboardGreeting
                    name={greetingName}
                    context={roleProfile.todayContext}
                    tone="light"
                    className="mb-1.5"
                  />
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100/75">{"Today's school desk"}</p>
                  <h2 className="mt-0.5 text-xl font-black tracking-tight">{commandTitle}</h2>
                  <p className="mt-0.5 max-w-4xl text-xs leading-5 text-white/76">{roleProfile.subtitle}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="relative w-full sm:w-[320px]">
                  <span className="sr-only">{searchPlaceholder(role, roleProfile, resolvedWorkspace)}</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-100/75" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.currentTarget.value)}
                    placeholder={searchPlaceholder(role, roleProfile, resolvedWorkspace)}
                    className="w-full rounded-xl border border-white/15 bg-white/10 py-1.5 pl-9 pr-3 text-sm font-semibold text-white outline-none transition placeholder:text-white/58 focus:border-cyan-200/45 focus:bg-white/14"
                  />
                </label>
                <StatusPill label="Authorized actions" tone="ok" />
                <StatusPill label="Live school updates" tone="ok" />
                <StatusPill label="Private school data" tone="ok" />
              </div>
            </div>
          </header>

          <section className="min-h-0 flex-1 overflow-y-auto px-3 py-3 md:px-5" data-testid="role-operational-workspace">
            <div className="flex min-h-full flex-col gap-4">
            {activeWorkspaceIndex === 0 && !isSearching ? <PracticalSummaryGrid profile={roleProfile} /> : null}
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#40608F]">Active section</p>
                <p className="text-xl font-black text-[#071D49]">{schoolFriendlyText(resolvedWorkspace)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusPill label={`${visibleQueueContract.items.length} tasks`} tone="warning" />
                <StatusPill label={`${tableContract.rows.length} records`} tone="ok" />
                <StatusPill label="Updates saved" tone="ok" />
              </div>
            </div>

            <div key={resolvedWorkspace} className="min-h-0 flex-1">
            {isSearching ? (
              <div className="min-h-0">
                <RoleSearchPanel query={searchQuery} results={roleSearchResults} onOpen={openSearchResult} />
              </div>
            ) : diagnosticsWorkspace ? (
              <div className="min-h-0 space-y-4">
                <WorkspaceActionStrip actions={actions} onExecute={(action) => void executeAction(action)} />
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)]">
                  <WorkflowMap workflows={resolvedBlueprint.workflows} />
                </div>
                <RecoveryPanel blueprint={resolvedBlueprint} />
                <OutputGovernancePanel blueprint={resolvedBlueprint} role={role} />
              </div>
            ) : activePanel === "queue" && isAccountantWorkspace ? (
              <AccountantWorkspace
                balances={feeBalances}
                payments={feePayments}
                notice={financeNotice}
                onRecordPayment={recordFeePayment}
                onConfirmMpesa={confirmMpesaPayment}
                onPrintReceipt={printFeeReceipt}
                onSendReceiptSms={sendReceiptSms}
                onSendFeeReminder={sendFeeReminder}
                onRequestReversal={requestFeeReversal}
                onExportFees={exportFeeList}
              />
            ) : activePanel === "queue" && isSecretaryWorkspace ? (
              <SecretaryWorkspace
                visitors={secretaryVisitors}
                inquiries={secretaryInquiries}
                balances={feeBalances}
                notice={secretaryNotice}
                onRegisterVisitor={registerSecretaryVisitor}
                onPrintVisitorSlip={printSecretaryVisitorSlip}
                onCheckOutVisitor={checkOutSecretaryVisitor}
                onPrintFeeStatement={printSecretaryFeeStatement}
                onMarkParentServed={markSecretaryParentServed}
                onSendParentSms={sendSecretaryParentSms}
                onEscalateInquiry={escalateSecretaryInquiry}
                onAddInquiry={addSecretaryInquiry}
              />
            ) : isUserManagementWorkspace ? (
              <UserManagementWorkspace
                schoolId={schoolId}
                actorRole="Deputy Principal"
                actorName={greetingName || "Mr. Otieno"}
                canInviteUsers
                canManageUsers
              />
            ) : isNurseClinicWorkspace ? (
              <NurseClinicWorkspace
                visits={clinicVisits}
                medicines={medicineStock}
                notice={clinicNotice}
                onRecordVisit={recordClinicVisit}
                onLoadMedicine={loadMedicineStock}
                onNotifyParent={notifyClinicParent}
                onRefer={referClinicVisit}
                onRelease={releaseClinicVisit}
                onPrint={printClinicSlip}
                onPrintRegister={printClinicRegister}
              />
            ) : isAdmissionsWorkspace ? (
              <AdmissionsWorkspace
                applicants={admissionApplicants}
                notice={admissionsNotice}
                onAddApplicant={recordAdmissionApplicant}
                onVerifyDocuments={verifyAdmissionDocuments}
                onScheduleInterview={scheduleAdmissionInterview}
                onApprove={approveAdmissionApplicant}
                onReject={rejectAdmissionApplicant}
                onSendSms={sendAdmissionParentSms}
                onPrintLetter={printAdmissionLetter}
                onPrintPipeline={printAdmissionsPipeline}
              />
            ) : isLibraryWorkspace ? (
              <LibraryWorkspace
                books={libraryBooks}
                loans={libraryLoans}
                notice={libraryNotice}
                onAddBook={addLibraryBook}
                onIssueBook={issueLibraryBook}
                onReturnBook={returnLibraryBook}
                onMarkLost={markLibraryLost}
                onMarkDamaged={markLibraryDamaged}
                onSendSms={sendLibrarySms}
                onPrintSlip={printLibrarySlip}
                onPrintReport={printLibraryReport}
              />
            ) : isStorekeeperWorkspace ? (
              <StorekeeperWorkspace
                items={stockItems}
                movements={stockMovements}
                notice={stockNotice}
                onAddStock={addStockItem}
                onIssueStock={issueStock}
                onReceiveStock={receiveStock}
                onMarkDamaged={markStockMovementDamaged}
                onPrintSlip={printStockSlip}
                onExport={exportStockReport}
              />
            ) : isBoardingWorkspace ? (
              <BoardingWorkspace
                rollCalls={boardingRollCalls}
                exeats={exeatRequests}
                notice={boardingNotice}
                onAddRollCall={addBoardingRollCall}
                onMarkPresent={markBoarderPresent}
                onMarkMissing={markBoarderMissing}
                onNotifyParent={notifyBoarderParent}
                onReferNurse={referBoarderToNurse}
                onAddExeat={addExeatRequest}
                onApproveExeat={approveExeatRequest}
                onForwardExeat={forwardExeatRequest}
                onPrintRollCall={printBoardingRollCall}
              />
            ) : isLaboratoryWorkspace ? (
              <LaboratoryWorkspace
                inventory={labInventory}
                requests={labRequests}
                issues={labIssues}
                notice={labNotice}
                onAddChemicalStock={addLabChemicalStock}
                onAddPracticalRequest={addLabPracticalRequest}
                onApprovePracticalPrep={approveLabPracticalPrep}
                onIssueApparatus={issueLabApparatus}
                onReturnApparatus={returnLabApparatus}
                onRecordBreakage={recordLabBreakage}
                onAlertTeacher={alertLabTeacher}
                onPrintPracticalChecklist={printLabPracticalChecklist}
              />
            ) : isTransportWorkspace ? (
              <TransportWorkspace
                vehicles={transportVehicles}
                trips={transportTrips}
                notice={transportNotice}
                onAddTrip={addTransportTrip}
                onMarkPicked={markTransportPicked}
                onMarkDropped={markTransportDropped}
                onNotifyParent={notifyTransportParent}
                onReportVehicleIssue={reportTransportVehicleIssue}
                onAddFuel={addTransportFuelRecord}
                onScheduleMaintenance={scheduleTransportMaintenance}
                onPrintRouteList={printTransportRouteList}
              />
            ) : commandWorkspace ? (
              <div className="grid min-h-0 gap-4 2xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <div className="min-h-0 space-y-4">
                  <PracticalAlertsPanel profile={roleProfile} />
                  {kisumuBoysScore ? (
                    <KisumuBoysDemoFeedPanel
                      feed={kisumuBoysFeed}
                      score={kisumuBoysScore}
                      role={role}
                      profile={roleProfile}
                      onExecute={(action) => void executeAction(action)}
                    />
                  ) : null}
                  <Card className="p-5">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-accent" />
                      <h3 className="text-lg font-black text-foreground">What requires action right now?</h3>
                    </div>
                    <div className="mt-4 space-y-2">
                      {resolvedBlueprint.firstViewport.slice(0, 6).map((item, index) => {
                        const action = urgentActionContract(role, item, index, healthById);

                        return (
                          <div
                            key={item}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-muted/80 px-3 py-2"
                          >
                            <div className="flex items-center gap-2">
                              <ListChecks className="h-4 w-4 text-accent" />
                              <span className="text-sm font-bold text-foreground">{schoolFriendlyText(item)}</span>
                            </div>
                            <OperationalActionButton
                              action={action}
                              onExecute={(nextAction) => void executeAction(nextAction)}
                              compact
                            />
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                  <WorkspaceActionStrip actions={actions} onExecute={(action) => void executeAction(action)} />
                  <ExecutionInlineNotice items={executionLog} />
                </div>
                <OperationalQueue contract={visibleQueueContract} onExecute={(action) => void executeAction(action)} />
              </div>
            ) : (
              <div className="grid min-h-0 gap-4">
                <WorkspaceActionStrip actions={actions} onExecute={(action) => void executeAction(action)} />
                <WorkspacePanelTabs activePanel={activePanel} onChange={setActivePanel} />
                <div className="min-h-0">
                  {renderOperationalPanel()}
                </div>
              </div>
            )}
            </div>

            <p className="shrink-0 flex items-center gap-2 rounded-xl border border-[#D7E0EF] bg-white/70 px-3 py-2 text-xs font-semibold text-[#40608F]">
              <Clock3 className="h-3.5 w-3.5 text-accent" />
              Use the role menu to switch sections. System issues and retries stay in reports.
            </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function resolvePreferredWorkspace({
  role,
  sidebarItems,
  initialSection,
  initialWorkspace,
}: {
  role: SchoolExperienceRole;
  sidebarItems: string[];
  initialSection?: string;
  initialWorkspace?: string;
}) {
  const fallback = sidebarItems[0] ?? "Command Center";
  const requested = initialWorkspace ?? initialSection;

  if (!requested) {
    return fallback;
  }

  const requestedSlug = slug(requested);
  const sectionKind = workspaceKindFromRouteSection(initialSection ?? requested);
  const exactMatch = sidebarItems.find((item) => slug(item) === requestedSlug);

  if (exactMatch) {
    return exactMatch;
  }

  const looseMatch = sidebarItems.find((item) => {
    const itemSlug = slug(item);

    return itemSlug.includes(requestedSlug) || requestedSlug.includes(itemSlug);
  });

  if (looseMatch) {
    return looseMatch;
  }

  const semanticMatch = sidebarItems.find((item) => workspaceKind(role, item) === sectionKind);

  return semanticMatch ?? fallback;
}

function workspaceKindFromRouteSection(section: string): WorkspaceKind {
  const value = section.toLowerCase();

  if (/dashboard|overview|command|home/.test(value)) return "command";
  if (/approval|review|moderation/.test(value)) return "approval";
  if (/finance|fee|payment|invoice|receipt|arrears|mpesa|m-pesa|payroll|bank|budget|billing/.test(value)) return "finance";
  if (/attendance|roll-call|roll-call|late|absent/.test(value)) return "attendance";
  if (/discipline|incident|bullying|suspension|prefect|behaviour|behavior/.test(value)) return "discipline";
  if (/academic|exam|marks|grade|performance|subject|syllabus|lesson|curriculum|timetable|assignment|analytics/.test(value)) return "academic";
  if (/parent|communication|message|announcement|sms|notice|notification/.test(value)) return "communication";
  if (/student|class|stream|welfare|profile|roster|children|users-staff|staff/.test(value)) return "students";
  if (/teacher|hr|leave|appraisal|duty|coverage/.test(value)) return "staff";
  if (/transport|fleet|route|bus|driver|fuel|gps|trip|vehicle/.test(value)) return "transport";
  if (/inventory|stock|store|supplier|procurement|issue|receipt|low-stock|asset/.test(value)) return "inventory";
  if (/library|book|borrowing|return|fine|catalog/.test(value)) return "library";
  if (/clinic|nurse|medicine|medical|health|referral|emergency/.test(value)) return "clinic";
  if (/counselling|counseling|wellness|mental|session/.test(value)) return "counselling";
  if (/boarding|dorm|bed|leave|exeat|hostel/.test(value)) return "boarding";
  if (/security|visitor|gate|exit|access/.test(value)) return "security";
  if (/lab|laboratory|chemical|apparatus|practical|breakage|safety/.test(value)) return "laboratory";
  if (/admission|registrar|inquiry|application|interview/.test(value)) return "admissions";
  if (/report|export|document-printing|printing/.test(value)) return "reports";
  if (/setting|configuration|integrations|setup/.test(value)) return "settings";
  if (/audit|logs|system-health|infrastructure|event-bus|dead-letter|data-security/.test(value)) return "audit";

  return "general";
}
