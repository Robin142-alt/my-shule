"use client";

import {
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  FileCheck,
  FileInput,
  FileText,
  HelpCircle,
  Import,
  Mail,
  MessageSquareText,
  Send,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";

import { ApplicantProfilesWorkspace } from "./applicant-profiles-workspace";
import { ApplicationsWorkspace } from "./applications-workspace";
import { AppointmentsWorkspace } from "./appointments-workspace";
import { CommunicationWorkspace } from "./communication-workspace";
import { EnquiriesWorkspace } from "./enquiries-workspace";
import { AdmissionsEnrolmentWorkspace } from "./enrolment-workspace";
import { FeeClearanceWorkspace } from "./fee-clearance-workspace";
import { ImportsWorkspace } from "./imports-workspace";
import { AdmissionsOverviewWorkspace } from "./overview-workspace";
import { SelectionWorkspace } from "./selection-workspace";
import { TasksWorkspace } from "./tasks-workspace";
import { TemplatesWorkspace } from "./templates-workspace";
import { TransfersWorkspace } from "./transfers-workspace";
import { ClassPlacementWorkspace } from "../admissions/class-placement-workspace";
import { DocumentsWorkspace } from "../admissions/documents-workspace";
import { InterviewsWorkspace } from "../admissions/interviews-workspace";
import { ParentLinkingWorkspace } from "../admissions/parent-linking-workspace";
import { ReportsWorkspace } from "../admissions/reports-workspace";

type AdmissionsRouteMode = "hosted" | "nested" | "public";

type AdmissionsWorkspaceId =
  | "overview"
  | "enquiries"
  | "applications"
  | "applicant-profiles"
  | "documents"
  | "interviews"
  | "appointments"
  | "selection"
  | "fee-clearance"
  | "placement"
  | "enrolment"
  | "parents"
  | "transfers"
  | "imports"
  | "templates"
  | "tasks"
  | "communication"
  | "reports";

type AdmissionsNavItem = {
  id: AdmissionsWorkspaceId;
  label: string;
  group: string;
  icon: typeof Users;
};

const admissionsNavItems: AdmissionsNavItem[] = [
  { id: "overview", label: "Overview", group: "Command", icon: BarChart3 },
  { id: "enquiries", label: "Enquiries", group: "Pipeline", icon: HelpCircle },
  { id: "applications", label: "Applications", group: "Pipeline", icon: FileInput },
  { id: "applicant-profiles", label: "Applicant Profiles", group: "Pipeline", icon: Users },
  { id: "documents", label: "Documents", group: "Verification", icon: FileCheck },
  { id: "interviews", label: "Interviews", group: "Verification", icon: CalendarCheck },
  { id: "appointments", label: "Appointments", group: "Verification", icon: ClipboardList },
  { id: "selection", label: "Selection & Offers", group: "Decision", icon: Send },
  { id: "fee-clearance", label: "Fee Clearance", group: "Decision", icon: CheckCircle2 },
  { id: "placement", label: "Class Placement", group: "Onboarding", icon: UserCheck },
  { id: "enrolment", label: "Enrolment", group: "Onboarding", icon: FileText },
  { id: "parents", label: "Parents", group: "Onboarding", icon: Users },
  { id: "transfers", label: "Transfers", group: "Records", icon: Import },
  { id: "imports", label: "Imports", group: "Records", icon: Import },
  { id: "templates", label: "Templates", group: "Records", icon: Mail },
  { id: "tasks", label: "Tasks", group: "Follow-up", icon: ClipboardList },
  { id: "communication", label: "Communication", group: "Follow-up", icon: MessageSquareText },
  { id: "reports", label: "Reports", group: "Follow-up", icon: BarChart3 },
];

const workspaceComponents: Record<AdmissionsWorkspaceId, ComponentType> = {
  overview: AdmissionsOverviewWorkspace,
  enquiries: EnquiriesWorkspace,
  applications: ApplicationsWorkspace,
  "applicant-profiles": ApplicantProfilesWorkspace,
  documents: DocumentsWorkspace,
  interviews: InterviewsWorkspace,
  appointments: AppointmentsWorkspace,
  selection: SelectionWorkspace,
  "fee-clearance": FeeClearanceWorkspace,
  placement: ClassPlacementWorkspace,
  enrolment: AdmissionsEnrolmentWorkspace,
  parents: ParentLinkingWorkspace,
  transfers: TransfersWorkspace,
  imports: ImportsWorkspace,
  templates: TemplatesWorkspace,
  tasks: TasksWorkspace,
  communication: CommunicationWorkspace,
  reports: ReportsWorkspace,
};

const legacyRouteAliases: Record<string, AdmissionsWorkspaceId> = {
  dashboard: "overview",
  admissions: "enrolment",
  "class-placement": "placement",
  "parent-linking": "parents",
};

function normalizeAdmissionsSection(section?: string): AdmissionsWorkspaceId {
  const normalized = (section || "overview").trim() || "overview";
  const alias = legacyRouteAliases[normalized];

  if (alias) {
    return alias;
  }

  if (Object.prototype.hasOwnProperty.call(workspaceComponents, normalized)) {
    return normalized as AdmissionsWorkspaceId;
  }

  return "overview";
}

function admissionsHref(section: AdmissionsWorkspaceId, routeMode: AdmissionsRouteMode) {
  if (routeMode === "public") {
    return section === "overview" ? "/school/admissions" : `/school/admissions/${section}`;
  }

  return section === "overview" ? "/dashboard" : `/${section}`;
}

export function AdmissionsDashboardCommandCenter({
  routeMode,
  activeSection,
}: {
  routeMode: AdmissionsRouteMode;
  activeSection?: string;
}) {
  const workspaceId = normalizeAdmissionsSection(activeSection);
  const Workspace = workspaceComponents[workspaceId];
  const activeItem =
    admissionsNavItems.find((item) => item.id === workspaceId) ?? admissionsNavItems[0];
  const groupedNav = admissionsNavItems.reduce<Record<string, AdmissionsNavItem[]>>((acc, item) => {
    acc[item.group] = [...(acc[item.group] ?? []), item];
    return acc;
  }, {});

  return (
    <main
      data-testid="admissions-dashboard-command-center"
      className="min-h-screen bg-[#F1F5F9] p-4 text-[#071D49] md:p-6"
    >
      <div className="grid min-h-[calc(100vh-3rem)] gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-3xl bg-[#071D49] p-5 text-white shadow-[0_24px_60px_rgba(7,29,73,0.18)]">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">
              Admissions Officer
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.02em]">Admissions</h1>
            <p className="mt-2 text-sm font-semibold text-white/70">
              Enquiries, applications, verification, placement, enrolment, and parent handoff.
            </p>
          </div>

          <nav className="mt-5 max-h-[calc(100vh-15rem)] space-y-5 overflow-y-auto pr-1">
            {Object.entries(groupedNav).map(([group, items]) => (
              <div key={group}>
                <p className="px-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/40">
                  {group}
                </p>
                <div className="mt-2 space-y-1">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.id === workspaceId;

                    return (
                      <Link
                        key={item.id}
                        href={admissionsHref(item.id, routeMode)}
                        className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-black transition ${
                          isActive
                            ? "bg-cyan-300 text-[#071D49]"
                            : "text-white/75 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <section className="min-w-0 space-y-5">
          <header className="rounded-3xl border border-[#D8E0EC] bg-white p-5 shadow-[0_18px_50px_rgba(7,29,73,0.08)]">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#64748B]">
              Admissions workspace
            </p>
            <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-3xl font-black tracking-[-0.03em] text-[#071D49]">
                  {activeItem.label}
                </h2>
                <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#64748B]">
                  Route-specific admissions workspace using live admissions endpoints and school-scoped empty states.
                </p>
              </div>
              <span className="inline-flex w-fit items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                Live school scoped
              </span>
            </div>
          </header>

          <div className="rounded-3xl bg-[#071D49] p-4 shadow-[0_24px_60px_rgba(7,29,73,0.14)] md:p-5">
            <Workspace />
          </div>
        </section>
      </div>
    </main>
  );
}
