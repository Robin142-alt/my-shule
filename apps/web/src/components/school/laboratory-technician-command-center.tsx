"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Barcode,
  Beaker,
  Bell,
  BrainCircuit,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FileBarChart2,
  FireExtinguisher,
  FlaskConical,
  Gauge,
  Home,
  LockKeyhole,
  Microscope,
  PackageCheck,
  Plus,
  QrCode,
  RadioTower,
  ScanLine,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  TestTube,
  TestTubes,
  Thermometer,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import {
  getCurrentSchoolId,
  publishSchoolOperationalEvent,
} from "@/lib/school/school-operational-store";

type LaboratoryRouteMode = "hosted" | "public";
type Tone = "safe" | "info" | "warning" | "danger" | "cyan" | "neutral";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  group: string;
  active?: boolean;
};

type Kpi = {
  label: string;
  value: string;
  detail: string;
  sub: string;
  tone: Tone;
  icon: LucideIcon;
  points: number[];
};

type SessionItem = {
  time: string;
  className: string;
  teacher: string;
  lab: string;
  status: "Ready" | "Pending Setup" | "Missing Equipment" | "Safety Issue" | "Cancelled";
  progress: number;
  chemicals: string;
  apparatus: string;
  size: string;
  tone: Tone;
};

type ChemicalItem = {
  name: string;
  quantity: string;
  expiry: string;
  hazard: "Safe" | "Moderate" | "Dangerous" | "Highly Restricted";
  location: string;
  supplier: string;
  usage: string;
  tone: Tone;
};

type EquipmentItem = {
  name: string;
  status: "Available" | "In Use" | "Damaged" | "Under Repair" | "Missing";
  assigned: string;
  condition: string;
  maintenance: string;
  cost: string;
  tone: Tone;
};

type TimelineItem = {
  title: string;
  detail: string;
  time: string;
  tone: Tone;
  actions?: string[];
};

type LabSessionAction = {
  action: string;
  session: SessionItem;
};

const labSearchRecords = [
  { id: "chem-ethanol", label: "Ethanol stock", detail: "Restricted chemical | usage audit required", sectionId: "chemicals" },
  { id: "microscope-12", label: "Microscope 12", detail: "Under repair | maintenance history open", sectionId: "equipment" },
  { id: "form-2-practical", label: "Form 2 Chemistry practical", detail: "Pending setup before 10:20 AM", sectionId: "sessions" },
  { id: "breakage-report", label: "Breakage report", detail: "Burette replacement pending", sectionId: "breakages" },
] satisfies Array<{ id: string; label: string; detail: string; sectionId: string }>;

type LabSearchRecord = (typeof labSearchRecords)[number];

function announceAction(message: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("myshule-lab-action", { detail: message }));
  }
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const toneStyles: Record<
  Tone,
  {
    border: string;
    bg: string;
    text: string;
    chip: string;
    dot: string;
    icon: string;
    glow: string;
  }
> = {
  safe: {
    border: "border-emerald-300/35",
    bg: "bg-emerald-400/12",
    text: "text-emerald-100",
    chip: "border-emerald-300/35 bg-emerald-400/14 text-emerald-100",
    dot: "bg-emerald-300",
    icon: "text-emerald-200",
    glow: "shadow-[0_0_34px_rgba(16,185,129,0.2)]",
  },
  info: {
    border: "border-blue-300/32",
    bg: "bg-blue-400/12",
    text: "text-blue-100",
    chip: "border-blue-300/32 bg-blue-400/14 text-blue-100",
    dot: "bg-blue-300",
    icon: "text-blue-200",
    glow: "shadow-[0_0_34px_rgba(37,99,235,0.17)]",
  },
  warning: {
    border: "border-[#FF7A1A]/42",
    bg: "bg-[#FF7A1A]/14",
    text: "text-[#FFE1C8]",
    chip: "border-[#FF7A1A]/42 bg-[#FF7A1A]/16 text-[#FFE1C8]",
    dot: "bg-[#FF7A1A]",
    icon: "text-[#FFB36F]",
    glow: "shadow-[0_0_38px_rgba(255,122,26,0.22)]",
  },
  danger: {
    border: "border-rose-300/42",
    bg: "bg-rose-500/13",
    text: "text-rose-100",
    chip: "border-rose-300/42 bg-rose-500/15 text-rose-100",
    dot: "bg-rose-400",
    icon: "text-rose-200",
    glow: "shadow-[0_0_42px_rgba(225,29,72,0.26)]",
  },
  cyan: {
    border: "border-cyan-300/35",
    bg: "bg-cyan-400/12",
    text: "text-cyan-100",
    chip: "border-cyan-300/35 bg-cyan-400/14 text-cyan-100",
    dot: "bg-cyan-300",
    icon: "text-cyan-200",
    glow: "shadow-[0_0_34px_rgba(34,211,238,0.18)]",
  },
  neutral: {
    border: "border-white/14",
    bg: "bg-white/[0.07]",
    text: "text-white/78",
    chip: "border-white/14 bg-white/10 text-white/80",
    dot: "bg-white/55",
    icon: "text-white/72",
    glow: "shadow-[0_18px_46px_rgba(7,29,73,0.16)]",
  },
};

const lightToneChipStyles: Record<Tone, string> = {
  safe: "border-emerald-200 bg-emerald-50 text-emerald-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
  warning: "border-orange-200 bg-orange-50 text-orange-800",
  danger: "border-rose-200 bg-rose-50 text-rose-800",
  cyan: "border-cyan-200 bg-cyan-50 text-cyan-800",
  neutral: "border-[#C8D5EA] bg-white text-[#071D49]",
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "top", icon: Home, group: "Command", active: true },
  { label: "Lab Sessions", href: "lab-sessions", icon: CalendarClock, group: "Operations" },
  { label: "Chemicals", href: "chemicals", icon: TestTube, group: "Inventory" },
  { label: "Equipment", href: "equipment", icon: Microscope, group: "Inventory" },
  { label: "Inventory", href: "inventory", icon: PackageCheck, group: "Inventory" },
  { label: "Requests", href: "requests", icon: ClipboardList, group: "Operations" },
  { label: "Breakages", href: "breakages", icon: AlertTriangle, group: "Accountability" },
  { label: "Safety Logs", href: "safety", icon: ShieldCheck, group: "Safety" },
  { label: "Maintenance", href: "maintenance", icon: Wrench, group: "Safety" },
  { label: "Practical Exams", href: "practical-exams", icon: LockKeyhole, group: "Exams" },
  { label: "Incidents", href: "incidents", icon: ShieldAlert, group: "Accountability" },
  { label: "Reports", href: "reports", icon: FileBarChart2, group: "Intelligence" },
  { label: "AI Insights", href: "ai-insights", icon: BrainCircuit, group: "Intelligence" },
  { label: "Notifications", href: "notifications", icon: Bell, group: "Intelligence" },
  { label: "Settings", href: "settings", icon: Settings, group: "Administration" },
];

const kpis: Kpi[] = [
  {
    label: "Lab Readiness Score",
    value: "92%",
    detail: "Safety checklist, prep sheets, apparatus staging, and teacher confirmation are aligned.",
    sub: "Lab Safety: 92% Compliant",
    tone: "safe",
    icon: ShieldCheck,
    points: [82, 86, 88, 91, 89, 92, 92],
  },
  {
    label: "Today's Practical Sessions",
    value: "2",
    detail: "Chemistry Form 4 and Biology Form 2 require technician confirmation before lessons.",
    sub: "2 Practical Sessions Today",
    tone: "cyan",
    icon: FlaskConical,
    points: [1, 1, 2, 2, 2, 2, 2],
  },
  {
    label: "Dangerous Chemicals",
    value: "18",
    detail: "4 highly restricted reagents require supervisor approval and locked stock cards.",
    sub: "3 Chemicals Running Low",
    tone: "danger",
    icon: TestTubes,
    points: [14, 15, 16, 17, 18, 18, 18],
  },
  {
    label: "Pending Replenishments",
    value: "7",
    detail: "Acids, gloves, ethanol, and slides need procurement follow-up before Friday.",
    sub: "Auto reorder queue active",
    tone: "warning",
    icon: ClipboardList,
    points: [3, 4, 4, 5, 6, 7, 7],
  },
  {
    label: "Broken Equipment Alerts",
    value: "4",
    detail: "Microscope lens, gas tap, voltmeter, and projector are awaiting repair action.",
    sub: "4 Equipment Repairs Pending",
    tone: "warning",
    icon: Wrench,
    points: [1, 2, 2, 3, 3, 4, 4],
  },
  {
    label: "Lab Safety Compliance",
    value: "96%",
    detail: "Emergency protocols, extinguisher checks, first aid, and eyewash stations verified.",
    sub: "Safety audit ready",
    tone: "info",
    icon: FireExtinguisher,
    points: [88, 90, 91, 93, 94, 96, 96],
  },
];

const sessions: SessionItem[] = [
  {
    time: "08:10",
    className: "Form 4 West - Chemistry",
    teacher: "Mrs. Njeri",
    lab: "Chemistry Lab 1",
    status: "Ready",
    progress: 100,
    chemicals: "Dilute HCl, sodium carbonate, methyl orange",
    apparatus: "Burettes, pipettes, conical flasks",
    size: "48 learners",
    tone: "safe",
  },
  {
    time: "10:40",
    className: "Form 2 North - Biology",
    teacher: "Mr. Kiptoo",
    lab: "Biology Lab 2",
    status: "Pending Setup",
    progress: 68,
    chemicals: "Iodine, Benedict solution, ethanol",
    apparatus: "Microscopes, slides, droppers",
    size: "42 learners",
    tone: "warning",
  },
  {
    time: "14:00",
    className: "Form 3 East - Physics",
    teacher: "Ms. Atieno",
    lab: "Physics Lab",
    status: "Missing Equipment",
    progress: 44,
    chemicals: "None",
    apparatus: "Ammeter, voltmeter, resistance wires",
    size: "45 learners",
    tone: "danger",
  },
];

const chemicals: ChemicalItem[] = [
  {
    name: "Hydrochloric Acid",
    quantity: "2.4 L remaining",
    expiry: "Expires in 21 days",
    hazard: "Highly Restricted",
    location: "Locked cabinet C1",
    supplier: "Nairobi Lab Supplies",
    usage: "31% usage spike this week",
    tone: "danger",
  },
  {
    name: "Ethanol",
    quantity: "5.5 L remaining",
    expiry: "Expires in 45 days",
    hazard: "Dangerous",
    location: "Flammable storage",
    supplier: "Science Line Kenya",
    usage: "Barcode support and QR code scanning active",
    tone: "warning",
  },
  {
    name: "Benedict Solution",
    quantity: "14 bottles",
    expiry: "No chemicals near expiry",
    hazard: "Moderate",
    location: "Biology shelf B2",
    supplier: "EduChem",
    usage: "Stock deduction automation ready",
    tone: "info",
  },
  {
    name: "Distilled Water",
    quantity: "72 L",
    expiry: "Stable batch",
    hazard: "Safe",
    location: "General store",
    supplier: "In-house distiller",
    usage: "Normal consumption trend",
    tone: "safe",
  },
];

const equipment: EquipmentItem[] = [
  {
    name: "Microscope Set A",
    status: "In Use",
    assigned: "Biology Lab 2",
    condition: "Grade B - serviceable",
    maintenance: "Calibration due in 9 days",
    cost: "KES 18,000 repair exposure",
    tone: "info",
  },
  {
    name: "Gas Tap Line 3",
    status: "Under Repair",
    assigned: "Chemistry Lab 1",
    condition: "Leak isolated",
    maintenance: "Technician visit scheduled",
    cost: "KES 7,500 estimated",
    tone: "danger",
  },
  {
    name: "Burette Rack",
    status: "Damaged",
    assigned: "Chemistry prep room",
    condition: "Cracked clamp rail",
    maintenance: "Evidence uploaded",
    cost: "KES 4,200 charge pending",
    tone: "warning",
  },
  {
    name: "Physics Optics Kit",
    status: "Available",
    assigned: "Stock room",
    condition: "Grade A",
    maintenance: "Warranty active",
    cost: "No repair risk",
    tone: "safe",
  },
];

const breakageItems: TimelineItem[] = [
  {
    title: "Burette cracked during titration",
    detail: "Form 4 West, supervised by Mrs. Njeri. Evidence photo uploaded, estimated repair cost KES 1,800.",
    time: "09:18",
    tone: "warning",
    actions: ["Attach evidence", "Parent notification", "Submit approval"],
  },
  {
    title: "Gas tap reported loose",
    detail: "Chemistry Lab 1 locked until maintenance confirms safety. Disciplinary recommendation not required.",
    time: "10:05",
    tone: "danger",
    actions: ["Escalate safety", "Schedule maintenance"],
  },
  {
    title: "No incidents reported today",
    detail: "Biology Lab 2 and Physics Lab have no new student-caused damage reports this morning.",
    time: "Live",
    tone: "safe",
  },
];

const maintenanceItems: TimelineItem[] = [
  {
    title: "Gas line repair",
    detail: "Vendor contact confirmed, warranty tracking attached, status In Progress.",
    time: "Today",
    tone: "danger",
    actions: ["View vendor", "Confirm isolation"],
  },
  {
    title: "Microscope calibration",
    detail: "16 microscopes due for lens calibration before CBC practical rotation.",
    time: "Friday",
    tone: "warning",
    actions: ["Schedule batch", "Print list"],
  },
  {
    title: "Fire extinguisher inspection",
    detail: "Completed for Labs 1, 2, and prep room. Next inspection logged.",
    time: "Done",
    tone: "safe",
  },
];

const aiInsights = [
  ["Chemical consumption unusually high this week.", "Hydrochloric acid usage increased 31%. Compare teacher requisitions against lesson plans before releasing more.", "94% confidence", "danger"],
  ["Physics Lab records the highest breakage incidents.", "Three apparatus failures in seven days suggest handling retraining and tighter borrowing logs.", "89% confidence", "warning"],
  ["Three chemicals expire within 14 days.", "Prioritize safe disposal or approved practical usage before stock loss is recorded.", "87% confidence", "warning"],
  ["Biology practical readiness dropped by 12%.", "Microscope availability and slide preparation are creating a preparation bottleneck.", "82% confidence", "info"],
  ["Lab 2 has repeated safety non-compliance.", "Eye wash checks were missed twice this week. Require digital safety checklist before access.", "91% confidence", "danger"],
] as const;

const inventoryStats = [
  ["Fast-moving items", "Gloves, slides, ethanol", "Monthly consumption graph shows Friday practical demand.", ScanLine, "cyan"],
  ["Dead stock", "18 inactive SKUs", "Old reagents and unused kits should be reviewed for disposal.", PackageCheck, "warning"],
  ["Unusual stock reductions", "2 anomalies", "Stock movement logs flagged after-hours deductions.", ShieldAlert, "danger"],
  ["Inventory valuation", "KES 1.82M", "Batch tracking and procurement requests remain audit ready.", FileBarChart2, "safe"],
] as const;

const safetyCards = [
  ["Emergency protocols", "Ready", "Evacuation protocol access verified for all labs.", ShieldCheck, "safe"],
  ["First aid status", "Stocked", "Burn gel, bandages, eye wash, and gloves checked.", PackageCheck, "safe"],
  ["Gas leakage monitoring", "Active", "Digital checklist requires isolation confirmation.", Activity, "danger"],
  ["Eye wash station checks", "1 overdue", "Lab 2 check due before afternoon session.", Thermometer, "warning"],
  ["Safety gear availability", "96%", "Masks, goggles, coats, and gloves available.", FireExtinguisher, "info"],
  ["High-risk warnings", "2", "Flammable storage and acid cabinet need supervisor review.", AlertTriangle, "danger"],
] as const;

const examReadiness = [
  ["KCSE Chemistry Practical", "11 days", "Confidential material locking and examiner requirements active.", 84, "danger"],
  ["CBC Biology Rotation", "3 days", "Practical stations and seating arrangement 76% ready.", 76, "warning"],
  ["Physics Apparatus Audit", "6 days", "Emergency shortage alerts active for voltmeters.", 68, "warning"],
] as const;

const reports = [
  ["Inventory reports", "PDF and Excel export for stock cards, batches, suppliers, and valuation.", FileBarChart2, "cyan"],
  ["Chemical usage reports", "Filter by term, class, lab, date, and teacher requisition.", TestTube, "warning"],
  ["Incident reports", "Insurance reporting, photos, approval workflow, and disciplinary notes.", ShieldAlert, "danger"],
  ["Maintenance reports", "Calibration schedules, warranty tracking, vendor costs, and delays.", Wrench, "info"],
  ["Practical readiness reports", "Print setup sheets and export exam preparedness summaries.", ClipboardCheck, "safe"],
  ["Audit reports", "Audit trail logging, sensitive chemical restrictions, and supervisor approvals.", LockKeyhole, "cyan"],
] as const;

const quickActions = [
  ["Add chemical", TestTube],
  ["Add equipment", Microscope],
  ["Record breakage", AlertTriangle],
  ["Create lab session", CalendarClock],
  ["Submit incident", ShieldAlert],
  ["Schedule maintenance", Wrench],
  ["Print practical sheets", FileBarChart2],
  ["Emergency cancel session", ShieldAlert],
] as const;

const analytics = [
  { title: "Chemical usage trends", detail: "Suspicious usage detection", tone: "danger" as Tone, values: [22, 25, 24, 31, 42, 39, 47] },
  { title: "Equipment utilization", detail: "Frequently damaged items", tone: "warning" as Tone, values: [48, 55, 61, 66, 70, 74, 78] },
  { title: "Inventory flow charts", detail: "Batch movement and valuation", tone: "cyan" as Tone, values: [62, 64, 69, 71, 76, 80, 82] },
  { title: "Compliance donut", detail: "Lab safety center score", tone: "safe" as Tone, values: [86, 88, 91, 92, 94, 95, 96] },
  { title: "Incident heat map", detail: "Accident-prone laboratories", tone: "danger" as Tone, values: [8, 12, 9, 16, 21, 18, 25] },
  { title: "Practical readiness", detail: "KCSE/CBC preparation progress", tone: "info" as Tone, values: [55, 61, 66, 70, 76, 82, 88] },
];

function StatusChip({ icon: Icon, label, tone }: { icon: LucideIcon; label: string; tone: Tone }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black", toneStyles[tone].chip)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}

function LightStatusChip({ icon: Icon, label, tone }: { icon: LucideIcon; label: string; tone: Tone }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black shadow-sm", lightToneChipStyles[tone])}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}

function IconFrame({ icon: Icon, tone }: { icon: LucideIcon; tone: Tone }) {
  return (
    <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl border", toneStyles[tone].border, toneStyles[tone].bg, toneStyles[tone].icon)}>
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
  );
}

function MiniLine({ values, tone }: { values: number[]; tone: Tone }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 100 - ((value - min) / Math.max(max - min, 1)) * 80 - 10;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" className="h-16 w-full overflow-visible" role="img" aria-label="Trend chart">
      <defs>
        <linearGradient id={`laboratory-line-${tone}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={tone === "danger" ? "#fb7185" : tone === "warning" ? "#FF7A1A" : tone === "safe" ? "#6EE7B7" : "#22D3EE"} />
          <stop offset="100%" stopColor={tone === "danger" ? "#f43f5e" : tone === "warning" ? "#FDBA74" : tone === "safe" ? "#34D399" : "#60A5FA"} />
        </linearGradient>
      </defs>
      <polygon points={`0,100 ${points} 100,100`} fill={tone === "danger" ? "rgba(244,63,94,0.16)" : tone === "warning" ? "rgba(255,122,26,0.16)" : "rgba(34,211,238,0.14)"} />
      <polyline fill="none" stroke={`url(#laboratory-line-${tone})`} strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" points={points} />
    </svg>
  );
}

function ProgressBar({ value, tone }: { value: number; tone: Tone }) {
  return (
    <div className="mt-3 h-2 rounded-full bg-white/10">
      <span className={cn("block h-full rounded-full", toneStyles[tone].dot)} style={{ width: `${value}%` }} />
    </div>
  );
}

function SectionCard({
  id,
  title,
  eyebrow,
  description,
  children,
  className,
}: {
  id?: string;
  title: string;
  eyebrow: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("rounded-[24px] border border-white/12 bg-[#071D49] p-5 text-white shadow-[0_20px_60px_rgba(7,29,73,0.18)]", className)}>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/72">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-black tracking-tight">{title}</h2>
      <p className="mt-2 max-w-4xl text-sm leading-6 text-white/66">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Sidebar() {
  const groups = Array.from(new Set(navItems.map((item) => item.group)));

  return (
    <aside
      aria-label="Laboratory technician dashboard navigation"
      className="hidden h-full rounded-[24px] border border-[#C8D5EA]/50 bg-[#071D49] p-4 text-white shadow-[0_24px_70px_rgba(7,29,73,0.22)] xl:sticky xl:top-5 xl:block"
    >
      <div className="rounded-[20px] border border-white/10 bg-white/[0.06] p-4">
        <p className="text-xs font-black uppercase text-cyan-200">Lab command</p>
        <h2 className="mt-2 text-2xl font-black">Lab Control</h2>
        <p className="mt-2 text-sm leading-6 text-white/66">Safety, chemicals, equipment, practical exams, and audit accountability in one live view.</p>
      </div>
      <nav className="mt-5 max-h-[calc(100vh-250px)] space-y-5 overflow-auto pr-1">
        {groups.map((group) => (
          <div key={group}>
            <p className="px-3 text-[11px] font-black uppercase tracking-[0.16em] text-white/45">{group}</p>
            <div className="mt-2 grid gap-1">
              {navItems.filter((item) => item.group === group).map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    className={cn(
                      "flex min-h-10 items-center gap-3 rounded-2xl px-3 py-2 text-sm font-bold transition hover:-translate-y-0.5",
                      item.active
                        ? "border border-cyan-300/35 bg-cyan-300/12 text-cyan-100 shadow-[inset_4px_0_0_#22D3EE]"
                        : "text-white/72 hover:bg-white/10 hover:text-white",
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
      <div className="mt-5 rounded-[20px] border border-emerald-300/20 bg-emerald-400/10 p-4">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-100/70">Audit posture</p>
        <p className="mt-2 text-sm font-black">Sensitive chemicals locked</p>
        <p className="mt-1 text-xs leading-5 text-white/58">Supervisor approvals, audit trail logging, barcode scans, and offline sync are active.</p>
      </div>
    </aside>
  );
}

function TopNav({
  now,
  searchTerm,
  searchResults,
  onSearchResult,
  onSearchTermChange,
}: {
  now: Date | null;
  searchTerm: string;
  searchResults: LabSearchRecord[];
  onSearchResult: (record: LabSearchRecord) => void;
  onSearchTermChange: (value: string) => void;
}) {
  const timeLabel = now
    ? new Intl.DateTimeFormat("en-KE", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(now)
    : "Live laboratory clock syncing";

  return (
    <header className="rounded-[24px] border border-[#C8D5EA]/70 bg-white/92 p-4 shadow-[0_18px_55px_rgba(7,29,73,0.1)] backdrop-blur-xl">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)] lg:items-start">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#071D49] text-sm font-black text-white">MS</div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#5F6F89]">MyShule science operations</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-[#071D49] md:text-3xl">Laboratory Operations</h2>
            <p className="mt-2 text-sm font-bold text-[#5F6F89]">{timeLabel} - Term 2 Week 4 - Lab Technician Desk</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-[#5F6F89]" aria-hidden="true" />
            <input
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && searchResults[0]) {
                  onSearchResult(searchResults[0]);
                }
              }}
              aria-label="Search chemicals, equipment, sessions, teachers, requests, incidents, or suppliers"
              placeholder="Search chemicals, equipment, sessions, teachers, requests, or incidents"
              className="h-12 w-full rounded-2xl border border-[#C8D5EA] bg-[#F8FAFC] pl-12 pr-4 text-sm font-semibold text-[#071D49] outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-300/20"
            />
            {searchTerm.trim().length > 0 ? (
              <div className="absolute left-0 right-0 top-14 z-20 overflow-hidden rounded-2xl border border-[#C8D5EA] bg-white text-[#071D49] shadow-2xl">
                {searchResults.length > 0 ? (
                  searchResults.map((record) => (
                    <button key={record.id} type="button" onClick={() => onSearchResult(record)} className="block w-full px-4 py-3 text-left text-sm hover:bg-cyan-50">
                      <span className="block font-black">{record.label}</span>
                      <span className="mt-1 block text-xs font-semibold text-[#5F6F89]">{record.detail}</span>
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-3 text-sm font-bold text-[#5F6F89]">No matching lab record found.</p>
                )}
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LightStatusChip icon={ShieldAlert} label="2 safety alerts" tone="danger" />
            <LightStatusChip icon={ClipboardList} label="7 pending requests" tone="warning" />
            <LightStatusChip icon={Bell} label="14 notifications" tone="info" />
            <LightStatusChip icon={BrainCircuit} label="AI assistant" tone="cyan" />
            <details className="relative">
              <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-2 rounded-2xl bg-[#071D49] px-3 text-xs font-black text-white">
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Quick add
              </summary>
              <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-[#C8D5EA] bg-white p-2 text-[#071D49] shadow-[0_24px_70px_rgba(7,29,73,0.2)]">
                {quickActions.slice(0, 6).map(([label, Icon]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => announceAction(`${label} opened from quick add.`)}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-black hover:bg-[#F3F4F6]"
                  >
                    <Icon className="h-4 w-4 text-cyan-700" aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
            </details>
          </div>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const signals = [
    "preventing chemical theft",
    "avoiding practical exam chaos",
    "tracking dangerous substances",
    "ensuring no teacher enters a lab unprepared",
  ];

  return (
    <section className="overflow-hidden rounded-[24px] border border-[#C8D5EA]/45 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_30%),linear-gradient(135deg,#071D49_0%,#102A60_56%,#0F2345_100%)] p-5 text-white shadow-[0_24px_70px_rgba(7,29,73,0.22)]">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(330px,0.7fr)]">
        <div>
          <div className="flex flex-wrap gap-2">
            <StatusChip icon={ShieldCheck} label="This school is in control." tone="safe" />
            <StatusChip icon={RadioTower} label="Real-time notifications" tone="cyan" />
            <StatusChip icon={ScanLine} label="Barcode and QR inventory" tone="info" />
          </div>
          <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight md:text-6xl">Laboratory Technician Command Center</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-white/72">
            Nothing in this laboratory escapes oversight. Track practical readiness, dangerous chemicals,
            broken equipment, safety compliance, maintenance, and audit trails from one intelligent screen.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {signals.map((signal, index) => (
              <article key={signal} className="rounded-2xl border border-white/12 bg-white/[0.07] p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100/64">Signal {index + 1}</p>
                <p className="mt-3 text-sm font-black leading-5">{signal}</p>
                <ProgressBar value={[92, 84, 88, 96][index]} tone={index === 0 ? "danger" : index === 1 ? "warning" : "cyan"} />
              </article>
            ))}
          </div>
        </div>
        <div className="rounded-[24px] border border-cyan-300/20 bg-white/[0.08] p-5 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100/66">Animated safety status</p>
              <h2 className="mt-2 text-2xl font-black">Lab safety live</h2>
            </div>
            <span className="relative flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
              <span className="relative inline-flex h-4 w-4 rounded-full bg-emerald-300" />
            </span>
          </div>
          <MiniLine values={[78, 82, 86, 90, 89, 92, 96]} tone="safe" />
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-emerald-300/25 bg-emerald-400/10 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-100/70">Ready labs</p>
              <p className="mt-2 text-3xl font-black">3/4</p>
            </div>
            <div className="rounded-2xl border border-rose-300/30 bg-rose-500/12 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-rose-100/70">Critical locks</p>
              <p className="mt-2 text-3xl font-black">4</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function KpiCard({ item, index }: { item: Kpi; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={cn("rounded-[24px] border bg-[#071D49] p-5 text-white", toneStyles[item.tone].border, toneStyles[item.tone].glow)}
    >
      <div className="flex items-start justify-between gap-3">
        <IconFrame icon={item.icon} tone={item.tone} />
        <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-black", toneStyles[item.tone].chip)}>{item.sub}</span>
      </div>
      <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-white/56">{item.label}</p>
      <p className="mt-2 text-4xl font-black">{item.value}</p>
      <p className="mt-2 min-h-10 text-sm leading-5 text-white/66">{item.detail}</p>
      <MiniLine values={item.points} tone={item.tone} />
    </motion.article>
  );
}

function LabSessionManagement({ onSessionAction }: { onSessionAction: (sessionAction: LabSessionAction) => void }) {
  return (
    <SectionCard
      id="lab-sessions"
      eyebrow="Lab session management"
      title="Lab session management"
      description="Timeline view shows today's practical classes, assigned teachers, laboratories booked, preparation status, required chemicals, apparatus, class sizes, and conflict detection."
    >
      <div className="space-y-4">
        {sessions.map((session) => (
          <article key={`${session.time}-${session.className}`} className={cn("rounded-[24px] border p-4", toneStyles[session.tone].border, toneStyles[session.tone].bg)}>
            <div className="grid gap-4 lg:grid-cols-[110px_minmax(0,1fr)_220px] lg:items-center">
              <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-3 text-center">
                <Clock className="mx-auto h-5 w-5 text-cyan-100" aria-hidden="true" />
                <p className="mt-2 text-xl font-black">{session.time}</p>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-black">{session.className}</h3>
                  <StatusChip icon={ClipboardCheck} label={session.status} tone={session.tone} />
                </div>
                <p className="mt-2 text-sm leading-6 text-white/66">
                  {session.teacher} - {session.lab} - {session.size}
                </p>
                <p className="mt-1 text-sm leading-6 text-white/66">Required chemicals: {session.chemicals}</p>
                <p className="mt-1 text-sm leading-6 text-white/66">Required apparatus: {session.apparatus}</p>
                <ProgressBar value={session.progress} tone={session.tone} />
              </div>
              <div className="grid gap-2">
                {["Mark lab ready", "Mark setup completed", "Print practical sheets", "Emergency cancel session"].map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => onSessionAction({ action, session })}
                    className="rounded-2xl border border-white/12 bg-white/[0.07] px-3 py-2 text-left text-xs font-black text-white transition hover:border-cyan-300/40 hover:bg-cyan-300/12"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}

function ChemicalManagement() {
  return (
    <SectionCard
      id="chemicals"
      eyebrow="Chemical management"
      title="Chemical management"
      description="Critical chemical inventory tracks quantity remaining, measurements, expiry dates, hazard levels, storage, suppliers, usage history, barcode support, QR code scanning, and reorder suggestions."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <StatusChip icon={Barcode} label="Barcode support" tone="cyan" />
        <StatusChip icon={QrCode} label="QR code scanning" tone="info" />
        <StatusChip icon={Gauge} label="Chemical usage analytics" tone="safe" />
        <StatusChip icon={AlertTriangle} label="Suspicious usage detection" tone="danger" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {chemicals.map((chemical) => (
          <article key={chemical.name} className={cn("rounded-[24px] border p-4", toneStyles[chemical.tone].border, toneStyles[chemical.tone].bg)}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-black">{chemical.name}</h3>
                <p className="mt-1 text-sm text-white/64">{chemical.quantity} - {chemical.expiry}</p>
              </div>
              <span className={cn("rounded-full border px-2.5 py-1 text-xs font-black", toneStyles[chemical.tone].chip)}>{chemical.hazard}</span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <p className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-sm font-bold text-white/70">Storage location: {chemical.location}</p>
              <p className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-sm font-bold text-white/70">Supplier: {chemical.supplier}</p>
            </div>
            <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-sm font-bold text-white/75">{chemical.usage}</p>
            <MiniLine values={chemical.tone === "danger" ? [15, 19, 20, 28, 31, 37, 42] : [8, 10, 12, 13, 15, 16, 18]} tone={chemical.tone} />
          </article>
        ))}
      </div>
    </SectionCard>
  );
}

function EquipmentTracking() {
  return (
    <SectionCard
      id="equipment"
      eyebrow="Equipment and apparatus"
      title="Equipment & apparatus tracking"
      description="Track microscopes, beakers, burettes, test tubes, computers, physics apparatus, biology kits, chemistry tools, borrowing logs, return confirmations, damage tracking, condition grading, and maintenance history."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {equipment.map((item) => (
          <article key={item.name} className={cn("rounded-[24px] border p-4", toneStyles[item.tone].border, toneStyles[item.tone].bg)}>
            <div className="flex items-start justify-between gap-3">
              <IconFrame icon={item.name.includes("Microscope") ? Microscope : item.name.includes("Gas") ? Gauge : item.name.includes("Burette") ? TestTube : Beaker} tone={item.tone} />
              <span className={cn("rounded-full border px-2.5 py-1 text-xs font-black", toneStyles[item.tone].chip)}>{item.status}</span>
            </div>
            <h3 className="mt-4 text-xl font-black">{item.name}</h3>
            <p className="mt-2 text-sm leading-6 text-white/66">Assigned: {item.assigned}</p>
            <p className="mt-1 text-sm leading-6 text-white/66">Condition: {item.condition}</p>
            <p className="mt-1 text-sm leading-6 text-white/66">Maintenance: {item.maintenance}</p>
            <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-sm font-bold text-white/76">{item.cost}</p>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}

function TimelineList({ items }: { items: TimelineItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <article key={`${item.title}-${item.time}`} className={cn("rounded-2xl border p-4", toneStyles[item.tone].border, toneStyles[item.tone].bg)}>
          <div className="flex gap-3">
            <span className={cn("mt-1 h-3 w-3 shrink-0 rounded-full", toneStyles[item.tone].dot)} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="font-black">{item.title}</h3>
                <span className="text-xs font-bold text-white/50">{item.time}</span>
              </div>
              <p className="mt-1 text-sm leading-6 text-white/66">{item.detail}</p>
              {item.actions ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.actions.map((action) => (
                    <button
                      key={action}
                      type="button"
                      onClick={() => announceAction(`${action} opened for ${item.title}.`)}
                      className="rounded-full border border-white/14 bg-white/10 px-3 py-1.5 text-xs font-black text-white/82"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function BreakagesAndSafety() {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <SectionCard
        id="breakages"
        eyebrow="Breakages and incidents"
        title="Breakages & incidents"
        description="Accountability records who caused damage, class involved, supervising teacher, estimated repair cost, incident description, attached photos, disciplinary recommendation, approval workflow, parent notification, and insurance reporting."
      >
        <TimelineList items={breakageItems} />
      </SectionCard>
      <SectionCard
        id="safety"
        eyebrow="Lab safety center"
        title="Lab safety center"
        description="Emergency protocols, first aid status, fire extinguisher inspections, gas leakage monitoring, eye wash station checks, safety gear, compliance score, and AI-generated risk analysis stay visible."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {safetyCards.map(([title, value, detail, Icon, tone]) => (
            <article key={title} className={cn("rounded-2xl border p-4", toneStyles[tone as Tone].border, toneStyles[tone as Tone].bg)}>
              <IconFrame icon={Icon} tone={tone as Tone} />
              <h3 className="mt-3 font-black">{title}</h3>
              <p className="mt-1 text-2xl font-black">{value}</p>
              <p className="mt-1 text-sm leading-5 text-white/64">{detail}</p>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function InventoryAndExams() {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <SectionCard
        id="inventory"
        eyebrow="Inventory and stock room"
        title="Inventory & stock room"
        description="Consumables, reagents, gloves, masks, acids, cleaning supplies, stock movement logs, supplier tracking, procurement requests, batch tracking, auto restocking, valuation, wastage, dead stock, and unusual stock reductions."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {inventoryStats.map(([title, value, detail, Icon, tone]) => (
            <article key={title} className={cn("rounded-2xl border p-4", toneStyles[tone as Tone].border, toneStyles[tone as Tone].bg)}>
              <IconFrame icon={Icon} tone={tone as Tone} />
              <h3 className="mt-3 font-black">{title}</h3>
              <p className="mt-1 text-2xl font-black">{value}</p>
              <p className="mt-1 text-sm leading-5 text-white/64">{detail}</p>
            </article>
          ))}
        </div>
      </SectionCard>
      <SectionCard
        id="practical-exams"
        eyebrow="Practical exams control"
        title="Practical exams control"
        description="KCSE/CBC practical preparation tracks exam timetable, required materials, examiner requirements, stations, seating arrangement, confidential material locking, checklists, real-time readiness, countdowns, and emergency shortage alerts."
      >
        <div className="space-y-3">
          {examReadiness.map(([title, countdown, detail, score, tone]) => (
            <article key={title} className={cn("rounded-2xl border p-4", toneStyles[tone as Tone].border, toneStyles[tone as Tone].bg)}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-black">{title}</h3>
                <StatusChip icon={LockKeyhole} label={`${countdown} to practical`} tone={tone as Tone} />
              </div>
              <p className="mt-2 text-sm leading-6 text-white/66">{detail}</p>
              <ProgressBar value={score as number} tone={tone as Tone} />
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function MaintenanceManagement() {
  return (
    <SectionCard
      id="maintenance"
      eyebrow="Maintenance management"
      title="Maintenance management"
      description="Repairs, calibration schedules, technician visits, servicing, maintenance calendar, warranty tracking, cost analysis, and vendor contacts are status-controlled."
    >
      <TimelineList items={maintenanceItems} />
    </SectionCard>
  );
}

function AiInsights() {
  return (
    <SectionCard
      id="ai-insights"
      eyebrow="AI operational intelligence"
      title="AI laboratory insights"
      description="Predictive inventory forecasting, risk scoring, operational efficiency trends, anomaly detection, and neural-style lab safety intelligence."
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {aiInsights.map(([title, detail, confidence, tone]) => (
          <article key={title} className={cn("rounded-[24px] border p-4", toneStyles[tone as Tone].border, toneStyles[tone as Tone].bg)}>
            <div className="flex items-start justify-between gap-3">
              <IconFrame icon={BrainCircuit} tone={tone as Tone} />
              <span className={cn("rounded-full border px-2.5 py-1 text-xs font-black", toneStyles[tone as Tone].chip)}>{confidence}</span>
            </div>
            <h3 className="mt-4 text-lg font-black">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-white/66">{detail}</p>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}

function QuickActionsPanel() {
  return (
    <SectionCard
      id="requests"
      eyebrow="Smart features"
      title="Quick actions panel"
      description="Real-time notifications, offline sync, barcode scanning, QR inventory tracking, audit logs, activity history, role permissions, biometric readiness, and action confirmations."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map(([label, Icon]) => (
          <button
            key={label}
            type="button"
            onClick={() => announceAction(`${label} opened for lab desk action.`)}
            className="group flex min-h-20 items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.07] p-4 text-left font-black text-white transition hover:-translate-y-1 hover:border-cyan-300/40 hover:bg-cyan-300/12"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-cyan-300/30 bg-cyan-300/12 text-cyan-100">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            {label}
          </button>
        ))}
      </div>
    </SectionCard>
  );
}

function ReportsAnalytics() {
  return (
    <SectionCard
      id="reports"
      eyebrow="Reports and analytics"
      title="Reports & analytics"
      description="Inventory reports, chemical usage, incident reports, maintenance reports, practical readiness, audit reports, PDF export, Excel export, print functionality, filters, heat maps, and inventory flow charts."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {analytics.map((item) => (
          <article key={item.title} className={cn("rounded-[24px] border p-4", toneStyles[item.tone].border, toneStyles[item.tone].bg)}>
            <h3 className="font-black">{item.title}</h3>
            <p className="mt-1 text-sm text-white/60">{item.detail}</p>
            <MiniLine values={item.values} tone={item.tone} />
          </article>
        ))}
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {reports.map(([title, detail, Icon, tone]) => (
          <article key={title} className={cn("rounded-2xl border p-4", toneStyles[tone as Tone].border, toneStyles[tone as Tone].bg)}>
            <IconFrame icon={Icon} tone={tone as Tone} />
            <h3 className="mt-3 font-black">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-white/64">{detail}</p>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}

function EmptyStatesAndSupport() {
  const panels = [
    ["All practical sessions fully prepared.", "Setup sheets, teacher confirmation, and materials are ready for completed sessions.", ClipboardCheck, "safe", "incidents"],
    ["No chemicals near expiry.", "Current batch review found no immediate expiry risk beyond the flagged review queue.", TestTube, "safe", "notifications"],
    ["Safety compliance is excellent.", "Inspection calendar, emergency contacts, and daily forms are synced.", ShieldCheck, "safe", "settings"],
    ["Supervisor approvals", "Sensitive chemical restrictions require role-based permissions and action confirmations.", LockKeyhole, "cyan", undefined],
  ] as const;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {panels.map(([title, detail, Icon, tone, id]) => (
        <article key={title} id={id} className={cn("rounded-[24px] border bg-[#071D49] p-5 text-white", toneStyles[tone as Tone].border)}>
          <IconFrame icon={Icon} tone={tone as Tone} />
          <h2 className="mt-4 text-lg font-black">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-white/64">{detail}</p>
        </article>
      ))}
    </div>
  );
}

function MobileQuickActions() {
  const actions = [
    ["Session", CalendarClock],
    ["Chemical", TestTube],
    ["Breakage", AlertTriangle],
    ["Safety", ShieldCheck],
    ["Incident", ShieldAlert],
  ] as const;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#071D49] px-3 py-2 text-white shadow-[0_-20px_50px_rgba(7,29,73,0.25)] xl:hidden" aria-label="Mobile laboratory quick actions">
      <div className="grid grid-cols-5 gap-1">
        {actions.map(([label, Icon]) => (
          <button
            key={label}
            type="button"
            onClick={() => announceAction(`${label} opened from mobile lab actions.`)}
            className="grid min-h-12 place-items-center rounded-2xl text-[11px] font-black text-white/82"
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}

export function LaboratoryTechnicianCommandCenter({ routeMode }: { routeMode: LaboratoryRouteMode }) {
  const [now, setNow] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [notice, setNotice] = useState("Laboratory desk ready for practical setup, chemicals, equipment, breakages, and safety logs.");
  const [activeSessionAction, setActiveSessionAction] = useState<LabSessionAction | null>(null);
  const kpiItems = useMemo(() => kpis, []);
  const searchResults = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return [];

    return labSearchRecords.filter((record) =>
      [record.label, record.detail, record.sectionId].some((value) => value.toLowerCase().includes(query)),
    );
  }, [searchTerm]);

  useEffect(() => {
    const updateClock = () => setNow(new Date());
    const animationFrame = window.requestAnimationFrame(updateClock);
    const timer = window.setInterval(updateClock, 60_000);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    function handleLabAction(event: Event) {
      const detail = (event as CustomEvent<string>).detail;
      if (detail) {
        setNotice(detail);
      }
    }

    window.addEventListener("myshule-lab-action", handleLabAction);
    return () => window.removeEventListener("myshule-lab-action", handleLabAction);
  }, []);

  function openSearchRecord(record: LabSearchRecord) {
    setSearchTerm("");
    setNotice(`${record.label} opened in lab records.`);

    if (typeof document !== "undefined") {
      const target = document.getElementById(record.sectionId);
      target?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    }
  }

  function openLabSessionAction(sessionAction: LabSessionAction) {
    setActiveSessionAction(sessionAction);
    setNotice(`${sessionAction.action} ready for ${sessionAction.session.className}.`);
  }

  function saveLabSessionAction() {
    if (!activeSessionAction) {
      return;
    }

    const schoolId = getCurrentSchoolId();
    const { action, session } = activeSessionAction;

    publishSchoolOperationalEvent({
      schoolId,
      type: "LAB_SESSION_ACTION_RECORDED",
      module: "laboratory",
      actorRole: "Laboratory Technician",
      title: `${action} saved for ${session.className}`,
      body: `${action} was recorded for ${session.className} in ${session.lab}.`,
      entityId: `${session.time}-${session.className}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      severity: action.toLowerCase().includes("cancel") ? "warning" : "info",
      payload: {
        action,
        className: session.className,
        teacher: session.teacher,
        lab: session.lab,
        chemicals: session.chemicals,
        apparatus: session.apparatus,
        sessionStatus: session.status,
      },
      notifications: [
        {
          audienceRoles: ["Teacher", "Dean of Academics", "Principal"],
          title: `${action} recorded`,
          body: `${session.className} lab session was updated by the Laboratory Technician.`,
          severity: action.toLowerCase().includes("cancel") ? "warning" : "info",
          relatedModule: "laboratory",
          relatedRecordId: session.className,
          requiresAction: false,
          requestStatus: "Completed",
        },
      ],
    });

    setNotice(`${action} saved for ${session.className}.`);
    setActiveSessionAction(null);
  }

  return (
    <div id="top" data-route-mode={routeMode} className="min-h-screen bg-[#F3F4F6] pb-24 lg:pb-6">
      <div className="grid gap-5 p-3 md:p-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Sidebar />
        <main className="min-w-0 space-y-5">
          <TopNav
            now={now}
            searchTerm={searchTerm}
            searchResults={searchResults}
            onSearchResult={openSearchRecord}
            onSearchTermChange={setSearchTerm}
          />
          <div role="status" className="rounded-2xl border border-[#C8D5EA] bg-white px-4 py-3 text-sm font-black text-[#071D49] shadow-[0_12px_30px_rgba(7,29,73,0.08)]">
            {notice}
          </div>
          {activeSessionAction ? (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Laboratory session action"
              className="rounded-[24px] border border-[#C8D5EA] bg-white p-5 text-[#071D49] shadow-[0_18px_55px_rgba(7,29,73,0.12)]"
            >
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5F6F89]">Same-school lab session update</p>
              <h2 className="mt-2 text-xl font-black">{activeSessionAction.action}</h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#5F6F89]">
                This records the lab action, notifies the teacher and school leadership, and keeps the update scoped to the current school.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                {[
                  ["Class", activeSessionAction.session.className],
                  ["Teacher", activeSessionAction.session.teacher],
                  ["Lab", activeSessionAction.session.lab],
                  ["Materials", `${activeSessionAction.session.chemicals}; ${activeSessionAction.session.apparatus}`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-[#C8D5EA] bg-[#F8FAFC] p-3">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-[#5F6F89]">{label}</p>
                    <p className="mt-1 text-sm font-black">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={saveLabSessionAction}
                  className="inline-flex min-h-10 items-center gap-2 rounded-2xl bg-[#071D49] px-4 text-sm font-black text-white"
                >
                  <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                  Save lab session update
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSessionAction(null)}
                  className="inline-flex min-h-10 items-center rounded-2xl border border-[#C8D5EA] bg-white px-4 text-sm font-black text-[#071D49]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
          <Hero />
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {kpiItems.map((item, index) => (
              <KpiCard key={item.label} item={item} index={index} />
            ))}
          </section>
          <LabSessionManagement onSessionAction={openLabSessionAction} />
          <ChemicalManagement />
          <EquipmentTracking />
          <BreakagesAndSafety />
          <InventoryAndExams />
          <MaintenanceManagement />
          <AiInsights />
          <QuickActionsPanel />
          <ReportsAnalytics />
          <EmptyStatesAndSupport />
        </main>
      </div>
      <MobileQuickActions />
    </div>
  );
}
