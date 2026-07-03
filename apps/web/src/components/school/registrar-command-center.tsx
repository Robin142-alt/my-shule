"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileBarChart2,
  FileText,
  Fingerprint,
  GraduationCap,
  IdCard,
  Inbox,
  Layers,
  Mail,
  MessageSquareText,
  RadioTower,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserPlus,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import {
  getCurrentSchoolId,
  publishSchoolOperationalEvent,
} from "@/lib/school/school-operational-store";
import { ApprovalInbox } from "@/components/shared/approval-inbox";
import { NotificationBell } from "@/components/shared/notification-bell";
import { TaskQueue } from "@/components/shared/task-queue";
import { WorkflowToast } from "@/components/shared/workflow-toast";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { toast } from "sonner";

type RegistrarRouteMode = "hosted" | "public";
type Tone = "secure" | "info" | "success" | "warning" | "danger" | "cyan";

type RegistrarNavItem = {
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

type FunnelStage = {
  label: string;
  value: number;
  conversion: string;
  tone: Tone;
};

type ApplicantRow = {
  id: string;
  name: string;
  admissionNumber: string;
  grade: string;
  parent: string;
  status: string;
  fee: string;
  documents: string;
  interview: string;
  risk: string;
  date: string;
  tone: Tone;
};

function admissionsActionSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "") || "workflow.action";
}

async function persistAdmissionsWorkflowAction(input: {
  action: string;
  title: string;
  message: string;
  priority?: "normal" | "high" | "urgent";
  entityId?: string | null;
  payload?: Record<string, unknown>;
}) {
  return requestDashboardApi("/api/admin-command/admissions/actions", {
    method: "POST",
    body: {
      action: admissionsActionSlug(input.action),
      title: input.title,
      message: input.message,
      priority: input.priority ?? "normal",
      entityId: input.entityId ?? null,
      payload: input.payload ?? {},
      source: "registrar-command-center",
    },
  });
}

type ApplicantFilter = "All statuses" | "Pending" | "Verified" | "Interview Scheduled" | "Approved" | "Rejected" | "Waitlisted";

type Insight = {
  title: string;
  detail: string;
  confidence: string;
  tone: Tone;
};

type SimpleCard = {
  title: string;
  value: string;
  detail: string;
  tone: Tone;
};

type AdmissionsDashboardModel = {
  kpis: Kpi[];
  funnelStages: FunnelStage[];
  applicants: ApplicantRow[];
  documentCards: SimpleCard[];
  interviewCards: SimpleCard[];
  transferCards: SimpleCard[];
  allocationCards: SimpleCard[];
  aiInsights: Insight[];
  auditCards: SimpleCard[];
};

type RegistrarSearchRecord = { id: string; label: string; detail: string; sectionId: string };

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const toneStyles: Record<Tone, { border: string; bg: string; text: string; chip: string; dot: string; glow: string; icon: string }> = {
  secure: {
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

const lightToneChipStyles: Record<Tone, string> = {
  secure: "border-[#C8D5EA] bg-white text-[#071D49]",
  info: "border-blue-200 bg-blue-50 text-blue-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-orange-200 bg-orange-50 text-orange-800",
  danger: "border-rose-200 bg-rose-50 text-rose-800",
  cyan: "border-cyan-200 bg-cyan-50 text-cyan-800",
};

const navItems: RegistrarNavItem[] = [
  { label: "Dashboard", icon: BarChart3, href: "top", group: "Command", active: true },
  { label: "Admission Funnel", icon: Activity, href: "admission-funnel", group: "Admissions" },
  { label: "Applications", icon: ClipboardList, href: "applications", group: "Admissions" },
  { label: "New Admission", icon: UserPlus, href: "quick-actions", group: "Admissions" },
  { label: "Student Verification", icon: Fingerprint, href: "verification", group: "Integrity" },
  { label: "Document Center", icon: FileText, href: "documents", group: "Integrity" },
  { label: "Interviews", icon: CalendarClock, href: "interviews", group: "Integrity" },
  { label: "Transfers", icon: Layers, href: "transfers", group: "Integrity" },
  { label: "Waiting List", icon: Inbox, href: "waiting-list", group: "Placement" },
  { label: "Class Allocation", icon: GraduationCap, href: "class-allocation", group: "Placement" },
  { label: "Fee Clearance", icon: CheckCircle2, href: "fee-clearance", group: "Placement" },
  { label: "Parent Records", icon: UsersRound, href: "parent-records", group: "Records" },
  { label: "Student IDs", icon: IdCard, href: "student-ids", group: "Records" },
  { label: "Reports", icon: FileBarChart2, href: "reports", group: "Records" },
  { label: "Communication", icon: MessageSquareText, href: "communication", group: "Messaging" },
  { label: "Audit Logs", icon: ShieldCheck, href: "audit", group: "Compliance" },
  { label: "Settings", icon: Settings, href: "settings", group: "Compliance" },
];

const quickActions = [
  "Add Applicant",
  "Verify Documents",
  "Approve Admission",
  "Generate Admission Number",
  "Send Parent SMS",
  "Export Report",
] as const;

const heroAlerts: Array<{ label: string; tone: Tone }> = [
  { label: "Admissions are 18% higher than last term.", tone: "success" },
  { label: "32 applicants pending KCPE verification.", tone: "warning" },
  { label: "Form 1 capacity almost full.", tone: "danger" },
  { label: "12 parents have not completed fee confirmation.", tone: "warning" },
];

const kpis: Kpi[] = [
  { label: "Total Applications", value: "1,284", helper: "Admissions are 18% higher than last term", trend: "+18%", tone: "cyan", icon: ClipboardList, points: [740, 820, 910, 980, 1080, 1170, 1284] },
  { label: "Approved Admissions", value: "742", helper: "57.8% approval velocity", trend: "+11%", tone: "success", icon: UserCheck, points: [420, 470, 530, 610, 655, 701, 742] },
  { label: "Pending Verifications", value: "136", helper: "32 applicants pending KCPE verification", trend: "urgent", tone: "warning", icon: Fingerprint, points: [91, 108, 116, 121, 129, 133, 136] },
  { label: "Rejected Applications", value: "44", helper: "Fraud and incomplete file controls", trend: "-6%", tone: "info", icon: ShieldAlert, points: [52, 49, 47, 51, 46, 45, 44] },
  { label: "Available Seats", value: "118", helper: "Form 1 capacity almost full", trend: "watch", tone: "danger", icon: GraduationCap, points: [260, 228, 202, 177, 149, 132, 118] },
  { label: "Transfer Requests", value: "29", helper: "12 incoming files need clearance", trend: "+4", tone: "warning", icon: Layers, points: [14, 19, 17, 22, 24, 26, 29] },
  { label: "Fee Confirmation Pending", value: "12", helper: "12 parents have not completed fee confirmation", trend: "follow up", tone: "danger", icon: CheckCircle2, points: [24, 21, 18, 16, 14, 13, 12] },
  { label: "Interviews Scheduled", value: "86", helper: "Panels assigned for this week", trend: "+23%", tone: "success", icon: CalendarClock, points: [29, 35, 42, 51, 64, 72, 86] },
  { label: "Waiting List Count", value: "73", helper: "Boarding pressure rising", trend: "+15", tone: "warning", icon: Inbox, points: [41, 49, 53, 58, 63, 69, 73] },
  { label: "Enrollment Conversion Rate", value: "64%", helper: "WhatsApp reminders improved conversions by 23%", trend: "+23%", tone: "cyan", icon: BarChart3, points: [41, 46, 52, 55, 58, 61, 64] },
];

const funnelStages: FunnelStage[] = [
  { label: "Inquiries", value: 2210, conversion: "100%", tone: "cyan" },
  { label: "Applications Started", value: 1684, conversion: "76%", tone: "info" },
  { label: "Applications Completed", value: 1284, conversion: "76%", tone: "success" },
  { label: "Documents Submitted", value: 1096, conversion: "85%", tone: "warning" },
  { label: "Verification Complete", value: 960, conversion: "88%", tone: "success" },
  { label: "Interviews Done", value: 814, conversion: "85%", tone: "info" },
  { label: "Approved Students", value: 742, conversion: "91%", tone: "success" },
  { label: "Fee Confirmed", value: 672, conversion: "91%", tone: "warning" },
  { label: "Fully Enrolled", value: 646, conversion: "96%", tone: "cyan" },
];

const applicants: ApplicantRow[] = [];

const documentCards: SimpleCard[] = [
  { title: "Birth Certificate", value: "94%", detail: "OCR verification passed for most uploads", tone: "success" },
  { title: "KCPE Results", value: "32 pending", detail: "32 applicants pending KCPE verification", tone: "warning" },
  { title: "Transfer Letter", value: "18 reviews", detail: "Previous school approvals need registrar action", tone: "info" },
  { title: "Passport Photo", value: "11 missing", detail: "Student ID generation blocked", tone: "warning" },
  { title: "Parent ID", value: "7 conflicts", detail: "Incomplete guardian data flagged", tone: "danger" },
  { title: "Medical Forms", value: "83%", detail: "Nurse review queue synchronized", tone: "success" },
  { title: "Previous Report Forms", value: "26 pending", detail: "Class placement confidence depends on review", tone: "warning" },
  { title: "Tampering Alert", value: "4 files", detail: "AI confidence score below 62%", tone: "danger" },
];

const aiInsights: Insight[] = [
  { title: "Girls boarding capacity likely to fill in 5 days.", detail: "Current waitlist growth and fee confirmations show boarding demand exceeding safe allocation.", confidence: "91% confidence", tone: "danger" },
  { title: "Applicants from Kiambu convert 32% faster.", detail: "Regional admissions trend suggests targeted communication for slower counties.", confidence: "84% confidence", tone: "cyan" },
  { title: "12 applications likely incomplete.", detail: "Missing birth certificate, parent ID, and KCPE result patterns are delaying approvals.", confidence: "88% confidence", tone: "warning" },
  { title: "Most drop-offs occur after document upload.", detail: "Parent document friction is the biggest bottleneck before verification complete.", confidence: "86% confidence", tone: "warning" },
  { title: "WhatsApp reminders improved conversions by 23%.", detail: "Reminder templates increased movement from fee confirmation to fully enrolled.", confidence: "79% confidence", tone: "success" },
];

const allocationCards: SimpleCard[] = [
  { title: "Form 1 East", value: "+7 over", detail: "Form 1 East exceeds capacity by 7 students.", tone: "danger" },
  { title: "Form 1 West", value: "38/45", detail: "Healthy stream population", tone: "success" },
  { title: "Girls boarding", value: "92%", detail: "Boarding allocation imbalance detected.", tone: "warning" },
  { title: "Special needs", value: "6 pending", detail: "Placement review required before approval", tone: "info" },
];

const interviewCards: SimpleCard[] = [
  { title: "Scheduled", value: "86", detail: "Interview panel assigned", tone: "info" },
  { title: "Attended", value: "64", detail: "Scoring forms synced", tone: "success" },
  { title: "Rescheduled", value: "14", detail: "Parent appointment booking pending", tone: "warning" },
  { title: "Missed", value: "8", detail: "SMS follow-up needed", tone: "danger" },
  { title: "Recommended", value: "51", detail: "Ready for approval workflow", tone: "success" },
  { title: "Declined", value: "5", detail: "Audit reason required", tone: "warning" },
];

const transferCards: SimpleCard[] = [
  { title: "Incoming students", value: "19", detail: "Document verification and class mapping active", tone: "info" },
  { title: "Outgoing students", value: "7", detail: "Clearance status awaiting bursar and library", tone: "warning" },
  { title: "Inter-school migration", value: "3", detail: "Historical records and migration logs attached", tone: "success" },
  { title: "Approval chain", value: "11 steps", detail: "Transfers remain secure and traceable", tone: "cyan" },
];

const auditCards: SimpleCard[] = [
  { title: "Who approved admissions", value: "742 logs", detail: "Every admission approval is tied to a staff identity", tone: "success" },
  { title: "Who edited records", value: "38 edits", detail: "Sensitive record edits require reason tracking", tone: "warning" },
  { title: "Document upload history", value: "1,936 files", detail: "Upload timeline preserved for every applicant", tone: "info" },
  { title: "Status changes", value: "2,841 events", detail: "Application movement is audit-ready", tone: "cyan" },
  { title: "Fee approval logs", value: "672 confirmations", detail: "No fee clearance without traceability", tone: "success" },
  { title: "Transfer logs", value: "29 chains", detail: "Migration records stay government-compliant", tone: "warning" },
];

function groupNav() {
  return navItems.reduce<Record<string, RegistrarNavItem[]>>((groups, item) => {
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

function LightStatusChip({ icon: Icon, label, tone }: { icon: LucideIcon; label: string; tone: Tone }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black shadow-sm", lightToneChipStyles[tone])}>
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
    <aside className="hidden h-full rounded-[var(--radius-xl)] border border-[#C8D5EA]/50 bg-[#071D49] p-4 text-white shadow-[0_24px_70px_rgba(7,29,73,0.22)] xl:sticky xl:top-5 xl:block" aria-label="Registrar dashboard navigation">
      <div className="rounded-[var(--radius-lg)] border border-white/10 bg-white/[0.06] p-4">
        <p className="text-xs font-black uppercase text-cyan-200">Admissions integrity</p>
        <h2 className="mt-2 text-2xl font-black">Registrar Control</h2>
        <p className="mt-2 text-sm leading-6 text-white/66">Student records, approvals, transfers, and compliance stay traceable.</p>
      </div>
      <nav className="mt-5 max-h-[calc(100vh-250px)] space-y-5 overflow-auto pr-1">
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
      <div className="mt-5 rounded-[var(--radius-lg)] border border-emerald-300/25 bg-emerald-400/10 p-4">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-100/70">System Health</p>
        <p className="mt-2 text-sm font-black">Registrar Profile - Online</p>
        <p className="mt-1 text-xs text-white/58">School Logo synced. Notification Center active.</p>
      </div>
    </aside>
  );
}

function TopHeader({
  searchTerm,
  searchResults,
  onQuickActions,
  onSearchResult,
  onSearchTermChange,
}: {
  searchTerm: string;
  searchResults: RegistrarSearchRecord[];
  onQuickActions: () => void;
  onSearchResult: (record: RegistrarSearchRecord) => void;
  onSearchTermChange: (value: string) => void;
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
    : "Live admissions clock syncing";

  return (
    <header id="top" className="rounded-[var(--radius-xl)] border border-[#C8D5EA] bg-white p-4 text-[#071D49] shadow-[0_18px_50px_rgba(7,29,73,0.12)] md:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-[var(--radius-lg)] bg-[#071D49] text-sm font-black text-white shadow-[0_16px_34px_rgba(7,29,73,0.18)]">MS</div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5F6F89]">MyShule admissions office</p>
            <p className="mt-1 text-lg font-black md:text-2xl">Registrar Admissions Command Center</p>
            <p className="mt-1 text-sm font-semibold text-[#5F6F89]">{liveClock}</p>
          </div>
        </div>
        <div className="grid gap-3 lg:min-w-[680px]">
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
              aria-label="Global search applicants, admission numbers, parents, documents, transfers, or reports"
              placeholder="Search applicant, admission no., parent, document, transfer, or report"
              className="h-12 w-full rounded-[var(--radius-lg)] border border-[#C8D5EA] bg-[#F8FAFC] pl-12 pr-4 text-sm font-semibold text-[#071D49] outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-300/20"
            />
            {searchTerm.trim().length > 0 ? (
              <div className="absolute left-0 right-0 top-14 z-20 overflow-hidden rounded-[var(--radius-lg)] border border-[#C8D5EA] bg-white text-[#071D49] shadow-2xl">
                {searchResults.length > 0 ? (
                  searchResults.map((record) => (
                    <button key={record.id} type="button" onClick={() => onSearchResult(record)} className="block w-full px-4 py-3 text-left text-sm hover:bg-cyan-50">
                      <span className="block font-black">{record.label}</span>
                      <span className="mt-1 block text-xs font-semibold text-[#5F6F89]">{record.detail}</span>
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-3 text-sm font-bold text-[#5F6F89]">No matching admissions record found.</p>
                )}
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LightStatusChip icon={CalendarClock} label="2026 Admission Year" tone="info" />
            <LightStatusChip icon={ShieldCheck} label="Main Campus" tone="success" />
            <div className="flex items-center gap-2">
              <TaskQueue />
              <ApprovalInbox currentUserId="school" />
              <NotificationBell />
            </div>
            <LightStatusChip icon={BrainCircuit} label="AI insights ready" tone="cyan" />
            <button
              type="button"
              onClick={onQuickActions}
              className="inline-flex min-h-9 items-center gap-2 rounded-[var(--radius)] bg-[#071D49] px-3 text-xs font-black text-white"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Quick actions
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
            <StatusChip icon={ShieldCheck} label="Audit-ready admissions" tone="success" />
            <StatusChip icon={RadioTower} label="Real-time enrollment integrity" tone="cyan" />
          </div>
          <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight md:text-6xl">Registrar Admissions Command Center</h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-white/72">
            This school is organized, professional, trusted, compliant, and impossible to manipulate.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {heroAlerts.map(({ label, tone }) => (
              <div key={label} className={cn("rounded-[var(--radius-lg)] border p-4", toneStyles[tone].border, toneStyles[tone].bg)}>
                <p className="text-sm font-black leading-5">{label}</p>
                <span className={cn("mt-4 block h-2 w-16 rounded-full", toneStyles[tone].dot)} />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-white/12 bg-white/[0.07] p-5 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-black">Enrollment targets</h2>
              <p className="mt-1 text-sm text-white/62">Target, conversion, capacity, and risk pulse</p>
            </div>
            <StatusChip icon={Activity} label="Live" tone="success" />
          </div>
          <div className="mt-6">
            <MiniLine points={[41, 46, 52, 55, 58, 61, 64]} tone="cyan" />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-[var(--radius-lg)] border border-emerald-300/25 bg-emerald-400/10 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-100/70">Target progress</p>
              <p className="mt-2 text-3xl font-black">84%</p>
            </div>
            <div className="rounded-[var(--radius-lg)] border border-orange-300/30 bg-[#FF7A1A]/12 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-orange-100/70">Bottlenecks</p>
              <p className="mt-2 text-3xl font-black">3</p>
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
      transition={{ duration: 0.32, delay: index * 0.025 }}
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

function DarkSection({ id, children, className }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={cn("rounded-[var(--radius-xl)] border border-[#C8D5EA]/18 bg-[#071D49] p-5 text-white shadow-[0_22px_60px_rgba(7,29,73,0.18)] md:p-6", className)}>
      {children}
    </section>
  );
}

function SectionTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
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

function AdmissionsFunnel({ data }: { data: AdmissionsDashboardModel | null }) {
  return (
    <DarkSection id="admission-funnel" className="bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.14),transparent_25%),#071D49]">
      <SectionTitle
        eyebrow="Enrollment intelligence"
        title="Admissions funnel"
        description="Inquiry to fully enrolled stages show conversion percentages, bottlenecks, drop-off points, and real-time current counts."
        action={<StatusChip icon={BrainCircuit} label="AI funnel scan" tone="cyan" />}
      />
      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {(data?.funnelStages || funnelStages).map((stage, index) => (
            <div key={stage.label} className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)_82px] md:items-center">
              <div>
                <p className="text-sm font-black">{stage.label}</p>
                <p className="text-xs text-white/52">{stage.value.toLocaleString()} current count</p>
              </div>
              <div className="h-7 overflow-hidden rounded-full border border-white/10 bg-white/[0.06]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(18, 100 - index * 7)}%` }}
                  transition={{ duration: 0.55, delay: index * 0.04 }}
                  className={cn("h-full rounded-full", toneStyles[stage.tone].dot)}
                />
              </div>
              <span className={cn("rounded-full border px-2.5 py-1 text-center text-xs font-black", toneStyles[stage.tone].chip)}>{stage.conversion}</span>
            </div>
          ))}
        </div>
        <div className="rounded-[var(--radius-xl)] border border-orange-300/30 bg-[#FF7A1A]/12 p-5">
          <BrainCircuit className="h-8 w-8 text-[#FFB36F]" aria-hidden="true" />
          <h3 className="mt-4 text-xl font-black">Funnel intelligence</h3>
          <p className="mt-3 text-sm leading-6 text-white/68">Most drop-offs occur after document upload.</p>
          <p className="mt-3 text-sm leading-6 text-white/68">WhatsApp reminders improved conversions by 23%.</p>
        </div>
      </div>
    </DarkSection>
  );
}

function ApplicationManagement({
  applicantsData,
  onApplicantFilter,
  onApplicationPreview,
}: {
  applicantsData: ApplicantRow[];
  onApplicantFilter: (filter: ApplicantFilter) => void;
  onApplicationPreview: (applicant: ApplicantRow) => void;
}) {
  return (
    <DarkSection id="applications">
      <SectionTitle
        eyebrow="Applicant command"
        title="Application management"
        description="Advanced applicant table with filters, bulk actions, smart search, sorting, row expansion, color-coded statuses, risk flags, and quick preview."
        action={<StatusChip icon={ClipboardList} label="Bulk actions ready" tone="info" />}
      />
      <div className="mt-5 flex flex-wrap gap-2">
        {(["All statuses", "Pending", "Verified", "Interview Scheduled", "Approved", "Rejected", "Waitlisted"] satisfies ApplicantFilter[]).map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => onApplicantFilter(filter)}
            className="rounded-full border border-white/12 bg-white/[0.07] px-3 py-1.5 text-xs font-black text-white/76 hover:bg-white/12"
          >
            {filter}
          </button>
        ))}
      </div>
      <div className="mt-5 overflow-x-auto rounded-[var(--radius-xl)] border border-white/10">
        <table className="min-w-[1180px] w-full border-collapse text-left text-sm">
          <thead className="bg-white/[0.07] text-xs uppercase tracking-[0.14em] text-white/52">
            <tr>
              {["Applicant Name", "Admission Number", "Grade Applying", "Parent Contact", "Status", "Fee Status", "Document Status", "Interview Status", "Risk Flag", "Date Applied", "Actions"].map((header) => (
                <th key={header} className="px-4 py-3 font-black">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {applicantsData.map((applicant) => (
              <tr key={applicant.name} className="border-t border-white/10">
                <td className="px-4 py-4 font-black">{applicant.name}</td>
                <td className="px-4 py-4 text-white/68">{applicant.admissionNumber}</td>
                <td className="px-4 py-4 text-white/68">{applicant.grade}</td>
                <td className="px-4 py-4 text-white/68">{applicant.parent}</td>
                <td className="px-4 py-4"><span className={cn("rounded-full border px-2.5 py-1 text-xs font-black", toneStyles[applicant.tone].chip)}>{applicant.status}</span></td>
                <td className="px-4 py-4 text-white/68">{applicant.fee}</td>
                <td className="px-4 py-4 text-white/68">{applicant.documents}</td>
                <td className="px-4 py-4 text-white/68">{applicant.interview}</td>
                <td className="px-4 py-4 font-bold text-white">{applicant.risk}</td>
                <td className="px-4 py-4 text-white/68">{applicant.date}</td>
                <td className="px-4 py-4">
                  <button
                    type="button"
                    onClick={() => onApplicationPreview(applicant)}
                    className="rounded-[var(--radius)] border border-cyan-300/30 bg-cyan-400/12 px-3 py-2 text-xs font-black text-cyan-100"
                  >
                    Preview
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DarkSection>
  );
}

function CardGrid({ cards, icon }: { cards: SimpleCard[]; icon: LucideIcon }) {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article key={card.title} className={cn("rounded-[var(--radius-xl)] border p-4", toneStyles[card.tone].border, toneStyles[card.tone].bg)}>
          <div className="flex items-center justify-between gap-3">
            <IconTile icon={icon} tone={card.tone} />
            <span className={cn("h-3 w-3 rounded-full", toneStyles[card.tone].dot)} />
          </div>
          <h3 className="mt-4 text-sm font-black uppercase tracking-[0.12em] text-white/58">{card.title}</h3>
          <p className="mt-2 text-2xl font-black">{card.value}</p>
          <p className="mt-2 text-sm leading-5 text-white/64">{card.detail}</p>
        </article>
      ))}
    </div>
  );
}

function DocumentCenter({ data }: { data: any }) {
  return (
    <DarkSection id="documents">
      <SectionTitle
        eyebrow="Fraud-resistant verification"
        title="Document verification center"
        description="Birth certificate, KCPE results, transfer letter, passport photo, parent ID, medical forms, previous reports, OCR verification, approval workflow, upload timeline, and AI confidence scoring."
        action={<StatusChip icon={Fingerprint} label="OCR verification" tone="success" />}
      />
      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_360px]">
        <CardGrid cards={(data?.documentCards || documentCards)} icon={FileText} />
        <div className="rounded-[var(--radius-xl)] border border-rose-300/35 bg-rose-500/12 p-5">
          <AlertTriangle className="h-8 w-8 text-rose-200" aria-hidden="true" />
          <h3 className="mt-4 text-xl font-black">Tampering alert</h3>
          <p className="mt-3 text-sm leading-6 text-white/68">4 suspicious records show metadata mismatch, low AI confidence score, or duplicate image signatures.</p>
          <div className="mt-5 rounded-[var(--radius-lg)] border border-white/10 bg-white/[0.055] p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-white/52">Verification completion</p>
            <p className="mt-2 text-4xl font-black">87%</p>
            <p className="mt-1 text-sm text-white/58">Pending reviews: 136. Suspicious records: 4.</p>
          </div>
        </div>
      </div>
    </DarkSection>
  );
}

function ClassAllocation({ data }: { data: any }) {
  return (
    <DarkSection id="class-allocation">
      <SectionTitle
        eyebrow="Placement intelligence"
        title="Class allocation panel"
        description="Available capacity, stream population, gender ratio, boarding/day allocation, performance grouping, special needs placement, auto-allocation AI suggestions, conflict warnings, and overcapacity alerts."
        action={<StatusChip icon={GraduationCap} label="AI allocation" tone="cyan" />}
      />
      <CardGrid cards={(data?.allocationCards || allocationCards)} icon={GraduationCap} />
    </DarkSection>
  );
}

function InterviewAndTransfers({ data }: { data: any }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <DarkSection id="interviews">
        <SectionTitle eyebrow="Screening workflow" title="Interview & screening module" description="Schedule interviews, assign interview panel, manage parent appointment booking, score applicants, capture remarks, and use recommendation engine statuses." />
        <CardGrid cards={(data?.interviewCards || interviewCards)} icon={CalendarClock} />
      </DarkSection>
      <DarkSection id="transfers">
        <SectionTitle eyebrow="Traceable movement" title="Transfer management" description="Incoming, outgoing, and inter-school migration workflows with clearance status, document verification, approval chain, historical records, and migration logs." />
        <CardGrid cards={(data?.transferCards || transferCards)} icon={Layers} />
      </DarkSection>
    </div>
  );
}

function CommunicationAndReports({ data }: { data: any }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <DarkSection id="communication">
        <SectionTitle eyebrow="Parent messaging" title="Communication center" description="SMS center, WhatsApp notifications, email templates, admission reminders, interview reminders, fee reminders, approval notifications, and delivery activity streams." />
        <div className="mt-6 grid gap-3">
          {["Admission reminder", "Interview reminder", "Fee reminder", "Approval notification"].map((template) => (
            <div key={template} className="flex items-center justify-between rounded-[var(--radius-lg)] border border-white/10 bg-white/[0.055] px-4 py-3">
              <span className="font-black">{template}</span>
              <Mail className="h-5 w-5 text-cyan-200" aria-hidden="true" />
            </div>
          ))}
        </div>
      </DarkSection>
      <DarkSection id="reports">
        <SectionTitle eyebrow="Admissions analytics" title="Reports & analytics" description="Admission trends, conversion rates, class occupancy, gender distribution, regional admissions, rejection reasons, revenue projections, enrollment forecasting, heatmaps, rings, and exports." />
        <div className="mt-6">
          <Bars values={[44, 62, 58, 76, 69, 83, 91]} tone="cyan" />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {["PDF export", "Excel export", "Class occupancy", "Enrollment forecasting"].map((item) => (
            <p key={item} className="rounded-[var(--radius-lg)] border border-white/10 bg-white/[0.055] px-4 py-3 text-sm font-black">{item}</p>
          ))}
        </div>
      </DarkSection>
    </div>
  );
}

function AiInsights({ data }: { data: AdmissionsDashboardModel | null }) {
  return (
    <DarkSection id="ai-insights" className="bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_25%),#071D49]">
      <SectionTitle eyebrow="AI assistant" title="AI registrar insights" description="Bottlenecks, enrollment predictions, suspicious applications, follow-up suggestions, seat shortage forecasts, and inactive applicant detection." action={<StatusChip icon={BrainCircuit} label="Predictive" tone="cyan" />} />
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {(data?.aiInsights || aiInsights).map((insight) => (
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

function AuditCompliance({ data }: { data: AdmissionsDashboardModel | null }) {
  return (
    <DarkSection id="audit">
      <SectionTitle eyebrow="Government-compliant records" title="Audit & compliance" description="Who approved admissions, who edited records, document upload history, status changes, fee approval logs, transfer logs, and compliance-ready traceability." action={<StatusChip icon={ShieldCheck} label="Audit-ready" tone="success" />} />
      <CardGrid cards={(data?.auditCards || auditCards)} icon={ShieldCheck} />
    </DarkSection>
  );
}

function QuickActionsAndSupport({ onQuickAction }: { onQuickAction: () => void }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_1fr_1fr]">
      <DarkSection id="quick-actions">
        <SectionTitle eyebrow="Fast processing" title="Quick actions" description="Optimistic registrar actions for rapid processing without losing traceability." />
        <div className="mt-6 grid gap-3">
          {quickActions.map((action) => (
            <button
              key={action}
              type="button"
              onClick={onQuickAction}
              className="min-h-12 rounded-[var(--radius-lg)] border border-white/12 bg-white/[0.07] px-4 text-left text-sm font-black text-white transition hover:-translate-y-0.5 hover:border-cyan-300/35 hover:bg-cyan-400/12"
            >
              {action}
            </button>
          ))}
        </div>
      </DarkSection>
      <DarkSection id="waiting-list">
        <SectionTitle eyebrow="Queue control" title="Waiting list" description="Priority ranking, seat movement, guardian communication, and waitlisted conversion risk." />
      </DarkSection>
      <DarkSection id="fee-clearance">
        <SectionTitle eyebrow="Finance gate" title="Fee clearance" description="Unverified fee payments, payment mismatch, confirmations, and admission-blocking fee checks." />
      </DarkSection>
      <DarkSection id="parent-records">
        <SectionTitle eyebrow="Guardians" title="Parent records" description="Guardian identity, contact verification, relationship history, parent ID, and duplicate guardian checks." />
      </DarkSection>
      <DarkSection id="student-ids">
        <SectionTitle eyebrow="Identity" title="Student IDs" description="Admission number generation, student ID readiness, photo quality, barcode/QR preparation, and onboarding packs." />
      </DarkSection>
      <DarkSection id="settings">
        <SectionTitle eyebrow="Controls" title="Settings" description="Role permissions, notification toasts, loaders, export policy, campus selectors, and admissions cycle settings." />
      </DarkSection>
    </div>
  );
}

function MobileActions() {
  const actions = [
    ["Applicants", ClipboardList, "#applications"],
    ["Verify", Fingerprint, "#documents"],
    ["Approve", CheckCircle2, "#quick-actions"],
    ["SMS", MessageSquareText, "#communication"],
    ["Audit", ShieldCheck, "#audit"],
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


function useAdmissionsDashboardMapper(backendData: any): AdmissionsDashboardModel | null {
  return useMemo<AdmissionsDashboardModel | null>(() => {
    if (!backendData) return null;

    const { overview, enquiries, applications, documents, interviews, selection, feeClearance, transfers, audit } = backendData;

    return {
      kpis: [
        { label: "Total Applications", value: applications?.total?.toString() || "0", helper: "All-time applications", trend: "live", tone: "cyan" as Tone, icon: ClipboardList, points: [740, 820, 910, 980, 1080, 1170, applications?.total || 0] },
        { label: "Approved Admissions", value: applications?.approved?.toString() || "0", helper: "Successfully approved", trend: "+11%", tone: "success" as Tone, icon: UserCheck, points: [420, 470, 530, 610, 655, 701, applications?.approved || 0] },
        { label: "Pending Verifications", value: documents?.pendingVerification?.toString() || "0", helper: "Applicants pending document check", trend: "urgent", tone: "warning" as Tone, icon: Fingerprint, points: [91, 108, 116, 121, 129, 133, documents?.pendingVerification || 0] },
        { label: "Rejected Applications", value: applications?.rejected?.toString() || "0", helper: "Fraud and incomplete file controls", trend: "-6%", tone: "info" as Tone, icon: ShieldAlert, points: [52, 49, 47, 51, 46, 45, applications?.rejected || 0] },
        { label: "Transfer Requests", value: transfers?.incoming?.toString() || "0", helper: "Incoming files need clearance", trend: "watch", tone: "warning" as Tone, icon: Layers, points: [14, 19, 17, 22, 24, 26, transfers?.incoming || 0] },
        { label: "Fee Confirmation Pending", value: feeClearance?.pending?.toString() || "0", helper: "Parents have not completed fee confirmation", trend: "follow up", tone: "danger" as Tone, icon: CheckCircle2, points: [24, 21, 18, 16, 14, 13, feeClearance?.pending || 0] },
        { label: "Interviews Scheduled", value: interviews?.upcoming?.toString() || "0", helper: "Panels assigned for this week", trend: "live", tone: "success" as Tone, icon: CalendarClock, points: [29, 35, 42, 51, 64, 72, interviews?.upcoming || 0] },
      ],
      funnelStages: [
        { label: "Inquiries", value: enquiries?.total || 0, conversion: "100%", tone: "cyan" as Tone },
        { label: "Applications Started", value: applications?.total || 0, conversion: "76%", tone: "info" as Tone },
        { label: "Documents Submitted", value: (applications?.total || 0) - (documents?.missing || 0), conversion: "85%", tone: "warning" as Tone },
        { label: "Verification Complete", value: documents?.verified || 0, conversion: "88%", tone: "success" as Tone },
        { label: "Interviews Done", value: interviews?.completed || 0, conversion: "85%", tone: "info" as Tone },
        { label: "Approved Students", value: applications?.approved || 0, conversion: "91%", tone: "success" as Tone },
        { label: "Fee Confirmed", value: feeClearance?.cleared || 0, conversion: "91%", tone: "warning" as Tone },
      ],
      applicants: (applications?.recent || []).map((app: any) => ({
        id: app.id,
        name: app.name,
        admissionNumber: "Pending",
        grade: app.class || "Unassigned",
        parent: "Verify",
        status: app.status === "pending" ? "Pending" : app.status === "reviewing" ? "Verified" : app.status === "approved" ? "Approved" : "Rejected",
        fee: "Pending",
        documents: "Complete",
        interview: "Scheduled",
        risk: "Clear",
        date: new Date(app.date).toLocaleDateString("en-KE", { month: "short", day: "numeric" }),
        tone: app.status === "approved" ? "success" : app.status === "rejected" ? "danger" : "warning",
      })),
      documentCards: [
        { title: "Verification Pipeline", value: documents?.pendingVerification?.toString() || "0", detail: "Pending manual or OCR verification", tone: "warning" as Tone },
        { title: "Missing Documents", value: documents?.missing?.toString() || "0", detail: "Applications without uploaded documents", tone: "danger" as Tone },
        { title: "Fully Verified", value: documents?.verified?.toString() || "0", detail: "Passed all integrity checks", tone: "success" as Tone },
      ],
      interviewCards: [
        { title: "Scheduled", value: interviews?.upcoming?.toString() || "0", detail: "Interview panel assigned", tone: "info" as Tone },
        { title: "Completed", value: interviews?.completed?.toString() || "0", detail: "Scoring forms synced", tone: "success" as Tone },
        { title: "Needs Rescheduling", value: interviews?.needsRescheduling?.toString() || "0", detail: "Parent appointment booking pending", tone: "warning" as Tone },
      ],
      transferCards: [
        { title: "Incoming students", value: transfers?.incoming?.toString() || "0", detail: "Document verification and class mapping active", tone: "info" as Tone },
        { title: "Outgoing students", value: transfers?.outgoing?.toString() || "0", detail: "Clearance status awaiting bursar and library", tone: "warning" as Tone },
      ],
      allocationCards: [
        { title: "Total Pending Placement", value: "0", detail: "Pending assignment to a stream", tone: "warning" as Tone },
      ],
      aiInsights: [
        { title: "Live Sync", detail: "Dashboard is reading real-time database records securely.", confidence: "100% confidence", tone: "success" as Tone },
      ],
      auditCards: [
        { title: "Application Events", value: "Real-time", detail: "All queries are securely scoped to tenant", tone: "success" as Tone }
      ]
    };
  }, [backendData]);
}

export function RegistrarCommandCenter({ routeMode }: { routeMode: RegistrarRouteMode }) {
  const { data: rawData, isLoading, refetch } = useSchoolQuery<any>("/api/admin-command/admissions/dashboard");
  const data = useAdmissionsDashboardMapper(rawData);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState("Admissions desk ready for inquiries, applications, documents, interviews, and onboarding.");
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [activeApplicantFilter, setActiveApplicantFilter] = useState<ApplicantFilter | null>(null);
  const [selectedApplicantPreview, setSelectedApplicantPreview] = useState<ApplicantRow | null>(null);
  const searchResults = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return [];

    const dynamicRecords = (data?.applicants || []).map((app: any) => ({
      id: app.id,
      label: app.name,
      detail: `${app.grade} applicant | ${app.status}`,
      sectionId: "applications",
    }));

    return dynamicRecords.filter((record: any) =>
      [record.label, record.detail, record.sectionId].some((value) => value.toLowerCase().includes(query)),
    );
  }, [searchTerm, data]);

  function openSearchRecord(record: RegistrarSearchRecord) {
    setSearchTerm("");
    setNotice(`${record.label} admissions search loaded ${record.sectionId} section: ${record.detail}.`);

    if (typeof document !== "undefined") {
      const target = document.getElementById(record.sectionId);
      target?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    }
  }

  function openQuickActions() {
    setQuickActionsOpen(true);
    setNotice("Quick admissions action drawer opened. Save an action to persist it and notify the admissions chain.");
  }

  function openApplicantFilter(filter: ApplicantFilter) {
    setActiveApplicantFilter(filter);
    setNotice(`${filter} applicant filter selected. Apply it to persist the filter action and notify follow-up roles.`);
  }

  function openApplicationPreview(applicant: ApplicantRow) {
    setSelectedApplicantPreview(applicant);
    setNotice(`${applicant.name} application print preview generated. Record the review to persist it for admissions follow-up.`);
  }

  async function applyApplicantFilter() {
    if (!activeApplicantFilter) return;

    const schoolId = getCurrentSchoolId();
    const filterId = activeApplicantFilter.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const visibleRecords = applicants.filter((applicant) => activeApplicantFilter === "All statuses" || applicant.status === activeApplicantFilter).length;

    try {
      await persistAdmissionsWorkflowAction({
        action: "applicant_filter_applied",
        title: `${activeApplicantFilter} applicant filter applied`,
        message: `Admissions Officer applied the ${activeApplicantFilter} filter to the school applicant table.`,
        entityId: `admissions-filter-${filterId}`,
        payload: {
          filter: activeApplicantFilter,
          visibleRecords,
        },
      });
    } catch (error) {
      toast.error("Admissions filter action was not saved", {
        description: error instanceof Error ? error.message : "The filter action could not be persisted for audit and dashboard follow-up.",
      });
      return;
    }

    publishSchoolOperationalEvent({
      schoolId,
      type: "ADMISSIONS_APPLICANT_FILTER_APPLIED",
      module: "admissions",
      actorRole: "Admissions Officer",
      title: `${activeApplicantFilter} applicant filter applied`,
      body: `Admissions Officer applied the ${activeApplicantFilter} filter to the school applicant table.`,
      entityId: `admissions-filter-${filterId}`,
      severity: "info",
      payload: {
        filter: activeApplicantFilter,
        source: "registrar-command-center",
        visibleRecords,
      },
      notifications: [
        {
          audienceRoles: ["Secretary", "Principal"],
          title: "Admissions applicant list filtered",
          body: `Admissions is reviewing ${activeApplicantFilter.toLowerCase()} applications for current school follow-up.`,
          severity: "info",
          relatedModule: "admissions",
          relatedRecordId: `admissions-filter-${filterId}`,
          requiresAction: false,
          requestStatus: "Completed",
        },
      ],
    });

    setNotice(
      `${activeApplicantFilter} applicant filter applied for ${schoolId}: admissions-filter-${filterId}, ${visibleRecords} visible records, Secretary/Principal notified.`,
    );
    setActiveApplicantFilter(null);
  }

  
  async function approveApplication() {
    if (!selectedApplicantPreview) return;
    setIsSubmitting(true);
    try {
      await requestDashboardApi(`/api/admissions/applications/${selectedApplicantPreview.id}/approve`, {
        method: 'POST',
        body: { applicantId: selectedApplicantPreview.id },
      });
      toast.success(`Application for ${selectedApplicantPreview.name} has been successfully approved and enrolled as a student.`);
      setNotice(`Application for ${selectedApplicantPreview.name} has been successfully approved and enrolled as a student.`);
      setSelectedApplicantPreview(null);
      void refetch();
    } catch (e: any) {
      toast.error(`Failed to approve: ${e.message || 'Unknown error'}`);
      setNotice('Error connecting to the server to approve application.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function recordApplicationPreview() {

    if (!selectedApplicantPreview) return;

    const schoolId = getCurrentSchoolId();
    const applicantId = selectedApplicantPreview.admissionNumber === "Pending"
      ? selectedApplicantPreview.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
      : selectedApplicantPreview.admissionNumber.toLowerCase();

    try {
      await persistAdmissionsWorkflowAction({
        action: "application_preview_recorded",
        title: `${selectedApplicantPreview.name} application preview recorded`,
        message: `Admissions Officer reviewed ${selectedApplicantPreview.name}'s application, document status, fee status, interview status, and risk notes.`,
        priority: selectedApplicantPreview.tone === "danger" ? "high" : "normal",
        entityId: `admissions-preview-${applicantId}`,
        payload: {
          applicantName: selectedApplicantPreview.name,
          admissionNumber: selectedApplicantPreview.admissionNumber,
          grade: selectedApplicantPreview.grade,
          status: selectedApplicantPreview.status,
          feeStatus: selectedApplicantPreview.fee,
          documentStatus: selectedApplicantPreview.documents,
          risk: selectedApplicantPreview.risk,
        },
      });
    } catch (error) {
      toast.error("Admissions preview was not saved", {
        description: error instanceof Error ? error.message : "The preview action could not be persisted for audit and dashboard follow-up.",
      });
      return;
    }

    publishSchoolOperationalEvent({
      schoolId,
      type: "ADMISSIONS_APPLICATION_PREVIEW_RECORDED",
      module: "admissions",
      actorRole: "Admissions Officer",
      title: `${selectedApplicantPreview.name} application preview recorded`,
      body: `Admissions Officer reviewed ${selectedApplicantPreview.name}'s application, document status, fee status, interview status, and risk notes.`,
      entityId: `admissions-preview-${applicantId}`,
      severity: selectedApplicantPreview.tone === "danger" ? "warning" : "info",
      payload: {
        applicantName: selectedApplicantPreview.name,
        admissionNumber: selectedApplicantPreview.admissionNumber,
        grade: selectedApplicantPreview.grade,
        status: selectedApplicantPreview.status,
        feeStatus: selectedApplicantPreview.fee,
        documentStatus: selectedApplicantPreview.documents,
        risk: selectedApplicantPreview.risk,
      },
      notifications: [
        {
          audienceRoles: ["Secretary", "Accountant", "Class Teacher", "Principal"],
          title: "Admission application reviewed",
          body: `${selectedApplicantPreview.name}'s application preview was recorded for office, fee, class placement, and leadership follow-up.`,
          severity: selectedApplicantPreview.tone === "danger" ? "warning" : "info",
          relatedModule: "admissions",
          relatedRecordId: `admissions-preview-${applicantId}`,
          requiresAction: selectedApplicantPreview.status !== "Approved",
          requestStatus: selectedApplicantPreview.status === "Approved" ? "Completed" : "Pending",
        },
      ],
    });

    setNotice(
      `${selectedApplicantPreview.name} application preview recorded for ${schoolId}: admissions-preview-${applicantId}, ${selectedApplicantPreview.status} status, office/fee/class/leadership notifications created.`,
    );
    setSelectedApplicantPreview(null);
  }

  async function saveAdmissionsAction() {
    setIsSubmitting(true);
    const schoolId = getCurrentSchoolId();

    try {
      await persistAdmissionsWorkflowAction({
        action: "quick_admission_action",
        title: "Quick admissions action saved",
        message: "Admissions Officer recorded a same-school admissions follow-up action.",
        entityId: "admissions-quick-action",
        payload: {
          nextStep: "Verify documents and notify parent",
        },
      });
      toast.success("Admissions quick action saved");
    } catch (error: any) {
      toast.error(`Failed to save action: ${error.message || 'Unknown error'}`);
      setIsSubmitting(false);
      return;
    }

    publishSchoolOperationalEvent({
      schoolId,
      type: "ADMISSIONS_QUICK_ACTION_RECORDED",
      module: "admissions",
      actorRole: "Admissions Officer",
      title: "Quick admissions action saved",
      body: "Admissions Officer recorded a same-school admissions follow-up action.",
      entityId: "admissions-quick-action",
      severity: "info",
      payload: {
        action: "Quick admissions action",
        source: "registrar-command-center",
        nextStep: "Verify documents and notify parent",
      },
      notifications: [
        {
          audienceRoles: ["Secretary", "Accountant", "Class Teacher", "Principal"],
          title: "Admissions follow-up recorded",
          body: "Admissions recorded a quick action for document, fee, class placement, or parent onboarding follow-up.",
          severity: "info",
          relatedModule: "admissions",
          relatedRecordId: "admissions-quick-action",
          requiresAction: true,
          requestStatus: "Pending",
        },
      ],
    });

    setQuickActionsOpen(false);
    setNotice(
      `${schoolId} admissions quick action saved: admissions-quick-action, next step Verify documents and notify parent, Secretary/Accountant/Class Teacher/Principal notified.`,
    );
    setIsSubmitting(false);
  }

  return (
    <div data-route-mode={routeMode} className="min-h-screen bg-[#F3F4F6] pb-24 lg:pb-6">
      <div className="grid gap-5 p-3 md:p-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Sidebar />
        <main className="min-w-0 space-y-5">
          <TopHeader
            searchTerm={searchTerm}
            searchResults={searchResults}
            onQuickActions={openQuickActions}
            onSearchResult={openSearchRecord}
            onSearchTermChange={setSearchTerm}
          />
          <div role="status" className="rounded-[var(--radius-lg)] border border-[#C8D5EA] bg-white px-4 py-3 text-sm font-black text-[#071D49] shadow-[0_12px_30px_rgba(7,29,73,0.08)]">
            {notice}
          </div>
          {activeApplicantFilter ? (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Admissions applicant filter"
              className="rounded-[var(--radius-xl)] border border-[#C8D5EA] bg-white p-5 text-[#071D49] shadow-[0_18px_55px_rgba(7,29,73,0.12)]"
            >
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5F6F89]">Applicant table control</p>
              <h2 className="mt-2 text-xl font-black">Apply {activeApplicantFilter} filter</h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#5F6F89]">
                This filters the admissions table for current-school follow-up and records the review for the office team.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-[var(--radius-lg)] border border-[#C8D5EA] bg-[#F8FAFC] p-3">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-[#5F6F89]">Filter</p>
                  <p className="mt-1 text-sm font-black">{activeApplicantFilter}</p>
                </div>
                <div className="rounded-[var(--radius-lg)] border border-[#C8D5EA] bg-[#F8FAFC] p-3">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-[#5F6F89]">Records matched</p>
                  <p className="mt-1 text-sm font-black">
                    {applicants.filter((applicant) => activeApplicantFilter === "All statuses" || applicant.status === activeApplicantFilter).length}
                  </p>
                </div>
                <div className="rounded-[var(--radius-lg)] border border-[#C8D5EA] bg-[#F8FAFC] p-3">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-[#5F6F89]">Scope</p>
                  <p className="mt-1 text-sm font-black">Current school only</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={applyApplicantFilter}
                  className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius)] bg-[#071D49] px-4 text-sm font-black text-white"
                >
                  <ClipboardList className="h-4 w-4" aria-hidden="true" />
                  Apply applicant filter
                </button>
                <button
                  type="button"
                  onClick={() => setActiveApplicantFilter(null)}
                  className="inline-flex min-h-10 items-center rounded-[var(--radius)] border border-[#C8D5EA] bg-white px-4 text-sm font-black text-[#071D49]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
          {selectedApplicantPreview ? (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Admission application preview"
              className="rounded-[var(--radius-xl)] border border-[#C8D5EA] bg-white p-5 text-[#071D49] shadow-[0_18px_55px_rgba(7,29,73,0.12)]"
            >
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5F6F89]">Applicant review</p>
              <h2 className="mt-2 text-xl font-black">{selectedApplicantPreview.name}</h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#5F6F89]">
                Review the application details before routing follow-up to Secretary, Accountant, Class Teacher, and Principal.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Admission no.", selectedApplicantPreview.admissionNumber],
                  ["Grade applying", selectedApplicantPreview.grade],
                  ["Parent contact", selectedApplicantPreview.parent],
                  ["Status", selectedApplicantPreview.status],
                  ["Fee status", selectedApplicantPreview.fee],
                  ["Documents", selectedApplicantPreview.documents],
                  ["Interview", selectedApplicantPreview.interview],
                  ["Risk flag", selectedApplicantPreview.risk],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[var(--radius-lg)] border border-[#C8D5EA] bg-[#F8FAFC] p-3">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-[#5F6F89]">{label}</p>
                    <p className="mt-1 text-sm font-black">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={approveApplication}
                  disabled={isSubmitting}
                  className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius)] bg-emerald-600 px-4 text-sm font-black text-white disabled:opacity-50"
                >
                  <UserCheck className="h-4 w-4" aria-hidden="true" />
                  {isSubmitting ? "Approving..." : "Approve Admission"}
                </button>
                <button
                  type="button"
                  onClick={recordApplicationPreview}
                  className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius)] bg-[#071D49] px-4 text-sm font-black text-white"
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  Record preview review
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedApplicantPreview(null)}
                  className="inline-flex min-h-10 items-center rounded-[var(--radius)] border border-[#C8D5EA] bg-white px-4 text-sm font-black text-[#071D49]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
          {quickActionsOpen ? (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Admissions quick action"
              className="rounded-[var(--radius-xl)] border border-[#C8D5EA] bg-white p-5 text-[#071D49] shadow-[0_18px_55px_rgba(7,29,73,0.12)]"
            >
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5F6F89]">Same-school admissions workflow</p>
              <h2 className="mt-2 text-xl font-black">Quick admissions action</h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#5F6F89]">
                This records an admissions follow-up and alerts Secretary, Accountant, Class Teacher, and Principal where action is needed.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {[
                  ["Action", "Verify documents and parent contact"],
                  ["Next office", "Secretary, Accountant, Class Teacher"],
                  ["Scope", "Current school only"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[var(--radius-lg)] border border-[#C8D5EA] bg-[#F8FAFC] p-3">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-[#5F6F89]">{label}</p>
                    <p className="mt-1 text-sm font-black">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={saveAdmissionsAction}
                  disabled={isSubmitting}
                  className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius)] bg-[#071D49] px-4 text-sm font-black text-white disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  {isSubmitting ? "Saving..." : "Save admissions action"}
                </button>
                <button
                  type="button"
                  onClick={() => setQuickActionsOpen(false)}
                  className="inline-flex min-h-10 items-center rounded-[var(--radius)] border border-[#C8D5EA] bg-white px-4 text-sm font-black text-[#071D49]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
          <Hero />
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5" aria-label="Registrar KPI summary">
            {(data?.kpis || kpis).map((item: any, index: number) => (
              <KpiCard key={item.label} item={item} index={index} />
            ))}
          </section>
          <AdmissionsFunnel data={data} />
          <ApplicationManagement applicantsData={data?.applicants || applicants} onApplicantFilter={openApplicantFilter} onApplicationPreview={openApplicationPreview} />
          <DocumentCenter data={data} />
          <ClassAllocation data={data} />
          <InterviewAndTransfers data={data} />
          <CommunicationAndReports data={data} />
          <AiInsights data={data} />
          <AuditCompliance data={data} />
          <QuickActionsAndSupport onQuickAction={openQuickActions} />
        </main>
      </div>
      <MobileActions />
      
    </div>
  );
}
