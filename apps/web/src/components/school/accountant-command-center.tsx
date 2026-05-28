"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  BadgeCheck,
  Banknote,
  BarChart3,
  Bell,
  BookOpenCheck,
  BriefcaseBusiness,
  Calculator,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  Download,
  FileBarChart2,
  FileCheck2,
  FileText,
  Filter,
  Gauge,
  Landmark,
  LockKeyhole,
  Moon,
  ReceiptText,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingDown,
  TrendingUp,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

import { toSchoolPath, type SchoolSection } from "@/lib/routing/experience-routes";

type AccountantRouteMode = "hosted" | "public";
type AccountantTheme = "dark" | "light";
type AccountantSection =
  | "ai-insights"
  | "communication"
  | "dashboard"
  | "finance"
  | "mpesa"
  | "procurement"
  | "reports"
  | "settings";
type Tone = "critical" | "warning" | "success" | "info" | "gold" | "neutral";

const accountantSearchRecords = [
  { id: "receipt-kbs-044", label: "Receipt KBS-044", detail: "Mrs. Wanjiku | Brian Otieno | KES 48,000", section: "finance" },
  { id: "mpesa-qex7", label: "M-Pesa QEX7ABC123", detail: "Pending confirmation | KES 24,500", section: "mpesa" },
  { id: "arrears-form-2", label: "Form 2 arrears list", detail: "42 learners above KES 10,000 balance", section: "finance" },
  { id: "supplier-kitchen", label: "Kitchen supplier invoice", detail: "Duplicate payment risk flagged", section: "procurement" },
  { id: "daily-collection", label: "Daily collection report", detail: "KSh collection summary and receipt evidence", section: "reports" },
] satisfies Array<{ id: string; label: string; detail: string; section: AccountantSection }>;

type AccountantSearchRecord = (typeof accountantSearchRecords)[number];

function announceAction(message: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("myshule-dashboard-action", { detail: message }));
  }
}

function getSectionLabel(section: AccountantSection) {
  return sidebarGroups.flatMap((group) => group.items).find((item) => item.href === section)?.label ?? "Finance section";
}

const toneStyles: Record<
  Tone,
  {
    border: string;
    bg: string;
    text: string;
    icon: string;
    chip: string;
    dot: string;
    shadow: string;
  }
> = {
  critical: {
    border: "border-rose-300/35",
    bg: "bg-rose-500/12",
    text: "text-rose-100",
    icon: "text-rose-200",
    chip: "border-rose-300/35 bg-rose-500/15 text-rose-100",
    dot: "bg-rose-400",
    shadow: "shadow-[0_0_38px_rgba(225,29,72,0.22)]",
  },
  warning: {
    border: "border-orange-300/35",
    bg: "bg-orange-400/13",
    text: "text-orange-100",
    icon: "text-orange-200",
    chip: "border-orange-300/35 bg-orange-400/15 text-orange-100",
    dot: "bg-orange-300",
    shadow: "shadow-[0_0_38px_rgba(255,122,26,0.2)]",
  },
  success: {
    border: "border-emerald-300/30",
    bg: "bg-emerald-400/12",
    text: "text-emerald-100",
    icon: "text-emerald-200",
    chip: "border-emerald-300/30 bg-emerald-400/15 text-emerald-100",
    dot: "bg-emerald-300",
    shadow: "shadow-[0_0_34px_rgba(16,185,129,0.17)]",
  },
  info: {
    border: "border-sky-300/30",
    bg: "bg-sky-400/12",
    text: "text-sky-100",
    icon: "text-sky-200",
    chip: "border-sky-300/30 bg-sky-400/15 text-sky-100",
    dot: "bg-sky-300",
    shadow: "shadow-[0_0_34px_rgba(14,165,233,0.18)]",
  },
  gold: {
    border: "border-[#FF7A1A]/42",
    bg: "bg-[#FF7A1A]/14",
    text: "text-[#FFE1C8]",
    icon: "text-[#FFB36F]",
    chip: "border-[#FF7A1A]/42 bg-[#FF7A1A]/16 text-[#FFE1C8]",
    dot: "bg-[#FF7A1A]",
    shadow: "shadow-[0_0_38px_rgba(255,122,26,0.2)]",
  },
  neutral: {
    border: "border-white/14",
    bg: "bg-white/8",
    text: "text-white/78",
    icon: "text-white/70",
    chip: "border-white/14 bg-white/10 text-white/80",
    dot: "bg-white/60",
    shadow: "shadow-[0_0_28px_rgba(7,29,73,0.18)]",
  },
};

const sidebarGroups: Array<{
  title: string;
  items: Array<{ label: string; icon: LucideIcon; href: string; active?: boolean }>;
}> = [
  {
    title: "Command",
    items: [
      { label: "Dashboard", icon: Gauge, href: "top", active: true },
      { label: "Finance Overview", icon: CircleDollarSign, href: "finance-overview" },
      { label: "AI Insights", icon: Sparkles, href: "ai-insights" },
      { label: "Settings", icon: Settings, href: "settings" },
    ],
  },
  {
    title: "Fee Management",
    items: [
      { label: "Fee Management", icon: WalletCards, href: "student-fees" },
      { label: "Invoices", icon: FileText, href: "transactions" },
      { label: "Receipts", icon: ReceiptText, href: "transactions" },
      { label: "Pending Balances", icon: WalletCards, href: "student-fees" },
      { label: "Arrears", icon: AlertTriangle, href: "student-fees" },
      { label: "Waivers", icon: FileCheck2, href: "fraud" },
      { label: "Discounts", icon: BadgeCheck, href: "fraud" },
      { label: "Installments", icon: ClipboardList, href: "student-fees" },
    ],
  },
  {
    title: "Banking",
    items: [
      { label: "Banking", icon: Landmark, href: "charts" },
      { label: "Bank Reconciliation", icon: Landmark, href: "charts" },
      { label: "Deposits", icon: CreditCard, href: "transactions" },
      { label: "Withdrawals", icon: Banknote, href: "alerts" },
      { label: "Statements", icon: FileBarChart2, href: "reports" },
    ],
  },
  {
    title: "Expenses",
    items: [
      { label: "Expenses", icon: BriefcaseBusiness, href: "procurement" },
      { label: "Procurement", icon: BriefcaseBusiness, href: "procurement" },
      { label: "Purchase Orders", icon: ClipboardCheck, href: "procurement" },
      { label: "Approvals", icon: CheckCircle2, href: "approvals" },
      { label: "Supplier Payments", icon: Banknote, href: "procurement" },
    ],
  },
  {
    title: "Payroll",
    items: [
      { label: "Payroll", icon: Calculator, href: "payroll" },
      { label: "Teacher Salaries", icon: Calculator, href: "payroll" },
      { label: "Staff Payroll", icon: WalletCards, href: "payroll" },
      { label: "Deductions", icon: TrendingDown, href: "payroll" },
      { label: "Payslips", icon: FileCheck2, href: "payroll" },
    ],
  },
  {
    title: "Audit & Reports",
    items: [
      { label: "Budgeting", icon: BarChart3, href: "budgets" },
      { label: "Department Budgets", icon: BarChart3, href: "budgets" },
      { label: "Overspending Alerts", icon: ShieldAlert, href: "budgets" },
      { label: "Forecasts", icon: TrendingUp, href: "forecast" },
      { label: "Audit & Compliance", icon: LockKeyhole, href: "audit" },
      { label: "Audit Trails", icon: LockKeyhole, href: "audit" },
      { label: "Financial Logs", icon: Activity, href: "audit" },
      { label: "Suspicious Activities", icon: AlertOctagon, href: "fraud" },
      { label: "Reports", icon: FileBarChart2, href: "reports" },
      { label: "Daily Reports", icon: FileBarChart2, href: "reports" },
      { label: "Monthly Reports", icon: FileBarChart2, href: "reports" },
      { label: "Term Reports", icon: FileBarChart2, href: "reports" },
      { label: "KRA Reports", icon: FileText, href: "reports" },
      { label: "Export Center", icon: Download, href: "reports" },
    ],
  },
];

const kpis = [
  {
    label: "Total Fees Collected Today",
    value: "KES 1.28M",
    helper: "M-PESA, bank, cash desk",
    trend: "+18.4%",
    tone: "success" as Tone,
    icon: CircleDollarSign,
    points: [35, 42, 48, 46, 62, 76, 88],
    featured: true,
  },
  {
    label: "Outstanding Fee Balance",
    value: "KES 8.74M",
    helper: "1,142 open balances",
    trend: "Risk high",
    tone: "critical" as Tone,
    icon: AlertTriangle,
    points: [88, 84, 82, 86, 78, 76, 72],
  },
  {
    label: "Expected Revenue This Month",
    value: "KES 21.6M",
    helper: "Term billing forecast",
    trend: "72% projected",
    tone: "info" as Tone,
    icon: TrendingUp,
    points: [42, 51, 55, 61, 70, 76, 82],
  },
  {
    label: "Payroll Due",
    value: "KES 5.92M",
    helper: "Due tomorrow 4:00 PM",
    trend: "Ready 91%",
    tone: "warning" as Tone,
    icon: Calculator,
    points: [70, 67, 68, 72, 69, 74, 78],
  },
  {
    label: "Pending Approvals",
    value: "19",
    helper: "7 procurement, 4 waivers",
    trend: "5 urgent",
    tone: "gold" as Tone,
    icon: ClipboardList,
    points: [18, 22, 17, 28, 24, 21, 19],
  },
  {
    label: "Procurement Spending",
    value: "KES 2.41M",
    helper: "This month committed",
    trend: "+12.1%",
    tone: "warning" as Tone,
    icon: BriefcaseBusiness,
    points: [31, 44, 39, 58, 64, 72, 76],
  },
  {
    label: "Cash at Bank",
    value: "KES 12.3M",
    helper: "Three reconciled accounts",
    trend: "98% matched",
    tone: "success" as Tone,
    icon: Landmark,
    points: [54, 58, 61, 63, 70, 68, 74],
  },
  {
    label: "Cashflow Health Score",
    value: "84%",
    helper: "Stable but arrears pressure",
    trend: "-4 pts",
    tone: "gold" as Tone,
    icon: Gauge,
    points: [90, 88, 86, 84, 83, 85, 84],
  },
];

const heroStats = [
  { label: "Projected income", value: "KES 24.8M", tone: "success" as Tone },
  { label: "Leakage exposure", value: "KES 612K", tone: "critical" as Tone },
  { label: "Verified collections", value: "96.8%", tone: "info" as Tone },
  { label: "Warning indicators", value: "11", tone: "warning" as Tone },
];

const alerts = [
  {
    title: "KES 430,000 outstanding in Form 4",
    detail: "High exam-term arrears concentration. 17 learners need finance clearance review.",
    tone: "critical" as Tone,
  },
  {
    title: "Two procurement requests awaiting approval",
    detail: "Kitchen staples and lab safety supplies exceed normal weekly spend thresholds.",
    tone: "warning" as Tone,
  },
  {
    title: "Salary processing due tomorrow",
    detail: "Payroll has 3 deduction exceptions and 1 unverified casual worker payment.",
    tone: "gold" as Tone,
  },
  {
    title: "Possible duplicate receipt detected",
    detail: "Two receipt references share amount, parent phone, and time window.",
    tone: "critical" as Tone,
  },
  {
    title: "Supplier invoice mismatch found",
    detail: "Nyanza Foods invoice is KES 38,400 above approved purchase order.",
    tone: "warning" as Tone,
  },
  {
    title: "Cash withdrawal exceeds daily threshold",
    detail: "KES 210,000 withdrawal requires principal and accountant evidence pack.",
    tone: "critical" as Tone,
  },
];

const aiInsights = [
  {
    title: "Fee collection dropped 14% compared to last month.",
    detail: "Drop is concentrated in Forms 3 and 4 boarding streams after midterm.",
    confidence: "92% confidence",
    action: "Generate arrears campaign",
    tone: "critical" as Tone,
  },
  {
    title: "Three departments exceeded budget allocation.",
    detail: "Kitchen, transport, and boarding supplies are above approved burn rate.",
    confidence: "87% confidence",
    action: "Freeze nonessential spend",
    tone: "warning" as Tone,
  },
  {
    title: "17 students may be attending classes despite overdue balances.",
    detail: "Attendance logs show active class presence with blocked finance clearance.",
    confidence: "84% confidence",
    action: "Open clearance list",
    tone: "gold" as Tone,
  },
  {
    title: "Possible duplicate supplier payment detected.",
    detail: "Two payments to Lake Lab Supplies match invoice number and amount.",
    confidence: "79% confidence",
    action: "Start audit hold",
    tone: "critical" as Tone,
  },
  {
    title: "Transport expenses increased unusually this week.",
    detail: "Fuel and route allowances rose 22% without matching trip count.",
    confidence: "81% confidence",
    action: "Review route logs",
    tone: "info" as Tone,
  },
  {
    title: "Hostel food expenditure exceeds projected consumption.",
    detail: "Spend is 16% above expected for recorded boarding occupancy.",
    confidence: "86% confidence",
    action: "Compare inventory issues",
    tone: "warning" as Tone,
  },
];

const charts = [
  { title: "Fee Collection Trend", label: "Daily receipts", tone: "success" as Tone, values: [32, 44, 41, 58, 63, 77, 86] },
  { title: "Revenue vs Expenses", label: "Operating spread", tone: "info" as Tone, values: [62, 58, 66, 71, 64, 73, 80] },
  { title: "Department Spending", label: "Budget consumption", tone: "warning" as Tone, values: [78, 52, 46, 69, 88, 59] },
  { title: "Payroll Breakdown", label: "Salary pressure", tone: "gold" as Tone, values: [55, 64, 72, 48, 36, 28] },
  { title: "Bank Reconciliation Status", label: "Matched deposits", tone: "success" as Tone, values: [74, 78, 80, 86, 90, 96] },
  { title: "Student Fee Payment Behavior", label: "Payment risk segments", tone: "critical" as Tone, values: [41, 58, 72, 49, 35, 27] },
  { title: "Procurement Costs", label: "Supplier burn rate", tone: "warning" as Tone, values: [29, 44, 51, 67, 72, 81] },
  { title: "Financial Risk Heatmap", label: "Leakage exposure", tone: "critical" as Tone, values: [92, 74, 66, 39, 51, 84] },
];

const transactions = [
  {
    receipt: "RCPT-28491",
    parent: "Mary Wanjiku",
    student: "Brian Otieno",
    method: "M-PESA",
    amount: "KES 42,000",
    time: "08:42",
    recordedBy: "Auto match",
    status: "Verified",
    tone: "success" as Tone,
  },
  {
    receipt: "RCPT-28488",
    parent: "Peter Mwangi",
    student: "Faith Mwangi",
    method: "Bank deposit",
    amount: "KES 28,500",
    time: "08:19",
    recordedBy: "Accounts desk",
    status: "Needs statement",
    tone: "warning" as Tone,
  },
  {
    receipt: "RCPT-28477",
    parent: "Amina Hassan",
    student: "Said Hassan",
    method: "Cash",
    amount: "KES 15,000",
    time: "07:58",
    recordedBy: "Cash desk",
    status: "Manual review",
    tone: "critical" as Tone,
  },
  {
    receipt: "RCPT-28471",
    parent: "Daniel Ochieng",
    student: "Kevin Ochieng",
    method: "M-PESA",
    amount: "KES 61,200",
    time: "07:41",
    recordedBy: "Auto match",
    status: "Duplicate watch",
    tone: "critical" as Tone,
  },
];

const approvalQueue: Array<[string, string, string, Tone]> = [
  ["Waiver request", "KES 74,000", "Principal approval required", "critical" as Tone],
  ["Supplier payment", "KES 188,400", "PO mismatch found", "warning" as Tone],
  ["Payroll exception", "KES 31,500", "Deduction missing", "gold" as Tone],
  ["Petty cash top-up", "KES 20,000", "Evidence attached", "info" as Tone],
];

const activityFeed: Array<[string, string, string, Tone]> = [
  ["M-PESA receipt matched", "RCPT-28491 posted to Brian Otieno ledger.", "2 min ago", "success" as Tone],
  ["Manual receipt opened", "Cash desk recorded KES 15,000 pending verification.", "9 min ago", "warning" as Tone],
  ["Supplier invoice blocked", "Duplicate invoice number detected for Lake Lab Supplies.", "21 min ago", "critical" as Tone],
  ["Bank statement imported", "Co-op account reconciled 96% of today's deposits.", "46 min ago", "success" as Tone],
  ["Waiver approval requested", "KES 74,000 remission sent to principal review.", "1 hr ago", "gold" as Tone],
];

const fraudSignals: Array<[string, string, string, Tone]> = [
  ["Duplicate receipts", "2", "Same parent phone, amount, and time window", "critical" as Tone],
  ["Unauthorized waivers", "4", "Discounts not tied to approved policy", "warning" as Tone],
  ["Ghost worker risk", "1", "Casual payroll entry lacks attendance evidence", "critical" as Tone],
  ["Hidden cash transactions", "3", "Cash desk receipts missing bank deposit links", "gold" as Tone],
];

const studentFeeInsights: Array<[string, string, string, Tone]> = [
  ["Form 4 arrears", "KES 430K", "17 learners above exam-clearance risk", "critical" as Tone],
  ["Installment adherence", "76%", "Families paying within agreed windows", "success" as Tone],
  ["Fee leakage watch", "KES 122K", "Claims paid but no matched record exists", "warning" as Tone],
  ["Clearance ready", "842", "Students financially clear for exams", "success" as Tone],
];

const procurementRows: Array<[string, string, string, Tone]> = [
  ["Nyanza Foods", "KES 384K", "Invoice above PO by KES 38,400", "critical" as Tone],
  ["Lake Lab Supplies", "KES 144K", "Duplicate supplier payment watch", "critical" as Tone],
  ["Kisumu Stationers", "KES 92K", "Within budget, pending delivery note", "info" as Tone],
  ["Swift Transport", "KES 116K", "Fuel spend rose without matching trips", "warning" as Tone],
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function buildHref(section: AccountantSection, routeMode: AccountantRouteMode) {
  if (routeMode === "public") {
    return section === "dashboard" ? "/school/accountant" : `/school/accountant/${section}`;
  }

  return toSchoolPath(section as SchoolSection);
}

function getSurface(theme: AccountantTheme) {
  return {
    page:
      theme === "dark"
        ? "bg-[#F3F4F6] text-white"
        : "bg-[radial-gradient(circle_at_top_left,rgba(255,122,26,0.16),transparent_30%),linear-gradient(135deg,#EEF4FF_0%,#E7ECF8_48%,#F8FBFF_100%)] text-[#071D49]",
    card:
      theme === "dark"
        ? "border-[#C8D5EA]/40 bg-[#071D49] shadow-[0_24px_70px_rgba(7,29,73,0.22)] backdrop-blur-xl"
        : "border-[#C8D5EA] bg-white/84 shadow-[0_22px_62px_rgba(7,29,73,0.14)] backdrop-blur-xl",
    soft: theme === "dark" ? "border-white/10 bg-[#0F2345]/72" : "border-[#D9E3F2] bg-white/72",
    input:
      theme === "dark"
        ? "border-white/12 bg-[#081A3D]/68 text-white placeholder:text-white/48"
        : "border-[#C8D5EA] bg-white/86 text-[#071D49] placeholder:text-[#637393]",
    muted: theme === "dark" ? "text-white/66" : "text-[#516488]",
    divider: theme === "dark" ? "border-white/10" : "border-[#D9E3F2]",
  };
}

function Sparkline({ points, tone }: { points: number[]; tone: Tone }) {
  const color =
    tone === "critical"
      ? "#FB7185"
      : tone === "warning"
        ? "#FB923C"
        : tone === "success"
          ? "#34D399"
          : tone === "gold"
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
    <svg aria-hidden="true" viewBox="0 0 100 48" preserveAspectRatio="none" className="h-12 w-full overflow-visible">
      <path d={`${path} L 100 48 L 0 48 Z`} fill={color} opacity="0.14" />
      <path d={path} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.2" />
    </svg>
  );
}

function BarChart({ values, tone }: { values: number[]; tone: Tone }) {
  const max = Math.max(...values);
  const color =
    tone === "critical"
      ? "bg-rose-400"
      : tone === "warning"
        ? "bg-orange-300"
        : tone === "success"
          ? "bg-emerald-300"
          : tone === "gold"
            ? "bg-[#FF7A1A]"
            : "bg-sky-300";

  return (
    <div className="flex h-36 items-end gap-2">
      {values.map((value, index) => (
        <div key={`${value}-${index}`} className="flex flex-1 items-end rounded-full bg-white/10">
          <div className={cn("w-full rounded-full", color)} style={{ height: `${Math.max(12, (value / max) * 100)}%` }} />
        </div>
      ))}
    </div>
  );
}

function StatusChip({ icon: Icon, label, tone }: { icon: LucideIcon; label: string; tone: Tone }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black", toneStyles[tone].chip)}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </span>
  );
}

function IconBox({ icon: Icon, tone }: { icon: LucideIcon; tone: Tone }) {
  return (
    <span className={cn("grid h-11 w-11 place-items-center rounded-2xl border", toneStyles[tone].border, toneStyles[tone].bg, toneStyles[tone].icon)}>
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
  );
}

function SectionTitle({
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
        {eyebrow ? <p className="text-xs font-black uppercase tracking-[0.24em] text-[#FFB36F]">{eyebrow}</p> : null}
        <h2 className="mt-2 text-2xl font-black tracking-normal md:text-3xl">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-current/66">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function Sidebar({ theme }: { theme: AccountantTheme }) {
  const surface = getSurface(theme);

  return (
    <aside className={cn("h-full rounded-3xl border p-3 xl:sticky xl:top-6", surface.card)} aria-label="Accountant dashboard navigation">
      <div className="px-3 py-2">
        <p className="text-xs font-black uppercase text-[#FFB36F]">Finance control</p>
        <h2 className="mt-2 text-xl font-black">Accountant</h2>
        <p className={cn("mt-2 text-sm leading-5", surface.muted)}>
          One command sidebar for fee records, banking, procurement, payroll, audit, reports, and AI investigations.
        </p>
      </div>
      <nav className="mt-4 max-h-[calc(100vh-160px)] space-y-5 overflow-auto pr-1">
        {sidebarGroups.map((group) => (
          <div key={group.title}>
            <p className={cn("px-3 text-[11px] font-black uppercase", surface.muted)}>{group.title}</p>
            <div className="mt-2 grid gap-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={`${group.title}-${item.label}`}
                    href={item.href}
                    className={cn(
                      "flex min-h-10 items-center gap-3 rounded-2xl px-3 py-2 text-sm font-bold transition hover:-translate-y-0.5",
                      item.active
                        ? "border border-[#FF7A1A]/45 bg-[#FF7A1A]/16 text-[#FFE1C8]"
                        : theme === "dark"
                          ? "text-white/72 hover:bg-white/10 hover:text-white"
                          : "text-[#516488] hover:bg-[#071D49]/7 hover:text-[#071D49]",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

function TopNav({
  theme,
  routeMode,
  searchTerm,
  searchResults,
  onThemeChange,
  onSearchTermChange,
  onSearchResult,
}: {
  theme: AccountantTheme;
  routeMode: AccountantRouteMode;
  searchTerm: string;
  searchResults: typeof accountantSearchRecords;
  onThemeChange: (theme: AccountantTheme) => void;
  onSearchTermChange: (value: string) => void;
  onSearchResult: (record: AccountantSearchRecord) => void;
}) {
  const surface = getSurface(theme);

  return (
    <header id="top" className={cn("rounded-3xl border p-4 md:p-5", surface.card)}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-3xl bg-[#FF7A1A] text-lg font-black text-white shadow-[0_18px_48px_rgba(255,122,26,0.28)]">
            MS
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-[#FFB36F]">MyShule finance operations</p>
            <h1 className="mt-1 max-w-3xl text-3xl font-black leading-tight md:text-4xl">Financial Stability Requires Total Visibility</h1>
            <p className={cn("mt-2 max-w-2xl text-sm leading-6", surface.muted)}>
              Nothing leaves this school financially without accountability.
            </p>
          </div>
        </div>
        <div className="grid gap-3 lg:min-w-[540px]">
          <div className="relative">
            <Search className={cn("pointer-events-none absolute left-4 top-3.5 h-5 w-5", surface.muted)} aria-hidden="true" />
            <input
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && searchResults[0]) {
                  event.preventDefault();
                  onSearchResult(searchResults[0]);
                }
              }}
              className={cn("h-12 w-full rounded-2xl border pl-12 pr-4 text-sm font-semibold outline-none transition focus:border-[#FF7A1A]/70 focus:ring-4 focus:ring-[#FF7A1A]/15", surface.input)}
              placeholder="Search receipts, parents, students, invoices, suppliers, or bank refs"
              aria-label="Search receipts, parents, students, invoices, suppliers, or bank references"
            />
            {searchTerm.trim() ? (
              <div className={cn("absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-2xl border p-2 shadow-xl", surface.card)}>
                {searchResults.length > 0 ? (
                  searchResults.map((record) => (
                    <button key={record.id} type="button" onClick={() => onSearchResult(record)} className={cn("w-full rounded-xl px-3 py-2 text-left transition hover:bg-white/10", surface.soft)}>
                      <span className="block text-sm font-black">{record.label}</span>
                      <span className={cn("mt-0.5 block text-xs font-semibold", surface.muted)}>{record.detail}</span>
                    </button>
                  ))
                ) : (
                  <p className={cn("rounded-xl px-3 py-3 text-sm font-semibold", surface.muted)}>No finance records found.</p>
                )}
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip icon={Bell} label="11 risk alerts" tone="critical" />
            <StatusChip icon={ClipboardList} label="19 approvals" tone="gold" />
            <StatusChip icon={ShieldCheck} label="Audit locked" tone="success" />
            <button
              type="button"
              onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}
              className={cn("inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-black transition hover:-translate-y-0.5", surface.soft)}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
              {theme === "dark" ? "Light" : "Dark"}
            </button>
            <Link href={buildHref("settings", routeMode)} className={cn("inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-black transition hover:-translate-y-0.5", surface.soft)}>
              <Calculator className="h-4 w-4" aria-hidden="true" />
              Accountant
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function Hero({ theme }: { theme: AccountantTheme }) {
  const surface = getSurface(theme);
  return (
    <section className={cn("rounded-3xl border p-5 md:p-6", surface.card)}>
      <div className="grid gap-6 xl:grid-cols-[1fr_420px] xl:items-center">
        <div>
          <StatusChip icon={LockKeyhole} label="Financial command room" tone="gold" />
          <h2 className="mt-5 max-w-4xl text-3xl font-black leading-tight md:text-4xl">
            Detect fee leakages before they become losses.
          </h2>
          <p className={cn("mt-5 max-w-3xl text-base leading-8", surface.muted)}>
            Detect fee leakages, monitor procurement abuse, track unpaid balances, and protect the school from silent financial collapse. Parents claiming paid-but-missing receipts, duplicate supplier payments, unauthorized waivers, payroll inflation, ghost workers, and hidden cash movements surface here before they become losses.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {heroStats.map((stat) => (
              <div key={stat.label} className={cn("rounded-2xl border p-4", surface.soft)}>
                <p className={cn("text-xs font-black uppercase tracking-[0.16em]", surface.muted)}>{stat.label}</p>
                <p className="mt-2 text-2xl font-black">{stat.value}</p>
                <span className={cn("mt-3 inline-block h-2 w-16 rounded-full", toneStyles[stat.tone].dot)} />
              </div>
            ))}
          </div>
        </div>
        <div className={cn("rounded-3xl border p-5", surface.soft)}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black">Animated revenue graph</p>
              <p className={cn("mt-1 text-sm", surface.muted)}>Collections against projected income</p>
            </div>
            <StatusChip icon={TrendingUp} label="Live" tone="success" />
          </div>
          <div className="mt-6">
            <Sparkline points={[32, 41, 44, 58, 61, 76, 88, 84, 96]} tone="success" />
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              ["Collected", "KES 14.8M", "success" as Tone],
              ["Projected", "KES 24.8M", "info" as Tone],
              ["Leakage watch", "KES 612K", "critical" as Tone],
            ].map(([label, value, tone]) => (
              <div key={label} className={cn("rounded-2xl border p-3", toneStyles[tone as Tone].border, toneStyles[tone as Tone].bg)}>
                <p className="text-[11px] font-black uppercase tracking-[0.12em] opacity-70">{label}</p>
                <p className="mt-2 text-sm font-black">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function KpiCard({ item, theme }: { item: (typeof kpis)[number]; theme: AccountantTheme }) {
  const surface = getSurface(theme);
  const Icon = item.icon;
  return (
    <motion.article
      initial={false}
      whileHover={{ y: -4 }}
      className={cn(
        "rounded-3xl border p-5 transition",
        surface.card,
        item.featured ? "border-[#FF7A1A]/35 shadow-[0_22px_64px_rgba(255,122,26,0.16)] md:col-span-2 xl:col-span-2" : "",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <IconBox icon={Icon} tone={item.tone} />
        <StatusChip icon={item.trend.startsWith("+") ? TrendingUp : Gauge} label={item.trend} tone={item.tone} />
      </div>
      <p className={cn("mt-5 text-xs font-black uppercase tracking-[0.2em]", surface.muted)}>{item.label}</p>
      <p className="mt-2 text-3xl font-black tracking-normal md:text-4xl">{item.value}</p>
      <p className={cn("mt-2 min-h-10 text-sm leading-5", surface.muted)}>{item.helper}</p>
      <div className="mt-4">
        <Sparkline points={item.points} tone={item.tone} />
      </div>
    </motion.article>
  );
}

function AlertCenter({ theme }: { theme: AccountantTheme }) {
  const surface = getSurface(theme);
  return (
    <section id="alerts" className={cn("rounded-3xl border p-5 md:p-6", surface.card)}>
      <SectionTitle
        eyebrow="Financial fear psychology"
        title="Financial alerts center"
        description="The riskiest money movements are visible first: missing fees, duplicate receipts, supplier mismatches, payroll pressure, and threshold breaches."
        action={<StatusChip icon={AlertOctagon} label="Fraud radar active" tone="critical" />}
      />
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {alerts.map((alert) => (
          <motion.article
            key={alert.title}
            initial={false}
            whileHover={{ y: -4 }}
            className={cn("rounded-3xl border p-5", surface.soft, toneStyles[alert.tone].border, toneStyles[alert.tone].shadow)}
          >
            <div className="flex items-center justify-between gap-3">
              <IconBox icon={alert.tone === "critical" ? AlertOctagon : AlertTriangle} tone={alert.tone} />
              <span className={cn("h-3 w-3 rounded-full", toneStyles[alert.tone].dot)} />
            </div>
            <h3 className="mt-5 text-xl font-black">{alert.title}</h3>
            <p className={cn("mt-3 text-sm leading-6", surface.muted)}>{alert.detail}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

function InsightPanel({ theme }: { theme: AccountantTheme }) {
  const surface = getSurface(theme);
  return (
    <section id="ai-insights" className={cn("rounded-3xl border p-5 md:p-6", surface.card)}>
      <SectionTitle
        eyebrow="AI risk engine"
        title="AI financial intelligence"
        description="Predictive recommendations turn silent financial pressure into visible action queues."
        action={<StatusChip icon={Sparkles} label="Recommendations live" tone="gold" />}
      />
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {aiInsights.map((insight) => (
          <article key={insight.title} className={cn("rounded-3xl border p-5", surface.soft, toneStyles[insight.tone].border)}>
            <div className="flex items-start justify-between gap-3">
              <IconBox icon={Sparkles} tone={insight.tone} />
              <StatusChip icon={Gauge} label={insight.confidence} tone={insight.tone} />
            </div>
            <h3 className="mt-5 text-xl font-black">{insight.title}</h3>
            <p className={cn("mt-3 text-sm leading-6", surface.muted)}>{insight.detail}</p>
            <button type="button" onClick={() => announceAction(`${insight.action} opened from finance intelligence.`)} className="mt-5 rounded-2xl border border-[#FF7A1A]/40 bg-[#FF7A1A]/14 px-4 py-2 text-sm font-black text-[#FFE1C8]">
              {insight.action}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function Charts({ theme }: { theme: AccountantTheme }) {
  const surface = getSurface(theme);
  return (
    <section id="charts" className={cn("rounded-3xl border p-5 md:p-6", surface.card)}>
      <SectionTitle
        eyebrow="Analytics"
        title="Finance overview"
        description="Fee collection, revenue, expenses, payroll, reconciliation, payment behavior, procurement costs, and risk heat."
        action={<StatusChip icon={BarChart3} label="Interactive filters" tone="info" />}
      />
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {charts.map((chart) => (
          <article key={chart.title} className={cn("rounded-3xl border p-5", surface.soft)}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-black">{chart.title}</h3>
                <p className={cn("mt-1 text-sm", surface.muted)}>{chart.label}</p>
              </div>
              <StatusChip icon={Activity} label="Live" tone={chart.tone} />
            </div>
            <div className="mt-5">
              <BarChart values={chart.values} tone={chart.tone} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Transactions({ theme }: { theme: AccountantTheme }) {
  const surface = getSurface(theme);
  return (
    <section id="transactions" className={cn("rounded-3xl border p-5 md:p-6", surface.card)}>
      <SectionTitle
        eyebrow="Receipt control"
        title="Recent transactions"
        description="Searchable receipt register with parent, learner, method, timestamp, recorder, verification status, and fraud indicators."
        action={
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => announceAction("Transaction filters opened.")} className={cn("inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-black", surface.soft)}>
              <Filter className="h-4 w-4" aria-hidden="true" />
              Filters
            </button>
            <button type="button" onClick={() => announceAction("Recent transactions exported for finance review.")} className="inline-flex items-center gap-2 rounded-2xl bg-[#FF7A1A] px-4 py-2 text-sm font-black text-white shadow-[0_16px_34px_rgba(255,122,26,0.24)]">
              <Download className="h-4 w-4" aria-hidden="true" />
              Export
            </button>
          </div>
        }
      />
      <div className="mt-6 overflow-hidden rounded-3xl border border-white/10">
        <div className={cn("hidden grid-cols-[0.9fr_1fr_1fr_0.8fr_0.8fr_0.7fr_1fr_1fr] gap-3 border-b px-4 py-3 text-xs font-black uppercase tracking-[0.14em] md:grid", surface.divider, surface.muted)}>
          <span>Receipt number</span>
          <span>Parent name</span>
          <span>Student</span>
          <span>Method</span>
          <span>Amount</span>
          <span>Time</span>
          <span>Recorded by</span>
          <span>Verification status</span>
        </div>
        <div className="divide-y divide-white/10">
          {transactions.map((row) => (
            <article key={row.receipt} className="grid gap-3 px-4 py-4 md:grid-cols-[0.9fr_1fr_1fr_0.8fr_0.8fr_0.7fr_1fr_1fr] md:items-center">
              <p className="font-black">{row.receipt}</p>
              <p className={surface.muted}>{row.parent}</p>
              <p className="font-bold">{row.student}</p>
              <p className={surface.muted}>{row.method}</p>
              <p className="font-black">{row.amount}</p>
              <p className={surface.muted}>{row.time}</p>
              <p className={surface.muted}>{row.recordedBy}</p>
              <StatusChip icon={row.tone === "success" ? CheckCircle2 : AlertTriangle} label={row.status} tone={row.tone} />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function SignalGrid({
  id,
  title,
  description,
  rows,
  icon,
  theme,
}: {
  id: string;
  title: string;
  description: string;
  rows: Array<[string, string, string, Tone]>;
  icon: LucideIcon;
  theme: AccountantTheme;
}) {
  const surface = getSurface(theme);
  return (
    <section id={id} className={cn("rounded-3xl border p-5", surface.card)}>
      <SectionTitle eyebrow="Control signal" title={title} description={description} />
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {rows.map(([label, value, detail, tone]) => (
          <article key={label} className={cn("rounded-3xl border p-4", surface.soft, toneStyles[tone].border)}>
            <div className="flex items-center justify-between gap-3">
              <IconBox icon={icon} tone={tone} />
              <StatusChip icon={Gauge} label={label} tone={tone} />
            </div>
            <p className="mt-4 text-3xl font-black">{value}</p>
            <p className={cn("mt-2 text-sm leading-5", surface.muted)}>{detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ApprovalAndActivity({ theme }: { theme: AccountantTheme }) {
  const surface = getSurface(theme);
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section id="approvals" className={cn("rounded-3xl border p-5", surface.card)}>
        <SectionTitle eyebrow="Approval queues" title="Approval queues" description="Every release of money waits on evidence, authority, and reconciliation status." />
        <div className="mt-6 space-y-3">
          {approvalQueue.map(([label, value, detail, tone]) => (
            <article key={label} className={cn("rounded-3xl border p-4", surface.soft)}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-black">{label}</p>
                  <p className={cn("mt-1 text-sm", surface.muted)}>{detail}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-black">{value}</span>
                  <StatusChip icon={ClipboardCheck} label="Review" tone={tone as Tone} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section id="audit" className={cn("rounded-3xl border p-5", surface.card)}>
        <SectionTitle eyebrow="Real-time feed" title="Real-time activity feed" description="Receipts, imports, blocks, approvals, and evidence packs appear as they happen." />
        <div className="mt-6 space-y-3">
          {activityFeed.map(([label, detail, time, tone]) => (
            <article key={label} className={cn("rounded-3xl border p-4", surface.soft)}>
              <div className="flex items-start gap-3">
                <span className={cn("mt-1 h-3 w-3 rounded-full", toneStyles[tone as Tone].dot)} />
                <div className="min-w-0">
                  <p className="font-black">{label}</p>
                  <p className={cn("mt-1 text-sm leading-5", surface.muted)}>{detail}</p>
                  <p className="mt-2 text-xs font-black uppercase tracking-[0.14em] text-[#FFB36F]">{time}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function ForecastRail({ theme }: { theme: AccountantTheme }) {
  const surface = getSurface(theme);
  return (
    <aside className="space-y-5 xl:sticky xl:top-6">
      <section id="forecast" className={cn("rounded-3xl border p-5", surface.card)}>
        <h2 className="text-xl font-black">Revenue forecasting</h2>
        <p className={cn("mt-2 text-sm leading-6", surface.muted)}>Cashflow remains stable only if arrears recovery improves before payroll closes.</p>
        <div className="mt-5 space-y-4">
          {[
            ["Collection target", 74, "success" as Tone],
            ["Expense pressure", 62, "warning" as Tone],
            ["Leakage risk", 38, "critical" as Tone],
          ].map(([label, value, tone]) => (
            <div key={label}>
              <div className="flex items-center justify-between text-sm font-black">
                <span>{label}</span>
                <span>{value}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className={cn(
                    "h-full rounded-full",
                    tone === "success" ? "bg-emerald-300" : tone === "warning" ? "bg-orange-300" : "bg-rose-400",
                  )}
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
      <section id="reports" className={cn("rounded-3xl border p-5", surface.card)}>
        <h2 className="text-xl font-black">Reports</h2>
        <p className={cn("mt-2 text-sm leading-6", surface.muted)}>Daily, monthly, term, KRA, and export packs are ready for evidence-based review.</p>
        <div className="mt-5 grid gap-2">
          {["Daily Reports", "Monthly Reports", "Term Reports", "KRA Reports", "Export Center"].map((label) => (
            <button key={label} type="button" onClick={() => announceAction(`${label} opened for finance export.`)} className={cn("rounded-2xl border px-4 py-3 text-left text-sm font-black", surface.soft)}>
              {label}
            </button>
          ))}
        </div>
      </section>
      <section id="settings" className={cn("rounded-3xl border p-5", surface.card)}>
        <h2 className="text-xl font-black">Trust controls</h2>
        <p className={cn("mt-2 text-sm leading-6", surface.muted)}>Role permissions, device awareness, export controls, and audit locks protect the finance office.</p>
        <div className="mt-5 grid gap-2">
          <StatusChip icon={LockKeyhole} label="Device verified" tone="success" />
          <StatusChip icon={ShieldCheck} label="Exports watermarked" tone="info" />
          <StatusChip icon={AlertTriangle} label="Manual receipts watched" tone="warning" />
        </div>
      </section>
    </aside>
  );
}

function MobileActions({ routeMode }: { routeMode: AccountantRouteMode }) {
  const actions: Array<{ label: string; icon: LucideIcon; section: AccountantSection }> = [
    { label: "Receipt", icon: ReceiptText, section: "finance" },
    { label: "Reconcile", icon: Landmark, section: "mpesa" },
    { label: "Alerts", icon: AlertTriangle, section: "dashboard" },
    { label: "Reports", icon: FileBarChart2, section: "reports" },
    { label: "AI", icon: Sparkles, section: "ai-insights" },
  ];

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#071D49]/92 px-2 py-2 shadow-[0_-18px_50px_rgba(0,0,0,0.3)] backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-5 gap-1">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.label} href={buildHref(action.section, routeMode)} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-center text-[10px] font-black text-white/86 active:scale-95">
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{action.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function AccountantCommandCenter({ routeMode }: { routeMode: AccountantRouteMode }) {
  const [theme, setTheme] = useState<AccountantTheme>("dark");
  const [searchTerm, setSearchTerm] = useState("");
  const [notice, setNotice] = useState("Ready for finance desk operations.");
  const surface = useMemo(() => getSurface(theme), [theme]);
  const searchResults = searchTerm.trim()
    ? accountantSearchRecords.filter((record) => `${record.label} ${record.detail}`.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];

  useEffect(() => {
    function handleDashboardAction(event: Event) {
      const message = (event as CustomEvent<string>).detail;
      if (message) {
        setNotice(message);
      }
    }

    window.addEventListener("myshule-dashboard-action", handleDashboardAction);
    return () => window.removeEventListener("myshule-dashboard-action", handleDashboardAction);
  }, []);

  function openSearchRecord(record: AccountantSearchRecord) {
    setSearchTerm("");
    setNotice(`${record.label} opened in ${getSectionLabel(record.section)}.`);
    if (typeof document !== "undefined") {
      const target = document.getElementById(record.section === "finance" ? "student-fees" : record.section);
      target?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <div className={cn("relative min-h-screen overflow-hidden pb-24 lg:pb-6", surface.page)}>
      <div className="relative grid gap-5 p-3 md:p-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="hidden xl:block">
          <Sidebar theme={theme} />
        </div>
        <main className="min-w-0 space-y-5">
          <TopNav
            theme={theme}
            routeMode={routeMode}
            searchTerm={searchTerm}
            searchResults={searchResults}
            onThemeChange={setTheme}
            onSearchTermChange={setSearchTerm}
            onSearchResult={openSearchRecord}
          />
          <div role="status" className={cn("rounded-2xl border px-4 py-3 text-sm font-black", surface.soft)}>
            {notice}
          </div>
          <Hero theme={theme} />
          <section id="finance-overview" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {kpis.map((item) => (
              <KpiCard key={item.label} item={item} theme={theme} />
            ))}
          </section>
          <AlertCenter theme={theme} />
          <InsightPanel theme={theme} />
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
            <div className="space-y-5">
              <Charts theme={theme} />
              <Transactions theme={theme} />
              <SignalGrid id="fraud" title="Fraud detection indicators" description="Duplicate receipts, unauthorized waivers, ghost worker risk, and hidden cash are monitored continuously." rows={fraudSignals} icon={ShieldAlert} theme={theme} />
              <SignalGrid id="student-fees" title="Student fee insights" description="Balances, arrears, installment behavior, and exam clearance pressure are visible by student segment." rows={studentFeeInsights} icon={BookOpenCheck} theme={theme} />
              <SignalGrid id="procurement" title="Procurement monitoring" description="Supplier overbilling, duplicate payments, fuel pressure, and delivery mismatches stay tied to finance controls." rows={procurementRows} icon={BriefcaseBusiness} theme={theme} />
              <SignalGrid id="payroll" title="Payroll pressure" description="Teacher salaries, staff payroll, deductions, payslips, casual worker checks, and ghost-worker exposure." rows={[
                ["Teacher salaries", "KES 4.8M", "Main payroll batch ready for final approval", "success" as Tone],
                ["Staff payroll", "KES 1.1M", "Support staff and casual wages under review", "gold" as Tone],
                ["Deductions", "KES 284K", "Three deduction mismatches require correction", "warning" as Tone],
                ["Ghost worker watch", "1", "Casual payment lacks attendance evidence", "critical" as Tone],
              ]} icon={Calculator} theme={theme} />
              <SignalGrid id="budgets" title="Budgeting controls" description="Department budgets, overspending alerts, forecasts, and spend freezes protect term sustainability." rows={[
                ["Kitchen overrun", "112%", "Food expenditure above projected consumption", "critical" as Tone],
                ["Transport fuel", "108%", "Fuel spend grew faster than route activity", "warning" as Tone],
                ["Academics budget", "64%", "Within approved term allocation", "success" as Tone],
                ["Boarding supplies", "94%", "Close to threshold, needs watch", "gold" as Tone],
              ]} icon={BarChart3} theme={theme} />
              <ApprovalAndActivity theme={theme} />
            </div>
            <ForecastRail theme={theme} />
          </div>
        </main>
      </div>
      <MobileActions routeMode={routeMode} />
    </div>
  );
}
