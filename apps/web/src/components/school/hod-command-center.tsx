"use client";

import { useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Archive,
  BarChart3,
  Bell,
  BookOpenCheck,
  CalendarDays,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutDashboard,
  MessageSquareText,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Timer,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

import { getCurrentSchoolId, publishSchoolOperationalEvent } from "@/lib/school/school-operational-store";
import { downloadCsvFile } from "@/lib/dashboard/export";
import { useSchoolQuery, useSchoolMutation } from "@/lib/data/school-hooks";

type HodRouteMode = "hosted" | "public";
type Tone = "success" | "info" | "warning" | "danger" | "neutral";
type HodView =
  | "overview"
  | "teachers"
  | "subjects"
  | "syllabus"
  | "exams"
  | "lessonPlans"
  | "attendance"
  | "resources"
  | "meetings"
  | "students"
  | "timetable"
  | "compliance"
  | "communication"
  | "notifications"
  | "settings";

type NavItem = {
  id: HodView;
  label: string;
  icon: LucideIcon;
  group: string;
};

type Kpi = {
  label: string;
  value: string;
  helper: string;
  trend: string;
  tone: Tone;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { id: "overview", label: "Dashboard Overview", icon: LayoutDashboard, group: "Command" },
  { id: "teachers", label: "Teachers", icon: Users, group: "Department" },
  { id: "subjects", label: "Subjects", icon: BookOpenCheck, group: "Department" },
  { id: "syllabus", label: "Syllabus Coverage", icon: Timer, group: "Curriculum" },
  { id: "exams", label: "Exams & Performance", icon: BarChart3, group: "Curriculum" },
  { id: "lessonPlans", label: "Lesson Plans", icon: FileText, group: "Curriculum" },
  { id: "attendance", label: "Attendance Analysis", icon: UserCheck, group: "Analytics" },
  { id: "resources", label: "Department Resources", icon: Archive, group: "Operations" },
  { id: "meetings", label: "Meetings & Reports", icon: CalendarDays, group: "Operations" },
  { id: "students", label: "Student Analytics", icon: GraduationCap, group: "Analytics" },
  { id: "timetable", label: "Timetable Coordination", icon: ClipboardList, group: "Operations" },
  { id: "compliance", label: "Curriculum Compliance", icon: ShieldCheck, group: "Governance" },
  { id: "communication", label: "Communication", icon: MessageSquareText, group: "Engagement" },
  { id: "notifications", label: "Notifications", icon: Bell, group: "Engagement" },
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
  { label: "Department Mean Score", value: "71.8%", helper: "Current department", trend: "+4.2%", tone: "info", icon: BarChart3 },
  { label: "Teacher Attendance Rate", value: "96%", helper: "This week", trend: "stable", tone: "success", icon: UserCheck },
  { label: "Syllabus Completion", value: "82%", helper: "Pace vs term calendar", trend: "2 classes delayed", tone: "warning", icon: Timer },
  { label: "Active Assessments", value: "6", helper: "CATs and assignments", trend: "3 due", tone: "info", icon: ClipboardList },
  { label: "Student Pass Rate", value: "78%", helper: "Pass band and above", trend: "+6%", tone: "success", icon: GraduationCap },
  { label: "Pending Reviews", value: "11", helper: "Lesson plans and marks", trend: "action", tone: "danger", icon: AlertTriangle },
];

const teachers = [
  ["Mr. Otieno", "Mathematics", "Form 2 East, Form 3 North", "98%", "84%", "Submitted", "Pending"],
  ["Mrs. Achieng", "Mathematics", "Form 1 West, Form 2 South", "96%", "91%", "Approved", "Complete"],
  ["Ms. Wairimu", "Business Math", "Grade 8 Blue", "92%", "76%", "Pending", "Missing marks"],
] as const;

const subjects = [
  ["Mathematics", "Mr. Otieno", "842", "Up 4%", "82%", "6"],
  ["Additional Mathematics", "Mrs. Achieng", "214", "Stable", "88%", "3"],
  ["Business Mathematics", "Ms. Wairimu", "168", "Down 3%", "74%", "2"],
] as const;

const riskStudents = [
  ["Brian Otieno", "Form 2 East", "Algebra decline", "High", "Remedial group"],
  ["Aisha Njeri", "Form 1 West", "Missing CAT", "Medium", "Teacher follow-up"],
  ["Kevin Mwangi", "Form 3 North", "Attendance-performance link", "High", "Parent alert"],
] as const;

const hodSearchRecords = [
  { id: "teacher-otieno", label: "Mr. Otieno", detail: "Mathematics | Form 2 East | lesson plan follow-up", view: "teachers" },
  { id: "student-brian", label: "Brian Otieno", detail: "Form 2 East | Algebra decline | remedial group", view: "students" },
  { id: "syllabus-form-3", label: "Form 3 North syllabus", detail: "11% behind term calendar", view: "syllabus" },
  { id: "cat-2-moderation", label: "CAT 2 moderation", detail: "Marks close Friday | 4 missing submissions", view: "exams" },
  { id: "resource-geometry", label: "Geometry kits", detail: "12 item shortage | request pending", view: "resources" },
] satisfies Array<{ id: string; label: string; detail: string; view: HodView }>;

type HodSearchRecord = (typeof hodSearchRecords)[number];
type HodReportReview = { title: string };
type HodCommunicationDraft = { title: string };
type DataTableActionHandlers = {
  onExportAction: (tableTitle: string) => void;
  onFilterAction: (tableTitle: string) => void;
  onSearchAction: (tableTitle: string) => void;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getViewLabel(view: HodView) {
  return navItems.find((item) => item.id === view)?.label ?? "HOD workspace";
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
  activeView: HodView;
  onViewChange: (view: HodView) => void;
}) {
  return (
    <aside className="hidden h-[calc(100vh-1.5rem)] overflow-hidden rounded-2xl bg-[#071D49] p-4 text-white shadow-[0_24px_70px_rgba(7,29,73,0.28)] lg:block">
      <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-100/70">MyShule ERP</p>
        <h2 className="mt-2 text-xl font-black">HOD Workspace</h2>
        <p className="mt-2 text-sm leading-6 text-white/65">Department intelligence, academic control, and curriculum compliance.</p>
      </div>
      <nav className="mt-4 h-[calc(100%-8.5rem)] space-y-1 overflow-y-auto pr-1" aria-label="HOD dashboard navigation">
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
                  activeView === item.id && "bg-white/14 text-white shadow-[inset_4px_0_0_#38BDF8]",
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
  activeView: HodView;
  searchTerm: string;
  searchResults: typeof hodSearchRecords;
  onSearchTermChange: (value: string) => void;
  onSearchResult: (record: HodSearchRecord) => void;
  onViewChange: (view: HodView) => void;
}) {
  const today = "Today";

  return (
    <header className="sticky top-0 z-20 border-b border-[#D8E0EC] bg-[#F3F6FA]/92 px-4 py-3 backdrop-blur">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#071D49] text-sm font-black text-white">MD</div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#64748B]">Department selector: Mathematics - Term 2</p>
            <h1 className="text-xl font-black text-[#071D49]">HOD Workspace</h1>
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-[minmax(240px,1fr)_auto_auto_auto] xl:min-w-[800px]">
          <div className="relative">
            <label className="flex min-h-11 items-center gap-3 rounded-xl border border-[#D8E0EC] bg-white/88 px-3 text-[#64748B] shadow-sm">
              <Search className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">HOD department search</span>
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
                placeholder="Search teachers, subjects, lesson plans, assessments, or students"
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
                  <p className="rounded-lg px-3 py-3 text-sm font-semibold text-[#64748B]">No department records found.</p>
                )}
              </div>
            ) : null}
          </div>
          <StatusChip label="2026 Term 2" tone="info" />
          <StatusChip label={today} tone="neutral" />
          <button type="button" onClick={() => onViewChange("meetings")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(37,99,235,0.24)]">
            Quick actions
          </button>
        </div>
      </div>
      <div className="mt-3 lg:hidden">
        <label className="sr-only" htmlFor="hod-mobile-workspace">HOD workspace</label>
        <select
          id="hod-mobile-workspace"
          className="h-11 w-full rounded-xl border border-[#D8E0EC] bg-white px-3 text-sm font-black text-[#071D49] outline-none"
          value={activeView}
          onChange={(event) => onViewChange(event.target.value as HodView)}
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
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EEF5FF] text-[#1D4ED8]">
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
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <article key={item.label} className={cn("rounded-2xl border p-4 shadow-sm", toneStyles[item.tone].card)}>
            <div className="flex items-start justify-between gap-3">
              <Icon className="h-5 w-5" aria-hidden="true" />
              <StatusChip label={item.trend} tone={item.tone} />
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
  onSearch,
  onFilter,
  onExport,
}: {
  title: string;
  rows: ReadonlyArray<readonly string[]>;
  columns: string[];
  onSearch: (title: string) => void;
  onFilter: (title: string) => void;
  onExport: (title: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#D8E0EC] bg-white/80">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D8E0EC] bg-[#F8FAFC] px-4 py-3">
        <h3 className="text-sm font-black uppercase tracking-[0.14em] text-[#071D49]">{title}</h3>
        <div className="flex gap-2">
          <button type="button" onClick={() => onSearch(title)} className="rounded-lg border border-[#D8E0EC] px-3 py-1.5 text-xs font-black text-[#071D49]">Search</button>
          <button type="button" onClick={() => onFilter(title)} className="rounded-lg border border-[#D8E0EC] px-3 py-1.5 text-xs font-black text-[#071D49]">Filters</button>
          <button type="button" onClick={() => onExport(title)} className="rounded-lg border border-[#D8E0EC] px-3 py-1.5 text-xs font-black text-[#071D49]">Export</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="sticky top-0 bg-[#EEF5FF] text-xs uppercase tracking-[0.12em] text-[#64748B]">
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
        <span>Sorting, filtering, row expansion, and pagination ready</span>
        <span>1-3 of 18</span>
      </div>
    </div>
  );
}

function OverviewWorkspace() {
  return (
    <>
      <section className="rounded-2xl bg-[linear-gradient(135deg,#071D49_0%,#1D4ED8_58%,#0891B2_100%)] p-5 text-white shadow-[0_24px_70px_rgba(7,29,73,0.22)]">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-100/70">Mathematics department</p>
            <h2 className="mt-3 max-w-4xl text-3xl font-black tracking-[-0.02em] md:text-5xl">HOD Academic Command Center</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-100/82">
              A department intelligence platform for teacher performance, syllabus coverage, assessments, lesson plans, student academic trends, and curriculum compliance.
            </p>
          </div>
          <div className="grid gap-3">
            {["2 classes below syllabus pace", "5 lesson plans awaiting review", "CAT 2 marks close Friday"].map((item) => (
              <div key={item} className="rounded-xl border border-white/12 bg-white/10 px-4 py-3 text-sm font-black text-sky-50">{item}</div>
            ))}
          </div>
        </div>
      </section>
      <KpiGrid items={overviewKpis} />
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel title="Department Performance Analytics" description="Subject performance trends, class comparison charts, pass/fail distribution, and exam progression." icon={BarChart3}>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ["Subject performance trends", "71.8", "info"],
              ["Class comparison charts", "4 streams", "success"],
              ["Pass/fail distribution", "78% pass rate", "success"],
              ["Exam progression", "+4.2% since midterm", "info"],
            ].map(([label, value, tone]) => (
              <div key={label} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
                <p className="text-sm font-black text-[#071D49]">{label}</p>
                <p className={cn("mt-2 text-2xl font-black", toneStyles[tone as Tone].text)}>{value}</p>
                <ProgressBar value={label.includes("Pass") ? 78 : label.includes("Class") ? 64 : 72} tone={tone as Tone} />
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Department Alerts Panel" description="Priority academic warnings for fast HOD action." icon={AlertTriangle}>
          <div className="space-y-3">
            {[
              ["Low syllabus coverage", "Form 3 North is 11% behind the term calendar.", "danger"],
              ["Teacher with pending lesson plans", "5 submissions need HOD review before Monday.", "warning"],
              ["Upcoming exams", "CAT 2 moderation closes in 3 days.", "info"],
              ["Missing marks submissions", "Grade 8 Blue practical scores pending.", "warning"],
            ].map(([title, detail, tone]) => (
              <article key={title} className={cn("rounded-xl border p-4", toneStyles[tone as Tone].card)}>
                <h3 className="font-black">{title}</h3>
                <p className="mt-1 text-sm font-semibold opacity-75">{detail}</p>
              </article>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

function TeachersWorkspace({ onExportAction, onFilterAction, onSearchAction }: DataTableActionHandlers) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Panel title="Teachers Workspace" description="Manage teacher performance, attendance, syllabus progress, lesson plan compliance, and exam submission status." icon={Users}>
        <DataTable
          title="Teacher performance table"
          columns={["Teacher", "Subjects Taught", "Classes Assigned", "Attendance", "Syllabus", "Lesson Plan", "Exam Submission"]}
          rows={teachers}
          onFilter={onFilterAction}
          onSearch={onSearchAction}
          onExport={onExportAction}
        />
      </Panel>
      <Panel title="Teacher review panel" description="Observations, recommendations, and follow-ups remain in context." icon={ClipboardList}>
        <div className="space-y-3">
          {["Observation notes", "Recommendations", "Follow-ups", "Workload analysis"].map((item, index) => (
            <div key={item} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-3">
              <StatusChip label={index === 2 ? "Due" : "Ready"} tone={index === 2 ? "warning" : "info"} />
              <p className="mt-2 font-black text-[#071D49]">{item}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function SubjectsWorkspace() {
  return (
    <Panel title="Subjects Workspace" description="Departmental subject cards with assigned teacher, students, trend, syllabus progress, and assessment count." icon={BookOpenCheck}>
      <div className="grid gap-3 md:grid-cols-3">
        {subjects.map(([subject, teacher, students, trend, coverage, assessments]) => (
          <article key={subject} className="rounded-2xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 transition hover:-translate-y-0.5 hover:shadow-md">
            <h3 className="text-lg font-black text-[#071D49]">{subject}</h3>
            <p className="mt-1 text-sm font-semibold text-[#64748B]">Teacher assigned: {teacher}</p>
            <div className="mt-4 grid sm:grid-cols-3 gap-2 text-sm">
              <div><p className="font-black text-[#071D49]">{students}</p><p className="text-[#64748B]">Students</p></div>
              <div><p className="font-black text-[#071D49]">{coverage}</p><p className="text-[#64748B]">Progress</p></div>
              <div><p className="font-black text-[#071D49]">{assessments}</p><p className="text-[#64748B]">Assessments</p></div>
            </div>
            <p className="mt-3 text-sm font-black text-[#1D4ED8]">Subject drilldown: {trend}</p>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function SyllabusWorkspace({ onExportAction, onFilterAction, onSearchAction }: DataTableActionHandlers) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Panel title="Syllabus Coverage Workspace" description="Major operational screen for curriculum timelines, completion charts, and delayed class visibility." icon={Timer}>
        <DataTable
          title="Coverage tracker"
          columns={["Class", "Topics Completed", "Pending Topics", "Pace vs Academic Calendar", "Owner", "Status"]}
          rows={[
            ["Form 1 West", "18", "4", "On pace", "Mrs. Achieng", "Healthy"],
            ["Form 2 East", "16", "6", "Behind by 5 days", "Mr. Otieno", "Watch"],
            ["Form 3 North", "14", "9", "Behind by 11%", "Ms. Wairimu", "Delayed"],
          ]}
          onSearch={onSearchAction}
          onFilter={onFilterAction}
          onExport={onExportAction}
        />
      </Panel>
      <Panel title="Curriculum timeline" description="Progress bars expose delayed classes immediately." icon={SlidersHorizontal}>
        {[
          ["Form 1 West", 91, "success"],
          ["Form 2 East", 82, "warning"],
          ["Form 3 North", 69, "danger"],
        ].map(([label, value, tone]) => (
          <div key={label} className="mb-4 rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
            <p className="font-black text-[#071D49]">{label}</p>
            <ProgressBar value={Number(value)} tone={tone as Tone} />
          </div>
        ))}
      </Panel>
    </div>
  );
}

function ExamsWorkspace({ onExportAction, onFilterAction, onSearchAction }: DataTableActionHandlers) {
  const { data: departmentMarks, isLoading } = useSchoolQuery('/api/exams/marks/department');

  const moderateMutation = useSchoolMutation('/api/exams/marks/moderate');
  const [selectedMark, setSelectedMark] = useState<any>(null);
  const [moderationReason, setModerationReason] = useState("");

  const markRows = Array.isArray(departmentMarks) ? departmentMarks.map((m: any) => [
    m.subject?.name || m.subject_id,
    m.student?.name || m.student_id,
    m.score,
    m.status,
    new Date(m.created_at).toLocaleDateString(),
    m.status === 'submitted' ? "Moderate" : "View",
  ]) : [];

  function handleModerate(action: "approve" | "return") {
    if (!selectedMark) return;
    
    moderateMutation.mutate({
      mark_id: selectedMark.id,
      action,
      reason: moderationReason,
    }, {
      onSuccess: () => {
        publishSchoolOperationalEvent({
          schoolId: getCurrentSchoolId(),
          type: "EXAM_MARK_MODERATED",
          module: "exams",
          actorRole: "Head of Department",
          title: `Mark ${action === 'approve' ? 'Approved' : 'Returned'}`,
          body: `Head of Department ${action === 'approve' ? 'approved' : 'returned'} a mark.`,
          entityId: `mark-${selectedMark.id}`,
          severity: action === 'approve' ? 'success' : 'warning',
          payload: { action, reason: moderationReason },
        });
        setSelectedMark(null);
        setModerationReason("");
      }
    });
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-[linear-gradient(135deg,#071D49_0%,#1D4ED8_58%,#0891B2_100%)] p-5 text-white shadow-[0_24px_70px_rgba(7,29,73,0.22)]">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-100/70">HOD examination quality gate</p>
        <h2 className="mt-3 max-w-4xl text-3xl font-black tracking-[0] md:text-5xl">HOD Academic Command Center</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            ["Department Exam Review", "Submitted marksheets, missing marks, returned corrections, and HOD approval readiness."],
            ["Department Results", "Subject mean, grade distribution, pass rate, and stream comparison for the department."],
            ["Subject Analytics", "Weak topics, class/stream comparison, teacher comparison, and declining learners."],
          ].map(([title, detail]) => (
            <div key={title} className="rounded-xl border border-white/12 bg-white/10 px-4 py-3">
              <p className="text-sm font-black">{title}</p>
              <p className="mt-2 text-xs font-semibold leading-5 text-blue-100/82">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      {selectedMark ? (
        <div role="dialog" aria-modal="true" className="rounded-2xl border border-[#D8E0EC] bg-white p-5 shadow-lg">
          <p className="text-xs font-black uppercase tracking-widest text-[#64748B]">Moderate Mark</p>
          <h2 className="mt-2 text-2xl font-black text-[#071D49]">Review Student Mark</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-[#F8FAFC] p-3 text-sm font-bold text-[#071D49]">Score: {selectedMark.score}</div>
            <div className="rounded-xl bg-[#F8FAFC] p-3 text-sm font-bold text-[#071D49]">Current Status: {selectedMark.status}</div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-black text-[#071D49]">Reason / Comments</label>
            <textarea
              className="mt-2 w-full rounded-xl border border-[#D8E0EC] p-3 text-sm"
              rows={3}
              placeholder="Provide reason if returning for correction..."
              value={moderationReason}
              onChange={(e) => setModerationReason(e.target.value)}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => handleModerate("approve")} className="min-h-10 rounded-xl bg-[#10B981] px-4 text-sm font-black text-white">
              Approve to Exams Manager
            </button>
            <button type="button" onClick={() => handleModerate("return")} className="min-h-10 rounded-xl bg-[#F59E0B] px-4 text-sm font-black text-white">
              Return for Correction
            </button>
            <button type="button" onClick={() => setSelectedMark(null)} className="min-h-10 rounded-xl border border-[#D8E0EC] px-4 text-sm font-black text-[#071D49]">
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title="Exams & Performance Workspace" description="CATs, midterms, end terms, practical exams, departmental mean score, rankings, and stream comparisons." icon={BarChart3}>
          <div className="mb-4 rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] px-4 py-3">
            <p className="text-sm font-black text-[#071D49]">Department Exam Review</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-[#64748B]">Review marksheets, approve to Exams Manager, return corrections, and send reminders from the department queue.</p>
          </div>
          
          <DataTable
            title="Submitted Marks Queue"
            columns={["Subject", "Student", "Score", "Status", "Date", "Action"]}
            rows={markRows.length > 0 ? markRows : [
              ["Mathematics", "Mary Wambui", "85", "submitted", "Today", "Moderate"],
              ["Mathematics", "Brian Otieno", "62", "submitted", "Today", "Moderate"],
              ["Physics", "Kevin Mwangi", "71", "reviewed", "Yesterday", "View"]
            ]}
            onSearch={onSearchAction}
            onFilter={onFilterAction}
            onExport={onExportAction}
          />
          
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => {
               if (Array.isArray(departmentMarks) && departmentMarks.length > 0) {
                 setSelectedMark(departmentMarks[0]);
               } else {
                 setSelectedMark({ id: "mock-1", score: 85, status: "submitted" });
               }
            }} className="rounded-xl border border-[#B8D4FF] bg-[#EEF5FF] px-3 py-2 text-xs font-black text-[#1D4ED8]">
              Simulate Selection
            </button>
            <button type="button" className="rounded-xl border border-[#B8D4FF] bg-[#EEF5FF] px-3 py-2 text-xs font-black text-[#1D4ED8]">
              View Subject Analysis
            </button>
          </div>
        </Panel>
        <Panel title="Subject Analytics" description="Struggling students, declining trends, and weak topics." icon={AlertTriangle}>
          <DataTable
            title="Risk learners"
            columns={["Student", "Class", "Trigger", "Risk", "Next Action"]}
            rows={[
              ["Brian Otieno", "Form 2 East", "Struggling learner", "Algebra risk", "Remedial"]
            ]}
            onSearch={onSearchAction}
            onFilter={onFilterAction}
            onExport={onExportAction}
          />
        </Panel>
      </div>
    </div>
  );
}

function LessonPlansWorkspace({ onExportAction, onFilterAction, onSearchAction }: DataTableActionHandlers) {
  return (
    <Panel title="Lesson Plans Workspace" description="Lesson plan review queue with submitted, approved, pending, and rejected states." icon={FileText}>
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <DataTable title="Lesson plan review queue" columns={["Teacher", "Topic", "Class", "Status", "Due"]} rows={[
          ["Mr. Otieno", "Quadratic equations", "Form 3", "Pending", "Today"],
          ["Mrs. Achieng", "Ratios", "Form 1", "Approved", "Closed"],
          ["Ms. Wairimu", "Statistics", "Grade 8", "Rejected", "Revise"],
        ]} onSearch={onSearchAction} onFilter={onFilterAction} onExport={onExportAction} />
        <div className="rounded-2xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <h3 className="font-black text-[#071D49]">Lesson insights</h3>
          {["Curriculum alignment", "Teaching consistency", "Topic pacing"].map((item, index) => (
            <div key={item} className="mt-3 rounded-xl bg-white p-3">
              <p className="font-black text-[#071D49]">{item}</p>
              <ProgressBar value={[86, 79, 68][index]} tone={index === 2 ? "warning" : "info"} />
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function AttendanceWorkspace({ onExportAction, onFilterAction, onSearchAction }: DataTableActionHandlers) {
  return (
    <Panel title="Attendance Analysis Workspace" description="Teacher attendance, absentee trends, lateness, replacement classes, and attendance vs academic performance." icon={UserCheck}>
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <DataTable title="Teacher attendance" columns={["Teacher", "Present", "Late", "Replacement Classes", "Trend"]} rows={[
          ["Mr. Otieno", "98%", "1", "0", "Stable"],
          ["Mrs. Achieng", "96%", "0", "1", "Good"],
          ["Ms. Wairimu", "92%", "3", "2", "Watch"],
        ]} onSearch={onSearchAction} onFilter={onFilterAction} onExport={onExportAction} />
        <div className="rounded-2xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <h3 className="font-black text-[#071D49]">Student attendance correlation</h3>
          <p className="mt-2 text-sm font-semibold text-[#64748B]">Attendance vs academic performance shows Form 3 North risk rising.</p>
          <ProgressBar value={58} tone="warning" />
        </div>
      </div>
    </Panel>
  );
}

function ResourcesWorkspace({ onExportAction, onFilterAction, onSearchAction }: DataTableActionHandlers) {
  return (
    <Panel title="Department Resources Workspace" description="Textbooks, lab equipment, teaching aids, digital resources, allocation, availability, shortages, and requests." icon={Archive}>
      <DataTable title="Resource allocation" columns={["Resource", "Type", "Available", "Allocated", "Shortage", "Request Status"]} rows={[
        ["Mathematics textbooks", "Textbooks", "318", "290", "42", "Requested"],
        ["Geometry kits", "Teaching aids", "74", "68", "12", "Pending"],
        ["Digital revision packs", "Digital resources", "Active", "All classes", "0", "Healthy"],
      ]} onSearch={onSearchAction} onFilter={onFilterAction} onExport={onExportAction} />
    </Panel>
  );
}

function MeetingsWorkspace({ onReportReview }: { onReportReview: (title: string) => void }) {
  return (
    <Panel title="Meetings & Reports Workspace" description="Schedules, agendas, attendance, action items, departmental reports, syllabus reports, and teacher evaluation reports." icon={CalendarDays}>
      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <h3 className="font-black text-[#071D49]">Meetings</h3>
          {["Monday: moderation meeting", "Wednesday: resource review", "Friday: exam analysis"].map((item) => (
            <p key={item} className="mt-3 rounded-xl bg-white px-3 py-2 text-sm font-bold text-[#334155]">{item}</p>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {["Departmental performance report", "Syllabus report", "Teacher evaluation report", "Exam analysis PDF"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onReportReview(item)}
              className="rounded-2xl border border-[#D8E0EC] bg-[#EEF5FF] p-4 text-left font-black text-[#071D49]"
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function StudentAnalyticsWorkspace({ onExportAction, onFilterAction, onSearchAction }: DataTableActionHandlers) {
  return (
    <Panel title="Student Analytics Workspace" description="Top performers, struggling learners, improvement trends, talent identification, and filters by class, stream, gender, subject, and performance band." icon={GraduationCap}>
      <DataTable title="Student insights" columns={["Student", "Class", "Band", "Trend", "Talent / Risk", "Action"]} rows={[
        ["Mary Wambui", "Form 2 South", "Top performer", "+8%", "Talent identification", "Enrich"],
        ["Brian Otieno", "Form 2 East", "Struggling learner", "-12%", "Algebra risk", "Remedial"],
        ["Kevin Mwangi", "Form 3 North", "Improving", "+6%", "Watch", "Encourage"],
      ]} onSearch={onSearchAction} onFilter={onFilterAction} onExport={onExportAction} />
    </Panel>
  );
}

function TimetableWorkspace() {
  return (
    <Panel title="Timetable Coordination Workspace" description="Teacher lesson allocation, workload balancing, clash detection, and substitution management." icon={ClipboardList}>
      <div className="grid gap-3 md:grid-cols-4">
        {["Lesson allocation", "Workload balancing", "Clash detection", "Substitution management"].map((item, index) => (
          <div key={item} className="rounded-2xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
            <p className="font-black text-[#071D49]">{item}</p>
            <ProgressBar value={[82, 71, 19, 54][index]} tone={index === 2 ? "danger" : "info"} />
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ComplianceWorkspace({ onExportAction, onFilterAction, onSearchAction }: DataTableActionHandlers) {
  return (
    <Panel title="Curriculum Compliance Workspace" description="Competency-based standards, lesson audit tracking, curriculum completion, assessment policy adherence, and governance evidence." icon={ShieldCheck}>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <DataTable title="Compliance indicators" columns={["Area", "Score", "Owner", "Evidence", "Status"]} rows={[
          ["CBC/CBE compliance", "94%", "HOD", "Schemes and assessments", "Healthy"],
          ["Lesson audit tracking", "81%", "Deputy", "Observation logs", "Watch"],
          ["Assessment policy adherence", "88%", "Exam office", "Moderation records", "Healthy"],
        ]} onSearch={onSearchAction} onFilter={onFilterAction} onExport={onExportAction} />
        <div className="rounded-2xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <h3 className="font-black text-[#071D49]">Audit logs</h3>
          {["Lesson plan approved", "Marks moderated", "Syllabus update signed"].map((item) => (
            <p key={item} className="mt-3 rounded-xl bg-white px-3 py-2 text-sm font-bold text-[#334155]">{item}</p>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function CommunicationWorkspace({ onCommunicationDraft }: { onCommunicationDraft: (title: string) => void }) {
  return (
    <Panel title="Communication Workspace" description="Teacher announcements, academic notices, meeting reminders, and parent communication support through email, SMS, and internal messaging." icon={MessageSquareText}>
      <div className="grid gap-3 md:grid-cols-3">
        {["Teacher announcement", "Academic notice", "Meeting reminder", "Parent support message", "Internal message", "SMS broadcast"].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onCommunicationDraft(item)}
            className="rounded-2xl border border-[#D8E0EC] bg-[#EEF5FF] p-4 text-left font-black text-[#071D49]"
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
    <Panel title="Notifications Workspace" description="Approval requests, exam reminders, syllabus alerts, performance warnings, and meeting updates." icon={Bell}>
      <div className="space-y-3">
        {[
          ["Approval request", "5 lesson plans require HOD review.", "warning"],
          ["Exam reminder", "CAT 2 moderation closes Friday.", "info"],
          ["Performance warning", "Business Mathematics trend down 3%.", "danger"],
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
    <Panel title="Settings Workspace" description="Department preferences, grading rules, reporting settings, curriculum setup, and analytics preferences." icon={Settings}>
      <div className="grid gap-3 md:grid-cols-3">
        {["Department preferences", "Grading rules", "Reporting settings", "Curriculum setup", "Analytics preferences", "Quick action defaults"].map((item) => (
          <div key={item} className="rounded-2xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
            <p className="font-black text-[#071D49]">{item}</p>
            <p className="mt-2 text-sm leading-6 text-[#64748B]">Configured for executive department oversight.</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ActiveWorkspace({
  activeView,
  onExportAction,
  onFilterAction,
  onReportReview,
  onCommunicationDraft,
  onSearchAction,
}: {
  activeView: HodView;
  onExportAction: (tableTitle: string) => void;
  onFilterAction: (tableTitle: string) => void;
  onReportReview: (title: string) => void;
  onCommunicationDraft: (title: string) => void;
  onSearchAction: (tableTitle: string) => void;
}) {
  switch (activeView) {
    case "teachers":
      return <TeachersWorkspace onExportAction={onExportAction} onFilterAction={onFilterAction} onSearchAction={onSearchAction} />;
    case "subjects":
      return <SubjectsWorkspace />;
    case "syllabus":
      return <SyllabusWorkspace onExportAction={onExportAction} onFilterAction={onFilterAction} onSearchAction={onSearchAction} />;
    case "exams":
      return <ExamsWorkspace onExportAction={onExportAction} onFilterAction={onFilterAction} onSearchAction={onSearchAction} />;
    case "lessonPlans":
      return <LessonPlansWorkspace onExportAction={onExportAction} onFilterAction={onFilterAction} onSearchAction={onSearchAction} />;
    case "attendance":
      return <AttendanceWorkspace onExportAction={onExportAction} onFilterAction={onFilterAction} onSearchAction={onSearchAction} />;
    case "resources":
      return <ResourcesWorkspace onExportAction={onExportAction} onFilterAction={onFilterAction} onSearchAction={onSearchAction} />;
    case "meetings":
      return <MeetingsWorkspace onReportReview={onReportReview} />;
    case "students":
      return <StudentAnalyticsWorkspace onExportAction={onExportAction} onFilterAction={onFilterAction} onSearchAction={onSearchAction} />;
    case "timetable":
      return <TimetableWorkspace />;
    case "compliance":
      return <ComplianceWorkspace onExportAction={onExportAction} onFilterAction={onFilterAction} onSearchAction={onSearchAction} />;
    case "communication":
      return <CommunicationWorkspace onCommunicationDraft={onCommunicationDraft} />;
    case "notifications":
      return <NotificationsWorkspace />;
    case "settings":
      return <SettingsWorkspace />;
    default:
      return <OverviewWorkspace />;
  }
}

export function HodCommandCenter({
  routeMode,
  initialView = "overview",
}: {
  routeMode: HodRouteMode;
  initialView?: HodView;
}) {
  const [activeView, setActiveView] = useState<HodView>(initialView);
  const [searchTerm, setSearchTerm] = useState("");
  const [notice, setNotice] = useState("Ready for department follow-up.");
  const [selectedExport, setSelectedExport] = useState<string | null>(null);
  const [tableAction, setTableAction] = useState<{ mode: "filter" | "search"; title: string } | null>(null);
  const [reportReview, setReportReview] = useState<HodReportReview | null>(null);
  const [communicationDraft, setCommunicationDraft] = useState<HodCommunicationDraft | null>(null);
  const searchResults = searchTerm.trim()
    ? hodSearchRecords.filter((record) => `${record.label} ${record.detail}`.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];

  function openView(view: HodView) {
    setActiveView(view);
    setNotice(`${getViewLabel(view)} workspace ready.`);
  }

  function openSearchRecord(record: HodSearchRecord) {
    setActiveView(record.view);
    setSearchTerm("");
    setNotice(`${record.label} HOD search loaded ${getViewLabel(record.view)} workspace: ${record.detail}.`);
  }

  function openExportAction(tableTitle: string) {
    setSelectedExport(tableTitle);
    setNotice(`${tableTitle} export ready for department review.`);
  }

  function openTableAction(mode: "filter" | "search", tableTitle: string) {
    setTableAction({ mode, title: tableTitle });
    setNotice(`${tableTitle} ${mode === "search" ? "search" : "filters"} ready.`);
  }

  function openReportReview(title: string) {
    setReportReview({ title });
    setNotice(`${title} ready for review and export.`);
  }

  function saveReportReview() {
    if (!reportReview) return;

    const schoolId = getCurrentSchoolId();
    const reportSlug = reportReview.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    publishSchoolOperationalEvent({
      schoolId,
      type: "HOD_REPORT_REVIEW_RECORDED",
      module: "reports",
      actorRole: "Head of Department",
      title: `${reportReview.title} report review recorded`,
      body: `Head of Department recorded ${reportReview.title.toLowerCase()} for department review and export.`,
      entityId: `hod-report-${reportSlug}`,
      severity: "info",
      payload: {
        reportTitle: reportReview.title,
        department: "Mathematics",
        dashboard: "hod",
        term: "Term 2 2026",
      },
      notifications: [
        {
          audienceRoles: ["Dean of Academics", "Principal", "Exams Manager"],
          title: `${reportReview.title} ready for review`,
          body: "HOD saved a department report review for same-school academic leadership.",
          severity: "info",
          relatedModule: "reports",
          relatedRecordId: `hod-report-${reportSlug}`,
          requestStatus: "Completed",
        },
      ],
    });

    setNotice(
      `${reportReview.title} review request saved for ${schoolId}: hod-report-${reportSlug}, Dean/Exams Manager/Principal notified for Mathematics department export.`,
    );
    setReportReview(null);
  }

  function openCommunicationDraft(title: string) {
    setCommunicationDraft({ title });
    setNotice(`${title} communication draft ready.`);
  }

  function saveCommunicationDraft() {
    if (!communicationDraft) return;

    const schoolId = getCurrentSchoolId();
    const draftSlug = communicationDraft.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    publishSchoolOperationalEvent({
      schoolId,
      type: "HOD_COMMUNICATION_DRAFT_RECORDED",
      module: "communications",
      actorRole: "Head of Department",
      title: `${communicationDraft.title} communication draft saved`,
      body: `Head of Department saved a ${communicationDraft.title.toLowerCase()} draft for department communication.`,
      entityId: `hod-communication-${draftSlug}`,
      severity: "info",
      payload: {
        draftTitle: communicationDraft.title,
        department: "Mathematics",
        dashboard: "hod",
        channel: "SMS / internal message",
      },
      notifications: [
        {
          audienceRoles: ["Dean of Academics", "Principal", "Teacher"],
          title: `${communicationDraft.title} draft saved`,
          body: "HOD saved a department communication draft for same-school follow-up.",
          severity: "info",
          relatedModule: "communications",
          relatedRecordId: `hod-communication-${draftSlug}`,
          requestStatus: "Pending",
        },
      ],
    });

    setNotice(
      `${communicationDraft.title} communication draft saved for ${schoolId}: hod-communication-${draftSlug}, Dean/Principal/Teacher notified for Mathematics department follow-up.`,
    );
    setCommunicationDraft(null);
  }

  function saveTableAction() {
    if (!tableAction) return;

    const schoolId = getCurrentSchoolId();
    const tableSlug = tableAction.title.toLowerCase().replaceAll(" ", "-");
    const isSearch = tableAction.mode === "search";

    publishSchoolOperationalEvent({
      schoolId,
      type: isSearch ? "HOD_TABLE_SEARCH_SAVED" : "HOD_TABLE_FILTERS_APPLIED",
      module: "academics",
      actorRole: "Head of Department",
      title: isSearch ? `${tableAction.title} search saved` : `${tableAction.title} filters applied`,
      body: isSearch
        ? `Head of Department saved a search request for ${tableAction.title}.`
        : `Head of Department applied department table filters for ${tableAction.title}.`,
      entityId: `hod-${tableAction.mode}-${tableSlug}`,
      severity: "info",
      payload: {
        mode: tableAction.mode,
        tableTitle: tableAction.title,
        department: "Mathematics",
        filters: ["Pending lesson plans", "Missing marks", "Low syllabus coverage"],
      },
      notifications: [
        {
          audienceRoles: ["Dean of Academics", "Principal"],
          title: isSearch ? "HOD table search saved" : "HOD table filters applied",
          body: `${tableAction.title} ${isSearch ? "search" : "filters"} updated for department review.`,
          severity: "info",
          relatedModule: "academics",
          relatedRecordId: `hod-${tableAction.mode}-${tableSlug}`,
          requestStatus: "Completed",
        },
      ],
    });

    setNotice(
      `${tableAction.title} ${isSearch ? "search request" : "filter set"} saved for ${schoolId}: hod-${tableAction.mode}-${tableSlug}, Dean/Principal notified for Mathematics review.`,
    );
    setTableAction(null);
  }

  function saveExportRequest() {
    if (!selectedExport) return;

    const schoolId = getCurrentSchoolId();
    const exportSlug = selectedExport.toLowerCase().replaceAll(" ", "-");
    const generatedAt = new Date().toISOString();

    downloadCsvFile({
      filename: `${schoolId}-hod-${exportSlug}-${generatedAt.slice(0, 10)}.csv`,
      headers: ["School ID", "Department", "Report", "Term", "Generated At", "Prepared By"],
      rows: [[schoolId, "Mathematics", selectedExport, "Term 2 2026", generatedAt, "Head of Department"]],
    });

    publishSchoolOperationalEvent({
      schoolId,
      type: "HOD_DEPARTMENT_EXPORT_REQUESTED",
      module: "academics",
      actorRole: "Head of Department",
      title: `${selectedExport} export requested`,
      body: `Head of Department requested ${selectedExport} export for department records and academic follow-up.`,
      entityId: `hod-export-${exportSlug}`,
      severity: "info",
      payload: {
        tableTitle: selectedExport,
        department: "Mathematics",
        dashboard: "hod",
        exportedFile: `${schoolId}-hod-${exportSlug}-${generatedAt.slice(0, 10)}.csv`,
      },
      notifications: [
        {
          audienceRoles: ["Dean of Academics", "Exams Manager", "Principal"],
          title: `${selectedExport} export requested by HOD`,
          body: "Department export is ready for academic review.",
          severity: "info",
          relatedModule: "academics",
          relatedRecordId: `hod-export-${exportSlug}`,
          requestStatus: "Completed",
        },
      ],
    });

    setNotice(
      `${selectedExport} export request saved for ${schoolId}: ${schoolId}-hod-${exportSlug}-${generatedAt.slice(0, 10)}.csv, Dean/Exams Manager/Principal notified.`,
    );
    setSelectedExport(null);
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
              <div role="status" className="rounded-xl border border-[#BFDBFE] bg-[#EEF5FF] px-4 py-3 text-sm font-bold text-[#071D49]">
                {notice}
              </div>
              {selectedExport ? (
                <div role="dialog" aria-modal="true" aria-label="HOD department export" className="rounded-2xl border border-[#D8E0EC] bg-white p-5 shadow-[0_18px_45px_rgba(7,29,73,0.12)]">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#64748B]">HOD department export</p>
                  <h2 className="mt-2 text-2xl font-black text-[#071D49]">{selectedExport}</h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">Save this department export request and notify academic leadership inside this school workspace.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={saveExportRequest} className="min-h-10 rounded-xl bg-[#071D49] px-4 text-sm font-black text-white">
                      Save export request
                    </button>
                    <button type="button" onClick={() => setSelectedExport(null)} className="min-h-10 rounded-xl border border-[#D8E0EC] px-4 text-sm font-black text-[#071D49]">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
              {tableAction ? (
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label={tableAction.mode === "search" ? "HOD table search" : "HOD table filters"}
                  className="rounded-2xl border border-[#D8E0EC] bg-white p-5 shadow-[0_18px_45px_rgba(7,29,73,0.12)]"
                >
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#64748B]">
                    {tableAction.mode === "search" ? "HOD table search" : "Department table filters"}
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-[#071D49]">{tableAction.title}</h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">
                    {tableAction.mode === "search"
                      ? "Save this table search so department follow-up stays visible in the same school workspace."
                      : "Apply filters for pending lesson plans, missing marks, and low syllabus coverage inside this school workspace."}
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {["Mathematics", "Term 2 2026", "Kisumu Boys"].map((item) => (
                      <div key={item} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-3 text-sm font-black text-[#071D49]">{item}</div>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={saveTableAction} className="min-h-10 rounded-xl bg-[#071D49] px-4 text-sm font-black text-white">
                      {tableAction.mode === "search" ? "Save search request" : "Apply filters"}
                    </button>
                    <button type="button" onClick={() => setTableAction(null)} className="min-h-10 rounded-xl border border-[#D8E0EC] px-4 text-sm font-black text-[#071D49]">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
              {reportReview ? (
                <div role="dialog" aria-modal="true" aria-label="HOD report review" className="rounded-2xl border border-[#D8E0EC] bg-white p-5 shadow-[0_18px_45px_rgba(7,29,73,0.12)]">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#64748B]">HOD report review</p>
                  <h2 className="mt-2 text-2xl font-black text-[#071D49]">{reportReview.title}</h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">
                    Save this report review and notify academic leadership inside Kisumu Boys.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {["Mathematics department", "Term 2 2026", "Principal and Dean visibility"].map((item) => (
                      <div key={item} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-3 text-sm font-black text-[#071D49]">{item}</div>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={saveReportReview} className="min-h-10 rounded-xl bg-[#071D49] px-4 text-sm font-black text-white">
                      Save report review
                    </button>
                    <button type="button" onClick={() => setReportReview(null)} className="min-h-10 rounded-xl border border-[#D8E0EC] px-4 text-sm font-black text-[#071D49]">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
              {communicationDraft ? (
                <div role="dialog" aria-modal="true" aria-label="HOD communication composer" className="rounded-2xl border border-[#D8E0EC] bg-white p-5 shadow-[0_18px_45px_rgba(7,29,73,0.12)]">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#64748B]">HOD communication composer</p>
                  <h2 className="mt-2 text-2xl font-black text-[#071D49]">{communicationDraft.title}</h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">
                    Save this communication draft for same-school teacher, academic leadership, or internal message follow-up.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {["Audience: department staff", "Channel: SMS / internal message", "Status: draft"].map((item) => (
                      <div key={item} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-3 text-sm font-black text-[#071D49]">{item}</div>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={saveCommunicationDraft} className="min-h-10 rounded-xl bg-[#071D49] px-4 text-sm font-black text-white">
                      Save communication draft
                    </button>
                    <button type="button" onClick={() => setCommunicationDraft(null)} className="min-h-10 rounded-xl border border-[#D8E0EC] px-4 text-sm font-black text-[#071D49]">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
              <ActiveWorkspace
                activeView={activeView}
                onExportAction={openExportAction}
                onFilterAction={(title) => openTableAction("filter", title)}
                onReportReview={openReportReview}
                onCommunicationDraft={openCommunicationDraft}
                onSearchAction={(title) => openTableAction("search", title)}
              />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
