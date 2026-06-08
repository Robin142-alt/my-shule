"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Bell,
  BrainCircuit,
  Bus,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileBarChart2,
  FileText,
  GraduationCap,
  Home,
  MessageSquareText,
  PackageCheck,
  RadioTower,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Stethoscope,
  UsersRound,
  UserRoundCheck,
  type LucideIcon,
} from "lucide-react";

import {
  getCurrentSchoolId,
  publishSchoolOperationalEvent,
  type SchoolOperationalEvent,
} from "@/lib/school/school-operational-store";
import { useQueryClient } from "@tanstack/react-query";
import { useSchoolMutation } from "@/lib/data/school-hooks";

function runtimeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
}

type DeputyRouteMode = "hosted" | "public";
type Tone = "calm" | "info" | "success" | "warning" | "danger" | "cyan";

type DeputyNavItem = {
  label: string;
  icon: LucideIcon;
  href: string;
  group: string;
  active?: boolean;
};

type Kpi = {
  label: string;
  value: string;
  helper: string;
  trend: string;
  tone: Tone;
  icon: LucideIcon;
  points: number[];
};

type CriticalAlert = {
  title: string;
  detail: string;
  time: string;
  affected: string;
  status: string;
  tone: Tone;
  actions: string[];
};

type Insight = {
  title: string;
  detail: string;
  confidence: string;
  tone: Tone;
};

type MetricRow = {
  label: string;
  value: string;
  helper: string;
  tone: Tone;
};

const deputySearchRecords = [
  { id: "bullying-form-3", label: "Bullying incident", detail: "Form 3 North | investigation due before lunch", sectionId: "critical-alerts" },
  { id: "teacher-late", label: "Late teachers", detail: "2 staff late | lesson coverage required", sectionId: "teachers" },
  { id: "absent-students", label: "Absent students", detail: "127 absent today | parent follow-up queue", sectionId: "attendance" },
  { id: "boarding-dorm-b", label: "Dorm B incident", detail: "Movement after evening prep", sectionId: "boarding" },
  { id: "parent-complaints", label: "Parent complaints", detail: "11 open complaints | 4 need response today", sectionId: "parents" },
] satisfies Array<{ id: string; label: string; detail: string; sectionId: string }>;

type DeputySearchRecord = (typeof deputySearchRecords)[number];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const toneStyles: Record<Tone, { border: string; bg: string; text: string; chip: string; dot: string; glow: string; icon: string }> = {
  calm: {
    border: "border-white/14",
    bg: "bg-white/[0.07]",
    text: "text-white/78",
    chip: "border-white/14 bg-white/10 text-white/80",
    dot: "bg-white/55",
    glow: "shadow-[0_18px_46px_rgba(7,29,73,0.18)]",
    icon: "text-white/72",
  },
  info: {
    border: "border-blue-300/32",
    bg: "bg-blue-400/12",
    text: "text-blue-100",
    chip: "border-blue-300/32 bg-blue-400/14 text-blue-100",
    dot: "bg-blue-300",
    glow: "shadow-[0_0_34px_rgba(37,99,235,0.16)]",
    icon: "text-blue-200",
  },
  success: {
    border: "border-emerald-300/35",
    bg: "bg-emerald-400/12",
    text: "text-emerald-100",
    chip: "border-emerald-300/35 bg-emerald-400/14 text-emerald-100",
    dot: "bg-emerald-300",
    glow: "shadow-[0_0_34px_rgba(16,185,129,0.18)]",
    icon: "text-emerald-200",
  },
  warning: {
    border: "border-orange-300/42",
    bg: "bg-[#FF7A1A]/14",
    text: "text-[#FFE1C8]",
    chip: "border-[#FF7A1A]/42 bg-[#FF7A1A]/16 text-[#FFE1C8]",
    dot: "bg-[#FF7A1A]",
    glow: "shadow-[0_0_38px_rgba(255,122,26,0.2)]",
    icon: "text-[#FFB36F]",
  },
  danger: {
    border: "border-rose-300/42",
    bg: "bg-rose-500/13",
    text: "text-rose-100",
    chip: "border-rose-300/42 bg-rose-500/15 text-rose-100",
    dot: "bg-rose-400",
    glow: "shadow-[0_0_42px_rgba(225,29,72,0.25)]",
    icon: "text-rose-200",
  },
  cyan: {
    border: "border-cyan-300/35",
    bg: "bg-cyan-400/12",
    text: "text-cyan-100",
    chip: "border-cyan-300/35 bg-cyan-400/14 text-cyan-100",
    dot: "bg-cyan-300",
    glow: "shadow-[0_0_34px_rgba(34,211,238,0.17)]",
    icon: "text-cyan-200",
  },
};

const navItems: DeputyNavItem[] = [
  { label: "Dashboard", icon: Home, href: "top", group: "Command", active: true },
  { label: "Discipline", icon: ShieldAlert, href: "discipline", group: "Operations" },
  { label: "Academics", icon: GraduationCap, href: "academics", group: "Operations" },
  { label: "Attendance", icon: UserRoundCheck, href: "attendance", group: "Operations" },
  { label: "Teachers", icon: UsersRound, href: "teachers", group: "Operations" },
  { label: "Exams", icon: ClipboardCheck, href: "exams", group: "Operations" },
  { label: "Timetable", icon: CalendarClock, href: "timetable", group: "Control" },
  { label: "Communication", icon: MessageSquareText, href: "parents", group: "Control" },
  { label: "Reports", icon: FileBarChart2, href: "reports", group: "Control" },
  { label: "AI Insights", icon: BrainCircuit, href: "ai-insights", group: "Intelligence" },
  { label: "Boarding", icon: ShieldCheck, href: "boarding", group: "Campus" },
  { label: "Transport", icon: Bus, href: "transport", group: "Campus" },
  { label: "Inventory Alerts", icon: PackageCheck, href: "inventory-alerts", group: "Campus" },
  { label: "Clinic Alerts", icon: Stethoscope, href: "clinic-alerts", group: "Campus" },
  { label: "Parents", icon: MessageSquareText, href: "parents", group: "Community" },
  { label: "Visitors", icon: RadioTower, href: "visitors", group: "Community" },
  { label: "Settings", icon: Settings, href: "settings", group: "Administration" },
];

const kpis: Kpi[] = [
  { label: "Total Students Present", value: "1,842", helper: "93.5% campus attendance", trend: "+2.4%", tone: "success", icon: UsersRound, points: [84, 86, 89, 91, 88, 92, 94] },
  { label: "Discipline Alerts", value: "17", helper: "3 discipline cases unresolved", trend: "urgent", tone: "danger", icon: ShieldAlert, points: [8, 10, 12, 9, 15, 13, 17] },
  { label: "Academic Risk Students", value: "64", helper: "KCSE candidates at risk increased by 12%", trend: "+12%", tone: "warning", icon: GraduationCap, points: [41, 46, 48, 53, 58, 61, 64] },
  { label: "Teacher Attendance", value: "96%", helper: "2 teachers late right now", trend: "stable", tone: "cyan", icon: UserRoundCheck, points: [92, 95, 94, 96, 93, 96, 96] },
  { label: "Pending Parent Complaints", value: "11", helper: "4 require deputy response today", trend: "-3", tone: "info", icon: MessageSquareText, points: [16, 14, 13, 15, 12, 11, 11] },
  { label: "Exam Preparedness", value: "81%", helper: "Form 4 moderation needs follow-up", trend: "+5%", tone: "success", icon: ClipboardCheck, points: [61, 66, 70, 73, 76, 79, 81] },
  { label: "Boarding Incidents", value: "5", helper: "Dorm B movement after prep", trend: "watched", tone: "warning", icon: ShieldCheck, points: [2, 3, 2, 4, 3, 4, 5] },
  { label: "Fee Defaulters Affecting Exams", value: "38", helper: "Exam clearance risk list", trend: "review", tone: "danger", icon: FileText, points: [29, 31, 35, 33, 36, 39, 38] },
];

const criticalAlerts: CriticalAlert[] = [
  {
    title: "Bullying incident reported",
    detail: "Form 3 North corridor cameras and two witness statements need investigation before lunch.",
    time: "7 min ago",
    affected: "4 learners, Form 3 North",
    status: "Escalation pending",
    tone: "danger",
    actions: ["Notify Parent", "Assign Investigation", "Notify Principal"],
  },
  {
    title: "Class absenteeism spike",
    detail: "Form 2 East has 18 learners absent after transport delay and clinic claims.",
    time: "18 min ago",
    affected: "Form 2 East",
    status: "Attendance team checking",
    tone: "warning",
    actions: ["Send Parent Alert", "Print Attendance Report"],
  },
  {
    title: "Teacher missed lesson",
    detail: "Mathematics double lesson has no marked coverage. Substitute teacher required.",
    time: "31 min ago",
    affected: "Form 4 West, Math",
    status: "Deputy approval required",
    tone: "danger",
    actions: ["Assign Teacher", "Generate Report"],
  },
  {
    title: "Exam malpractice risk",
    detail: "Repeated seating-plan changes detected around KCSE mock paper storage.",
    time: "44 min ago",
    affected: "Exam office and Form 4",
    status: "AI review active",
    tone: "warning",
    actions: ["Launch Investigation", "Notify Principal"],
  },
];

const disciplineRows: MetricRow[] = [
  { label: "Most indisciplined classes", value: "Form 3 North", helper: "11 incidents this week", tone: "danger" },
  { label: "Repeat offenders", value: "24", helper: "7 need parent conferences", tone: "warning" },
  { label: "Bullying hotspots", value: "Dorm B, Lab corridor", helper: "Peak risk after evening prep", tone: "danger" },
  { label: "Behavior score trend", value: "82%", helper: "Improved by 4 points this month", tone: "success" },
];

const academicRows: MetricRow[] = [
  { label: "Class rankings", value: "Form 4 East leading", helper: "Mean score 8.2", tone: "success" },
  { label: "KCSE readiness", value: "81%", helper: "Candidate intervention required", tone: "warning" },
  { label: "Subject weaknesses", value: "Math, Chemistry", helper: "Algebra and mole concept gaps", tone: "danger" },
  { label: "Syllabus completion", value: "74%", helper: "Math department behind by 18%", tone: "warning" },
];

const teacherRows: MetricRow[] = [
  { label: "Late teachers", value: "2", helper: "Both have lesson coverage impact", tone: "warning" },
  { label: "Missed lessons", value: "6", helper: "3 require substitute allocation", tone: "danger" },
  { label: "Marking delays", value: "14 scripts", helper: "English and Biology overdue", tone: "warning" },
  { label: "Teacher workload", value: "89%", helper: "Balanced but tight in sciences", tone: "info" },
];

const attendanceRows: MetricRow[] = [
  { label: "Absent students", value: "127", helper: "33 chronic absentee watchlist", tone: "danger" },
  { label: "Late arrivals", value: "48", helper: "Frequent Monday lateness detected", tone: "warning" },
  { label: "Boarding attendance", value: "98%", helper: "Dorm C roll call clean", tone: "success" },
  { label: "Transport-linked issues", value: "21", helper: "Route 4 and Route 7 affected", tone: "info" },
];

const aiInsights: Insight[] = [
  { title: "Form 3 North has rising indiscipline after evening prep.", detail: "Incident clustering shows corridor noise, bullying reports, and dorm movement within the same 45-minute window.", confidence: "92% confidence", tone: "danger" },
  { title: "Students visiting clinic frequently are underperforming academically.", detail: "Clinic visits correlate with missed mathematics lessons and two recent CAT declines.", confidence: "86% confidence", tone: "warning" },
  { title: "Math department syllabus coverage is behind by 18%.", detail: "Current pace risks incomplete revision before mock examinations unless Saturday recovery classes are assigned.", confidence: "89% confidence", tone: "warning" },
  { title: "Bullying cases increase near exam periods.", detail: "Historical pattern suggests supervision should increase around dorms and science corridors this week.", confidence: "81% confidence", tone: "info" },
  { title: "Transport delays correlate with absenteeism.", detail: "Route 7 delays explain 13 late arrivals and 6 missed first lessons this morning.", confidence: "84% confidence", tone: "cyan" },
];

const quickActions = [
  "Record Discipline Case",
  "Send Parent Alert",
  "Schedule Emergency Meeting",
  "Generate Incident Report",
  "Approve Suspension",
  "Print Attendance Report",
  "Assign Teacher",
  "Launch Investigation",
] as const;

const heroStats: Array<[string, string, Tone]> = [
  ["Live school status", "Operational pressure elevated", "warning"],
  ["School order score", "88%", "success"],
  ["AI anomaly alerts", "9", "cyan"],
];

function groupNav() {
  return navItems.reduce<Record<string, DeputyNavItem[]>>((groups, item) => {
    groups[item.group] = [...(groups[item.group] ?? []), item];
    return groups;
  }, {});
}

function StatusChip({ icon: Icon, label, tone }: { icon: LucideIcon; label: string; tone: Tone }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black", toneStyles[tone].chip)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}

function IconTile({ icon: Icon, tone }: { icon: LucideIcon; tone: Tone }) {
  return (
    <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl border", toneStyles[tone].border, toneStyles[tone].bg, toneStyles[tone].icon)}>
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
  );
}

function MiniLine({ points, tone }: { points: number[]; tone: Tone }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const color =
    tone === "danger"
      ? "#FB7185"
      : tone === "warning"
        ? "#FF7A1A"
        : tone === "success"
          ? "#34D399"
          : tone === "cyan"
            ? "#22D3EE"
            : "#60A5FA";
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

function Bars({ values, tone }: { values: number[]; tone: Tone }) {
  const max = Math.max(...values);
  const color =
    tone === "danger"
      ? "bg-rose-400"
      : tone === "warning"
        ? "bg-[#FF7A1A]"
        : tone === "success"
          ? "bg-emerald-300"
          : tone === "cyan"
            ? "bg-cyan-300"
            : "bg-blue-300";

  return (
    <div className="flex h-28 items-end gap-2">
      {values.map((value, index) => (
        <span
          key={`${value}-${index}`}
          className={cn("w-full rounded-t-md", color)}
          style={{ height: `${Math.max(14, (value / max) * 100)}%`, opacity: 0.5 + index / 16 }}
        />
      ))}
    </div>
  );
}

function Sidebar() {
  const groups = useMemo(() => groupNav(), []);

  return (
    <aside className="hidden h-full rounded-[var(--radius-xl)] border border-[#C8D5EA]/50 bg-[#071D49] p-4 text-white shadow-[0_24px_70px_rgba(7,29,73,0.22)] xl:sticky xl:top-5 xl:block" aria-label="Deputy principal dashboard navigation">
      <div className="rounded-[var(--radius-lg)] border border-white/10 bg-white/[0.06] p-4">
        <p className="text-xs font-black uppercase text-cyan-200">Deputy command</p>
        <h2 className="mt-2 text-2xl font-black">Operations Control</h2>
        <p className="mt-2 text-sm leading-6 text-white/66">Important issues are detected before they become disasters.</p>
      </div>
      <nav className="mt-5 max-h-[calc(100vh-190px)] space-y-5 overflow-auto pr-1">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group}>
            <p className="px-3 text-[11px] font-black uppercase tracking-[0.16em] text-white/45">{group}</p>
            <div className="mt-2 grid gap-1">
              {items.map((item) => {
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
    </aside>
  );
}

function TopHeader({
  searchTerm,
  searchResults,
  onSearchResult,
  onSearchTermChange,
  onEmergency,
  onNotifications,
}: {
  searchTerm: string;
  searchResults: DeputySearchRecord[];
  onSearchResult: (record: DeputySearchRecord) => void;
  onSearchTermChange: (value: string) => void;
  onEmergency: () => void;
  onNotifications: () => void;
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const updateClock = () => setNow(new Date());
    const initialUpdate = window.setTimeout(updateClock, 0);
    const interval = window.setInterval(updateClock, 30000);
    return () => {
      window.clearTimeout(initialUpdate);
      window.clearInterval(interval);
    };
  }, []);

  const liveClock = now
    ? `${now.toLocaleDateString("en-KE", { weekday: "long", month: "short", day: "numeric" })} - ${now.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}`
    : "Live school clock syncing";

  return (
    <header id="top" className="rounded-[var(--radius-xl)] border border-[#C8D5EA] bg-white p-4 text-[#071D49] shadow-[0_18px_50px_rgba(7,29,73,0.12)] md:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-[var(--radius-lg)] bg-[#071D49] text-sm font-black text-white shadow-[0_16px_34px_rgba(7,29,73,0.18)]">MS</div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5F6F89]">MyShule operations intelligence</p>
            <p className="mt-1 text-lg font-black md:text-2xl">Deputy Principal Command Center</p>
            <p className="mt-1 text-sm font-semibold text-[#5F6F89]">{liveClock}</p>
          </div>
        </div>
        <div className="grid gap-3 lg:min-w-[640px]">
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
              aria-label="Global search students, teachers, incidents, classes, parents, or reports"
              placeholder="Search student, teacher, incident, class, parent, or report"
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
                  <p className="px-4 py-3 text-sm font-bold text-[#5F6F89]">No matching deputy records found.</p>
                )}
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip icon={Activity} label="127 students absent today" tone="warning" />
            <StatusChip icon={ShieldAlert} label="3 discipline cases unresolved" tone="danger" />
            <StatusChip icon={GraduationCap} label="KCSE risk +12%" tone="warning" />
            <StatusChip icon={Clock} label="2 teachers late right now" tone="info" />
            <button
              type="button"
              onClick={onEmergency}
              className="inline-flex min-h-9 items-center gap-2 rounded-[var(--radius)] bg-rose-600 px-3 text-xs font-black text-white shadow-[0_12px_28px_rgba(225,29,72,0.24)]"
            >
              <Siren className="h-3.5 w-3.5" aria-hidden="true" />
              Emergency
            </button>
            <button
              type="button"
              onClick={onNotifications}
              className="grid h-9 w-9 place-items-center rounded-[var(--radius)] border border-[#C8D5EA] bg-white text-[#071D49]"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Notifications center</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="overflow-hidden rounded-[var(--radius-xl)] border border-[#C8D5EA]/45 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_28%),linear-gradient(135deg,#071D49_0%,#0F2345_58%,#102A60_100%)] p-5 text-white shadow-[0_24px_70px_rgba(7,29,73,0.2)] md:p-7">
      <div className="grid gap-7 xl:grid-cols-[minmax(0,1.08fr)_430px] xl:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="relative flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-300 opacity-60" />
              <span className="relative inline-flex h-4 w-4 rounded-full bg-orange-300" />
            </span>
            <StatusChip icon={RadioTower} label="Live school status" tone="warning" />
            <StatusChip icon={BrainCircuit} label="AI risk detection active" tone="cyan" />
          </div>
          <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight md:text-6xl">Good Morning, Deputy Principal</h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-white/72">
            If anything goes wrong in this school, you will know before it becomes a crisis.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {heroStats.map(([label, value, tone]) => (
              <div key={label} className={cn("rounded-[var(--radius-lg)] border p-4", toneStyles[tone].border, toneStyles[tone].bg)}>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-white/58">{label}</p>
                <p className="mt-2 text-xl font-black">{value}</p>
                <span className={cn("mt-3 block h-2 w-16 rounded-full", toneStyles[tone].dot)} />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-white/12 bg-white/[0.07] p-5 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-black">Operational pressure map</h2>
              <p className="mt-1 text-sm text-white/62">Discipline, academics, teachers, exams, and campus order</p>
            </div>
            <StatusChip icon={Activity} label="Live" tone="success" />
          </div>
          <div className="mt-6">
            <MiniLine points={[68, 72, 71, 79, 83, 86, 88]} tone="success" />
          </div>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-[var(--radius-lg)] border border-cyan-300/25 bg-cyan-400/10 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100/70">Classes normal</p>
              <p className="mt-2 text-3xl font-black">41/44</p>
            </div>
            <div className="rounded-[var(--radius-lg)] border border-orange-300/30 bg-[#FF7A1A]/12 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-orange-100/70">Requires action</p>
              <p className="mt-2 text-3xl font-black">19</p>
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
      transition={{ duration: 0.32, delay: index * 0.035 }}
      whileHover={{ y: -4 }}
      className={cn("rounded-[var(--radius-xl)] border bg-[#071D49] p-5 text-white", toneStyles[item.tone].border, toneStyles[item.tone].glow)}
    >
      <div className="flex items-start justify-between gap-3">
        <IconTile icon={item.icon} tone={item.tone} />
        <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-black", toneStyles[item.tone].chip)}>{item.trend}</span>
      </div>
      <p className="mt-5 text-xs font-black uppercase tracking-[0.14em] text-white/58">{item.label}</p>
      <p className="mt-2 text-4xl font-black">{item.value}</p>
      <p className="mt-2 min-h-10 text-sm leading-5 text-white/66">{item.helper}</p>
      <MiniLine points={item.points} tone={item.tone} />
    </motion.article>
  );
}

function DarkSection({
  id,
  children,
  className,
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("rounded-[var(--radius-xl)] border border-[#C8D5EA]/18 bg-[#071D49] p-5 text-white shadow-[0_22px_60px_rgba(7,29,73,0.18)] md:p-6", className)}>
      {children}
    </section>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200/72">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-black md:text-3xl">{title}</h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-white/66">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function CriticalAlertCenter({ onAlertAction }: { onAlertAction: (alert: CriticalAlert, action: string) => void }) {
  return (
    <DarkSection id="critical-alerts" className="bg-[radial-gradient(circle_at_top_left,rgba(225,29,72,0.16),transparent_24%),linear-gradient(135deg,#071D49_0%,#0D244D_100%)]">
      <SectionTitle
        eyebrow="Live operational intelligence"
        title="Critical alert center"
        description="Bullying, fights, missing students, suspicious clinic visits, late-coming, exam risks, visitors, transport delays, hostel incidents, and teacher absenteeism stay visible with escalation status."
        action={<StatusChip icon={AlertTriangle} label="School watch active" tone="danger" />}
      />
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {criticalAlerts.map((alert) => (
          <article key={alert.title} className={cn("rounded-[var(--radius-xl)] border p-4", toneStyles[alert.tone].border, toneStyles[alert.tone].bg, toneStyles[alert.tone].glow)}>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex gap-3">
                <IconTile icon={AlertTriangle} tone={alert.tone} />
                <div>
                  <h3 className="text-lg font-black">{alert.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/68">{alert.detail}</p>
                </div>
              </div>
              <StatusChip icon={Clock} label={alert.time} tone={alert.tone} />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <p className="rounded-[var(--radius-lg)] border border-white/10 bg-white/[0.055] px-4 py-3 text-xs font-bold text-white/70">{alert.affected}</p>
              <p className="rounded-[var(--radius-lg)] border border-white/10 bg-white/[0.055] px-4 py-3 text-xs font-bold text-white/70">{alert.status}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {alert.actions.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => onAlertAction(alert, action)}
                  className="min-h-10 rounded-[var(--radius)] border border-white/14 bg-white/10 px-3 text-xs font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
                >
                  {action}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </DarkSection>
  );
}

function MetricGridSection({
  id,
  eyebrow,
  title,
  description,
  rows,
  icon,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  rows: MetricRow[];
  icon: LucideIcon;
}) {
  return (
    <DarkSection id={id}>
      <SectionTitle eyebrow={eyebrow} title={title} description={description} action={<StatusChip icon={icon} label="Live analytics" tone="cyan" />} />
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {rows.map((row) => (
          <article key={row.label} className={cn("rounded-[var(--radius-xl)] border p-4", toneStyles[row.tone].border, toneStyles[row.tone].bg)}>
            <div className="flex items-center justify-between gap-3">
              <IconTile icon={icon} tone={row.tone} />
              <span className={cn("h-3 w-3 rounded-full", toneStyles[row.tone].dot)} />
            </div>
            <h3 className="mt-4 text-sm font-black uppercase tracking-[0.12em] text-white/58">{row.label}</h3>
            <p className="mt-2 text-2xl font-black">{row.value}</p>
            <p className="mt-2 text-sm leading-5 text-white/64">{row.helper}</p>
          </article>
        ))}
      </div>
    </DarkSection>
  );
}

function DisciplineIntelligence() {
  return (
    <DarkSection id="discipline">
      <SectionTitle
        eyebrow="Behavioral analytics"
        title="Discipline intelligence"
        description="Most indisciplined classes, repeat offenders, bullying hotspots, dormitory incident maps, noise violations, drug suspicion indicators, teacher reports, and AI behavior predictions."
        action={<StatusChip icon={ShieldAlert} label="Pattern scan on" tone="danger" />}
      />
      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_420px]">
        <div className="grid gap-4 md:grid-cols-2">
          {disciplineRows.map((row) => (
            <article key={row.label} className={cn("rounded-[var(--radius-xl)] border p-4", toneStyles[row.tone].border, toneStyles[row.tone].bg)}>
              <h3 className="text-sm font-black uppercase tracking-[0.12em] text-white/58">{row.label}</h3>
              <p className="mt-3 text-3xl font-black">{row.value}</p>
              <p className="mt-2 text-sm leading-5 text-white/64">{row.helper}</p>
            </article>
          ))}
        </div>
        <div className="rounded-[var(--radius-xl)] border border-white/10 bg-white/[0.055] p-4">
          <h3 className="font-black">Dormitory incident map</h3>
          <p className="mt-2 text-sm text-white/60">Redder zones need faster supervision.</p>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              ["Dorm A", "Low", "success"],
              ["Dorm B", "High", "danger"],
              ["Dorm C", "Medium", "warning"],
              ["Lab corridor", "High", "danger"],
              ["Dining", "Stable", "success"],
              ["Field edge", "Watch", "info"],
            ].map(([place, status, tone]) => (
              <div key={place} className={cn("rounded-[var(--radius-lg)] border p-3", toneStyles[tone as Tone].border, toneStyles[tone as Tone].bg)}>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-white/52">{place}</p>
                <p className="mt-2 text-sm font-black">{status}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DarkSection>
  );
}

function AcademicWarRoom() {
  return (
    <DarkSection id="academics" className="bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.14),transparent_25%),#071D49]">
      <SectionTitle
        eyebrow="Strategic academic control"
        title="Academic performance war room"
        description="Class rankings, stream comparisons, subject weaknesses, KCSE readiness, CBC competency gaps, teacher impact, syllabus completion, top improvers, and academic decline warnings."
        action={<StatusChip icon={GraduationCap} label="KCSE readiness watched" tone="warning" />}
      />
      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
        {[
          ["Academic Review", "Classes pending review, missing marks, returned corrections, deadline risks, and grade/form readiness."],
          ["Results Moderation", "HOD, class teacher, grade/form, dean, and exams manager status before principal escalation."],
          ["Academic Analytics", "Class performance, grade/form performance, weak subjects, and intervention follow-up."],
        ].map(([title, detail]) => (
          <article key={title} className="rounded-[var(--radius-xl)] border border-white/10 bg-white/[0.055] p-5">
            <h3 className="font-black">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-white/64">{detail}</p>
          </article>
        ))}
        <article className="rounded-[var(--radius-xl)] border border-white/10 bg-white/[0.055] p-5">
          <h3 className="font-black">Stream comparison</h3>
          <div className="mt-5">
            <Bars values={[62, 71, 66, 82, 74, 69, 78]} tone="cyan" />
          </div>
        </article>
        <article className="rounded-[var(--radius-xl)] border border-white/10 bg-white/[0.055] p-5">
          <h3 className="font-black">Academic decline warnings</h3>
          <div className="mt-4 space-y-3">
            {academicRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-white/10 bg-white/[0.045] px-4 py-3">
                <div>
                  <p className="text-sm font-black">{row.label}</p>
                  <p className="text-xs text-white/56">{row.helper}</p>
                </div>
                <span className={cn("rounded-full border px-2.5 py-1 text-xs font-black", toneStyles[row.tone].chip)}>{row.value}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="rounded-[var(--radius-xl)] border border-orange-300/35 bg-[#FF7A1A]/12 p-5">
          <BrainCircuit className="h-8 w-8 text-[#FFB36F]" aria-hidden="true" />
          <h3 className="mt-4 text-xl font-black">Predictive interventions</h3>
          <p className="mt-3 text-sm leading-6 text-white/66">Students likely to fail, miss targets, or require intervention are ranked by risk, attendance, exam trend, and discipline history.</p>
        </article>
      </div>
    </DarkSection>
  );
}

function ExamOperations() {
  return (
    <DarkSection id="exams">
      <SectionTitle
        eyebrow="High pressure operations"
        title="Exam operations panel"
        description="Exam schedules, marking progress, missing marks, cheating risk indicators, candidate readiness, grading bottlenecks, moderation alerts, and teacher compliance."
        action={<StatusChip icon={ClipboardCheck} label="Moderation live" tone="cyan" />}
      />
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Missing marks", value: "23", helper: "Biology and English pending", tone: "danger" as Tone },
          { label: "Marking progress", value: "78%", helper: "Target: 95% by Friday", tone: "warning" as Tone },
          { label: "Cheating risk", value: "Medium", helper: "Seating plan review active", tone: "warning" as Tone },
          { label: "Candidate readiness", value: "81%", helper: "Form 4 intervention list ready", tone: "success" as Tone },
        ].map((item) => (
          <article key={item.label} className={cn("rounded-[var(--radius-xl)] border p-5", toneStyles[item.tone].border, toneStyles[item.tone].bg)}>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-white/56">{item.label}</p>
            <p className="mt-3 text-3xl font-black">{item.value}</p>
            <p className="mt-2 text-sm leading-5 text-white/64">{item.helper}</p>
          </article>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {["Send Reminder", "View Details", "Escalate to Principal", "Request Correction", "Approve to Principal"].map((label) => (
          <button
            key={label}
            type="button"
            className="min-h-10 rounded-[var(--radius)] border border-white/14 bg-white/10 px-3 text-xs font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
          >
            {label}
          </button>
        ))}
      </div>
    </DarkSection>
  );
}

function AiInsights() {
  return (
    <DarkSection id="ai-insights" className="bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_25%),#071D49]">
      <SectionTitle
        eyebrow="Predictive school intelligence"
        title="AI operational intelligence"
        description="The assistant connects discipline, clinic visits, academics, transport, teacher coverage, exams, and parent communication into early warnings."
        action={<StatusChip icon={BrainCircuit} label="Predictive" tone="cyan" />}
      />
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {aiInsights.map((insight) => (
          <article key={insight.title} className={cn("rounded-[var(--radius-xl)] border p-4", toneStyles[insight.tone].border, toneStyles[insight.tone].bg)}>
            <div className="flex items-start justify-between gap-3">
              <IconTile icon={BrainCircuit} tone={insight.tone} />
              <StatusChip icon={Activity} label={insight.confidence} tone={insight.tone} />
            </div>
            <h3 className="mt-4 text-lg font-black">{insight.title}</h3>
            <p className="mt-2 text-sm leading-6 text-white/66">{insight.detail}</p>
          </article>
        ))}
      </div>
    </DarkSection>
  );
}

function ParentCommunicationHub() {
  return (
    <DarkSection id="parents">
      <SectionTitle
        eyebrow="Parent accountability"
        title="Parent communication hub"
        description="Urgent parent notifications, discipline communication, academic alerts, PTA concerns, unresolved complaints, SMS delivery, email tracking, emergency broadcasts, and targeted alerts."
        action={<StatusChip icon={MessageSquareText} label="SMS tracked" tone="success" />}
      />
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          ["Urgent parent notifications", "18 pending", "Discipline and attendance follow-up", "danger"],
          ["PTA concerns", "7 open", "Three need deputy response", "warning"],
          ["SMS/email tracking", "96% delivered", "Read receipts active", "success"],
        ].map(([title, value, detail, tone]) => (
          <article key={title} className={cn("rounded-[var(--radius-xl)] border p-5", toneStyles[tone as Tone].border, toneStyles[tone as Tone].bg)}>
            <p className="text-sm font-black uppercase tracking-[0.12em] text-white/56">{title}</p>
            <p className="mt-3 text-3xl font-black">{value}</p>
            <p className="mt-2 text-sm leading-5 text-white/64">{detail}</p>
          </article>
        ))}
      </div>
    </DarkSection>
  );
}

function BoardingOperations() {
  return (
    <DarkSection id="boarding">
      <SectionTitle
        eyebrow="Boarding order"
        title="Boarding operations"
        description="Dormitory incidents, night attendance, meal attendance, hostel inspections, boarding discipline, suspicious movement, roll call, and risk indicators."
        action={<StatusChip icon={ShieldCheck} label="Night watch ready" tone="warning" />}
      />
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Dormitory incidents", "5", "Dorm B and corridor checks", "warning"],
          ["Night attendance", "98%", "Dorm C clean roll call", "success"],
          ["Meal attendance", "94%", "29 missed breakfast", "info"],
          ["Suspicious movement", "3", "Back gate camera review", "danger"],
        ].map(([label, value, helper, tone]) => (
          <article key={label} className={cn("rounded-[var(--radius-xl)] border p-5", toneStyles[tone as Tone].border, toneStyles[tone as Tone].bg)}>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-white/56">{label}</p>
            <p className="mt-3 text-3xl font-black">{value}</p>
            <p className="mt-2 text-sm leading-5 text-white/64">{helper}</p>
          </article>
        ))}
      </div>
    </DarkSection>
  );
}

function QuickActionsAndReports({
  onQuickAction,
  onReportAction,
}: {
  onQuickAction: (action: string) => void;
  onReportAction: (report: string) => void;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
      <DarkSection id="quick-actions">
        <SectionTitle eyebrow="Fast response" title="Quick actions panel" description="Immediate operational actions for discipline, attendance, teacher coverage, emergency meetings, suspensions, investigations, and reports." />
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {quickActions.map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => onQuickAction(action)}
              className="min-h-12 rounded-[var(--radius-lg)] border border-white/12 bg-white/[0.07] px-4 text-left text-sm font-black text-white transition hover:-translate-y-0.5 hover:border-cyan-300/35 hover:bg-cyan-400/12"
            >
              {action}
            </button>
          ))}
        </div>
      </DarkSection>
      <DarkSection id="reports">
        <SectionTitle eyebrow="Executive reporting" title="Reporting system" description="Discipline reports, academic reports, teacher accountability, attendance, KCSE readiness, boarding, and risk analysis exports." />
        <div className="mt-6 grid gap-3">
          {["PDF export", "Excel export", "Scheduled reports", "Automated summaries"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onReportAction(item)}
              className="flex items-center justify-between rounded-[var(--radius-lg)] border border-white/10 bg-white/[0.055] px-4 py-3 text-left transition hover:border-cyan-300/35 hover:bg-cyan-400/12"
            >
              <span className="font-black">{item}</span>
              <CheckCircle2 className="h-5 w-5 text-emerald-300" aria-hidden="true" />
            </button>
          ))}
        </div>
      </DarkSection>
    </div>
  );
}

function SupportSignals() {
  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <DarkSection id="timetable">
        <SectionTitle eyebrow="Timetable" title="Timetable enforcement" description="Lesson coverage, substitutions, missed lessons, class movement, teacher location, and bell compliance." />
      </DarkSection>
      <DarkSection id="transport">
        <SectionTitle eyebrow="Transport" title="Transport alerts" description="Route delays, student pickup variance, late bus arrivals, and absenteeism correlations." />
      </DarkSection>
      <DarkSection id="inventory-alerts">
        <SectionTitle eyebrow="Inventory" title="Inventory alerts" description="Food, lab, boarding, and exam material alerts that can disrupt school operations." />
      </DarkSection>
      <DarkSection id="clinic-alerts">
        <SectionTitle eyebrow="Clinic" title="Clinic alerts" description="Suspicious clinic visits, repeated sickness claims, emergency incidents, and nurse escalation." />
      </DarkSection>
      <DarkSection id="visitors">
        <SectionTitle eyebrow="Visitors" title="Visitors" description="Unauthorized visitors, fake parents, pickup verification, gate anomalies, and visitor reports." />
      </DarkSection>
      <DarkSection id="settings">
        <SectionTitle eyebrow="Settings" title="Settings" description="Role visibility, escalation rules, notification sounds, shortcuts, term selector, and emergency policies." />
      </DarkSection>
    </div>
  );
}

function MobileActions() {
  const actions = [
    ["Discipline", ShieldAlert, "#discipline"],
    ["Attendance", UserRoundCheck, "#attendance"],
    ["Teachers", UsersRound, "#teachers"],
    ["AI", BrainCircuit, "#ai-insights"],
    ["Emergency", Siren, "#quick-actions"],
  ] as const;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#071D49]/94 px-2 py-2 text-white shadow-[0_-18px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-5 gap-1">
        {actions.map(([label, Icon, href]) => (
          <a key={label} href={href} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-[var(--radius)] px-1 text-center text-[10px] font-black active:scale-95">
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

export function DeputyPrincipalCommandCenter({ routeMode }: { routeMode: DeputyRouteMode }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [notice, setNotice] = useState("Deputy desk ready for discipline, attendance, staff duty, and parent follow-up.");
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selectedAlertAction, setSelectedAlertAction] = useState<{ alert: CriticalAlert; action: string } | null>(null);
  
  const emergencyMutation = useSchoolMutation("/api/operations/emergency");
  const alertMutation = useSchoolMutation("/api/operations/alert");
  const reportMutation = useSchoolMutation("/api/operations/report");
  
  const searchResults = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return [];

    return deputySearchRecords.filter((record) =>
      [record.label, record.detail, record.sectionId].some((value) => value.toLowerCase().includes(query)),
    );
  }, [searchTerm]);

  function openSearchRecord(record: DeputySearchRecord) {
    setSearchTerm("");
    setNotice(`${record.label} deputy search loaded ${record.sectionId} section: ${record.detail}.`);

    if (typeof document !== "undefined") {
      const target = document.getElementById(record.sectionId);
      target?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    }
  }

  function openEmergencyResponse() {
    setEmergencyOpen(true);
    setNotice("Emergency response ready for deputy review.");
  }

  function recordEmergencyResponse() {
    const schoolId = getCurrentSchoolId();
    emergencyMutation.mutate(
      { action: "emergency_response_review", details: "Deputy reviewed active critical alerts" },
      {
        onSuccess: () => {
          queryClient.invalidateQueries();
          publishSchoolOperationalEvent({
            schoolId,
            type: "EMERGENCY_RESPONSE_REVIEWED",
            module: "operations",
            actorRole: "Deputy Principal",
            title: "Emergency response reviewed",
            body: "Deputy has reviewed active critical alerts and sent the response to Principal, Security, and Discipline teams.",
            entityId: runtimeId("emergency"),
            severity: "critical",
            payload: {},
            notifications: [
              {
                audienceRoles: ["Principal", "Security", "Discipline Master"],
                title: "Emergency response reviewed",
                body: "Deputy has reviewed active critical alerts.",
                severity: "critical",
                relatedModule: "operations",
                relatedRecordId: "emergency",
              },
            ],
          });
          setNotice("Emergency response recorded and sent to Principal, Security, and Discipline teams.");
          setEmergencyOpen(false);
        },
        onError: (err) => setNotice(`Action failed: ${err.message}`)
      }
    );
  }

  function openDeputyNotifications() {
    setNotificationsOpen(true);
    setNotice("Deputy notifications ready.");
  }

  function openAlertAction(alert: CriticalAlert, action: string) {
    setSelectedAlertAction({ alert, action });
    setNotice(`${action} ready for ${alert.title}.`);
  }

  function saveAlertAction() {
    if (!selectedAlertAction) return;

    const schoolId = getCurrentSchoolId();
    alertMutation.mutate(
      { alertTitle: selectedAlertAction.alert.title, action: selectedAlertAction.action },
      {
        onSuccess: () => {
          queryClient.invalidateQueries();
          publishSchoolOperationalEvent({
            schoolId,
            type: "DEPUTY_ALERT_ACTION_SAVED",
            module: "operations",
            actorRole: "Deputy Principal",
            title: `${selectedAlertAction.action} action saved`,
            body: `Deputy acted on alert: ${selectedAlertAction.alert.title}`,
            entityId: runtimeId("alert-action"),
            severity: selectedAlertAction.alert.tone === "danger" ? "critical" : "info",
            payload: { action: selectedAlertAction.action },
            notifications: []
          });
          setNotice(`Deputy action '${selectedAlertAction.action}' saved for ${selectedAlertAction.alert.title}.`);
          setSelectedAlertAction(null);
        },
        onError: (err) => setNotice(`Action failed: ${err.message}`)
      }
    );
  }

  function openQuickAction(action: string) {
    setSelectedAlertAction({
      action,
      alert: {
        title: "Deputy quick action",
        detail: `${action} is ready for deputy recording and same-school follow-up.`,
        time: "Now",
        affected: "Deputy operations desk",
        status: "Action capture pending",
        tone: "info",
        actions: [action],
      },
    });
    setNotice(`${action} ready for deputy action.`);
  }

  function prepareReport(report: string) {
    const schoolId = getCurrentSchoolId();
    reportMutation.mutate(
      { reportType: report },
      {
        onSuccess: () => {
          queryClient.invalidateQueries();
          publishSchoolOperationalEvent({
            schoolId,
            type: "REPORT_PREPARED",
            module: "operations",
            actorRole: "Deputy Principal",
            title: `${report} prepared`,
            body: `Deputy prepared the ${report}.`,
            entityId: runtimeId("report"),
            severity: "info",
            payload: { reportType: report },
            notifications: []
          });
          setNotice(`${report} prepared and generated successfully.`);
        },
        onError: (err) => setNotice(`Action failed: ${err.message}`)
      }
    );
  }

  return (
    <div data-route-mode={routeMode} className="min-h-screen bg-[#F3F4F6] pb-24 lg:pb-6">
      <div className="grid gap-5 p-3 md:p-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Sidebar />
        <main className="min-w-0 space-y-5">
          <TopHeader
            searchTerm={searchTerm}
            searchResults={searchResults}
            onSearchResult={openSearchRecord}
            onSearchTermChange={setSearchTerm}
            onEmergency={openEmergencyResponse}
            onNotifications={openDeputyNotifications}
          />
          <div role="status" className="rounded-[var(--radius-lg)] border border-[#C8D5EA] bg-white px-4 py-3 text-sm font-black text-[#071D49] shadow-[0_14px_34px_rgba(7,29,73,0.08)]">
            {notice}
          </div>
          {emergencyOpen ? (
            <div role="dialog" aria-modal="true" aria-label="Deputy emergency response" className="rounded-[var(--radius-xl)] border border-rose-200 bg-white p-5 text-[#071D49] shadow-[0_18px_50px_rgba(225,29,72,0.14)]">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-rose-700">Deputy emergency response</p>
              <h2 className="mt-2 text-2xl font-black">Emergency response review</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#5F6F89]">Record that the deputy has reviewed active critical alerts and sent the response to Principal, Security, and Discipline teams inside Kisumu Boys.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={recordEmergencyResponse} className="min-h-10 rounded-[var(--radius)] bg-[#071D49] px-4 text-sm font-black text-white">
                  Record emergency response
                </button>
                <button type="button" onClick={() => setEmergencyOpen(false)} className="min-h-10 rounded-[var(--radius)] border border-[#C8D5EA] px-4 text-sm font-black text-[#071D49]">
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
          {selectedAlertAction ? (
            <div role="dialog" aria-modal="true" aria-label="Deputy alert action" className="rounded-[var(--radius-xl)] border border-[#C8D5EA] bg-white p-5 text-[#071D49] shadow-[0_18px_50px_rgba(7,29,73,0.12)]">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5F6F89]">Deputy alert action</p>
              <h2 className="mt-2 text-2xl font-black">{selectedAlertAction.action}</h2>
              <p className="mt-2 text-sm font-black text-[#071D49]">{selectedAlertAction.alert.title}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#5F6F89]">{selectedAlertAction.alert.detail}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={saveAlertAction} className="min-h-10 rounded-[var(--radius)] bg-[#071D49] px-4 text-sm font-black text-white">
                  Save deputy action
                </button>
                <button type="button" onClick={() => setSelectedAlertAction(null)} className="min-h-10 rounded-[var(--radius)] border border-[#C8D5EA] px-4 text-sm font-black text-[#071D49]">
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
          {notificationsOpen ? (
            <div role="dialog" aria-modal="true" aria-label="Deputy notifications" className="rounded-[var(--radius-xl)] border border-[#C8D5EA] bg-white p-5 text-[#071D49] shadow-[0_18px_50px_rgba(7,29,73,0.12)]">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5F6F89]">Deputy notifications</p>
              <h2 className="mt-2 text-2xl font-black">Urgent school updates</h2>
              <div className="mt-4 grid gap-2">
                {criticalAlerts.slice(0, 3).map((alert) => (
                  <p key={alert.title} className="rounded-[var(--radius)] border border-[#C8D5EA] bg-[#F8FAFC] px-3 py-2 text-sm font-bold text-[#5F6F89]">{alert.title}</p>
                ))}
              </div>
              <button type="button" onClick={() => setNotificationsOpen(false)} className="mt-4 min-h-10 rounded-[var(--radius)] bg-[#071D49] px-4 text-sm font-black text-white">
                Close notifications
              </button>
            </div>
          ) : null}
          <Hero />
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Deputy principal KPI summary">
            {kpis.map((item, index) => (
              <KpiCard key={item.label} item={item} index={index} />
            ))}
          </section>
          <CriticalAlertCenter onAlertAction={openAlertAction} />
          <DisciplineIntelligence />
          <AcademicWarRoom />
          <MetricGridSection id="teachers" eyebrow="Staff accountability" title="Teacher oversight center" description="Teacher attendance, lesson attendance, syllabus progress, late teachers, missed lessons, marking delays, workload, class coverage, and substitute needs." rows={teacherRows} icon={UsersRound} />
          <MetricGridSection id="attendance" eyebrow="Live attendance intelligence" title="Student attendance command center" description="Absent students, chronic absenteeism, suspicious patterns, late arrivals, class-by-class attendance, boarding attendance, and transport-linked issues." rows={attendanceRows} icon={UserRoundCheck} />
          <ExamOperations />
          <AiInsights />
          <ParentCommunicationHub />
          <BoardingOperations />
          <QuickActionsAndReports onQuickAction={openQuickAction} onReportAction={prepareReport} />
          <SupportSignals />
        </main>
      </div>
      <MobileActions />
    </div>
  );
}
