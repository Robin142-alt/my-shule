"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  LogOut,
  MailCheck,
  Plus,
  RotateCcw,
  ShieldBan,
  Trash2,
  UserRoundCog,
  Database,
  Code,
  Blocks,
} from "lucide-react";

import { ActivityListCard, SimpleListCard } from "@/components/experience/activity-list-card";
import { ChartCard } from "@/components/experience/chart-card";
import { MetricGrid } from "@/components/experience/metric-grid";
import { QuickActionBar } from "@/components/experience/quick-action-bar";
import { PlatformShell } from "@/components/platform/platform-shell";
import { PlatformSupportWorkspace } from "@/components/support/platform-support-workspace";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { StatusPill } from "@/components/ui/status-pill";
import { getCsrfToken } from "@/lib/auth/csrf-client";
import { redirectOnExpiredSessionError } from "@/lib/auth/session-expiry-client";
import {
  fetchApiObservabilityAlerts,
  fetchApiObservabilityHealth,
  fetchApiReadiness,
  isDashboardApiConfigured,
} from "@/lib/dashboard/api-client";
import { downloadCsvFile } from "@/lib/dashboard/export";
import type { ExperienceNotificationItem } from "@/lib/experiences/types";
import {
  callbackFailures,
  infrastructureEvents,
  infrastructureMetrics,
  mapObservabilityAlertsToInfrastructureEvents,
  mapReadinessToInfrastructureMetrics,
  mpesaMonitoringRows,
  platformUsersRows,
  revenuePoints,
  subscriptionRows,
  supportActivity,
  superadminKpis,
  superadminNav,
  superadminProfile,
  superadminQuickActions,
  systemAlerts,
  tenantGrowthPoints,
  tenantRows,
  auditRows,
} from "@/lib/experiences/superadmin-data";
import {
  createPlatformSchool,
  deletePlatformSchool,
  hardDeletePlatformSchool,
  fetchPlatformSchools,
  fetchPlatformTenantProductSummary,
  fetchPlatformModules,
  fetchPlatformSchoolModules,
  resendPlatformSchoolAdminInvite,
  updatePlatformSchoolBilling,
  updatePlatformSchoolModules,
  type PlatformConfigurableBillingState,
  type PlatformManualBillingState,
  type PlatformSchool,
  type PlatformSchoolModuleAccess,
  type PlatformTenantProductSummary,
} from "@/lib/platform/school-onboarding-client";
import {
  defaultOnboardingModuleCodes,
  fallbackModuleCatalog,
  sortModuleCatalog,
  type ModuleRegistryItem,
} from "@/lib/module-access/module-access-map";
import { toSuperadminPath } from "@/lib/routing/experience-routes";
import { OnboardingWorkspace } from "./workspaces/OnboardingWorkspace";
import { SetupProgressWorkspace } from "./workspaces/SetupProgressWorkspace";
import { PrincipalInvitationsWorkspace } from "./workspaces/PrincipalInvitationsWorkspace";
import { DemoManagerWorkspace } from "./workspaces/DemoManagerWorkspace";
import { TenantHealthWorkspace } from "./workspaces/TenantHealthWorkspace";
import { PlatformSmsSettingsWorkspace } from "./workspaces/PlatformSmsSettingsWorkspace";
import { PaymentGatewaysWorkspace } from "./workspaces/PaymentGatewaysWorkspace";
import { SettingsWorkspace } from "./workspaces/SettingsWorkspace";
import { ModuleAccessWorkspace } from "./workspaces/ModuleAccessWorkspace";
import { SecurityPoliciesWorkspace } from "./workspaces/SecurityPoliciesWorkspace";
import { UsersWorkspace } from "./workspaces/UsersWorkspace";
import { AuditLogsWorkspace } from "./workspaces/AuditLogsWorkspace";
import { TemplatesCenterWorkspace } from "./workspaces/TemplatesCenterWorkspace";
import { BroadcastsWorkspace } from "./workspaces/BroadcastsWorkspace";
import { DataToolsWorkspace } from "./workspaces/DataToolsWorkspace";
import { PlatformReportsWorkspace } from "./workspaces/PlatformReportsWorkspace";


type SuperadminRouteMode = "hosted" | "public";

function buildSuperadminHref(
  section: Parameters<typeof toSuperadminPath>[0],
  routeMode: SuperadminRouteMode,
) {
  if (routeMode === "public") {
    return section === "dashboard" ? "/superadmin" : `/superadmin/${section}`;
  }

  return toSuperadminPath(section);
}

function mapSuperadminHref(href: string, routeMode: SuperadminRouteMode) {
  if (routeMode === "public") {
    return href === "/dashboard" ? "/superadmin" : `/superadmin${href}`;
  }

  return href;
}

export function SuperadminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Platform owner workspace
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Tenant watchlist</p>
          <h2 className="mt-2 text-2xl font-bold text-foreground">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </Card>
  );
}

const emptySchoolForm = {
  schoolName: "",
  tenantId: "",
  county: "",
  adminName: "",
  adminEmail: "",
};

type PlatformSmsProviderCode = "textsms_kenya" | "africas_talking" | "twilio";

type PlatformSmsProvider = {
  id: string;
  provider_name: string;
  provider_code: PlatformSmsProviderCode;
  api_key_masked: string;
  username_masked?: string | null;
  sender_id: string;
  base_url?: string | null;
  is_active: boolean;
  is_default: boolean;
  last_test_status?: string | null;
  last_tested_at?: string | null;
  updated_at?: string | null;
};

type PlatformSmsProviderForm = {
  provider_name: string;
  provider_code: PlatformSmsProviderCode;
  api_key: string;
  username: string;
  sender_id: string;
  base_url: string;
  is_active: boolean;
  is_default: boolean;
};

type SystemMonitorIssue = {
  id: string;
  school: string;
  issue: string;
  category: "SMS" | "M-Pesa" | "Report" | "Backup" | "Device";
  attempts: number;
  status: "Failed" | "Retrying" | "Recovered" | "Resolved";
  owner: string;
  lastUpdate: string;
};

const smsProviderOptions: Array<{
  code: PlatformSmsProviderCode;
  label: string;
}> = [
  { code: "textsms_kenya", label: "TextSMS Kenya" },
  { code: "africas_talking", label: "Africa's Talking" },
  { code: "twilio", label: "Twilio" },
];

const emptySmsProviderForm: PlatformSmsProviderForm = {
  provider_name: "TextSMS Kenya",
  provider_code: "textsms_kenya",
  api_key: "",
  username: "",
  sender_id: "MYSHULE",
  base_url: "",
  is_active: true,
  is_default: true,
};

const initialSystemMonitorIssues: SystemMonitorIssue[] = [
  {
    id: "monitor-sms-kisumu",
    school: "Kisumu Boys High School",
    issue: "Failed parent absence SMS batch",
    category: "SMS",
    attempts: 2,
    status: "Failed",
    owner: "Messaging desk",
    lastUpdate: "08:45",
  },
  {
    id: "monitor-mpesa-green",
    school: "Green Valley Junior School",
    issue: "M-Pesa callback pending confirmation",
    category: "M-Pesa",
    attempts: 1,
    status: "Failed",
    owner: "Payments desk",
    lastUpdate: "09:10",
  },
  {
    id: "monitor-report-stmarys",
    school: "St. Mary's Girls Secondary School",
    issue: "Board report generation failed",
    category: "Report",
    attempts: 3,
    status: "Failed",
    owner: "Reports desk",
    lastUpdate: "07:55",
  },
  {
    id: "monitor-backup-kisumu",
    school: "Kisumu Boys High School",
    issue: "Night backup completed with warnings",
    category: "Backup",
    attempts: 1,
    status: "Retrying",
    owner: "Infrastructure desk",
    lastUpdate: "06:30",
  },
  {
    id: "monitor-device-gate",
    school: "Kisumu Boys High School",
    issue: "Security gate tablet offline",
    category: "Device",
    attempts: 1,
    status: "Failed",
    owner: "ICT desk",
    lastUpdate: "08:05",
  },
];

type ApiEnvelope<T> = {
  data: T;
  meta?: Record<string, unknown>;
};

function unwrapPlatformPayload<T>(payload: T | ApiEnvelope<T> | null): T | null {
  return payload && typeof payload === "object" && "data" in payload
    ? (payload as ApiEnvelope<T>).data
    : (payload as T | null);
}

type PlatformTenantRow = Omit<(typeof tenantRows)[number], "invitationStatus"> & {
  adminEmail?: string;
  enabledModules?: string[];
  billingState?: PlatformManualBillingState;
  billingAccessMode?: "full" | "read_only" | "billing_only" | null;
  billingEffectiveUntil?: string | null;
  billingNote?: string | null;
  billingTone?: "ok" | "warning" | "critical";
  invitationStatus?: PlatformSchool["invitation_status"];
  invitationMessage?: string;
  invitationFailureCode?: string;
  invitationFailureReason?: string;
  invitationActionRequired?: string;
  canResendInvite?: boolean;
  inviteExpiresAt?: string;
};

const billingStateOptions: Array<{
  value: PlatformConfigurableBillingState;
  label: string;
}> = [
  { value: "active", label: "Active" },
  { value: "grace_period", label: "Grace period" },
  { value: "restricted", label: "Restricted" },
  { value: "suspended", label: "Suspended" },
  { value: "expired", label: "Expired" },
];

const billingToneByState: Record<PlatformManualBillingState, "ok" | "warning" | "critical"> = {
  not_configured: "warning",
  active: "ok",
  grace_period: "warning",
  restricted: "warning",
  suspended: "critical",
  expired: "critical",
};

function mapPlatformSchoolToTenantRow(row: PlatformSchool): PlatformTenantRow {
  const invitationLabel =
    row.invitation_status === "sent"
      ? "Invitation sent"
      : row.invitation_status === "queued"
        ? "Invite queued"
        : row.invitation_status === "blocked"
          ? "Email setup required"
          : "Invite delivery failed";
  const billingState = row.billing?.state ?? "not_configured";

  return {
    id: row.tenant_id,
    schoolName: row.school_name,
    status: row.status === "active" ? "Active" : "Suspended",
    statusTone: row.status === "active" ? "ok" : "critical",
    subscription: row.billing?.label ?? "Not configured",
    studentCount: "0",
    lastActive: invitationLabel,
    revenue: "KES 0",
    adminEmail: row.admin_email,
    enabledModules: row.enabled_modules ?? [],
    billingState,
    billingAccessMode: row.billing?.access_mode ?? null,
    billingEffectiveUntil: row.billing?.effective_until ?? null,
    billingNote: row.billing?.note ?? null,
    billingTone: billingToneByState[billingState],
    invitationStatus: row.invitation_status,
    invitationMessage: row.invitation_message,
    invitationFailureCode: row.invitation_failure_code,
    invitationFailureReason: row.invitation_failure_reason,
    invitationActionRequired: row.invitation_action_required,
    canResendInvite: row.can_resend_invite,
    inviteExpiresAt: row.invite_expires_at,
  };
}

function buildLiveSuperadminKpis(schools: PlatformSchool[]) {
  const totalSchools = schools.length;
  const activeSchools = schools.filter((school) => school.status === "active").length;
  const enabledModuleCount = schools.reduce(
    (total, school) => total + (school.enabled_modules?.length ?? 0),
    0,
  );
  const uniqueModuleCount = new Set(schools.flatMap((school) => school.enabled_modules ?? [])).size;

  return superadminKpis.map((metric) => {
    if (metric.id === "schools") {
      return {
        ...metric,
        value: String(totalSchools),
        helper:
          totalSchools > 0
            ? "Loaded from live platform schools after the latest refresh."
            : "No schools have been onboarded yet.",
        trend: `${totalSchools}`,
      };
    }

    if (metric.id === "active-schools") {
      return {
        ...metric,
        value: String(activeSchools),
        helper:
          enabledModuleCount > 0
            ? `${enabledModuleCount} enabled modules across live schools (${uniqueModuleCount} unique).`
            : "No enabled school modules have been assigned yet.",
        trend: `${activeSchools}`,
      };
    }

    return metric;
  });
}

const emptyTenantProductSummary: PlatformTenantProductSummary = {
  total_schools: 0,
  active_schools: 0,
  inactive_schools: 0,
  billing_active_schools: 0,
  billing_grace_period_schools: 0,
  billing_restricted_schools: 0,
  billing_suspended_schools: 0,
  pending_principal_invites: 0,
  failed_principal_invites: 0,
  expired_principal_invites: 0,
  schools_with_modules: 0,
  enabled_module_assignments: 0,
  generated_at: "",
};

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function TenantProductSummaryCard({
  summary,
}: {
  summary: PlatformTenantProductSummary;
}) {
  const attentionCount =
    summary.pending_principal_invites
    + summary.failed_principal_invites
    + summary.expired_principal_invites
    + summary.billing_restricted_schools
    + summary.billing_suspended_schools;
  const updatedAt = summary.generated_at
    ? new Date(summary.generated_at).toLocaleString("en-KE", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Waiting for live refresh";

  return (
    <Card className="p-5" data-testid="tenant-product-summary">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Production schools
          </p>
          <h2 className="mt-2 text-xl font-bold text-foreground">Tenants in product</h2>
          <p className="mt-2 text-sm text-muted">
            Authenticated school count, principal invitation health, billing state, and module allocation.
          </p>
        </div>
        <StatusPill
          label={attentionCount > 0 ? `${attentionCount} need review` : "No review needed"}
          tone={attentionCount > 0 ? "warning" : "ok"}
        />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[var(--radius-md)] border border-border bg-surface-soft p-4">
          <p className="text-3xl font-black text-foreground">{summary.total_schools}</p>
          <p className="mt-1 text-sm font-semibold text-muted">
            {pluralize(summary.active_schools, "active school")}
          </p>
          <p className="mt-1 text-xs text-muted">
            {pluralize(summary.inactive_schools, "inactive school")}
          </p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-border bg-surface-soft p-4">
          <p className="text-3xl font-black text-foreground">
            {summary.pending_principal_invites}
          </p>
          <p className="mt-1 text-sm font-semibold text-muted">
            {pluralize(summary.pending_principal_invites, "pending principal invite")}
          </p>
          <p className="mt-1 text-xs text-muted">
            {pluralize(summary.expired_principal_invites, "expired invite")}
          </p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-border bg-surface-soft p-4">
          <p className="text-3xl font-black text-foreground">
            {summary.failed_principal_invites}
          </p>
          <p className="mt-1 text-sm font-semibold text-muted">
            {pluralize(summary.failed_principal_invites, "failed invite delivery", "failed invite deliveries")}
          </p>
          <p className="mt-1 text-xs text-muted">
            {pluralize(summary.billing_restricted_schools, "restricted school")}
          </p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-border bg-surface-soft p-4">
          <p className="text-3xl font-black text-foreground">
            {summary.enabled_module_assignments}
          </p>
          <p className="mt-1 text-sm font-semibold text-muted">
            {pluralize(summary.enabled_module_assignments, "enabled module assignment")}
          </p>
          <p className="mt-1 text-xs text-muted">
            {pluralize(summary.schools_with_modules, "school")} with modules
          </p>
        </div>
      </div>
      <p className="mt-4 text-xs text-muted">Updated: {updatedAt}</p>
    </Card>
  );
}

function normalizeTenantProductSummary(value: unknown): PlatformTenantProductSummary {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptyTenantProductSummary;
  }

  const candidate = value as Partial<PlatformTenantProductSummary>;
  const toNumber = (item: unknown) =>
    typeof item === "number" && Number.isFinite(item) ? item : 0;

  return {
    total_schools: toNumber(candidate.total_schools),
    active_schools: toNumber(candidate.active_schools),
    inactive_schools: toNumber(candidate.inactive_schools),
    billing_active_schools: toNumber(candidate.billing_active_schools),
    billing_grace_period_schools: toNumber(candidate.billing_grace_period_schools),
    billing_restricted_schools: toNumber(candidate.billing_restricted_schools),
    billing_suspended_schools: toNumber(candidate.billing_suspended_schools),
    pending_principal_invites: toNumber(candidate.pending_principal_invites),
    failed_principal_invites: toNumber(candidate.failed_principal_invites),
    expired_principal_invites: toNumber(candidate.expired_principal_invites),
    schools_with_modules: toNumber(candidate.schools_with_modules),
    enabled_module_assignments: toNumber(candidate.enabled_module_assignments),
    generated_at:
      typeof candidate.generated_at === "string"
        ? candidate.generated_at
        : emptyTenantProductSummary.generated_at,
  };
}

function SuperadminLogoutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    setIsSigningOut(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-myshule-csrf": await getCsrfToken(),
        },
        credentials: "same-origin",
        body: JSON.stringify({ audience: "superadmin" }),
      });
    } finally {
      router.push("/superadmin/login");
      setIsSigningOut(false);
    }
  }

  return (
    <Button variant="secondary" disabled={isSigningOut} onClick={() => void signOut()}>
      <LogOut className="h-4 w-4" />
      {isSigningOut ? "Logging out" : "Logout"}
    </Button>
  );
}

function ModuleAllocationEditor({
  tenant,
  catalog,
  onSaved,
}: {
  tenant: PlatformTenantRow;
  catalog: ModuleRegistryItem[];
  onSaved: (tenantId: string, moduleCodes: string[]) => void;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<PlatformSchoolModuleAccess[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<string[]>(tenant.enabledModules ?? []);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTenantModules() {
      setIsLoading(true);
      setNotice(null);
      setError(null);

      try {
        const accessRows = await fetchPlatformSchoolModules(tenant.id);

        if (!cancelled) {
          setRows(accessRows);
          setSelectedCodes(accessRows.filter((row) => row.enabled).map((row) => row.code));
        }
      } catch (loadError) {
        if (redirectOnExpiredSessionError(loadError, "superadmin", (href) => router.replace(href))) {
          return;
        }

        if (!cancelled) {
          setRows(
            catalog.map((moduleItem) => ({
              ...moduleItem,
              enabled: (tenant.enabledModules ?? []).includes(moduleItem.code),
            })),
          );
          setSelectedCodes(tenant.enabledModules ?? []);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load live module access. Showing the last known allocation.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadTenantModules();

    return () => {
      cancelled = true;
    };
  }, [catalog, router, tenant.enabledModules, tenant.id]);

  function toggleModule(moduleCode: string) {
    setSelectedCodes((currentCodes) =>
      currentCodes.includes(moduleCode)
        ? currentCodes.filter((code) => code !== moduleCode)
        : [...currentCodes, moduleCode],
    );
    setNotice(null);
    setError(null);
  }

  async function saveModules() {
    if (selectedCodes.length === 0) {
      setError("Select at least one module before saving.");
      return;
    }

    setIsSaving(true);
    setNotice(null);
    setError(null);

    try {
      const updatedRows = await updatePlatformSchoolModules({
        tenantId: tenant.id,
        moduleCodes: selectedCodes,
      });
      const enabledCodes = updatedRows.filter((row) => row.enabled).map((row) => row.code);

      setRows(updatedRows);
      setSelectedCodes(enabledCodes);
      onSaved(tenant.id, enabledCodes);
      setNotice("Module allocation updated. Disabled module data remains preserved.");
    } catch (saveError) {
      if (redirectOnExpiredSessionError(saveError, "superadmin", (href) => router.replace(href))) {
        return;
      }

      setError(saveError instanceof Error ? saveError.message : "Unable to update module allocation.");
    } finally {
      setIsSaving(false);
    }
  }

  const visibleRows = rows.length > 0 ? rows : catalog.map((moduleItem) => ({
    ...moduleItem,
    enabled: selectedCodes.includes(moduleItem.code),
  }));

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-muted p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Module allocation</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Toggle modules without deleting the school&apos;s historical records.
          </p>
        </div>
        <StatusPill
          label={isLoading ? "Loading" : `${selectedCodes.length} enabled`}
          tone={selectedCodes.length > 0 ? "ok" : "warning"}
        />
      </div>
      {notice ? (
        <div className="rounded-[var(--radius-sm)] border border-success/20 bg-success/10 px-3 py-2 text-sm text-foreground">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-[var(--radius-sm)] border border-warning/20 bg-warning/10 px-3 py-2 text-sm text-foreground">
          {error}
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        {visibleRows.map((moduleItem) => {
          const isSelected = selectedCodes.includes(moduleItem.code);

          return (
            <label
              key={moduleItem.code}
              className={`flex min-h-24 items-start gap-3 rounded-[var(--radius-sm)] border p-3 text-sm transition ${
                isSelected
                  ? "border-accent bg-surface"
                  : "border-border bg-white/60"
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                disabled={isSaving || moduleItem.status === "inactive"}
                onChange={() => toggleModule(moduleItem.code)}
                className="mt-1 h-4 w-4 rounded border-border"
              />
              <span>
                <span className="block font-semibold text-foreground">{moduleItem.name}</span>
                <span className="mt-1 block leading-5 text-muted">{moduleItem.description}</span>
              </span>
            </label>
          );
        })}
      </div>
      <Button disabled={isSaving || isLoading} onClick={saveModules}>
        {isSaving ? "Saving modules" : "Save module access"}
      </Button>
    </div>
  );
}

function SuperadminOverview({ routeMode }: { routeMode: SuperadminRouteMode }) {
  const router = useRouter();
  const [schools, setSchools] = useState<PlatformSchool[]>([]);
  const [productSummary, setProductSummary] = useState<PlatformTenantProductSummary>(emptyTenantProductSummary);
  const [isLoadingSchools, setIsLoadingSchools] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setIsLoadingSchools(true);
      try {
        const [schoolsData, summaryData] = await Promise.all([
          fetchPlatformSchools(),
          fetchPlatformTenantProductSummary(),
        ]);
        if (!cancelled) {
          setSchools(schoolsData);
          setProductSummary(normalizeTenantProductSummary(summaryData));
        }
      } catch (error) {
        redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href));
      } finally {
        if (!cancelled) setIsLoadingSchools(false);
      }
    }
    void loadData();
    return () => { cancelled = true; };
  }, [router]);

  const liveKpis = buildLiveSuperadminKpis(schools);

  return (
    <div className="space-y-6">
      <SuperadminPageHeader
        title="Platform Overview"
        description="Tenant health, revenue, and system infrastructure at a glance."
      />
      <MetricGrid items={liveKpis} />
      <TenantProductSummaryCard summary={productSummary} />
      {schools.length > 0 ? (
        <Card className="p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Live module allocation
              </p>
              <h2 className="mt-2 text-xl font-bold text-foreground">Schools loaded from platform API</h2>
            </div>
            <StatusPill label={`${schools.length} schools`} tone="ok" />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {schools.map((school) => (
              <div key={school.tenant_id} className="rounded-[var(--radius-md)] border border-border bg-surface-soft px-4 py-3">
                <p className="font-semibold text-foreground">{school.school_name}</p>
                <p className="mt-1 text-sm text-muted">{school.enabled_modules?.length ?? 0} enabled</p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Tenant growth" subtitle="Monthly tenant count" points={tenantGrowthPoints} />
        <ChartCard title="Revenue" subtitle="Monthly revenue" points={revenuePoints} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <ActivityListCard
          title="Recent activity"
          subtitle="Platform-wide events"
          items={infrastructureEvents.map((ev) => ({
            id: ev.id,
            title: ev.title,
            detail: ev.detail,
            timeLabel: ev.timeLabel,
            tone: ev.tone,
          }))}
        />
        <SimpleListCard
          title="Infrastructure"
          subtitle="System metrics"
          items={infrastructureMetrics.map((m) => ({
            id: m.id,
            title: m.label,
            subtitle: m.value,
          }))}
        />
        <SimpleListCard
          title="System alerts"
          subtitle="Active alerts"
          items={systemAlerts.map((a) => ({
            id: a.id,
            title: a.title,
            subtitle: a.subtitle,
          }))}
        />
      </div>
    </div>
  );
}

function SchoolsWorkspace() {
  const router = useRouter();
  const [rows, setRows] = useState<PlatformTenantRow[]>(tenantRows);
  const [loadSchoolsError, setLoadSchoolsError] = useState<string | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendMessageTone, setResendMessageTone] = useState<"success" | "warning">("warning");
  const [resendingTenantId, setResendingTenantId] = useState<string | null>(null);
  const [billingMessage, setBillingMessage] = useState<string | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [updatingBillingTenantId, setUpdatingBillingTenantId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [schoolForm, setSchoolForm] = useState(emptySchoolForm);
  const [moduleCatalog, setModuleCatalog] = useState<ModuleRegistryItem[]>(fallbackModuleCatalog);
  const [selectedModuleCodes, setSelectedModuleCodes] = useState<string[]>(defaultOnboardingModuleCodes);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [createdTenantForInvite, setCreatedTenantForInvite] = useState<PlatformTenantRow | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingSchools, setIsLoadingSchools] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<PlatformTenantRow | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [hardDeleteEmptyTenant, setHardDeleteEmptyTenant] = useState(true);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const selectedTenant = rows.find((row) => row.id === selectedTenantId) ?? null;
  const isResendingInvite = resendingTenantId !== null;
  const blockedInviteRows = rows.filter((row) => row.invitationStatus === "blocked");

  function generateAdminResetBundle(row: PlatformTenantRow) {
    const generatedAt = new Date();
    const expiresAt = new Date(generatedAt.getTime() + 15 * 60 * 1000);
    const filename = `${row.schoolName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-admin-reset.csv`;

    downloadCsvFile({
      filename,
      headers: ["school", "tenantId", "adminEmail", "generatedAt", "expiresAt", "recoveryAction"],
      rows: [
        [
          row.schoolName,
          row.id,
          row.adminEmail ?? "No admin email recorded",
          generatedAt.toISOString(),
          expiresAt.toISOString(),
          "Reset admin password and require first-login rotation",
        ],
      ],
    });
    setSelectedTenantId(row.id);
    setResendMessage(null);
    setResetMessage(
      `Admin reset bundle downloaded for ${row.schoolName}: ${filename}, expires in 15 minutes, tenant ${row.id}.`,
    );
  }

  useEffect(() => {
    let cancelled = false;

    async function loadSchools() {
      setIsLoadingSchools(true);

      try {
        const liveRows = await fetchPlatformSchools();

        if (!cancelled) {
          setRows(liveRows.map(mapPlatformSchoolToTenantRow));
          setLoadSchoolsError(null);
        }
      } catch (error) {
        if (redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href))) {
          return;
        }

        if (!cancelled) {
          setRows((currentRows) => (currentRows.length > 0 ? currentRows : tenantRows));
          setLoadSchoolsError(
            error instanceof Error
              ? error.message
              : "Live platform schools could not be loaded.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSchools(false);
        }
      }
    }

    void loadSchools();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    async function loadModules() {
      try {
        const registry = await fetchPlatformModules();

        if (!cancelled) {
          setModuleCatalog(registry);
        }
      } catch (error) {
        if (redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href))) {
          return;
        }

        if (!cancelled) {
          setModuleCatalog(sortModuleCatalog(fallbackModuleCatalog));
        }
      }
    }

    void loadModules();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function submitSchoolCreate() {
    if (
      schoolForm.schoolName.trim().length < 2 ||
      schoolForm.tenantId.trim().length < 2 ||
      schoolForm.adminName.trim().length < 2 ||
      !schoolForm.adminEmail.includes("@")
    ) {
      setCreateError("Enter the school name, school URL slug, admin name, and admin email.");
      return;
    }

    if (selectedModuleCodes.length === 0) {
      setCreateError("Select at least one module for this school.");
      return;
    }

    setIsCreating(true);
    setCreateError(null);
    setCreateSuccess(null);
    setCreatedTenantForInvite(null);

    try {
      const createdSchool = await createPlatformSchool({
        schoolName: schoolForm.schoolName.trim(),
        tenantId: schoolForm.tenantId.trim(),
        county: schoolForm.county.trim() || undefined,
        adminName: schoolForm.adminName.trim(),
        adminEmail: schoolForm.adminEmail.trim(),
        moduleCodes: selectedModuleCodes,
      });
      const createdRow = mapPlatformSchoolToTenantRow(createdSchool);
      setRows((currentRows) => [
        createdRow,
        ...currentRows.filter((row) => row.id !== createdSchool.tenant_id),
      ]);
      setCreateSuccess(createdSchool.invitation_message);
      setCreatedTenantForInvite(createdRow);
      setSchoolForm(emptySchoolForm);
      setSelectedModuleCodes(defaultOnboardingModuleCodes);
    } catch (error) {
      if (redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href))) {
        return;
      }

      setCreateError(
        error instanceof Error
          ? error.message
          : "Unable to create this school right now.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  function updateTenantStatus(tenantId: string, nextStatus: "Active" | "Suspended") {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.id === tenantId
          ? {
              ...row,
              status: nextStatus,
              statusTone: nextStatus === "Active" ? "ok" : "critical",
              lastActive: nextStatus === "Active" ? "just now" : row.lastActive,
            }
          : row,
      ),
    );
  }

  function toggleOnboardingModule(moduleCode: string) {
    setSelectedModuleCodes((currentCodes) =>
      currentCodes.includes(moduleCode)
        ? currentCodes.filter((code) => code !== moduleCode)
        : [...currentCodes, moduleCode],
    );
  }

  function updateTenantModules(tenantId: string, moduleCodes: string[]) {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.id === tenantId ? { ...row, enabledModules: moduleCodes } : row,
      ),
    );
    setCreatedTenantForInvite((currentTenant) =>
      currentTenant?.id === tenantId
        ? { ...currentTenant, enabledModules: moduleCodes }
        : currentTenant,
    );
  }

  async function updateTenantBilling(
    tenantId: string,
    state: PlatformConfigurableBillingState,
  ) {
    const tenant = rows.find((row) => row.id === tenantId);
    const label = billingStateOptions.find((option) => option.value === state)?.label ?? "billing";

    setUpdatingBillingTenantId(tenantId);
    setBillingMessage(null);
    setBillingError(null);

    try {
      const updatedSchool = await updatePlatformSchoolBilling({
        tenantId,
        state,
        note: `Manual Superadmin billing state: ${label}`,
      });
      const updatedRow = mapPlatformSchoolToTenantRow(updatedSchool);

      setRows((currentRows) =>
        currentRows.map((row) => (row.id === updatedRow.id ? updatedRow : row)),
      );
      setCreatedTenantForInvite((currentTenant) =>
        currentTenant?.id === updatedRow.id ? updatedRow : currentTenant,
      );
      setBillingMessage(`${tenant?.schoolName ?? updatedRow.schoolName} billing set to ${updatedRow.subscription}.`);
    } catch (error) {
      if (redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href))) {
        return;
      }

      setBillingError(
        error instanceof Error ? error.message : "Unable to update this school's billing state.",
      );
    } finally {
      setUpdatingBillingTenantId(null);
    }
  }

  async function resendInviteForTenant(tenantId: string) {
    const tenant = rows.find((row) => row.id === tenantId) ?? createdTenantForInvite;

    if (!tenant || tenant.id !== tenantId) {
      return;
    }

    if (tenant.canResendInvite === false) {
      setResendMessageTone("warning");
      setResendMessage(
        tenant.invitationActionRequired ??
          "Email delivery is blocked by provider setup. Fix the email settings, then refresh this page.",
      );
      return;
    }

    setResendingTenantId(tenantId);
    setResendMessage(null);
    setResendMessageTone("warning");
    setResetMessage(null);

    try {
      const updatedSchool = await resendPlatformSchoolAdminInvite(tenantId);
      const updatedRow = mapPlatformSchoolToTenantRow(updatedSchool);

      setRows((currentRows) =>
        currentRows.map((row) => (row.id === updatedRow.id ? updatedRow : row)),
      );
      setCreatedTenantForInvite((currentTenant) =>
        currentTenant?.id === updatedRow.id ? updatedRow : currentTenant,
      );
      if (selectedTenantId === updatedRow.id) {
        setSelectedTenantId(updatedRow.id);
      }
      setResendMessageTone(
        updatedSchool.invitation_sent || updatedSchool.invitation_status === "sent"
          ? "success"
          : "warning",
      );
      setResendMessage(updatedSchool.invitation_message);
      setCreateSuccess((currentMessage) =>
        createdTenantForInvite?.id === updatedRow.id ? updatedSchool.invitation_message : currentMessage,
      );
    } catch (error) {
      if (redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href))) {
        return;
      }

      setResendMessageTone("warning");
      setResendMessage(
        error instanceof Error
          ? error.message
          : "Unable to resend this school invitation right now.",
      );
    } finally {
      setResendingTenantId(null);
    }
  }

  function startDeleteTenant(row: PlatformTenantRow) {
    setDeleteTarget(row);
    setDeleteConfirmation("");
    setDeleteReason("");
    setHardDeleteEmptyTenant(true);
    setDeleteError(null);
    setDeleteMessage(null);
  }

  async function submitDeleteTenant() {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);
    setDeleteMessage(null);

    try {
      const response = await deletePlatformSchool({
        tenantId: deleteTarget.id,
        confirmation: deleteConfirmation.trim(),
        reason: deleteReason.trim(),
        hardDeleteEmptyTenant,
      });

      if (response.deleted) {
        setRows((currentRows) => currentRows.filter((row) => row.id !== response.tenant_id));
      } else if (response.school) {
        const updatedRow = mapPlatformSchoolToTenantRow(response.school);
        setRows((currentRows) =>
          currentRows.map((row) => (row.id === response.tenant_id ? updatedRow : row)),
        );
      }

      setDeleteMessage(response.message);
      setDeleteTarget(null);
      setDeleteConfirmation("");
      setDeleteReason("");
    } catch (error) {
      if (redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href))) {
        return;
      }

      setDeleteError(
        error instanceof Error ? error.message : "Unable to delete or deprovision this school.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  async function submitHardDeleteTenant() {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);
    setDeleteMessage(null);

    try {
      const response = await hardDeletePlatformSchool({
        tenantId: deleteTarget.id,
        confirmation: deleteConfirmation.trim(),
        reason: deleteReason.trim(),
      });

      if (response.deleted) {
        setRows((currentRows) => currentRows.filter((row) => row.id !== response.tenant_id));
      }

      setDeleteMessage(response.message);
      setDeleteTarget(null);
      setDeleteConfirmation("");
      setDeleteReason("");
    } catch (error) {
      if (redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href))) {
        return;
      }

      setDeleteError(
        error instanceof Error ? error.message : "Unable to hard delete this school.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  const columns: DataTableColumn<PlatformTenantRow>[] = [
    {
      id: "schoolName",
      header: "School Name",
      render: (row) => <span className="font-semibold">{row.schoolName}</span>,
    },
    {
      id: "status",
      header: "Status",
      render: (row) => <StatusPill label={row.status} tone={row.statusTone} />,
    },
    {
      id: "subscription",
      header: "Billing",
      render: (row) => (
        <div className="flex min-w-40 flex-col gap-2">
          <StatusPill
            label={row.subscription}
            tone={row.billingTone ?? "warning"}
          />
          <select
            className="input-base h-9 min-w-40 text-xs"
            aria-label={`Set billing state for ${row.schoolName}`}
            value={row.billingState === "not_configured" ? "" : row.billingState}
            disabled={updatingBillingTenantId === row.id}
            onChange={(event) => {
              const nextState = event.target.value as PlatformConfigurableBillingState | "";

              if (nextState) {
                void updateTenantBilling(row.id, nextState);
              }
            }}
          >
            <option value="">
              {updatingBillingTenantId === row.id ? "Saving..." : "Set billing"}
            </option>
            {billingStateOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ),
    },
    {
      id: "modules",
      header: "Modules",
      render: (row) => `${row.enabledModules?.length ?? 0} enabled`,
      className: "text-right",
      headerClassName: "text-right",
    },
    { id: "studentCount", header: "Student Count", render: (row) => row.studentCount, className: "text-right", headerClassName: "text-right" },
    { id: "lastActive", header: "Last Active", render: (row) => row.lastActive },
    { id: "revenue", header: "Revenue", render: (row) => row.revenue, className: "text-right font-semibold", headerClassName: "text-right" },
    {
      id: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => {
            setSelectedTenantId(row.id);
            setResetMessage(null);
            setResendMessage(null);
          }}>
            Open tenant
          </Button>
          {row.adminEmail && row.invitationStatus !== "sent" ? (
            <Button
              variant="secondary"
              size="sm"
              aria-label={`Resend invite to ${row.schoolName}`}
              disabled={resendingTenantId === row.id || row.canResendInvite === false}
              onClick={() => void resendInviteForTenant(row.id)}
              title={row.canResendInvite === false ? row.invitationActionRequired : undefined}
            >
              <MailCheck className="h-4 w-4" />
              {row.canResendInvite === false
                ? "Fix email setup"
                : resendingTenantId === row.id
                  ? "Resending"
                  : "Resend invite"}
            </Button>
          ) : null}
          {row.status === "Suspended" ? (
            <Button variant="secondary" size="sm" onClick={() => updateTenantStatus(row.id, "Active")}>
              <RotateCcw className="h-4 w-4" />
              Activate
            </Button>
          ) : (
            <Button variant="danger" size="sm" onClick={() => updateTenantStatus(row.id, "Suspended")}>
              <ShieldBan className="h-4 w-4" />
              Suspend
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => {
            generateAdminResetBundle(row);
          }}>
            <UserRoundCog className="h-4 w-4" />
            Reset admin
          </Button>
          <Button variant="ghost" size="sm" onClick={() => startDeleteTenant(row)}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      ),
      className: "text-right",
      headerClassName: "text-right",
    },
  ];

  return (
    <div className="space-y-6">
      <SuperadminPageHeader 
        title="Schools / Tenants" 
        description="Complete registry of all schools operating on the platform." 
        actions={
          <Button onClick={() => {
            setIsCreateOpen(true);
            setCreateError(null);
            setCreateSuccess(null);
            setCreatedTenantForInvite(null);
            setSelectedModuleCodes(defaultOnboardingModuleCodes);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Create School
          </Button>
        }
      />
      {resendMessage && !selectedTenant ? (
        <div
          role={resendMessageTone === "success" ? "status" : "alert"}
          className={`mb-4 rounded-[var(--radius-sm)] border px-4 py-3 text-sm text-foreground ${
            resendMessageTone === "success"
              ? "border-success/20 bg-success/10"
              : "border-warning/20 bg-warning/10"
          }`}
        >
          {resendMessage}
        </div>
      ) : null}
      {loadSchoolsError ? (
        <div className="mb-4 rounded-[var(--radius-sm)] border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-foreground">
          {loadSchoolsError}
        </div>
      ) : null}
      {deleteMessage ? (
        <div className="mb-4 rounded-[var(--radius-sm)] border border-success/20 bg-success/10 px-4 py-3 text-sm text-foreground">
          {deleteMessage}
        </div>
      ) : null}
      {billingMessage ? (
        <div className="mb-4 rounded-[var(--radius-sm)] border border-success/20 bg-success/10 px-4 py-3 text-sm text-foreground">
          {billingMessage}
        </div>
      ) : null}
      {billingError ? (
        <div className="mb-4 rounded-[var(--radius-sm)] border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-foreground">
          {billingError}
        </div>
      ) : null}
      {blockedInviteRows.length > 0 ? (
        <div className="mb-4 flex gap-3 rounded-[var(--radius-sm)] border border-warning/25 bg-warning/10 px-4 py-3 text-sm text-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div>
            <p className="font-semibold">School invites are blocked by email provider setup.</p>
            <p className="mt-1 text-muted">
              Verify a Resend sending domain and set EMAIL_FROM to that verified domain before resending.
              The resend buttons are disabled so the system does not keep repeating the same failed delivery.
            </p>
          </div>
        </div>
      ) : null}
      <DataTable
        title="School control"
        subtitle="Every school is separated operationally, while platform support can review billing, access, and activity from one control surface."
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        emptyMessage={
          isLoadingSchools
            ? "Loading live school records."
            : "No schools have been onboarded. Create the first school to send a real administrator invitation."
        }
      />
      <Modal
        open={isCreateOpen}
        title="Create school"
        description="This creates a real school account, prepares RBAC roles, and emails the first school administrator."
        size="lg"
        onClose={() => {
          if (!isCreating) {
            setIsCreateOpen(false);
            setCreateSuccess(null);
            setCreateError(null);
            setCreatedTenantForInvite(null);
          }
        }}
        footer={
          <>
            <Button
              variant="secondary"
              disabled={isCreating}
              onClick={() => setIsCreateOpen(false)}
            >
              Close
            </Button>
            <Button disabled={isCreating} onClick={submitSchoolCreate}>
              <MailCheck className="h-4 w-4" />
              {isCreating ? "Sending invite" : "Create and invite"}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          {[
            {
              id: "schoolName",
              label: "School name",
              placeholder: "Official school name",
              value: schoolForm.schoolName,
            },
            {
              id: "tenantId",
              label: "School URL slug",
              placeholder: "Unique school URL slug",
              value: schoolForm.tenantId,
            },
            {
              id: "county",
              label: "County",
              placeholder: "County name",
              value: schoolForm.county,
            },
            {
              id: "adminName",
              label: "Administrator name",
              placeholder: "Principal name",
              value: schoolForm.adminName,
            },
            {
              id: "adminEmail",
              label: "Administrator email",
              placeholder: "Administrator email address",
              value: schoolForm.adminEmail,
              type: "email",
              className: "md:col-span-2",
            },
          ].map((field) => (
            <label key={field.id} className={`space-y-1.5 ${field.className ?? ""}`}>
              <span className="text-[13px] font-semibold text-foreground">{field.label}</span>
              <input
                type={field.type ?? "text"}
                value={field.value}
                placeholder={field.placeholder}
                disabled={isCreating}
                onChange={(event) =>
                  setSchoolForm((currentForm) => ({
                    ...currentForm,
                    [field.id]: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>
          ))}
        </div>
        <div className="mt-5 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Module stack</p>
              <p className="mt-1 text-[13px] text-muted">
                Enable only the modules this school should receive on day one.
              </p>
            </div>
            <StatusPill
              label={`${selectedModuleCodes.length} selected`}
              tone={selectedModuleCodes.length > 0 ? "ok" : "warning"}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {moduleCatalog.map((moduleItem) => {
              const isSelected = selectedModuleCodes.includes(moduleItem.code);

              return (
                <label
                  key={moduleItem.code}
                  className={`flex min-h-28 items-start gap-3 rounded-[var(--radius-sm)] border p-3 text-sm transition ${
                    isSelected
                      ? "border-accent bg-accent-soft"
                      : "border-border bg-surface-muted"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isCreating || moduleItem.status === "inactive"}
                    onChange={() => toggleOnboardingModule(moduleItem.code)}
                    className="mt-1 h-4 w-4 rounded border-border"
                  />
                  <span>
                    <span className="block font-semibold text-foreground">{moduleItem.name}</span>
                    <span className="mt-1 block leading-5 text-muted">{moduleItem.description}</span>
                    {moduleItem.status === "inactive" ? (
                      <span className="mt-2 inline-flex text-xs font-semibold text-warning">
                        Globally inactive
                      </span>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
        {createError ? (
          <div className="mt-4 rounded-[var(--radius-sm)] border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
            {createError}
          </div>
        ) : null}
        {createSuccess ? (
          <div className="mt-4 space-y-3 rounded-[var(--radius-sm)] border border-success/20 bg-success/10 px-4 py-3 text-sm text-foreground">
            <p>{createSuccess}</p>
            {createdTenantForInvite ? (
              <div className="flex flex-col gap-3 rounded-xl border border-success/20 bg-white/70 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-foreground">{createdTenantForInvite.schoolName}</p>
                  <p className="mt-1 text-xs text-muted">
                    Admin invite: {createdTenantForInvite.adminEmail || "No administrator email recorded"}
                  </p>
                </div>
                {createdTenantForInvite.invitationStatus !== "sent" ? (
                  <Button
                    size="sm"
                    disabled={
                      resendingTenantId === createdTenantForInvite.id ||
                      createdTenantForInvite.canResendInvite === false
                    }
                    onClick={() => void resendInviteForTenant(createdTenantForInvite.id)}
                    title={
                      createdTenantForInvite.canResendInvite === false
                        ? createdTenantForInvite.invitationActionRequired
                        : undefined
                    }
                  >
                    <MailCheck className="h-4 w-4" />
                    {createdTenantForInvite.canResendInvite === false
                      ? "Fix email setup first"
                      : resendingTenantId === createdTenantForInvite.id
                        ? "Resending"
                        : "Resend invite now"}
                  </Button>
                ) : (
                  <StatusPill label="Invitation sent" tone="ok" />
                )}
              </div>
            ) : null}
            {createdTenantForInvite?.invitationActionRequired ? (
              <p className="rounded-xl border border-warning/25 bg-warning/10 px-3 py-2 text-xs text-muted-strong">
                {createdTenantForInvite.invitationActionRequired}
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>
      <Modal
        open={Boolean(selectedTenant)}
        title="School control"
        description="Review the school state, confirm support actions, and recover access safely."
        onClose={() => {
          setSelectedTenantId(null);
          setResetMessage(null);
          setResendMessage(null);
        }}
        footer={
          selectedTenant ? (
            <>
              <Button variant="secondary" onClick={() => setSelectedTenantId(null)}>
                Close
              </Button>
              <Button
                variant="secondary"
                disabled={
                  isResendingInvite ||
                  !selectedTenant.adminEmail ||
                  selectedTenant.canResendInvite === false
                }
                onClick={() => void resendInviteForTenant(selectedTenant.id)}
                title={
                  selectedTenant.canResendInvite === false
                    ? selectedTenant.invitationActionRequired
                    : undefined
                }
              >
                <MailCheck className="h-4 w-4" />
                {selectedTenant.canResendInvite === false
                  ? "Fix email setup"
                  : resendingTenantId === selectedTenant.id
                    ? "Resending"
                    : "Resend invite"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => generateAdminResetBundle(selectedTenant)}
              >
                Reset admin
              </Button>
              {selectedTenant.status === "Suspended" ? (
                <Button
                  onClick={() => {
                    updateTenantStatus(selectedTenant.id, "Active");
                    setSelectedTenantId(null);
                  }}
                >
                  Activate
                </Button>
              ) : (
                <Button
                  variant="danger"
                  onClick={() => {
                    updateTenantStatus(selectedTenant.id, "Suspended");
                    setSelectedTenantId(null);
                  }}
                >
                  Suspend
                </Button>
              )}
              <Button
                variant="danger"
                onClick={() => {
                  startDeleteTenant(selectedTenant);
                  setSelectedTenantId(null);
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </>
          ) : null
        }
      >
        {selectedTenant ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-surface-muted px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  School
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {selectedTenant.schoolName}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-surface-muted px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Status
                </p>
                <div className="mt-2">
                  <StatusPill label={selectedTenant.status} tone={selectedTenant.statusTone} />
                </div>
              </div>
              <div className="rounded-xl border border-border bg-surface-muted px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Billing
                </p>
                <div className="mt-2 flex flex-col gap-2">
                  <StatusPill
                    label={selectedTenant.subscription}
                    tone={selectedTenant.billingTone ?? "warning"}
                  />
                  <select
                    className="input-base h-9 text-xs"
                    aria-label={`Set billing state for ${selectedTenant.schoolName}`}
                    value={selectedTenant.billingState === "not_configured" ? "" : selectedTenant.billingState}
                    disabled={updatingBillingTenantId === selectedTenant.id}
                    onChange={(event) => {
                      const nextState = event.target.value as PlatformConfigurableBillingState | "";

                      if (nextState) {
                        void updateTenantBilling(selectedTenant.id, nextState);
                      }
                    }}
                  >
                    <option value="">
                      {updatingBillingTenantId === selectedTenant.id ? "Saving..." : "Set billing"}
                    </option>
                    {billingStateOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-surface-muted px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Revenue
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">{selectedTenant.revenue}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface-muted px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Admin invite
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {selectedTenant.adminEmail || "No admin email recorded"}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {selectedTenant.invitationMessage || selectedTenant.lastActive}
                </p>
                {selectedTenant.invitationActionRequired ? (
                  <p className="mt-2 rounded-lg border border-warning/25 bg-warning/10 px-3 py-2 text-xs text-muted-strong">
                    {selectedTenant.invitationActionRequired}
                  </p>
                ) : null}
              </div>
            </div>
            <ModuleAllocationEditor
              tenant={selectedTenant}
              catalog={moduleCatalog}
              onSaved={updateTenantModules}
            />
            {resetMessage ? (
              <div className="rounded-xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-foreground">
                {resetMessage}
              </div>
            ) : null}
            {resendMessage ? (
              <div
                role={resendMessageTone === "success" ? "status" : "alert"}
                className={`rounded-xl border px-4 py-3 text-sm text-foreground ${
                  resendMessageTone === "success"
                    ? "border-success/20 bg-success/10"
                    : "border-warning/20 bg-warning/10"
                }`}
              >
                {resendMessage}
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
      <Modal
        open={Boolean(deleteTarget)}
        title="Delete school"
        description="Empty test schools can be permanently removed. Schools with records are safely deprovisioned instead."
        size="lg"
        onClose={() => {
          if (!isDeleting) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        footer={
          <>
            <Button
              variant="secondary"
              disabled={isDeleting}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={
                isDeleting ||
                !deleteTarget ||
                deleteConfirmation.trim().toLowerCase() !== deleteTarget.id ||
                deleteReason.trim().length < 3
              }
              onClick={() => void submitDeleteTenant()}
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? "Deleting" : "Delete or deprovision"}
            </Button>
            <Button
              variant="danger"
              disabled={
                isDeleting ||
                !deleteTarget ||
                deleteConfirmation.trim().toLowerCase() !== deleteTarget.id ||
                deleteReason.trim().length < 3
              }
              onClick={() => void submitHardDeleteTenant()}
            >
              <ShieldBan className="h-4 w-4" />
              {isDeleting ? "Purging" : "Hard Delete (Purge)"}
            </Button>
          </>
        }
      >
        {deleteTarget ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-foreground">
              <p className="font-semibold">This action affects the school account.</p>
              <p className="mt-1 text-muted-strong">
                If the school has students, invoices, support tickets, or MPESA records, the system will
                deactivate it instead of deleting history.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-surface-muted px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  School
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {deleteTarget.schoolName}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-surface-muted px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Confirmation slug
                </p>
                <p className="mt-2 font-mono text-sm font-semibold text-foreground">
                  {deleteTarget.id}
                </p>
              </div>
            </div>
            <label className="block space-y-1.5">
              <span className="text-[13px] font-semibold text-foreground">
                Type {deleteTarget.id} to confirm
              </span>
              <input
                value={deleteConfirmation}
                disabled={isDeleting}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                className="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-danger focus:ring-2 focus:ring-danger/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[13px] font-semibold text-foreground">Audit reason</span>
              <textarea
                value={deleteReason}
                disabled={isDeleting}
                rows={3}
                placeholder="Example: Duplicate test school created during onboarding."
                onChange={(event) => setDeleteReason(event.target.value)}
                className="w-full resize-none rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-danger focus:ring-2 focus:ring-danger/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-foreground">
              <input
                type="checkbox"
                checked={hardDeleteEmptyTenant}
                disabled={isDeleting}
                onChange={(event) => setHardDeleteEmptyTenant(event.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <span>
                Permanently delete if the school has no operational records. Otherwise, deprovision
                and keep the audit/history protected.
              </span>
            </label>
            {deleteError ? (
              <div className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
                {deleteError}
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function RevenuePage() {
  return (
    <div className="space-y-6">
      <SuperadminPageHeader
        title="Revenue"
        description="Track subscription performance, collection reliability, and the school segments driving growth."
      />
      <MetricGrid items={superadminKpis.slice(2, 6)} />
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <ChartCard
          title="Monthly recurring revenue"
          subtitle="Revenue data appears after real subscriptions and payment activity are created."
          points={revenuePoints}
        />
        <SimpleListCard
          title="Collections quality"
          subtitle="Live billing health appears after schools are onboarded."
          items={[]}
        />
      </div>
    </div>
  );
}

function SubscriptionsPage() {
  const columns: DataTableColumn<(typeof subscriptionRows)[number]>[] = [
    { id: "tenant", header: "School", render: (row) => <span className="font-semibold">{row.tenant}</span> },
    { id: "plan", header: "Plan", render: (row) => row.plan },
    { id: "renewal", header: "Renewal", render: (row) => row.renewal },
    { id: "amount", header: "Amount", render: (row) => row.amount, className: "text-right font-semibold", headerClassName: "text-right" },
    { id: "status", header: "Status", render: (row) => <StatusPill label={row.status} tone={row.statusTone} /> },
  ];

  return (
    <div className="space-y-6">
      <SuperadminPageHeader
        title="Subscriptions"
        description="Manage plan mix, renewal windows, grace enforcement, and the school revenue lifecycle."
      />
      <DataTable
        title="Subscription ledger"
        subtitle="Use this to inspect plan health before billing actions or support escalations."
        columns={columns}
        rows={subscriptionRows}
        getRowKey={(row) => row.id}
      />
    </div>
  );
}

function MpesaMonitoringPage() {
  const columns: DataTableColumn<(typeof mpesaMonitoringRows)[number]>[] = [
    { id: "school", header: "School", render: (row) => <span className="font-semibold">{row.school}</span> },
    { id: "checkoutRequestId", header: "Checkout Request", render: (row) => row.checkoutRequestId },
    { id: "callbackStatus", header: "Callback", render: (row) => row.callbackStatus },
    { id: "retries", header: "Retries", render: (row) => row.retries, className: "text-right", headerClassName: "text-right" },
    { id: "duplicate", header: "Duplicate", render: (row) => row.duplicate },
    {
      id: "reconciliation",
      header: "Reconciliation",
      render: (row) => <StatusPill label={row.reconciliation} tone={row.statusTone} />,
    },
  ];

  return (
    <div className="space-y-6">
      <SuperadminPageHeader
        title="MPESA monitoring"
        description="Observe callbacks, retries, duplicate transaction handling, and reconciliation health without opening school dashboards."
      />
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <DataTable
          title="Global callback monitor"
          subtitle="Platform-wide payment pipeline visibility."
          columns={columns}
          rows={mpesaMonitoringRows}
          getRowKey={(row) => row.id}
        />
        <SimpleListCard
          title="Escalation queue"
          subtitle="Cases worth human attention before the next automated sweep."
          items={callbackFailures}
        />
      </div>
    </div>
  );
}



function SupportPage() {
  return <PlatformSupportWorkspace defaultView="support" />;
}








export function SuperadminPages({
  section = "overview",
  routeMode = "hosted",
}: {
  section?: string;
  routeMode?: SuperadminRouteMode;
}) {
  /* ── Section alias map ──────────────────────────────────────────────
   * The sidebar nav items use descriptive slugs (e.g. "school-onboarding")
   * while the workspace render conditions below use shorter keys
   * (e.g. "onboarding"). This map bridges the two so every sidebar click
   * lands on the correct workspace instead of a blank page.
   * ------------------------------------------------------------------ */
  const sectionAliases: Record<string, string> = {
    "platform-overview": "overview",
    "school-onboarding": "onboarding",
    "principal-invites": "invitations",
    "module-access-control": "modules",
    "tenant-health": "health",
    "users-roles": "users",
    "sms-settings": "sms-email",
    "communication-templates": "templates",
    "support-desk": "support",
    "system-settings": "settings",
    "infrastructure": "health",
  };

  const normalizedSection = sectionAliases[section] ?? section;

  const activeHref =
    normalizedSection === "overview" || normalizedSection === "dashboard"
      ? buildSuperadminHref("dashboard", routeMode)
      : buildSuperadminHref(
          normalizedSection === "tenants"
            ? "schools"
            : (section as Parameters<typeof toSuperadminPath>[0]),
          routeMode,
        );
  const navItems = superadminNav.map((item) => ({
    ...item,
    href: mapSuperadminHref(item.href, routeMode),
  }));
  const notifications: ExperienceNotificationItem[] = [
    ...systemAlerts.map(
      (item): ExperienceNotificationItem => ({
        id: item.id,
        title: item.title,
        detail: item.subtitle,
        timeLabel: "live",
        tone: item.tone ?? "ok",
        href: mapSuperadminHref("/notifications", routeMode),
      }),
    ),
    ...supportActivity.map(
      (item): ExperienceNotificationItem => ({
        id: item.id,
        title: item.title,
        detail: item.detail,
        timeLabel: item.timeLabel,
        tone: item.tone,
        href: mapSuperadminHref("/support", routeMode),
      }),
    ),
  ];

  return (
    <PlatformShell
      brand={{ title: "My Shule", subtitle: "Platform owner" }}
      navItems={navItems}
      activeHref={activeHref}
      topLabel="Platform owner desk"
      title="Platform owner dashboard"
      subtitle="Run the business, monitor infrastructure, and intervene safely without leaking across schools."
      status={{ label: "Platform healthy", tone: "ok" }}
      profile={superadminProfile}
      notifications={notifications}
      actions={
        <>
          <Link href={buildSuperadminHref("health", routeMode)}>
            <Button variant="secondary">
              <ExternalLink className="h-4 w-4" />
              Platform status
            </Button>
          </Link>
          <SuperadminLogoutButton />
        </>
      }
    >
      {normalizedSection === "overview" || normalizedSection === "dashboard" ? <SuperadminOverview routeMode={routeMode} /> : null}
      {normalizedSection === "tenants" || normalizedSection === "schools" ? <SchoolsWorkspace /> : null}
      {normalizedSection === "onboarding" ? <OnboardingWorkspace /> : null}
      {normalizedSection === "invitations" ? <PrincipalInvitationsWorkspace /> : null}
      {normalizedSection === "modules" ? <ModuleAccessWorkspace /> : null}
      {normalizedSection === "setup-progress" ? <SetupProgressWorkspace /> : null}
      {normalizedSection === "demo-manager" ? <DemoManagerWorkspace /> : null}
      {normalizedSection === "users" ? <UsersWorkspace /> : null}
      {normalizedSection === "health" ? <TenantHealthWorkspace /> : null}
      {normalizedSection === "sms-email" ? (
        <section aria-label="SMS settings">
          <PlatformSmsSettingsWorkspace />
        </section>
      ) : null}
      {normalizedSection === "gateways" ? <PaymentGatewaysWorkspace /> : null}
      {normalizedSection === "templates" ? <TemplatesCenterWorkspace /> : null}
      {normalizedSection === "support" ? <SupportPage /> : null}
      {normalizedSection === "support-open" ? <PlatformSupportWorkspace defaultView="support-open" /> : null}
      {normalizedSection === "support-in-progress" ? <PlatformSupportWorkspace defaultView="support-in-progress" /> : null}
      {normalizedSection === "support-escalated" ? <PlatformSupportWorkspace defaultView="support-escalated" /> : null}
      {normalizedSection === "support-resolved" ? <PlatformSupportWorkspace defaultView="support-resolved" /> : null}
      {normalizedSection === "support-sla" ? <PlatformSupportWorkspace defaultView="support-sla" /> : null}
      {normalizedSection === "support-analytics" ? <PlatformSupportWorkspace defaultView="support-analytics" /> : null}
      {normalizedSection === "broadcasts" ? <BroadcastsWorkspace /> : null}
      {normalizedSection === "audit-logs" ? <AuditLogsWorkspace /> : null}
      {normalizedSection === "data-tools" ? <DataToolsWorkspace /> : null}
      {normalizedSection === "security" ? <SecurityPoliciesWorkspace /> : null}
      {normalizedSection === "reports" ? <PlatformReportsWorkspace /> : null}
      {normalizedSection === "settings" ? <SettingsWorkspace /> : null}
    </PlatformShell>
  );
}
