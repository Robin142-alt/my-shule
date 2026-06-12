// GENERATED FOR SECURITY OFFICER
"use client";

import { useState, type ReactNode } from "react";
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
import { NotificationBell } from "@/components/shared/notification-bell";
import { TaskQueue } from "@/components/shared/task-queue";
import { WorkflowToast } from "@/components/shared/workflow-toast";

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
        <button className="flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white" onClick={() => onNavigate("check-in")}>
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
                        <button className="text-blue-600 hover:underline font-semibold text-xs">Check Out</button>
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
                <button className="text-rose-900 underline font-semibold text-xs" onClick={() => onNavigate("visitor-register")}>Review</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function ShiftWorkspace() {
  return (
    <Panel title="My Shift & Handover" description="Start and end shifts properly with accountability." icon={Clock} actions={
      <div className="flex gap-2">
        <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-black text-white">Start Shift</button>
        <button className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-black text-white">End Shift</button>
      </div>
    }>
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Current Shift</div>
          <div className="mt-1 text-xl font-black text-[#071D49]">Morning (Main Gate)</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Visitors Still Inside</div>
          <div className="mt-1 text-2xl font-black text-rose-600">3</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Vehicles Still Inside</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">1</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Pending Parcels</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">2</div>
        </div>
      </div>
    </Panel>
  );
}

function CheckInWorkspace() {
  const mutation = useSchoolMutation("/api/visitors/logs");
  const { data: dashboard, refetch } = useSchoolQuery<any>("/api/visitors/dashboard");
  const [formData, setFormData] = useState({ visitor_name: "", phone_number: "", purpose: "", host_user_id: "" });

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
    // We would need a separate mutation for patch, but we can reuse the same hook pattern if it supports method overriding.
    // For now we'll do a basic fetch or if useSchoolMutation handles PATCH automatically depending on the data
    await fetch(`/api/visitors/logs/${recordId}/checkout`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" }
    });
    refetch();
  };

  return (
    <Panel title="Fast Visitor Check-In" description="Fast visitor registration during morning rush, parent visits, deliveries." icon={UserPlus} actions={
      <div className="flex gap-2">
        <button className="rounded-lg border border-[#D8E0EC] px-4 py-2 text-sm font-bold text-[#071D49]">Search Frequent Visitor</button>
        <button className="rounded-lg border border-[#D8E0EC] px-4 py-2 text-sm font-bold text-[#071D49]">Use Expected Visitor</button>
      </div>
    }>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-xl border border-[#D8E0EC] p-4 bg-[#F8FAFC]">
            <h3 className="font-bold text-[#071D49] mb-3">Visitor Details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <input type="text" placeholder="Full Name" value={formData.visitor_name} onChange={e => setFormData(f => ({ ...f, visitor_name: e.target.value }))} className="rounded-lg border border-[#D8E0EC] p-2 text-sm" />
              <input type="text" placeholder="Phone Number" value={formData.phone_number} onChange={e => setFormData(f => ({ ...f, phone_number: e.target.value }))} className="rounded-lg border border-[#D8E0EC] p-2 text-sm" />
              <input type="text" placeholder="Purpose of Visit" value={formData.purpose} onChange={e => setFormData(f => ({ ...f, purpose: e.target.value }))} className="rounded-lg border border-[#D8E0EC] p-2 text-sm sm:col-span-2" />
              <input type="text" placeholder="Person/Office to see" value={formData.host_user_id} onChange={e => setFormData(f => ({ ...f, host_user_id: e.target.value }))} className="rounded-lg border border-[#D8E0EC] p-2 text-sm sm:col-span-2" />
              <div className="flex gap-2 sm:col-span-2 pt-2">
                <button onClick={handleCheckIn} disabled={mutation.isPending} className="flex-1 rounded-lg bg-[#071D49] py-2 text-sm font-black text-white">
                  {mutation.isPending ? "Saving..." : "Check In & Print Pass"}
                </button>
                <button className="flex-1 rounded-lg border border-[#D8E0EC] bg-white py-2 text-sm font-bold text-[#071D49]">Save Without Printing</button>
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
                        <button onClick={() => handleCheckOut(r.id)} className="text-blue-600 hover:underline font-semibold text-xs">Check Out</button>
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
        <button className="rounded-lg border border-[#D8E0EC] px-4 py-2 text-sm font-bold text-[#071D49]">Export Filtered</button>
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
                    <button className="text-blue-600 hover:underline font-semibold text-xs mr-3">Check Out</button>
                  ) : (
                    <span className="text-xs text-[#64748B] mr-3">Done</span>
                  )}
                  <button className="p-1 text-[#64748B] hover:bg-[#D8E0EC] rounded"><MoreHorizontal className="w-4 h-4" /></button>
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
  return (
    <Panel title="Expected Visitors" description="Visitors scheduled by Admin or Secretary." icon={Calendar} actions={
      <button className="rounded-lg border border-[#D8E0EC] px-4 py-2 text-sm font-bold text-[#071D49]">Add Expected Visitor</button>
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
            <tr className="hover:bg-[#F8FAFC]">
              <td className="px-4 py-3 text-[#64748B]">10:00 AM</td>
              <td className="px-4 py-3 font-semibold text-[#071D49]">Alice Mwangi</td>
              <td className="px-4 py-3 text-[#64748B]">Principal</td>
              <td className="px-4 py-3"><StatusChip label="Pending" tone="neutral" /></td>
              <td className="px-4 py-3 text-right">
                <button className="text-emerald-600 hover:underline font-semibold text-xs mr-3">Check In Now</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function GatePassesWorkspace() {
  return (
    <Panel title="Student Gate Passes" description="Verify approved student gate passes." icon={Ticket} actions={
      <button className="rounded-lg border border-[#D8E0EC] px-4 py-2 text-sm font-bold text-[#071D49]">Export List</button>
    }>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Student</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Class</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Reason</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            <tr className="hover:bg-[#F8FAFC]">
              <td className="px-4 py-3 font-semibold text-[#071D49]">John Doe</td>
              <td className="px-4 py-3 text-[#64748B]">Form 2</td>
              <td className="px-4 py-3 text-[#64748B]">Medical</td>
              <td className="px-4 py-3"><StatusChip label="Approved" tone="success" /></td>
              <td className="px-4 py-3 text-right">
                <button className="text-blue-600 hover:underline font-semibold text-xs mr-3">Verify Pass</button>
                <button className="text-emerald-600 hover:underline font-semibold text-xs">Record Exit</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function LateArrivalsWorkspace() {
  return (
    <Panel title="Late Arrivals" description="Records students who arrive late to school." icon={ClockAlert} actions={
      <button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white">Record Late Arrival</button>
    }>
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
            <tr className="hover:bg-[#F8FAFC]">
              <td className="px-4 py-3 text-[#64748B]">08:30 AM</td>
              <td className="px-4 py-3 font-semibold text-[#071D49]">Mike Omondi</td>
              <td className="px-4 py-3 text-[#64748B]">Transport Delay</td>
              <td className="px-4 py-3 text-[#64748B]">Allowed to Class</td>
              <td className="px-4 py-3 text-right">
                <button className="text-blue-600 hover:underline font-semibold text-xs">Notify Parent</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function EarlyDeparturesWorkspace() {
  return (
    <Panel title="Early Departures" description="Records students leaving before normal closing time." icon={LogOut} actions={
      <button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white">Record Early Departure</button>
    }>
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
            <tr className="hover:bg-[#F8FAFC]">
              <td className="px-4 py-3 text-[#64748B]">11:00 AM</td>
              <td className="px-4 py-3 font-semibold text-[#071D49]">Sarah Lee</td>
              <td className="px-4 py-3 text-[#64748B]">Medical</td>
              <td className="px-4 py-3"><StatusChip label="Awaiting Return" tone="warning" /></td>
              <td className="px-4 py-3 text-right">
                <button className="text-emerald-600 hover:underline font-semibold text-xs">Record Return</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function StaffMovementWorkspace() {
  return (
    <Panel title="Staff Movement" description="Tracks staff entry and exit." icon={Users} actions={
      <div className="flex gap-2">
        <button className="rounded-lg border border-[#D8E0EC] px-4 py-2 text-sm font-bold text-[#071D49]">Record Entry</button>
        <button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white">Record Exit</button>
      </div>
    }>
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
            <tr className="hover:bg-[#F8FAFC]">
              <td className="px-4 py-3 text-[#64748B]">10:30 AM</td>
              <td className="px-4 py-3 font-semibold text-[#071D49]">Mr. Kamau</td>
              <td className="px-4 py-3 text-[#64748B]">Exit</td>
              <td className="px-4 py-3"><StatusChip label="Out" tone="warning" /></td>
              <td className="px-4 py-3 text-right">
                <button className="text-emerald-600 hover:underline font-semibold text-xs">Record Return</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function VehicleLogWorkspace() {
  return (
    <Panel title="Vehicle Log" description="Records vehicles entering and leaving school compound." icon={Car} actions={
      <button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white">Record Vehicle Entry</button>
    }>
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
            <tr className="hover:bg-[#F8FAFC]">
              <td className="px-4 py-3 text-[#64748B]">07:45 AM</td>
              <td className="px-4 py-3 font-semibold text-[#071D49]">KCD 123X</td>
              <td className="px-4 py-3 text-[#64748B]">Delivery Van</td>
              <td className="px-4 py-3"><StatusChip label="Inside" tone="warning" /></td>
              <td className="px-4 py-3 text-right">
                <button className="text-emerald-600 hover:underline font-semibold text-xs mr-3">Record Exit</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function DeliveriesWorkspace() {
  return (
    <Panel title="Deliveries & Parcels" description="Tracks parcels, supplies, exam materials." icon={Package} actions={
      <button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white">Record Delivery</button>
    }>
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
            <tr className="hover:bg-[#F8FAFC]">
              <td className="px-4 py-3 text-[#64748B]">09:00 AM</td>
              <td className="px-4 py-3 font-semibold text-[#071D49]">Office Document</td>
              <td className="px-4 py-3 text-[#64748B]">Principal</td>
              <td className="px-4 py-3"><StatusChip label="Pending" tone="warning" /></td>
              <td className="px-4 py-3 text-right">
                <button className="text-blue-600 hover:underline font-semibold text-xs mr-3">Notify Recipient</button>
                <button className="text-emerald-600 hover:underline font-semibold text-xs">Mark Collected</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function IncidentsWorkspace() {
  return (
    <Panel title="Incidents & Emergencies" description="Record gate-related incidents." icon={AlertTriangle} actions={
      <div className="flex gap-2">
        <button className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-black text-white">Send Emergency Alert</button>
        <button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white">Report Incident</button>
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
            <tr className="hover:bg-[#F8FAFC]">
              <td className="px-4 py-3 text-[#64748B]">Yesterday</td>
              <td className="px-4 py-3"><StatusChip label="High" tone="danger" /></td>
              <td className="px-4 py-3 font-semibold text-[#071D49]">Suspicious Vehicle</td>
              <td className="px-4 py-3"><StatusChip label="Open" tone="warning" /></td>
              <td className="px-4 py-3 text-right">
                <button className="text-blue-600 hover:underline font-semibold text-xs mr-3">Escalate</button>
                <button className="text-blue-600 hover:underline font-semibold text-xs">View</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function WatchlistWorkspace() {
  return (
    <Panel title="Watchlist" description="Warnings for blocked or suspicious persons/vehicles." icon={ShieldAlert} actions={
      <button className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-black text-white">Add Entry</button>
    }>
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
            <tr className="hover:bg-[#F8FAFC]">
              <td className="px-4 py-3 font-semibold text-[#071D49]">KBC 999Z</td>
              <td className="px-4 py-3 text-[#64748B]">Vehicle</td>
              <td className="px-4 py-3 text-[#64748B]">Deny Entry</td>
              <td className="px-4 py-3"><StatusChip label="Critical" tone="danger" /></td>
              <td className="px-4 py-3 text-right">
                <button className="text-blue-600 hover:underline font-semibold text-xs">View</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function FrequentVisitorsWorkspace() {
  return (
    <Panel title="Frequent Visitors" description="Repeat visitors for quick check-in." icon={UsersRound} actions={
      <button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white">Add Visitor</button>
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
                <button className="text-emerald-600 hover:underline font-semibold text-xs mr-3">Quick Check In</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function LostFoundWorkspace() {
  return (
    <Panel title="Lost & Found" description="Record lost items found at the gate." icon={Search} actions={
      <button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white">Record Item</button>
    }>
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
            <tr className="hover:bg-[#F8FAFC]">
              <td className="px-4 py-3 text-[#64748B]">Yesterday</td>
              <td className="px-4 py-3 font-semibold text-[#071D49]">School ID Card</td>
              <td className="px-4 py-3"><StatusChip label="Found" tone="warning" /></td>
              <td className="px-4 py-3 text-right">
                <button className="text-emerald-600 hover:underline font-semibold text-xs">Mark Claimed</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function BoardingMovementWorkspace() {
  return (
    <Panel title="Boarding Gate Movement" description="Tracks boarders entering or leaving." icon={Home} actions={
      <div className="flex gap-2">
        <button className="rounded-lg border border-[#D8E0EC] px-4 py-2 text-sm font-bold text-[#071D49]">Verify Pass</button>
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
            <tr className="hover:bg-[#F8FAFC]">
              <td className="px-4 py-3 font-semibold text-[#071D49]">Peter Ochieng</td>
              <td className="px-4 py-3 text-[#64748B]">Weekend Leave</td>
              <td className="px-4 py-3"><StatusChip label="Out" tone="warning" /></td>
              <td className="px-4 py-3 text-right">
                <button className="text-emerald-600 hover:underline font-semibold text-xs mr-3">Record Return</button>
                <button className="text-rose-600 hover:underline font-semibold text-xs">Notify Master</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function TransportClearanceWorkspace() {
  return (
    <Panel title="Transport Gate Clearance" description="Confirm bus departure/arrival at the gate." icon={Bus} actions={
      <div className="flex gap-2">
        <button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white">Record Departure</button>
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
            <tr className="hover:bg-[#F8FAFC]">
              <td className="px-4 py-3 font-semibold text-[#071D49]">Bus 1</td>
              <td className="px-4 py-3 text-[#64748B]">Route A</td>
              <td className="px-4 py-3"><StatusChip label="Departed" tone="success" /></td>
              <td className="px-4 py-3 text-right">
                <button className="text-blue-600 hover:underline font-semibold text-xs mr-3">Record Arrival</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function ReportsWorkspace() {
  return (
    <Panel title="Reports & Downloads" description="Printable gate records and summaries." icon={PieChart}>
      <div className="grid gap-4 md:grid-cols-3">
        {["Daily Visitor Register", "Late Arrival Report", "Incident Report", "Vehicle Movement Report", "Shift Handover Report"].map(r => (
          <button key={r} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 text-left font-bold text-[#071D49] hover:border-[#071D49] transition">{r}</button>
        ))}
      </div>
    </Panel>
  );
}

function NotificationsWorkspace() {
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
            <tr className="hover:bg-[#F8FAFC]">
              <td className="px-4 py-3 text-[#64748B]">10 mins ago</td>
              <td className="px-4 py-3 font-semibold text-[#071D49]">Principal approved gate pass for John Doe.</td>
              <td className="px-4 py-3 text-right">
                <button className="text-blue-600 hover:underline font-semibold text-xs">Mark Read</button>
              </td>
            </tr>
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

  return (
    <div className="flex min-h-screen bg-[#F3F6FA] font-sans">
      <aside className="hidden h-screen w-[260px] overflow-y-auto bg-[#071D49] p-4 text-white shadow-[0_24px_70px_rgba(7,29,73,0.28)] lg:block shrink-0">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-6">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100/70">MyShule</p>
          <h2 className="mt-2 text-xl font-black">Security</h2>
          <p className="mt-2 text-sm leading-6 text-white/65">Gate & Safety HQ</p>
        </div>
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
      <main className="flex-1 min-w-0 flex flex-col h-screen">
        <header className="sticky top-0 z-20 border-b border-[#D8E0EC] bg-white/90 px-4 py-3 backdrop-blur shrink-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#071D49] text-xs font-black text-white shrink-0">SO</div>
              <h1 className="text-lg font-black text-[#071D49] truncate">{navItems.find(i => i.id === activeView)?.label || "Dashboard"}</h1>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <StatusChip label="Term 2 (2026)" tone="info" />
              <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#071D49] text-white">
                <Search className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2">
                <TaskQueue />
                <ApprovalInbox currentUserId="school" />
                <NotificationBell />
              </div>
            </div>
          </div>
          <div className="mt-3 lg:hidden">
            <select
              className="h-10 w-full rounded-xl border border-[#D8E0EC] bg-white px-3 text-sm font-bold text-[#071D49] outline-none"
              value={activeView}
              onChange={(e) => setActiveView(e.target.value as ViewId)}
            >
              {navItems.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
          {activeView === "overview" && <OverviewWorkspace onNavigate={setActiveView} />}
          {activeView === "shift" && <ShiftWorkspace />}
          {activeView === "check-in" && <CheckInWorkspace />}
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
          {activeView === "frequent-visitors" && <FrequentVisitorsWorkspace />}
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
