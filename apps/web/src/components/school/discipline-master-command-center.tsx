"use client";

import { useState } from "react";
import { 
  Home, Inbox, FilePlus, List, Activity, UserCircle, 
  FileSearch, ShieldAlert, MessageSquare, HeartHandshake, 
  AlertTriangle, Calendar, BarChart3, Download, FileCog, 
  History, Settings, Menu, X, HelpCircle
} from "lucide-react";

import { OverviewWorkspace } from "./discipline-master/overview-workspace";
import { ReportIntakeWorkspace } from "./discipline-master/report-intake-workspace";
import { LogIncidentWorkspace } from "./discipline-master/log-incident-workspace";
import { IncidentRegisterWorkspace } from "./discipline-master/incident-register-workspace";
import { TriageQueueWorkspace } from "./discipline-master/triage-queue-workspace";
import { StudentConductProfilesWorkspace } from "./discipline-master/student-conduct-profiles-workspace";
import { InvestigationsWorkspace } from "./discipline-master/investigations-workspace";
import { ActionsInterventionsWorkspace } from "./discipline-master/actions-interventions-workspace";
import { ParentCommunicationWorkspace } from "./discipline-master/parent-communication-workspace";
import { CounsellingReferralsWorkspace } from "./discipline-master/counselling-referrals-workspace";
import { SeriousCasesApprovalsWorkspace } from "./discipline-master/serious-cases-approvals-workspace";
import { DetentionProgramsWorkspace } from "./discipline-master/detention-programs-workspace";
import { ClassHouseMonitoringWorkspace } from "./discipline-master/class-house-monitoring-workspace";
import { ReportsDownloadsWorkspace } from "./discipline-master/reports-downloads-workspace";
import { TemplatesRulesWorkspace } from "./discipline-master/templates-rules-workspace";
import { AuditTrailWorkspace } from "./discipline-master/audit-trail-workspace";
import { SettingsWorkspace } from "./discipline-master/settings-workspace";
import { cn } from "./discipline-master/shared";
import { useQueryClient } from "@tanstack/react-query";
import { ApprovalInbox } from "@/components/shared/approval-inbox";
import { NotificationBell } from "@/components/shared/notification-bell";
import { TaskQueue } from "@/components/shared/task-queue";
import { buildSchoolSectionHref } from "./school-pages";

const SIDEBAR_ITEMS = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "report-intake", label: "Report Intake", icon: Inbox },
  { id: "log-incident", label: "Log Incident", icon: FilePlus },
  { id: "incident-register", label: "Incident Register", icon: List },
  { id: "triage-queue", label: "Triage Queue", icon: Activity },
  { id: "student-conduct", label: "Conduct Profiles", icon: UserCircle },
  { id: "investigations", label: "Investigations", icon: FileSearch },
  { id: "actions", label: "Interventions", icon: ShieldAlert },
  { id: "parent-comm", label: "Parent Comm", icon: MessageSquare },
  { id: "counselling", label: "Counselling", icon: HeartHandshake },
  { id: "approvals", label: "Approvals", icon: AlertTriangle },
  { id: "detention", label: "Detention", icon: Calendar },
  { id: "monitoring", label: "Monitoring", icon: BarChart3 },
  { id: "reports", label: "Reports", icon: Download },
  { id: "templates", label: "Templates", icon: FileCog },
  { id: "audit", label: "Audit Trail", icon: History },
  { id: "settings", label: "Settings", icon: Settings },
];

export function DisciplineMasterCommandCenter({ activeSection, routeMode }: { activeSection?: string; routeMode?: "hosted" | "public" }) {
  const queryClient = useQueryClient();
  const [activeWorkspace, setActiveWorkspaceState] = useState(activeSection && activeSection !== "dashboard" ? activeSection : "overview");

  const setActiveWorkspace = (view: string) => {
    setActiveWorkspaceState(view);
    const newPath = buildSchoolSectionHref("discipline-master", view, routeMode ?? "hosted");
    window.history.replaceState(null, "", newPath);
  };
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const renderWorkspace = () => {
    switch (activeWorkspace) {
      case "overview": return <OverviewWorkspace />;
      case "report-intake": return <ReportIntakeWorkspace />;
      case "log-incident": return <LogIncidentWorkspace />;
      case "incident-register": return <IncidentRegisterWorkspace />;
      case "triage-queue": return <TriageQueueWorkspace />;
      case "student-conduct": return <StudentConductProfilesWorkspace />;
      case "investigations": return <InvestigationsWorkspace />;
      case "actions": return <ActionsInterventionsWorkspace />;
      case "parent-comm": return <ParentCommunicationWorkspace />;
      case "counselling": return <CounsellingReferralsWorkspace />;
      case "approvals": return <SeriousCasesApprovalsWorkspace />;
      case "detention": return <DetentionProgramsWorkspace />;
      case "monitoring": return <ClassHouseMonitoringWorkspace />;
      case "reports": return <ReportsDownloadsWorkspace />;
      case "templates": return <TemplatesRulesWorkspace />;
      case "audit": return <AuditTrailWorkspace />;
      case "settings": return <SettingsWorkspace />;
      default: return <OverviewWorkspace />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-[#071D49]/20 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 transform bg-white shadow-xl transition-transform duration-300 lg:static lg:translate-x-0 lg:shadow-none lg:border-r lg:border-[#D8E0EC]",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-16 items-center justify-between border-b border-[#D8E0EC] px-6">
          <span className="text-lg font-black tracking-[-0.01em] text-[#071D49]">
            Discipline Office
          </span>
          <button 
            className="lg:hidden text-[#64748B] hover:text-[#071D49]"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="h-[calc(100vh-4rem)] overflow-y-auto p-4">
          <nav className="space-y-1">
            {SIDEBAR_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveWorkspace(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all",
                  activeWorkspace === item.id
                    ? "bg-[#EEF5FF] text-[#1D4ED8]"
                    : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#071D49]"
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5",
                  activeWorkspace === item.id ? "text-[#1D4ED8]" : "text-[#94A3B8]"
                )} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#D8E0EC] bg-white px-4 sm:px-6 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 -ml-2 text-[#64748B] hover:bg-[#F8FAFC] rounded-lg"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-sm sm:text-lg font-black text-[#071D49]">Good Morning, Discipline Master</h1>
              <p className="hidden sm:block text-xs font-semibold text-[#64748B]">
                Kisumu Boys High School &middot; 2026 Academic Year &middot; Term 2
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <button className="hidden sm:flex items-center gap-2 rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-[#0A2661] transition-colors">
              <FilePlus className="h-4 w-4" />
              <span>Log Incident</span>
            </button>
            <div className="flex items-center gap-2">
              <TaskQueue />
              <ApprovalInbox currentUserId="school" />
              <NotificationBell />
            </div>
            <button className="hidden sm:block rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-2 text-[#64748B] hover:bg-white hover:border-[#38BDF8] transition-all">
              <HelpCircle className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Workspace Area */}
        <div className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {renderWorkspace()}
          </div>
        </div>
      </main>
      
    </div>
  );
}
