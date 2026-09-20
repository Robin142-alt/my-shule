"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  BookOpen,
  BrainCircuit,
  Bus,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileBarChart2,
  GraduationCap,
  Home,
  MessageSquareText,
  PackageCheck,
  RadioTower,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Stethoscope,
  UsersRound,
  UserRoundCheck,
  Layers,
  LucideIcon,
  CheckSquare
} from "lucide-react";

import { ApprovalInbox } from "@/components/shared/approval-inbox";
import { DashboardGreeting } from "@/components/common/dashboard-greeting";
import { SchoolDashboardRoleSwitcher } from "@/components/school/school-dashboard-role-switcher";
import { MobileWorkspaceNavigation } from "@/components/shared/mobile-workspace-navigation";
import { NotificationBell } from "@/components/shared/notification-bell";
import { TaskQueue } from "@/components/shared/task-queue";
import { WorkflowToast } from "@/components/shared/workflow-toast";
import { tenantSlugToName } from "@/lib/seo/tenant-routes";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { buildSchoolSectionHref } from "./school-pages";
import { UserManagementWorkspace } from "./user-management-workspace";

import { DeputyOverviewWorkspace } from "./deputy-principal/overview-workspace";
import { DeputyDailyOperationsWorkspace } from "./deputy-principal/daily-operations-workspace";
import { DeputyAttendanceWorkspace } from "./deputy-principal/attendance-workspace";
import { DeputyDisciplineWorkspace } from "./deputy-principal/discipline-workspace";
import { DeputyWelfareWorkspace } from "./deputy-principal/welfare-workspace";
import { DeputyStaffDutyWorkspace } from "./deputy-principal/staff-duty-workspace";
import { DeputyTimetableManagementWorkspace } from "./deputy-principal/timetable-management-workspace";
import { DeputyTeachingWorkspace } from "./deputy-principal/teaching-workspace";
import { DeputyExamsMarksWorkspace } from "./deputy-principal/exams-marks-workspace";
import { DeputyClassesStreamsWorkspace } from "./deputy-principal/classes-streams-workspace";
import { DeputyApprovalsWorkspace } from "./deputy-principal/approvals-workspace";
import { DeputyCommunicationWorkspace } from "./deputy-principal/communication-workspace";
import { DeputyReportsDownloadsWorkspace } from "./deputy-principal/reports-workspace";
import { DeputyStaffRolesWorkspace } from "./deputy-principal/staff-roles-workspace";
import { DeputySettingsWorkspace } from "./deputy-principal/settings-workspace";
import { AcademicFoundationWorkspace } from "./academic-foundation-workspace";
import { AcademicIntelligenceWorkspace } from "./academic-intelligence-workspace";
import { SupportCenterWorkspace } from "@/components/support/support-center-workspace";
import { resolveDeputyWorkspace } from "@/lib/routing/deputy-workspaces";
import { CbtModuleScreen } from "@/components/modules/cbt/cbt-module-screen";
import { LmsModuleScreen } from "@/components/modules/lms/lms-module-screen";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type NavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  group: string;
};

const BASE_NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", icon: Home, group: "Command Center" },
  { id: "daily-operations", label: "Daily Operations", icon: Activity, group: "Command Center" },
  { id: "attendance", label: "Attendance & Punctuality", icon: UserRoundCheck, group: "Student Management" },
  { id: "discipline", label: "Discipline & Behaviour", icon: ShieldAlert, group: "Student Management" },
  { id: "welfare", label: "Student Welfare", icon: Stethoscope, group: "Student Management" },
  { id: "staff-duty", label: "Staff Duty", icon: UsersRound, group: "Staff Management" },
  { id: "timetable", label: "Timetable & Relief", icon: CalendarClock, group: "Staff Management" },
  { id: "academics", label: "Academic Foundation", icon: GraduationCap, group: "Academics" },
  { id: "exams", label: "Exams & Marks", icon: ClipboardCheck, group: "Academics" },
  { id: "academic-intelligence", label: "Academic Intelligence", icon: BrainCircuit, group: "Academics" },
  { id: "classes", label: "Classes & Streams", icon: Layers, group: "Academics" },
  { id: "approvals", label: "Approvals & Escalations", icon: CheckCircle2, group: "Administration" },
  { id: "communication", label: "Communication", icon: MessageSquareText, group: "Administration" },
  { id: "users-invitations", label: "Users & Invitations", icon: UsersRound, group: "Administration" },
  { id: "reports", label: "Reports & Downloads", icon: FileBarChart2, group: "Administration" },
  { id: "staff-roles", label: "Staff & Roles", icon: ShieldCheck, group: "Administration" },
  { id: "settings", label: "Settings", icon: Settings, group: "Administration" },
];

function getDeputySchoolId(tenantSlug?: string | null) {
  return tenantSlug?.trim() || "";
}

function getDeputySchoolName(schoolId: string) {
  return schoolId ? tenantSlugToName(schoolId) : "Verified school";
}

type DeputySchoolIdentity = {
  schoolName: string;
  logoUrl?: string | null;
};

export function DeputyPrincipalCommandCenter({
  activeSection,
  routeMode,
  tenantSlug,
  userLabel,
}: {
  activeSection?: string;
  routeMode?: "hosted" | "public";
  tenantSlug?: string | null;
  userLabel?: string | null;
}) {
  const schoolId = getDeputySchoolId(tenantSlug);
  const fallbackSchoolName = getDeputySchoolName(schoolId);
  const { data: schoolIdentity } = useSchoolQuery<DeputySchoolIdentity>("/school/identity", {
    ...(schoolId ? { tenantId: schoolId } : {}),
  });
  const schoolName = schoolIdentity?.schoolName?.trim() || fallbackSchoolName;
  const deputyName = userLabel?.trim() || "Deputy Principal";
  const [activeWorkspace, setActiveWorkspaceState] = useState(resolveDeputyWorkspace(activeSection));
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    setActiveWorkspaceState(resolveDeputyWorkspace(activeSection));
  }, [activeSection]);

  const setActiveWorkspace = (view: string) => {
    setActiveWorkspaceState(view);
    const newPath = buildSchoolSectionHref("deputy-principal", view, routeMode ?? "hosted");
    window.history.replaceState(null, "", newPath);
  };
  const [isTeachingEnabled, setIsTeachingEnabled] = useState(true);

  // Listen to teaching toggle from settings workspace
  useEffect(() => {
    const handleToggle = (e: Event) => {
      const customEvent = e as CustomEvent<{ enabled?: boolean }>;
      const enabled = customEvent.detail?.enabled === true;
      setIsTeachingEnabled(enabled);
      if (!enabled && activeWorkspace === "teaching") {
        setActiveWorkspace("overview");
      }
    };
    window.addEventListener("myshule:deputy-teaching-toggle", handleToggle);
    return () => window.removeEventListener("myshule:deputy-teaching-toggle", handleToggle);
  }, [activeWorkspace]);

  const navItems = useMemo(() => {
    if (isTeachingEnabled) {
      const teachingItem = { id: "teaching", label: "Teaching Workspace", icon: BookOpen, group: "My Duties" };
      return [
        ...BASE_NAV_ITEMS.slice(0, 8),
        teachingItem,
        ...BASE_NAV_ITEMS.slice(8)
      ];
    }
    return BASE_NAV_ITEMS;
  }, [isTeachingEnabled]);

  const groups = useMemo(() => {
    return navItems.reduce<Record<string, NavItem[]>>((acc, item) => {
      acc[item.group] = [...(acc[item.group] ?? []), item];
      return acc;
    }, {});
  }, [navItems]);

  if (!schoolId) {
    return (
      <main className="grid min-h-[60vh] place-items-center px-5 py-12">
        <div role="alert" className="w-full max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-900">
          <p className="text-sm font-black">School context is unavailable</p>
          <p className="mt-2 text-xs font-semibold leading-5">
            Sign in again before opening deputy-principal records. No fallback school has been selected.
          </p>
        </div>
      </main>
    );
  }

  const renderWorkspace = () => {
    switch (activeWorkspace) {
      case "overview": return <DeputyOverviewWorkspace schoolId={schoolId} />;
      case "daily-operations": return <DeputyDailyOperationsWorkspace />;
      case "attendance": return <DeputyAttendanceWorkspace />;
      case "discipline": return <DeputyDisciplineWorkspace />;
      case "welfare": return <DeputyWelfareWorkspace />;
      case "staff-duty": return <DeputyStaffDutyWorkspace />;
      case "timetable": return <DeputyTimetableManagementWorkspace />;
      case "academics": return <AcademicFoundationWorkspace actorRole="Deputy Principal" schoolName={schoolName} tenantId={schoolId} />;
      case "teaching": return <DeputyTeachingWorkspace />;
      case "exams":
        return (
          <div className="space-y-4">
            <section className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Deputy principal command center</p>
              <h2 className="mt-2 text-2xl font-black">Academic Review</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  { label: "Academic Review", target: "academics" },
                  { label: "Results Moderation", target: "approvals" },
                  { label: "Academic Analytics", target: "academic-intelligence" },
                ].map(({ label, target }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setActiveWorkspace(target)}
                    className="rounded-lg border border-cyan-200/30 bg-cyan-200/10 px-3 py-2 text-sm font-black text-cyan-100"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>
            <DeputyExamsMarksWorkspace />
          </div>
        );
      case "academic-intelligence":
        return (
          <AcademicIntelligenceWorkspace
            audience="deputy"
            onOpenMarks={() => setActiveWorkspace("exams")}
            onOpenInterventions={() => setActiveWorkspace("welfare")}
            onOpenReportCards={() => setActiveWorkspace("reports")}
          />
        );
      case "classes": return <DeputyClassesStreamsWorkspace />;
      case "approvals": return <DeputyApprovalsWorkspace />;
      case "communication": return <DeputyCommunicationWorkspace />;
      case "users-invitations":
        return (
          <UserManagementWorkspace
            schoolId={schoolId}
            schoolName={schoolName}
            actorRole="Deputy Principal"
            actorName={deputyName}
            canInviteUsers={true}
            canManageUsers={true}
          />
        );
      case "reports": return <DeputyReportsDownloadsWorkspace />;
      case "staff-roles": return <DeputyStaffRolesWorkspace />;
      case "settings": return <DeputySettingsWorkspace />;
      case "cbt": return <CbtModuleScreen tenantSlug={schoolId} />;
      case "lms": return <LmsModuleScreen tenantSlug={schoolId} />;
      case "support-new-ticket":
      case "support-my-tickets":
      case "support-knowledge-base":
      case "support-system-status":
        return <SupportCenterWorkspace tenantSlug={schoolId} defaultView={activeWorkspace} />;
      default: return <section className="rounded-xl bg-white p-6 text-[#071D49]"><h2 className="text-xl font-black">Workspace unavailable</h2><p className="mt-2">Choose a workspace from the deputy menu to continue.</p><button type="button" onClick={() => setActiveWorkspace("overview")} className="mt-4 min-h-11 rounded-lg border px-4 font-bold">Open overview</button></section>;
    }
  };

  return (
    <div data-route-mode={routeMode} data-testid="deputy-principal-command-center" className="min-h-dvh bg-[#F3F4F6] pb-6">
      <div className="grid gap-5 p-3 md:p-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        {/* Sidebar */}
        <aside className="hidden h-[calc(100dvh-40px)] rounded-[var(--radius-xl)] border border-[#C8D5EA]/50 bg-[#071D49] p-4 text-white shadow-[0_24px_70px_rgba(7,29,73,0.22)] xl:sticky xl:top-5 xl:flex xl:flex-col">
          <div className="rounded-[var(--radius-lg)] border border-white/10 bg-white/[0.06] p-4">
            <div className="flex items-center gap-3">
              {schoolIdentity?.logoUrl && failedLogoUrl !== schoolIdentity.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={schoolIdentity.logoUrl}
                  alt={`${schoolName} logo`}
                  className="h-14 w-14 shrink-0 rounded-lg border border-white/15 bg-white object-contain p-1"
                  onError={() => setFailedLogoUrl(schoolIdentity.logoUrl ?? null)}
                />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/10">
                  <Building2 className="h-7 w-7 text-cyan-200" aria-hidden="true" />
                </span>
              )}
              <div className="min-w-0">
                <p className="text-xs font-black uppercase text-cyan-200">Deputy Command</p>
                <h2 className="mt-1 truncate text-2xl font-black">{schoolName}</h2>
              </div>
            </div>
          </div>
          <nav className="mt-5 flex-1 space-y-5 overflow-auto pr-1 pb-10 custom-scrollbar">
            {Object.entries(groups).map(([group, items]) => (
              <div key={group}>
                <p className="px-3 text-[11px] font-black uppercase tracking-[0.16em] text-white/45">{group}</p>
                <div className="mt-2 grid gap-1">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active = activeWorkspace === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveWorkspace(item.id)}
                        className={cn(
                          "flex min-h-10 w-full items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-sm font-bold transition hover:-translate-y-0.5",
                          active
                            ? "border border-cyan-300/35 bg-cyan-300/12 text-cyan-100 shadow-[inset_4px_0_0_#22D3EE]"
                            : "text-white/72 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="min-w-0 space-y-5">
          <header className="rounded-[var(--radius-xl)] border border-[#C8D5EA] bg-white p-4 text-[#071D49] shadow-[0_18px_50px_rgba(7,29,73,0.12)] md:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <DashboardGreeting name={deputyName} context={`${schoolName} command center`} />
                <h1 className="mt-1 text-2xl font-black">Deputy Principal Dashboard</h1>
              </div>
              <div className="grid min-w-0 gap-3 xl:w-full xl:max-w-[640px]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-[#5F6F89]" aria-hidden="true" />
                  <input
                    placeholder="Search student, teacher, incident, class, parent, or report"
                    className="h-12 w-full rounded-[var(--radius-lg)] border border-[#C8D5EA] bg-[#F8FAFC] pl-12 pr-4 text-sm font-semibold text-[#071D49] outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-300/20"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <SchoolDashboardRoleSwitcher className="w-full sm:w-auto" />
                  <TaskQueue />
                  <ApprovalInbox />
                  <NotificationBell />
                </div>
              </div>
            </div>
          </header>

          <div className="rounded-[var(--radius-lg)] border border-[#C8D5EA] bg-white p-3 shadow-sm xl:hidden">
            <MobileWorkspaceNavigation
              label="Deputy workspace"
              items={navItems}
              value={navItems.some((item) => item.id === activeWorkspace) ? activeWorkspace : "overview"}
              onValueChange={setActiveWorkspace}
              testId="deputy-mobile-workspace-nav"
            />
          </div>

          <div className="rounded-[var(--radius-xl)] bg-[#071D49] p-5 shadow-[0_24px_70px_rgba(7,29,73,0.22)]">
            <h1 className="mb-6 text-3xl font-black text-white">
              {navItems.find((n) => n.id === activeWorkspace)?.label ?? "Overview"}
            </h1>
            {renderWorkspace()}
          </div>
        </main>
      </div>

    </div>
  );
}
