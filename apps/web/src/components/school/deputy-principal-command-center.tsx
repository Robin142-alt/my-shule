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

const DEPUTY_WORKSPACE_ALIASES: Record<string, string> = {
  dashboard: "overview",
  "attendance-escalations": "attendance",
  "attendance-monitoring": "attendance",
  "discipline-cases": "discipline",
  "incident-routing": "discipline",
  "staff-coordination": "staff-duty",
  "duty-roster": "staff-duty",
  "timetable-conflicts": "timetable",
  "academic-review": "academics",
  "academic-setup": "academics",
  "academic-analytics": "academic-intelligence",
  "academic-intelligence": "academic-intelligence",
  "classes-streams": "classes",
  "reports-downloads": "reports",
};

function resolveDeputyWorkspace(section?: string) {
  if (!section) return "overview";
  return DEPUTY_WORKSPACE_ALIASES[section] ?? section;
}

function getDeputySchoolId(tenantSlug?: string | null) {
  return tenantSlug?.trim() || "school-workspace";
}

function getDeputySchoolName(schoolId: string) {
  return schoolId === "school-workspace" ? "School workspace" : tenantSlugToName(schoolId);
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
    tenantId: schoolId,
  });
  const schoolName = schoolIdentity?.schoolName?.trim() || fallbackSchoolName;
  const deputyName = userLabel?.trim() || "Deputy Principal";
  const [activeWorkspace, setActiveWorkspaceState] = useState(resolveDeputyWorkspace(activeSection));
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);

  const setActiveWorkspace = (view: string) => {
    setActiveWorkspaceState(view);
    const newPath = buildSchoolSectionHref("deputy-principal", view, routeMode ?? "hosted");
    window.history.replaceState(null, "", newPath);
  };
  const [isTeachingEnabled, setIsTeachingEnabled] = useState(true);

  // Listen to teaching toggle from settings workspace
  useEffect(() => {
    const handleToggle = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIsTeachingEnabled(customEvent.detail);
      if (!customEvent.detail && activeWorkspace === "teaching") {
        setActiveWorkspace("overview");
      }
    };
    window.addEventListener("deputy-teaching-toggle", handleToggle);
    return () => window.removeEventListener("deputy-teaching-toggle", handleToggle);
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
      default: return <DeputyOverviewWorkspace schoolId={schoolId} />;
    }
  };

  return (
    <div data-route-mode={routeMode} data-testid="deputy-principal-command-center" className="min-h-screen bg-[#F3F4F6] pb-24 lg:pb-6">
      <div className="grid gap-5 p-3 md:p-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        {/* Sidebar */}
        <aside className="hidden h-[calc(100vh-40px)] rounded-[var(--radius-xl)] border border-[#C8D5EA]/50 bg-[#071D49] p-4 text-white shadow-[0_24px_70px_rgba(7,29,73,0.22)] xl:sticky xl:top-5 xl:flex xl:flex-col">
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
              <div className="grid gap-3 lg:min-w-[640px]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-[#5F6F89]" aria-hidden="true" />
                  <input
                    placeholder="Search student, teacher, incident, class, parent, or report"
                    className="h-12 w-full rounded-[var(--radius-lg)] border border-[#C8D5EA] bg-[#F8FAFC] pl-12 pr-4 text-sm font-semibold text-[#071D49] outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-300/20"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <TaskQueue />
                  <ApprovalInbox currentUserId="school" />
                  <NotificationBell />
                </div>
              </div>
            </div>
          </header>

          <div className="rounded-[var(--radius-lg)] border border-[#C8D5EA] bg-white p-3 shadow-sm xl:hidden">
            <label htmlFor="deputy-mobile-workspace" className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#5F6F89]">
              Deputy workspace
            </label>
            <select
              id="deputy-mobile-workspace"
              aria-label="Deputy workspace navigation"
              value={navItems.some((item) => item.id === activeWorkspace) ? activeWorkspace : "overview"}
              onChange={(event) => setActiveWorkspace(event.currentTarget.value)}
              className="h-11 w-full rounded-[var(--radius)] border border-[#C8D5EA] bg-[#F8FAFC] px-3 text-sm font-bold text-[#071D49] outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-300/20"
            >
              {navItems.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </div>

          <div className="rounded-[var(--radius-xl)] bg-[#071D49] p-5 shadow-[0_24px_70px_rgba(7,29,73,0.22)]">
            <h1 className="mb-6 text-3xl font-black text-white">
              {navItems.find((n) => n.id === activeWorkspace)?.label ?? "Overview"}
            </h1>
            {renderWorkspace()}
          </div>
        </main>
      </div>

      {/* Mobile nav */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#071D49]/94 px-2 py-2 text-white shadow-[0_-18px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-5 gap-1">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveWorkspace(item.id)}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-[var(--radius)] px-1 text-center text-[10px] font-black active:scale-95",
                  activeWorkspace === item.id ? "text-cyan-400" : "text-white/70"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="truncate w-full">{item.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>
      
    </div>
  );
}
