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

function SuperadminPageHeader({
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
            Platform owner desk
          </p>
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

function SchoolsWorkspace() {
  const router = useRouter();
  const [rows, setRows] = useState<PlatformTenantRow[]>(tenantRows);
  const [loadSchoolsError, setLoadSchoolsError] = useState<string | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
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
      setResendMessage(
        tenant.invitationActionRequired ??
          "Email delivery is blocked by provider setup. Fix the email settings, then refresh this page.",
      );
      return;
    }

    setResendingTenantId(tenantId);
    setResendMessage(null);
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
      setResendMessage(updatedSchool.invitation_message);
      setCreateSuccess((currentMessage) =>
        createdTenantForInvite?.id === updatedRow.id ? updatedSchool.invitation_message : currentMessage,
      );
    } catch (error) {
      if (redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href))) {
        return;
      }

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
        <div className="mb-4 rounded-[var(--radius-sm)] border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-foreground">
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
              <div className="rounded-xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-foreground">
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

function UsersPage() {
  const [users, setUsers] = useState<any[]>([]); // To be typed and fetched
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching platform users
    const timer = setTimeout(() => {
      setUsers([]); // Real data would go here
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const columns: DataTableColumn<any>[] = [
    { id: "name", header: "User Name", render: (row) => <span className="font-semibold">{row.name}</span> },
    { id: "role", header: "Role", render: (row) => row.role },
    { id: "status", header: "Status", render: (row) => <StatusPill label={row.status} tone={row.status === "Active" ? "ok" : "warning"} /> },
    { id: "lastActive", header: "Last Active", render: (row) => row.lastActive },
    {
      id: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm">Edit Roles</Button>
          <Button variant="danger" size="sm">Suspend</Button>
          <Button variant="ghost" size="sm">View Activity</Button>
        </div>
      ),
      className: "text-right",
      headerClassName: "text-right",
    },
  ];

  return (
    <div className="space-y-6">
      <SuperadminPageHeader
        title="Platform Users & Admins"
        description="Platform team members, operational scope, and who is actively handling support and school workflows."
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-2" /> Invite Platform User
          </Button>
        }
      />
      <DataTable
        title="Platform Operators"
        subtitle="Manage the internal team responsible for MyShule operations."
        columns={columns}
        rows={users}
        getRowKey={(row) => row.id}
        emptyMessage={isLoading ? "Loading users..." : "No platform users found."}
      />
    </div>
  );
}

function SupportPage() {
  return <PlatformSupportWorkspace defaultView="support" />;
}

function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]); // To be replaced with fetchPlatformAuditLogs
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API fetch delay
    const timer = setTimeout(() => {
      setLogs([]);
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const columns: DataTableColumn<any>[] = [
    { id: "action", header: "Action", render: (row) => <span className="font-semibold">{row.action}</span> },
    { id: "target", header: "Target", render: (row) => row.target },
    { id: "actor", header: "Actor", render: (row) => row.actor },
    { id: "ipAddress", header: "IP Address", render: (row) => row.ipAddress },
    { id: "timestamp", header: "Timestamp", render: (row) => row.timestamp },
    {
      id: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm">
            <Code className="h-4 w-4 mr-2" /> View JSON
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
        title="Audit Logs"
        description="Immutable trail of platform-level changes."
      />
      <DataTable
        title="Platform Audit Trail"
        subtitle="Detailed log of all administrative actions taken on the MyShule platform."
        columns={columns}
        rows={logs}
        getRowKey={(row) => row.id}
        emptyMessage={isLoading ? "Loading audit logs..." : "No audit logs found."}
      />
    </div>
  );
}

function InfrastructurePage() {
  const [metrics, setMetrics] = useState(infrastructureMetrics);
  const [events, setEvents] = useState(infrastructureEvents);
  const [monitorIssues, setMonitorIssues] = useState<SystemMonitorIssue[]>(initialSystemMonitorIssues);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "degraded" | "error">(
    isDashboardApiConfigured() ? "loading" : "degraded",
  );
  const [message, setMessage] = useState(
    isDashboardApiConfigured()
      ? "Loading live infrastructure readiness..."
      : "Production API base URL is not configured for this frontend deployment.",
  );

  useEffect(() => {
    if (!isDashboardApiConfigured()) {
      return;
    }

    let cancelled = false;

    async function loadInfrastructure() {
      setLoadState("loading");
      setMessage("Loading live infrastructure readiness...");

      const [readinessResult, healthResult, alertsResult] = await Promise.allSettled([
        fetchApiReadiness(),
        fetchApiObservabilityHealth(),
        fetchApiObservabilityAlerts(),
      ]);

      if (cancelled) {
        return;
      }

      if (readinessResult.status !== "fulfilled") {
        setLoadState("error");
        setMessage("Live infrastructure readiness could not be loaded. Check API routing and platform credentials.");
        setMetrics(infrastructureMetrics);
        setEvents([
          {
            id: "infrastructure-unavailable",
            title: "Infrastructure telemetry unavailable",
            detail: readinessResult.reason instanceof Error
              ? readinessResult.reason.message
              : "The readiness endpoint did not respond successfully.",
            timeLabel: "Action",
            tone: "critical",
          },
        ]);
        return;
      }

      const health = healthResult.status === "fulfilled" ? healthResult.value : null;
      const alerts = alertsResult.status === "fulfilled" ? alertsResult.value.alerts : [];
      const degraded = readinessResult.value.status === "degraded"
        || health?.overall_status === "degraded"
        || health?.overall_status === "critical"
        || alerts.some((alert) => alert.severity === "critical");

      setMetrics(mapReadinessToInfrastructureMetrics(readinessResult.value, health));
      setEvents(mapObservabilityAlertsToInfrastructureEvents(alerts, readinessResult.value));
      setLoadState(degraded ? "degraded" : "ready");
      setMessage(
        degraded
          ? "Live telemetry is connected, but one or more dependencies need attention."
          : "Live telemetry is connected and no active infrastructure alerts were returned.",
      );
    }

    void loadInfrastructure();

    return () => {
      cancelled = true;
    };
  }, []);

  const stateTone = loadState === "ready" ? "ok" : loadState === "loading" || loadState === "degraded" ? "warning" : "critical";
  const failedSms = monitorIssues.filter((issue) => issue.category === "SMS" && issue.status === "Failed").length;
  const failedMpesa = monitorIssues.filter((issue) => issue.category === "M-Pesa" && issue.status === "Failed").length;
  const failedReports = monitorIssues.filter((issue) => issue.category === "Report" && issue.status === "Failed").length;
  const offlineDevices = monitorIssues.filter((issue) => issue.category === "Device" && issue.status === "Failed").length;
  const unresolvedIssues = monitorIssues.filter((issue) => issue.status !== "Resolved" && issue.status !== "Recovered").length;

  function updateMonitorIssue(
    issueId: string,
    updates: Partial<SystemMonitorIssue>,
    nextMessage: string,
  ) {
    setMonitorIssues((currentIssues) =>
      currentIssues.map((issue) =>
        issue.id === issueId
          ? {
              ...issue,
              ...updates,
              lastUpdate: new Date().toLocaleTimeString("en-KE", {
                hour: "2-digit",
                minute: "2-digit",
              }),
            }
          : issue,
      ),
    );
    setMessage(nextMessage);
  }

  function retryMonitorIssue(issue: SystemMonitorIssue) {
    const nextStatus = issue.attempts >= 2 ? "Recovered" : "Retrying";
    const label =
      issue.category === "SMS"
        ? "Failed SMS retry started"
        : issue.category === "M-Pesa"
          ? "M-Pesa confirmation retry started"
          : issue.category === "Report"
            ? "Report generation retry started"
            : issue.category === "Backup"
              ? "Backup verification retry started"
              : "Offline device sync retry started";

    updateMonitorIssue(
      issue.id,
      {
        attempts: issue.attempts + 1,
        status: nextStatus,
      },
      `${label} for ${issue.school}.`,
    );
  }

  function resolveMonitorIssue(issue: SystemMonitorIssue) {
    updateMonitorIssue(
      issue.id,
      { status: "Resolved" },
      `${issue.issue} marked solved for ${issue.school}.`,
    );
  }

  function notifyMonitorAdmin(issue: SystemMonitorIssue) {
    updateMonitorIssue(
      issue.id,
      { status: issue.status === "Failed" ? "Retrying" : issue.status },
      `Admin notified about ${issue.issue} at ${issue.school}.`,
    );
  }

  function downloadSystemReport() {
    const generatedAt = new Date().toISOString();
    downloadCsvFile({
      filename: `myshule-system-health-${generatedAt.slice(0, 10)}.csv`,
      headers: ["School", "Issue", "Category", "Attempts", "Status", "Owner", "Generated At"],
      rows: monitorIssues.map((issue) => [
        issue.school,
        issue.issue,
        issue.category,
        String(issue.attempts),
        issue.status,
        issue.owner,
        generatedAt,
      ]),
    });
    setMessage(`System health CSV downloaded with ${monitorIssues.length} issue row(s).`);
  }

  return (
    <div className="space-y-6">
      <SuperadminPageHeader
        title="Infrastructure"
        description="System health, failed SMS, M-Pesa confirmations, backups, reports, offline devices, and retry actions in one surface."
        actions={<StatusPill label={loadState === "ready" ? "Live" : loadState === "loading" ? "Loading" : loadState === "degraded" ? "Degraded" : "Action"} tone={stateTone} />}
      />
      <Card className="p-4">
        <p className="text-sm leading-6 text-muted">{message}</p>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Failed SMS", value: failedSms, helper: "Retry message batches", tone: failedSms > 0 ? "warning" : "ok" },
          { label: "M-Pesa Issues", value: failedMpesa, helper: "Confirm pending callbacks", tone: failedMpesa > 0 ? "critical" : "ok" },
          { label: "Failed Reports", value: failedReports, helper: "Retry report generation", tone: failedReports > 0 ? "warning" : "ok" },
          { label: "Offline Devices", value: offlineDevices, helper: "School devices needing sync", tone: offlineDevices > 0 ? "warning" : "ok" },
          { label: "Open Issues", value: unresolvedIssues, helper: "Still requiring owner action", tone: unresolvedIssues > 0 ? "warning" : "ok" },
        ].map((item) => (
          <Card key={item.label} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-muted">{item.label}</p>
              <StatusPill label={item.tone === "ok" ? "OK" : "Check"} tone={item.tone as "ok" | "warning" | "critical"} />
            </div>
            <p className="mt-2 text-2xl font-black text-foreground">{item.value}</p>
            <p className="mt-1 text-xs font-semibold text-muted">{item.helper}</p>
          </Card>
        ))}
      </div>
      <Card className="p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">System monitor</p>
            <h3 className="mt-1 text-xl font-black text-foreground">Failed jobs and recovery queue</h3>
            <p className="mt-1 text-sm leading-6 text-muted">
              Platform operators can retry failed SMS, M-Pesa confirmations, reports, backups, and offline-device sync without hiding the issue.
            </p>
          </div>
          <Button variant="secondary" onClick={downloadSystemReport}>
            Download System Report
          </Button>
        </div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-surface-muted text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              <tr>
                {["School", "Issue", "Category", "Attempts", "Status", "Owner", "Action"].map((column) => (
                  <th key={column} className="px-3 py-3">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {monitorIssues.map((issue) => (
                <tr key={issue.id}>
                  <td className="px-3 py-3 font-semibold text-foreground">{issue.school}</td>
                  <td className="px-3 py-3 text-muted">
                    <span className="font-semibold text-foreground">{issue.issue}</span>
                    <span className="mt-1 block text-xs">Updated {issue.lastUpdate}</span>
                  </td>
                  <td className="px-3 py-3 text-muted">{issue.category}</td>
                  <td className="px-3 py-3 text-right font-semibold text-foreground">{issue.attempts}</td>
                  <td className="px-3 py-3">
                    <StatusPill
                      label={issue.status}
                      tone={issue.status === "Failed" ? "critical" : issue.status === "Resolved" || issue.status === "Recovered" ? "ok" : "warning"}
                    />
                  </td>
                  <td className="px-3 py-3 text-muted">{issue.owner}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => retryMonitorIssue(issue)}>
                        {issue.category === "SMS"
                          ? "Retry Failed SMS"
                          : issue.category === "M-Pesa"
                            ? "Retry M-Pesa Confirmation"
                            : issue.category === "Report"
                              ? "Retry Report"
                              : issue.category === "Backup"
                                ? "Retry Backup Check"
                                : "Retry Device Sync"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => notifyMonitorAdmin(issue)}>
                        Notify Admin
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => resolveMonitorIssue(issue)}>
                        Mark Issue Solved
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <MetricGrid items={metrics} />
      <ActivityListCard
        title="Operational events"
        subtitle="Recent system behavior that impacts service levels, recovery, or school trust."
        items={events}
      />
    </div>
  );
}

function NotificationsPage() {
  return (
    <div className="space-y-6">
      <SuperadminPageHeader
        title="Notifications"
        description="Everything that needs human awareness now, from billing signals to platform incidents."
      />
      <ActivityListCard
        title="Notification stream"
        subtitle="Prioritized and phrased for support, operations, and owners."
        items={supportActivity}
      />
    </div>
  );
}

function PlatformNotice({ tone, message }: { tone: "success" | "error"; message: string }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl border px-4 py-3 text-sm ${
        tone === "success"
          ? "border-success/20 bg-success/10 text-foreground"
          : "border-danger/20 bg-danger/10 text-foreground"
      }`}
    >
      {message}
    </div>
  );
}

async function parsePlatformSmsResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ApiEnvelope<T>
    | T
    | null;

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Your platform session expired. Sign in again to manage SMS providers.");
    }

    if (response.status >= 500) {
      throw new Error("SMS provider settings could not be loaded. Check API health and retry.");
    }

    throw new Error(
      payload && typeof payload === "object" && "message" in payload && payload.message
        ? payload.message
        : "Unable to complete this SMS settings request.",
    );
  }

  return unwrapPlatformPayload<T>(payload as T | ApiEnvelope<T> | null) as T;
}

function toProviderForm(provider: PlatformSmsProvider): PlatformSmsProviderForm {
  return {
    provider_name: provider.provider_name,
    provider_code: provider.provider_code,
    api_key: "",
    username: "",
    sender_id: provider.sender_id,
    base_url: provider.base_url ?? "",
    is_active: provider.is_active,
    is_default: provider.is_default,
  };
}

function getProviderTone(provider: PlatformSmsProvider): "ok" | "warning" | "critical" {
  if (!provider.is_active) return "warning";
  if (provider.last_test_status === "failed") return "critical";
  if (provider.is_default || provider.last_test_status === "ok") return "ok";
  return "warning";
}

function PlatformSmsSettingsPage() {
  const [providers, setProviders] = useState<PlatformSmsProvider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [form, setForm] = useState<PlatformSmsProviderForm>(emptySmsProviderForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedProvider = providers.find((provider) => provider.id === selectedProviderId) ?? null;

  useEffect(() => {
    let cancelled = false;

    async function loadProviders() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/platform/sms/providers", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        const payload = await parsePlatformSmsResponse<PlatformSmsProvider[]>(response);

        if (!cancelled) {
          setProviders(Array.isArray(payload) ? payload : []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "SMS provider settings could not be loaded. Check API health and retry.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadProviders();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateForm<K extends keyof PlatformSmsProviderForm>(
    key: K,
    value: PlatformSmsProviderForm[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setNotice(null);
    setError(null);
  }

  function startCreate() {
    setSelectedProviderId(null);
    setForm(emptySmsProviderForm);
    setNotice(null);
    setError(null);
  }

  function startEdit(provider: PlatformSmsProvider) {
    setSelectedProviderId(provider.id);
    setForm(toProviderForm(provider));
    setNotice(null);
    setError(null);
  }

  async function reloadProviders() {
    const response = await fetch("/api/platform/sms/providers", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });
    const payload = await parsePlatformSmsResponse<PlatformSmsProvider[]>(response);

    setProviders(Array.isArray(payload) ? payload : []);
  }

  async function saveProvider() {
    setIsSaving(true);
    setNotice(null);
    setError(null);

    try {
      const trimmedApiKey = form.api_key.trim();

      if (!selectedProvider && trimmedApiKey.length < 8) {
        setError("Enter the provider API key before saving a new SMS provider.");
        return;
      }

      const body: Record<string, unknown> = {
        provider_name: form.provider_name.trim(),
        provider_code: form.provider_code,
        username: form.username.trim() || undefined,
        sender_id: form.sender_id.trim(),
        base_url: form.base_url.trim() || undefined,
        is_active: form.is_active,
        is_default: form.is_default,
      };

      if (trimmedApiKey) {
        body.api_key = trimmedApiKey;
      }

      const response = await fetch(
        selectedProvider
          ? `/api/platform/sms/providers/${encodeURIComponent(selectedProvider.id)}`
          : "/api/platform/sms/providers",
        {
          method: selectedProvider ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            "x-myshule-csrf": await getCsrfToken(),
          },
          credentials: "same-origin",
          body: JSON.stringify(body),
        },
      );
      const provider = await parsePlatformSmsResponse<PlatformSmsProvider>(response);

      await reloadProviders();
      setSelectedProviderId(provider.id);
      setForm(toProviderForm(provider));
      setNotice("SMS provider saved securely. Secrets are masked and are not shown again.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save SMS provider.");
    } finally {
      setIsSaving(false);
    }
  }

  async function testProvider(provider: PlatformSmsProvider) {
    setNotice(null);
    setError(null);

    try {
      const response = await fetch(
        `/api/platform/sms/providers/${encodeURIComponent(provider.id)}/test`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-myshule-csrf": await getCsrfToken(),
          },
          credentials: "same-origin",
        },
      );

      await parsePlatformSmsResponse<PlatformSmsProvider>(response);
      await reloadProviders();
      setNotice(`${provider.provider_name} connection test passed.`);
    } catch (testError) {
      setError(
        testError instanceof Error
          ? testError.message
          : "SMS provider test failed. Confirm the provider account, sender ID, and network access.",
      );
    }
  }

  async function setDefaultProvider(provider: PlatformSmsProvider) {
    setNotice(null);
    setError(null);

    try {
      const response = await fetch(
        `/api/platform/sms/providers/${encodeURIComponent(provider.id)}/set-default`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-myshule-csrf": await getCsrfToken(),
          },
          credentials: "same-origin",
        },
      );

      await parsePlatformSmsResponse<PlatformSmsProvider>(response);
      await reloadProviders();
      setNotice(`${provider.provider_name} is now the default SMS provider.`);
    } catch (defaultError) {
      setError(defaultError instanceof Error ? defaultError.message : "Unable to set default provider.");
    }
  }

  const providerRows = providers.map((provider) => ({
    ...provider,
    providerLabel:
      smsProviderOptions.find((option) => option.code === provider.provider_code)?.label
      ?? provider.provider_name,
  }));

  const providerColumns: DataTableColumn<(typeof providerRows)[number]>[] = [
    { id: "provider", header: "Provider", render: (row) => <span className="font-semibold">{row.provider_name}</span> },
    { id: "type", header: "Type", render: (row) => row.providerLabel },
    { id: "sender", header: "Sender ID", render: (row) => row.sender_id },
    { id: "key", header: "API key", render: (row) => row.api_key_masked },
    {
      id: "status",
      header: "Status",
      render: (row) => (
        <StatusPill
          label={row.is_default ? "Default" : row.is_active ? "Active" : "Disabled"}
          tone={getProviderTone(row)}
        />
      ),
    },
    {
      id: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => startEdit(row)}>
            Edit
          </Button>
          <Button size="sm" variant="secondary" onClick={() => testProvider(row)}>
            Test
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDefaultProvider(row)}>
            Make default
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
        title="SMS & Email Providers"
        description="Platform-wide configuration for SMS gateways (e.g., Africa's Talking) and Email relays (e.g., Resend)."
        actions={
          <Button
            onClick={() => {
              setForm(emptySmsProviderForm);
              setSelectedProviderId(null);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add provider
          </Button>
        }
      />

      {notice ? <PlatformNotice tone="success" message={notice} /> : null}
      {error ? <PlatformNotice tone="error" message={error} /> : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <DataTable
          title="Platform SMS providers"
          subtitle={isLoading ? "Loading provider settings..." : "Credentials are encrypted at rest and only returned as masked values."}
          columns={providerColumns}
          rows={providerRows}
          getRowKey={(row) => row.id}
          emptyMessage="No SMS provider has been configured yet. Add TextSMS Kenya, Africa's Talking, or Twilio to start sending school messages through platform-managed credentials."
        />

        <Card className="space-y-4 p-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-muted">
              {selectedProvider ? "Edit provider" : "New provider"}
            </p>
            <h3 className="mt-1 text-lg font-semibold text-foreground">
              Provider credentials
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted">
              Add TextSMS Kenya, Africa&apos;s Talking, or Twilio credentials. Secret fields are write-only after saving.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-2 text-sm text-foreground">
              <span className="font-medium">Provider name</span>
              <input
                className="input-base"
                value={form.provider_name}
                onChange={(event) => updateForm("provider_name", event.target.value)}
              />
            </label>
            <label className="space-y-2 text-sm text-foreground">
              <span className="font-medium">Provider</span>
              <select
                className="input-base"
                value={form.provider_code}
                disabled={Boolean(selectedProvider)}
                onChange={(event) =>
                  updateForm("provider_code", event.target.value as PlatformSmsProviderCode)
                }
              >
                {smsProviderOptions.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm text-foreground">
              <span className="font-medium">API key</span>
              <input
                className="input-base"
                type="password"
                value={form.api_key}
                placeholder={selectedProvider?.api_key_masked ?? "Paste provider API key"}
                onChange={(event) => updateForm("api_key", event.target.value)}
              />
            </label>
            <label className="space-y-2 text-sm text-foreground">
              <span className="font-medium">Username</span>
              <input
                className="input-base"
                value={form.username}
                placeholder={selectedProvider?.username_masked ?? "Optional username"}
                onChange={(event) => updateForm("username", event.target.value)}
              />
            </label>
            <label className="space-y-2 text-sm text-foreground">
              <span className="font-medium">Sender ID</span>
              <input
                className="input-base"
                value={form.sender_id}
                onChange={(event) => updateForm("sender_id", event.target.value)}
              />
            </label>
            <label className="space-y-2 text-sm text-foreground">
              <span className="font-medium">Base URL</span>
              <input
                className="input-base"
                value={form.base_url}
                placeholder="Optional provider endpoint"
                onChange={(event) => updateForm("base_url", event.target.value)}
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-start gap-3 rounded-xl border border-border bg-surface-muted p-3 text-sm">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => updateForm("is_active", event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border"
              />
              <span>
                <span className="block font-semibold text-foreground">Enable provider</span>
                <span className="mt-1 block text-muted">Allow schools to send through this provider.</span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-border bg-surface-muted p-3 text-sm">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(event) => updateForm("is_default", event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border"
              />
              <span>
                <span className="block font-semibold text-foreground">Make default</span>
                <span className="mt-1 block text-muted">Use this provider for new SMS dispatches.</span>
              </span>
            </label>
          </div>

          <div className="rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm leading-6 text-muted">
            Provider secrets are never exposed after save. Schools only see SMS balance, usage, logs, and purchase requests.
          </div>

          <div className="flex flex-wrap gap-2">
            <Button disabled={isSaving} onClick={saveProvider}>
              {isSaving ? "Saving..." : selectedProvider ? "Save changes" : "Save provider"}
            </Button>
            {selectedProvider ? (
              <Button variant="secondary" onClick={() => testProvider(selectedProvider)}>
                Test connection
              </Button>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}

function SettingsPage({ routeMode }: { routeMode: SuperadminRouteMode }) {
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <SuperadminPageHeader
        title="System Settings"
        description="Global platform branding, API keys, storage settings, and maintenance mode toggle."
      />
      <form onSubmit={handleSave} className="space-y-8">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Platform Configuration</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-foreground">Maintenance Mode</p>
                <p className="text-sm text-muted">Temporarily disable access to all schools.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-surface-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
              </label>
            </div>
            
            <div className="grid gap-2">
              <label className="text-sm font-medium">Default Language</label>
              <select className="border border-border rounded-[var(--radius-sm)] p-2 bg-surface">
                <option value="en">English</option>
                <option value="sw">Swahili</option>
                <option value="fr">French</option>
              </select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Max Upload Size (MB)</label>
              <input 
                type="number" 
                defaultValue={10} 
                className="border border-border rounded-[var(--radius-sm)] p-2 bg-surface" 
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Global Branding</h3>
          <div className="space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Platform Logo</label>
              <div className="border border-dashed border-border rounded-[var(--radius-md)] p-8 text-center bg-surface-muted">
                <p className="text-sm text-muted mb-2">Upload a high-resolution logo (PNG, SVG).</p>
                <Button variant="secondary" size="sm">Choose File</Button>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Global Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function SuperadminOverview({ routeMode }: { routeMode: SuperadminRouteMode }) {
  const router = useRouter();
  const [metrics, setMetrics] = useState(superadminKpis);
  const [tenantProductSummary, setTenantProductSummary] = useState(emptyTenantProductSummary);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadOverviewMetrics() {
      setIsLoading(true);
      try {
        const [liveRows, liveSummary] = await Promise.all([
          fetchPlatformSchools(),
          fetchPlatformTenantProductSummary(),
        ]);

        if (!cancelled) {
          setMetrics(buildLiveSuperadminKpis(liveRows));
          setTenantProductSummary(normalizeTenantProductSummary(liveSummary));
        }
      } catch (error) {
        if (redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href))) {
          return;
        }

        if (!cancelled) {
          setMetrics(superadminKpis);
          setTenantProductSummary(emptyTenantProductSummary);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadOverviewMetrics();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="space-y-6">
      <SuperadminPageHeader 
        title="Platform Overview" 
        description="Monitor schools, onboarding, modules, system health, communication delivery, and support activity." 
        actions={
          <>
            <Link href={buildSuperadminHref("schools", routeMode)}>
              <Button variant="secondary">Create School</Button>
            </Link>
            <Link href={buildSuperadminHref("invitations", routeMode)}>
              <Button variant="secondary">Invite Principal</Button>
            </Link>
            <Link href={buildSuperadminHref("support", routeMode)}>
              <Button variant="secondary">Open Support Desk</Button>
            </Link>
            <Button variant="secondary">Export Platform Summary</Button>
          </>
        }
      />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* We reuse the TenantProductSummary data to fill the summary cards, falling back to 0 if we don't have the explicit fields yet */}
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total Schools</p>
          <p className="mt-2 text-3xl font-bold">{tenantProductSummary.total_schools}</p>
          <div className="mt-2 text-xs text-muted space-y-1">
            <p>{tenantProductSummary.active_schools} Active</p>
            <p>{tenantProductSummary.billing_suspended_schools} Suspended</p>
            <p>{tenantProductSummary.inactive_schools} Archived/Inactive</p>
          </div>
        </Card>
        
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Schools Onboarding</p>
          <p className="mt-2 text-3xl font-bold">{tenantProductSummary.pending_principal_invites}</p>
          <div className="mt-2 text-xs text-muted space-y-1">
            <p>New this month (Awaiting data)</p>
            <p>{tenantProductSummary.pending_principal_invites} Pending principal</p>
            <p>Setup incomplete (Awaiting data)</p>
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Module Access</p>
          <p className="mt-2 text-3xl font-bold">{tenantProductSummary.enabled_module_assignments}</p>
          <div className="mt-2 text-xs text-muted space-y-1">
            <p>Assignments across schools</p>
            <p>{tenantProductSummary.total_schools - tenantProductSummary.schools_with_modules} Schools with no modules</p>
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">System Health</p>
          <p className="mt-2 text-3xl font-bold">{isLoading ? "-" : "Healthy"}</p>
          <div className="mt-2 text-xs text-muted space-y-1">
            <p>0 Failed background jobs</p>
            <p>0 Offline sync queue</p>
            <p>0.0% API error rate</p>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="flex flex-col">
          <div className="p-5 border-b border-border">
            <h3 className="font-semibold">School Activity Feed</h3>
          </div>
          <div className="flex-1 p-5 flex items-center justify-center text-sm text-muted">
            {isLoading ? "Loading activity..." : "No recent activity to show."}
          </div>
        </Card>

        <Card className="flex flex-col">
          <div className="p-5 border-b border-border">
            <h3 className="font-semibold">Schools Requiring Attention</h3>
          </div>
          <div className="flex-1 p-5 flex items-center justify-center text-sm text-muted">
            {isLoading ? "Loading attention queue..." : "No schools require immediate attention."}
          </div>
        </Card>

        <Card className="flex flex-col">
          <div className="p-5 border-b border-border">
            <h3 className="font-semibold text-critical">Critical Alerts</h3>
          </div>
          <div className="flex-1 p-5 flex items-center justify-center text-sm text-muted">
            {isLoading ? "Loading alerts..." : "No critical platform alerts."}
          </div>
        </Card>
      </div>
    </div>
  );
}

function OnboardingWorkspace() {
  const router = useRouter();
  const [schools, setSchools] = useState<PlatformTenantRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSchools() {
      setIsLoading(true);
      try {
        const liveRows = await fetchPlatformSchools();
        if (!cancelled) {
          setSchools(liveRows.map(mapPlatformSchoolToTenantRow));
        }
      } catch (error) {
        if (redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href))) {
          return;
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSchools();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const stages = [
    {
      id: "tenant_created",
      title: "Tenant Created",
      schools: schools.filter((s) => (s.invitationStatus as string) !== "sent" && (s.invitationStatus as string) !== "accepted"),
    },
    {
      id: "principal_invited",
      title: "Principal Invited",
      schools: schools.filter((s) => (s.invitationStatus as string) === "sent"),
    },
    {
      id: "principal_accepted",
      title: "Principal Accepted",
      schools: schools.filter((s) => (s.invitationStatus as string) === "accepted" && (s.enabledModules?.length ?? 0) === 0),
    },
    {
      id: "modules_configured",
      title: "Modules Configured",
      schools: schools.filter((s) => (s.invitationStatus as string) === "accepted" && (s.enabledModules?.length ?? 0) > 0 && s.status !== "Active"),
    },
    {
      id: "ready",
      title: "Ready for Operations",
      schools: schools.filter((s) => s.status === "Active"),
    },
  ];

  return (
    <div className="space-y-6">
      <SuperadminPageHeader 
        title="New School Onboarding" 
        description="Track new schools from tenant creation to operational readiness." 
        actions={
          <Button variant="secondary">
            <Plus className="h-4 w-4 mr-2" />
            Create School
          </Button>
        }
      />
      
      {isLoading ? (
        <Card className="p-12 text-center text-muted">Loading onboarding pipeline...</Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-5 items-start overflow-x-auto pb-4">
          {stages.map((stage) => (
            <div key={stage.id} className="flex flex-col gap-3 min-w-[250px]">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-semibold text-sm">{stage.title}</h3>
                <span className="bg-surface-muted text-xs px-2 py-0.5 rounded-full font-medium">
                  {stage.schools.length}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {stage.schools.length === 0 ? (
                  <div className="text-center p-4 border border-dashed rounded-lg text-xs text-muted">
                    No schools
                  </div>
                ) : (
                  stage.schools.map((school) => (
                    <Card key={school.id} className="p-4 flex flex-col gap-2">
                      <p className="font-semibold text-sm">{school.schoolName}</p>
                      <p className="text-xs text-muted truncate">{school.adminEmail}</p>
                      <div className="flex justify-between items-center mt-2">
                        <StatusPill label={school.status} tone={school.statusTone} />
                        <span className="text-[10px] text-muted">{school.enabledModules?.length ?? 0} modules</span>
                      </div>
                      <div className="mt-2 flex gap-2">
                         <Button variant="ghost" size="sm" className="w-full text-xs h-8">Move Next</Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PrincipalInvitationsWorkspace() {
  const router = useRouter();
  const [schools, setSchools] = useState<PlatformTenantRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSchools() {
      setIsLoading(true);
      try {
        const liveRows = await fetchPlatformSchools();
        if (!cancelled) {
          setSchools(liveRows.map(mapPlatformSchoolToTenantRow));
        }
      } catch (error) {
        if (redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href))) {
          return;
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSchools();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const columns: DataTableColumn<PlatformTenantRow>[] = [
    {
      id: "schoolName",
      header: "School Name",
      render: (row) => <span className="font-semibold">{row.schoolName}</span>,
    },
    {
      id: "adminName",
      header: "Principal Name",
      render: (row) => row.adminEmail ? row.adminEmail.split('@')[0] : "N/A", // We don't have adminName in PlatformTenantRow, fallback to email prefix
    },
    {
      id: "adminEmail",
      header: "Email",
      render: (row) => row.adminEmail || "No email",
    },
    {
      id: "invitationStatus",
      header: "Invite Status",
      render: (row) => (
        <StatusPill 
          label={row.invitationStatus || "Unknown"} 
          tone={(row.invitationStatus as string) === "accepted" ? "ok" : (row.invitationStatus as string) === "failed" || (row.invitationStatus as string) === "blocked" ? "critical" : "warning"} 
        />
      ),
    },
    {
      id: "lastActive",
      header: "Last Update",
      render: (row) => row.lastActive,
    },
    {
      id: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" disabled={!row.adminEmail || (row.invitationStatus as string) === "accepted"}>
            <MailCheck className="h-4 w-4 mr-2" /> Resend Invite
          </Button>
          <Button variant="ghost" size="sm">
            Revoke
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
        title="Principal Invitations" 
        description="Invite, resend, revoke, and track first-principal access for new schools." 
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-2" /> Invite Principal
          </Button>
        } 
      />
      
      <DataTable
        title="Invitation Registry"
        subtitle="Track the status of all principal onboarding invitations."
        columns={columns}
        rows={schools}
        getRowKey={(row) => row.id}
        emptyMessage={isLoading ? "Loading invitations..." : "No invitations found."}
      />
    </div>
  );
}

function ModuleAccessWorkspace() {
  const router = useRouter();
  const [schools, setSchools] = useState<PlatformTenantRow[]>([]);
  const [moduleCatalog, setModuleCatalog] = useState<ModuleRegistryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<PlatformTenantRow | null>(null);
  const [selectedModuleCodes, setSelectedModuleCodes] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setIsLoading(true);
      try {
        const [liveRows, registry] = await Promise.all([
          fetchPlatformSchools(),
          fetchPlatformModules()
        ]);
        if (!cancelled) {
          setSchools(liveRows.map(mapPlatformSchoolToTenantRow));
          setModuleCatalog(registry);
        }
      } catch (error) {
        if (redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href))) {
          return;
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [router]);

  function handleEditModules(school: PlatformTenantRow) {
    setSelectedSchool(school);
    setSelectedModuleCodes(school.enabledModules || []);
    setIsEditOpen(true);
  }

  function toggleModule(moduleCode: string) {
    setSelectedModuleCodes((currentCodes) =>
      currentCodes.includes(moduleCode)
        ? currentCodes.filter((code) => code !== moduleCode)
        : [...currentCodes, moduleCode]
    );
  }

  async function saveModules() {
    if (!selectedSchool) return;
    setIsSaving(true);
    
    // Simulate API call to update modules
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setSchools(current => 
      current.map(s => 
        s.id === selectedSchool.id ? { ...s, enabledModules: selectedModuleCodes } : s
      )
    );
    
    setIsSaving(false);
    setIsEditOpen(false);
  }

  const columns: DataTableColumn<PlatformTenantRow>[] = [
    {
      id: "schoolName",
      header: "School Name",
      render: (row) => <span className="font-semibold">{row.schoolName}</span>,
    },
    {
      id: "enabledModules",
      header: "Enabled Modules",
      render: (row) => (
        <div className="flex flex-wrap gap-1 max-w-[400px]">
          {row.enabledModules && row.enabledModules.length > 0 ? (
            row.enabledModules.map((m) => (
              <StatusPill key={m} label={m} tone="warning" />
            ))
          ) : (
             <span className="text-muted text-xs">No modules</span>
          )}
        </div>
      ),
    },
    {
      id: "lastActive",
      header: "Last Update",
      render: (row) => row.lastActive,
    },
    {
      id: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => handleEditModules(row)}>
            <Blocks className="h-4 w-4 mr-2" /> Edit Modules
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
        title="Module Access Control" 
        description="Manually enable, disable, lock, or review modules available to each school." 
      />
      
      <DataTable
        title="School Modules"
        subtitle="Manage the feature flags and modules each school has access to."
        columns={columns}
        rows={schools}
        getRowKey={(row) => row.id}
        emptyMessage={isLoading ? "Loading module access..." : "No schools found."}
      />

      <Modal
        open={isEditOpen}
        title={`Edit Modules: ${selectedSchool?.schoolName}`}
        description="Select the modules that this school is permitted to use."
        size="lg"
        onClose={() => !isSaving && setIsEditOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsEditOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={saveModules} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Module Access"}
            </Button>
          </>
        }
      >
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
                    disabled={isSaving || moduleItem.status === "inactive"}
                    onChange={() => toggleModule(moduleItem.code)}
                    className="mt-1 h-4 w-4 rounded border-border"
                  />
                  <span>
                    <span className="block font-semibold text-foreground">{moduleItem.name}</span>
                    <span className="mt-1 block text-[13px] text-muted">{moduleItem.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
      </Modal>
    </div>
  );
}

function SetupProgressWorkspace() {
  const router = useRouter();
  const [schools, setSchools] = useState<PlatformTenantRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSchools() {
      setIsLoading(true);
      try {
        const liveRows = await fetchPlatformSchools();
        if (!cancelled) {
          setSchools(liveRows.map(mapPlatformSchoolToTenantRow));
        }
      } catch (error) {
        if (redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href))) {
          return;
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSchools();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const columns: DataTableColumn<PlatformTenantRow>[] = [
    {
      id: "schoolName",
      header: "School Name",
      render: (row) => <span className="font-semibold">{row.schoolName}</span>,
    },
    {
      id: "setupScore",
      header: "Setup Score",
      render: () => <StatusPill label="Pending API" tone="warning" />,
    },
    {
      id: "academicYear",
      header: "Academic Year",
      render: () => <span className="text-muted">N/A</span>,
    },
    {
      id: "terms",
      header: "Terms Configured",
      render: () => <span className="text-muted">N/A</span>,
    },
    {
      id: "fees",
      header: "Fee Structures",
      render: () => <span className="text-muted">N/A</span>,
    },
    {
      id: "classes",
      header: "Classes",
      render: () => <span className="text-muted">N/A</span>,
    },
    {
      id: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm">
            View Details
          </Button>
          <Button variant="ghost" size="sm">
            <MailCheck className="h-4 w-4 mr-2" /> Reminder
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
        title="Tenant Setup Progress" 
        description="Monitor school readiness and identify setup gaps before operations begin." 
      />
      
      <DataTable
        title="Setup Checklists"
        subtitle="Track which schools have completed essential configurations to start using the system."
        columns={columns}
        rows={schools}
        getRowKey={(row) => row.id}
        emptyMessage={isLoading ? "Loading setup progress..." : "No schools found."}
      />
    </div>
  );
}

function DemoManagerWorkspace() {
  const router = useRouter();
  const [demoSchools, setDemoSchools] = useState<PlatformTenantRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSchools() {
      setIsLoading(true);
      try {
        const liveRows = await fetchPlatformSchools();
        if (!cancelled) {
          // Simplistic filter for demo tenants based on tenant_id containing 'demo'
          const filtered = liveRows.map(mapPlatformSchoolToTenantRow).filter(r => r.id.includes("demo"));
          setDemoSchools(filtered);
        }
      } catch (error) {
        if (redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href))) {
          return;
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSchools();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const columns: DataTableColumn<PlatformTenantRow>[] = [
    {
      id: "schoolName",
      header: "Demo School Name",
      render: (row) => <span className="font-semibold">{row.schoolName}</span>,
    },
    {
      id: "expiry",
      header: "Expiry Date",
      render: () => <span className="text-muted">N/A</span>,
    },
    {
      id: "salesRep",
      header: "Assigned Sales Rep",
      render: () => <span className="text-muted">N/A</span>,
    },
    {
      id: "seedTemplate",
      header: "Seed Template Used",
      render: () => <span className="text-muted">Standard K-12</span>,
    },
    {
      id: "status",
      header: "Status",
      render: (row) => <StatusPill label={row.status} tone={row.statusTone} />,
    },
    {
      id: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm">
            <RotateCcw className="h-4 w-4 mr-2" /> Reset Data
          </Button>
          <Button variant="ghost" size="sm">
            <Trash2 className="h-4 w-4 mr-2" /> Delete
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
        title="Demo School Manager" 
        description="Manage approved demo tenants, demo seeds, and prevent demo data leakage into real schools." 
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-2" /> Create Demo School
          </Button>
        } 
      />
      
      <DataTable
        title="Demo Environments"
        subtitle="These are isolated tenants specifically created for demonstrations and sales."
        columns={columns}
        rows={demoSchools}
        getRowKey={(row) => row.id}
        emptyMessage={isLoading ? "Loading demo environments..." : "No demo environments active."}
      />
    </div>
  );
}

function TenantHealthWorkspace() {
  const router = useRouter();
  const [schools, setSchools] = useState<PlatformTenantRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSchools() {
      setIsLoading(true);
      try {
        const liveRows = await fetchPlatformSchools();
        if (!cancelled) {
          setSchools(liveRows.map(mapPlatformSchoolToTenantRow));
        }
      } catch (error) {
        if (redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href))) {
          return;
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSchools();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const columns: DataTableColumn<PlatformTenantRow>[] = [
    {
      id: "schoolName",
      header: "School Name",
      render: (row) => <span className="font-semibold">{row.schoolName}</span>,
    },
    {
      id: "lastSync",
      header: "Last Sync",
      render: () => <span className="text-muted">N/A</span>,
    },
    {
      id: "failedJobs",
      header: "Failed Jobs",
      render: () => <StatusPill label="0" tone="ok" />,
    },
    {
      id: "smsQueue",
      header: "SMS Queue",
      render: () => <span className="text-muted">0</span>,
    },
    {
      id: "apiErrors",
      header: "API Error Rate",
      render: () => <span className="text-muted">0.0%</span>,
    },
    {
      id: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm">
            <RotateCcw className="h-4 w-4 mr-2" /> Restart Jobs
          </Button>
          <Button variant="secondary" size="sm">
            Force Sync
          </Button>
          <Button variant="danger" size="sm">
            Suspend Connectivity
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
        title="Tenant Health Monitor" 
        description="Track school-level system health, failed jobs, offline sync, and platform reliability." 
      />
      
      <DataTable
        title="Health Overview"
        subtitle="Monitor operational stability across all isolated tenants."
        columns={columns}
        rows={schools}
        getRowKey={(row) => row.id}
        emptyMessage={isLoading ? "Loading health metrics..." : "No tenant data found."}
      />
    </div>
  );
}

function PaymentGatewaysWorkspace() {
  const router = useRouter();
  const [schools, setSchools] = useState<PlatformTenantRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSchools() {
      setIsLoading(true);
      try {
        const liveRows = await fetchPlatformSchools();
        if (!cancelled) {
          setSchools(liveRows.map(mapPlatformSchoolToTenantRow));
        }
      } catch (error) {
        if (redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href))) {
          return;
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSchools();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const columns: DataTableColumn<PlatformTenantRow>[] = [
    {
      id: "schoolName",
      header: "School Name",
      render: (row) => <span className="font-semibold">{row.schoolName}</span>,
    },
    {
      id: "gatewayType",
      header: "Gateway Type",
      render: () => <span>M-Pesa</span>,
    },
    {
      id: "paybill",
      header: "Paybill/Account",
      render: () => <span className="text-muted text-sm font-mono">Not configured</span>,
    },
    {
      id: "status",
      header: "Status",
      render: () => <StatusPill label="Pending" tone="warning" />,
    },
    {
      id: "lastCallback",
      header: "Last Callback",
      render: () => <span className="text-muted">N/A</span>,
    },
    {
      id: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm">
            View Config
          </Button>
          <Button variant="secondary" size="sm">
            Test Gateway
          </Button>
          <Button variant="danger" size="sm">
            Disable
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
        title="Payment Gateways" 
        description="Configure M-Pesa and payment gateway settings used by school fee collections." 
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-2" /> Add Gateway Provider
          </Button>
        } 
      />
      
      <DataTable
        title="Gateway Configurations"
        subtitle="Track payment connectivity across schools."
        columns={columns}
        rows={schools}
        getRowKey={(row) => row.id}
        emptyMessage={isLoading ? "Loading payment gateways..." : "No configurations found."}
      />
    </div>
  );
}

function TemplatesCenterWorkspace() {
  const [templates, setTemplates] = useState<any[]>([]); // To be replaced with fetchPlatformTemplates
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API fetch delay
    const timer = setTimeout(() => {
      setTemplates([]);
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const columns: DataTableColumn<any>[] = [
    {
      id: "name",
      header: "Template Name",
      render: (row) => <span className="font-semibold">{row.name}</span>,
    },
    {
      id: "type",
      header: "Type",
      render: (row) => row.type,
    },
    {
      id: "status",
      header: "Status",
      render: (row) => <StatusPill label={row.status} tone={row.status === "Active" ? "ok" : "warning"} />,
    },
    {
      id: "assigned",
      header: "Assigned Schools",
      render: (row) => row.assignedCount,
    },
    {
      id: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm">
            <Blocks className="h-4 w-4 mr-2" /> Edit HTML/CSS
          </Button>
          <Button variant="ghost" size="sm">
            Duplicate
          </Button>
          <Button variant="ghost" size="sm">
            <Trash2 className="h-4 w-4" />
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
        title="Templates Center" 
        description="Manage platform-wide PDF templates (Report Cards, Receipts, Invoices, Certificates)." 
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-2" /> Create New Template
          </Button>
        } 
      />
      
      <DataTable
        title="Platform Templates"
        subtitle="HTML/CSS templates available to schools for PDF generation."
        columns={columns}
        rows={templates}
        getRowKey={(row) => row.id}
        emptyMessage={isLoading ? "Loading templates..." : "No templates configured."}
      />
    </div>
  );
}

function BroadcastsWorkspace() {
  const [broadcasts, setBroadcasts] = useState<any[]>([]); // To be replaced with fetchPlatformBroadcasts
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API fetch delay
    const timer = setTimeout(() => {
      setBroadcasts([]);
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const columns: DataTableColumn<any>[] = [
    {
      id: "subject",
      header: "Broadcast Subject",
      render: (row) => <span className="font-semibold">{row.subject}</span>,
    },
    {
      id: "target",
      header: "Target",
      render: (row) => row.target,
    },
    {
      id: "status",
      header: "Status",
      render: (row) => <StatusPill label={row.status} tone={row.status === "Sent" ? "ok" : "warning"} />,
    },
    {
      id: "scheduledFor",
      header: "Scheduled For",
      render: (row) => row.scheduledFor,
    },
    {
      id: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm">
            View
          </Button>
          <Button variant="secondary" size="sm">
            Edit
          </Button>
          <Button variant="danger" size="sm">
            Retract
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
        title="Platform Broadcasts" 
        description="Push system-wide notices to all schools (e.g., scheduled maintenance)." 
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-2" /> New Broadcast
          </Button>
        } 
      />
      
      <DataTable
        title="Announcements"
        subtitle="Manage alerts shown on the dashboards of all or specific schools."
        columns={columns}
        rows={broadcasts}
        getRowKey={(row) => row.id}
        emptyMessage={isLoading ? "Loading broadcasts..." : "No broadcasts found."}
      />
    </div>
  );
}

function DataToolsWorkspace() {
  const router = useRouter();
  const [schools, setSchools] = useState<PlatformTenantRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSchools() {
      setIsLoading(true);
      try {
        const liveRows = await fetchPlatformSchools();
        if (!cancelled) {
          setSchools(liveRows.map(mapPlatformSchoolToTenantRow));
        }
      } catch (error) {
        if (redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href))) {
          return;
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSchools();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const columns: DataTableColumn<PlatformTenantRow>[] = [
    {
      id: "schoolName",
      header: "School Name",
      render: (row) => <span className="font-semibold">{row.schoolName}</span>,
    },
    {
      id: "lastBackup",
      header: "Last Backup Date",
      render: () => <span className="text-muted">Not backed up</span>,
    },
    {
      id: "size",
      header: "Size",
      render: () => <span className="text-muted">N/A</span>,
    },
    {
      id: "status",
      header: "Status",
      render: () => <StatusPill label="Pending" tone="warning" />,
    },
    {
      id: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm">
            <Database className="h-4 w-4 mr-2" /> Trigger Backup
          </Button>
          <Button variant="ghost" size="sm">
            Download Snapshot
          </Button>
          <Button variant="danger" size="sm">
            Restore
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
        title="Data Tools & Backups" 
        description="Platform database snapshots, migrations, and tenant data export tools." 
      />
      
      <DataTable
        title="Tenant Backups"
        subtitle="Manage isolated data backups for each school."
        columns={columns}
        rows={schools}
        getRowKey={(row) => row.id}
        emptyMessage={isLoading ? "Loading backup status..." : "No tenant data found."}
      />
    </div>
  );
}

function SecurityPoliciesWorkspace() {
  const [policies, setPolicies] = useState<any[]>([]); // To be replaced with fetchPlatformSecurityPolicies
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API fetch delay
    const timer = setTimeout(() => {
      setPolicies([]);
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const columns: DataTableColumn<any>[] = [
    {
      id: "policyName",
      header: "Policy Name",
      render: (row) => <span className="font-semibold">{row.policyName}</span>,
    },
    {
      id: "appliedTo",
      header: "Applied To",
      render: (row) => row.appliedTo,
    },
    {
      id: "status",
      header: "Status",
      render: (row) => <StatusPill label={row.status} tone={row.status === "Active" ? "ok" : "warning"} />,
    },
    {
      id: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm">
            Edit
          </Button>
          <Button variant="danger" size="sm">
            Disable
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
        title="Security & Access Policies" 
        description="Platform-wide security settings, SSO rules, and global IP restrictions." 
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-2" /> Add Policy
          </Button>
        } 
      />
      
      <DataTable
        title="Security Policies"
        subtitle="Manage access rules across the entire platform."
        columns={columns}
        rows={policies}
        getRowKey={(row) => row.id}
        emptyMessage={isLoading ? "Loading security policies..." : "No policies configured."}
      />
    </div>
  );
}

function PlatformReportsWorkspace() {
  const [reports, setReports] = useState<any[]>([]); // To be replaced with fetchPlatformReports
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API fetch delay
    const timer = setTimeout(() => {
      setReports([]);
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const columns: DataTableColumn<any>[] = [
    {
      id: "reportName",
      header: "Report Name",
      render: (row) => <span className="font-semibold">{row.reportName}</span>,
    },
    {
      id: "date",
      header: "Date Generated",
      render: (row) => row.date,
    },
    {
      id: "status",
      header: "Status",
      render: (row) => <StatusPill label={row.status} tone={row.status === "Ready" ? "ok" : "warning"} />,
    },
    {
      id: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm">
            Download
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
        title="Platform Reports" 
        description="Aggregate stats: active schools, MRR/billing, total students, SMS usage." 
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-2" /> Generate Report
          </Button>
        } 
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="text-sm font-medium text-muted">Total Revenue</div>
          <div className="mt-2 text-2xl font-bold">KSH 0</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-muted">Total SMS Sent</div>
          <div className="mt-2 text-2xl font-bold">0</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-muted">Active Tenants</div>
          <div className="mt-2 text-2xl font-bold">0</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-muted">Total Users</div>
          <div className="mt-2 text-2xl font-bold">0</div>
        </Card>
      </div>
      
      <DataTable
        title="Generated Reports"
        subtitle="Download historical and scheduled platform metric reports."
        columns={columns}
        rows={reports}
        getRowKey={(row) => row.id}
        emptyMessage={isLoading ? "Loading reports..." : "No reports generated."}
      />
    </div>
  );
}

export function SuperadminPages({
  section = "overview",
  routeMode = "hosted",
}: {
  section?: string;
  routeMode?: SuperadminRouteMode;
}) {
  const normalizedSection =
    section === "overview" || section === "schools" ? section : section;
  const activeHref =
    normalizedSection === "overview"
      ? buildSuperadminHref("dashboard", routeMode)
      : buildSuperadminHref(
          normalizedSection === "tenants"
            ? "schools"
            : (normalizedSection as Parameters<typeof toSuperadminPath>[0]),
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
      {normalizedSection === "users" ? <UsersPage /> : null}
      {normalizedSection === "health" ? <TenantHealthWorkspace /> : null}
      {normalizedSection === "sms-email" ? <PlatformSmsSettingsPage /> : null}
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
      {normalizedSection === "audit-logs" ? <AuditLogsPage /> : null}
      {normalizedSection === "data-tools" ? <DataToolsWorkspace /> : null}
      {normalizedSection === "security" ? <SecurityPoliciesWorkspace /> : null}
      {normalizedSection === "reports" ? <PlatformReportsWorkspace /> : null}
      {normalizedSection === "settings" ? <SettingsPage routeMode={routeMode} /> : null}
    </PlatformShell>
  );
}
