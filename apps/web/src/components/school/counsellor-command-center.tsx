// GENERATED COUNSELLOR COMMAND CENTER
"use client";

import { useState, useEffect, type FormEvent, type ReactNode } from "react";
import {
  LayoutDashboard,
  Inbox,
  UsersRound,
  CalendarClock,
  FileLock2,
  ListTodo,
  HeartPulse,
  Users,
  Handshake,
  Briefcase,
  ShieldAlert,
  Stethoscope,
  Siren,
  FileBarChart2,
  FolderOpen,
  Settings,
  Search,
  Bell,
  X,
  Plus,
  AlertTriangle,
  LockKeyhole
} from "lucide-react";

import { getCurrentSchoolId, publishSchoolOperationalEvent } from "@/lib/school/school-operational-store";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { ApprovalInbox } from "@/components/shared/approval-inbox";
import { NotificationBell } from "@/components/shared/notification-bell";
import { TaskQueue } from "@/components/shared/task-queue";
import { WorkflowToast } from "@/components/shared/workflow-toast";

type RouteMode = "hosted" | "public";
type Tone = "success" | "info" | "warning" | "danger" | "neutral";
type CounsellorView = "overview" | "referrals" | "cases" | "appointments" | "sessions" | "followups" | "welfare" | "group" | "parents" | "teachers" | "discipline" | "health" | "escalations" | "reports" | "templates" | "settings";

const navItems = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, group: "Command" },
  { id: "referrals", label: "Referral Inbox", icon: Inbox, group: "Intake" },
  { id: "cases", label: "Student Cases", icon: UsersRound, group: "Caseload" },
  { id: "appointments", label: "Appointments", icon: CalendarClock, group: "Caseload" },
  { id: "sessions", label: "Session Notes", icon: FileLock2, group: "Caseload" },
  { id: "followups", label: "Follow-ups", icon: ListTodo, group: "Welfare" },
  { id: "welfare", label: "Welfare Concerns", icon: HeartPulse, group: "Welfare" },
  { id: "group", label: "Group Guidance", icon: Users, group: "Welfare" },
  { id: "parents", label: "Parent Engagement", icon: Handshake, group: "Collaboration" },
  { id: "teachers", label: "Teacher Collaboration", icon: Briefcase, group: "Collaboration" },
  { id: "discipline", label: "Discipline Referrals", icon: ShieldAlert, group: "Collaboration" },
  { id: "health", label: "Health Referrals", icon: Stethoscope, group: "Collaboration" },
  { id: "escalations", label: "Safeguarding / Escalations", icon: Siren, group: "Critical" },
  { id: "reports", label: "Reports", icon: FileBarChart2, group: "Resources" },
  { id: "templates", label: "Resources & Templates", icon: FolderOpen, group: "Resources" },
  { id: "settings", label: "Settings", icon: Settings, group: "System" },
];

const toneClasses: Record<Tone, { card: string; chip: string; dot: string; text: string }> = {
  success: { card: "border-emerald-200 bg-emerald-50 text-emerald-900", chip: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500", text: "text-emerald-700" },
  info: { card: "border-blue-200 bg-blue-50 text-blue-950", chip: "border-blue-200 bg-blue-50 text-blue-700", dot: "bg-blue-500", text: "text-blue-700" },
  warning: { card: "border-amber-200 bg-amber-50 text-amber-950", chip: "border-amber-200 bg-amber-50 text-amber-700", dot: "bg-amber-500", text: "text-amber-700" },
  danger: { card: "border-rose-200 bg-rose-50 text-rose-950", chip: "border-rose-200 bg-rose-50 text-rose-700", dot: "bg-rose-500", text: "text-rose-700" },
  neutral: { card: "border-slate-200 bg-white text-[#071D49]", chip: "border-slate-200 bg-slate-50 text-slate-700", dot: "bg-slate-400", text: "text-slate-600" },
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function StatusChip({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold", toneClasses[tone].chip)}>
      <span className={cn("h-2 w-2 rounded-full", toneClasses[tone].dot)} />
      {label}
    </span>
  );
}

function Panel({ title, description, icon: Icon, children, actions }: { title: string; description?: string; icon?: any; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#D8E0EC] bg-white p-5 shadow-[0_18px_50px_rgba(7,29,73,0.08)]">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          {Icon ? <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EEF5FF] text-[#1D4ED8]"><Icon className="h-5 w-5" aria-hidden="true" /></span> : null}
          <div>
            <h2 className="text-xl font-black tracking-[-0.01em] text-[#071D49]">{title}</h2>
            {description ? <p className="mt-1 text-sm leading-6 text-[#64748B]">{description}</p> : null}
          </div>
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function DataTable({ title, columns, rows }: { title?: string; columns: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#D8E0EC] bg-white">
      {title && <div className="border-b border-[#D8E0EC] bg-[#F8FAFC] px-4 py-3"><h3 className="text-sm font-black uppercase tracking-[0.14em] text-[#071D49]">{title}</h3></div>}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#EEF2FF] text-xs uppercase tracking-[0.12em] text-[#64748B]">
            <tr>{columns.map((column, i) => <th key={i} className="px-4 py-3 font-black whitespace-nowrap">{column}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {rows.map((row, i) => (
              <tr key={i} className="transition hover:bg-[#F8FAFC]">
                {row.map((cell, j) => <td key={j} className="px-4 py-3 font-semibold text-[#334155] whitespace-nowrap">{cell}</td>)}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-sm font-bold text-slate-500">No records found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CounsellorCommandCenter({ routeMode }: { routeMode: RouteMode }) {
  const [activeView, setActiveView] = useState<CounsellorView>("overview");
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const { data: dashboardData, isLoading: isLoadingDashboard } = useSchoolQuery<any>("/api/counselling/dashboard");
  const { data: referralsData, isLoading: isLoadingReferrals } = useSchoolQuery<any>("/api/counselling/referrals");
  const { data: sessionsData, isLoading: isLoadingSessions } = useSchoolQuery<any>("/api/counselling/sessions");

  useEffect(() => {
    if (routeMode === "hosted") setSchoolId(getCurrentSchoolId());
  }, [routeMode]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAction = (action: string) => {
    publishSchoolOperationalEvent({
      type: "COUNSELLOR_ACTION",
      schoolId: schoolId ?? "demo",
      title: "Action Executed",
      body: `Counsellor performed ${action}`,
      module: "counselling",
      actorRole: "counsellor"
    });
    showToast(`Action performed: ${action}`);
  };

  return (
    <div className="flex h-screen flex-col bg-[#F8FAFC]">
      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b border-[#D8E0EC] bg-white px-4 py-3 shadow-sm sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#071D49] text-white font-black">MS</div>
            <div>
              <h1 className="text-lg font-black tracking-[-0.01em] text-[#071D49]">Good Morning, Counsellor</h1>
              <p className="text-xs font-bold text-[#64748B]">MyShule Ã¢â‚¬Â¢ Term 2, 2026</p>
            </div>
          </div>
          <div className="flex-1 max-w-md hidden md:block relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by student, admission, case..." 
              className="w-full rounded-full border border-slate-300 bg-slate-50 py-2 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleAction("New Case")} className="hidden sm:inline-flex rounded-full bg-[#1D4ED8] px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 transition">
              <Plus className="mr-2 h-4 w-4" /> New Case
            </button>
            <TaskQueue />
            <ApprovalInbox currentUserId="school" />
            <NotificationBell />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden w-64 flex-col border-r border-[#D8E0EC] bg-white p-4 md:flex overflow-y-auto">
          <div className="mb-4 rounded-xl bg-indigo-50 p-3 border border-indigo-100 flex items-start gap-2">
            <LockKeyhole className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black uppercase text-indigo-800">Confidential</p>
              <p className="text-[11px] leading-tight text-indigo-700/80 mt-1">Strict privacy mode active.</p>
            </div>
          </div>
          {Array.from(new Set(navItems.map(i => i.group))).map(group => (
            <div key={group} className="mb-6">
              <h4 className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#94A3B8]">{group}</h4>
              <nav className="space-y-0.5">
                {navItems.filter(i => i.group === group).map(item => {
                  const active = activeView === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveView(item.id as CounsellorView)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm font-bold transition",
                        active ? "bg-[#EEF5FF] text-[#1D4ED8]" : "text-[#475569] hover:bg-slate-50 hover:text-[#071D49]"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {toast && (
            <div className={cn("fixed top-20 left-1/2 -translate-x-1/2 z-50 rounded-full px-6 py-3 font-bold shadow-lg transition-all flex items-center gap-2", toast.type === "error" ? "bg-red-600 text-white" : "bg-emerald-600 text-white")}>
              {toast.message}
            </div>
          )}

          {activeView === "overview" && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Active Cases", value: dashboardData?.active_referrals || 0, tone: "info" },
                  { label: "New Referrals", value: dashboardData?.upcoming_sessions || 0, tone: "warning" },
                  { label: "Follow-ups Due", value: dashboardData?.followups_due || 0, tone: "danger" },
                  { label: "High Risk Students", value: dashboardData?.high_risk_students || 0, tone: "success" }
                ].map((stat, i) => (
                  <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-black uppercase text-slate-500">{stat.label}</p>
                    <p className="mt-2 text-3xl font-black text-slate-900">{isLoadingDashboard ? "..." : stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Panel title="Today's Appointments" icon={CalendarClock}>
                  <DataTable
                    columns={["Student", "Time", "Location", "Status"]}
                    rows={isLoadingSessions ? [] : (sessionsData || []).slice(0, 5).map((s: any) => [
                      s.student_name || s.student_id?.substring(0, 8),
                      new Date(s.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      s.location || "Office",
                      <StatusChip key={s.id} label={s.status} tone={s.status === 'scheduled' ? 'info' : 'success'} />
                    ])}
                  />
                </Panel>
                <Panel title="New Referral Queue" icon={Inbox}>
                  <DataTable
                    columns={["Date", "Reason", "Priority", "Status"]}
                    rows={isLoadingReferrals ? [] : (referralsData || []).filter((r: any) => r.status === 'pending').slice(0, 5).map((r: any) => [
                      new Date(r.created_at).toLocaleDateString(),
                      r.reason?.substring(0, 30) + "...",
                      <StatusChip key={`p-${r.id}`} label={r.risk_level} tone={r.risk_level === 'high' ? 'danger' : 'warning'} />,
                      <StatusChip key={`s-${r.id}`} label={r.status} tone="info" />
                    ])}
                  />
                </Panel>
              </div>
            </div>
          )}

          {activeView === "referrals" && (
            <Panel title="Referral Inbox" description="Manage incoming referrals from teachers, discipline masters, and boarding." actions={<button onClick={() => handleAction("Bulk Accept")} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-bold text-white">Bulk Accept</button>}>
              <DataTable
                columns={["ID", "Date", "Student", "Reason", "Priority", "Status", "Actions"]}
                rows={isLoadingReferrals ? [] : (referralsData || []).map((r: any) => [
                  r.id.substring(0, 8),
                  new Date(r.created_at).toLocaleDateString(),
                  r.student_name || r.student_id?.substring(0, 8),
                  r.reason,
                  <StatusChip key={`p-${r.id}`} label={r.risk_level} tone={r.risk_level === 'high' ? 'danger' : r.risk_level === 'medium' ? 'warning' : 'neutral'} />,
                  <StatusChip key={`s-${r.id}`} label={r.status} tone={r.status === 'pending' ? 'info' : 'success'} />,
                  <div key={`a-${r.id}`} className="flex gap-2">
                    <button onClick={() => handleAction("Accept Case")} className="text-blue-600 font-bold text-xs">Accept</button>
                    <button onClick={() => handleAction("Request Info")} className="text-slate-500 font-bold text-xs">More Info</button>
                  </div>
                ])}
              />
            </Panel>
          )}

          {activeView === "cases" && (
            <Panel title="Student Cases" description="Confidential student cases under your management." actions={<button onClick={() => handleAction("New Case")} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-bold text-white">New Case</button>}>
              <DataTable
                columns={["Case #", "Student", "Class", "Category", "Priority", "Status", "Next Follow-up", "Actions"]}
                rows={[
                  ["CAS-809", "Brian Otieno", "Form 2 Blue", "Behaviour", <StatusChip key="p1" label="High" tone="danger" />, <StatusChip key="s1" label="Active" tone="info" />, "Tomorrow", <div key="a1" className="flex gap-2"><button onClick={() => handleAction("Open Case")} className="text-blue-600 font-bold text-xs">Open</button><button onClick={() => handleAction("Record Session")} className="text-emerald-600 font-bold text-xs">Record</button></div>]
                ]}
              />
            </Panel>
          )}

          {activeView === "appointments" && (
            <Panel title="Appointments" description="Manage your counselling calendar." actions={<button onClick={() => handleAction("Schedule Appointment")} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-bold text-white">Schedule Appointment</button>}>
              <DataTable
                columns={["Date", "Time", "Student", "Location", "Status", "Actions"]}
                rows={isLoadingSessions ? [] : (sessionsData || []).map((s: any) => [
                  new Date(s.scheduled_for).toLocaleDateString(),
                  new Date(s.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  s.student_name || s.student_id?.substring(0, 8),
                  s.location || "Office",
                  <StatusChip key={`s-${s.id}`} label={s.status} tone={s.status === 'scheduled' ? 'info' : 'success'} />,
                  <div key={`a-${s.id}`} className="flex gap-2">
                    <button onClick={() => handleAction("Mark Attended")} className="text-blue-600 font-bold text-xs">Attended</button>
                    <button onClick={() => handleAction("Reschedule")} className="text-slate-500 font-bold text-xs">Reschedule</button>
                  </div>
                ])}
              />
            </Panel>
          )}

          {activeView === "sessions" && (
            <Panel title="Session Notes" description="Secure, private notes for attended sessions." actions={<button onClick={() => handleAction("Export Notes")} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold">Print Private</button>}>
              <DataTable
                columns={["Date", "Student", "Session Type", "Visibility", "Follow-up Req.", "Actions"]}
                rows={[
                  ["11 Oct", "Mary Wanjiku", "Follow-up", <StatusChip key="s1" label="Private" tone="danger" />, "Yes", <div key="a1" className="flex gap-2"><button onClick={() => handleAction("View Note")} className="text-blue-600 font-bold text-xs">View Note</button><button onClick={() => handleAction("Lock Note")} className="text-slate-500 font-bold text-xs">Lock</button></div>]
                ]}
              />
            </Panel>
          )}

          {activeView === "followups" && (
            <Panel title="Follow-ups" description="Track learners requiring ongoing support." actions={<button onClick={() => handleAction("Add Follow-up")} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-bold text-white">Add Follow-up</button>}>
              <DataTable
                columns={["Student", "Reason", "Due Date", "Priority", "Status", "Actions"]}
                rows={[
                  ["Kevin T", "Check on peer relations", "Today", <StatusChip key="p1" label="High" tone="danger" />, <StatusChip key="s1" label="Due Today" tone="warning" />, <div key="a1" className="flex gap-2"><button onClick={() => handleAction("Mark Done")} className="text-emerald-600 font-bold text-xs">Mark Done</button><button onClick={() => handleAction("Reschedule")} className="text-blue-600 font-bold text-xs">Reschedule</button></div>]
                ]}
              />
            </Panel>
          )}

          {activeView === "welfare" && (
            <Panel title="Welfare Concerns" description="Broader concerns regarding attendance, basics, and general welfare." actions={<button onClick={() => handleAction("New Concern")} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-bold text-white">Log Concern</button>}>
              <DataTable
                columns={["Student", "Category", "Reported By", "Priority", "Status", "Actions"]}
                rows={[
                  ["Amina O", "Financial Hardship", "Class Teacher", <StatusChip key="p1" label="Medium" tone="warning" />, <StatusChip key="s1" label="Open" tone="info" />, <div key="a1" className="flex gap-2"><button onClick={() => handleAction("Create Case")} className="text-blue-600 font-bold text-xs">Create Case</button><button onClick={() => handleAction("Refer")} className="text-slate-500 font-bold text-xs">Refer</button></div>]
                ]}
              />
            </Panel>
          )}

          {activeView === "group" && (
            <Panel title="Group Guidance" description="Manage life skills and school-wide wellbeing programs." actions={<button onClick={() => handleAction("Create Session")} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-bold text-white">Create Group Session</button>}>
              <DataTable
                columns={["Title", "Target Group", "Date", "Status", "Actions"]}
                rows={[
                  ["Exam Prep Anxiety", "Form 4", "15 Oct", <StatusChip key="s1" label="Upcoming" tone="info" />, <div key="a1" className="flex gap-2"><button onClick={() => handleAction("Take Attendance")} className="text-blue-600 font-bold text-xs">Attendance</button></div>]
                ]}
              />
            </Panel>
          )}

          {activeView === "parents" && (
            <Panel title="Parent Engagement" description="Log parent communications safely without exposing private notes." actions={<button onClick={() => handleAction("Log Contact")} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-bold text-white">Log Parent Contact</button>}>
              <DataTable
                columns={["Student", "Guardian", "Method", "Reason", "Status", "Actions"]}
                rows={[
                  ["David O", "Mr. Omondi", "Call", "Welfare check", <StatusChip key="s1" label="Contacted" tone="success" />, <div key="a1" className="flex gap-2"><button onClick={() => handleAction("Schedule Meeting")} className="text-blue-600 font-bold text-xs">Schedule Meeting</button></div>]
                ]}
              />
            </Panel>
          )}

          {activeView === "teachers" && (
            <Panel title="Teacher Collaboration" description="Request feedback or classroom observations." actions={<button onClick={() => handleAction("Request Feedback")} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-bold text-white">Request Feedback</button>}>
              <DataTable
                columns={["Request ID", "Student", "Staff Member", "Request Type", "Due", "Status", "Actions"]}
                rows={[
                  ["REQ-01", "Brian Otieno", "Mr. Kariuki", "Class Observation", "14 Oct", <StatusChip key="s1" label="Pending" tone="warning" />, <button key="a1" onClick={() => handleAction("Send Reminder")} className="text-blue-600 font-bold text-xs">Reminder</button>]
                ]}
              />
            </Panel>
          )}

          {activeView === "discipline" && (
            <Panel title="Discipline Support" description="Support plans for discipline referrals." actions={<button onClick={() => handleAction("Create Plan")} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-bold text-white">Create Support Plan</button>}>
              <DataTable
                columns={["Student", "Incident Ref", "Referred By", "Status", "Next Action", "Actions"]}
                rows={[
                  ["Mark M", "INC-502", "Discipline Master", <StatusChip key="s1" label="Monitoring" tone="info" />, "Review Plan", <div key="a1" className="flex gap-2"><button onClick={() => handleAction("Record Session")} className="text-blue-600 font-bold text-xs">Record</button><button onClick={() => handleAction("Update DM")} className="text-emerald-600 font-bold text-xs">Update DM</button></div>]
                ]}
              />
            </Panel>
          )}

          {activeView === "health" && (
            <Panel title="Health Referrals" description="Coordinate with the Nurse/Sick Bay." actions={<button onClick={() => handleAction("Refer Nurse")} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-bold text-white">Refer to Nurse</button>}>
              <DataTable
                columns={["Student", "Direction", "Summary", "Status", "Actions"]}
                rows={[
                  ["Faith A", "To Nurse", "Suspected migraine causing distress", <StatusChip key="s1" label="Open" tone="warning" />, <button key="a1" onClick={() => handleAction("Request Update")} className="text-blue-600 font-bold text-xs">Request Update</button>]
                ]}
              />
            </Panel>
          )}

          {activeView === "escalations" && (
            <Panel title="Safeguarding & Escalations" description="Urgent matters escalated to school leadership." actions={<button onClick={() => handleAction("Escalate Case")} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white">New Escalation</button>}>
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-3 text-red-800">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <div>
                    <h3 className="font-bold">Restricted Access Area</h3>
                    <p className="text-sm">Only authorised personnel can view full escalation details. Auditing is enabled.</p>
                  </div>
                </div>
              </div>
              <DataTable
                columns={["ID", "Student", "Priority", "Escalated To", "Date", "Status", "Actions"]}
                rows={[
                  ["ESC-09", "Kevin T", <StatusChip key="p1" label="Urgent" tone="danger" />, "Principal", "Today", <StatusChip key="s1" label="Under Review" tone="warning" />, <div key="a1" className="flex gap-2"><button onClick={() => handleAction("Add Update")} className="text-blue-600 font-bold text-xs">Add Update</button><button onClick={() => handleAction("Close")} className="text-red-600 font-bold text-xs">Close</button></div>]
                ]}
              />
            </Panel>
          )}

          {activeView === "reports" && (
            <div className="space-y-6">
              <Panel title="Counselling Reports" description="Generate anonymised welfare and workload reports for leadership.">
                <div className="grid gap-4 md:grid-cols-3">
                  {["Counselling Workload", "Referral Sources", "Class Welfare Trends", "Follow-up Compliance"].map((rep) => (
                    <div key={rep} className="rounded-xl border border-slate-200 p-4 text-center transition hover:border-blue-300">
                      <FileBarChart2 className="mx-auto mb-2 h-8 w-8 text-blue-600" />
                      <h4 className="font-bold text-slate-800">{rep}</h4>
                      <button onClick={() => handleAction(`Generate ${rep}`)} className="mt-3 w-full rounded-lg bg-blue-50 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100">Generate PDF</button>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          )}

          {activeView === "templates" && (
            <Panel title="Resources & Templates" description="Forms and materials for counselling support." actions={<button onClick={() => handleAction("Upload Resource")} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-bold text-white">Upload File</button>}>
              <DataTable
                columns={["Resource Name", "Category", "Uploaded", "Visibility", "Actions"]}
                rows={[
                  ["Student Support Plan", "Template", "10 Jan", "All Staff", <button key="a1" onClick={() => handleAction("Download")} className="text-blue-600 font-bold text-xs">Download</button>],
                  ["Parent Meeting Guide", "Template", "12 Feb", "Counsellors Only", <button key="a2" onClick={() => handleAction("Download")} className="text-blue-600 font-bold text-xs">Download</button>]
                ]}
              />
            </Panel>
          )}

          {activeView === "settings" && (
            <div className="space-y-6">
              <Panel title="Privacy & Notification Settings" description="Configure default visibility and notification rules.">
                <div className="space-y-4 max-w-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800">Notify referrer on case acceptance</p>
                      <p className="text-xs text-slate-500">Sends an automated message to the staff who made the referral.</p>
                    </div>
                    <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800">Require audit reason</p>
                      <p className="text-xs text-slate-500">Prompt for a reason when viewing restricted files.</p>
                    </div>
                    <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                  </div>
                  <button onClick={() => handleAction("Save Settings")} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">Save Preferences</button>
                </div>
              </Panel>
            </div>
          )}

        </main>
      </div>
      
    </div>
  );
}
