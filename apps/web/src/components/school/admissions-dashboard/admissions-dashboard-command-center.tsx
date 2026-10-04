"use client";

import { BarChart3, FileInput, FileText, Import, MessageSquareText, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentType } from "react";
import { MobileWorkspaceNavigation } from "@/components/shared/mobile-workspace-navigation";
import { IntegratedSchoolCommandHeader, SchoolCommandSidebarIdentity } from "@/components/school/integrated-school-command-header";

import { AdmitStudentWorkspace, AdmissionRecordsWorkspace, AdmissionsCommunicationWorkspace, BulkAdmissionsWorkspace } from "./consolidated-workspaces";
import { AdmissionsOverviewWorkspace } from "./overview-workspace";
import { TransfersWorkspace } from "./transfers-workspace";
import { ParentLinkingWorkspace } from "../admissions/parent-linking-workspace";
import { ReportsWorkspace } from "../admissions/reports-workspace";

type AdmissionsRouteMode = "hosted" | "nested" | "public";

type AdmissionsWorkspaceId = "overview" | "applications" | "enrolment" | "parents" | "transfers" | "imports" | "communication" | "reports";
type AdmissionsNavItem = { id: AdmissionsWorkspaceId; label: string; group: string; icon: typeof Users };
const admissionsNavItems: AdmissionsNavItem[] = [
  { id: "overview", label: "Overview", group: "Admissions", icon: BarChart3 },
  { id: "applications", label: "Admit Student", group: "Admissions", icon: FileInput },
  { id: "enrolment", label: "Admission Records", group: "Admissions", icon: FileText },
  { id: "parents", label: "Parents & Guardians", group: "Admissions", icon: Users },
  { id: "transfers", label: "Transfers", group: "Admissions", icon: Import },
  { id: "imports", label: "Bulk Admission", group: "Admissions", icon: Import },
  { id: "communication", label: "Communication", group: "Admissions", icon: MessageSquareText },
  { id: "reports", label: "Reports", group: "Admissions", icon: BarChart3 },
];
const workspaceComponents: Record<AdmissionsWorkspaceId, ComponentType<{ initialSection?: string }>> = {
  overview: AdmissionsOverviewWorkspace,
  applications: AdmitStudentWorkspace,
  enrolment: AdmissionRecordsWorkspace,
  parents: ParentLinkingWorkspace,
  transfers: TransfersWorkspace,
  imports: BulkAdmissionsWorkspace,
  communication: AdmissionsCommunicationWorkspace,
  reports: ReportsWorkspace,
};
const legacyRouteAliases: Record<string, AdmissionsWorkspaceId> = {
  dashboard: "overview", admissions: "applications", "new-registration": "applications",
  "applicant-profiles": "enrolment", documents: "enrolment", interviews: "enrolment",
  selection: "enrolment", "fee-clearance": "enrolment", placement: "enrolment", "class-placement": "enrolment",
  "parent-linking": "parents", enquiries: "communication", appointments: "communication", templates: "communication", tasks: "communication",
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
  const router = useRouter();
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
      className="authenticated-app app-padded min-h-dvh bg-surface-strong p-2 text-foreground sm:p-4"
    >
      <div className="grid min-h-[calc(100dvh-3rem)] gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden rounded-3xl bg-primary p-5 text-white shadow-[0_24px_60px_rgba(7,29,73,0.18)] lg:sticky lg:top-6 lg:block lg:self-start">
          <SchoolCommandSidebarIdentity eyebrow="Admissions command" title="Admissions Officer" subtitle="Admit learners and manage school records" />

          <nav aria-label="Admissions" className="mt-4 space-y-3">
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
                        prefetch={false}
                        aria-current={isActive ? "page" : undefined}
                        className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-black transition ${
                          isActive
                            ? "bg-cyan-300 text-foreground"
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
          <div className="lg:hidden">
            <MobileWorkspaceNavigation
              label="Admissions workspace"
              items={admissionsNavItems}
              value={workspaceId}
              onValueChange={(value) => router.push(admissionsHref(value as AdmissionsWorkspaceId, routeMode))}
              testId="admissions-mobile-workspace-nav"
            />
          </div>
          <IntegratedSchoolCommandHeader
            roleTitle="Admissions Officer Dashboard"
            fallbackUserLabel="Admissions Officer"
            actions={<span className="text-sm font-semibold text-muted">{activeItem.label}</span>}
          />

          <div className="admissions-workspace min-w-0 [&_button]:min-h-11 [&_input]:min-h-11 [&_select]:min-h-11">
            <Workspace key={`${workspaceId}:${activeSection ?? ""}`} initialSection={activeSection} />
          </div>
        </section>
      </div>
    </main>
  );
}
