"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BookCheck,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  GraduationCap,
  History,
  LockKeyhole,
  Search,
  ShieldCheck,
  UserCheck,
  type LucideIcon,
} from "lucide-react";

import type { WidgetState } from "@/lib/capability-engine/school-capability-engine";
import { getCurrentSchoolId, publishSchoolOperationalEvent } from "@/lib/school/school-operational-store";

type DeanRouteMode = "hosted" | "public";
type Tone = "success" | "info" | "warning" | "danger" | "neutral";
type DeanView =
  | "overview"
  | "academic-overview"
  | "pending"
  | "moderation"
  | "results-moderation"
  | "academic-analytics"
  | "interventions"
  | "reports"
  | "integrity"
  | "teachers"
  | "alerts"
  | "curriculum"
  | "history";

type DeanWidgetCapability = {
  state: WidgetState;
  reason?: string;
};

type DeanWidget = {
  id: DeanView;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: Tone;
  hasData: boolean;
};

const lockedMessage = "Exams module not enabled for this school";

const navItems: Array<{ id: DeanView; label: string; icon: LucideIcon }> = [
  { id: "overview", label: "Overview", icon: GraduationCap },
  { id: "academic-overview", label: "Academic Exam Overview", icon: GraduationCap },
  { id: "pending", label: "Pending Reviews", icon: ClipboardCheck },
  { id: "moderation", label: "Exam Moderation", icon: ShieldCheck },
  { id: "results-moderation", label: "Results Moderation", icon: ShieldCheck },
  { id: "academic-analytics", label: "Academic Analytics", icon: AlertTriangle },
  { id: "interventions", label: "Interventions", icon: UserCheck },
  { id: "reports", label: "Report Card Approval", icon: FileCheck2 },
  { id: "integrity", label: "Grading Integrity Checks", icon: AlertTriangle },
  { id: "teachers", label: "Teacher Performance Review", icon: UserCheck },
  { id: "alerts", label: "Academic Alerts", icon: AlertTriangle },
  { id: "curriculum", label: "Curriculum Compliance", icon: BookCheck },
  { id: "history", label: "Approval History", icon: History },
];

const widgets: DeanWidget[] = [
  {
    id: "pending",
    title: "Pending Exam Reviews",
    description: "Exam batches awaiting Dean approval before principal review.",
    icon: ClipboardCheck,
    tone: "warning",
    hasData: true,
  },
  {
    id: "reports",
    title: "Report Card Review",
    description: "Generated report card batches ready for quality control.",
    icon: FileCheck2,
    tone: "info",
    hasData: true,
  },
  {
    id: "integrity",
    title: "Academic Integrity Checks",
    description: "Automated anomaly checks before human moderation.",
    icon: AlertTriangle,
    tone: "danger",
    hasData: true,
  },
  {
    id: "teachers",
    title: "Teacher Submission Tracker",
    description: "Teacher marks submission completeness and late grading patterns.",
    icon: UserCheck,
    tone: "neutral",
    hasData: true,
  },
  {
    id: "curriculum",
    title: "Curriculum Compliance",
    description: "CBC strands, 8-4-4 mappings, and curriculum alignment checks.",
    icon: BookCheck,
    tone: "success",
    hasData: true,
  },
  {
    id: "alerts",
    title: "Academic Alerts",
    description: "Exam alerts ready for Dean review and follow-up.",
    icon: AlertTriangle,
    tone: "warning",
    hasData: true,
  },
  {
    id: "history",
    title: "Approval History",
    description: "Dean decisions and report card version history.",
    icon: History,
    tone: "info",
    hasData: true,
  },
  {
    id: "moderation",
    title: "Exam Moderation",
    description: "Moderation progress across exams, departments, and classes.",
    icon: ShieldCheck,
    tone: "success",
    hasData: false,
  },
];

const toneClasses: Record<Tone, { chip: string; card: string; icon: string; dot: string }> = {
  success: {
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    card: "border-emerald-100 bg-emerald-50/75",
    icon: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
  },
  info: {
    chip: "border-blue-200 bg-blue-50 text-blue-700",
    card: "border-blue-100 bg-blue-50/75",
    icon: "bg-blue-100 text-blue-700",
    dot: "bg-blue-500",
  },
  warning: {
    chip: "border-amber-200 bg-amber-50 text-amber-700",
    card: "border-amber-100 bg-amber-50/75",
    icon: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
  },
  danger: {
    chip: "border-rose-200 bg-rose-50 text-rose-700",
    card: "border-rose-100 bg-rose-50/75",
    icon: "bg-rose-100 text-rose-700",
    dot: "bg-rose-500",
  },
  neutral: {
    chip: "border-slate-200 bg-slate-50 text-slate-700",
    card: "border-slate-200 bg-white/90",
    icon: "bg-slate-100 text-slate-700",
    dot: "bg-slate-400",
  },
};

const deanSearchRecords = [
  { id: "exam-cat-1", label: "Term 2 CAT 1", detail: "Class 7B | 3 missing subject marks", view: "pending" },
  { id: "report-midterm", label: "Midterm report cards", detail: "Form 2 East | ready for quality control", view: "reports" },
  { id: "integrity-math", label: "Math grading deviation", detail: "Score spike flagged for moderation", view: "integrity" },
  { id: "teacher-submissions", label: "Teacher submissions", detail: "7 late submissions | 5 incomplete grading sheets", view: "teachers" },
  { id: "approval-history", label: "Approval history", detail: "Recent Dean decisions and returned batches", view: "history" },
] satisfies Array<{ id: string; label: string; detail: string; view: DeanView }>;

type DeanSearchRecord = (typeof deanSearchRecords)[number];

function getViewLabel(view: DeanView) {
  return navItems.find((item) => item.id === view)?.label ?? "Dean desk";
}

export function resolveDeanWidgetState(input: {
  examsEnabled: boolean;
  rolePermitted: boolean;
  hasData: boolean;
}): DeanWidgetCapability {
  if (!input.examsEnabled) {
    return { state: "LOCKED", reason: lockedMessage };
  }

  if (!input.rolePermitted) {
    return { state: "LOCKED", reason: "Role not permitted to review exams" };
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

function ShellCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#D9E2EF] bg-white/86 p-5 shadow-[0_18px_50px_rgba(7,29,73,0.08)]">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-[#EAF2FF] p-3 text-[#0B63CE]">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-black text-[#071D49]">{title}</h3>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[#64748B]">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ActionButton({ children, onAction }: { children: ReactNode; onAction: (label: string) => void }) {
  const label = typeof children === "string" ? children : "Dean action";

  return (
    <button
      type="button"
      onClick={() => onAction(label)}
      className="rounded-xl border border-[#C7D4E6] bg-white px-3 py-2 text-sm font-black text-[#071D49] shadow-sm transition hover:-translate-y-0.5 hover:border-[#0B63CE] hover:text-[#0B63CE]"
    >
      {children}
    </button>
  );
}

function LockedWidget({ widget }: { widget: DeanWidget }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/85 p-5">
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
  widget: DeanWidget;
  capability: DeanWidgetCapability;
  children: ReactNode;
}) {
  if (capability.state === "LOCKED") {
    return <LockedWidget widget={widget} />;
  }

  const Icon = widget.icon;
  return (
    <div className={`rounded-2xl border p-5 ${toneClasses[widget.tone].card}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`rounded-2xl p-3 ${toneClasses[widget.tone].icon}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-black text-[#071D49]">{widget.title}</h3>
            <p className="mt-1 text-sm leading-6 text-[#64748B]">{widget.description}</p>
          </div>
        </div>
        <StatusChip state={capability.state} tone={widget.tone} />
      </div>
      <div className="mt-5">{capability.state === "EMPTY" ? <p className="text-sm font-semibold text-[#64748B]">Nothing pending in this queue.</p> : children}</div>
    </div>
  );
}

function Sidebar({
  activeView,
  onViewChange,
}: {
  activeView: DeanView;
  onViewChange: (view: DeanView) => void;
}) {
  return (
    <aside className="hidden h-[calc(100vh-1.5rem)] overflow-hidden rounded-2xl bg-[#071D49] p-4 text-white shadow-[0_24px_70px_rgba(7,29,73,0.28)] lg:block">
      <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-100/70">MyShule ERP</p>
        <h2 className="mt-2 text-xl font-black">Dean Academics</h2>
        <p className="mt-2 text-sm leading-6 text-white/65">Academic approval, moderation, and report quality control.</p>
      </div>
      <nav className="mt-4 h-[calc(100%-8.5rem)] space-y-1 overflow-y-auto pr-1" aria-label="Dean of Academics navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.id === activeView;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onViewChange(item.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-white/72 transition hover:bg-white/10 hover:text-white ${
                active ? "bg-white/14 text-white shadow-[inset_4px_0_0_#38BDF8]" : ""
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
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
  activeView: DeanView;
  searchTerm: string;
  searchResults: typeof deanSearchRecords;
  onSearchTermChange: (value: string) => void;
  onSearchResult: (record: DeanSearchRecord) => void;
  onViewChange: (view: DeanView) => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-[#D9E2EF] bg-white/90 px-4 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#64748B]">Term 2 - Dean review gate</p>
          <h1 className="text-xl font-black text-[#071D49]">Dean of Academics Dashboard</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[260px]">
            <label className="flex items-center gap-2 rounded-2xl border border-[#C7D4E6] bg-[#F8FAFC] px-3 py-2 text-sm font-semibold text-[#64748B]">
              <Search className="h-4 w-4" />
              <span className="sr-only">Dean academic search</span>
              <input
                value={searchTerm}
                onChange={(event) => onSearchTermChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && searchResults[0]) {
                    event.preventDefault();
                    onSearchResult(searchResults[0]);
                  }
                }}
                className="w-full bg-transparent outline-none"
                placeholder="Search exams, reports, teachers"
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
                  <p className="rounded-lg px-3 py-3 text-sm font-semibold text-[#64748B]">No academic review records found.</p>
                )}
              </div>
            ) : null}
          </div>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700">14 pending approvals</span>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">Exam review access ready</span>
        </div>
      </div>
      <div className="mt-3 lg:hidden">
        <label className="sr-only" htmlFor="dean-mobile-workspace">Dean section</label>
        <select
          id="dean-mobile-workspace"
          className="w-full rounded-xl border border-[#C7D4E6] bg-white px-3 py-2 text-sm font-black text-[#071D49]"
          value={activeView}
          onChange={(event) => onViewChange(event.target.value as DeanView)}
        >
          {navItems.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
      </div>
    </header>
  );
}

function DecisionFlow() {
  return (
    <div className="rounded-2xl border border-[#D9E2EF] bg-[#F8FAFC] p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#64748B]">Results lifecycle</p>
      <p className="mt-2 text-base font-black text-[#071D49]">Exams Office -&gt; Dean Review -&gt; Principal Approval -&gt; Publishing</p>
      <p className="mt-2 text-sm leading-6 text-[#64748B]">Dean is the first approval gate. The role can approve, reject, or return batches for correction, but cannot publish or override principal approval.</p>
    </div>
  );
}

function PendingReviews({ capability, onAction }: { capability: DeanWidgetCapability; onAction: (label: string) => void }) {
  const widget = widgets.find((item) => item.id === "pending")!;
  return (
    <WidgetFrame widget={widget} capability={capability}>
      <div className="overflow-hidden rounded-2xl border border-[#D9E2EF] bg-white">
        <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_1fr] bg-[#EEF4FB] px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-[#64748B]">
          <span>Exam name</span>
          <span>Class / stream</span>
          <span>Completion</span>
          <span>Alerts</span>
        </div>
        {[
          ["Term 2 CAT 1", "Class 7B", "92%", "3 missing subject marks"],
          ["Midterm Assessment", "Form 2 East", "100%", "Teacher submission completeness verified"],
          ["Mock Moderation", "Form 4 North", "87%", "Two incomplete grading sheets"],
        ].map((row) => (
          <div key={row.join("-")} className="grid grid-cols-[1.2fr_0.8fr_0.8fr_1fr] border-t border-[#E2E8F0] px-4 py-3 text-sm">
            {row.map((cell) => (
              <span key={cell} className="font-semibold text-[#334155]">{cell}</span>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <ActionButton onAction={onAction}>Open review</ActionButton>
        <ActionButton onAction={onAction}>Approve batch</ActionButton>
        <ActionButton onAction={onAction}>Reject batch</ActionButton>
        <ActionButton onAction={onAction}>Return for correction</ActionButton>
      </div>
    </WidgetFrame>
  );
}

function ReportCards({ capability }: { capability: DeanWidgetCapability }) {
  const widget = widgets.find((item) => item.id === "reports")!;
  return (
    <WidgetFrame widget={widget} capability={capability}>
      <div className="grid gap-3 md:grid-cols-3">
        {[
          ["Student group summaries", "412 learners", "Ready"],
          ["Grade distribution", "B- median", "Needs review"],
          ["Outliers", "9 high/low scores", "Flagged"],
        ].map(([label, value, status]) => (
          <div key={label} className="rounded-2xl border border-[#D9E2EF] bg-white p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#64748B]">{label}</p>
            <p className="mt-2 text-2xl font-black text-[#071D49]">{value}</p>
            <p className="mt-1 text-sm font-semibold text-[#64748B]">{status}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-sm font-black text-[#071D49]">
        <span>Approve report card batch</span>
        <span>Reject with comments</span>
        <span>Request reprocessing</span>
      </div>
    </WidgetFrame>
  );
}

function Integrity({ capability }: { capability: DeanWidgetCapability }) {
  const widget = widgets.find((item) => item.id === "integrity")!;
  return (
    <WidgetFrame widget={widget} capability={capability}>
      <div className="grid gap-3 md:grid-cols-2">
        {[
          ["Suspicious score spikes", "Form 3 Math rose 24 points in one stream.", "Risk score per class: 82"],
          ["Class grading inflation", "Teacher moderation spread exceeds department baseline.", "Flagged teachers: 2"],
          ["Missing marks patterns", "Class 7B has repeated science gaps.", "Flagged subjects: 3"],
          ["Subject inconsistency across classes", "English stream variance above allowed threshold.", "Risk score per class: 68"],
        ].map(([title, detail, score]) => (
          <div key={title} className="rounded-2xl border border-rose-100 bg-white p-4">
            <p className="font-black text-[#071D49]">{title}</p>
            <p className="mt-2 text-sm leading-6 text-[#64748B]">{detail}</p>
            <p className="mt-3 text-sm font-black text-rose-700">{score}</p>
          </div>
        ))}
      </div>
    </WidgetFrame>
  );
}

function TeacherTracker({ capability }: { capability: DeanWidgetCapability }) {
  const widget = widgets.find((item) => item.id === "teachers")!;
  return (
    <WidgetFrame widget={widget} capability={capability}>
      <div className="grid gap-3 md:grid-cols-4">
        {[
          ["Marks submitted", "91%"],
          ["Late submissions", "7"],
          ["Incomplete grading", "5"],
          ["Repeat offenders", "2"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-[#D9E2EF] bg-white p-4">
            <p className="text-sm font-bold text-[#64748B]">{label}</p>
            <p className="mt-2 text-3xl font-black text-[#071D49]">{value}</p>
          </div>
        ))}
      </div>
    </WidgetFrame>
  );
}

function Curriculum({ capability }: { capability: DeanWidgetCapability }) {
  const widget = widgets.find((item) => item.id === "curriculum")!;
  return (
    <WidgetFrame widget={widget} capability={capability}>
      <div className="grid gap-3 md:grid-cols-3">
        {["CBC strand coverage", "8-4-4 syllabus mapping", "International curriculum alignment"].map((item) => (
          <div key={item} className="rounded-2xl border border-[#D9E2EF] bg-white p-4">
            <p className="font-black text-[#071D49]">{item}</p>
            <p className="mt-2 text-sm leading-6 text-[#64748B]">Flags missing strands and over/under-weighted topics before approval.</p>
          </div>
        ))}
      </div>
    </WidgetFrame>
  );
}

function AcademicAlerts({ capability }: { capability: DeanWidgetCapability }) {
  const widget = widgets.find((item) => item.id === "alerts")!;
  return (
    <WidgetFrame widget={widget} capability={capability}>
      <div className="space-y-3">
        {[
          "Class 7B missing 3 subjects marks",
          "Math grading deviation detected",
          "Exam X not fully moderated",
        ].map((alert) => (
          <div key={alert} className="rounded-2xl border border-amber-100 bg-white p-4 text-sm font-black text-[#071D49]">
            {alert}
          </div>
        ))}
      </div>
    </WidgetFrame>
  );
}

function ApprovalHistory({ capability }: { capability: DeanWidgetCapability }) {
  const widget = widgets.find((item) => item.id === "history")!;
  return (
    <WidgetFrame widget={widget} capability={capability}>
      <div className="space-y-3">
        {[
          ["Approved", "Term 2 CAT 1 report cards", "Immutable audit records created at 10:24 AM"],
          ["Returned", "Form 3 Chemistry sheet", "Version-controlled correction requested"],
          ["Rejected", "Class 7B Math batch", "Reason code required and captured"],
        ].map(([state, title, detail]) => (
          <div key={title} className="rounded-2xl border border-[#D9E2EF] bg-white p-4">
            <p className="text-sm font-black text-[#071D49]">{state}: {title}</p>
            <p className="mt-1 text-sm text-[#64748B]">{detail}</p>
          </div>
        ))}
      </div>
    </WidgetFrame>
  );
}

function Moderation({ capability }: { capability: DeanWidgetCapability }) {
  const widget = widgets.find((item) => item.id === "moderation")!;
  return (
    <WidgetFrame widget={widget} capability={capability}>
      <p className="text-sm font-semibold text-[#64748B]">All exam moderation queues are currently clear.</p>
    </WidgetFrame>
  );
}

function ResultsModeration({ capability, onAction }: { capability: DeanWidgetCapability; onAction: (label: string) => void }) {
  return (
    <WidgetFrame widget={widgets.find((item) => item.id === "pending")!} capability={capability}>
      <div className="grid gap-3">
        {[
          ["CBC competency reports", "96 learner summaries ready for moderation", "Ready"],
          ["Hybrid CBC + marks reports", "118 reports with score supplement and observations", "Review"],
          ["Legacy 8-4-4/KCSE reports", "74 transition reports retained as legacy format", "Legacy"],
        ].map(([title, detail, status]) => (
          <div key={title} className="rounded-2xl border border-[#D9E2EF] bg-white p-4">
            <p className="font-black text-[#071D49]">{title}</p>
            <p className="mt-1 text-sm font-semibold text-[#64748B]">{detail}</p>
            <p className="mt-2 text-xs font-black uppercase tracking-[0.14em] text-[#0B63CE]">{status}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <ActionButton onAction={onAction}>Open review</ActionButton>
        <ActionButton onAction={onAction}>Return for correction</ActionButton>
      </div>
    </WidgetFrame>
  );
}

function AcademicAnalytics() {
  return (
    <ShellCard title="Academic Analytics" description="Dean-level analytics keep CBC, hybrid, and legacy report queues separated before approval." icon={AlertTriangle}>
      <div className="grid gap-3 md:grid-cols-3">
        {[
          ["CBC readiness", "91%", "Missing observations tracked separately"],
          ["Hybrid readiness", "86%", "Marks supplement ready after comments"],
          ["Legacy readiness", "78%", "Transition classes only"],
        ].map(([label, value, helper]) => (
          <div key={label} className="rounded-2xl border border-[#D9E2EF] bg-[#F8FAFC] p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#64748B]">{label}</p>
            <p className="mt-2 text-3xl font-black text-[#071D49]">{value}</p>
            <p className="mt-1 text-sm font-semibold text-[#64748B]">{helper}</p>
          </div>
        ))}
      </div>
    </ShellCard>
  );
}

function Interventions({ onAction }: { onAction: (label: string) => void }) {
  return (
    <ShellCard title="Academic Interventions" description="Assign academic support without publishing reports or editing marks." icon={UserCheck}>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-3">
          {[
            ["Mathematics recovery", "Form 2 West | 14 learners below target | HOD Mathematics"],
            ["CBC observation completion", "Form 2 North | 3 learner observations missing | Class teacher"],
            ["Comment correction", "Form 2 East | 5 comments missing | Grade/Form Master"],
          ].map(([title, detail]) => (
            <div key={title} className="rounded-2xl border border-[#D9E2EF] bg-[#F8FAFC] p-4">
              <p className="font-black text-[#071D49]">{title}</p>
              <p className="mt-1 text-sm font-semibold text-[#64748B]">{detail}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-[#D9E2EF] bg-white p-4">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-[#64748B]">Action</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">Record the intervention assignment and notify the responsible academic role.</p>
          <div className="mt-4">
            <ActionButton onAction={onAction}>Assign intervention</ActionButton>
          </div>
        </div>
      </div>
    </ShellCard>
  );
}

function Overview({ capabilities }: { capabilities: Map<DeanView, DeanWidgetCapability> }) {
  const visibleWidgets = widgets.filter((widget) => widget.id !== "moderation").slice(0, 6);
  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl bg-[#071D49] p-6 text-white shadow-[0_24px_70px_rgba(7,29,73,0.22)]">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-100/70">Academic quality desk</p>
        <h2 className="mt-3 max-w-4xl text-3xl font-black tracking-[-0.02em] md:text-5xl">Academic Quality Control & Moderation Center</h2>
        <p className="mt-4 max-w-4xl text-base leading-8 text-sky-50/78">
          Review anomalies, validate report cards, and protect publishing quality between the Exams Office and Principal approval without editing marks.
        </p>
        <div className="mt-5">
          <DecisionFlow />
        </div>
      </section>
      <div className="grid gap-3 md:grid-cols-3">
        {[
          ["Pending reviews", "14", "Awaiting Dean decisions"],
          ["Integrity alerts", "6", "Anomaly checks active"],
          ["Report batches", "4", "Ready for quality gate"],
        ].map(([label, value, helper]) => (
          <div key={label} className="rounded-2xl border border-[#D9E2EF] bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#64748B]">{label}</p>
            <p className="mt-2 text-3xl font-black text-[#071D49]">{value}</p>
            <p className="mt-1 text-sm font-semibold text-[#64748B]">{helper}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {visibleWidgets.map((widget) => (
          <WidgetFrame key={widget.id} widget={widget} capability={capabilities.get(widget.id)!}>
            <p className="text-sm font-semibold text-[#64748B]">Decision-ready data is available for this approval queue.</p>
          </WidgetFrame>
        ))}
      </div>
    </div>
  );
}

function ActiveWorkspace({
  activeView,
  capabilities,
  onDeanAction,
}: {
  activeView: DeanView;
  capabilities: Map<DeanView, DeanWidgetCapability>;
  onDeanAction: (label: string) => void;
}) {
  switch (activeView) {
    case "academic-overview":
      return <Overview capabilities={capabilities} />;
    case "pending":
      return <PendingReviews capability={capabilities.get("pending")!} onAction={onDeanAction} />;
    case "moderation":
      return <Moderation capability={capabilities.get("moderation")!} />;
    case "results-moderation":
      return <ResultsModeration capability={capabilities.get("pending")!} onAction={onDeanAction} />;
    case "academic-analytics":
      return <AcademicAnalytics />;
    case "interventions":
      return <Interventions onAction={onDeanAction} />;
    case "reports":
      return <ReportCards capability={capabilities.get("reports")!} />;
    case "integrity":
      return <Integrity capability={capabilities.get("integrity")!} />;
    case "teachers":
      return <TeacherTracker capability={capabilities.get("teachers")!} />;
    case "alerts":
      return <AcademicAlerts capability={capabilities.get("alerts")!} />;
    case "curriculum":
      return <Curriculum capability={capabilities.get("curriculum")!} />;
    case "history":
      return <ApprovalHistory capability={capabilities.get("history")!} />;
    default:
      return <Overview capabilities={capabilities} />;
  }
}

export function DeanAcademicsCommandCenter({
  routeMode,
  examsEnabled = true,
  rolePermitted = true,
}: {
  routeMode: DeanRouteMode;
  examsEnabled?: boolean;
  rolePermitted?: boolean;
}) {
  const [activeView, setActiveView] = useState<DeanView>("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [notice, setNotice] = useState("Ready for academic review decisions.");
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const searchResults = searchTerm.trim()
    ? deanSearchRecords.filter((record) => `${record.label} ${record.detail}`.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];
  const capabilities = useMemo(() => {
    return new Map(
      widgets.map((widget) => [
        widget.id,
        resolveDeanWidgetState({
          examsEnabled,
          rolePermitted,
          hasData: widget.hasData,
        }),
      ]),
    );
  }, [examsEnabled, rolePermitted]);

  function openView(view: DeanView) {
    setActiveView(view);
    setNotice(`${getViewLabel(view)} opened.`);
  }

  function openSearchRecord(record: DeanSearchRecord) {
    setActiveView(record.view);
    setSearchTerm("");
    setNotice(`${record.label} opened in ${getViewLabel(record.view)}.`);
  }

  function openDeanAction(label: string) {
    setSelectedAction(label);
    setNotice(`${label} ready for Dean review.`);
  }

  function saveDeanAction() {
    if (!selectedAction) {
      return;
    }

    const schoolId = getCurrentSchoolId();
    const entityId = `dean-action-${selectedAction.toLowerCase().replaceAll(" ", "-")}`;
    publishSchoolOperationalEvent({
      schoolId,
      type: "ACADEMIC_DEAN_ACTION_RECORDED",
      module: "academics",
      actorRole: "Dean of Academics",
      title: `${selectedAction} recorded`,
      body: `${selectedAction} was recorded for Term 2 CAT 1 academic review.`,
      entityId,
      severity: selectedAction.toLowerCase().includes("reject") ? "warning" : "success",
      payload: {
        action: selectedAction,
        exam: "Term 2 CAT 1",
        classStream: "Class 7B",
        workspace: activeView,
      },
      notifications: [
        {
          audienceRoles: ["Exams Manager", "Principal", "Class Teacher"],
          title: `${selectedAction} academic review update`,
          body: "Dean of Academics updated the Term 2 CAT 1 review queue.",
          severity: selectedAction.toLowerCase().includes("reject") ? "warning" : "info",
          relatedModule: "academics",
          relatedRecordId: entityId,
        },
      ],
    });

    setNotice(`${selectedAction} saved for Dean follow-up.`);
    setSelectedAction(null);
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
            <div role="status" className="mb-4 rounded-xl border border-[#BFDBFE] bg-[#EEF5FF] px-4 py-3 text-sm font-bold text-[#071D49]">
              {notice}
            </div>
            {selectedAction ? (
              <div role="dialog" aria-modal="true" aria-label="Dean academic action" className="mb-4 rounded-2xl border border-[#BFDBFE] bg-white p-5 shadow-[0_18px_50px_rgba(7,29,73,0.1)]">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0B63CE]">Dean academic action</p>
                    <h2 className="mt-2 text-2xl font-black text-[#071D49]">{selectedAction}</h2>
                    <p className="mt-2 text-sm leading-6 text-[#64748B]">
                      Record this action against Term 2 CAT 1, notify Exams Manager and leadership, and keep the academic review trail school-scoped.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={saveDeanAction} className="min-h-11 rounded-xl bg-[#0B63CE] px-4 py-2 text-sm font-black text-white">
                      Save academic action
                    </button>
                    <button type="button" onClick={() => setSelectedAction(null)} className="min-h-11 rounded-xl border border-[#C7D4E6] bg-white px-4 py-2 text-sm font-black text-[#071D49]">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
            <ActiveWorkspace activeView={activeView} capabilities={capabilities} onDeanAction={openDeanAction} />
            <div className="mt-4">
              <ShellCard title="Dean Permission Model" description="This dashboard reviews and routes exam outputs. It never edits marks, publishes results, or overrides principal approval." icon={CheckCircle2}>
                <div className="grid gap-3 md:grid-cols-4">
                  {["View exams: allowed", "Approve exams: allowed", "Reject exams: allowed", "Publish results: blocked"].map((item) => (
                    <div key={item} className="rounded-2xl border border-[#D9E2EF] bg-[#F8FAFC] p-3 text-sm font-black text-[#071D49]">
                      {item}
                    </div>
                  ))}
                </div>
              </ShellCard>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
