"use client";

import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  BusFront,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  GraduationCap,
  HeartPulse,
  Home,
  Library,
  Menu,
  MessageSquareText,
  Settings,
  ShieldAlert,
  Users,
  UsersRound,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { DashboardGreeting } from "@/components/common/dashboard-greeting";
import { SchoolDashboardRoleSwitcher } from "@/components/school/school-dashboard-role-switcher";
import { PermissionProvider } from "@/components/providers/permission-context";
import { UserManagementWorkspace } from "@/components/school/user-management-workspace";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { DashboardCommunicationBoundary } from "@/lib/dashboard-communication/dashboard-communication-provider";
import { tenantSlugToName } from "@/lib/seo/tenant-routes";
import { AcademicIntelligenceWorkspace } from "./academic-intelligence-workspace";
import { OverviewWorkspace as BoardingOverviewWorkspace } from "./boarding-master/overview-workspace";
import { OverviewWorkspace as LibraryOverviewWorkspace } from "./librarian/overview-workspace";
import { PrincipalAcademicSetupWorkspace } from "./principal-dashboard/academic-setup-workspace";
import { PrincipalAcademicsWorkspace } from "./principal-dashboard/academics-workspace";
import { PrincipalApprovalsWorkspace } from "./principal-dashboard/approvals-workspace";
import { PrincipalAttendanceWorkspace } from "./principal-dashboard/attendance-workspace";
import { PrincipalClassesStreamsWorkspace } from "./principal-dashboard/classes-streams-workspace";
import { PrincipalCommunicationWorkspace } from "./principal-dashboard/communication-workspace";
import { PrincipalDisciplineWorkspace } from "./principal-dashboard/discipline-workspace";
import { PrincipalExamsReportsWorkspace } from "./principal-dashboard/exams-reports-workspace";
import { PrincipalFinanceOverviewWorkspace } from "./principal-dashboard/finance-overview-workspace";
import {
  PrincipalAuditOversightWorkspace,
  PrincipalHealthOversightWorkspace,
  PrincipalVisitorsOversightWorkspace,
} from "./principal-dashboard/operational-oversight-workspaces";
import {
  PrincipalOverviewWorkspace,
  type PrincipalDashboardAlert,
  type PrincipalExecutiveDashboardSummary,
} from "./principal-dashboard/overview-workspace";
import { PrincipalReportsWorkspace } from "./principal-dashboard/reports-workspace";
import { PrincipalSchoolProfileWorkspace } from "./principal-dashboard/school-profile-workspace";
import { PrincipalSettingsWorkspace } from "./principal-dashboard/settings-workspace";
import { PrincipalSetupChecklistWorkspace } from "./principal-dashboard/setup-checklist-workspace";
import { PrincipalStaffRolesWorkspace } from "./principal-dashboard/staff-roles-workspace";
import { PrincipalSubjectsDepartmentsWorkspace } from "./principal-dashboard/subjects-departments-workspace";
import { buildSchoolSectionHref } from "./school-pages";
import { StaffTimetableOverviewWorkspace } from "./staff-timetable-overview-workspace";
import { OverviewWorkspace as TransportOverviewWorkspace } from "./transport-manager/overview-workspace";

type PrincipalSection =
  | "overview"
  | "setup-checklist"
  | "school-profile"
  | "academic-setup"
  | "classes-streams"
  | "subjects-departments"
  | "fees"
  | "attendance"
  | "discipline"
  | "visitors"
  | "sick-bay"
  | "boarding"
  | "academics"
  | "timetable"
  | "staff"
  | "transport"
  | "library"
  | "exams-reports"
  | "academic-intelligence"
  | "communication"
  | "users-invitations"
  | "approvals"
  | "reports"
  | "audit-logs"
  | "settings";

type PrincipalNavItem = {
  id: PrincipalSection;
  label: string;
  icon: typeof Home;
};

type PrincipalNavGroup = {
  id: "fees-finance" | "students" | "academic-group" | "setup-checklist";
  label: string;
  icon: typeof Home;
  children: PrincipalNavItem[];
  section?: PrincipalSection;
  route?: "students";
};

type PrincipalSchoolProfileSummary = {
  schoolName: string;
  logoUrl?: string | null;
};

type PrincipalNavigationSettings = {
  dashboard?: {
    theme?: "system" | "dark" | "light";
    defaultView?: "overview" | "academics" | "attendance" | "fees";
  } | null;
};

const PRINCIPAL_NAV_ITEMS: Array<PrincipalNavItem | PrincipalNavGroup> = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "approvals", label: "Approvals", icon: CheckCircle2 },
  { id: "academic-intelligence", label: "Academic Intelligence", icon: BarChart3 },
  { id: "exams-reports", label: "Exams & Report Cards", icon: ClipboardCheck },
  { id: "communication", label: "Communication", icon: MessageSquareText },
  { id: "timetable", label: "Master Timetable", icon: CalendarDays },
  {
    id: "fees-finance", label: "Fees & Finance", icon: Wallet,
    children: [{ id: "fees", label: "Fees", icon: Wallet }],
  },
  {
    id: "students", label: "Students", icon: Users, route: "students",
    children: [
      { id: "attendance", label: "Attendance", icon: Activity },
      { id: "discipline", label: "Discipline", icon: ShieldAlert },
      { id: "sick-bay", label: "Sick Bay", icon: HeartPulse },
      { id: "boarding", label: "Boarding", icon: BookOpen },
    ],
  },
  {
    id: "academic-group", label: "Academics", icon: GraduationCap,
    children: [
      { id: "academic-setup", label: "Academic Calendar", icon: ClipboardCheck },
      { id: "classes-streams", label: "Classes & Streams", icon: BookOpen },
      { id: "subjects-departments", label: "Subjects & Departments", icon: Library },
      { id: "academics", label: "Teacher Allocations", icon: UsersRound },
    ],
  },
  { id: "staff", label: "Staff", icon: UsersRound },
  { id: "visitors", label: "Parents & Visitors", icon: UsersRound },
  { id: "transport", label: "Transport", icon: BusFront },
  { id: "library", label: "Library", icon: Library },
  { id: "users-invitations", label: "Users & Invitations", icon: UsersRound },
  { id: "reports", label: "Reports", icon: Bell },
  { id: "audit-logs", label: "Audit Logs", icon: ClipboardCheck },
  {
    id: "setup-checklist", label: "School Setup", icon: CheckCircle2, section: "setup-checklist",
    children: [{ id: "school-profile", label: "School Profile", icon: Building2 }],
  },
  { id: "settings", label: "Settings", icon: Settings },
];

function principalNavItemClass(selected: boolean) {
  return cn(
    "flex min-h-10 w-full min-w-0 items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-sm font-bold transition hover:-translate-y-0.5",
    selected
      ? "border border-cyan-300/35 bg-cyan-300/12 text-cyan-100 shadow-[inset_4px_0_0_#22D3EE]"
      : "text-white/72 hover:bg-white/10 hover:text-white",
  );
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getPrincipalSchoolId(tenantSlug?: string | null) {
  const schoolId = tenantSlug?.trim();
  if (!schoolId) throw new Error("Principal dashboard requires a verified school context");
  return schoolId;
}

function getPrincipalSchoolName(schoolId: string) {
  return schoolId === "school-workspace" ? "School workspace" : tenantSlugToName(schoolId);
}

function normalizePrincipalSection(section?: string | null): PrincipalSection {
  switch (section) {
    case "dashboard":
    case undefined:
    case null:
      return "overview";
    case "setup":
    case "checklist":
    case "school-setup":
    case "setup-checklist":
      return "setup-checklist";
    case "profile":
    case "school-profile":
      return "school-profile";
    case "academic-calendar":
    case "academic-setup":
      return "academic-setup";
    case "classes":
    case "classes-streams":
      return "classes-streams";
    case "subjects":
    case "subjects-departments":
      return "subjects-departments";
    case "staff-roles":
    case "users":
    case "invitations":
    case "user-management":
      return "users-invitations";
    case "attendance-monitoring":
      return "attendance";
    case "clinic":
    case "health":
      return "sick-bay";
    case "finance":
    case "finance-overview":
      return "fees";
    case "exams":
    case "exams-report-cards":
      return "exams-reports";
    case "academic-analytics":
    case "academic-intelligence":
      return "academic-intelligence";
    case "parents":
      return "visitors";
    default:
      return section as PrincipalSection;
  }
}

function sectionRoute(section: PrincipalSection) {
  if (section === "overview") return "dashboard";
  if (section === "fees") return "finance";
  if (section === "sick-bay") return "clinic";
  if (section === "exams-reports") return "exams";
  return section;
}

function isPrincipalDashboardAlert(value: unknown): value is PrincipalDashboardAlert {
  if (!value || typeof value !== "object") return false;
  const alert = value as Record<string, unknown>;
  return typeof alert.id === "string"
    && typeof alert.module_code === "string"
    && typeof alert.title === "string"
    && typeof alert.message === "string"
    && (alert.severity === "warning" || alert.severity === "critical")
    && (alert.action_hint === undefined || typeof alert.action_hint === "string");
}

function parsePrincipalDashboardEvent(event: Event): PrincipalExecutiveDashboardSummary | null {
  try {
    const value = JSON.parse((event as MessageEvent<string>).data) as unknown;
    if (!value || typeof value !== "object") return null;

    const dashboard = value as Record<string, unknown>;
    if (
      typeof dashboard.tenant_id !== "string"
      || typeof dashboard.generated_at !== "string"
      || !Array.isArray(dashboard.enabled_modules)
      || !dashboard.enabled_modules.every((moduleCode) => typeof moduleCode === "string")
      || !Array.isArray(dashboard.alerts)
      || !dashboard.alerts.every(isPrincipalDashboardAlert)
      || !Array.isArray(dashboard.notifications)
      || !dashboard.notifications.every(isPrincipalDashboardAlert)
      || !Array.isArray(dashboard.realtime_channels)
      || !dashboard.realtime_channels.every((channel) => typeof channel === "string")
    ) {
      return null;
    }

    return dashboard as PrincipalExecutiveDashboardSummary;
  } catch {
    return null;
  }
}

export function PrincipalCommandCenter({
  routeMode,
  tenantSlug,
  activeSection,
  userLabel,
}: {
  routeMode?: "hosted" | "public";
  tenantSlug?: string | null;
  activeSection?: string;
  userLabel?: string | null;
}) {
  const schoolId = getPrincipalSchoolId(tenantSlug);
  const fallbackSchoolName = getPrincipalSchoolName(schoolId);
  const principalName = userLabel?.trim() || "Principal";
  const [activeWorkspace, setActiveWorkspaceState] = useState<PrincipalSection>(() =>
    normalizePrincipalSection(activeSection),
  );
  const defaultViewApplied = useRef(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [expandedNavGroups, setExpandedNavGroups] = useState<Record<string, boolean>>({});
  const [streamedPrincipalDashboard, setStreamedPrincipalDashboard] = useState<{
    schoolId: string;
    dashboard: PrincipalExecutiveDashboardSummary;
  } | null>(null);
  const [principalDashboardStreamState, setPrincipalDashboardStreamState] = useState<{
    schoolId: string;
    degraded: boolean;
  } | null>(null);
  const {
    data: fetchedPrincipalDashboard,
    isLoading: principalDashboardLoading,
    error: principalDashboardError,
  } = useSchoolQuery<PrincipalExecutiveDashboardSummary>(
    "/admin-command/principal/dashboard",
    { tenantId: schoolId },
  );
  const { data: principalSchoolProfile } = useSchoolQuery<PrincipalSchoolProfileSummary>(
    "/admin-command/principal/school-profile",
    { tenantId: schoolId },
  );
  const { data: principalNavigationSettings } = useSchoolQuery<PrincipalNavigationSettings>(
    "/admin-command/principal/settings",
    { tenantId: schoolId },
  );
  const savedDefaultView = principalNavigationSettings?.dashboard?.defaultView;
  const savedTheme = principalNavigationSettings?.dashboard?.theme;
  const schoolName = principalSchoolProfile?.schoolName?.trim() || fallbackSchoolName;
  const [failedSchoolLogoUrl, setFailedSchoolLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const activeGroup = PRINCIPAL_NAV_ITEMS.find((item) =>
      "children" in item && (item.section === activeWorkspace || item.children.some((child) => child.id === activeWorkspace)),
    );
    if (activeGroup) setExpandedNavGroups((groups) => ({ ...groups, [activeGroup.id]: true }));
  }, [activeWorkspace]);

  useEffect(() => {
    setActiveWorkspaceState(normalizePrincipalSection(activeSection));
  }, [activeSection]);

  useEffect(() => {
    const shouldUseSavedDefault = activeSection === undefined || activeSection === "" || activeSection === "dashboard";
    if (!shouldUseSavedDefault || defaultViewApplied.current || !savedDefaultView) return;
    defaultViewApplied.current = true;
    setActiveWorkspaceState(normalizePrincipalSection(savedDefaultView));
  }, [activeSection, savedDefaultView]);

  useEffect(() => {
    if (!savedTheme || typeof document === "undefined") return undefined;
    const root = document.documentElement;
    const previousTheme = root.dataset.principalTheme;
    const previousColorScheme = root.style.colorScheme;
    root.dataset.principalTheme = savedTheme;
    root.style.colorScheme = savedTheme === "system" ? "light dark" : savedTheme;
    return () => {
      if (previousTheme === undefined) delete root.dataset.principalTheme;
      else root.dataset.principalTheme = previousTheme;
      root.style.colorScheme = previousColorScheme;
    };
  }, [savedTheme]);

  useEffect(() => {
    if (typeof EventSource === "undefined") return undefined;

    const stream = new EventSource(
      `/api/admin-command/principal/dashboard/stream?tenantSlug=${encodeURIComponent(schoolId)}`,
      { withCredentials: true },
    );
    const applyPrincipalDashboardEvent = (event: Event) => {
      const dashboard = parsePrincipalDashboardEvent(event);
      if (!dashboard) {
        setPrincipalDashboardStreamState({ schoolId, degraded: true });
        return;
      }

      setStreamedPrincipalDashboard({ schoolId, dashboard });
      setPrincipalDashboardStreamState({ schoolId, degraded: false });
    };
    const markPrincipalDashboardStreamDegraded = () => {
      setPrincipalDashboardStreamState({ schoolId, degraded: true });
    };

    stream.addEventListener("principal.dashboard", applyPrincipalDashboardEvent);
    stream.addEventListener("principal.error", markPrincipalDashboardStreamDegraded);
    stream.onerror = markPrincipalDashboardStreamDegraded;

    return () => {
      stream.removeEventListener("principal.dashboard", applyPrincipalDashboardEvent);
      stream.removeEventListener("principal.error", markPrincipalDashboardStreamDegraded);
      stream.onerror = null;
      stream.close();
    };
  }, [schoolId]);

  const principalDashboard = streamedPrincipalDashboard?.schoolId === schoolId
    ? streamedPrincipalDashboard.dashboard
    : fetchedPrincipalDashboard;
  const principalDashboardStreamDegraded = (
    principalDashboardStreamState?.schoolId === schoolId
    && principalDashboardStreamState.degraded
  ) || Boolean(principalDashboardError && !principalDashboard);

  function setActiveWorkspace(section: PrincipalSection) {
    defaultViewApplied.current = true;
    setActiveWorkspaceState(section);
    setMobileSidebarOpen(false);
    window.history.replaceState(
      null,
      "",
      buildSchoolSectionHref("principal", sectionRoute(section), routeMode ?? "hosted"),
    );
  }

  function renderWorkspace() {
    if (activeWorkspace === "overview") {
      return (
        <PrincipalOverviewWorkspace
          executiveDashboard={principalDashboard}
          executiveDashboardLoading={principalDashboardLoading}
          executiveDashboardStreamDegraded={principalDashboardStreamDegraded}
          riskCenterLabel="Alerts and risk center"
        />
      );
    }
    if (activeWorkspace === "setup-checklist") {
      return <PrincipalSetupChecklistWorkspace onNavigate={setActiveWorkspace} />;
    }
    if (activeWorkspace === "academic-setup") return <PrincipalAcademicSetupWorkspace />;
    if (activeWorkspace === "classes-streams") return <PrincipalClassesStreamsWorkspace />;
    if (activeWorkspace === "subjects-departments") return <PrincipalSubjectsDepartmentsWorkspace />;
    if (activeWorkspace === "fees") return <PrincipalFinanceOverviewWorkspace />;
    if (activeWorkspace === "attendance") return <PrincipalAttendanceWorkspace />;
    if (activeWorkspace === "discipline") return <PrincipalDisciplineWorkspace />;
    if (activeWorkspace === "academics") return <PrincipalAcademicsWorkspace />;
    if (activeWorkspace === "staff") return <PrincipalStaffRolesWorkspace />;
    if (activeWorkspace === "communication") return <PrincipalCommunicationWorkspace />;
    if (activeWorkspace === "approvals") return <PrincipalApprovalsWorkspace />;
    if (activeWorkspace === "reports") return <PrincipalReportsWorkspace />;
    if (activeWorkspace === "exams-reports") return <PrincipalExamsReportsWorkspace />;
    if (activeWorkspace === "settings") return <PrincipalSettingsWorkspace />;
    if (activeWorkspace === "school-profile") {
      return (
        <section aria-label="Principal school profile workspace" className="space-y-5">
          <PrincipalSchoolProfileWorkspace />
        </section>
      );
    }
    if (activeWorkspace === "visitors") return <PrincipalVisitorsOversightWorkspace />;
    if (activeWorkspace === "sick-bay") return <PrincipalHealthOversightWorkspace />;
    if (activeWorkspace === "boarding") {
      return (
        <section aria-label="Principal boarding workspace">
          <BoardingOverviewWorkspace />
        </section>
      );
    }
    if (activeWorkspace === "transport") {
      return (
        <section aria-label="Principal transport workspace">
          <TransportOverviewWorkspace />
        </section>
      );
    }
    if (activeWorkspace === "library") {
      return (
        <section aria-label="Principal library workspace">
          <LibraryOverviewWorkspace />
        </section>
      );
    }
    if (activeWorkspace === "audit-logs") return <PrincipalAuditOversightWorkspace />;
    if (activeWorkspace === "timetable") {
      return (
        <StaffTimetableOverviewWorkspace
          title="School master timetable"
          description="Published class, teacher, room, and resource schedules across this school."
          theme="dark"
        />
      );
    }
    if (activeWorkspace === "academic-intelligence") {
      return (
        <AcademicIntelligenceWorkspace
          audience="principal"
          onOpenMarks={() => setActiveWorkspace("exams-reports")}
          onOpenInterventions={() => setActiveWorkspace("approvals")}
          onOpenReportCards={() => setActiveWorkspace("exams-reports")}
        />
      );
    }
    if (activeWorkspace === "users-invitations") {
      return (
        <UserManagementWorkspace
          schoolId={schoolId}
          schoolName={schoolName}
          actorRole="Principal"
          actorName={principalName}
          canInviteUsers
          canManageUsers
        />
      );
    }

    return (
      <section role="alert" aria-label="Principal workspace unavailable" className="rounded-xl border border-amber-200/30 bg-amber-200/10 p-5 text-amber-100">
        <h2 className="text-lg font-black">This Principal workspace route is not registered.</h2>
        <p className="mt-2 text-sm font-semibold">Choose a listed workspace so MyShule can load a verified tenant-scoped contract.</p>
      </section>
    );
  }

  function renderNavItem(item: PrincipalNavItem) {
    const Icon = item.icon;
    return (
      <button
        key={item.id}
        type="button"
        aria-current={activeWorkspace === item.id ? "page" : undefined}
        onClick={() => setActiveWorkspace(item.id)}
        className={principalNavItemClass(activeWorkspace === item.id)}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="truncate">{item.label}</span>
      </button>
    );
  }

  return (
    <DashboardCommunicationBoundary tenantId={schoolId}>
      <PermissionProvider schoolId={schoolId}>
        <div
          data-testid={activeWorkspace === "exams-reports" ? undefined : "role-operational-command-center"}
          data-route-mode={routeMode ?? "hosted"}
          className="min-h-dvh bg-[#F3F4F6] pb-24 lg:pb-6"
        >
          {mobileSidebarOpen ? (
            <button
              type="button"
              aria-label="Close principal navigation overlay"
              className="fixed inset-0 z-30 bg-slate-950/45 xl:hidden"
              onClick={() => setMobileSidebarOpen(false)}
            />
          ) : null}
          <div
            data-testid="principal-practical-command-center"
            className="grid gap-5 p-3 md:p-5 xl:grid-cols-[300px_minmax(0,1fr)]"
          >
            <aside
              className={cn(
                "fixed inset-y-0 left-0 z-40 flex w-[min(84vw,300px)] min-h-0 flex-col overflow-hidden border-r border-[#C8D5EA]/30 bg-[#071D49] p-4 text-white shadow-2xl transition-transform duration-200 xl:static xl:z-auto xl:h-[calc(100dvh-40px)] xl:w-auto xl:translate-x-0 xl:rounded-[var(--radius-xl)] xl:border-[#C8D5EA]/50 xl:shadow-[0_24px_70px_rgba(7,29,73,0.22)]",
                mobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
              )}
            >
              <div className="rounded-[var(--radius-lg)] border border-white/10 bg-white/[0.06] p-4">
                <div className="flex items-center gap-3">
                  {principalSchoolProfile?.logoUrl && failedSchoolLogoUrl !== principalSchoolProfile.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={principalSchoolProfile.logoUrl}
                      alt={`${schoolName} logo`}
                      className="h-14 w-14 shrink-0 rounded-lg border border-white/15 bg-white object-contain p-1"
                      onError={() => setFailedSchoolLogoUrl(principalSchoolProfile.logoUrl ?? null)}
                    />
                  ) : (
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/10">
                      <Building2 className="h-7 w-7 text-cyan-200" aria-hidden="true" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase text-cyan-200">Principal Command</p>
                    <h2 className="mt-1 truncate text-2xl font-black">{schoolName}</h2>
                  </div>
                </div>
              </div>
              <nav aria-label="Principal dashboard sidebar" className="mt-5 flex-1 space-y-2 overflow-auto pr-1 pb-10">
                {PRINCIPAL_NAV_ITEMS.map((item) => {
                  if (!("children" in item)) return renderNavItem(item);
                  const Icon = item.icon;
                  const expanded = Boolean(expandedNavGroups[item.id]);
                  const selected = item.section === activeWorkspace || item.children.some((child) => child.id === activeWorkspace);
                  const childrenId = `principal-nav-${item.id}`;
                  const hasPage = Boolean(item.section || item.route);
                  return (
                    <div key={item.id}>
                      <div className="flex items-center gap-1">
                        {item.route ? (
                          <Link
                            href={buildSchoolSectionHref("principal", item.route, routeMode ?? "hosted")}
                            onClick={() => setMobileSidebarOpen(false)}
                            className={principalNavItemClass(selected)}
                          >
                            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        ) : item.section ? renderNavItem({ id: item.section, label: item.label, icon: item.icon }) : null}
                        <button
                          type="button"
                          aria-label={hasPage ? `${expanded ? "Collapse" : "Expand"} ${item.label}` : undefined}
                          aria-expanded={expanded}
                          aria-controls={childrenId}
                          onClick={() => setExpandedNavGroups((groups) => ({ ...groups, [item.id]: !expanded }))}
                          className={hasPage
                            ? "flex min-h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius)] text-white/72 transition hover:bg-white/10 hover:text-white"
                            : principalNavItemClass(selected)}
                        >
                          {!hasPage ? (
                            <>
                              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                              <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                            </>
                          ) : null}
                          <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", !expanded && "-rotate-90")} aria-hidden="true" />
                        </button>
                      </div>
                      <div id={childrenId} role="group" aria-label={item.label} hidden={!expanded} className="ml-4 mt-1 space-y-1 border-l border-white/10 pl-2">
                        {item.children.map(renderNavItem)}
                      </div>
                    </div>
                  );
                })}
              </nav>
            </aside>

            <main className="min-w-0 space-y-5">
              <header className="rounded-[var(--radius-xl)] border border-[#C8D5EA] bg-white p-4 text-[#071D49] shadow-[0_18px_50px_rgba(7,29,73,0.12)] md:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <DashboardGreeting name={principalName} context={`${schoolName} command center`} />
                    <h1 className="mt-1 text-2xl font-black">Principal Dashboard</h1>
                  </div>
                  <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
                    <SchoolDashboardRoleSwitcher className="w-full sm:w-auto" />
                    <button
                      type="button"
                      aria-label="Open principal navigation"
                      className="rounded-xl border border-[#C8D5EA] bg-[#F8FAFC] px-3 py-2 text-sm font-black text-[#071D49] xl:hidden"
                      onClick={() => setMobileSidebarOpen(true)}
                    >
                      <Menu className="mr-2 inline h-4 w-4" aria-hidden="true" />
                      Menu
                    </button>
                  </div>
                </div>
              </header>

              <div className="rounded-[var(--radius-xl)] bg-[#071D49] p-5 shadow-[0_24px_70px_rgba(7,29,73,0.22)]">
                <section className="max-h-none overflow-y-auto">{renderWorkspace()}</section>
              </div>
            </main>
          </div>
        </div>
      </PermissionProvider>
    </DashboardCommunicationBoundary>
  );
}
