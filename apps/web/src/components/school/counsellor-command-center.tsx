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

import { getCurrentSchoolId, publishSchoolOperationalEvent, requireCurrentSchoolId } from "@/lib/school/school-operational-store";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { ApprovalInbox } from "@/components/shared/approval-inbox";
import { NotificationBell } from "@/components/shared/notification-bell";
import { TaskQueue } from "@/components/shared/task-queue";
import { WorkflowToast } from "@/components/shared/workflow-toast";
import { Modal } from "@/components/ui/modal";

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

function counsellorActionSlug(action: string) {
  return action
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "workflow_action";
}

function formatDateTime(value: unknown, fallback = "Not scheduled") {
  if (!value) return fallback;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? fallback : date;
}

async function persistCounsellorWorkflowAction(action: string, payload: Record<string, unknown> = {}) {
  return requestDashboardApi("/admin-command/guidance-counselling/actions", {
    method: "POST",
    body: {
      action: counsellorActionSlug(action),
      label: action,
      source_dashboard: "counsellor-command-center",
      source_module: "counselling",
      ...payload,
    },
  });
}

async function generateCounsellorReport(title: string) {
  return requestDashboardApi("/admin-command/guidance-counselling/reports/generate", {
    method: "POST",
    body: {
      title,
      name: title,
      format: "pdf",
      source_dashboard: "counsellor-command-center",
    },
  });
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

function NewCounsellingCaseModal({
  open,
  schoolId,
  onClose,
  onCreated,
}: {
  open: boolean;
  schoolId: string | null;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateCounsellingReferral(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const studentId = String(formData.get("student_id") ?? "").trim();
    const classId = String(formData.get("class_id") ?? "").trim();
    const academicTermId = String(formData.get("academic_term_id") ?? "").trim();
    const academicYearId = String(formData.get("academic_year_id") ?? "").trim();
    const incidentId = String(formData.get("incident_id") ?? "").trim();
    const reason = String(formData.get("reason") ?? "").trim();
    const riskLevel = String(formData.get("risk_level") ?? "medium").trim();

    if (!studentId || !classId || !academicTermId || !academicYearId || !reason) {
      setError("Student, class, academic term, academic year, and reason are required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await requestDashboardApi("/admin-command/guidance-counselling/referrals", {
        method: "POST",
        body: {
          school_id: schoolId || undefined,
          student_id: studentId,
          class_id: classId,
          academic_term_id: academicTermId,
          academic_year_id: academicYearId,
          incident_id: incidentId || undefined,
          reason,
          risk_level: riskLevel,
          source_dashboard: "counsellor-command-center",
        },
      });
      onCreated?.();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Counselling case could not be created.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New counselling case" open={open} onClose={onClose} size="lg">
      <form onSubmit={handleCreateCounsellingReferral} className="space-y-4 p-6">
        {error ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
            {error}
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-bold text-[#071D49]">Student ID
            <input name="student_id" required className="mt-1 w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder="Student UUID" />
          </label>
          <label className="text-sm font-bold text-[#071D49]">Class ID
            <input name="class_id" required className="mt-1 w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder="Class UUID" />
          </label>
          <label className="text-sm font-bold text-[#071D49]">Academic term ID
            <input name="academic_term_id" required className="mt-1 w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder="Term UUID" />
          </label>
          <label className="text-sm font-bold text-[#071D49]">Academic year ID
            <input name="academic_year_id" required className="mt-1 w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder="Academic year UUID" />
          </label>
          <label className="text-sm font-bold text-[#071D49]">Linked incident ID
            <input name="incident_id" className="mt-1 w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder="Optional incident UUID" />
          </label>
          <label className="text-sm font-bold text-[#071D49]">Risk level
            <select name="risk_level" defaultValue="medium" className="mt-1 w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </label>
        </div>
        <label className="block text-sm font-bold text-[#071D49]">Referral reason
          <textarea name="reason" required rows={4} className="mt-1 w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder="Summarise the concern, source, and first support step." />
        </label>
        <div className="flex justify-end gap-3 border-t border-[#D8E0EC] pt-4">
          <button type="button" onClick={onClose} disabled={submitting} className="rounded-xl px-4 py-2 text-sm font-bold text-[#64748B]">Cancel</button>
          <button type="submit" disabled={submitting} className="rounded-xl bg-[#071D49] px-6 py-2 text-sm font-black text-white disabled:opacity-60">
            {submitting ? "Creating..." : "Create Case"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

import { buildSchoolSectionHref } from "./school-pages";

export function CounsellorCommandCenter({ activeSection, routeMode }: { activeSection?: string; routeMode?: RouteMode }) {
  const [activeViewState, setActiveViewState] = useState<any>(
    activeSection && activeSection !== "dashboard" ? activeSection : "overview"
  );
  const activeView = activeViewState;

  const setActiveView = (view: any) => {
    setActiveViewState(view);
    const newPath = buildSchoolSectionHref("guidance-counselling", view, routeMode ?? "hosted");
    window.history.replaceState(null, "", newPath);
  };
  
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [newCaseOpen, setNewCaseOpen] = useState(false);
  const [updatingReferralId, setUpdatingReferralId] = useState<string | null>(null);
  const [savingCounsellorSettings, setSavingCounsellorSettings] = useState(false);
  const [counsellorSettings, setCounsellorSettings] = useState({
    notify_referrer_on_acceptance: true,
    require_audit_reason: true,
    default_case_visibility: "restricted",
  });

  const { data: dashboardData, isLoading: isLoadingDashboard } = useSchoolQuery<any>("/api/counselling/overview");
  const { data: referralsData, isLoading: isLoadingReferrals, refetch: refetchReferrals } = useSchoolQuery<any>("/api/counselling/referrals");
  const { data: casesData } = useSchoolQuery<any>("/api/counselling/cases");
  const { data: sessionsData, isLoading: isLoadingSessions } = useSchoolQuery<any>("/api/counselling/sessions");
  const { data: appointmentsData } = useSchoolQuery<any>("/api/counselling/appointments");
  const { data: followupsData } = useSchoolQuery<any>("/api/counselling/followups");
  const { data: welfareData } = useSchoolQuery<any>("/api/counselling/welfare");
  const { data: groupGuidanceData } = useSchoolQuery<any>("/api/counselling/group-guidance");
  const { data: parentsData } = useSchoolQuery<any>("/api/counselling/parents");
  const { data: teachersData } = useSchoolQuery<any>("/api/counselling/teachers");
  const { data: disciplineData } = useSchoolQuery<any>("/api/counselling/discipline");
  const { data: healthData } = useSchoolQuery<any>("/api/counselling/health");
  const { data: escalationsData } = useSchoolQuery<any>("/api/counselling/escalations");
  const { data: reportsData } = useSchoolQuery<any>("/api/counselling/reports");
  const { data: templatesData } = useSchoolQuery<any>("/api/counselling/templates");
  const counsellingMetrics = dashboardData?.metrics ?? dashboardData?.overview ?? dashboardData ?? {};

  const asRows = <T,>(value: unknown): T[] => {
    if (Array.isArray(value)) return value as T[];
    if (value && typeof value === "object" && Array.isArray((value as any).data)) return (value as any).data;
    if (value && typeof value === "object" && Array.isArray((value as any).items)) return (value as any).items;
    return [];
  };
  const query = searchQuery.trim().toLowerCase();
  const matchesSearch = (record: unknown) => !query || JSON.stringify(record ?? "").toLowerCase().includes(query);
  const displayDate = (value: unknown, fallback = "Not dated") => {
    const formatted = formatDateTime(value, fallback);
    return formatted instanceof Date ? formatted.toLocaleDateString() : formatted;
  };
  const displayTime = (value: unknown, fallback = "Not scheduled") => {
    const formatted = formatDateTime(value, fallback);
    return formatted instanceof Date ? formatted.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : formatted;
  };
  const learnerLabel = (record: any) => record?.learner || record?.student_name || record?.admission_number || record?.student_id?.substring?.(0, 8) || "Student record";
  const riskTone = (value: unknown): Tone => {
    const risk = String(value ?? "").toLowerCase();
    if (risk === "critical" || risk === "urgent" || risk === "high") return "danger";
    if (risk === "medium") return "warning";
    if (risk === "low") return "success";
    return "neutral";
  };
  const statusTone = (value: unknown): Tone => {
    const status = String(value ?? "").toLowerCase();
    if (["done", "closed", "completed", "ready", "contacted", "accepted", "active"].includes(status)) return "success";
    if (["pending", "scheduled", "open", "monitoring", "under_review"].includes(status)) return "info";
    if (["due", "due_today", "overdue", "escalated"].includes(status)) return "warning";
    if (["critical", "urgent", "declined", "failed"].includes(status)) return "danger";
    return "neutral";
  };
  const referralRows = asRows<any>(referralsData).filter(matchesSearch);
  const caseRows = asRows<any>(casesData).filter(matchesSearch);
  const sessionRows = asRows<any>(sessionsData).filter(matchesSearch);
  const appointmentRows = asRows<any>(appointmentsData).filter(matchesSearch);
  const followupRows = asRows<any>(followupsData).filter(matchesSearch);
  const welfareRows = asRows<any>(welfareData).filter(matchesSearch);
  const groupRows = asRows<any>(groupGuidanceData).filter(matchesSearch);
  const parentRows = asRows<any>(parentsData).filter(matchesSearch);
  const teacherRows = asRows<any>(teachersData).filter(matchesSearch);
  const disciplineRows = asRows<any>(disciplineData).filter(matchesSearch);
  const healthRows = asRows<any>(healthData).filter(matchesSearch);
  const escalationRows = asRows<any>(escalationsData).filter(matchesSearch);
  const reportRows = asRows<any>(reportsData).filter(matchesSearch);
  const templateRows = asRows<any>(templatesData).filter(matchesSearch);

  useEffect(() => {
    if (routeMode === "hosted") setSchoolId(getCurrentSchoolId());
  }, [routeMode]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAction = async (action: string) => {
    try {
      const normalizedAction = counsellorActionSlug(action);
      const currentSchoolId = requireCurrentSchoolId(schoolId);

      if (normalizedAction.startsWith("generate_")) {
        await generateCounsellorReport(action.replace(/^Generate\s+/i, ""));
      } else if (normalizedAction === "export_notes") {
        await generateCounsellorReport("Private counselling session notes");
      } else {
        await persistCounsellorWorkflowAction(action);
      }

      publishSchoolOperationalEvent({
        type: "COUNSELLOR_ACTION",
        schoolId: currentSchoolId,
        title: "Counselling workflow saved",
        body: `${action} was persisted through the counselling command workflow.`,
        module: "counselling",
        actorRole: "counsellor"
      });
      showToast(`${action} saved to the counselling workflow.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to record counselling action.";
      showToast(message, "error");
    }
  };

  const handleReferralStatus = async (referral: any, status: "accepted" | "declined" | "closed") => {
    if (!referral?.id) {
      showToast("A valid referral ID is required.", "error");
      return;
    }
    setUpdatingReferralId(referral.id);
    try {
      await requestDashboardApi(`/admin-command/guidance-counselling/referrals/${referral.id}/status`, {
        method: "POST",
        body: {
          status,
          response_note: status === "accepted" ? "Accepted for counselling support from the referral inbox." : undefined,
          source_dashboard: "counsellor-command-center",
        },
      });
      await refetchReferrals?.();
      publishSchoolOperationalEvent({
        type: "COUNSELLOR_REFERRAL_STATUS_UPDATED",
        schoolId: requireCurrentSchoolId(schoolId),
        title: "Counselling referral updated",
        body: `Referral ${String(referral.id).slice(0, 8)} marked ${status}.`,
        module: "counselling",
        actorRole: "counsellor",
      });
      showToast(`Referral ${status}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update referral status.";
      showToast(message, "error");
    } finally {
      setUpdatingReferralId(null);
    }
  };

  const handleSaveCounsellorSettings = async () => {
    setSavingCounsellorSettings(true);
    try {
      await requestDashboardApi("/admin-command/guidance-counselling/settings", {
        method: "POST",
        body: counsellorSettings,
      });
      publishSchoolOperationalEvent({
        type: "COUNSELLOR_SETTINGS_SAVED",
        schoolId: requireCurrentSchoolId(schoolId),
        title: "Counselling settings saved",
        body: "Privacy and notification settings were saved for the counselling workflow.",
        module: "counselling",
        actorRole: "counsellor",
      });
      showToast("Counselling settings saved.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save counselling settings.";
      showToast(message, "error");
    } finally {
      setSavingCounsellorSettings(false);
    }
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
            <button onClick={() => setNewCaseOpen(true)} className="hidden sm:inline-flex rounded-full bg-[#1D4ED8] px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 transition">
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
                  { label: "Open Cases", value: counsellingMetrics.openCases ?? counsellingMetrics.open_cases ?? 0, tone: "info" },
                  { label: "New Referrals", value: counsellingMetrics.newReferrals ?? counsellingMetrics.new_referrals ?? 0, tone: "warning" },
                  { label: "Follow-ups Due", value: counsellingMetrics.followUpsDue ?? counsellingMetrics.follow_ups_due ?? 0, tone: "danger" },
                  { label: "Appointments Today", value: counsellingMetrics.appointmentsToday ?? counsellingMetrics.appointments_today ?? 0, tone: "success" }
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
                    rows={isLoadingSessions ? [] : sessionRows.slice(0, 5).map((s: any) => {
                      const scheduledAt = formatDateTime(s.scheduled_for ?? s.session_date ?? s.date ?? s.created_at);
                      return [
                        learnerLabel(s),
                        scheduledAt instanceof Date ? scheduledAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : scheduledAt,
                        s.location || "Office",
                        <StatusChip key={s.id} label={s.status || "scheduled"} tone={statusTone(s.status || "scheduled")} />
                      ];
                    })}
                  />
                </Panel>
                <Panel title="New Referral Queue" icon={Inbox}>
                  <DataTable
                    columns={["Date", "Reason", "Priority", "Status"]}
                    rows={isLoadingReferrals ? [] : referralRows.filter((r: any) => String(r.status ?? "pending").toLowerCase() === "pending").slice(0, 5).map((r: any) => [
                      displayDate(r.created_at),
                      r.reason ? `${String(r.reason).substring(0, 30)}...` : "Referral note",
                      <StatusChip key={`p-${r.id}`} label={r.risk_level || "normal"} tone={riskTone(r.risk_level)} />,
                      <StatusChip key={`s-${r.id}`} label={r.status || "pending"} tone={statusTone(r.status || "pending")} />
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
                rows={isLoadingReferrals ? [] : referralRows.map((r: any) => [
                  r.id?.substring(0, 8) || "REF",
                  displayDate(r.created_at),
                  learnerLabel(r),
                  r.reason || "Referral note",
                  <StatusChip key={`p-${r.id}`} label={r.risk_level || "normal"} tone={riskTone(r.risk_level)} />,
                  <StatusChip key={`s-${r.id}`} label={r.status || "pending"} tone={statusTone(r.status || "pending")} />,
                  <div key={`a-${r.id}`} className="flex gap-2">
                    <button type="button" disabled={updatingReferralId === r.id} onClick={() => void handleReferralStatus(r, "accepted")} className="text-blue-600 font-bold text-xs disabled:opacity-50">{updatingReferralId === r.id ? "Accepting..." : "Accept"}</button>
                    <button onClick={() => handleAction("Request Info")} className="text-slate-500 font-bold text-xs">More Info</button>
                  </div>
                ])}
              />
            </Panel>
          )}

          {activeView === "cases" && (
            <Panel title="Student Cases" description="Confidential student cases under your management." actions={<button onClick={() => setNewCaseOpen(true)} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-bold text-white">New Case</button>}>
              <DataTable
                columns={["Case #", "Student", "Class", "Category", "Priority", "Status", "Next Follow-up", "Actions"]}
                rows={(caseRows.length ? caseRows : referralRows).map((caseRecord: any) => [
                  caseRecord.id?.substring(0, 8) || "CASE",
                  learnerLabel(caseRecord),
                  caseRecord.class_name || caseRecord.stream_name || caseRecord.admission_number || "Unassigned",
                  caseRecord.category || caseRecord.reason || "Counselling",
                  <StatusChip key={`p-${caseRecord.id}`} label={caseRecord.risk_level || caseRecord.priority || "normal"} tone={riskTone(caseRecord.risk_level || caseRecord.priority)} />,
                  <StatusChip key={`s-${caseRecord.id}`} label={caseRecord.status || "open"} tone={statusTone(caseRecord.status || "open")} />,
                  displayDate(caseRecord.due_date || caseRecord.next_followup_at, "No follow-up set"),
                  <div key={`a-${caseRecord.id}`} className="flex gap-2"><button onClick={() => handleAction("Open Case")} className="text-blue-600 font-bold text-xs">Open</button><button onClick={() => handleAction("Record Session")} className="text-emerald-600 font-bold text-xs">Record</button></div>
                ])}
              />
            </Panel>
          )}

          {activeView === "appointments" && (
            <Panel title="Appointments" description="Manage your counselling calendar." actions={<button onClick={() => handleAction("Schedule Appointment")} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-bold text-white">Schedule Appointment</button>}>
              <DataTable
                columns={["Date", "Time", "Student", "Location", "Status", "Actions"]}
                rows={(appointmentRows.length ? appointmentRows : sessionRows).map((s: any) => [
                  displayDate(s.scheduled_for ?? s.session_date ?? s.date ?? s.created_at),
                  displayTime(s.scheduled_for ?? s.session_date ?? s.date ?? s.created_at),
                  learnerLabel(s),
                  s.location || "Office",
                  <StatusChip key={`s-${s.id}`} label={s.status || "scheduled"} tone={statusTone(s.status || "scheduled")} />,
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
                rows={sessionRows.map((session: any) => [
                  displayDate(session.scheduled_for ?? session.created_at),
                  learnerLabel(session),
                  session.agenda || session.session_type || "Counselling session",
                  <StatusChip key={`v-${session.id}`} label={session.visibility || "restricted"} tone="danger" />,
                  session.follow_up_required ? "Yes" : session.status === "completed" ? "No" : "Review",
                  <div key={`a-${session.id}`} className="flex gap-2"><button onClick={() => handleAction("View Note")} className="text-blue-600 font-bold text-xs">View Note</button><button onClick={() => handleAction("Lock Note")} className="text-slate-500 font-bold text-xs">Lock</button></div>
                ])}
              />
            </Panel>
          )}

          {activeView === "followups" && (
            <Panel title="Follow-ups" description="Track learners requiring ongoing support." actions={<button onClick={() => handleAction("Add Follow-up")} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-bold text-white">Add Follow-up</button>}>
              <DataTable
                columns={["Student", "Reason", "Due Date", "Priority", "Status", "Actions"]}
                rows={followupRows.map((followup: any) => [
                  learnerLabel(followup),
                  followup.reason || "Follow-up",
                  displayDate(followup.due_date),
                  <StatusChip key={`p-${followup.id}`} label={followup.priority || "normal"} tone={riskTone(followup.priority)} />,
                  <StatusChip key={`s-${followup.id}`} label={followup.status || "pending"} tone={statusTone(followup.status || "pending")} />,
                  <div key={`a-${followup.id}`} className="flex gap-2"><button onClick={() => handleAction("Mark Done")} className="text-emerald-600 font-bold text-xs">Mark Done</button><button onClick={() => handleAction("Reschedule")} className="text-blue-600 font-bold text-xs">Reschedule</button></div>
                ])}
              />
            </Panel>
          )}

          {activeView === "welfare" && (
            <Panel title="Welfare Concerns" description="Broader concerns regarding attendance, basics, and general welfare." actions={<button onClick={() => handleAction("New Concern")} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-bold text-white">Log Concern</button>}>
              <DataTable
                columns={["Student", "Category", "Reported By", "Priority", "Status", "Actions"]}
                rows={welfareRows.map((concern: any) => [
                  learnerLabel(concern),
                  concern.category || "Welfare",
                  concern.reported_by || "School staff",
                  <StatusChip key={`p-${concern.id}`} label={concern.priority || "normal"} tone={riskTone(concern.priority)} />,
                  <StatusChip key={`s-${concern.id}`} label={concern.status || "open"} tone={statusTone(concern.status || "open")} />,
                  <div key={`a-${concern.id}`} className="flex gap-2"><button onClick={() => handleAction("Create Case")} className="text-blue-600 font-bold text-xs">Create Case</button><button onClick={() => handleAction("Refer")} className="text-slate-500 font-bold text-xs">Refer</button></div>
                ])}
              />
            </Panel>
          )}

          {activeView === "group" && (
            <Panel title="Group Guidance" description="Manage life skills and school-wide wellbeing programs." actions={<button onClick={() => handleAction("Create Session")} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-bold text-white">Create Group Session</button>}>
              <DataTable
                columns={["Title", "Target Group", "Date", "Status", "Actions"]}
                rows={groupRows.map((groupSession: any) => [
                  groupSession.title || groupSession.message || "Group guidance session",
                  groupSession.target_group || groupSession.priority || "School group",
                  displayDate(groupSession.scheduled_for ?? groupSession.created_at),
                  <StatusChip key={`s-${groupSession.id}`} label={groupSession.status || "planned"} tone={statusTone(groupSession.status || "planned")} />,
                  <div key={`a-${groupSession.id}`} className="flex gap-2"><button onClick={() => handleAction("Take Attendance")} className="text-blue-600 font-bold text-xs">Attendance</button></div>
                ])}
              />
            </Panel>
          )}

          {activeView === "parents" && (
            <Panel title="Parent Engagement" description="Log parent communications safely without exposing private notes." actions={<button onClick={() => handleAction("Log Contact")} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-bold text-white">Log Parent Contact</button>}>
              <DataTable
                columns={["Student", "Guardian", "Method", "Reason", "Status", "Actions"]}
                rows={parentRows.map((contact: any) => [
                  contact.learner || "Linked learner",
                  contact.display_name || contact.guardian_name || contact.email || "Guardian record",
                  contact.preferred_channel || contact.phone || contact.email || "Portal",
                  contact.relationship || "Guardian engagement",
                  <StatusChip key={`s-${contact.id}`} label={contact.status || "linked"} tone={statusTone(contact.status || "linked")} />,
                  <div key={`a-${contact.id}`} className="flex gap-2"><button onClick={() => handleAction("Schedule Meeting")} className="text-blue-600 font-bold text-xs">Schedule Meeting</button></div>
                ])}
              />
            </Panel>
          )}

          {activeView === "teachers" && (
            <Panel title="Teacher Collaboration" description="Request feedback or classroom observations." actions={<button onClick={() => handleAction("Request Feedback")} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-bold text-white">Request Feedback</button>}>
              <DataTable
                columns={["Request ID", "Student", "Staff Member", "Request Type", "Due", "Status", "Actions"]}
                rows={teacherRows.map((request: any) => [
                  request.id?.substring?.(0, 8) || request.user_id?.substring?.(0, 8) || "STAFF",
                  request.learner || "Learner to assign",
                  request.display_name || request.email || "Staff member",
                  request.request_type || "Counselling feedback",
                  displayDate(request.due_date, "No due date"),
                  <StatusChip key={`s-${request.user_id || request.id}`} label={request.status || "active"} tone={statusTone(request.status || "active")} />,
                  <button key={`a-${request.user_id || request.id}`} onClick={() => handleAction("Send Reminder")} className="text-blue-600 font-bold text-xs">Reminder</button>
                ])}
              />
            </Panel>
          )}

          {activeView === "discipline" && (
            <Panel title="Discipline Support" description="Support plans for discipline referrals." actions={<button onClick={() => handleAction("Create Plan")} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-bold text-white">Create Support Plan</button>}>
              <DataTable
                columns={["Student", "Incident Ref", "Referred By", "Status", "Next Action", "Actions"]}
                rows={disciplineRows.map((incident: any) => [
                  learnerLabel(incident),
                  incident.id?.substring?.(0, 8) || "INC",
                  incident.referred_by || "Discipline team",
                  <StatusChip key={`s-${incident.id}`} label={incident.status || "open"} tone={statusTone(incident.status || "open")} />,
                  incident.next_action || incident.category || "Review support plan",
                  <div key={`a-${incident.id}`} className="flex gap-2"><button onClick={() => handleAction("Record Session")} className="text-blue-600 font-bold text-xs">Record</button><button onClick={() => handleAction("Update Discipline Team")} className="text-emerald-600 font-bold text-xs">Update Discipline</button></div>
                ])}
              />
            </Panel>
          )}

          {activeView === "health" && (
            <Panel title="Health Referrals" description="Coordinate with the Nurse/Sick Bay." actions={<button onClick={() => handleAction("Refer Nurse")} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-bold text-white">Refer to Nurse</button>}>
              <DataTable
                columns={["Student", "Direction", "Summary", "Status", "Actions"]}
                rows={healthRows.map((referral: any) => [
                  learnerLabel(referral),
                  referral.direction || "Health office",
                  referral.symptoms_summary || referral.summary || "Health referral",
                  <StatusChip key={`s-${referral.id}`} label={referral.status || "open"} tone={statusTone(referral.status || "open")} />,
                  <button key={`a-${referral.id}`} onClick={() => handleAction("Request Update")} className="text-blue-600 font-bold text-xs">Request Update</button>
                ])}
              />
            </Panel>
          )}

          {activeViewState === "escalations" && (
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
                rows={escalationRows.map((escalation: any) => [
                  escalation.id?.substring?.(0, 8) || "ESC",
                  learnerLabel(escalation),
                  <StatusChip key={`p-${escalation.id}`} label={escalation.priority || "urgent"} tone={riskTone(escalation.priority || "urgent")} />,
                  escalation.escalated_to || "School leadership",
                  displayDate(escalation.created_at),
                  <StatusChip key={`s-${escalation.id}`} label={escalation.status || "under_review"} tone={statusTone(escalation.status || "under_review")} />,
                  <div key={`a-${escalation.id}`} className="flex gap-2"><button onClick={() => handleAction("Add Update")} className="text-blue-600 font-bold text-xs">Add Update</button><button onClick={() => handleAction("Close")} className="text-red-600 font-bold text-xs">Close</button></div>
                ])}
              />
            </Panel>
          )}

          {activeViewState === "reports" && (
            <div className="space-y-6">
              <Panel title="Counselling Reports" description="Generate anonymised welfare and workload reports for leadership.">
                <div className="grid gap-4 md:grid-cols-3">
                  {(reportRows.length ? reportRows : [
                    { id: "workload", title: "Counselling Workload", status: "Available" },
                    { id: "referral-sources", title: "Referral Sources", status: "Available" },
                    { id: "welfare-trends", title: "Class Welfare Trends", status: "Available" },
                    { id: "follow-up-compliance", title: "Follow-up Compliance", status: "Available" },
                  ]).map((report: any) => (
                    <div key={report.id || report.snapshot_id || report.title} className="rounded-xl border border-slate-200 p-4 text-center transition hover:border-blue-300">
                      <FileBarChart2 className="mx-auto mb-2 h-8 w-8 text-blue-600" />
                      <h4 className="font-bold text-slate-800">{report.title || report.name || "Counselling report"}</h4>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{report.status || report.format || "Report template"}</p>
                      <button onClick={() => handleAction(`Generate ${report.title || report.name || "Counselling Report"}`)} className="mt-3 w-full rounded-lg bg-blue-50 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100">Generate PDF</button>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          )}

          {activeViewState === "templates" && (
            <Panel title="Resources & Templates" description="Forms and materials for counselling support." actions={<button onClick={() => handleAction("Upload Resource")} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-bold text-white">Upload File</button>}>
              <DataTable
                columns={["Resource Name", "Category", "Uploaded", "Visibility", "Actions"]}
                rows={templateRows.map((template: any) => [
                  template.title || template.name || "Counselling resource",
                  template.category || "Template",
                  displayDate(template.created_at, "System resource"),
                  template.visibility || "Counselling team",
                  <button key={`a-${template.id || template.title}`} onClick={() => handleAction("Download Resource")} className="text-blue-600 font-bold text-xs">Download</button>
                ])}
              />
            </Panel>
          )}

          {activeViewState === "settings" && (
            <div className="space-y-6">
              <Panel title="Privacy & Notification Settings" description="Configure default visibility and notification rules.">
                <div className="space-y-4 max-w-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800">Notify referrer on case acceptance</p>
                      <p className="text-xs text-slate-500">Sends an automated message to the staff who made the referral.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={counsellorSettings.notify_referrer_on_acceptance}
                      onChange={(event) => setCounsellorSettings((current) => ({ ...current, notify_referrer_on_acceptance: event.currentTarget.checked }))}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800">Require audit reason</p>
                      <p className="text-xs text-slate-500">Prompt for a reason when viewing restricted files.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={counsellorSettings.require_audit_reason}
                      onChange={(event) => setCounsellorSettings((current) => ({ ...current, require_audit_reason: event.currentTarget.checked }))}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600"
                    />
                  </div>
                  <label className="block text-sm font-bold text-slate-800">
                    Default case visibility
                    <select
                      value={counsellorSettings.default_case_visibility}
                      onChange={(event) => setCounsellorSettings((current) => ({ ...current, default_case_visibility: event.currentTarget.value }))}
                      className="mt-1 w-full rounded-xl border border-[#D8E0EC] bg-white p-3 text-sm outline-none focus:border-[#071D49]"
                    >
                      <option value="restricted">Restricted</option>
                      <option value="private">Private counsellor only</option>
                      <option value="team">Counselling team</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={savingCounsellorSettings}
                    onClick={() => void handleSaveCounsellorSettings()}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                  >
                    {savingCounsellorSettings ? "Saving..." : "Save Preferences"}
                  </button>
                </div>
              </Panel>
            </div>
          )}

        </main>
      </div>
      <NewCounsellingCaseModal
        open={newCaseOpen}
        schoolId={schoolId}
        onClose={() => setNewCaseOpen(false)}
        onCreated={() => {
          void refetchReferrals?.();
          setActiveView("referrals");
          showToast("Counselling case created and added to the referral inbox.");
        }}
      />
    </div>
  );
}
