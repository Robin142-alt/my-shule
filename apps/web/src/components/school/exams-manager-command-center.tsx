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
import { getCurrentSchoolId, publishSchoolOperationalEvent } from "@/lib/school/school-operational-store";
import { useQueryClient } from "@tanstack/react-query";
import { useSchoolMutation } from "@/lib/data/school-hooks";
import { downloadCsvFile, openPrintDocument } from "@/lib/dashboard/export";
import { ApprovalInbox } from "@/components/shared/approval-inbox";
import { NotificationBell } from "@/components/shared/notification-bell";
import { TaskQueue } from "@/components/shared/task-queue";
import { WorkflowToast } from "@/components/shared/workflow-toast";

type ExamsManagerRouteMode = "hosted" | "public";
type Tone = "success" | "info" | "warning" | "danger" | "neutral";
type ExamsManagerView =
  | "overview"
  | "builder"
  | "scheduler"
  | "marks"
  | "missing-marks"
  | "grading"
  | "moderation"
  | "drafts"
  | "report-templates"
  | "academic-analytics"
  | "submissions"
  | "validation"
  | "exports"
  | "audit-log"
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

type ExamOperationalRecord = {
  id: string;
  title: string;
  detail: string;
  status: string;
  createdAt: string;
};

type LifecycleActionMode = "queued" | "completed";

type LifecycleQueueRecord = {
  id: string;
  title: string;
  detail: string;
  status: string;
  owner: string;
  tone: Tone;
};

type LifecycleQueueConfig = {
  title: string;
  description: string;
  itemLabel: string;
  records: LifecycleQueueRecord[];
  actions: Array<{
    label: string;
    mode: LifecycleActionMode;
    targetRoles: string[];
    notificationTitle: string;
  }>;
};

const examsSearchRecords = [
  { id: "form-4-mock", label: "Form 4 Mock Series", detail: "Marks entry open for Mathematics and English", view: "marks" },
  { id: "class-7-cat", label: "Class 7 CAT", detail: "Three subjects awaiting teacher upload", view: "submissions" },
  { id: "chem-upload", label: "Chemistry upload issue", detail: "Marks above allowed range", view: "validation" },
  { id: "draft-batch", label: "Report card draft batch", detail: "Awaiting Dean review", view: "drafts" },
] satisfies Array<{ id: string; label: string; detail: string; view: ExamsManagerView }>;

type ExamsSearchRecord = (typeof examsSearchRecords)[number];

const lockedMessage = "Exams module not enabled for this school";

const lifecycleWorkQueues: Partial<Record<ExamsManagerView, LifecycleQueueConfig>> = {
  scheduler: {
    title: "Entry Windows Work Queue",
    description: "Select the exact exam entry windows before opening, extending, closing, reopening, or locking entry.",
    itemLabel: "entry window",
    records: [
      {
        id: "entry-form-3-science",
        title: "Form 3 Science block",
        detail: "Biology, Chemistry, and Physics entry window for Form 3 East and West.",
        status: "Ready to open",
        owner: "Science HOD",
        tone: "warning",
      },
      {
        id: "entry-grade-8-cbc",
        title: "Grade 8 CBC Mathematics",
        detail: "CBC/CBE mathematics observation entry for Grade 8 Unity.",
        status: "Open",
        owner: "Mathematics HOD",
        tone: "info",
      },
    ],
    actions: [
      {
        label: "Open Entry",
        mode: "queued",
        targetRoles: ["Teacher", "Head of Department", "Dean of Academics"],
        notificationTitle: "Exam entry window update queued",
      },
      {
        label: "Close Entry",
        mode: "completed",
        targetRoles: ["Head of Department", "Dean of Academics"],
        notificationTitle: "Exam entry window closed",
      },
      {
        label: "Reopen for Correction",
        mode: "queued",
        targetRoles: ["Teacher", "Head of Department"],
        notificationTitle: "Exam entry correction window queued",
      },
    ],
  },
  marks: {
    title: "Mark Entry Monitor Work Queue",
    description: "Select teacher marksheets before reminder, reopen, lock, or status export actions.",
    itemLabel: "mark entry record",
    records: [
      {
        id: "marks-maths-form-4-north",
        title: "Mathematics Form 4 North",
        detail: "42 of 48 marks entered. 6 learner marks still pending before HOD review.",
        status: "In progress",
        owner: "Mr. Otieno",
        tone: "warning",
      },
      {
        id: "marks-english-form-2-west",
        title: "English Form 2 West",
        detail: "Teacher submitted the marksheet and is waiting for HOD review.",
        status: "Submitted",
        owner: "Ms. Achieng",
        tone: "success",
      },
    ],
    actions: [
      {
        label: "Send Reminder",
        mode: "queued",
        targetRoles: ["Teacher", "Head of Department"],
        notificationTitle: "Marks entry reminder queued",
      },
      {
        label: "Lock Sheet",
        mode: "completed",
        targetRoles: ["Head of Department", "Dean of Academics"],
        notificationTitle: "Marks sheet locked",
      },
      {
        label: "Export Status",
        mode: "queued",
        targetRoles: ["Exams Manager", "Dean of Academics"],
        notificationTitle: "Marks status export queued",
      },
    ],
  },
  "missing-marks": {
    title: "Missing Marks Work Queue",
    description: "Select only the affected learner/subject records before notifying teachers or marking valid exceptions.",
    itemLabel: "missing mark record",
    records: [
      {
        id: "missing-class-7b-science",
        title: "Class 7B Science",
        detail: "3 learner marks missing from the Science marksheet.",
        status: "Teacher follow-up required",
        owner: "Mrs. Wanjiru",
        tone: "danger",
      },
      {
        id: "missing-form-2-west-maths",
        title: "Form 2 West Mathematics",
        detail: "14 learner marks need confirmation before report generation.",
        status: "Incomplete",
        owner: "Mr. Ouma",
        tone: "warning",
      },
    ],
    actions: [
      {
        label: "Notify Teacher",
        mode: "queued",
        targetRoles: ["Teacher", "Head of Department"],
        notificationTitle: "Missing marks follow-up queued",
      },
      {
        label: "Mark Absent",
        mode: "completed",
        targetRoles: ["Head of Department", "Class Teacher"],
        notificationTitle: "Missing mark exception recorded",
      },
      {
        label: "Reassign Teacher",
        mode: "queued",
        targetRoles: ["Head of Department", "Dean of Academics"],
        notificationTitle: "Teacher reassignment queued",
      },
    ],
  },
  moderation: {
    title: "Moderation Work Queue",
    description: "Review exact moderation records before sending validated data to the Dean quality gate.",
    itemLabel: "moderation record",
    records: [
      {
        id: "moderation-term-2-cat-1",
        title: "Term 2 CAT 1 moderation",
        detail: "Validated marks, grade distribution, and exception notes ready for Dean review.",
        status: "Ready",
        owner: "Exams Manager",
        tone: "success",
      },
      {
        id: "moderation-hybrid-cbc",
        title: "Hybrid CBC + Marks checks",
        detail: "Competency observations and marks supplement need separate quality review.",
        status: "Review",
        owner: "Dean intake",
        tone: "info",
      },
    ],
    actions: [
      {
        label: "Approve selected to Dean review",
        mode: "completed",
        targetRoles: ["Dean of Academics", "Principal"],
        notificationTitle: "Moderation records sent to Dean review",
      },
      {
        label: "Return for Correction",
        mode: "queued",
        targetRoles: ["Teacher", "Head of Department"],
        notificationTitle: "Moderation correction queued",
      },
      {
        label: "Flag Outlier",
        mode: "queued",
        targetRoles: ["Head of Department", "Dean of Academics"],
        notificationTitle: "Moderation outlier queued",
      },
    ],
  },
  drafts: {
    title: "Report Cards Work Queue",
    description: "Select report-card draft batches before generation, preview, download, print, regeneration, or Dean handoff.",
    itemLabel: "report card batch",
    records: [
      {
        id: "draft-term-2-cat-1",
        title: "Term 2 CAT 1 report card draft batch",
        detail: "412 draft cards, 22 validation notes, and no parent visibility yet.",
        status: "Draft",
        owner: "Dean review queue",
        tone: "warning",
      },
      {
        id: "draft-grade-8-cbc",
        title: "Grade 8 CBC report batch",
        detail: "96 competency reports ready after observation checks.",
        status: "Ready to generate",
        owner: "Exams office",
        tone: "success",
      },
    ],
    actions: [
      {
        label: "Generate Selected",
        mode: "queued",
        targetRoles: ["Exams Manager", "Dean of Academics"],
        notificationTitle: "Report card generation queued",
      },
      {
        label: "Preview Selected",
        mode: "completed",
        targetRoles: ["Exams Manager"],
        notificationTitle: "Report card preview ready",
      },
      {
        label: "Send to Dean Review",
        mode: "queued",
        targetRoles: ["Dean of Academics", "Principal"],
        notificationTitle: "Report card draft batch queued for Dean",
      },
    ],
  },
  "report-templates": {
    title: "Report Templates Work Queue",
    description: "Select the template records before saving drafts or preparing print previews.",
    itemLabel: "report template",
    records: [
      {
        id: "template-cbc-cbe",
        title: "CBC/CBE Competency Report",
        detail: "Descriptors, observations, parent support, verification, and mobile parent view.",
        status: "Default",
        owner: "Exams office",
        tone: "success",
      },
      {
        id: "template-hybrid",
        title: "Hybrid CBC + Marks Report",
        detail: "CBC-led layout with controlled marks supplement and ranking disabled by default.",
        status: "Available",
        owner: "Dean review",
        tone: "info",
      },
      {
        id: "template-legacy",
        title: "Legacy 8-4-4/KCSE Report",
        detail: "Legacy class/report format for configured transition classes and archives.",
        status: "Legacy",
        owner: "Principal approval",
        tone: "warning",
      },
    ],
    actions: [
      {
        label: "Save Template Draft",
        mode: "completed",
        targetRoles: ["Exams Manager", "Dean of Academics"],
        notificationTitle: "Report template draft saved",
      },
      {
        label: "Open Print Preview",
        mode: "completed",
        targetRoles: ["Exams Manager"],
        notificationTitle: "Report template print preview ready",
      },
    ],
  },
  exports: {
    title: "Export Center Work Queue",
    description: "Select internal export packages before preparing files. Parent-facing exports remain blocked before approvals.",
    itemLabel: "export package",
    records: [
      {
        id: "export-knec-indices",
        title: "KNEC Candidate Registers",
        detail: "Candidate index numbers mapped for national exams registration.",
        status: "Pending",
        owner: "Exams Manager",
        tone: "warning",
      },
      {
        id: "export-excel-marksheets",
        title: "Excel marksheets",
        detail: "Internal quality-control export for the exams office.",
        status: "Internal",
        owner: "Exams Manager",
        tone: "info",
      },
      {
        id: "export-draft-report-cards",
        title: "Draft report cards",
        detail: "Watermarked draft batch for review teams only.",
        status: "Draft",
        owner: "Dean review",
        tone: "warning",
      },
      {
        id: "export-class-summaries",
        title: "Class summaries",
        detail: "Aggregated class summary for Dean intake.",
        status: "Review",
        owner: "Dean of Academics",
        tone: "success",
      },
    ],
    actions: [
      {
        label: "Prepare Export",
        mode: "queued",
        targetRoles: ["Exams Manager", "Dean of Academics"],
        notificationTitle: "Exam export package queued",
      },
      {
        label: "Upload KNEC Index Map",
        mode: "completed",
        targetRoles: ["Exams Manager"],
        notificationTitle: "KNEC Candidate Index mapping updated",
      },
    ],
  },
};

const navItems: Array<{ id: ExamsManagerView; label: string; icon: LucideIcon }> = [
  { id: "overview", label: "Exam Command Center", icon: GraduationCap },
  { id: "builder", label: "Exam Setup / Exam Builder", icon: ClipboardList },
  { id: "scheduler", label: "Entry Windows / Timetable Scheduler", icon: CalendarDays },
  { id: "marks", label: "Mark Entry Monitor / Marks Entry Hub", icon: UploadCloud },
  { id: "missing-marks", label: "Missing Marks", icon: AlertTriangle },
  { id: "grading", label: "Grade Processing", icon: BarChart3 },
  { id: "moderation", label: "Moderation", icon: ClipboardCheck },
  { id: "drafts", label: "Report Cards / Report Card Drafts", icon: FileSpreadsheet },
  { id: "report-templates", label: "Report Templates", icon: FileSpreadsheet },
  { id: "academic-analytics", label: "Academic Analytics", icon: BarChart3 },
  { id: "submissions", label: "Submission Tracker", icon: ClipboardCheck },
  { id: "validation", label: "Data Validation", icon: AlertTriangle },
  { id: "exports", label: "Export Center", icon: FileSpreadsheet },
  { id: "audit-log", label: "Exam Audit Log", icon: Archive },
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
    id: "missing-marks",
    title: "Missing Marks",
    description: "Records where subject teachers still need to complete score entry before review.",
    icon: AlertTriangle,
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
    id: "moderation",
    title: "Moderation",
    description: "Review queues that move validated exam data to Dean quality control.",
    icon: ClipboardCheck,
    tone: "warning",
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
    id: "report-templates",
    title: "Report Templates",
    description: "CBC/CBE, Hybrid CBC + Marks, and Legacy 8-4-4/KCSE report template controls.",
    icon: FileSpreadsheet,
    tone: "info",
    hasData: true,
  },
  {
    id: "academic-analytics",
    title: "Academic Analytics",
    description: "Completion, validation, readiness, and publishing analytics grouped by report type.",
    icon: BarChart3,
    tone: "info",
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
    id: "audit-log",
    title: "Exam Audit Log",
    description: "School-scoped review handoffs and draft generation records.",
    icon: Archive,
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

function SelectableLifecycleQueue({
  config,
  selectedIds,
  onToggleRecord,
  onClearSelection,
  onExecuteAction,
}: {
  config: LifecycleQueueConfig;
  selectedIds: string[];
  onToggleRecord: (recordId: string) => void;
  onClearSelection: () => void;
  onExecuteAction: (action: LifecycleQueueConfig["actions"][number], records: LifecycleQueueRecord[]) => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const visibleRecords = normalizedSearch
    ? config.records.filter((record) =>
        [record.title, record.detail, record.status, record.owner].some((value) =>
          value.toLowerCase().includes(normalizedSearch),
        ),
      )
    : config.records;
  const selectedRecords = config.records.filter((record) => selectedIds.includes(record.id));
  const allVisibleSelected =
    visibleRecords.length > 0 && visibleRecords.every((record) => selectedIds.includes(record.id));

  function toggleAllVisible() {
    if (allVisibleSelected) {
      visibleRecords.forEach((record) => {
        if (selectedIds.includes(record.id)) {
          onToggleRecord(record.id);
        }
      });
      return;
    }

    visibleRecords.forEach((record) => {
      if (!selectedIds.includes(record.id)) {
        onToggleRecord(record.id);
      }
    });
  }

  return (
    <section className="rounded-2xl border border-[#D9E2EF] bg-white/86 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#64748B]">Selectable workflow</p>
          <h4 className="mt-2 text-lg font-black text-[#071D49]">{config.title}</h4>
          <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-[#64748B]">{config.description}</p>
        </div>
        <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
          {selectedRecords.length} selected
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <label className="flex items-center gap-2 rounded-xl border border-[#D9E2EF] bg-[#F8FAFC] px-3 py-2">
          <Search className="h-4 w-4 text-[#64748B]" />
          <span className="sr-only">Search {config.title}</span>
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full bg-transparent text-sm font-bold text-[#071D49] outline-none placeholder:text-[#64748B]"
            placeholder={`Search ${config.itemLabel}s`}
            type="search"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <ActionButton tone="info" onClick={toggleAllVisible}>
            {allVisibleSelected ? "Clear visible" : "Select all visible"}
          </ActionButton>
          <ActionButton tone="neutral" onClick={onClearSelection}>
            Clear selection
          </ActionButton>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-[#D9E2EF]">
        <table className="min-w-[760px] w-full border-collapse bg-white">
          <thead className="bg-[#F8FAFC]">
            <tr className="text-left text-[11px] font-black uppercase tracking-[0.14em] text-[#64748B]">
              <th className="px-4 py-3">Select</th>
              <th className="px-4 py-3">Record</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {visibleRecords.map((record) => (
              <tr key={record.id}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(record.id)}
                    onChange={() => onToggleRecord(record.id)}
                    aria-label={`Select ${record.title}`}
                    className="h-4 w-4 rounded border-[#C7D4E6]"
                  />
                </td>
                <td className="px-4 py-3">
                  <p className="font-black text-[#071D49]">{record.title}</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-[#64748B]">{record.detail}</p>
                </td>
                <td className="px-4 py-3 text-sm font-bold text-[#071D49]">{record.owner}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full border px-3 py-1 text-xs font-black ${toneClasses[record.tone].chip}`}>
                    {record.status}
                  </span>
                </td>
              </tr>
            ))}
            {visibleRecords.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm font-bold text-[#64748B]">
                  No records match the current search.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {config.actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => onExecuteAction(action, selectedRecords)}
            disabled={selectedRecords.length === 0}
            className="rounded-xl border border-[#C7D4E6] bg-white px-3 py-2 text-sm font-black text-[#071D49] shadow-sm transition hover:-translate-y-0.5 hover:border-[#0B63CE] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {action.label}
            {action.label.toLowerCase().includes("selected") ? "" : " for selected"}
          </button>
        ))}
      </div>
    </section>
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
  onSaveConfiguration,
  onCreateExamDraft,
  onCheckTermAlignment,
  onOpenMarksEntry,
  onSendDeanReview,
  selectedLifecycleIds,
  lifecycleResults,
  onToggleLifecycleRecord,
  onClearLifecycleSelection,
  onExecuteLifecycleAction,
  savedConfigurations,
  examDrafts,
  alignmentChecks,
  marksEntrySessions,
  deanReviewBatches,
}: {
  view: ExamsManagerView;
  onSaveConfiguration: () => void;
  onCreateExamDraft: () => void;
  onCheckTermAlignment: () => void;
  onOpenMarksEntry: () => void;
  onSendDeanReview: () => void;
  selectedLifecycleIds: string[];
  lifecycleResults: ExamOperationalRecord[];
  onToggleLifecycleRecord: (view: ExamsManagerView, recordId: string) => void;
  onClearLifecycleSelection: (view: ExamsManagerView) => void;
  onExecuteLifecycleAction: (
    view: ExamsManagerView,
    action: LifecycleQueueConfig["actions"][number],
    records: LifecycleQueueRecord[],
    itemLabel: string,
  ) => void;
  savedConfigurations: SavedExamConfiguration[];
  examDrafts: ExamOperationalRecord[];
  alignmentChecks: ExamOperationalRecord[];
  marksEntrySessions: ExamOperationalRecord[];
  deanReviewBatches: ExamOperationalRecord[];
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
            <ActionButton tone="success" onClick={onCreateExamDraft}>Create exam draft</ActionButton>
            <ActionButton onClick={onSaveConfiguration}>Save configuration</ActionButton>
            <ActionButton tone="warning" onClick={onCheckTermAlignment}>Check term alignment</ActionButton>
          </div>
          <div className="mt-4 space-y-2">
            {examDrafts.map((draft) => (
              <ListRow key={draft.id} title={draft.title} detail={draft.detail} value={draft.status} tone="success" />
            ))}
            {alignmentChecks.map((check) => (
              <ListRow key={check.id} title={check.title} detail={check.detail} value={check.status} tone="warning" />
            ))}
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
    const queue = lifecycleWorkQueues.scheduler;
    return (
      <div className="grid gap-4">
        {queue ? (
          <SelectableLifecycleQueue
            config={queue}
            selectedIds={selectedLifecycleIds}
            onToggleRecord={(recordId) => onToggleLifecycleRecord(view, recordId)}
            onClearSelection={() => onClearLifecycleSelection(view)}
            onExecuteAction={(action, records) => onExecuteLifecycleAction(view, action, records, queue.itemLabel)}
          />
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          <ListRow title="Auto-scheduling engine" detail="Balances rooms, subject order, and class overlaps." value="Queued" tone="info" />
          <ListRow title="Subject clashes" detail="2 possible clashes detected for Form 3 Science block." value="Warning" tone="warning" />
          <ListRow title="Room constraints" detail="Lab sessions protected from double booking." value="Protected" tone="success" />
          <ListRow title="Class overlaps" detail="No class is assigned to simultaneous papers." value="Clear" tone="success" />
        </div>
      </div>
    );
  }

  if (view === "marks") {
    const queue = lifecycleWorkQueues.marks;
    return (
      <div className="grid gap-4">
        {queue ? (
          <SelectableLifecycleQueue
            config={queue}
            selectedIds={selectedLifecycleIds}
            onToggleRecord={(recordId) => onToggleLifecycleRecord(view, recordId)}
            onClearSelection={() => onClearLifecycleSelection(view)}
            onExecuteAction={(action, records) => onExecuteLifecycleAction(view, action, records, queue.itemLabel)}
          />
        ) : null}
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
          <div className="mt-4 flex flex-wrap gap-2">
            <ActionButton tone="info" onClick={onOpenMarksEntry}>Enter marks</ActionButton>
            <ActionButton tone="success" onClick={() => alert("Simulating import marks...")}>Import Marks (CSV)</ActionButton>
            <ActionButton tone="neutral" onClick={() => {
              downloadCsvFile({
                filename: "marks-template.csv",
                headers: ["Admission Number", "KNEC Index Number", "Student Name", "Score"],
                rows: []
              });
              alert("CSV export downloaded");
            }}>Export Marks Template</ActionButton>
            <ActionButton tone="warning" onClick={() => alert("Zeraki integration not configured for this tenant")}>Zeraki Sync</ActionButton>
          </div>
          <div className="mt-4 space-y-2">
            {marksEntrySessions.length > 0 ? (
              marksEntrySessions.map((session) => (
                <ListRow key={session.id} title={session.title} detail={session.detail} value={session.status} tone="info" />
              ))
            ) : (
              <ListRow title="Ready marks sheets" detail="No marks sheet has been prepared in this session." value="Empty" tone="neutral" />
            )}
          </div>
        </div>
      </div>
      </div>
    );
  }

  if (view === "missing-marks") {
    const queue = lifecycleWorkQueues["missing-marks"];
    return (
      <div className="grid gap-4">
        {queue ? (
          <SelectableLifecycleQueue
            config={queue}
            selectedIds={selectedLifecycleIds}
            onToggleRecord={(recordId) => onToggleLifecycleRecord(view, recordId)}
            onClearSelection={() => onClearLifecycleSelection(view)}
            onExecuteAction={(action, records) => onExecuteLifecycleAction(view, action, records, queue.itemLabel)}
          />
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          <ListRow title="Class 7B Science" detail="3 learner marks missing from teacher submission." value="Teacher follow-up required" tone="danger" />
          <ListRow title="Form 2 West Mathematics" detail="14 learner marks below completion threshold need teacher confirmation." value="Incomplete" tone="warning" />
          <ListRow title="Form 4 North Chemistry" detail="Upload held because one score is outside the configured range." value="Blocked" tone="danger" />
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

  if (view === "moderation") {
    const queue = lifecycleWorkQueues.moderation;
    return (
      <div className="grid gap-4">
        {queue ? (
          <SelectableLifecycleQueue
            config={queue}
            selectedIds={selectedLifecycleIds}
            onToggleRecord={(recordId) => onToggleLifecycleRecord(view, recordId)}
            onClearSelection={() => onClearLifecycleSelection(view)}
            onExecuteAction={(action, records) => onExecuteLifecycleAction(view, action, records, queue.itemLabel)}
          />
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          <ListRow title="Term 2 CAT 1 moderation" detail="Validated marks ready for Dean quality-control queue." value="Ready" tone="success" />
          <ListRow title="Hybrid CBC + Marks checks" detail="Competency observations and marks supplement are reviewed separately." value="Review" tone="info" />
          <ListRow title="Legacy transition class checks" detail="Legacy 8-4-4/KCSE reports retained only for configured transition classes." value="Legacy" tone="warning" />
        </div>
      </div>
    );
  }

  if (view === "drafts") {
    const queue = lifecycleWorkQueues.drafts;
    return (
      <div className="grid gap-4">
        {queue ? (
          <SelectableLifecycleQueue
            config={queue}
            selectedIds={selectedLifecycleIds}
            onToggleRecord={(recordId) => onToggleLifecycleRecord(view, recordId)}
            onClearSelection={() => onClearLifecycleSelection(view)}
            onExecuteAction={(action, records) => onExecuteLifecycleAction(view, action, records, queue.itemLabel)}
          />
        ) : null}
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
            <ActionButton tone="warning" onClick={onSendDeanReview}>Send to Dean review</ActionButton>
          </div>
          <div className="mt-4 space-y-2">
            {deanReviewBatches.length > 0 ? (
              deanReviewBatches.map((batch) => (
                <ListRow key={batch.id} title={batch.title} detail={batch.detail} value={batch.status} tone="warning" />
              ))
            ) : (
              <ListRow title="Dean review queue" detail="No draft batch has been sent to Dean review yet." value="Empty" tone="neutral" />
            )}
          </div>
        </div>
      </div>
      </div>
    );
  }

  if (view === "report-templates") {
    const queue = lifecycleWorkQueues["report-templates"];
    return (
      <div className="grid gap-4">
        {queue ? (
          <SelectableLifecycleQueue
            config={queue}
            selectedIds={selectedLifecycleIds}
            onToggleRecord={(recordId) => onToggleLifecycleRecord(view, recordId)}
            onClearSelection={() => onClearLifecycleSelection(view)}
            onExecuteAction={(action, records) => onExecuteLifecycleAction(view, action, records, queue.itemLabel)}
          />
        ) : null}
        <div className="grid gap-3 md:grid-cols-3">
          <ListRow title="CBC/CBE Competency Report" detail="Primary learner report template with descriptors, observations, parent support, and verification." value="Default" tone="success" />
          <ListRow title="Hybrid CBC + Marks Report" detail="CBC-led template with controlled marks supplement and optional ranking disabled by default." value="Available" tone="info" />
          <ListRow title="Legacy 8-4-4/KCSE Report" detail="Legacy class/report format only for remaining transition classes and archived reports." value="Legacy" tone="warning" />
        </div>
      </div>
    );
  }

  if (view === "academic-analytics") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <ListRow title="CBC reports ready" detail="96 competency reports complete after observation checks." value="96" tone="success" />
        <ListRow title="Hybrid reports ready" detail="118 reports ready with marks supplement and comments." value="118" tone="info" />
        <ListRow title="Legacy reports ready" detail="74 transition reports ready for legacy classes." value="74" tone="warning" />
        <ListRow title="Awaiting approval" detail="22 records are still at Dean or Principal approval gates." value="22" tone="danger" />
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
    const queue = lifecycleWorkQueues.exports;
    return (
      <div className="grid gap-4">
        {queue ? (
          <SelectableLifecycleQueue
            config={queue}
            selectedIds={selectedLifecycleIds}
            onToggleRecord={(recordId) => onToggleLifecycleRecord(view, recordId)}
            onClearSelection={() => onClearLifecycleSelection(view)}
            onExecuteAction={(action, records) => onExecuteLifecycleAction(view, action, records, queue.itemLabel)}
          />
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          <ListRow title="Excel marksheets" detail="Internal quality control export for exams office." value="Internal" tone="info" />
          <ListRow title="Draft report cards" detail="Watermarked draft batch for review teams only." value="Draft" tone="warning" />
          <ListRow title="Class summaries" detail="Aggregated class summary for Dean intake." value="Review" tone="success" />
          <ListRow title="No parent-facing exports" detail="Parent visibility starts after the approval chain completes." value="Blocked" tone="danger" />
        </div>
      </div>
    );
  }

  if (view === "audit-log") {
    return (
      <div className="grid gap-3">
        {lifecycleResults.length > 0 ? (
          <div className="rounded-2xl border border-[#D9E2EF] bg-white/86 p-4">
            <h4 className="text-lg font-black text-[#071D49]">Recent lifecycle action audit</h4>
            <div className="mt-4 grid gap-3">
              {lifecycleResults.map((result) => (
                <ListRow key={result.id} title={result.title} detail={result.detail} value={result.status} tone="info" />
              ))}
            </div>
          </div>
        ) : null}
        <ListRow title="Tenant-scoped exam events" detail="All draft, marks, validation, and Dean handoff events are stored under the current school." value="Protected" tone="success" />
        <ListRow title="Draft generation audit" detail="Report card batches remain internal until Dean and Principal approval." value="Tracked" tone="info" />
        <ListRow title="Validation failure audit" detail="Missing marks and invalid ranges remain visible instead of showing fake completion." value="Visible" tone="warning" />
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
  onSaveConfiguration,
  onCreateExamDraft,
  onCheckTermAlignment,
  onOpenMarksEntry,
  onSendDeanReview,
  selectedLifecycleIds,
  lifecycleResults,
  onToggleLifecycleRecord,
  onClearLifecycleSelection,
  onExecuteLifecycleAction,
  savedConfigurations,
  examDrafts,
  alignmentChecks,
  marksEntrySessions,
  deanReviewBatches,
}: {
  view: ExamsManagerView;
  capabilities: Map<ExamsManagerView, ExamsManagerWidgetCapability>;
  onSaveConfiguration: () => void;
  onCreateExamDraft: () => void;
  onCheckTermAlignment: () => void;
  onOpenMarksEntry: () => void;
  onSendDeanReview: () => void;
  selectedLifecycleIds: string[];
  lifecycleResults: ExamOperationalRecord[];
  onToggleLifecycleRecord: (view: ExamsManagerView, recordId: string) => void;
  onClearLifecycleSelection: (view: ExamsManagerView) => void;
  onExecuteLifecycleAction: (
    view: ExamsManagerView,
    action: LifecycleQueueConfig["actions"][number],
    records: LifecycleQueueRecord[],
    itemLabel: string,
  ) => void;
  savedConfigurations: SavedExamConfiguration[];
  examDrafts: ExamOperationalRecord[];
  alignmentChecks: ExamOperationalRecord[];
  marksEntrySessions: ExamOperationalRecord[];
  deanReviewBatches: ExamOperationalRecord[];
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
        onSaveConfiguration={onSaveConfiguration}
        onCreateExamDraft={onCreateExamDraft}
        onCheckTermAlignment={onCheckTermAlignment}
        onOpenMarksEntry={onOpenMarksEntry}
        onSendDeanReview={onSendDeanReview}
        selectedLifecycleIds={selectedLifecycleIds}
        lifecycleResults={lifecycleResults}
        onToggleLifecycleRecord={onToggleLifecycleRecord}
        onClearLifecycleSelection={onClearLifecycleSelection}
        onExecuteLifecycleAction={onExecuteLifecycleAction}
        savedConfigurations={savedConfigurations}
        examDrafts={examDrafts}
        alignmentChecks={alignmentChecks}
        marksEntrySessions={marksEntrySessions}
        deanReviewBatches={deanReviewBatches}
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
  const [examDrafts, setExamDrafts] = useState<ExamOperationalRecord[]>([]);
  const [alignmentChecks, setAlignmentChecks] = useState<ExamOperationalRecord[]>([]);
  const [marksEntrySessions, setMarksEntrySessions] = useState<ExamOperationalRecord[]>([]);
  const [deanReviewBatches, setDeanReviewBatches] = useState<ExamOperationalRecord[]>([]);
  const [selectedLifecycleIds, setSelectedLifecycleIds] = useState<Partial<Record<ExamsManagerView, string[]>>>({});
  const [lifecycleResults, setLifecycleResults] = useState<ExamOperationalRecord[]>([]);
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
    setNotice(`${record.label} exams search loaded ${record.view.replaceAll("-", " ")} workspace: ${record.detail}.`);
  }

  const queryClient = useQueryClient();
  const configMutation = useSchoolMutation("/api/exams/configuration");
  const draftMutation = useSchoolMutation("/api/exams/draft");
  const alignMutation = useSchoolMutation("/api/exams/alignment");
  const marksMutation = useSchoolMutation("/api/exams/marks");
  const reviewMutation = useSchoolMutation("/api/exams/review");
  const lifecycleMutation = useSchoolMutation("/api/exams/lifecycle");

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

    configMutation.mutate(
      {
        ...configuration,
        examName: "Form 4 Mock Series",
        term: "Term 2 2026",
        classes: ["Form 4 North", "Form 4 South"],
        subjects: ["Mathematics", "English", "Kiswahili", "Chemistry"],
        savedByRole: "Exams Manager",
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries();
          setSavedConfigurations((current) => [configuration, ...current].slice(0, 4));
          setNotice("Exam configuration saved for Dean review.");
        },
        onError: (err) => {
          setNotice(`Action failed: Backend API missing or denied (${err.message})`);
        }
      }
    );
  }

  function createExamDraft() {
    const schoolId = getCurrentSchoolId();
    const createdAt = new Date().toLocaleString("en-KE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const draft: ExamOperationalRecord = {
      id: `exam-draft-${Date.now()}`,
      title: "Form 2 Endterm exam draft",
      detail: `Created ${createdAt} for Form 2 East and Form 2 West subject setup.`,
      status: "Draft created",
      createdAt,
    };

    draftMutation.mutate(
      {
        ...draft,
        examType: "Endterm",
        term: "Term 2 2026",
        classes: ["Form 2 East", "Form 2 West"],
        subjectsPending: ["Biology", "Kiswahili", "Business Studies"],
        createdByRole: "Exams Manager",
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries();
          publishSchoolOperationalEvent({
            schoolId,
            type: "EXAM_DRAFT_CREATED",
            module: "exams",
            actorRole: "Exams Manager",
            title: "Form 2 Endterm exam draft created",
            body: "Exams Manager created a Form 2 Endterm draft for subject setup and timetable preparation.",
            entityId: draft.id,
            severity: "info",
            payload: { examName: draft.title, term: "Term 2 2026", status: draft.status },
            notifications: [
              {
                audienceRoles: ["Dean of Academics", "Head of Department"],
                title: "New exam draft needs subject confirmation",
                body: "Form 2 Endterm draft is ready for department subject confirmation.",
                severity: "info",
                relatedModule: "exams",
                relatedRecordId: draft.id,
                requestStatus: "Pending",
              },
            ],
          });

          setExamDrafts((current) => [draft, ...current].slice(0, 4));
          setNotice("Exam draft created and shared with academic reviewers.");
        },
        onError: (err) => {
          setNotice(`Action failed: Backend API missing or denied (${err.message})`);
        }
      }
    );
  }

  function checkTermAlignment() {
    const schoolId = getCurrentSchoolId();
    const createdAt = new Date().toLocaleString("en-KE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const check: ExamOperationalRecord = {
      id: `term-alignment-${Date.now()}`,
      title: "Term 2 exam alignment check",
      detail: `Checked ${createdAt}. Two timetable warnings require HOD confirmation before scheduling.`,
      status: "2 warnings",
      createdAt,
    };

    alignMutation.mutate(
      {
        ...check,
        term: "Term 2 2026",
        warnings: ["Form 3 Science block clash", "Lab timetable overlap"],
        checkedByRole: "Exams Manager",
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries();
          publishSchoolOperationalEvent({
            schoolId,
            type: "EXAM_TERM_ALIGNMENT_CHECKED",
            module: "exams",
            actorRole: "Exams Manager",
            title: "Term alignment check completed",
            body: "Exams Manager completed the Term 2 alignment check and found timetable warnings for academic follow-up.",
            entityId: check.id,
            severity: "warning",
            payload: { term: "Term 2 2026", warningCount: 2 },
            notifications: [
              {
                audienceRoles: ["Dean of Academics", "Head of Department"],
                title: "Exam timetable warnings need review",
                body: "Term 2 alignment check found two timetable warnings.",
                severity: "warning",
                relatedModule: "exams",
                relatedRecordId: check.id,
                requestStatus: "Pending",
              },
            ],
          });

          setAlignmentChecks((current) => [check, ...current].slice(0, 3));
          setNotice("Term alignment check saved with timetable warnings for review.");
        },
        onError: (err) => {
          setNotice(`Action failed: Backend API missing or denied (${err.message})`);
        }
      }
    );
  }

  function openMarksEntry() {
    const schoolId = getCurrentSchoolId();
    const createdAt = new Date().toLocaleString("en-KE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const session: ExamOperationalRecord = {
      id: `marks-entry-${Date.now()}`,
      title: "Mathematics Form 4 North marks entry",
      detail: `Prepared ${createdAt}. 88% complete, 12 learner records still pending.`,
      status: "Open",
      createdAt,
    };

    marksMutation.mutate(
      {
        ...session,
        subject: "Mathematics",
        classStream: "Form 4 North",
        pendingLearners: 12,
        openedByRole: "Exams Manager",
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries();
          publishSchoolOperationalEvent({
            schoolId,
            type: "MARKS_ENTRY_OPENED",
            module: "exams",
            actorRole: "Exams Manager",
            title: "Mathematics Form 4 North marks entry ready",
            body: "Exams Manager prepared the Mathematics marks entry sheet for Form 4 North.",
            entityId: session.id,
            severity: "info",
            payload: { subject: "Mathematics", classStream: "Form 4 North", pendingLearners: 12 },
            notifications: [
              {
                audienceRoles: ["Teacher", "Dean of Academics"],
                title: "Marks entry sheet ready",
                body: "Mathematics Form 4 North marks entry is open for completion.",
                severity: "info",
                relatedModule: "exams",
                relatedRecordId: session.id,
                requestStatus: "Pending",
              },
            ],
          });

          setMarksEntrySessions((current) => [session, ...current].slice(0, 4));
          setNotice(`${session.title} opened for Mathematics Form 4 North with 12 pending learners; teacher and Dean notifications created.`);
        },
        onError: (err) => {
          setNotice(`Action failed: Backend API missing or denied (${err.message})`);
        }
      }
    );
  }

  function sendDeanReview() {
    const schoolId = getCurrentSchoolId();
    const createdAt = new Date().toLocaleString("en-KE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const batch: ExamOperationalRecord = {
      id: `dean-review-batch-${Date.now()}`,
      title: "Term 2 CAT 1 report card draft batch",
      detail: `Sent ${createdAt}. Dean review receives draft cards, class summaries, and validation notes.`,
      status: "Sent to Dean",
      createdAt,
    };

    reviewMutation.mutate(
      {
        ...batch,
        term: "Term 2 2026",
        exam: "Term 2 CAT 1",
        learnerCount: 412,
        sentByRole: "Exams Manager",
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries();
          publishSchoolOperationalEvent({
            schoolId,
            type: "REPORT_CARD_DRAFT_SENT_TO_DEAN",
            module: "exams",
            actorRole: "Exams Manager",
            title: "Report card draft batch sent to Dean",
            body: "Exams Manager sent Term 2 CAT 1 draft report cards to Dean of Academics for review.",
            entityId: batch.id,
            severity: "warning",
            payload: { term: "Term 2 2026", exam: "Term 2 CAT 1", learnerCount: 412 },
            notifications: [
              {
                audienceRoles: ["Dean of Academics", "Principal"],
                title: "Draft report cards ready for Dean review",
                body: "Term 2 CAT 1 draft report card batch is ready for academic quality review.",
                severity: "warning",
                relatedModule: "academics",
                relatedRecordId: batch.id,
                requestStatus: "Pending",
                requiresAction: true,
              },
            ],
          });

          setDeanReviewBatches((current) => [batch, ...current].slice(0, 4));
          setNotice("Draft report card batch sent to Dean review and leadership notified.");
        },
        onError: (err) => {
          setNotice(`Action failed: Backend API missing or denied (${err.message})`);
        }
      }
    );
  }

  function toggleLifecycleRecord(view: ExamsManagerView, recordId: string) {
    setSelectedLifecycleIds((current) => {
      const selected = current[view] ?? [];
      const nextSelected = selected.includes(recordId)
        ? selected.filter((id) => id !== recordId)
        : [...selected, recordId];

      return { ...current, [view]: nextSelected };
    });
  }

  function clearLifecycleSelection(view: ExamsManagerView) {
    setSelectedLifecycleIds((current) => ({ ...current, [view]: [] }));
  }

  function executeLifecycleAction(
    view: ExamsManagerView,
    action: LifecycleQueueConfig["actions"][number],
    records: LifecycleQueueRecord[],
    itemLabel: string,
  ) {
    if (records.length === 0) {
      setNotice(`Select at least one ${itemLabel} before running ${action.label}.`);
      return;
    }

    const schoolId = getCurrentSchoolId();
    const createdAt = new Date().toLocaleString("en-KE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const affectedCount = records.length;
    const failedRecords = records.filter((record) => /blocked|invalid/i.test(record.status) && action.mode === "completed");
    const failedCount = failedRecords.length;
    const succeededCount = affectedCount - failedCount;
    const statusWord = action.mode === "queued" ? "Pending" : "Completed";
    const visibleVerb = action.mode === "queued" ? "queued" : "status updated";
    const recordIds = records.map((record) => record.id);
    const resultMessage = `${action.label} ${visibleVerb} for ${affectedCount} selected ${itemLabel}${affectedCount === 1 ? "" : "s"}. Selected ${affectedCount}. ${succeededCount} succeeded, ${failedCount} failed.${
      failedCount > 0 ? ` Failed records: ${failedRecords.map((record) => record.title).join(", ")}.` : ""
    }`;

    if (action.label.includes("Print") || action.label.includes("Preview Selected")) {
      openPrintDocument({
        eyebrow: "Exams Manager",
        title: action.label,
        subtitle: `Previewing ${records.length} selected items`,
        rows: records.map((r) => ({ label: r.title, value: r.status })),
        footer: "Printed from Exams Manager Desk"
      });
      setNotice(`Opening browser print preview.`);
      clearLifecycleSelection(view);
      return;
    }

    if (action.label.includes("Export")) {
      downloadCsvFile({
        filename: `exams-export-${Date.now()}.csv`,
        headers: ["Title", "Detail", "Status"],
        rows: records.map((r) => [r.title, r.detail, r.status]),
      });
      setNotice(`CSV export downloaded.`);
      clearLifecycleSelection(view);
      return;
    }
    const result: ExamOperationalRecord = {
      id: `exam-manager-action-${Date.now()}`,
      title: "EXAMS_MANAGER_LIFECYCLE_ACTION_EXECUTED",
      detail: `${resultMessage} School ${schoolId}. Workspace ${view}. Records ${recordIds.join(", ")}.`,
      status: statusWord,
      createdAt,
    };

    lifecycleMutation.mutate(
      {
        ...result,
        schoolId,
        actionLabel: action.label,
        workspace: view,
        selectedRecordIds: recordIds,
        selectedRecordTitles: records.map((record) => record.title),
        affectedCount,
        succeededCount,
        failedCount,
        status: statusWord,
        executedByRole: "Exams Manager",
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries();
          publishSchoolOperationalEvent({
            schoolId,
            type: "EXAMS_MANAGER_LIFECYCLE_ACTION_EXECUTED",
            module: "exams",
            actorRole: "Exams Manager",
            title: `${action.label} ${visibleVerb} from Exams Manager`,
            body: resultMessage,
            entityId: result.id,
            severity: failedCount > 0 ? "warning" : action.mode === "queued" ? "info" : "success",
            payload: {
              workspace: view,
              selectedRecordIds: recordIds,
              affectedCount,
              succeededCount,
              failedCount,
              schoolId,
            },
            notifications: action.targetRoles.map((role) => ({
              audienceRoles: [role],
              title: action.notificationTitle,
              body: resultMessage,
              severity: failedCount > 0 ? "warning" : "info",
              relatedModule: "exams",
              relatedRecordId: result.id,
              requestStatus: statusWord,
            })),
          });

          setLifecycleResults((current) => [result, ...current].slice(0, 8));
          clearLifecycleSelection(view);
          setNotice(resultMessage);
        },
        onError: (err) => {
          setNotice(`Action failed: Backend API missing or denied (${err.message})`);
        }
      }
    );
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
                <div className="mt-4 -mx-4 flex overflow-x-auto px-4 pb-2 lg:hidden hide-scrollbar gap-2">
                  {navItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveView(item.id)}
                      className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition-colors ${activeView === item.id ? "bg-[#071D49] text-white" : "bg-white text-[#64748B] border border-[#D9E2EF]"}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
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
                <div className="flex items-center gap-2">
                  <TaskQueue />
                  <ApprovalInbox currentUserId="school" />
                  <NotificationBell />
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
              onSaveConfiguration={saveExamConfiguration}
              onCreateExamDraft={createExamDraft}
              onCheckTermAlignment={checkTermAlignment}
              onOpenMarksEntry={openMarksEntry}
              onSendDeanReview={sendDeanReview}
              selectedLifecycleIds={selectedLifecycleIds[activeView] ?? []}
              lifecycleResults={lifecycleResults}
              onToggleLifecycleRecord={toggleLifecycleRecord}
              onClearLifecycleSelection={clearLifecycleSelection}
              onExecuteLifecycleAction={executeLifecycleAction}
              savedConfigurations={savedConfigurations}
              examDrafts={examDrafts}
              alignmentChecks={alignmentChecks}
              marksEntrySessions={marksEntrySessions}
              deanReviewBatches={deanReviewBatches}
            />
          </main>
        </div>
      </div>
      
    </div>
  );
}
