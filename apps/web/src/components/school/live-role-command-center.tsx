"use client";

import { useMemo, useState, type ComponentType } from "react";
import {
  BedDouble,
  Boxes,
  BusFront,
  ClipboardList,
  FlaskConical,
  GraduationCap,
  HeartHandshake,
  Library,
  MonitorCog,
  ShieldCheck,
  Stethoscope,
  Users,
  type LucideIcon,
} from "lucide-react";

import { AllocationWorkspace as BoardingAllocationWorkspace } from "@/components/school/boarding-master/allocation-workspace";
import { BoardingAttendanceWorkspace } from "@/components/school/boarding-master/boarding-attendance-workspace";
import { HostelsWorkspace } from "@/components/school/boarding-master/hostels-workspace";
import { IncidentsWorkspace as BoardingIncidentsWorkspace } from "@/components/school/boarding-master/incidents-workspace";
import { LeaveExitWorkspace } from "@/components/school/boarding-master/leave-exit-workspace";
import { OverviewWorkspace as BoardingOverviewWorkspace } from "@/components/school/boarding-master/overview-workspace";
import { ReportsWorkspace as BoardingReportsWorkspace } from "@/components/school/boarding-master/reports-workspace";
import { RoomsBedsWorkspace } from "@/components/school/boarding-master/rooms-beds-workspace";
import { ActionsSanctionsWorkspace } from "@/components/school/discipline-master/actions-sanctions-workspace";
import { CasesWorkspace as DisciplineCasesWorkspace } from "@/components/school/discipline-master/cases-workspace";
import { CounsellingReferralsWorkspace as DisciplineCounsellingReferralsWorkspace } from "@/components/school/discipline-master/counselling-referrals-workspace";
import { IncidentLogWorkspace } from "@/components/school/discipline-master/incident-log-workspace";
import { OverviewWorkspace as DisciplineOverviewWorkspace } from "@/components/school/discipline-master/overview-workspace";
import { ParentSummonsWorkspace } from "@/components/school/discipline-master/parent-summons-workspace";
import { ReportsWorkspace as DisciplineReportsWorkspace } from "@/components/school/discipline-master/reports-workspace";
import { FollowUpsWorkspace } from "@/components/school/guidance-counselling/follow-ups-workspace";
import { OverviewWorkspace as CounsellingOverviewWorkspace } from "@/components/school/guidance-counselling/overview-workspace";
import { ParentEngagementWorkspace } from "@/components/school/guidance-counselling/parent-engagement-workspace";
import { ReferralsWorkspace } from "@/components/school/guidance-counselling/referrals-workspace";
import { ReportsWorkspace as CounsellingReportsWorkspace } from "@/components/school/guidance-counselling/reports-workspace";
import { SessionsWorkspace } from "@/components/school/guidance-counselling/sessions-workspace";
import { WelfareNotesWorkspace } from "@/components/school/guidance-counselling/welfare-notes-workspace";
import { AssetAssignmentWorkspace } from "@/components/school/ict-manager/asset-assignment-workspace";
import { AssetsWorkspace as IctAssetsWorkspace } from "@/components/school/ict-manager/assets-workspace";
import { FacilitiesIssuesWorkspace } from "@/components/school/ict-manager/facilities-issues-workspace";
import { LoansReturnsWorkspace } from "@/components/school/ict-manager/loans-returns-workspace";
import { MaintenanceWorkspace } from "@/components/school/ict-manager/maintenance-workspace";
import { OverviewWorkspace as IctOverviewWorkspace } from "@/components/school/ict-manager/overview-workspace";
import { ReportsWorkspace as IctReportsWorkspace } from "@/components/school/ict-manager/reports-workspace";
import { ApparatusIssueWorkspace } from "@/components/school/laboratory-technician/apparatus-issue-workspace";
import { ChemicalsWorkspace } from "@/components/school/laboratory-technician/chemicals-workspace";
import { LabInventoryWorkspace } from "@/components/school/laboratory-technician/lab-inventory-workspace";
import { LabTimetableWorkspace } from "@/components/school/laboratory-technician/lab-timetable-workspace";
import { OverviewWorkspace as LaboratoryOverviewWorkspace } from "@/components/school/laboratory-technician/overview-workspace";
import { ReportsWorkspace as LaboratoryReportsWorkspace } from "@/components/school/laboratory-technician/reports-workspace";
import { SafetyIncidentsWorkspace } from "@/components/school/laboratory-technician/safety-incidents-workspace";
import { StocktakeWorkspace as LaboratoryStocktakeWorkspace } from "@/components/school/laboratory-technician/stocktake-workspace";
import { BooksWorkspace } from "@/components/school/librarian/books-workspace";
import { BorrowersWorkspace } from "@/components/school/librarian/borrowers-workspace";
import { FinesLostDamagedWorkspace } from "@/components/school/librarian/fines-lost-damaged-workspace";
import { IssueBookWorkspace } from "@/components/school/librarian/issue-book-workspace";
import { OverviewWorkspace as LibrarianOverviewWorkspace } from "@/components/school/librarian/overview-workspace";
import { OverdueBooksWorkspace } from "@/components/school/librarian/overdue-books-workspace";
import { ReportsWorkspace as LibrarianReportsWorkspace } from "@/components/school/librarian/reports-workspace";
import { ReturnBookWorkspace } from "@/components/school/librarian/return-book-workspace";
import { DispensingLogWorkspace } from "@/components/school/nurse/dispensing-log-workspace";
import { HealthReportsWorkspace } from "@/components/school/nurse/health-reports-workspace";
import { MedicineInventoryWorkspace } from "@/components/school/nurse/medicine-inventory-workspace";
import { OverviewWorkspace as NurseOverviewWorkspace } from "@/components/school/nurse/overview-workspace";
import { ParentNotificationsWorkspace as NurseParentNotificationsWorkspace } from "@/components/school/nurse/parent-notifications-workspace";
import { SickBayQueueWorkspace } from "@/components/school/nurse/sick-bay-queue-workspace";
import { VisitsWorkspace } from "@/components/school/nurse/visits-workspace";
import { AcademicsWorkspace as ParentAcademicsWorkspace } from "@/components/school/parent/academics-workspace";
import { BehaviorWorkspace as ParentBehaviorWorkspace } from "@/components/school/parent/behavior-workspace";
import { DashboardWorkspace as ParentDashboardWorkspace } from "@/components/school/parent/dashboard-workspace";
import { DownloadsWorkspace as ParentDownloadsWorkspace } from "@/components/school/parent/downloads-workspace";
import { FeesWorkspace as ParentFeesWorkspace } from "@/components/school/parent/fees-workspace";
import { HealthWorkspace as ParentHealthWorkspace } from "@/components/school/parent/health-workspace";
import { MessagesWorkspace as ParentMessagesWorkspace } from "@/components/school/parent/messages-workspace";
import { NotificationsWorkspace as ParentNotificationsWorkspace } from "@/components/school/parent/notifications-workspace";
import { GateRegisterWorkspace } from "@/components/school/security-officer/gate-register-workspace";
import { IncidentsWorkspace as SecurityIncidentsWorkspace } from "@/components/school/security-officer/incidents-workspace";
import { OverviewWorkspace as SecurityOverviewWorkspace } from "@/components/school/security-officer/overview-workspace";
import { ReportsWorkspace as SecurityReportsWorkspace } from "@/components/school/security-officer/reports-workspace";
import { StaffMovementWorkspace } from "@/components/school/security-officer/staff-movement-workspace";
import { StudentExitPassesWorkspace } from "@/components/school/security-officer/student-exit-passes-workspace";
import { VisitorsWorkspace as SecurityVisitorsWorkspace } from "@/components/school/security-officer/visitors-workspace";
import { AppointmentsWorkspace } from "@/components/school/secretary/appointments-workspace";
import { CallsLogWorkspace } from "@/components/school/secretary/calls-log-workspace";
import { LettersDocumentsWorkspace } from "@/components/school/secretary/letters-documents-workspace";
import { OverviewWorkspace as SecretaryOverviewWorkspace } from "@/components/school/secretary/overview-workspace";
import { ParentMessagesWorkspace as SecretaryParentMessagesWorkspace } from "@/components/school/secretary/parent-messages-workspace";
import { ReceptionQueueWorkspace } from "@/components/school/secretary/reception-queue-workspace";
import { ReportsWorkspace as SecretaryReportsWorkspace } from "@/components/school/secretary/reports-workspace";
import { StudentClearanceWorkspace } from "@/components/school/secretary/student-clearance-workspace";
import { VisitorsWorkspace as SecretaryVisitorsWorkspace } from "@/components/school/secretary/visitors-workspace";
import {
  IntegratedSchoolCommandHeader,
  SchoolCommandSidebarIdentity,
} from "@/components/school/integrated-school-command-header";
import { AcademicsWorkspace as StudentAcademicsWorkspace } from "@/components/school/student/academics-workspace";
import { BehaviorWorkspace as StudentBehaviorWorkspace } from "@/components/school/student/behavior-workspace";
import { DashboardWorkspace as StudentDashboardWorkspace } from "@/components/school/student/dashboard-workspace";
import { DownloadsWorkspace as StudentDownloadsWorkspace } from "@/components/school/student/downloads-workspace";
import { FeesWorkspace as StudentFeesWorkspace } from "@/components/school/student/fees-workspace";
import { MessagesWorkspace as StudentMessagesWorkspace } from "@/components/school/student/messages-workspace";
import { NotificationsWorkspace as StudentNotificationsWorkspace } from "@/components/school/student/notifications-workspace";
import { DamagedMissingWorkspace } from "@/components/school/storekeeper/damaged-missing-workspace";
import { ItemsWorkspace } from "@/components/school/storekeeper/items-workspace";
import { LowStockWorkspace } from "@/components/school/storekeeper/low-stock-workspace";
import { OverviewWorkspace as StorekeeperOverviewWorkspace } from "@/components/school/storekeeper/overview-workspace";
import { ReportsWorkspace as StorekeeperReportsWorkspace } from "@/components/school/storekeeper/reports-workspace";
import { RequestsWorkspace } from "@/components/school/storekeeper/requests-workspace";
import { StockInWorkspace } from "@/components/school/storekeeper/stock-in-workspace";
import { StockIssueWorkspace } from "@/components/school/storekeeper/stock-issue-workspace";
import { StocktakeWorkspace } from "@/components/school/storekeeper/stocktake-workspace";
import { DriversWorkspace } from "@/components/school/transport-manager/drivers-workspace";
import { FuelMaintenanceWorkspace } from "@/components/school/transport-manager/fuel-maintenance-workspace";
import { OverviewWorkspace as TransportOverviewWorkspace } from "@/components/school/transport-manager/overview-workspace";
import { ReportsWorkspace as TransportReportsWorkspace } from "@/components/school/transport-manager/reports-workspace";
import { RoutesWorkspace } from "@/components/school/transport-manager/routes-workspace";
import { StudentTransportListWorkspace } from "@/components/school/transport-manager/student-transport-list-workspace";
import { TripsWorkspace } from "@/components/school/transport-manager/trips-workspace";
import { VehiclesWorkspace } from "@/components/school/transport-manager/vehicles-workspace";
import { SupportCenterWorkspace } from "@/components/support/support-center-workspace";
import { getPortalWorkspace } from "@/lib/experiences/portal-data";
import { getSchoolWorkspace, type SchoolExperienceRole } from "@/lib/experiences/school-data";
import type { PortalViewer } from "@/lib/experiences/types";
import { toPortalPath, type PortalSection } from "@/lib/routing/experience-routes";

import { buildSchoolSectionHref, type SchoolRouteMode } from "./school-pages";

type LiveSchoolRole =
  | "secretary"
  | "librarian"
  | "storekeeper"
  | "nurse"
  | "guidance-counselling"
  | "discipline-master"
  | "laboratory-technician"
  | "ict-manager"
  | "security-officer"
  | "transport-manager"
  | "boarding-master"
  | "student";

type LiveRole = LiveSchoolRole | PortalViewer;

type WorkspaceComponent = ComponentType;

type RoleCommandConfig = {
  roleTitle: string;
  roleLabel: string;
  eyebrow: string;
  subtitle: string;
  liveLabel: string;
  defaultSection: string;
  primarySection: string;
  primaryAction: string;
  icon: LucideIcon;
  workspaces: Record<string, WorkspaceComponent>;
};

const SUPPORT_SECTIONS = new Set([
  "support-new-ticket",
  "support-my-tickets",
  "support-knowledge-base",
  "support-system-status",
]);

const LIVE_ROLE_CONFIG: Record<LiveRole, RoleCommandConfig> = {
  secretary: {
    roleTitle: "Secretary Dashboard",
    roleLabel: "Secretary",
    eyebrow: "Front office command",
    subtitle: "Reception, visitors, appointments, documents, and parent communication",
    liveLabel: "Live front office",
    defaultSection: "overview",
    primarySection: "reception-queue",
    primaryAction: "Open reception queue",
    icon: Users,
    workspaces: {
      overview: SecretaryOverviewWorkspace,
      "reception-queue": ReceptionQueueWorkspace,
      visitors: SecretaryVisitorsWorkspace,
      appointments: AppointmentsWorkspace,
      "calls-log": CallsLogWorkspace,
      "letters-documents": LettersDocumentsWorkspace,
      "parent-messages": SecretaryParentMessagesWorkspace,
      "student-clearance": StudentClearanceWorkspace,
      reports: SecretaryReportsWorkspace,
    },
  },
  librarian: {
    roleTitle: "Librarian Dashboard",
    roleLabel: "Librarian",
    eyebrow: "Library command",
    subtitle: "Catalogue, circulation, borrowers, overdue books, fines, and reports",
    liveLabel: "Live library operations",
    defaultSection: "overview",
    primarySection: "books",
    primaryAction: "Open book catalogue",
    icon: Library,
    workspaces: {
      overview: LibrarianOverviewWorkspace,
      books: BooksWorkspace,
      "issue-book": IssueBookWorkspace,
      "return-book": ReturnBookWorkspace,
      borrowers: BorrowersWorkspace,
      "overdue-books": OverdueBooksWorkspace,
      "fines-lost-damaged": FinesLostDamagedWorkspace,
      reports: LibrarianReportsWorkspace,
    },
  },
  storekeeper: {
    roleTitle: "Storekeeper Dashboard",
    roleLabel: "Storekeeper",
    eyebrow: "Stores command",
    subtitle: "Inventory, receipts, issues, requests, stocktake, and loss control",
    liveLabel: "Live stores operations",
    defaultSection: "overview",
    primarySection: "items",
    primaryAction: "Open inventory",
    icon: Boxes,
    workspaces: {
      overview: StorekeeperOverviewWorkspace,
      items: ItemsWorkspace,
      "stock-in": StockInWorkspace,
      "stock-issue": StockIssueWorkspace,
      requests: RequestsWorkspace,
      "low-stock": LowStockWorkspace,
      stocktake: StocktakeWorkspace,
      "damaged-missing": DamagedMissingWorkspace,
      reports: StorekeeperReportsWorkspace,
    },
  },
  nurse: {
    roleTitle: "Nurse Dashboard",
    roleLabel: "School Nurse",
    eyebrow: "Health command",
    subtitle: "Sick bay, visits, medicine, dispensing, guardian alerts, and reports",
    liveLabel: "Live school health",
    defaultSection: "overview",
    primarySection: "visits",
    primaryAction: "Record health visit",
    icon: Stethoscope,
    workspaces: {
      overview: NurseOverviewWorkspace,
      "sick-bay-queue": SickBayQueueWorkspace,
      visits: VisitsWorkspace,
      "medicine-inventory": MedicineInventoryWorkspace,
      "dispensing-log": DispensingLogWorkspace,
      "parent-notifications": NurseParentNotificationsWorkspace,
      "health-reports": HealthReportsWorkspace,
    },
  },
  "guidance-counselling": {
    roleTitle: "School Counsellor Dashboard",
    roleLabel: "School Counsellor",
    eyebrow: "Counselling command",
    subtitle: "Referrals, confidential sessions, follow-ups, welfare, and parent engagement",
    liveLabel: "Live counselling operations",
    defaultSection: "overview",
    primarySection: "referrals",
    primaryAction: "Open referrals",
    icon: HeartHandshake,
    workspaces: {
      overview: CounsellingOverviewWorkspace,
      referrals: ReferralsWorkspace,
      sessions: SessionsWorkspace,
      "follow-ups": FollowUpsWorkspace,
      "welfare-notes": WelfareNotesWorkspace,
      "parent-engagement": ParentEngagementWorkspace,
      reports: CounsellingReportsWorkspace,
    },
  },
  "discipline-master": {
    roleTitle: "Discipline Master Dashboard",
    roleLabel: "Discipline Master",
    eyebrow: "Discipline command",
    subtitle: "Incident intake, cases, sanctions, parent summons, referrals, and reports",
    liveLabel: "Live discipline operations",
    defaultSection: "overview",
    primarySection: "incident-log",
    primaryAction: "Open incident log",
    icon: ShieldCheck,
    workspaces: {
      overview: DisciplineOverviewWorkspace,
      "incident-log": IncidentLogWorkspace,
      cases: DisciplineCasesWorkspace,
      "actions-sanctions": ActionsSanctionsWorkspace,
      "parent-summons": ParentSummonsWorkspace,
      "counselling-referrals": DisciplineCounsellingReferralsWorkspace,
      reports: DisciplineReportsWorkspace,
    },
  },
  "laboratory-technician": {
    roleTitle: "Laboratory Technician Dashboard",
    roleLabel: "Laboratory Technician",
    eyebrow: "School laboratory",
    subtitle: "Prepare practicals, manage stock, receive returns, and keep laboratory registers",
    liveLabel: "Today in the laboratory",
    defaultSection: "overview",
    primarySection: "lab-inventory",
    primaryAction: "Add Item",
    icon: FlaskConical,
    workspaces: {
      overview: LaboratoryOverviewWorkspace,
      "lab-inventory": LabInventoryWorkspace,
      "apparatus-issue": ApparatusIssueWorkspace,
      chemicals: ChemicalsWorkspace,
      "lab-timetable": LabTimetableWorkspace,
      stocktake: LaboratoryStocktakeWorkspace,
      "safety-incidents": SafetyIncidentsWorkspace,
      reports: LaboratoryReportsWorkspace,
    },
  },
  "ict-manager": {
    roleTitle: "ICT / Computer Lab Dashboard",
    roleLabel: "ICT Manager",
    eyebrow: "ICT command",
    subtitle: "Devices, assignments, maintenance, loans, facilities issues, and reports",
    liveLabel: "Live ICT operations",
    defaultSection: "overview",
    primarySection: "assets",
    primaryAction: "Open asset register",
    icon: MonitorCog,
    workspaces: {
      overview: IctOverviewWorkspace,
      assets: IctAssetsWorkspace,
      "asset-assignment": AssetAssignmentWorkspace,
      maintenance: MaintenanceWorkspace,
      "loans-returns": LoansReturnsWorkspace,
      "facilities-issues": FacilitiesIssuesWorkspace,
      reports: IctReportsWorkspace,
    },
  },
  "security-officer": {
    roleTitle: "Security Officer Dashboard",
    roleLabel: "Security Officer",
    eyebrow: "Security command",
    subtitle: "Gate register, visitors, exit passes, staff movement, incidents, and reports",
    liveLabel: "Live security operations",
    defaultSection: "overview",
    primarySection: "gate-register",
    primaryAction: "Open gate register",
    icon: ShieldCheck,
    workspaces: {
      overview: SecurityOverviewWorkspace,
      "gate-register": GateRegisterWorkspace,
      visitors: SecurityVisitorsWorkspace,
      "student-exit-passes": StudentExitPassesWorkspace,
      "staff-movement": StaffMovementWorkspace,
      incidents: SecurityIncidentsWorkspace,
      reports: SecurityReportsWorkspace,
    },
  },
  "transport-manager": {
    roleTitle: "Transport Manager Dashboard",
    roleLabel: "Transport Manager",
    eyebrow: "Transport command",
    subtitle: "Routes, vehicles, drivers, learner allocations, trips, maintenance, and reports",
    liveLabel: "Live transport operations",
    defaultSection: "overview",
    primarySection: "routes",
    primaryAction: "Open routes",
    icon: BusFront,
    workspaces: {
      overview: TransportOverviewWorkspace,
      routes: RoutesWorkspace,
      vehicles: VehiclesWorkspace,
      drivers: DriversWorkspace,
      "student-transport-list": StudentTransportListWorkspace,
      trips: TripsWorkspace,
      "fuel-maintenance": FuelMaintenanceWorkspace,
      reports: TransportReportsWorkspace,
    },
  },
  "boarding-master": {
    roleTitle: "Boarding Master Dashboard",
    roleLabel: "Boarding Master",
    eyebrow: "Boarding command",
    subtitle: "Hostels, rooms, beds, allocations, roll call, leave, incidents, and reports",
    liveLabel: "Live boarding operations",
    defaultSection: "overview",
    primarySection: "allocation",
    primaryAction: "Open allocations",
    icon: BedDouble,
    workspaces: {
      overview: BoardingOverviewWorkspace,
      hostels: HostelsWorkspace,
      "rooms-beds": RoomsBedsWorkspace,
      allocation: BoardingAllocationWorkspace,
      "boarding-attendance": BoardingAttendanceWorkspace,
      "leave-exit": LeaveExitWorkspace,
      incidents: BoardingIncidentsWorkspace,
      reports: BoardingReportsWorkspace,
    },
  },
  parent: {
    roleTitle: "Parent Dashboard",
    roleLabel: "Parent / Guardian",
    eyebrow: "Parent portal",
    subtitle: "Linked learners, fees, academics, conduct, health, messages, and documents",
    liveLabel: "Your school records",
    defaultSection: "dashboard",
    primarySection: "messages",
    primaryAction: "Open school messages",
    icon: Users,
    workspaces: {
      dashboard: ParentDashboardWorkspace,
      fees: ParentFeesWorkspace,
      academics: ParentAcademicsWorkspace,
      behavior: ParentBehaviorWorkspace,
      discipline: ParentBehaviorWorkspace,
      health: ParentHealthWorkspace,
      messages: ParentMessagesWorkspace,
      downloads: ParentDownloadsWorkspace,
      notifications: ParentNotificationsWorkspace,
    },
  },
  student: {
    roleTitle: "Student Dashboard",
    roleLabel: "Student",
    eyebrow: "Student portal",
    subtitle: "Your fees, academics, conduct, messages, documents, and notifications",
    liveLabel: "Your school records",
    defaultSection: "dashboard",
    primarySection: "academics",
    primaryAction: "Open academics",
    icon: GraduationCap,
    workspaces: {
      dashboard: StudentDashboardWorkspace,
      fees: StudentFeesWorkspace,
      academics: StudentAcademicsWorkspace,
      behavior: StudentBehaviorWorkspace,
      discipline: StudentBehaviorWorkspace,
      messages: StudentMessagesWorkspace,
      downloads: StudentDownloadsWorkspace,
      notifications: StudentNotificationsWorkspace,
    },
  },
};

export function isLiveRoleCommandCenterRole(role: SchoolExperienceRole): role is LiveSchoolRole {
  return Object.prototype.hasOwnProperty.call(LIVE_ROLE_CONFIG, role);
}

function buildPortalCommandSectionHref(
  viewer: PortalViewer,
  section: string,
  routeMode: SchoolRouteMode,
) {
  if (routeMode === "public") {
    return section === "dashboard"
      ? `/portal/${viewer}`
      : `/portal/${viewer}/${section}`;
  }

  return toPortalPath(section as PortalSection);
}

function groupLabel(section: string) {
  if (section === "overview" || section === "dashboard") {
    return "Command Center";
  }

  if (section === "reports" || section === "downloads" || section === "notifications" || SUPPORT_SECTIONS.has(section)) {
    return "Reports & Support";
  }

  return "Daily Operations";
}

function sectionDescription(label: string) {
  return `${label} records and actions for the current school`;
}

function normalizeSection(config: RoleCommandConfig, section?: string) {
  const normalized = String(section || config.defaultSection).trim().toLowerCase();
  if (config.workspaces[normalized] || SUPPORT_SECTIONS.has(normalized)) {
    return normalized;
  }
  if (normalized === "overview" && config.workspaces.dashboard) {
    return "dashboard";
  }
  if (normalized === "dashboard" && config.workspaces.overview) {
    return "overview";
  }
  return config.defaultSection;
}

export function LiveRoleCommandCenter({
  role,
  routeMode = "hosted",
  activeSection,
  tenantSlug,
  userLabel,
  experience = "school",
}: {
  role: LiveRole;
  routeMode?: SchoolRouteMode;
  activeSection?: string;
  tenantSlug?: string | null;
  userLabel?: string | null;
  experience?: "school" | "portal";
}) {
  const config = LIVE_ROLE_CONFIG[role];
  const [activeWorkspace, setActiveWorkspace] = useState(() => normalizeSection(config, activeSection));
  const workspaceDefinition = experience === "portal"
    ? getPortalWorkspace(role as PortalViewer, tenantSlug)
    : getSchoolWorkspace(role as SchoolExperienceRole, tenantSlug);

  const navItems = useMemo(
    () => workspaceDefinition.navItems.filter(
      (item) => Boolean(config.workspaces[item.id]) || SUPPORT_SECTIONS.has(item.id),
    ),
    [config.workspaces, workspaceDefinition.navItems],
  );

  const groupedNavItems = useMemo(
    () => navItems.reduce<Record<string, typeof navItems>>((groups, item) => {
      const group = groupLabel(item.id);
      groups[group] = [...(groups[group] ?? []), item];
      return groups;
    }, {}),
    [navItems],
  );

  const navigateTo = (section: string) => {
    const normalized = normalizeSection(config, section);
    setActiveWorkspace(normalized);
    const href = experience === "portal"
      ? buildPortalCommandSectionHref(role as PortalViewer, normalized, routeMode)
      : buildSchoolSectionHref(role as SchoolExperienceRole, normalized, routeMode);
    window.history.replaceState(null, "", href);
  };

  const ActiveWorkspace = config.workspaces[activeWorkspace];
  const activeItem = navItems.find((item) => item.id === activeWorkspace)
    ?? navItems.find((item) => item.id === config.defaultSection)
    ?? navItems[0];
  const workspace = SUPPORT_SECTIONS.has(activeWorkspace) ? (
    <SupportCenterWorkspace
      tenantSlug={tenantSlug}
      defaultView={activeWorkspace as "support-new-ticket" | "support-my-tickets" | "support-knowledge-base" | "support-system-status"}
    />
  ) : ActiveWorkspace ? (
    <ActiveWorkspace />
  ) : (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-900">
      This workspace is not available for the current role. Return to the role overview and retry.
    </div>
  );

  return (
    <div
      data-route-mode={routeMode}
      data-testid="live-role-command-center"
      data-role={role}
      className="min-h-screen bg-[#F3F6FA] p-3 md:p-5"
    >
      <div className="mx-auto grid max-w-[1800px] gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="hidden h-[calc(100vh-40px)] rounded-2xl bg-[#071D49] p-4 text-white shadow-[0_24px_70px_rgba(7,29,73,0.24)] xl:sticky xl:top-5 xl:flex xl:flex-col">
          <SchoolCommandSidebarIdentity
            eyebrow={config.eyebrow}
            title={config.roleLabel}
            subtitle={config.subtitle}
            icon={config.icon}
          />
          <nav className="flex-1 space-y-5 overflow-y-auto pr-1" aria-label={`${config.roleLabel} workspace navigation`}>
            {Object.entries(groupedNavItems).map(([group, items]) => (
              <div key={group}>
                <p className="px-3 text-[11px] font-black uppercase tracking-[0.16em] text-white/45">
                  {group}
                </p>
                <div className="mt-2 grid gap-1">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.id === activeWorkspace;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => navigateTo(item.id)}
                        className={`flex min-h-12 w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                          isActive
                            ? "bg-white/15 text-white shadow-[inset_4px_0_0_#22D3EE]"
                            : "text-white/70 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden={true} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-black">{item.label}</span>
                          <span className="mt-0.5 block text-[11px] font-semibold leading-4 text-white/50">
                            {sectionDescription(item.label)}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 space-y-5">
          <IntegratedSchoolCommandHeader
            roleTitle={config.roleTitle}
            fallbackUserLabel={userLabel?.trim() || config.roleLabel}
            actions={(
              <button
                type="button"
                onClick={() => navigateTo(config.primarySection)}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#071D49] px-4 text-sm font-black text-white hover:bg-[#0B2D6F]"
              >
                <ClipboardList className="h-4 w-4" aria-hidden={true} />
                {config.primaryAction}
              </button>
            )}
          />

          <div className="rounded-xl border border-[#C8D5EA] bg-white p-3 shadow-sm xl:hidden">
            <label
              htmlFor={`${role}-mobile-workspace`}
              className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#5F6F89]"
            >
              {config.roleLabel} workspace
            </label>
            <select
              id={`${role}-mobile-workspace`}
              value={activeWorkspace}
              onChange={(event) => navigateTo(event.currentTarget.value)}
              className="h-11 w-full rounded-lg border border-[#C8D5EA] bg-[#F8FAFC] px-3 text-sm font-bold text-[#071D49] outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-300/20"
            >
              {navItems.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </div>

          <section className="rounded-2xl bg-[#071D49] p-4 shadow-[0_24px_70px_rgba(7,29,73,0.18)] md:p-5">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">
                {config.liveLabel}
              </p>
              <h2 className="mt-1 text-2xl font-black text-white">{activeItem?.label ?? config.roleLabel}</h2>
              <p className="mt-1 text-sm font-semibold text-white/62">
                {sectionDescription(activeItem?.label ?? config.roleLabel)}
              </p>
            </div>
            {workspace}
          </section>
        </main>
      </div>
    </div>
  );
}
