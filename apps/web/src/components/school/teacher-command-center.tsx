"use client";

import { useState, type ReactNode } from "react";
import {
  Bell,
  BookOpenCheck,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Home,
  MessageCircle,
  MonitorPlay,
  Search,
  Settings,
  UploadCloud,
  Users,
  type LucideIcon,
} from "lucide-react";

type TeacherRouteMode = "hosted" | "public";
type TeacherView =
  | "home"
  | "classes"
  | "marks"
  | "assignments"
  | "lms"
  | "cbt"
  | "communication"
  | "timetable"
  | "reports"
  | "settings";
type TeacherAction = "attendance" | "marks" | "assignment" | "resource" | "sms" | "cbt" | "report" | null;

type ClassRecord = {
  id: string;
  name: string;
  learners: number;
  room: string;
  lesson: string;
  attendance: "Submitted" | "Pending" | "Late";
  absent: number;
  coverage: number;
};

type MarkBatch = {
  id: string;
  className: string;
  exam: string;
  submitted: number;
  total: number;
  status: "Open" | "Submitted" | "Needs review";
};

type AssignmentRecord = {
  id: string;
  title: string;
  className: string;
  dueDate: string;
  submitted: number;
  total: number;
  status: "Draft" | "Published" | "Grading";
};

type ResourceRecord = {
  id: string;
  title: string;
  className: string;
  type: string;
  status: "Draft" | "Published";
};

type MessageRecord = {
  id: string;
  audience: string;
  body: string;
  status: "Sent" | "Queued";
  time: string;
};

type DetailPanel = {
  title: string;
  rows: Array<[string, string]>;
};

type NavItem = {
  id: TeacherView;
  label: string;
  icon: LucideIcon;
  group: string;
};

const navItems: NavItem[] = [
  { id: "home", label: "Dashboard", icon: Home, group: "Overview" },
  { id: "classes", label: "My Teaching Classes", icon: Users, group: "Teaching" },
  { id: "marks", label: "Marks & Exams", icon: BookOpenCheck, group: "Teaching" },
  { id: "assignments", label: "Assignments", icon: ClipboardCheck, group: "Teaching" },
  { id: "lms", label: "LMS Resources", icon: UploadCloud, group: "Digital Learning" },
  { id: "cbt", label: "CBT Exams", icon: MonitorPlay, group: "Digital Learning" },
  { id: "communication", label: "Communication", icon: MessageCircle, group: "Communication" },
  { id: "timetable", label: "Timetable", icon: CalendarDays, group: "Planning" },
  { id: "reports", label: "Reports", icon: FileText, group: "Planning" },
  { id: "settings", label: "Settings", icon: Settings, group: "Planning" },
];

const teacherSearchRecords = [
  { id: "class-form-2-blue", label: "Form 2 Blue Mathematics", detail: "Lesson register, marks, and assignments", view: "classes" },
  { id: "marks-cat-2", label: "CAT 2 marks queue", detail: "37 marks pending moderation", view: "marks" },
  { id: "assignment-fractions", label: "Fractions homework", detail: "Grade 7 East assignment due Friday", view: "assignments" },
  { id: "resource-algebra", label: "Algebra revision notes", detail: "LMS resource ready to upload", view: "lms" },
  { id: "sms-parent-replies", label: "Parent replies", detail: "3 academic questions waiting", view: "communication" },
] satisfies Array<{ id: string; label: string; detail: string; view: TeacherView }>;

const initialClasses: ClassRecord[] = [
  { id: "form-2-blue", name: "Form 2 Blue Mathematics", learners: 48, room: "B4", lesson: "Algebra equations", attendance: "Pending", absent: 0, coverage: 76 },
  { id: "form-3-east", name: "Form 3 East Mathematics", learners: 44, room: "Math Lab", lesson: "Trigonometry", attendance: "Submitted", absent: 3, coverage: 82 },
  { id: "form-4-south", name: "Form 4 South Revision", learners: 39, room: "A2", lesson: "KCSE paper review", attendance: "Late", absent: 5, coverage: 91 },
];

const initialMarkBatches: MarkBatch[] = [
  { id: "cat-2-form-2", className: "Form 2 Blue", exam: "CAT 2 Mathematics", submitted: 11, total: 48, status: "Open" },
  { id: "mock-form-4", className: "Form 4 South", exam: "Mock Paper 1", submitted: 34, total: 39, status: "Needs review" },
  { id: "cbc-grade-7", className: "Grade 7 East", exam: "CBC competency check", submitted: 42, total: 42, status: "Submitted" },
];

const initialAssignments: AssignmentRecord[] = [
  { id: "fractions-homework", title: "Fractions homework", className: "Grade 7 East", dueDate: "Friday", submitted: 38, total: 42, status: "Published" },
  { id: "algebra-revision", title: "Algebra revision questions", className: "Form 2 Blue", dueDate: "Tomorrow", submitted: 17, total: 48, status: "Grading" },
  { id: "kcse-practice", title: "KCSE Paper 1 practice", className: "Form 4 South", dueDate: "Monday", submitted: 0, total: 39, status: "Draft" },
];

const initialResources: ResourceRecord[] = [
  { id: "algebra-notes", title: "Algebra revision notes", className: "Form 2 Blue", type: "PDF notes", status: "Draft" },
  { id: "trig-video", title: "Trigonometry worked examples", className: "Form 3 East", type: "Video link", status: "Published" },
];

const initialMessages: MessageRecord[] = [
  { id: "msg-001", audience: "Form 2 Blue parents", body: "CAT 2 marks entry is in progress. Revision guidance will be shared by Friday.", status: "Sent", time: "08:20" },
  { id: "msg-002", audience: "Grade 7 East learners", body: "Remember to submit the fractions homework before Friday.", status: "Queued", time: "09:45" },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 17) return "Good Afternoon";
  if (hour >= 17 && hour < 22) return "Good Evening";
  return "Welcome Back";
}

function statusClass(status: string) {
  if (["Submitted", "Sent", "Published"].includes(status)) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (["Late", "Needs review", "Queued", "Grading"].includes(status)) return "border-orange-200 bg-orange-50 text-orange-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function exportCsv(filename: string, rows: Array<Record<string, string | number>>) {
  if (typeof window === "undefined" || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => `"${String(row[header] ?? "").replaceAll('"', '""')}"`).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function Sidebar({ activeView, onViewChange }: { activeView: TeacherView; onViewChange: (view: TeacherView) => void }) {
  return (
    <aside className="hidden h-[calc(100vh-1.5rem)] overflow-hidden rounded-2xl bg-[#071D49] p-4 text-white shadow-[0_24px_70px_rgba(7,29,73,0.28)] lg:block">
      <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100/70">MyShule</p>
        <h2 className="mt-2 text-xl font-black">Teacher Workspace</h2>
        <p className="mt-2 text-sm leading-6 text-white/65">Subject teaching, marks, LMS, CBT, and class delivery.</p>
      </div>
      <nav className="mt-4 h-[calc(100%-8.5rem)] space-y-1 overflow-y-auto pr-1" aria-label="Teacher navigation">
        {navItems.map((item, index) => {
          const showGroup = item.group !== navItems[index - 1]?.group;
          const Icon = item.icon;

          return (
            <div key={item.label}>
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
  onStartAction,
}: {
  searchTerm: string;
  searchResults: typeof teacherSearchRecords;
  onSearchTermChange: (value: string) => void;
  onSearchResult: (record: (typeof teacherSearchRecords)[number]) => void;
  onStartAction: (action: TeacherAction, view: TeacherView, message: string) => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-[#D8E0EC] bg-[#F3F6FA]/90 px-4 py-3 backdrop-blur">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#071D49] text-sm font-black text-white">MS</div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#64748B]">Term 2 - Teacher</p>
            <h1 className="text-xl font-black text-[#071D49]">Teacher Dashboard</h1>
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-[minmax(260px,1fr)_auto_auto] xl:min-w-[660px]">
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
                placeholder="Search class, exam, learner, or LMS resource"
              />
            </label>
            {searchTerm.trim() ? (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-xl border border-[#D8E0EC] bg-white p-2 shadow-xl">
                {searchResults.length > 0 ? (
                  searchResults.map((record) => (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => onSearchResult(record)}
                      className="w-full rounded-lg px-3 py-2 text-left transition hover:bg-[#F3F6FA]"
                    >
                      <span className="block text-sm font-black text-[#071D49]">{record.label}</span>
                      <span className="mt-0.5 block text-xs font-semibold text-[#64748B]">{record.detail}</span>
                    </button>
                  ))
                ) : (
                  <p className="rounded-lg px-3 py-3 text-sm font-semibold text-[#64748B]">No teacher records found.</p>
                )}
              </div>
            ) : null}
          </div>
          <button type="button" onClick={() => onStartAction("marks", "marks", "Marks entry form opened.")} className="rounded-xl bg-[#FF7A1A] px-4 py-2 text-sm font-black text-white">Enter marks</button>
          <button type="button" onClick={() => onStartAction("sms", "communication", "Parent SMS form opened.")} className="rounded-xl border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-black text-[#071D49]">Send SMS</button>
        </div>
      </div>
    </header>
  );
}

function Panel({ title, description, icon: Icon, children }: { title: string; description: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#D8E0EC] bg-white p-5 shadow-[0_18px_50px_rgba(7,29,73,0.08)]">
      <div className="mb-4 flex gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#EEF5FF] text-[#1D4ED8]">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xl font-black text-[#071D49]">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-[#64748B]">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function HomeWorkspace({
  onViewChange,
  onStartAction,
  summaryCards,
}: {
  onViewChange: (view: TeacherView) => void;
  onStartAction: (action: TeacherAction, view: TeacherView, message: string) => void;
  summaryCards: Array<[label: string, value: string, detail: string]>;
}) {
  const quickActions: Array<[label: string, view: TeacherView, action: TeacherAction, message: string]> = [
    ["Mark attendance", "classes", "attendance", "Attendance register form opened."],
    ["Enter exam marks", "marks", "marks", "Marks entry form opened."],
    ["Add assignment", "assignments", "assignment", "Assignment form opened."],
    ["Upload notes", "lms", "resource", "Lesson notes upload form opened."],
    ["Send SMS", "communication", "sms", "Parent SMS form opened."],
    ["Generate report", "reports", "report", "Subject report options opened."],
  ];

  return (
    <>
      <section className="rounded-2xl bg-[linear-gradient(135deg,#071D49_0%,#123A7A_68%,#0F172A_100%)] p-5 text-white shadow-[0_24px_70px_rgba(7,29,73,0.22)]">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100/70">{getGreeting()}, Mr. Kamau</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-[-0.02em] md:text-5xl">Teaching work, organized.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-100/78">
          Focus on lessons, marks, assignments, LMS resources, CBT exams, and parent communication without class-teacher welfare clutter.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(([label, value, detail]) => (
          <article key={label} className="rounded-2xl border border-[#D8E0EC] bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#64748B]">{label}</p>
            <p className="mt-2 text-3xl font-black text-[#071D49]">{value}</p>
            <p className="mt-1 text-sm font-semibold text-[#64748B]">{detail}</p>
          </article>
        ))}
      </section>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <Panel title="Quick action center" description="High-frequency subject-teacher work only." icon={Bell}>
          <div className="grid gap-3 sm:grid-cols-2">
            {quickActions.map(([label, view, action, message]) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  onViewChange(view);
                  onStartAction(action, view, message);
                }}
                className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 text-left text-sm font-black text-[#071D49]"
              >
                {label}
              </button>
            ))}
          </div>
        </Panel>
        <Panel title="Today's teaching timeline" description="Focused lesson flow, not class-teacher operations." icon={CalendarDays}>
          <div className="space-y-3">
            {["07:40 Form 2 Blue Mathematics", "09:10 Form 3 East Mathematics", "11:30 Form 4 South Revision"].map((item) => (
              <div key={item} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-3 text-sm font-bold text-[#071D49]">{item}</div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

function ActionFormPanel({
  activeAction,
  classes,
  markBatches,
  onClose,
  onSubmitAttendance,
  onSubmitMarks,
  onSubmitAssignment,
  onSubmitResource,
  onSubmitSms,
}: {
  activeAction: TeacherAction;
  classes: ClassRecord[];
  markBatches: MarkBatch[];
  onClose: () => void;
  onSubmitAttendance: (classId: string, absent: number) => void;
  onSubmitMarks: (batchId: string, submitted: number) => void;
  onSubmitAssignment: (record: Omit<AssignmentRecord, "id" | "submitted" | "status">) => void;
  onSubmitResource: (record: Omit<ResourceRecord, "id" | "status">) => void;
  onSubmitSms: (record: Omit<MessageRecord, "id" | "status" | "time">) => void;
}) {
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [batchId, setBatchId] = useState(markBatches[0]?.id ?? "");
  const [absent, setAbsent] = useState("0");
  const [submitted, setSubmitted] = useState("");
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentClass, setAssignmentClass] = useState(classes[0]?.name ?? "");
  const [assignmentDue, setAssignmentDue] = useState("Friday");
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceType, setResourceType] = useState("PDF notes");
  const [resourceClass, setResourceClass] = useState(classes[0]?.name ?? "");
  const [smsAudience, setSmsAudience] = useState("Form 2 Blue parents");
  const [smsBody, setSmsBody] = useState("");

  if (!activeAction) return null;

  const inputClass = "rounded-xl border border-[#D8E0EC] bg-white px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-[#1D4ED8]";

  return (
    <section className="rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] p-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-black text-[#071D49]">
            {activeAction === "attendance" ? "Mark class attendance" : null}
            {activeAction === "marks" ? "Enter marks progress" : null}
            {activeAction === "assignment" ? "Create assignment" : null}
            {activeAction === "resource" ? "Upload learning resource" : null}
            {activeAction === "sms" ? "Send class message" : null}
            {activeAction === "report" ? "Generate subject report" : null}
            {activeAction === "cbt" ? "Start CBT supervision" : null}
          </h2>
          <p className="mt-1 text-sm font-semibold text-[#64748B]">This action updates the visible teacher records immediately.</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-xl border border-[#D8E0EC] bg-white px-3 py-2 text-sm font-black text-[#071D49]">
          Close
        </button>
      </div>

      {activeAction === "attendance" ? (
        <form
          className="grid gap-3 md:grid-cols-[1fr_140px_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmitAttendance(classId, Number(absent || 0));
          }}
        >
          <select value={classId} onChange={(event) => setClassId(event.target.value)} className={inputClass} aria-label="Class register">
            {classes.map((record) => <option key={record.id} value={record.id}>{record.name}</option>)}
          </select>
          <input value={absent} onChange={(event) => setAbsent(event.target.value)} className={inputClass} inputMode="numeric" aria-label="Absent learners" placeholder="Absent" required />
          <button type="submit" className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">Submit register</button>
        </form>
      ) : null}

      {activeAction === "marks" ? (
        <form
          className="grid gap-3 md:grid-cols-[1fr_160px_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmitMarks(batchId, Number(submitted || 0));
          }}
        >
          <select value={batchId} onChange={(event) => setBatchId(event.target.value)} className={inputClass} aria-label="Marks batch">
            {markBatches.map((record) => <option key={record.id} value={record.id}>{record.exam} - {record.className}</option>)}
          </select>
          <input value={submitted} onChange={(event) => setSubmitted(event.target.value)} className={inputClass} inputMode="numeric" aria-label="Submitted marks" placeholder="Marks submitted" required />
          <button type="submit" className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">Save marks</button>
        </form>
      ) : null}

      {activeAction === "assignment" ? (
        <form
          className="grid gap-3 md:grid-cols-[1fr_180px_140px_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmitAssignment({ title: assignmentTitle, className: assignmentClass, dueDate: assignmentDue, total: 45 });
            setAssignmentTitle("");
          }}
        >
          <input value={assignmentTitle} onChange={(event) => setAssignmentTitle(event.target.value)} className={inputClass} aria-label="Assignment title" placeholder="Assignment title" required />
          <select value={assignmentClass} onChange={(event) => setAssignmentClass(event.target.value)} className={inputClass} aria-label="Assignment class">
            {classes.map((record) => <option key={record.id} value={record.name}>{record.name}</option>)}
          </select>
          <input value={assignmentDue} onChange={(event) => setAssignmentDue(event.target.value)} className={inputClass} aria-label="Assignment due date" placeholder="Due date" required />
          <button type="submit" className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">Publish</button>
        </form>
      ) : null}

      {activeAction === "resource" ? (
        <form
          className="grid gap-3 md:grid-cols-[1fr_160px_180px_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmitResource({ title: resourceTitle, type: resourceType, className: resourceClass });
            setResourceTitle("");
          }}
        >
          <input value={resourceTitle} onChange={(event) => setResourceTitle(event.target.value)} className={inputClass} aria-label="Resource title" placeholder="Resource title" required />
          <select value={resourceType} onChange={(event) => setResourceType(event.target.value)} className={inputClass} aria-label="Resource type">
            <option>PDF notes</option>
            <option>Video link</option>
            <option>Revision quiz</option>
          </select>
          <select value={resourceClass} onChange={(event) => setResourceClass(event.target.value)} className={inputClass} aria-label="Resource class">
            {classes.map((record) => <option key={record.id} value={record.name}>{record.name}</option>)}
          </select>
          <button type="submit" className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">Upload</button>
        </form>
      ) : null}

      {activeAction === "sms" ? (
        <form
          className="grid gap-3 md:grid-cols-[220px_1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmitSms({ audience: smsAudience, body: smsBody });
            setSmsBody("");
          }}
        >
          <select value={smsAudience} onChange={(event) => setSmsAudience(event.target.value)} className={inputClass} aria-label="SMS audience">
            <option>Form 2 Blue parents</option>
            <option>Form 3 East parents</option>
            <option>Form 4 South parents</option>
            <option>Grade 7 East learners</option>
          </select>
          <input value={smsBody} onChange={(event) => setSmsBody(event.target.value)} className={inputClass} aria-label="SMS message" placeholder="Message to send" required />
          <button type="submit" className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">Send SMS</button>
        </form>
      ) : null}

      {activeAction === "report" ? (
        <div className="grid gap-3 md:grid-cols-3">
          <button
            type="button"
            onClick={() => exportCsv("teacher-subject-report.csv", classes.map((record) => ({ class: record.name, learners: record.learners, attendance: record.attendance, absent: record.absent, coverage: `${record.coverage}%` })))}
            className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 text-left font-bold text-[#071D49] transition hover:-translate-y-0.5 hover:shadow-md"
          >
            Export class report CSV
          </button>
          <button type="button" onClick={() => window.print()} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 text-left font-bold text-[#071D49] transition hover:-translate-y-0.5 hover:shadow-md">
            Print subject report
          </button>
          <button type="button" onClick={onClose} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 text-left font-bold text-[#071D49] transition hover:-translate-y-0.5 hover:shadow-md">
            Return to report desk
          </button>
        </div>
      ) : null}
    </section>
  );
}

function RecordTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#D8E0EC]">
      <table className="min-w-full divide-y divide-[#E2E8F0] bg-white text-sm">
        <thead className="bg-[#F8FAFC] text-left text-xs font-black uppercase tracking-[0.14em] text-[#64748B]">
          <tr>{columns.map((column) => <th key={column} className="px-4 py-3">{column}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-[#E2E8F0]">
          {rows.map((row, index) => (
            <tr key={index} className="align-top">
              {row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3 font-semibold text-[#071D49]">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  return <span className={cn("inline-flex rounded-full border px-2 py-1 text-xs font-black", statusClass(status))}>{status}</span>;
}

function ClassesWorkspace({
  classes,
  onStartAction,
  onOpenDetail,
}: {
  classes: ClassRecord[];
  onStartAction: (action: TeacherAction, view: TeacherView, message: string) => void;
  onOpenDetail: (detail: DetailPanel) => void;
}) {
  return (
    <Panel title="My teaching classes" description="Subject classes, lesson registers, attendance status, and syllabus coverage." icon={Users}>
      <RecordTable
        columns={["Class", "Lesson", "Attendance", "Absent", "Coverage", "Action"]}
        rows={classes.map((record) => [
          <div key="class"><p className="font-black">{record.name}</p><p className="text-xs text-[#64748B]">{record.learners} learners - Room {record.room}</p></div>,
          record.lesson,
          <StatusPill key="status" status={record.attendance} />,
          record.absent,
          `${record.coverage}%`,
          <div key="actions" className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onStartAction("attendance", "classes", `${record.name} attendance register opened.`)} className="rounded-lg border border-[#BFDBFE] px-3 py-1.5 text-xs font-black text-[#1D4ED8]">Mark Attendance</button>
            <button type="button" onClick={() => onOpenDetail({ title: record.name, rows: [["Learners", String(record.learners)], ["Current lesson", record.lesson], ["Room", record.room], ["Attendance", record.attendance], ["Absent today", String(record.absent)], ["Syllabus coverage", `${record.coverage}%`]] })} className="rounded-lg border border-[#D8E0EC] px-3 py-1.5 text-xs font-black text-[#071D49]">View Register</button>
          </div>,
        ])}
      />
    </Panel>
  );
}

function MarksWorkspace({
  markBatches,
  onStartAction,
}: {
  markBatches: MarkBatch[];
  onStartAction: (action: TeacherAction, view: TeacherView, message: string) => void;
}) {
  return (
    <Panel title="Marks & exams" description="Mark entry, missing marks, moderation, and exportable exam progress." icon={BookOpenCheck}>
      <RecordTable
        columns={["Exam", "Class", "Submitted", "Status", "Action"]}
        rows={markBatches.map((record) => [
          record.exam,
          record.className,
          `${record.submitted}/${record.total}`,
          <StatusPill key="status" status={record.status} />,
          <div key="actions" className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onStartAction("marks", "marks", `${record.exam} marks entry opened.`)} className="rounded-lg border border-[#BFDBFE] px-3 py-1.5 text-xs font-black text-[#1D4ED8]">Enter Marks</button>
            <button type="button" onClick={() => exportCsv(`${record.id}.csv`, [{ exam: record.exam, class: record.className, submitted: record.submitted, total: record.total, status: record.status }])} className="rounded-lg border border-[#D8E0EC] px-3 py-1.5 text-xs font-black text-[#071D49]">Export CSV</button>
          </div>,
        ])}
      />
    </Panel>
  );
}

function AssignmentsWorkspace({
  assignments,
  onStartAction,
  onMarkGraded,
}: {
  assignments: AssignmentRecord[];
  onStartAction: (action: TeacherAction, view: TeacherView, message: string) => void;
  onMarkGraded: (id: string) => void;
}) {
  return (
    <Panel title="Assignments" description="Create, publish, collect, grade, and track subject assignments." icon={ClipboardCheck}>
      <div className="mb-3">
        <button type="button" onClick={() => onStartAction("assignment", "assignments", "Assignment form opened.")} className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">Add Assignment</button>
      </div>
      <RecordTable
        columns={["Assignment", "Class", "Due", "Submitted", "Status", "Action"]}
        rows={assignments.map((record) => [
          record.title,
          record.className,
          record.dueDate,
          `${record.submitted}/${record.total}`,
          <StatusPill key="status" status={record.status} />,
          <button key="action" type="button" onClick={() => onMarkGraded(record.id)} className="rounded-lg border border-[#BFDBFE] px-3 py-1.5 text-xs font-black text-[#1D4ED8]">Mark Graded</button>,
        ])}
      />
    </Panel>
  );
}

function LmsWorkspace({
  resources,
  onStartAction,
  onPublishResource,
}: {
  resources: ResourceRecord[];
  onStartAction: (action: TeacherAction, view: TeacherView, message: string) => void;
  onPublishResource: (id: string) => void;
}) {
  return (
    <Panel title="LMS resources" description="Upload notes, publish learning files, and track class access." icon={UploadCloud}>
      <div className="mb-3">
        <button type="button" onClick={() => onStartAction("resource", "lms", "Lesson resource upload form opened.")} className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">Upload Notes</button>
      </div>
      <RecordTable
        columns={["Resource", "Class", "Type", "Status", "Action"]}
        rows={resources.map((record) => [
          record.title,
          record.className,
          record.type,
          <StatusPill key="status" status={record.status} />,
          <button key="action" type="button" onClick={() => onPublishResource(record.id)} className="rounded-lg border border-[#BFDBFE] px-3 py-1.5 text-xs font-black text-[#1D4ED8]">Publish</button>,
        ])}
      />
    </Panel>
  );
}

function CommunicationWorkspace({
  messages,
  onStartAction,
}: {
  messages: MessageRecord[];
  onStartAction: (action: TeacherAction, view: TeacherView, message: string) => void;
}) {
  return (
    <Panel title="Communication" description="Academic SMS, parent questions, class notices, and delivery logs." icon={MessageCircle}>
      <div className="mb-3">
        <button type="button" onClick={() => onStartAction("sms", "communication", "Parent SMS form opened.")} className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">Send SMS</button>
      </div>
      <RecordTable
        columns={["Audience", "Message", "Time", "Status"]}
        rows={messages.map((record) => [
          record.audience,
          record.body,
          record.time,
          <StatusPill key="status" status={record.status} />,
        ])}
      />
    </Panel>
  );
}

function CbtWorkspace({ onStartAction }: { onStartAction: (action: TeacherAction, view: TeacherView, message: string) => void }) {
  return (
    <Panel title="CBT exams" description="Start supervised tests, monitor progress, and review CBT submissions." icon={MonitorPlay}>
      <div className="grid gap-3 md:grid-cols-3">
        {["Start supervised test", "Review active submissions", "Export CBT results"].map((item) => (
          <button key={item} type="button" onClick={() => onStartAction("cbt", "cbt", `${item} opened.`)} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 text-left font-bold text-[#071D49]">
            {item}
          </button>
        ))}
      </div>
    </Panel>
  );
}

function PlanningWorkspace({
  title,
  description,
  icon,
  items,
  onStartAction,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  items: string[];
  onStartAction: (action: TeacherAction, view: TeacherView, message: string) => void;
}) {
  return (
    <Panel title={title} description={description} icon={icon}>
      <div className="grid gap-3 md:grid-cols-3">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onStartAction(item.toLowerCase().includes("report") || item.toLowerCase().includes("export") || item.toLowerCase().includes("pdf") || item.toLowerCase().includes("excel") ? "report" : null, "reports", `${item} opened.`)}
            className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 text-left font-bold text-[#071D49] transition hover:-translate-y-0.5 hover:shadow-md"
          >
            {item}
          </button>
        ))}
      </div>
    </Panel>
  );
}

function DetailPanelView({ detail, onClose }: { detail: DetailPanel; onClose: () => void }) {
  return (
    <section className="rounded-2xl border border-[#D8E0EC] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-[#071D49]">{detail.title}</h2>
        <button type="button" onClick={onClose} className="rounded-xl border border-[#D8E0EC] px-3 py-2 text-sm font-black text-[#071D49]">Close details</button>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {detail.rows.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-[#F8FAFC] p-3">
            <dt className="text-xs font-black uppercase tracking-[0.14em] text-[#64748B]">{label}</dt>
            <dd className="mt-1 text-sm font-black text-[#071D49]">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ActiveWorkspace({
  activeView,
  onViewChange,
  onStartAction,
  classes,
  markBatches,
  assignments,
  resources,
  messages,
  onOpenDetail,
  onMarkGraded,
  onPublishResource,
}: {
  activeView: TeacherView;
  onViewChange: (view: TeacherView) => void;
  onStartAction: (action: TeacherAction, view: TeacherView, message: string) => void;
  classes: ClassRecord[];
  markBatches: MarkBatch[];
  assignments: AssignmentRecord[];
  resources: ResourceRecord[];
  messages: MessageRecord[];
  onOpenDetail: (detail: DetailPanel) => void;
  onMarkGraded: (id: string) => void;
  onPublishResource: (id: string) => void;
}) {
  switch (activeView) {
    case "classes":
      return <ClassesWorkspace classes={classes} onStartAction={onStartAction} onOpenDetail={onOpenDetail} />;
    case "marks":
      return <MarksWorkspace markBatches={markBatches} onStartAction={onStartAction} />;
    case "assignments":
      return <AssignmentsWorkspace assignments={assignments} onStartAction={onStartAction} onMarkGraded={onMarkGraded} />;
    case "lms":
      return <LmsWorkspace resources={resources} onStartAction={onStartAction} onPublishResource={onPublishResource} />;
    case "cbt":
      return <CbtWorkspace onStartAction={onStartAction} />;
    case "communication":
      return <CommunicationWorkspace messages={messages} onStartAction={onStartAction} />;
    case "timetable":
      return <PlanningWorkspace title="Timetable" description="Upcoming lessons, cover lessons, room allocations, and teaching reminders." icon={CalendarDays} items={["Today: 6 lessons", "Room B4", "Cover: none", "Next: Form 3 East", "Prep reminder", "Weekly grid"]} onStartAction={onStartAction} />;
    case "reports":
      return <PlanningWorkspace title="Reports" description="Subject progress, marks, assignment, CBT, and class performance exports." icon={FileText} items={["Subject report", "Marks export", "Assignment summary", "CBT report", "PDF", "Excel"]} onStartAction={onStartAction} />;
    case "settings":
      return <PlanningWorkspace title="Settings" description="Teacher preferences, marking defaults, communication rules, and shortcuts." icon={Settings} items={["Notifications", "Marking defaults", "SMS settings", "LMS defaults", "Dashboard density", "Shortcuts"]} onStartAction={onStartAction} />;
    default:
      return <HomeWorkspace onViewChange={onViewChange} onStartAction={onStartAction} summaryCards={[]} />;
  }
}

export function TeacherCommandCenter({ routeMode }: { routeMode: TeacherRouteMode }) {
  const [activeView, setActiveView] = useState<TeacherView>("home");
  const [searchTerm, setSearchTerm] = useState("");
  const [notice, setNotice] = useState("Ready for today\u2019s teaching work.");
  const [activeAction, setActiveAction] = useState<TeacherAction>(null);
  const [classes, setClasses] = useState<ClassRecord[]>(initialClasses);
  const [markBatches, setMarkBatches] = useState<MarkBatch[]>(initialMarkBatches);
  const [assignments, setAssignments] = useState<AssignmentRecord[]>(initialAssignments);
  const [resources, setResources] = useState<ResourceRecord[]>(initialResources);
  const [messages, setMessages] = useState<MessageRecord[]>(initialMessages);
  const [activityLog, setActivityLog] = useState<string[]>(["Teacher dashboard opened for Kisumu Boys High School."]);
  const [detailPanel, setDetailPanel] = useState<DetailPanel | null>(null);
  const searchResults = searchTerm.trim()
    ? teacherSearchRecords.filter((record) => `${record.label} ${record.detail}`.toLowerCase().includes(searchTerm.trim().toLowerCase()))
    : [];
  const marksPending = markBatches.reduce((total, record) => total + Math.max(record.total - record.submitted, 0), 0);
  const assignmentsDue = assignments.filter((record) => record.status !== "Draft").length;
  const summaryCards: Array<[string, string, string]> = [
    ["Lessons Today", String(classes.length + 3), `${classes.filter((record) => record.attendance === "Submitted").length} registers submitted`],
    ["Marks Pending", String(marksPending), "Live from marks records"],
    ["Assignments Due", String(assignmentsDue), "Published or grading"],
    ["Messages", String(messages.length), "Parent and learner communication"],
  ];

  function openSearchRecord(record: (typeof teacherSearchRecords)[number]) {
    setActiveView(record.view);
    setNotice(`${record.label} opened.`);
    setSearchTerm("");
  }

  function recordActivity(message: string) {
    setNotice(message);
    setActivityLog((current) => [`${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${message}`, ...current].slice(0, 6));
  }

  function startAction(action: TeacherAction, view: TeacherView, message: string) {
    setActiveView(view);
    setActiveAction(action);
    recordActivity(message);
  }

  function submitAttendance(classId: string, absent: number) {
    const className = classes.find((record) => record.id === classId)?.name ?? "Class";
    setClasses((current) => current.map((record) => record.id === classId ? { ...record, attendance: "Submitted", absent: Math.max(absent, 0) } : record));
    setActiveAction(null);
    recordActivity(`${className} attendance submitted with ${Math.max(absent, 0)} absent learner(s).`);
  }

  function submitMarks(batchId: string, submitted: number) {
    const batch = markBatches.find((record) => record.id === batchId);
    setMarkBatches((current) => current.map((record) => {
      if (record.id !== batchId) return record;
      const safeSubmitted = Math.min(Math.max(submitted, 0), record.total);
      return { ...record, submitted: safeSubmitted, status: safeSubmitted >= record.total ? "Submitted" : "Open" };
    }));
    setActiveAction(null);
    recordActivity(`${batch?.exam ?? "Marks"} updated to ${submitted} submitted mark(s).`);
  }

  function submitAssignment(record: Omit<AssignmentRecord, "id" | "submitted" | "status">) {
    const newAssignment: AssignmentRecord = { ...record, id: `assignment-${Date.now()}`, submitted: 0, status: "Published" };
    setAssignments((current) => [newAssignment, ...current]);
    setActiveAction(null);
    recordActivity(`${record.title} published for ${record.className}.`);
  }

  function submitResource(record: Omit<ResourceRecord, "id" | "status">) {
    const newResource: ResourceRecord = { ...record, id: `resource-${Date.now()}`, status: "Draft" };
    setResources((current) => [newResource, ...current]);
    setActiveAction(null);
    recordActivity(`${record.title} uploaded as a draft for ${record.className}.`);
  }

  function submitSms(record: Omit<MessageRecord, "id" | "status" | "time">) {
    const newMessage: MessageRecord = {
      ...record,
      id: `sms-${Date.now()}`,
      status: "Sent",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((current) => [newMessage, ...current]);
    setActiveAction(null);
    recordActivity(`SMS sent to ${record.audience}.`);
  }

  function markAssignmentGraded(id: string) {
    const assignment = assignments.find((record) => record.id === id);
    setAssignments((current) => current.map((record) => record.id === id ? { ...record, submitted: record.total, status: "Grading" } : record));
    recordActivity(`${assignment?.title ?? "Assignment"} marked ready for grading feedback.`);
  }

  function publishResource(id: string) {
    const resource = resources.find((record) => record.id === id);
    setResources((current) => current.map((record) => record.id === id ? { ...record, status: "Published" } : record));
    recordActivity(`${resource?.title ?? "Resource"} published to learners.`);
  }

  return (
    <div data-route-mode={routeMode} className="h-screen overflow-hidden bg-[#F3F6FA] text-[#071D49]">
      <div className="grid h-full gap-4 p-3 lg:grid-cols-[292px_minmax(0,1fr)]">
        <Sidebar activeView={activeView} onViewChange={setActiveView} />
        <div className="min-h-0 overflow-hidden rounded-2xl border border-[#D8E0EC] bg-[#F3F6FA] shadow-[0_20px_70px_rgba(7,29,73,0.1)]">
          <Topbar
            searchTerm={searchTerm}
            searchResults={searchResults}
            onSearchTermChange={setSearchTerm}
            onSearchResult={openSearchRecord}
            onStartAction={startAction}
          />
          <main className="h-[calc(100%-84px)] overflow-y-auto p-4">
            <div className="space-y-4">
              <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 text-sm font-black text-[#1D4ED8]">
                {notice}
              </div>
              <ActionFormPanel
                key={activeAction ?? "none"}
                activeAction={activeAction}
                classes={classes}
                markBatches={markBatches}
                onClose={() => setActiveAction(null)}
                onSubmitAttendance={submitAttendance}
                onSubmitMarks={submitMarks}
                onSubmitAssignment={submitAssignment}
                onSubmitResource={submitResource}
                onSubmitSms={submitSms}
              />
              {activeView === "home" ? (
                <HomeWorkspace onViewChange={setActiveView} onStartAction={startAction} summaryCards={summaryCards} />
              ) : (
                <ActiveWorkspace
                  activeView={activeView}
                  onViewChange={setActiveView}
                  onStartAction={startAction}
                  classes={classes}
                  markBatches={markBatches}
                  assignments={assignments}
                  resources={resources}
                  messages={messages}
                  onOpenDetail={setDetailPanel}
                  onMarkGraded={markAssignmentGraded}
                  onPublishResource={publishResource}
                />
              )}
              {detailPanel ? <DetailPanelView detail={detailPanel} onClose={() => setDetailPanel(null)} /> : null}
              <section className="rounded-2xl border border-[#D8E0EC] bg-white p-4 shadow-sm">
                <h2 className="text-lg font-black text-[#071D49]">Recent teacher actions</h2>
                <div className="mt-3 space-y-2">
                  {activityLog.map((item) => (
                    <p key={item} className="rounded-xl bg-[#F8FAFC] px-3 py-2 text-sm font-semibold text-[#64748B]">{item}</p>
                  ))}
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
