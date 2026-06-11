"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Activity, Bell, BookOpen, CheckCircle2, ClipboardCheck, GraduationCap, Home,
  MessageSquareText, Search, Settings, ShieldAlert, ShieldCheck, UsersRound,
  UserRoundCheck, Layers, LucideIcon, Wallet, BarChart3, Building2, Package, CheckSquare
} from "lucide-react";

import { ApprovalInbox } from "@/components/shared/approval-inbox";
import { NotificationBell } from "@/components/shared/notification-bell";
import { TaskQueue } from "@/components/shared/task-queue";
import { WorkflowToast } from "@/components/shared/workflow-toast";

import { PrincipalOverviewWorkspace } from "./principal-dashboard/overview-workspace";
import { PrincipalSetupChecklistWorkspace } from "./principal-dashboard/setup-checklist-workspace";
import { PrincipalSchoolProfileWorkspace } from "./principal-dashboard/school-profile-workspace";
import { PrincipalAcademicSetupWorkspace } from "./principal-dashboard/academic-setup-workspace";
import { PrincipalClassesStreamsWorkspace } from "./principal-dashboard/classes-streams-workspace";
import { PrincipalSubjectsDepartmentsWorkspace } from "./principal-dashboard/subjects-departments-workspace";
import { PrincipalStaffRolesWorkspace } from "./principal-dashboard/staff-roles-workspace";
import { PrincipalStudentsWorkspace } from "./principal-dashboard/students-workspace";
import { PrincipalAttendanceWorkspace } from "./principal-dashboard/attendance-workspace";
import { PrincipalAcademicsWorkspace } from "./principal-dashboard/academics-workspace";
import { PrincipalExamsReportsWorkspace } from "./principal-dashboard/exams-reports-workspace";
import { PrincipalFinanceOverviewWorkspace } from "./principal-dashboard/finance-overview-workspace";
import { PrincipalDisciplineWorkspace } from "./principal-dashboard/discipline-workspace";
import { PrincipalCommunicationWorkspace } from "./principal-dashboard/communication-workspace";
import { PrincipalApprovalsWorkspace } from "./principal-dashboard/approvals-workspace";
import { PrincipalReportsWorkspace } from "./principal-dashboard/reports-workspace";
import { PrincipalSettingsWorkspace } from "./principal-dashboard/settings-workspace";
import { PrincipalTeachingWorkspace } from "./principal-dashboard/teaching-workspace";

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
  { id: "setup-checklist", label: "Setup Checklist", icon: CheckSquare, group: "Command Center" },
  { id: "school-profile", label: "School Profile", icon: Building2, group: "Command Center" },
  { id: "academic-setup", label: "Academic Setup", icon: GraduationCap, group: "Academics" },
  { id: "classes-streams", label: "Classes & Streams", icon: Layers, group: "Academics" },
  { id: "subjects-departments", label: "Subjects & Departments", icon: BookOpen, group: "Academics" },
  { id: "staff-roles", label: "Staff & Roles", icon: UsersRound, group: "People" },
  { id: "students", label: "Students", icon: UserRoundCheck, group: "People" },
  { id: "attendance", label: "Attendance", icon: Activity, group: "Daily Operations" },
  { id: "academics", label: "Academics", icon: GraduationCap, group: "Daily Operations" },
  { id: "exams-reports", label: "Exams & Report Cards", icon: ClipboardCheck, group: "Daily Operations" },
  { id: "finance-overview", label: "Finance Overview", icon: Wallet, group: "Daily Operations" },
  { id: "discipline", label: "Discipline", icon: ShieldAlert, group: "Daily Operations" },
  { id: "communication", label: "Communication", icon: MessageSquareText, group: "Administration" },
  { id: "approvals", label: "Approvals", icon: CheckCircle2, group: "Administration" },
  { id: "reports", label: "Reports", icon: BarChart3, group: "Administration" },
  { id: "settings", label: "Settings", icon: Settings, group: "Administration" },
];

export function PrincipalCommandCenter({ routeMode }: { routeMode?: "hosted" | "public" }) {
  const [activeWorkspace, setActiveWorkspace] = useState("overview");
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
    window.addEventListener("principal-teaching-toggle", handleToggle);
    return () => window.removeEventListener("principal-teaching-toggle", handleToggle);
  }, [activeWorkspace]);

  const navItems = useMemo(() => {
    if (isTeachingEnabled) {
      const teachingItem = { id: "teaching", label: "My Teaching", icon: BookOpen, group: "Optional Duties" };
      return [
        ...BASE_NAV_ITEMS,
        teachingItem,
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
      case "overview": return <PrincipalOverviewWorkspace />;
      case "setup-checklist": return <PrincipalSetupChecklistWorkspace />;
      case "school-profile": return <PrincipalSchoolProfileWorkspace />;
      case "academic-setup": return <PrincipalAcademicSetupWorkspace />;
      case "classes-streams": return <PrincipalClassesStreamsWorkspace />;
      case "subjects-departments": return <PrincipalSubjectsDepartmentsWorkspace />;
      case "staff-roles": return <PrincipalStaffRolesWorkspace />;
      case "students": return <PrincipalStudentsWorkspace />;
      case "attendance": return <PrincipalAttendanceWorkspace />;
      case "academics": return <PrincipalAcademicsWorkspace />;
      case "exams-reports": return <PrincipalExamsReportsWorkspace />;
      case "finance-overview": return <PrincipalFinanceOverviewWorkspace />;
      case "discipline": return <PrincipalDisciplineWorkspace />;
      case "communication": return <PrincipalCommunicationWorkspace />;
      case "approvals": return <PrincipalApprovalsWorkspace />;
      case "reports": return <PrincipalReportsWorkspace />;
      case "settings": return <PrincipalSettingsWorkspace />;
      case "teaching": return <PrincipalTeachingWorkspace />;
      default: return <PrincipalOverviewWorkspace />;
    }
  };

  return (
    <div data-route-mode={routeMode ?? "hosted"} className="min-h-screen bg-[#F3F4F6] pb-24 lg:pb-6">
      <div className="grid gap-5 p-3 md:p-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        {/* Sidebar */}
        <aside className="hidden h-[calc(100vh-40px)] rounded-[var(--radius-xl)] border border-[#C8D5EA]/50 bg-[#071D49] p-4 text-white shadow-[0_24px_70px_rgba(7,29,73,0.22)] xl:sticky xl:top-5 xl:flex xl:flex-col">
          <div className="rounded-[var(--radius-lg)] border border-white/10 bg-white/[0.06] p-4">
            <p className="text-xs font-black uppercase text-cyan-200">Principal Command</p>
            <h2 className="mt-2 text-2xl font-black">School Operations</h2>
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
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-[var(--radius-lg)] bg-[#071D49] text-sm font-black text-white shadow-[0_16px_34px_rgba(7,29,73,0.18)]">MS</div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5F6F89]">Good morning, Principal Robinson</p>
                  <p className="mt-1 text-lg font-black md:text-2xl">Principal Dashboard</p>
                </div>
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

          <div className="rounded-[var(--radius-xl)] bg-[#071D49] p-5 shadow-[0_24px_70px_rgba(7,29,73,0.22)]">
            <h1 className="mb-6 text-3xl font-black text-white">
              {navItems.find((n) => n.id === activeWorkspace)?.label}
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
