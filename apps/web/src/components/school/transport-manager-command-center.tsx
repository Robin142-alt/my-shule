
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

function moneyMinorLabel(value: unknown) {
  const amountMinor = Number(value);
  if (!Number.isFinite(amountMinor)) return "Not recorded";
  return `KES ${(amountMinor / 100).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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
    <header className="app-command-topbar sticky top-0 z-20 shrink-0 border-b border-[#D8E0EC] bg-[#F3F6FA]/92 px-4 py-3 backdrop-blur">
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

function QueryStateCard({
  isLoading,
  error,
  loadingLabel,
  onRetry,
}: {
  isLoading: boolean;
  error: Error | null;
  loadingLabel: string;
  onRetry: () => void;
}) {
  if (!isLoading && !error) return null;

  return (
    <div
      role={error ? "alert" : "status"}
      className={cn(
        "rounded-2xl border p-4 text-sm font-semibold",
        error ? "border-rose-200 bg-rose-50 text-rose-900" : "border-blue-200 bg-blue-50 text-blue-900",
      )}
    >
      <p>{error ? error.message : loadingLabel}</p>
      {error ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-black text-rose-800"
        >
          Retry
        </button>
      ) : null}
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
  const overviewQuery = useSchoolQuery<any>("/api/admin-command/transport-manager/overview");
  const routesQuery = useSchoolQuery<any>("/api/admin-command/transport-manager/routes");
  const dashboard = overviewQuery.data;
  const routesData = routesQuery.data;
  const metrics = dashboard?.metrics ?? {};
  const kpis: Kpi[] = [
    { label: "Fleet vehicles", value: String(metrics.totalVehicles ?? 0), helper: "School fleet records", trend: "Database records", tone: Number(metrics.totalVehicles ?? 0) > 0 ? "success" : "neutral", icon: BusFront },
    { label: "Registered drivers", value: String(metrics.totalDrivers ?? 0), helper: "Transport driver records", trend: "Database records", tone: Number(metrics.totalDrivers ?? 0) > 0 ? "info" : "neutral", icon: Users },
    { label: "Routes configured", value: String(metrics.totalRoutes ?? 0), helper: `${metrics.active_routes ?? 0} active route(s)`, trend: "Route register", tone: Number(metrics.active_routes ?? 0) > 0 ? "success" : "neutral", icon: Route },
    { label: "Trips recorded today", value: String(metrics.todayTrips ?? 0), helper: "Persisted trip records", trend: "Today", tone: Number(metrics.todayTrips ?? 0) > 0 ? "info" : "neutral", icon: CheckCircle2 },
  ];

  const routes = asRows<any>(routesData).map((route: any) => ({
    id: route.id || route.code || route.route_name,
    code: route.code || "No code",
    name: route.route_name || route.name || "Transport route",
    driver: route.driver || "Driver not assigned",
    vehicle: route.vehicle || "Vehicle not assigned",
    students: Number(route.students_count ?? route.learner_count ?? 0),
    status: route.status || "Status not recorded",
  }));

  if (overviewQuery.isLoading || overviewQuery.error) {
    return (
      <Panel title="Transport Operations Center" description="Tenant-scoped transport metrics and route records." icon={LayoutDashboard}>
        <QueryStateCard
          isLoading={overviewQuery.isLoading}
          error={overviewQuery.error}
          loadingLabel="Loading school transport records..."
          onRetry={() => void overviewQuery.refetch()}
        />
      </Panel>
    );
  }

  return (
    <>
      <section className="rounded-2xl bg-[linear-gradient(135deg,#071D49_0%,#123A7A_62%,#0F172A_100%)] p-5 text-white shadow-[0_24px_70px_rgba(7,29,73,0.22)]">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100/70">School fleet command center</p>
            <h2 className="mt-3 max-w-4xl text-3xl font-black tracking-[-0.02em] md:text-5xl">Transport Operations Center</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-100/78">
              Tenant-scoped fleet coordination, route assignments, student safety, guardian communication, compliance, and operational records in one focused workspace.
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
      <KpiGrid items={kpis} />
      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Panel title="Transport record status" description="Counts loaded from the active school's transport records." icon={AlertTriangle}>
          <div className="space-y-3">
            {[
              ["Fleet records", `${metrics.totalVehicles ?? 0} vehicle record(s) registered.`, Number(metrics.totalVehicles ?? 0) > 0 ? "success" : "neutral"],
              ["Active routes", `${metrics.active_routes ?? 0} active route record(s).`, Number(metrics.active_routes ?? 0) > 0 ? "info" : "neutral"],
              ["Students assigned", `${metrics.students_transported ?? 0} student assignment(s) on active manifests.`, Number(metrics.students_transported ?? 0) > 0 ? "info" : "neutral"],
              ["Trips today", `${metrics.todayTrips ?? 0} trip record(s) dated today.`, Number(metrics.todayTrips ?? 0) > 0 ? "success" : "neutral"],
            ].map(([title, detail, tone]) => (
              <article key={title} className={cn("rounded-xl border p-4", toneClasses[tone as Tone].card)}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black">{title}</h3>
                    <p className="mt-1 text-sm leading-6 opacity-75">{detail}</p>
                  </div>
                  <StatusChip label="School records" tone={tone as Tone} />
                </div>
              </article>
            ))}
          </div>
        </Panel>
        <Panel title="Route assignment snapshot" description="Canonical route, driver, vehicle, student-count, and status fields." icon={Route}>
          <div className="space-y-3">
            {routesQuery.isLoading || routesQuery.error ? (
              <QueryStateCard
                isLoading={routesQuery.isLoading}
                error={routesQuery.error}
                loadingLabel="Loading route assignments..."
                onRetry={() => void routesQuery.refetch()}
              />
            ) : routes.length === 0 ? (
              <div className="p-4 text-center text-[#64748B]">No transport routes have been configured for this school.</div>
            ) : routes.map((route) => (
              <div key={route.id} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-3">
                <div className="grid gap-3 sm:grid-cols-[90px_minmax(0,1fr)_120px] sm:items-center">
                  <strong className="text-[#071D49]">{route.code}</strong>
                  <div>
                    <p className="font-black text-[#071D49]">{route.name}</p>
                    <p className="text-xs font-semibold text-[#64748B]">{route.vehicle} · {route.driver} · {route.students} student(s)</p>
                  </div>
                  <StatusChip label={route.status} tone={toneFromStatus(route.status)} />
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
              ["Active route records", String(metrics.active_routes ?? 0), "info"],
              ["Fleet records", String(metrics.totalVehicles ?? 0), "warning"],
              ["Driver records", String(metrics.totalDrivers ?? 0), "danger"],
            ].map(([title, value, tone]) => (
              <div key={title} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#64748B]">{title}</p>
                <p className="mt-3 text-2xl font-black text-[#071D49]">{value}</p>
                <p className={cn("mt-2 text-xs font-black", toneClasses[tone as Tone].text)}>From school transport records</p>
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
              ["Notify Route Guardians", "notifications"],
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
  const vehiclesQuery = useSchoolQuery<any>("/api/admin-command/transport-manager/vehicles");
  const vehiclesData = vehiclesQuery.data;
  const mappedVehicles = asRows<any>(vehiclesData).map((v: any) => [
    v.registration_number || v.registration || "Registration not recorded",
    v.make_model || [v.make, v.model].filter(Boolean).join(" ") || "Make/model not recorded",
    String(v.capacity ?? 0),
    v.assigned_driver || v.driver || "Driver not assigned",
    v.assigned_route || "Route not assigned",
    v.status || "Status not recorded",
    dateLabel(v.insurance_expiry_date, "Not set"),
    dateLabel(v.service_due_date, "Not set"),
  ]);

  if (vehiclesQuery.isLoading || vehiclesQuery.error) {
    return (
      <Panel title="Fleet Management" description="Canonical school vehicle records and assignments." icon={BusFront}>
        <QueryStateCard
          isLoading={vehiclesQuery.isLoading}
          error={vehiclesQuery.error}
          loadingLabel="Loading fleet records..."
          onRetry={() => void vehiclesQuery.refetch()}
        />
      </Panel>
    );
  }

  return (
    <>
      <Panel title="Fleet Management" description="Manage all vehicles with search, filters, pagination, export, status badges, and side detail drawers." icon={BusFront}>
        <KpiGrid items={[
          { label: "Fleet vehicles", value: String(mappedVehicles.length), helper: "Tenant-scoped vehicle records", trend: "Fleet register", tone: mappedVehicles.length ? "success" : "neutral", icon: BusFront },
        ]} />
      </Panel>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title="Vehicle table" description="Vehicle Number, Bus Name, Capacity, Driver, Route, Status, Insurance Expiry, and Next Service Date." icon={ClipboardList}>
          <DataTable
            title="Fleet register"
            columns={["Vehicle Number", "Make / Model", "Capacity", "Driver", "Route", "Status", "Insurance Expiry", "Next Service"]}
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
  const routesQuery = useSchoolQuery<any>("/api/admin-command/transport-manager/routes");
  const routesData = routesQuery.data;
  const routeCards = asRows<any>(routesData);

  function handleRoutePlanningAction(action: string) {
    if (action === "Assign students") {
      onViewChange("allocation");
      return;
    }
    onViewChange("routes");
  }

  if (routesQuery.isLoading || routesQuery.error) {
    return (
      <Panel title="Routes & Stops" description="Canonical school transport route assignments." icon={Route}>
        <QueryStateCard
          isLoading={routesQuery.isLoading}
          error={routesQuery.error}
          loadingLabel="Loading route records..."
          onRetry={() => void routesQuery.refetch()}
        />
      </Panel>
    );
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
                  <p className="mt-2 text-xs font-bold text-[#64748B]">Vehicle: {route.vehicle || "Not assigned"}</p>
                  <p className="mt-1 text-xs font-bold text-[#64748B]">Driver: {route.driver || "Not assigned"}</p>
                  <p className="mt-1 text-xs font-bold text-[#64748B]">Stops: {route.pickup_points ?? 0} · Students assigned: {route.students_count ?? route.learner_count ?? 0}</p>
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
      <Panel title="Route assignment details" description="Persisted vehicle, driver, stop, and student assignment counts for each route." icon={Map}>
        <div className="space-y-3">
          {routeCards.map((route: any) => (
            <article key={`assignment-${route.id || route.route_name}`} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-black text-[#071D49]">{route.route_name || "Transport route"}</h3>
                  <p className="mt-1 text-sm font-semibold text-[#64748B]">{route.vehicle || "Vehicle not assigned"} · {route.driver || "Driver not assigned"}</p>
                  <p className="mt-1 text-xs font-bold text-[#64748B]">{route.pickup_points ?? 0} stop(s) · {route.students_count ?? route.learner_count ?? 0} student(s)</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRoutePlanningAction("Assign students")}
                  className="rounded-xl bg-[#071D49] px-4 py-2 text-xs font-black text-white"
                >
                  Assign students
                </button>
              </div>
            </article>
          ))}
          {routeCards.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#D8E0EC] bg-white p-4 text-sm font-semibold text-[#64748B]">
              Route assignment details will appear after the first transport route is created.
            </div>
          ) : null}
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
  const driversQuery = useSchoolQuery<any>("/api/admin-command/transport-manager/drivers");
  const driversData = driversQuery.data;
  const driverCards = asRows<any>(driversData);

  if (driversQuery.isLoading || driversQuery.error) {
    return (
      <Panel title="Driver Management" description="Tenant-scoped transport driver records." icon={IdCard}>
        <QueryStateCard
          isLoading={driversQuery.isLoading}
          error={driversQuery.error}
          loadingLabel="Loading driver records..."
          onRetry={() => void driversQuery.refetch()}
        />
      </Panel>
    );
  }

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
  const fuelQuery = useSchoolQuery<any>("/api/admin-command/transport-manager/fuel-maintenance");
  const fuelMaintenanceData = fuelQuery.data;
  const metrics = fuelMaintenanceData?.metrics ?? {};
  const fuelLogs = asRows<any>(fuelMaintenanceData?.fuelLogs);
  const fuelLogRows = fuelLogs.map((log: any) => [
    log.vehicle || "Vehicle not recorded",
    `${log.litres ?? 0} L`,
    moneyMinorLabel(log.cost_minor),
    log.description || log.station || log.receipt_reference || "Station/reference not recorded",
    dateLabel(log.date || log.log_date || log.created_at),
    log.status || "Recorded",
  ]);

  if (fuelQuery.isLoading || fuelQuery.error) {
    return (
      <Panel title="Fuel Management" description="Canonical school vehicle fuel ledger." icon={Fuel}>
        <QueryStateCard
          isLoading={fuelQuery.isLoading}
          error={fuelQuery.error}
          loadingLabel="Loading fuel ledger records..."
          onRetry={() => void fuelQuery.refetch()}
        />
      </Panel>
    );
  }

  return (
    <>
      <KpiGrid items={[
        { label: "Fuel logs", value: String(fuelLogs.length), helper: "Tenant-scoped fuel records", trend: "Fuel ledger", tone: fuelLogs.length ? "warning" : "neutral", icon: Fuel },
        { label: "Vehicles logged", value: String(new Set(fuelLogs.map((log: any) => log.vehicle_id).filter(Boolean)).size), helper: "Vehicles with ledger activity", trend: "Fuel ledger", tone: fuelLogs.length ? "info" : "neutral", icon: BusFront },
        { label: "Fuel cost this month", value: moneyMinorLabel(metrics.fuel_cost_this_month_minor ?? 0), helper: "Persisted minor-unit total", trend: "This month", tone: "info", icon: Gauge },
        { label: "Fuel volume this month", value: `${metrics.fuel_litres_this_month ?? 0} L`, helper: "Persisted litre total", trend: "This month", tone: Number(metrics.fuel_litres_this_month ?? 0) > 0 ? "success" : "neutral", icon: CheckCircle2 },
      ]} />
      <Panel title="Fuel Management" description="Fuel costs, refills, station logs, vehicle efficiency, and suspicious consumption alerts." icon={Fuel}>
        {fuelLogRows.length > 0 ? (
          <DataTable title="Fuel log table" columns={["Vehicle", "Litres", "Cost", "Station / Reference", "Date", "Status"]} rows={fuelLogRows} onAction={onAction} />
        ) : (
          <div className="rounded-xl border border-dashed border-[#D8E0EC] bg-white p-4 text-sm font-semibold text-[#64748B]">
            No fuel records are logged. Record the first refill to create the tenant fuel ledger.
          </div>
        )}
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
  const maintenanceQuery = useSchoolQuery<any>("/api/admin-command/transport-manager/fuel-maintenance");
  const fuelMaintenanceData = maintenanceQuery.data;
  const maintenanceLogs = asRows<any>(fuelMaintenanceData?.maintenanceLogs);

  if (maintenanceQuery.isLoading || maintenanceQuery.error) {
    return (
      <Panel title="Maintenance & Repairs" description="Canonical vehicle service records." icon={Wrench}>
        <QueryStateCard
          isLoading={maintenanceQuery.isLoading}
          error={maintenanceQuery.error}
          loadingLabel="Loading maintenance records..."
          onRetry={() => void maintenanceQuery.refetch()}
        />
      </Panel>
    );
  }

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
              <p className="mt-2 text-sm font-semibold opacity-75">Vehicle: {log.vehicle || "Vehicle not recorded"}</p>
              <p className="mt-1 text-sm font-semibold opacity-75">Logged: {dateLabel(log.date || log.log_date || log.created_at)}</p>
              <p className="mt-1 text-sm font-semibold opacity-75">Cost: {moneyMinorLabel(log.cost_minor)}</p>
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
  const tripsQuery = useSchoolQuery<any>("/api/admin-command/transport-manager/trips");
  const tripsData = tripsQuery.data;
  const tripRows = asRows<any>(tripsData).map((trip: any) => [
    trip.vehicle || "Vehicle not recorded",
    trip.route || "Route not recorded",
    trip.driver || "Driver not assigned",
    trip.status || "Status not recorded",
    trip.departure_time || "Not recorded",
    trip.arrival_time || "Not recorded",
    String(trip.students ?? 0),
  ]);

  if (tripsQuery.isLoading || tripsQuery.error) {
    return (
      <Panel title="Trip Monitoring" description="Persisted transport trip records." icon={RadioTower}>
        <QueryStateCard
          isLoading={tripsQuery.isLoading}
          error={tripsQuery.error}
          loadingLabel="Loading transport trip records..."
          onRetry={() => void tripsQuery.refetch()}
        />
      </Panel>
    );
  }

  return (
    <Panel title="Trip Monitoring" description="Recorded trip assignments, times, status, and student counts." icon={RadioTower}>
      {tripRows.length > 0 ? (
        <DataTable title="Trip register" columns={["Vehicle", "Route", "Driver", "Status", "Departure", "Arrival", "Students"]} rows={tripRows} onAction={onAction} />
      ) : (
        <div className="rounded-xl border border-dashed border-[#D8E0EC] bg-white p-4 text-sm font-semibold text-[#64748B]">
          No transport trips have been recorded for this school.
        </div>
      )}
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
  const tripsQuery = useSchoolQuery<any>("/api/admin-command/transport-manager/trips");
  const trips = asRows<any>(tripsQuery.data);
  const inProgressTrips = trips.filter((trip: any) => String(trip.status ?? "").toLowerCase() === "in progress");

  if (tripsQuery.isLoading || tripsQuery.error) {
    return (
      <Panel title="GPS Tracking Center" description="Trip records awaiting a configured GPS position feed." icon={MapPin}>
        <QueryStateCard
          isLoading={tripsQuery.isLoading}
          error={tripsQuery.error}
          loadingLabel="Loading trip records for GPS tracking..."
          onRetry={() => void tripsQuery.refetch()}
        />
      </Panel>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Panel title="GPS Tracking Center" description="Location tracking requires coordinates from a configured GPS provider; trip records alone do not prove a live position." icon={MapPin}>
        <div className="min-h-[280px] rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-6 text-amber-950">
          <h3 className="font-black">GPS position feed unavailable</h3>
          <p className="mt-2 text-sm font-semibold leading-6">
            The current transport API provides trip status and assignments but no verified latitude, longitude, speed, or ETA. Map markers are withheld until a provider position record is available.
          </p>
          <p className="mt-4 text-sm font-black">{inProgressTrips.length} in-progress trip record(s) currently require position-provider data.</p>
        </div>
      </Panel>
      <Panel title="In-progress trip records" description="Persisted trip state only; this list does not claim live GPS visibility." icon={RadioTower}>
        <div className="space-y-3">
          {inProgressTrips.map((trip: any) => {
            const tone = toneFromStatus(trip.status || "in progress");
            return (
            <div key={trip.id || trip.vehicle_id || trip.route_id} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-black text-[#071D49]">{trip.vehicle || "Vehicle not recorded"}</p>
                  <p className="text-xs font-semibold text-[#64748B]">{trip.route || "Route not recorded"} - {trip.driver || "Driver not assigned"} - {trip.status || "Status not recorded"}</p>
                </div>
                <StatusChip label={trip.status || "Status not recorded"} tone={tone} />
              </div>
            </div>
          );})}
          {inProgressTrips.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#D8E0EC] bg-white p-3 text-sm font-semibold text-[#64748B]">
              No in-progress trip records are available.
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
  onQueued,
}: {
  template: string;
  onClose: () => void;
  onQueued?: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const optionsQuery = useSchoolQuery<TransportAssignmentOptions>("/api/admin-command/transport-manager/assignment-options");
  const routeOptions = optionsQuery.data?.routes ?? [];
  const studentOptions = optionsQuery.data?.students ?? [];

  async function handleSendTransportNotice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const message = String(form.get("message") ?? "").trim();
    const noticeType = String(form.get("notice_type") ?? "general").trim();
    const priority = String(form.get("priority") ?? "normal").trim();
    const routeId = String(form.get("route_id") ?? "").trim();
    const studentId = String(form.get("student_id") ?? "").trim();
    const channels = form.getAll("channels").map((value) => String(value).trim()).filter(Boolean);

    if (!title || !message || (!routeId && !studentId)) {
      toast.error("Title, message, and a transport route or student are required.");
      return;
    }
    if (channels.length === 0) {
      toast.error("Select in-app notification or SMS queue delivery.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await requestDashboardApi<{
        status: "queued" | "degraded";
        targeted_students: number;
        sms_queued: number;
        in_app_notifications_created: number;
      }>("/api/admin-command/transport-manager/notices", {
        method: "POST",
        body: {
          title,
          message,
          notice_type: noticeType,
          priority,
          route_id: routeId || undefined,
          student_ids: studentId ? [studentId] : [],
          recipient_scope: "linked_transport_guardians",
          channels,
        },
      });
      const description = `${result.targeted_students} student assignment(s); ${result.in_app_notifications_created} in-app notification(s); ${result.sms_queued} SMS queue record(s).`;
      if (result.status === "degraded") {
        toast.warning("Transport notice partially queued", { description });
      } else {
        toast.success("Transport notice queued", { description });
      }
      onQueued?.();
      onClose();
    } catch (error) {
      toast.error("Transport notice was not queued", {
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
          <legend className="px-1 text-sm font-bold text-[#071D49]">Selected transport guardians</legend>
          {optionsQuery.error ? (
            <QueryStateCard
              isLoading={false}
              error={optionsQuery.error}
              loadingLabel=""
              onRetry={() => void optionsQuery.refetch()}
            />
          ) : (
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold text-[#64748B]">Route
                <select name="route_id" disabled={optionsQuery.isLoading} className="mt-1 w-full rounded-xl border border-[#D8E0EC] bg-white px-3 py-2 text-sm disabled:bg-slate-100">
                  <option value="">{optionsQuery.isLoading ? "Loading routes..." : "Select route (optional)"}</option>
                  {routeOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold text-[#64748B]">Student
                <select name="student_id" disabled={optionsQuery.isLoading} className="mt-1 w-full rounded-xl border border-[#D8E0EC] bg-white px-3 py-2 text-sm disabled:bg-slate-100">
                  <option value="">{optionsQuery.isLoading ? "Loading students..." : "Select student (optional)"}</option>
                  {studentOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
              </label>
            </div>
          )}
          <p className="mt-2 text-xs font-semibold text-[#64748B]">
            The backend resolves only active same-school transport assignments and their linked guardians. Selecting both fields limits the notice to that student on that route.
          </p>
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
          <button type="submit" className="rounded-xl bg-[#071D49] px-5 py-2 text-sm font-black text-white disabled:opacity-60" disabled={submitting || optionsQuery.isLoading || Boolean(optionsQuery.error)}>
            {submitting ? "Queuing..." : "Queue Notice"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function NotificationsWorkspace({ onAction }: { onAction: TransportActionHandler }) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const noticesQuery = useSchoolQuery<any>("/api/admin-command/transport-manager/notices");
  const notices = asRows<any>(noticesQuery.data);
  const noticeRows = notices.map((notice: any) => [
    notice.scope || "Selected transport guardians",
    notice.title || notice.notice_type || "Transport notice",
    Array.isArray(notice.channels) ? notice.channels.join(", ") : "No channel recorded",
    `${notice.delivery_status || "recorded"} · ${notice.in_app_notifications_created ?? 0} in-app · SMS: ${notice.sms_queued ?? 0} queued, ${notice.sms_processing ?? 0} dispatching, ${notice.sms_provider_accepted ?? 0} provider-accepted, ${notice.sms_needs_review ?? 0} review`,
    dateLabel(notice.created_at),
  ]);

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
          <div>
            {noticesQuery.isLoading || noticesQuery.error ? (
              <QueryStateCard
                isLoading={noticesQuery.isLoading}
                error={noticesQuery.error}
                loadingLabel="Loading transport communication records..."
                onRetry={() => void noticesQuery.refetch()}
              />
            ) : noticeRows.length > 0 ? (
              <DataTable
                title="Communication log"
                columns={["Scope", "Notice", "Channels", "Delivery Record", "Timestamp"]}
                rows={noticeRows}
                onAction={onAction}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-[#D8E0EC] bg-white p-4 text-sm font-semibold text-[#64748B]">
                No transport notices have been queued. Choose a template, select a route or student, and queue the first guardian notice.
              </div>
            )}
          </div>
        </div>
      </Panel>
      {selectedTemplate ? (
        <ComposeTransportNoticeModal
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          onQueued={() => void noticesQuery.refetch()}
        />
      ) : null}
    </>
  );
}

function IncidentsWorkspace({ onAction }: { onAction: TransportActionHandler }) {
  const incidentsQuery = useSchoolQuery<any>("/api/admin-command/transport-manager/incidents");
  const incidents = asRows<any>(incidentsQuery.data);
  const incidentRows = incidents.map((incident: any) => [
    dateLabel(incident.date || incident.created_at),
    incident.vehicle || "Vehicle not recorded",
    incident.driver || "Driver not recorded",
    incident.type || "Transport incident",
    incident.severity || "Warning",
    incident.status || "Open",
  ]);

  return (
    <Panel title="Incident Reports" description="Breakdown, accident, student issue, delay, and safety concern records with timeline, photos, actions taken, and follow-up tasks." icon={ShieldAlert}>
      {incidentsQuery.isLoading || incidentsQuery.error ? (
        <QueryStateCard
          isLoading={incidentsQuery.isLoading}
          error={incidentsQuery.error}
          loadingLabel="Loading transport incident records..."
          onRetry={() => void incidentsQuery.refetch()}
        />
      ) : incidentRows.length > 0 ? (
        <DataTable title="Incident table" columns={["Date", "Vehicle", "Driver", "Type", "Severity", "Status"]} rows={incidentRows} onAction={onAction} />
      ) : (
        <div className="rounded-xl border border-dashed border-[#D8E0EC] bg-white p-4 text-sm font-semibold text-[#64748B]">
          No delay, incident, or transport alert records exist for this school.
        </div>
      )}
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
    <div data-route-mode={routeMode} className="authenticated-app app-transport-shell h-dvh overflow-hidden bg-[#F3F6FA] text-[#071D49]">
      <div className="app-transport-grid grid h-full gap-4 p-3 lg:grid-cols-[292px_minmax(0,1fr)]">
        <Sidebar activeView={activeView} onViewChange={openView} />
        <div className="app-transport-main flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[#D8E0EC] bg-[#F3F6FA] shadow-[0_20px_70px_rgba(7,29,73,0.1)]">
          <Topbar
            activeView={activeView}
            searchTerm={searchTerm}
            searchResults={searchResults}
            onSearchTermChange={setSearchTerm}
            onSearchResult={openSearchRecord}
            onViewChange={openView}
          />
          <main className="app-content min-h-0 flex-1 overflow-y-auto p-4">
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
