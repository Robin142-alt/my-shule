"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  Bell,
  BookOpenCheck,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  FileText,
  FolderOpen,
  GraduationCap,
  HeartPulse,
  Home,
  Megaphone,
  MessageCircle,
  MoreHorizontal,
  Search,
  Settings,
  ShieldAlert,
  Users,
  type LucideIcon,
} from "lucide-react";

import {
  getCurrentSchoolId,
  publishSchoolOperationalEvent,
} from "@/lib/school/school-operational-store";

type ClassTeacherRouteMode = "hosted" | "public";
type Tone = "success" | "info" | "warning" | "danger" | "neutral";
type TeacherView =
  | "home"
  | "class"
  | "attendance"
  | "performance"
  | "assignments"
  | "discipline"
  | "parents"
  | "welfare"
  | "timetable"
  | "reports"
  | "announcements"
  | "documents"
  | "settings";

type NavItem = {
  id: TeacherView;
  label: string;
  icon: LucideIcon;
  group: string;
};

const navItems: NavItem[] = [
  { id: "home", label: "Dashboard Home", icon: Home, group: "Overview" },
  { id: "class", label: "My Class", icon: Users, group: "Class Operations" },
  { id: "attendance", label: "Attendance", icon: ClipboardCheck, group: "Class Operations" },
  { id: "performance", label: "Academic Performance", icon: GraduationCap, group: "Learning" },
  { id: "assignments", label: "Assignments", icon: BookOpenCheck, group: "Learning" },
  { id: "discipline", label: "Discipline", icon: ShieldAlert, group: "Student Care" },
  { id: "parents", label: "Parent Communication", icon: MessageCircle, group: "Student Care" },
  { id: "welfare", label: "Student Welfare", icon: HeartPulse, group: "Student Care" },
  { id: "timetable", label: "Timetable", icon: CalendarDays, group: "Planning" },
  { id: "reports", label: "Reports", icon: FileText, group: "Planning" },
  { id: "announcements", label: "Announcements", icon: Megaphone, group: "Planning" },
  { id: "documents", label: "Documents", icon: FolderOpen, group: "Resources" },
  { id: "settings", label: "Settings", icon: Settings, group: "Resources" },
];

const toneClasses: Record<Tone, { card: string; chip: string; dot: string; text: string }> = {
  success: {
    card: "border-emerald-200 bg-emerald-50 text-emerald-900",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
  },
  info: {
    card: "border-blue-200 bg-blue-50 text-blue-950",
    chip: "border-blue-200 bg-blue-50 text-blue-700",
    dot: "bg-blue-500",
    text: "text-blue-700",
  },
  warning: {
    card: "border-amber-200 bg-amber-50 text-amber-950",
    chip: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
    text: "text-amber-700",
  },
  danger: {
    card: "border-rose-200 bg-rose-50 text-rose-950",
    chip: "border-rose-200 bg-rose-50 text-rose-700",
    dot: "bg-rose-500",
    text: "text-rose-700",
  },
  neutral: {
    card: "border-slate-200 bg-white text-[#071D49]",
    chip: "border-slate-200 bg-slate-50 text-slate-700",
    dot: "bg-slate-400",
    text: "text-slate-600",
  },
};

const kpis = [
  ["Students Present Today", "43", "94% class attendance", "success", ClipboardCheck],
  ["Absent Students", "3", "1 needs parent follow-up", "warning", AlertTriangle],
  ["Pending Parent Messages", "5", "2 urgent replies", "info", MessageCircle],
  ["Students Needing Attention", "7", "Welfare and grades watch", "danger", HeartPulse],
] as const;

const alerts = [
  ["Brian Otieno absent 3 days", "Attendance trend requires guardian call before close of day.", "danger"],
  ["Aisha Njeri grades declining", "Mathematics average dropped 12 points across two assessments.", "warning"],
  ["Parent unread message", "Mrs. Wanjiku asked for a meeting about homework completion.", "info"],
] as const;

const schedule = [
  ["07:40", "Mathematics", "Form 2 Blue", "Completed"],
  ["09:10", "Class admin", "Attendance corrections", "Active"],
  ["11:30", "Welfare check", "Risk students follow-up", "Upcoming"],
] as const;

const students = [
  ["BO", "Brian Otieno", "ADM-2041", "82%", "Arrears watch", "Open case", "61%", "High"],
  ["AN", "Aisha Njeri", "ADM-2077", "95%", "Cleared", "Stable", "74%", "Medium"],
  ["KM", "Kevin Mwangi", "ADM-2132", "89%", "Cleared", "Monitor", "68%", "Medium"],
  ["SW", "Sarah Wambui", "ADM-2190", "98%", "Cleared", "Excellent", "83%", "Low"],
] as const;

const attendanceRows = [
  ["Brian Otieno", "Absent", "Sick note pending", "07:41"],
  ["Aisha Njeri", "Present", "Auto marked", "07:38"],
  ["Kevin Mwangi", "Late", "Arrived after bell", "08:02"],
  ["Sarah Wambui", "Present", "Auto marked", "07:35"],
] as const;

const classTeacherSearchRecords = [
  { id: "student-brian", label: "Brian Otieno", detail: "ADM-2041 | absent today | parent follow-up", view: "class" },
  { id: "guardian-wanjiku", label: "Mrs. Wanjiku", detail: "Guardian message about homework completion", view: "parents" },
  { id: "attendance-register", label: "Today attendance register", detail: "3 absent learners | quick save available", view: "attendance" },
  { id: "assignment-homework", label: "Algebra homework", detail: "11 late submissions | reminder ready", view: "assignments" },
  { id: "report-class-summary", label: "Term class report", detail: "Attendance, discipline, welfare, and academic summary", view: "reports" },
] satisfies Array<{ id: string; label: string; detail: string; view: TeacherView }>;

type ClassTeacherSearchRecord = (typeof classTeacherSearchRecords)[number];
type LearnerAction = {
  learnerName: string;
  kind: "message" | "note";
};

function announceAction(message: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("myshule-dashboard-action", { detail: message }));
  }
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getViewLabel(view: TeacherView) {
  return navItems.find((item) => item.id === view)?.label ?? "Class teacher workspace";
}

function StatusChip({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold", toneClasses[tone].chip)}>
      <span className={cn("h-2 w-2 rounded-full", toneClasses[tone].dot)} />
      {label}
    </span>
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
    <section className="rounded-2xl border border-[#D8E0EC] bg-white p-5 shadow-[0_18px_50px_rgba(7,29,73,0.08)]">
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

function Sidebar({
  activeView,
  onViewChange,
}: {
  activeView: TeacherView;
  onViewChange: (view: TeacherView) => void;
}) {
  return (
    <aside className="hidden h-[calc(100vh-1.5rem)] overflow-hidden rounded-2xl bg-[#071D49] p-4 text-white shadow-[0_24px_70px_rgba(7,29,73,0.28)] lg:block">
      <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100/70">MyShule</p>
        <h2 className="mt-2 text-xl font-black">Class Teacher</h2>
        <p className="mt-2 text-sm leading-6 text-white/65">Form 2 Blue daily operations.</p>
      </div>
      <nav className="mt-4 h-[calc(100%-8.5rem)] space-y-1 overflow-y-auto pr-1" aria-label="Class teacher navigation">
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
  searchTerm,
  searchResults,
  onSearchTermChange,
  onSearchResult,
  onQuickView,
}: {
  searchTerm: string;
  searchResults: typeof classTeacherSearchRecords;
  onSearchTermChange: (value: string) => void;
  onSearchResult: (record: ClassTeacherSearchRecord) => void;
  onQuickView: (view: TeacherView) => void;
}) {
  const today = "Today";

  return (
    <header className="sticky top-0 z-20 border-b border-[#D8E0EC] bg-[#F3F6FA]/90 px-4 py-3 backdrop-blur">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#071D49] text-sm font-black text-white">MS</div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#64748B]">Term 2 - Week 4</p>
            <h1 className="text-xl font-black text-[#071D49]">Class Teacher Dashboard</h1>
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-[minmax(260px,1fr)_auto_auto_auto] xl:min-w-[720px]">
          <div className="relative">
            <label className="flex min-h-11 items-center gap-3 rounded-xl border border-[#D8E0EC] bg-white px-3 text-[#64748B] shadow-sm">
              <Search className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Quick search</span>
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
                placeholder="Search student, guardian, note, or assignment"
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
                  <p className="rounded-lg px-3 py-3 text-sm font-semibold text-[#64748B]">No class records found.</p>
                )}
              </div>
            ) : null}
          </div>
          <StatusChip label="5 parent messages" tone="info" />
          <StatusChip label={today} tone="neutral" />
          <button
            type="button"
            onClick={() => {
              onQuickView("parents");
              announceAction("Parent communication quick actions opened.");
            }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#FF7A1A] px-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(255,122,26,0.25)]"
          >
            Quick actions
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
        {navItems.map((item) => (
          <button key={item.id} type="button" onClick={() => onQuickView(item.id)} className="shrink-0 rounded-full border border-[#D8E0EC] bg-white px-3 py-2 text-xs font-black text-[#071D49]">
            {item.label}
          </button>
        ))}
      </div>
    </header>
  );
}

function HomeWorkspace() {
  return (
    <>
      <section className="rounded-2xl bg-[linear-gradient(135deg,#071D49_0%,#123A7A_68%,#0F172A_100%)] p-5 text-white shadow-[0_24px_70px_rgba(7,29,73,0.22)]">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100/70">Good Morning, Mr. Kamau</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-[-0.02em] md:text-5xl">You are in control of your class.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-100/78">
              No struggling student should go unnoticed. Attendance, welfare, parents, assignments, and reports stay organized in one focused teacher workspace.
            </p>
          </div>
          <div className="rounded-2xl border border-white/12 bg-white/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/55">Today</p>
            <p className="mt-2 text-3xl font-black">6 lessons</p>
            <p className="mt-1 text-sm text-blue-100/72">3 urgent follow-ups before 4:00 PM</p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(([label, value, detail, tone, Icon]) => (
          <article key={label} className={cn("rounded-2xl border p-4 shadow-sm", toneClasses[tone].card)}>
            <div className="flex items-start justify-between gap-3">
              <Icon className="h-5 w-5" aria-hidden="true" />
              <StatusChip label="Live" tone={tone} />
            </div>
            <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] opacity-70">{label}</p>
            <p className="mt-2 text-3xl font-black">{value}</p>
            <p className="mt-1 text-sm font-semibold opacity-75">{detail}</p>
          </article>
        ))}
      </section>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <Panel title="Action alerts" description="Operational follow-ups surfaced before they become class problems." icon={AlertTriangle}>
          <div className="space-y-3">
            {alerts.map(([title, detail, tone]) => (
              <article key={title} className={cn("rounded-xl border p-4", toneClasses[tone].card)}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black">{title}</h3>
                    <p className="mt-1 text-sm leading-6 opacity-75">{detail}</p>
                  </div>
                  <MoreHorizontal className="h-5 w-5 shrink-0 opacity-60" aria-hidden="true" />
                </div>
              </article>
            ))}
          </div>
        </Panel>
        <Panel title="Today's schedule" description="Short lesson flow with the most important class teacher actions." icon={CalendarDays}>
          <div className="space-y-3">
            {schedule.map(([time, subject, detail, status]) => (
              <div key={`${time}-${subject}`} className="grid grid-cols-[64px_minmax(0,1fr)_auto] gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-sm">
                <span className="font-black text-[#071D49]">{time}</span>
                <span>
                  <span className="block font-black text-[#071D49]">{subject}</span>
                  <span className="text-[#64748B]">{detail}</span>
                </span>
                <StatusChip label={status} tone={status === "Active" ? "info" : status === "Completed" ? "success" : "warning"} />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Recent activity" description="Latest class notes, guardian contact, and welfare actions." icon={Bell}>
        <div className="grid gap-3 md:grid-cols-3">
          {["Attendance saved at 7:45 AM", "Two parents notified", "Assignment reminder queued"].map((item) => (
            <div key={item} className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm font-bold text-[#334155]">{item}</div>
          ))}
        </div>
      </Panel>
    </>
  );
}

function MyClassWorkspace({
  onMessageParent,
  onRecordNote,
}: {
  onMessageParent: (learnerName: string) => void;
  onRecordNote: (learnerName: string) => void;
}) {
  const [rosterSearch, setRosterSearch] = useState("");
  const visibleStudents = students.filter((student) => student.join(" ").toLowerCase().includes(rosterSearch.toLowerCase()));

  return (
    <Panel
      title="Class roster"
      description="Search, filter, and act on every learner without leaving the class workspace."
      icon={Users}
      actions={<StatusChip label="Form 2 Blue - 46 learners" tone="info" />}
    >
      <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
        <input
          value={rosterSearch}
          onChange={(event) => setRosterSearch(event.target.value)}
          className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] px-3 py-2 text-sm font-semibold outline-none"
          placeholder="Search roster or admission number"
        />
        <button type="button" onClick={() => announceAction("Form 2 Blue stream selector opened.")} className="rounded-xl border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-black text-[#071D49]">Stream selector</button>
        <button type="button" onClick={() => announceAction("Student risk filters opened.")} className="rounded-xl border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-black text-[#071D49]">Risk filters</button>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {visibleStudents.length === 0 ? (
          <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 text-sm font-bold text-[#64748B]">No learner matches this roster search.</div>
        ) : null}
        {visibleStudents.map(([avatar, name, adm, attendance, fee, discipline, average, risk]) => (
          <article key={adm} className="rounded-2xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#071D49] text-sm font-black text-white">{avatar}</div>
              <div>
                <h3 className="font-black text-[#071D49]">{name}</h3>
                <p className="text-xs font-bold text-[#64748B]">{adm}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-[#475569]">
              <span>Attendance {attendance}</span>
              <span>Average {average}</span>
              <span>{fee}</span>
              <span>{discipline}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusChip label={`${risk} risk`} tone={risk === "High" ? "danger" : risk === "Medium" ? "warning" : "success"} />
              <button type="button" onClick={() => onMessageParent(name)} className="rounded-full bg-[#071D49] px-3 py-1 text-xs font-black text-white">Message parent</button>
              <button type="button" onClick={() => onRecordNote(name)} className="rounded-full border border-[#D8E0EC] bg-white px-3 py-1 text-xs font-black text-[#071D49]">Record note</button>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function AttendanceWorkspace({ onAttendanceAction }: { onAttendanceAction: (action: "Bulk present" | "Attendance register") => void }) {
  return (
    <Panel
      title="Attendance workspace"
      description="One-click marking, bulk present, late tracking, reasons, timestamps, and printable reports."
      icon={ClipboardCheck}
      actions={
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onAttendanceAction("Bulk present")} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white">Bulk present</button>
          <button type="button" onClick={() => onAttendanceAction("Attendance register")} className="rounded-xl border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-black text-[#071D49]">Quick save</button>
        </div>
      }
    >
      <div className="overflow-hidden rounded-2xl border border-[#D8E0EC]">
        <div className="grid grid-cols-[1fr_120px_1fr_90px] bg-[#EEF5FF] px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-[#64748B]">
          <span>Student</span>
          <span>Status</span>
          <span>Reason</span>
          <span>Time</span>
        </div>
        {attendanceRows.map(([name, status, reason, time]) => (
          <div key={name} className="grid grid-cols-[1fr_120px_1fr_90px] items-center border-t border-[#E2E8F0] px-4 py-3 text-sm">
            <span className="font-black text-[#071D49]">{name}</span>
            <StatusChip label={status} tone={status === "Absent" ? "danger" : status === "Late" ? "warning" : "success"} />
            <span className="text-[#64748B]">{reason}</span>
            <span className="font-bold text-[#071D49]">{time}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function SimpleWorkspace({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <Panel title={title} description={description} icon={icon}>
      <div className="grid gap-3 md:grid-cols-3">
        {children}
      </div>
    </Panel>
  );
}

function ActiveWorkspace({
  activeView,
  onAttendanceAction,
  onMessageParent,
  onRecordNote,
  onPreviewReport,
}: {
  activeView: TeacherView;
  onAttendanceAction: (action: "Bulk present" | "Attendance register") => void;
  onMessageParent: (learnerName: string) => void;
  onRecordNote: (learnerName: string) => void;
  onPreviewReport: (reportName: string) => void;
}) {
  switch (activeView) {
    case "home":
      return <HomeWorkspace />;
    case "class":
      return <MyClassWorkspace onMessageParent={onMessageParent} onRecordNote={onRecordNote} />;
    case "attendance":
      return <AttendanceWorkspace onAttendanceAction={onAttendanceAction} />;
    case "performance":
      return (
        <SimpleWorkspace title="Academic performance workspace" description="Class averages, weak subjects, rankings, trends, missing marks, and exam comparison." icon={GraduationCap}>
          {["Class average 68%", "Weak subject: Algebra", "Top improvers: 6", "Missing marks: 9", "CBC mastery 82%", "Exam readiness 61%"].map((item) => (
            <div key={item} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 font-bold text-[#071D49]">{item}</div>
          ))}
        </SimpleWorkspace>
      );
    case "assignments":
      return (
        <SimpleWorkspace title="Assignments workspace" description="Draft, assign, collect, grade, and track late work from one compact board." icon={BookOpenCheck}>
          {["Draft: 2", "Assigned: 4", "Submitted: 164", "Late: 11", "Graded: 127", "Attached files ready"].map((item) => (
            <div key={item} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 font-bold text-[#071D49]">{item}</div>
          ))}
        </SimpleWorkspace>
      );
    case "discipline":
      return (
        <SimpleWorkspace title="Discipline workspace" description="Confidential incident records, repeat patterns, intervention notes, and parent acknowledgement." icon={ShieldAlert}>
          {["Open cases: 2", "Repeat concern: 1", "Parent acknowledgement pending", "Intervention notes updated", "No aggressive public labels", "Structured case history"].map((item) => (
            <div key={item} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 font-bold text-[#071D49]">{item}</div>
          ))}
        </SimpleWorkspace>
      );
    case "parents":
      return (
        <SimpleWorkspace title="Parent communication workspace" description="Inbox, SMS logs, meeting requests, templates, unread replies, and communication history." icon={MessageCircle}>
          {["Absenteeism notice", "Low performance concern", "Assignment reminder", "Behavior concern", "Appreciation message", "Meeting request"].map((item) => (
            <button key={item} type="button" onClick={() => announceAction(`${item} parent message opened.`)} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 text-left font-bold text-[#071D49]">{item}</button>
          ))}
        </SimpleWorkspace>
      );
    case "welfare":
      return (
        <SimpleWorkspace title="Student welfare workspace" description="Calm, confidential view of counselling referrals, health concerns, bullying reports, and follow-up reminders." icon={HeartPulse}>
          {["Counselling referrals: 3", "Health concerns: 2", "Bullying watch: 1", "Vulnerable students: 4", "Follow-up reminders: 5", "Escalation workflow ready"].map((item) => (
            <div key={item} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 font-bold text-[#071D49]">{item}</div>
          ))}
        </SimpleWorkspace>
      );
    case "timetable":
      return (
        <SimpleWorkspace title="Timetable workspace" description="Weekly timetable, substitutions, rooms, reminders, and mobile-friendly lesson planning." icon={CalendarDays}>
          {["Monday: 6 lessons", "Room B4", "Substitution pending", "Class admin 09:10", "Welfare check 11:30", "Report prep 15:40"].map((item) => (
            <div key={item} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 font-bold text-[#071D49]">{item}</div>
          ))}
        </SimpleWorkspace>
      );
    case "reports":
      return (
        <SimpleWorkspace title="Reports workspace" description="Generate attendance, performance, discipline, parent communication, and class summary exports." icon={FileText}>
          {["Attendance PDF", "Performance Excel", "Discipline summary", "Parent communication log", "Term class report", "Print-ready pack"].map((item) => (
            <button key={item} type="button" onClick={() => onPreviewReport(item)} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 text-left font-bold text-[#071D49]">{item}</button>
          ))}
        </SimpleWorkspace>
      );
    case "announcements":
      return (
        <SimpleWorkspace title="Announcements workspace" description="Post class notices, schedule reminders, attach files, and track read confirmations." icon={Megaphone}>
          {["Pinned exam reminder", "Homework notice", "Parent meeting alert", "Expiry date set", "Read confirmations 89%", "Schedule reminder"].map((item) => (
            <div key={item} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 font-bold text-[#071D49]">{item}</div>
          ))}
        </SimpleWorkspace>
      );
    case "documents":
      return (
        <SimpleWorkspace title="Documents workspace" description="Lesson plans, class files, notes, previews, folders, permissions, and drag-and-drop uploads." icon={FolderOpen}>
          {["Lesson plans", "Class files", "Shared notes", "Exam documents", "Upload dropzone", "Permission controls"].map((item) => (
            <div key={item} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 font-bold text-[#071D49]">{item}</div>
          ))}
        </SimpleWorkspace>
      );
    case "settings":
      return (
        <SimpleWorkspace title="Settings workspace" description="Notification preferences, communication settings, grading preferences, attendance defaults, and personalization." icon={Settings}>
          {["Notifications", "Communication defaults", "Grading preferences", "Attendance defaults", "Dashboard layout", "Keyboard shortcuts"].map((item) => (
            <div key={item} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 font-bold text-[#071D49]">{item}</div>
          ))}
        </SimpleWorkspace>
      );
    default:
      return <HomeWorkspace />;
  }
}

export function ClassTeacherCommandCenter({ routeMode }: { routeMode: ClassTeacherRouteMode }) {
  const [activeView, setActiveView] = useState<TeacherView>("home");
  const [searchTerm, setSearchTerm] = useState("");
  const [notice, setNotice] = useState("Ready for Form 2 Blue daily follow-up.");
  const [learnerAction, setLearnerAction] = useState<LearnerAction | null>(null);
  const [guardianMessage, setGuardianMessage] = useState("Please review today's class follow-up and reply through MyShule.");
  const [classNote, setClassNote] = useState("");
  const [reportPreview, setReportPreview] = useState<string | null>(null);
  const searchResults = searchTerm.trim()
    ? classTeacherSearchRecords.filter((record) => `${record.label} ${record.detail}`.toLowerCase().includes(searchTerm.toLowerCase()))
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

  function openView(view: TeacherView) {
    setActiveView(view);
    setNotice(`${getViewLabel(view)} opened.`);
  }

  function openSearchRecord(record: ClassTeacherSearchRecord) {
    setActiveView(record.view);
    setSearchTerm("");
    setNotice(`${record.label} opened in ${getViewLabel(record.view)}.`);
  }

  function openParentMessage(learnerName: string) {
    setGuardianMessage(`Hello, please review ${learnerName}'s class follow-up in MyShule today.`);
    setLearnerAction({ learnerName, kind: "message" });
  }

  function openClassNote(learnerName: string) {
    setClassNote(`${learnerName}: `);
    setLearnerAction({ learnerName, kind: "note" });
  }

  function openReportPreview(reportName: string) {
    setReportPreview(reportName);
    setNotice(`${reportName} preview prepared for Form 2 Blue.`);
  }

  function recordAttendanceAction(action: "Bulk present" | "Attendance register") {
    const schoolId = getCurrentSchoolId();
    const isBulkPresent = action === "Bulk present";

    publishSchoolOperationalEvent({
      schoolId,
      type: "CLASS_ATTENDANCE_ACTION_RECORDED",
      module: "attendance",
      actorRole: "Class Teacher",
      title: `${action} saved for Form 2 Blue`,
      body: isBulkPresent
        ? "Class Teacher marked the class present in the Form 2 Blue attendance workspace."
        : "Class Teacher saved the Form 2 Blue attendance register.",
      entityId: "form-2-blue-attendance",
      severity: "info",
      payload: {
        className: "Form 2 Blue",
        action,
        presentCount: isBulkPresent ? 43 : 41,
        absentCount: isBulkPresent ? 0 : 3,
        lateCount: isBulkPresent ? 0 : 2,
      },
      notifications: [
        {
          audienceRoles: ["Deputy Principal", "Principal", "Grade/Form Master"],
          title: `${action} recorded`,
          body: `${action} was saved for Form 2 Blue by the Class Teacher.`,
          severity: "info",
          relatedModule: "attendance",
          relatedRecordId: "form-2-blue-attendance",
          requiresAction: false,
          requestStatus: "Completed",
        },
      ],
    });

    setNotice(isBulkPresent ? "Bulk present saved for Form 2 Blue." : "Attendance register saved for Form 2 Blue.");
  }

  function submitLearnerAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!learnerAction) {
      return;
    }

    if (learnerAction.kind === "message") {
      if (!guardianMessage.trim()) {
        setNotice("Message cannot be empty.");
        return;
      }

      publishSchoolOperationalEvent({
        schoolId: getCurrentSchoolId(),
        type: "CLASS_PARENT_MESSAGE_QUEUED",
        module: "communications",
        actorRole: "Class Teacher",
        title: `Parent SMS queued for ${learnerAction.learnerName}`,
        body: guardianMessage.trim(),
        entityId: learnerAction.learnerName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        severity: "info",
        payload: {
          learnerName: learnerAction.learnerName,
          className: "Form 2 Blue",
          channel: "SMS",
          message: guardianMessage.trim(),
        },
        notifications: [
          {
            audienceRoles: ["Parent", "Deputy Principal"],
            title: `Class follow-up sent for ${learnerAction.learnerName}`,
            body: "A class teacher parent SMS was queued for delivery.",
            severity: "info",
            relatedModule: "communications",
            relatedRecordId: learnerAction.learnerName,
            requiresAction: false,
            requestStatus: "Pending",
          },
        ],
      });

      setNotice(`Parent SMS queued for ${learnerAction.learnerName}.`);
      setLearnerAction(null);
      return;
    }

    if (!classNote.trim()) {
      setNotice("Class note cannot be empty.");
      return;
    }

    publishSchoolOperationalEvent({
      schoolId: getCurrentSchoolId(),
      type: "CLASS_NOTE_RECORDED",
      module: "class-teacher",
      actorRole: "Class Teacher",
      title: `Class note saved for ${learnerAction.learnerName}`,
      body: classNote.trim(),
      entityId: learnerAction.learnerName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      severity: "info",
      payload: {
        learnerName: learnerAction.learnerName,
        className: "Form 2 Blue",
        note: classNote.trim(),
      },
      notifications: [
        {
          audienceRoles: ["Deputy Principal", "Grade/Form Master"],
          title: `Class note recorded for ${learnerAction.learnerName}`,
          body: "A class teacher note was recorded for follow-up visibility.",
          severity: "info",
          relatedModule: "class-teacher",
          relatedRecordId: learnerAction.learnerName,
          requiresAction: false,
          requestStatus: "Completed",
        },
      ],
    });

    setNotice(`Class note saved for ${learnerAction.learnerName}.`);
    setLearnerAction(null);
  }

  return (
    <div data-route-mode={routeMode} className="h-screen overflow-hidden bg-[#F3F6FA] text-[#071D49]">
      <div className="grid h-full gap-4 p-3 lg:grid-cols-[292px_minmax(0,1fr)]">
        <Sidebar activeView={activeView} onViewChange={openView} />
        <div className="min-h-0 overflow-hidden rounded-2xl border border-[#D8E0EC] bg-[#F3F6FA] shadow-[0_20px_70px_rgba(7,29,73,0.1)]">
          <Topbar
            searchTerm={searchTerm}
            searchResults={searchResults}
            onSearchTermChange={setSearchTerm}
            onSearchResult={openSearchRecord}
            onQuickView={openView}
          />
          <main className="h-[calc(100%-84px)] overflow-y-auto p-4">
            <div className="space-y-4">
              <div role="status" className="rounded-xl border border-[#BFDBFE] bg-[#EEF5FF] px-4 py-3 text-sm font-bold text-[#071D49]">
                {notice}
              </div>
              <ActiveWorkspace
                activeView={activeView}
                onAttendanceAction={recordAttendanceAction}
                onMessageParent={openParentMessage}
                onRecordNote={openClassNote}
                onPreviewReport={openReportPreview}
              />
            </div>
          </main>
        </div>
      </div>
      {learnerAction ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#071D49]/45 p-4">
          <form
            role="dialog"
            aria-modal="true"
            aria-label={learnerAction.kind === "message" ? "Send parent message" : "Record class note"}
            onSubmit={submitLearnerAction}
            className="w-full max-w-lg rounded-2xl border border-[#D8E0EC] bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#64748B]">Form 2 Blue</p>
                <h2 className="mt-1 text-xl font-black text-[#071D49]">
                  {learnerAction.kind === "message" ? "Send parent message" : "Record class note"}
                </h2>
                <p className="mt-1 text-sm font-semibold text-[#64748B]">{learnerAction.learnerName}</p>
              </div>
              <button type="button" onClick={() => setLearnerAction(null)} className="rounded-lg border border-[#D8E0EC] px-3 py-1.5 text-xs font-black text-[#071D49]">
                Cancel
              </button>
            </div>
            {learnerAction.kind === "message" ? (
              <label className="mt-4 grid gap-1 text-sm font-bold text-[#40608F]">
                Message to guardian
                <textarea
                  value={guardianMessage}
                  onChange={(event) => setGuardianMessage(event.currentTarget.value)}
                  required
                  rows={5}
                  className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-[#9BC5FF]"
                />
              </label>
            ) : (
              <label className="mt-4 grid gap-1 text-sm font-bold text-[#40608F]">
                Class note
                <textarea
                  value={classNote}
                  onChange={(event) => setClassNote(event.currentTarget.value)}
                  required
                  rows={5}
                  className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-[#9BC5FF]"
                />
              </label>
            )}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setLearnerAction(null)} className="rounded-xl border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-black text-[#071D49]">
                Cancel
              </button>
              <button type="submit" className="rounded-xl bg-[#FF7A1A] px-4 py-2 text-sm font-black text-white">
                {learnerAction.kind === "message" ? "Send Message" : "Save Note"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
      {reportPreview ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#071D49]/45 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Class report preview"
            className="w-full max-w-2xl rounded-2xl border border-[#D8E0EC] bg-white p-5 shadow-2xl"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#64748B]">Kisumu Boys High School</p>
                <h2 className="mt-1 text-xl font-black text-[#071D49]">Class report preview</h2>
                <p className="mt-1 text-sm font-semibold text-[#64748B]">Form 2 Blue - {reportPreview}</p>
              </div>
              <button type="button" onClick={() => setReportPreview(null)} className="rounded-lg border border-[#D8E0EC] px-3 py-1.5 text-xs font-black text-[#071D49]">
                Cancel
              </button>
            </div>
            <div className="mt-4 rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
              <div className="grid gap-3 text-sm md:grid-cols-2">
                <p><strong>Prepared by:</strong> Mr. Kamau</p>
                <p><strong>Term:</strong> Term 2 2026</p>
                <p><strong>Students:</strong> 46</p>
                <p><strong>Attendance:</strong> 94% present today</p>
                <p><strong>Parent follow-ups:</strong> 5 pending</p>
                <p><strong>Document ref:</strong> CT-F2B-{reportPreview.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setReportPreview(null)} className="rounded-xl border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-black text-[#071D49]">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setNotice(`${reportPreview} ready for printing.`);
                  setReportPreview(null);
                }}
                className="rounded-xl bg-[#FF7A1A] px-4 py-2 text-sm font-black text-white"
              >
                Print Preview
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
