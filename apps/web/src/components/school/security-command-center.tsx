"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Bell,
  Camera,
  Car,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock,
  DoorOpen,
  FileBarChart2,
  Fingerprint,
  Gauge,
  IdCard,
  LayoutDashboard,
  LockKeyhole,
  PackageCheck,
  RadioTower,
  ScanLine,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Sparkles,
  UserCheck,
  UserRoundX,
  type LucideIcon,
} from "lucide-react";

import {
  addSchoolRecord,
  getCurrentSchoolId,
  publishSchoolOperationalEvent,
} from "@/lib/school/school-operational-store";

type SecurityRouteMode = "hosted" | "public";
type Tone = "secure" | "info" | "warning" | "danger" | "cyan" | "neutral";
type SecurityKpi = {
  label: string;
  value: string;
  helper: string;
  trend: string;
  tone: Tone;
  icon: LucideIcon;
  points: number[];
};
type LiveFeedItem = [title: string, detail: string, time: string, tone: Tone];
type VisitorRecord = {
  id: string;
  name: string;
  idNumber: string;
  personVisiting: string;
  purpose: string;
  entryTime: string;
  expectedExit: string;
  phone: string;
  vehicle: string;
  status: string;
  tone: Tone;
};
type StudentOutside = [name: string, klass: string, reason: string, departure: string, expectedReturn: string, approvedBy: string, tone: Tone];
type SecurityNotice = [title: string, detail: string, tone: Tone];
type AiInsight = [title: string, detail: string, confidence: string, tone: Tone];
type IncidentType = [title: string, count: string, detail: string, tone: Tone];
type SecurityAnalytic = { title: string; tone: Tone; values: number[] };
type IconCard = [title: string, detail: string, icon: LucideIcon];

const securitySearchRecords = [
  { id: "visitor-grace", label: "Grace Achieng", detail: "Principal visit | Fee dispute meeting | QR badge active", sectionId: "visitor-management" },
  { id: "student-brian", label: "Brian Otieno pickup check", detail: "Blocked pickup request | gate officer review", sectionId: "student-exit-control" },
  { id: "vehicle-kda-810p", label: "KDA 810P", detail: "Three entries today | delivery verification needed", sectionId: "vehicle-tracking" },
  { id: "dorm-b", label: "Dorm B curfew alert", detail: "Door opened past curfew", sectionId: "boarding-security" },
  { id: "blacklist-repeat", label: "Repeat suspicious visitor", detail: "Two IDs watched this week", sectionId: "blacklist-database" },
] satisfies Array<{ id: string; label: string; detail: string; sectionId: string }>;

type SecuritySearchRecord = (typeof securitySearchRecords)[number];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function announceAction(message: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("myshule-dashboard-action", { detail: message }));
  }
}

function runtimeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
    glow: string;
  }
> = {
  secure: {
    border: "border-emerald-300/35",
    bg: "bg-emerald-400/12",
    text: "text-emerald-100",
    icon: "text-emerald-200",
    chip: "border-emerald-300/35 bg-emerald-400/14 text-emerald-100",
    dot: "bg-emerald-300",
    glow: "shadow-[0_0_34px_rgba(16,185,129,0.2)]",
  },
  info: {
    border: "border-blue-300/30",
    bg: "bg-blue-400/12",
    text: "text-blue-100",
    icon: "text-blue-200",
    chip: "border-blue-300/30 bg-blue-400/14 text-blue-100",
    dot: "bg-blue-300",
    glow: "shadow-[0_0_34px_rgba(37,99,235,0.18)]",
  },
  warning: {
    border: "border-orange-300/42",
    bg: "bg-[#FF7A1A]/14",
    text: "text-[#FFE1C8]",
    icon: "text-[#FFB36F]",
    chip: "border-[#FF7A1A]/42 bg-[#FF7A1A]/16 text-[#FFE1C8]",
    dot: "bg-[#FF7A1A]",
    glow: "shadow-[0_0_38px_rgba(255,122,26,0.22)]",
  },
  danger: {
    border: "border-rose-300/40",
    bg: "bg-rose-500/13",
    text: "text-rose-100",
    icon: "text-rose-200",
    chip: "border-rose-300/40 bg-rose-500/15 text-rose-100",
    dot: "bg-rose-400",
    glow: "shadow-[0_0_42px_rgba(225,29,72,0.25)]",
  },
  cyan: {
    border: "border-cyan-300/35",
    bg: "bg-cyan-400/12",
    text: "text-cyan-100",
    icon: "text-cyan-200",
    chip: "border-cyan-300/35 bg-cyan-400/14 text-cyan-100",
    dot: "bg-cyan-300",
    glow: "shadow-[0_0_34px_rgba(34,211,238,0.17)]",
  },
  neutral: {
    border: "border-white/14",
    bg: "bg-white/8",
    text: "text-white/78",
    icon: "text-white/70",
    chip: "border-white/14 bg-white/10 text-white/80",
    dot: "bg-white/55",
    glow: "shadow-[0_0_26px_rgba(7,29,73,0.16)]",
  },
};

const securityNav: Array<{ label: string; icon: LucideIcon; sectionId: string; group: string }> = [
  { label: "Dashboard", icon: LayoutDashboard, sectionId: "top", group: "Command" },
  { label: "Live Gate Monitor", icon: RadioTower, sectionId: "live-gate-monitor", group: "Monitoring" },
  { label: "Visitor Management", icon: UserCheck, sectionId: "visitor-management", group: "Access" },
  { label: "Student Exit Control", icon: DoorOpen, sectionId: "student-exit-control", group: "Access" },
  { label: "Staff Entry Logs", icon: IdCard, sectionId: "staff-entry-logs", group: "Access" },
  { label: "Vehicle Tracking", icon: Car, sectionId: "vehicle-tracking", group: "Movement" },
  { label: "Boarding Security", icon: LockKeyhole, sectionId: "boarding-security", group: "Movement" },
  { label: "Parcel & Delivery Logs", icon: PackageCheck, sectionId: "parcel-logs", group: "Movement" },
  { label: "Incident Reports", icon: ShieldAlert, sectionId: "incident-reports", group: "Incidents" },
  { label: "CCTV Monitoring", icon: Camera, sectionId: "cctv-monitoring", group: "Incidents" },
  { label: "Lost & Found", icon: ClipboardCheck, sectionId: "lost-found", group: "Incidents" },
  { label: "Emergency Alerts", icon: Siren, sectionId: "emergency-mode", group: "Emergency" },
  { label: "Blacklist Database", icon: UserRoundX, sectionId: "blacklist-database", group: "Intelligence" },
  { label: "ID Verification", icon: Fingerprint, sectionId: "id-verification", group: "Intelligence" },
  { label: "Movement Analytics", icon: FileBarChart2, sectionId: "analytics", group: "Intelligence" },
  { label: "AI Threat Detection", icon: Sparkles, sectionId: "ai-threat-detection", group: "Intelligence" },
  { label: "Reports", icon: FileBarChart2, sectionId: "reports", group: "Administration" },
  { label: "Settings", icon: Settings, sectionId: "settings", group: "Administration" },
];

const kpis: SecurityKpi[] = [
  { label: "Visitors on Campus", value: "47", helper: "+12 since morning assembly", trend: "+18%", tone: "info" as Tone, icon: UserCheck, points: [18, 22, 25, 34, 31, 43, 47] },
  { label: "Students Currently Outside", value: "9", helper: "All tied to approved exit slips", trend: "2 return soon", tone: "warning" as Tone, icon: DoorOpen, points: [7, 5, 8, 12, 9, 11, 9] },
  { label: "Active Security Incidents", value: "2", helper: "Gate B denial and dorm roll-call review", trend: "high alert", tone: "danger" as Tone, icon: ShieldAlert, points: [1, 1, 2, 1, 3, 2, 2] },
  { label: "Vehicles Entered Today", value: "31", helper: "14 parent, 9 supplier, 8 staff", trend: "+7%", tone: "cyan" as Tone, icon: Car, points: [8, 13, 16, 22, 18, 27, 31] },
  { label: "Boarding Night Alerts", value: "4", helper: "Dorm B and back corridor need follow-up", trend: "+40%", tone: "danger" as Tone, icon: LockKeyhole, points: [1, 0, 2, 1, 3, 2, 4] },
  { label: "Unauthorized Access Attempts", value: "3", helper: "Two repeat IDs blocked automatically", trend: "watched", tone: "warning" as Tone, icon: UserRoundX, points: [0, 1, 1, 0, 2, 2, 3] },
  { label: "Late Student Pickups", value: "6", helper: "Parent verification required after 5:30 PM", trend: "pending calls", tone: "info" as Tone, icon: Clock, points: [3, 4, 5, 7, 5, 8, 6] },
  { label: "AI Threat Warnings", value: "5", helper: "Pattern anomalies from gate and dorm feeds", trend: "AI live", tone: "cyan" as Tone, icon: Sparkles, points: [2, 2, 3, 4, 3, 5, 5] },
];

const liveFeed: LiveFeedItem[] = [
  ["Parent checked in at Main Gate", "Mrs. Wanjiru verified by national ID and learner link.", "2 min ago", "secure"],
  ["Student John Mwangi exited with approved pass", "Medical appointment, Form 3 Blue, return expected 3:40 PM.", "6 min ago", "info"],
  ["Unauthorized visitor denied entry", "Repeated suspicious visitor flagged at Gate B.", "11 min ago", "danger"],
  ["Delivery truck entered through Gate B", "Kisumu Fresh Foods, vehicle KDC 448R, kitchen approval confirmed.", "18 min ago", "cyan"],
  ["Dormitory movement detected at 1:23 AM", "Dorm B corridor door opened past curfew.", "last night", "warning"],
  ["AI flagged suspicious repeated gate activity", "Same phone number attempted three separate visitor names.", "today", "danger"],
];

const initialVisitorRows: VisitorRecord[] = [
  { id: "visitor-grace", name: "Grace Achieng", idNumber: "3248****12", personVisiting: "Principal", purpose: "Fee dispute meeting", entryTime: "08:18", expectedExit: "10:30", phone: "0712 445 900", vehicle: "KDE 421G", status: "Approved", tone: "secure" },
  { id: "visitor-brian", name: "Brian Otieno", idNumber: "2847****66", personVisiting: "Form 2 student", purpose: "Pickup request", entryTime: "12:05", expectedExit: "12:20", phone: "0790 104 228", vehicle: "-", status: "Repeated suspicious visitor", tone: "danger" },
  { id: "visitor-westchem", name: "WestChem Courier", idNumber: "COMP-042", personVisiting: "Laboratory", purpose: "Chemical delivery", entryTime: "09:44", expectedExit: "11:00", phone: "0722 900 441", vehicle: "KDA 810P", status: "Expired access", tone: "warning" },
  { id: "visitor-njeri", name: "Njeri Mwangi", idNumber: "1173****04", personVisiting: "Deputy principal", purpose: "Discipline hearing", entryTime: "13:10", expectedExit: "15:00", phone: "0700 333 118", vehicle: "-", status: "QR badge active", tone: "info" },
];

const studentsOutside: StudentOutside[] = [
  ["Amina Njoroge", "Form 4 North", "Clinic referral", "10:12 AM", "1:30 PM", "Nurse Moraa", "secure"],
  ["John Mwangi", "Form 3 Blue", "Medical appointment", "12:08 PM", "3:40 PM", "Deputy Principal", "warning"],
  ["Brian Otieno", "Form 2 East", "Parent pickup check", "pending", "blocked", "Gate officer review", "danger"],
];

const boardingAlerts: SecurityNotice[] = [
  ["3 Students Missing Roll Call", "Dorm C roll-call does not match bed occupancy.", "danger"],
  ["Dorm B Door Open Past Curfew", "Back corridor sensor opened at 1:23 AM.", "warning"],
  ["Bed occupancy 97%", "Two learners marked sick bay, confirmed by nurse.", "secure"],
  ["Emergency incident drill", "Night guard checklist completed in 4m 18s.", "cyan"],
];

const aiInsights: AiInsight[] = [
  ["Unusual visitor pattern detected", "Same phone number attempted three visitor names this week.", "91% confidence", "danger"],
  ["Repeated student exits before prep time", "Form 3 East has elevated movement between 4:40 PM and 5:15 PM.", "84% confidence", "warning"],
  ["Possible impersonation attempt", "Pickup ID mismatch against approved guardian profile.", "88% confidence", "danger"],
  ["Vehicle entered multiple times today", "KDA 810P logged three entries without matching exit scan.", "79% confidence", "info"],
  ["Late-night movement increased by 40%", "Boarding corridor motion is above normal Tuesday baseline.", "82% confidence", "warning"],
];

const incidentTypes: IncidentType[] = [
  ["Theft", "1 open", "Library laptop tag moved after hours", "warning"],
  ["Fights", "0 active", "No violence reports today", "secure"],
  ["Contraband", "2 checks", "Dorm inspection evidence attached", "danger"],
  ["Vandalism", "1 note", "Gate wall camera photo pending", "info"],
  ["Suspicious behavior", "3 watched", "Repeated gate loitering near dismissal", "danger"],
  ["Missing items", "4 claims", "Uniforms, calculator, lab coat", "warning"],
];

const analytics: SecurityAnalytic[] = [
  { title: "Daily Visitor Trends", tone: "cyan", values: [28, 34, 41, 38, 52, 47, 61] },
  { title: "Suspicious Activity Trends", tone: "danger", values: [2, 3, 2, 5, 4, 6, 5] },
  { title: "Student Movement Patterns", tone: "info", values: [11, 14, 16, 10, 19, 12, 9] },
  { title: "Vehicle Frequency", tone: "secure", values: [18, 23, 27, 31, 26, 29, 31] },
  { title: "Dorm Incidents", tone: "warning", values: [0, 1, 2, 1, 4, 3, 4] },
  { title: "Gate Traffic Heatmaps", tone: "cyan", values: [44, 62, 38, 76, 51, 83, 68] },
];

const heroStats: Array<[label: string, value: string, tone: Tone]> = [
  ["School safety score", "96%", "secure"],
  ["AI anomaly alerts", "5", "cyan"],
  ["Realtime movement counter", "214", "info"],
];

const emergencyActions: IconCard[] = [
  ["Lock all exits", "Gate A, Gate B, boarding side gate, and vehicle exit move to lockdown.", Siren],
  ["Notify leadership", "Principal, deputy, boarding master, and security lead receive escalation.", Bell],
  ["Open command panel", "Live feed, contacts, CCTV, and incident notes stay visible together.", RadioTower],
];

const secureEmptyStates: IconCard[] = [
  ["No active threats detected", "All open access warnings are tied to known follow-up actions.", ShieldCheck],
  ["Campus secure tonight", "Dorm sensors, roll call, and guard posts are synchronized.", LockKeyhole],
  ["No suspicious activity reported", "The current hour has no new AI escalation beyond watch list items.", Sparkles],
];

function groupNav() {
  return securityNav.reduce<Record<string, typeof securityNav>>((groups, item) => {
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
  const color =
    tone === "danger"
      ? "#FB7185"
      : tone === "warning"
        ? "#FF7A1A"
        : tone === "secure"
          ? "#34D399"
          : tone === "cyan"
            ? "#22D3EE"
            : "#60A5FA";
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

function Bars({ values, tone }: { values: number[]; tone: Tone }) {
  const max = Math.max(...values);
  const color =
    tone === "danger"
      ? "bg-rose-400"
      : tone === "warning"
        ? "bg-[#FF7A1A]"
        : tone === "secure"
          ? "bg-emerald-300"
          : tone === "cyan"
            ? "bg-cyan-300"
            : "bg-blue-300";

  return (
    <div className="flex h-32 items-end gap-2">
      {values.map((value, index) => (
        <span
          key={`${value}-${index}`}
          className={cn("w-full rounded-t-md", color)}
          style={{ height: `${Math.max(16, (value / max) * 100)}%`, opacity: 0.52 + index / 16 }}
        />
      ))}
    </div>
  );
}

function Sidebar({
  activeSection,
  onSectionChange,
}: {
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
}) {
  const groups = useMemo(() => groupNav(), []);

  return (
    <aside className="hidden h-full rounded-[var(--radius-xl)] border border-[#C8D5EA]/50 bg-[#071D49] p-4 text-white shadow-[0_24px_70px_rgba(7,29,73,0.22)] xl:sticky xl:top-5 xl:block" aria-label="Security dashboard navigation">
      <div className="rounded-[var(--radius-lg)] border border-white/10 bg-white/[0.06] p-4">
        <p className="text-xs font-black uppercase text-cyan-200">Campus security</p>
        <h2 className="mt-2 text-2xl font-black">Security Command</h2>
        <p className="mt-2 text-sm leading-6 text-white/66">Nothing dangerous enters this school unnoticed.</p>
      </div>
      <nav className="mt-5 max-h-[calc(100vh-190px)] space-y-5 overflow-auto pr-1">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group}>
            <p className="px-3 text-[11px] font-black uppercase tracking-[0.16em] text-white/45">{group}</p>
            <div className="mt-2 grid gap-1">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => onSectionChange(item.sectionId)}
                    className={cn(
                      "flex min-h-10 w-full items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-left text-sm font-bold transition hover:-translate-y-0.5",
                      activeSection === item.sectionId
                        ? "border border-cyan-300/35 bg-cyan-300/12 text-cyan-100 shadow-[inset_4px_0_0_#22D3EE]"
                        : "text-white/72 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </button>
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
  onSearchTermChange,
  onSearchResult,
}: {
  searchTerm: string;
  searchResults: typeof securitySearchRecords;
  onSearchTermChange: (value: string) => void;
  onSearchResult: (record: SecuritySearchRecord) => void;
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
    : "Live security clock syncing";

  return (
    <header id="top" className="rounded-[var(--radius-xl)] border border-[#C8D5EA] bg-white p-4 text-[#071D49] shadow-[0_18px_50px_rgba(7,29,73,0.12)] md:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-[var(--radius-lg)] bg-[#071D49] text-sm font-black text-white shadow-[0_16px_34px_rgba(7,29,73,0.18)]">MS</div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5F6F89]">MyShule school security</p>
            <p className="mt-1 text-lg font-black md:text-2xl">Gate & campus command center</p>
            <p className="mt-1 text-sm font-semibold text-[#5F6F89]">{liveClock}</p>
          </div>
        </div>
        <div className="grid gap-3 lg:min-w-[560px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-[#5F6F89]" aria-hidden="true" />
            <input
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && searchResults[0]) {
                  event.preventDefault();
                  onSearchResult(searchResults[0]);
                }
              }}
              aria-label="Quick search visitors, ID numbers, vehicles, students, staff, or incidents"
              placeholder="Search visitor, ID, vehicle, student, staff, or incident"
              className="h-12 w-full rounded-[var(--radius-lg)] border border-[#C8D5EA] bg-[#F8FAFC] pl-12 pr-4 text-sm font-semibold text-[#071D49] outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-300/20"
            />
            {searchTerm.trim() ? (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-[var(--radius-lg)] border border-[#C8D5EA] bg-white p-2 text-[#071D49] shadow-xl">
                {searchResults.length > 0 ? (
                  searchResults.map((record) => (
                    <button key={record.id} type="button" onClick={() => onSearchResult(record)} className="w-full rounded-[var(--radius)] px-3 py-2 text-left transition hover:bg-[#F3F6FA]">
                      <span className="block text-sm font-black">{record.label}</span>
                      <span className="mt-0.5 block text-xs font-semibold text-[#5F6F89]">{record.detail}</span>
                    </button>
                  ))
                ) : (
                  <p className="rounded-[var(--radius)] px-3 py-3 text-sm font-semibold text-[#5F6F89]">No security records found.</p>
                )}
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip icon={ShieldCheck} label="Campus Secure" tone="secure" />
            <StatusChip icon={Sparkles} label="AI watching" tone="cyan" />
            <StatusChip icon={AlertOctagon} label="2 active incidents" tone="danger" />
            <button type="button" onClick={() => announceAction("Emergency panic confirmation opened for the security desk.")} className="inline-flex items-center gap-2 rounded-[var(--radius-lg)] bg-rose-600 px-4 py-2 text-sm font-black text-white shadow-[0_16px_34px_rgba(225,29,72,0.24)] transition hover:-translate-y-0.5">
              <Siren className="h-4 w-4" aria-hidden="true" />
              Emergency panic
            </button>
            <button type="button" onClick={() => announceAction("Security notifications opened.")} aria-label="Security notifications" className="grid h-10 w-10 place-items-center rounded-[var(--radius)] border border-[#C8D5EA] bg-white text-[#071D49]">
              <Bell className="h-4 w-4" aria-hidden="true" />
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
      <div className="grid gap-7 xl:grid-cols-[minmax(0,1.15fr)_420px] xl:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="relative flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-60" />
              <span className="relative inline-flex h-4 w-4 rounded-full bg-emerald-300" />
            </span>
            <StatusChip icon={ShieldCheck} label="AI perimeter active" tone="secure" />
            <StatusChip icon={RadioTower} label="214 live movements" tone="cyan" />
          </div>
          <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight md:text-6xl">Every Movement Accounted For</h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-white/72">
            Monitor visitors, students, staff, vehicles, and incidents in real time across the entire campus.
          </p>
          <p className="mt-4 max-w-2xl text-sm font-bold text-cyan-100">Nothing dangerous enters this school unnoticed.</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {heroStats.map(([label, value, tone]) => (
              <div key={label} className={cn("rounded-[var(--radius-lg)] border p-4", toneStyles[tone].border, toneStyles[tone].bg)}>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-white/58">{label}</p>
                <p className="mt-2 text-3xl font-black">{value}</p>
                <span className={cn("mt-3 block h-2 w-16 rounded-full", toneStyles[tone].dot)} />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-white/12 bg-white/[0.07] p-5 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-black">Security status graph</h2>
              <p className="mt-1 text-sm text-white/62">Gate, dorm, vehicle, and ID verification signals</p>
            </div>
            <StatusChip icon={Activity} label="Live" tone="secure" />
          </div>
          <div className="mt-6">
            <MiniLine points={[68, 72, 78, 75, 84, 91, 96]} tone="secure" />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-[var(--radius-lg)] border border-cyan-300/25 bg-cyan-400/10 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100/70">Verified entries</p>
              <p className="mt-2 text-2xl font-black">187</p>
            </div>
            <div className="rounded-[var(--radius-lg)] border border-rose-300/25 bg-rose-500/10 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-rose-100/70">Denied / blocked</p>
              <p className="mt-2 text-2xl font-black">3</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function KpiCard({ item }: { item: (typeof kpis)[number] }) {
  const Icon = item.icon;

  return (
    <motion.article
      initial={false}
      whileHover={{ y: -4 }}
      className="rounded-[var(--radius-xl)] border border-[#C8D5EA]/50 bg-[#071D49] p-5 text-white shadow-[0_18px_48px_rgba(7,29,73,0.16)]"
    >
      <div className="flex items-start justify-between gap-3">
        <IconTile icon={Icon} tone={item.tone} />
        <StatusChip icon={item.tone === "danger" ? AlertTriangle : Gauge} label={item.trend} tone={item.tone} />
      </div>
      <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-white/56">{item.label}</p>
      <p className="mt-2 text-4xl font-black">{item.value}</p>
      <p className="mt-2 min-h-10 text-sm leading-5 text-white/64">{item.helper}</p>
      <div className="mt-4">
        <MiniLine points={item.points} tone={item.tone} />
      </div>
    </motion.article>
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
        {eyebrow ? <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">{eyebrow}</p> : null}
        <h2 className="mt-2 text-2xl font-black text-white md:text-3xl">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/64">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function DarkSection({
  id,
  children,
  className,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("rounded-[var(--radius-xl)] border border-[#C8D5EA]/45 bg-[#071D49] p-5 text-white shadow-[0_18px_54px_rgba(7,29,73,0.16)] md:p-6", className)}>
      {children}
    </section>
  );
}

function LiveActivityFeed() {
  return (
    <DarkSection id="live-gate-monitor">
      <SectionTitle
        eyebrow="Live gate monitor"
        title="Live activity feed"
        description="Real-time movements show who entered, who exited, what was denied, and where AI sees unusual behavior."
        action={<StatusChip icon={RadioTower} label="Streaming now" tone="secure" />}
      />
      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        {liveFeed.map(([title, detail, time, tone]) => (
          <article key={title} className={cn("rounded-[var(--radius-lg)] border p-4", toneStyles[tone].border, toneStyles[tone].bg)}>
            <div className="flex items-start gap-3">
              <span className={cn("mt-1 h-3 w-3 rounded-full", toneStyles[tone].dot)} />
              <div className="min-w-0">
                <h3 className="font-black">{title}</h3>
                <p className="mt-1 text-sm leading-5 text-white/64">{detail}</p>
                <p className="mt-2 text-xs font-black uppercase tracking-[0.14em] text-cyan-100/72">{time}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </DarkSection>
  );
}

function VisitorManagement({
  visitors,
  onAddVisitor,
  onCheckOut,
  onAction,
  onPrintSlip,
}: {
  visitors: VisitorRecord[];
  onAddVisitor: (visitor: Omit<VisitorRecord, "id" | "entryTime" | "expectedExit" | "status" | "tone">) => void;
  onCheckOut: (id: string) => void;
  onAction: (message: string) => void;
  onPrintSlip: (visitor: VisitorRecord) => void;
}) {
  const [name, setName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [personVisiting, setPersonVisiting] = useState("");
  const [purpose, setPurpose] = useState("");
  const [vehicle, setVehicle] = useState("");
  const inputClass = "rounded-[var(--radius)] border border-white/12 bg-white/10 px-3 py-2 text-sm font-semibold text-white outline-none placeholder:text-white/38 focus:border-cyan-300";

  return (
    <DarkSection id="visitor-management">
      <SectionTitle
        eyebrow="Access verification"
        title="Visitor management"
        description="ID number, person visiting, purpose, entry time, expected exit, phone, vehicle, approval status, QR badge, blacklist warning, and instant parent or learner verification."
        action={<StatusChip icon={ScanLine} label="QR badges ready" tone="cyan" />}
      />
      <form
        className="mt-6 grid gap-3 rounded-[var(--radius-xl)] border border-cyan-300/25 bg-cyan-400/10 p-4 md:grid-cols-2 xl:grid-cols-[1fr_0.8fr_0.8fr_1fr_1fr_0.8fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          onAddVisitor({ name, idNumber, phone, personVisiting, purpose, vehicle: vehicle || "-" });
          setName("");
          setIdNumber("");
          setPhone("");
          setPersonVisiting("");
          setPurpose("");
          setVehicle("");
        }}
      >
        <input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} aria-label="Visitor name" placeholder="Visitor name" required />
        <input value={idNumber} onChange={(event) => setIdNumber(event.target.value)} className={inputClass} aria-label="ID or passport number" placeholder="ID/passport" required />
        <input value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClass} aria-label="Visitor phone" placeholder="Phone" required />
        <input value={personVisiting} onChange={(event) => setPersonVisiting(event.target.value)} className={inputClass} aria-label="Person being visited" placeholder="Visiting who?" required />
        <input value={purpose} onChange={(event) => setPurpose(event.target.value)} className={inputClass} aria-label="Visit reason" placeholder="Reason for visit" required />
        <input value={vehicle} onChange={(event) => setVehicle(event.target.value)} className={inputClass} aria-label="Vehicle registration" placeholder="Vehicle" />
        <button type="submit" className="rounded-[var(--radius)] bg-cyan-300 px-4 py-2 text-sm font-black text-[#071D49]">Check In</button>
      </form>
      <div className="mt-6 overflow-hidden rounded-[var(--radius-xl)] border border-white/10">
        <div className="hidden grid-cols-[1fr_0.8fr_0.8fr_0.9fr_0.55fr_0.55fr_0.75fr_0.7fr_0.85fr_1fr] gap-3 border-b border-white/10 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-white/50 xl:grid">
          <span>Name</span>
          <span>ID number</span>
          <span>Person visiting</span>
          <span>Purpose</span>
          <span>Entry</span>
          <span>Exit</span>
          <span>Phone</span>
          <span>Vehicle</span>
          <span>Approval status</span>
          <span>Action</span>
        </div>
        <div className="divide-y divide-white/10">
          {visitors.map((visitor) => (
            <article key={visitor.id} className="grid gap-3 px-4 py-4 xl:grid-cols-[1fr_0.8fr_0.8fr_0.9fr_0.55fr_0.55fr_0.75fr_0.7fr_0.85fr_1fr] xl:items-center">
              <p className="font-black">{visitor.name}</p>
              <p className="text-white/64">{visitor.idNumber}</p>
              <p className="text-white/76">{visitor.personVisiting}</p>
              <p className="text-white/64">{visitor.purpose}</p>
              <p className="font-bold">{visitor.entryTime}</p>
              <p className="text-white/64">{visitor.expectedExit}</p>
              <p className="text-white/64">{visitor.phone}</p>
              <p className="text-white/64">{visitor.vehicle}</p>
              <StatusChip icon={visitor.tone === "danger" ? AlertOctagon : CheckCircle2} label={visitor.status} tone={visitor.tone} />
              <div className="flex flex-wrap gap-2">
                {visitor.status !== "Exited" ? (
                  <button type="button" onClick={() => onCheckOut(visitor.id)} className="rounded-[var(--radius)] border border-emerald-300/35 bg-emerald-400/12 px-3 py-1.5 text-xs font-black text-emerald-100">Check Out</button>
                ) : null}
                <button type="button" onClick={() => onPrintSlip(visitor)} className="rounded-[var(--radius)] border border-white/12 bg-white/10 px-3 py-1.5 text-xs font-black text-white">Print Slip</button>
                <button type="button" onClick={() => onAction(`Office alerted about ${visitor.name}.`)} className="rounded-[var(--radius)] border border-orange-300/35 bg-[#FF7A1A]/14 px-3 py-1.5 text-xs font-black text-[#FFE1C8]">Alert Office</button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </DarkSection>
  );
}

function StudentExitControl() {
  return (
    <DarkSection id="student-exit-control">
      <SectionTitle
        eyebrow="Student safety"
        title="Student exit control"
        description="Digital exit slips, parent pickup verification, QR gate approval, biometric checks, lockdown control, and a live movement timeline stop fake pickups and unapproved exits."
        action={<StatusChip icon={Fingerprint} label="Biometric verification" tone="secure" />}
      />
      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_0.82fr]">
        <div className="rounded-[var(--radius-xl)] border border-white/10 bg-white/[0.055] p-5">
          <h3 className="text-xl font-black">Students Outside Campus Right Now</h3>
          <div className="mt-5 space-y-3">
            {studentsOutside.map(([name, klass, reason, departed, expected, approved, tone]) => (
              <article key={name} className={cn("rounded-[var(--radius-lg)] border p-4", toneStyles[tone].border, toneStyles[tone].bg)}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 place-items-center rounded-[var(--radius-lg)] bg-white/10 text-sm font-black">
                      {name.split(" ").map((part) => part[0]).join("")}
                    </span>
                    <div>
                      <p className="font-black">{name}</p>
                      <p className="text-sm text-white/62">{klass} • {reason}</p>
                    </div>
                  </div>
                  <StatusChip icon={tone === "danger" ? AlertTriangle : DoorOpen} label={expected} tone={tone} />
                </div>
                <div className="mt-4 grid gap-3 text-sm text-white/66 sm:grid-cols-3">
                  <span>Departure: <strong className="text-white">{departed}</strong></span>
                  <span>Expected return: <strong className="text-white">{expected}</strong></span>
                  <span>Approved by: <strong className="text-white">{approved}</strong></span>
                </div>
              </article>
            ))}
          </div>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-rose-300/35 bg-rose-500/12 p-5 shadow-[0_0_42px_rgba(225,29,72,0.18)]">
          <div className="flex items-center justify-between gap-3">
            <IconTile icon={Siren} tone="danger" />
            <StatusChip icon={AlertTriangle} label="Critical control" tone="danger" />
          </div>
          <h3 className="mt-5 text-2xl font-black">Emergency lockdown ready</h3>
          <p className="mt-3 text-sm leading-6 text-white/70">If a missing learner, intruder, violent incident, or contraband threat escalates, all exits are locked and the principal receives SMS escalation.</p>
          <button type="button" onClick={() => announceAction("Emergency lockdown review opened for student exit control.")} className="mt-5 w-full rounded-[var(--radius-lg)] bg-rose-600 px-5 py-4 text-sm font-black text-white shadow-[0_18px_40px_rgba(225,29,72,0.28)] transition hover:-translate-y-0.5">
            Activate lockdown
          </button>
        </div>
      </div>
    </DarkSection>
  );
}

function BoardingSecurity() {
  return (
    <DarkSection id="boarding-security">
      <SectionTitle
        eyebrow="Night movement"
        title="Boarding security module"
        description="Dorm occupancy, late-night movement alerts, unauthorized access, bed tracking, emergency incidents, and roll-call summaries."
        action={<StatusChip icon={LockKeyhole} label="Curfew watch" tone="warning" />}
      />
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {boardingAlerts.map(([title, detail, tone]) => (
          <article key={title} className={cn("rounded-[var(--radius-xl)] border p-4", toneStyles[tone].border, toneStyles[tone].bg, toneStyles[tone].glow)}>
            <IconTile icon={tone === "danger" ? AlertOctagon : LockKeyhole} tone={tone} />
            <h3 className="mt-4 text-lg font-black">{title}</h3>
            <p className="mt-2 text-sm leading-5 text-white/64">{detail}</p>
          </article>
        ))}
      </div>
    </DarkSection>
  );
}

function AiThreatDetection() {
  return (
    <DarkSection id="ai-threat-detection">
      <SectionTitle
        eyebrow="AI threat detection"
        title="AI security insights"
        description="Pattern detection surfaces impersonation attempts, repeated gate behavior, risky student exits, and late-night movement changes."
        action={<StatusChip icon={Sparkles} label="Threat model active" tone="cyan" />}
      />
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {aiInsights.map(([title, detail, confidence, tone]) => (
          <article key={title} className={cn("rounded-[var(--radius-xl)] border p-5", toneStyles[tone].border, toneStyles[tone].bg)}>
            <div className="flex items-start justify-between gap-3">
              <IconTile icon={Sparkles} tone={tone} />
              <StatusChip icon={Gauge} label={confidence} tone={tone} />
            </div>
            <h3 className="mt-5 text-xl font-black">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-white/66">{detail}</p>
          </article>
        ))}
      </div>
    </DarkSection>
  );
}

function IncidentReporting() {
  return (
    <DarkSection id="incident-reports">
      <SectionTitle
        eyebrow="Evidence capture"
        title="Incident reporting"
        description="Guards can log theft, fights, contraband, vandalism, suspicious behavior, missing items, photos, witnesses, timestamps, notes, involved persons, and escalation level."
        action={<StatusChip icon={ClipboardList} label="Evidence required" tone="info" />}
      />
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {incidentTypes.map(([title, value, detail, tone]) => (
          <article key={title} className={cn("rounded-[var(--radius-xl)] border p-4", toneStyles[tone].border, toneStyles[tone].bg)}>
            <div className="flex items-center justify-between gap-3">
              <IconTile icon={ClipboardList} tone={tone} />
              <span className="text-xl font-black">{value}</span>
            </div>
            <h3 className="mt-4 font-black">{title}</h3>
            <p className="mt-2 text-sm leading-5 text-white/64">{detail}</p>
          </article>
        ))}
      </div>
    </DarkSection>
  );
}

function EmergencyMode() {
  return (
    <DarkSection id="emergency-mode" className="border-rose-300/40 bg-[radial-gradient(circle_at_top_left,rgba(225,29,72,0.2),transparent_26%),linear-gradient(135deg,#071D49_0%,#2A1028_100%)]">
      <SectionTitle
        eyebrow="Emergency mode"
        title="Emergency lockdown mode"
        description="When activated, all exits lock, principal escalation starts, SMS alerts trigger, emergency contacts appear, and the incident command panel opens."
        action={<StatusChip icon={Siren} label="Principal SMS armed" tone="danger" />}
      />
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
        {emergencyActions.map(([title, detail, Icon]) => (
          <article key={title} className="rounded-[var(--radius-xl)] border border-rose-300/30 bg-rose-500/10 p-5">
            <IconTile icon={Icon} tone="danger" />
            <h3 className="mt-4 text-lg font-black">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-white/66">{detail}</p>
          </article>
        ))}
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={() => announceAction("Emergency lockdown checklist opened.")} className="min-h-12 flex-1 rounded-[var(--radius-lg)] bg-rose-600 px-5 py-3 text-sm font-black text-white shadow-[0_18px_42px_rgba(225,29,72,0.28)] transition hover:-translate-y-0.5">Activate lockdown</button>
        <button type="button" onClick={() => announceAction("Emergency contact list opened.")} className="min-h-12 flex-1 rounded-[var(--radius-lg)] border border-white/14 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5">Open emergency contacts</button>
      </div>
    </DarkSection>
  );
}

function AnalyticsAndEmptyStates() {
  return (
    <DarkSection id="analytics">
      <SectionTitle
        eyebrow="Reports & analytics"
        title="Movement analytics"
        description="Daily visitors, suspicious activity, student movement, vehicle frequency, dorm incidents, and gate traffic heatmaps stay visible for principals and auditors."
        action={<StatusChip icon={FileBarChart2} label="Reports ready" tone="cyan" />}
      />
      <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {analytics.map((chart) => (
          <article key={chart.title} className="rounded-[var(--radius-xl)] border border-white/10 bg-white/[0.055] p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-black">{chart.title}</h3>
              <StatusChip icon={Activity} label="Live" tone={chart.tone} />
            </div>
            <div className="mt-5">
              <Bars values={chart.values} tone={chart.tone} />
            </div>
          </article>
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {secureEmptyStates.map(([title, detail, Icon]) => (
          <article key={title} className="rounded-[var(--radius-xl)] border border-emerald-300/25 bg-emerald-400/10 p-5">
            <IconTile icon={Icon} tone="secure" />
            <h3 className="mt-4 font-black">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-white/64">{detail}</p>
          </article>
        ))}
      </div>
    </DarkSection>
  );
}

function SupportModuleSection({ id }: { id: string }) {
  if (id === "vehicle-tracking") {
    return (
      <DarkSection id="vehicle-tracking">
        <SectionTitle eyebrow="Vehicle control" title="Vehicle tracking" description="Vehicle plates, driver IDs, route purpose, gate entry, gate exit, and repeat entries." />
        <div className="mt-5 space-y-3">
          {["KDA 810P - 3 entries today", "KDC 448R - kitchen delivery approved", "KBS 229L - staff car parked"].map((item) => (
            <p key={item} className="rounded-[var(--radius-lg)] border border-white/10 bg-white/[0.055] px-4 py-3 text-sm font-bold text-white/76">{item}</p>
          ))}
        </div>
      </DarkSection>
    );
  }

  if (id === "cctv-monitoring") {
    return (
      <DarkSection id="cctv-monitoring">
        <SectionTitle eyebrow="CCTV" title="CCTV monitoring" description="Camera health, dark zones, snapshots, and incident-linked evidence." />
        <div className="mt-5 grid grid-cols-2 gap-3">
          {["Main Gate", "Dorm B", "Kitchen", "Admin Block"].map((item) => (
            <div key={item} className="rounded-[var(--radius-lg)] border border-cyan-300/20 bg-cyan-400/10 p-4">
              <Camera className="h-5 w-5 text-cyan-200" aria-hidden="true" />
              <p className="mt-3 text-sm font-black">{item}</p>
              <p className="text-xs text-white/54">Online</p>
            </div>
          ))}
        </div>
      </DarkSection>
    );
  }

  if (id === "blacklist-database") {
    return (
      <DarkSection id="blacklist-database">
        <SectionTitle eyebrow="Blacklist" title="Blacklist database" description="Denied visitors, fake parents, suspicious strangers, blocked vehicles, and repeat patterns." />
        <div className="mt-5 rounded-[var(--radius-lg)] border border-rose-300/30 bg-rose-500/10 p-4">
          <StatusChip icon={UserRoundX} label="2 repeat IDs watched" tone="danger" />
          <p className="mt-4 text-sm leading-6 text-white/66">Two IDs attempted access under different names this week.</p>
        </div>
      </DarkSection>
    );
  }

  const supportSections: Record<string, [string, string, string]> = {
    "staff-entry-logs": ["Staff", "Staff entry logs", "Staff arrival, exit, late arrivals, department location, and ID verification."],
    "parcel-logs": ["Deliveries", "Parcel & delivery logs", "Supplier delivery, parcel verification, exam paper handling, and unrecorded package prevention."],
    "id-verification": ["Identity", "ID verification", "National ID, staff ID, learner link, approved guardian profile, biometrics, and QR scan checks."],
    "lost-found": ["Evidence", "Lost & found", "Lost books, property, uniforms, devices, witness notes, and release signatures."],
    reports: ["Reports", "Reports", "Daily, weekly, term, incident, CCTV, visitor, vehicle, and movement reports."],
    settings: ["Settings", "Settings", "Gate permissions, role access, emergency contacts, SMS escalation, and device policies."],
  };
  const [eyebrow, title, description] = supportSections[id] ?? supportSections.reports;

  return (
    <DarkSection id={id}>
      <SectionTitle eyebrow={eyebrow} title={title} description={description} />
      <div className="mt-5 rounded-[var(--radius-xl)] border border-white/10 bg-white/[0.055] p-5">
        <p className="text-sm font-semibold leading-6 text-white/70">Use this desk to review records, print reports, and escalate security follow-up to the office or principal.</p>
        <button type="button" onClick={() => announceAction(`${title} report opened for review.`)} className="mt-4 rounded-[var(--radius-lg)] border border-cyan-300/35 bg-cyan-400/12 px-4 py-2 text-sm font-black text-cyan-100">Open {title}</button>
      </div>
    </DarkSection>
  );
}

function MobileActions({
  activeSection,
  onSectionChange,
}: {
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
}) {
  const actions = [
    ["Scan ID", ScanLine, "id-verification"],
    ["Visitor", UserCheck, "visitor-management"],
    ["Alerts", ShieldAlert, "live-gate-monitor"],
    ["Lockdown", Siren, "emergency-mode"],
    ["Reports", FileBarChart2, "reports"],
  ] as const;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#071D49]/94 px-2 py-2 text-white shadow-[0_-18px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-5 gap-1">
        {actions.map(([label, Icon, sectionId]) => (
          <button key={label} type="button" onClick={() => onSectionChange(sectionId)} className={cn("flex min-h-14 flex-col items-center justify-center gap-1 rounded-[var(--radius)] px-1 text-center text-[10px] font-black active:scale-95", activeSection === sectionId && "bg-white/12")}>
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ActiveSecuritySection({
  activeSection,
  visitors,
  kpiItems,
  onAddVisitor,
  onCheckOutVisitor,
  onPrintVisitorSlip,
  onNotice,
}: {
  activeSection: string;
  visitors: VisitorRecord[];
  kpiItems: SecurityKpi[];
  onAddVisitor: (visitor: Omit<VisitorRecord, "id" | "entryTime" | "expectedExit" | "status" | "tone">) => void;
  onCheckOutVisitor: (id: string) => void;
  onPrintVisitorSlip: (visitor: VisitorRecord) => void;
  onNotice: (message: string) => void;
}) {
  if (activeSection === "top") {
    return (
      <>
        <Hero />
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Security KPI summary">
          {kpiItems.map((item) => (
            <KpiCard key={item.label} item={item} />
          ))}
        </section>
        <LiveActivityFeed />
      </>
    );
  }

  if (activeSection === "live-gate-monitor") return <LiveActivityFeed />;
  if (activeSection === "visitor-management") {
    return <VisitorManagement visitors={visitors} onAddVisitor={onAddVisitor} onCheckOut={onCheckOutVisitor} onAction={onNotice} onPrintSlip={onPrintVisitorSlip} />;
  }
  if (activeSection === "student-exit-control") return <StudentExitControl />;
  if (activeSection === "boarding-security") return <BoardingSecurity />;
  if (activeSection === "ai-threat-detection") return <AiThreatDetection />;
  if (activeSection === "incident-reports") return <IncidentReporting />;
  if (activeSection === "emergency-mode") return <EmergencyMode />;
  if (activeSection === "analytics") return <AnalyticsAndEmptyStates />;

  return <SupportModuleSection id={activeSection} />;
}

export function SecurityCommandCenter({ routeMode }: { routeMode: SecurityRouteMode }) {
  const schoolId = getCurrentSchoolId();
  const [searchTerm, setSearchTerm] = useState("");
  const [notice, setNotice] = useState("Security desk ready for gate operations.");
  const [activeSection, setActiveSection] = useState("top");
  const [visitors, setVisitors] = useState<VisitorRecord[]>(initialVisitorRows);
  const searchResults = searchTerm.trim()
    ? securitySearchRecords.filter((record) => `${record.label} ${record.detail}`.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];
  const visitorsInside = visitors.filter((visitor) => visitor.status !== "Exited").length;
  const kpiItems = kpis.map((item) =>
    item.label === "Visitors on Campus"
      ? { ...item, value: String(visitorsInside), helper: `${visitorsInside} visitors currently marked inside` }
      : item,
  );

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

  function openSearchRecord(record: SecuritySearchRecord) {
    setSearchTerm("");
    setActiveSection(record.sectionId);
    setNotice(`${record.label} opened in security records.`);
  }

  function changeSection(sectionId: string) {
    setActiveSection(sectionId);
    const label = securityNav.find((item) => item.sectionId === sectionId)?.label ?? "Security desk";
    setNotice(`${label} opened.`);
  }

  function addVisitor(visitor: Omit<VisitorRecord, "id" | "entryTime" | "expectedExit" | "status" | "tone">) {
    const now = new Date();
    const exit = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const newVisitor: VisitorRecord = {
      ...visitor,
      id: runtimeId("visitor"),
      entryTime: now.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }),
      expectedExit: exit.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }),
      status: "QR badge active",
      tone: "secure",
    };
    setVisitors((current) => [newVisitor, ...current]);
    addSchoolRecord("visitors", newVisitor, schoolId);
    publishSchoolOperationalEvent({
      schoolId,
      actorRole: "security",
      type: "VISITOR_CHECKED_IN",
      module: "visitors",
      title: `${visitor.name} checked in`,
      body: `${visitor.name} checked in to visit ${visitor.personVisiting} for ${visitor.purpose}.`,
      entityId: newVisitor.id,
      severity: visitor.purpose.toLowerCase().includes("emergency") ? "critical" : "success",
      payload: { visitor: newVisitor },
      notifications: [
        {
          audienceRoles: ["secretary", "principal", "security"],
          title: "Visitor checked in",
          body: `${visitor.name} is inside school for ${visitor.purpose}.`,
          severity: "success",
        },
      ],
    });
    setNotice(`${visitor.name} checked in. Visitor slip is ready for printing.`);
  }

  function checkOutVisitor(id: string) {
    const visitor = visitors.find((item) => item.id === id);
    setVisitors((current) => current.map((item) => item.id === id ? { ...item, status: "Exited", tone: "secure" } : item));
    publishSchoolOperationalEvent({
      schoolId,
      actorRole: "security",
      type: "VISITOR_CHECKED_OUT",
      module: "visitors",
      title: `${visitor?.name ?? "Visitor"} checked out`,
      body: `${visitor?.name ?? "Visitor"} exited the school gate and was removed from the currently-inside list.`,
      entityId: id,
      severity: "success",
      payload: { visitor },
      notifications: [
        {
          audienceRoles: ["secretary", "security"],
          title: "Visitor checked out",
          body: `${visitor?.name ?? "Visitor"} has left the school.`,
          severity: "success",
        },
      ],
    });
    setNotice(`${visitor?.name ?? "Visitor"} checked out and removed from currently-inside list.`);
  }

  function printVisitorSlip(visitor: VisitorRecord) {
    publishSchoolOperationalEvent({
      schoolId,
      actorRole: "security",
      type: "VISITOR_SLIP_PRINTED",
      module: "visitors",
      title: `${visitor.name} visitor slip opened for printing`,
      body: `${visitor.name} visitor slip prepared for ${visitor.personVisiting}.`,
      entityId: visitor.id,
      severity: "success",
      payload: { visitor },
      notifications: [
        {
          audienceRoles: ["security", "secretary"],
          title: "Visitor slip printed",
          body: `${visitor.name} visitor slip is ready.`,
          severity: "success",
        },
      ],
    });
    setNotice(`${visitor.name} visitor slip opened for printing.`);
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  return (
    <div data-route-mode={routeMode} className="min-h-screen bg-[#F3F4F6] pb-24 lg:pb-6">
      <div className="grid gap-5 p-3 md:p-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Sidebar activeSection={activeSection} onSectionChange={changeSection} />
        <main className="min-w-0 space-y-5">
          <TopHeader
            searchTerm={searchTerm}
            searchResults={searchResults}
            onSearchTermChange={setSearchTerm}
            onSearchResult={openSearchRecord}
          />
          <div role="status" className="rounded-[var(--radius-lg)] border border-[#C8D5EA] bg-white px-4 py-3 text-sm font-black text-[#071D49] shadow-[0_12px_30px_rgba(7,29,73,0.08)]">
            {notice}
          </div>
          <ActiveSecuritySection
            activeSection={activeSection}
            visitors={visitors}
            kpiItems={kpiItems}
            onAddVisitor={addVisitor}
            onCheckOutVisitor={checkOutVisitor}
            onPrintVisitorSlip={printVisitorSlip}
            onNotice={setNotice}
          />
        </main>
      </div>
      <MobileActions activeSection={activeSection} onSectionChange={changeSection} />
    </div>
  );
}
