
"use client";

import { useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BusFront,
  CarFront,
  CheckCircle2,
  ClipboardList,
  Fuel,
  Gauge,
  IdCard,
  LayoutDashboard,
  Map,
  MapPin,
  MessageSquareText,
  RadioTower,
  Route,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  UserCheck,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { ApprovalInbox } from "@/components/shared/approval-inbox";
import { NotificationBell } from "@/components/shared/notification-bell";
import { TaskQueue } from "@/components/shared/task-queue";
import { WorkflowToast } from "@/components/shared/workflow-toast";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { usePermissions } from "@/components/providers/permission-context";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { buildSchoolSectionHref } from "./school-pages";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { toast } from "sonner";

type TransportRouteMode = "hosted" | "public";
type Tone = "success" | "info" | "warning" | "danger" | "neutral";
type TransportView =
  | "overview"
  | "fleet"
  | "routes"
  | "allocation"
  | "drivers"
  | "fuel"
  | "maintenance"
  | "trips"
  | "attendance"
  | "gps"
  | "notifications"
  | "incidents"
  | "compliance"
  | "reports"
  | "settings";

type NavItem = {
  id: TransportView;
  label: string;
  icon: LucideIcon;
  group: string;
};

type Kpi = {
  label: string;
  value: string;
  helper: string;
  trend: string;
  tone: Tone;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { id: "overview", label: "Dashboard Overview", icon: LayoutDashboard, group: "Command" },
  { id: "fleet", label: "Fleet Management", icon: BusFront, group: "Fleet" },
  { id: "routes", label: "Routes & Stops", icon: Route, group: "Fleet" },
  { id: "allocation", label: "Student Transport Allocation", icon: Users, group: "Students" },
  { id: "drivers", label: "Driver Management", icon: IdCard, group: "People" },
  { id: "fuel", label: "Fuel Management", icon: Fuel, group: "Operations" },
  { id: "maintenance", label: "Maintenance & Repairs", icon: Wrench, group: "Operations" },
  { id: "trips", label: "Trip Monitoring", icon: RadioTower, group: "Live Monitoring" },
  { id: "attendance", label: "Transport Attendance", icon: UserCheck, group: "Live Monitoring" },
  { id: "gps", label: "GPS Tracking", icon: Map, group: "Live Monitoring" },
  { id: "notifications", label: "Parent Notifications", icon: MessageSquareText, group: "Communication" },
  { id: "incidents", label: "Incident Reports", icon: ShieldAlert, group: "Risk" },
  { id: "compliance", label: "Compliance & Insurance", icon: ShieldCheck, group: "Risk" },
  { id: "reports", label: "Reports & Analytics", icon: ClipboardList, group: "Administration" },
  { id: "settings", label: "Settings", icon: Settings, group: "Administration" },
];

const transportSearchRecords = [
  { id: "vehicle-bus-04", label: "Bus 04", detail: "Kisumu West route | Mr. Omondi | Active", view: "fleet" },
  { id: "route-mamboleo", label: "Mamboleo route", detail: "Bus 11 delayed | 48 students", view: "routes" },
  { id: "student-brian-transport", label: "Brian Otieno", detail: "Bus 04 | Kibuye stage | Pending drop-off", view: "attendance" },
  { id: "fuel-bus-11", label: "Bus 11 fuel alert", detail: "Highest consumption this month", view: "fuel" },
  { id: "incident-van-03", label: "Van 03 steering fault", detail: "Urgent maintenance case", view: "maintenance" },
] satisfies Array<{ id: string; label: string; detail: string; view: TransportView }>;

type TransportSearchRecord = (typeof transportSearchRecords)[number];
type TransportActionHandler = (message: string) => void;

const toneClasses: Record<Tone, { chip: string; card: string; dot: string; text: string; rail: string }> = {
  success: {
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    card: "border-emerald-200 bg-emerald-50/80 text-emerald-950",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    rail: "bg-emerald-500",
  },
  info: {
    chip: "border-blue-200 bg-blue-50 text-blue-700",
    card: "border-blue-200 bg-blue-50/80 text-blue-950",
    dot: "bg-blue-500",
    text: "text-blue-700",
    rail: "bg-blue-500",
  },
  warning: {
    chip: "border-amber-200 bg-amber-50 text-amber-700",
    card: "border-amber-200 bg-amber-50/85 text-amber-950",
    dot: "bg-amber-500",
    text: "text-amber-700",
    rail: "bg-amber-500",
  },
  danger: {
    chip: "border-rose-200 bg-rose-50 text-rose-700",
    card: "border-rose-200 bg-rose-50/85 text-rose-950",
    dot: "bg-rose-500",
    text: "text-rose-700",
    rail: "bg-rose-500",
  },
  neutral: {
    chip: "border-slate-200 bg-slate-50 text-slate-700",
    card: "border-slate-200 bg-white/88 text-[#071D49]",
    dot: "bg-slate-400",
    text: "text-slate-600",
    rail: "bg-slate-400",
  },
};

const overviewKpis: Kpi[] = [
  { label: "Active Vehicles", value: "18", helper: "15 on route, 3 loading", trend: "+2 vs yesterday", tone: "success", icon: BusFront },
  { label: "Students Using Transport", value: "642", helper: "Across 12 routes", trend: "96% allocated", tone: "info", icon: Users },
  { label: "Trips Completed Today", value: "31", helper: "Morning pickup closed", trend: "4 live", tone: "success", icon: CheckCircle2 },
  { label: "Vehicles Under Maintenance", value: "3", helper: "1 urgent brake check", trend: "safety hold", tone: "warning", icon: Wrench },
];

const routeRows = [
  ["Bus 04", "Kisumu West", "Mr. Omondi", "On route", "7 min", "72", "success"],
  ["Bus 11", "Mamboleo", "Ms. Akinyi", "Minor delay", "14 min", "48", "warning"],
  ["Bus 02", "Milimani", "Mr. Karanja", "At gate", "Arrived", "100", "success"],
  ["Van 03", "Emergency shuttle", "Driver absent", "Unassigned", "Hold", "18", "danger"],
] as const;

const vehicleRows = [
  ["KDA 214B", "Bus 04", "52", "Mr. Omondi", "Kisumu West", "Active", "12 Aug 2026", "03 Jun 2026", "success"],
  ["KCF 902L", "Bus 11", "48", "Ms. Akinyi", "Mamboleo", "Delayed", "29 May 2026", "11 Jun 2026", "warning"],
  ["KDM 774P", "Bus 02", "60", "Mr. Karanja", "Milimani", "Active", "18 Sep 2026", "07 Jun 2026", "success"],
  ["KCG 118R", "Van 03", "14", "Unassigned", "Emergency", "In Maintenance", "Expired", "Overdue", "danger"],
] as const;

const students = [
  ["Brian Otieno", "ADM-2041", "Kisumu West", "Kibuye stage", "Bus 04", "0712 444 201", "Paid"],
  ["Aisha Njeri", "ADM-2077", "Mamboleo", "Nyamasaria", "Bus 11", "0790 221 889", "Cleared"],
  ["Kevin Mwangi", "ADM-2132", "Milimani", "Mega City", "Bus 02", "0704 882 110", "Arrears"],
] as const;

const fuelRows = [
  ["Bus 04", "42 L", "KES 8,610", "Total Energies", "Today 06:10", "Storekeeper"],
  ["Bus 11", "38 L", "KES 7,790", "Shell Mamboleo", "Yesterday", "Driver Akinyi"],
  ["Bus 02", "56 L", "KES 11,480", "Rubis", "Mon", "Transport Manager"],
] as const;

const incidents = [
  ["Today", "Bus 11", "Ms. Akinyi", "Delay", "Medium", "Follow-up"],
  ["Yesterday", "Van 03", "Unassigned", "Breakdown", "High", "Open"],
  ["18 May", "Bus 04", "Mr. Omondi", "Student issue", "Low", "Closed"],
] as const;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getViewLabel(view: TransportView) {
  return navItems.find((item) => item.id === view)?.label ?? "Transport workspace";
}

function StatusChip({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black", toneClasses[tone].chip)}>
      <span className={cn("h-2 w-2 rounded-full", toneClasses[tone].dot)} />
      {label}
    </span>
  );
}

function ShellButton({
  item,
  activeView,
  onViewChange,
}: {
  item: NavItem;
  activeView: TransportView;
  onViewChange: (view: TransportView) => void;
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={() => onViewChange(item.id)}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-white/72 transition hover:bg-white/10 hover:text-white",
        activeView === item.id && "bg-white/14 text-white shadow-[inset_4px_0_0_#38BDF8]",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {item.label}
    </button>
  );
}

function Sidebar({
  activeView,
  onViewChange,
}: {
  activeView: TransportView;
  onViewChange: (view: TransportView) => void;
}) {
  return (
    <aside className="hidden h-[calc(100vh-1.5rem)] overflow-hidden rounded-2xl bg-[#071D49] p-4 text-white shadow-[0_24px_70px_rgba(7,29,73,0.28)] lg:block">
      <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100/70">MyShule ERP</p>
        <h2 className="mt-2 text-xl font-black">Transport Module</h2>
        <p className="mt-2 text-sm leading-6 text-white/65">Fleet, routes, safety, and parent communication.</p>
      </div>
      <nav className="mt-4 h-[calc(100%-8.5rem)] space-y-1 overflow-y-auto pr-1" aria-label="Transport manager navigation">
        {navItems.map((item, index) => {
          const showGroup = item.group !== navItems[index - 1]?.group;

          return (
            <div key={`${item.group}-${item.label}`}>
              {showGroup ? <p className="px-3 pb-2 pt-4 text-[11px] font-black uppercase tracking-[0.2em] text-white/45">{item.group}</p> : null}
              <ShellButton item={item} activeView={activeView} onViewChange={onViewChange} />
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
  activeView: TransportView;
  searchTerm: string;
  searchResults: typeof transportSearchRecords;
  onSearchTermChange: (value: string) => void;
  onSearchResult: (record: TransportSearchRecord) => void;
  onViewChange: (view: TransportView) => void;
}) {
  const today = "Today";

  return (
    <header className="sticky top-0 z-20 border-b border-[#D8E0EC] bg-[#F3F6FA]/92 px-4 py-3 backdrop-blur">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#071D49] text-sm font-black text-white">MS</div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#64748B]">Term 2 - Transport live</p>
            <h1 className="text-xl font-black text-[#071D49]">Transport Workspace</h1>
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-[minmax(240px,1fr)_auto_auto_auto_auto] xl:min-w-[760px]">
          <div className="relative">
            <label className="flex min-h-11 items-center gap-3 rounded-xl border border-[#D8E0EC] bg-white/88 px-3 text-[#64748B] shadow-sm">
              <Search className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Global transport search</span>
              <input
                value={searchTerm}
                onChange={(event) => onSearchTermChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && searchResults[0]) {
                    event.preventDefault();
                    onSearchResult(searchResults[0]);
                  }
                }}
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[#94A3B8]"
                placeholder="Search vehicles, routes, students, drivers, or incidents"
              />
            </label>
            {searchTerm.trim() ? (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-xl border border-[#D8E0EC] bg-white p-2 shadow-xl">
                {searchResults.length > 0 ? (
                  searchResults.map((record) => (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => onSearchResult(record)}
                      className="w-full rounded-lg px-3 py-2 text-left transition hover:bg-[#F3F6FA]"
                    >
                      <span className="block text-sm font-black text-[#071D49]">{record.label}</span>
                      <span className="mt-0.5 block text-xs font-semibold text-[#64748B]">{record.detail}</span>
                    </button>
                  ))
                ) : (
                  <p className="rounded-lg px-3 py-3 text-sm font-semibold text-[#64748B]">No transport records found.</p>
                )}
              </div>
            ) : null}
          </div>
          <StatusChip label="Operations normal" tone="success" />
          <StatusChip label={today} tone="neutral" />
          <div className="flex items-center gap-2">
            <TaskQueue />
            <ApprovalInbox currentUserId="school" />
            <NotificationBell />
          </div>
          <button type="button" onClick={() => onViewChange("incidents")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#FF7A1A] px-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(255,122,26,0.25)]">
            Quick actions
          </button>
        </div>
      </div>
      <div className="mt-3 lg:hidden">
        <label className="sr-only" htmlFor="transport-mobile-workspace">Transport workspace</label>
        <select
          id="transport-mobile-workspace"
          className="h-11 w-full rounded-xl border border-[#D8E0EC] bg-white px-3 text-sm font-black text-[#071D49] outline-none"
          onChange={(event) => onViewChange(event.target.value as TransportView)}
          value={activeView}
        >
          {navItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
    </header>
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
    <section className="rounded-2xl border border-[#D8E0EC] bg-white/82 p-5 shadow-[0_18px_50px_rgba(7,29,73,0.08)]">
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
        {actions}
      </div>
      {children}
    </section>
  );
}

function KpiGrid({ items }: { items: Kpi[] }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <article key={item.label} className={cn("rounded-2xl border p-4 shadow-sm", toneClasses[item.tone].card)}>
            <div className="flex items-start justify-between gap-3">
              <Icon className="h-5 w-5" aria-hidden="true" />
              <StatusChip label={item.trend} tone={item.tone} />
            </div>
            <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] opacity-70">{item.label}</p>
            <p className="mt-2 text-3xl font-black">{item.value}</p>
            <p className="mt-1 text-sm font-semibold opacity-75">{item.helper}</p>
          </article>
        );
      })}
    </section>
  );
}

function ProgressBar({ value, tone = "info" }: { value: string; tone?: Tone }) {
  return (
    <div className="h-2 rounded-full bg-[#E2E8F0]">
      <div className={cn("h-full rounded-full", toneClasses[tone].rail)} style={{ width: `${Math.max(8, Math.min(100, Number(value)))}%` }} />
    </div>
  );
}

function DataTable({
  title,
  rows,
  columns,
  onAction,
}: {
  title: string;
  rows: ReadonlyArray<readonly string[]>;
  columns: string[];
  onAction: TransportActionHandler;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#D8E0EC] bg-white/80">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D8E0EC] bg-[#F8FAFC] px-4 py-3">
        <h3 className="text-sm font-black uppercase tracking-[0.14em] text-[#071D49]">{title}</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onAction(`${title} filters ready.`)}
            className="rounded-lg border border-[#D8E0EC] px-3 py-1.5 text-xs font-black text-[#071D49]"
          >
            Filters
          </button>
          <button
            type="button"
            onClick={() => onAction(`${title} exported to CSV for transport records.`)}
            className="rounded-lg border border-[#D8E0EC] px-3 py-1.5 text-xs font-black text-[#071D49]"
          >
            Export
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="sticky top-0 bg-[#EEF5FF] text-xs uppercase tracking-[0.12em] text-[#64748B]">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3 font-black">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {rows.map((row) => (
              <tr key={row.join("-")} className="transition hover:bg-[#F8FAFC]">
                {row.map((cell, index) => (
                  <td key={`${row[0]}-${columns[index]}`} className="px-4 py-3 font-semibold text-[#334155]">
                    {index === row.length - 1 && ["success", "warning", "danger", "info"].includes(cell)
                      ? <StatusChip label={row[index - 3] ?? "Status"} tone={cell as Tone} />
                      : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-[#D8E0EC] px-4 py-3 text-xs font-bold text-[#64748B]">
        <span>Showing 1-4 of 24</span>
        <span>Pagination ready</span>
      </div>
    </div>
  );
}

function OverviewWorkspace({ onViewChange }: { onViewChange: (view: TransportView) => void }) {
  const { data: dashboard, isLoading } = useSchoolQuery<any>("/api/transport/dashboard");
  
  const kpis = isLoading || !dashboard ? overviewKpis : [
    { label: "Active Vehicles", value: String(dashboard.active_vehicles), helper: `${dashboard.service_due_vehicles} due for service`, trend: "Active", tone: "success", icon: BusFront },
    { label: "Students Using Transport", value: String(dashboard.active_manifests), helper: "Registered", trend: "Allocated", tone: "info", icon: Users },
    { label: "Trips Completed Today", value: String(dashboard.trips_today), helper: "Daily count", trend: "Live", tone: "success", icon: CheckCircle2 },
    { label: "Alerts Open", value: String(dashboard.open_alerts), helper: "Pending action", trend: "Watch", tone: dashboard.open_alerts > 0 ? "warning" : "neutral", icon: AlertTriangle },
  ];

  const routes = isLoading || !dashboard ? routeRows : (dashboard.routes || []).map((r: any) => [
    r.id, r.name, "Active", r.status, r.zone || "-", String(r.learner_count || 0), "success"
  ]);

  return (
    <>
      <section className="rounded-2xl bg-[linear-gradient(135deg,#071D49_0%,#123A7A_62%,#0F172A_100%)] p-5 text-white shadow-[0_24px_70px_rgba(7,29,73,0.22)]">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100/70">School fleet command center</p>
            <h2 className="mt-3 max-w-4xl text-3xl font-black tracking-[-0.02em] md:text-5xl">Transport Operations Center</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-100/78">
              Live fleet coordination, route reliability, student safety, parent communication, compliance, and operational alerts in one focused workspace where student safety is central.
            </p>
          </div>
          <div className="grid gap-3">
            {["Fuel alerts: 2", "Vehicle alerts: 3", "Emergency indicator: clear"].map((item) => (
              <div key={item} className="rounded-xl border border-white/12 bg-white/10 px-4 py-3 text-sm font-black text-blue-50">{item}</div>
            ))}
          </div>
        </div>
      </section>
      <KpiGrid items={isLoading ? overviewKpis.map(k => ({...k, value: "..."})) as any : kpis as any} />
      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Panel title="Transport status panel" description="Priority-ordered operational alerts for routes, drivers, vehicles, and emergencies." icon={AlertTriangle}>
          <div className="space-y-3">
            {[
              ["Vehicles currently on route", "15 buses are live with GPS heartbeat under 60 seconds.", "success"],
              ["Delayed routes", "Mamboleo is 14 minutes behind because of road works.", "warning"],
              ["Drivers absent today", "Van 03 needs reassignment before evening drop-off.", "danger"],
              ["Vehicles offline", "Bus 09 tracker has not reported for 11 minutes.", "warning"],
            ].map(([title, detail, tone]) => (
              <article key={title} className={cn("rounded-xl border p-4", toneClasses[tone as Tone].card)}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black">{title}</h3>
                    <p className="mt-1 text-sm leading-6 opacity-75">{detail}</p>
                  </div>
                  <StatusChip label="Live" tone={tone as Tone} />
                </div>
              </article>
            ))}
          </div>
        </Panel>
        <Panel title="Live route snapshot" description="Compact route control table with ETA, delay, progress, and driver visibility." icon={Route}>
          <div className="space-y-3">
            {isLoading ? (
              <div className="p-4 text-center text-[#64748B]">Loading routes...</div>
            ) : routes.length === 0 ? (
              <div className="p-4 text-center text-[#64748B]">No active routes today.</div>
            ) : routes.map(([bus, route, driver, status, eta, progress, tone]: any) => (
              <div key={`${bus}-${route}`} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-3">
                <div className="grid gap-3 sm:grid-cols-[90px_minmax(0,1fr)_120px_90px] sm:items-center">
                  <strong className="text-[#071D49]">{bus}</strong>
                  <div>
                    <p className="font-black text-[#071D49]">{route}</p>
                    <p className="text-xs font-semibold text-[#64748B]">{driver} - ETA {eta}</p>
                  </div>
                  <StatusChip label={status} tone={tone as Tone} />
                  <ProgressBar value={progress} tone={tone as Tone} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <Panel title="Today's operations" description="Morning, evening, fuel, and repair indicators without analytics overload." icon={Gauge}>
          <div className="grid gap-3 md:grid-cols-4">
            {[
              ["Morning pickup progress", "96%", "success"],
              ["Evening drop-off progress", "Ready", "info"],
              ["Fuel consumption today", "486 L", "warning"],
              ["Pending repairs", "5", "danger"],
            ].map(([title, value, tone]) => (
              <div key={title} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#64748B]">{title}</p>
                <p className="mt-3 text-2xl font-black text-[#071D49]">{value}</p>
                <ProgressBar value={title.includes("Morning") ? "96" : title.includes("Evening") ? "72" : title.includes("Fuel") ? "64" : "38"} tone={tone as Tone} />
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Quick actions panel" description="Fast transport actions for daily operations." icon={SlidersHorizontal}>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              ["Allocate Student", "allocation"],
              ["Create Route", "routes"],
              ["Schedule Maintenance", "maintenance"],
              ["Send SMS to Parents", "notifications"],
              ["Log Fuel Refill", "fuel"],
            ].map(([label, view]) => (
              <button key={label} type="button" onClick={() => onViewChange(view as TransportView)} className="rounded-xl border border-[#D8E0EC] bg-[#EEF5FF] p-3 text-left text-sm font-black text-[#071D49] transition hover:-translate-y-0.5 hover:shadow-md">
                {label}
              </button>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

function FleetWorkspace({ onAction }: { onAction: TransportActionHandler }) {
  return (
    <>
      <Panel title="Fleet Management" description="Manage all vehicles with search, filters, pagination, export, status badges, and side detail drawers." icon={BusFront}>
        <KpiGrid items={[
          { label: "Fleet Available", value: "Loading...", helper: "...", trend: "...", tone: "success", icon: BusFront },
        ]} />
      </Panel>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title="Vehicle table" description="Vehicle Number, Bus Name, Capacity, Driver, Route, Status, Insurance Expiry, and Next Service Date." icon={ClipboardList}>
          {(() => {
            const { data: dashboard } = useSchoolQuery<any>("/api/transport/dashboard");
            const mappedVehicles = dashboard?.vehicles?.map((v: any) => [
              v.registration_number, v.id, String(v.capacity), v.ownership_type, "-", v.status, v.insurance_expiry_date || "N/A", v.service_due_date || "N/A", v.service_status === "due" ? "danger" : "success"
            ]) || vehicleRows;
            
            return (
              <DataTable
                title="Fleet register"
                columns={["Vehicle Number", "Bus Name", "Capacity", "Driver", "Route", "Status", "Insurance Expiry", "Next Service", "Tone"]}
                rows={mappedVehicles}
                onAction={onAction}
              />
            );
          })()}
        </Panel>
        <Panel title="Vehicle profile drawer" description="Side drawer preserves context while exposing vehicle records." icon={CarFront}>
          <div className="space-y-3">
            {["Overview", "Students", "Maintenance", "Fuel", "Compliance", "Routes"].map((tab) => (
              <div key={tab} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-3">
                <p className="font-black text-[#071D49]">{tab}</p>
                <p className="mt-1 text-sm text-[#64748B]">Vehicle details, assigned students, history, documents, and route evidence.</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

function RoutesWorkspace({ onAction }: { onAction: TransportActionHandler }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
      <Panel title="Routes & Stops" description="Logistics planner for route cards, stop ordering, student assignment, and route optimization." icon={Route}>
        <div className="space-y-3">
          {[
            ["Kisumu West", "Bus 04", "Mr. Omondi", "74 students", "52 min", "Active"],
            ["Mamboleo", "Bus 11", "Ms. Akinyi", "48 students", "61 min", "Delayed"],
            ["Milimani", "Bus 02", "Mr. Karanja", "58 students", "39 min", "Complete"],
          ].map(([route, bus, driver, count, duration, status]) => (
            <article key={route} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-black text-[#071D49]">{route}</h3>
                  <p className="mt-1 text-sm font-semibold text-[#64748B]">{bus} - {driver} - {count}</p>
                  <p className="mt-1 text-xs font-bold text-[#64748B]">Estimated duration: {duration}</p>
                </div>
                <StatusChip label={status} tone={status === "Delayed" ? "warning" : "success"} />
              </div>
            </article>
          ))}
        </div>
      </Panel>
      <Panel title="Map / route panel" description="Google Maps-inspired operational view with stops, pickup order, distance, estimated arrival time, and route path." icon={Map}>
        <div className="relative min-h-[410px] overflow-hidden rounded-2xl border border-[#D8E0EC] bg-[linear-gradient(135deg,#EAF3FF,#F8FAFC)] p-5">
          <div className="absolute inset-x-8 top-1/2 h-2 -translate-y-1/2 rounded-full bg-[#BFDBFE]" />
          {["School", "Kibuye", "Kondele", "Mamboleo", "Nyamasaria"].map((stop, index) => (
            <div key={stop} className="absolute top-[calc(50%-18px)]" style={{ left: `${8 + index * 21}%` }}>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#071D49] text-xs font-black text-white shadow-lg">{index + 1}</span>
              <p className="mt-2 w-24 text-xs font-black text-[#071D49]">{stop}</p>
            </div>
          ))}
          <div className="absolute bottom-5 left-5 right-5 grid gap-3 md:grid-cols-4">
            {["Add stop", "Edit stop", "Assign students", "Optimize route"].map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => onAction(`${action} planning workspace ready.`)}
                className="rounded-xl bg-white/88 px-4 py-3 text-sm font-black text-[#071D49] shadow-sm"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  );
}

function AssignRouteModal({ onClose }: { onClose: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      const data = Object.fromEntries(formData.entries());
      await requestDashboardApi("/api/admin-command/transport/route", {
        method: "POST",
        body: JSON.stringify(data),
      });
      toast.success("Transport assigned successfully");
      onClose();
    } catch (error) {
      toast.error("Failed to assign transport");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Modal title="Assign Route & Vehicle" open={true} onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-bold text-[#071D49] mb-1">Student</label>
          <input required name="student" type="text" className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder="Select student..." />
        </div>
        <div>
          <label className="block text-sm font-bold text-[#071D49] mb-1">Route & Zone</label>
          <select required name="route" className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]">
            <option value="">Select route...</option>
            <option value="kisumu_west">Kisumu West / Mamboleo</option>
            <option value="milimani">Milimani Zone</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-[#071D49] mb-1">Pickup Stop</label>
          <input required name="pickup_stop" type="text" className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder="e.g. Kibuye stage" />
        </div>
        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-[#D8E0EC]">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-bold text-[#64748B]">Cancel</button>
          <button disabled={submitting} type="submit" className="rounded-xl bg-[#071D49] px-6 py-2 text-sm font-black text-white">
            {submitting ? "Saving..." : "Assign Transport"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AllocationWorkspace({ onAction }: { onAction: TransportActionHandler }) {
  const { hasPermission } = usePermissions();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Panel 
        title="Student Transport Allocation" 
        description="Assign routes, pickup stops, vehicles, parent contacts, and payment status from one focused page." 
        icon={Users}
        actions={
          hasPermission('transport:write') ? (
            <Button onClick={() => setIsModalOpen(true)}>Assign Route</Button>
          ) : (
            <span className="text-xs font-bold text-[#64748B]">Restricted</span>
          )
        }
      >
        <DataTable title="Student transport table" columns={["Student Name", "Admission Number", "Route", "Pickup Stop", "Vehicle", "Parent Contact", "Payment Status"]} rows={students} onAction={onAction} />
      </Panel>
      <Panel title="Student side panel" description="Transport history, attendance, parent contacts, route details, and payment history." icon={UserCheck}>
        <div className="space-y-3">
          {["Transport history", "Attendance", "Parent contacts", "Route details", "Payment history"].map((item) => (
            <div key={item} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-3 font-black text-[#071D49]">{item}</div>
          ))}
        </div>
      </Panel>
      
      {isModalOpen && <AssignRouteModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}

function DriversWorkspace() {
  return (
    <Panel title="Driver Management" description="License status, vehicle assignments, phone numbers, attendance, performance scores, and missing-document alerts." icon={IdCard}>
      <div className="grid gap-3 md:grid-cols-3">
        {[
          ["Mr. Omondi", "License valid", "Bus 04", "98% attendance", "success"],
          ["Ms. Akinyi", "License renews in 9 days", "Bus 11", "92% performance", "warning"],
          ["Mr. Otieno", "Missing PSV document", "Standby", "Driver absent", "danger"],
        ].map(([name, license, vehicle, score, tone]) => (
          <article key={name} className={cn("rounded-2xl border p-4", toneClasses[tone as Tone].card)}>
            <h3 className="font-black">{name}</h3>
            <p className="mt-2 text-sm font-semibold opacity-75">{license}</p>
            <p className="mt-1 text-sm font-semibold opacity-75">{vehicle} - {score}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Documents", "Driving history", "Incident reports", "Assigned routes"].map((tab) => <StatusChip key={tab} label={tab} tone={tone as Tone} />)}
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function FuelWorkspace({ onAction }: { onAction: TransportActionHandler }) {
  return (
    <>
      <KpiGrid items={[
        { label: "Fuel consumed this month", value: "6,840 L", helper: "+8% route load", trend: "watch", tone: "warning", icon: Fuel },
        { label: "Highest consuming vehicle", value: "Bus 11", helper: "9.8 L / 10km", trend: "inspect", tone: "danger", icon: BusFront },
        { label: "Monthly fuel cost", value: "KES 1.38M", helper: "Across all buses", trend: "+6%", tone: "info", icon: Gauge },
        { label: "Fuel efficiency", value: "82%", helper: "Fleet average", trend: "stable", tone: "success", icon: CheckCircle2 },
      ]} />
      <Panel title="Fuel Management" description="Fuel costs, refills, station logs, vehicle efficiency, and suspicious consumption alerts." icon={Fuel}>
        <DataTable title="Fuel log table" columns={["Vehicle", "Liters", "Cost", "Station", "Date", "Logged By"]} rows={fuelRows} onAction={onAction} />
      </Panel>
    </>
  );
}

function LogMaintenanceModal({ onClose }: { onClose: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      const data = Object.fromEntries(formData.entries());
      await requestDashboardApi("/api/admin-command/transport/maintenance", {
        method: "POST",
        body: JSON.stringify(data),
      });
      toast.success("Maintenance issue logged successfully");
      onClose();
    } catch (error) {
      toast.error("Failed to log maintenance issue");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Modal title="Log Maintenance Issue" open={true} onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-bold text-[#071D49] mb-1">Vehicle</label>
          <select required name="vehicle" className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]">
            <option value="">Select vehicle...</option>
            <option value="bus04">Bus 04 (KCA 123X)</option>
            <option value="bus11">Bus 11 (KCB 456Y)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-[#071D49] mb-1">Issue Description</label>
          <textarea required name="description" rows={3} className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder="Describe the fault or service needed..."></textarea>
        </div>
        <div>
          <label className="block text-sm font-bold text-[#071D49] mb-1">Priority</label>
          <select required name="priority" className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]">
            <option value="low">Low (Routine)</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical (Do not drive)</option>
          </select>
        </div>
        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-[#D8E0EC]">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-bold text-[#64748B]">Cancel</button>
          <button disabled={submitting} type="submit" className="rounded-xl bg-[#071D49] px-6 py-2 text-sm font-black text-white">
            {submitting ? "Logging..." : "Log Issue"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function MaintenanceWorkspace() {
  const { hasPermission } = usePermissions();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Panel 
        title="Maintenance & Repairs" 
        description="Kanban-style servicing board with service history, downtime, parts, costs, and unsafe vehicle warnings." 
        icon={Wrench}
        actions={
          hasPermission('transport:write') ? (
            <Button onClick={() => setIsModalOpen(true)}>Log Maintenance</Button>
          ) : (
            <span className="text-xs font-bold text-[#64748B]">Restricted</span>
          )
        }
      >
        <div className="grid gap-3 md:grid-cols-4">
          {[
            ["Scheduled", "Bus 02 tire rotation", "Medium", "Mechanic Otis", "Tomorrow", "info"],
            ["In Progress", "Bus 11 brake pads", "High", "Garage B", "Today 4 PM", "warning"],
            ["Completed", "Bus 04 oil service", "Low", "In-house", "Closed", "success"],
            ["Urgent", "Van 03 steering fault", "Critical", "External mechanic", "Blocked", "danger"],
          ].map(([stage, issue, priority, mechanic, eta, tone]) => (
            <article key={stage} className={cn("rounded-2xl border p-4", toneClasses[tone as Tone].card)}>
              <StatusChip label={stage} tone={tone as Tone} />
              <h3 className="mt-3 font-black">{issue}</h3>
              <p className="mt-2 text-sm font-semibold opacity-75">{priority} - {mechanic}</p>
              <p className="mt-1 text-sm font-semibold opacity-75">Estimated completion: {eta}</p>
            </article>
          ))}
        </div>
      </Panel>
      {isModalOpen && <LogMaintenanceModal onClose={() => setIsModalOpen(false)} />}
    </>
  );
}

function TripsWorkspace({ onAction }: { onAction: TransportActionHandler }) {
  return (
    <Panel title="Trip Monitoring" description="Live daily operations for in-progress trips, delayed trips, missed pickups, and emergency incidents." icon={RadioTower}>
      <DataTable title="Live trip table" columns={["Vehicle", "Route", "Driver", "Status", "ETA", "Progress", "Tone"]} rows={routeRows} onAction={onAction} />
    </Panel>
  );
}

function AttendanceWorkspace({ onAction }: { onAction: TransportActionHandler }) {
  return (
    <Panel title="Transport Attendance" description="Boarding and drop-off activity with missed pickup, unauthorized boarding, and unknown passenger alerts." icon={UserCheck}>
      <DataTable
        title="Boarding log"
        columns={["Student", "Vehicle", "Pickup Stop", "Time Boarded", "Time Dropped"]}
        rows={[
          ["Brian Otieno", "Bus 04", "Kibuye stage", "06:42", "Pending"],
          ["Aisha Njeri", "Bus 11", "Nyamasaria", "06:58", "Pending"],
          ["Unknown passenger", "Bus 02", "Mega City", "Blocked", "Security review"],
        ]}
        onAction={onAction}
      />
    </Panel>
  );
}

function GpsWorkspace() {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Panel title="GPS Tracking Center" description="Real-time vehicle positions, route progress, current speed, and estimated arrival." icon={MapPin}>
        <div className="relative min-h-[460px] overflow-hidden rounded-2xl border border-[#D8E0EC] bg-[radial-gradient(circle_at_20%_20%,#DBEAFE,transparent_32%),linear-gradient(135deg,#F8FAFC,#EAF3FF)] p-5">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#64748B]">Main map area</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {["Vehicle markers", "Live movement indicators", "Route overlays"].map((item) => (
              <div key={item} className="rounded-2xl border border-[#BFDBFE] bg-white/82 p-5 text-center font-black text-[#071D49] shadow-sm">{item}</div>
            ))}
          </div>
          <div className="absolute bottom-6 left-6 rounded-2xl bg-[#071D49] px-5 py-4 text-sm font-bold text-white shadow-lg">Bus 04 - 41 km/h - ETA 7 min</div>
        </div>
      </Panel>
      <Panel title="Live status sidebar" description="Active buses, drivers, delay status, route deviations, and emergency indicators." icon={RadioTower}>
        <div className="space-y-3">
          {routeRows.map(([bus, route, driver, status, eta, , tone]) => (
            <div key={bus} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-black text-[#071D49]">{bus}</p>
                  <p className="text-xs font-semibold text-[#64748B]">{route} - {driver} - ETA {eta}</p>
                </div>
                <StatusChip label={status} tone={tone as Tone} />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function NotificationsWorkspace({ onAction }: { onAction: TransportActionHandler }) {
  return (
    <Panel title="Parent Notifications" description="Communication center for bus arriving, bus delayed, emergency alert, route change, and pickup confirmation templates." icon={MessageSquareText}>
      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="grid gap-3">
          {["Bus arriving", "Bus delayed", "Emergency alert", "Route change", "Pickup confirmation"].map((template) => (
            <button
              key={template}
              type="button"
              onClick={() => onAction(`${template} parent SMS template ready for review.`)}
              className="rounded-xl border border-[#D8E0EC] bg-[#EEF5FF] p-4 text-left text-sm font-black text-[#071D49]"
            >
              {template}
            </button>
          ))}
        </div>
        <DataTable
          title="Communication log"
          columns={["Parent", "Student", "Message Type", "Delivery Status", "Timestamp"]}
          rows={[
            ["Mrs. Wanjiku", "Brian Otieno", "Bus delayed", "Delivered", "08:10"],
            ["Mr. Njuguna", "Aisha Njeri", "Pickup confirmation", "Read", "07:20"],
            ["Mrs. Achieng", "Kevin Mwangi", "Emergency alert", "Delivered", "Yesterday"],
          ]}
          onAction={onAction}
        />
      </div>
    </Panel>
  );
}

function IncidentsWorkspace({ onAction }: { onAction: TransportActionHandler }) {
  return (
    <Panel title="Incident Reports" description="Breakdown, accident, student issue, delay, and safety concern records with timeline, photos, actions taken, and follow-up tasks." icon={ShieldAlert}>
      <DataTable title="Incident table" columns={["Date", "Vehicle", "Driver", "Type", "Severity", "Status"]} rows={incidents} onAction={onAction} />
    </Panel>
  );
}

function ComplianceWorkspace() {
  return (
    <Panel title="Compliance & Insurance" description="Insurance expiries, inspection dates, driver license renewals, road permits, and failed inspection warnings." icon={ShieldCheck}>
      <div className="grid gap-3 md:grid-cols-3">
        {[
          ["Expired insurance", "Van 03 has expired cover and is blocked from trips.", "danger"],
          ["Missing permits", "Bus 11 county route permit requires upload.", "warning"],
          ["Driver license renewals", "Two renewals due within 21 days.", "info"],
          ["Vehicle inspections", "18 of 21 vehicles current.", "success"],
        ].map(([title, detail, tone]) => (
          <article key={title} className={cn("rounded-2xl border p-4", toneClasses[tone as Tone].card)}>
            <h3 className="font-black">{title}</h3>
            <p className="mt-2 text-sm font-semibold opacity-75">{detail}</p>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function ReportsWorkspace({ onAction }: { onAction: TransportActionHandler }) {
  return (
    <Panel title="Reports & Analytics" description="Fleet utilization, fuel costs, route efficiency, student transport usage, incident trends, and maintenance costs." icon={ClipboardList}>
      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <p className="text-sm font-black text-[#071D49]">Filters</p>
          <div className="mt-3 grid gap-2">
            {["Date range", "Vehicle", "Route", "Driver", "Export PDF / Excel / CSV"].map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => onAction(`${filter} report option ready.`)}
                className="rounded-xl border border-[#D8E0EC] bg-white px-4 py-3 text-left text-sm font-black text-[#071D49]"
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {["Fleet utilization", "Fuel costs", "Route efficiency", "Student transport usage", "Incident trends", "Maintenance costs"].map((report) => (
            <div key={report} className="rounded-xl border border-[#D8E0EC] bg-[#EEF5FF] p-4 font-black text-[#071D49]">{report}</div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function SettingsWorkspace() {
  return (
    <Panel title="Settings" description="Transport policies, GPS integration, SMS settings, route timing defaults, fuel thresholds, and notification preferences." icon={Settings}>
      <div className="grid gap-3 md:grid-cols-3">
        {["Transport policies", "GPS integration", "SMS settings", "Route timing defaults", "Fuel thresholds", "Notification preferences"].map((item) => (
          <div key={item} className="rounded-2xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
            <p className="font-black text-[#071D49]">{item}</p>
            <p className="mt-2 text-sm leading-6 text-[#64748B]">Configured with audit-ready defaults and role-based approvals.</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ActiveWorkspace({
  activeView,
  onViewChange,
  onAction,
}: {
  activeView: TransportView;
  onViewChange: (view: TransportView) => void;
  onAction: TransportActionHandler;
}) {
  switch (activeView) {
    case "fleet":
      return <FleetWorkspace onAction={onAction} />;
    case "routes":
      return <RoutesWorkspace onAction={onAction} />;
    case "allocation":
      return <AllocationWorkspace onAction={onAction} />;
    case "drivers":
      return <DriversWorkspace />;
    case "fuel":
      return <FuelWorkspace onAction={onAction} />;
    case "maintenance":
      return <MaintenanceWorkspace />;
    case "trips":
      return <TripsWorkspace onAction={onAction} />;
    case "attendance":
      return <AttendanceWorkspace onAction={onAction} />;
    case "gps":
      return <GpsWorkspace />;
    case "notifications":
      return <NotificationsWorkspace onAction={onAction} />;
    case "incidents":
      return <IncidentsWorkspace onAction={onAction} />;
    case "compliance":
      return <ComplianceWorkspace />;
    case "reports":
      return <ReportsWorkspace onAction={onAction} />;
    case "settings":
      return <SettingsWorkspace />;
    default:
      return <OverviewWorkspace onViewChange={onViewChange} />;
  }
}

export function TransportManagerCommandCenter({ routeMode, activeSection }: { routeMode: TransportRouteMode; activeSection?: string }) {
  const [activeView, setActiveView] = useState<TransportView>(
    (activeSection && activeSection !== "dashboard" ? activeSection : "overview") as TransportView
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [notice, setNotice] = useState("Ready for today's transport operations.");
  const searchResults = searchTerm.trim()
    ? transportSearchRecords.filter((record) => `${record.label} ${record.detail}`.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];

  function openView(view: TransportView) {
    setActiveView(view);
    window.history.replaceState(null, "", buildSchoolSectionHref("transport-manager", view, routeMode ?? "hosted"));
    setNotice(`${getViewLabel(view)} workspace ready.`);
  }

  function openSearchRecord(record: TransportSearchRecord) {
    setActiveView(record.view);
    window.history.replaceState(null, "", buildSchoolSectionHref("transport-manager", record.view, routeMode ?? "hosted"));
    setSearchTerm("");
    setNotice(`${record.label} focused in ${getViewLabel(record.view)}.`);
  }

  return (
    <div data-route-mode={routeMode} className="h-screen overflow-hidden bg-[#F3F6FA] text-[#071D49]">
      <div className="grid h-full gap-4 p-3 lg:grid-cols-[292px_minmax(0,1fr)]">
        <Sidebar activeView={activeView} onViewChange={openView} />
        <div className="min-h-0 overflow-hidden rounded-2xl border border-[#D8E0EC] bg-[#F3F6FA] shadow-[0_20px_70px_rgba(7,29,73,0.1)]">
          <Topbar
            activeView={activeView}
            searchTerm={searchTerm}
            searchResults={searchResults}
            onSearchTermChange={setSearchTerm}
            onSearchResult={openSearchRecord}
            onViewChange={openView}
          />
          <main className="h-[calc(100%-84px)] overflow-y-auto p-4">
            <div className="space-y-4">
              <div role="status" className="rounded-xl border border-[#BFDBFE] bg-[#EEF5FF] px-4 py-3 text-sm font-bold text-[#071D49]">
                {notice}
              </div>
              <ActiveWorkspace activeView={activeView} onViewChange={openView} onAction={setNotice} />
            </div>
          </main>
        </div>
      </div>
      
    </div>
  );
}
