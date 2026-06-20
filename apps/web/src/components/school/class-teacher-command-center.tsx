// GENERATED AND SPLIT BY scaffold_class_teacher_split.js
"use client";

import { useState } from "react";
import {
  Bell, BookOpenCheck, Calendar, CalendarDays, CheckSquare,
  ClipboardCheck, FileSignature, FileText, FolderOpen, GraduationCap,
  HeartPulse, Home, MessageCircle, Settings, ShieldAlert,
  Stethoscope, Banknote, Users, X
} from "lucide-react";

import { ApprovalInbox } from "@/components/shared/approval-inbox";
import { NotificationBell } from "@/components/shared/notification-bell";
import { TaskQueue } from "@/components/shared/task-queue";
import { type TeacherView, cn } from "./class-teacher/shared";
import { buildSchoolSectionHref } from "./school-pages";
import { OverviewWorkspace } from "./class-teacher/workspaces/home";
import { ClassRegisterWorkspace } from "./class-teacher/workspaces/register";
import { AttendanceWorkspace } from "./class-teacher/workspaces/attendance";
import { AcademicProgressWorkspace } from "./class-teacher/workspaces/progress";
import { ReportCommentsWorkspace } from "./class-teacher/workspaces/comments";
import { DisciplineWorkspace } from "./class-teacher/workspaces/discipline";
import { WelfareWorkspace } from "./class-teacher/workspaces/welfare";
import { HealthNotesWorkspace } from "./class-teacher/workspaces/health";
import { FeesWorkspace } from "./class-teacher/workspaces/fees";
import { CommunicationWorkspace } from "./class-teacher/workspaces/communication";
import { MeetingsWorkspace } from "./class-teacher/workspaces/meetings";
import { HomeworkWorkspace } from "./class-teacher/workspaces/homework";
import { TimetableWorkspace } from "./class-teacher/workspaces/timetable";
import { DocumentsWorkspace } from "./class-teacher/workspaces/documents";
import { RequestsWorkspace } from "./class-teacher/workspaces/requests";
import { ReportsWorkspace } from "./class-teacher/workspaces/reports";
import { NotificationsWorkspace } from "./class-teacher/workspaces/notifications";
import { SettingsWorkspace } from "./class-teacher/workspaces/settings";

const navItems = [
  { id: "home", label: "Overview", icon: Home, group: "Overview" },
  { id: "register", label: "My Class Register", icon: Users, group: "Class Operations" },
  { id: "attendance", label: "Attendance", icon: ClipboardCheck, group: "Class Operations" },
  { id: "progress", label: "Academic Progress", icon: GraduationCap, group: "Academics" },
  { id: "comments", label: "Report Card Comments", icon: FileSignature, group: "Academics" },
  { id: "discipline", label: "Discipline & Behaviour", icon: ShieldAlert, group: "Student Welfare" },
  { id: "welfare", label: "Welfare & Counselling", icon: HeartPulse, group: "Student Welfare" },
  { id: "health", label: "Health Notes", icon: Stethoscope, group: "Student Welfare" },
  { id: "fees", label: "Fees Follow-up", icon: Banknote, group: "Administration" },
  { id: "communication", label: "Parent Communication", icon: MessageCircle, group: "Communication" },
  { id: "meetings", label: "Meetings & Appointments", icon: Calendar, group: "Communication" },
  { id: "homework", label: "Homework & Class Tasks", icon: BookOpenCheck, group: "Planning" },
  { id: "timetable", label: "Timetable", icon: CalendarDays, group: "Planning" },
  { id: "documents", label: "Documents & Letters", icon: FolderOpen, group: "Resources" },
  { id: "requests", label: "Requests & Approvals", icon: CheckSquare, group: "Resources" },
  { id: "reports", label: "Reports & Downloads", icon: FileText, group: "Resources" },
  { id: "notifications", label: "Notifications", icon: Bell, group: "System" },
  { id: "settings", label: "Settings", icon: Settings, group: "System" },
];

function LearnerProfileDrawer({ learnerId, onClose }: { learnerId: string | null; onClose: () => void; }) {
  if (!learnerId) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#071D49]/20 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-[#D8E0EC] overflow-y-auto">
        <header className="sticky top-0 bg-white/95 backdrop-blur z-10 border-b border-[#D8E0EC] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-[#071D49] text-white flex items-center justify-center font-black">
              {learnerId.substring(0,2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-black text-[#071D49]">Learner Profile</h2>
              <p className="text-xs font-semibold text-[#64748B]">{learnerId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#F3F6FA] rounded-full transition text-[#64748B]">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="p-4 space-y-6">
          <section className="space-y-3">
             <h3 className="text-xs font-black uppercase tracking-widest text-[#64748B]">Quick Actions</h3>
             <div className="flex flex-wrap gap-2">
               <button className="rounded-full bg-[#071D49] px-3 py-1.5 text-xs font-black text-white">Message Parent</button>
               <button className="rounded-full border border-[#D8E0EC] px-3 py-1.5 text-xs font-black text-[#071D49]">Add Class Note</button>
             </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export function ClassTeacherCommandCenter({ activeSection, routeMode }: { activeSection?: string; routeMode?: string }) {
  const [activeViewState, setActiveViewState] = useState<TeacherView>(
    (activeSection && activeSection !== "dashboard" ? activeSection : "home") as TeacherView
  );
  const activeView = activeViewState;

  const setActiveView = (view: any) => {
    setActiveViewState(view);
    const newPath = buildSchoolSectionHref("class-teacher", view, (routeMode as any) ?? "hosted");
    window.history.replaceState(null, "", newPath);
  };
  const [selectedLearner, setSelectedLearner] = useState<string | null>(null);

  return (
    <div className="flex min-h-screen bg-[#F3F6FA]">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="flex-1 min-w-0 flex flex-col">
        <Topbar />
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
          {activeView === "home" && <OverviewWorkspace />}
          {activeView === "register" && <ClassRegisterWorkspace onSelectLearner={setSelectedLearner} />}
          {activeView === "attendance" && <AttendanceWorkspace />}
          {activeView === "progress" && <AcademicProgressWorkspace />}
          {activeView === "comments" && <ReportCommentsWorkspace />}
          {activeView === "discipline" && <DisciplineWorkspace />}
          {activeView === "welfare" && <WelfareWorkspace />}
          {activeView === "health" && <HealthNotesWorkspace />}
          {activeView === "fees" && <FeesWorkspace />}
          {activeView === "communication" && <CommunicationWorkspace />}
          {activeView === "meetings" && <MeetingsWorkspace />}
          {activeView === "homework" && <HomeworkWorkspace />}
          {activeView === "timetable" && <TimetableWorkspace />}
          {activeView === "documents" && <DocumentsWorkspace />}
          {activeView === "requests" && <RequestsWorkspace />}
          {activeView === "reports" && <ReportsWorkspace />}
          {activeView === "notifications" && <NotificationsWorkspace />}
          {activeView === "settings" && <SettingsWorkspace />}
        </div>
      </main>
      <LearnerProfileDrawer learnerId={selectedLearner} onClose={() => setSelectedLearner(null)} />
      
    </div>
  );
}

function Sidebar({ activeView, onViewChange }: { activeView: TeacherView; onViewChange: (v: TeacherView) => void; }) {
  return (
    <aside className="hidden h-screen w-[260px] overflow-y-auto bg-[#071D49] p-4 text-white shadow-[0_24px_70px_rgba(7,29,73,0.28)] lg:block shrink-0">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-6">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100/70">MyShule</p>
        <h2 className="mt-2 text-xl font-black">Class Teacher</h2>
        <p className="mt-2 text-sm leading-6 text-white/65">Form 2 Blue</p>
      </div>
      <nav className="space-y-1">
        {navItems.map((item, index) => {
          const showGroup = item.group !== navItems[index - 1]?.group;
          const Icon = item.icon;
          return (
            <div key={item.group + '-' + item.label}>
              {showGroup ? <p className="px-3 pb-2 pt-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{item.group}</p> : null}
              <button
                onClick={() => onViewChange(item.id as TeacherView)}
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

function Topbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-[#D8E0EC] bg-white/90 px-4 py-3 backdrop-blur">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#071D49] text-xs font-black text-white">CT</div>
          <h1 className="text-lg font-black text-[#071D49]">Class Teacher Workspace</h1>
        </div>
        <div className="flex items-center gap-2">
          <TaskQueue />
          <ApprovalInbox currentUserId="school" />
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
