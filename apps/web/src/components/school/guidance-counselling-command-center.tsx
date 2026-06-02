"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Bell,
  BrainCircuit,
  CalendarClock,
  FileBarChart2,
  Gauge,
  Handshake,
  HeartHandshake,
  HeartPulse,
  Home,
  LockKeyhole,
  MessageCircle,
  MessageCircleHeart,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Stethoscope,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import {
  fetchCounsellingDashboard,
  type CounsellingDashboard,
} from "@/lib/discipline/discipline-live";

type GuidanceRouteMode = "hosted" | "public";
type Tone = "calm" | "safe" | "teal" | "lavender" | "amber" | "critical" | "neutral";

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

type RiskRow = {
  avatar: string;
  student: string;
  risk: "Medium" | "High" | "Critical";
  trigger: string;
  lastSession: string;
  status: string;
  tone: Tone;
};

type FeedItem = {
  title: string;
  detail: string;
  time: string;
  tone: Tone;
  actions?: string[];
};

const guidanceSearchRecords = [
  { id: "faith-referral", label: "Faith Akinyi referral", detail: "High-risk welfare follow-up due today", sectionId: "risk-table" },
  { id: "parent-meeting", label: "Parent meeting", detail: "Guardian meeting scheduled after lunch", sectionId: "parents" },
  { id: "abuse-alert", label: "Emergency alert", detail: "Sensitive case requires counsellor review", sectionId: "emergency" },
  { id: "wellness-report", label: "Wellbeing summary", detail: "Term wellness report ready for export", sectionId: "reports" },
] satisfies Array<{ id: string; label: string; detail: string; sectionId: string }>;

type GuidanceSearchRecord = (typeof guidanceSearchRecords)[number];

function announceAction(message: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("myshule-guidance-action", { detail: message }));
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
  calm: {
    border: "border-cyan-200/35",
    bg: "bg-cyan-300/12",
    text: "text-cyan-50",
    chip: "border-cyan-200/35 bg-cyan-300/14 text-cyan-50",
    dot: "bg-cyan-200",
    icon: "text-cyan-100",
    glow: "shadow-[0_0_34px_rgba(34,211,238,0.18)]",
  },
  safe: {
    border: "border-emerald-200/35",
    bg: "bg-emerald-300/12",
    text: "text-emerald-50",
    chip: "border-emerald-200/35 bg-emerald-300/14 text-emerald-50",
    dot: "bg-emerald-200",
    icon: "text-emerald-100",
    glow: "shadow-[0_0_34px_rgba(16,185,129,0.18)]",
  },
  teal: {
    border: "border-teal-200/35",
    bg: "bg-teal-300/12",
    text: "text-teal-50",
    chip: "border-teal-200/35 bg-teal-300/14 text-teal-50",
    dot: "bg-teal-200",
    icon: "text-teal-100",
    glow: "shadow-[0_0_34px_rgba(45,212,191,0.18)]",
  },
  lavender: {
    border: "border-violet-200/35",
    bg: "bg-violet-300/12",
    text: "text-violet-50",
    chip: "border-violet-200/35 bg-violet-300/14 text-violet-50",
    dot: "bg-violet-200",
    icon: "text-violet-100",
    glow: "shadow-[0_0_34px_rgba(167,139,250,0.18)]",
  },
  amber: {
    border: "border-[#F6C56F]/45",
    bg: "bg-[#F6C56F]/14",
    text: "text-[#FFF1D6]",
    chip: "border-[#F6C56F]/45 bg-[#F6C56F]/16 text-[#FFF1D6]",
    dot: "bg-[#F6C56F]",
    icon: "text-[#FFE0A3]",
    glow: "shadow-[0_0_34px_rgba(246,197,111,0.2)]",
  },
  critical: {
    border: "border-rose-200/45",
    bg: "bg-rose-500/12",
    text: "text-rose-50",
    chip: "border-rose-200/45 bg-rose-500/14 text-rose-50",
    dot: "bg-rose-300",
    icon: "text-rose-100",
    glow: "shadow-[0_0_42px_rgba(225,29,72,0.24)]",
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
  calm: "border-cyan-200 bg-cyan-50 text-cyan-800",
  safe: "border-emerald-200 bg-emerald-50 text-emerald-800",
  teal: "border-teal-200 bg-teal-50 text-teal-800",
  lavender: "border-violet-200 bg-violet-50 text-violet-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  critical: "border-rose-200 bg-rose-50 text-rose-800",
  neutral: "border-[#C8D5EA] bg-white text-[#071D49]",
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "top", icon: Home, group: "Overview", active: true },
  { label: "Student Cases", href: "risk-analytics", icon: UsersRound, group: "Support" },
  { label: "Appointments", href: "sessions", icon: CalendarClock, group: "Support" },
  { label: "Discipline Referrals", href: "behaviour", icon: ShieldAlert, group: "Referrals" },
  { label: "Wellness Analytics", href: "wellness", icon: HeartPulse, group: "Insights" },
  { label: "Parent Meetings", href: "parents", icon: Handshake, group: "Engagement" },
  { label: "Reports", href: "reports", icon: FileBarChart2, group: "Reporting" },
  { label: "Emergency Cases", href: "emergency", icon: Siren, group: "Critical" },
  { label: "Mental Health Tracking", href: "mental-health", icon: Stethoscope, group: "Wellbeing" },
  { label: "AI Insights", href: "ai-insights", icon: BrainCircuit, group: "Insights" },
  { label: "Settings", href: "settings", icon: Settings, group: "Administration" },
];

const kpis: Kpi[] = [
  {
    label: "Active Counselling Cases",
    value: "42",
    detail: "31 open cases, 6 urgent cases, 5 follow-ups overdue.",
    sub: "Confidential queue",
    tone: "calm",
    icon: MessageCircleHeart,
    points: [34, 36, 38, 37, 40, 41, 42],
  },
  {
    label: "High Risk Students",
    value: "9",
    detail: "Detected from discipline spikes, absenteeism, academic decline, bullying reports, and clinic visits.",
    sub: "3 need same-day action",
    tone: "amber",
    icon: ShieldAlert,
    points: [4, 5, 6, 6, 8, 9, 9],
  },
  {
    label: "Sessions Today",
    value: "14",
    detail: "8 completed, 5 upcoming, 1 missed session requiring follow-up.",
    sub: "Calendar live",
    tone: "teal",
    icon: CalendarClock,
    points: [3, 5, 7, 8, 10, 12, 14],
  },
  {
    label: "Emotional Wellness Score",
    value: "82%",
    detail: "AI-generated school wellness index based on cases, attendance, reports, and session closure.",
    sub: "Calm but watchful",
    tone: "safe",
    icon: HeartPulse,
    points: [76, 78, 79, 81, 80, 82, 82],
  },
  {
    label: "Bullying & Abuse Reports",
    value: "7",
    detail: "4 anonymous reports, 2 active investigations, 1 parent escalation.",
    sub: "Anonymous reporting open",
    tone: "lavender",
    icon: MessageCircle,
    points: [2, 3, 3, 4, 5, 6, 7],
  },
  {
    label: "Suicide/Self-Harm Alerts",
    value: "2",
    detail: "Critical flagged students needing immediate counsellor and leadership action.",
    sub: "Controlled emergency red",
    tone: "critical",
    icon: Siren,
    points: [0, 1, 1, 1, 2, 2, 2],
  },
];

const riskRows: RiskRow[] = [
  {
    avatar: "BK",
    student: "Brian K",
    risk: "High",
    trigger: "Depression signs",
    lastSession: "3 days ago",
    status: "Follow-up needed",
    tone: "amber",
  },
  {
    avatar: "MW",
    student: "Mary W",
    risk: "Medium",
    trigger: "Bullying reports",
    lastSession: "Yesterday",
    status: "Monitoring",
    tone: "lavender",
  },
  {
    avatar: "KT",
    student: "Kevin T",
    risk: "Critical",
    trigger: "Self-harm keywords",
    lastSession: "Today",
    status: "Immediate action",
    tone: "critical",
  },
  {
    avatar: "AO",
    student: "Amina O",
    risk: "High",
    trigger: "Sudden academic decline",
    lastSession: "1 week ago",
    status: "Parent meeting pending",
    tone: "amber",
  },
  {
    avatar: "DO",
    student: "David O",
    risk: "Medium",
    trigger: "Dormitory isolation",
    lastSession: "Today",
    status: "Boarding monitoring",
    tone: "teal",
  },
];

const criticalAlerts: FeedItem[] = [
  {
    title: "Self-harm keyword escalation",
    detail: "Anonymous report and teacher note both referenced hopelessness. Immediate intervention workflow is open.",
    time: "Now",
    tone: "critical",
    actions: ["Notify principal", "Notify guardian", "Refer to clinic"],
  },
  {
    title: "Abuse allegation received",
    detail: "Private case file locked. Guardian contact requires counsellor and deputy approval.",
    time: "18m",
    tone: "critical",
    actions: ["Secure file", "Escalate safely"],
  },
  {
    title: "Bullying escalation in Dorm B",
    detail: "Dormitory conflict heatmap shows repeated reports from the same lower wing.",
    time: "42m",
    tone: "amber",
    actions: ["Assign check-in", "Notify boarding"],
  },
];

const sessions: FeedItem[] = [
  {
    title: "Brian K - individual counselling",
    detail: "Priority High. Session notes preview: sleep disruption, exam pressure, isolation. Parent involvement indicator active.",
    time: "09:30",
    tone: "amber",
    actions: ["Start Session", "Reschedule", "Add Notes"],
  },
  {
    title: "Mary W - bullying follow-up",
    detail: "Priority Medium. Teacher referral linked to discipline record and dorm observation.",
    time: "11:15",
    tone: "lavender",
    actions: ["Start Session", "Add Notes"],
  },
  {
    title: "Emergency walk-in slot",
    detail: "Reserved for self-referrals, teacher referrals, parent-requested counselling, and clinic escalation.",
    time: "Open",
    tone: "teal",
    actions: ["Approve", "Escalate", "Refer to Clinic"],
  },
];

const caseFiles = [
  ["Brian K", "Confidential", "Emotional history, counselling notes, teacher observations, parent meeting records, discipline linkage, academic performance trend, clinic history linkage, referrals, and follow-up plans.", "critical"],
  ["Mary W", "Confidential", "Bullying report chain, anonymous student report, class teacher observations, parent communication log, and monitoring plan.", "lavender"],
  ["Amina O", "Confidential", "Academic decline trend, clinic visit linkage, parent meeting pending, and weekly follow-up plan.", "amber"],
] as const;

const aiInsights = [
  ["Form 3 students show increased anxiety before exams.", "Stress-level heatmap rose in Form 3 during mock exam preparation.", "91% confidence", "amber"],
  ["Repeated absenteeism correlates with discipline issues.", "Six learners show a pattern of Monday absenteeism followed by class incidents.", "87% confidence", "lavender"],
  ["Dormitory B has rising conflict reports.", "Boarding emotional monitoring shows isolation and night-incident clustering.", "84% confidence", "teal"],
  ["3 students may require urgent psychological evaluation.", "AI keyword detection combined with clinic visits and teacher reports triggered a same-day review.", "93% confidence", "critical"],
] as const;

const behaviourCards = [
  ["Repeat offenders", "12", "Students repeatedly suspended or referred for aggression.", ShieldAlert, "amber"],
  ["Aggression trends", "+18%", "Time-of-term stress spikes around exam preparation.", Activity, "lavender"],
  ["Absenteeism correlations", "6 cases", "Repeated absenteeism overlaps with discipline referrals.", Gauge, "teal"],
  ["Dormitory conflict heatmap", "Dorm B", "Bullying patterns and isolation signals are concentrated in one wing.", HeartPulse, "critical"],
] as const;

const parentCards = [
  ["Pending parent meetings", "8", "Difficult family situations, separated-family alerts, and unresolved guardian contact.", Handshake, "amber"],
  ["Communication logs", "31", "SMS, calls, and confidential parent counselling history are connected to cases.", MessageCircle, "calm"],
  ["Family support plans", "5", "Parent engagement notes tied to follow-up goals and student safety.", HeartHandshake, "safe"],
] as const;

const mentalHealthCards = [
  ["Stress", "68%", "Exam period pressure elevated in Forms 3 and 4.", Activity, "amber"],
  ["Anxiety", "41%", "Teacher referrals increased after assessment release.", HeartPulse, "lavender"],
  ["Isolation", "12", "Boarding students with low peer interaction.", UsersRound, "teal"],
  ["Depression indicators", "5", "Students needing private review this week.", Stethoscope, "critical"],
  ["Aggression", "9", "Repeat discipline-linked counselling referrals.", ShieldAlert, "amber"],
] as const;

const reports = [
  ["Counselling reports", "Confidential case summaries with PDF export and supervisor visibility.", FileBarChart2, "calm"],
  ["Behavioural analytics", "Discipline correlation reports, repeat offender trends, and intervention outcomes.", Activity, "lavender"],
  ["Ministry compliance reports", "Evidence-ready counselling summaries without exposing private notes.", ShieldCheck, "safe"],
  ["Wellbeing summaries", "Term wellness index, boarding emotional health, and parent engagement exports.", HeartPulse, "teal"],
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
    <svg viewBox="0 0 100 100" className="h-16 w-full overflow-visible" role="img" aria-label="Wellness trend graph">
      <defs>
        <linearGradient id={`guidance-line-${tone}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={tone === "critical" ? "#fb7185" : tone === "amber" ? "#F6C56F" : tone === "lavender" ? "#C4B5FD" : "#67E8F9"} />
          <stop offset="100%" stopColor={tone === "critical" ? "#f43f5e" : tone === "amber" ? "#FCD34D" : tone === "lavender" ? "#A78BFA" : "#5EEAD4"} />
        </linearGradient>
      </defs>
      <polygon points={`0,100 ${points} 100,100`} fill={tone === "critical" ? "rgba(244,63,94,0.12)" : tone === "amber" ? "rgba(246,197,111,0.14)" : "rgba(94,234,212,0.12)"} />
      <polyline fill="none" stroke={`url(#guidance-line-${tone})`} strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" points={points} />
    </svg>
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
    <section id={id} className={cn("rounded-[24px] border border-white/12 bg-[#071D49] p-5 text-white shadow-[0_20px_60px_rgba(7,29,73,0.15)]", className)}>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/70">{eyebrow}</p>
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
      aria-label="Guidance counselling dashboard navigation"
      className="hidden h-full rounded-[24px] border border-[#C8D5EA]/50 bg-[#071D49] p-4 text-white shadow-[0_24px_70px_rgba(7,29,73,0.2)] xl:sticky xl:top-5 xl:block"
    >
      <div className="rounded-[20px] border border-white/10 bg-white/[0.06] p-4">
        <p className="text-xs font-black uppercase text-cyan-200">Wellbeing command</p>
        <h2 className="mt-2 text-2xl font-black">Counselling Care</h2>
        <p className="mt-2 text-sm leading-6 text-white/66">Private, calm, student-centered support tracking for silent risk detection.</p>
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
      <div className="mt-5 rounded-[20px] border border-teal-300/20 bg-teal-300/10 p-4">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-teal-100/70">Privacy posture</p>
        <p className="mt-2 text-sm font-black">Confidential records locked</p>
        <p className="mt-1 text-xs leading-5 text-white/58">Case notes, parent records, and crisis workflows remain counsellor-scoped.</p>
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
  searchResults: GuidanceSearchRecord[];
  onSearchResult: (record: GuidanceSearchRecord) => void;
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
    : "Wellness clock syncing";

  return (
    <header className="rounded-[24px] border border-[#C8D5EA]/70 bg-white/92 p-4 shadow-[0_18px_55px_rgba(7,29,73,0.1)] backdrop-blur-xl">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)] lg:items-start">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#071D49] text-sm font-black text-white">MS</div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#5F6F89]">MyShule student wellbeing</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-[#071D49] md:text-3xl">Guidance & Counselling Department</h1>
            <p className="mt-2 text-sm font-bold text-[#5F6F89]">{timeLabel} - Term 2 Week 4 - Every quiet signal matters.</p>
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
              aria-label="Search student cases, appointments, referrals, parent meetings, wellness alerts, or reports"
              placeholder="Search cases, appointments, referrals, parent meetings, or wellness alerts"
              className="h-12 w-full rounded-2xl border border-[#C8D5EA] bg-[#F8FAFC] pl-12 pr-4 text-sm font-semibold text-[#071D49] outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-300/20"
            />
            {searchTerm.trim().length > 0 ? (
              <div className="absolute left-0 right-0 top-14 z-20 overflow-hidden rounded-2xl border border-[#C8D5EA] bg-white text-[#071D49] shadow-2xl">
                {searchResults.length > 0 ? (
                  searchResults.map((record) => (
                    <button key={record.id} type="button" onClick={() => onSearchResult(record)} className="block w-full px-4 py-3 text-left text-sm hover:bg-teal-50">
                      <span className="block font-black">{record.label}</span>
                      <span className="mt-1 block text-xs font-semibold text-[#5F6F89]">{record.detail}</span>
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-3 text-sm font-bold text-[#5F6F89]">No matching counselling record found.</p>
                )}
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LightStatusChip icon={Siren} label="2 emergency alerts" tone="critical" />
            <LightStatusChip icon={Bell} label="19 notifications" tone="amber" />
            <LightStatusChip icon={LockKeyhole} label="Confidential mode" tone="lavender" />
            <button
              type="button"
              onClick={() => announceAction("Quick-add counselling session form opened.")}
              className="inline-flex min-h-9 items-center gap-2 rounded-2xl bg-[#071D49] px-3 text-xs font-black text-white"
            >
              <MessageCircleHeart className="h-3.5 w-3.5" aria-hidden="true" />
              Quick-add session
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="overflow-hidden rounded-[24px] border border-[#C8D5EA]/45 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(196,181,253,0.16),transparent_32%),linear-gradient(135deg,#071D49_0%,#0E4264_56%,#102A60_100%)] p-5 text-white shadow-[0_24px_70px_rgba(7,29,73,0.18)]">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(330px,0.7fr)]">
        <div>
          <div className="flex flex-wrap gap-2">
            <StatusChip icon={HeartHandshake} label="Student-centered care" tone="teal" />
            <StatusChip icon={LockKeyhole} label="Private case files" tone="lavender" />
            <StatusChip icon={BrainCircuit} label="Predictive wellbeing AI" tone="calm" />
          </div>
          <h2 className="mt-6 max-w-4xl text-4xl font-black leading-tight md:text-6xl">Student Wellness Overview</h2>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-white/72">
            This system helps detect silent suffering before it becomes disaster. Detect silent student struggles before they become crises through calm signals, confidential notes, referrals, and AI wellness insights.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[
              ["Students needing attention", "27", "Warm check-ins prioritized", "amber"],
              ["Urgent intervention count", "3", "Counsellor response active", "critical"],
              ["Resolved cases", "18", "Closed with follow-up plan", "safe"],
            ].map(([label, value, detail, tone]) => (
              <article key={label} className={cn("rounded-2xl border p-4", toneStyles[tone as Tone].border, toneStyles[tone as Tone].bg)}>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-white/52">{label}</p>
                <p className="mt-2 text-3xl font-black">{value}</p>
                <p className="mt-1 text-sm leading-5 text-white/66">{detail}</p>
              </article>
            ))}
          </div>
        </div>
        <div className="rounded-[24px] border border-teal-200/20 bg-white/[0.08] p-5 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-100/66">Emotional wellness trend graph</p>
              <h3 className="mt-2 text-2xl font-black">Wellness score 82%</h3>
            </div>
            <span className="relative flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-200 opacity-75" />
              <span className="relative inline-flex h-4 w-4 rounded-full bg-teal-200" />
            </span>
          </div>
          <MiniLine values={[71, 74, 76, 79, 78, 81, 82]} tone="teal" />
          <div className="mt-5 rounded-2xl border border-white/12 bg-white/[0.07] p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-white/52">Stress-level heatmap</p>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {[42, 55, 68, 37, 74, 44, 62, 51, 83, 36].map((value, index) => (
                <span
                  key={`${value}-${index}`}
                  className="h-8 rounded-xl border border-white/10"
                  style={{ background: `rgba(${value > 75 ? "244,63,94" : value > 60 ? "246,197,111" : "45,212,191"}, ${0.18 + value / 220})` }}
                />
              ))}
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

function TimelineList({ items }: { items: FeedItem[] }) {
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

function CriticalAlerts() {
  return (
    <SectionCard
      id="emergency"
      eyebrow="Critical alerts"
      title="Critical emergency alerts"
      description="Self-harm alerts, abuse reports, bullying escalations, violent behaviour warnings, drug abuse suspicions, and suicidal indicators stay visible without making the whole page harsh."
    >
      <TimelineList items={criticalAlerts} />
    </SectionCard>
  );
}

function RiskAnalyticsTable() {
  return (
    <SectionCard
      id="risk-analytics"
      eyebrow="Student risk analytics"
      title="Students needing immediate attention"
      description="Risk triggers combine discipline records, teacher reports, AI keyword detection, absenteeism, grade drops, clinic visits, and parent complaints."
    >
      <div className="overflow-x-auto rounded-[24px] border border-white/10">
        <table className="min-w-[860px] w-full text-left text-sm">
          <thead className="bg-white/[0.06] text-xs uppercase tracking-[0.14em] text-white/45">
            <tr>
              {["Student", "Risk Level", "Trigger", "Last Session", "Status"].map((header) => (
                <th key={header} className="px-4 py-3 font-black">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {riskRows.map((row) => (
              <tr key={row.student} className="bg-white/[0.025]">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-xs font-black text-white">{row.avatar}</span>
                    <span className="font-black">{row.student}</span>
                  </div>
                </td>
                <td className="px-4 py-4"><span className={cn("rounded-full border px-2.5 py-1 text-xs font-black", toneStyles[row.tone].chip)}>{row.risk}</span></td>
                <td className="px-4 py-4 text-white/70">{row.trigger}</td>
                <td className="px-4 py-4 text-white/70">{row.lastSession}</td>
                <td className="px-4 py-4 text-white/70">{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function AiInsights() {
  return (
    <SectionCard
      id="ai-insights"
      eyebrow="AI wellness insights"
      title="AI wellness insights"
      description="Predictive behaviour analysis surfaces likely dropouts, violent incidents, depression risks, exam stress breakdowns, and boarding emotional monitoring."
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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

function SessionsAndCases() {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <SectionCard
        id="sessions"
        eyebrow="Session management"
        title="Counselling session manager"
        description="Calendar and appointments system for upcoming sessions, emergency walk-ins, teacher referrals, self-referrals, parent-requested counselling, notes, and rescheduling."
      >
        <TimelineList items={sessions} />
      </SectionCard>
      <SectionCard
        id="case-files"
        eyebrow="Private case files"
        title="Private student case files"
        description="Secure case files connect emotional history, counselling notes, teacher observations, parent records, discipline linkage, academics, clinic history, referrals, and follow-up plans."
      >
        <div className="space-y-3">
          {caseFiles.map(([student, label, detail, tone]) => (
            <article key={student} className={cn("rounded-2xl border p-4", toneStyles[tone as Tone].border, toneStyles[tone as Tone].bg)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-black">{student}</h3>
                  <p className="mt-1 text-sm leading-6 text-white/66">{detail}</p>
                </div>
                <StatusChip icon={LockKeyhole} label={label} tone={tone as Tone} />
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function BehaviourAndParents() {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <SectionCard
        id="behaviour"
        eyebrow="Discipline counselling linkage"
        title="Behaviour & discipline analytics"
        description="Behaviour intervention analytics expose repeat offenders, students repeatedly suspended, anger and aggression trends, dorm conflict hotspots, bullying patterns, and time-of-term stress spikes."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {behaviourCards.map(([title, value, detail, Icon, tone]) => (
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
        id="parents"
        eyebrow="Parent engagement"
        title="Parent engagement"
        description="Parent engagement shows pending meetings, difficult family situations, separated-family alerts, parent counselling history, and communication logs."
      >
        <div className="grid gap-3">
          {parentCards.map(([title, value, detail, Icon, tone]) => (
            <article key={title} className={cn("rounded-2xl border p-4", toneStyles[tone as Tone].border, toneStyles[tone as Tone].bg)}>
              <div className="flex items-start gap-3">
                <IconFrame icon={Icon} tone={tone as Tone} />
                <div>
                  <h3 className="font-black">{title}</h3>
                  <p className="mt-1 text-2xl font-black">{value}</p>
                  <p className="mt-1 text-sm leading-5 text-white/64">{detail}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function MentalHealthAndWorkflow() {
  const interventionActions: Array<[string, LucideIcon, Tone]> = [
    ["Notify principal", Siren, "critical"],
    ["Notify guardian", MessageCircle, "amber"],
    ["Refer to clinic", Stethoscope, "teal"],
    ["Emergency escalation", ShieldAlert, "critical"],
  ];

  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <SectionCard
        id="mental-health"
        eyebrow="Mental health monitoring"
        title="Mental health monitoring"
        description="Track stress, anxiety, isolation, aggression, depression indicators, social withdrawal, wellness radar charts, emotional trend graphs, and class wellbeing comparisons."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {mentalHealthCards.map(([title, value, detail, Icon, tone]) => (
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
        id="wellness"
        eyebrow="Wellness radar"
        title="Wellness analytics"
        description="Non-aggressive emotional trend visuals keep counsellors aware without making support work feel punitive."
      >
        <MiniLine values={[62, 66, 70, 72, 74, 79, 82]} tone="teal" />
        <MiniLine values={[22, 28, 31, 36, 42, 39, 33]} tone="amber" />
      </SectionCard>
      <SectionCard
        id="intervention"
        eyebrow="Emergency intervention workflow"
        title="Emergency intervention workflow"
        description="Quick actions for self-harm alerts, abuse allegations, violent behaviour, drug abuse suspicions, suicidal indicators, and emergency escalation."
        className="xl:col-span-2"
      >
        <div className="grid gap-3 md:grid-cols-4">
          {interventionActions.map(([label, Icon, tone]) => (
            <button
              key={label}
              type="button"
              onClick={() => announceAction(`${label} opened for counselling intervention.`)}
              className={cn("flex min-h-20 items-center gap-3 rounded-2xl border p-4 text-left font-black text-white transition hover:-translate-y-1", toneStyles[tone].border, toneStyles[tone].bg)}
            >
              <IconFrame icon={Icon} tone={tone} />
              {label}
            </button>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function ReportsAndSettings() {
  return (
    <SectionCard
      id="reports"
      eyebrow="Reports and exports"
      title="Reports & exports"
      description="Generate counselling reports, discipline correlation reports, wellness reports, term behavioural analytics, ministry compliance reports, boarding emotional health reports, PDF exports, and Excel exports."
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {reports.map(([title, detail, Icon, tone]) => (
          <article key={title} id={title === "Wellbeing summaries" ? "settings" : undefined} className={cn("rounded-2xl border p-4", toneStyles[tone as Tone].border, toneStyles[tone as Tone].bg)}>
            <IconFrame icon={Icon} tone={tone as Tone} />
            <h3 className="mt-3 font-black">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-white/64">{detail}</p>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}

function MobileQuickActions() {
  const actions = [
    ["Alert", Siren],
    ["Session", CalendarClock],
    ["Lookup", Search],
    ["Notes", MessageCircleHeart],
    ["Open Contact Details", MessageCircle],
  ] as const;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#071D49] px-3 py-2 text-white shadow-[0_-20px_50px_rgba(7,29,73,0.25)] xl:hidden" aria-label="Mobile guidance counselling quick actions">
      <div className="grid grid-cols-5 gap-1">
        {actions.map(([label, Icon]) => (
          <button
            key={label}
            type="button"
            onClick={() => announceAction(`${label} opened from mobile counselling actions.`)}
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

function isLiveCounsellingDashboard(value: CounsellingDashboard | Record<string, unknown> | null): value is CounsellingDashboard {
  return Boolean(
    value
    && typeof value.active_referrals === "number"
    && typeof value.upcoming_sessions === "number"
    && typeof value.high_risk_students === "number"
    && typeof value.followups_due === "number",
  );
}

function buildLiveKpis(dashboard: CounsellingDashboard | null) {
  if (!dashboard) {
    return kpis;
  }

  return kpis.map((item) => {
    if (item.label === "Active Counselling Cases") {
      return {
        ...item,
        value: String(dashboard.active_referrals),
        detail: `${dashboard.active_referrals} active referrals, ${dashboard.improvement_cases} improvement plans, ${dashboard.followups_due} follow-ups overdue.`,
        sub: "Live counselling API",
      };
    }

    if (item.label === "High Risk Students") {
      return {
        ...item,
        value: String(dashboard.high_risk_students),
        detail: `${dashboard.high_risk_students} learners flagged by live counselling risk signals and repeat referrals.`,
        sub: `${dashboard.repeat_referrals} repeat referrals`,
      };
    }

    if (item.label === "Sessions Today") {
      return {
        ...item,
        value: String(dashboard.upcoming_sessions),
        detail: `${dashboard.upcoming_sessions} upcoming counselling sessions loaded from the school schedule.`,
        sub: "Live calendar queue",
      };
    }

    return item;
  });
}

export function GuidanceCounsellingCommandCenter({
  routeMode,
  tenantSlug,
  liveDataEnabled = true,
}: {
  routeMode: GuidanceRouteMode;
  tenantSlug?: string | null;
  liveDataEnabled?: boolean;
}) {
  const [now, setNow] = useState<Date | null>(null);
  const [liveDashboard, setLiveDashboard] = useState<CounsellingDashboard | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [notice, setNotice] = useState("Counselling desk ready for referrals, sessions, follow-ups, and parent meetings.");
  const kpiItems = useMemo(() => buildLiveKpis(liveDashboard), [liveDashboard]);
  const searchResults = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return [];

    return guidanceSearchRecords.filter((record) =>
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
    if (!tenantSlug || !liveDataEnabled) {
      return;
    }

    let cancelled = false;

    async function loadLiveCounsellingDashboard() {
      const dashboard = await fetchCounsellingDashboard(tenantSlug as string);

      if (!cancelled && isLiveCounsellingDashboard(dashboard)) {
        setLiveDashboard(dashboard);
      }
    }

    void loadLiveCounsellingDashboard().catch(() => {
      if (!cancelled) {
        setLiveDashboard(null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [liveDataEnabled, tenantSlug]);

  useEffect(() => {
    function handleGuidanceAction(event: Event) {
      const detail = (event as CustomEvent<string>).detail;
      if (detail) {
        setNotice(detail);
      }
    }

    window.addEventListener("myshule-guidance-action", handleGuidanceAction);
    return () => window.removeEventListener("myshule-guidance-action", handleGuidanceAction);
  }, []);

  function openSearchRecord(record: GuidanceSearchRecord) {
    setSearchTerm("");
    setNotice(`${record.label} opened in counselling records.`);

    if (typeof document !== "undefined") {
      const target = document.getElementById(record.sectionId);
      target?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <div id="top" data-route-mode={routeMode} className="min-h-screen bg-[#F4F7FA] pb-24 lg:pb-6">
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
          <Hero />
          <CriticalAlerts />
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {kpiItems.map((item, index) => (
              <KpiCard key={item.label} item={item} index={index} />
            ))}
          </section>
          <RiskAnalyticsTable />
          <SessionsAndCases />
          <AiInsights />
          <BehaviourAndParents />
          <MentalHealthAndWorkflow />
          <ReportsAndSettings />
        </main>
      </div>
      <MobileQuickActions />
    </div>
  );
}
