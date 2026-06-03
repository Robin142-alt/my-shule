"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Archive,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileSpreadsheet,
  GraduationCap,
  LockKeyhole,
  Search,
  UploadCloud,
  type LucideIcon,
} from "lucide-react";

import type { WidgetState } from "@/lib/capability-engine/school-capability-engine";
import { addSchoolRecord, getCurrentSchoolId } from "@/lib/school/school-operational-store";

type ExamsManagerRouteMode = "hosted" | "public";
type Tone = "success" | "info" | "warning" | "danger" | "neutral";
type ExamsManagerView =
  | "overview"
  | "builder"
  | "scheduler"
  | "marks"
  | "grading"
  | "drafts"
  | "submissions"
  | "validation"
  | "exports"
  | "archive";

type ExamsManagerWidgetCapability = {
  state: WidgetState;
  reason?: string;
};

type ExamsManagerWidget = {
  id: ExamsManagerView;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: Tone;
  hasData: boolean;
};

type SavedExamConfiguration = {
  id: string;
  title: string;
  status: string;
  reviewer: string;
  savedAt: string;
};

const examsSearchRecords = [
  { id: "form-4-mock", label: "Form 4 Mock Series", detail: "Marks entry open for Mathematics and English", view: "marks" },
  { id: "class-7-cat", label: "Class 7 CAT", detail: "Three subjects awaiting teacher upload", view: "submissions" },
  { id: "chem-upload", label: "Chemistry upload issue", detail: "Marks above allowed range", view: "validation" },
  { id: "draft-batch", label: "Report card draft batch", detail: "Awaiting Dean review", view: "drafts" },
] satisfies Array<{ id: string; label: string; detail: string; view: ExamsManagerView }>;

type ExamsSearchRecord = (typeof examsSearchRecords)[number];

const lockedMessage = "Exams module not enabled for this school";

const navItems: Array<{ id: ExamsManagerView; label: string; icon: LucideIcon }> = [
  { id: "overview", label: "Overview", icon: GraduationCap },
  { id: "builder", label: "Exam Builder", icon: ClipboardList },
  { id: "scheduler", label: "Timetable Scheduler", icon: CalendarDays },
  { id: "marks", label: "Marks Entry Hub", icon: UploadCloud },
  { id: "grading", label: "Grade Processing", icon: BarChart3 },
  { id: "drafts", label: "Report Card Drafts", icon: FileSpreadsheet },
  { id: "submissions", label: "Submission Tracker", icon: ClipboardCheck },
  { id: "validation", label: "Data Validation", icon: AlertTriangle },
  { id: "exports", label: "Export Center", icon: FileSpreadsheet },
  { id: "archive", label: "Archive", icon: Archive },
];

const widgets: ExamsManagerWidget[] = [
  {
    id: "overview",
    title: "Exam Overview",
    description: "Active exams, upcoming assessments, completion progress, and pending marks entry.",
    icon: GraduationCap,
    tone: "info",
    hasData: true,
  },
  {
    id: "builder",
    title: "Exam Builder",
    description: "Create exam shells with class selection, subject mapping, weighting rules, and term alignment.",
    icon: ClipboardList,
    tone: "success",
    hasData: true,
  },
  {
    id: "scheduler",
    title: "Timetable Scheduler",
    description: "Auto-schedule assessments while detecting subject clashes, room constraints, and class overlaps.",
    icon: CalendarDays,
    tone: "warning",
    hasData: true,
  },
  {
    id: "marks",
    title: "Marks Entry Hub",
    description: "Subject-based mark entry, Bulk Excel upload, per-class grading view, and Submission tracking per teacher.",
    icon: UploadCloud,
    tone: "danger",
    hasData: true,
  },
  {
    id: "grading",
    title: "Grade Processing",
    description: "Convert raw marks to grades using CBC strands, 8-4-4, international rules, and weighted scoring.",
    icon: BarChart3,
    tone: "info",
    hasData: true,
  },
  {
    id: "drafts",
    title: "Report Card Draft Generator",
    description: "Generate DRAFT only report cards before Dean review. No direct parent visibility is available here.",
    icon: FileSpreadsheet,
    tone: "warning",
    hasData: true,
  },
  {
    id: "submissions",
    title: "Submission Tracker",
    description: "Teacher submission completeness, missing subjects, late submissions, and class completion percentages.",
    icon: ClipboardCheck,
    tone: "success",
    hasData: true,
  },
  {
    id: "validation",
    title: "Data Validation",
    description: "Catch Missing marks, Invalid grade ranges, Duplicate entries, and Subject mismatches before Dean review.",
    icon: AlertTriangle,
    tone: "danger",
    hasData: true,
  },
  {
    id: "exports",
    title: "Export Center",
    description: "Internal exports for Excel marksheets, draft report cards, and class summaries only.",
    icon: FileSpreadsheet,
    tone: "neutral",
    hasData: true,
  },
  {
    id: "archive",
    title: "Archive",
    description: "Historical exams, previous drafts, and admin-only reprocessing access.",
    icon: Archive,
    tone: "neutral",
    hasData: false,
  },
];

const toneClasses: Record<Tone, { chip: string; card: string; icon: string; dot: string; text: string }> = {
  success: {
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    card: "border-emerald-100 bg-emerald-50/80",
    icon: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
  },
  info: {
    chip: "border-blue-200 bg-blue-50 text-blue-700",
    card: "border-blue-100 bg-blue-50/80",
    icon: "bg-blue-100 text-blue-700",
    dot: "bg-blue-500",
    text: "text-blue-700",
  },
  warning: {
    chip: "border-amber-200 bg-amber-50 text-amber-700",
    card: "border-amber-100 bg-amber-50/80",
    icon: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
    text: "text-amber-700",
  },
  danger: {
    chip: "border-rose-200 bg-rose-50 text-rose-700",
    card: "border-rose-100 bg-rose-50/80",
    icon: "bg-rose-100 text-rose-700",
    dot: "bg-rose-500",
    text: "text-rose-700",
  },
  neutral: {
    chip: "border-slate-200 bg-slate-50 text-slate-700",
    card: "border-slate-200 bg-white/90",
    icon: "bg-slate-100 text-slate-700",
    dot: "bg-slate-400",
    text: "text-slate-700",
  },
};

export function resolveExamsManagerWidgetState(input: {
  examsEnabled: boolean;
  rolePermitted: boolean;
  hasData: boolean;
}): ExamsManagerWidgetCapability {
  if (!input.examsEnabled) {
    return { state: "LOCKED", reason: lockedMessage };
  }

  if (!input.rolePermitted) {
    return { state: "LOCKED", reason: "Role not permitted to manage exam preparation" };
  }

  return { state: input.hasData ? "ACTIVE" : "EMPTY" };
}

function StatusChip({ state, tone }: { state: WidgetState; tone: Tone }) {
  const style = state === "LOCKED" ? toneClasses.neutral : toneClasses[tone];
  const label = state === "ACTIVE" ? "Ready" : state === "EMPTY" ? "Clear" : state === "LOCKED" ? "Unavailable" : "Needs attention";
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${style.chip}`}>
      <span className={`h-2 w-2 rounded-full ${state === "LOCKED" ? "bg-slate-400" : style.dot}`} />
      {label}
    </span>
  );
}

function ActionButton({ children, tone = "info", onClick }: { children: ReactNode; tone?: Tone; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border border-[#C7D4E6] bg-white px-3 py-2 text-sm font-black shadow-sm transition hover:-translate-y-0.5 hover:border-[#0B63CE] ${toneClasses[tone].text}`}
    >
      {children}
    </button>
  );
}

function LockedWidget({ widget }: { widget: ExamsManagerWidget }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-slate-100 p-3 text-slate-600">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-black text-[#071D49]">{widget.title}</h3>
            <p className="mt-1 text-sm text-[#64748B]">{lockedMessage}</p>
          </div>
        </div>
        <StatusChip state="LOCKED" tone="neutral" />
      </div>
    </div>
  );
}

function WidgetFrame({
  widget,
  capability,
  children,
}: {
  widget: ExamsManagerWidget;
  capability: ExamsManagerWidgetCapability;
  children: ReactNode;
}) {
  if (capability.state === "LOCKED") {
    return <LockedWidget widget={widget} />;
  }

  const Icon = widget.icon;
  return (
    <section className={`rounded-2xl border p-5 shadow-[0_18px_50px_rgba(7,29,73,0.08)] ${toneClasses[widget.tone].card}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`rounded-2xl p-3 ${toneClasses[widget.tone].icon}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-[#071D49]">{widget.title}</h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[#64748B]">{widget.description}</p>
          </div>
        </div>
        <StatusChip state={capability.state} tone={widget.tone} />
      </div>
      <div className="mt-5">{capability.state === "EMPTY" ? <EmptyWidget /> : children}</div>
    </section>
  );
}

function EmptyWidget() {
  return (
    <div className="rounded-2xl border border-dashed border-[#C7D4E6] bg-white/75 p-5 text-sm font-bold text-[#64748B]">
      No exams created yet. Create the first exam record to start this desk.
    </div>
  );
}

function MetricTile({ label, value, helper, tone }: { label: string; value: string; helper: string; tone: Tone }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/82 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#64748B]">{label}</p>
        <span className={`h-2.5 w-2.5 rounded-full ${toneClasses[tone].dot}`} />
      </div>
      <p className="mt-3 text-3xl font-black text-[#071D49]">{value}</p>
      <p className="mt-1 text-sm font-bold text-[#64748B]">{helper}</p>
    </div>
  );
}

function ListRow({ title, detail, value, tone = "neutral" }: { title: string; detail: string; value: string; tone?: Tone }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#D9E2EF] bg-white/78 p-4">
      <div>
        <p className="font-black text-[#071D49]">{title}</p>
        <p className="mt-1 text-sm font-semibold text-[#64748B]">{detail}</p>
      </div>
      <span className={`rounded-full border px-3 py-1 text-xs font-black ${toneClasses[tone].chip}`}>{value}</span>
    </div>
  );
}

function OverviewGrid({
  capabilities,
}: {
  capabilities: Map<ExamsManagerView, ExamsManagerWidgetCapability>;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {widgets.map((widget) => {
        const capability = capabilities.get(widget.id) ?? { state: "LOCKED" as WidgetState, reason: lockedMessage };
        return (
          <WidgetFrame key={widget.id} widget={widget} capability={capability}>
            <div className="grid gap-3 sm:grid-cols-2">
              <ListRow title="Current progress" detail={widget.description} value={capability.state === "ACTIVE" ? "Ready" : capability.state === "EMPTY" ? "Clear" : "Unavailable"} tone={widget.tone} />
              <ListRow title="Approval step" detail="Output remains internal until Dean review receives the batch." value="Safe" tone="success" />
            </div>
          </WidgetFrame>
        );
      })}
    </div>
  );
}

function ActiveWidgetContent({
  view,
  onNotice,
  onSaveConfiguration,
  savedConfigurations,
}: {
  view: ExamsManagerView;
  onNotice: (message: string) => void;
  onSaveConfiguration: () => void;
  savedConfigurations: SavedExamConfiguration[];
}) {
  if (view === "overview") {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          <MetricTile label="Active exams" value="6" helper="2 in marks entry" tone="info" />
          <MetricTile label="Upcoming exams" value="4" helper="Timetable next week" tone="warning" />
          <MetricTile label="Completion progress" value="78%" helper="Across Form 1-4" tone="success" />
          <MetricTile label="Pending marks entry" value="20%" helper="Missing subject marks" tone="danger" />
        </div>
        <div className="grid gap-3">
          <ListRow title="Form 4 Mock Series" detail="Marks entry open for Mathematics and English" value="In progress" tone="warning" />
          <ListRow title="Form 2 Endterm" detail="Ready for validation after grade processing" value="Complete" tone="success" />
          <ListRow title="Class 7 CAT" detail="Three subjects still awaiting teacher upload" value="Pending" tone="danger" />
        </div>
      </div>
    );
  }

  if (view === "builder") {
    return (
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-[#D9E2EF] bg-white/80 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {["Midterm", "Endterm", "Mock", "CAT"].map((type) => (
              <div key={type} className="rounded-xl border border-[#D9E2EF] bg-[#F8FAFC] p-3 font-black text-[#071D49]">
                {type}
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <ListRow title="class selection" detail="Assign target classes and streams" value="Mapped" tone="success" />
            <ListRow title="subject mapping" detail="Attach subjects by class scope" value="12 subjects" tone="info" />
            <ListRow title="weighting rules" detail="Term-aligned scoring profile" value="Ready" tone="warning" />
          </div>
        </div>
        <div className="rounded-2xl border border-[#D9E2EF] bg-white/80 p-4">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#64748B]">Allowed actions</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <ActionButton tone="success" onClick={() => onNotice("Exam draft form opened.")}>Create exam draft</ActionButton>
            <ActionButton onClick={onSaveConfiguration}>Save configuration</ActionButton>
            <ActionButton tone="warning" onClick={() => onNotice("Term alignment check completed with timetable warnings visible.")}>Check term alignment</ActionButton>
          </div>
          <div className="mt-4 space-y-2">
            {savedConfigurations.length > 0 ? (
              savedConfigurations.map((configuration) => (
                <ListRow
                  key={configuration.id}
                  title={configuration.title}
                  detail={`Saved ${configuration.savedAt} for ${configuration.reviewer}`}
                  value={configuration.status}
                  tone="success"
                />
              ))
            ) : (
              <ListRow title="Saved configurations" detail="No exam configuration has been saved for review yet." value="Empty" tone="neutral" />
            )}
          </div>
        </div>
      </div>
    );
  }

  if (view === "scheduler") {
    return (
      <div className="grid gap-3">
        <ListRow title="Auto-scheduling engine" detail="Balances rooms, subject order, and class overlaps." value="Queued" tone="info" />
        <ListRow title="Subject clashes" detail="2 possible clashes detected for Form 3 Science block." value="Warning" tone="warning" />
        <ListRow title="Room constraints" detail="Lab sessions protected from double booking." value="Protected" tone="success" />
        <ListRow title="Class overlaps" detail="No class is assigned to simultaneous papers." value="Clear" tone="success" />
      </div>
    );
  }

  if (view === "marks") {
    return (
      <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <div className="space-y-3">
          <ListRow title="Subject-based mark entry" detail="Mathematics Form 4 North is 88% complete." value="In progress" tone="warning" />
          <ListRow title="Bulk Excel upload" detail="Validated template import for 320 learners." value="Ready" tone="success" />
          <ListRow title="Per-class grading view" detail="Teachers only see assigned class and subject scopes." value="Scoped" tone="info" />
          <ListRow title="Submission tracking per teacher" detail="Late uploads are flagged for accountability." value="Live" tone="danger" />
        </div>
        <div className="rounded-2xl border border-[#D9E2EF] bg-white/80 p-4">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#64748B]">Entry states</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["Pending", "In progress", "Completed", "Late submission flagged"].map((state, index) => (
              <span
                key={state}
                className={`rounded-full border px-3 py-1 text-xs font-black ${
                  index === 2 ? toneClasses.success.chip : index === 3 ? toneClasses.danger.chip : toneClasses.warning.chip
                }`}
              >
                {state}
              </span>
            ))}
          </div>
          <div className="mt-4">
            <ActionButton tone="info" onClick={() => onNotice("Marks entry sheet opened for selected class and subject.")}>Enter marks</ActionButton>
          </div>
        </div>
      </div>
    );
  }

  if (view === "grading") {
    return (
      <div className="grid gap-3">
        <ListRow title="CBC strands / 8-4-4 / International grading" detail="Model selected per school curriculum setup." value="Configured" tone="success" />
        <ListRow title="Weighted scoring rules" detail="Midterm 30%, Endterm 70%, practical weight included where needed." value="Active" tone="info" />
        <ListRow title="Grade boundaries configuration" detail="Boundary changes version-controlled before computation." value="Locked draft" tone="warning" />
        <ListRow title="Raw marks -> grades" detail="Class ranking remains preliminary only before approval chain." value="Preliminary" tone="neutral" />
      </div>
    );
  }

  if (view === "drafts") {
    return (
      <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <div className="space-y-3">
          <ListRow title="DRAFT only" detail="Report cards remain in preparation state for Dean review." value="Draft" tone="warning" />
          <ListRow title="Student marks and grades" detail="Generated from processed marks and grading boundaries." value="Ready" tone="success" />
          <ListRow title="Teacher remarks draft" detail="Remarks are collected but remain editable before review handoff." value="Open" tone="info" />
          <ListRow title="Attendance summary" detail="Included when school attendance records are connected." value="Optional" tone="neutral" />
        </div>
        <div className="rounded-2xl border border-[#D9E2EF] bg-white/80 p-4">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#64748B]">Next pipeline action</p>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#64748B]">
            Generate report card draft batches and hand them to the Dean gate. The Exams Manager cannot approve report cards or expose parent-facing results.
          </p>
          <div className="mt-4">
            <ActionButton tone="warning" onClick={() => onNotice("Draft report card batch sent to Dean review queue.")}>Send to Dean review</ActionButton>
          </div>
        </div>
      </div>
    );
  }

  if (view === "submissions") {
    return (
      <div className="grid gap-3">
        <ListRow title="Teachers who submitted marks" detail="42 of 51 teachers submitted at least one subject." value="82%" tone="success" />
        <ListRow title="Missing subjects" detail="Class 7B missing 3 subjects marks." value="3 gaps" tone="danger" />
        <ListRow title="Late submissions" detail="Two teachers missed the 4 PM cutoff." value="Flagged" tone="warning" />
        <ListRow title="Completion percentage per class" detail="Form 2 West leads at 96% completion." value="Live" tone="info" />
      </div>
    );
  }

  if (view === "validation") {
    return (
      <div className="grid gap-3">
        <ListRow title="Missing marks" detail="Twenty learner records require teacher completion." value="Critical" tone="danger" />
        <ListRow title="Invalid grade ranges" detail="One Chemistry upload has marks above allowed range." value="Review" tone="warning" />
        <ListRow title="Duplicate entries" detail="Two duplicated admission numbers detected in imported marksheet." value="Blocked" tone="danger" />
        <ListRow title="Subject mismatches" detail="Agriculture upload mapped to wrong stream." value="Fix" tone="warning" />
      </div>
    );
  }

  if (view === "exports") {
    return (
      <div className="grid gap-3">
        <ListRow title="Excel marksheets" detail="Internal quality control export for exams office." value="Internal" tone="info" />
        <ListRow title="Draft report cards" detail="Watermarked draft batch for review teams only." value="Draft" tone="warning" />
        <ListRow title="Class summaries" detail="Aggregated class summary for Dean intake." value="Review" tone="success" />
        <ListRow title="No parent-facing exports" detail="Parent visibility starts after the approval chain completes." value="Blocked" tone="danger" />
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <ListRow title="Past exam records" detail="Term 1 and Term 2 exam batches retained." value="Available" tone="success" />
      <ListRow title="Previous drafts" detail="Draft versions can be compared for audit only." value="Versioned" tone="info" />
      <ListRow title="Reprocessing access" detail="Restricted to administrators with audited reason codes." value="Admin only" tone="warning" />
    </div>
  );
}

function MainWorkspace({
  view,
  capabilities,
  onNotice,
  onSaveConfiguration,
  savedConfigurations,
}: {
  view: ExamsManagerView;
  capabilities: Map<ExamsManagerView, ExamsManagerWidgetCapability>;
  onNotice: (message: string) => void;
  onSaveConfiguration: () => void;
  savedConfigurations: SavedExamConfiguration[];
}) {
  if (view === "overview") {
    return <OverviewGrid capabilities={capabilities} />;
  }

  const widget = widgets.find((item) => item.id === view) ?? widgets[0];
  const capability = capabilities.get(widget.id) ?? { state: "LOCKED" as WidgetState, reason: lockedMessage };

  return (
    <WidgetFrame widget={widget} capability={capability}>
      <ActiveWidgetContent
        view={view}
        onNotice={onNotice}
        onSaveConfiguration={onSaveConfiguration}
        savedConfigurations={savedConfigurations}
      />
    </WidgetFrame>
  );
}

export function ExamsManagerCommandCenter({
  routeMode,
  examsEnabled = true,
  rolePermitted = true,
}: {
  routeMode: ExamsManagerRouteMode;
  examsEnabled?: boolean;
  rolePermitted?: boolean;
}) {
  const [activeView, setActiveView] = useState<ExamsManagerView>("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [notice, setNotice] = useState("Exams desk ready for exam setup, marks entry, validation, and draft report cards.");
  const [savedConfigurations, setSavedConfigurations] = useState<SavedExamConfiguration[]>([]);
  const capabilities = useMemo(() => {
    return new Map(
      widgets.map((widget) => [
        widget.id,
        resolveExamsManagerWidgetState({
          examsEnabled,
          rolePermitted,
          hasData: widget.hasData,
        }),
      ]),
    );
  }, [examsEnabled, rolePermitted]);
  const searchResults = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return [];

    return examsSearchRecords.filter((record) =>
      [record.label, record.detail, record.view].some((value) => value.toLowerCase().includes(query)),
    );
  }, [searchTerm]);

  const activeCapability = capabilities.get(activeView);

  function openSearchRecord(record: ExamsSearchRecord) {
    setActiveView(record.view);
    setSearchTerm("");
    setNotice(`${record.label} opened in exams records.`);
  }

  function saveExamConfiguration() {
    const savedAt = new Date().toLocaleString("en-KE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const configuration: SavedExamConfiguration = {
      id: `exam-config-${Date.now()}`,
      title: "Form 4 Mock Series configuration",
      status: "Dean review",
      reviewer: "Dean of Academics",
      savedAt,
    };

    addSchoolRecord(
      "exam-configurations",
      {
        ...configuration,
        examName: "Form 4 Mock Series",
        term: "Term 2 2026",
        classes: ["Form 4 North", "Form 4 South"],
        subjects: ["Mathematics", "English", "Kiswahili", "Chemistry"],
        savedByRole: "Exams Manager",
      },
      getCurrentSchoolId(),
    );
    setSavedConfigurations((current) => [configuration, ...current].slice(0, 4));
    setNotice("Exam configuration saved for Dean review.");
  }

  return (
    <div data-route-mode={routeMode} className="h-screen overflow-hidden bg-[#EEF3F8] text-[#071D49]">
      <div className="flex h-full">
        <aside className="hidden w-[286px] shrink-0 border-r border-white/15 bg-[#071D49] p-5 text-white shadow-2xl lg:flex lg:flex-col">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#8BB9FF]">MyShule Exams</p>
            <h2 className="mt-3 text-2xl font-black">Exams Manager</h2>
            <p className="mt-2 text-sm leading-6 text-blue-100">Exam preparation and school records desk.</p>
          </div>
          <nav aria-label="Exams Manager navigation" className="mt-8 flex-1 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const selected = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveView(item.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
                    selected ? "bg-white text-[#071D49] shadow-lg" : "text-blue-100 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-sm text-blue-100">
            <p className="font-black text-white">Access</p>
            <p className="mt-1">School exams desk</p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-[#D9E2EF] bg-white/86 px-4 py-4 backdrop-blur md:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#64748B]">Exam setup and report cards</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">
                  Exams Manager Desk
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative hidden items-center gap-2 rounded-2xl border border-[#D9E2EF] bg-[#F8FAFC] px-3 py-2 text-sm font-bold text-[#64748B] md:flex">
                  <Search className="h-4 w-4" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && searchResults[0]) {
                        openSearchRecord(searchResults[0]);
                      }
                    }}
                    aria-label="Search exams, classes, subjects, marks, or report cards"
                    placeholder="Search exams, classes, subjects"
                    className="w-64 bg-transparent text-sm font-bold outline-none placeholder:text-[#64748B]"
                  />
                  {searchTerm.trim().length > 0 ? (
                    <div className="absolute right-0 top-12 z-30 w-96 overflow-hidden rounded-2xl border border-[#D9E2EF] bg-white text-[#071D49] shadow-2xl">
                      {searchResults.length > 0 ? (
                        searchResults.map((record) => (
                          <button key={record.id} type="button" onClick={() => openSearchRecord(record)} className="block w-full px-4 py-3 text-left hover:bg-blue-50">
                            <span className="block font-black">{record.label}</span>
                            <span className="mt-1 block text-xs font-semibold text-[#64748B]">{record.detail}</span>
                          </button>
                        ))
                      ) : (
                        <p className="px-4 py-3 text-sm font-bold text-[#64748B]">No matching exam record found.</p>
                      )}
                    </div>
                  ) : null}
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Ready for Dean review
                </span>
              </div>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8">
            <div role="status" className="mb-5 rounded-2xl border border-[#D9E2EF] bg-white px-4 py-3 text-sm font-black text-[#071D49] shadow-sm">
              {notice}
            </div>
            <section className="mb-6 rounded-3xl border border-[#D9E2EF] bg-gradient-to-br from-[#071D49] via-[#0B3478] to-[#0B63CE] p-6 text-white shadow-[0_28px_70px_rgba(7,29,73,0.18)]">
              <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-100">Exams Manager Dashboard</p>
                  <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
                    Exam setup, marks, and report card preparation.
                  </h2>
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-blue-50 md:text-base">
                    Create assessments, schedule timetables, coordinate marks entry, process grades, validate data, and generate report cards at draft stage only.
                  </p>
                  <p className="mt-4 text-sm font-black text-blue-100">
                    Exams Manager -&gt; Dean Review -&gt; Principal Approval -&gt; Publishing -&gt; Parents
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <MetricTile label="Draft batches" value="12" helper="Awaiting Dean intake" tone="warning" />
                  <MetricTile label="Validation score" value="94%" helper="6 checks active" tone="success" />
                </div>
              </div>
            </section>

            {activeCapability?.state === "LOCKED" && (
              <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-[#64748B]">
                {activeCapability.reason}
              </div>
            )}

            <MainWorkspace
              view={activeView}
              capabilities={capabilities}
              onNotice={setNotice}
              onSaveConfiguration={saveExamConfiguration}
              savedConfigurations={savedConfigurations}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
