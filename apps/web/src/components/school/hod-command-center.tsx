"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BarChart3,
  BookMarked,
  BookOpen,
  Briefcase,
  CheckSquare,
  FileText,
  LayoutGrid,
  PackagePlus,
  Search,
  Users,
  type LucideIcon,
} from "lucide-react";

import { ApprovalInbox } from "@/components/shared/approval-inbox";
import { NotificationBell } from "@/components/shared/notification-bell";
import { IntegratedSchoolCommandHeader, SchoolCommandSidebarIdentity } from "@/components/school/integrated-school-command-header";
import { TaskQueue } from "@/components/shared/task-queue";

import { AcademicIntelligenceWorkspace } from "./academic-intelligence-workspace";
import { buildSchoolSectionHref } from "./school-pages";
import { CoverageReviewWorkspace } from "./hod/coverage-review-workspace";
import { DepartmentTeachersWorkspace } from "./hod/department-teachers-workspace";
import { LessonPlansWorkspace } from "./hod/lesson-plans-workspace";
import { MarksModerationWorkspace } from "./hod/marks-moderation-workspace";
import { OverviewWorkspace } from "./hod/overview-workspace";
import { ReportsWorkspace } from "./hod/reports-workspace";
import { ResourceRequestsWorkspace } from "./hod/resource-requests-workspace";
import { SubjectAllocationWorkspace } from "./hod/subject-allocation-workspace";
import { cn } from "./hod/shared";

type HodRouteMode = "hosted" | "public";

type HodView =
  | "overview"
  | "department-teachers"
  | "subject-allocation"
  | "coverage-review"
  | "lesson-plans"
  | "marks-moderation"
  | "academic-intelligence"
  | "resource-requests"
  | "reports";

type HodNavItem = {
  id: HodView;
  label: string;
  description: string;
  icon: LucideIcon;
  group: string;
};

const hodNavItems: HodNavItem[] = [
  {
    id: "overview",
    label: "Department Overview",
    description: "Live department health, workload, and academic metrics.",
    icon: Briefcase,
    group: "Command Center",
  },
  {
    id: "department-teachers",
    label: "Department Teachers",
    description: "Teachers, assignments, workload, and department accountability.",
    icon: Users,
    group: "Department Admin",
  },
  {
    id: "subject-allocation",
    label: "Subject Allocation",
    description: "Subjects, classes, weekly lessons, and teacher allocation.",
    icon: LayoutGrid,
    group: "Department Admin",
  },
  {
    id: "coverage-review",
    label: "Coverage Review",
    description: "Syllabus coverage, attendance signals, and lesson delivery checks.",
    icon: BookOpen,
    group: "Academics",
  },
  {
    id: "lesson-plans",
    label: "Lesson Plans Review",
    description: "Review department lesson plans and academic preparation.",
    icon: BookMarked,
    group: "Academics",
  },
  {
    id: "marks-moderation",
    label: "Marks Moderation",
    description: "Moderate department exam marks, analytics, and student performance.",
    icon: CheckSquare,
    group: "Exams",
  },
  {
    id: "academic-intelligence",
    label: "Academic Intelligence",
    description: "Live department trends, subject evidence, learner risk, and interventions.",
    icon: BarChart3,
    group: "Exams",
  },
  {
    id: "resource-requests",
    label: "Resource Requests",
    description: "Department teaching materials, requests, and resource follow-up.",
    icon: PackagePlus,
    group: "Operations",
  },
  {
    id: "reports",
    label: "Department Reports",
    description: "Generated HOD reports and department downloads.",
    icon: FileText,
    group: "Reports",
  },
];

const hodViewAliases: Record<string, HodView> = {
  dashboard: "overview",
  overview: "overview",
  "my-teaching": "overview",
  "department-settings": "overview",
  "department-overview": "overview",
  "department-teachers": "department-teachers",
  staff: "department-teachers",
  "teacher-attendance": "department-teachers",
  "lesson-observation": "department-teachers",
  "subject-allocation": "subject-allocation",
  timetable: "subject-allocation",
  "timetable-builder": "subject-allocation",
  "schemes-of-work": "coverage-review",
  syllabus: "coverage-review",
  "syllabus-coverage": "coverage-review",
  attendance: "coverage-review",
  academics: "coverage-review",
  "lesson-delivery": "coverage-review",
  "coverage-review": "coverage-review",
  "lesson-plans": "lesson-plans",
  "assessments-cats": "marks-moderation",
  exams: "marks-moderation",
  "exams-marks-moderation": "marks-moderation",
  marks: "marks-moderation",
  grading: "marks-moderation",
  validation: "marks-moderation",
  "performance-analytics": "academic-intelligence",
  "student-analytics": "academic-intelligence",
  "academic-analytics": "academic-intelligence",
  "academic-intelligence": "academic-intelligence",
  "learner-interventions": "marks-moderation",
  "marks-moderation": "marks-moderation",
  resources: "resource-requests",
  "resources-requests": "resource-requests",
  "resource-requests": "resource-requests",
  procurement: "resource-requests",
  inventory: "resource-requests",
  approvals: "reports",
  communication: "reports",
  "department-meetings": "reports",
  reports: "reports",
  "reports-downloads": "reports",
};

export function normalizeHodView(section?: string): HodView {
  if (!section) {
    return "overview";
  }

  return hodViewAliases[section] ?? "overview";
}

function getHodViewLabel(view: HodView) {
  return hodNavItems.find((item) => item.id === view)?.label ?? "Department Overview";
}

function Sidebar({
  activeView,
  onViewChange,
}: {
  activeView: HodView;
  onViewChange: (view: HodView) => void;
}) {
  return (
    <aside className="hidden h-full w-[292px] shrink-0 overflow-y-auto bg-[#071D49] p-4 text-white shadow-[0_24px_70px_rgba(7,29,73,0.28)] lg:block">
      <SchoolCommandSidebarIdentity eyebrow="Department command" title="Head of Department" subtitle="Teaching quality, moderation, and resources" />

      <nav className="mt-4 space-y-1" aria-label="HOD navigation">
        {hodNavItems.map((item, index) => {
          const showGroup = item.group !== hodNavItems[index - 1]?.group;
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
  activeView: HodView;
  searchTerm: string;
  searchResults: HodNavItem[];
  onSearchTermChange: (value: string) => void;
  onSearchResult: (item: HodNavItem) => void;
  onViewChange: (view: HodView) => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-[#D8E0EC] bg-white/95 px-4 py-3 backdrop-blur">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <p className="text-sm font-black text-[#071D49]">Department command controls</p>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[260px]">
            <label className="flex items-center gap-2 rounded-2xl border border-[#C7D4E6] bg-[#F8FAFC] px-3 py-2 text-sm font-semibold text-[#64748B]">
              <Search className="h-4 w-4" />
              <span className="sr-only">HOD workspace search</span>
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
                placeholder="Search department workspaces"
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
                    No matching HOD workspace.
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
        <label className="sr-only" htmlFor="hod-mobile-workspace">
          HOD workspace
        </label>
        <select
          id="hod-mobile-workspace"
          className="w-full rounded-xl border border-[#C7D4E6] bg-white px-3 py-2 text-sm font-black text-[#071D49]"
          value={activeView}
          onChange={(event) => onViewChange(event.target.value as HodView)}
        >
          {hodNavItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}

function WorkspaceFrame({ activeView, children }: { activeView: HodView; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <div role="status" className="rounded-xl border border-[#BFDBFE] bg-[#EEF5FF] px-4 py-3 text-sm font-bold text-[#071D49]">
        {getHodViewLabel(activeView)} opened. Data remains scoped to the current school and department permissions.
      </div>
      {children}
    </div>
  );
}

function HodWorkspace({
  activeView,
  onNavigate,
}: {
  activeView: HodView;
  onNavigate: (view: HodView) => void;
}) {
  switch (activeView) {
    case "department-teachers":
      return <DepartmentTeachersWorkspace />;
    case "subject-allocation":
      return <SubjectAllocationWorkspace />;
    case "coverage-review":
      return <CoverageReviewWorkspace />;
    case "lesson-plans":
      return <LessonPlansWorkspace />;
    case "marks-moderation":
      return <MarksModerationWorkspace />;
    case "academic-intelligence":
      return (
        <AcademicIntelligenceWorkspace
          audience="hod"
          onOpenMarks={() => onNavigate("marks-moderation")}
          onOpenInterventions={() => onNavigate("marks-moderation")}
          onOpenReportCards={() => onNavigate("reports")}
        />
      );
    case "resource-requests":
      return <ResourceRequestsWorkspace />;
    case "reports":
      return <ReportsWorkspace />;
    case "overview":
    default:
      return <OverviewWorkspace />;
  }
}

export function HodCommandCenter({
  activeSection,
  routeMode = "hosted",
}: {
  activeSection?: string;
  routeMode?: HodRouteMode;
}) {
  const [activeView, setActiveView] = useState<HodView>(() => normalizeHodView(activeSection));
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setActiveView(normalizeHodView(activeSection));
  }, [activeSection]);

  const searchResults = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return [];
    }

    return hodNavItems.filter((item) =>
      `${item.label} ${item.description} ${item.group}`.toLowerCase().includes(query),
    );
  }, [searchTerm]);

  function openView(view: HodView) {
    const nextView = normalizeHodView(view);
    setActiveView(nextView);
    setSearchTerm("");

    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", buildSchoolSectionHref("hod", nextView, routeMode));
    }
  }

  function openSearchResult(item: HodNavItem) {
    openView(item.id);
  }

  return (
    <div
      data-testid="role-operational-command-center"
      data-role-dashboard="hod"
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
            <IntegratedSchoolCommandHeader roleTitle="Head of Department Dashboard" fallbackUserLabel="Head of Department" />
            <WorkspaceFrame activeView={activeView}>
              <HodWorkspace activeView={activeView} onNavigate={openView} />
            </WorkspaceFrame>
          </div>
        </main>
      </div>
    </div>
  );
}
