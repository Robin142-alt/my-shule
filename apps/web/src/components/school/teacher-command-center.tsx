"use client";

import { useState } from "react";
import { Search, Bell } from "lucide-react";

import { ApprovalInbox } from "@/components/shared/approval-inbox";
import { NotificationBell } from "@/components/shared/notification-bell";
import { TaskQueue } from "@/components/shared/task-queue";
import { WorkflowToast } from "@/components/shared/workflow-toast";
import { cn } from "./teacher-dashboard/shared-components";
import { navItems } from "./teacher-dashboard/nav-config";
import { TeacherView, TeacherAction, DetailPanel } from "./teacher-dashboard/types";

// Import workspaces
import { OverviewWorkspace } from "./teacher-dashboard/overview-workspace";
import { TimetableWorkspace } from "./teacher-dashboard/timetable-workspace";
import { ClassesWorkspace } from "./teacher-dashboard/classes-workspace";
import { AttendanceWorkspace } from "./teacher-dashboard/attendance-workspace";
import { LessonLogWorkspace } from "./teacher-dashboard/lesson-log-workspace";
import { SyllabusCoverageWorkspace } from "./teacher-dashboard/syllabus-coverage-workspace";
import { AssignmentsWorkspace } from "./teacher-dashboard/assignments-workspace";
import { AssessmentsCatsWorkspace } from "./teacher-dashboard/assessments-cats-workspace";
import { ExamsMarksWorkspace } from "./teacher-dashboard/exams-marks-workspace";
import { LearnerProgressWorkspace } from "./teacher-dashboard/learner-progress-workspace";
import { DisciplineWelfareWorkspace } from "./teacher-dashboard/discipline-welfare-workspace";
import { ParentCommunicationWorkspace } from "./teacher-dashboard/parent-communication-workspace";
import { TeachingResourcesWorkspace } from "./teacher-dashboard/teaching-resources-workspace";
import { StoreRequestsWorkspace } from "./teacher-dashboard/store-requests-workspace";
import { ReportsDownloadsWorkspace } from "./teacher-dashboard/reports-downloads-workspace";
import { NotificationsWorkspace } from "./teacher-dashboard/notifications-workspace";
import { MyProfileWorkspace } from "./teacher-dashboard/my-profile-workspace";

// Conditional workspaces
import { ClassTeacherWorkspace } from "./teacher-dashboard/class-teacher-workspace";
import { ClubWorkspace } from "./teacher-dashboard/club-workspace";
import { InvigilationWorkspace } from "./teacher-dashboard/invigilation-workspace";

function Sidebar({ activeView, onViewChange }: { activeView: TeacherView; onViewChange: (view: TeacherView) => void }) {
  // In a real app, this would be derived from user roles
  const hasClassTeacherRole = true;
  const hasClubRole = true;
  const hasInvigilationRole = true;

  const filteredNavItems = navItems.filter((item) => {
    if (item.id === "class-teacher" && !hasClassTeacherRole) return false;
    if (item.id === "club" && !hasClubRole) return false;
    if (item.id === "invigilation" && !hasInvigilationRole) return false;
    return true;
  });

  return (
    <aside className="hidden h-[calc(100vh-1.5rem)] overflow-hidden rounded-2xl bg-[#071D49] p-4 text-white shadow-[0_24px_70px_rgba(7,29,73,0.28)] lg:flex lg:flex-col">
      <div className="rounded-2xl border border-white/10 bg-white/8 p-4 shrink-0">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100/70">MyShule</p>
        <h2 className="mt-2 text-xl font-black">Teacher Workspace</h2>
        <p className="mt-2 text-sm leading-6 text-white/65">Daily academic work.</p>
      </div>
      <nav className="mt-4 flex-1 space-y-1 overflow-y-auto pr-2 custom-scrollbar" aria-label="Teacher navigation">
        {filteredNavItems.map((item, index) => {
          const showGroup = item.group !== filteredNavItems[index - 1]?.group;
          const Icon = item.icon;

          return (
            <div key={item.label}>
              {showGroup ? <p className="px-3 pb-2 pt-4 text-[10px] font-black uppercase tracking-[0.15em] text-white/45">{item.group}</p> : null}
              <button
                type="button"
                onClick={() => onViewChange(item.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold text-white/72 transition hover:bg-white/10 hover:text-white",
                  activeView === item.id && "bg-white/14 text-white shadow-[inset_4px_0_0_#38BDF8]",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </button>
            </div>
          );
        })}
      </nav>
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 4px; }
      `}} />
    </aside>
  );
}

function Topbar({
  searchTerm,
  onSearchTermChange,
  onStartAction,
  onViewChange,
}: {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onStartAction: (action: TeacherAction, view: TeacherView, message: string) => void;
  onViewChange: (view: TeacherView) => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-[#D8E0EC] bg-[#F3F6FA]/90 px-4 py-2 backdrop-blur">
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#071D49] text-xs font-black text-white">MS</div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#64748B]">Academic Year 2026 Ã¢â‚¬Â¢ Term 2</p>
            <h1 className="text-lg font-black text-[#071D49]">Teacher Dashboard</h1>
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-[minmax(260px,1fr)_auto_auto_auto_auto] xl:min-w-[660px]">
          <div className="relative">
            <label className="flex min-h-10 items-center gap-3 rounded-xl border border-[#D8E0EC] bg-white px-3 text-[#64748B] shadow-sm focus-within:border-[#1D4ED8] focus-within:ring-1 focus-within:ring-[#1D4ED8]">
              <Search className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Global Search</span>
              <input
                value={searchTerm}
                onChange={(event) => onSearchTermChange(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[#94A3B8]"
                placeholder="Search learner, class, assignment..."
              />
            </label>
          </div>
          <button type="button" onClick={() => onViewChange("timetable")} className="rounded-xl border border-[#D8E0EC] bg-white px-4 py-1.5 text-sm font-black text-[#071D49]">Today's Lessons</button>
          <button type="button" onClick={() => { onViewChange("attendance"); onStartAction("attendance", "attendance", "Mark attendance form ready.") }} className="rounded-xl border border-[#D8E0EC] bg-white px-4 py-1.5 text-sm font-black text-[#071D49]">Mark Attendance</button>
          <button type="button" onClick={() => { onViewChange("exams-marks"); onStartAction("marks", "exams-marks", "Enter marks form ready.") }} className="rounded-xl bg-[#FF7A1A] px-4 py-1.5 text-sm font-black text-white">Enter Marks</button>
          <div className="flex items-center gap-2">
            <TaskQueue />
            <ApprovalInbox currentUserId="school" />
            <NotificationBell />
          </div>
        </div>
      </div>
    </header>
  );
}

function ActionDrawer({ activeAction, onClose }: { activeAction: TeacherAction; onClose: () => void }) {
  if (!activeAction) return null;

  return (
    <section className="rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] p-4 shadow-sm mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-[#071D49]">
            {activeAction === "attendance" ? "Mark Attendance" : null}
            {activeAction === "marks" ? "Enter Marks" : null}
            {activeAction === "assignment" ? "Create Assignment" : null}
            {activeAction === "resource" ? "Upload Resource" : null}
            {activeAction === "sms" ? "Send Message" : null}
            {activeAction === "report" ? "Generate Report" : null}
            {activeAction === "requisition" ? "Store Request" : null}
            {activeAction === "concern" ? "Raise Concern" : null}
            {activeAction === "lesson-log" ? "Record Lesson" : null}
          </h2>
          <p className="mt-1 text-sm font-semibold text-[#64748B]">Action specific form will render here.</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-xl border border-[#D8E0EC] bg-white px-3 py-2 text-sm font-black text-[#071D49]">
          Close
        </button>
      </div>
    </section>
  );
}

function DetailDrawer({ detail, onClose }: { detail: DetailPanel | null; onClose: () => void }) {
  if (!detail) return null;
  return (
    <section className="fixed inset-y-0 right-0 z-50 w-full max-w-sm border-l border-[#D8E0EC] bg-white p-6 shadow-2xl flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-black text-[#071D49]">{detail.title}</h2>
        <button type="button" onClick={onClose} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] px-3 py-1 text-sm font-bold text-[#071D49]">Close</button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-4">
          {detail.rows.map(([label, value]) => (
            <div key={label} className="flex justify-between border-b border-[#F1F5F9] pb-2">
              <span className="text-sm font-bold text-[#64748B]">{label}</span>
              <span className="text-sm font-black text-[#071D49]">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TeacherCommandCenter({ routeMode }: { routeMode?: "hosted" | "public" }) {
  const [activeView, setActiveView] = useState<TeacherView>("overview");
  const [activeAction, setActiveAction] = useState<TeacherAction>(null);
  const [actionMessage, setActionMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [detailPanel, setDetailPanel] = useState<DetailPanel | null>(null);

  const handleStartAction = (action: TeacherAction, view: TeacherView, message: string) => {
    setActiveView(view);
    setActiveAction(action);
    setActionMessage(message);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCloseAction = () => {
    setActiveAction(null);
    setActionMessage("");
  };

  const renderWorkspace = () => {
    switch (activeView) {
      case "overview": return <OverviewWorkspace onViewChange={setActiveView} onStartAction={handleStartAction} />;
      case "timetable": return <TimetableWorkspace />;
      case "classes": return <ClassesWorkspace />;
      case "attendance": return <AttendanceWorkspace />;
      case "lesson-log": return <LessonLogWorkspace />;
      case "syllabus-coverage": return <SyllabusCoverageWorkspace />;
      case "assignments": return <AssignmentsWorkspace onStartAction={handleStartAction} />;
      case "assessments-cats": return <AssessmentsCatsWorkspace />;
      case "exams-marks": return <ExamsMarksWorkspace onStartAction={handleStartAction} />;
      case "learner-progress": return <LearnerProgressWorkspace />;
      case "discipline-welfare": return <DisciplineWelfareWorkspace onStartAction={handleStartAction} />;
      case "parent-communication": return <ParentCommunicationWorkspace onStartAction={handleStartAction} />;
      case "teaching-resources": return <TeachingResourcesWorkspace onStartAction={handleStartAction} />;
      case "store-requests": return <StoreRequestsWorkspace onStartAction={handleStartAction} />;
      case "reports": return <ReportsDownloadsWorkspace onStartAction={handleStartAction} />;
      case "notifications": return <NotificationsWorkspace />;
      case "profile": return <MyProfileWorkspace />;
      case "class-teacher": return <ClassTeacherWorkspace />;
      case "club": return <ClubWorkspace />;
      case "invigilation": return <InvigilationWorkspace />;
      default: return <OverviewWorkspace onViewChange={setActiveView} onStartAction={handleStartAction} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F6FA]">
      <div className="mx-auto flex max-w-[1920px] flex-col gap-6 p-4 lg:flex-row lg:p-6">
        <div className="shrink-0 lg:w-72">
          <Sidebar activeView={activeView} onViewChange={(view) => { setActiveView(view); handleCloseAction(); }} />
        </div>

        <main className="min-w-0 flex-1">
          <div className="min-h-[calc(100vh-3rem)] rounded-2xl bg-white shadow-[0_2px_40px_rgba(7,29,73,0.04)] overflow-hidden">
            <Topbar
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
              onStartAction={handleStartAction}
              onViewChange={(view) => { setActiveView(view); handleCloseAction(); }}
            />
            <div className="p-4 sm:p-6 lg:p-8">
              <ActionDrawer activeAction={activeAction} onClose={handleCloseAction} />
              
              <div className="mx-auto max-w-6xl space-y-6">
                {renderWorkspace()}
              </div>
            </div>
          </div>
        </main>
      </div>

      <DetailDrawer detail={detailPanel} onClose={() => setDetailPanel(null)} />
      
    </div>
  );
}
