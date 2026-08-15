
"use client";

import { useState, type FormEvent, type ReactNode } from "react";
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
import { MyShuleMark } from "@/components/brand/myshule-brand";
import { ApprovalInbox } from "@/components/shared/approval-inbox";
import { MobileWorkspaceNavigation } from "@/components/shared/mobile-workspace-navigation";
import { NotificationBell } from "@/components/shared/notification-bell";
import { TaskQueue } from "@/components/shared/task-queue";
import { IntegratedSchoolCommandHeader, SchoolCommandSidebarIdentity } from "@/components/school/integrated-school-command-header";
import { WorkflowToast } from "@/components/shared/workflow-toast";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { usePermissions } from "@/components/providers/permission-context";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { buildSchoolSectionHref } from "./school-pages";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { downloadCsvFile } from "@/lib/dashboard/export";
import { toast } from "sonner";

type TransportRouteMode = "hosted" | "public";
type Tone = "success" | "info" | "warning" | "danger" | "neutral";
const TRANSPORT_COMPLIANCE_REFERENCE_TIME = Date.now();
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

type TransportSearchRecord = { id: string; label: string; detail: string; view: TransportView };
type TransportActionHandler = (message: string, options?: { kind?: "workflow" | "report"; title?: string }) => void;
type TransportSelectOption = {
  id: string;
  label: string;
  route_id?: string | null;
  class_id?: string | null;
  guardian_contact?: string | null;
  status?: string | null;
};
type TransportAssignmentOptions = {
  routes?: TransportSelectOption[];
  manifests?: TransportSelectOption[];
  students?: TransportSelectOption[];
  stops?: TransportSelectOption[];
  vehicles?: TransportSelectOption[];
};

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

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function asRows<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object" && Array.isArray((value as any).data)) return (value as any).data;
  if (value && typeof value === "object" && Array.isArray((value as any).items)) return (value as any).items;
  return [];
}

function toneFromStatus(value: unknown): Tone {
  const status = String(value ?? "").toLowerCase();
  if (["active", "complete", "completed", "ready", "cleared", "delivered", "read"].includes(status)) return "success";
  if (["delayed", "pending", "scheduled", "in_progress", "maintenance"].includes(status)) return "warning";
  if (["suspended", "retired", "blocked", "critical", "failed", "expired"].includes(status)) return "danger";
  if (["open", "assigned", "on_route"].includes(status)) return "info";
  return "neutral";
}

function dateLabel(value: unknown, fallback = "Not dated") {
  if (!value) return fallback;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}

function moneyLabel(value: unknown) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? `KES ${amount.toLocaleString()}` : "KES 0";
}

function transportActionSlug(message: string) {
  return message
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "") || "workflow.action";
}

async function persistTransportWorkflowAction(message: string) {
  return requestDashboardApi("/api/admin-command/transport-manager/actions", {
    method: "POST",
    body: {
      action: transportActionSlug(message),
      title: "Transport workflow action",
      description: message,
      priority: /emergency|incident|fault|delay|expired|blocked/i.test(message) ? "high" : "normal",
      source: "transport-manager-dashboard",
    },
  });
}

async function generateTransportReport(title: string) {
  return requestDashboardApi("/api/admin-command/transport-manager/reports/generate", {
    method: "POST",
    body: {
      title,
      format: "pdf",
      source: "transport-manager-dashboard",
    },
  });
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
    <aside className="hidden h-[calc(100dvh-1.5rem)] overflow-hidden rounded-2xl bg-[#071D49] p-4 text-white shadow-[0_24px_70px_rgba(7,29,73,0.28)] lg:block">
      <SchoolCommandSidebarIdentity eyebrow="Transport command" title="Transport Manager" subtitle="Fleet, routes, safety, and parent communication" />
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
  searchResults: TransportSearchRecord[];
  onSearchTermChange: (value: string) => void;
  onSearchResult: (record: TransportSearchRecord) => void;
  onViewChange: (view: TransportView) => void;
}) {
  const today = "Today";

  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-[#D8E0EC] bg-[#F3F6FA]/92 px-4 py-3 backdrop-blur">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <MyShuleMark size={44} />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#64748B]">Term 2 - Transport live</p>
            <h1 className="text-xl font-black text-[#071D49]">Transport Workspace</h1>
          </div>
        </div>
        <div className="grid gap-2 lg:grid-cols-[minmax(240px,1fr)_auto_auto_auto_auto] xl:min-w-[760px]">
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
            <ApprovalInbox />
            <NotificationBell />
          </div>
          <button type="button" onClick={() => onViewChange("incidents")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#FF7A1A] px-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(255,122,26,0.25)]">
            Quick actions
          </button>
        </div>
      </div>
      <div className="mt-3 lg:hidden">
        <MobileWorkspaceNavigation
          label="Transport workspace"
          items={navItems}
          value={activeView}
          onValueChange={(value) => onViewChange(value as TransportView)}
          testId="transport-mobile-workspace-nav"
        />
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
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterTerm, setFilterTerm] = useState("");
  const displayedRows = filterTerm.trim()
    ? rows.filter((row) => row.join(" ").toLowerCase().includes(filterTerm.toLowerCase()))
    : rows;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#D8E0EC] bg-white/80">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D8E0EC] bg-[#F8FAFC] px-4 py-3">
        <h3 className="text-sm font-black uppercase tracking-[0.14em] text-[#071D49]">{title}</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsFilterOpen((current) => !current)}
            className="rounded-lg border border-[#D8E0EC] px-3 py-1.5 text-xs font-black text-[#071D49]"
          >
            Filters
          </button>
          <button
            type="button"
            onClick={() => {
              downloadCsvFile({
                filename: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`,
                headers: columns,
                rows: displayedRows.map((row) => [...row]),
              });
              onAction(`${title} CSV file prepared from current transport route records.`);
            }}
            className="rounded-lg border border-[#D8E0EC] px-3 py-1.5 text-xs font-black text-[#071D49]"
          >
            Export
          </button>
        </div>
      </div>
      {isFilterOpen ? (
        <div className="border-b border-[#D8E0EC] bg-white px-4 py-3">
          <label className="text-xs font-black uppercase tracking-[0.12em] text-[#64748B]">
            Filter {title}
            <input
              value={filterTerm}
              onChange={(event) => setFilterTerm(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#D8E0EC] px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-[#071D49]"
              placeholder="Search current rows by vehicle, route, student, status, driver..."
            />
          </label>
          {filterTerm ? (
            <button type="button" className="mt-2 text-xs font-black text-[#1D4ED8] hover:underline" onClick={() => setFilterTerm("")}>
              Clear filter
            </button>
          ) : null}
        </div>
      ) : null}
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
            {displayedRows.map((row) => (
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
            {displayedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6 text-center text-sm font-semibold text-[#64748B]">
                  No transport records match the current filter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-[#D8E0EC] px-4 py-3 text-xs font-bold text-[#64748B]">
        <span>Showing {displayedRows.length} of {rows.length}</span>
        <span>{filterTerm ? "Filtered" : "Ready"}</span>
      </div>
    </div>
  );
}

function OverviewWorkspace({ onViewChange }: { onViewChange: (view: TransportView) => void }) {
  const { data: dashboard, isLoading } = useSchoolQuery<any>("/api/admin-command/transport-manager/overview");
  const { data: routesData } = useSchoolQuery<any>("/api/admin-command/transport-manager/routes");
  const metrics = dashboard?.metrics ?? {};
  
  const kpis = isLoading || !dashboard ? overviewKpis : [
    { label: "Active Vehicles", value: String(metrics.totalVehicles ?? 0), helper: "Tenant fleet records", trend: "Active", tone: "success", icon: BusFront },
    { label: "Registered Drivers", value: String(metrics.totalDrivers ?? 0), helper: "Driver records", trend: "Staffed", tone: "info", icon: Users },
    { label: "Routes Configured", value: String(metrics.totalRoutes ?? 0), helper: "School transport routes", trend: "Configured", tone: "success", icon: Route },
    { label: "Trips Today", value: String(metrics.todayTrips ?? 0), helper: "Daily trip records", trend: "Live", tone: Number(metrics.todayTrips ?? 0) > 0 ? "info" : "neutral", icon: CheckCircle2 },
  ];

  const routes = asRows<any>(routesData).map((r: any) => [
    r.code || r.id?.substring?.(0, 8) || "ROUTE",
    r.route_name || r.name || "Route",
    r.zone || "Zone not set",
    r.status || "active",
    r.direction || "round_trip",
    String(r.learner_count || r.student_count || 0),
    toneFromStatus(r.status || "active")
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
            {[
              `Fleet records: ${metrics.totalVehicles ?? 0}`,
              `Routes configured: ${metrics.totalRoutes ?? 0}`,
              `Trips today: ${metrics.todayTrips ?? 0}`,
            ].map((item) => (
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
              ["Vehicles currently on route", "Live trips and route heartbeats are pulled from tenant transport trip records.", "success"],
              ["Delayed routes", "Any delayed trips should be logged against the affected route for parent notification.", "warning"],
              ["Driver coverage", "Driver assignment gaps should be resolved before opening the next trip.", "info"],
              ["Vehicle safety", "Maintenance and compliance holds block unsafe transport operations.", "warning"],
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
              ["Morning pickup records", String(metrics.todayTrips ?? 0), "success"],
              ["Evening drop-off readiness", String(metrics.totalRoutes ?? 0), "info"],
              ["Fleet records", String(metrics.totalVehicles ?? 0), "warning"],
              ["Driver records", String(metrics.totalDrivers ?? 0), "danger"],
            ].map(([title, value, tone]) => (
              <div key={title} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#64748B]">{title}</p>
                <p className="mt-3 text-2xl font-black text-[#071D49]">{value}</p>
                <ProgressBar value={Number(value) > 0 ? "72" : "8"} tone={tone as Tone} />
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
  const { data: vehiclesData } = useSchoolQuery<any>("/api/admin-command/transport-manager/vehicles");
  const mappedVehicles = asRows<any>(vehiclesData).map((v: any) => [
    v.registration_number || v.plate_number || v.id?.substring?.(0, 8) || "Vehicle",
    v.make || v.model || v.id?.substring?.(0, 8) || "Vehicle record",
    String(v.capacity),
    v.ownership_type,
    v.assigned_driver || "Not assigned",
    v.assigned_route || "Not assigned",
    v.status || "active",
    dateLabel(v.insurance_expiry_date, "Not set"),
    dateLabel(v.service_due_date, "Not set"),
    toneFromStatus(v.service_status || v.status),
  ]);

  return (
    <>
      <Panel title="Fleet Management" description="Manage all vehicles with search, filters, pagination, export, status badges, and side detail drawers." icon={BusFront}>
        <KpiGrid items={[
          { label: "Fleet Available", value: String(mappedVehicles.length), helper: "Tenant vehicles", trend: "Live records", tone: "success", icon: BusFront },
        ]} />
      </Panel>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title="Vehicle table" description="Vehicle Number, Bus Name, Capacity, Driver, Route, Status, Insurance Expiry, and Next Service Date." icon={ClipboardList}>
          <DataTable
            title="Fleet register"
            columns={["Vehicle Number", "Bus Name", "Capacity", "Driver", "Route", "Status", "Insurance Expiry", "Next Service", "Tone"]}
            rows={mappedVehicles}
            onAction={onAction}
          />
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

function RoutesWorkspace({ onViewChange }: { onViewChange: (view: TransportView) => void }) {
  const { data: routesData } = useSchoolQuery<any>("/api/admin-command/transport-manager/routes");
  const routeCards = asRows<any>(routesData);

  function handleRoutePlanningAction(action: string) {
    if (action === "Assign students") {
      onViewChange("allocation");
      return;
    }
    if (action === "Optimize route") {
      onViewChange("reports");
      return;
    }
    onViewChange("routes");
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
      <Panel title="Routes & Stops" description="Logistics planner for route cards, stop ordering, student assignment, and route optimization." icon={Route}>
        <div className="space-y-3">
          {routeCards.map((route: any) => (
            <article key={route.id || route.name} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-black text-[#071D49]">{route.route_name || route.name || "Transport route"}</h3>
                  <p className="mt-1 text-sm font-semibold text-[#64748B]">{route.code || "No code"} - {route.zone || "Zone not set"} - {route.direction || "round trip"}</p>
                  <p className="mt-1 text-xs font-bold text-[#64748B]">Students assigned: {route.learner_count || route.student_count || 0}</p>
                </div>
                <StatusChip label={route.status || "active"} tone={toneFromStatus(route.status || "active")} />
              </div>
            </article>
          ))}
          {routeCards.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#D8E0EC] bg-white p-4 text-sm font-semibold text-[#64748B]">
              No routes have been configured yet. Use Create Route to add the first tenant-scoped transport route.
            </div>
          ) : null}
        </div>
      </Panel>
      <Panel title="Map / route panel" description="Google Maps-inspired operational view with stops, pickup order, distance, estimated arrival time, and route path." icon={Map}>
        <div className="relative min-h-[410px] overflow-hidden rounded-2xl border border-[#D8E0EC] bg-[linear-gradient(135deg,#EAF3FF,#F8FAFC)] p-5">
          <div className="absolute inset-x-8 top-1/2 h-2 -translate-y-1/2 rounded-full bg-[#BFDBFE]" />
          {["School", "Stop 1", "Stop 2", "Stop 3", "Stop 4"].map((stop, index) => (
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
                onClick={() => handleRoutePlanningAction(action)}
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

function AssignRouteModal({ onClose, onAssigned }: { onClose: () => void; onAssigned?: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const { data: optionsData, isLoading: optionsLoading } = useSchoolQuery<TransportAssignmentOptions>("/api/admin-command/transport-manager/assignment-options");
  const routeOptions = optionsData?.routes ?? [];
  const studentOptions = optionsData?.students ?? [];
  const stopOptions = optionsData?.stops ?? [];
  const setupMissing = !optionsLoading && (!routeOptions.length || !studentOptions.length);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      const data = Object.fromEntries(formData.entries());
      const assignment = {
        route_id: String(data.route_id || "").trim(),
        student_id: String(data.student_id || "").trim(),
        pickup_stop_id: String(data.pickup_stop_id || "").trim() || undefined,
        dropoff_stop_id: String(data.dropoff_stop_id || "").trim() || undefined,
        guardian_contact: String(data.guardian_contact || "").trim() || undefined,
        notes: String(data.notes || "").trim() || undefined,
        source_dashboard: "transport-manager-command-center",
      };
      await requestDashboardApi("/admin-command/transport-manager/student-transport-list", {
        method: "POST",
        body: assignment,
      });
      toast.success("Transport assigned successfully");
      onAssigned?.();
      onClose();
    } catch (error) {
      toast.error("Failed to assign transport", {
        description: error instanceof Error ? error.message : "The student transport assignment could not be saved.",
      });
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Modal title="Assign Route & Vehicle" open={true} onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {setupMissing ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
            Add at least one active route and active learner before assigning transport.
          </div>
        ) : null}
        <div>
          <label className="block text-sm font-bold text-[#071D49] mb-1">Route</label>
          <select required name="route_id" disabled={optionsLoading || routeOptions.length === 0} className="w-full rounded-xl border border-[#D8E0EC] bg-white p-3 text-sm outline-none focus:border-[#071D49] disabled:bg-slate-100">
            <option value="">{optionsLoading ? "Loading routes..." : "Select route"}</option>
            {routeOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-[#071D49] mb-1">Learner</label>
          <select required name="student_id" disabled={optionsLoading || studentOptions.length === 0} className="w-full rounded-xl border border-[#D8E0EC] bg-white p-3 text-sm outline-none focus:border-[#071D49] disabled:bg-slate-100">
            <option value="">{optionsLoading ? "Loading learners..." : "Select learner"}</option>
            {studentOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-[#071D49] mb-1">Pickup stop</label>
          <select name="pickup_stop_id" disabled={optionsLoading} className="w-full rounded-xl border border-[#D8E0EC] bg-white p-3 text-sm outline-none focus:border-[#071D49] disabled:bg-slate-100">
            <option value="">{optionsLoading ? "Loading stops..." : "Select pickup stop"}</option>
            {stopOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-[#071D49] mb-1">Drop-off stop</label>
          <select name="dropoff_stop_id" disabled={optionsLoading} className="w-full rounded-xl border border-[#D8E0EC] bg-white p-3 text-sm outline-none focus:border-[#071D49] disabled:bg-slate-100">
            <option value="">{optionsLoading ? "Loading stops..." : "Select drop-off stop"}</option>
            {stopOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-[#071D49] mb-1">Guardian Contact</label>
          <input name="guardian_contact" type="tel" className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder="Parent or guardian phone number" />
        </div>
        <div>
          <label className="block text-sm font-bold text-[#071D49] mb-1">Notes</label>
          <textarea name="notes" rows={3} className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder="Route, pickup instructions, or safety notes"></textarea>
        </div>
        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-[#D8E0EC]">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-bold text-[#64748B]">Cancel</button>
          <button disabled={submitting || setupMissing} type="submit" className="rounded-xl bg-[#071D49] px-6 py-2 text-sm font-black text-white disabled:opacity-60">
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
  const { data: studentTransportData, refetch: refetchStudentTransport } = useSchoolQuery<any>("/api/admin-command/transport-manager/student-transport-list");
  const allocationRows = asRows<any>(studentTransportData).map((assignment: any) => [
    assignment.student_name || assignment.student_id?.substring?.(0, 8) || "Student record",
    assignment.admission_number || assignment.student_id?.substring?.(0, 8) || "Admission not set",
    assignment.route_name || assignment.manifest_id?.substring?.(0, 8) || "Route manifest",
    assignment.pickup_stop_name || assignment.pickup_stop_id?.substring?.(0, 8) || "Pickup not set",
    assignment.vehicle_name || assignment.vehicle_id?.substring?.(0, 8) || "Vehicle not set",
    assignment.guardian_contact || "Guardian contact not set",
    assignment.payment_status || assignment.boarding_status || "active",
  ]);

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
        <DataTable title="Student transport table" columns={["Student Name", "Admission Number", "Route", "Pickup Stop", "Vehicle", "Parent Contact", "Payment Status"]} rows={allocationRows} onAction={onAction} />
      </Panel>
      <Panel title="Student side panel" description="Transport history, attendance, parent contacts, route details, and payment history." icon={UserCheck}>
        <div className="space-y-3">
          {["Transport history", "Attendance", "Parent contacts", "Route details", "Payment history"].map((item) => (
            <div key={item} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-3 font-black text-[#071D49]">{item}</div>
          ))}
        </div>
      </Panel>
      
      {isModalOpen && <AssignRouteModal onClose={() => setIsModalOpen(false)} onAssigned={() => void refetchStudentTransport?.()} />}
    </div>
  );
}

function DriversWorkspace() {
  const { data: driversData } = useSchoolQuery<any>("/api/admin-command/transport-manager/drivers");
  const driverCards = asRows<any>(driversData);

  return (
    <Panel title="Driver Management" description="License status, vehicle assignments, phone numbers, attendance, performance scores, and missing-document alerts." icon={IdCard}>
      <div className="grid gap-3 md:grid-cols-3">
        {driverCards.map((driver: any) => {
          const tone = toneFromStatus(driver.status || "active");
          return (
          <article key={driver.id || driver.user_id || driver.name} className={cn("rounded-2xl border p-4", toneClasses[tone].card)}>
            <h3 className="font-black">{driver.name || driver.display_name || "Driver record"}</h3>
            <p className="mt-2 text-sm font-semibold opacity-75">License: {driver.license_number || "Not recorded"}</p>
            <p className="mt-1 text-sm font-semibold opacity-75">Phone: {driver.phone || "Not recorded"} - {driver.status || "active"}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Documents", "Driving history", "Incident reports", "Assigned routes"].map((tab) => <StatusChip key={tab} label={tab} tone={tone} />)}
            </div>
          </article>
        );})}
        {driverCards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D8E0EC] bg-white p-4 text-sm font-semibold text-[#64748B]">
            No drivers are registered yet. Add driver records before assigning routes.
          </div>
        ) : null}
      </div>
    </Panel>
  );
}

function FuelWorkspace({ onAction }: { onAction: TransportActionHandler }) {
  const { data: fuelMaintenanceData } = useSchoolQuery<any>("/api/admin-command/transport-manager/fuel-maintenance");
  const fuelLogs = asRows<any>(fuelMaintenanceData?.fuelLogs);
  const fuelLogRows = fuelLogs.map((log: any) => [
    log.vehicle_registration || log.vehicle_id?.substring?.(0, 8) || "Vehicle",
    `${log.amount ?? log.litres ?? log.liters ?? 0} L`,
    moneyLabel(log.cost),
    log.station || "Station not recorded",
    dateLabel(log.log_date || log.created_at),
    log.created_by || "Transport team",
  ]);

  return (
    <>
      <KpiGrid items={[
        { label: "Fuel logs", value: String(fuelLogs.length), helper: "Tenant fuel records", trend: "live", tone: "warning", icon: Fuel },
        { label: "Vehicles logged", value: String(new Set(fuelLogs.map((log: any) => log.vehicle_id)).size), helper: "With fuel activity", trend: "inspect", tone: "info", icon: BusFront },
        { label: "Fuel cost captured", value: moneyLabel(fuelLogs.reduce((sum: number, log: any) => sum + Number(log.cost ?? 0), 0)), helper: "Across records", trend: "audit", tone: "info", icon: Gauge },
        { label: "Fuel records ready", value: fuelLogs.length ? "Yes" : "No", helper: "Exportable ledger", trend: "stable", tone: fuelLogs.length ? "success" : "neutral", icon: CheckCircle2 },
      ]} />
      <Panel title="Fuel Management" description="Fuel costs, refills, station logs, vehicle efficiency, and suspicious consumption alerts." icon={Fuel}>
        <DataTable title="Fuel log table" columns={["Vehicle", "Liters", "Cost", "Station", "Date", "Logged By"]} rows={fuelLogRows} onAction={onAction} />
      </Panel>
    </>
  );
}

function LogMaintenanceModal({ onClose }: { onClose: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const { data: optionsData, isLoading: optionsLoading } = useSchoolQuery<TransportAssignmentOptions>("/api/admin-command/transport-manager/assignment-options");
  const vehicleOptions = optionsData?.vehicles ?? [];
  const setupMissing = !optionsLoading && vehicleOptions.length === 0;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      const data = Object.fromEntries(formData.entries());
      const maintenanceLog = {
        vehicle_id: String(data.vehicle_id || "").trim(),
        description: String(data.description || "").trim(),
        priority: String(data.priority || "").trim(),
        cost: String(data.cost || "").trim() || undefined,
        log_date: String(data.log_date || "").trim() || undefined,
        source_dashboard: "transport-manager-command-center",
      };
      await requestDashboardApi("/admin-command/transport-manager/fuel-maintenance/maintenance", {
        method: "POST",
        body: maintenanceLog,
      });
      toast.success("Maintenance issue logged successfully");
      onClose();
    } catch (error) {
      toast.error("Failed to log maintenance issue", {
        description: error instanceof Error ? error.message : "The vehicle maintenance log could not be saved.",
      });
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Modal title="Log Maintenance Issue" open={true} onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {setupMissing ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
            Add a fleet vehicle before logging maintenance.
          </div>
        ) : null}
        <div>
          <label className="block text-sm font-bold text-[#071D49] mb-1">Vehicle</label>
          <select required name="vehicle_id" disabled={optionsLoading || vehicleOptions.length === 0} className="w-full rounded-xl border border-[#D8E0EC] bg-white p-3 text-sm outline-none focus:border-[#071D49] disabled:bg-slate-100">
            <option value="">{optionsLoading ? "Loading vehicles..." : "Select vehicle"}</option>
            {vehicleOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
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
        <div>
          <label className="block text-sm font-bold text-[#071D49] mb-1">Estimated Cost</label>
          <input name="cost" type="number" min="0" step="0.01" className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder="0.00" />
        </div>
        <div>
          <label className="block text-sm font-bold text-[#071D49] mb-1">Log Date</label>
          <input name="log_date" type="date" className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" />
        </div>
        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-[#D8E0EC]">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-bold text-[#64748B]">Cancel</button>
          <button disabled={submitting || setupMissing} type="submit" className="rounded-xl bg-[#071D49] px-6 py-2 text-sm font-black text-white disabled:opacity-60">
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
  const { data: fuelMaintenanceData } = useSchoolQuery<any>("/api/admin-command/transport-manager/fuel-maintenance");
  const maintenanceLogs = asRows<any>(fuelMaintenanceData?.maintenanceLogs);

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
          {maintenanceLogs.map((log: any) => {
            const tone = toneFromStatus(log.status || log.priority || "open");
            return (
            <article key={log.id || log.vehicle_id || log.description} className={cn("rounded-2xl border p-4", toneClasses[tone].card)}>
              <StatusChip label={log.status || log.priority || "open"} tone={tone} />
              <h3 className="mt-3 font-black">{log.description || "Maintenance record"}</h3>
              <p className="mt-2 text-sm font-semibold opacity-75">Vehicle: {log.vehicle_id?.substring?.(0, 8) || "Vehicle not set"}</p>
              <p className="mt-1 text-sm font-semibold opacity-75">Logged: {dateLabel(log.log_date || log.created_at)}</p>
            </article>
          );})}
          {maintenanceLogs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#D8E0EC] bg-white p-4 text-sm font-semibold text-[#64748B]">
              No maintenance records are logged. Use Log Maintenance when a vehicle needs service or safety review.
            </div>
          ) : null}
        </div>
      </Panel>
      {isModalOpen && <LogMaintenanceModal onClose={() => setIsModalOpen(false)} />}
    </>
  );
}

function TripsWorkspace({ onAction }: { onAction: TransportActionHandler }) {
  const { data: tripsData } = useSchoolQuery<any>("/api/admin-command/transport-manager/trips");
  const tripRows = asRows<any>(tripsData).map((trip: any) => [
    trip.vehicle_registration || trip.vehicle_id?.substring?.(0, 8) || "Vehicle",
    trip.route_name || trip.route_id?.substring?.(0, 8) || "Route",
    trip.driver_name || trip.driver_id?.substring?.(0, 8) || "Driver not assigned",
    trip.status || "in_progress",
    trip.actual_end_at ? "Completed" : "Open",
    String(trip.learner_count ?? 0),
    toneFromStatus(trip.status || "in_progress"),
  ]);

  return (
    <Panel title="Trip Monitoring" description="Live daily operations for in-progress trips, delayed trips, missed pickups, and emergency incidents." icon={RadioTower}>
      <DataTable title="Live trip table" columns={["Vehicle", "Route", "Driver", "Status", "ETA", "Progress", "Tone"]} rows={tripRows} onAction={onAction} />
    </Panel>
  );
}

function AttendanceWorkspace({ onAction }: { onAction: TransportActionHandler }) {
  const { data: studentTransportData } = useSchoolQuery<any>("/api/admin-command/transport-manager/student-transport-list");
  const boardingRows = asRows<any>(studentTransportData).map((assignment: any) => [
    assignment.student_name || assignment.student_id?.substring?.(0, 8) || "Student record",
    assignment.vehicle_name || assignment.vehicle_id?.substring?.(0, 8) || "Vehicle not set",
    assignment.pickup_stop_name || assignment.pickup_stop_id?.substring?.(0, 8) || "Pickup not set",
    assignment.boarded_at ? dateLabel(assignment.boarded_at) : assignment.boarding_status || "Not boarded",
    assignment.dropped_at ? dateLabel(assignment.dropped_at) : "Pending",
  ]);

  return (
    <Panel title="Transport Attendance" description="Boarding and drop-off activity with missed pickup, unauthorized boarding, and unknown passenger alerts." icon={UserCheck}>
      <DataTable
        title="Boarding log"
        columns={["Student", "Vehicle", "Pickup Stop", "Time Boarded", "Time Dropped"]}
        rows={boardingRows}
        onAction={onAction}
      />
    </Panel>
  );
}

function GpsWorkspace() {
  const { data: tripsData } = useSchoolQuery<any>("/api/admin-command/transport-manager/trips");
  const liveTrips = asRows<any>(tripsData);

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
          <div className="absolute bottom-6 left-6 rounded-2xl bg-[#071D49] px-5 py-4 text-sm font-bold text-white shadow-lg">{liveTrips.length} live trip record(s) loaded</div>
        </div>
      </Panel>
      <Panel title="Live status sidebar" description="Active buses, drivers, delay status, route deviations, and emergency indicators." icon={RadioTower}>
        <div className="space-y-3">
          {liveTrips.map((trip: any) => {
            const tone = toneFromStatus(trip.status || "in_progress");
            return (
            <div key={trip.id || trip.vehicle_id || trip.route_id} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-black text-[#071D49]">{trip.vehicle_registration || trip.vehicle_id?.substring?.(0, 8) || "Vehicle"}</p>
                  <p className="text-xs font-semibold text-[#64748B]">{trip.route_name || trip.route_id?.substring?.(0, 8) || "Route"} - {trip.driver_name || "Driver not assigned"} - {trip.status || "in_progress"}</p>
                </div>
                <StatusChip label={trip.status || "in_progress"} tone={tone} />
              </div>
            </div>
          );})}
          {liveTrips.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#D8E0EC] bg-white p-3 text-sm font-semibold text-[#64748B]">
              No live trips have been started.
            </div>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}

function ComposeTransportNoticeModal({
  template,
  onClose,
}: {
  template: string;
  onClose: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  async function handleSendTransportNotice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const message = String(form.get("message") ?? "").trim();
    const noticeType = String(form.get("notice_type") ?? "general").trim();
    const priority = String(form.get("priority") ?? "normal").trim();
    const targetRoles = form.getAll("target_roles").map((value) => String(value).trim()).filter(Boolean);
    const channels = form.getAll("channels").map((value) => String(value).trim()).filter(Boolean);

    if (!title || !message || targetRoles.length === 0) {
      toast.error("Title, message, and at least one recipient role are required.");
      return;
    }

    setSubmitting(true);
    try {
      await requestDashboardApi("/api/admin-command/transport-manager/notices", {
        method: "POST",
        body: {
          title,
          message,
          notice_type: noticeType,
          priority,
          target_roles: targetRoles,
          channels: channels.length > 0 ? channels : ["in_app"],
        },
      });
      toast.success("Transport notice sent", {
        description: `Notice queued for ${targetRoles.join(", ")}.`,
      });
      onClose();
    } catch (error) {
      toast.error("Transport notice was not sent", {
        description: error instanceof Error ? error.message : "The transport notice could not be queued.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const defaultMessage =
    template === "Bus delayed"
      ? "The assigned school bus is delayed. We will update you when it reaches the next stop."
      : template === "Bus arriving"
        ? "The school bus is approaching the pickup/drop-off point. Please be ready."
        : template === "Emergency alert"
          ? "Transport emergency alert. The school transport team is handling the situation and will share updates."
          : template === "Route change"
            ? "There is a route change affecting today's school transport movement."
            : "Pickup confirmation has been recorded for the student transport trip.";

  return (
    <Modal title="Send transport notice" open={true} onClose={onClose} size="lg">
      <form onSubmit={handleSendTransportNotice} className="space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold text-[#071D49]">Title
            <input name="title" required defaultValue={template} className="mt-1 w-full rounded-xl border border-[#D8E0EC] px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-bold text-[#071D49]">Notice type
            <select name="notice_type" defaultValue={template.toLowerCase().replace(/[^a-z0-9]+/g, "_")} className="mt-1 w-full rounded-xl border border-[#D8E0EC] px-3 py-2 text-sm">
              <option value="bus_arriving">Bus arriving</option>
              <option value="bus_delayed">Bus delayed</option>
              <option value="emergency_alert">Emergency alert</option>
              <option value="route_change">Route change</option>
              <option value="pickup_confirmation">Pickup confirmation</option>
            </select>
          </label>
        </div>
        <label className="block text-sm font-bold text-[#071D49]">Message
          <textarea name="message" required rows={4} defaultValue={defaultMessage} className="mt-1 w-full rounded-xl border border-[#D8E0EC] px-3 py-2 text-sm" />
        </label>
        <fieldset className="rounded-xl border border-[#D8E0EC] p-3">
          <legend className="px-1 text-sm font-bold text-[#071D49]">Recipients</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {[
              ["parent", "Parents"],
              ["class_teacher", "Class Teachers"],
              ["student", "Students"],
              ["principal", "Principal"],
            ].map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm font-semibold text-[#64748B]">
                <input type="checkbox" name="target_roles" value={value} defaultChecked={value === "parent"} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <fieldset className="rounded-xl border border-[#D8E0EC] p-3">
            <legend className="px-1 text-sm font-bold text-[#071D49]">Channels</legend>
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-[#64748B]"><input type="checkbox" name="channels" value="in_app" defaultChecked /> In-app</label>
              <label className="flex items-center gap-2 text-sm font-semibold text-[#64748B]"><input type="checkbox" name="channels" value="sms" /> SMS queue</label>
            </div>
          </fieldset>
          <label className="text-sm font-bold text-[#071D49]">Priority
            <select name="priority" defaultValue={template === "Emergency alert" ? "high" : "normal"} className="mt-1 w-full rounded-xl border border-[#D8E0EC] px-3 py-2 text-sm">
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#D8E0EC] pt-4">
          <button type="button" className="rounded-xl px-4 py-2 text-sm font-bold text-[#64748B]" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="rounded-xl bg-[#071D49] px-5 py-2 text-sm font-black text-white disabled:opacity-60" disabled={submitting}>
            {submitting ? "Sending..." : "Send Notice"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function NotificationsWorkspace({ onAction }: { onAction: TransportActionHandler }) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  return (
    <>
      <Panel title="Parent Notifications" description="Communication center for bus arriving, bus delayed, emergency alert, route change, and pickup confirmation templates." icon={MessageSquareText}>
        <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="grid gap-3">
            {["Bus arriving", "Bus delayed", "Emergency alert", "Route change", "Pickup confirmation"].map((template) => (
              <button
                key={template}
                type="button"
                onClick={() => setSelectedTemplate(template)}
                className="rounded-xl border border-[#D8E0EC] bg-[#EEF5FF] p-4 text-left text-sm font-black text-[#071D49]"
              >
                {template}
              </button>
            ))}
          </div>
          <DataTable
            title="Communication log"
            columns={["Parent", "Student", "Message Type", "Delivery Status", "Timestamp"]}
            rows={[]}
            onAction={onAction}
          />
        </div>
      </Panel>
      {selectedTemplate ? <ComposeTransportNoticeModal template={selectedTemplate} onClose={() => setSelectedTemplate(null)} /> : null}
    </>
  );
}

function IncidentsWorkspace({ onAction }: { onAction: TransportActionHandler }) {
  return (
    <Panel title="Incident Reports" description="Breakdown, accident, student issue, delay, and safety concern records with timeline, photos, actions taken, and follow-up tasks." icon={ShieldAlert}>
      <DataTable title="Incident table" columns={["Date", "Vehicle", "Driver", "Type", "Severity", "Status"]} rows={[]} onAction={onAction} />
    </Panel>
  );
}

function ComplianceWorkspace() {
  const { data: vehiclesData } = useSchoolQuery<any>("/api/admin-command/transport-manager/vehicles");
  const { data: driversData } = useSchoolQuery<any>("/api/admin-command/transport-manager/drivers");
  const vehicles = asRows<any>(vehiclesData);
  const drivers = asRows<any>(driversData);
  const expiredInsurance = vehicles.filter((vehicle: any) => {
    if (!vehicle.insurance_expiry_date) return false;
    return new Date(String(vehicle.insurance_expiry_date)).getTime() < TRANSPORT_COMPLIANCE_REFERENCE_TIME;
  }).length;
  const missingLicenses = drivers.filter((driver: any) => !driver.license_number).length;

  return (
    <Panel title="Compliance & Insurance" description="Insurance expiries, inspection dates, driver license renewals, road permits, and failed inspection warnings." icon={ShieldCheck}>
      <div className="grid gap-3 md:grid-cols-3">
        {[
          ["Expired insurance", `${expiredInsurance} vehicle record(s) need insurance review.`, expiredInsurance > 0 ? "danger" : "success"],
          ["Missing driver license data", `${missingLicenses} driver record(s) need license details.`, missingLicenses > 0 ? "warning" : "success"],
          ["Driver records", `${drivers.length} transport driver record(s) loaded.`, "info"],
          ["Vehicle inspections", `${vehicles.length} vehicle record(s) available for inspection tracking.`, "success"],
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
  const [activeReportFilter, setActiveReportFilter] = useState("Date range");
  const { data: reportsData } = useSchoolQuery<any>("/api/admin-command/transport-manager/reports");
  const existingReports = asRows<any>(reportsData);

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
                onClick={() => setActiveReportFilter(filter)}
                className={cn(
                  "rounded-xl border px-4 py-3 text-left text-sm font-black",
                  activeReportFilter === filter
                    ? "border-[#071D49] bg-[#EEF5FF] text-[#071D49]"
                    : "border-[#D8E0EC] bg-white text-[#071D49]",
                )}
              >
                {filter}
              </button>
            ))}
          </div>
          <p className="mt-3 rounded-xl border border-[#D8E0EC] bg-white px-4 py-3 text-xs font-bold text-[#64748B]">
            Active filter: {activeReportFilter}. Generated reports include this filter in the report title for audit clarity.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {existingReports.map((report: any) => (
            <button
              key={report.id || report.snapshot_id || report.title}
              type="button"
              onClick={() => onAction(`${report.title || "Transport report"} opened from report snapshots.`, { kind: "workflow" })}
              className="rounded-xl border border-[#D8E0EC] bg-white p-4 text-left font-black text-[#071D49] transition hover:border-[#071D49]"
            >
              {report.title || "Transport report"}
              <span className="mt-1 block text-xs font-semibold text-[#64748B]">{report.status || report.format || "Snapshot"}</span>
            </button>
          ))}
          {["Fleet utilization", "Fuel costs", "Route efficiency", "Student transport usage", "Incident trends", "Maintenance costs"].map((report) => (
            <button
              key={report}
              type="button"
              onClick={() => onAction(`${report} report generated and added to downloads.`, { kind: "report", title: `${report} - ${activeReportFilter}` })}
              className="rounded-xl border border-[#D8E0EC] bg-[#EEF5FF] p-4 text-left font-black text-[#071D49] transition hover:border-[#071D49]"
            >
              {report}
            </button>
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
      return <RoutesWorkspace onViewChange={onViewChange} />;
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
  const { data: searchVehiclesData } = useSchoolQuery<any>("/api/admin-command/transport-manager/vehicles");
  const { data: searchRoutesData } = useSchoolQuery<any>("/api/admin-command/transport-manager/routes");
  const { data: searchStudentTransportData } = useSchoolQuery<any>("/api/admin-command/transport-manager/student-transport-list");
  const transportSearchRecords: TransportSearchRecord[] = [
    ...asRows<any>(searchVehiclesData).slice(0, 8).map((vehicle: any) => ({
      id: `vehicle-${vehicle.id || vehicle.registration_number}`,
      label: vehicle.registration_number || vehicle.plate_number || "Vehicle record",
      detail: `${vehicle.status || "active"} | capacity ${vehicle.capacity || "not set"}`,
      view: "fleet" as TransportView,
    })),
    ...asRows<any>(searchRoutesData).slice(0, 8).map((route: any) => ({
      id: `route-${route.id || route.name}`,
      label: route.route_name || route.name || "Transport route",
      detail: `${route.zone || "Zone not set"} | ${route.status || "active"}`,
      view: "routes" as TransportView,
    })),
    ...asRows<any>(searchStudentTransportData).slice(0, 8).map((assignment: any) => ({
      id: `assignment-${assignment.id || assignment.student_id}`,
      label: assignment.student_name || assignment.student_id?.substring?.(0, 8) || "Student transport assignment",
      detail: `${assignment.boarding_status || "active"} | ${assignment.guardian_contact || "guardian contact not set"}`,
      view: "allocation" as TransportView,
    })),
  ];
  const searchResults = searchTerm.trim()
    ? transportSearchRecords.filter((record) => `${record.label} ${record.detail}`.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];

  function openView(view: TransportView) {
    setActiveView(view);
    window.history.replaceState(null, "", buildSchoolSectionHref("transport-manager", view, routeMode ?? "hosted"));
    setNotice(`${getViewLabel(view)} workspace opened with transport controls loaded.`);
  }

  function openSearchRecord(record: TransportSearchRecord) {
    setActiveView(record.view);
    window.history.replaceState(null, "", buildSchoolSectionHref("transport-manager", record.view, routeMode ?? "hosted"));
    setSearchTerm("");
    setNotice(`${record.label} focused in ${getViewLabel(record.view)}.`);
  }

  return (
    <div data-route-mode={routeMode} className="h-dvh overflow-hidden bg-[#F3F6FA] text-[#071D49]">
      <div className="grid h-full gap-4 p-3 lg:grid-cols-[292px_minmax(0,1fr)]">
        <Sidebar activeView={activeView} onViewChange={openView} />
        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[#D8E0EC] bg-[#F3F6FA] shadow-[0_20px_70px_rgba(7,29,73,0.1)]">
          <Topbar
            activeView={activeView}
            searchTerm={searchTerm}
            searchResults={searchResults}
            onSearchTermChange={setSearchTerm}
            onSearchResult={openSearchRecord}
            onViewChange={openView}
          />
          <main className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              <IntegratedSchoolCommandHeader roleTitle="Transport Manager Dashboard" fallbackUserLabel="Transport Manager" />
              <div role="status" className="rounded-xl border border-[#BFDBFE] bg-[#EEF5FF] px-4 py-3 text-sm font-bold text-[#071D49]">
                {notice}
              </div>
              <ActiveWorkspace activeView={activeView} onViewChange={openView} onAction={recordTransportAction} />
            </div>
          </main>
        </div>
      </div>
      
    </div>
  );

  async function recordTransportAction(message: string, options?: { kind?: "workflow" | "report"; title?: string }) {
    try {
      if (options?.kind === "report") {
        await generateTransportReport(options.title || message);
      } else {
        await persistTransportWorkflowAction(message);
      }
      setNotice(message);
    } catch (error) {
      toast.error("Transport action was not saved", {
        description: error instanceof Error ? error.message : "The transport workflow could not be persisted for audit and dashboard follow-up.",
      });
    }
  }
}
