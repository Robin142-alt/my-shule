"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  BookMarked,
  BookOpen,
  CalendarDays,
  ClipboardList,
  FileEdit,
  FileText,
  GraduationCap,
  Search,
  Target,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { ApprovalInbox } from "@/components/shared/approval-inbox";
import { MobileWorkspaceNavigation } from "@/components/shared/mobile-workspace-navigation";
import { NotificationBell } from "@/components/shared/notification-bell";
import {
  SchoolCommandSidebarIdentity,
  useSchoolCommandIdentity,
} from "@/components/school/integrated-school-command-header";
import { SchoolDashboardRoleSwitcher } from "@/components/school/school-dashboard-role-switcher";
import { TaskQueue } from "@/components/shared/task-queue";

import { buildSchoolSectionHref } from "./school-pages";
import { AcademicInterventionsWorkspace } from "./dean-academics/academic-interventions-workspace";
import { AssessmentsWorkspace } from "./dean-academics/assessments-workspace";
import { CurriculumCoverageWorkspace } from "./dean-academics/curriculum-coverage-workspace";
import { DepartmentPerformanceWorkspace } from "./dean-academics/department-performance-workspace";
import { LessonLogsWorkspace } from "./dean-academics/lesson-logs-workspace";
import { LessonPlansWorkspace } from "./dean-academics/lesson-plans-workspace";
import { OverviewWorkspace } from "./dean-academics/overview-workspace";
import { TeacherWorkloadWorkspace } from "./dean-academics/teacher-workload-workspace";
import { LiveReportCardsWorkspace } from "./live-report-cards-workspace";
import { StaffTimetableOverviewWorkspace } from "./staff-timetable-overview-workspace";
import { cn } from "./dean-academics/shared";

type DeanRouteMode = "hosted" | "public";

export type DeanView =
  | "overview"
  | "curriculum-coverage"
  | "department-performance"
  | "teacher-workload"
  | "timetable"
  | "lesson-plans"
  | "lesson-logs"
  | "assessments"
  | "academic-interventions"
  | "reports";

type DeanNavItem = {
  id: DeanView;
  label: string;
  description: string;
  icon: LucideIcon;
  group: string;
};

const deanNavItems: DeanNavItem[] = [
  {
    id: "overview",
    label: "Academic Overview",
    description: "School-wide academic health and current operating metrics.",
    icon: GraduationCap,
    group: "Academic office",
  },
  {
    id: "assessments",
    label: "Assessments",
    description:
      "Review submitted marks, lock reviewed batches, and approve report cards.",
    icon: ClipboardList,
    group: "Academic office",
  },
  {
    id: "reports",
    label: "Academic Reports",
    description: "Preview and download academic report cards.",
    icon: FileText,
    group: "Academic office",
  },
  {
    id: "curriculum-coverage",
    label: "Curriculum Coverage",
    description: "Coverage progress across departments and classes.",
    icon: BookOpen,
    group: "Teaching",
  },
  {
    id: "teacher-workload",
    label: "Teacher Workload",
    description: "Teaching load, allocation, and follow-up visibility.",
    icon: UsersRound,
    group: "Teaching",
  },
  {
    id: "timetable",
    label: "Master Timetable",
    description:
      "School-wide published lessons, teacher load, classes, and shared resources.",
    icon: CalendarDays,
    group: "Teaching",
  },
  {
    id: "lesson-plans",
    label: "Lesson Plans",
    description: "Review submitted lesson plans before academic use.",
    icon: BookMarked,
    group: "Teaching",
  },
  {
    id: "lesson-logs",
    label: "Lesson Logs",
    description: "Audit delivered lessons and academic continuity.",
    icon: FileEdit,
    group: "Teaching",
  },
  {
    id: "department-performance",
    label: "Department Performance",
    description: "Compare department outcomes and academic trends.",
    icon: BarChart3,
    group: "Progress & support",
  },
  {
    id: "academic-interventions",
    label: "Academic Interventions",
    description: "Track learners, classes, and departments needing support.",
    icon: Target,
    group: "Progress & support",
  },
];

const deanViewAliases: Record<string, DeanView> = {
  dashboard: "overview",
  "academic-overview": "overview",
  academics: "overview",
  curriculum: "curriculum-coverage",
  syllabus: "curriculum-coverage",
  "curriculum-coverage": "curriculum-coverage",
  "academic-analytics": "department-performance",
  "department-performance": "department-performance",
  "student-analytics": "department-performance",
  teachers: "teacher-workload",
  staff: "teacher-workload",
  "teacher-workload": "teacher-workload",
  timetable: "timetable",
  "timetable-builder": "timetable",
  "lesson-plans": "lesson-plans",
  "lesson-logs": "lesson-logs",
  attendance: "lesson-logs",
  pending: "assessments",
  approvals: "assessments",
  "universal-approvals": "assessments",
  moderation: "assessments",
  "results-moderation": "assessments",
  integrity: "assessments",
  exams: "assessments",
  marks: "assessments",
  grading: "assessments",
  validation: "assessments",
  assessments: "assessments",
  interventions: "academic-interventions",
  alerts: "academic-interventions",
  "academic-interventions": "academic-interventions",
  history: "reports",
  reports: "reports",
  "reports-analytics": "reports",
};

export function normalizeDeanView(section?: string): DeanView {
  if (!section) {
    return "overview";
  }

  return deanViewAliases[section] ?? "overview";
}

function getDeanViewLabel(view: DeanView) {
  return (
    deanNavItems.find((item) => item.id === view)?.label ?? "Academic Overview"
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
    <aside className="hidden h-full w-[232px] shrink-0 flex-col border-r border-slate-200 bg-[#F8FAFC] lg:flex">
      <SchoolCommandSidebarIdentity
        eyebrow="MyShule / Academic office"
        tone="light"
        compact
      />

      <nav
        className="min-h-0 flex-1 overflow-y-auto px-3 pb-4"
        aria-label="Dean of Academics navigation"
      >
        {deanNavItems.map((item, index) => {
          const showGroup = item.group !== deanNavItems[index - 1]?.group;
          const Icon = item.icon;
          const active = activeView === item.id;

          return (
            <div key={`${item.group}-${item.id}`}>
              {showGroup ? (
                <p className="px-3 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {item.group}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => onViewChange(item.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "mb-0.5 flex min-h-10 w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] font-medium transition focus-visible:outline-2 focus-visible:outline-blue-600",
                  active
                    ? "bg-[#E5EDF8] text-[#174789]"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
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
  activeView: DeanView;
  searchTerm: string;
  searchResults: DeanNavItem[];
  onSearchTermChange: (value: string) => void;
  onSearchResult: (item: DeanNavItem) => void;
  onViewChange: (view: DeanView) => void;
}) {
  const { schoolName } = useSchoolCommandIdentity();
  return (
    <header className="app-command-topbar z-20 border-b border-slate-200 bg-white px-4 py-3 lg:sticky lg:top-0 lg:px-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 xl:grid-cols-[minmax(0,1fr)_auto_auto]">
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-slate-900">
            Dean of Academics
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            <span className="lg:hidden">{schoolName} · </span>
            {getDeanViewLabel(activeView)}
          </p>
        </div>

        <div className="order-3 col-span-2 flex flex-wrap items-center gap-2 xl:order-2 xl:col-span-1">
          <div className="relative min-w-0 flex-1 sm:w-60 sm:flex-none">
            <label className="flex min-h-10 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              <Search className="h-4 w-4" />
              <span className="sr-only">Dean workspace search</span>
              <input
                value={searchTerm}
                onChange={(event) => onSearchTermChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") onSearchTermChange("");
                  if (event.key === "Enter" && searchResults[0]) {
                    event.preventDefault();
                    onSearchResult(searchResults[0]);
                  }
                }}
                className="w-full bg-transparent outline-none"
                placeholder="Find a workspace…"
              />
            </label>
            {searchTerm.trim() ? (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-xl border border-[#D8E0EC] bg-white p-2 shadow-xl">
                {searchResults.length > 0 ? (
                  searchResults.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSearchResult(item)}
                      className="w-full rounded-lg px-3 py-2 text-left transition hover:bg-[#F3F6FA]"
                    >
                      <span className="block text-sm font-semibold text-[#071D49]">
                        {item.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-[#64748B]">
                        {item.description}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="rounded-lg px-3 py-3 text-sm font-semibold text-[#64748B]">
                    No matching academic workspace.
                  </p>
                )}
              </div>
            ) : null}
          </div>
          <TaskQueue />
          <ApprovalInbox />
          <NotificationBell />
        </div>
        <div className="order-2 max-w-[175px] sm:max-w-none xl:order-3">
          <SchoolDashboardRoleSwitcher className="w-full sm:w-auto" />
        </div>
      </div>

      <div className="mt-3 lg:hidden">
        <MobileWorkspaceNavigation
          label="Dean workspace"
          items={deanNavItems}
          value={activeView}
          onValueChange={(value) => onViewChange(value as DeanView)}
          testId="dean-mobile-workspace-nav"
        />
      </div>
    </header>
  );
}

function DeanWorkspace({
  activeView,
  onNavigate,
}: {
  activeView: DeanView;
  onNavigate: (view: DeanView) => void;
}) {
  switch (activeView) {
    case "curriculum-coverage":
      return (
        <CurriculumCoverageWorkspace
          onOpenPlans={() => onNavigate("lesson-plans")}
          onOpenLogs={() => onNavigate("lesson-logs")}
        />
      );
    case "department-performance":
      return (
        <DepartmentPerformanceWorkspace
          onOpenAssessments={() => onNavigate("assessments")}
          onOpenInterventions={() => onNavigate("academic-interventions")}
          onOpenReports={() => onNavigate("reports")}
        />
      );
    case "teacher-workload":
      return (
        <TeacherWorkloadWorkspace
          onOpenTimetable={() => onNavigate("timetable")}
        />
      );
    case "timetable":
      return (
        <StaffTimetableOverviewWorkspace
          title="Academic master timetable"
          description="A school-wide published view for academic continuity, workload review, and resource coordination."
        />
      );
    case "lesson-plans":
      return <LessonPlansWorkspace />;
    case "lesson-logs":
      return <LessonLogsWorkspace />;
    case "assessments":
      return (
        <AssessmentsWorkspace onOpenReports={() => onNavigate("reports")} />
      );
    case "academic-interventions":
      return <AcademicInterventionsWorkspace />;
    case "reports":
      return <LiveReportCardsWorkspace audience="dean" />;
    case "overview":
    default:
      return <OverviewWorkspace onNavigate={onNavigate} />;
  }
}

export function DeanAcademicsCommandCenter({
  activeSection,
  routeMode = "hosted",
}: {
  activeSection?: string;
  routeMode?: DeanRouteMode;
  examsEnabled?: boolean;
  rolePermitted?: boolean;
}) {
  const [activeView, setActiveView] = useState<DeanView>(() =>
    normalizeDeanView(activeSection),
  );
  const [searchTerm, setSearchTerm] = useState("");
  const workspaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveView(normalizeDeanView(activeSection));
  }, [activeSection]);

  useEffect(() => {
    const restoreView = () => {
      setActiveView(
        normalizeDeanView(
          window.location.pathname.split("/").filter(Boolean).pop(),
        ),
      );
      setSearchTerm("");
    };
    window.addEventListener("popstate", restoreView);
    return () => window.removeEventListener("popstate", restoreView);
  }, []);

  useEffect(() => {
    if (workspaceRef.current) workspaceRef.current.scrollTop = 0;
    window.scrollTo(0, 0);
  }, [activeView]);

  const searchResults = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return [];
    }

    return deanNavItems.filter((item) =>
      `${item.label} ${item.description} ${item.group}`
        .toLowerCase()
        .includes(query),
    );
  }, [searchTerm]);

  function openView(view: DeanView) {
    const nextView = normalizeDeanView(view);
    setActiveView(nextView);
    setSearchTerm("");

    if (typeof window !== "undefined") {
      const href = buildSchoolSectionHref(
        "dean-academics",
        nextView,
        routeMode,
      );
      if (window.location.pathname !== href)
        window.history.pushState(null, "", href);
    }
  }

  function openSearchResult(item: DeanNavItem) {
    openView(item.id);
  }

  return (
    <div
      data-testid="role-operational-command-center"
      data-role-dashboard="dean-academics"
      data-active-view={activeView}
      className="authenticated-app min-h-dvh bg-[#F5F7FA] text-slate-800 lg:h-dvh lg:overflow-hidden"
    >
      <div className="flex min-h-dvh lg:h-full">
        <Sidebar activeView={activeView} onViewChange={openView} />
        <main className="app-command-main min-w-0 flex-1 lg:flex lg:h-full lg:flex-col">
          <Topbar
            activeView={activeView}
            searchTerm={searchTerm}
            searchResults={searchResults}
            onSearchTermChange={setSearchTerm}
            onSearchResult={openSearchResult}
            onViewChange={openView}
          />
          <div
            ref={workspaceRef}
            className="p-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:p-6"
          >
            <div className="mx-auto max-w-[1600px]" key={activeView}>
              <DeanWorkspace activeView={activeView} onNavigate={openView} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
