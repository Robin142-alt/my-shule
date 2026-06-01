"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpenCheck,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  MessageSquareWarning,
  Search,
  Settings,
  ShieldAlert,
  TrendingUp,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

type GradeRouteMode = "hosted" | "public";
type Tone = "success" | "info" | "warning" | "danger" | "neutral";
type GradeView =
  | "overview"
  | "streams"
  | "attendance"
  | "discipline"
  | "academics"
  | "teachers"
  | "welfare"
  | "parents"
  | "analytics"
  | "meetings"
  | "reports"
  | "notifications"
  | "settings";

type NavItem = {
  id: GradeView;
  label: string;
  icon: LucideIcon;
  group: string;
};

type Kpi = {
  label: string;
  value: string;
  helper: string;
  tone: Tone;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { id: "overview", label: "Dashboard Overview", icon: LayoutDashboard, group: "Command" },
  { id: "streams", label: "Streams & Classes", icon: Users, group: "Grade Operations" },
  { id: "attendance", label: "Attendance Oversight", icon: UserCheck, group: "Grade Operations" },
  { id: "discipline", label: "Discipline Oversight", icon: ShieldAlert, group: "Grade Operations" },
  { id: "academics", label: "Academic Monitoring", icon: BookOpenCheck, group: "Academics" },
  { id: "teachers", label: "Teachers Coordination", icon: GraduationCap, group: "People" },
  { id: "welfare", label: "Student Welfare", icon: AlertTriangle, group: "Student Support" },
  { id: "parents", label: "Parent Escalations", icon: MessageSquareWarning, group: "Student Support" },
  { id: "analytics", label: "Performance Analytics", icon: BarChart3, group: "Intelligence" },
  { id: "meetings", label: "Meetings & Interventions", icon: CalendarDays, group: "Interventions" },
  { id: "reports", label: "Reports", icon: ClipboardList, group: "Administration" },
  { id: "notifications", label: "Notifications", icon: Bell, group: "Administration" },
  { id: "settings", label: "Settings", icon: Settings, group: "Administration" },
];

const toneStyles: Record<Tone, { chip: string; card: string; dot: string; rail: string; text: string }> = {
  success: {
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    card: "border-emerald-200 bg-emerald-50/80 text-emerald-950",
    dot: "bg-emerald-500",
    rail: "bg-emerald-500",
    text: "text-emerald-700",
  },
  info: {
    chip: "border-blue-200 bg-blue-50 text-blue-700",
    card: "border-blue-200 bg-blue-50/80 text-blue-950",
    dot: "bg-blue-500",
    rail: "bg-blue-500",
    text: "text-blue-700",
  },
  warning: {
    chip: "border-amber-200 bg-amber-50 text-amber-700",
    card: "border-amber-200 bg-amber-50/85 text-amber-950",
    dot: "bg-amber-500",
    rail: "bg-amber-500",
    text: "text-amber-700",
  },
  danger: {
    chip: "border-rose-200 bg-rose-50 text-rose-700",
    card: "border-rose-200 bg-rose-50/85 text-rose-950",
    dot: "bg-rose-500",
    rail: "bg-rose-500",
    text: "text-rose-700",
  },
  neutral: {
    chip: "border-slate-200 bg-slate-50 text-slate-700",
    card: "border-slate-200 bg-white/86 text-[#071D49]",
    dot: "bg-slate-400",
    rail: "bg-slate-400",
    text: "text-slate-600",
  },
};

const overviewKpis: Kpi[] = [
  { label: "Total Students", value: "428", helper: "Across Form 2 streams", tone: "info", icon: Users },
  { label: "Total Streams", value: "4", helper: "North, East, West, South", tone: "success", icon: LayoutDashboard },
  { label: "Attendance Rate", value: "93.6%", helper: "+1.8% this week", tone: "success", icon: UserCheck },
  { label: "Discipline Cases", value: "12", helper: "3 require deputy review", tone: "warning", icon: ShieldAlert },
  { label: "Students At Risk", value: "19", helper: "Academic, attendance, welfare", tone: "danger", icon: AlertTriangle },
  { label: "Teacher Follow-Ups", value: "7", helper: "Reports pending", tone: "warning", icon: GraduationCap },
  { label: "Parent Escalations", value: "5", helper: "2 unresolved complaints", tone: "danger", icon: MessageSquareWarning },
  { label: "Academic Average", value: "68.4%", helper: "+3.1 vs last CAT", tone: "info", icon: TrendingUp },
];

const streams = [
  ["Form 2 North", "Mrs. Achieng", "112", "96%", "91", "71%", "success"],
  ["Form 2 East", "Mr. Otieno", "105", "92%", "84", "66%", "warning"],
  ["Form 2 West", "Ms. Wairimu", "109", "89%", "78", "63%", "danger"],
  ["Form 2 South", "Mr. Kamau", "102", "95%", "88", "73%", "success"],
] as const;

const riskStudents = [
  ["Brian Otieno", "Form 2 West", "Attendance drop", "High", "Parent meeting"],
  ["Aisha Njeri", "Form 2 East", "Math decline", "Medium", "Teacher follow-up"],
  ["Kevin Mwangi", "Form 2 North", "Discipline repeat", "High", "Counselling referral"],
] as const;

const academicRows = [
  ["1", "Form 2 South", "73%", "Science", "Kiswahili", "8 improvers"],
  ["2", "Form 2 North", "71%", "Mathematics", "English", "6 improvers"],
  ["3", "Form 2 East", "66%", "History", "Mathematics", "11 below target"],
  ["4", "Form 2 West", "63%", "CRE", "Algebra", "14 below target"],
] as const;

const gradeSearchRecords = [
  { id: "stream-west", label: "Form 2 West", detail: "89% attendance | 5 high risk cases", view: "streams" },
  { id: "student-brian", label: "Brian Otieno", detail: "Form 2 West | attendance drop | parent meeting", view: "welfare" },
  { id: "teacher-achieng", label: "Mrs. Achieng", detail: "Form 2 North class teacher | report submitted", view: "teachers" },
  { id: "parent-wanjiku", label: "Mrs. Wanjiku", detail: "Parent escalation | absenteeism follow-up today", view: "parents" },
  { id: "grade-report", label: "Form 2 grade report", detail: "Attendance, discipline, academics, and interventions", view: "reports" },
] satisfies Array<{ id: string; label: string; detail: string; view: GradeView }>;

type GradeSearchRecord = (typeof gradeSearchRecords)[number];

function announceAction(message: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("myshule-dashboard-action", { detail: message }));
  }
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getViewLabel(view: GradeView) {
  return navItems.find((item) => item.id === view)?.label ?? "Grade/Form workspace";
}

function StatusChip({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black", toneStyles[tone].chip)}>
      <span className={cn("h-2 w-2 rounded-full", toneStyles[tone].dot)} />
      {label}
    </span>
  );
}

function ProgressBar({ value, tone = "info" }: { value: number; tone?: Tone }) {
  return (
    <div className="h-2 rounded-full bg-[#E2E8F0]">
      <div className={cn("h-full rounded-full", toneStyles[tone].rail)} style={{ width: `${Math.max(8, Math.min(100, value))}%` }} />
    </div>
  );
}

function Sidebar({
  activeView,
  onViewChange,
}: {
  activeView: GradeView;
  onViewChange: (view: GradeView) => void;
}) {
  return (
    <aside className="hidden h-[calc(100vh-1.5rem)] overflow-hidden rounded-2xl bg-[#071D49] p-4 text-white shadow-[0_24px_70px_rgba(7,29,73,0.28)] lg:block">
      <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-100/70">MyShule ERP</p>
        <h2 className="mt-2 text-xl font-black">Grade/Form Module</h2>
        <p className="mt-2 text-sm leading-6 text-white/65">Multi-stream oversight, intervention, and academic coordination.</p>
      </div>
      <nav className="mt-4 h-[calc(100%-8.5rem)] space-y-1 overflow-y-auto pr-1" aria-label="Grade form master navigation">
        {navItems.map((item, index) => {
          const showGroup = item.group !== navItems[index - 1]?.group;
          const Icon = item.icon;

          return (
            <div key={`${item.group}-${item.label}`}>
              {showGroup ? <p className="px-3 pb-2 pt-4 text-[11px] font-black uppercase tracking-[0.2em] text-white/45">{item.group}</p> : null}
              <button
                type="button"
                onClick={() => onViewChange(item.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-white/72 transition hover:bg-white/10 hover:text-white",
                  activeView === item.id && "bg-white/14 text-white shadow-[inset_4px_0_0_#8B5CF6]",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </button>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function Topbar({
  activeView,
  searchTerm,
  searchResults,
  onSearchTermChange,
  onSearchResult,
  onViewChange,
}: {
  activeView: GradeView;
  searchTerm: string;
  searchResults: typeof gradeSearchRecords;
  onSearchTermChange: (value: string) => void;
  onSearchResult: (record: GradeSearchRecord) => void;
  onViewChange: (view: GradeView) => void;
}) {
  const today = "Today";

  return (
    <header className="sticky top-0 z-20 border-b border-[#D8E0EC] bg-[#F3F6FA]/92 px-4 py-3 backdrop-blur">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#071D49] text-sm font-black text-white">F2</div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#64748B]">Grade selector: Form 2 - 2026</p>
            <h1 className="text-xl font-black text-[#071D49]">Grade/Form Workspace</h1>
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-[minmax(240px,1fr)_auto_auto_auto] xl:min-w-[780px]">
          <div className="relative">
            <label className="flex min-h-11 items-center gap-3 rounded-xl border border-[#D8E0EC] bg-white/88 px-3 text-[#64748B] shadow-sm">
              <Search className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Grade form master search</span>
              <input
                value={searchTerm}
                onChange={(event) => onSearchTermChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && searchResults[0]) {
                    event.preventDefault();
                    onSearchResult(searchResults[0]);
                  }
                }}
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[#94A3B8]"
                placeholder="Search students, streams, class teachers, parent cases, or reports"
              />
            </label>
            {searchTerm.trim() ? (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-xl border border-[#D8E0EC] bg-white p-2 shadow-xl">
                {searchResults.length > 0 ? (
                  searchResults.map((record) => (
                    <button key={record.id} type="button" onClick={() => onSearchResult(record)} className="w-full rounded-lg px-3 py-2 text-left transition hover:bg-[#F3F6FA]">
                      <span className="block text-sm font-black text-[#071D49]">{record.label}</span>
                      <span className="mt-0.5 block text-xs font-semibold text-[#64748B]">{record.detail}</span>
                    </button>
                  ))
                ) : (
                  <p className="rounded-lg px-3 py-3 text-sm font-semibold text-[#64748B]">No grade records found.</p>
                )}
              </div>
            ) : null}
          </div>
          <StatusChip label="Term 2 live" tone="info" />
          <StatusChip label={today} tone="neutral" />
          <button type="button" onClick={() => onViewChange("meetings")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#7C3AED] px-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(124,58,237,0.24)]">
            Quick actions
          </button>
        </div>
      </div>
      <div className="mt-3 lg:hidden">
        <label className="sr-only" htmlFor="grade-mobile-workspace">Grade form workspace</label>
        <select
          id="grade-mobile-workspace"
          className="h-11 w-full rounded-xl border border-[#D8E0EC] bg-white px-3 text-sm font-black text-[#071D49] outline-none"
          value={activeView}
          onChange={(event) => onViewChange(event.target.value as GradeView)}
        >
          {navItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}

function Panel({
  title,
  description,
  icon: Icon,
  children,
  actions,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#D8E0EC] bg-white/82 p-5 shadow-[0_18px_50px_rgba(7,29,73,0.08)]">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          {Icon ? (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EEF2FF] text-[#4F46E5]">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
          ) : null}
          <div>
            <h2 className="text-xl font-black tracking-[-0.01em] text-[#071D49]">{title}</h2>
            {description ? <p className="mt-1 text-sm leading-6 text-[#64748B]">{description}</p> : null}
          </div>
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function KpiGrid({ items }: { items: Kpi[] }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <article key={item.label} className={cn("rounded-2xl border p-4 shadow-sm", toneStyles[item.tone].card)}>
            <div className="flex items-start justify-between gap-3">
              <Icon className="h-5 w-5" aria-hidden="true" />
              <StatusChip label={item.tone === "success" ? "Good" : item.tone === "danger" ? "Act" : "Watch"} tone={item.tone} />
            </div>
            <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] opacity-70">{item.label}</p>
            <p className="mt-2 text-3xl font-black">{item.value}</p>
            <p className="mt-1 text-sm font-semibold opacity-75">{item.helper}</p>
          </article>
        );
      })}
    </section>
  );
}

function DataTable({
  title,
  rows,
  columns,
}: {
  title: string;
  rows: ReadonlyArray<readonly string[]>;
  columns: string[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#D8E0EC] bg-white/80">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D8E0EC] bg-[#F8FAFC] px-4 py-3">
        <h3 className="text-sm font-black uppercase tracking-[0.14em] text-[#071D49]">{title}</h3>
        <div className="flex gap-2">
          <button type="button" onClick={() => announceAction(`${title} filters opened.`)} className="rounded-lg border border-[#D8E0EC] px-3 py-1.5 text-xs font-black text-[#071D49]">Filters</button>
          <button type="button" onClick={() => announceAction(`${title} exported for grade records.`)} className="rounded-lg border border-[#D8E0EC] px-3 py-1.5 text-xs font-black text-[#071D49]">Export</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="sticky top-0 bg-[#EEF2FF] text-xs uppercase tracking-[0.12em] text-[#64748B]">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3 font-black">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {rows.map((row) => (
              <tr key={row.join("-")} className="transition hover:bg-[#F8FAFC]">
                {row.map((cell, index) => (
                  <td key={`${row[0]}-${columns[index]}`} className="px-4 py-3 font-semibold text-[#334155]">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-[#D8E0EC] px-4 py-3 text-xs font-bold text-[#64748B]">
        <span>Showing focused records</span>
        <span>Pagination ready</span>
      </div>
    </div>
  );
}

function OverviewWorkspace() {
  return (
    <>
      <section className="rounded-2xl bg-[linear-gradient(135deg,#071D49_0%,#312E81_56%,#6D28D9_100%)] p-5 text-white shadow-[0_24px_70px_rgba(7,29,73,0.22)]">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-100/70">Form 2 executive oversight</p>
            <h2 className="mt-3 max-w-4xl text-3xl font-black tracking-[-0.02em] md:text-5xl">Grade/Form Master Command Center</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-indigo-100/82">
              Overseeing Form 2 across multiple streams with attendance, discipline, academics, welfare, parent escalation, and class teacher coordination. This is not a class teacher dashboard.
            </p>
          </div>
          <div className="grid gap-3">
            {["4 streams active", "3 teacher reports overdue", "5 parent escalations open"].map((item) => (
              <div key={item} className="rounded-xl border border-white/12 bg-white/10 px-4 py-3 text-sm font-black text-indigo-50">{item}</div>
            ))}
          </div>
        </div>
      </section>
      <KpiGrid items={overviewKpis} />
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Attendance Trend" description="Line-style weekly attendance trend across streams." icon={UserCheck}>
          <div className="grid gap-3 md:grid-cols-4">
            {streams.map(([stream, , , attendance, , , tone]) => (
              <div key={stream} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
                <p className="text-sm font-black text-[#071D49]">{stream}</p>
                <p className={cn("mt-2 text-2xl font-black", toneStyles[tone as Tone].text)}>{attendance}</p>
                <ProgressBar value={Number(attendance.replace("%", ""))} tone={tone as Tone} />
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Academic Performance by Stream" description="Compact bar comparison for the grade master, not classroom teaching detail." icon={BarChart3}>
          <div className="space-y-3">
            {streams.map(([stream, , , , , average, tone]) => (
              <div key={stream} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="font-black text-[#071D49]">{stream}</span>
                  <StatusChip label={average} tone={tone as Tone} />
                </div>
                <ProgressBar value={Number(average.replace("%", ""))} tone={tone as Tone} />
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Panel title="Discipline Cases by Stream" description="Heatmap-style severity overview for fast executive action." icon={ShieldAlert}>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ["Form 2 North", "2 low severity", "success"],
              ["Form 2 East", "4 active cases", "warning"],
              ["Form 2 West", "5 high risk cases", "danger"],
              ["Form 2 South", "1 follow-up", "success"],
            ].map(([stream, detail, tone]) => (
              <div key={stream} className={cn("rounded-xl border p-4", toneStyles[tone as Tone].card)}>
                <h3 className="font-black">{stream}</h3>
                <p className="mt-1 text-sm font-semibold opacity-75">{detail}</p>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Risk Students Tracker" description="Students requiring intervention across streams." icon={AlertTriangle}>
          <DataTable title="Risk tracker" columns={["Student", "Stream", "Trigger", "Risk", "Next Action"]} rows={riskStudents} />
        </Panel>
      </div>
    </>
  );
}

function StreamsWorkspace() {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Panel title="Streams & Classes" description="Manage all streams under Form 2 without mixing unrelated modules." icon={Users}>
        <div className="grid gap-3 md:grid-cols-2">
          {streams.map(([stream, teacher, total, attendance, discipline, average, tone]) => (
            <article key={stream} className="rounded-2xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-[#071D49]">{stream}</h3>
                  <p className="mt-1 text-sm font-semibold text-[#64748B]">Class teacher: {teacher}</p>
                </div>
                <StatusChip label={average} tone={tone as Tone} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <div><p className="font-black text-[#071D49]">{total}</p><p className="text-[#64748B]">Students</p></div>
                <div><p className="font-black text-[#071D49]">{attendance}</p><p className="text-[#64748B]">Attendance</p></div>
                <div><p className="font-black text-[#071D49]">{discipline}</p><p className="text-[#64748B]">Discipline score</p></div>
              </div>
            </article>
          ))}
        </div>
      </Panel>
      <Panel title="Stream detail workspace" description="Open a selected stream without leaving the Grade/Form Master context." icon={LayoutDashboard}>
        <button
          type="button"
          onClick={() => announceAction("Form 2 stream detail opened.")}
          className="w-full rounded-xl bg-[#071D49] px-4 py-3 text-left text-sm font-black text-white"
        >
          Open stream detail
        </button>
        <div className="mt-3 space-y-3">
          {["Roster summary", "Attendance profile", "Academic snapshot", "Discipline notes"].map((item) => (
            <div key={item} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-3 font-black text-[#071D49]">{item}</div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function AttendanceWorkspace() {
  return (
    <>
      <KpiGrid items={[
        { label: "Grade Attendance", value: "93.6%", helper: "Today across streams", tone: "success", icon: UserCheck },
        { label: "Late Arrivals", value: "18", helper: "6 repeat cases", tone: "warning", icon: AlertTriangle },
        { label: "Chronic Absentees", value: "9", helper: "Needs intervention", tone: "danger", icon: Users },
        { label: "Resolved Follow-Ups", value: "14", helper: "This week", tone: "info", icon: ClipboardList },
      ]} />
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Panel title="Attendance Oversight" description="Cross-stream attendance monitoring with absentee trends, late arrivals, and stream ranking." icon={UserCheck}>
          <DataTable
            title="Stream attendance ranking"
            columns={["Rank", "Stream", "Attendance", "Late", "Absent", "Action"]}
            rows={[
              ["1", "Form 2 North", "96%", "2", "4", "Maintain"],
              ["2", "Form 2 South", "95%", "3", "5", "Monitor"],
              ["3", "Form 2 East", "92%", "5", "8", "Follow-up"],
              ["4", "Form 2 West", "89%", "8", "12", "Intervene"],
            ]}
          />
        </Panel>
        <Panel title="Chronic absentee list" description="Students whose pattern requires Grade/Form Master action." icon={AlertTriangle}>
          <p className="mb-3 text-sm font-black uppercase tracking-[0.14em] text-[#64748B]">Intervention tracker</p>
          <div className="space-y-3">
            {riskStudents.map(([student, stream, trigger, risk, action]) => (
              <div key={student} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black text-[#071D49]">{student}</h3>
                    <p className="mt-1 text-sm font-semibold text-[#64748B]">{stream} - {trigger}</p>
                  </div>
                  <StatusChip label={risk} tone={risk === "High" ? "danger" : "warning"} />
                </div>
                <p className="mt-3 text-sm font-black text-[#071D49]">Next action: {action}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

function DisciplineWorkspace() {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Panel title="Discipline Oversight" description="Incidents summary, repeat offenders, suspensions, bullying reports, teacher reports, and intervention history." icon={ShieldAlert}>
        <DataTable
          title="Discipline grade register"
          columns={["Student", "Stream", "Incident", "Severity", "Reported By", "Status"]}
          rows={[
            ["Kevin Mwangi", "Form 2 North", "Repeat disruption", "High", "Mr. Kamau", "Counselling"],
            ["Mary Wambui", "Form 2 West", "Bullying report", "Critical", "Prefect", "Deputy review"],
            ["Brian Otieno", "Form 2 East", "Late coming", "Medium", "Class teacher", "Parent called"],
          ]}
        />
      </Panel>
      <Panel title="Intervention history" description="Severity indicators keep discipline focused on early correction." icon={ClipboardList}>
        {["Suspension review", "Teacher reports", "Bullying reports", "Repeat offender watchlist"].map((item, index) => (
          <div key={item} className="mb-3 rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-3">
            <StatusChip label={index === 0 ? "High" : "Active"} tone={index === 0 ? "danger" : "warning"} />
            <p className="mt-2 font-black text-[#071D49]">{item}</p>
          </div>
        ))}
      </Panel>
    </div>
  );
}

function AcademicsWorkspace() {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Panel title="Academic Monitoring" description="Performance, assessments, stream comparison, weak subjects, and struggling students." icon={BookOpenCheck}>
        <DataTable title="Stream ranking" columns={["Rank", "Stream", "Average", "Strongest Subject", "Weak Subjects", "Concern"]} rows={academicRows} />
      </Panel>
      <Panel title="Exam analytics" description="Top performers, failing students, subject averages, and progress visuals." icon={BarChart3}>
        <div className="space-y-3">
          {["Top performers", "Failing students", "Subject averages", "Missing marks"].map((item, index) => (
            <div key={item} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
              <p className="font-black text-[#071D49]">{item}</p>
              <ProgressBar value={[82, 34, 68, 22][index]} tone={index === 1 || index === 3 ? "warning" : "info"} />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function TeachersWorkspace() {
  return (
    <Panel title="Teachers Coordination" description="Class teacher cards, submitted reports, attendance submissions, escalation requests, and communication history." icon={GraduationCap}>
      <div className="grid gap-3 md:grid-cols-4">
        {streams.map(([stream, teacher, , attendance, , average, tone]) => (
          <article key={stream} className={cn("rounded-2xl border p-4", toneStyles[tone as Tone].card)}>
            <h3 className="font-black">{teacher}</h3>
            <p className="mt-2 text-sm font-semibold opacity-75">{stream}</p>
            <p className="mt-1 text-sm font-semibold opacity-75">Attendance submitted: {attendance}</p>
            <p className="mt-1 text-sm font-semibold opacity-75">Academic report: {average}</p>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function WelfareWorkspace() {
  return (
    <Panel title="Student Welfare" description="Counselling cases, health concerns, behavior flags, emotional risk, boarding concerns, and vulnerable students." icon={AlertTriangle}>
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <DataTable title="Student profile cards" columns={["Student", "Stream", "Concern", "Owner", "Next Follow-Up"]} rows={[
          ["Aisha Njeri", "Form 2 East", "Emotional risk", "Counsellor", "Today"],
          ["Peter Ouma", "Form 2 West", "Health concern", "Nurse", "Tomorrow"],
          ["Mercy Chebet", "Form 2 South", "Boarding concern", "Boarding master", "Friday"],
        ]} />
        <div className="space-y-3">
          {["Confidential welfare alerts", "Intervention timelines", "Escalation workflow"].map((item) => (
            <div key={item} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 font-black text-[#071D49]">{item}</div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function ParentsWorkspace() {
  return (
    <Panel title="Parent Escalations" description="Ticket-style management for complaints, unresolved issues, meeting requests, and sensitive cases." icon={MessageSquareWarning}>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <DataTable title="Escalation tickets" columns={["Parent", "Student", "Issue", "Status", "Owner", "Due"]} rows={[
          ["Mrs. Wanjiku", "Brian Otieno", "Absenteeism", "Open", "Grade master", "Today"],
          ["Mr. Njuguna", "Aisha Njeri", "Math performance", "Pending", "Class teacher", "Tomorrow"],
          ["Mrs. Achieng", "Kevin Mwangi", "Discipline appeal", "Sensitive", "Deputy", "Friday"],
        ]} />
        <div className="rounded-2xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <h3 className="font-black text-[#071D49]">Communication logs</h3>
          <div className="mt-3 space-y-2 text-sm font-semibold text-[#64748B]">
            <p>SMS queued: absenteeism reminder.</p>
            <p>Contact note logged: parent meeting confirmed.</p>
            <p>Email queued: academic intervention summary.</p>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function AnalyticsWorkspace() {
  return (
    <Panel title="Performance Analytics" description="Executive analytics for stream comparison, attendance vs performance, discipline vs performance, gender analysis, risk analysis, and teacher effectiveness indicators." icon={BarChart3}>
      <div className="grid gap-3 md:grid-cols-3">
        {["Stream comparison", "Attendance vs performance", "Discipline vs performance", "Gender analysis", "Term comparison", "Teacher effectiveness indicators"].map((item, index) => (
          <div key={item} className="rounded-2xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
            <p className="font-black text-[#071D49]">{item}</p>
            <ProgressBar value={[76, 64, 41, 58, 69, 73][index]} tone={index === 2 ? "warning" : "info"} />
          </div>
        ))}
      </div>
    </Panel>
  );
}

function MeetingsWorkspace() {
  return (
    <Panel title="Meetings & Interventions" description="Parent meetings, teacher meetings, disciplinary hearings, intervention plans, follow-up schedules, and action tracking." icon={CalendarDays}>
      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <h3 className="font-black text-[#071D49]">Calendar</h3>
          {["09:00 Parent meeting", "11:30 Teacher coordination", "14:00 Intervention review"].map((item) => (
            <p key={item} className="mt-3 rounded-xl bg-white px-3 py-2 text-sm font-bold text-[#334155]">{item}</p>
          ))}
        </div>
        <DataTable title="Intervention plans" columns={["Case", "Owner", "Status", "Next Step", "Due"]} rows={[
          ["Form 2 West absenteeism", "Grade master", "Active", "Parent call", "Today"],
          ["Algebra support", "Math HOD", "Planned", "Group remedial", "Wednesday"],
          ["Bullying cluster", "Deputy", "Sensitive", "Hearing", "Friday"],
        ]} />
      </div>
    </Panel>
  );
}

function ReportsWorkspace() {
  return (
    <Panel title="Reports" description="Generate grade reports, stream reports, attendance summaries, discipline summaries, academic analysis, and intervention reports." icon={ClipboardList}>
      <div className="grid gap-3 md:grid-cols-3">
        {["Grade report", "Stream report", "Attendance summary", "Discipline summary", "Academic analysis", "Intervention report"].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => announceAction(`${item} opened for review and export.`)}
            className="rounded-2xl border border-[#D8E0EC] bg-[#EEF2FF] p-4 text-left font-black text-[#071D49] transition hover:-translate-y-0.5 hover:shadow-md"
          >
            {item}
          </button>
        ))}
      </div>
    </Panel>
  );
}

function NotificationsWorkspace() {
  return (
    <Panel title="Notifications" description="Categorized notification center for announcements, urgent alerts, unresolved escalations, teacher reminders, and risk warnings." icon={Bell}>
      <div className="space-y-3">
        {[
          ["Urgent alert", "Form 2 West has 5 unresolved attendance interventions.", "danger"],
          ["Teacher reminder", "Two class teachers have pending weekly reports.", "warning"],
          ["Announcement", "Grade assembly scheduled for Friday morning.", "info"],
        ].map(([title, detail, tone]) => (
          <article key={title} className={cn("rounded-2xl border p-4", toneStyles[tone as Tone].card)}>
            <StatusChip label={title} tone={tone as Tone} />
            <p className="mt-2 text-sm font-semibold opacity-75">{detail}</p>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function SettingsWorkspace() {
  return (
    <Panel title="Settings" description="Grade selector defaults, notification preferences, stream thresholds, escalation rules, and report templates." icon={Settings}>
      <div className="grid gap-3 md:grid-cols-3">
        {["Grade/Form selector", "Academic year selector", "Escalation thresholds", "Report templates", "Notification rules", "Workspace preferences"].map((item) => (
          <div key={item} className="rounded-2xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
            <p className="font-black text-[#071D49]">{item}</p>
            <p className="mt-2 text-sm leading-6 text-[#64748B]">Configured for focused multi-stream oversight.</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ActiveWorkspace({
  activeView,
}: {
  activeView: GradeView;
}) {
  switch (activeView) {
    case "streams":
      return <StreamsWorkspace />;
    case "attendance":
      return <AttendanceWorkspace />;
    case "discipline":
      return <DisciplineWorkspace />;
    case "academics":
      return <AcademicsWorkspace />;
    case "teachers":
      return <TeachersWorkspace />;
    case "welfare":
      return <WelfareWorkspace />;
    case "parents":
      return <ParentsWorkspace />;
    case "analytics":
      return <AnalyticsWorkspace />;
    case "meetings":
      return <MeetingsWorkspace />;
    case "reports":
      return <ReportsWorkspace />;
    case "notifications":
      return <NotificationsWorkspace />;
    case "settings":
      return <SettingsWorkspace />;
    default:
      return <OverviewWorkspace />;
  }
}

export function GradeMasterCommandCenter({ routeMode }: { routeMode: GradeRouteMode }) {
  const [activeView, setActiveView] = useState<GradeView>("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [notice, setNotice] = useState("Ready for grade follow-up.");
  const searchResults = searchTerm.trim()
    ? gradeSearchRecords.filter((record) => `${record.label} ${record.detail}`.toLowerCase().includes(searchTerm.toLowerCase()))
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

  function openView(view: GradeView) {
    setActiveView(view);
    setNotice(`${getViewLabel(view)} opened.`);
  }

  function openSearchRecord(record: GradeSearchRecord) {
    setActiveView(record.view);
    setSearchTerm("");
    setNotice(`${record.label} opened in ${getViewLabel(record.view)}.`);
  }

  return (
    <div data-route-mode={routeMode} className="h-screen overflow-hidden bg-[#F3F6FA] text-[#071D49]">
      <div className="grid h-full gap-4 p-3 lg:grid-cols-[292px_minmax(0,1fr)]">
        <Sidebar activeView={activeView} onViewChange={openView} />
        <div className="min-h-0 overflow-hidden rounded-2xl border border-[#D8E0EC] bg-[#F3F6FA] shadow-[0_20px_70px_rgba(7,29,73,0.1)]">
          <Topbar
            activeView={activeView}
            searchTerm={searchTerm}
            searchResults={searchResults}
            onSearchTermChange={setSearchTerm}
            onSearchResult={openSearchRecord}
            onViewChange={openView}
          />
          <main className="h-[calc(100%-84px)] overflow-y-auto p-4">
            <div className="space-y-4">
              <div role="status" className="rounded-xl border border-[#DDD6FE] bg-[#EEF2FF] px-4 py-3 text-sm font-bold text-[#071D49]">
                {notice}
              </div>
              <ActiveWorkspace activeView={activeView} />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
