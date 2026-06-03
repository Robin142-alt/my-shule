"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BedDouble,
  Bell,
  BrainCircuit,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  DoorOpen,
  Droplets,
  FileBarChart2,
  HeartPulse,
  Home,
  Lightbulb,
  LockKeyhole,
  MessageSquareText,
  Moon,
  RadioTower,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShowerHead,
  Siren,
  Sparkles,
  Stethoscope,
  UserCheck,
  UsersRound,
  Utensils,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { getCurrentSchoolId, publishSchoolOperationalEvent } from "@/lib/school/school-operational-store";

type BoardingRouteMode = "hosted" | "public";
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

type DormCard = {
  name: string;
  occupancy: string;
  capacity: number;
  captain: string;
  cleanliness: string;
  noise: string;
  lights: string;
  water: string;
  issues: string;
  tone: Tone;
};

type RollCallRow = {
  avatar: string;
  admission: string;
  name: string;
  dorm: string;
  status: string;
  time: string;
  checkedBy: string;
  notes: string;
  tone: Tone;
};

type FeedItem = {
  title: string;
  detail: string;
  time: string;
  tone: Tone;
  actions?: string[];
};

type BoardingTimelineAction = {
  action: string;
  item: FeedItem;
};

type BoardingDeskAction = {
  label: string;
  source: "quick-actions" | "mobile";
};

const boardingSearchRecords = [
  { id: "kevin-roll-call", label: "Kevin Otieno", detail: "Missed 3 night roll calls this month", sectionId: "roll-call" },
  { id: "dorm-b", label: "Dorm B", detail: "Noise and movement incidents require review", sectionId: "live-hostel-status" },
  { id: "exeat-pending", label: "Pending exeats", detail: "2 leave-out requests awaiting approval", sectionId: "leave-outs" },
  { id: "sick-students", label: "Sick boarders", detail: "Clinic referrals require parent notification", sectionId: "clinic" },
  { id: "water-shortage", label: "Water issue", detail: "Dorm A water usage anomaly", sectionId: "maintenance" },
] satisfies Array<{ id: string; label: string; detail: string; sectionId: string }>;

type BoardingSearchRecord = (typeof boardingSearchRecords)[number];

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
    border: "border-orange-300/42",
    bg: "bg-[#FF7A1A]/14",
    text: "text-[#FFE1C8]",
    chip: "border-[#FF7A1A]/42 bg-[#FF7A1A]/16 text-[#FFE1C8]",
    dot: "bg-[#FF7A1A]",
    icon: "text-[#FFB36F]",
    glow: "shadow-[0_0_38px_rgba(255,122,26,0.2)]",
  },
  danger: {
    border: "border-rose-300/42",
    bg: "bg-rose-500/13",
    text: "text-rose-100",
    chip: "border-rose-300/42 bg-rose-500/15 text-rose-100",
    dot: "bg-rose-400",
    icon: "text-rose-200",
    glow: "shadow-[0_0_42px_rgba(225,29,72,0.25)]",
  },
  cyan: {
    border: "border-cyan-300/35",
    bg: "bg-cyan-400/12",
    text: "text-cyan-100",
    chip: "border-cyan-300/35 bg-cyan-400/14 text-cyan-100",
    dot: "bg-cyan-300",
    icon: "text-cyan-200",
    glow: "shadow-[0_0_34px_rgba(34,211,238,0.17)]",
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
  { label: "Boarding Students", href: "boarding-students", icon: UsersRound, group: "Hostel" },
  { label: "Dormitories", href: "live-hostel-status", icon: Building2, group: "Hostel" },
  { label: "Roll Call", href: "roll-call", icon: ClipboardCheck, group: "Safety" },
  { label: "Discipline", href: "discipline", icon: ShieldAlert, group: "Safety" },
  { label: "Sick Bay / Clinic", href: "clinic-health", icon: Stethoscope, group: "Welfare" },
  { label: "Visitors", href: "visitor-control", icon: UserCheck, group: "Movement" },
  { label: "Leave Out / Exits", href: "leave-outs", icon: DoorOpen, group: "Movement" },
  { label: "Dining & Meals", href: "dining", icon: Utensils, group: "Operations" },
  { label: "Laundry", href: "laundry", icon: ShowerHead, group: "Operations" },
  { label: "Maintenance Requests", href: "maintenance", icon: Wrench, group: "Operations" },
  { label: "Prefects", href: "prefects", icon: ShieldCheck, group: "Operations" },
  { label: "Night Patrol Logs", href: "night-operations", icon: Moon, group: "Night" },
  { label: "Parent Communication", href: "parent-communication", icon: MessageSquareText, group: "Communication" },
  { label: "Reports", href: "analytics", icon: FileBarChart2, group: "Intelligence" },
  { label: "AI Insights", href: "ai-insights", icon: BrainCircuit, group: "Intelligence" },
  { label: "Settings", href: "settings", icon: Settings, group: "Administration" },
];

const kpis: Kpi[] = [
  { label: "Total Boarders", value: "1,248", detail: "642 boys, 606 girls", sub: "1,231 present tonight, 17 absent", tone: "cyan", icon: BedDouble, points: [1180, 1196, 1211, 1220, 1238, 1242, 1248] },
  { label: "Roll Call Status", value: "92%", detail: "18 dorms complete, 2 pending", sub: "5 missing students unresolved", tone: "danger", icon: ClipboardCheck, points: [61, 70, 74, 81, 86, 89, 92] },
  { label: "Discipline Alerts", value: "14", detail: "2 sneaking, 3 bullying, 1 dorm fight", sub: "8 noise violations need follow-up", tone: "warning", icon: ShieldAlert, points: [5, 7, 6, 9, 11, 12, 14] },
  { label: "Sick Students", value: "23", detail: "9 in clinic, 2 serious cases", sub: "12 medication reminders before lights-out", tone: "info", icon: HeartPulse, points: [12, 16, 14, 19, 18, 21, 23] },
  { label: "Visitors Today", value: "41", detail: "33 approved, 5 parents inside", sub: "3 unauthorized attempts blocked", tone: "safe", icon: UserCheck, points: [8, 14, 19, 24, 31, 38, 41] },
  { label: "Maintenance Issues", value: "18", detail: "Broken beds, water, electricity", sub: "6 toilet repairs active", tone: "warning", icon: Wrench, points: [11, 13, 12, 15, 16, 17, 18] },
];

const dorms: DormCard[] = [
  { name: "Dorm A — Boys", occupancy: "184 / 200", capacity: 92, captain: "Peter Odhiambo", cleanliness: "91%", noise: "Low", lights: "Lights off compliant", water: "Water okay", issues: "3 discipline cases, 1 sick student", tone: "warning" },
  { name: "Dorm B — Boys", occupancy: "211 / 220", capacity: 96, captain: "Kevin Maina", cleanliness: "74%", noise: "High", lights: "Back corridor breach", water: "Low pressure", issues: "Possible bullying cluster detected", tone: "danger" },
  { name: "Dorm C — Girls", occupancy: "176 / 190", capacity: 93, captain: "Achieng Wekesa", cleanliness: "96%", noise: "Calm", lights: "Lights off compliant", water: "Water okay", issues: "No major incident detected", tone: "safe" },
  { name: "Dorm D — Girls", occupancy: "162 / 210", capacity: 77, captain: "Njeri Kariuki", cleanliness: "88%", noise: "Moderate", lights: "Pending prefect confirmation", water: "Water okay", issues: "2 maintenance requests open", tone: "info" },
];

const rollCallRows: RollCallRow[] = [
  { avatar: "KO", admission: "KB/1042", name: "Kevin Otieno", dorm: "Dorm B", status: "Missing", time: "21:18", checkedBy: "Prefect Maina", notes: "Missed 3 night roll calls this month", tone: "danger" },
  { avatar: "AN", admission: "KB/0881", name: "Amina Njoroge", dorm: "Dorm C", status: "Present", time: "21:03", checkedBy: "Matron Achieng", notes: "Cleared after clinic review", tone: "safe" },
  { avatar: "BM", admission: "KB/1197", name: "Brian Mwangi", dorm: "Dorm A", status: "Late", time: "21:22", checkedBy: "Mr. Barasa", notes: "Returned from dining hall duty", tone: "warning" },
  { avatar: "JO", admission: "KB/0744", name: "Joy Ouma", dorm: "Dorm D", status: "Sick bay", time: "20:47", checkedBy: "Nurse Wairimu", notes: "Medication reminder at 22:00", tone: "info" },
  { avatar: "EM", admission: "KB/0660", name: "Elijah Mutua", dorm: "Dorm A", status: "Excused", time: "20:52", checkedBy: "Deputy Principal", notes: "Parent-approved leave out", tone: "cyan" },
  { avatar: "DN", admission: "KB/0912", name: "Diana Nyambura", dorm: "Dorm C", status: "Suspended", time: "18:30", checkedBy: "Boarding Office", notes: "Boarding privileges suspended", tone: "danger" },
];

const welfareRisks = [
  { name: "Kevin Otieno", issue: "Misses roll calls often", score: 94, detail: "Repeated discipline issues and emotional withdrawal pattern.", tone: "danger" as Tone },
  { name: "Joy Ouma", issue: "Frequent clinic visits", score: 81, detail: "Clinic visits increased with declining meal attendance.", tone: "warning" as Tone },
  { name: "Brian Mwangi", issue: "Fee stress and late returns", score: 76, detail: "Parent complaints and dorm social mapping show isolation.", tone: "warning" as Tone },
  { name: "Amina Njoroge", issue: "Bullying report witness", score: 58, detail: "Needs quiet follow-up before prep tomorrow.", tone: "info" as Tone },
];

const patrolTimeline: FeedItem[] = [
  { title: "Patrol round completed", detail: "Dorm A and C inspected, corridors quiet, photo uploaded.", time: "21:40", tone: "safe" },
  { title: "Officer on duty changed", detail: "Mr. Barasa handed over to Matron Achieng with voice note.", time: "21:15", tone: "info" },
  { title: "Dorm B corridor check", detail: "Noise spike recorded, prefect asked to stabilize room 12.", time: "20:56", tone: "warning" },
  { title: "Incident recorded", detail: "Student found outside dorm after lights-out near laundry block.", time: "20:41", tone: "danger" },
];

const incidents: FeedItem[] = [
  { title: "Student found outside dorm", detail: "Dorm B learner found near laundry block after lights-out.", time: "11 min ago", tone: "danger", actions: ["Assign punishment", "Notify parent", "Escalate to deputy principal"] },
  { title: "Bullying report", detail: "Possible bullying cluster detected around Dorm B lower wing.", time: "28 min ago", tone: "warning", actions: ["Launch welfare check", "Notify guardian"] },
  { title: "Contraband confiscated", detail: "Unauthorized phone recovered during prefect inspection.", time: "1 hr ago", tone: "warning", actions: ["Suspend boarding privileges"] },
  { title: "Dorm vandalism", detail: "Broken window latch reported by Dorm A captain.", time: "today", tone: "info", actions: ["Create maintenance ticket"] },
];

const healthCards = [
  ["Sick students", "23", "9 currently in clinic, 2 serious cases under watch", HeartPulse, "warning"],
  ["Isolation cases", "3", "Respiratory symptoms separated from dorm population", ShieldAlert, "danger"],
  ["Medication schedule", "12", "Before lights-out reminders queued", Clock, "info"],
  ["Emergency referrals", "1", "Parent and principal notified", Siren, "danger"],
] as const;

const visitors = [
  ["Mrs. Wanjiku", "29814488", "Brian Mwangi", "Parent visit", "15:12", "17:00", "Security approved"],
  ["Kisumu Repairs", "Work order", "Dorm A", "Toilet repairs", "13:44", "16:30", "Maintenance escort"],
  ["Mr. Otieno", "23390121", "Kevin Otieno", "Pickup request", "Pending", "Pending", "Requires approval"],
] as const;

const diningMetrics = [
  ["Meal attendance", "96%", "Dinner scanned by RFID and prefect count", Utensils, "safe"],
  ["Food stock warnings", "4", "Maize flour, beans, oil, milk under threshold", AlertTriangle, "warning"],
  ["Nutrition alerts", "7", "Repeated missed meals and low-energy clinic notes", HeartPulse, "danger"],
  ["Kitchen hygiene reports", "Clean", "Inspection photo uploaded at 18:20", CheckCircle2, "safe"],
] as const;

const aiInsights = [
  ["Dorm B has rising indiscipline trend.", "Noise, missed roll calls, and corridor movement increased this week.", "92% confidence", "danger"],
  ["Student Kevin missed 3 night roll calls this month.", "Pattern suggests targeted welfare and discipline follow-up tonight.", "96% confidence", "danger"],
  ["Possible bullying cluster detected.", "Dorm social mapping highlights repeated reports near Dorm B lower wing.", "84% confidence", "warning"],
  ["Clinic visits increased by 40% this week.", "Watch fake sickness claims and possible early outbreak signals.", "78% confidence", "warning"],
  ["Water consumption anomaly detected.", "Dorm A usage rose sharply after prep, inspect leakage or misuse.", "81% confidence", "info"],
] as const;

const analytics = [
  { title: "Attendance Trends", detail: "Weekly hostel attendance", tone: "safe" as Tone, values: [92, 94, 93, 96, 95, 97, 96] },
  { title: "Discipline Heatmap", detail: "Dorms with most incidents", tone: "danger" as Tone, values: [18, 24, 17, 31, 28, 36, 42] },
  { title: "Clinic Visits Trend", detail: "Health patterns", tone: "warning" as Tone, values: [8, 11, 9, 15, 17, 21, 23] },
  { title: "Dorm Occupancy", detail: "Capacity utilization", tone: "cyan" as Tone, values: [77, 88, 92, 93, 94, 96, 92] },
  { title: "Night Incident Timeline", detail: "Incident frequency by time", tone: "info" as Tone, values: [2, 4, 3, 8, 6, 5, 9] },
  { title: "Student Welfare Risk Graph", detail: "AI risk trends", tone: "warning" as Tone, values: [31, 36, 42, 39, 48, 56, 63] },
];

const quickActions = [
  ["Start Roll Call", ClipboardCheck],
  ["Report Incident", ShieldAlert],
  ["Send Parent SMS", MessageSquareText],
  ["Add Sick Student", Stethoscope],
  ["Assign Dorm", Building2],
  ["Emergency Alert", Siren],
  ["Print Dorm List", FileBarChart2],
  ["Notify Security", RadioTower],
] as const;

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
  const points = values.map((value, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * 100;
    const y = 100 - ((value - Math.min(...values)) / Math.max(Math.max(...values) - Math.min(...values), 1)) * 80 - 10;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox="0 0 100 100" className="h-16 w-full overflow-visible" role="img" aria-label="Trend chart">
      <defs>
        <linearGradient id={`boarding-line-${tone}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={tone === "danger" ? "#fb7185" : tone === "warning" ? "#FF7A1A" : tone === "safe" ? "#6EE7B7" : "#22D3EE"} />
          <stop offset="100%" stopColor={tone === "danger" ? "#f43f5e" : tone === "warning" ? "#FDBA74" : tone === "safe" ? "#34D399" : "#60A5FA"} />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke={`url(#boarding-line-${tone})`} strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" points={points} />
      <polygon points={`0,100 ${points} 100,100`} fill={tone === "danger" ? "rgba(244,63,94,0.16)" : tone === "warning" ? "rgba(255,122,26,0.16)" : "rgba(34,211,238,0.14)"} />
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
    <section id={id} className={cn("rounded-[var(--radius-xl)] border border-white/12 bg-[#071D49] p-5 text-white shadow-[0_20px_60px_rgba(7,29,73,0.18)]", className)}>
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
      aria-label="Boarding master dashboard navigation"
      className="hidden h-full rounded-[var(--radius-xl)] border border-[#C8D5EA]/50 bg-[#071D49] p-4 text-white shadow-[0_24px_70px_rgba(7,29,73,0.22)] xl:sticky xl:top-5 xl:block"
    >
      <div className="rounded-[var(--radius-lg)] border border-white/10 bg-white/[0.06] p-4">
        <p className="text-xs font-black uppercase text-cyan-200">Hostel command</p>
        <h2 className="mt-2 text-2xl font-black">Boarding Control</h2>
        <p className="mt-2 text-sm leading-6 text-white/66">Student welfare, discipline, safety, and dormitory operations in one live view.</p>
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
                      "flex min-h-10 items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-sm font-bold transition hover:-translate-y-0.5",
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
      <div className="mt-5 rounded-[var(--radius-lg)] border border-emerald-300/20 bg-emerald-400/10 p-4">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-100/70">Tonight</p>
        <p className="mt-2 text-sm font-black">Hostel command active</p>
        <p className="mt-1 text-xs leading-5 text-white/58">Night patrol, roll call, clinic, dining, exits, and parent alerts monitored.</p>
      </div>
    </aside>
  );
}

function TopNav({
  now,
  searchTerm,
  searchResults,
  onQuickResponse,
  onSearchResult,
  onSearchTermChange,
}: {
  now: Date | null;
  searchTerm: string;
  searchResults: BoardingSearchRecord[];
  onQuickResponse: () => void;
  onSearchResult: (record: BoardingSearchRecord) => void;
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
    : "Live hostel clock syncing";

  return (
    <header className="rounded-[var(--radius-xl)] border border-[#C8D5EA]/70 bg-white/92 p-4 shadow-[0_18px_55px_rgba(7,29,73,0.1)] backdrop-blur-xl">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)] lg:items-start">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#071D49] text-sm font-black text-white">MS</div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#5F6F89]">MyShule boarding office</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-[#071D49] md:text-3xl">Boarding Master Command Center</h1>
            <p className="mt-2 text-sm font-bold text-[#5F6F89]">{timeLabel} · Term 2 Week 4 · Mr. Barasa</p>
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
              aria-label="Search boarding students, dormitories, roll call, clinic, visitors, or incidents"
              placeholder="Search student, dorm, roll call, clinic, visitor, or incident"
              className="h-12 w-full rounded-[var(--radius-lg)] border border-[#C8D5EA] bg-[#F8FAFC] pl-12 pr-4 text-sm font-semibold text-[#071D49] outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-300/20"
            />
            {searchTerm.trim().length > 0 ? (
              <div className="absolute left-0 right-0 top-14 z-20 overflow-hidden rounded-[var(--radius-lg)] border border-[#C8D5EA] bg-white text-[#071D49] shadow-2xl">
                {searchResults.length > 0 ? (
                  searchResults.map((record) => (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => onSearchResult(record)}
                      className="block w-full px-4 py-3 text-left text-sm transition hover:bg-cyan-50"
                    >
                      <span className="block font-black">{record.label}</span>
                      <span className="mt-1 block text-xs font-semibold text-[#5F6F89]">{record.detail}</span>
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-3 text-sm font-bold text-[#5F6F89]">No matching boarding record found.</p>
                )}
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LightStatusChip icon={Siren} label="Emergency ready" tone="danger" />
            <LightStatusChip icon={Bell} label="19 notifications" tone="warning" />
            <LightStatusChip icon={Moon} label="Night mode armed" tone="info" />
            <LightStatusChip icon={BrainCircuit} label="AI assistant" tone="cyan" />
            <button
              type="button"
              onClick={onQuickResponse}
              className="inline-flex min-h-9 items-center gap-2 rounded-[var(--radius)] bg-[#071D49] px-3 text-xs font-black text-white"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Quick response
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const questions = [
    "Which students are missing?",
    "Which dorm has issues?",
    "Who is sick?",
    "Who sneaked out?",
    "Are lights-out and roll-call compliance okay?",
    "Are there emergencies?",
  ];

  return (
    <section className="overflow-hidden rounded-[var(--radius-xl)] border border-[#C8D5EA]/45 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_28%),linear-gradient(135deg,#071D49_0%,#102A60_58%,#0F2345_100%)] p-5 text-white shadow-[0_24px_70px_rgba(7,29,73,0.2)] md:p-7">
      <div className="grid gap-7 xl:grid-cols-[minmax(0,1.06fr)_430px] xl:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusChip icon={ShieldCheck} label="Hostel safety live" tone="safe" />
            <StatusChip icon={RadioTower} label="Roll-call telemetry active" tone="cyan" />
          </div>
          <h2 className="mt-6 max-w-4xl text-4xl font-black leading-tight md:text-6xl">Boarding Master Command Center</h2>
          <p className="mt-5 max-w-3xl text-base leading-8 text-white/72">
            Nothing happening in the hostel can escape this system.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {questions.map((question, index) => (
              <div
                key={question}
                className={cn(
                  "rounded-[var(--radius-lg)] border p-4",
                  toneStyles[index === 3 || index === 5 ? "danger" : index === 1 || index === 4 ? "warning" : "cyan"].border,
                  toneStyles[index === 3 || index === 5 ? "danger" : index === 1 || index === 4 ? "warning" : "cyan"].bg,
                )}
              >
                <p className="text-sm font-black leading-5">{question}</p>
                <span className={cn("mt-4 block h-2 w-16 rounded-full", toneStyles[index === 3 || index === 5 ? "danger" : index === 1 || index === 4 ? "warning" : "cyan"].dot)} />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-white/12 bg-white/[0.07] p-5 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-black">Tonight risk posture</h3>
              <p className="mt-1 text-sm text-white/62">Missing, sick bay, dorm pressure, and emergency readiness</p>
            </div>
            <StatusChip icon={Activity} label="Live" tone="safe" />
          </div>
          <div className="mt-6">
            <MiniLine values={[71, 74, 70, 82, 79, 88, 92]} tone="cyan" />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-[var(--radius-lg)] border border-emerald-300/25 bg-emerald-400/10 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-100/70">Safe dorms</p>
              <p className="mt-2 text-3xl font-black">18/20</p>
            </div>
            <div className="rounded-[var(--radius-lg)] border border-rose-300/30 bg-rose-500/12 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-rose-100/70">Unresolved</p>
              <p className="mt-2 text-3xl font-black">5</p>
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
      className={cn("rounded-[var(--radius-xl)] border bg-[#071D49] p-5 text-white", toneStyles[item.tone].border, toneStyles[item.tone].glow)}
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

function LiveHostelStatus() {
  return (
    <SectionCard
      id="live-hostel-status"
      eyebrow="Live hostel status"
      title="Live hostel status"
      description="Dormitory cards expose occupancy, cleanliness, noise, lights-out compliance, water status, and active issues before they become crises."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {dorms.map((dorm) => {
          const statusMetrics: Array<{ label: string; value: string; icon: LucideIcon }> = [
            { label: "Cleanliness score", value: dorm.cleanliness, icon: ShieldCheck },
            { label: "Noise level", value: dorm.noise, icon: Bell },
            { label: "Lights status", value: dorm.lights, icon: Lightbulb },
            { label: "Water status", value: dorm.water, icon: Droplets },
          ];

          return (
            <article key={dorm.name} className={cn("rounded-[var(--radius-xl)] border p-4", toneStyles[dorm.tone].border, toneStyles[dorm.tone].bg)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black">{dorm.name}</h3>
                  <p className="mt-1 text-sm text-white/64">{dorm.occupancy} · Dorm captain {dorm.captain}</p>
                </div>
                <span className={cn("rounded-full border px-2.5 py-1 text-xs font-black", toneStyles[dorm.tone].chip)}>{dorm.capacity}% occupied</span>
              </div>
              <ProgressBar value={dorm.capacity} tone={dorm.tone} />
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {statusMetrics.map(({ label, value, icon: Icon }) => (
                  <div key={label} className="rounded-[var(--radius-lg)] border border-white/10 bg-white/[0.06] p-3">
                    <Icon className="h-4 w-4 text-cyan-100" aria-hidden="true" />
                    <p className="mt-2 text-[11px] font-black uppercase tracking-[0.12em] text-white/45">{label}</p>
                    <p className="mt-1 text-sm font-black text-white">{value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 rounded-[var(--radius-lg)] border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-bold text-white/78">{dorm.issues}</p>
            </article>
          );
        })}
      </div>
    </SectionCard>
  );
}

function RollCallCenter() {
  return (
    <SectionCard
      id="roll-call"
      eyebrow="Roll call center"
      title="Roll call center"
      description="Live roll call table with photo identity, admission numbers, dorm assignment, checked-by trail, QR scanning, RFID, and biometric support."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <StatusChip icon={ClipboardCheck} label="QR scanning ready" tone="cyan" />
        <StatusChip icon={RadioTower} label="RFID synced" tone="safe" />
        <StatusChip icon={LockKeyhole} label="Biometric verification" tone="info" />
      </div>
      <div className="overflow-x-auto rounded-[var(--radius-xl)] border border-white/10">
        <table className="min-w-[920px] w-full text-left text-sm">
          <thead className="bg-white/[0.06] text-xs uppercase tracking-[0.14em] text-white/45">
            <tr>
              {["Student photo", "Admission number", "Name", "Dorm", "Roll call status", "Time checked", "Checked by", "Notes"].map((header) => (
                <th key={header} className="px-4 py-3 font-black">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rollCallRows.map((row) => (
              <tr key={row.admission} className="bg-white/[0.025]">
                <td className="px-4 py-4">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-xs font-black text-white">{row.avatar}</span>
                </td>
                <td className="px-4 py-4 font-bold text-white/70">{row.admission}</td>
                <td className="px-4 py-4 font-black">{row.name}</td>
                <td className="px-4 py-4 text-white/70">{row.dorm}</td>
                <td className="px-4 py-4"><span className={cn("rounded-full border px-2.5 py-1 text-xs font-black", toneStyles[row.tone].chip)}>{row.status}</span></td>
                <td className="px-4 py-4 text-white/70">{row.time}</td>
                <td className="px-4 py-4 text-white/70">{row.checkedBy}</td>
                <td className="px-4 py-4 text-white/70">{row.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function StudentWelfareMonitor() {
  return (
    <SectionCard
      id="boarding-students"
      eyebrow="Student welfare monitor"
      title="Student welfare monitor"
      description="AI risk scoring combines repeated discipline, clinic visits, missed roll calls, emotional distress patterns, fee stress, and bullying reports."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {welfareRisks.map((risk) => (
          <article key={risk.name} className={cn("rounded-[var(--radius-xl)] border p-4", toneStyles[risk.tone].border, toneStyles[risk.tone].bg)}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black">{risk.name}</h3>
                <p className="mt-1 text-sm font-bold text-white/70">{risk.issue}</p>
              </div>
              <span className={cn("rounded-full border px-2.5 py-1 text-xs font-black", toneStyles[risk.tone].chip)}>AI risk scoring {risk.score}%</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/70">{risk.detail}</p>
            <ProgressBar value={risk.score} tone={risk.tone} />
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-black uppercase tracking-[0.12em] text-white/52">
              <span>Behavioral trend graphs</span>
              <span>Dorm social mapping</span>
            </div>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}

function TimelineList({
  items,
  onTimelineAction,
}: {
  items: FeedItem[];
  onTimelineAction: (action: BoardingTimelineAction) => void;
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <article key={`${item.title}-${item.time}`} className={cn("rounded-[var(--radius-lg)] border p-4", toneStyles[item.tone].border, toneStyles[item.tone].bg)}>
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
                      onClick={() => onTimelineAction({ action, item })}
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

function NightAndDiscipline({
  onTimelineAction,
}: {
  onTimelineAction: (action: BoardingTimelineAction) => void;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <SectionCard
        id="night-operations"
        eyebrow="Night operations"
        title="Night operations"
        description="Night patrol timeline records rounds completed, officer on duty, dorm inspected, notes, incidents, photo uploads, and voice notes."
      >
        <TimelineList items={patrolTimeline} onTimelineAction={onTimelineAction} />
      </SectionCard>
      <SectionCard
        id="discipline"
        eyebrow="Discipline command"
        title="Discipline command center"
        description="Live incidents feed keeps sneaking, bullying, contraband, vandalism, and unauthorized phone cases action-ready."
      >
        <TimelineList items={incidents} onTimelineAction={onTimelineAction} />
      </SectionCard>
    </div>
  );
}

function ClinicVisitorDining() {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
      <SectionCard
        id="clinic-health"
        eyebrow="Clinic and health"
        title="Clinic & health"
        description="Health overview helps prevent fake sickness, undetected outbreaks, emergency negligence, and missed medication."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {healthCards.map(([title, value, detail, Icon, tone]) => (
            <article key={title} className={cn("rounded-[var(--radius-lg)] border p-4", toneStyles[tone as Tone].border, toneStyles[tone as Tone].bg)}>
              <IconFrame icon={Icon} tone={tone as Tone} />
              <h3 className="mt-3 font-black">{title}</h3>
              <p className="mt-1 text-3xl font-black">{value}</p>
              <p className="mt-1 text-sm leading-5 text-white/64">{detail}</p>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        id="visitor-control"
        eyebrow="Visitor control"
        title="Visitor control"
        description="Visitor log tracks parent visits, pickups, outsourced workers, deliveries, national ID, check-in/out, photo capture, and security approval."
      >
        <div className="space-y-3">
          {visitors.map(([name, id, student, purpose, inTime, outTime, status]) => (
            <article key={`${name}-${student}`} className="rounded-[var(--radius-lg)] border border-white/10 bg-white/[0.06] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-black">{name}</h3>
                  <p className="mt-1 text-sm text-white/62">National ID: {id} · Student visited: {student}</p>
                  <p className="mt-1 text-sm text-white/62">{purpose} · Check-in {inTime} · Check-out {outTime}</p>
                </div>
                <StatusChip icon={ShieldCheck} label={status} tone={status.includes("Requires") ? "danger" : "safe"} />
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        id="dining"
        eyebrow="Dining hall monitoring"
        title="Dining hall monitoring"
        description="Meal attendance, food stock warnings, nutrition alerts, missed meals, and kitchen hygiene reports stay connected to boarding risk."
        className="xl:col-span-2"
      >
        <div className="grid gap-3 md:grid-cols-4">
          {diningMetrics.map(([title, value, detail, Icon, tone]) => (
            <article key={title} className={cn("rounded-[var(--radius-lg)] border p-4", toneStyles[tone as Tone].border, toneStyles[tone as Tone].bg)}>
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

function AiInsights() {
  return (
    <SectionCard
      id="ai-insights"
      eyebrow="AI boarding intelligence"
      title="AI boarding insights"
      description="AI-assisted operational insights detect dorm trends, missing patterns, bullying clusters, clinic spikes, and water anomalies."
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {aiInsights.map(([title, detail, confidence, tone]) => (
          <article key={title} className={cn("rounded-[var(--radius-xl)] border p-4", toneStyles[tone as Tone].border, toneStyles[tone as Tone].bg)}>
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

function QuickActionsPanel({
  onDeskAction,
}: {
  onDeskAction: (action: BoardingDeskAction) => void;
}) {
  return (
    <SectionCard
      id="quick-actions"
      eyebrow="Quick actions"
      title="Quick actions panel"
      description="Fast response controls for roll call, incident logging, parent messaging, sick bay, dorm assignment, emergency alerts, dorm lists, and security notification."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map(([label, Icon]) => (
          <button
            key={label}
            type="button"
            onClick={() => onDeskAction({ label, source: "quick-actions" })}
            className="group flex min-h-20 items-center gap-3 rounded-[var(--radius-lg)] border border-white/12 bg-white/[0.07] p-4 text-left font-black text-white transition hover:-translate-y-1 hover:border-cyan-300/40 hover:bg-cyan-300/12"
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

function AnalyticsCharts() {
  return (
    <SectionCard
      id="analytics"
      eyebrow="Charts and analytics"
      title="Charts & analytics"
      description="Attendance trends, discipline heatmap, clinic visits, dorm occupancy, night incident timeline, and student welfare risk graph."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {analytics.map((item) => (
          <article key={item.title} className={cn("rounded-[var(--radius-xl)] border p-4", toneStyles[item.tone].border, toneStyles[item.tone].bg)}>
            <h3 className="font-black">{item.title}</h3>
            <p className="mt-1 text-sm text-white/60">{item.detail}</p>
            <MiniLine values={item.values} tone={item.tone} />
          </article>
        ))}
      </div>
    </SectionCard>
  );
}

function SupportPanels() {
  const panels = [
    ["Leave Out / Exits", "All approved exits require guardian verification, return time, and security handoff.", DoorOpen, "warning"],
    ["Laundry", "Laundry queues show 94% completion; missing uniform claims are tagged to dorm captains.", ShowerHead, "info"],
    ["Maintenance Requests", "Broken beds, water shortages, electricity problems, and toilet repairs stay visible.", Wrench, "warning"],
    ["Prefects", "Dorm captains and prefects submit photo-backed reports for each dorm zone.", ShieldCheck, "safe"],
    ["Parent Communication", "Parent complaints, SMS delivery, and escalation history are tied to the learner file.", MessageSquareText, "cyan"],
    ["Reports", "Print dorm list, roll-call summary, discipline report, clinic report, and night patrol log.", FileBarChart2, "info"],
  ] as const;

  return (
    <div id="leave-outs" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {panels.map(([title, detail, Icon, tone]) => (
        <article key={title} id={title === "Laundry" ? "laundry" : title === "Maintenance Requests" ? "maintenance" : title === "Prefects" ? "prefects" : title === "Parent Communication" ? "parent-communication" : title === "Reports" ? "reports" : undefined} className={cn("rounded-[var(--radius-xl)] border bg-[#071D49] p-5 text-white", toneStyles[tone as Tone].border)}>
          <IconFrame icon={Icon} tone={tone as Tone} />
          <h2 className="mt-4 text-xl font-black">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-white/64">{detail}</p>
        </article>
      ))}
    </div>
  );
}

function MobileQuickActions({
  onDeskAction,
}: {
  onDeskAction: (action: BoardingDeskAction) => void;
}) {
  const actions = [
    ["Roll Call", ClipboardCheck],
    ["Incident", ShieldAlert],
    ["Clinic", Stethoscope],
    ["SMS", MessageSquareText],
    ["Alert", Siren],
  ] as const;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#071D49] px-3 py-2 text-white shadow-[0_-20px_50px_rgba(7,29,73,0.25)] xl:hidden" aria-label="Mobile boarding quick actions">
      <div className="grid grid-cols-5 gap-1">
        {actions.map(([label, Icon]) => (
          <button
            key={label}
            type="button"
            onClick={() => onDeskAction({ label, source: "mobile" })}
            className="grid min-h-12 place-items-center rounded-[var(--radius)] text-[11px] font-black text-white/82"
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}

export function BoardingMasterCommandCenter({ routeMode }: { routeMode: BoardingRouteMode }) {
  const [now, setNow] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [notice, setNotice] = useState("Boarding desk ready for roll call, exeats, incidents, sick referrals, and parent SMS.");
  const [quickResponseOpen, setQuickResponseOpen] = useState(false);
  const [activeDeskAction, setActiveDeskAction] = useState<BoardingDeskAction | null>(null);
  const [activeTimelineAction, setActiveTimelineAction] = useState<BoardingTimelineAction | null>(null);
  const kpiItems = useMemo(() => kpis, []);
  const searchResults = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return [];

    return boardingSearchRecords.filter((record) =>
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

  function openSearchRecord(record: BoardingSearchRecord) {
    setSearchTerm("");
    setNotice(`${record.label} opened in boarding records.`);

    if (typeof document !== "undefined") {
      const target = document.getElementById(record.sectionId);
      target?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    }
  }

  function openQuickResponse() {
    setQuickResponseOpen(true);
    setNotice("Quick boarding response ready.");
  }

  function openDeskAction(action: BoardingDeskAction) {
    setActiveDeskAction(action);
    setNotice(`${action.label} ready for boarding desk action.`);
  }

  function openTimelineAction(action: BoardingTimelineAction) {
    setActiveTimelineAction(action);
    setNotice(`${action.action} ready for ${action.item.title}.`);
  }

  function saveQuickResponse() {
    const schoolId = getCurrentSchoolId();

    publishSchoolOperationalEvent({
      schoolId,
      type: "BOARDING_QUICK_RESPONSE_RECORDED",
      module: "boarding",
      actorRole: "Boarding Master",
      title: "Quick boarding response saved",
      body: "Boarding Master recorded a hostel follow-up response for roll call, safety, clinic, or parent SMS follow-up.",
      entityId: "boarding-quick-response",
      severity: "info",
      payload: {
        action: "Quick boarding response",
        dorm: "Dorm B",
        learner: "Kevin Otieno",
        followUp: "Roll call and hostel welfare follow-up",
      },
      notifications: [
        {
          audienceRoles: ["Deputy Principal", "Principal", "Security Officer", "Nurse"],
          title: "Boarding response recorded",
          body: "Boarding Master saved a hostel follow-up response for same-school action visibility.",
          severity: "info",
          relatedModule: "boarding",
          relatedRecordId: "boarding-quick-response",
          requiresAction: true,
          requestStatus: "Pending",
        },
      ],
    });

    setQuickResponseOpen(false);
    setNotice("Quick boarding response saved.");
  }

  function saveDeskAction() {
    if (!activeDeskAction) return;

    const schoolId = getCurrentSchoolId();
    const entityId = `boarding-desk-${activeDeskAction.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const isUrgent = /emergency|alert|security|incident|sick/i.test(activeDeskAction.label);

    publishSchoolOperationalEvent({
      schoolId,
      type: "BOARDING_DESK_ACTION_RECORDED",
      module: "boarding",
      actorRole: "Boarding Master",
      title: `${activeDeskAction.label} saved for boarding desk action`,
      body: `Boarding Master recorded ${activeDeskAction.label.toLowerCase()} from ${activeDeskAction.source} controls.`,
      entityId,
      severity: isUrgent ? "critical" : "info",
      payload: {
        action: activeDeskAction.label,
        source: activeDeskAction.source,
        dashboard: "boarding-master",
      },
      notifications: [
        {
          audienceRoles: ["Deputy Principal", "Principal", "Security Officer", "Nurse"],
          title: `${activeDeskAction.label} recorded`,
          body: `${activeDeskAction.label} was saved from the Boarding Master dashboard.`,
          severity: isUrgent ? "critical" : "info",
          relatedModule: "boarding",
          relatedRecordId: entityId,
          requiresAction: isUrgent,
          requestStatus: "Pending",
        },
      ],
    });

    setNotice(`${activeDeskAction.label} saved for boarding desk action.`);
    setActiveDeskAction(null);
  }

  function saveTimelineAction() {
    if (!activeTimelineAction) return;

    const schoolId = getCurrentSchoolId();
    const entityId = `boarding-timeline-${activeTimelineAction.item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const isUrgent = activeTimelineAction.item.tone === "danger" || activeTimelineAction.item.tone === "warning";

    publishSchoolOperationalEvent({
      schoolId,
      type: "BOARDING_TIMELINE_ACTION_RECORDED",
      module: "boarding",
      actorRole: "Boarding Master",
      title: `${activeTimelineAction.action} saved for ${activeTimelineAction.item.title}`,
      body: `Boarding Master recorded ${activeTimelineAction.action.toLowerCase()} for ${activeTimelineAction.item.title}.`,
      entityId,
      severity: isUrgent ? "critical" : "info",
      payload: {
        action: activeTimelineAction.action,
        itemTitle: activeTimelineAction.item.title,
        itemDetail: activeTimelineAction.item.detail,
        itemTime: activeTimelineAction.item.time,
        dashboard: "boarding-master",
      },
      notifications: [
        {
          audienceRoles: ["Deputy Principal", "Principal", "Security Officer", "Discipline Master"],
          title: `${activeTimelineAction.action} recorded`,
          body: `${activeTimelineAction.action} was saved for ${activeTimelineAction.item.title}.`,
          severity: isUrgent ? "critical" : "info",
          relatedModule: "boarding",
          relatedRecordId: entityId,
          requiresAction: isUrgent,
          requestStatus: "Pending",
        },
      ],
    });

    setNotice(`${activeTimelineAction.action} saved for ${activeTimelineAction.item.title}.`);
    setActiveTimelineAction(null);
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
            onQuickResponse={openQuickResponse}
            onSearchResult={openSearchRecord}
            onSearchTermChange={setSearchTerm}
          />
          <div role="status" className="rounded-[var(--radius-lg)] border border-[#C8D5EA] bg-white px-4 py-3 text-sm font-black text-[#071D49] shadow-[0_14px_34px_rgba(7,29,73,0.08)]">
            {notice}
          </div>
          {quickResponseOpen ? (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Boarding quick response"
              className="rounded-[var(--radius-xl)] border border-[#C8D5EA] bg-white p-4 text-[#071D49] shadow-[0_18px_55px_rgba(7,29,73,0.12)] md:p-5"
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5F6F89]">Same-school hostel follow-up</p>
                  <h2 className="mt-2 text-2xl font-black">Quick boarding response</h2>
                  <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#5F6F89]">
                    Save a boarding follow-up that is visible to Principal, Deputy, Security, and Nurse dashboards inside this school only.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      ["Dorm", "Dorm B"],
                      ["Learner", "Kevin Otieno"],
                      ["Linked desks", "Deputy, Security, Nurse"],
                      ["Scope", "Current school only"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-[var(--radius-lg)] border border-[#C8D5EA] bg-[#F8FAFC] p-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#5F6F89]">{label}</p>
                        <p className="mt-1 text-sm font-black">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <button
                    type="button"
                    onClick={saveQuickResponse}
                    className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius)] bg-[#071D49] px-4 text-sm font-black text-white"
                  >
                    Save boarding response
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickResponseOpen(false)}
                    className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius)] border border-[#C8D5EA] bg-white px-4 text-sm font-black text-[#071D49]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          {activeDeskAction ? (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Boarding desk action"
              className="rounded-[var(--radius-xl)] border border-[#C8D5EA] bg-white p-4 text-[#071D49] shadow-[0_18px_55px_rgba(7,29,73,0.12)] md:p-5"
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5F6F89]">Same-school boarding action</p>
                  <h2 className="mt-2 text-2xl font-black">{activeDeskAction.label}</h2>
                  <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#5F6F89]">
                    Save this boarding action so the connected Deputy, Principal, Security, and Nurse desks can see the update inside this school only.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      ["Action source", activeDeskAction.source === "mobile" ? "Mobile boarding actions" : "Quick actions panel"],
                      ["Follow-up owner", "Boarding Master"],
                      ["Linked desks", "Deputy, Principal, Security, Nurse"],
                      ["Scope", getCurrentSchoolId()],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-[var(--radius-lg)] border border-[#C8D5EA] bg-[#F8FAFC] p-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#5F6F89]">{label}</p>
                        <p className="mt-1 text-sm font-black">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <button
                    type="button"
                    onClick={saveDeskAction}
                    className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius)] bg-[#071D49] px-4 text-sm font-black text-white"
                  >
                    Save boarding desk action
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDeskAction(null)}
                    className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius)] border border-[#C8D5EA] bg-white px-4 text-sm font-black text-[#071D49]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          {activeTimelineAction ? (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Boarding timeline action"
              className="rounded-[var(--radius-xl)] border border-[#C8D5EA] bg-white p-4 text-[#071D49] shadow-[0_18px_55px_rgba(7,29,73,0.12)] md:p-5"
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5F6F89]">Same-school timeline action</p>
                  <h2 className="mt-2 text-2xl font-black">{activeTimelineAction.action}</h2>
                  <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#5F6F89]">
                    Record this action against the selected boarding timeline item and notify the relevant school operations desks.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      ["Related item", activeTimelineAction.item.title],
                      ["Timeline", activeTimelineAction.item.time],
                      ["Follow-up desks", "Deputy, Principal, Security, Discipline"],
                      ["Scope", getCurrentSchoolId()],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-[var(--radius-lg)] border border-[#C8D5EA] bg-[#F8FAFC] p-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#5F6F89]">{label}</p>
                        <p className="mt-1 text-sm font-black">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <button
                    type="button"
                    onClick={saveTimelineAction}
                    className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius)] bg-[#071D49] px-4 text-sm font-black text-white"
                  >
                    Save timeline action
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTimelineAction(null)}
                    className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius)] border border-[#C8D5EA] bg-white px-4 text-sm font-black text-[#071D49]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          <Hero />
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {kpiItems.map((item, index) => (
              <KpiCard key={item.label} item={item} index={index} />
            ))}
          </section>
          <LiveHostelStatus />
          <RollCallCenter />
          <StudentWelfareMonitor />
          <NightAndDiscipline onTimelineAction={openTimelineAction} />
          <ClinicVisitorDining />
          <AiInsights />
          <QuickActionsPanel onDeskAction={openDeskAction} />
          <AnalyticsCharts />
          <SupportPanels />
        </main>
      </div>
      <MobileQuickActions onDeskAction={openDeskAction} />
    </div>
  );
}
