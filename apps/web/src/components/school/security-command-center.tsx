// GENERATED FOR SECURITY OFFICER
"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Bell,
  Bus,
  Calendar,
  Car,
  Clock,
  ClockAlert,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Package,
  PieChart,
  Search,
  Settings,
  ShieldAlert,
  Ticket,
  UserPlus,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useSchoolQuery, useSchoolMutation } from "@/lib/data/school-hooks";
import { ApprovalInbox } from "@/components/shared/approval-inbox";
import { MobileWorkspaceNavigation } from "@/components/shared/mobile-workspace-navigation";
import { NotificationBell } from "@/components/shared/notification-bell";
import { TaskQueue } from "@/components/shared/task-queue";
import { IntegratedSchoolCommandHeader, SchoolCommandSidebarIdentity } from "@/components/school/integrated-school-command-header";
import { WorkflowToast } from "@/components/shared/workflow-toast";
import { Modal } from "@/components/ui/modal";
import { toast } from "sonner";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { downloadCsvFile, openPrintDocument } from "@/lib/dashboard/export";
import {
  getCurrentSchoolId,
  publishSchoolOperationalEvent,
} from "@/lib/school/school-operational-store";

type RouteMode = "hosted" | "public";
type Tone = "success" | "info" | "warning" | "danger" | "neutral";
type ViewId = "overview" | "shift" | "check-in" | "visitor-register" | "expected-visitors" | "gate-passes" | "late-arrivals" | "early-departures" | "staff-movement" | "vehicle-log" | "deliveries" | "incidents" | "watchlist" | "frequent-visitors" | "lost-found" | "boarding-movement" | "transport-clearance" | "reports" | "notifications" | "settings";

type NavItem = {
  id: ViewId;
  label: string;
  icon: LucideIcon;
  group: string;
  desc: string;
};

type SecurityAppointmentDraft = {
  visitor_name: string;
  host_user_id: string;
  purpose: string;
  appointment_time: string;
};

type SecurityIncidentDraft = {
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  location: string;
};
type SecurityLostFoundItem = {
  id: string;
  item_name: string;
  description?: string | null;
  found_location?: string | null;
  found_at?: string | null;
  status: string;
  claimant_name?: string | null;
};
type SecurityBoardingMovement = {
  id: string;
  student_name: string;
  hostel?: string | null;
  leave_type: string;
  status: string;
  checked_out_at?: string | null;
  returned_at?: string | null;
};
type SecurityTransportTrip = {
  id: string;
  route_name?: string | null;
  vehicle_registration?: string | null;
  direction?: string | null;
  status: string;
  learner_count?: number | null;
};
type SecurityStaffMovement = {
  id: string;
  title?: string | null;
  message?: string | null;
  event_type?: string | null;
  entity_id?: string | null;
  created_at?: string | null;
  payload?: { staffId?: string; notes?: string; returned_at?: string } | null;
};
type SecurityVehicleLog = {
  id: string;
  title?: string | null;
  message?: string | null;
  created_at?: string | null;
  payload?: {
    vehicle_registration?: string;
    driver_name?: string | null;
    purpose?: string;
    exited_at?: string;
  } | null;
};
type SecurityDelivery = {
  id: string;
  title?: string | null;
  message?: string | null;
  created_at?: string | null;
  payload?: {
    delivery_type?: string;
    recipient?: string;
    sender?: string | null;
    collected_at?: string;
  } | null;
};
type SecurityLateArrival = {
  id: string;
  title?: string | null;
  message?: string | null;
  created_at?: string | null;
  payload?: {
    student_name?: string;
    reason?: string;
    action_taken?: string;
  } | null;
};
type SecurityEarlyDeparture = {
  id: string;
  title?: string | null;
  message?: string | null;
  created_at?: string | null;
  payload?: {
    student_name?: string;
    reason?: string;
    status?: string;
    returned_at?: string;
  } | null;
};
type SecurityWatchlistEntry = {
  id: string;
  title?: string | null;
  message?: string | null;
  created_at?: string | null;
  payload?: {
    subject?: string;
    subject_type?: string;
    instruction?: string;
    risk_level?: string;
    acknowledged_at?: string;
  } | null;
};
type SecurityNotification = {
  id: string;
  title?: string | null;
  message?: string | null;
  type?: string | null;
  priority?: string | null;
  created_at?: string | null;
  is_read?: boolean | null;
  read_at?: string | null;
};
type SecuritySearchResult = {
  id: string;
  source?: string | null;
  title?: string | null;
  message?: string | null;
  type?: string | null;
  created_at?: string | null;
};

const navItems: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, group: "Dashboard", desc: "Gate command center and live summary." },
  { id: "shift", label: "My Shift & Handover", icon: Clock, group: "Dashboard", desc: "Start and end shifts properly with accountability." },
  { id: "check-in", label: "Fast Visitor Check-In", icon: UserPlus, group: "Visitors", desc: "Fast visitor registration during rush hour." },
  { id: "visitor-register", label: "Visitor Register", icon: FileText, group: "Visitors", desc: "Full visitor log for the day." },
  { id: "expected-visitors", label: "Expected Visitors", icon: Calendar, group: "Visitors", desc: "Scheduled visitors by Admin/Secretary." },
  { id: "gate-passes", label: "Student Gate Passes", icon: Ticket, group: "Movement", desc: "Verify if student is allowed to leave or re-enter." },
  { id: "late-arrivals", label: "Late Arrivals", icon: ClockAlert, group: "Movement", desc: "Record students arriving late." },
  { id: "early-departures", label: "Early Departures", icon: LogOut, group: "Movement", desc: "Record students leaving before normal closing time." },
  { id: "staff-movement", label: "Staff Movement", icon: Users, group: "Movement", desc: "Track staff entry and exit." },
  { id: "vehicle-log", label: "Vehicle Log", icon: Car, group: "Logistics", desc: "Record vehicles entering and leaving." },
  { id: "deliveries", label: "Deliveries & Parcels", icon: Package, group: "Logistics", desc: "Track parcels, supplies, food, and exam materials." },
  { id: "incidents", label: "Incidents & Emergencies", icon: AlertTriangle, group: "Security", desc: "Record gate-related incidents." },
  { id: "watchlist", label: "Watchlist", icon: ShieldAlert, group: "Security", desc: "Warnings for blocked or suspicious persons/vehicles." },
  { id: "frequent-visitors", label: "Frequent Visitors", icon: UsersRound, group: "Security", desc: "Repeat visitors for quick check-in." },
  { id: "lost-found", label: "Lost & Found", icon: Search, group: "Security", desc: "Record lost items found at the gate." },
  { id: "boarding-movement", label: "Boarding Gate Movement", icon: Home, group: "Modules", desc: "Track boarders entering or leaving." },
  { id: "transport-clearance", label: "Transport Gate Clearance", icon: Bus, group: "Modules", desc: "Confirm bus departure/arrival." },
  { id: "reports", label: "Reports & Downloads", icon: PieChart, group: "System", desc: "Printable gate records and summaries." },
  { id: "notifications", label: "Notifications", icon: Bell, group: "System", desc: "Messages related to gate/security work." },
  { id: "settings", label: "Security Settings", icon: Settings, group: "System", desc: "Gate points and movement settings." }
];

const toneClasses: Record<Tone, { card: string; chip: string; dot: string; text: string }> = {
  success: {
    card: "border-emerald-200 bg-emerald-50 text-emerald-900",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
  },
  info: {
    card: "border-blue-200 bg-blue-50 text-blue-950",
    chip: "border-blue-200 bg-blue-50 text-blue-700",
    dot: "bg-blue-500",
    text: "text-blue-700",
  },
  warning: {
    card: "border-amber-200 bg-amber-50 text-amber-950",
    chip: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
    text: "text-amber-700",
  },
  danger: {
    card: "border-rose-200 bg-rose-50 text-rose-950",
    chip: "border-rose-200 bg-rose-50 text-rose-700",
    dot: "bg-rose-500",
    text: "text-rose-700",
  },
  neutral: {
    card: "border-slate-200 bg-white text-[#071D49]",
    chip: "border-slate-200 bg-slate-50 text-slate-700",
    dot: "bg-slate-400",
    text: "text-slate-600",
  },
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function securityActionSlug(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "") || "workflow.action";
}

async function persistSecurityWorkflowAction(title: string, body: string, tone: "success" | "info" | "warning" | "danger") {
  return requestDashboardApi("/api/admin-command/security-officer/actions", {
    method: "POST",
    body: {
      action: securityActionSlug(title),
      title,
      description: body,
      priority: tone === "danger" || tone === "warning" ? "high" : "normal",
      source: "security-officer-dashboard",
    },
  });
}

async function recordSecurityAction(title: string, body: string, tone: "success" | "info" | "warning" | "danger" = "info") {
  try {
    await persistSecurityWorkflowAction(title, body, tone);
  } catch (error) {
    toast.error("Security action was not saved", {
      description: error instanceof Error ? error.message : "The gate action could not be persisted for audit and dashboard follow-up.",
    });
    return false;
  }

  const notify = tone === "danger" ? toast.error : tone === "success" ? toast.success : toast.info;
  notify(title, { description: body });
  publishSchoolOperationalEvent({
    type: "security.workflow_action",
    module: "security",
    actorRole: "security_officer",
    title,
    body,
  });
  return true;
}

async function checkoutVisitorRecord(recordId: string, onSuccess?: () => void) {
  try {
    await requestDashboardApi(`/api/visitors/logs/${recordId}/checkout`, { method: "PATCH" });
    await recordSecurityAction("Visitor checked out", "The visitor record was closed for the current school gate register.", "success");
    onSuccess?.();
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Failed to check out visitor.");
  }
}

async function exportSecurityCsv(filename: string, title: string, rows: string[][] = []) {
  const persisted = await recordSecurityAction("Security export created", `${title} downloaded for the current school tenant.`, "success");
  if (!persisted) {
    return;
  }

  downloadCsvFile({
    filename,
    headers: ["Report", "School", "Generated At"],
    rows: rows.length ? rows : [[title, getCurrentSchoolId() || "current tenant", new Date().toISOString()]],
  });
}

function SecurityAppointmentModal({
  open,
  draft,
  submitting,
  onChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  draft: SecurityAppointmentDraft;
  submitting: boolean;
  onChange: (draft: SecurityAppointmentDraft) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const update = (field: keyof SecurityAppointmentDraft, value: string) => onChange({ ...draft, [field]: value });

  return (
    <Modal
      open={open}
      title="Add expected visitor"
      description="Schedule a visitor for the current school gate register. Security can check the visitor in from the expected visitors queue."
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" onClick={onClose} disabled={submitting} className="rounded-lg border border-[#D8E0EC] px-4 py-2 text-sm font-bold text-[#071D49] disabled:opacity-50">Cancel</button>
          <button type="button" onClick={onSubmit} disabled={submitting} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-50">{submitting ? "Scheduling..." : "Schedule Visitor"}</button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold text-[#071D49]">Visitor name
          <input value={draft.visitor_name} onChange={(event) => update("visitor_name", event.target.value)} className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" autoFocus />
        </label>
        <label className="text-sm font-bold text-[#071D49]">Host / office
          <input value={draft.host_user_id} onChange={(event) => update("host_user_id", event.target.value)} className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" placeholder="Principal's office" />
        </label>
        <label className="text-sm font-bold text-[#071D49] sm:col-span-2">Purpose
          <input value={draft.purpose} onChange={(event) => update("purpose", event.target.value)} className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" placeholder="Meeting, delivery, interview" />
        </label>
        <label className="text-sm font-bold text-[#071D49] sm:col-span-2">Expected date and time
          <input type="datetime-local" value={draft.appointment_time} onChange={(event) => update("appointment_time", event.target.value)} className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" />
        </label>
      </div>
    </Modal>
  );
}

function SecurityIncidentModal({
  open,
  draft,
  submitting,
  onChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  draft: SecurityIncidentDraft;
  submitting: boolean;
  onChange: (draft: SecurityIncidentDraft) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const update = (field: keyof SecurityIncidentDraft, value: string) => onChange({ ...draft, [field]: value });

  return (
    <Modal open={open} title="Report security incident" description="Create a school-scoped incident and notify the authorized leadership roles." onClose={onClose} size="lg" footer={
      <>
        <button type="button" onClick={onClose} disabled={submitting} className="rounded-lg border border-[#D8E0EC] px-4 py-2 text-sm font-bold text-[#071D49] disabled:opacity-50">Cancel</button>
        <button type="button" onClick={onSubmit} disabled={submitting} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{submitting ? "Reporting..." : "Report Incident"}</button>
      </>
    }>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold text-[#071D49] sm:col-span-2">Incident title
          <input value={draft.title} onChange={(event) => update("title", event.target.value)} className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" autoFocus />
        </label>
        <label className="text-sm font-bold text-[#071D49]">Severity
          <select value={draft.severity} onChange={(event) => update("severity", event.target.value)} className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm">
            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
          </select>
        </label>
        <label className="text-sm font-bold text-[#071D49]">Location
          <input value={draft.location} onChange={(event) => update("location", event.target.value)} className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" />
        </label>
        <label className="text-sm font-bold text-[#071D49] sm:col-span-2">Description
          <textarea value={draft.description} onChange={(event) => update("description", event.target.value)} className="mt-1 min-h-28 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" />
        </label>
      </div>
    </Modal>
  );
}

function StatusChip({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold whitespace-nowrap", toneClasses[tone].chip)}>
      <span className={cn("h-2 w-2 rounded-full shrink-0", toneClasses[tone].dot)} />
      {label}
    </span>
  );
}

function Panel({
  title,
  description,
  icon: Icon,
  children,
  actions,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#D8E0EC] bg-white p-5 shadow-[0_18px_50px_rgba(7,29,73,0.08)]">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          {Icon ? (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EEF5FF] text-[#1D4ED8]">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
          ) : null}
          <div>
            <h2 className="text-xl font-black tracking-[-0.01em] text-[#071D49]">{title}</h2>
            {description ? <p className="mt-1 text-sm leading-6 text-[#64748B]">{description}</p> : null}
          </div>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

// ----------------------------------------------------------------------
// WORKSPACE COMPONENTS
// ----------------------------------------------------------------------

function OverviewWorkspace({ onNavigate }: { onNavigate: (v: ViewId) => void }) {
  const { data: dashboard, isLoading } = useSchoolQuery<any>("/api/visitors/dashboard");

  return (
    <Panel title="Gate Command Center" description="Live summary of what is happening today." icon={LayoutDashboard} actions={
      <div className="flex gap-2">
        <button type="button" className="flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white" onClick={() => onNavigate("check-in")}>
          Check In Visitor
        </button>
      </div>
    }>
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-4 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 cursor-pointer hover:border-blue-300 transition" onClick={() => onNavigate("visitor-register")}>
          <div className="text-sm font-semibold text-[#64748B]">Visitors Inside</div>
          <div className="mt-1 text-2xl font-black text-emerald-600">{isLoading ? "-" : dashboard?.open_records ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 cursor-pointer hover:border-blue-300 transition" onClick={() => onNavigate("expected-visitors")}>
          <div className="text-sm font-semibold text-[#64748B]">Expected Today</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">5</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 cursor-pointer hover:border-blue-300 transition" onClick={() => onNavigate("gate-passes")}>
          <div className="text-sm font-semibold text-[#64748B]">Students Out on Pass</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">3</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 cursor-pointer hover:border-rose-300 transition" onClick={() => onNavigate("incidents")}>
          <div className="text-sm font-semibold text-rose-700">Open Incidents</div>
          <div className="mt-1 text-2xl font-black text-rose-700">1</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-[#D8E0EC] overflow-hidden">
            <div className="bg-[#F8FAFC] px-4 py-3 border-b border-[#D8E0EC] flex justify-between items-center">
              <h3 className="font-bold text-[#071D49]">Live Gate Queue</h3>
            </div>
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead>
                  <tr className="text-[#64748B] border-b border-[#D8E0EC]">
                    <th className="pb-2 font-semibold">Time</th>
                    <th className="pb-2 font-semibold">Person/Vehicle</th>
                    <th className="pb-2 font-semibold">Type</th>
                    <th className="pb-2 font-semibold">Purpose</th>
                    <th className="pb-2 font-semibold">Waiting For</th>
                    <th className="pb-2 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8E0EC]">
                  {dashboard?.records?.slice(0, 5).map((r: { id: string, created_at: string, visitor_name: string, purpose: string }) => (
                    <tr key={r.id}>
                      <td className="py-3 text-[#64748B]">{new Date(r.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                      <td className="py-3 font-medium text-[#071D49]">{r.visitor_name}</td>
                      <td className="py-3 text-[#64748B]">Visitor</td>
                      <td className="py-3 text-[#64748B]">{r.purpose || "-"}</td>
                      <td className="py-3"><StatusChip label="Inside" tone="warning" /></td>
                      <td className="py-3 text-right">
                        <button type="button" onClick={() => checkoutVisitorRecord(r.id)} className="text-blue-600 hover:underline font-semibold text-xs">Check Out</button>
                      </td>
                    </tr>
                  ))}
                  {!dashboard?.records?.length && !isLoading && (
                    <tr><td colSpan={6} className="py-3 text-center text-[#64748B]">No active queue</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-xl border border-rose-200 bg-rose-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-rose-200 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              <h3 className="font-bold text-rose-900">Alerts</h3>
            </div>
            <div className="p-4 space-y-3 text-sm text-rose-800">
              <div className="flex justify-between items-start">
                <span><strong>Visitor Overstayed</strong> (Jane Doe)</span>
                <button type="button" className="text-rose-900 underline font-semibold text-xs" onClick={() => onNavigate("visitor-register")}>Review</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function ShiftWorkspace() {
  const [isSubmittingStart, setIsSubmittingStart] = useState(false);
  const [isSubmittingEnd, setIsSubmittingEnd] = useState(false);
  const [shiftDraft, setShiftDraft] = useState({ gate_point: "Main Gate", shift_name: "Morning", handover_notes: "All clear" });
  const { data: visitorDashboard } = useSchoolQuery<any>("/api/visitors/dashboard");
  const { data: vehicleLogs = [] } = useSchoolQuery<SecurityVehicleLog[]>("/api/admin-command/security-officer/vehicle-log");
  const { data: deliveries = [] } = useSchoolQuery<SecurityDelivery[]>("/api/admin-command/security-officer/deliveries");

  const handleStartSecurityShift = async () => {
    setIsSubmittingStart(true);
    try {
      await requestDashboardApi("/api/admin-command/security-officer/shift/start", {
        method: "POST",
        body: shiftDraft,
      });
      toast.success("Security shift started and logged.");
      publishSchoolOperationalEvent({
        type: "security.shift_started",
        module: "security",
        actorRole: "security_officer",
        title: "Security shift started",
        body: `${shiftDraft.shift_name} started at ${shiftDraft.gate_point}.`,
      });
    } catch (error) {
      toast.error("Security shift was not started", {
        description: error instanceof Error ? error.message : "The shift start could not be persisted.",
      });
    } finally {
      setIsSubmittingStart(false);
    }
  };

  const handleEndSecurityShift = async () => {
    setIsSubmittingEnd(true);
    try {
      await requestDashboardApi("/api/admin-command/security-officer/shift/end", {
        method: "POST",
        body: shiftDraft,
      });
      toast.success("Security shift ended and handover recorded.");
      publishSchoolOperationalEvent({
        type: "security.shift_ended",
        module: "security",
        actorRole: "security_officer",
        title: "Security shift ended",
        body: `${shiftDraft.gate_point} handover: ${shiftDraft.handover_notes}.`,
      });
    } catch (error) {
      toast.error("Security shift was not ended", {
        description: error instanceof Error ? error.message : "The shift handover could not be persisted.",
      });
    } finally {
      setIsSubmittingEnd(false);
    }
  };

  const vehiclesInside = vehicleLogs.filter((log) => !log.payload?.exited_at).length;
  const pendingDeliveries = deliveries.filter((delivery) => !delivery.payload?.collected_at).length;

  return (
    <Panel title="My Shift & Handover" description="Start and end shifts properly with accountability." icon={Clock} actions={
      <div className="flex gap-2">
        <button type="button" onClick={handleStartSecurityShift} disabled={isSubmittingStart} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{isSubmittingStart ? "Starting..." : "Start Shift"}</button>
        <button type="button" onClick={handleEndSecurityShift} disabled={isSubmittingEnd} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{isSubmittingEnd ? "Ending..." : "End Shift"}</button>
      </div>
    }>
      <div className="mb-4 grid gap-3 rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 md:grid-cols-3">
        <label className="text-sm font-bold text-[#071D49]">Gate point
          <input value={shiftDraft.gate_point} onChange={(event) => setShiftDraft({ ...shiftDraft, gate_point: event.target.value })} className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" />
        </label>
        <label className="text-sm font-bold text-[#071D49]">Shift name
          <input value={shiftDraft.shift_name} onChange={(event) => setShiftDraft({ ...shiftDraft, shift_name: event.target.value })} className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" />
        </label>
        <label className="text-sm font-bold text-[#071D49]">Handover notes
          <input value={shiftDraft.handover_notes} onChange={(event) => setShiftDraft({ ...shiftDraft, handover_notes: event.target.value })} className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Current Shift</div>
          <div className="mt-1 text-xl font-black text-[#071D49]">{shiftDraft.shift_name} ({shiftDraft.gate_point})</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Visitors Still Inside</div>
          <div className="mt-1 text-2xl font-black text-rose-600">{visitorDashboard?.open_records ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Vehicles Still Inside</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">{vehiclesInside}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Pending Parcels</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">{pendingDeliveries}</div>
        </div>
      </div>
    </Panel>
  );
}

function CheckInWorkspace({ onNavigate }: { onNavigate: (view: ViewId) => void }) {
  const mutation = useSchoolMutation("/api/visitors/logs");
  const { data: dashboard, refetch } = useSchoolQuery<any>("/api/visitors/dashboard");
  const visitorSearchInputRef = useRef<HTMLInputElement | null>(null);
  const [formData, setFormData] = useState({ visitor_name: "", phone_number: "", purpose: "", host_user_id: "" });

  const handleFocusFrequentVisitorSearch = () => {
    visitorSearchInputRef.current?.focus();
    toast.info("Type a frequent visitor name or phone number, then complete check-in from the matched details.");
  };

  const handleUseExpectedVisitorQueue = () => {
    onNavigate("expected-visitors");
    toast.info("Opened expected visitors queue for host-approved check-in.");
  };

  const handleCheckIn = async () => {
    if (!formData.visitor_name) return;
    await mutation.mutateAsync({
      visitor_name: formData.visitor_name,
      purpose: formData.purpose,
      host_user_id: formData.host_user_id,
      phone_number: formData.phone_number,
      status: "active"
    });
    setFormData({ visitor_name: "", phone_number: "", purpose: "", host_user_id: "" });
    refetch();
  };

  const handleCheckOut = async (recordId: string) => {
    await checkoutVisitorRecord(recordId, () => refetch());
  };

  return (
    <Panel title="Fast Visitor Check-In" description="Fast visitor registration during morning rush, parent visits, deliveries." icon={UserPlus} actions={
      <div className="flex gap-2">
        <button type="button" onClick={handleFocusFrequentVisitorSearch} className="rounded-lg border border-[#D8E0EC] px-4 py-2 text-sm font-bold text-[#071D49]">Search Frequent Visitor</button>
        <button type="button" onClick={handleUseExpectedVisitorQueue} className="rounded-lg border border-[#D8E0EC] px-4 py-2 text-sm font-bold text-[#071D49]">Use Expected Visitor</button>
      </div>
    }>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-xl border border-[#D8E0EC] p-4 bg-[#F8FAFC]">
            <h3 className="font-bold text-[#071D49] mb-3">Visitor Details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <input ref={visitorSearchInputRef} type="text" placeholder="Full Name" value={formData.visitor_name} onChange={e => setFormData(f => ({ ...f, visitor_name: e.target.value }))} className="rounded-lg border border-[#D8E0EC] p-2 text-sm" />
              <input type="text" placeholder="Phone Number" value={formData.phone_number} onChange={e => setFormData(f => ({ ...f, phone_number: e.target.value }))} className="rounded-lg border border-[#D8E0EC] p-2 text-sm" />
              <input type="text" placeholder="Purpose of Visit" value={formData.purpose} onChange={e => setFormData(f => ({ ...f, purpose: e.target.value }))} className="rounded-lg border border-[#D8E0EC] p-2 text-sm sm:col-span-2" />
              <input type="text" placeholder="Person/Office to see" value={formData.host_user_id} onChange={e => setFormData(f => ({ ...f, host_user_id: e.target.value }))} className="rounded-lg border border-[#D8E0EC] p-2 text-sm sm:col-span-2" />
              <div className="flex gap-2 sm:col-span-2 pt-2">
                <button type="button" onClick={handleCheckIn} disabled={mutation.isPending} className="flex-1 rounded-lg bg-[#071D49] py-2 text-sm font-black text-white">
                  {mutation.isPending ? "Saving..." : "Check In & Print Pass"}
                </button>
                <button type="button" onClick={handleCheckIn} disabled={mutation.isPending} className="flex-1 rounded-lg border border-[#D8E0EC] bg-white py-2 text-sm font-bold text-[#071D49] disabled:opacity-50">Save Without Printing</button>
              </div>
            </div>
          </div>
        </div>
        <div>
          <h3 className="font-bold text-[#071D49] mb-3">Recent Check-Ins</h3>
          <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-[#F8FAFC] text-[#071D49]">
                <tr>
                  <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Time In</th>
                  <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Name</th>
                  <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8E0EC]">
                {dashboard?.records?.slice(0, 5).map((r: { id: string, created_at: string, visitor_name: string, status: string }) => (
                  <tr key={r.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 text-[#64748B]">{new Date(r.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                    <td className="px-4 py-3 font-semibold text-[#071D49]">{r.visitor_name}</td>
                    <td className="px-4 py-3 text-right">
                      {r.status === "active" ? (
                        <button type="button" onClick={() => handleCheckOut(r.id)} className="text-blue-600 hover:underline font-semibold text-xs">Check Out</button>
                      ) : (
                        <span className="text-[#64748B] text-xs">Checked Out</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function VisitorRegisterWorkspace() {
  const { data: dashboard, isLoading } = useSchoolQuery<any>("/api/visitors/dashboard");

  return (
    <Panel title="Visitor Register" description="Full visitor log for the day, week, month." icon={FileText} actions={
      <div className="flex gap-2">
        <button type="button" onClick={() => exportSecurityCsv("visitor-register.csv", "Visitor register")} className="rounded-lg border border-[#D8E0EC] px-4 py-2 text-sm font-bold text-[#071D49]">Export Filtered</button>
      </div>
    }>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#64748B]" />
          <input type="text" placeholder="Search by name, phone, ID, vehicle reg..." className="w-full rounded-xl border border-[#D8E0EC] py-2 pl-9 pr-3 text-sm focus:border-[#071D49] focus:outline-none focus:ring-1 focus:ring-[#071D49]" />
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Time In</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Name</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Purpose</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">To See</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {dashboard?.records?.map((r: { id: string, created_at: string, visitor_name: string, purpose: string, host_user_id: string, status: string }) => (
              <tr key={r.id} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 text-[#64748B]">{new Date(r.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                <td className="px-4 py-3 font-semibold text-[#071D49]">{r.visitor_name}</td>
                <td className="px-4 py-3 text-[#64748B]">{r.purpose || "-"}</td>
                <td className="px-4 py-3 text-[#64748B]">{r.host_user_id || "-"}</td>
                <td className="px-4 py-3">
                  <StatusChip label={r.status === "active" ? "Inside" : "Checked Out"} tone={r.status === "active" ? "warning" : "success"} />
                </td>
                <td className="px-4 py-3 text-right">
                  {r.status === "active" ? (
                    <button type="button" onClick={() => checkoutVisitorRecord(r.id)} className="text-blue-600 hover:underline font-semibold text-xs mr-3">Check Out</button>
                  ) : (
                    <span className="text-xs text-[#64748B] mr-3">Done</span>
                  )}
                  <button type="button" aria-label={`View ${r.visitor_name} visitor details`} onClick={() => {
                    openPrintDocument({
                      eyebrow: "Security visitor record",
                      title: r.visitor_name,
                      subtitle: r.status === "active" ? "Inside school" : "Checked out",
                      rows: [
                        { label: "Time in", value: new Date(r.created_at).toLocaleString() },
                        { label: "Purpose", value: r.purpose || "-" },
                        { label: "Host", value: r.host_user_id || "-" },
                        { label: "Status", value: r.status },
                      ],
                      footer: "Visitor detail preview generated from the current school gate register.",
                    });
                    void recordSecurityAction("Visitor details preview generated", `${r.visitor_name} visitor detail preview generated for gate review and print/export.`, "info");
                  }} className="p-1 text-[#64748B] hover:bg-[#D8E0EC] rounded"><MoreHorizontal className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {!dashboard?.records?.length && !isLoading && (
              <tr><td colSpan={6} className="py-3 text-center text-[#64748B]">No visitor records found</td></tr>
            )}
            {isLoading && (
              <tr><td colSpan={6} className="py-3 text-center text-[#64748B]">Loading register...</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function ExpectedVisitorsWorkspace() {
  const { data: appointments, isLoading, refetch } = useSchoolQuery<any>("/api/visitors/appointments");
  const appointmentMutation = useSchoolMutation("/api/visitors/appointments");
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [appointmentDraft, setAppointmentDraft] = useState<SecurityAppointmentDraft>({
    visitor_name: "",
    host_user_id: "",
    purpose: "",
    appointment_time: "",
  });

  const submitAppointment = async () => {
    if (!appointmentDraft.visitor_name.trim() || !appointmentDraft.host_user_id.trim() || !appointmentDraft.purpose.trim() || !appointmentDraft.appointment_time) {
      toast.error("Complete the visitor, host, purpose, and expected time.");
      return;
    }
    try {
      await appointmentMutation.mutateAsync({
        ...appointmentDraft,
        visitor_name: appointmentDraft.visitor_name.trim(),
        host_user_id: appointmentDraft.host_user_id.trim(),
        purpose: appointmentDraft.purpose.trim(),
        appointment_time: new Date(appointmentDraft.appointment_time).toISOString(),
      });
      toast.success("Expected visitor scheduled");
      setShowAppointmentModal(false);
      setAppointmentDraft({ visitor_name: "", host_user_id: "", purpose: "", appointment_time: "" });
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The expected visitor could not be scheduled.");
    }
  };

  const checkInExpectedVisitor = async (appointmentId: string) => {
    setCheckingInId(appointmentId);
    try {
      await requestDashboardApi(`/api/admin-command/security-officer/expected-visitors/${appointmentId}/check-in`, { method: "POST" });
      toast.success("Expected visitor checked in");
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The expected visitor could not be checked in.");
    } finally {
      setCheckingInId(null);
    }
  };

  return (
    <>
      <Panel title="Expected Visitors" description="Visitors scheduled by Admin or Secretary." icon={Calendar} actions={
        <button type="button" onClick={() => setShowAppointmentModal(true)} className="rounded-lg border border-[#D8E0EC] px-4 py-2 text-sm font-bold text-[#071D49]">Add Expected Visitor</button>
      }>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Expected Time</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Name</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Host/Office</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">Loading expected visitors...</td></tr>
            ) : !appointments?.length ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">No expected visitors.</td></tr>
            ) : appointments.map((appt: any) => (
              <tr key={appt.id} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 text-[#64748B]">{new Date(appt.appointment_time).toLocaleString()}</td>
                <td className="px-4 py-3 font-semibold text-[#071D49]">{appt.visitor_name || "Unknown"}</td>
                <td className="px-4 py-3 text-[#64748B]">{appt.host_user_id || "-"}</td>
                <td className="px-4 py-3"><StatusChip label={appt.status} tone={appt.status === "pending" ? "neutral" : "success"} /></td>
                <td className="px-4 py-3 text-right">
                  {(appt.status === "pending" || appt.status === "scheduled") && (
                    <button type="button" onClick={() => checkInExpectedVisitor(appt.id)} disabled={checkingInId === appt.id} className="text-emerald-600 hover:underline font-semibold text-xs mr-3 disabled:opacity-50">{checkingInId === appt.id ? "Checking In..." : "Check In Now"}</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </Panel>
      <SecurityAppointmentModal
        open={showAppointmentModal}
        draft={appointmentDraft}
        submitting={appointmentMutation.isPending}
        onChange={setAppointmentDraft}
        onClose={() => setShowAppointmentModal(false)}
        onSubmit={submitAppointment}
      />
    </>
  );
}

function GatePassesWorkspace() {
  const { data: exits, isLoading, refetch } = useSchoolQuery<any>("/api/visitors/student-exits");
  const [busyPassId, setBusyPassId] = useState<string | null>(null);

  const updateExitPass = async (exitId: string, action: "verify" | "return") => {
    setBusyPassId(exitId);
    try {
      const endpoint = action === "verify"
        ? `/api/admin-command/security-officer/student-exit-passes/${exitId}/verify`
        : `/api/admin-command/security-officer/student-exit-passes/${exitId}/return`;
      await requestDashboardApi(endpoint, { method: "POST" });
      toast.success(action === "verify" ? "Gate pass verified" : "Student return recorded");
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The gate pass could not be updated.");
    } finally {
      setBusyPassId(null);
    }
  };

  return (
    <Panel title="Student Gate Passes" description="Verify approved student gate passes." icon={Ticket} actions={
      <button type="button" onClick={() => exportSecurityCsv("student-gate-passes.csv", "Student gate passes")} className="rounded-lg border border-[#D8E0EC] px-4 py-2 text-sm font-bold text-[#071D49]">Export List</button>
    }>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Student</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Exit Time</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Reason</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">Loading passes...</td></tr>
            ) : !exits?.length ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">No gate passes.</td></tr>
            ) : exits.map((exit: any) => (
              <tr key={exit.id} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 font-semibold text-[#071D49]">{exit.student_id?.substring(0,8) || "Unknown"}</td>
                <td className="px-4 py-3 text-[#64748B]">{new Date(exit.exit_time).toLocaleString()}</td>
                <td className="px-4 py-3 text-[#64748B]">{exit.reason || "-"}</td>
                <td className="px-4 py-3"><StatusChip label={exit.status} tone={exit.status === 'out' ? 'warning' : 'success'} /></td>
                <td className="px-4 py-3 text-right">
                  {exit.status !== "returned" && (
                    <button type="button" onClick={() => updateExitPass(exit.id, "verify")} disabled={busyPassId === exit.id} className="text-blue-600 hover:underline font-semibold text-xs mr-3 disabled:opacity-50">Verify Pass</button>
                  )}
                  {exit.status === 'out' && (
                    <button type="button" onClick={() => updateExitPass(exit.id, "return")} disabled={busyPassId === exit.id} className="text-emerald-600 hover:underline font-semibold text-xs disabled:opacity-50">{busyPassId === exit.id ? "Saving..." : "Record Return"}</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function LateArrivalsWorkspace() {
  const { data: arrivals = [], isLoading, refetch } = useSchoolQuery<SecurityLateArrival[]>("/api/admin-command/security-officer/late-arrivals");
  const [draft, setDraft] = useState({ student_name: "", reason: "Transport Delay", action_taken: "Allowed to Class" });
  const [savingAction, setSavingAction] = useState<string | null>(null);

  const handleRecordLateArrival = async () => {
    if (!draft.student_name.trim()) {
      toast.error("Student name is required before recording a late arrival.");
      return;
    }
    if (!draft.reason.trim()) {
      toast.error("Late arrival reason is required.");
      return;
    }
    setSavingAction("record");
    try {
      await requestDashboardApi("/api/admin-command/security-officer/late-arrivals", {
        method: "POST",
        body: draft,
      });
      toast.success("Late arrival recorded and routed to school leadership.");
      setDraft({ student_name: "", reason: "Transport Delay", action_taken: "Allowed to Class" });
      await refetch();
      publishSchoolOperationalEvent({
        type: "security.late_arrival_recorded",
        module: "security",
        actorRole: "security_officer",
        title: "Late arrival recorded",
        body: `${draft.student_name} arrived late. Reason: ${draft.reason}.`,
      });
    } catch (error) {
      toast.error("Late arrival was not recorded", {
        description: error instanceof Error ? error.message : "The late-arrival record could not be persisted.",
      });
    } finally {
      setSavingAction(null);
    }
  };

  const handleNotifyLateArrivalParent = async (arrival: SecurityLateArrival) => {
    setSavingAction(`notify-${arrival.id}`);
    try {
      await requestDashboardApi(`/api/admin-command/security-officer/late-arrivals/${arrival.id}/notify-parent`, { method: "POST" });
      toast.success("Parent notice queued for the late-arrival record.");
      await refetch();
      publishSchoolOperationalEvent({
        type: "security.late_arrival_parent_notified",
        module: "security",
        actorRole: "security_officer",
        title: "Late arrival parent notice queued",
        body: `Parent notice queued for ${arrival.payload?.student_name || "the late-arrival record"}.`,
      });
    } catch (error) {
      toast.error("Parent notice was not queued", {
        description: error instanceof Error ? error.message : "The notification could not be created.",
      });
    } finally {
      setSavingAction(null);
    }
  };

  return (
    <Panel title="Late Arrivals" description="Records students who arrive late to school." icon={ClockAlert} actions={
      <button type="button" onClick={handleRecordLateArrival} disabled={savingAction === "record"} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-50">
        {savingAction === "record" ? "Recording..." : "Record Late Arrival"}
      </button>
    }>
      <div className="mb-4 grid gap-3 rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 md:grid-cols-3">
        <label className="text-sm font-bold text-[#071D49]">Student name
          <input value={draft.student_name} onChange={(event) => setDraft({ ...draft, student_name: event.target.value })} className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" placeholder="Student full name" />
        </label>
        <label className="text-sm font-bold text-[#071D49]">Reason
          <input value={draft.reason} onChange={(event) => setDraft({ ...draft, reason: event.target.value })} className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" placeholder="Transport delay, illness..." />
        </label>
        <label className="text-sm font-bold text-[#071D49]">Action taken
          <input value={draft.action_taken} onChange={(event) => setDraft({ ...draft, action_taken: event.target.value })} className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" placeholder="Allowed to class" />
        </label>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Time</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Student</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Reason</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Action Taken</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">Loading late-arrival records...</td></tr>
            ) : arrivals.length ? arrivals.map((arrival) => (
              <tr key={arrival.id} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 text-[#64748B]">{arrival.created_at ? new Date(arrival.created_at).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }) : "Recorded"}</td>
                <td className="px-4 py-3 font-semibold text-[#071D49]">{arrival.payload?.student_name || arrival.title || "Student"}</td>
                <td className="px-4 py-3 text-[#64748B]">{arrival.payload?.reason || "Reason not recorded"}</td>
                <td className="px-4 py-3 text-[#64748B]">{arrival.payload?.action_taken || "Allowed to Class"}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" onClick={() => handleNotifyLateArrivalParent(arrival)} disabled={savingAction === `notify-${arrival.id}`} className="text-blue-600 hover:underline font-semibold text-xs disabled:cursor-not-allowed disabled:opacity-50">{savingAction === `notify-${arrival.id}` ? "Queuing..." : "Notify Parent"}</button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">No late arrivals recorded today. Add a student name, reason, and action taken when a learner arrives after reporting time.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function EarlyDeparturesWorkspace() {
  const { data: departures = [], isLoading, refetch } = useSchoolQuery<SecurityEarlyDeparture[]>("/api/admin-command/security-officer/early-departures");
  const [draft, setDraft] = useState({ student_name: "", reason: "Medical", status: "Awaiting Return" });
  const [savingAction, setSavingAction] = useState<string | null>(null);

  const handleRecordEarlyDeparture = async () => {
    if (!draft.student_name.trim()) {
      toast.error("Student name is required before recording an early departure.");
      return;
    }
    if (!draft.reason.trim()) {
      toast.error("Early departure reason is required.");
      return;
    }
    setSavingAction("record");
    try {
      await requestDashboardApi("/api/admin-command/security-officer/early-departures", {
        method: "POST",
        body: draft,
      });
      toast.success("Early departure recorded and routed to authorized roles.");
      setDraft({ student_name: "", reason: "Medical", status: "Awaiting Return" });
      await refetch();
      publishSchoolOperationalEvent({
        type: "security.early_departure_recorded",
        module: "security",
        actorRole: "security_officer",
        title: "Early departure recorded",
        body: `${draft.student_name} left school early. Reason: ${draft.reason}.`,
      });
    } catch (error) {
      toast.error("Early departure was not recorded", {
        description: error instanceof Error ? error.message : "The early-departure record could not be persisted.",
      });
    } finally {
      setSavingAction(null);
    }
  };

  const handleRecordEarlyDepartureReturn = async (departure: SecurityEarlyDeparture) => {
    setSavingAction(`return-${departure.id}`);
    try {
      await requestDashboardApi(`/api/admin-command/security-officer/early-departures/${departure.id}/return`, { method: "POST" });
      toast.success("Early departure return recorded.");
      await refetch();
      publishSchoolOperationalEvent({
        type: "security.early_departure_return_recorded",
        module: "security",
        actorRole: "security_officer",
        title: "Early departure return recorded",
        body: `${departure.payload?.student_name || "A student"} returned after an early departure.`,
      });
    } catch (error) {
      toast.error("Early departure return was not recorded", {
        description: error instanceof Error ? error.message : "The return could not be persisted.",
      });
    } finally {
      setSavingAction(null);
    }
  };

  return (
    <Panel title="Early Departures" description="Records students leaving before normal closing time." icon={LogOut} actions={
      <button type="button" onClick={handleRecordEarlyDeparture} disabled={savingAction === "record"} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-50">
        {savingAction === "record" ? "Recording..." : "Record Early Departure"}
      </button>
    }>
      <div className="mb-4 grid gap-3 rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 md:grid-cols-3">
        <label className="text-sm font-bold text-[#071D49]">Student name
          <input value={draft.student_name} onChange={(event) => setDraft({ ...draft, student_name: event.target.value })} className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" placeholder="Student full name" />
        </label>
        <label className="text-sm font-bold text-[#071D49]">Reason
          <input value={draft.reason} onChange={(event) => setDraft({ ...draft, reason: event.target.value })} className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" placeholder="Medical, parent pickup..." />
        </label>
        <label className="text-sm font-bold text-[#071D49]">Status
          <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })} className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm">
            <option value="Awaiting Return">Awaiting Return</option>
            <option value="Left With Parent">Left With Parent</option>
            <option value="Approved Exit">Approved Exit</option>
          </select>
        </label>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Time Out</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Student</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Reason</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">Loading early-departure records...</td></tr>
            ) : departures.length ? departures.map((departure) => {
              const returned = Boolean(departure.payload?.returned_at);
              const status = returned ? "Returned" : departure.payload?.status || "Awaiting Return";
              return (
                <tr key={departure.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 text-[#64748B]">{departure.created_at ? new Date(departure.created_at).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }) : "Recorded"}</td>
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{departure.payload?.student_name || departure.title || "Student"}</td>
                  <td className="px-4 py-3 text-[#64748B]">{departure.payload?.reason || "Reason not recorded"}</td>
                  <td className="px-4 py-3"><StatusChip label={status} tone={returned ? "success" : "warning"} /></td>
                  <td className="px-4 py-3 text-right">
                    {!returned ? (
                      <button type="button" onClick={() => handleRecordEarlyDepartureReturn(departure)} disabled={savingAction === `return-${departure.id}`} className="text-emerald-600 hover:underline font-semibold text-xs disabled:cursor-not-allowed disabled:opacity-50">{savingAction === `return-${departure.id}` ? "Saving..." : "Record Return"}</button>
                    ) : (
                      <span className="text-xs font-semibold text-[#64748B]">Closed</span>
                    )}
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">No early departures recorded. Record a student, reason, and status when a learner leaves before normal closing time.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function StaffMovementWorkspace() {
  const [isSubmittingEntry, setIsSubmittingEntry] = useState(false);
  const [isSubmittingExit, setIsSubmittingExit] = useState(false);
  const [returningId, setReturningId] = useState<string | null>(null);
  const [staffDraft, setStaffDraft] = useState({ staffId: "", notes: "" });
  const { data: movements = [], isLoading, refetch } = useSchoolQuery<SecurityStaffMovement[]>("/api/admin-command/security-officer/staff-movement");

  const handleRecordStaffEntry = async () => {
    if (!staffDraft.staffId.trim()) {
      toast.error("Staff member name or ID is required.");
      return;
    }
    setIsSubmittingEntry(true);
    try {
      await requestDashboardApi("/api/admin-command/security-officer/staff-movement/entry", {
        method: "POST",
        body: staffDraft,
      });
      toast.success("Staff entry recorded and routed.");
      setStaffDraft({ staffId: "", notes: "" });
      await refetch();
      publishSchoolOperationalEvent({
        type: "security.staff_entry_recorded",
        module: "security",
        actorRole: "security_officer",
        title: "Staff entry recorded",
        body: `${staffDraft.staffId} entered through the gate.`,
      });
    } catch (error) {
      toast.error("Staff entry was not recorded", {
        description: error instanceof Error ? error.message : "The staff entry could not be persisted.",
      });
    } finally {
      setIsSubmittingEntry(false);
    }
  };

  const handleRecordStaffExit = async () => {
    if (!staffDraft.staffId.trim()) {
      toast.error("Staff member name or ID is required.");
      return;
    }
    setIsSubmittingExit(true);
    try {
      await requestDashboardApi("/api/admin-command/security-officer/staff-movement/departure", {
        method: "POST",
        body: staffDraft,
      });
      toast.success("Staff exit recorded and return tracking opened.");
      setStaffDraft({ staffId: "", notes: "" });
      await refetch();
      publishSchoolOperationalEvent({
        type: "security.staff_exit_recorded",
        module: "security",
        actorRole: "security_officer",
        title: "Staff exit recorded",
        body: `${staffDraft.staffId} exited through the gate.`,
      });
    } catch (error) {
      toast.error("Staff exit was not recorded", {
        description: error instanceof Error ? error.message : "The staff exit could not be persisted.",
      });
    } finally {
      setIsSubmittingExit(false);
    }
  };

  const handleStaffReturn = async (movement: SecurityStaffMovement) => {
    setReturningId(movement.id);
    try {
      await requestDashboardApi(`/api/admin-command/security-officer/staff-movement/${movement.id}/return`, { method: "POST" });
      toast.success("Staff return recorded.");
      await refetch();
      publishSchoolOperationalEvent({
        type: "security.staff_return_recorded",
        module: "security",
        actorRole: "security_officer",
        title: "Staff return recorded",
        body: `${movement.title || movement.entity_id || "Staff movement"} was closed at the gate.`,
      });
    } catch (error) {
      toast.error("Staff return was not recorded", {
        description: error instanceof Error ? error.message : "The staff movement could not be updated.",
      });
    } finally {
      setReturningId(null);
    }
  };

  return (
    <Panel title="Staff Movement" description="Tracks staff entry and exit." icon={Users} actions={
      <div className="flex gap-2">
        <button type="button" onClick={handleRecordStaffEntry} disabled={isSubmittingEntry} className="rounded-lg border border-[#D8E0EC] px-4 py-2 text-sm font-bold text-[#071D49] disabled:opacity-50">
          {isSubmittingEntry ? "Recording..." : "Record Entry"}
        </button>
        <button type="button" onClick={handleRecordStaffExit} disabled={isSubmittingExit} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-50">
          {isSubmittingExit ? "Recording..." : "Record Exit"}
        </button>
      </div>
    }>
      <div className="mb-4 grid gap-3 rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 md:grid-cols-2">
        <label className="text-sm font-bold text-[#071D49]">Staff member
          <input value={staffDraft.staffId} onChange={(event) => setStaffDraft({ ...staffDraft, staffId: event.target.value })} className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" placeholder="Name, payroll number, or staff ID" />
        </label>
        <label className="text-sm font-bold text-[#071D49]">Notes
          <input value={staffDraft.notes} onChange={(event) => setStaffDraft({ ...staffDraft, notes: event.target.value })} className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" placeholder="Reason or destination" />
        </label>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Time</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Staff Name</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Type</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">Loading staff movement records...</td></tr>
            ) : movements.length ? movements.map((movement) => (
              <tr key={movement.id} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 text-[#64748B]">{movement.created_at ? new Date(movement.created_at).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }) : "Today"}</td>
                <td className="px-4 py-3 font-semibold text-[#071D49]">{movement.payload?.staffId || movement.entity_id || movement.title || "Staff member"}</td>
                <td className="px-4 py-3 text-[#64748B]">{movement.event_type === "staff.entry_logged" ? "Entry" : "Exit"}</td>
                <td className="px-4 py-3"><StatusChip label={movement.event_type === "staff.entry_logged" ? "Entered" : movement.payload?.returned_at ? "Returned" : "Out"} tone={movement.event_type === "staff.entry_logged" || movement.payload?.returned_at ? "success" : "warning"} /></td>
                <td className="px-4 py-3 text-right">
                  {movement.event_type === "staff.entry_logged" || movement.payload?.returned_at ? (
                    <span className="text-xs font-semibold text-[#64748B]">Closed</span>
                  ) : (
                    <button type="button" onClick={() => handleStaffReturn(movement)} disabled={returningId === movement.id} className="text-emerald-600 hover:underline font-semibold text-xs disabled:cursor-not-allowed disabled:opacity-50">{returningId === movement.id ? "Saving..." : "Record Return"}</button>
                  )}
                </td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">No open staff movements. Record a staff exit to track the return at the gate.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function VehicleLogWorkspace() {
  const { data: logs = [], isLoading, refetch } = useSchoolQuery<SecurityVehicleLog[]>("/api/admin-command/security-officer/vehicle-log");
  const [draft, setDraft] = useState({ vehicle_registration: "", driver_name: "", purpose: "Delivery" });
  const [savingAction, setSavingAction] = useState<string | null>(null);

  const handleVehicleEntry = async () => {
    if (!draft.vehicle_registration.trim()) {
      toast.error("Vehicle registration is required.");
      return;
    }
    setSavingAction("entry");
    try {
      await requestDashboardApi("/api/admin-command/security-officer/vehicle-log", {
        method: "POST",
        body: draft,
      });
      toast.success("Vehicle entry recorded.");
      setDraft({ vehicle_registration: "", driver_name: "", purpose: "Delivery" });
      await refetch();
      publishSchoolOperationalEvent({
        type: "security.vehicle_entry_recorded",
        module: "security",
        actorRole: "security_officer",
        title: "Vehicle entry recorded",
        body: "A vehicle was logged at the school gate.",
      });
    } catch (error) {
      toast.error("Vehicle entry was not recorded", {
        description: error instanceof Error ? error.message : "The vehicle log could not be saved.",
      });
    } finally {
      setSavingAction(null);
    }
  };

  const handleVehicleExit = async (log: SecurityVehicleLog) => {
    setSavingAction(`exit-${log.id}`);
    try {
      await requestDashboardApi(`/api/admin-command/security-officer/vehicle-log/${log.id}/exit`, { method: "POST" });
      toast.success(`${log.payload?.vehicle_registration || "Vehicle"} exit recorded.`);
      await refetch();
      publishSchoolOperationalEvent({
        type: "security.vehicle_exit_recorded",
        module: "security",
        actorRole: "security_officer",
        title: "Vehicle exit recorded",
        body: `${log.payload?.vehicle_registration || "A vehicle"} exited the school gate.`,
      });
    } catch (error) {
      toast.error("Vehicle exit was not recorded", {
        description: error instanceof Error ? error.message : "The vehicle log could not be closed.",
      });
    } finally {
      setSavingAction(null);
    }
  };

  return (
    <Panel title="Vehicle Log" description="Records vehicles entering and leaving school compound." icon={Car} actions={
      <button type="button" onClick={handleVehicleEntry} disabled={savingAction === "entry"} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-50">
        {savingAction === "entry" ? "Recording..." : "Record Vehicle Entry"}
      </button>
    }>
      <div className="mb-4 grid gap-3 rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 sm:grid-cols-3">
        <input value={draft.vehicle_registration} onChange={(event) => setDraft((current) => ({ ...current, vehicle_registration: event.target.value }))} placeholder="Registration number" className="rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" />
        <input value={draft.driver_name} onChange={(event) => setDraft((current) => ({ ...current, driver_name: event.target.value }))} placeholder="Driver / contact" className="rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" />
        <input value={draft.purpose} onChange={(event) => setDraft((current) => ({ ...current, purpose: event.target.value }))} placeholder="Purpose / type" className="rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Time In</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Reg No.</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Type</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">Loading vehicle logs...</td></tr>
            ) : logs.length ? logs.map((log) => (
              <tr key={log.id} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 text-[#64748B]">{log.created_at ? new Date(log.created_at).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }) : "Today"}</td>
                <td className="px-4 py-3 font-semibold text-[#071D49]">{log.payload?.vehicle_registration || log.title || "Vehicle"}</td>
                <td className="px-4 py-3 text-[#64748B]">{log.payload?.purpose || "Gate visit"}</td>
                <td className="px-4 py-3"><StatusChip label={log.payload?.exited_at ? "Exited" : "Inside"} tone={log.payload?.exited_at ? "success" : "warning"} /></td>
                <td className="px-4 py-3 text-right">
                  {log.payload?.exited_at ? (
                    <span className="text-xs font-semibold text-[#64748B]">Closed</span>
                  ) : (
                    <button type="button" onClick={() => handleVehicleExit(log)} disabled={savingAction === `exit-${log.id}`} className="text-emerald-600 hover:underline font-semibold text-xs mr-3 disabled:cursor-not-allowed disabled:opacity-50">{savingAction === `exit-${log.id}` ? "Saving..." : "Record Exit"}</button>
                  )}
                </td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">No vehicles are currently logged. Enter registration details above, then record the vehicle entry.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function DeliveriesWorkspace() {
  const { data: deliveries = [], isLoading, refetch } = useSchoolQuery<SecurityDelivery[]>("/api/admin-command/security-officer/deliveries");
  const [draft, setDraft] = useState({ delivery_type: "Office Document", recipient: "Principal", sender: "" });
  const [savingAction, setSavingAction] = useState<string | null>(null);

  const handleRecordDelivery = async () => {
    if (!draft.delivery_type.trim() || !draft.recipient.trim()) {
      toast.error("Delivery type and recipient are required.");
      return;
    }
    setSavingAction("record");
    try {
      await requestDashboardApi("/api/admin-command/security-officer/deliveries", {
        method: "POST",
        body: draft,
      });
      toast.success("Delivery recorded.");
      setDraft({ delivery_type: "Office Document", recipient: "Principal", sender: "" });
      await refetch();
      publishSchoolOperationalEvent({
        type: "security.delivery_recorded",
        module: "security",
        actorRole: "security_officer",
        title: "Delivery recorded",
        body: "A delivery was recorded at the school gate.",
      });
    } catch (error) {
      toast.error("Delivery was not recorded", {
        description: error instanceof Error ? error.message : "The delivery could not be saved.",
      });
    } finally {
      setSavingAction(null);
    }
  };

  const handleNotifyDeliveryRecipient = async (delivery: SecurityDelivery) => {
    setSavingAction(`notify-${delivery.id}`);
    try {
      await requestDashboardApi(`/api/admin-command/security-officer/deliveries/${delivery.id}/notify-recipient`, { method: "POST" });
      toast.success(`Recipient notified for ${delivery.payload?.delivery_type || "delivery"}.`);
      await refetch();
      publishSchoolOperationalEvent({
        type: "security.delivery_recipient_notified",
        module: "security",
        actorRole: "security_officer",
        title: "Delivery recipient notified",
        body: `${delivery.payload?.recipient || "Recipient"} was notified about a gate delivery.`,
      });
    } catch (error) {
      toast.error("Recipient was not notified", {
        description: error instanceof Error ? error.message : "The delivery notification could not be queued.",
      });
    } finally {
      setSavingAction(null);
    }
  };

  const handleMarkDeliveryCollected = async (delivery: SecurityDelivery) => {
    setSavingAction(`collected-${delivery.id}`);
    try {
      await requestDashboardApi(`/api/admin-command/security-officer/deliveries/${delivery.id}/collected`, { method: "POST" });
      toast.success(`${delivery.payload?.delivery_type || "Delivery"} marked collected.`);
      await refetch();
      publishSchoolOperationalEvent({
        type: "security.delivery_collected",
        module: "security",
        actorRole: "security_officer",
        title: "Delivery collected",
        body: `${delivery.payload?.delivery_type || "Delivery"} was collected at the gate.`,
      });
    } catch (error) {
      toast.error("Delivery was not marked collected", {
        description: error instanceof Error ? error.message : "The delivery state could not be updated.",
      });
    } finally {
      setSavingAction(null);
    }
  };

  return (
    <Panel title="Deliveries & Parcels" description="Tracks parcels, supplies, exam materials." icon={Package} actions={
      <button type="button" onClick={handleRecordDelivery} disabled={savingAction === "record"} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-50">
        {savingAction === "record" ? "Recording..." : "Record Delivery"}
      </button>
    }>
      <div className="mb-4 grid gap-3 rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 sm:grid-cols-3">
        <input value={draft.delivery_type} onChange={(event) => setDraft((current) => ({ ...current, delivery_type: event.target.value }))} placeholder="Delivery type" className="rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" />
        <input value={draft.recipient} onChange={(event) => setDraft((current) => ({ ...current, recipient: event.target.value }))} placeholder="Recipient / office" className="rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" />
        <input value={draft.sender} onChange={(event) => setDraft((current) => ({ ...current, sender: event.target.value }))} placeholder="Sender / courier" className="rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Time</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Type</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Recipient</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">Loading deliveries...</td></tr>
            ) : deliveries.length ? deliveries.map((delivery) => (
              <tr key={delivery.id} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 text-[#64748B]">{delivery.created_at ? new Date(delivery.created_at).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }) : "Today"}</td>
                <td className="px-4 py-3 font-semibold text-[#071D49]">{delivery.payload?.delivery_type || delivery.title || "Delivery"}</td>
                <td className="px-4 py-3 text-[#64748B]">{delivery.payload?.recipient || "Recipient"}</td>
                <td className="px-4 py-3"><StatusChip label={delivery.payload?.collected_at ? "Collected" : "Pending"} tone={delivery.payload?.collected_at ? "success" : "warning"} /></td>
                <td className="px-4 py-3 text-right">
                  <button type="button" onClick={() => handleNotifyDeliveryRecipient(delivery)} disabled={savingAction === `notify-${delivery.id}`} className="text-blue-600 hover:underline font-semibold text-xs mr-3 disabled:cursor-not-allowed disabled:opacity-50">{savingAction === `notify-${delivery.id}` ? "Notifying..." : "Notify Recipient"}</button>
                  {delivery.payload?.collected_at ? (
                    <span className="text-xs font-semibold text-[#64748B]">Closed</span>
                  ) : (
                    <button type="button" onClick={() => handleMarkDeliveryCollected(delivery)} disabled={savingAction === `collected-${delivery.id}`} className="text-emerald-600 hover:underline font-semibold text-xs disabled:cursor-not-allowed disabled:opacity-50">{savingAction === `collected-${delivery.id}` ? "Saving..." : "Mark Collected"}</button>
                  )}
                </td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">No deliveries are waiting at the gate. Enter delivery details above, then record the first parcel or document.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function IncidentsWorkspace() {
  const { data: incidents, isLoading, refetch } = useSchoolQuery<any[]>("/api/admin-command/security-officer/incidents");
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [isSubmittingIncident, setIsSubmittingIncident] = useState(false);
  const [escalatingId, setEscalatingId] = useState<string | null>(null);
  const [incidentDraft, setIncidentDraft] = useState<SecurityIncidentDraft>({ title: "", description: "", severity: "medium", location: "School gate" });

  const submitIncident = async () => {
    if (!incidentDraft.title.trim() || !incidentDraft.description.trim()) {
      toast.error("Enter an incident title and description.");
      return;
    }
    setIsSubmittingIncident(true);
    try {
      await requestDashboardApi("/api/admin-command/security-officer/incidents", { method: "POST", body: incidentDraft });
      toast.success("Security incident reported and leadership notified");
      setShowIncidentModal(false);
      setIncidentDraft({ title: "", description: "", severity: "medium", location: "School gate" });
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The incident could not be reported.");
    } finally {
      setIsSubmittingIncident(false);
    }
  };

  const escalateIncident = async (incidentId: string) => {
    setEscalatingId(incidentId);
    try {
      await requestDashboardApi(`/api/admin-command/security-officer/incidents/${incidentId}/escalate`, { method: "POST" });
      toast.success("Incident escalated to school leadership");
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The incident could not be escalated.");
    } finally {
      setEscalatingId(null);
    }
  };

  return (
    <Panel title="Incidents & Emergencies" description="Record gate-related incidents." icon={AlertTriangle} actions={
      <div className="flex gap-2">
        <button type="button" onClick={() => {
          setIncidentDraft({ title: "Emergency alert", description: "", severity: "critical", location: "School gate" });
          setShowIncidentModal(true);
        }} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">
          Send Emergency Alert
        </button>
        <button type="button" onClick={() => setShowIncidentModal(true)} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-50">
          Report Incident
        </button>
      </div>
    }>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Time</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Severity</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Type</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">Loading incidents...</td></tr> : null}
            {!isLoading && !incidents?.length ? <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">No security incidents. Use Report Incident to create the first record.</td></tr> : null}
            {incidents?.map((incident) => (
              <tr key={incident.id} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 text-[#64748B]">{new Date(incident.created_at).toLocaleString()}</td>
                <td className="px-4 py-3"><StatusChip label={incident.severity || "medium"} tone={incident.severity === "high" || incident.severity === "critical" ? "danger" : "warning"} /></td>
                <td className="px-4 py-3 font-semibold text-[#071D49]">{incident.title}</td>
                <td className="px-4 py-3"><StatusChip label={incident.status} tone={String(incident.status).toLowerCase() === "resolved" ? "success" : "warning"} /></td>
                <td className="px-4 py-3 text-right">
                  {String(incident.status).toLowerCase() !== "resolved" && String(incident.status).toLowerCase() !== "escalated" ? (
                    <button type="button" onClick={() => escalateIncident(incident.id)} disabled={escalatingId === incident.id} className="text-blue-600 hover:underline font-semibold text-xs mr-3 disabled:opacity-50">{escalatingId === incident.id ? "Escalating..." : "Escalate"}</button>
                  ) : null}
                  <button type="button" onClick={() => openPrintDocument({ eyebrow: "Security incident", title: incident.title, subtitle: incident.status, rows: [{ label: "Severity", value: incident.severity }, { label: "Location", value: incident.location }, { label: "Description", value: incident.description }], footer: "Incident preview generated from the current school's security register." })} className="text-blue-600 hover:underline font-semibold text-xs">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SecurityIncidentModal open={showIncidentModal} draft={incidentDraft} submitting={isSubmittingIncident} onChange={setIncidentDraft} onClose={() => setShowIncidentModal(false)} onSubmit={submitIncident} />
    </Panel>
  );
}

function WatchlistWorkspace() {
  const { data: entries = [], isLoading, refetch } = useSchoolQuery<SecurityWatchlistEntry[]>("/api/admin-command/security-officer/watchlist");
  const [draft, setDraft] = useState({ subject: "", subject_type: "Vehicle", instruction: "Deny Entry", risk_level: "Critical" });
  const [savingAction, setSavingAction] = useState<string | null>(null);

  const handleCreateWatchlistEntry = async () => {
    if (!draft.subject.trim()) {
      toast.error("Enter the person name or vehicle registration before adding a watchlist entry.");
      return;
    }
    if (!draft.instruction.trim()) {
      toast.error("Watchlist instruction is required.");
      return;
    }
    setSavingAction("create");
    try {
      await requestDashboardApi("/api/admin-command/security-officer/watchlist", { method: "POST", body: draft });
      toast.success("Watchlist entry recorded and routed to leadership.");
      setDraft({ subject: "", subject_type: "Vehicle", instruction: "Deny Entry", risk_level: "Critical" });
      await refetch();
      publishSchoolOperationalEvent({
        type: "security.watchlist_entry_recorded",
        module: "security",
        actorRole: "security_officer",
        title: "Watchlist entry recorded",
        body: `${draft.subject} added to the security watchlist.`,
      });
    } catch (error) {
      toast.error("Watchlist entry was not recorded", {
        description: error instanceof Error ? error.message : "The watchlist entry could not be persisted.",
      });
    } finally {
      setSavingAction(null);
    }
  };

  const handleAcknowledgeWatchlistEntry = async (entry: SecurityWatchlistEntry) => {
    setSavingAction(`ack-${entry.id}`);
    try {
      await requestDashboardApi(`/api/admin-command/security-officer/watchlist/${entry.id}/acknowledge`, { method: "POST" });
      toast.success("Watchlist entry acknowledged.");
      await refetch();
      publishSchoolOperationalEvent({
        type: "security.watchlist_entry_acknowledged",
        module: "security",
        actorRole: "security_officer",
        title: "Watchlist entry acknowledged",
        body: `${entry.payload?.subject || "Watchlist entry"} reviewed by security.`,
      });
    } catch (error) {
      toast.error("Watchlist entry was not acknowledged", {
        description: error instanceof Error ? error.message : "The acknowledgement could not be saved.",
      });
    } finally {
      setSavingAction(null);
    }
  };

  const handleViewWatchlistEntry = (entry: SecurityWatchlistEntry) => {
    openPrintDocument({
      eyebrow: "Security watchlist",
      title: entry.payload?.subject || entry.title || "Watchlist entry",
      subtitle: `${entry.payload?.risk_level || "High"} ${entry.payload?.subject_type || "subject"} watchlist entry`,
      rows: [
        { label: "Type", value: entry.payload?.subject_type || "Subject" },
        { label: "Instruction", value: entry.payload?.instruction || "Instruction not recorded" },
        { label: "Risk level", value: entry.payload?.risk_level || "High" },
        { label: "Recorded", value: entry.created_at ? new Date(entry.created_at).toLocaleString("en-KE") : "Recorded" },
        { label: "Acknowledged", value: entry.payload?.acknowledged_at ? new Date(entry.payload.acknowledged_at).toLocaleString("en-KE") : "Pending" },
      ],
      footer: "Watchlist preview generated from the current school security workspace.",
    });
  };

  return (
    <Panel title="Watchlist" description="Warnings for blocked or suspicious persons/vehicles." icon={ShieldAlert} actions={
      <button type="button" onClick={handleCreateWatchlistEntry} disabled={savingAction === "create"} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{savingAction === "create" ? "Adding..." : "Add Entry"}</button>
    }>
      <div className="mb-4 grid gap-3 rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 md:grid-cols-4">
        <label className="text-sm font-bold text-[#071D49]">Name/vehicle
          <input value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" placeholder="KBC 999Z or full name" />
        </label>
        <label className="text-sm font-bold text-[#071D49]">Type
          <select value={draft.subject_type} onChange={(event) => setDraft({ ...draft, subject_type: event.target.value })} className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm">
            <option value="Vehicle">Vehicle</option>
            <option value="Person">Person</option>
            <option value="Visitor">Visitor</option>
          </select>
        </label>
        <label className="text-sm font-bold text-[#071D49]">Instruction
          <input value={draft.instruction} onChange={(event) => setDraft({ ...draft, instruction: event.target.value })} className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" placeholder="Deny Entry" />
        </label>
        <label className="text-sm font-bold text-[#071D49]">Risk level
          <select value={draft.risk_level} onChange={(event) => setDraft({ ...draft, risk_level: event.target.value })} className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm">
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
          </select>
        </label>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Name/Vehicle</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Type</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Instruction</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Risk Level</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">Loading watchlist entries...</td></tr>
            ) : entries.length ? entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 font-semibold text-[#071D49]">{entry.payload?.subject || entry.title || "Watchlist subject"}</td>
                <td className="px-4 py-3 text-[#64748B]">{entry.payload?.subject_type || "Subject"}</td>
                <td className="px-4 py-3 text-[#64748B]">{entry.payload?.instruction || "Instruction not recorded"}</td>
                <td className="px-4 py-3"><StatusChip label={entry.payload?.risk_level || "High"} tone={String(entry.payload?.risk_level || "").toLowerCase() === "critical" ? "danger" : "warning"} /></td>
                <td className="px-4 py-3 text-right">
                  <button type="button" onClick={() => handleViewWatchlistEntry(entry)} className="text-blue-600 hover:underline font-semibold text-xs mr-3">View</button>
                  {entry.payload?.acknowledged_at ? (
                    <span className="text-xs font-semibold text-[#64748B]">Acknowledged</span>
                  ) : (
                    <button type="button" onClick={() => handleAcknowledgeWatchlistEntry(entry)} disabled={savingAction === `ack-${entry.id}`} className="text-emerald-600 hover:underline font-semibold text-xs disabled:cursor-not-allowed disabled:opacity-50">{savingAction === `ack-${entry.id}` ? "Saving..." : "Acknowledge"}</button>
                  )}
                </td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">No watchlist entries. Add a person or vehicle only when there is an approved security instruction for the current school.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function FrequentVisitorsWorkspace({ onNavigate }: { onNavigate: (view: ViewId) => void }) {
  const mutation = useSchoolMutation("/api/visitors/logs");

  const handleAddFrequentVisitor = () => {
    onNavigate("check-in");
    toast.info("Opened visitor check-in. Enter the repeat visitor details and save them against the gate register.");
  };

  const handleQuickFrequentVisitorCheckIn = async () => {
    await mutation.mutateAsync({
      visitor_name: "Mary Wanjiru",
      phone_number: "",
      purpose: "Supplier visit",
      host_user_id: "Storekeeper",
      status: "active",
    });
    toast.success("Mary Wanjiru checked in from frequent visitor profile.");
    publishSchoolOperationalEvent({
      type: "security.frequent_visitor_checked_in",
      module: "security",
      actorRole: "security_officer",
      title: "Frequent visitor checked in",
      body: "Mary Wanjiru checked in for Storekeeper.",
    });
  };

  return (
    <Panel title="Frequent Visitors" description="Repeat visitors for quick check-in." icon={UsersRound} actions={
      <button type="button" onClick={handleAddFrequentVisitor} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white">Add Visitor</button>
    }>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Name</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Type</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Usual Host</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            <tr className="hover:bg-[#F8FAFC]">
              <td className="px-4 py-3 font-semibold text-[#071D49]">Mary Wanjiru</td>
              <td className="px-4 py-3 text-[#64748B]">Supplier</td>
              <td className="px-4 py-3 text-[#64748B]">Storekeeper</td>
              <td className="px-4 py-3 text-right">
                <button type="button" onClick={handleQuickFrequentVisitorCheckIn} disabled={mutation.isPending} className="text-emerald-600 hover:underline font-semibold text-xs mr-3 disabled:cursor-not-allowed disabled:opacity-50">{mutation.isPending ? "Checking In..." : "Quick Check In"}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function LostFoundWorkspace() {
  const { data: items = [], isLoading, refetch } = useSchoolQuery<SecurityLostFoundItem[]>("/api/admin-command/security-officer/lost-found");
  const [draft, setDraft] = useState({ item_name: "", found_location: "Main gate", description: "" });
  const [savingAction, setSavingAction] = useState<string | null>(null);

  const handleRecordLostFoundItem = async () => {
    if (!draft.item_name.trim()) {
      toast.error("Item name is required before recording a lost item.");
      return;
    }
    setSavingAction("record");
    try {
      await requestDashboardApi("/api/admin-command/security-officer/lost-found", {
        method: "POST",
        body: draft,
      });
      toast.success("Lost item recorded in the school gate register.");
      setDraft({ item_name: "", found_location: "Main gate", description: "" });
      await refetch();
      publishSchoolOperationalEvent({
        type: "security.lost_item_recorded",
        module: "security",
        actorRole: "security_officer",
        title: "Lost item recorded",
        body: "A gate lost-and-found item was recorded for follow-up.",
      });
    } catch (error) {
      toast.error("Lost item was not recorded", {
        description: error instanceof Error ? error.message : "The item could not be saved to the school gate register.",
      });
    } finally {
      setSavingAction(null);
    }
  };

  const handleClaimLostFoundItem = async (item: SecurityLostFoundItem) => {
    setSavingAction(`claim-${item.id}`);
    try {
      await requestDashboardApi(`/api/admin-command/security-officer/lost-found/${item.id}/claim`, {
        method: "POST",
        body: {
          claimant_name: item.claimant_name || "Verified owner",
          verification_notes: `Released by security after verifying ownership of ${item.item_name}.`,
        },
      });
      toast.success(`${item.item_name} marked claimed.`);
      await refetch();
      publishSchoolOperationalEvent({
        type: "security.lost_item_claimed",
        module: "security",
        actorRole: "security_officer",
        title: "Lost item claimed",
        body: `${item.item_name} was marked claimed after verification.`,
      });
    } catch (error) {
      toast.error("Lost item was not marked claimed", {
        description: error instanceof Error ? error.message : "The claim could not be saved to the school gate register.",
      });
    } finally {
      setSavingAction(null);
    }
  };

  return (
    <Panel title="Lost & Found" description="Record lost items found at the gate." icon={Search} actions={
      <button type="button" onClick={handleRecordLostFoundItem} disabled={savingAction === "record"} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{savingAction === "record" ? "Recording..." : "Record Item"}</button>
    }>
      <div className="mb-4 grid gap-3 rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 sm:grid-cols-3">
        <input value={draft.item_name} onChange={(event) => setDraft((current) => ({ ...current, item_name: event.target.value }))} placeholder="Item name" className="rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" />
        <input value={draft.found_location} onChange={(event) => setDraft((current) => ({ ...current, found_location: event.target.value }))} placeholder="Found location" className="rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" />
        <input value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Owner clues / description" className="rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Date Found</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Item</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[#64748B]">Loading lost and found items...</td></tr>
            ) : items.length ? items.map((item) => (
              <tr key={item.id} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 text-[#64748B]">{item.found_at ? new Date(item.found_at).toLocaleDateString("en-KE") : "Today"}</td>
                <td className="px-4 py-3 font-semibold text-[#071D49]">{item.item_name}</td>
                <td className="px-4 py-3"><StatusChip label={item.status === "claimed" ? "Claimed" : "Found"} tone={item.status === "claimed" ? "success" : "warning"} /></td>
                <td className="px-4 py-3 text-right">
                  {item.status === "claimed" ? (
                    <span className="text-xs font-semibold text-[#64748B]">Released</span>
                  ) : (
                    <button type="button" onClick={() => handleClaimLostFoundItem(item)} disabled={savingAction === `claim-${item.id}`} className="text-emerald-600 hover:underline font-semibold text-xs disabled:cursor-not-allowed disabled:opacity-50">{savingAction === `claim-${item.id}` ? "Saving..." : "Mark Claimed"}</button>
                  )}
                </td>
              </tr>
            )) : (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[#64748B]">No lost items have been recorded. Enter item details above, then record the first item.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function BoardingMovementWorkspace() {
  const { data: movements = [], isLoading, refetch } = useSchoolQuery<SecurityBoardingMovement[]>("/api/admin-command/security-officer/boarding-movement");
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const firstApprovedMovement = movements.find((movement) => movement.status === "approved");

  const handleVerifyBoardingMovement = async (movement: SecurityBoardingMovement) => {
    setSavingAction(`verify-${movement.id}`);
    try {
      await requestDashboardApi(`/api/admin-command/security-officer/boarding-movement/${movement.id}/verify`, { method: "POST" });
      toast.success(`${movement.student_name} boarding pass verified at the gate.`);
      await refetch();
      publishSchoolOperationalEvent({
        type: "security.boarding_pass_verified",
        module: "security",
        actorRole: "security_officer",
        title: "Boarding pass verified",
        body: `${movement.student_name} was verified at the gate.`,
      });
    } catch (error) {
      toast.error("Boarding pass was not verified", {
        description: error instanceof Error ? error.message : "The boarding movement could not be updated.",
      });
    } finally {
      setSavingAction(null);
    }
  };

  const handleRecordBoardingReturn = async (movement: SecurityBoardingMovement) => {
    setSavingAction(`return-${movement.id}`);
    try {
      await requestDashboardApi(`/api/admin-command/security-officer/boarding-movement/${movement.id}/return`, { method: "POST" });
      toast.success(`${movement.student_name} return recorded.`);
      await refetch();
      publishSchoolOperationalEvent({
        type: "security.boarding_return_recorded",
        module: "security",
        actorRole: "security_officer",
        title: "Boarding return recorded",
        body: `${movement.student_name} returned through the gate.`,
      });
    } catch (error) {
      toast.error("Boarding return was not recorded", {
        description: error instanceof Error ? error.message : "The boarding movement could not be returned.",
      });
    } finally {
      setSavingAction(null);
    }
  };

  const handleNotifyBoardingMaster = async (movement: SecurityBoardingMovement) => {
    setSavingAction(`notify-${movement.id}`);
    try {
      await requestDashboardApi(`/api/admin-command/security-officer/boarding-movement/${movement.id}/notify-master`, { method: "POST" });
      toast.success(`Boarding master notified for ${movement.student_name}.`);
      await refetch();
      publishSchoolOperationalEvent({
        type: "security.boarding_master_notified",
        module: "security",
        actorRole: "security_officer",
        title: "Boarding master notified",
        body: `${movement.student_name} needs boarding follow-up.`,
      });
    } catch (error) {
      toast.error("Boarding master was not notified", {
        description: error instanceof Error ? error.message : "The boarding notification could not be queued.",
      });
    } finally {
      setSavingAction(null);
    }
  };

  return (
    <Panel title="Boarding Gate Movement" description="Tracks boarders entering or leaving." icon={Home} actions={
      <div className="flex gap-2">
        <button type="button" onClick={() => firstApprovedMovement ? handleVerifyBoardingMovement(firstApprovedMovement) : toast.info("No approved boarding pass is waiting for gate verification.")} disabled={!!savingAction} className="rounded-lg border border-[#D8E0EC] px-4 py-2 text-sm font-bold text-[#071D49] disabled:cursor-not-allowed disabled:opacity-50">Verify Pass</button>
      </div>
    }>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Student</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Movement Type</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[#64748B]">Loading boarding gate movements...</td></tr>
            ) : movements.length ? movements.map((movement) => (
              <tr key={movement.id} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 font-semibold text-[#071D49]">{movement.student_name}</td>
                <td className="px-4 py-3 text-[#64748B]">{movement.leave_type}</td>
                <td className="px-4 py-3"><StatusChip label={movement.status === "checked_out" ? "Out" : movement.status === "returned" ? "Returned" : "Approved"} tone={movement.status === "returned" ? "success" : movement.status === "checked_out" ? "warning" : "info"} /></td>
                <td className="px-4 py-3 text-right">
                  {movement.status === "approved" ? (
                    <button type="button" onClick={() => handleVerifyBoardingMovement(movement)} disabled={savingAction === `verify-${movement.id}`} className="text-blue-600 hover:underline font-semibold text-xs mr-3 disabled:cursor-not-allowed disabled:opacity-50">{savingAction === `verify-${movement.id}` ? "Verifying..." : "Verify Pass"}</button>
                  ) : null}
                  {movement.status === "checked_out" ? (
                    <button type="button" onClick={() => handleRecordBoardingReturn(movement)} disabled={savingAction === `return-${movement.id}`} className="text-emerald-600 hover:underline font-semibold text-xs mr-3 disabled:cursor-not-allowed disabled:opacity-50">{savingAction === `return-${movement.id}` ? "Saving..." : "Record Return"}</button>
                  ) : null}
                  <button type="button" onClick={() => handleNotifyBoardingMaster(movement)} disabled={savingAction === `notify-${movement.id}`} className="text-rose-600 hover:underline font-semibold text-xs disabled:cursor-not-allowed disabled:opacity-50">{savingAction === `notify-${movement.id}` ? "Notifying..." : "Notify Master"}</button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[#64748B]">No approved or active boarding gate movements. Approved exeats from Boarding will appear here for security verification.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function TransportClearanceWorkspace() {
  const { data: trips = [], isLoading, refetch } = useSchoolQuery<SecurityTransportTrip[]>("/api/admin-command/security-officer/transport-clearance");
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const firstScheduledTrip = trips.find((trip) => trip.status === "scheduled");

  const handleRecordTransportDeparture = async (trip: SecurityTransportTrip) => {
    setSavingAction(`departure-${trip.id}`);
    try {
      await requestDashboardApi(`/api/admin-command/security-officer/transport-clearance/${trip.id}/departure`, { method: "POST" });
      toast.success(`${trip.vehicle_registration || "Bus"} departure recorded.`);
      await refetch();
      publishSchoolOperationalEvent({
        type: "security.transport_departure_recorded",
        module: "security",
        actorRole: "security_officer",
        title: "Transport departure recorded",
        body: `${trip.vehicle_registration || "A school vehicle"} departed the gate.`,
      });
    } catch (error) {
      toast.error("Transport departure was not recorded", {
        description: error instanceof Error ? error.message : "The transport trip could not be updated.",
      });
    } finally {
      setSavingAction(null);
    }
  };

  const handleRecordTransportArrival = async (trip: SecurityTransportTrip) => {
    setSavingAction(`arrival-${trip.id}`);
    try {
      await requestDashboardApi(`/api/admin-command/security-officer/transport-clearance/${trip.id}/arrival`, { method: "POST" });
      toast.success(`${trip.vehicle_registration || "Bus"} arrival recorded.`);
      await refetch();
      publishSchoolOperationalEvent({
        type: "security.transport_arrival_recorded",
        module: "security",
        actorRole: "security_officer",
        title: "Transport arrival recorded",
        body: `${trip.vehicle_registration || "A school vehicle"} returned through the gate.`,
      });
    } catch (error) {
      toast.error("Transport arrival was not recorded", {
        description: error instanceof Error ? error.message : "The transport trip could not be completed.",
      });
    } finally {
      setSavingAction(null);
    }
  };

  return (
    <Panel title="Transport Gate Clearance" description="Confirm bus departure/arrival at the gate." icon={Bus} actions={
      <div className="flex gap-2">
        <button type="button" onClick={() => firstScheduledTrip ? handleRecordTransportDeparture(firstScheduledTrip) : toast.info("No scheduled transport trip is waiting for gate departure.")} disabled={!!savingAction} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">Record Departure</button>
      </div>
    }>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Bus</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Route</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[#64748B]">Loading transport gate trips...</td></tr>
            ) : trips.length ? trips.map((trip) => (
              <tr key={trip.id} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 font-semibold text-[#071D49]">{trip.vehicle_registration || "School vehicle"}</td>
                <td className="px-4 py-3 text-[#64748B]">{trip.route_name || trip.direction || "Assigned route"}</td>
                <td className="px-4 py-3"><StatusChip label={trip.status === "in_progress" ? "Departed" : trip.status === "completed" ? "Arrived" : "Scheduled"} tone={trip.status === "completed" ? "success" : trip.status === "in_progress" ? "warning" : "info"} /></td>
                <td className="px-4 py-3 text-right">
                  {trip.status === "scheduled" ? (
                    <button type="button" onClick={() => handleRecordTransportDeparture(trip)} disabled={savingAction === `departure-${trip.id}`} className="text-emerald-600 hover:underline font-semibold text-xs mr-3 disabled:cursor-not-allowed disabled:opacity-50">{savingAction === `departure-${trip.id}` ? "Saving..." : "Record Departure"}</button>
                  ) : null}
                  {trip.status === "in_progress" ? (
                    <button type="button" onClick={() => handleRecordTransportArrival(trip)} disabled={savingAction === `arrival-${trip.id}`} className="text-blue-600 hover:underline font-semibold text-xs mr-3 disabled:cursor-not-allowed disabled:opacity-50">{savingAction === `arrival-${trip.id}` ? "Saving..." : "Record Arrival"}</button>
                  ) : null}
                </td>
              </tr>
            )) : (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[#64748B]">No scheduled or active transport trips are waiting at the gate. Trips created by Transport will appear here for security clearance.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function ReportsWorkspace() {
  const reports = ["Daily Visitor Register", "Late Arrival Report", "Incident Report", "Vehicle Movement Report", "Shift Handover Report"];

  const openReportPreview = (reportTitle: string) => {
    openPrintDocument({
      eyebrow: "MyShule Security Desk",
      title: reportTitle,
      subtitle: "Security report print preview generated from the gate workspace.",
      rows: [
        { label: "Generated at", value: new Date().toLocaleString("en-KE") },
        { label: "Prepared by", value: "Security Officer" },
        { label: "Scope", value: "Current school only" },
        { label: "Status", value: "Preview ready for print or PDF download" },
      ],
      footer: "This report must be checked against live gate records before filing.",
    });
    toast.success(`${reportTitle} print preview ready.`);
  };

  return (
    <Panel title="Reports & Downloads" description="Printable gate records and summaries." icon={PieChart}>
      <div className="grid gap-4 md:grid-cols-3">
        {reports.map(r => (
          <button
            key={r}
            type="button"
            onClick={() => openReportPreview(r)}
            className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 text-left font-bold text-[#071D49] transition hover:border-[#071D49]"
          >
            {r}
          </button>
        ))}
      </div>
    </Panel>
  );
}

function NotificationsWorkspace() {
  const { data: notifications = [], isLoading, refetch } = useSchoolQuery<SecurityNotification[]>("/api/notifications");
  const [savingAction, setSavingAction] = useState<string | null>(null);

  const handleMarkSecurityNotificationRead = async (notification: SecurityNotification) => {
    setSavingAction(`read-${notification.id}`);
    try {
      await requestDashboardApi(`/api/notifications/${notification.id}/read`, { method: "PATCH" });
      toast.success("Notification marked read.");
      await refetch();
      publishSchoolOperationalEvent({
        type: "security.notification_marked_read",
        module: "security",
        actorRole: "security_officer",
        title: "Notification marked read",
        body: notification.title || notification.message || "Security notification reviewed.",
      });
    } catch (error) {
      toast.error("Notification was not marked read", {
        description: error instanceof Error ? error.message : "The notification update could not be saved.",
      });
    } finally {
      setSavingAction(null);
    }
  };

  return (
    <Panel title="Notifications" description="Messages related to gate/security work." icon={Bell}>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Time</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Message</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-[#64748B]">Loading security notifications...</td></tr>
            ) : notifications.length ? notifications.map((notification) => {
              const read = Boolean(notification.is_read || notification.read_at);
              return (
                <tr key={notification.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 text-[#64748B]">{notification.created_at ? new Date(notification.created_at).toLocaleString("en-KE") : "Recent"}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-[#071D49]">{notification.title || notification.message || "Security notification"}</div>
                    {notification.title && notification.message ? <div className="mt-1 text-xs text-[#64748B]">{notification.message}</div> : null}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {read ? (
                      <span className="text-xs font-semibold text-[#64748B]">Read</span>
                    ) : (
                      <button type="button" onClick={() => handleMarkSecurityNotificationRead(notification)} disabled={savingAction === `read-${notification.id}`} className="text-blue-600 hover:underline font-semibold text-xs disabled:cursor-not-allowed disabled:opacity-50">{savingAction === `read-${notification.id}` ? "Saving..." : "Mark Read"}</button>
                    )}
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-[#64748B]">No security notifications for this school yet. Gate alerts, approvals, visitor events, and safety updates will appear here.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function SettingsWorkspace() {
  return (
    <Panel title="Security Settings" description="Gate points and movement settings." icon={Settings}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-[#D8E0EC] p-4">
          <h3 className="font-bold text-[#071D49] mb-4">Gate Points</h3>
          <div className="space-y-3 text-sm text-[#64748B]">
            <div className="flex justify-between items-center"><span className="font-semibold text-[#071D49]">Main Gate</span> <StatusChip label="Active" tone="success" /></div>
            <div className="flex justify-between items-center"><span className="font-semibold text-[#071D49]">Dormitory Gate</span> <StatusChip label="Active" tone="success" /></div>
            <div className="flex justify-between items-center"><span className="font-semibold text-[#071D49]">Staff Gate</span> <StatusChip label="Active" tone="success" /></div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

export function SecurityCommandCenter({ routeMode }: { routeMode: RouteMode }) {
  const [activeView, setActiveView] = useState<ViewId>("overview");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SecuritySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearchSecurityRecords = async () => {
    if (!searchOpen) {
      setSearchOpen(true);
      return;
    }
    if (!searchTerm.trim()) {
      toast.error("Enter a visitor, vehicle, staff, incident, or movement search term.");
      return;
    }
    setIsSearching(true);
    try {
      const results = await requestDashboardApi<SecuritySearchResult[]>(`/api/admin-command/security-officer/search?query=${encodeURIComponent(searchTerm.trim())}`);
      setSearchResults(results);
      toast.success(`${results.length} security result${results.length === 1 ? "" : "s"} found.`);
    } catch (error) {
      toast.error("Security search failed", {
        description: error instanceof Error ? error.message : "The search could not be completed.",
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex min-h-dvh bg-[#F3F6FA] font-sans">
      <aside className="hidden h-dvh w-[260px] shrink-0 overflow-y-auto bg-[#071D49] p-4 text-white shadow-[0_24px_70px_rgba(7,29,73,0.28)] lg:block">
        <SchoolCommandSidebarIdentity eyebrow="Security command" title="Security Officer" subtitle="Gate, visitor, and safety operations" />
        <nav className="space-y-1" aria-label="Security navigation">
          {navItems.map((item, index) => {
            const showGroup = item.group !== navItems[index - 1]?.group;
            const Icon = item.icon;
            return (
              <div key={`${item.group}-${item.label}`}>
                {showGroup ? <p className="px-3 pb-2 pt-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{item.group}</p> : null}
                <button
                  type="button"
                  onClick={() => setActiveView(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-white/70 transition hover:bg-white/10 hover:text-white",
                    activeView === item.id && "bg-white/15 text-white shadow-[inset_4px_0_0_#38BDF8]"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </button>
              </div>
            );
          })}
        </nav>
      </aside>
      <main className="flex h-dvh min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-[#D8E0EC] bg-white/90 px-4 py-3 backdrop-blur shrink-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#071D49] text-xs font-black text-white shrink-0">SO</div>
              <h1 className="text-lg font-black text-[#071D49] truncate">{navItems.find(i => i.id === activeView)?.label || "Dashboard"}</h1>
            </div>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                  <StatusChip label="Term 2 (2026)" tone="info" />
                  {searchOpen ? (
                    <input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          void handleSearchSecurityRecords();
                        }
                      }}
                      className="h-11 w-full rounded-xl border border-[#D8E0EC] px-3 text-base font-semibold text-[#071D49] outline-none sm:w-56 sm:text-sm"
                      placeholder="Search gate records"
                      autoFocus
                    />
                  ) : null}
                  <button type="button" aria-label="Search security records" onClick={handleSearchSecurityRecords} disabled={isSearching} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#071D49] text-white disabled:opacity-50">
                    <Search className="h-4 w-4" />
                  </button>
              <div className="flex items-center gap-2">
                <TaskQueue />
                <ApprovalInbox />
                <NotificationBell />
              </div>
            </div>
          </div>
          <div className="mt-3 lg:hidden">
            <MobileWorkspaceNavigation
              label="Security workspace"
              items={navItems}
              value={activeView}
              onValueChange={(value) => setActiveView(value as ViewId)}
              testId="security-mobile-workspace-nav"
            />
          </div>
            </header>
            <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
              <IntegratedSchoolCommandHeader roleTitle="Security Officer Dashboard" fallbackUserLabel="Security Officer" />
              {searchOpen ? (
                <section className="rounded-xl border border-[#D8E0EC] bg-white p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-black text-[#071D49]">Security Search Results</h2>
                      <p className="text-xs text-[#64748B]">Tenant-scoped records from security events and incident logs.</p>
                    </div>
                    <button type="button" onClick={() => { setSearchOpen(false); setSearchResults([]); setSearchTerm(""); }} className="rounded-lg border border-[#D8E0EC] px-3 py-1.5 text-xs font-bold text-[#071D49]">Close</button>
                  </div>
                  {isSearching ? (
                    <p className="text-sm text-[#64748B]">Searching security records...</p>
                  ) : searchResults.length ? (
                    <div className="grid gap-2 md:grid-cols-2">
                      {searchResults.map((result) => (
                        <button
                          key={`${result.source}-${result.id}`}
                          type="button"
                          onClick={() => {
                            if (String(result.source || "").includes("incident")) setActiveView("incidents");
                            else if (String(result.type || "").includes("vehicle")) setActiveView("vehicle-log");
                            else if (String(result.type || "").includes("delivery")) setActiveView("deliveries");
                            else if (String(result.type || "").includes("staff")) setActiveView("staff-movement");
                            else setActiveView("visitor-register");
                          }}
                          className="rounded-lg border border-[#D8E0EC] bg-[#F8FAFC] p-3 text-left hover:border-[#071D49]"
                        >
                          <div className="text-sm font-bold text-[#071D49]">{result.title || "Security record"}</div>
                          <div className="mt-1 line-clamp-2 text-xs text-[#64748B]">{result.message || result.type || result.source || "Matched security record"}</div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#64748B]">{searchTerm ? "No matching security records found in this school." : "Enter a search term and press Enter or the search button."}</p>
                  )}
                </section>
              ) : null}
              {activeView === "overview" && <OverviewWorkspace onNavigate={setActiveView} />}
          {activeView === "shift" && <ShiftWorkspace />}
          {activeView === "check-in" && <CheckInWorkspace onNavigate={setActiveView} />}
          {activeView === "visitor-register" && <VisitorRegisterWorkspace />}
          {activeView === "expected-visitors" && <ExpectedVisitorsWorkspace />}
          {activeView === "gate-passes" && <GatePassesWorkspace />}
          {activeView === "late-arrivals" && <LateArrivalsWorkspace />}
          {activeView === "early-departures" && <EarlyDeparturesWorkspace />}
          {activeView === "staff-movement" && <StaffMovementWorkspace />}
          {activeView === "vehicle-log" && <VehicleLogWorkspace />}
          {activeView === "deliveries" && <DeliveriesWorkspace />}
          {activeView === "incidents" && <IncidentsWorkspace />}
          {activeView === "watchlist" && <WatchlistWorkspace />}
          {activeView === "frequent-visitors" && <FrequentVisitorsWorkspace onNavigate={setActiveView} />}
          {activeView === "lost-found" && <LostFoundWorkspace />}
          {activeView === "boarding-movement" && <BoardingMovementWorkspace />}
          {activeView === "transport-clearance" && <TransportClearanceWorkspace />}
          {activeView === "reports" && <ReportsWorkspace />}
          {activeView === "notifications" && <NotificationsWorkspace />}
          {activeView === "settings" && <SettingsWorkspace />}
        </div>
      </main>
      
    </div>
  );
}
