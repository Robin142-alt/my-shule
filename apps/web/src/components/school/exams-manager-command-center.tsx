"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileSpreadsheet,
  GraduationCap,
  LockKeyhole,
  PenLine,
  Search,
  Send,
  type LucideIcon,
} from "lucide-react";

import { ApprovalInbox } from "@/components/shared/approval-inbox";
import { NotificationBell } from "@/components/shared/notification-bell";
import { TaskQueue } from "@/components/shared/task-queue";
import { AnalysisWorkspace } from "./exams-manager/analysis-workspace";
import { ExamSetupWorkspace } from "./exams-manager/exam-setup-workspace";
import { ExamTimetableWorkspace } from "./exams-manager/exam-timetable-workspace";
import { MarksEntryWorkspace } from "./exams-manager/marks-entry-workspace";
import { ModerationWorkspace } from "./exams-manager/moderation-workspace";
import { OverviewWorkspace } from "./exams-manager/overview-workspace";
import { PublishingWorkspace } from "./exams-manager/publishing-workspace";
import { ReportCardsWorkspace } from "./exams-manager/report-cards-workspace";
import { ReportsWorkspace } from "./exams-manager/reports-workspace";
import { buildSchoolSectionHref } from "./school-pages";

type ExamsManagerRouteMode = "hosted" | "public";

type ExamsManagerCanonicalView =
  | "overview"
  | "exam-setup"
  | "exam-timetable"
  | "marks-entry"
  | "moderation"
  | "analysis"
  | "report-cards"
  | "publishing"
  | "reports";

type ExamsManagerLegacyView =
  | "dashboard"
  | "builder"
  | "scheduler"
  | "marks"
  | "missing-marks"
  | "grading"
  | "drafts"
  | "report-templates"
  | "academic-analytics"
  | "submissions"
  | "validation"
  | "exports"
  | "audit-log"
  | "archive";

type ExamsManagerView = ExamsManagerCanonicalView | ExamsManagerLegacyView;

type NavItem = {
  id: ExamsManagerCanonicalView;
  label: string;
  summary: string;
  icon: LucideIcon;
  aliases: ExamsManagerView[];
};

const routeAliases: Record<ExamsManagerView, ExamsManagerCanonicalView> = {
  dashboard: "overview",
  overview: "overview",
  builder: "exam-setup",
  "exam-setup": "exam-setup",
  scheduler: "exam-timetable",
  "exam-timetable": "exam-timetable",
  marks: "marks-entry",
  "missing-marks": "marks-entry",
  submissions: "marks-entry",
  "marks-entry": "marks-entry",
  moderation: "moderation",
  validation: "moderation",
  grading: "analysis",
  "academic-analytics": "analysis",
  analysis: "analysis",
  drafts: "report-cards",
  "report-templates": "report-cards",
  "report-cards": "report-cards",
  publishing: "publishing",
  exports: "reports",
  "audit-log": "reports",
  archive: "reports",
  reports: "reports",
};

const navItems: NavItem[] = [
  {
    id: "overview",
    label: "Exam Command Center",
    summary: "Live exam cycle metrics, marks progress, and tenant-clean recent exams.",
    icon: GraduationCap,
    aliases: ["dashboard", "overview"],
  },
  {
    id: "exam-setup",
    label: "Exam Setup",
    summary: "Create and manage exam cycles before timetable, marks, and reports can run.",
    icon: ClipboardList,
    aliases: ["builder", "exam-setup"],
  },
  {
    id: "exam-timetable",
    label: "Exam Timetable",
    summary: "Schedule exam sessions, venues, and invigilation from real timetable slots.",
    icon: CalendarDays,
    aliases: ["scheduler", "exam-timetable"],
  },
  {
    id: "marks-entry",
    label: "Marks Entry Hub",
    summary: "Monitor submitted marks, missing entries, teacher progress, and locked sheets.",
    icon: PenLine,
    aliases: ["marks", "missing-marks", "submissions", "marks-entry"],
  },
  {
    id: "moderation",
    label: "Data Validation",
    summary: "Review submitted marks, approve clean submissions, and return errors with reasons.",
    icon: ClipboardCheck,
    aliases: ["moderation", "validation"],
  },
  {
    id: "analysis",
    label: "Grade Processing",
    summary: "Analyze grades and class performance after real marks exist.",
    icon: BarChart3,
    aliases: ["grading", "academic-analytics", "analysis"],
  },
  {
    id: "report-cards",
    label: "Report Cards",
    summary: "Track generated report cards and readiness for school approval.",
    icon: FileSpreadsheet,
    aliases: ["drafts", "report-templates", "report-cards"],
  },
  {
    id: "publishing",
    label: "Publishing",
    summary: "Manage publish-ready result batches after moderation and approvals.",
    icon: Send,
    aliases: ["publishing"],
  },
  {
    id: "reports",
    label: "Reports & Audit",
    summary: "Compile exam operations reports and review generated report snapshots.",
    icon: FileSpreadsheet,
    aliases: ["exports", "audit-log", "archive", "reports"],
  },
];

const navById = new Map(navItems.map((item) => [item.id, item]));

export function canonicalizeExamsManagerView(section?: string): ExamsManagerCanonicalView {
  const normalized = String(section || "overview").trim() as ExamsManagerView;
  return routeAliases[normalized] ?? "overview";
}

function updateBrowserPath(view: ExamsManagerCanonicalView, routeMode: ExamsManagerRouteMode) {
  if (typeof window === "undefined") return;

  window.history.replaceState(null, "", buildSchoolSectionHref("exams-manager", view, routeMode));
}

function StatusNotice({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="rounded-2xl border border-[#D9E2EF] bg-white px-4 py-3 text-sm font-bold leading-6 text-[#071D49] shadow-sm"
    >
      {children}
    </div>
  );
}

function LockedWorkspace({ reason }: { reason: string }) {
  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-[#071D49]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-amber-700 shadow-sm">
          <LockKeyhole className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xl font-black">Exams workspace locked</h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-amber-900">
            {reason}
          </p>
          <p className="mt-2 text-sm leading-6 text-amber-900">
            The workspace remains visible for operations awareness, but mutations require the Exams module and the exams manager permission set.
          </p>
        </div>
      </div>
    </section>
  );
}

function Workspace({ view }: { view: ExamsManagerCanonicalView }) {
  switch (view) {
    case "exam-setup":
      return <ExamSetupWorkspace />;
    case "exam-timetable":
      return <ExamTimetableWorkspace />;
    case "marks-entry":
      return <MarksEntryWorkspace />;
    case "moderation":
      return <ModerationWorkspace />;
    case "analysis":
      return <AnalysisWorkspace />;
    case "report-cards":
      return <ReportCardsWorkspace />;
    case "publishing":
      return <PublishingWorkspace />;
    case "reports":
      return <ReportsWorkspace />;
    case "overview":
    default:
      return <OverviewWorkspace />;
  }
}

export function ExamsManagerCommandCenter({
  activeSection,
  routeMode,
  examsEnabled = true,
  rolePermitted = true,
}: {
  activeSection?: string;
  routeMode?: ExamsManagerRouteMode;
  examsEnabled?: boolean;
  rolePermitted?: boolean;
}) {
  const actualRouteMode = routeMode ?? "hosted";
  const [activeView, setActiveViewState] = useState<ExamsManagerCanonicalView>(() =>
    canonicalizeExamsManagerView(activeSection),
  );
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setActiveViewState(canonicalizeExamsManagerView(activeSection));
  }, [activeSection]);

  const activeItem = navById.get(activeView) ?? navItems[0];
  const lockedReason = !examsEnabled
    ? "The Exams module is not enabled for this school. Ask the platform owner to enable Exams before creating exam cycles or report cards."
    : !rolePermitted
      ? "Your current role is not allowed to manage exam setup, marks, moderation, or report publishing."
      : null;

  const searchResults = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return [];

    return navItems.filter((item) =>
      [item.label, item.summary, item.id, ...item.aliases].some((value) =>
        String(value).toLowerCase().includes(query),
      ),
    );
  }, [searchTerm]);

  function setActiveView(view: ExamsManagerCanonicalView) {
    setActiveViewState(view);
    setSearchTerm("");
    updateBrowserPath(view, actualRouteMode);
  }

  return (
    <div
      data-testid="role-operational-command-center"
      data-route-mode={actualRouteMode}
      className="min-h-screen bg-[#EEF3F8] text-[#071D49]"
    >
      <div className="flex min-h-screen">
        <aside className="hidden w-[296px] shrink-0 border-r border-white/15 bg-[#071D49] p-5 text-white shadow-2xl lg:flex lg:flex-col">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#8BB9FF]">
              MyShule Exams
            </p>
            <h2 className="mt-3 text-2xl font-black">Exams Manager</h2>
            <p className="mt-2 text-sm leading-6 text-blue-100">
              Tenant-scoped exam setup, marks, moderation, reports, and publishing.
            </p>
          </div>

          <nav aria-label="Exams Manager navigation" className="mt-8 flex-1 space-y-2 overflow-y-auto pr-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const selected = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-label={item.label}
                  onClick={() => setActiveView(item.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
                    selected ? "bg-white text-[#071D49] shadow-lg" : "text-blue-100 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/10 p-4 text-sm text-blue-100">
            <p className="font-black text-white">Access</p>
            <p className="mt-1">School-scoped exams desk</p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-[#D9E2EF] bg-white/90 px-4 py-4 backdrop-blur md:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#64748B]">
                  Exam setup and report cards
                </p>
                <h1 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">
                  Exams Manager Desk
                </h1>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#64748B]">
                  {activeItem.summary}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative hidden items-center gap-2 rounded-2xl border border-[#D9E2EF] bg-[#F8FAFC] px-3 py-2 text-sm font-bold text-[#64748B] md:flex">
                  <Search className="h-4 w-4" aria-hidden="true" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && searchResults[0]) {
                        setActiveView(searchResults[0].id);
                      }
                    }}
                    aria-label="Search exams manager workspace"
                    placeholder="Search exams workspaces"
                    className="w-64 bg-transparent text-sm font-bold outline-none placeholder:text-[#64748B]"
                  />
                  {searchTerm.trim().length > 0 ? (
                    <div className="absolute right-0 top-12 z-30 w-96 overflow-hidden rounded-2xl border border-[#D9E2EF] bg-white text-[#071D49] shadow-2xl">
                      {searchResults.length > 0 ? (
                        searchResults.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setActiveView(item.id)}
                            className="block w-full px-4 py-3 text-left hover:bg-blue-50"
                          >
                            <span className="block font-black">{item.label}</span>
                            <span className="mt-1 block text-xs font-semibold text-[#64748B]">
                              {item.summary}
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="px-4 py-3 text-sm font-bold text-[#64748B]">
                          No matching exams workspace found.
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <TaskQueue />
                  <ApprovalInbox currentUserId="school" />
                  <NotificationBell />
                </div>

                <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">
                  Tenant-scoped exams desk
                </span>
              </div>
            </div>

            <div className="mt-4 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  aria-label={`${item.label} quick tab`}
                  onClick={() => setActiveView(item.id)}
                  className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                    activeView === item.id
                      ? "bg-[#071D49] text-white"
                      : "border border-[#D9E2EF] bg-white text-[#64748B]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </header>

          <main className="flex-1 px-4 py-6 md:px-8">
            <div className="mb-5 grid gap-3">
              <StatusNotice>
                {lockedReason
                  ? lockedReason
                  : `${activeItem.label} is connected to the live exams backend. Fresh schools only show records created inside that school.`}
              </StatusNotice>
            </div>

            <section className="mb-6 rounded-3xl border border-[#D9E2EF] bg-gradient-to-br from-[#071D49] via-[#0B3478] to-[#0B63CE] p-6 text-white shadow-[0_28px_70px_rgba(7,29,73,0.18)]">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-100">
                Exams Manager Dashboard
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
                Exam setup, marks, moderation, and report-card preparation.
              </h2>
              <p className="mt-4 max-w-4xl text-sm leading-7 text-blue-50 md:text-base">
                Create exam cycles first, schedule sessions, monitor teacher mark entry, moderate results,
                then prepare report cards and publishing reports from live school records.
              </p>
            </section>

            {lockedReason ? <LockedWorkspace reason={lockedReason} /> : <Workspace view={activeView} />}
          </main>
        </div>
      </div>
    </div>
  );
}
