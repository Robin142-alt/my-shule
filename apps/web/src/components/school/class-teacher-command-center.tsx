// GENERATED AND SPLIT BY scaffold_class_teacher_split.js
"use client";

import { useState } from "react";
import {
  Bell, BookOpenCheck, Calendar, CalendarDays, CheckSquare,
  ClipboardCheck, FileSignature, FileText, FolderOpen, GraduationCap,
  HeartPulse, Home, MessageCircle, Settings, ShieldAlert,
  Stethoscope, Users, X, BarChart3
} from "lucide-react";

import { ApprovalInbox } from "@/components/shared/approval-inbox";
import { MobileWorkspaceNavigation } from "@/components/shared/mobile-workspace-navigation";
import { NotificationBell } from "@/components/shared/notification-bell";
import { IntegratedSchoolCommandHeader, SchoolCommandSidebarIdentity } from "@/components/school/integrated-school-command-header";
import { TaskQueue } from "@/components/shared/task-queue";
import { Modal } from "@/components/ui/modal";
import { toast } from "sonner";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { type TeacherView, cn, sendClassTeacherCommunication } from "./class-teacher/shared";
import { buildSchoolSectionHref, type SchoolRouteMode } from "./school-pages";
import { AcademicIntelligenceWorkspace } from "./academic-intelligence-workspace";
import { OverviewWorkspace } from "./class-teacher/workspaces/home";
import { ClassRegisterWorkspace } from "./class-teacher/workspaces/register";
import { AttendanceWorkspace } from "./class-teacher/workspaces/attendance";
import { AcademicProgressWorkspace } from "./class-teacher/workspaces/progress";
import { ReportCommentsWorkspace } from "./class-teacher/workspaces/comments";
import { DisciplineWorkspace } from "./class-teacher/workspaces/discipline";
import { WelfareWorkspace } from "./class-teacher/workspaces/welfare";
import { HealthNotesWorkspace } from "./class-teacher/workspaces/health";
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
  { id: "academic-intelligence", label: "Academic Intelligence", icon: BarChart3, group: "Academics" },
  { id: "comments", label: "Report Card Comments", icon: FileSignature, group: "Academics" },
  { id: "discipline", label: "Discipline & Behaviour", icon: ShieldAlert, group: "Student Welfare" },
  { id: "welfare", label: "Welfare & Counselling", icon: HeartPulse, group: "Student Welfare" },
  { id: "health", label: "Health Notes", icon: Stethoscope, group: "Student Welfare" },
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

function normalizeClassTeacherView(section?: string): TeacherView {
  const candidate = section && section !== "dashboard" ? section : "home";
  return navItems.some((item) => item.id === candidate) ? candidate : "home";
}

type LearnerNoteDraft = {
  note_type: string;
  visibility: string;
  description: string;
  follow_up_date: string;
};

function LearnerNoteModal({ open, draft, submitting, onChange, onClose, onSubmit }: {
  open: boolean;
  draft: LearnerNoteDraft;
  submitting: boolean;
  onChange: (draft: LearnerNoteDraft) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const update = (field: keyof LearnerNoteDraft, value: string) => onChange({ ...draft, [field]: value });
  return (
    <Modal open={open} title="Add class note" description="Save a school-scoped learner note with controlled staff visibility and an optional follow-up date." onClose={onClose} size="lg" footer={
      <>
        <button type="button" onClick={onClose} disabled={submitting} className="rounded-lg border border-[#D8E0EC] px-4 py-2 text-sm font-bold text-[#071D49] disabled:opacity-50">Cancel</button>
        <button type="button" onClick={onSubmit} disabled={submitting} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-50">{submitting ? "Saving..." : "Save Class Note"}</button>
      </>
    }>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold text-[#071D49]">Note type
          <select value={draft.note_type} onChange={(event) => update("note_type", event.target.value)} className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm">
            <option value="general">General</option><option value="academic">Academic</option><option value="attendance">Attendance</option><option value="welfare">Welfare</option><option value="parent_follow_up">Parent follow-up</option>
          </select>
        </label>
        <label className="text-sm font-bold text-[#071D49]">Visibility
          <select value={draft.visibility} onChange={(event) => update("visibility", event.target.value)} className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm">
            <option value="staff">Authorized staff</option><option value="class_teacher">Class teacher only</option><option value="leadership">School leadership</option>
          </select>
        </label>
        <label className="text-sm font-bold text-[#071D49] sm:col-span-2">Note
          <textarea value={draft.description} onChange={(event) => update("description", event.target.value)} className="mt-1 min-h-28 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" autoFocus />
        </label>
        <label className="text-sm font-bold text-[#071D49] sm:col-span-2">Follow-up date
          <input type="date" value={draft.follow_up_date} onChange={(event) => update("follow_up_date", event.target.value)} className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" />
        </label>
      </div>
    </Modal>
  );
}

function LearnerProfileDrawer({ learnerId, onClose }: { learnerId: string | null; onClose: () => void; }) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState<LearnerNoteDraft>({ note_type: "general", visibility: "staff", description: "", follow_up_date: "" });

  const submitLearnerNote = async () => {
    if (!learnerId || !noteDraft.description.trim()) {
      toast.error("Enter the learner note before saving.");
      return;
    }
    setSavingNote(true);
    try {
      await requestDashboardApi(`/api/admin-command/class-teacher/learner-profiles/${learnerId}/note`, {
        method: "POST",
        body: { ...noteDraft, description: noteDraft.description.trim(), follow_up_date: noteDraft.follow_up_date || null },
      });
      toast.success("Class note saved");
      setNoteOpen(false);
      setNoteDraft({ note_type: "general", visibility: "staff", description: "", follow_up_date: "" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The class note could not be saved.");
    } finally {
      setSavingNote(false);
    }
  };

  if (!learnerId) return null;
  return (
    <><div className="fixed inset-0 z-50 flex justify-end bg-[#071D49]/20 backdrop-blur-sm">
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
          <button type="button" onClick={onClose} className="p-2 hover:bg-[#F3F6FA] rounded-full transition text-[#64748B]">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="p-4 space-y-6">
          <section className="space-y-3">
             <h3 className="text-xs font-black uppercase tracking-widest text-[#64748B]">Quick Actions</h3>
             <div className="flex flex-wrap gap-2">
               <button type="button" className="rounded-full bg-[#071D49] px-3 py-1.5 text-xs font-black text-white" onClick={() => sendClassTeacherCommunication({ audience: "individual_parent", learnerId, subject: `Parent follow-up for ${learnerId}`, message: `${learnerId} needs a class teacher follow-up. Please check attendance, welfare, and academic notes in the parent portal.`, source: "class-teacher-learner-profile" })}>Message Parent</button>
               <button type="button" className="rounded-full border border-[#D8E0EC] px-3 py-1.5 text-xs font-black text-[#071D49]" onClick={() => setNoteOpen(true)}>Add Class Note</button>
             </div>
          </section>
        </div>
      </div>
    </div><LearnerNoteModal open={noteOpen} draft={noteDraft} submitting={savingNote} onChange={setNoteDraft} onClose={() => setNoteOpen(false)} onSubmit={submitLearnerNote} /></>
  );
}

export function ClassTeacherCommandCenter({ activeSection, routeMode }: { activeSection?: string; routeMode?: SchoolRouteMode }) {
  const [activeViewState, setActiveViewState] = useState<TeacherView>(
    normalizeClassTeacherView(activeSection)
  );
  const activeView = activeViewState;

  const setActiveView = (view: TeacherView) => {
    setActiveViewState(view);
    const newPath = buildSchoolSectionHref("class-teacher", view, routeMode ?? "hosted");
    window.history.replaceState(null, "", newPath);
  };
  const [selectedLearner, setSelectedLearner] = useState<string | null>(null);

  return (
    <div className="authenticated-app flex min-h-dvh bg-[#F3F6FA]">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="app-command-main flex-1 min-w-0 flex flex-col">
        <Topbar activeView={activeView} onViewChange={setActiveView} />
        <div className="app-content flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
          <IntegratedSchoolCommandHeader roleTitle="Class Teacher Dashboard" fallbackUserLabel="Class Teacher" />
          {activeView === "home" && <OverviewWorkspace />}
          {activeView === "register" && <ClassRegisterWorkspace onSelectLearner={setSelectedLearner} />}
          {activeView === "attendance" && <AttendanceWorkspace />}
          {activeView === "progress" && <AcademicProgressWorkspace />}
          {activeView === "academic-intelligence" && (
            <AcademicIntelligenceWorkspace
              audience="class-teacher"
              onOpenMarks={() => setActiveView("progress")}
              onOpenInterventions={() => setActiveView("welfare")}
              onOpenReportCards={() => setActiveView("comments")}
            />
          )}
          {activeView === "comments" && <ReportCommentsWorkspace />}
          {activeView === "discipline" && <DisciplineWorkspace />}
          {activeView === "welfare" && <WelfareWorkspace />}
          {activeView === "health" && <HealthNotesWorkspace />}
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
    <aside className="hidden h-dvh w-[260px] shrink-0 overflow-y-auto bg-[#071D49] p-4 text-white shadow-[0_24px_70px_rgba(7,29,73,0.28)] lg:block">
      <SchoolCommandSidebarIdentity eyebrow="Class command" title="Class Teacher Dashboard" subtitle="Assigned class and stream" />
      <nav className="space-y-1">
        {navItems.map((item, index) => {
          const showGroup = item.group !== navItems[index - 1]?.group;
          const Icon = item.icon;
          return (
            <div key={item.group + '-' + item.label}>
              {showGroup ? <p className="px-3 pb-2 pt-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{item.group}</p> : null}
              <button
                type="button"
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

function Topbar({ activeView, onViewChange }: { activeView: TeacherView; onViewChange: (view: TeacherView) => void }) {
  return (
    <header className="app-command-topbar sticky top-0 z-20 border-b border-[#D8E0EC] bg-white/90 px-4 py-3 backdrop-blur">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#071D49] text-xs font-black text-white">CT</div>
          <p className="text-sm font-black text-[#071D49]">Class teacher controls</p>
        </div>
        <div className="flex items-center gap-2">
          <TaskQueue />
          <ApprovalInbox />
          <NotificationBell />
        </div>
      </div>
      <div className="mt-3 lg:hidden">
        <MobileWorkspaceNavigation
          label="Class teacher workspace"
          items={navItems}
          value={activeView}
          onValueChange={(value) => onViewChange(value as TeacherView)}
          testId="class-teacher-mobile-workspace-nav"
        />
      </div>
    </header>
  );
}
