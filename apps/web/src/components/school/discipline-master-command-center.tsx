"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Bell,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileBarChart2,
  Gauge,
  Home,
  LockKeyhole,
  MessageCircle,
  PhoneCall,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Sparkles,
  Stethoscope,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import {
  fetchDisciplineAnalytics,
  type DisciplineAnalytics,
} from "@/lib/discipline/discipline-live";

type DisciplineRouteMode = "hosted" | "public";
type Tone = "safe" | "authority" | "slate" | "amber" | "danger" | "emerald" | "neutral";

type NavItem = {
  id: DisciplineView;
  label: string;
  icon: LucideIcon;
  group: string;
};

type DisciplineView =
  | "dashboard"
  | "incidents"
  | "risk-students"
  | "prefects"
  | "dormitory"
  | "analytics"
  | "quick-actions"
  | "parents"
  | "intervention"
  | "positive"
  | "ai-insights"
  | "reports"
  | "settings";

type Kpi = {
  label: string;
  value: string;
  detail: string;
  trend: string;
  tone: Tone;
  icon: LucideIcon;
  points: number[];
};

type IncidentItem = {
  title: string;
  student: string;
  meta: string;
  action: string;
  tone: Tone;
};

type RiskStudent = {
  avatar: string;
  name: string;
  score: string;
  pattern: string;
  response: string;
  action: string;
  tone: Tone;
};

const disciplineSearchRecords = [
  { id: "case-bullying", label: "Bullying case", detail: "Form 3 North | parent contact pending", view: "incidents" },
  { id: "risk-kevin", label: "Kevin Otieno", detail: "Repeat corridor incident risk", view: "risk-students" },
  { id: "dorm-b", label: "Dorm B report", detail: "Boarding movement linked to discipline", view: "dormitory" },
  { id: "teacher-report", label: "Teacher report", detail: "11 reports awaiting review", view: "incidents" },
  { id: "parent-meeting", label: "Parent meeting", detail: "Guardian conference pending", view: "parents" },
] satisfies Array<{ id: string; label: string; detail: string; view: DisciplineView }>;

type DisciplineSearchRecord = (typeof disciplineSearchRecords)[number];

function announceAction(message: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("myshule-discipline-action", { detail: message }));
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
    chip: string;
    dot: string;
    icon: string;
    glow: string;
  }
> = {
  safe: {
    border: "border-cyan-200/35",
    bg: "bg-cyan-300/12",
    chip: "border-cyan-200/35 bg-cyan-300/14 text-cyan-50",
    dot: "bg-cyan-200",
    icon: "text-cyan-100",
    glow: "shadow-[0_0_34px_rgba(34,211,238,0.18)]",
  },
  authority: {
    border: "border-blue-200/35",
    bg: "bg-blue-500/12",
    chip: "border-blue-200/35 bg-blue-500/14 text-blue-50",
    dot: "bg-blue-200",
    icon: "text-blue-100",
    glow: "shadow-[0_0_34px_rgba(59,130,246,0.18)]",
  },
  slate: {
    border: "border-slate-200/25",
    bg: "bg-slate-300/10",
    chip: "border-slate-200/25 bg-slate-300/12 text-slate-50",
    dot: "bg-slate-200",
    icon: "text-slate-100",
    glow: "shadow-[0_18px_48px_rgba(15,23,42,0.22)]",
  },
  amber: {
    border: "border-[#F6C56F]/45",
    bg: "bg-[#F6C56F]/14",
    chip: "border-[#F6C56F]/45 bg-[#F6C56F]/16 text-[#FFF1D6]",
    dot: "bg-[#F6C56F]",
    icon: "text-[#FFE0A3]",
    glow: "shadow-[0_0_34px_rgba(246,197,111,0.2)]",
  },
  danger: {
    border: "border-rose-200/45",
    bg: "bg-rose-500/12",
    chip: "border-rose-200/45 bg-rose-500/14 text-rose-50",
    dot: "bg-rose-300",
    icon: "text-rose-100",
    glow: "shadow-[0_0_42px_rgba(225,29,72,0.24)]",
  },
  emerald: {
    border: "border-emerald-200/35",
    bg: "bg-emerald-300/12",
    chip: "border-emerald-200/35 bg-emerald-300/14 text-emerald-50",
    dot: "bg-emerald-200",
    icon: "text-emerald-100",
    glow: "shadow-[0_0_34px_rgba(16,185,129,0.18)]",
  },
  neutral: {
    border: "border-white/14",
    bg: "bg-white/[0.07]",
    chip: "border-white/14 bg-white/10 text-white/80",
    dot: "bg-white/55",
    icon: "text-white/72",
    glow: "shadow-[0_18px_46px_rgba(7,29,73,0.16)]",
  },
};

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: Home, group: "Overview" },
  { id: "incidents", label: "Incident Reports", icon: ShieldAlert, group: "Cases" },
  { id: "risk-students", label: "Student Discipline Profiles", icon: UsersRound, group: "Cases" },
  { id: "prefects", label: "Prefects Reports", icon: ClipboardList, group: "Intelligence" },
  { id: "dormitory", label: "Dormitory Cases", icon: Home, group: "Boarding" },
  { id: "analytics", label: "Bullying Reports", icon: AlertTriangle, group: "Patterns" },
  { id: "incidents", label: "Drug & Substance Cases", icon: Siren, group: "Patterns" },
  { id: "quick-actions", label: "Suspensions", icon: LockKeyhole, group: "Actions" },
  { id: "parents", label: "Parent Meetings", icon: PhoneCall, group: "Communication" },
  { id: "intervention", label: "Counselling Referrals", icon: Stethoscope, group: "Intervention" },
  { id: "analytics", label: "Behaviour Analytics", icon: Gauge, group: "Insights" },
  { id: "prefects", label: "Teacher Complaints", icon: MessageCircle, group: "Reports" },
  { id: "incidents", label: "Visitors & Unauthorized Access", icon: ShieldCheck, group: "Campus safety" },
  { id: "risk-students", label: "Late Coming", icon: CalendarClock, group: "Attendance" },
  { id: "analytics", label: "Attendance Violations", icon: Activity, group: "Attendance" },
  { id: "positive", label: "Rewards & Positive Behaviour", icon: Sparkles, group: "Transformation" },
  { id: "intervention", label: "Case Follow-ups", icon: CheckCircle2, group: "Intervention" },
  { id: "ai-insights", label: "AI Risk Predictions", icon: BrainCircuit, group: "Intelligence" },
  { id: "reports", label: "Reports", icon: FileBarChart2, group: "Reporting" },
  { id: "settings", label: "Settings", icon: Settings, group: "Administration" },
];

const kpis: Kpi[] = [
  {
    label: "Total Active Cases",
    value: "64",
    detail: "Open discipline cases across classes, dorms, transport, and teacher referrals.",
    trend: "+9 vs last week",
    tone: "authority",
    icon: ClipboardList,
    points: [32, 40, 38, 45, 52, 56, 64],
  },
  {
    label: "Students Under Observation",
    value: "38",
    detail: "Learners watched for behaviour decline, absenteeism links, and social withdrawal.",
    trend: "12 high risk",
    tone: "amber",
    icon: UsersRound,
    points: [22, 24, 25, 28, 32, 36, 38],
  },
  {
    label: "Repeat Offenders",
    value: "11",
    detail: "Students with three or more linked incidents this term.",
    trend: "-4 after intervention",
    tone: "danger",
    icon: ShieldAlert,
    points: [17, 16, 15, 14, 13, 12, 11],
  },
  {
    label: "Bullying Cases This Week",
    value: "7",
    detail: "Reports from dorms, classes, prefect notes, and anonymous channels.",
    trend: "Dorm B watch",
    tone: "danger",
    icon: AlertTriangle,
    points: [2, 3, 3, 4, 5, 6, 7],
  },
  {
    label: "Dormitory Incidents",
    value: "18",
    detail: "Night movement, lights-out violations, missing roll-call, and dorm switching.",
    trend: "+21% after prep",
    tone: "amber",
    icon: Home,
    points: [8, 9, 10, 13, 14, 16, 18],
  },
  {
    label: "Parent Meetings Pending",
    value: "12",
    detail: "Guardian meetings, unreachable parents, warning letters, and escalation notes.",
    trend: "5 overdue",
    tone: "slate",
    icon: PhoneCall,
    points: [14, 13, 13, 12, 12, 12, 12],
  },
  {
    label: "Suspended Students",
    value: "3",
    detail: "Active suspensions with return conditions and parent sign-off.",
    trend: "2 returning this week",
    tone: "danger",
    icon: LockKeyhole,
    points: [2, 2, 3, 3, 4, 3, 3],
  },
  {
    label: "Positive Behaviour Improvements",
    value: "29",
    detail: "Leadership growth, improved attendance, and behaviour recovery plans.",
    trend: "+16 recognised",
    tone: "emerald",
    icon: Sparkles,
    points: [11, 14, 18, 20, 23, 26, 29],
  },
];

const incidentFeed: IncidentItem[] = [
  {
    title: "Substance abuse suspicion",
    student: "Kevin T - Form 3 West",
    meta: "10:42 AM - Chemistry block - Reported by Mr. Otieno",
    action: "Search logged, parent contact pending, counsellor watch opened.",
    tone: "danger",
  },
  {
    title: "Bullying report escalated",
    student: "Dormitory B - Form 2 cluster",
    meta: "09:18 AM - Dorm corridor - Reported by prefect captain",
    action: "Victim secured, witnesses listed, deputy principal notified.",
    tone: "danger",
  },
  {
    title: "Fake sickness trend flagged",
    student: "Three Form 4 learners",
    meta: "08:05 AM - Clinic desk - Nurse referral",
    action: "Clinic visits linked to exam periods for intervention review.",
    tone: "amber",
  },
  {
    title: "Vandalism case closed",
    student: "Form 1 North",
    meta: "Yesterday - Classroom block - Teacher complaint",
    action: "Restitution plan approved and behaviour points restored.",
    tone: "emerald",
  },
];

const highRiskStudents: RiskStudent[] = [
  {
    avatar: "BT",
    name: "Brian T",
    score: "91",
    pattern: "Repeated offenders cluster, chronic late coming, and absenteeism correlations.",
    response: "Guardian responsiveness low. Last SMS not acknowledged.",
    action: "Refer to counsellor",
    tone: "danger",
  },
  {
    avatar: "MW",
    name: "Mary W",
    score: "78",
    pattern: "Emotionally withdrawn student, frequent clinic visitors trend, and exam stress indicators.",
    response: "Guardian responsiveness medium. Parent meeting booked.",
    action: "Open student profile",
    tone: "amber",
  },
  {
    avatar: "KO",
    name: "Kevin O",
    score: "73",
    pattern: "Suspicious movement patterns near dormitory exits after prep.",
    response: "Guardian responsiveness high. Intervention plan active.",
    action: "Assign follow-up",
    tone: "authority",
  },
];

const analyticsCards = [
  ["Incidents by class", "Form 3 West leads with 18 active cases.", ShieldAlert, "danger"],
  ["Incidents by dormitory", "Dormitory B carries the highest night risk.", Home, "amber"],
  ["Bullying hotspots", "Dorm corridor, dining line, and back field need watch.", AlertTriangle, "danger"],
  ["Time-of-day incidents", "Highest incident pressure appears after evening prep.", CalendarClock, "authority"],
  ["Repeat offense analysis", "11 students explain 34% of open case load.", Gauge, "slate"],
  ["Gender-based patterns", "Boys dorms show more movement violations this week.", UsersRound, "safe"],
] as const;

const prefectReports = [
  ["Anonymous reports", "4", "Two bullying reports, one contraband alert, one dorm noise report.", "danger"],
  ["Boarding incidents", "9", "Prefects submitted night movement and lights-out evidence attachments.", "amber"],
  ["Suspicious activity", "6", "Repeated corridor grouping after prep requires teacher patrol.", "authority"],
] as const;

const dormitoryRanks = [
  ["Dormitory B", "High risk", "Night movement violations, missing students, and bullying in dorms.", "danger"],
  ["Dormitory A", "Watch", "Unauthorized dorm switching and noise reports after lights-out.", "amber"],
  ["Dormitory C", "Stable", "All dormitories stable tonight after patrol follow-up.", "emerald"],
] as const;

const interventionCards = [
  ["Counselling referrals", "14", "Referred students, counselling sessions, emotional wellbeing notes, and follow-up schedules.", Stethoscope, "safe"],
  ["Improvement progress", "62%", "Behaviour recovery plans show positive attendance and fewer teacher complaints.", Gauge, "emerald"],
  ["Follow-up schedules", "8", "Discipline is correction, not fear. Open plans are tracked to closure.", CalendarClock, "amber"],
] as const;

const parentCards = [
  ["Parents contacted", "37", "SMS delivery status, call logs, and guardian acknowledgement are visible.", PhoneCall, "safe"],
  ["Pending meetings", "12", "Warning letter generation and meeting scheduling remain ready.", ClipboardList, "amber"],
  ["Unreachable guardians", "5", "Escalation list for principal and class teacher follow-up.", AlertTriangle, "danger"],
] as const;

const positiveCards = [
  ["Most improved students", "16", "Attendance recovery, classroom respect, and counselling plan completion.", Sparkles, "emerald"],
  ["Discipline stars", "9", "Positive prefect recommendations and leadership growth records.", ShieldCheck, "safe"],
  ["Leadership growth", "4", "Former repeat offenders now supporting peer order.", UsersRound, "authority"],
] as const;

const aiInsights = [
  ["Dormitory B has increasing bullying risk.", "Night movement, prefect notes, and anonymous reports converged over 7 days.", "93% confidence", "danger"],
  ["Form 3 West shows rising absenteeism.", "Late coming and clinic visits increased before CAT week.", "88% confidence", "amber"],
  ["Exam misconduct risk increasing before CAT week.", "Teacher complaints and suspicious grouping increased around revision sessions.", "84% confidence", "authority"],
  ["Student X may require counselling intervention.", "Behaviour decline and academic pressure suggest early intervention.", "91% confidence", "safe"],
] as const;

const reportCards: Array<[string, string, LucideIcon, Tone]> = [
  [
    "Student discipline profile page",
    "Full profile, guardian info, incident history timeline, punishments, counselling history, academic impact, attendance correlations, dormitory history, risk analysis, and teacher comments.",
    UsersRound,
    "authority",
  ],
  [
    "Incident report form",
    "Student, incident category, severity, date/time, witnesses, reporting staff, action taken, attachments, parent notified, and follow-up schedule.",
    ClipboardList,
    "amber",
  ],
  [
    "Meaningful empty states",
    "No active incidents today. School behaviour trend improving. All dormitories stable tonight.",
    ShieldCheck,
    "emerald",
  ],
];

function isLiveDisciplineAnalytics(value: DisciplineAnalytics | Record<string, unknown> | null): value is DisciplineAnalytics {
  return Boolean(
    value
    && typeof value.open_cases === "number"
    && typeof value.severe_incidents === "number"
    && typeof value.repeat_offender_alerts === "number",
  );
}

function buildLiveKpis(analytics: DisciplineAnalytics | null) {
  if (!analytics) {
    return kpis;
  }

  return kpis.map((item) => {
    if (item.label === "Total Active Cases") {
      return {
        ...item,
        value: String(analytics.open_cases),
        detail: `${analytics.open_cases} open cases from the live discipline analytics service.`,
        trend: `${analytics.pending_approvals} pending approvals`,
      };
    }

    if (item.label === "Repeat Offenders") {
      return {
        ...item,
        value: String(analytics.repeat_offender_alerts),
        detail: `${analytics.repeat_offender_alerts} repeat offender alerts generated from live incidents.`,
        trend: "Live risk signal",
      };
    }

    if (item.label === "Students Under Observation") {
      return {
        ...item,
        value: String(analytics.severe_incidents + analytics.repeat_offender_alerts),
        detail: "Severe incidents plus repeat offender alerts currently requiring observation.",
        trend: `${analytics.severe_incidents} severe incidents`,
      };
    }

    return item;
  });
}

function MiniLine({ values, tone }: { values: number[]; tone: Tone }) {
  const width = 150;
  const height = 50;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-14 w-full" role="img" aria-label="Discipline trend graph">
      <defs>
        <linearGradient id={`discipline-line-${tone}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="50%" stopColor="#F6C56F" />
          <stop offset="100%" stopColor="#FB7185" />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke={`url(#discipline-line-${tone})`} strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" points={points} />
      <polygon fill="rgba(34,211,238,0.1)" points={`0,${height} ${points} ${width},${height}`} />
    </svg>
  );
}

function IconFrame({ icon: Icon, tone }: { icon: LucideIcon; tone: Tone }) {
  return (
    <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-2xl border", toneStyles[tone].border, toneStyles[tone].bg)}>
      <Icon className={cn("h-5 w-5", toneStyles[tone].icon)} aria-hidden="true" />
    </span>
  );
}

function StatusChip({ label, tone, icon: Icon }: { label: string; tone: Tone; icon?: LucideIcon }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black", toneStyles[tone].chip)}>
      {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : <span className={cn("h-2 w-2 rounded-full", toneStyles[tone].dot)} />}
      {label}
    </span>
  );
}

function Sidebar({
  activeView,
  onViewChange,
}: {
  activeView: DisciplineView;
  onViewChange: (view: DisciplineView) => void;
}) {
  return (
    <aside className="hidden h-[calc(100vh-1.5rem)] overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#071D49] p-4 text-white shadow-[0_24px_70px_rgba(7,29,73,0.35)] xl:block">
      <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-100/70">Order command</p>
        <h2 className="mt-2 text-2xl font-black">Discipline Office</h2>
        <p className="mt-2 text-sm leading-6 text-white/64">School order, fairness, early intervention, and case accountability.</p>
      </div>
      <nav className="mt-4 h-[calc(100%-13.5rem)] space-y-1 overflow-y-auto pr-1" aria-label="Discipline master dashboard navigation">
        {navItems.map((item, index) => {
          const showGroup = item.group !== navItems[index - 1]?.group;

          return (
            <div key={item.label}>
              {showGroup ? <p className="px-3 pb-2 pt-4 text-[11px] font-black uppercase tracking-[0.22em] text-white/45">{item.group}</p> : null}
              <button
                type="button"
                onClick={() => onViewChange(item.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-black text-white/72 transition hover:bg-white/10 hover:text-white",
                  activeView === item.id && "border border-cyan-300/30 bg-cyan-300/12 text-white",
                )}
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </button>
            </div>
          );
        })}
      </nav>
      <div className="mt-4 rounded-2xl border border-rose-200/20 bg-rose-500/10 p-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-100/80">Emergency button</p>
        <p className="mt-1 text-sm font-black">Discipline Master profile</p>
        <p className="mt-1 text-xs leading-5 text-white/58">Critical escalation, school logo, and notifications stay ready.</p>
      </div>
    </aside>
  );
}

function TopHeader({
  now,
  searchTerm,
  searchResults,
  onSearchResult,
  onSearchTermChange,
}: {
  now: Date | null;
  searchTerm: string;
  searchResults: DisciplineSearchRecord[];
  onSearchResult: (record: DisciplineSearchRecord) => void;
  onSearchTermChange: (value: string) => void;
}) {
  const timeLabel = now?.toLocaleTimeString("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
  }) ?? "Live";

  return (
    <header className="rounded-[1.75rem] border border-[#D4DEEC] bg-white/90 p-4 text-[#071D49] shadow-[0_20px_60px_rgba(7,29,73,0.08)] backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#5A6D8D]">MyShule student order</p>
          <h1 className="text-2xl font-black tracking-[-0.01em] md:text-3xl">School Discipline Intelligence Center</h1>
          <p className="mt-1 text-sm font-semibold text-[#5A6D8D]">Term Week 4 - {timeLabel} - Every case traceable</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] lg:min-w-[600px]">
          <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-[#D4DEEC] bg-[#F4F7FA] px-4 text-[#5A6D8D]">
            <Search className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Global search</span>
            <input
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && searchResults[0]) {
                  onSearchResult(searchResults[0]);
                }
              }}
              aria-label="Search student, case, dorm, teacher report, parent meeting"
              className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none placeholder:text-[#5A6D8D]"
              placeholder="Search student, case, dorm, teacher report, parent meeting"
            />
          </label>
          {searchTerm.trim().length > 0 ? (
            <div className="absolute right-4 top-[5.75rem] z-30 w-[min(620px,calc(100%-2rem))] overflow-hidden rounded-2xl border border-[#D4DEEC] bg-white text-[#071D49] shadow-2xl lg:right-5">
              {searchResults.length > 0 ? (
                searchResults.map((record) => (
                  <button key={record.id} type="button" onClick={() => onSearchResult(record)} className="block w-full px-4 py-3 text-left text-sm hover:bg-rose-50">
                    <span className="block font-black">{record.label}</span>
                    <span className="mt-1 block text-xs font-bold text-[#5A6D8D]">{record.detail}</span>
                  </button>
                ))
              ) : (
                <p className="px-4 py-3 text-sm font-bold text-[#5A6D8D]">No matching discipline record found.</p>
              )}
            </div>
          ) : null}
          <StatusChip label="18 incidents today" tone="danger" icon={Siren} />
          <StatusChip label="6 AI warnings" tone="amber" icon={BrainCircuit} />
          <StatusChip label="11 teacher reports" tone="safe" icon={Bell} />
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_34%),linear-gradient(135deg,#071D49_0%,#0B2A63_54%,#111827_100%)] p-5 text-white shadow-[0_24px_70px_rgba(7,29,73,0.24)]">
      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div>
          <div className="flex flex-wrap gap-2">
            <StatusChip label="Live severity map" tone="danger" icon={Activity} />
            <StatusChip label="Fairness audit on" tone="safe" icon={ShieldCheck} />
            <StatusChip label="Behaviour score 86%" tone="emerald" icon={Gauge} />
          </div>
          <h2 className="mt-6 max-w-3xl text-4xl font-black tracking-[-0.02em] md:text-6xl">
            Nothing escapes the discipline office.
          </h2>
          <p className="mt-4 max-w-3xl text-base font-semibold leading-8 text-white/72">
            Monitor student behavior, detect risks early, reduce incidents, and maintain school order through real-time discipline analytics.
          </p>
          <p className="mt-3 max-w-2xl text-sm font-black text-cyan-100">
            I can see patterns before they become crises.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {["Record Incident", "Open Student Profile", "Notify Parent", "Generate Discipline Report"].map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => announceAction(`${label} opened for discipline office action.`)}
                className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-left text-sm font-black text-white transition hover:-translate-y-1 hover:bg-white/15"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-[1.5rem] border border-white/12 bg-white/10 p-5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/58">Incident trend graph</p>
          <h3 className="mt-2 text-xl font-black">Live school behavior score</h3>
          <MiniLine values={[71, 76, 73, 80, 83, 85, 86]} tone="danger" />
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              ["Green", "42", "emerald"],
              ["Amber", "18", "amber"],
              ["Red", "7", "danger"],
            ].map(([label, value, tone]) => (
              <div key={label} className={cn("rounded-2xl border p-3", toneStyles[tone as Tone].border, toneStyles[tone as Tone].bg)}>
                <p className="text-xs font-black text-white/58">{label}</p>
                <p className="text-2xl font-black">{value}</p>
              </div>
            ))}
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
      transition={{ delay: index * 0.035 }}
      className={cn("group rounded-[1.5rem] border bg-[#071D49] p-4 text-white transition hover:-translate-y-1", toneStyles[item.tone].border, toneStyles[item.tone].glow)}
    >
      <div className="flex items-start justify-between gap-3">
        <IconFrame icon={item.icon} tone={item.tone} />
        <StatusChip label={item.trend} tone={item.tone} />
      </div>
      <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-white/58">{item.label}</p>
      <p className="mt-2 text-4xl font-black">{item.value}</p>
      <p className="mt-2 min-h-12 text-sm leading-6 text-white/64">{item.detail}</p>
      <MiniLine values={item.points} tone={item.tone} />
    </motion.article>
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
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("rounded-[1.5rem] border border-white/10 bg-[#071D49] p-5 text-white shadow-[0_20px_60px_rgba(7,29,73,0.18)]", className)}>
      <div className="mb-4">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-white/48">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-black">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-white/64">{description}</p>
      </div>
      {children}
    </section>
  );
}

function IncidentFeed() {
  return (
    <SectionCard
      id="incidents"
      eyebrow="Real-time discipline activity"
      title="Live incident feed"
      description="Fights, bullying, sneaking, vandalism, theft, fake sickness, substance abuse, exam misconduct, dormitory violations, and action taken."
    >
      <div className="space-y-3">
        {incidentFeed.map((item) => (
          <article key={item.title} className={cn("rounded-2xl border p-4", toneStyles[item.tone].border, toneStyles[item.tone].bg)}>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="font-black">{item.title}</h3>
                <p className="mt-1 text-sm font-bold text-white/78">{item.student}</p>
                <p className="mt-1 text-sm leading-6 text-white/62">{item.meta}</p>
                <p className="mt-2 text-sm leading-6 text-white/70">{item.action}</p>
              </div>
              <StatusChip label={item.tone === "danger" ? "Red severity" : item.tone === "amber" ? "Amber severity" : "Green closure"} tone={item.tone} />
            </div>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}

function HighRiskStudents() {
  return (
    <SectionCard
      id="risk-students"
      eyebrow="Predictive behaviour risk"
      title="High risk students"
      description="AI-driven view of repeated offenders, emotionally withdrawn students, frequent clinic visitors, chronic latecomers, suspicious movement patterns, and exam stress indicators."
    >
      <div className="grid gap-3">
        {highRiskStudents.map((student) => (
          <article key={student.name} className={cn("rounded-2xl border p-4", toneStyles[student.tone].border, toneStyles[student.tone].bg)}>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/12 text-sm font-black">{student.avatar}</div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-black">{student.name}</h3>
                  <StatusChip label={`Risk score ${student.score}`} tone={student.tone} />
                </div>
                <p className="mt-2 text-sm leading-6 text-white/68">{student.pattern}</p>
                <p className="mt-1 text-sm font-bold text-white/78">Guardian responsiveness: {student.response}</p>
                <button
                  type="button"
                  onClick={() => announceAction(`${student.action} opened for ${student.name}.`)}
                  className="mt-3 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black text-white transition hover:bg-white/15"
                >
                  {student.action}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}

function BehaviourAnalytics() {
  return (
    <SectionCard
      id="analytics"
      eyebrow="Pattern detection"
      title="Behaviour analytics"
      description="Incidents by class, incidents by dormitory, trends over time, gender-based patterns, bullying hotspots, time-of-day incidents, and repeat offense analysis."
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {analyticsCards.map(([title, detail, Icon, tone]) => (
          <article key={title} className={cn("rounded-2xl border p-4", toneStyles[tone as Tone].border, toneStyles[tone as Tone].bg)}>
            <IconFrame icon={Icon} tone={tone as Tone} />
            <h3 className="mt-3 font-black">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-white/64">{detail}</p>
            <MiniLine values={[10, 18, 16, 25, 28, 34, 39]} tone={tone as Tone} />
          </article>
        ))}
      </div>
    </SectionCard>
  );
}

function SmallCardGrid({
  items,
}: {
  items: readonly (readonly [string, string, string, LucideIcon, string])[];
}) {
  return (
    <div className="space-y-3">
      {items.map(([title, value, detail, Icon, tone]) => (
        <article key={title} className={cn("rounded-2xl border p-4", toneStyles[tone as Tone].border, toneStyles[tone as Tone].bg)}>
          <div className="flex items-start gap-3">
            <IconFrame icon={Icon} tone={tone as Tone} />
            <div>
              <h3 className="font-black">{title}</h3>
              <p className="mt-1 text-3xl font-black">{value}</p>
              <p className="mt-1 text-sm leading-6 text-white/64">{detail}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function QuickActionsPanel() {
  const actions: Array<[string, LucideIcon, Tone]> = [
    ["Record New Case", ClipboardList, "authority"],
    ["Suspend Student", LockKeyhole, "danger"],
    ["Notify Parent", PhoneCall, "amber"],
    ["Print Discipline Slip", FileBarChart2, "slate"],
    ["Refer to Counsellor", Stethoscope, "safe"],
    ["Alert Security", Siren, "danger"],
    ["Generate Weekly Report", FileBarChart2, "emerald"],
  ];

  return (
    <SectionCard
      id="quick-actions"
      eyebrow="Immediate discipline action"
      title="Quick action panel"
      description="Fast reporting, suspension control, parent contact, printing, counselling referral, security escalation, and weekly reporting."
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {actions.map(([label, Icon, tone]) => (
          <button
            key={label}
            type="button"
            onClick={() => announceAction(`${label} opened for discipline office action.`)}
            className={cn("flex min-h-14 items-center gap-3 rounded-2xl border px-4 py-3 text-left font-black text-white transition hover:-translate-y-1", toneStyles[tone].border, toneStyles[tone].bg)}
          >
            <IconFrame icon={Icon} tone={tone} />
            {label}
          </button>
        ))}
      </div>
    </SectionCard>
  );
}

function ReportsAndSettings({ activeView }: { activeView: "reports" | "settings" }) {
  return (
    <SectionCard
      id={activeView}
      eyebrow={activeView === "reports" ? "Audit-ready records" : "Administration"}
      title={activeView === "reports" ? "Reports" : "Settings"}
      description={
        activeView === "reports"
          ? "Generate discipline reports, student profiles, incident history, parent meeting records, counselling correlations, and school order summaries."
          : "Manage discipline workflows, escalation rules, guardian notification templates, and profile access controls."
      }
    >
      <div className="grid gap-3 md:grid-cols-3">
        {reportCards.map(([title, detail, Icon, tone]) => (
          <article key={title} className={cn("rounded-2xl border p-4", toneStyles[tone].border, toneStyles[tone].bg)}>
            <IconFrame icon={Icon} tone={tone} />
            <h3 className="mt-3 font-black">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-white/64">{detail}</p>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}

function DashboardOverview({ kpiItems }: { kpiItems: Kpi[] }) {
  return (
    <>
      <Hero />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Discipline KPI summary">
        {kpiItems.slice(0, 4).map((item, index) => (
          <KpiCard key={item.label} item={item} index={index} />
        ))}
      </section>
      <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <IncidentFeed />
        <QuickActionsPanel />
      </div>
    </>
  );
}

function ActiveWorkspace({
  activeView,
  kpiItems,
}: {
  activeView: DisciplineView;
  kpiItems: Kpi[];
}) {
  switch (activeView) {
    case "dashboard":
      return <DashboardOverview kpiItems={kpiItems} />;
    case "incidents":
      return <IncidentFeed />;
    case "risk-students":
      return <HighRiskStudents />;
    case "analytics":
      return <BehaviourAnalytics />;
    case "prefects":
      return (
        <div className="grid gap-5">
          <SectionCard
            id="prefects"
            eyebrow="Prefect submitted intelligence"
            title="Prefect reports center"
            description="Anonymous reports, boarding incidents, suspicious student activity, dorm noise reports, contraband alerts, urgency tagging, evidence attachments, and quick actions."
          >
            <div className="space-y-3">
              {prefectReports.map(([title, value, detail, tone]) => (
                <article key={title} className={cn("rounded-2xl border p-4", toneStyles[tone as Tone].border, toneStyles[tone as Tone].bg)}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-black">{title}</h3>
                      <p className="mt-1 text-sm leading-6 text-white/64">{detail}</p>
                    </div>
                    <p className="text-3xl font-black">{value}</p>
                  </div>
                </article>
              ))}
            </div>
          </SectionCard>
        </div>
      );
    case "dormitory":
      return (
        <SectionCard
          id="dormitory"
          eyebrow="Boarding discipline watch"
          title="Dormitory monitoring"
          description="Night movement violations, missing students, unauthorized dorm switching, lights-out violations, bullying in dorms, and dorm risk rankings."
        >
          <div className="space-y-3">
            {dormitoryRanks.map(([title, status, detail, tone]) => (
              <article key={title} className={cn("rounded-2xl border p-4", toneStyles[tone as Tone].border, toneStyles[tone as Tone].bg)}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-white/64">{detail}</p>
                  </div>
                  <StatusChip label={status} tone={tone as Tone} />
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      );
    case "intervention":
      return (
        <SectionCard
          id="intervention"
          eyebrow="Correction and support"
          title="Counselling & intervention tracker"
          description="Track referred students, counselling sessions, emotional wellbeing notes, improvement progress, and follow-up schedules."
        >
          <SmallCardGrid items={interventionCards} />
        </SectionCard>
      );
    case "parents":
      return (
        <SectionCard
          id="parents"
          eyebrow="Guardian accountability"
          title="Parent communication center"
          description="Parents contacted, pending meetings, unreachable guardians, SMS delivery status, parent response rates, warning letters, and meeting schedules."
        >
          <SmallCardGrid items={parentCards} />
        </SectionCard>
      );
    case "positive":
      return (
        <SectionCard
          id="positive"
          eyebrow="Transformation evidence"
          title="Positive behaviour recognition"
          description="Most improved students, discipline stars, leadership growth, and positive prefect recommendations balance accountability with restoration."
        >
          <SmallCardGrid items={positiveCards} />
        </SectionCard>
      );
    case "ai-insights":
      return (
        <SectionCard
          id="ai-insights"
          eyebrow="Predictive discipline intelligence"
          title="AI discipline insights"
          description="Predictive alerts and recommendations for bullying, absenteeism, exam misconduct, counselling intervention, and clinic-incident patterns."
        >
          <div className="grid gap-3 md:grid-cols-2">
            {aiInsights.map(([title, detail, confidence, tone]) => (
              <article key={title} className={cn("rounded-2xl border p-4", toneStyles[tone as Tone].border, toneStyles[tone as Tone].bg)}>
                <StatusChip label={confidence} tone={tone as Tone} icon={BrainCircuit} />
                <h3 className="mt-3 font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/64">{detail}</p>
              </article>
            ))}
          </div>
        </SectionCard>
      );
    case "quick-actions":
      return <QuickActionsPanel />;
    case "reports":
    case "settings":
      return <ReportsAndSettings activeView={activeView} />;
    default:
      return <DashboardOverview kpiItems={kpiItems} />;
  }
}

function MobileQuickActions({ onViewChange }: { onViewChange: (view: DisciplineView) => void }) {
  const actions = [
    ["Alert", Siren, "incidents"],
    ["Case", ClipboardList, "quick-actions"],
    ["Lookup", Search, "risk-students"],
    ["Parent", PhoneCall, "parents"],
    ["Counsel", Stethoscope, "intervention"],
  ] as const;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#071D49] px-3 py-2 text-white shadow-[0_-20px_50px_rgba(7,29,73,0.25)] xl:hidden" aria-label="Mobile discipline quick actions">
      <div className="grid grid-cols-5 gap-1">
        {actions.map(([label, Icon, view]) => (
          <button key={label} type="button" onClick={() => onViewChange(view)} className="grid min-h-12 place-items-center rounded-2xl text-[11px] font-black text-white/82">
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}

export function DisciplineMasterCommandCenter({
  routeMode,
  tenantSlug,
  liveDataEnabled = true,
}: {
  routeMode: DisciplineRouteMode;
  tenantSlug?: string | null;
  liveDataEnabled?: boolean;
}) {
  const [now, setNow] = useState<Date | null>(null);
  const [liveAnalytics, setLiveAnalytics] = useState<DisciplineAnalytics | null>(null);
  const [activeView, setActiveView] = useState<DisciplineView>("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [notice, setNotice] = useState("Discipline desk ready for cases, parent contact, counselling referrals, and reports.");
  const kpiItems = useMemo(() => buildLiveKpis(liveAnalytics), [liveAnalytics]);
  const searchResults = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return [];

    return disciplineSearchRecords.filter((record) =>
      [record.label, record.detail, record.view].some((value) => value.toLowerCase().includes(query)),
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

    async function loadLiveDisciplineAnalytics() {
      const analytics = await fetchDisciplineAnalytics(tenantSlug as string);

      if (!cancelled && isLiveDisciplineAnalytics(analytics)) {
        setLiveAnalytics(analytics);
      }
    }

    void loadLiveDisciplineAnalytics().catch(() => {
      if (!cancelled) {
        setLiveAnalytics(null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [liveDataEnabled, tenantSlug]);

  useEffect(() => {
    function handleDisciplineAction(event: Event) {
      const detail = (event as CustomEvent<string>).detail;
      if (detail) {
        setNotice(detail);
      }
    }

    window.addEventListener("myshule-discipline-action", handleDisciplineAction);
    return () => window.removeEventListener("myshule-discipline-action", handleDisciplineAction);
  }, []);

  function openSearchRecord(record: DisciplineSearchRecord) {
    setSearchTerm("");
    setActiveView(record.view);
    setNotice(`${record.label} opened for discipline follow-up.`);
  }

  return (
    <div id="top" data-route-mode={routeMode} className="h-screen overflow-hidden bg-[#F2F5F9]">
      <div className="grid h-full gap-5 p-3 md:p-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Sidebar activeView={activeView} onViewChange={setActiveView} />
        <main className="min-h-0 min-w-0 overflow-y-auto pb-24 xl:pb-0">
          <div className="sticky top-0 z-20 bg-[#F2F5F9]/95 pb-4 backdrop-blur">
            <TopHeader
              now={now}
              searchTerm={searchTerm}
              searchResults={searchResults}
              onSearchResult={openSearchRecord}
              onSearchTermChange={setSearchTerm}
            />
            <div role="status" className="mt-3 rounded-2xl border border-[#D4DEEC] bg-white px-4 py-3 text-sm font-black text-[#071D49] shadow-[0_12px_30px_rgba(7,29,73,0.08)]">
              {notice}
            </div>
          </div>
          <motion.div
            key={activeView}
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="space-y-5"
          >
            <ActiveWorkspace activeView={activeView} kpiItems={kpiItems} />
          </motion.div>
        </main>
      </div>
      <MobileQuickActions onViewChange={setActiveView} />
    </div>
  );
}
