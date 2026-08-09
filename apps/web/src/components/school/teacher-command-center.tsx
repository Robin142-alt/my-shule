"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { ApprovalInbox } from "@/components/shared/approval-inbox";
import { NotificationBell } from "@/components/shared/notification-bell";
import { IntegratedSchoolCommandHeader, SchoolCommandSidebarIdentity } from "@/components/school/integrated-school-command-header";
import { TaskQueue } from "@/components/shared/task-queue";
import { navItems } from "./teacher-dashboard/nav-config";
import { TeacherView, TeacherAction } from "./teacher-dashboard/types";
import { cn } from "./class-teacher/shared";
import { buildSchoolSectionHref } from "./school-pages";
import { AcademicIntelligenceWorkspace } from "./academic-intelligence-workspace";

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
import { TimetableWorkspace } from "./teacher-dashboard/timetable-workspace";
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
    "reports-analytics": "academic-intelligence",
    "academic-analytics": "academic-intelligence",
    "academic-intelligence": "academic-intelligence",
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
    <div data-testid="teacher-command-center" className="flex min-h-screen bg-[#F3F6FA]">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        <Topbar activeView={activeView} onViewChange={setActiveView} />
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
          <IntegratedSchoolCommandHeader roleTitle="Teacher Dashboard" fallbackUserLabel="Teacher" />
          {notice && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-sm font-semibold text-blue-800">
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
          {activeView === "academic-intelligence" && (
            <AcademicIntelligenceWorkspace
              audience="teacher"
              onOpenMarks={() => setActiveView("exams-marks")}
              onOpenInterventions={() => setActiveView("learner-progress")}
              onOpenReportCards={() => setActiveView("reports")}
            />
          )}
          {activeView === "parent-communication" && <ParentCommunicationWorkspace onStartAction={handleStartAction} />}
          {activeView === "timetable" && <TimetableWorkspace />}
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
            "lesson-log", "assessments-cats", "exams-marks", "academic-intelligence", "parent-communication",
            "timetable", "syllabus-coverage", "learner-progress", "teaching-resources",
            "practical-requisitions", "store-requests", "reports", "notifications", "profile", "class-teacher",
            "club", "invigilation"
          ].includes(activeView) && (
            <div className="rounded-xl bg-white border border-[#D8E0EC] p-12 text-center text-[#64748B]">
              <p className="font-bold text-[#071D49] text-lg">Workspace Not Found</p>
              <p className="mt-2 text-sm">The requested workspace &quot;{activeView}&quot; does not exist or is currently unavailable.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Sidebar({ activeView, onViewChange }: { activeView: TeacherView; onViewChange: (v: TeacherView) => void; }) {
  return (
    <aside className="hidden h-screen w-[260px] overflow-y-auto bg-[#071D49] p-4 text-white shadow-[0_24px_70px_rgba(7,29,73,0.28)] lg:block shrink-0">
      <SchoolCommandSidebarIdentity eyebrow="Teacher command" title="Teacher Dashboard" subtitle="Personal teaching workspace" />
      <nav className="space-y-1">
        {navItems.map((item, index) => {
          const showGroup = item.group !== navItems[index - 1]?.group;
          const Icon = item.icon;
          return (
            <div key={item.group + '-' + item.label}>
              {showGroup ? <p className="px-3 pb-2 pt-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{item.group}</p> : null}
              <button
                onClick={() => onViewChange(item.id)}
                className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-white/70 transition hover:bg-white/10 hover:text-white", activeView === item.id && "bg-white/15 text-white shadow-[inset_4px_0_0_#38BDF8]")}
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
  return (
    <header className="sticky top-0 z-20 border-b border-[#D8E0EC] bg-white/90 px-4 py-3 backdrop-blur shrink-0">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#071D49] text-xs font-black text-white">TR</div>
          <p className="text-sm font-black text-[#071D49]">Teacher workspace controls</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64 hidden md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
            <input 
              className="h-10 w-full rounded-xl border border-[#D8E0EC] pl-9 pr-4 text-sm outline-none focus:border-[#071D49]" 
              placeholder="Search..." 
            />
          </div>
          <TaskQueue />
          <ApprovalInbox currentUserId="school" />
          <NotificationBell />
        </div>
      </div>
      <div className="mt-3 lg:hidden">
        <select
          className="h-10 w-full rounded-xl border border-[#D8E0EC] bg-white px-3 text-sm font-bold text-[#071D49] outline-none"
          value={activeView}
          onChange={(e) => onViewChange(e.target.value as TeacherView)}
        >
          {navItems.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
      </div>
    </header>
  );
}
