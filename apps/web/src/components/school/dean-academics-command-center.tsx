"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BarChart3,
  BookMarked,
  BookOpen,
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
import { NotificationBell } from "@/components/shared/notification-bell";
import { TaskQueue } from "@/components/shared/task-queue";

import { buildSchoolSectionHref } from "./school-pages";
import { AcademicInterventionsWorkspace } from "./dean-academics/academic-interventions-workspace";
import { AssessmentsWorkspace } from "./dean-academics/assessments-workspace";
import { CurriculumCoverageWorkspace } from "./dean-academics/curriculum-coverage-workspace";
import { DepartmentPerformanceWorkspace } from "./dean-academics/department-performance-workspace";
import { LessonLogsWorkspace } from "./dean-academics/lesson-logs-workspace";
import { LessonPlansWorkspace } from "./dean-academics/lesson-plans-workspace";
import { OverviewWorkspace } from "./dean-academics/overview-workspace";
import { ReportsWorkspace } from "./dean-academics/reports-workspace";
import { TeacherWorkloadWorkspace } from "./dean-academics/teacher-workload-workspace";
import { cn } from "./dean-academics/shared";

type DeanRouteMode = "hosted" | "public";

type DeanView =
  | "overview"
  | "curriculum-coverage"
  | "department-performance"
  | "teacher-workload"
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
    group: "Command Center",
  },
  {
    id: "curriculum-coverage",
    label: "Curriculum Coverage",
    description: "Coverage progress across departments and classes.",
    icon: BookOpen,
    group: "Academic Quality",
  },
  {
    id: "department-performance",
    label: "Department Performance",
    description: "Compare department outcomes and academic trends.",
    icon: BarChart3,
    group: "Academic Quality",
  },
  {
    id: "teacher-workload",
    label: "Teacher Workload",
    description: "Teaching load, allocation, and follow-up visibility.",
    icon: UsersRound,
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
    id: "assessments",
    label: "Assessments",
    description: "Review assessment readiness, moderation, and pending marking.",
    icon: ClipboardList,
    group: "Exams",
  },
  {
    id: "academic-interventions",
    label: "Academic Interventions",
    description: "Track learners, classes, and departments needing support.",
    icon: Target,
    group: "Support",
  },
  {
    id: "reports",
    label: "Academic Reports",
    description: "Generated reports and academic governance downloads.",
    icon: FileText,
    group: "Reports",
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
  return deanNavItems.find((item) => item.id === view)?.label ?? "Academic Overview";
}

function Sidebar({
  activeView,
  onViewChange,
}: {
  activeView: DeanView;
  onViewChange: (view: DeanView) => void;
}) {
  return (
    <aside className="hidden h-full w-[292px] shrink-0 overflow-y-auto bg-[#071D49] p-4 text-white shadow-[0_24px_70px_rgba(7,29,73,0.28)] lg:block">
      <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-100/70">MyShule</p>
        <h2 className="mt-2 text-xl font-black">Dean of Academics</h2>
        <p className="mt-2 text-sm leading-6 text-white/65">
          Academic quality, moderation, interventions, and reporting.
        </p>
      </div>

      <nav className="mt-4 space-y-1" aria-label="Dean of Academics navigation">
        {deanNavItems.map((item, index) => {
          const showGroup = item.group !== deanNavItems[index - 1]?.group;
          const Icon = item.icon;
          const active = activeView === item.id;

          return (
            <div key={`${item.group}-${item.id}`}>
              {showGroup ? (
                <p className="px-3 pb-2 pt-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                  {item.group}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => onViewChange(item.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-white/72 transition hover:bg-white/10 hover:text-white",
                  active && "bg-white/15 text-white shadow-[inset_4px_0_0_#38BDF8]",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
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
  return (
    <header className="sticky top-0 z-20 border-b border-[#D8E0EC] bg-white/95 px-4 py-3 backdrop-blur">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#64748B]">
            Academic leadership desk
          </p>
          <h1 className="text-xl font-black text-[#071D49]">Dean of Academics Dashboard</h1>
          <p className="mt-1 text-sm font-semibold text-[#64748B]">
            Use the role menu to switch sections. Each section reads from school-scoped live academic records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[260px]">
            <label className="flex items-center gap-2 rounded-2xl border border-[#C7D4E6] bg-[#F8FAFC] px-3 py-2 text-sm font-semibold text-[#64748B]">
              <Search className="h-4 w-4" />
              <span className="sr-only">Dean workspace search</span>
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
                placeholder="Search academic workspaces"
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
                      <span className="block text-sm font-black text-[#071D49]">{item.label}</span>
                      <span className="mt-0.5 block text-xs font-semibold text-[#64748B]">{item.description}</span>
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
          <ApprovalInbox currentUserId="school" />
          <NotificationBell />
        </div>
      </div>

      <div className="mt-3 lg:hidden">
        <label className="sr-only" htmlFor="dean-mobile-workspace">
          Dean workspace
        </label>
        <select
          id="dean-mobile-workspace"
          className="w-full rounded-xl border border-[#C7D4E6] bg-white px-3 py-2 text-sm font-black text-[#071D49]"
          value={activeView}
          onChange={(event) => onViewChange(event.target.value as DeanView)}
        >
          {deanNavItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}

function WorkspaceFrame({ activeView, children }: { activeView: DeanView; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <div role="status" className="rounded-xl border border-[#BFDBFE] bg-[#EEF5FF] px-4 py-3 text-sm font-bold text-[#071D49]">
        {getDeanViewLabel(activeView)} opened. Data remains scoped to the current school and current user permissions.
      </div>
      {children}
    </div>
  );
}

function DeanWorkspace({ activeView }: { activeView: DeanView }) {
  switch (activeView) {
    case "curriculum-coverage":
      return <CurriculumCoverageWorkspace />;
    case "department-performance":
      return <DepartmentPerformanceWorkspace />;
    case "teacher-workload":
      return <TeacherWorkloadWorkspace />;
    case "lesson-plans":
      return <LessonPlansWorkspace />;
    case "lesson-logs":
      return <LessonLogsWorkspace />;
    case "assessments":
      return <AssessmentsWorkspace />;
    case "academic-interventions":
      return <AcademicInterventionsWorkspace />;
    case "reports":
      return <ReportsWorkspace />;
    case "overview":
    default:
      return <OverviewWorkspace />;
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
  const [activeView, setActiveView] = useState<DeanView>(() => normalizeDeanView(activeSection));
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setActiveView(normalizeDeanView(activeSection));
  }, [activeSection]);

  const searchResults = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return [];
    }

    return deanNavItems.filter((item) =>
      `${item.label} ${item.description} ${item.group}`.toLowerCase().includes(query),
    );
  }, [searchTerm]);

  function openView(view: DeanView) {
    const nextView = normalizeDeanView(view);
    setActiveView(nextView);
    setSearchTerm("");

    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", buildSchoolSectionHref("dean-academics", nextView, routeMode));
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
      className="min-h-dvh bg-[#F3F6FA] text-[#071D49] lg:h-dvh lg:overflow-hidden"
    >
      <div className="flex min-h-dvh lg:h-full">
        <Sidebar activeView={activeView} onViewChange={openView} />
        <main className="min-w-0 flex-1 lg:flex lg:h-full lg:flex-col">
          <Topbar
            activeView={activeView}
            searchTerm={searchTerm}
            searchResults={searchResults}
            onSearchTermChange={setSearchTerm}
            onSearchResult={openSearchResult}
            onViewChange={openView}
          />
          <div className="space-y-4 p-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:p-6">
            <WorkspaceFrame activeView={activeView}>
              <DeanWorkspace activeView={activeView} />
            </WorkspaceFrame>
          </div>
        </main>
      </div>
    </div>
  );
}
