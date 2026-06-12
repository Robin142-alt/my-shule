"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowRight,
  BarChart3,
  Bell,
  Boxes,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  FileBarChart2,
  Gauge,
  ListChecks,
  LockKeyhole,
  Moon,
  PackageCheck,
  PackageOpen,
  PackagePlus,
  Radar,
  ReceiptText,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sun,
  Truck,
  UserCheck,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { ApprovalInbox } from "@/components/shared/approval-inbox";
import { NotificationBell } from "@/components/shared/notification-bell";
import { TaskQueue } from "@/components/shared/task-queue";
import { WorkflowToast } from "@/components/shared/workflow-toast";

import { toSchoolPath, type SchoolSection } from "@/lib/routing/experience-routes";
import {
  getCurrentSchoolId,
  publishSchoolOperationalEvent,
  type SchoolOperationalSeverity,
} from "@/lib/school/school-operational-store";
import { supportSidebarItems } from "@/lib/support/support-data";
import { useSchoolQuery, useSchoolMutation } from "@/lib/data/school-hooks";

type StorekeeperRouteMode = "hosted" | "public";
type StorekeeperTheme = "dark" | "light";
type Tone = "critical" | "warning" | "success" | "info" | "accent" | "neutral";

type StorekeeperLinkSection =
  | "ai-insights"
  | "communication"
  | "dashboard"
  | "inventory"
  | "procurement"
  | "reports"
  | "settings";

const storekeeperSearchRecords = [
  { id: "rice-low", label: "Rice stock", detail: "Runs out in 5 days | purchase order needed", sectionId: "purchase-orders" },
  { id: "grn-lab", label: "Lake Lab Supplies GRN", detail: "Safety goggles and pH papers delayed", sectionId: "suppliers" },
  { id: "req-kitchen", label: "Kitchen requisition", detail: "High urgency item issue pending", sectionId: "requisitions" },
  { id: "count-kitchen", label: "Kitchen count", detail: "82% ready | variance locking enabled", sectionId: "stock-counts" },
  { id: "chem-acid", label: "Chemistry acid movement", detail: "Unusual lab request increase", sectionId: "ai-insights" },
] satisfies Array<{ id: string; label: string; detail: string; sectionId: string }>;

type StorekeeperSearchRecord = (typeof storekeeperSearchRecords)[number];

function announceAction(message: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("myshule-dashboard-action", { detail: message }));
  }
}

const toneStyles: Record<
  Tone,
  {
    border: string;
    bg: string;
    text: string;
    icon: string;
    chip: string;
    glow: string;
    dot: string;
  }
> = {
  critical: {
    border: "border-rose-300/35",
    bg: "bg-rose-500/12",
    text: "text-rose-100",
    icon: "text-rose-200",
    chip: "border-rose-300/35 bg-rose-500/15 text-rose-100",
    glow: "shadow-[0_0_42px_rgba(225,29,72,0.23)]",
    dot: "bg-rose-400",
  },
  warning: {
    border: "border-amber-300/35",
    bg: "bg-amber-400/13",
    text: "text-amber-100",
    icon: "text-amber-200",
    chip: "border-amber-300/35 bg-amber-400/15 text-amber-100",
    glow: "shadow-[0_0_40px_rgba(245,158,11,0.2)]",
    dot: "bg-amber-300",
  },
  success: {
    border: "border-emerald-300/30",
    bg: "bg-emerald-400/12",
    text: "text-emerald-100",
    icon: "text-emerald-200",
    chip: "border-emerald-300/30 bg-emerald-400/15 text-emerald-100",
    glow: "shadow-[0_0_38px_rgba(16,185,129,0.18)]",
    dot: "bg-emerald-300",
  },
  info: {
    border: "border-sky-300/30",
    bg: "bg-sky-400/12",
    text: "text-sky-100",
    icon: "text-sky-200",
    chip: "border-sky-300/30 bg-sky-400/15 text-sky-100",
    glow: "shadow-[0_0_38px_rgba(14,165,233,0.18)]",
    dot: "bg-sky-300",
  },
  accent: {
    border: "border-[#FF7A1A]/40",
    bg: "bg-[#FF7A1A]/14",
    text: "text-[#FFE1C8]",
    icon: "text-[#FFBC82]",
    chip: "border-[#FF7A1A]/40 bg-[#FF7A1A]/16 text-[#FFE1C8]",
    glow: "shadow-[0_0_42px_rgba(255,122,26,0.23)]",
    dot: "bg-[#FF7A1A]",
  },
  neutral: {
    border: "border-white/15",
    bg: "bg-white/8",
    text: "text-white/80",
    icon: "text-white/70",
    chip: "border-white/15 bg-white/10 text-white/80",
    glow: "shadow-[0_0_32px_rgba(15,35,69,0.18)]",
    dot: "bg-white/60",
  },
};

const commandRail: Array<{
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  active?: boolean;
}> = [
  { id: "dashboard", label: "Dashboard", icon: Gauge, active: true },
  { id: "inventory", label: "Inventory", icon: Boxes, active: true },
  { id: "received", label: "Goods Received", icon: PackagePlus, href: "goods-received" },
  { id: "requisitions", label: "Requisitions", icon: ClipboardList, href: "requisitions" },
  { id: "suppliers", label: "Suppliers", icon: Truck, href: "suppliers" },
  { id: "departments", label: "Departments", icon: Building2, href: "departments" },
  { id: "transfers", label: "Transfers", icon: Archive, href: "transfers" },
  { id: "stock-counts", label: "Stock Counts", icon: ListChecks, href: "stock-counts" },
  { id: "damaged", label: "Damaged Goods", icon: XCircle, href: "waste" },
  { id: "expiry", label: "Expiry Tracking", icon: Clock3, href: "waste" },
  { id: "purchase-orders", label: "Purchase Orders", icon: ReceiptText, href: "purchase-orders" },
  { id: "reports", label: "Reports", icon: FileBarChart2, href: "analytics" },
  { id: "audit", label: "Audit Logs", icon: ShieldCheck, href: "audit" },
  { id: "ai", label: "AI Insights", icon: Sparkles, href: "ai-insights" },
  { id: "settings", label: "Settings", icon: Settings, href: "store-settings" },
];

const quickActions: Array<{
  id: string;
  label: string;
  detail: string;
  icon: LucideIcon;
  section: StorekeeperLinkSection;
  tone: Tone;
}> = [
  { id: "receive", label: "Receive Stock", detail: "Post GRN and supplier delivery", icon: PackagePlus, section: "inventory", tone: "success" },
  { id: "issue", label: "Issue Item", detail: "Controlled release to department", icon: PackageOpen, section: "inventory", tone: "accent" },
  { id: "barcode", label: "Scan Barcode", detail: "Trace item movement instantly", icon: Radar, section: "inventory", tone: "info" },
  { id: "count", label: "Stock Count", detail: "Launch audit-ready count", icon: ClipboardCheck, section: "reports", tone: "warning" },
  { id: "emergency", label: "Emergency Request", detail: "Escalate operational crisis", icon: ShieldAlert, section: "communication", tone: "critical" },
];

const heroAlerts: Array<{
  id: string;
  title: string;
  detail: string;
  action: string;
  tone: Tone;
  icon: LucideIcon;
}> = [
  {
    id: "rice",
    title: "Rice stock may run out in 5 days",
    detail: "Boarding usage is 18% above the term baseline. Approve reorder before kitchen operations become exposed.",
    action: "Create purchase order",
    tone: "critical",
    icon: AlertTriangle,
  },
  {
    id: "acid",
    title: "Chemistry acid requests increased unusually",
    detail: "Lab requisitions are 31% higher than normal for Form 3 practicals. Verify lesson schedule and teacher approval trail.",
    action: "Review movement",
    tone: "warning",
    icon: ShieldAlert,
  },
  {
    id: "minimum",
    title: "4 items below minimum stock level",
    detail: "Cooking oil, disinfectant, printing paper, and exercise books need immediate stock attention.",
    action: "Open low stock",
    tone: "accent",
    icon: Gauge,
  },
  {
    id: "supplier",
    title: "Delayed supplier delivery",
    detail: "Lake Lab Supplies is 2 days late on safety goggles and pH papers. Procurement SLA risk is rising.",
    action: "Contact supplier",
    tone: "info",
    icon: Truck,
  },
];

const kpis = (data: any, isLoading: boolean): Array<{
  id: string;
  label: string;
  value: string;
  detail: string;
  trend: string;
  tone: Tone;
  icon: LucideIcon;
  points: number[];
  featured?: boolean;
}> => {
  if (isLoading || !data) {
    return [
      {
        id: "value",
        label: "Total Inventory Value",
        value: "Loading...",
        detail: "Audited value across kitchen, labs, boarding, office, and library.",
        trend: "Calculating...",
        tone: "accent",
        icon: LockKeyhole,
        points: [],
        featured: true,
      },
      {
        id: "risk",
        label: "Low Stock Items",
        value: "Loading...",
        detail: "Items requiring immediate reorder action.",
        trend: "Calculating...",
        tone: "critical",
        icon: AlertTriangle,
        points: [],
      },
      {
        id: "approvals",
        label: "Pending Requests",
        value: "Loading...",
        detail: "Requisitions awaiting storekeeper review.",
        trend: "Calculating...",
        tone: "warning",
        icon: ClipboardList,
        points: [],
      },
    ];
  }

  return [
    {
      id: "value",
      label: "Total Inventory Value",
      value: `KES ${data.total_inventory_value.toLocaleString("en-KE")}`,
      detail: "Audited value across kitchen, labs, boarding, office, and library.",
      trend: "Live value",
      tone: "accent",
      icon: LockKeyhole,
      points: [44, 48, 46, 55, 58, 62, 66],
      featured: true,
    },
    {
      id: "risk",
      label: "Low Stock Items",
      value: String(data.low_stock_items),
      detail: "Items below reorder level.",
      trend: `${data.low_stock_items > 0 ? "Action required" : "Healthy"}`,
      tone: data.low_stock_items > 0 ? "critical" : "success",
      icon: AlertTriangle,
      points: [24, 34, 29, 42, 46, 55, 61],
    },
    {
      id: "approvals",
      label: "Pending Requests",
      value: String(data.pending_requests),
      detail: "Requisitions pending approval.",
      trend: "Awaiting action",
      tone: data.pending_requests > 0 ? "warning" : "info",
      icon: ClipboardList,
      points: [9, 12, 10, 15, 14, 13, 12],
    },
    {
      id: "purchases",
      label: "Recent Purchases",
      value: String(data.recent_purchases),
      detail: "POs generated in the last 30 days.",
      trend: "Active procurement",
      tone: "success",
      icon: ReceiptText,
      points: [12, 18, 25, 22, 32, 36, 40],
    },
  ];
};

const analytics = [
  {
    id: "weekly-consumption",
    title: "Weekly consumption trends",
    subtitle: "Issued value across key school stores",
    tone: "accent" as Tone,
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    values: [62, 74, 69, 88, 94, 54, 42],
  },
  {
    id: "category-stock",
    title: "Category stock distribution",
    subtitle: "Inventory value protected by category",
    tone: "info" as Tone,
    labels: ["Kitchen", "Boarding", "Lab", "Library", "Office", "Cleaning"],
    values: [84, 57, 42, 35, 28, 49],
  },
  {
    id: "department-usage",
    title: "Department usage comparison",
    subtitle: "Usage intensity against historical averages",
    tone: "warning" as Tone,
    labels: ["Kitchen", "Lab", "Boarding", "Office", "Library", "Cleaning"],
    values: [92, 76, 64, 38, 31, 58],
  },
  {
    id: "stock-movement",
    title: "Monthly stock movement",
    subtitle: "Receipts versus issues by value",
    tone: "success" as Tone,
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    values: [55, 61, 73, 68, 80, 92],
  },
];

const activityFeed = [
  {
    id: "act-1",
    user: "Grace Achieng",
    department: "Kitchen",
    action: "Issued sugar",
    item: "Sugar - 50 kg bags",
    quantity: "6 bags",
    time: "3 min ago",
    status: "Approved",
    tone: "success" as Tone,
  },
  {
    id: "act-2",
    user: "Mr. Oloo",
    department: "Laboratory",
    action: "Received chemicals",
    item: "Hydrochloric acid",
    quantity: "12 bottles",
    time: "18 min ago",
    status: "Needs verification",
    tone: "warning" as Tone,
  },
  {
    id: "act-3",
    user: "Sarah Wairimu",
    department: "Library",
    action: "Returned books",
    item: "KCSE revision guides",
    quantity: "24 copies",
    time: "41 min ago",
    status: "Recorded",
    tone: "info" as Tone,
  },
  {
    id: "act-4",
    user: "Joseph Mutua",
    department: "Procurement",
    action: "Delivery received",
    item: "Exercise books",
    quantity: "1,200 pieces",
    time: "1 hr ago",
    status: "GRN posted",
    tone: "success" as Tone,
  },
  {
    id: "act-5",
    user: "Mary Atieno",
    department: "Boarding",
    action: "Damaged goods logged",
    item: "Mattress covers",
    quantity: "11 pieces",
    time: "2 hrs ago",
    status: "Audit trail open",
    tone: "critical" as Tone,
  },
];

const initialRequisitions = [
  {
    id: "REQ-1048",
    department: "Kitchen",
    requester: "Head Cook",
    item: "Rice 90 kg bags",
    quantity: "18 bags",
    urgency: "Urgent",
    date: "Today",
    stage: "Principal review",
    available: "7 bags",
    tone: "critical" as Tone,
  },
  {
    id: "REQ-1044",
    department: "Laboratory",
    requester: "Mr. Oloo",
    item: "Safety goggles",
    quantity: "40 pcs",
    urgency: "High",
    date: "Today",
    stage: "Storekeeper check",
    available: "16 pcs",
    tone: "warning" as Tone,
  },
  {
    id: "REQ-1039",
    department: "Boarding",
    requester: "Matron",
    item: "Disinfectant",
    quantity: "24 litres",
    urgency: "Normal",
    date: "Yesterday",
    stage: "Partial approval",
    available: "12 litres",
    tone: "info" as Tone,
  },
  {
    id: "REQ-1036",
    department: "Office",
    requester: "Secretary",
    item: "Printing paper",
    quantity: "30 reams",
    urgency: "Pending",
    date: "Yesterday",
    stage: "Awaiting bursar",
    available: "9 reams",
    tone: "accent" as Tone,
  },
];

const heatmap = [
  { department: "Kitchen", score: 91, detail: "Rice and cooking oil risk", tone: "critical" as Tone },
  { department: "Boarding", score: 72, detail: "Laundry stock pressure", tone: "warning" as Tone },
  { department: "Library", score: 28, detail: "Healthy book stock", tone: "success" as Tone },
  { department: "Lab", score: 84, detail: "Chemical controls needed", tone: "critical" as Tone },
  { department: "Office", score: 52, detail: "Printing paper low", tone: "info" as Tone },
  { department: "Cleaning supplies", score: 66, detail: "Disinfectant reorder soon", tone: "warning" as Tone },
];

const initialSuppliers = [
  {
    name: "Mombasa Staples Ltd",
    metric: "Best supplier",
    score: 96,
    detail: "1.2 day average delivery, 0 rejected goods",
    tone: "success" as Tone,
  },
  {
    name: "Lake Lab Supplies",
    metric: "Most delayed",
    score: 62,
    detail: "2 late deliveries this month",
    tone: "warning" as Tone,
  },
  {
    name: "Nyanza Stationers",
    metric: "Price fluctuation",
    score: 74,
    detail: "Paper prices moved +9%",
    tone: "info" as Tone,
  },
  {
    name: "Kisumu Produce Market",
    metric: "Rejected goods",
    score: 58,
    detail: "2 rice bags rejected for moisture",
    tone: "critical" as Tone,
  },
];

const initialWaste = [
  { label: "Expired goods", value: "KES 18K", detail: "Food items and lab reagents", tone: "critical" as Tone },
  { label: "Unused stock", value: "KES 92K", detail: "Dormitory supplies idle 60+ days", tone: "warning" as Tone },
  { label: "Damaged items", value: "KES 41K", detail: "Books, glassware, and covers", tone: "accent" as Tone },
  { label: "Overstocked products", value: "KES 136K", detail: "Exercise books above target", tone: "info" as Tone },
];

const initialAuditTrail = [
  {
    id: "AUD-4401",
    title: "Stock variance flagged",
    detail: "Sugar physical count is 2 bags below system quantity.",
    owner: "Grace Achieng",
    time: "Today, 11:42",
    tone: "critical" as Tone,
  },
  {
    id: "AUD-4398",
    title: "Manual adjustment approved",
    detail: "11 damaged mattress covers moved to write-off workflow.",
    owner: "Mary Atieno",
    time: "Today, 09:18",
    tone: "warning" as Tone,
  },
  {
    id: "AUD-4389",
    title: "Recent audit closed",
    detail: "Library textbook count reconciled with zero unresolved discrepancies.",
    owner: "Sarah Wairimu",
    time: "Yesterday, 16:04",
    tone: "success" as Tone,
  },
];

const initialAiInsights = [
  {
    title: "Rice consumption increased 31% unusually",
    detail: "Meal plan, attendance, and boarding occupancy do not fully explain the spike.",
    confidence: "91% confidence",
    action: "Audit kitchen issues",
    tone: "critical" as Tone,
  },
  {
    title: "You may run out of cooking oil in 6 days",
    detail: "Current burn rate suggests reorder should be approved before Wednesday.",
    confidence: "88% confidence",
    action: "Prepare reorder",
    tone: "warning" as Tone,
  },
  {
    title: "Boarding department requests exceed historical averages",
    detail: "Laundry and disinfectant requests are both trending above normal.",
    confidence: "82% confidence",
    action: "Compare dorm occupancy",
    tone: "info" as Tone,
  },
  {
    title: "Possible stock leakage detected",
    detail: "Sugar variances correlate with late evening manual adjustments.",
    confidence: "79% confidence",
    action: "Open audit trail",
    tone: "accent" as Tone,
  },
];

const emptyStateExamples = [
  "No pending requisitions",
  "All stock levels healthy",
  "No audit discrepancies found",
];

type StorekeeperOperationalRecord = Record<string, string | number | boolean | null | undefined>;

function toSeverity(tone: Tone): SchoolOperationalSeverity {
  if (tone === "critical") return "critical";
  if (tone === "warning" || tone === "accent") return "warning";
  if (tone === "success") return "success";
  return "info";
}

function recordId(prefix: string, source: string) {
  const normalizedSource = source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 52);

  return `${prefix}-${normalizedSource || "item"}-${Date.now()}`;
}

function recordStorekeeperAction(input: {
  type: string;
  title: string;
  body: string;
  entityId?: string;
  severity?: SchoolOperationalSeverity;
  payload?: Record<string, unknown>;
  notice: string;
  record?: {
    moduleName: string;
    data: StorekeeperOperationalRecord;
  };
  notifications?: Array<{
    audienceRoles: string[];
    title?: string;
    body?: string;
    severity?: SchoolOperationalSeverity;
  }>;
}) {
  const schoolId = getCurrentSchoolId();
  const createdAt = new Date().toISOString();
  const entityId = input.entityId ?? recordId("store-action", input.title);

  publishSchoolOperationalEvent({
    schoolId,
    type: input.type,
    module: "inventory",
    actorRole: "storekeeper",
    title: input.title,
    body: input.body,
    entityId,
    severity: input.severity ?? "info",
    payload: input.payload,
    notifications: input.notifications,
  });

  return input.notice;
}

function recordHeroAlertAction(alert: (typeof heroAlerts)[number]) {
  const createsPurchaseOrder = alert.action.toLowerCase().includes("purchase order");
  const notice = createsPurchaseOrder
    ? `${alert.action} drafted for ${alert.title}.`
    : `${alert.action} review ready for ${alert.title}.`;

  return recordStorekeeperAction({
    type: createsPurchaseOrder ? "STORE_PURCHASE_ORDER_DRAFTED" : "STORE_ALERT_REVIEW_READY",
    title: createsPurchaseOrder ? "Purchase order drafted" : `${alert.action} review ready`,
    body: notice,
    entityId: alert.id,
    severity: toSeverity(alert.tone),
    payload: {
      alertId: alert.id,
      item: alert.title,
      action: alert.action,
      detail: alert.detail,
      source: "critical-store-intelligence",
    },
    notice,
    record: createsPurchaseOrder
      ? {
          moduleName: "purchaseOrders",
          data: {
            item: alert.title,
            status: "Drafted",
            requestedBy: "Storekeeper",
            approvalRoute: "Bursar and Principal",
            reason: alert.detail,
          },
        }
      : undefined,
    notifications: [
      {
        audienceRoles: ["principal", "accountant"],
        title: createsPurchaseOrder ? "Storekeeper drafted a purchase order" : "Storekeeper prepared stock alert review",
        body: notice,
        severity: toSeverity(alert.tone),
      },
    ],
  });
}

function recordBulkApprovalReview(requisitions: typeof initialRequisitions) {
  return recordStorekeeperAction({
    type: "STORE_REQUISITION_BULK_REVIEW_READY",
    title: "Safe requisition bulk approval review ready",
    body: "Storekeeper prepared a bulk review for safe, low-risk requisitions.",
    severity: "info",
    notice: "Safe requisition bulk approval review ready.",
    payload: {
      eligibleRequisitions: requisitions.filter((req) => req.tone === "success" || req.tone === "info").map((req) => req.id),
      source: "requisition-management",
    },
  });
}

function recordUrgencyFilterOpened(requisitions: typeof initialRequisitions) {
  return recordStorekeeperAction({
    type: "STORE_REQUISITION_URGENCY_FILTER_READY",
    title: "Requisition urgency filters ready",
    body: "Storekeeper prepared urgency filters for requisition triage.",
    severity: "info",
    notice: "Requisition urgency filters ready.",
    payload: {
      availableUrgencies: Array.from(new Set(requisitions.map((req) => req.urgency))),
      source: "requisition-management",
    },
  });
}

function recordRequisitionDecision(
  req: (typeof initialRequisitions)[number],
  decision: "approve" | "partial" | "reject",
) {
  const eventType =
    decision === "approve"
      ? "STORE_REQUISITION_APPROVED"
      : decision === "partial"
        ? "STORE_REQUISITION_PARTIAL_ISSUE_READY"
        : "STORE_REQUISITION_REJECTED";
  const movementType =
    decision === "approve" ? "Issue approved" : decision === "partial" ? "Partial issue ready" : "Issue rejected";
  const status = decision === "approve" ? "Approved" : decision === "partial" ? "Partial issue pending" : "Rejected";
  const notice =
    decision === "approve"
      ? `${req.item} approved for ${req.department}.`
      : decision === "partial"
        ? `Partial issue review ready for ${req.item} to ${req.department}.`
        : `${req.item} rejection reason form ready.`;

  return recordStorekeeperAction({
    type: eventType,
    title: `${movementType}: ${req.item}`,
    body: notice,
    entityId: req.id,
    severity: decision === "reject" ? "warning" : toSeverity(req.tone),
    payload: {
      requisitionId: req.id,
      department: req.department,
      requester: req.requester,
      item: req.item,
      quantity: req.quantity,
      available: req.available,
      status,
      source: "requisition-management",
    },
    notice,
    record: {
      moduleName: "inventoryMovements",
      data: {
        requisitionId: req.id,
        movementType,
        department: req.department,
        requester: req.requester,
        item: req.item,
        quantity: req.quantity,
        available: req.available,
        status,
      },
    },
    notifications: [
      {
        audienceRoles: ["principal", "accountant", "deputy-principal"],
        title: `${req.department} requisition ${status.toLowerCase()}`,
        body: notice,
        severity: decision === "reject" ? "warning" : toSeverity(req.tone),
      },
    ],
  });
}

function recordInventoryInsightOpened(insight: (typeof initialAiInsights)[number]) {
  const notice = `${insight.action} review ready from inventory insights.`;

  return recordStorekeeperAction({
    type: "STORE_INVENTORY_INSIGHT_REVIEW_READY",
    title: insight.action,
    body: notice,
    severity: toSeverity(insight.tone),
    payload: {
      insight: insight.title,
      detail: insight.detail,
      confidence: insight.confidence,
      source: "inventory-insights",
    },
    notice,
  });
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function buildHref(section: StorekeeperLinkSection, routeMode: StorekeeperRouteMode) {
  if (routeMode === "public") {
    return section === "dashboard" ? "/school/storekeeper" : `/school/storekeeper/${section}`;
  }

  return toSchoolPath(section as SchoolSection);
}

function getSurfaceClasses(theme: StorekeeperTheme) {
  return {
    page:
      theme === "dark"
        ? "bg-[radial-gradient(circle_at_top_left,rgba(255,122,26,0.18),transparent_28%),linear-gradient(135deg,#061636_0%,#071D49_42%,#102A60_100%)] text-white"
        : "bg-[radial-gradient(circle_at_top_left,rgba(255,122,26,0.16),transparent_30%),linear-gradient(135deg,#EEF4FF_0%,#E7ECF8_48%,#F8FBFF_100%)] text-[#071D49]",
    card:
      theme === "dark"
        ? "border-white/12 bg-white/[0.075] shadow-[0_24px_70px_rgba(0,0,0,0.24)] backdrop-blur-xl"
        : "border-[#C8D5EA] bg-white/82 shadow-[0_22px_60px_rgba(7,29,73,0.14)] backdrop-blur-xl",
    muted: theme === "dark" ? "text-white/66" : "text-[#516488]",
    strong: theme === "dark" ? "text-white" : "text-[#071D49]",
    soft:
      theme === "dark"
        ? "border-white/10 bg-white/[0.055]"
        : "border-[#D9E3F2] bg-white/70",
    divider: theme === "dark" ? "border-white/10" : "border-[#D9E3F2]",
    input:
      theme === "dark"
        ? "border-white/12 bg-[#081A3D]/68 text-white placeholder:text-white/48"
        : "border-[#C8D5EA] bg-white/86 text-[#071D49] placeholder:text-[#637393]",
  };
}

function MiniSparkline({ points, tone }: { points: number[]; tone: Tone }) {
  const color =
    tone === "critical"
      ? "#FB7185"
      : tone === "warning"
        ? "#FBBF24"
        : tone === "success"
          ? "#34D399"
          : tone === "accent"
            ? "#FF7A1A"
            : "#38BDF8";
  const max = Math.max(...points);
  const min = Math.min(...points);
  const path = points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * 100;
      const y = 42 - ((point - min) / Math.max(max - min, 1)) * 34;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg aria-hidden="true" className="h-12 w-full overflow-visible" viewBox="0 0 100 48" preserveAspectRatio="none">
      <path d={`${path} L 100 48 L 0 48 Z`} fill={color} opacity="0.14" />
      <path d={path} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.2" />
    </svg>
  );
}

function BarMiniChart({ values, tone }: { values: number[]; tone: Tone }) {
  const max = Math.max(...values);
  const color =
    tone === "critical"
      ? "bg-rose-400"
      : tone === "warning"
        ? "bg-amber-300"
        : tone === "success"
          ? "bg-emerald-300"
          : tone === "accent"
            ? "bg-[#FF7A1A]"
            : "bg-sky-300";

  return (
    <div className="flex h-36 items-end gap-2">
      {values.map((value, index) => (
        <div key={`${value}-${index}`} className="flex flex-1 items-end rounded-full bg-white/10">
          <div
            className={cn("w-full rounded-full", color)}
            style={{ height: `${Math.max(14, (value / max) * 100)}%` }}
          />
        </div>
      ))}
    </div>
  );
}

function IconBadge({ icon: Icon, tone }: { icon: LucideIcon; tone: Tone }) {
  const toneClass = toneStyles[tone];
  return (
    <span className={cn("grid h-11 w-11 place-items-center rounded-2xl border", toneClass.border, toneClass.bg, toneClass.icon)}>
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#FFB06C]">{eyebrow}</p>
        ) : null}
        <h2 className="mt-2 text-2xl font-black tracking-normal md:text-3xl">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-current/66">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function CommandRail({ theme }: { theme: StorekeeperTheme }) {
  const surface = getSurfaceClasses(theme);

  return (
    <aside className={cn("hidden lg:block rounded-3xl border p-3 lg:sticky lg:top-6", surface.card)}>
      <div className="px-3 py-2">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#FFB06C]">Store map</p>
        <p className={cn("mt-2 text-sm leading-5", surface.muted)}>Audit-ready navigation for every stock movement.</p>
      </div>
      <nav className="mt-3 grid gap-1.5" aria-label="Storekeeper command navigation">
        {commandRail.map((item) => {
          const Icon = item.icon;
          const content = (
            <>
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{item.label}</span>
            </>
          );
          const className = cn(
            "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition duration-200",
            item.active
              ? "border border-[#FF7A1A]/34 bg-[#FF7A1A]/12 text-[#FFE0C2]"
              : theme === "dark"
                ? "text-white/72 hover:bg-white/10 hover:text-white"
                : "text-[#516488] hover:bg-[#071D49]/7 hover:text-[#071D49]",
          );

          return item.href ? (
            <a key={item.id} href={item.href} className={className}>
              {content}
            </a>
          ) : (
            <span key={item.id} className={className}>
              {content}
            </span>
          );
        })}
      </nav>
      <div className={cn("mt-4 border-t pt-4", theme === "dark" ? "border-white/10" : "border-[#071D49]/10")}>
        <p className={cn("px-3 text-[10px] font-black uppercase tracking-[0.18em]", surface.muted)}>
          Support Center
        </p>
        <nav className="mt-2 grid gap-1.5" aria-label="Storekeeper support navigation">
          {supportSidebarItems.map((item) => {
            const Icon = item.icon;

            return (
              <a
                key={item.id}
                href={`/school/storekeeper/${item.id}`}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition duration-200",
                  theme === "dark"
                    ? "text-white/72 hover:bg-white/10 hover:text-white"
                    : "text-[#516488] hover:bg-[#071D49]/7 hover:text-[#071D49]",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </a>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

function Header({
  theme,
  routeMode,
  searchTerm,
  searchResults,
  onThemeChange,
  onSearchResult,
  onSearchTermChange,
}: {
  theme: StorekeeperTheme;
  routeMode: StorekeeperRouteMode;
  searchTerm: string;
  searchResults: StorekeeperSearchRecord[];
  onThemeChange: (theme: StorekeeperTheme) => void;
  onSearchResult: (record: StorekeeperSearchRecord) => void;
  onSearchTermChange: (value: string) => void;
}) {
  const surface = getSurfaceClasses(theme);
  return (
    <section id="top" className={cn("rounded-3xl border p-4 md:p-5", surface.card)}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-3xl bg-[#FF7A1A] text-xl font-black text-white shadow-[0_18px_45px_rgba(255,122,26,0.34)]">
            MS
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#FFB06C]">MyShule inventory control</p>
            <h1 className="mt-1 text-2xl font-black tracking-normal md:text-4xl">Storekeeper command center</h1>
            <p className={cn("mt-2 max-w-2xl text-sm leading-6", surface.muted)}>
              Nothing enters or leaves the school unnoticed. Every issue, receipt, count, approval, and variance stays traceable.
            </p>
          </div>
        </div>

        <div className="grid gap-3 lg:min-w-[520px]">
          <div className="relative">
            <Search className={cn("pointer-events-none absolute left-4 top-3.5 h-5 w-5", surface.muted)} aria-hidden="true" />
            <input
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && searchResults[0]) {
                  onSearchResult(searchResults[0]);
                }
              }}
              className={cn("h-12 w-full rounded-2xl border pl-12 pr-4 text-sm font-semibold outline-none transition focus:border-[#FF7A1A]/70 focus:ring-4 focus:ring-[#FF7A1A]/15", surface.input)}
              placeholder="Search items, suppliers, requisition IDs, GRNs, or departments"
              aria-label="Search items, suppliers, requisition IDs, GRNs, or departments"
            />
            {searchTerm.trim().length > 0 ? (
              <div className={cn("absolute left-0 right-0 top-14 z-20 overflow-hidden rounded-2xl border shadow-2xl", surface.card)}>
                {searchResults.length > 0 ? (
                  searchResults.map((record) => (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => onSearchResult(record)}
                      className={cn("block w-full px-4 py-3 text-left text-sm transition hover:bg-[#FF7A1A]/12", theme === "dark" ? "text-white" : "text-[#071D49]")}
                    >
                      <span className="block font-black">{record.label}</span>
                      <span className={cn("mt-1 block text-xs font-semibold", surface.muted)}>{record.detail}</span>
                    </button>
                  ))
                ) : (
                  <p className={cn("px-4 py-3 text-sm font-bold", surface.muted)}>No matching store records found.</p>
                )}
              </div>
            ) : null}
            <p className={cn("mt-2 text-xs font-semibold", surface.muted)}>
              Search items, suppliers, requisition IDs, GRNs, or departments.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <TaskQueue />
              <ApprovalInbox currentUserId="school" />
              <NotificationBell />
            </div>
            <StatusChip icon={Bell} label="7 low stock alerts" tone="critical" />
            <StatusChip icon={ClipboardList} label="12 approvals in queue" tone="accent" />
            <StatusChip icon={ShieldCheck} label="Audit trail live" tone="success" />
            <button
              type="button"
              onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}
              className={cn("inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-bold transition hover:-translate-y-0.5", surface.soft)}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
              {theme === "dark" ? "Light" : "Dark"}
            </button>
            <Link
              href={buildHref("settings", routeMode)}
              className={cn("inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-bold transition hover:-translate-y-0.5", surface.soft)}
            >
              <UserCheck className="h-4 w-4" aria-hidden="true" />
              Storekeeper
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatusChip({ icon: Icon, label, tone }: { icon: LucideIcon; label: string; tone: Tone }) {
  const toneClass = toneStyles[tone];
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-black", toneClass.chip)}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </span>
  );
}

function HeroAlert({ alert, featured, theme }: { alert: (typeof heroAlerts)[number]; featured?: boolean; theme: StorekeeperTheme }) {
  const toneClass = toneStyles[alert.tone];
  const surface = getSurfaceClasses(theme);
  const Icon = alert.icon;

  return (
    <motion.article
      initial={false}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      className={cn(
        "group rounded-3xl border p-5 transition duration-200",
        featured ? "md:col-span-2 xl:col-span-2" : "",
        surface.card,
        toneClass.border,
        toneClass.glow,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <IconBadge icon={Icon} tone={alert.tone} />
        <span className={cn("rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.16em]", toneClass.chip)}>
          Action
        </span>
      </div>
      <h3 className="mt-5 text-xl font-black tracking-normal md:text-2xl">{alert.title}</h3>
      <p className={cn("mt-3 text-sm leading-6", surface.muted)}>{alert.detail}</p>
      <button
        type="button"
        onClick={() => announceAction(recordHeroAlertAction(alert))}
        className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#FF7A1A] px-4 py-2.5 text-sm font-black text-white shadow-[0_16px_36px_rgba(255,122,26,0.24)] transition group-hover:translate-x-1"
      >
        {alert.action}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </motion.article>
  );
}

function KpiCard({ item, theme }: { item: ReturnType<typeof kpis>[number]; theme: StorekeeperTheme }) {
  const surface = getSurfaceClasses(theme);
  const toneClass = toneStyles[item.tone];

  return (
    <motion.article
      initial={false}
      whileHover={{ y: -4 }}
      className={cn(
        "rounded-3xl border p-5 transition",
        item.featured ? "md:col-span-2 xl:col-span-2" : "",
        surface.card,
        item.featured ? "bg-[#FF7A1A]/12" : "",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <IconBadge icon={item.icon} tone={item.tone} />
        <span className={cn("rounded-full border px-3 py-1 text-xs font-black", toneClass.chip)}>{item.trend}</span>
      </div>
      <p className={cn("mt-5 text-xs font-black uppercase tracking-[0.2em]", surface.muted)}>{item.label}</p>
      <p className="mt-2 text-3xl font-black tracking-normal md:text-4xl">{item.value}</p>
      <p className={cn("mt-2 min-h-10 text-sm leading-5", surface.muted)}>{item.detail}</p>
      <div className="mt-4">
        <MiniSparkline points={item.points} tone={item.tone} />
      </div>
    </motion.article>
  );
}

function QuickActionCenter({ routeMode, theme }: { routeMode: StorekeeperRouteMode; theme: StorekeeperTheme }) {
  const surface = getSurfaceClasses(theme);

  return (
    <section id="goods-received" className={cn("rounded-3xl border p-5 md:p-6", surface.card)}>
      <SectionHeader
        eyebrow="Fast action center"
        title="Operational controls"
        description="High-frequency store actions are one tap away, with the audit trail kept in the background."
      />
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {quickActions.map((action) => {
          const toneClass = toneStyles[action.tone];
          const Icon = action.icon;
          return (
            <Link
              key={action.id}
              href={buildHref(action.section, routeMode)}
              className={cn(
                "group rounded-3xl border p-4 transition duration-200 hover:-translate-y-1",
                surface.soft,
                toneClass.border,
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <IconBadge icon={Icon} tone={action.tone} />
                <ArrowRight className="h-4 w-4 opacity-50 transition group-hover:translate-x-1 group-hover:opacity-100" aria-hidden="true" />
              </div>
              <p className="mt-4 text-base font-black">{action.label}</p>
              <p className={cn("mt-2 text-sm leading-5", surface.muted)}>{action.detail}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function AnalyticsPanel({ chart, theme }: { chart: (typeof analytics)[number]; theme: StorekeeperTheme }) {
  const surface = getSurfaceClasses(theme);
  return (
    <article className={cn("rounded-3xl border p-5", surface.soft)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-black">{chart.title}</h3>
          <p className={cn("mt-1 text-sm", surface.muted)}>{chart.subtitle}</p>
        </div>
        <StatusChip icon={BarChart3} label="Live" tone={chart.tone} />
      </div>
      <div className="mt-5">
        <BarMiniChart values={chart.values} tone={chart.tone} />
      </div>
      <div className={cn("mt-4 grid sm:grid-cols-3 gap-2 text-[11px] font-bold uppercase tracking-[0.12em]", surface.muted)}>
        {chart.labels.slice(0, 6).map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </article>
  );
}

function ActivityFeed({ data, isLoading, theme }: { data: any, isLoading: boolean, theme: StorekeeperTheme }) {
  const surface = getSurfaceClasses(theme);

  const activeFeed = isLoading || !data?.recent_stock_movement ? activityFeed : data.recent_stock_movement.map((m: any) => ({
    id: m.id,
    user: m.actor_display_name || "System",
    department: m.movement_type,
    action: m.movement_type === "stock_in" ? "Received stock" : m.movement_type === "stock_issue" ? "Issued stock" : "Adjusted stock",
    item: m.item_name,
    quantity: String(m.quantity),
    time: new Date(m.occurred_at).toLocaleDateString(),
    status: m.reference || "Recorded",
    tone: m.movement_type === "stock_in" ? "success" : m.movement_type === "stock_issue" ? "info" : "warning",
  }));

  return (
    <section className={cn("rounded-3xl border p-5 md:p-6", surface.card)}>
      <SectionHeader
        eyebrow="Live audit heartbeat"
        title="Live store activity feed"
        description="A real-time accountability trail showing who moved what, where it went, and whether it was approved."
        action={<StatusChip icon={Activity} label="Live pulse" tone="success" />}
      />
      <div className="mt-6 space-y-3">
        {activeFeed.map((item: any) => (
          <article key={item.id} className={cn("rounded-3xl border p-4", surface.soft)}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className={cn("relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl border font-black", toneStyles[item.tone as Tone].chip)}>
                  {item.user
                    .split(" ")
                    .map((part: string) => part[0])
                    .join("")
                    .slice(0, 2)}
                  <span className={cn("absolute -right-1 -top-1 h-3 w-3 rounded-full ring-2 ring-[#071D49]", toneStyles[item.tone as Tone].dot)} />
                </div>
                <div>
                  <p className="font-black">{item.action}</p>
                  <p className={cn("mt-1 text-sm leading-5", surface.muted)}>
                    {item.user} ({item.department}) moved {item.quantity} of {item.item}.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <StatusChip icon={CheckCircle2} label={item.status} tone={item.tone as Tone} />
                <span className={cn("text-xs font-bold", surface.muted)}>{item.time}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function RequisitionPanel({ theme }: { theme: StorekeeperTheme }) {
  const { data: fetchedRequisitions } = useSchoolQuery<typeof initialRequisitions>("/api/inventory/requisitions");
  const activeRequisitions = Array.isArray(fetchedRequisitions) ? fetchedRequisitions : [];
  const queryClient = useQueryClient();
  const surface = getSurfaceClasses(theme);
  const [decisionByRequisitionId, setDecisionByRequisitionId] = useState<Record<string, string>>({});
  const requisitionMutation = useSchoolMutation("/api/inventory/requisitions");

  function handleRequisitionDecision(req: (typeof initialRequisitions)[number], decision: "approve" | "partial" | "reject") {
    const status = decision === "approve" ? "Approved" : decision === "partial" ? "Partial issue pending" : "Rejected";

    requisitionMutation.mutate({ reqId: req.id, decision }, {
      onSuccess: () => {
          queryClient.invalidateQueries();
        setDecisionByRequisitionId((current) => ({ ...current, [req.id]: status }));
        announceAction(recordRequisitionDecision(req, decision));
      }
    });
  }

  return (
    <section id="requisitions" className={cn("rounded-3xl border p-5 md:p-6", surface.card)}>
      <SectionHeader
        eyebrow="Approval command"
        title="Requisition management"
        description="Approve, reject, partially fulfill, escalate, and filter operational requests without losing stock accountability."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => announceAction(recordBulkApprovalReview(activeRequisitions))}
              className="rounded-2xl bg-[#FF7A1A] px-4 py-2 text-sm font-black text-white"
            >
              Bulk approve safe items
            </button>
            <button
              type="button"
              onClick={() => announceAction(recordUrgencyFilterOpened(activeRequisitions))}
              className={cn("rounded-2xl border px-4 py-2 text-sm font-black", surface.soft)}
            >
              Filter urgency
            </button>
          </div>
        }
      />
      <div className="mt-6 overflow-hidden rounded-3xl border border-white/10">
        <div className={cn("hidden grid-cols-[1fr_1fr_1.4fr_0.8fr_0.8fr_0.8fr_1fr_0.9fr] gap-3 border-b px-4 py-3 text-xs font-black uppercase tracking-[0.15em] md:grid", surface.divider, surface.muted)}>
          <span>Department</span>
          <span>Requester</span>
          <span>Item</span>
          <span>Quantity</span>
          <span>Urgency</span>
          <span>Date</span>
          <span>Stage</span>
          <span>Stock</span>
        </div>
        <div className="divide-y divide-white/10">
          {activeRequisitions.map((req) => (
            <article key={req.id} className="grid gap-4 px-4 py-4 md:grid-cols-[1fr_1fr_1.4fr_0.8fr_0.8fr_0.8fr_1fr_0.9fr] md:items-center md:gap-3">
              <p className="font-black">{req.department}</p>
              <p className={surface.muted}>{req.requester}</p>
              <div>
                <p className="font-black">{req.item}</p>
                <p className={cn("text-xs font-bold", surface.muted)}>{req.id}</p>
              </div>
              <p className="font-black">{req.quantity}</p>
              <StatusChip icon={AlertTriangle} label={req.urgency} tone={req.tone} />
              <p className={surface.muted}>{req.date}</p>
              <p className="font-bold">{decisionByRequisitionId[req.id] ?? req.stage}</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-black">{req.available}</span>
                <button
                  type="button"
                  onClick={() => handleRequisitionDecision(req, "approve")}
                  className="rounded-full border border-emerald-300/30 bg-emerald-400/12 px-3 py-1 text-xs font-black text-emerald-100"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => handleRequisitionDecision(req, "partial")}
                  className="rounded-full border border-amber-300/30 bg-amber-400/12 px-3 py-1 text-xs font-black text-amber-100"
                >
                  Partial
                </button>
                <button
                  type="button"
                  onClick={() => handleRequisitionDecision(req, "reject")}
                  className="rounded-full border border-rose-300/30 bg-rose-400/12 px-3 py-1 text-xs font-black text-rose-100"
                >
                  Reject
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Heatmap({ theme }: { theme: StorekeeperTheme }) {
  const surface = getSurfaceClasses(theme);
  return (
    <section id="departments" className={cn("rounded-3xl border p-5 md:p-6", surface.card)}>
      <SectionHeader
        eyebrow="Department risk"
        title="Low stock heatmap"
        description="The redder a department becomes, the closer it is to operational disruption."
      />
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {heatmap.map((item) => (
          <article
            key={item.department}
            className={cn("rounded-3xl border p-4", surface.soft, toneStyles[item.tone].border)}
            style={{ "--heat": `${item.score}%` } as CSSProperties}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-lg font-black">{item.department}</p>
              <span className={cn("rounded-full border px-3 py-1 text-xs font-black", toneStyles[item.tone].chip)}>
                {item.score}
              </span>
            </div>
            <p className={cn("mt-2 text-sm", surface.muted)}>{item.detail}</p>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className={cn(
                  "h-full rounded-full",
                  item.tone === "critical"
                    ? "bg-rose-400"
                    : item.tone === "warning"
                      ? "bg-amber-300"
                      : item.tone === "success"
                        ? "bg-emerald-300"
                        : "bg-sky-300",
                )}
                style={{ width: `${item.score}%` }}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SupplierPerformance({ theme }: { theme: StorekeeperTheme }) {
  const { data: fetchedSuppliers } = useSchoolQuery<typeof initialSuppliers>("/api/inventory/suppliers");
  const activeSuppliers = Array.isArray(fetchedSuppliers) ? fetchedSuppliers : [];
  const surface = getSurfaceClasses(theme);
  return (
    <section id="suppliers" className={cn("rounded-3xl border p-5 md:p-6", surface.card)}>
      <SectionHeader
        eyebrow="Supplier intelligence"
        title="Supplier performance"
        description="Delivery consistency, delay risk, rejection rate, pricing movement, and reliability score in one view."
      />
      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        {activeSuppliers.map((supplier, index) => (
          <article key={supplier.name} className={cn("rounded-3xl border p-4", surface.soft)}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl border text-sm font-black", toneStyles[supplier.tone].chip)}>
                  {index + 1}
                </span>
                <div>
                  <p className="font-black">{supplier.name}</p>
                  <p className={cn("mt-1 text-sm", surface.muted)}>{supplier.detail}</p>
                </div>
              </div>
              <StatusChip icon={Truck} label={supplier.metric} tone={supplier.tone} />
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className={cn(
                    "h-full rounded-full",
                    supplier.tone === "critical"
                      ? "bg-rose-400"
                      : supplier.tone === "warning"
                        ? "bg-amber-300"
                        : supplier.tone === "success"
                          ? "bg-emerald-300"
                          : "bg-sky-300",
                  )}
                  style={{ width: `${supplier.score}%` }}
                />
              </div>
              <span className="text-sm font-black">{supplier.score}%</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function WastePanel({ theme }: { theme: StorekeeperTheme }) {
  const { data: fetchedWaste } = useSchoolQuery<typeof initialWaste>("/api/inventory/waste");
  const activeWaste = Array.isArray(fetchedWaste) ? fetchedWaste : [];
  const surface = getSurfaceClasses(theme);
  return (
    <section id="waste" className={cn("rounded-3xl border p-5 md:p-6", surface.card)}>
      <SectionHeader
        eyebrow="Leakage prevention"
        title="Waste & dead stock"
        description="Expose expired goods, idle inventory, damaged assets, and overstock before money disappears into silence."
      />
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {activeWaste.map((item) => (
          <article key={item.label} className={cn("rounded-3xl border p-4", surface.soft, toneStyles[item.tone].border)}>
            <StatusChip icon={XCircle} label={item.label} tone={item.tone} />
            <p className="mt-4 text-3xl font-black">{item.value}</p>
            <p className={cn("mt-2 text-sm", surface.muted)}>{item.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function AuditPanel({ theme }: { theme: StorekeeperTheme }) {
  const { data: fetchedAuditTrail } = useSchoolQuery<typeof initialAuditTrail>("/api/inventory/audit");
  const activeAuditTrail = Array.isArray(fetchedAuditTrail) ? fetchedAuditTrail : [];
  const surface = getSurfaceClasses(theme);
  return (
    <section id="audit" className={cn("rounded-3xl border p-5 md:p-6", surface.card)}>
      <SectionHeader
        eyebrow="Accountability core"
        title="Audit & accountability"
        description="Every variance, adjustment, missing item, and approval remains tied to a person, timestamp, reason, and follow-up."
        action={<StatusChip icon={LockKeyhole} label="Traceability enforced" tone="success" />}
      />
      <div className="mt-6 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          {[
            ["Stock variance", "KES 23K", "2 unresolved discrepancies", "critical" as Tone],
            ["Manual adjustments", "17", "5 require bursar review", "warning" as Tone],
            ["Missing items", "3", "Assigned to active audit", "critical" as Tone],
            ["Highest adjustments", "Kitchen", "Grace Achieng, 8 records", "accent" as Tone],
          ].map(([label, value, detail, tone]) => (
            <article key={label} className={cn("rounded-3xl border p-4", surface.soft)}>
              <StatusChip icon={ShieldCheck} label={label} tone={tone as Tone} />
              <p className="mt-4 text-3xl font-black">{value}</p>
              <p className={cn("mt-2 text-sm", surface.muted)}>{detail}</p>
            </article>
          ))}
        </div>
        <div className="space-y-3">
          {activeAuditTrail.map((item) => (
            <article key={item.id} className={cn("rounded-3xl border p-4", surface.soft)}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-black">{item.title}</p>
                  <p className={cn("mt-1 text-sm leading-5", surface.muted)}>{item.detail}</p>
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-[#FFB06C]">{item.owner}</p>
                </div>
                <StatusChip icon={Clock3} label={item.time} tone={item.tone} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function AiInsights({ theme }: { theme: StorekeeperTheme }) {
  const { data: fetchedAiInsights } = useSchoolQuery<typeof initialAiInsights>("/api/inventory/insights");
  const activeAiInsights = Array.isArray(fetchedAiInsights) ? fetchedAiInsights : [];
  const surface = getSurfaceClasses(theme);
  return (
    <section id="ai-insights" className={cn("rounded-3xl border p-5 md:p-6", surface.card)}>
      <SectionHeader
        eyebrow="Predictive control"
        title="AI inventory insights"
        description="Signals that help storekeepers, principals, bursars, and auditors act before loss, shortage, or manipulation spreads."
        action={<StatusChip icon={Sparkles} label="Pattern engine active" tone="accent" />}
      />
      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        {activeAiInsights.map((insight) => (
          <motion.article
            key={insight.title}
            initial={false}
            whileHover={{ y: -4 }}
            className={cn("rounded-3xl border p-5", surface.soft, toneStyles[insight.tone].border)}
          >
            <div className="flex items-start justify-between gap-3">
              <IconBadge icon={Sparkles} tone={insight.tone} />
              <StatusChip icon={Gauge} label={insight.confidence} tone={insight.tone} />
            </div>
            <h3 className="mt-5 text-xl font-black">{insight.title}</h3>
            <p className={cn("mt-3 text-sm leading-6", surface.muted)}>{insight.detail}</p>
            <button
              type="button"
              onClick={() => announceAction(recordInventoryInsightOpened(insight))}
              className="mt-5 rounded-2xl border border-[#FF7A1A]/40 bg-[#FF7A1A]/14 px-4 py-2 text-sm font-black text-[#FFE0C2]"
            >
              {insight.action}
            </button>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

function RightRail({ theme }: { theme: StorekeeperTheme }) {
  const surface = getSurfaceClasses(theme);
  return (
    <aside className="space-y-4 xl:sticky xl:top-6">
      <section id="transfers" className={cn("rounded-3xl border p-5", surface.card)}>
        <SectionHeader
          eyebrow="Quick brief"
          title="5-second risk view"
          description="Critical signals a principal or auditor can understand immediately."
        />
        <div className="mt-5 space-y-3">
          <StatusChip icon={AlertTriangle} label="3 critical risks" tone="critical" />
          <StatusChip icon={ClipboardList} label="5 urgent requisitions" tone="warning" />
          <StatusChip icon={ShieldCheck} label="2 variance investigations" tone="accent" />
          <StatusChip icon={CheckCircle2} label="98% movement traceability" tone="success" />
        </div>
      </section>

      <section id="stock-counts" className={cn("rounded-3xl border p-5", surface.card)}>
        <h2 className="text-xl font-black">Stock count readiness</h2>
        <p className={cn("mt-2 text-sm leading-6", surface.muted)}>Mobile counts are staged by department with variance locking enabled.</p>
        <div className="mt-5 space-y-4">
          {[
            ["Kitchen count", 82, "critical" as Tone],
            ["Lab safety count", 68, "warning" as Tone],
            ["Library sample audit", 94, "success" as Tone],
          ].map(([label, value, tone]) => (
            <div key={label}>
              <div className="flex items-center justify-between gap-2 text-sm font-black">
                <span>{label}</span>
                <span>{value}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className={cn(
                    "h-full rounded-full",
                    tone === "critical" ? "bg-rose-400" : tone === "warning" ? "bg-amber-300" : "bg-emerald-300",
                  )}
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="purchase-orders" className={cn("rounded-3xl border p-5", surface.card)}>
        <h2 className="text-xl font-black">Purchase orders</h2>
        <p className={cn("mt-2 text-sm leading-6", surface.muted)}>Three reorder drafts are ready for bursar and principal approval.</p>
        <div className="mt-5 grid gap-3">
          <StatusChip icon={ReceiptText} label="Rice PO draft: KES 188K" tone="critical" />
          <StatusChip icon={ReceiptText} label="Lab safety PO: KES 64K" tone="warning" />
          <StatusChip icon={ReceiptText} label="Printing paper PO: KES 42K" tone="info" />
        </div>
      </section>

      <section id="store-settings" className={cn("rounded-3xl border p-5", surface.card)}>
        <h2 className="text-xl font-black">Empty states</h2>
        <p className={cn("mt-2 text-sm leading-6", surface.muted)}>When a workflow is clear, the dashboard still communicates confidence.</p>
        <div className="mt-5 grid gap-2">
          {emptyStateExamples.map((state) => (
            <div key={state} className={cn("rounded-2xl border px-4 py-3 text-sm font-black", surface.soft)}>
              {state}
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}

function MobileQuickActions({ routeMode }: { routeMode: StorekeeperRouteMode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#071D49]/92 px-2 py-2 shadow-[0_-18px_50px_rgba(0,0,0,0.3)] backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-5 gap-1">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.id}
              href={buildHref(action.section, routeMode)}
              className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-center text-[10px] font-black text-white/86 transition active:scale-95"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="leading-3">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function StorekeeperCommandCenter({
  routeMode,
}: {
  routeMode: StorekeeperRouteMode;
}) {
  const { data: summaryData, isLoading: isLoadingSummary } = useSchoolQuery<any>("/api/inventory/summary");
  const [theme, setTheme] = useState<StorekeeperTheme>("dark");
  const [searchTerm, setSearchTerm] = useState("");
  const [notice, setNotice] = useState("Store desk ready for receiving, issuing, stock counts, and approvals.");
  const surface = useMemo(() => getSurfaceClasses(theme), [theme]);
  

  const searchResults = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return [];

    return storekeeperSearchRecords.filter((record) =>
      [record.label, record.detail, record.sectionId].some((value) => value.toLowerCase().includes(query)),
    );
  }, [searchTerm]);

  useEffect(() => {
    function handleDashboardAction(event: Event) {
      const detail = (event as CustomEvent<string>).detail;
      if (detail) {
        setNotice(detail);
      }
    }

    window.addEventListener("myshule-dashboard-action", handleDashboardAction);
    return () => window.removeEventListener("myshule-dashboard-action", handleDashboardAction);
  }, []);

  function openSearchRecord(record: StorekeeperSearchRecord) {
    setSearchTerm("");
    setNotice(`${record.label} focused in store records.`);

    if (typeof document !== "undefined") {
      const target = document.getElementById(record.sectionId);
      target?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    }
  }

  const activeKpis = kpis(summaryData, isLoadingSummary);

  return (
    <div className={cn("relative overflow-hidden rounded-[2rem] pb-24 lg:pb-6", surface.page)}>
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute left-1/4 top-0 h-72 w-72 rounded-full bg-[#FF7A1A]/12 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />
      </div>

      <div className="relative grid gap-5 p-3 md:p-5 xl:grid-cols-[260px_minmax(0,1fr)]">
        <div className="hidden xl:block">
          <CommandRail theme={theme} />
        </div>
        <main className="min-w-0 space-y-5">
          <Header
            theme={theme}
            routeMode={routeMode}
            searchTerm={searchTerm}
            searchResults={searchResults}
            onThemeChange={setTheme}
            onSearchResult={openSearchRecord}
            onSearchTermChange={setSearchTerm}
          />
          <div role="status" className={cn("rounded-2xl border px-4 py-3 text-sm font-black", surface.soft)}>
            {notice}
          </div>

          <section className={cn("rounded-3xl border p-5 md:p-6", surface.card)}>
            <SectionHeader
              eyebrow="Hero alert strip"
              title="Critical store intelligence"
              description="The dashboard starts with the risks that can stop school operations, waste money, or weaken accountability."
              action={<StatusChip icon={Radar} label="Live anomaly scan" tone="accent" />}
            />
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {heroAlerts.map((alert, index) => (
                <HeroAlert key={alert.id} alert={alert} featured={index === 0} theme={theme} />
              ))}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {activeKpis.map((item) => (
              <KpiCard key={item.id} item={item} theme={theme} />
            ))}
          </section>

          <QuickActionCenter routeMode={routeMode} theme={theme} />

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
            <div className="space-y-5">
              <section id="analytics" className={cn("rounded-3xl border p-5 md:p-6", surface.card)}>
                <SectionHeader
                  eyebrow="Decision charts"
                  title="Inventory analytics"
                  description="Consumption, distribution, department pressure, movement, waste, and procurement signals are summarized for quick decisions."
                />
                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  {analytics.map((chart) => (
                    <AnalyticsPanel key={chart.id} chart={chart} theme={theme} />
                  ))}
                </div>
              </section>

              <ActivityFeed data={summaryData} isLoading={isLoadingSummary} theme={theme} />
              <RequisitionPanel theme={theme} />
              <Heatmap theme={theme} />
              <SupplierPerformance theme={theme} />
              <WastePanel theme={theme} />
              <AuditPanel theme={theme} />
              <AiInsights theme={theme} />
            </div>

            <RightRail theme={theme} />
          </div>
        </main>
      </div>

      <MobileQuickActions routeMode={routeMode} />
      
    </div>
  );
}
