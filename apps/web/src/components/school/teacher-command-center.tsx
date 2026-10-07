"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { ApprovalInbox } from "@/components/shared/approval-inbox";
import { MobileWorkspaceNavigation } from "@/components/shared/mobile-workspace-navigation";
import { NotificationBell } from "@/components/shared/notification-bell";
import { IntegratedSchoolCommandHeader, SchoolCommandSidebarIdentity } from "@/components/school/integrated-school-command-header";
import { TaskQueue } from "@/components/shared/task-queue";
import { navItems } from "./teacher-dashboard/nav-config";
import { TeacherView, TeacherAction } from "./teacher-dashboard/types";
import { buildSchoolSectionHref } from "./school-pages";
import { ExamAnalyticsWorkspace } from "./exam-analytics-entry";

// Workspaces
import { OverviewWorkspace } from "./teacher-dashboard/overview-workspace";
import { AttendanceWorkspace } from "./teacher-dashboard/attendance-workspace";
import { AssignmentsWorkspace } from "./teacher-dashboard/assignments-workspace";
import { DisciplineWelfareWorkspace } from "./teacher-dashboard/discipline-welfare-workspace";
import { AssessmentsCatsWorkspace } from "./teacher-dashboard/assessments-cats-workspace";
import { ClassesWorkspace } from "./teacher-dashboard/classes-workspace";
import { ExamsMarksWorkspace } from "./teacher-dashboard/exams-marks-workspace";
import { LessonLogWorkspace } from "./teacher-dashboard/lesson-log-workspace";
import { ParentCommunicationWorkspace } from "./teacher-dashboard/parent-communication-workspace";
import { AppointedTimetableWorkspace, useCanManageSchoolTimetable } from "./teacher-dashboard/appointed-timetable-workspace";
import { SyllabusCoverageWorkspace } from "./teacher-dashboard/syllabus-coverage-workspace";
import { LearnerProgressWorkspace } from "./teacher-dashboard/learner-progress-workspace";
import { TeachingResourcesWorkspace } from "./teacher-dashboard/teaching-resources-workspace";
import { StoreRequestsWorkspace } from "./teacher-dashboard/store-requests-workspace";
import { ReportsDownloadsWorkspace } from "./teacher-dashboard/reports-downloads-workspace";
import { NotificationsWorkspace } from "./teacher-dashboard/notifications-workspace";
import { MyProfileWorkspace } from "./teacher-dashboard/my-profile-workspace";
import { ClassTeacherWorkspace } from "./teacher-dashboard/class-teacher-workspace";
import { ClubWorkspace } from "./teacher-dashboard/club-workspace";
import { InvigilationWorkspace } from "./teacher-dashboard/invigilation-workspace";
import { PracticalRequisitionsWorkspace } from "./teacher-dashboard/practical-requisitions-workspace";

function normalizeTeacherView(section?: string): TeacherView {
  const sectionMap: Record<string, TeacherView> = {
    dashboard: "overview",
    students: "learner-progress",
    academics: "exams-marks",
    communication: "parent-communication",
    "my-timetable": "timetable",
    "teacher-attendance": "attendance",
    "subjects-classes": "classes",
    "lesson-plans": "lesson-log",
    "lesson-logs": "lesson-log",
    "assignments-homework": "assignments",
    "marks-entry": "exams-marks",
    exams: "exams-marks",
    "student-notes": "learner-progress",
    "resource-requests": "teaching-resources",
    "lab-practical-requests": "practical-requisitions",
    "reports-downloads": "reports",
    "reports-analytics": "exam-analytics",
    "academic-analytics": "exam-analytics",
    "academic-intelligence": "exam-analytics",
    messages: "parent-communication",
  };

  const normalized = section && section !== "dashboard" ? section : "overview";
  const mapped = sectionMap[normalized] ?? normalized;
  return navItems.some((item) => item.id === mapped) ? mapped : "overview";
}

export function TeacherCommandCenter({ activeSection, routeMode }: { activeSection?: string; routeMode?: "hosted" | "public" } = {}) {
  const [activeViewState, setActiveViewState] = useState<TeacherView>(
    normalizeTeacherView(activeSection)
  );
  const activeView = activeViewState;
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setActiveViewState(normalizeTeacherView(activeSection));
  }, [activeSection]);

  const setActiveView = (view: TeacherView) => {
    setActiveViewState(view);
    const newPath = buildSchoolSectionHref("teacher", view, routeMode ?? "hosted");
    window.history.replaceState(null, "", newPath);
  };

  const handleStartAction = (action: TeacherAction, view: TeacherView, message: string) => {
    setActiveView(view);
    setNotice(message);
    setTimeout(() => setNotice(""), 5000);
  };

  return (
    <div data-testid="teacher-command-center" className="authenticated-app flex min-h-dvh bg-background">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="app-command-main flex h-dvh min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar activeView={activeView} onViewChange={setActiveView} />
        <div className="app-content flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
          <IntegratedSchoolCommandHeader roleTitle="Teacher Dashboard" fallbackUserLabel="Teacher" />
          {notice && (
            <div className="rounded-xl bg-info-soft border border-info-border p-3 text-sm font-semibold text-info">
              {notice}
            </div>
          )}
          {activeView === "overview" && <OverviewWorkspace onViewChange={setActiveView} onStartAction={handleStartAction} />}
          {activeView === "attendance" && <AttendanceWorkspace />}
          {activeView === "assignments" && <AssignmentsWorkspace onStartAction={handleStartAction} />}
          {activeView === "discipline-welfare" && <DisciplineWelfareWorkspace onStartAction={handleStartAction} />}
          {activeView === "classes" && <ClassesWorkspace />}
          {activeView === "lesson-log" && <LessonLogWorkspace />}
          {activeView === "assessments-cats" && <AssessmentsCatsWorkspace />}
          {activeView === "exams-marks" && <ExamsMarksWorkspace onStartAction={handleStartAction} />}
          {activeView === "exam-analytics" && <ExamAnalyticsWorkspace scope="assignment" onOpenMarks={() => setActiveView("exams-marks")} emptyActions={[{label:"Review teaching assignments",onClick:()=>setActiveView("classes")}]}/>}
          {activeView === "parent-communication" && <ParentCommunicationWorkspace onStartAction={handleStartAction} />}
          {activeView === "timetable" && <AppointedTimetableWorkspace />}
          {activeView === "syllabus-coverage" && <SyllabusCoverageWorkspace />}
          {activeView === "learner-progress" && <LearnerProgressWorkspace />}
          {activeView === "teaching-resources" && <TeachingResourcesWorkspace />}
          {activeView === "practical-requisitions" && <PracticalRequisitionsWorkspace />}
          {activeView === "store-requests" && <StoreRequestsWorkspace />}
          {activeView === "reports" && <ReportsDownloadsWorkspace />}
          {activeView === "notifications" && <NotificationsWorkspace />}
          {activeView === "profile" && <MyProfileWorkspace />}
          {activeView === "class-teacher" && <ClassTeacherWorkspace />}
          {activeView === "club" && <ClubWorkspace />}
          {activeView === "invigilation" && <InvigilationWorkspace />}
          {/* Fallback for other workspaces */}
          {![
            "overview", "attendance", "assignments", "discipline-welfare", "classes",
            "lesson-log", "assessments-cats", "exams-marks", "exam-analytics", "parent-communication",
            "timetable", "syllabus-coverage", "learner-progress", "teaching-resources",
            "practical-requisitions", "store-requests", "reports", "notifications", "profile", "class-teacher",
            "club", "invigilation"
          ].includes(activeView) && (
            <div className="rounded-xl bg-white border border-border p-12 text-center text-muted">
              <p className="font-bold text-foreground text-lg">Workspace Not Found</p>
              <p className="mt-2 text-sm">The requested workspace &quot;{activeView}&quot; does not exist or is currently unavailable.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function useTeacherNavigation() {
  const canManage = useCanManageSchoolTimetable();
  return navItems.map((item) => item.id === "timetable" && canManage ? { ...item, label: "Timetable & Relief" } : item);
}

function Sidebar({ activeView, onViewChange }: { activeView: TeacherView; onViewChange: (v: TeacherView) => void; }) {
  const navItems = useTeacherNavigation();
  return (
    <aside className="hidden h-dvh w-[260px] shrink-0 overflow-y-auto bg-primary p-4 text-white shadow-[0_24px_70px_rgba(7,29,73,0.28)] lg:block">
      <SchoolCommandSidebarIdentity eyebrow="Teacher command" title="Teacher Dashboard" subtitle="Personal teaching workspace" />
      <nav className="dashboard-navigation space-y-1">
        {navItems.map((item, index) => {
          const showGroup = item.group !== navItems[index - 1]?.group;
          const Icon = item.icon;
          return (
            <div key={item.group + '-' + item.label}>
              {showGroup ? <p className="dashboard-nav-group">{item.group}</p> : null}
              <button
                aria-current={activeView === item.id ? "page" : undefined}
                onClick={() => onViewChange(item.id)}
                className="dashboard-nav-item"
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

function Topbar({ activeView, onViewChange }: { activeView: TeacherView; onViewChange: (v: TeacherView) => void; }) {
  const navItems = useTeacherNavigation();
  const [search, setSearch] = useState("");
  const searchResults = search.trim()
    ? navItems.filter((item) => `${item.label} ${item.group}`.toLowerCase().includes(search.trim().toLowerCase()))
    : [];

  return (
    <header className="app-command-topbar app-compact-command-topbar sticky top-0 z-20 border-b border-border bg-white/90 px-4 py-3 backdrop-blur shrink-0">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-xs font-black text-white">TR</div>
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <span className="hidden text-slate-500 sm:inline">Workspace</span>
            <ChevronRight className="hidden h-3.5 w-3.5 text-slate-400 sm:block" aria-hidden="true" />
            <p className="truncate font-semibold text-foreground">{navItems.find((item) => item.id === activeView)?.label ?? "Teacher"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64 hidden md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input 
              className="h-10 w-full rounded-xl border border-border pl-9 pr-4 text-sm outline-none focus:border-primary"
              aria-label="Search teacher workspaces"
              placeholder="Find a workspace…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Escape") setSearch(""); }}
            />
            {search.trim() ? (
              <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg" aria-label="Workspace search results">
                {searchResults.length ? searchResults.map((item) => (
                  <button key={item.id} type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100"
                    onClick={() => { onViewChange(item.id); setSearch(""); }}>
                    <item.icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    {item.label}
                  </button>
                )) : <p role="status" className="px-3 py-3 text-xs text-slate-500">No workspace matches. Try attendance, marks, or classes.</p>}
              </div>
            ) : null}
          </div>
          <TaskQueue />
          <ApprovalInbox />
          <NotificationBell />
        </div>
      </div>
      <div className="mt-3 lg:hidden">
        <MobileWorkspaceNavigation
          label="Teacher workspace"
          items={navItems}
          value={activeView}
          onValueChange={(value) => onViewChange(value as TeacherView)}
          testId="teacher-mobile-workspace-nav"
        />
      </div>
    </header>
  );
}
