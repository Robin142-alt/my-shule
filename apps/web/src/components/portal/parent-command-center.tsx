"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Bell,
  Bot,
  Bus,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  CreditCard,
  Download,
  FileText,
  GraduationCap,
  HeartPulse,
  Home,
  Languages,
  LibraryBig,
  LockKeyhole,
  Mail,
  MessageCircle,
  PhoneCall,
  ReceiptText,
  Route,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  UserRound,
  UsersRound,
} from "lucide-react";

import { DashboardGreeting } from "@/components/common/dashboard-greeting";
import type { PortalSection } from "@/lib/routing/experience-routes";
import { toPortalPath } from "@/lib/routing/experience-routes";
import {
  readSchoolData,
  subscribeToSchoolDataUpdates,
} from "@/lib/school/school-operational-store";

type PortalRouteMode = "hosted" | "public";
type AlertTone = "good" | "info" | "warning" | "danger";

type ParentCommandCenterProps = {
  routeMode: PortalRouteMode;
};

type KpiItem = {
  id: string;
  label: string;
  value: string;
  helper: string;
  trend: string;
  tone: AlertTone;
  icon: LucideIcon;
  sparkline: number[];
  href?: PortalSection;
};

type ActionItem = {
  id: string;
  label: string;
  detail: string;
  icon: LucideIcon;
  href?: PortalSection;
  anchor?: string;
  tone: AlertTone;
};

type FeedItem = {
  id: string;
  title: string;
  detail: string;
  time: string;
  tone: AlertTone;
  icon: LucideIcon;
};

type TimelineItem = {
  id: string;
  time: string;
  title: string;
  detail: string;
  status: "completed" | "active" | "upcoming" | "urgent";
  metrics: string[];
};

type PortalCounsellingSessionRecord = {
  id: string;
  student: string;
  className: string;
  riskLevel: string;
  sessionType: string;
  followUpDate: string;
  status: string;
  guardianSmsSent?: boolean;
};

type PortalClinicVisitRecord = {
  id: string;
  student: string;
  className: string;
  medicine: string;
  quantity: number;
  status: string;
  parentContacted?: boolean;
  time: string;
};

type PortalLibraryLoanRecord = {
  id: string;
  bookTitle: string;
  borrower: string;
  dueDate: string;
  status: string;
  fine?: number;
};

function parentHref(section: PortalSection, routeMode: PortalRouteMode) {
  if (routeMode === "public") {
    return section === "dashboard" ? "/portal/parent" : `/portal/parent/${section}`;
  }

  return toPortalPath(section);
}

function toneClasses(tone: AlertTone) {
  const map = {
    good: {
      text: "text-emerald-100",
      muted: "text-emerald-200/80",
      chip: "border-emerald-300/30 bg-emerald-400/12 text-emerald-100",
      icon: "bg-emerald-400/15 text-emerald-200",
      dot: "bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.55)]",
      line: "from-emerald-300 to-emerald-500",
    },
    info: {
      text: "text-blue-100",
      muted: "text-blue-200/80",
      chip: "border-blue-300/30 bg-blue-400/12 text-blue-100",
      icon: "bg-blue-400/15 text-blue-200",
      dot: "bg-blue-300 shadow-[0_0_18px_rgba(147,197,253,0.55)]",
      line: "from-blue-300 to-blue-500",
    },
    warning: {
      text: "text-orange-100",
      muted: "text-orange-200/80",
      chip: "border-orange-300/35 bg-orange-400/15 text-orange-100",
      icon: "bg-orange-400/15 text-orange-200",
      dot: "bg-orange-300 shadow-[0_0_18px_rgba(251,146,60,0.6)]",
      line: "from-orange-300 to-orange-500",
    },
    danger: {
      text: "text-red-100",
      muted: "text-red-200/80",
      chip: "border-red-300/35 bg-red-400/15 text-red-100",
      icon: "bg-red-400/15 text-red-200",
      dot: "bg-red-300 shadow-[0_0_18px_rgba(252,165,165,0.65)]",
      line: "from-red-300 to-red-500",
    },
  } satisfies Record<AlertTone, Record<string, string>>;

  return map[tone];
}

function statusTone(status: TimelineItem["status"]): AlertTone {
  if (status === "completed") return "good";
  if (status === "active") return "info";
  if (status === "urgent") return "danger";
  return "warning";
}

function GlassCard({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <motion.section
      id={id}
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`scroll-mt-[18rem] rounded-[var(--radius-xl)] border border-white/12 bg-white/[0.075] shadow-[0_24px_70px_rgba(0,0,0,0.22)] backdrop-blur-2xl md:scroll-mt-36 ${className}`}
    >
      {children}
    </motion.section>
  );
}

function SectionHeader({
  icon: Icon,
  label,
  title,
  action,
}: {
  icon: LucideIcon;
  label: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius)] border border-white/12 bg-white/10 text-orange-200">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/48">{label}</p>
          <h2 className="mt-1 text-xl font-bold tracking-normal text-white md:text-2xl">{title}</h2>
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function MiniSparkline({ values, tone }: { values: number[]; tone: AlertTone }) {
  const toneStyle = toneClasses(tone);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 42 - (value / 100) * 34;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg aria-hidden="true" className="mt-4 h-12 w-full overflow-visible" viewBox="0 0 100 44" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`parent-spark-${tone}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.15" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3.2"
        className={toneStyle.text}
      />
      <polyline
        points={`0,44 ${points} 100,44`}
        fill="currentColor"
        className={toneStyle.text}
        opacity="0.08"
      />
    </svg>
  );
}

function KpiCard({ item, routeMode }: { item: KpiItem; routeMode: PortalRouteMode }) {
  const Icon = item.icon;
  const tone = toneClasses(item.tone);
  const content = (
    <div className="group h-full rounded-[var(--radius-xl)] border border-white/12 bg-white/[0.08] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.16)] transition duration-200 hover:-translate-y-1 hover:border-orange-300/35 hover:bg-white/[0.12]">
      <div className="flex items-start justify-between gap-3">
        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius)] ${tone.icon}`}>
          <Icon className="h-5 w-5" />
        </span>
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${tone.chip}`}>
          {item.trend}
        </span>
      </div>
      <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.15em] text-white/52">{item.label}</p>
      <p className="mt-2 text-3xl font-black leading-none text-white">{item.value}</p>
      <p className="mt-2 min-h-10 text-sm leading-5 text-white/66">{item.helper}</p>
      <MiniSparkline values={item.sparkline} tone={item.tone} />
    </div>
  );

  if (item.href) {
    return (
      <Link href={parentHref(item.href, routeMode)} className="block h-full focus-ring">
        {content}
      </Link>
    );
  }

  return content;
}

function ActionButton({
  item,
  routeMode,
  onAction,
}: {
  item: ActionItem;
  routeMode: PortalRouteMode;
  onAction: (message: string) => void;
}) {
  const Icon = item.icon;
  const tone = toneClasses(item.tone);
  const className =
    "group flex min-h-[104px] flex-col justify-between rounded-[var(--radius-xl)] border border-white/12 bg-white/[0.08] p-4 text-left shadow-[0_16px_40px_rgba(0,0,0,0.14)] transition duration-200 hover:-translate-y-1 hover:border-orange-300/35 hover:bg-white/[0.12] focus-ring";
  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius)] ${tone.icon}`}>
          <Icon className="h-5 w-5" />
        </span>
        <ChevronRight className="h-4 w-4 text-white/40 transition group-hover:translate-x-1 group-hover:text-orange-200" />
      </div>
      <div className="mt-4">
        <p className="text-sm font-bold text-white">{item.label}</p>
        <p className="mt-1 text-xs leading-5 text-white/58">{item.detail}</p>
      </div>
    </>
  );

  if (item.href) {
    return (
      <Link href={parentHref(item.href, routeMode)} onClick={() => onAction(`${item.label} opened for Brian Otieno.`)} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={() => onAction(`${item.label} opened for Brian Otieno.`)} className={className}>
      {content}
    </button>
  );
}

function ProgressDonut({
  value,
  label,
  tone = "good",
}: {
  value: number;
  label: string;
  tone?: AlertTone;
}) {
  const color = tone === "danger" ? "#FCA5A5" : tone === "warning" ? "#FDBA74" : tone === "info" ? "#93C5FD" : "#6EE7B7";

  return (
    <div className="flex items-center gap-3">
      <div
        className="grid h-20 w-20 place-items-center rounded-full"
        style={{
          background: `conic-gradient(${color} ${value * 3.6}deg, rgba(255,255,255,0.12) 0deg)`,
        }}
      >
        <div className="grid h-14 w-14 place-items-center rounded-full bg-[#071D49]/92 text-sm font-black text-white">
          {value}%
        </div>
      </div>
      <p className="max-w-[9rem] text-sm font-bold leading-5 text-white">{label}</p>
    </div>
  );
}

function FeedRow({ item }: { item: FeedItem }) {
  const Icon = item.icon;
  const tone = toneClasses(item.tone);

  return (
    <div className={`relative rounded-[var(--radius)] border px-4 py-3 ${tone.chip}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] ${tone.icon}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold text-white">{item.title}</p>
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/48">{item.time}</span>
          </div>
          <p className="mt-1 text-sm leading-5 text-white/68">{item.detail}</p>
        </div>
      </div>
    </div>
  );
}

function TimelineCard({ item }: { item: TimelineItem }) {
  const tone = toneClasses(statusTone(item.status));

  return (
    <div className="relative grid gap-4 rounded-[var(--radius-xl)] border border-white/12 bg-white/[0.07] p-4 md:grid-cols-[7rem_1fr]">
      <div className="flex items-center gap-3 md:block">
        <span className={`inline-block h-3 w-3 rounded-full ${tone.dot}`} />
        <p className="text-sm font-black text-white md:mt-3">{item.time}</p>
        <p className={`text-[11px] font-bold uppercase tracking-[0.14em] ${tone.muted}`}>
          {item.status}
        </p>
      </div>
      <div>
        <h3 className="text-base font-bold text-white">{item.title}</h3>
        <p className="mt-1 text-sm leading-5 text-white/64">{item.detail}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {item.metrics.map((metric) => (
            <span key={metric} className="rounded-[var(--radius-sm)] border border-white/10 bg-white/[0.07] px-3 py-2 text-xs font-semibold text-white/72">
              {metric}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricPill({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-white/12 bg-white/[0.08] px-3 py-3">
      <div className="flex items-center gap-2 text-white/54">
        <Icon className="h-4 w-4" />
        <span className="text-[10px] font-bold uppercase tracking-[0.14em]">{label}</span>
      </div>
      <p className="mt-2 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function BarRow({ label, value, tone = "good" }: { label: string; value: number; tone?: AlertTone }) {
  const toneStyle = toneClasses(tone);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-white/78">{label}</span>
        <span className={toneStyle.text}>{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full bg-gradient-to-r ${toneStyle.line}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function Heatmap() {
  const cells = [
    86, 92, 94, 88, 95, 0, 0,
    91, 87, 96, 93, 90, 0, 0,
    82, 78, 94, 88, 97, 0, 0,
    89, 93, 92, 85, 96, 0, 0,
  ];

  return (
    <div className="grid grid-cols-7 gap-2" aria-label="Monthly attendance heatmap">
      {cells.map((value, index) => {
        const bg =
          value === 0
            ? "bg-white/6"
            : value < 84
              ? "bg-orange-300/55"
              : value < 90
                ? "bg-blue-300/55"
                : "bg-emerald-300/70";
        return (
          <span
            key={`${value}-${index}`}
            className={`h-9 rounded-[var(--radius-sm)] border border-white/10 ${bg}`}
            title={value === 0 ? "Weekend" : `${value}% attendance`}
          />
        );
      })}
    </div>
  );
}

const kpiItems: KpiItem[] = [
  {
    id: "attendance",
    label: "Attendance",
    value: "94%",
    helper: "Present for all morning lessons today.",
    trend: "+3%",
    tone: "good",
    icon: ClipboardCheck,
    sparkline: [74, 80, 78, 88, 91, 89, 94],
  },
  {
    id: "average",
    label: "Academic Average",
    value: "72%",
    helper: "Above class average in Science and English.",
    trend: "+6 pts",
    tone: "good",
    icon: GraduationCap,
    sparkline: [58, 61, 64, 63, 68, 70, 72],
    href: "academics",
  },
  {
    id: "fees",
    label: "Fee Balance",
    value: "KES 18,450",
    helper: "Balance requires attention before exam clearance.",
    trend: "due",
    tone: "warning",
    icon: CreditCard,
    sparkline: [80, 77, 70, 63, 58, 42, 36],
    href: "fees",
  },
  {
    id: "exams",
    label: "Upcoming Exams",
    value: "3",
    helper: "Mathematics CAT opens on Wednesday.",
    trend: "7 days",
    tone: "info",
    icon: FileText,
    sparkline: [45, 54, 62, 68, 70, 76, 81],
    href: "academics",
  },
  {
    id: "discipline",
    label: "Discipline Alerts",
    value: "1",
    helper: "One teacher observation needs acknowledgement.",
    trend: "new",
    tone: "danger",
    icon: ShieldAlert,
    sparkline: [22, 18, 12, 14, 10, 8, 12],
    href: "discipline",
  },
  {
    id: "homework",
    label: "Homework Completion",
    value: "86%",
    helper: "Two assignments pending review tonight.",
    trend: "+12%",
    tone: "good",
    icon: FileText,
    sparkline: [54, 61, 72, 70, 80, 82, 86],
  },
  {
    id: "transport",
    label: "Bus Tracking",
    value: "En route",
    helper: "Bus 14 departed school gate at 4:42 PM.",
    trend: "18 min",
    tone: "info",
    icon: Bus,
    sparkline: [20, 36, 44, 55, 67, 74, 82],
  },
  {
    id: "clinic",
    label: "Clinic Visits",
    value: "1",
    helper: "Mild headache resolved after nurse observation.",
    trend: "stable",
    tone: "good",
    icon: Stethoscope,
    sparkline: [12, 10, 9, 8, 7, 6, 5],
    href: "health",
  },
];

const quickActions: ActionItem[] = [
  { id: "fees", label: "Pay with M-PESA", detail: "Open the verified fee account.", icon: CreditCard, href: "fees", tone: "warning" },
  { id: "message", label: "Message Teacher", detail: "Ask a class or welfare question.", icon: MessageCircle, href: "messages", tone: "info" },
  { id: "receipt", label: "Download receipt", detail: "Save the latest payment proof.", icon: Download, href: "downloads", tone: "good" },
  { id: "results", label: "Open Results", detail: "Review CAT and exam progress.", icon: GraduationCap, href: "academics", tone: "info" },
  { id: "discipline", label: "Acknowledge Case", detail: "Respond to teacher observation.", icon: ShieldAlert, href: "discipline", tone: "danger" },
  { id: "health", label: "Clinic Log", detail: "View nurse remarks and care notes.", icon: HeartPulse, href: "health", tone: "good" },
  { id: "transport", label: "Bus Status", detail: "Check pickup, dropoff, and ETA.", icon: Bus, anchor: "#transport", tone: "info" },
  { id: "meeting", label: "Schedule Meeting", detail: "Book time with class teacher.", icon: CalendarDays, href: "messages", tone: "warning" },
  { id: "ai", label: "Ask AI Assistant", detail: "Get a plain-English child summary.", icon: Bot, anchor: "#ai-insights", tone: "good" },
];

const parentNotifications = [
  {
    id: "fee-balance",
    title: "Fee reminder",
    detail: "Brian has KSh 12,400 balance due this term.",
    action: "Open fee statement",
  },
  {
    id: "discipline-ack",
    title: "Discipline acknowledgement",
    detail: "Noise-making observation needs parent acknowledgement.",
    action: "Acknowledge case",
  },
  {
    id: "library-overdue",
    title: "Library book overdue",
    detail: "The River and the Source is two days overdue.",
    action: "View library note",
  },
] as const;

const liveFeed: FeedItem[] = [
  { id: "arrived", title: "Brian arrived at school", detail: "Gate check-in confirmed at 7:14 AM with Form 2 Blue.", time: "7:14 AM", tone: "good", icon: CheckCircle2 },
  { id: "cat", title: "Mathematics CAT uploaded", detail: "Score posted: 68%. Algebra expressions need follow-up.", time: "10:32 AM", tone: "info", icon: GraduationCap },
  { id: "library", title: "Library book overdue", detail: "The River and the Source is 2 days overdue.", time: "11:05 AM", tone: "warning", icon: LibraryBig },
  { id: "discipline", title: "Discipline case reported", detail: "Noise-making observation logged. Teacher requests parent acknowledgement.", time: "12:18 PM", tone: "danger", icon: ShieldAlert },
  { id: "clinic", title: "Clinic visit recorded", detail: "Mild headache observed. No medication administered.", time: "2:41 PM", tone: "good", icon: HeartPulse },
  { id: "bus", title: "School bus departed", detail: "Route 14 left school gate. Estimated home dropoff in 18 minutes.", time: "4:42 PM", tone: "info", icon: Bus },
];

function parentOperationalFeedForLearner(learnerName: string): FeedItem[] {
  const counselling = readSchoolData<PortalCounsellingSessionRecord>("counselling-sessions")
    .filter((item) => item.student === learnerName && item.status !== "Closed")
    .map((item): FeedItem => ({
      id: `parent-counselling-${item.id}`,
      title: `${item.student} counselling follow-up scheduled`,
      detail: `${item.sessionType} with school counsellor. Follow-up date: ${item.followUpDate}. Confidential notes stay with the counsellor.`,
      time: item.followUpDate,
      tone: item.riskLevel === "High" || item.riskLevel === "Critical" ? "warning" : "info",
      icon: Stethoscope,
    }));
  const clinic = readSchoolData<PortalClinicVisitRecord>("clinic-visits")
    .filter((item) => item.student === learnerName)
    .map((item): FeedItem => ({
      id: `parent-clinic-${item.id}`,
      title: `${item.medicine} issued and learner released`,
      detail: `${item.student} was treated in sick bay and marked ${item.status.toLowerCase()}. Parent notification ${item.parentContacted ? "sent" : "pending"}.`,
      time: item.time,
      tone: item.status === "Referred" ? "danger" : "good",
      icon: HeartPulse,
    }));
  const library = readSchoolData<PortalLibraryLoanRecord>("library-loans")
    .filter((item) => item.borrower === learnerName && item.status !== "Returned")
    .map((item): FeedItem => ({
      id: `parent-library-${item.id}`,
      title: `${item.bookTitle} ${item.status.toLowerCase()}`,
      detail: `Due ${item.dueDate}${Number(item.fine ?? 0) > 0 ? ` with KES ${item.fine} fine` : ""}.`,
      time: item.dueDate,
      tone: item.status === "Overdue" || item.status === "Lost" || item.status === "Damaged" ? "warning" : "info",
      icon: LibraryBig,
    }));

  return [...counselling, ...clinic, ...library].slice(0, 8);
}

const classTimeline: TimelineItem[] = [
  {
    id: "math",
    time: "8:00",
    title: "Mathematics - Form 2 Blue",
    detail: "Algebraic expressions remediation group flagged by AI.",
    status: "completed",
    metrics: ["96% attendance", "2 absent", "Trend +8%"],
  },
  {
    id: "english",
    time: "10:10",
    title: "English - Set Book Discussion",
    detail: "Teacher comment published. Brian contributed twice.",
    status: "completed",
    metrics: ["100% attendance", "0 late", "Reading steady"],
  },
  {
    id: "science",
    time: "12:00",
    title: "Integrated Science Practical",
    detail: "Lab participation strong, worksheet submission pending.",
    status: "active",
    metrics: ["94% attendance", "1 missing task", "Above class avg"],
  },
  {
    id: "club",
    time: "3:30",
    title: "Football Club",
    detail: "Transport boarding follows activity release.",
    status: "upcoming",
    metrics: ["Bus 14", "Route confirmed", "Pickup logged"],
  },
];

const subjectRows = [
  { subject: "Mathematics", score: 68, trend: -12, note: "Algebra expressions require revision", tone: "warning" as AlertTone },
  { subject: "English", score: 78, trend: 8, note: "Above stream average", tone: "good" as AlertTone },
  { subject: "Science", score: 74, trend: 11, note: "Practical work improving", tone: "good" as AlertTone },
  { subject: "Kiswahili", score: 70, trend: 3, note: "Composition consistent", tone: "info" as AlertTone },
];

const homeworkRows = [
  { title: "Mathematics worksheet", status: "Pending parent check", value: 64, tone: "warning" as AlertTone },
  { title: "Science lab report", status: "Submitted late", value: 82, tone: "info" as AlertTone },
  { title: "English reading log", status: "Complete", value: 100, tone: "good" as AlertTone },
];

const events = [
  { title: "Mathematics CAT", date: "Wed, May 27", detail: "Revision pack open" },
  { title: "Fee clearance check", date: "Fri, May 29", detail: "Exam access review" },
  { title: "PTA class meeting", date: "Sat, Jun 6", detail: "Hybrid attendance" },
  { title: "Half-term closing", date: "Thu, Jun 11", detail: "Transport schedule pending" },
];

export function ParentCommandCenter({ routeMode }: ParentCommandCenterProps) {
  const [clockLabel, setClockLabel] = useState("Live school day");
  const [notice, setNotice] = useState("Parent portal ready with fees, academics, health, transport, and school messages.");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [operationalFeed, setOperationalFeed] = useState<FeedItem[]>(() => parentOperationalFeedForLearner("Brian Otieno"));
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-KE", {
        weekday: "long",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [],
  );

  useEffect(() => {
    function tick() {
      setClockLabel(dateFormatter.format(new Date()));
    }

    tick();
    const timer = window.setInterval(tick, 60_000);

    return () => window.clearInterval(timer);
  }, [dateFormatter]);

  useEffect(() => {
    function refreshFeed() {
      setOperationalFeed(parentOperationalFeedForLearner("Brian Otieno"));
    }

    refreshFeed();
    return subscribeToSchoolDataUpdates(() => refreshFeed());
  }, []);

  const visibleLiveFeed = operationalFeed.length > 0 ? [...operationalFeed, ...liveFeed] : liveFeed;

  return (
    <div className="-mx-2 -mb-8 overflow-hidden rounded-[var(--radius-xl)] bg-[#071D49] text-white shadow-[0_30px_90px_rgba(7,29,73,0.26)] md:-mx-1">
      <div className="relative isolate min-h-screen overflow-hidden px-4 pb-24 pt-4 sm:px-5 lg:px-6">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_8%,rgba(255,122,26,0.26),transparent_28%),radial-gradient(circle_at_82%_2%,rgba(37,99,235,0.24),transparent_28%),linear-gradient(135deg,#071D49_0%,#0F2345_48%,#061536_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-white/10 to-transparent" />

        <header className="sticky top-3 z-10 rounded-[var(--radius-xl)] border border-white/12 bg-[#071D49]/78 px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius)] bg-orange-500 text-sm font-black text-white shadow-[0_0_30px_rgba(255,122,26,0.32)]">
                MS
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-200">Parent intelligence</p>
                <p className="truncate text-sm font-semibold text-white/70">Verified school data for Brian Otieno</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setNotice("Brian Otieno profile selected.")}
                className="rounded-full border border-orange-300/35 bg-orange-400/15 px-3 py-2 text-xs font-bold text-orange-100 transition hover:bg-orange-400/25"
              >
                Brian Otieno
              </button>
              <button
                type="button"
                onClick={() => setNotice("Aisha Wanjiku profile selected.")}
                className="rounded-full border border-white/12 bg-white/8 px-3 py-2 text-xs font-bold text-white/70 transition hover:bg-white/12 hover:text-white"
              >
                Aisha Wanjiku
              </button>
              <div className="relative">
                <button
                  type="button"
                  aria-label="Notifications"
                  aria-expanded={notificationsOpen}
                  onClick={() => {
                    setNotificationsOpen((value) => !value);
                    setNotice("Parent notifications opened.");
                  }}
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius)] border border-white/12 bg-white/8 text-white transition hover:bg-white/14"
                >
                  <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-400 motion-safe:animate-pulse" />
                  <Bell className="h-4 w-4" />
                </button>
                {notificationsOpen ? (
                  <div className="fade-in-panel absolute right-0 top-12 z-30 w-80 rounded-[var(--radius)] border border-white/12 bg-[#071D49] p-2 shadow-2xl">
                    <p className="px-2 py-1 text-xs font-black uppercase tracking-[0.16em] text-white/56">
                      Parent items needing attention
                    </p>
                    <div className="mt-1 space-y-1">
                      {parentNotifications.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setNotice(`${item.action} opened for Brian Otieno.`);
                            setNotificationsOpen(false);
                          }}
                          className="block w-full rounded-[var(--radius-sm)] px-3 py-2 text-left transition hover:bg-white/10"
                        >
                          <span className="block text-sm font-bold text-white">{item.title}</span>
                          <span className="mt-1 block text-xs leading-5 text-white/62">{item.detail}</span>
                          <span className="mt-2 block text-[11px] font-black uppercase tracking-[0.14em] text-orange-200">
                            {item.action}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setNotice("Language selector opened for English and Kiswahili.")}
                className="inline-flex h-10 items-center gap-2 rounded-[var(--radius)] border border-white/12 bg-white/8 px-3 text-xs font-bold text-white/76 transition hover:bg-white/14 hover:text-white"
              >
                <Languages className="h-4 w-4" />
                EN / SW
              </button>
              <button
                type="button"
                onClick={() => setNotice("AI child summary opened for Brian Otieno.")}
                className="inline-flex h-10 items-center gap-2 rounded-[var(--radius)] border border-emerald-300/30 bg-emerald-400/12 px-3 text-xs font-bold text-emerald-100 transition hover:bg-emerald-400/20"
              >
                <Bot className="h-4 w-4" />
                AI Assistant
              </button>
              <button
                type="button"
                onClick={() => setNotice("Emergency hotline opened. Direct school line: +254 700 000 111.")}
                className="inline-flex h-10 items-center gap-2 rounded-[var(--radius)] border border-red-300/35 bg-red-400/14 px-3 text-xs font-bold text-red-100 transition hover:bg-red-400/22"
              >
                <PhoneCall className="h-4 w-4" />
                Emergency hotline
              </button>
              <span className="grid h-10 w-10 place-items-center rounded-[var(--radius)] border border-white/12 bg-white/12 text-xs font-black">
                MW
              </span>
            </div>
          </div>
        </header>

        <main className="mt-5 space-y-6">
          <div role="status" className="rounded-[var(--radius)] border border-white/12 bg-white/[0.08] px-4 py-3 text-sm font-black text-white shadow-[0_14px_38px_rgba(0,0,0,0.16)]">
            {notice}
          </div>
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
            <GlassCard className="overflow-hidden p-5 md:p-7">
              <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_280px] 2xl:items-end">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-xs font-bold text-white/70">
                      {clockLabel}
                    </span>
                    <span className="rounded-full border border-emerald-300/30 bg-emerald-400/12 px-3 py-1.5 text-xs font-bold text-emerald-100">
                      Verified school feed
                    </span>
                  </div>
                  <DashboardGreeting
                    name="Mrs. Wanjiku"
                    tone="light"
                    asHeading
                    className="mt-5 max-w-3xl [&>*:first-child]:text-4xl [&>*:first-child]:font-black [&>*:first-child]:leading-tight [&>*:first-child]:tracking-normal md:[&>*:first-child]:text-5xl"
                  />
                  <p className="mt-4 max-w-2xl text-lg leading-8 text-white/72">
                    Here&apos;s everything happening with Brian today.
                  </p>
                  <div className="mt-6 grid gap-3 md:grid-cols-3">
                    {[
                      "Brian improved in Mathematics this week.",
                      "Fee balance requires attention.",
                      "School bus departed safely.",
                    ].map((message) => (
                      <div key={message} className="rounded-[var(--radius)] border border-white/12 bg-white/[0.07] px-4 py-3 text-sm font-semibold text-white/76">
                        {message}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-[var(--radius-xl)] border border-white/12 bg-white/[0.08] p-4 shadow-[0_20px_56px_rgba(0,0,0,0.18)]">
                  <div className="flex items-center gap-4">
                    <div className="grid h-20 w-20 place-items-center rounded-[var(--radius-xl)] bg-gradient-to-br from-orange-400 to-blue-500 text-2xl font-black text-white shadow-[0_18px_38px_rgba(0,0,0,0.25)]">
                      BO
                    </div>
                    <div>
                      <p className="text-lg font-black text-white">Brian Otieno</p>
                      <p className="mt-1 text-sm text-white/58">Form 2 Blue - Kisumu Boys Demo</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <MetricPill icon={ClipboardCheck} label="Attendance" value="94%" />
                    <MetricPill icon={ShieldCheck} label="Discipline" value="96" />
                    <MetricPill icon={GraduationCap} label="Average" value="72%" />
                    <MetricPill icon={Bus} label="Bus" value="En route" />
                  </div>
                  <div className="mt-4 rounded-[var(--radius)] border border-emerald-300/25 bg-emerald-400/10 px-4 py-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-emerald-100">
                      <LockKeyhole className="h-4 w-4" />
                      Verified school badge
                    </div>
                    <p className="mt-1 text-xs leading-5 text-emerald-100/72">Encrypted parent communication. Last login today.</p>
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-5">
              <SectionHeader icon={Sparkles} label="Quick summary" title="Peace-of-mind scan" />
              <div className="space-y-4">
                <ProgressDonut value={92} label="Child safety confidence" tone="good" />
                <div className="grid gap-3">
                  <div className="rounded-[var(--radius)] border border-white/12 bg-white/[0.07] px-4 py-3">
                    <p className="text-sm font-bold text-white">Financial status</p>
                    <p className="mt-1 text-sm text-orange-100/76">Exam clearance pending fee balance review.</p>
                  </div>
                  <div className="rounded-[var(--radius)] border border-white/12 bg-white/[0.07] px-4 py-3">
                    <p className="text-sm font-bold text-white">Health status</p>
                    <p className="mt-1 text-sm text-emerald-100/76">Clinic case closed. No emergency action needed.</p>
                  </div>
                </div>
              </div>
            </GlassCard>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpiItems.map((item) => (
              <KpiCard key={item.id} item={item} routeMode={routeMode} />
            ))}
          </section>

          <GlassCard className="p-5">
            <SectionHeader icon={Home} label="Parent action center" title="Fast actions for today" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {quickActions.map((item) => (
                <ActionButton key={item.id} item={item} routeMode={routeMode} onAction={setNotice} />
              ))}
            </div>
          </GlassCard>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
              <GlassCard id="alerts" className="p-5">
                <SectionHeader
                  icon={AlertTriangle}
                  label="Live risk feed"
                  title="Real-time alerts center"
                  action={
                    <span className="rounded-full border border-red-300/30 bg-red-400/12 px-3 py-1.5 text-xs font-bold text-red-100">
                      2 urgent
                    </span>
                  }
                />
                <div className="grid gap-3">
                  {visibleLiveFeed.map((item) => (
                    <FeedRow key={item.id} item={item} />
                  ))}
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <SectionHeader icon={Clock} label="Today" title="Today's class timeline" />
                <div className="space-y-3">
                  {classTimeline.map((item) => (
                    <TimelineCard key={item.id} item={item} />
                  ))}
                </div>
              </GlassCard>

              <GlassCard id="academics" className="p-5">
                <SectionHeader
                  icon={GraduationCap}
                  label="Learning"
                  title="Academic performance overview"
                  action={
                    <Link
                      href={parentHref("academics", routeMode)}
                      className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-white/12 bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:border-orange-300/35 hover:text-orange-100"
                    >
                      Open academics
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  }
                />
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="space-y-4">
                    {subjectRows.map((row) => (
                      <div key={row.subject} className="rounded-[var(--radius)] border border-white/12 bg-white/[0.07] px-4 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-bold text-white">{row.subject}</p>
                            <p className="mt-1 text-sm text-white/60">{row.note}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {row.trend >= 0 ? <TrendingUp className="h-4 w-4 text-emerald-200" /> : <TrendingDown className="h-4 w-4 text-orange-200" />}
                            <span className={row.trend >= 0 ? "text-sm font-black text-emerald-100" : "text-sm font-black text-orange-100"}>
                              {row.trend >= 0 ? "+" : ""}{row.trend}%
                            </span>
                          </div>
                        </div>
                        <div className="mt-4">
                          <BarRow label="Subject mastery" value={row.score} tone={row.tone} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-4">
                    <div className="rounded-[var(--radius-xl)] border border-orange-300/24 bg-orange-400/10 p-4">
                      <p className="text-sm font-black text-orange-100">AI academic insight</p>
                      <p className="mt-2 text-sm leading-6 text-white/70">
                        Most learners in Brian&apos;s stream struggle with algebraic expressions. A 20-minute daily revision block is recommended.
                      </p>
                    </div>
                    <ProgressDonut value={78} label="CBC competency mastery" tone="info" />
                    <div className="rounded-[var(--radius)] border border-white/12 bg-white/[0.07] p-4">
                      <p className="text-sm font-bold text-white">Teacher remark</p>
                      <p className="mt-2 text-sm leading-6 text-white/64">Brian is focused in class and needs consistency in written mathematics practice.</p>
                    </div>
                  </div>
                </div>
              </GlassCard>

              <GlassCard id="attendance" className="p-5">
                <SectionHeader icon={ClipboardCheck} label="Presence" title="Attendance intelligence" />
                <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
                  <div className="space-y-4">
                    <ProgressDonut value={94} label="Daily attendance" tone="good" />
                    <div className="rounded-[var(--radius)] border border-orange-300/25 bg-orange-400/10 p-4">
                      <p className="text-sm font-black text-orange-100">Risk detection</p>
                      <p className="mt-2 text-sm leading-6 text-white/68">Frequent Monday lateness detected. Arrival improved this week.</p>
                    </div>
                  </div>
                  <div>
                    <Heatmap />
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <MetricPill icon={Clock} label="Late arrivals" value="2" />
                      <MetricPill icon={AlertTriangle} label="Missed lessons" value="1" />
                      <MetricPill icon={UsersRound} label="Chronic risk" value="Low" />
                    </div>
                  </div>
                </div>
              </GlassCard>

              <GlassCard id="finance" className="p-5">
                <SectionHeader icon={ReceiptText} label="Money clarity" title="Fees & finance tracking" />
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <MetricPill icon={ReceiptText} label="Total fees" value="KES 84,000" />
                      <MetricPill icon={CheckCircle2} label="Paid" value="KES 65,550" />
                      <MetricPill icon={CreditCard} label="Balance" value="KES 18,450" />
                    </div>
                    <BarRow label="Tuition paid" value={78} tone="good" />
                    <BarRow label="Transport paid" value={62} tone="warning" />
                    <BarRow label="Meals paid" value={100} tone="good" />
                    <div className="rounded-[var(--radius)] border border-orange-300/25 bg-orange-400/10 px-4 py-3 text-sm font-semibold text-orange-100">
                      Fee balance may affect exam access unless cleared or approved by school finance.
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Link
                      href={parentHref("fees", routeMode)}
                      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius)] bg-orange-500 px-4 text-sm font-black text-white shadow-[0_18px_40px_rgba(255,122,26,0.3)] transition hover:-translate-y-0.5 hover:bg-orange-600 focus-ring"
                    >
                      <CreditCard className="h-4 w-4" />
                      Pay with M-PESA
                    </Link>
                    <Link
                      href={parentHref("downloads", routeMode)}
                      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius)] border border-white/14 bg-white/10 px-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:border-orange-300/35 focus-ring"
                    >
                      <Download className="h-4 w-4" />
                      Download receipt
                    </Link>
                    <div className="rounded-[var(--radius)] border border-white/12 bg-white/[0.07] p-4">
                      <p className="text-sm font-bold text-white">Payment history</p>
                      <p className="mt-2 text-sm leading-6 text-white/64">Last receipt MPESA-9QS2 posted today at 8:18 AM.</p>
                    </div>
                  </div>
                </div>
              </GlassCard>

              <GlassCard id="discipline" className="p-5">
                <SectionHeader icon={ShieldAlert} label="Careful tone" title="Discipline & behaviour monitoring" />
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-[var(--radius)] border border-emerald-300/25 bg-emerald-400/10 p-4">
                    <p className="text-sm font-black text-emerald-100">Positive achievement</p>
                    <p className="mt-2 text-sm leading-6 text-white/70">Excellent classroom participation noted by English teacher.</p>
                  </div>
                  <div className="rounded-[var(--radius)] border border-orange-300/25 bg-orange-400/10 p-4">
                    <p className="text-sm font-black text-orange-100">Teacher observation</p>
                    <p className="mt-2 text-sm leading-6 text-white/70">Noise-making incident reported respectfully for parent awareness.</p>
                  </div>
                  <div className="rounded-[var(--radius)] border border-white/12 bg-white/[0.07] p-4">
                    <p className="text-sm font-black text-white">Behaviour trend</p>
                    <p className="mt-2 text-sm leading-6 text-white/64">Score steady at 96 with one new acknowledgement needed.</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard id="transport" className="p-5">
                <SectionHeader icon={Bus} label="Route safety" title="Transport tracking" />
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="rounded-[var(--radius-xl)] border border-white/12 bg-white/[0.07] p-5">
                    <div className="relative h-44 overflow-hidden rounded-[var(--radius)] border border-white/10 bg-[#061536]">
                      <div className="absolute inset-x-8 top-1/2 h-1 rounded-full bg-white/10" />
                      <div className="absolute left-8 top-1/2 h-1 w-[68%] -translate-y-1/2 rounded-full bg-gradient-to-r from-orange-300 to-emerald-300 shadow-[0_0_22px_rgba(255,122,26,0.35)]" />
                      {["School", "Kondele", "Mamboleo", "Home"].map((stop, index) => (
                        <div
                          key={stop}
                          className="absolute top-1/2 -translate-y-1/2 text-center"
                          style={{ left: `${8 + index * 28}%` }}
                        >
                          <span className={`mx-auto block h-4 w-4 rounded-full border border-white/30 ${index < 3 ? "bg-emerald-300" : "bg-white/20"}`} />
                          <span className="mt-3 block -translate-x-1/3 whitespace-nowrap text-[11px] font-bold text-white/64">{stop}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <MetricPill icon={Route} label="Route" value="Bus 14" />
                    <MetricPill icon={Clock} label="ETA" value="18 min" />
                    <MetricPill icon={UserRound} label="Driver" value="Mr. Ouma" />
                  </div>
                </div>
              </GlassCard>

              <GlassCard id="clinic" className="p-5">
                <SectionHeader icon={HeartPulse} label="Calm care" title="Clinic & health updates" />
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-[var(--radius)] border border-emerald-300/25 bg-emerald-400/10 p-4">
                    <p className="text-sm font-black text-emerald-100">Status</p>
                    <p className="mt-2 text-sm leading-6 text-white/70">Headache resolved after rest. Learner returned to class.</p>
                  </div>
                  <div className="rounded-[var(--radius)] border border-white/12 bg-white/[0.07] p-4">
                    <p className="text-sm font-black text-white">Medication</p>
                    <p className="mt-2 text-sm leading-6 text-white/64">No medication administered. Nurse note published.</p>
                  </div>
                  <div className="rounded-[var(--radius)] border border-white/12 bg-white/[0.07] p-4">
                    <p className="text-sm font-black text-white">Emergency incidents</p>
                    <p className="mt-2 text-sm leading-6 text-white/64">No emergency incidents reported this term.</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard id="messages" className="p-5">
                <SectionHeader icon={Mail} label="School contact" title="Communication center" />
                <div className="grid gap-4 lg:grid-cols-2">
                  <FeedRow item={{ id: "principal", title: "Principal notice", detail: "Mid-term academic brief will be sent Friday evening.", time: "new", tone: "info", icon: Bell }} />
                  <FeedRow item={{ id: "teacher", title: "Class teacher message", detail: "Please confirm Brian's mathematics revision time at home.", time: "2 unread", tone: "warning", icon: MessageCircle }} />
                  <FeedRow item={{ id: "sms", title: "SMS delivery", detail: "Fee reminder delivered to +254 7XX XXX 214.", time: "sent", tone: "good", icon: PhoneCall }} />
                  <FeedRow item={{ id: "meeting", title: "Meeting request", detail: "Class teacher available Tuesday 4:30 PM.", time: "open", tone: "info", icon: CalendarDays }} />
                </div>
              </GlassCard>

              <GlassCard id="assignments" className="p-5">
                <SectionHeader icon={FileText} label="Workload" title="Homework & assignments" />
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
                  <div className="space-y-4">
                    {homeworkRows.map((row) => (
                      <div key={row.title} className="rounded-[var(--radius)] border border-white/12 bg-white/[0.07] p-4">
                        <BarRow label={row.title} value={row.value} tone={row.tone} />
                        <p className="mt-2 text-sm text-white/64">{row.status}</p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-[var(--radius-xl)] border border-blue-300/24 bg-blue-400/10 p-4">
                    <p className="text-sm font-black text-blue-100">AI marking suggestion</p>
                    <p className="mt-2 text-sm leading-6 text-white/70">Focus tonight on algebraic simplification and lab report conclusion quality.</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <SectionHeader icon={CalendarDays} label="Planning" title="Timetable snapshot" />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {classTimeline.map((item) => (
                    <div key={`snapshot-${item.id}`} className="rounded-[var(--radius)] border border-white/12 bg-white/[0.07] p-4">
                      <p className="text-sm font-black text-white">{item.time}</p>
                      <p className="mt-2 text-sm font-bold text-white/78">{item.title}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.13em] text-orange-100">{item.status}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <SectionHeader icon={LibraryBig} label="Resources" title="Library & school resources" />
                <div className="grid gap-4 md:grid-cols-3">
                  <MetricPill icon={LibraryBig} label="Borrowed books" value="2" />
                  <MetricPill icon={AlertTriangle} label="Overdue" value="1" />
                  <MetricPill icon={Download} label="Downloads" value="4" />
                </div>
                <p className="mt-4 rounded-[var(--radius)] border border-orange-300/25 bg-orange-400/10 px-4 py-3 text-sm font-semibold text-orange-100">
                  Library book overdue: The River and the Source should be returned this week.
                </p>
              </GlassCard>

              <GlassCard id="ai-insights" className="p-5">
                <SectionHeader icon={Bot} label="Prediction" title="AI insights & recommendations" />
                <div className="grid gap-4 lg:grid-cols-2">
                  {[
                    "Brian performs better in morning lessons.",
                    "Attendance decline correlates with Mathematics performance.",
                    "Homework completion improved this month.",
                    "Potential exam risk detected in Chemistry revision topics.",
                  ].map((insight) => (
                    <div key={insight} className="rounded-[var(--radius)] border border-white/12 bg-white/[0.07] p-4">
                      <div className="flex items-start gap-3">
                        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-orange-200" />
                        <p className="text-sm font-semibold leading-6 text-white/76">{insight}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>

            <aside className="space-y-6 xl:sticky xl:top-28 xl:self-start">
              <GlassCard className="p-5">
                <SectionHeader icon={Bell} label="Right now" title="Announcements" />
                <div className="space-y-3">
                  {[
                    ["Principal notice", "Exam timetable is now available."],
                    ["Reminder", "Bring signed trip consent by Friday."],
                    ["Deadline", "Fee clearance review on May 29."],
                  ].map(([title, detail]) => (
                    <div key={title} className="rounded-[var(--radius)] border border-white/12 bg-white/[0.07] p-4">
                      <p className="text-sm font-black text-white">{title}</p>
                      <p className="mt-1 text-sm leading-5 text-white/62">{detail}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <SectionHeader icon={CalendarDays} label="Calendar" title="Upcoming events & deadlines" />
                <div className="space-y-3">
                  {events.map((event) => (
                    <div key={event.title} className="flex gap-3 rounded-[var(--radius)] border border-white/12 bg-white/[0.07] p-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-orange-400/15 text-xs font-black text-orange-100">
                        {event.date.split(" ")[0]}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-white">{event.title}</p>
                        <p className="text-xs text-white/50">{event.date}</p>
                        <p className="mt-1 text-xs text-white/64">{event.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <SectionHeader icon={UsersRound} label="Family" title="Multi-child switching" />
                <div className="space-y-3">
                  <div className="rounded-[var(--radius)] border border-orange-300/35 bg-orange-400/12 p-4">
                    <p className="text-sm font-black text-white">Brian Otieno</p>
                    <p className="mt-1 text-xs text-orange-100/74">Active profile - Form 2 Blue</p>
                  </div>
                  <div className="rounded-[var(--radius)] border border-white/12 bg-white/[0.07] p-4">
                    <p className="text-sm font-black text-white">Aisha Wanjiku</p>
                    <p className="mt-1 text-xs text-white/58">Grade 5 - ready when linked</p>
                  </div>
                  <div className="rounded-[var(--radius)] border border-white/12 bg-white/[0.07] p-4">
                    <p className="text-sm font-black text-white">Family finance overview</p>
                    <p className="mt-1 text-xs text-white/58">Combined balance KES 18,450</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard id="emergency" className="p-5 ring-1 ring-red-300/20">
                <SectionHeader icon={PhoneCall} label="Always visible" title="Emergency panel" />
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setNotice("Emergency hotline opened. Direct school line: +254 700 000 111.")}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius)] bg-red-500 px-4 text-sm font-black text-white shadow-[0_18px_40px_rgba(239,68,68,0.28)] transition hover:-translate-y-0.5 hover:bg-red-600"
                  >
                    <PhoneCall className="h-4 w-4" />
                    Emergency hotline
                  </button>
                  <div className="rounded-[var(--radius)] border border-red-300/25 bg-red-400/10 p-4">
                    <p className="text-sm font-black text-red-100">Direct school line</p>
                    <p className="mt-1 text-sm text-white/72">+254 700 000 111</p>
                  </div>
                  <div className="rounded-[var(--radius)] border border-white/12 bg-white/[0.07] p-4">
                    <p className="text-sm font-black text-white">Privacy indicator</p>
                    <p className="mt-1 text-sm leading-5 text-white/62">Only verified guardians can see Brian&apos;s record.</p>
                  </div>
                </div>
              </GlassCard>
            </aside>
          </section>
        </main>

        <nav className="fixed inset-x-3 bottom-3 z-20 rounded-[var(--radius-xl)] border border-white/12 bg-[#071D49]/88 p-2 shadow-[0_18px_50px_rgba(0,0,0,0.3)] backdrop-blur-2xl lg:hidden" aria-label="Mobile parent quick actions">
          <div className="grid grid-cols-5 gap-1">
            {[
              { label: "Home", icon: Home, href: parentHref("dashboard", routeMode) },
              { label: "Academics", icon: GraduationCap, href: parentHref("academics", routeMode) },
              { label: "Finance", icon: CreditCard, href: parentHref("fees", routeMode) },
              { label: "Alerts", icon: Bell, action: () => { setNotificationsOpen(true); setNotice("Parent notifications opened."); } },
              { label: "Profile", icon: UserRound, action: () => setNotice("Parent profile and linked learner records opened.") },
            ].map((item) => {
              const Icon = item.icon;
              const className = "flex flex-col items-center justify-center gap-1 rounded-[var(--radius)] px-2 py-2 text-[10px] font-bold text-white/72 transition hover:bg-white/10 hover:text-white";

              if ("href" in item && item.href) {
                return (
                  <Link key={item.label} href={item.href} className={className}>
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              }

              return (
                <button key={item.label} type="button" onClick={item.action} className={className}>
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
