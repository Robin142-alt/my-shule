"use client";

import { useWorkspaceState } from "@/lib/routing/workspace-navigation";

import { useMemo, useEffect, type ComponentType } from "react";
import { workspaceResource } from "@/components/shared/workspace-resource";
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

const BoardingAllocationWorkspace = workspaceResource(() => import("@/components/school/boarding-master/allocation-workspace").then((module) => module.AllocationWorkspace));
const BoardingAttendanceWorkspace = workspaceResource(() => import("@/components/school/boarding-master/boarding-attendance-workspace").then((module) => module.BoardingAttendanceWorkspace));
const HostelsWorkspace = workspaceResource(() => import("@/components/school/boarding-master/hostels-workspace").then((module) => module.HostelsWorkspace));
const BoardingIncidentsWorkspace = workspaceResource(() => import("@/components/school/boarding-master/incidents-workspace").then((module) => module.IncidentsWorkspace));
const LeaveExitWorkspace = workspaceResource(() => import("@/components/school/boarding-master/leave-exit-workspace").then((module) => module.LeaveExitWorkspace));
const BoardingOverviewWorkspace = workspaceResource(() => import("@/components/school/boarding-master/overview-workspace").then((module) => module.OverviewWorkspace));
const BoardingReportsWorkspace = workspaceResource(() => import("@/components/school/boarding-master/reports-workspace").then((module) => module.ReportsWorkspace));
const RoomsBedsWorkspace = workspaceResource(() => import("@/components/school/boarding-master/rooms-beds-workspace").then((module) => module.RoomsBedsWorkspace));
const ActionsSanctionsWorkspace = workspaceResource(() => import("@/components/school/discipline-master/actions-sanctions-workspace").then((module) => module.ActionsSanctionsWorkspace));
const DisciplineCasesWorkspace = workspaceResource(() => import("@/components/school/discipline-master/cases-workspace").then((module) => module.CasesWorkspace));
const DisciplineCounsellingReferralsWorkspace = workspaceResource(() => import("@/components/school/discipline-master/counselling-referrals-workspace").then((module) => module.CounsellingReferralsWorkspace));
const IncidentLogWorkspace = workspaceResource(() => import("@/components/school/discipline-master/incident-log-workspace").then((module) => module.IncidentLogWorkspace));
const DisciplineOverviewWorkspace = workspaceResource(() => import("@/components/school/discipline-master/overview-workspace").then((module) => module.OverviewWorkspace));
const ParentSummonsWorkspace = workspaceResource(() => import("@/components/school/discipline-master/parent-summons-workspace").then((module) => module.ParentSummonsWorkspace));
const DisciplineReportsWorkspace = workspaceResource(() => import("@/components/school/discipline-master/reports-workspace").then((module) => module.ReportsWorkspace));
const FollowUpsWorkspace = workspaceResource(() => import("@/components/school/guidance-counselling/follow-ups-workspace").then((module) => module.FollowUpsWorkspace));
const CounsellingOverviewWorkspace = workspaceResource(() => import("@/components/school/guidance-counselling/overview-workspace").then((module) => module.OverviewWorkspace));
const ParentEngagementWorkspace = workspaceResource(() => import("@/components/school/guidance-counselling/parent-engagement-workspace").then((module) => module.ParentEngagementWorkspace));
const ReferralsWorkspace = workspaceResource(() => import("@/components/school/guidance-counselling/referrals-workspace").then((module) => module.ReferralsWorkspace));
const CounsellingReportsWorkspace = workspaceResource(() => import("@/components/school/guidance-counselling/reports-workspace").then((module) => module.ReportsWorkspace));
const SessionsWorkspace = workspaceResource(() => import("@/components/school/guidance-counselling/sessions-workspace").then((module) => module.SessionsWorkspace));
const CounsellingSettingsWorkspace = workspaceResource(() => import("@/components/school/guidance-counselling/settings-workspace").then((module) => module.SettingsWorkspace));
const WelfareNotesWorkspace = workspaceResource(() => import("@/components/school/guidance-counselling/welfare-notes-workspace").then((module) => module.WelfareNotesWorkspace));
const AssetAssignmentWorkspace = workspaceResource(() => import("@/components/school/ict-manager/asset-assignment-workspace").then((module) => module.AssetAssignmentWorkspace));
const IctAssetsWorkspace = workspaceResource(() => import("@/components/school/ict-manager/assets-workspace").then((module) => module.AssetsWorkspace));
const FacilitiesIssuesWorkspace = workspaceResource(() => import("@/components/school/ict-manager/facilities-issues-workspace").then((module) => module.FacilitiesIssuesWorkspace));
const LoansReturnsWorkspace = workspaceResource(() => import("@/components/school/ict-manager/loans-returns-workspace").then((module) => module.LoansReturnsWorkspace));
const MaintenanceWorkspace = workspaceResource(() => import("@/components/school/ict-manager/maintenance-workspace").then((module) => module.MaintenanceWorkspace));
const IctOverviewWorkspace = workspaceResource(() => import("@/components/school/ict-manager/overview-workspace").then((module) => module.OverviewWorkspace));
const IctReportsWorkspace = workspaceResource(() => import("@/components/school/ict-manager/reports-workspace").then((module) => module.ReportsWorkspace));
const ApparatusIssueWorkspace = workspaceResource(() => import("@/components/school/laboratory-technician/apparatus-issue-workspace").then((module) => module.ApparatusIssueWorkspace));
const ChemicalsWorkspace = workspaceResource(() => import("@/components/school/laboratory-technician/chemicals-workspace").then((module) => module.ChemicalsWorkspace));
const LabInventoryWorkspace = workspaceResource(() => import("@/components/school/laboratory-technician/lab-inventory-workspace").then((module) => module.LabInventoryWorkspace));
const LabTimetableWorkspace = workspaceResource(() => import("@/components/school/laboratory-technician/lab-timetable-workspace").then((module) => module.LabTimetableWorkspace));
const LaboratoryOverviewWorkspace = workspaceResource(() => import("@/components/school/laboratory-technician/overview-workspace").then((module) => module.OverviewWorkspace));
const LaboratoryReportsWorkspace = workspaceResource(() => import("@/components/school/laboratory-technician/reports-workspace").then((module) => module.ReportsWorkspace));
const SafetyIncidentsWorkspace = workspaceResource(() => import("@/components/school/laboratory-technician/safety-incidents-workspace").then((module) => module.SafetyIncidentsWorkspace));
const LaboratoryStocktakeWorkspace = workspaceResource(() => import("@/components/school/laboratory-technician/stocktake-workspace").then((module) => module.StocktakeWorkspace));
const BooksWorkspace = workspaceResource(() => import("@/components/school/librarian/books-workspace").then((module) => module.BooksWorkspace));
const BorrowersWorkspace = workspaceResource(() => import("@/components/school/librarian/borrowers-workspace").then((module) => module.BorrowersWorkspace));
const FinesLostDamagedWorkspace = workspaceResource(() => import("@/components/school/librarian/fines-lost-damaged-workspace").then((module) => module.FinesLostDamagedWorkspace));
const IssueBookWorkspace = workspaceResource(() => import("@/components/school/librarian/issue-book-workspace").then((module) => module.IssueBookWorkspace));
const LibrarianOverviewWorkspace = workspaceResource(() => import("@/components/school/librarian/overview-workspace").then((module) => module.OverviewWorkspace));
const OverdueBooksWorkspace = workspaceResource(() => import("@/components/school/librarian/overdue-books-workspace").then((module) => module.OverdueBooksWorkspace));
const LibrarianReportsWorkspace = workspaceResource(() => import("@/components/school/librarian/reports-workspace").then((module) => module.ReportsWorkspace));
const ReturnBookWorkspace = workspaceResource(() => import("@/components/school/librarian/return-book-workspace").then((module) => module.ReturnBookWorkspace));
const DispensingLogWorkspace = workspaceResource(() => import("@/components/school/nurse/dispensing-log-workspace").then((module) => module.DispensingLogWorkspace));
const HealthReportsWorkspace = workspaceResource(() => import("@/components/school/nurse/health-reports-workspace").then((module) => module.HealthReportsWorkspace));
const MedicineInventoryWorkspace = workspaceResource(() => import("@/components/school/nurse/medicine-inventory-workspace").then((module) => module.MedicineInventoryWorkspace));
const NurseOverviewWorkspace = workspaceResource(() => import("@/components/school/nurse/overview-workspace").then((module) => module.OverviewWorkspace));
const NurseParentNotificationsWorkspace = workspaceResource(() => import("@/components/school/nurse/parent-notifications-workspace").then((module) => module.ParentNotificationsWorkspace));
const SickBayQueueWorkspace = workspaceResource(() => import("@/components/school/nurse/sick-bay-queue-workspace").then((module) => module.SickBayQueueWorkspace));
const VisitsWorkspace = workspaceResource(() => import("@/components/school/nurse/visits-workspace").then((module) => module.VisitsWorkspace));
const ParentAcademicsWorkspace = workspaceResource(() => import("@/components/school/parent/academics-workspace").then((module) => module.AcademicsWorkspace));
const ParentBehaviorWorkspace = workspaceResource(() => import("@/components/school/parent/behavior-workspace").then((module) => module.BehaviorWorkspace));
const ParentDashboardWorkspace = workspaceResource(() => import("@/components/school/parent/dashboard-workspace").then((module) => module.DashboardWorkspace));
const ParentDownloadsWorkspace = workspaceResource(() => import("@/components/school/parent/downloads-workspace").then((module) => module.DownloadsWorkspace));
const ParentFeesWorkspace = workspaceResource(() => import("@/components/school/parent/fees-workspace").then((module) => module.FeesWorkspace));
const ParentHealthWorkspace = workspaceResource(() => import("@/components/school/parent/health-workspace").then((module) => module.HealthWorkspace));
const ParentMessagesWorkspace = workspaceResource(() => import("@/components/school/parent/messages-workspace").then((module) => module.MessagesWorkspace));
const ParentNotificationsWorkspace = workspaceResource(() => import("@/components/school/parent/notifications-workspace").then((module) => module.NotificationsWorkspace));
const PortalTimetableWorkspace = workspaceResource(() => import("@/components/school/portal-timetable-workspace").then((module) => module.PortalTimetableWorkspace));
const GateRegisterWorkspace = workspaceResource(() => import("@/components/school/security-officer/gate-register-workspace").then((module) => module.GateRegisterWorkspace));
const SecurityIncidentsWorkspace = workspaceResource(() => import("@/components/school/security-officer/incidents-workspace").then((module) => module.IncidentsWorkspace));
const SecurityOverviewWorkspace = workspaceResource(() => import("@/components/school/security-officer/overview-workspace").then((module) => module.OverviewWorkspace));
const SecurityReportsWorkspace = workspaceResource(() => import("@/components/school/security-officer/reports-workspace").then((module) => module.ReportsWorkspace));
const StaffMovementWorkspace = workspaceResource(() => import("@/components/school/security-officer/staff-movement-workspace").then((module) => module.StaffMovementWorkspace));
const StudentExitPassesWorkspace = workspaceResource(() => import("@/components/school/security-officer/student-exit-passes-workspace").then((module) => module.StudentExitPassesWorkspace));
const SecurityVisitorsWorkspace = workspaceResource(() => import("@/components/school/security-officer/visitors-workspace").then((module) => module.VisitorsWorkspace));
const AppointmentsWorkspace = workspaceResource(() => import("@/components/school/secretary/appointments-workspace").then((module) => module.AppointmentsWorkspace));
const CallsLogWorkspace = workspaceResource(() => import("@/components/school/secretary/calls-log-workspace").then((module) => module.CallsLogWorkspace));
const LettersDocumentsWorkspace = workspaceResource(() => import("@/components/school/secretary/letters-documents-workspace").then((module) => module.LettersDocumentsWorkspace));
const SecretaryOverviewWorkspace = workspaceResource(() => import("@/components/school/secretary/overview-workspace").then((module) => module.OverviewWorkspace));
const SecretaryParentMessagesWorkspace = workspaceResource(() => import("@/components/school/secretary/parent-messages-workspace").then((module) => module.ParentMessagesWorkspace));
const ReceptionQueueWorkspace = workspaceResource(() => import("@/components/school/secretary/reception-queue-workspace").then((module) => module.ReceptionQueueWorkspace));
const SecretaryReportsWorkspace = workspaceResource(() => import("@/components/school/secretary/reports-workspace").then((module) => module.ReportsWorkspace));
const StudentClearanceWorkspace = workspaceResource(() => import("@/components/school/secretary/student-clearance-workspace").then((module) => module.StudentClearanceWorkspace));
const SecretaryVisitorsWorkspace = workspaceResource(() => import("@/components/school/secretary/visitors-workspace").then((module) => module.VisitorsWorkspace));
import { MobileWorkspaceNavigation } from "@/components/shared/mobile-workspace-navigation";
import {
  IntegratedSchoolCommandHeader,
  SchoolCommandSidebarIdentity,
} from "@/components/school/integrated-school-command-header";
const StudentAcademicsWorkspace = workspaceResource(() => import("@/components/school/student/academics-workspace").then((module) => module.AcademicsWorkspace));
const StudentBehaviorWorkspace = workspaceResource(() => import("@/components/school/student/behavior-workspace").then((module) => module.BehaviorWorkspace));
const StudentDashboardWorkspace = workspaceResource(() => import("@/components/school/student/dashboard-workspace").then((module) => module.DashboardWorkspace));
const StudentDownloadsWorkspace = workspaceResource(() => import("@/components/school/student/downloads-workspace").then((module) => module.DownloadsWorkspace));
const StudentFeesWorkspace = workspaceResource(() => import("@/components/school/student/fees-workspace").then((module) => module.FeesWorkspace));
const StudentMessagesWorkspace = workspaceResource(() => import("@/components/school/student/messages-workspace").then((module) => module.MessagesWorkspace));
const StudentNotificationsWorkspace = workspaceResource(() => import("@/components/school/student/notifications-workspace").then((module) => module.NotificationsWorkspace));
const DamagedMissingWorkspace = workspaceResource(() => import("@/components/school/storekeeper/damaged-missing-workspace").then((module) => module.DamagedMissingWorkspace));
const ItemsWorkspace = workspaceResource(() => import("@/components/school/storekeeper/items-workspace").then((module) => module.ItemsWorkspace));
const LowStockWorkspace = workspaceResource(() => import("@/components/school/storekeeper/low-stock-workspace").then((module) => module.LowStockWorkspace));
const StorekeeperOverviewWorkspace = workspaceResource(() => import("@/components/school/storekeeper/overview-workspace").then((module) => module.OverviewWorkspace));
const StorekeeperReportsWorkspace = workspaceResource(() => import("@/components/school/storekeeper/reports-workspace").then((module) => module.ReportsWorkspace));
const RequestsWorkspace = workspaceResource(() => import("@/components/school/storekeeper/requests-workspace").then((module) => module.RequestsWorkspace));
const StockInWorkspace = workspaceResource(() => import("@/components/school/storekeeper/stock-in-workspace").then((module) => module.StockInWorkspace));
const StockIssueWorkspace = workspaceResource(() => import("@/components/school/storekeeper/stock-issue-workspace").then((module) => module.StockIssueWorkspace));
const StocktakeWorkspace = workspaceResource(() => import("@/components/school/storekeeper/stocktake-workspace").then((module) => module.StocktakeWorkspace));
const DriversWorkspace = workspaceResource(() => import("@/components/school/transport-manager/drivers-workspace").then((module) => module.DriversWorkspace));
const FuelMaintenanceWorkspace = workspaceResource(() => import("@/components/school/transport-manager/fuel-maintenance-workspace").then((module) => module.FuelMaintenanceWorkspace));
const TransportOverviewWorkspace = workspaceResource(() => import("@/components/school/transport-manager/overview-workspace").then((module) => module.OverviewWorkspace));
const TransportReportsWorkspace = workspaceResource(() => import("@/components/school/transport-manager/reports-workspace").then((module) => module.ReportsWorkspace));
const RoutesWorkspace = workspaceResource(() => import("@/components/school/transport-manager/routes-workspace").then((module) => module.RoutesWorkspace));
const StudentTransportListWorkspace = workspaceResource(() => import("@/components/school/transport-manager/student-transport-list-workspace").then((module) => module.StudentTransportListWorkspace));
const TripsWorkspace = workspaceResource(() => import("@/components/school/transport-manager/trips-workspace").then((module) => module.TripsWorkspace));
const VehiclesWorkspace = workspaceResource(() => import("@/components/school/transport-manager/vehicles-workspace").then((module) => module.VehiclesWorkspace));
import { SupportCenterWorkspace } from "@/components/support/support-center-workspace";
import { getPortalWorkspace } from "@/lib/experiences/portal-data";
import { getSchoolWorkspace, type SchoolExperienceRole } from "@/lib/experiences/school-data";
import type { PortalViewer } from "@/lib/experiences/types";
import { toPortalPath, type PortalSection } from "@/lib/routing/experience-routes";

import { buildSchoolSectionHref, type SchoolRouteMode } from "./school-pages";

import type { LiveSchoolRole } from "@/lib/routing/live-school-roles";
export { isLiveRoleCommandCenterRole } from "@/lib/routing/live-school-roles";

type LiveRole = LiveSchoolRole | PortalViewer;

type WorkspaceComponent = ComponentType & { preload?: () => Promise<ComponentType> };

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
      followups: FollowUpsWorkspace,
      "welfare-notes": WelfareNotesWorkspace,
      welfare: WelfareNotesWorkspace,
      "parent-engagement": ParentEngagementWorkspace,
      parents: ParentEngagementWorkspace,
      reports: CounsellingReportsWorkspace,
      settings: CounsellingSettingsWorkspace,
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
      timetable: PortalTimetableWorkspace,
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
      timetable: PortalTimetableWorkspace,
      behavior: StudentBehaviorWorkspace,
      discipline: StudentBehaviorWorkspace,
      messages: StudentMessagesWorkspace,
      downloads: StudentDownloadsWorkspace,
      notifications: StudentNotificationsWorkspace,
    },
  },
};

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
  const [activeWorkspace, setActiveWorkspace] = useWorkspaceState(() => normalizeSection(config, activeSection));
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

  const preload = (section: string) => { void config.workspaces[section]?.preload?.().catch(() => undefined); };
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? "")) return;
    const timer = window.setTimeout(() => {
      navItems.filter((item) => item.id !== activeWorkspace).slice(0, 2).forEach((item) => {
        void config.workspaces[item.id]?.preload?.().catch(() => undefined);
      });
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [config, navItems, activeWorkspace]);

  const navigateTo = (section: string) => {
    const normalized = normalizeSection(config, section);
    setActiveWorkspace(normalized);
    const href = experience === "portal"
      ? buildPortalCommandSectionHref(role as PortalViewer, normalized, routeMode)
      : buildSchoolSectionHref(role as SchoolExperienceRole, normalized, routeMode);
    window.history.pushState(null, "", href);
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
    <div className="rounded-xl border border-warning-border bg-warning-soft p-5 text-sm font-bold text-amber-900">
      This workspace is not available for the current role. Return to the role overview and retry.
    </div>
  );

  return (
    <div
      data-route-mode={routeMode}
      data-testid="live-role-command-center"
      data-role={role}
      className="authenticated-app app-padded min-h-dvh bg-background p-3 md:p-5"
    >
      <div className="mx-auto grid max-w-[1800px] gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="hidden h-[calc(100dvh-40px)] rounded-2xl bg-primary p-4 text-white shadow-[0_24px_70px_rgba(7,29,73,0.24)] xl:sticky xl:top-5 xl:flex xl:flex-col">
          <SchoolCommandSidebarIdentity
            eyebrow={config.eyebrow}
            title={config.roleLabel}
            subtitle={config.subtitle}
            icon={config.icon}
          />
          <nav className="dashboard-navigation flex-1 space-y-5 overflow-y-auto pr-1" aria-label={`${config.roleLabel} workspace navigation`}>
            {Object.entries(groupedNavItems).map(([group, items]) => (
              <div key={group}>
                <p className="dashboard-nav-group">
                  {group}
                </p>
                <div className="mt-2 grid gap-1">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.id === activeWorkspace;
                    return (
                      <button
                        aria-current={isActive ? "page" : undefined}
                        key={item.id}
                        type="button"
                        onPointerEnter={() => preload(item.id)}
                        onFocus={() => preload(item.id)}
                        onTouchStart={() => preload(item.id)}
                        onClick={() => navigateTo(item.id)}
                        className="dashboard-nav-item"
                      >
                        <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden={true} />
                        <span className="min-w-0">
                          <span className="dashboard-nav-label">{item.label}</span>
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
            audience={experience === "portal" ? "portal" : "school"}
            showSignOut={experience === "portal"}
            browserLoginPath={
              experience === "portal"
                ? role === "student"
                  ? "/student/login"
                  : "/parent/login"
                : "/school/login"
            }
            actions={(
              <button
                type="button"
                onClick={() => navigateTo(config.primarySection)}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-black text-white hover:bg-[#0B2D6F]"
              >
                <ClipboardList className="h-4 w-4" aria-hidden={true} />
                {config.primaryAction}
              </button>
            )}
          />

          <div className="xl:hidden">
            <MobileWorkspaceNavigation
              label={`${config.roleLabel} workspace`}
              items={navItems}
              value={activeWorkspace}
              onValueChange={navigateTo}
              testId={`${role}-mobile-workspace-nav`}
            />
          </div>

          <section className="app-workspace-surface rounded-2xl bg-primary p-4 shadow-[0_24px_70px_rgba(7,29,73,0.18)] md:p-5">
            <div className="app-workspace-heading mb-5 hidden lg:block">
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
