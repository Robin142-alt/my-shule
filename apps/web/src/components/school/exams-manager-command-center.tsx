"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Download,
  FileSpreadsheet,
  GraduationCap,
  LockKeyhole,
  PenLine,
  Search,
  Send,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { ApprovalInbox } from "@/components/shared/approval-inbox";
import { MobileWorkspaceNavigation } from "@/components/shared/mobile-workspace-navigation";
import { ImportsTemplatesWorkspace } from "@/components/modules/exams-manager/workspaces/imports-templates-workspace";
import { NotificationBell } from "@/components/shared/notification-bell";
import { IntegratedSchoolCommandHeader, SchoolCommandSidebarIdentity } from "@/components/school/integrated-school-command-header";
import { TaskQueue } from "@/components/shared/task-queue";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { downloadCsvFile } from "@/lib/dashboard/export";
import { AnalysisWorkspace } from "./exams-manager/analysis-workspace";
import { ExamSetupWorkspace } from "./exams-manager/exam-setup-workspace";
import { ExamTimetableWorkspace } from "./exams-manager/exam-timetable-workspace";
import { MarksEntryWorkspace } from "./exams-manager/marks-entry-workspace";
import { ModerationWorkspace } from "./exams-manager/moderation-workspace";
import { OverviewWorkspace } from "./exams-manager/overview-workspace";
import { PublishingWorkspace } from "./exams-manager/publishing-workspace";
import { ReportCardsWorkspace } from "./exams-manager/report-cards-workspace";
import { ReportsWorkspace } from "./exams-manager/reports-workspace";
import type { TeacherMarkSheet } from "./exams-manager/teacher-marks-progress";
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
  | "imports-templates"
  | "reports";

type ExamsManagerLegacyView =
  | "dashboard"
  | "exams"
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
  | "handoff"
  | "dean-approval"
  | "exports"
  | "imports"
  | "templates"
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

type MarksEntryExportResponse = {
  entries?: TeacherMarkSheet[];
};

const routeAliases: Record<ExamsManagerView, ExamsManagerCanonicalView> = {
  dashboard: "overview",
  overview: "overview",
  exams: "exam-setup",
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
  handoff: "publishing",
  "dean-approval": "publishing",
  imports: "imports-templates",
  templates: "imports-templates",
  "imports-templates": "imports-templates",
  exports: "reports",
  "audit-log": "reports",
  archive: "reports",
  reports: "reports",
};

const navItems: NavItem[] = [
  {
    id: "overview",
    label: "Exam Command Center",
    summary: "Exam cycles, outstanding teachers, and progress toward results.",
    icon: GraduationCap,
    aliases: ["dashboard", "overview"],
  },
  {
    id: "exam-setup",
    label: "Exam Setup / Exam Builder",
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
    label: "Report Card Handoff",
    summary: "Submit generated report cards to the Dean and recall cards that need correction.",
    icon: Send,
    aliases: ["publishing", "handoff", "dean-approval"],
  },
  {
    id: "imports-templates",
    label: "Imports & Templates",
    summary: "Preview CSV mark uploads, commit valid batches, download templates, and roll back imports.",
    icon: Upload,
    aliases: ["imports", "templates", "imports-templates"],
  },
  {
    id: "reports",
    label: "Reports & Audit",
    summary: "Compile exam operations reports and review generated report snapshots.",
    icon: FileSpreadsheet,
    aliases: ["exports", "audit-log", "archive", "reports"],
  },
];



export function canonicalizeExamsManagerView(section?: string): ExamsManagerCanonicalView {
  const normalized = String(section || "overview").trim() as ExamsManagerView;
  return routeAliases[normalized] ?? "overview";
}

function updateBrowserPath(view: ExamsManagerCanonicalView, routeMode: ExamsManagerRouteMode) {
  if (typeof window === "undefined") return;

  window.history.replaceState(null, "", buildSchoolSectionHref("exams-manager", view, routeMode));
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

function Workspace({
  view,
  onNavigate,
}: {
  view: ExamsManagerCanonicalView;
  onNavigate: (view: ExamsManagerCanonicalView) => void;
}) {
  switch (view) {
    case "exam-setup":
      return <ExamSetupWorkspace />;
    case "exam-timetable":
      return <ExamTimetableWorkspace />;
    case "marks-entry":
      return <MarksEntryWorkspace onOpenSetup={() => onNavigate("exam-setup")} />;
    case "moderation":
      return <ModerationWorkspace />;
    case "analysis":
      return (
        <AnalysisWorkspace
          onOpenMarks={() => onNavigate("marks-entry")}
          onOpenReportCards={() => onNavigate("report-cards")}
        />
      );
    case "report-cards":
      return <ReportCardsWorkspace />;
    case "publishing":
      return <PublishingWorkspace />;
    case "imports-templates":
      return <ImportsTemplatesWorkspace model={{}} />;
    case "reports":
      return <ReportsWorkspace />;
    case "overview":
    default:
      return <OverviewWorkspace onNavigate={onNavigate} />;
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
  const [commandState, setCommandState] = useState<"export" | null>(null);

  useEffect(() => {
    setActiveViewState(canonicalizeExamsManagerView(activeSection));
  }, [activeSection]);

  const lockedReason = !examsEnabled
    ? "The Exams module is not enabled for this school. Ask the platform owner to enable Exams before creating exam cycles or report cards."
    : !rolePermitted
      ? "Your current role is not allowed to manage exam setup, marks, moderation, or report-card handoff."
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

  function requestMarksImport() {
    setActiveView("imports-templates");
    toast.info("Open the marks CSV upload workflow, preview rows, then commit the valid batch.");
  }

  function openExternalImportWorkspace() {
    setActiveView("imports-templates");
    toast.info("Use templates or upload a CSV export, preview validation, then commit the valid school-scoped batch.");
  }

  async function requestMarksExport() {
    setCommandState("export");
    try {
      const response = await requestDashboardApi<MarksEntryExportResponse>("/admin-command/exams-manager/teacher-mark-progress");
      const entries = Array.isArray(response.entries) ? response.entries : [];

      if (entries.length === 0) {
        setActiveView("marks-entry");
        toast.error("No mark-entry sheets are available to export yet. Set up an exam with subjects and classes first.");
        return;
      }

      downloadCsvFile({
        filename: `teacher-mark-progress-${new Date().toISOString().slice(0, 10)}.csv`,
        headers: ["exam_name", "subject", "paper", "class_name", "stream", "teacher", "total_students", "entered", "recorded", "submitted", "missing", "deadline", "status", "overdue"],
        rows: entries.map((entry) => [
          entry.exam_name ?? "",
          entry.subject ?? "",
          entry.paper ?? "",
          entry.class_name ?? "",
          entry.stream ?? "",
          entry.teacher ?? "",
          String(entry.total_students ?? 0),
          String(entry.entered ?? 0),
          String(entry.recorded ?? 0),
          String(entry.submitted ?? 0),
          String(entry.missing ?? 0),
          entry.deadline ?? "",
          entry.status ?? "",
          entry.overdue ? "Yes" : "No",
        ].map(value => /^[=+\-@\t\r]/.test(value) ? `'${value}` : value)),
      });
      toast.success(`Downloaded ${entries.length} marks-entry row${entries.length === 1 ? "" : "s"}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not export marks.");
    } finally {
      setCommandState(null);
    }
  }

  return (
    <div
      data-testid="role-operational-command-center"
      data-route-mode={actualRouteMode}
      className="min-h-dvh bg-slate-50 text-slate-900"
    >
      <div className="flex min-h-dvh">
        <aside className="sticky top-0 hidden h-dvh w-[240px] shrink-0 flex-col border-r border-white/10 bg-[#101F36] p-3 text-white lg:flex">
          <SchoolCommandSidebarIdentity eyebrow="Examinations" className="!rounded-lg !border-0 !bg-transparent !p-2 !shadow-none" />

          <nav aria-label="Exams Manager navigation" className="mt-3 flex-1 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const selected = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-label={item.label}
                  aria-current={selected ? "page" : undefined}
                  onClick={() => setActiveView(item.id)}
                  className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                    selected ? "bg-white text-[#071D49]" : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <p className="mt-4 border-t border-white/10 px-3 pt-4 text-xs text-slate-400">Examinations workspace</p>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-slate-200 bg-white px-4 py-3 md:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">

              <div className="flex w-full flex-wrap items-center gap-3">
                <div className="relative hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 md:flex">
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
                    className="w-44 bg-transparent text-sm outline-none placeholder:text-slate-400"
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

                <div className="ml-auto flex items-center gap-2">
                  <TaskQueue />
                  <ApprovalInbox />
                  <NotificationBell />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={requestMarksImport}
                    disabled={Boolean(lockedReason) || commandState !== null}
                    className="inline-flex items-center gap-2 min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    Import marks
                  </button>
                  <button
                    type="button"
                    onClick={requestMarksExport}
                    disabled={Boolean(lockedReason) || commandState !== null}
                    className="inline-flex items-center gap-2 min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    {commandState === "export" ? "Exporting..." : "Export progress"}
                  </button>
                  <button
                    type="button"
                    onClick={openExternalImportWorkspace}
                    disabled={Boolean(lockedReason) || commandState !== null}
                    className="inline-flex items-center gap-2 min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                    CSV templates
                  </button>
                </div>

              </div>
            </div>

            <div className="mt-4 lg:hidden">
              <MobileWorkspaceNavigation
                label="Exams workspace"
                items={navItems.map((item) => ({
                  ...item,
                  description: item.summary,
                  group: ["overview", "exam-setup", "exam-timetable"].includes(item.id)
                    ? "Setup"
                    : ["marks-entry", "moderation", "analysis"].includes(item.id)
                      ? "Marks & analysis"
                      : "Publishing & reports",
                }))}
                value={activeView}
                onValueChange={(value) => setActiveView(value as ExamsManagerCanonicalView)}
                testId="exams-manager-mobile-workspace-nav"
              />
            </div>
          </header>

          <main className="min-w-0 flex-1 px-4 py-5 md:px-6">
            <IntegratedSchoolCommandHeader roleTitle="Exams Manager Dashboard" fallbackUserLabel="Exams Manager" className="mb-5 !rounded-none !border-0 !bg-transparent !p-0 !shadow-none [&_h1]:!text-xl [&_h1]:!font-semibold" />

            {lockedReason ? (
              <LockedWorkspace reason={lockedReason} />
            ) : (
              <Workspace view={activeView} onNavigate={setActiveView} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
